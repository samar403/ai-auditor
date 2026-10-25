import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { analyses, issues, organizations, regulations, type Severity } from "@/lib/db/schema";
import { generateStructured, isAIEnabled } from "@/lib/ai/client";
import { isOpen, isOverdue, postureGrade, postureScore, SEVERITIES } from "@/lib/scoring";

export interface ReportContent {
  generatedAt: string;
  orgName: string;
  posture: { score: number; grade: string; label: string };
  counts: { open: number; overdue: number; newInPeriod: number; resolvedInPeriod: number; acceptedRisk: number };
  openBySeverity: Record<Severity, number>;
  openBySource: Record<string, number>;
  topIssues: { id: string; title: string; severity: Severity; status: string; dueAt: string | null; source: string }[];
  regulatoryHighlights: { id: string; title: string; agency: string; impactScore: number; applicability: string; effectiveAt: string | null }[];
  executiveSummary: string;
  recommendations: string[];
  model: string;
}

const SummarySchema = z.object({
  executiveSummary: z.string().describe("One tight paragraph (90-140 words) for the audit committee"),
  recommendations: z.array(z.string()).describe("3-5 prioritized recommendations, each one sentence"),
});

export async function buildReport(orgId: string, periodStart: Date, periodEnd: Date): Promise<ReportContent> {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  const all = await db.query.issues.findMany({ where: eq(issues.orgId, orgId), orderBy: desc(issues.createdAt) });
  const now = new Date();
  const open = all.filter(isOpen);
  const score = postureScore(all, now);
  const openBySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, open.filter((i) => i.severity === s).length])) as Record<Severity, number>;
  const openBySource = open.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.source]: (acc[i.source] ?? 0) + 1 }), {});
  const inPeriod = (d: Date | null) => !!d && d >= periodStart && d <= periodEnd;

  const highlights = await db
    .select({ id: regulations.id, title: regulations.title, agency: regulations.agency, effectiveAt: regulations.effectiveAt, impactScore: analyses.impactScore, applicability: analyses.applicability })
    .from(analyses)
    .innerJoin(regulations, eq(regulations.id, analyses.regulationId))
    .where(and(eq(analyses.orgId, orgId), gte(regulations.publishedAt, new Date(periodStart.getTime() - 90 * 86_400_000)), lte(regulations.publishedAt, periodEnd)))
    .orderBy(desc(analyses.impactScore))
    .limit(8);

  const rank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const topIssues = [...open].sort((a, b) => rank[a.severity] - rank[b.severity] || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity)).slice(0, 10);

  const content: ReportContent = {
    generatedAt: now.toISOString(),
    orgName: org?.name ?? "",
    posture: { score, ...postureGrade(score) },
    counts: {
      open: open.length,
      overdue: open.filter((i) => isOverdue(i, now)).length,
      newInPeriod: all.filter((i) => inPeriod(i.createdAt)).length,
      resolvedInPeriod: all.filter((i) => inPeriod(i.resolvedAt)).length,
      acceptedRisk: all.filter((i) => i.status === "accepted_risk").length,
    },
    openBySeverity,
    openBySource,
    topIssues: topIssues.map((i) => ({ id: i.id, title: i.title, severity: i.severity, status: i.status, dueAt: i.dueAt?.toISOString() ?? null, source: i.source })),
    regulatoryHighlights: highlights.map((h) => ({ ...h, effectiveAt: h.effectiveAt?.toISOString() ?? null })),
    executiveSummary: "",
    recommendations: [],
    model: "template",
  };

  const narrative = await writeNarrative(content, periodStart, periodEnd).catch((err) => {
    console.error("Report narrative failed, using template", err);
    return null;
  });
  Object.assign(content, narrative ?? templateNarrative(content));
  return content;
}

async function writeNarrative(c: ReportContent, start: Date, end: Date) {
  if (!isAIEnabled()) return null;
  const res = await generateStructured({
    schema: SummarySchema,
    effort: "medium",
    maxTokens: 16000,
    system: "You are AI Auditor writing the compliance section of an audit committee pack. Be factual: use only the numbers given. No hype, no hedging boilerplate.",
    prompt: `Period: ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}\n\n<data>\n${JSON.stringify({ ...c, executiveSummary: undefined, recommendations: undefined, model: undefined }, null, 2)}\n</data>\n\nWrite the executive summary and recommendations.`,
  });
  return { ...res, model: (await import("@/lib/ai/client")).AI_MODEL };
}

function templateNarrative(c: ReportContent) {
  const crit = c.openBySeverity.critical;
  const high = c.openBySeverity.high;
  const recs: string[] = [];
  if (crit) recs.push(`Close the ${crit} critical issue${crit > 1 ? "s" : ""} first; each should have a named owner and a remediation date this week.`);
  if (c.counts.overdue) recs.push(`Re-baseline the ${c.counts.overdue} overdue item${c.counts.overdue > 1 ? "s" : ""} and escalate blockers to the CFO.`);
  if (high) recs.push(`Work down the ${high} high-severity issue${high > 1 ? "s" : ""} before the next reporting cycle.`);
  if (c.regulatoryHighlights.some((r) => r.impactScore >= 70)) recs.push("Run policy gap checks against the high-impact regulations listed in this report.");
  recs.push("Keep the regulation feed synced weekly and review new analyses in the Monday compliance stand-up.");
  return {
    executiveSummary: `${c.orgName}'s compliance posture is ${c.posture.label.toLowerCase()} at ${c.posture.score}/100 (grade ${c.posture.grade}). There are ${c.counts.open} open issues, ${crit} critical and ${high} high, with ${c.counts.overdue} past due. ${c.counts.newInPeriod} issues were raised and ${c.counts.resolvedInPeriod} resolved in the period. ${c.regulatoryHighlights.length} relevant regulatory developments were analyzed.`,
    recommendations: recs.slice(0, 5),
    model: "template",
  };
}

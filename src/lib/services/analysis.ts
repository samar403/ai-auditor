import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, issues, organizations, regulations } from "@/lib/db/schema";
import { analyzeRegulation } from "@/lib/ai/regulation";
import { recordAudit } from "@/lib/audit";
import { HttpError } from "@/lib/errors";
import { severityFromScore } from "@/lib/scoring";

/** Threshold above which an analysis automatically opens an issue. */
export const AUTO_FLAG_SCORE = 60;

export async function runRegulationAnalysis(orgId: string, regulationId: string, userId: string | null) {
  const [org, reg] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    db.query.regulations.findFirst({ where: eq(regulations.id, regulationId) }),
  ]);
  if (!org || !reg) throw new HttpError(404, "Regulation not found.");

  const result = await analyzeRegulation(reg, org);
  const values = { orgId, regulationId, ...result, createdAt: new Date() };
  const [analysis] = await db
    .insert(analyses)
    .values(values)
    .onConflictDoUpdate({ target: [analyses.orgId, analyses.regulationId], set: values })
    .returning();

  let issueId: string | null = null;
  if (result.applicability !== "none" && result.applicability !== "low" && result.impactScore >= AUTO_FLAG_SCORE) {
    const existing = await db.query.issues.findFirst({
      where: and(eq(issues.orgId, orgId), eq(issues.regulationId, regulationId), eq(issues.source, "regulation")),
    });
    if (!existing) {
      const due = result.obligations.map((o) => o.deadline).filter(Boolean).sort()[0];
      const [issue] = await db
        .insert(issues)
        .values({
          orgId,
          title: `New requirement: ${reg.title}`.slice(0, 200),
          description: `${result.summary}\n\nWhy it applies: ${result.rationale}`,
          recommendation: result.requiredActions.join("\n"),
          severity: severityFromScore(result.impactScore),
          source: "regulation",
          ruleCode: "REG-IMPACT",
          regulationId,
          dueAt: due ? new Date(`${due}T00:00:00Z`) : reg.effectiveAt,
        })
        .returning({ id: issues.id });
      issueId = issue.id;
      await recordAudit({ orgId, userId, action: "issue.auto_flagged", entityType: "issue", entityId: issue.id, details: { regulationId, impactScore: result.impactScore } });
    }
  }

  await recordAudit({
    orgId,
    userId,
    action: "regulation.analyzed",
    entityType: "regulation",
    entityId: regulationId,
    details: { applicability: result.applicability, impactScore: result.impactScore, model: result.model },
  });
  return { analysis, issueId };
}

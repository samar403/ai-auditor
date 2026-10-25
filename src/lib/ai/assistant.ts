import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, issues, organizations, regulations } from "@/lib/db/schema";
import { AI_MODEL, anthropic } from "./client";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Builds a compact, current snapshot of the org's compliance state for grounding. */
export async function buildContext(orgId: string) {
  const [org, openIssues, recent] = await Promise.all([
    db.query.organizations.findFirst({ where: eq(organizations.id, orgId) }),
    db.query.issues.findMany({ where: and(eq(issues.orgId, orgId), inArray(issues.status, ["open", "in_progress"])), orderBy: desc(issues.createdAt), limit: 40 }),
    db
      .select({ title: regulations.title, agency: regulations.agency, url: regulations.url, effectiveAt: regulations.effectiveAt, summary: analyses.summary, applicability: analyses.applicability, impactScore: analyses.impactScore, obligations: analyses.obligations })
      .from(analyses)
      .innerJoin(regulations, eq(regulations.id, analyses.regulationId))
      .where(eq(analyses.orgId, orgId))
      .orderBy(desc(analyses.impactScore))
      .limit(25),
  ]);
  return `<company name="${org?.name}">
${JSON.stringify(org?.profile)}
</company>

<open_issues count="${openIssues.length}">
${openIssues.map((i) => `- [${i.severity}] ${i.title} (status: ${i.status}${i.dueAt ? `, due ${i.dueAt.toISOString().slice(0, 10)}` : ""}, source: ${i.source})`).join("\n")}
</open_issues>

<analyzed_regulations>
${recent
  .map(
    (r) =>
      `- ${r.title} | ${r.agency} | applicability ${r.applicability}, impact ${r.impactScore}/100${r.effectiveAt ? ` | effective ${r.effectiveAt.toISOString().slice(0, 10)}` : ""}\n  ${r.summary}\n  Obligations: ${r.obligations.map((o) => o.text).join("; ") || "none"}\n  Source: ${r.url}`,
  )
  .join("\n")}
</analyzed_regulations>`;
}

const SYSTEM = `You are AI Auditor's assistant for a finance and compliance team. Answer questions about their regulatory obligations, open issues and controls.

Ground every answer in the company data below. When the data does not cover a question, say so plainly and suggest what to check (for example, sync the feed or run an analysis). Cite regulation titles when you rely on them. Keep answers short and practical, use Markdown lists where they help, and remember this is decision support, not legal advice.`;

export function streamAssistant(context: string, history: ChatTurn[]) {
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));
  return anthropic().beta.messages.stream({
    model: AI_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    // Stable instructions + org snapshot first so repeated questions hit the prompt cache.
    system: [{ type: "text", text: `${SYSTEM}\n\n${context}`, cache_control: { type: "ephemeral" } }],
    messages,
  });
}

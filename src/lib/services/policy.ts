import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, issues, policies, regulations, type Obligation } from "@/lib/db/schema";
import { findPolicyGaps } from "@/lib/ai/policy";
import { recordAudit } from "@/lib/audit";
import { HttpError } from "@/lib/errors";

export async function runPolicyGapCheck(orgId: string, policyId: string, userId: string) {
  const policy = await db.query.policies.findFirst({ where: and(eq(policies.id, policyId), eq(policies.orgId, orgId)) });
  if (!policy) throw new HttpError(404, "Policy not found.");

  const rows = await db
    .select({ obligations: analyses.obligations, regulationId: analyses.regulationId, title: regulations.title, abstract: regulations.abstract })
    .from(analyses)
    .innerJoin(regulations, eq(regulations.id, analyses.regulationId))
    .where(and(eq(analyses.orgId, orgId), ne(analyses.applicability, "none")));

  const obligations: (Obligation & { regulationTitle: string; regulationId: string; regulationText: string })[] = rows.flatMap((r) =>
    r.obligations.filter((o) => o.controlArea === policy.controlArea).map((o) => ({ ...o, regulationTitle: r.title, regulationId: r.regulationId, regulationText: `${r.title}. ${r.abstract}` })),
  );

  const gaps = await findPolicyGaps(policy, obligations);

  // Replace this policy's previous open gap issues so re-running doesn't duplicate.
  await db
    .delete(issues)
    .where(and(eq(issues.orgId, orgId), eq(issues.policyId, policyId), eq(issues.source, "policy_gap"), inArray(issues.status, ["open"])));

  // Gaps already being worked on or formally accepted are not re-raised.
  const handled = await db
    .select({ title: issues.title })
    .from(issues)
    .where(and(eq(issues.orgId, orgId), eq(issues.policyId, policyId), inArray(issues.status, ["in_progress", "accepted_risk"])));
  const handledTitles = new Set(handled.map((h) => h.title));

  const created = [];
  for (const gap of gaps) {
    if (handledTitles.has(`${policy.title}: ${gap.title}`.slice(0, 200))) continue;
    const ob = obligations.find((o) => o.regulationTitle === gap.regulationTitle);
    const [row] = await db
      .insert(issues)
      .values({
        orgId,
        title: `${policy.title}: ${gap.title}`.slice(0, 200),
        description: gap.description,
        recommendation: gap.recommendation,
        severity: gap.severity,
        source: "policy_gap",
        ruleCode: "POLICY-GAP",
        policyId,
        regulationId: ob?.regulationId ?? null,
        dueAt: ob?.deadline ? new Date(`${ob.deadline}T00:00:00Z`) : null,
      })
      .returning();
    created.push(row);
  }

  await db.update(policies).set({ lastReviewedAt: new Date() }).where(eq(policies.id, policyId));
  await recordAudit({ orgId, userId, action: "policy.gap_check", entityType: "policy", entityId: policyId, details: { obligationsChecked: obligations.length, gaps: created.length } });
  return { obligationsChecked: obligations.length, issues: created };
}

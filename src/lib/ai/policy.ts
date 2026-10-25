import "server-only";
import { z } from "zod";
import type { Obligation, Policy } from "@/lib/db/schema";
import { generateStructured, isAIEnabled } from "./client";
import { heuristicPolicyGaps } from "./heuristics";

const GapSchema = z.object({
  gaps: z.array(
    z.object({
      title: z.string().describe("Short issue title, under 90 characters"),
      description: z.string().describe("What the policy is missing, quoting the obligation"),
      recommendation: z.string().describe("Specific language or control to add"),
      severity: z.enum(["critical", "high", "medium", "low"]),
      regulationTitle: z.string().describe("Title of the regulation the obligation comes from, copied exactly"),
    }),
  ),
});

export type PolicyGap = z.infer<typeof GapSchema>["gaps"][number];

export async function findPolicyGaps(policy: Policy, obligations: (Obligation & { regulationTitle: string; regulationText?: string })[]): Promise<PolicyGap[]> {
  if (obligations.length === 0) return [];
  if (!isAIEnabled()) return heuristicPolicyGaps(policy.content, obligations);

  const result = await generateStructured({
    schema: GapSchema,
    effort: "high",
    system: `You are AI Auditor, an internal-audit reviewer. Compare a company policy with regulatory obligations and report only real gaps: obligations the policy does not cover, covers too vaguely to test, or contradicts. If the policy adequately covers an obligation, do not report it. Severity: critical = likely violation now; high = gap with a near deadline; medium = gap without a near deadline; low = wording or evidence weakness.`,
    prompt: `<policy title="${policy.title}" control_area="${policy.controlArea}">
${policy.content}
</policy>

<obligations>
${obligations.map((o, i) => `${i + 1}. [${o.controlArea}] ${o.text} (from "${o.regulationTitle}"${o.deadline ? `, due ${o.deadline}` : ""})`).join("\n")}
</obligations>

List the gaps.`,
  });
  return result.gaps;
}

import "server-only";
import { z } from "zod";
import { CONTROL_AREAS } from "@/lib/taxonomy";
import type { Obligation, Organization, Regulation } from "@/lib/db/schema";
import { AI_MODEL, generateStructured, isAIEnabled } from "./client";
import { heuristicAnalysis } from "./heuristics";

export const RegulationAnalysisSchema = z.object({
  applicability: z.enum(["high", "medium", "low", "none"]).describe("How strongly this regulation applies to this company"),
  impactScore: z.number().int().min(0).max(100).describe("0 = irrelevant, 100 = urgent, material, company-wide change"),
  summary: z.string().describe("Two or three plain-English sentences a CFO can read in ten seconds"),
  rationale: z.string().describe("Why it does or does not apply, citing the company profile"),
  obligations: z
    .array(
      z.object({
        text: z.string().describe("A concrete obligation the company must meet, phrased as an action"),
        controlArea: z.enum(CONTROL_AREAS),
        deadline: z.string().nullable().describe("ISO date (YYYY-MM-DD) if the text gives one, else null"),
      }),
    )
    .describe("Empty when applicability is none"),
  requiredActions: z.array(z.string()).describe("3-6 next steps for the finance/compliance team, most urgent first"),
  affectedFunctions: z.array(z.string()).describe("Teams affected, e.g. Controllership, Treasury, Compliance, Legal, IT & Security"),
});

export type RegulationAnalysis = Omit<z.infer<typeof RegulationAnalysisSchema>, "obligations"> & { obligations: Obligation[]; model: string };

const SYSTEM = `You are AI Auditor, a senior regulatory compliance analyst for finance teams.
You read new regulations, proposed rules, guidance and enforcement actions, and decide what they mean for one specific company.

Be precise and conservative:
- Base applicability only on the company profile and the regulation text you are given. If the text is too thin to tell, say so in the rationale and lower the score rather than guessing.
- Extract obligations that are actually stated or clearly implied by the document. Do not invent deadlines; use null when no date is given (an effective date counts).
- Write for a CFO or controller: plain English, no legal hedging boilerplate.
- This is decision support, not legal advice; the team will review your output.`;

export async function analyzeRegulation(reg: Regulation, org: Organization): Promise<RegulationAnalysis> {
  if (!isAIEnabled()) {
    return { ...heuristicAnalysis(reg, org.profile), model: "offline-heuristic" };
  }
  const prompt = `<company>
Name: ${org.name}
Industry: ${org.industry}
Jurisdictions: ${org.profile.jurisdictions.join(", ") || "not set"}
Entity types: ${org.profile.entityTypes.join(", ") || "not set"}
Business activities: ${org.profile.activities.join(", ") || "not set"}
Annual revenue band: ${org.profile.annualRevenueBand || "not set"}
</company>

<regulation>
Title: ${reg.title}
Agency: ${reg.agency}
Jurisdiction: ${reg.jurisdiction}
Document type: ${reg.docType}
Published: ${reg.publishedAt.toISOString().slice(0, 10)}
Effective date: ${reg.effectiveAt ? reg.effectiveAt.toISOString().slice(0, 10) : "not stated"}
Comment deadline: ${reg.commentDeadline ? reg.commentDeadline.toISOString().slice(0, 10) : "none"}
Source: ${reg.url}

${reg.abstract || "(no abstract provided)"}
</regulation>

Assess this regulation for the company above.`;
  const result = await generateStructured({ schema: RegulationAnalysisSchema, system: SYSTEM, prompt, effort: "high" });
  return { ...result, model: AI_MODEL };
}

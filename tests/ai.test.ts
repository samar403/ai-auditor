import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { analyzeRegulation, RegulationAnalysisSchema } from "@/lib/ai/regulation";
import type { Organization, Regulation } from "@/lib/db/schema";

describe("Claude structured output", () => {
  it("compiles the analysis schema to a JSON schema the API accepts", () => {
    const fmt = betaZodOutputFormat(RegulationAnalysisSchema);
    expect(fmt.type).toBe("json_schema");
    const parsed = fmt.parse(
      JSON.stringify({
        applicability: "high",
        impactScore: 80,
        summary: "s",
        rationale: "r",
        obligations: [{ text: "t", controlArea: "AML / KYC", deadline: null }],
        requiredActions: ["a"],
        affectedFunctions: ["Compliance"],
      }),
    );
    expect(parsed.obligations[0].controlArea).toBe("AML / KYC");
  });

  it("falls back to the offline engine without an API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    const reg = { title: "Sanctions screening for payments", abstract: "OFAC expects payment screening.", agency: "OFAC", jurisdiction: "US", docType: "Guidance", effectiveAt: null, publishedAt: new Date(), commentDeadline: null, url: "" } as unknown as Regulation;
    const org = { name: "X", industry: "Fintech", profile: { jurisdictions: ["US"], entityTypes: ["Fintech / payments"], activities: ["payments"], annualRevenueBand: "" } } as unknown as Organization;
    const res = await analyzeRegulation(reg, org);
    expect(res.model).toBe("offline-heuristic");
    expect(["high", "medium"]).toContain(res.applicability);
  });
});

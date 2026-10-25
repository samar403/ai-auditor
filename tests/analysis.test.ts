import { describe, expect, it } from "vitest";
import { detectTopics, hasTerm, heuristicAnalysis, heuristicPolicyGaps } from "@/lib/ai/heuristics";
import { postureScore } from "@/lib/scoring";
import { parseFeed } from "@/lib/feeds/rss";
import { mapFederalRegister } from "@/lib/feeds/federal-register";

const profile = { jurisdictions: ["US"], entityTypes: ["Money services business"], activities: ["payments"], annualRevenueBand: "" };

describe("offline analysis engine", () => {
  it("matches terms at word starts only", () => {
    expect(hasTerm("each quarter", "ach")).toBe(false);
    expect(hasTerm("ACH transfers", "ach")).toBe(true);
    expect(hasTerm("outsourcing", "outsourc")).toBe(true);
  });
  it("detects control areas", () => {
    expect(detectTopics("Beneficial owner verification and OFAC sanctions screening")).toEqual(expect.arrayContaining(["AML / KYC", "Sanctions"]));
  });
  it("rates a relevant AML rule high and an unrelated notice as not applicable", () => {
    const aml = heuristicAnalysis(
      { title: "Beneficial ownership for money services businesses", abstract: "FinCEN requires payment platforms to verify beneficial owner data.", agency: "FinCEN", jurisdiction: "US", docType: "Rule", effectiveAt: new Date("2027-01-01") },
      profile,
    );
    expect(aml.applicability).toBe("high");
    expect(aml.obligations[0].deadline).toBe("2027-01-01");
    const grain = heuristicAnalysis({ title: "Grain grading standards", abstract: "Updates grading for wheat.", agency: "USDA", jurisdiction: "US", docType: "Notice", effectiveAt: null }, profile);
    expect(grain.applicability).toBe("none");
    expect(grain.obligations).toEqual([]);
  });
  it("caps out-of-jurisdiction documents", () => {
    const uk = heuristicAnalysis({ title: "Payments consumer duty", abstract: "FCA payment firms consumer fees", agency: "FCA", jurisdiction: "UK", docType: "Guidance", effectiveAt: null }, profile);
    expect(uk.impactScore).toBeLessThanOrEqual(20);
  });
  it("finds policy gaps for specific missing terms", () => {
    const gaps = heuristicPolicyGaps("We collect ID and file suspicious activity reports.", [
      { text: "Verify owners", controlArea: "AML / KYC", deadline: "2027-01-01", regulationTitle: "CDD rule", regulationText: "beneficial owner verification and suspicious activity reports" },
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].title).toMatch(/beneficial owner/);
    expect(gaps[0].severity).toBe("high");
  });
});

describe("posture score", () => {
  it("is 100 with nothing open and falls with severity and lateness", () => {
    const now = new Date("2026-10-25");
    expect(postureScore([], now)).toBe(100);
    const crit = postureScore([{ status: "open", severity: "critical", dueAt: null }], now);
    const low = postureScore([{ status: "open", severity: "low", dueAt: null }], now);
    const late = postureScore([{ status: "open", severity: "critical", dueAt: new Date("2026-10-01") }], now);
    expect(crit).toBeLessThan(low);
    expect(late).toBeLessThan(crit);
    expect(postureScore([{ status: "remediated", severity: "critical", dueAt: null }], now)).toBe(100);
  });
  it("never reaches zero for a finite backlog", () => {
    const many = Array.from({ length: 30 }, () => ({ status: "open" as const, severity: "critical" as const, dueAt: null }));
    expect(postureScore(many)).toBeGreaterThanOrEqual(0);
  });
});

describe("feed parsers", () => {
  it("parses RSS items", () => {
    const xml = `<rss><channel><item><title>SEC charges firm</title><link>https://sec.gov/x</link><guid>x1</guid><pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Off-channel recordkeeping&lt;/p&gt;</description></item></channel></rss>`;
    const [item] = parseFeed(xml, { id: "sec", label: "SEC", url: "", agency: "SEC", jurisdiction: "US", docType: "Press release" });
    expect(item).toMatchObject({ title: "SEC charges firm", externalId: "x1", abstract: "Off-channel recordkeeping" });
    expect(item.publishedAt.toISOString()).toBe("2026-10-19T10:00:00.000Z");
  });
  it("parses Atom entries", () => {
    const xml = `<feed><entry><title>FCA update</title><link href="https://fca.org.uk/a"/><id>a1</id><updated>2026-10-20T00:00:00Z</updated><summary>Consumer duty</summary></entry></feed>`;
    expect(parseFeed(xml, { id: "fca", label: "FCA", url: "", agency: "FCA", jurisdiction: "UK", docType: "Guidance" })[0].url).toBe("https://fca.org.uk/a");
  });
  it("maps Federal Register documents", () => {
    const doc = mapFederalRegister({
      document_number: "2026-1",
      title: "Rule",
      abstract: null,
      type: "Rule",
      html_url: "https://federalregister.gov/d/2026-1",
      publication_date: "2026-10-01",
      effective_on: "2027-01-01",
      comments_close_on: null,
      agencies: [{ name: "Treasury" }, { raw_name: "FinCEN" }],
    });
    expect(doc).toMatchObject({ agency: "Treasury / FinCEN", abstract: "", jurisdiction: "US" });
    expect(doc.effectiveAt?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });
});

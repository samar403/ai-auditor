// Offline analysis engine. Runs when no Anthropic credentials are configured so the
// product stays usable (and testable) without an API key. Deterministic and explainable.
import { CONTROL_AREAS, TOPIC_KEYWORDS, type ControlArea } from "@/lib/taxonomy";
import type { Applicability, Obligation, OrgProfile } from "@/lib/db/schema";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches a keyword at a word start, so "ach" does not match "each" but "outsourc" matches "outsourcing". */
export function hasTerm(text: string, term: string) {
  return new RegExp(`(^|[^a-z0-9])${escape(term)}`, "i").test(text);
}

export function detectTopics(text: string): ControlArea[] {
  return CONTROL_AREAS.filter((area) => TOPIC_KEYWORDS[area].some((kw) => hasTerm(text, kw)));
}

const ENTITY_SIGNALS: Record<string, string[]> = {
  "Public company": ["issuer", "registrant", "public compan", "listed"],
  "Broker-dealer": ["broker", "dealer", "finra"],
  "Investment adviser": ["investment adviser", "adviser", "fund"],
  Bank: ["bank", "depository", "insured institution", "credit union"],
  "Money services business": ["money services", "money transmitter", "msb", "remittance"],
  "Fintech / payments": ["payment", "digital wallet", "fintech", "stablecoin", "open banking"],
  Lender: ["lend", "loan", "credit", "mortgage"],
};

const JURISDICTION_SIGNALS: Record<string, string[]> = {
  US: ["federal", "sec ", "securities and exchange", "cfpb", "fincen", "treasury", "irs", "occ", "fdic", "federal reserve", "u.s."],
  "US-NY": ["new york", "nydfs", "23 nycrr"],
  "US-CA": ["california", "ccpa", "cpra"],
  EU: ["european", "eu ", "esma", "eba", "gdpr", "mica", "dora"],
  UK: ["fca", "united kingdom", "uk ", "bank of england", "pra"],
  IN: ["rbi", "sebi", "india"],
  SG: ["mas ", "singapore"],
};

export function heuristicAnalysis(
  reg: { title: string; abstract: string; agency: string; jurisdiction: string; docType: string; effectiveAt: Date | null },
  profile: OrgProfile,
) {
  const text = `${reg.title} ${reg.abstract} ${reg.agency}`.toLowerCase();
  const topics = detectTopics(text);
  const jurisdictionMatch =
    profile.jurisdictions.includes(reg.jurisdiction) ||
    profile.jurisdictions.some((j) => (JURISDICTION_SIGNALS[j] ?? []).some((s) => hasTerm(text, s.trim())));
  const entityMatches = profile.entityTypes.filter((e) => (ENTITY_SIGNALS[e] ?? []).some((s) => hasTerm(text, s)));
  const activityMatches = profile.activities.filter((a) => hasTerm(text, a.toLowerCase()));

  let score = 10;
  if (jurisdictionMatch) score += 25;
  score += Math.min(entityMatches.length * 15, 30);
  score += Math.min(activityMatches.length * 10, 20);
  score += Math.min(topics.length * 5, 15);
  if (/final rule|rule$/i.test(reg.docType)) score += 10;
  if (/enforcement/i.test(reg.docType)) score += 5;
  if (!jurisdictionMatch) score = Math.min(score, 20);
  if (topics.length === 0 && entityMatches.length === 0 && activityMatches.length === 0) score = Math.min(score, 15);
  score = Math.max(0, Math.min(100, score));

  const applicability: Applicability = score >= 65 ? "high" : score >= 40 ? "medium" : score >= 20 ? "low" : "none";
  const deadline = reg.effectiveAt ? reg.effectiveAt.toISOString().slice(0, 10) : null;
  const areas = topics.length ? topics : (["Governance"] as ControlArea[]);

  const obligations: Obligation[] =
    applicability === "none"
      ? []
      : areas.slice(0, 4).map((area) => ({
          text: `Review ${area} controls against "${reg.title}" and document any required changes.`,
          controlArea: area,
          deadline,
        }));

  const reasons = [
    jurisdictionMatch ? `it applies in a jurisdiction you operate in (${reg.jurisdiction})` : `it is outside your listed jurisdictions`,
    entityMatches.length ? `it targets ${entityMatches.join(", ")}` : null,
    activityMatches.length ? `it touches your activities (${activityMatches.join(", ")})` : null,
    topics.length ? `it covers ${topics.join(", ")}` : null,
  ].filter(Boolean);

  return {
    applicability,
    impactScore: score,
    summary: reg.abstract ? firstSentences(reg.abstract, 2) : reg.title,
    rationale: `Keyword assessment (offline mode): ${reasons.join("; ")}. Connect an Anthropic API key for a full AI reading.`,
    obligations,
    requiredActions:
      applicability === "none"
        ? ["No action needed. Keep on watch list."]
        : [
            "Assign an owner in Compliance to confirm applicability.",
            ...areas.slice(0, 2).map((a) => `Gap-check ${a} policies against the new requirements.`),
            deadline ? `Plan remediation before the effective date (${deadline}).` : "Track final rule publication and effective date.",
          ],
    affectedFunctions: areas.map(controlAreaToFunction).filter((v, i, arr) => arr.indexOf(v) === i),
  };
}

function controlAreaToFunction(area: ControlArea) {
  switch (area) {
    case "Financial reporting":
    case "Tax":
      return "Controllership";
    case "Payments":
      return "Treasury";
    case "Cybersecurity":
    case "Data privacy":
      return "IT & Security";
    case "Disclosure":
    case "Governance":
      return "Legal";
    default:
      return "Compliance";
  }
}

export function firstSentences(text: string, n: number) {
  const parts = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+/g);
  return parts ? parts.slice(0, n).join(" ").trim() : text.slice(0, 400);
}

// Terms too generic to prove a gap on their own.
const GENERIC_TERMS = new Set(["annually", "verify", "cyber", "aml", "kyc", "fincen", "resilience", "fee", "form", "filing", "retain", "consumer", "payment", "audit", "board", "tax"]);

/**
 * Policy gap check (offline mode): for each obligation, find the key terms the source regulation
 * uses for that control area and report the ones the policy never mentions.
 */
export function heuristicPolicyGaps(
  policyText: string,
  obligations: (Obligation & { regulationTitle: string; regulationText?: string })[],
) {
  const text = policyText.toLowerCase();
  const gaps: { title: string; description: string; recommendation: string; severity: "high" | "medium"; regulationTitle: string }[] = [];
  for (const o of obligations) {
    const keywords = TOPIC_KEYWORDS[o.controlArea as ControlArea] ?? [];
    const source = (o.regulationText ?? o.text).toLowerCase();
    const required = keywords.filter((kw) => !GENERIC_TERMS.has(kw) && hasTerm(source, kw));
    const missing = required.filter((kw) => !hasTerm(text, kw));
    if (required.length === 0 || missing.length === 0) continue;
    if (gaps.some((g) => g.regulationTitle === o.regulationTitle)) continue;
    gaps.push({
      title: `No coverage of ${missing.slice(0, 2).join(" and ")}`,
      description: `"${o.regulationTitle}" requires controls around ${missing.join(", ")}, but the policy never mentions ${missing.length > 1 ? "them" : "it"}. Obligation: ${o.text}`,
      recommendation: `Add a section on ${missing.join(", ")} with a named owner, review frequency, and the evidence you will retain.`,
      severity: (o.deadline ? "high" : "medium") as "high" | "medium",
      regulationTitle: o.regulationTitle,
    });
  }
  return gaps;
}

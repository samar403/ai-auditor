// Deterministic transaction-monitoring rules. Kept rule-based (not model-based) on purpose:
// every flag must be explainable to an auditor and reproducible on the same data.
import type { Severity } from "@/lib/db/schema";

export interface LedgerRow {
  reference: string;
  postedAt: Date;
  amount: number;
  currency: string;
  counterparty: string;
  country: string;
  account: string;
  description: string;
  createdBy: string;
  approvedBy: string;
}

export interface RuleHit {
  code: string;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  /** Indexes into the rows array. */
  rows: number[];
}

export const RULES = {
  "TXN-SANCTIONS-COUNTRY": { severity: "critical", name: "Payment to sanctioned or high-risk jurisdiction" },
  "TXN-WATCHLIST": { severity: "critical", name: "Counterparty matches watchlist" },
  "TXN-STRUCTURING": { severity: "critical", name: "Possible structuring below reporting threshold" },
  "TXN-SOD": { severity: "high", name: "Same person created and approved" },
  "TXN-LARGE-UNAPPROVED": { severity: "high", name: "Large payment without approval" },
  "TXN-DUPLICATE": { severity: "medium", name: "Possible duplicate payment" },
  "TXN-ROUND": { severity: "low", name: "Large round-number amount" },
  "TXN-WEEKEND": { severity: "low", name: "Posted on a weekend" },
} as const satisfies Record<string, { severity: Severity; name: string }>;

export type RuleCode = keyof typeof RULES;

// Comprehensively sanctioned or FATF "call for action" jurisdictions (ISO alpha-2).
export const HIGH_RISK_COUNTRIES = new Set(["IR", "KP", "SY", "CU", "MM", "RU", "BY"]);

// Demo watchlist. In production, replace with a screening provider (e.g. OFAC SDN via a vendor API).
export const DEMO_WATCHLIST = ["shadow freight", "volkov trading", "eastern meridian holdings", "blackwater exchange"];

export interface RuleConfig {
  reportingThreshold: number;
  approvalThreshold: number;
  structuringWindowDays: number;
}

export const DEFAULT_CONFIG: RuleConfig = { reportingThreshold: 10_000, approvalThreshold: 25_000, structuringWindowDays: 7 };

const DAY = 86_400_000;
const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD" }).format(n);

export function runRules(rows: LedgerRow[], config: RuleConfig = DEFAULT_CONFIG): RuleHit[] {
  const hits: RuleHit[] = [];

  rows.forEach((r, i) => {
    const country = r.country.trim().toUpperCase();
    if (HIGH_RISK_COUNTRIES.has(country)) {
      hits.push({
        code: "TXN-SANCTIONS-COUNTRY",
        severity: "critical",
        title: `${fmt(r.amount, r.currency)} payment to ${r.counterparty} in ${country}`,
        description: `Transaction ${r.reference} sends funds to ${country}, a comprehensively sanctioned or high-risk jurisdiction.`,
        recommendation: "Hold further payments to this counterparty, confirm OFAC licensing or exemption, and escalate to the BSA/AML officer.",
        rows: [i],
      });
    }
    const name = r.counterparty.toLowerCase();
    const match = DEMO_WATCHLIST.find((w) => name.includes(w));
    if (match) {
      hits.push({
        code: "TXN-WATCHLIST",
        severity: "critical",
        title: `Counterparty "${r.counterparty}" matches watchlist`,
        description: `Transaction ${r.reference} (${fmt(r.amount, r.currency)}) is with a counterparty that matches watchlist entry "${match}".`,
        recommendation: "Run full sanctions screening on the counterparty, freeze pending payments, and document the disposition.",
        rows: [i],
      });
    }
    if (r.createdBy && r.approvedBy && r.createdBy.trim().toLowerCase() === r.approvedBy.trim().toLowerCase()) {
      hits.push({
        code: "TXN-SOD",
        severity: "high",
        title: `${r.createdBy} created and approved ${r.reference}`,
        description: `Segregation-of-duties breach: the same user entered and approved a ${fmt(r.amount, r.currency)} payment to ${r.counterparty}.`,
        recommendation: "Have an independent approver re-review the payment and enforce maker-checker controls in the ERP.",
        rows: [i],
      });
    }
    if (Math.abs(r.amount) >= config.approvalThreshold && !r.approvedBy.trim()) {
      hits.push({
        code: "TXN-LARGE-UNAPPROVED",
        severity: "high",
        title: `${fmt(r.amount, r.currency)} to ${r.counterparty} has no approver`,
        description: `Transaction ${r.reference} exceeds the ${fmt(config.approvalThreshold)} approval threshold but has no recorded approval.`,
        recommendation: "Obtain retroactive approval with documented business justification and review the approval workflow.",
        rows: [i],
      });
    }
    if (Math.abs(r.amount) >= 10_000 && Math.abs(r.amount) % 1000 === 0) {
      hits.push({
        code: "TXN-ROUND",
        severity: "low",
        title: `Round amount ${fmt(r.amount, r.currency)} to ${r.counterparty}`,
        description: `Large round-number payments are a common fraud indicator. Reference ${r.reference}.`,
        recommendation: "Confirm the payment is backed by an invoice or contract.",
        rows: [i],
      });
    }
    const day = r.postedAt.getUTCDay();
    if (day === 0 || day === 6) {
      hits.push({
        code: "TXN-WEEKEND",
        severity: "low",
        title: `${r.reference} posted on a weekend`,
        description: `Posted ${r.postedAt.toISOString().slice(0, 10)} (${day === 0 ? "Sunday" : "Saturday"}).`,
        recommendation: "Confirm the posting was expected (e.g. scheduled batch) and authorized.",
        rows: [i],
      });
    }
  });

  // Group by counterparty for multi-row rules.
  const byParty = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const key = r.counterparty.trim().toLowerCase();
    byParty.set(key, [...(byParty.get(key) ?? []), i]);
  });

  for (const idxs of byParty.values()) {
    const sorted = [...idxs].sort((a, b) => rows[a].postedAt.getTime() - rows[b].postedAt.getTime());

    // Structuring: 2+ payments each between 80% and 100% of the threshold within the window, summing over it.
    const near = sorted.filter((i) => {
      const amt = Math.abs(rows[i].amount);
      return amt >= config.reportingThreshold * 0.8 && amt < config.reportingThreshold;
    });
    const used = new Set<number>();
    for (let s = 0; s < near.length; s++) {
      if (used.has(near[s])) continue;
      const start = rows[near[s]].postedAt.getTime();
      const group = near.filter((i) => !used.has(i) && rows[i].postedAt.getTime() - start >= 0 && rows[i].postedAt.getTime() - start <= config.structuringWindowDays * DAY);
      const total = group.reduce((sum, i) => sum + Math.abs(rows[i].amount), 0);
      if (group.length >= 2 && total >= config.reportingThreshold) {
        group.forEach((i) => used.add(i));
        const r0 = rows[group[0]];
        hits.push({
          code: "TXN-STRUCTURING",
          severity: "critical",
          title: `${group.length} payments to ${r0.counterparty} just under ${fmt(config.reportingThreshold)}`,
          description: `${group.length} transactions (${group.map((i) => rows[i].reference).join(", ")}) totalling ${fmt(total, r0.currency)} within ${config.structuringWindowDays} days, each just below the reporting threshold.`,
          recommendation: "Review for structuring, consider filing a SAR, and confirm whether a CTR obligation was avoided.",
          rows: group,
        });
      }
    }

    // Duplicates: same amount and counterparty within 3 days.
    for (let a = 0; a < sorted.length; a++) {
      for (let b = a + 1; b < sorted.length; b++) {
        const ra = rows[sorted[a]];
        const rb = rows[sorted[b]];
        if (rb.postedAt.getTime() - ra.postedAt.getTime() > 3 * DAY) break;
        if (ra.amount === rb.amount && ra.reference !== rb.reference) {
          hits.push({
            code: "TXN-DUPLICATE",
            severity: "medium",
            title: `Possible duplicate: ${fmt(ra.amount, ra.currency)} to ${ra.counterparty} twice`,
            description: `${ra.reference} and ${rb.reference} have the same amount and counterparty within 3 days.`,
            recommendation: "Check whether both invoices are genuine; recover the duplicate if not.",
            rows: [sorted[a], sorted[b]],
          });
        }
      }
    }
  }

  const rank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return hits.sort((x, y) => rank[x.severity] - rank[y.severity]);
}

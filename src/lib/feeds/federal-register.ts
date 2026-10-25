import type { FeedItem, FeedSource } from "./types";

// Finance-relevant US agencies, by Federal Register slug.
export const FR_AGENCIES = [
  "securities-and-exchange-commission",
  "consumer-financial-protection-bureau",
  "financial-crimes-enforcement-network",
  "comptroller-of-the-currency",
  "federal-reserve-system",
  "federal-deposit-insurance-corporation",
  "internal-revenue-service",
  "commodity-futures-trading-commission",
  "foreign-assets-control-office",
];

interface FRDocument {
  document_number: string;
  title: string;
  abstract: string | null;
  type: string;
  html_url: string;
  publication_date: string;
  effective_on: string | null;
  comments_close_on: string | null;
  agencies: { name?: string; raw_name?: string }[];
}

const toDate = (s: string | null | undefined) => (s ? new Date(`${s}T00:00:00Z`) : null);

export function mapFederalRegister(doc: FRDocument): FeedItem {
  return {
    source: "federal-register",
    externalId: doc.document_number,
    title: doc.title,
    agency: doc.agencies.map((a) => a.name ?? a.raw_name).filter(Boolean).join(" / ") || "Federal agency",
    jurisdiction: "US",
    docType: doc.type,
    abstract: doc.abstract ?? "",
    url: doc.html_url,
    publishedAt: toDate(doc.publication_date) ?? new Date(),
    effectiveAt: toDate(doc.effective_on),
    commentDeadline: toDate(doc.comments_close_on),
  };
}

export const federalRegister: FeedSource = {
  id: "federal-register",
  label: "US Federal Register (SEC, CFPB, FinCEN, OCC, Fed, FDIC, IRS, CFTC, OFAC)",
  async fetch({ since, fetchImpl = fetch }) {
    const params = new URLSearchParams();
    params.set("per_page", "50");
    params.set("order", "newest");
    params.set("conditions[publication_date][gte]", since.toISOString().slice(0, 10));
    for (const t of ["RULE", "PRORULE", "NOTICE"]) params.append("conditions[type][]", t);
    for (const a of FR_AGENCIES) params.append("conditions[agencies][]", a);
    for (const f of ["document_number", "title", "abstract", "type", "html_url", "publication_date", "effective_on", "comments_close_on", "agencies"]) {
      params.append("fields[]", f);
    }
    const res = await fetchImpl(`https://www.federalregister.gov/api/v1/documents.json?${params}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Federal Register returned ${res.status}`);
    const body = (await res.json()) as { results?: FRDocument[] };
    return (body.results ?? []).map(mapFederalRegister);
  },
};

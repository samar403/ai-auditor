import Papa from "papaparse";
import type { LedgerRow } from "./rules";

const ALIASES: Record<keyof LedgerRow, string[]> = {
  reference: ["reference", "ref", "id", "transaction_id", "txn_id", "document", "doc_no"],
  postedAt: ["date", "posted_at", "posting_date", "transaction_date", "value_date"],
  amount: ["amount", "value", "debit", "total"],
  currency: ["currency", "ccy"],
  counterparty: ["counterparty", "vendor", "payee", "beneficiary", "customer", "name"],
  country: ["country", "country_code", "beneficiary_country"],
  account: ["account", "gl_account", "gl", "account_code"],
  description: ["description", "memo", "narrative", "details"],
  createdBy: ["created_by", "maker", "entered_by", "preparer"],
  approvedBy: ["approved_by", "checker", "approver"],
};

const norm = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");

export interface ParseResult {
  rows: LedgerRow[];
  errors: string[];
}

export function parseLedgerCsv(csv: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: true, transformHeader: norm });
  const headers = parsed.meta.fields ?? [];
  const col = (key: keyof LedgerRow) => headers.find((h) => ALIASES[key].includes(h));
  const errors: string[] = [];
  for (const required of ["postedAt", "amount", "counterparty"] as const) {
    if (!col(required)) errors.push(`Missing a column for ${required} (accepted names: ${ALIASES[required].join(", ")}).`);
  }
  if (errors.length) return { rows: [], errors };

  const rows: LedgerRow[] = [];
  parsed.data.forEach((raw, i) => {
    const get = (key: keyof LedgerRow) => {
      const c = col(key);
      return c ? (raw[c] ?? "").trim() : "";
    };
    const amount = Number(get("amount").replace(/[^0-9.-]/g, ""));
    const postedAt = new Date(get("postedAt"));
    if (!Number.isFinite(amount) || Number.isNaN(postedAt.getTime())) {
      errors.push(`Row ${i + 2}: could not read the date or amount; skipped.`);
      return;
    }
    rows.push({
      reference: get("reference") || `ROW-${i + 2}`,
      postedAt,
      amount,
      currency: (get("currency") || "USD").toUpperCase(),
      counterparty: get("counterparty") || "Unknown",
      country: (get("country") || "US").toUpperCase(),
      account: get("account") || "Unassigned",
      description: get("description"),
      createdBy: get("createdBy"),
      approvedBy: get("approvedBy"),
    });
  });
  return { rows, errors };
}

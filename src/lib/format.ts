// Client-safe formatting helpers.
export const SEVERITY_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" } as const;
export const STATUS_LABEL = { open: "Open", in_progress: "In progress", remediated: "Remediated", accepted_risk: "Accepted risk" } as const;
export const SOURCE_LABEL = { regulation: "Regulation", policy_gap: "Policy gap", transaction: "Transaction", manual: "Manual" } as const;
export const ROLE_LABEL = { admin: "Admin", analyst: "Analyst", viewer: "Viewer" } as const;

export function fmtDate(v: string | number | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

export function fmtDateTime(v: string | number | Date | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function relDays(v: string | number | Date | null | undefined) {
  if (!v) return "";
  const days = Math.round((new Date(v).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return "today";
  if (days > 0) return `in ${days}d`;
  return `${-days}d ago`;
}

export function fmtMoney(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD" }).format(n);
}

export function toIsoDate(v: string | number | Date | null | undefined) {
  return v ? new Date(v).toISOString().slice(0, 10) : "";
}

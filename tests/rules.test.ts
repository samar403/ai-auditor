import { describe, expect, it } from "vitest";
import { parseLedgerCsv } from "@/lib/monitoring/parse";
import { runRules, type LedgerRow } from "@/lib/monitoring/rules";

const row = (o: Partial<LedgerRow>): LedgerRow => ({
  reference: "R1",
  postedAt: new Date("2026-10-07T00:00:00Z"), // Wednesday
  amount: 1200,
  currency: "USD",
  counterparty: "Acme",
  country: "US",
  account: "6000",
  description: "",
  createdBy: "a",
  approvedBy: "b",
  ...o,
});

const codes = (rows: LedgerRow[]) => runRules(rows).map((h) => h.code);

describe("transaction rules", () => {
  it("passes a clean payment", () => {
    expect(codes([row({})])).toEqual([]);
  });
  it("flags sanctioned jurisdictions and watchlist names", () => {
    expect(codes([row({ country: "ir" })])).toContain("TXN-SANCTIONS-COUNTRY");
    expect(codes([row({ counterparty: "Volkov Trading LLC" })])).toContain("TXN-WATCHLIST");
  });
  it("flags maker-checker breaks case-insensitively", () => {
    expect(codes([row({ createdBy: "S.Okafor", approvedBy: "s.okafor " })])).toContain("TXN-SOD");
  });
  it("flags large payments without approval", () => {
    expect(codes([row({ amount: 30_000.5, approvedBy: "" })])).toContain("TXN-LARGE-UNAPPROVED");
    expect(codes([row({ amount: 24_999, approvedBy: "" })])).not.toContain("TXN-LARGE-UNAPPROVED");
  });
  it("detects structuring just below the threshold within the window", () => {
    const hits = runRules([
      row({ reference: "A", amount: 9500, postedAt: new Date("2026-10-05T00:00:00Z") }),
      row({ reference: "B", amount: 9800, postedAt: new Date("2026-10-08T00:00:00Z") }),
    ]);
    const s = hits.find((h) => h.code === "TXN-STRUCTURING");
    expect(s?.rows).toEqual([0, 1]);
    expect(s?.severity).toBe("critical");
  });
  it("does not call it structuring when payments are far apart", () => {
    expect(
      codes([
        row({ reference: "A", amount: 9500, postedAt: new Date("2026-10-01T00:00:00Z") }),
        row({ reference: "B", amount: 9800, postedAt: new Date("2026-10-20T00:00:00Z") }),
      ]),
    ).not.toContain("TXN-STRUCTURING");
  });
  it("detects duplicates and weekend postings", () => {
    const c = codes([
      row({ reference: "A", amount: 7425.5 }),
      row({ reference: "B", amount: 7425.5, postedAt: new Date("2026-10-10T00:00:00Z") }), // Saturday
    ]);
    expect(c).toContain("TXN-DUPLICATE");
    expect(c).toContain("TXN-WEEKEND");
  });
  it("sorts hits by severity", () => {
    const sev = runRules([row({ country: "KP", amount: 20_000, postedAt: new Date("2026-10-10T00:00:00Z") })]).map((h) => h.severity);
    expect(sev).toEqual([...sev].sort((a, b) => ["critical", "high", "medium", "low"].indexOf(a) - ["critical", "high", "medium", "low"].indexOf(b)));
  });
});

describe("ledger CSV parsing", () => {
  it("maps common header aliases and cleans amounts", () => {
    const { rows, errors } = parseLedgerCsv(`Posting Date,Vendor,Value,Maker,Checker\n2026-10-01,"Acme, Inc.","$1,250.00",a,b\nbad,x,1,a,b`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ counterparty: "Acme, Inc.", amount: 1250, createdBy: "a", approvedBy: "b", country: "US" });
    expect(errors[0]).toMatch(/Row 3/);
  });
  it("explains missing required columns", () => {
    expect(parseLedgerCsv("foo,bar\n1,2").errors[0]).toMatch(/postedAt/);
  });
});

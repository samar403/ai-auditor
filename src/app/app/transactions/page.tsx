"use client";
import Link from "next/link";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { useCan } from "@/components/app/session";
import { apiSend, useApi } from "@/components/use-api";
import { Button, Empty, ErrorNote, Loading, PageHeader, Sheet, SheetHeader, Td, Th } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

type Upload = { id: string; filename: string; rowCount: number; flaggedCount: number; createdAt: string };

const RULES = [
  ["Sanctioned / high-risk country", "Payments to comprehensively sanctioned or FATF call-for-action jurisdictions."],
  ["Watchlist match", "Counterparty name matches a screening list entry."],
  ["Structuring", "Two or more payments just under the $10,000 reporting threshold to one counterparty within 7 days."],
  ["Segregation of duties", "The same person created and approved the payment."],
  ["Large unapproved", "Payment over $25,000 with no recorded approver."],
  ["Duplicate payment", "Same amount and counterparty within 3 days."],
  ["Round amount / weekend", "Lower-severity indicators, flagged on the row for review."],
];

export default function TransactionsPage() {
  const canAct = useCan("analyst");
  const { data, error, loading, reload } = useApi<{ items: Upload[] }>("/api/ledger");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; id?: string; error?: boolean } | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setResult(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const res = await apiSend<{ upload: Upload; hits: number; issuesCreated: number; warnings: string[] }>("/api/ledger", "POST", form);
      setResult({ text: `${res.upload.rowCount} rows checked. ${res.hits} rule hits, ${res.issuesCreated} issues opened.${res.warnings.length ? ` ${res.warnings.length} rows skipped.` : ""}`, id: res.upload.id });
      reload();
    } catch (e) {
      setResult({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Transactions"
        description="Upload an AP, GL or bank export. Every row runs through explainable monitoring rules; anything medium severity or above becomes an issue."
        actions={
          <>
            <a href="/sample-ledger.csv" download className="inline-flex h-10 items-center rounded-[3px] border border-rule-strong bg-sheet px-4 text-sm hover:bg-paper-2">
              Sample CSV
            </a>
            {canAct && (
              <>
                <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <Button onClick={() => input.current?.click()} disabled={busy}>
                  <FileUp className="h-4 w-4" /> {busy ? "Checking…" : "Upload ledger"}
                </Button>
              </>
            )}
          </>
        }
      />
      {result && (
        <div className={`mb-4 rounded-[3px] border px-3 py-2 text-sm ${result.error ? "border-critical/40 bg-critical-soft text-critical" : "border-ledger/40 bg-ledger-soft text-ledger"}`}>
          {result.text} {result.id && <Link href={`/app/transactions/${result.id}`} className="underline">View rows →</Link>}
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Sheet className="overflow-x-auto">
          <SheetHeader title="Uploads" />
          {loading && !data ? (
            <Loading />
          ) : !data?.items.length ? (
            <Empty title="No ledgers yet">Upload a CSV with at least date, amount and counterparty columns. Try the sample file to see the rules in action.</Empty>
          ) : (
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <Th>File</Th>
                  <Th className="text-right">Rows</Th>
                  <Th className="text-right">Flagged</Th>
                  <Th>Uploaded</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-paper-2">
                    <Td>
                      <Link className="font-medium hover:underline" href={`/app/transactions/${u.id}`}>
                        {u.filename}
                      </Link>
                    </Td>
                    <Td className="num text-right">{u.rowCount}</Td>
                    <Td className={`num text-right ${u.flaggedCount ? "text-critical" : ""}`}>{u.flaggedCount}</Td>
                    <Td className="text-ink-2">{fmtDateTime(u.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Sheet>
        <Sheet>
          <SheetHeader eyebrow="Explainable by design" title="Monitoring rules" />
          <dl className="divide-y divide-rule">
            {RULES.map(([k, v]) => (
              <div key={k} className="px-5 py-2.5">
                <dt className="text-sm font-medium">{k}</dt>
                <dd className="text-xs text-ink-3">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-rule px-5 py-3 text-xs text-ink-3">
            Accepted columns: date, amount, counterparty (required); reference, currency, country, account, description, created_by, approved_by.
          </p>
        </Sheet>
      </div>
    </>
  );
}

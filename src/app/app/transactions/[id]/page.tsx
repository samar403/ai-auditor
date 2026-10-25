"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/components/use-api";
import { cx, ErrorNote, Loading, PageHeader, SeverityStamp, Sheet, Td, Th } from "@/components/ui";
import type { Severity, Transaction } from "@/lib/db/schema";
import { fmtDate, fmtMoney } from "@/lib/format";

export default function UploadDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<{ upload: { filename: string; rowCount: number; flaggedCount: number; createdAt: string }; rows: Transaction[]; rules: Record<string, { severity: Severity; name: string }> }>(`/api/ledger/${id}`);
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const rows = onlyFlagged ? data.rows.filter((r) => r.flags.length) : data.rows;
  return (
    <>
      <Link href="/app/transactions" className="mb-3 inline-block text-sm text-ink-3 hover:text-ink">
        ← Transactions
      </Link>
      <PageHeader eyebrow={`Uploaded ${fmtDate(data.upload.createdAt)}`} title={data.upload.filename} description={`${data.upload.rowCount} rows, ${data.upload.flaggedCount} flagged.`} />
      <label className="mb-3 flex items-center gap-2 text-sm text-ink-2">
        <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} className="accent-[var(--ledger)]" /> Only flagged rows
      </label>
      <Sheet className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Reference</Th>
              <Th>Counterparty</Th>
              <Th>Country</Th>
              <Th className="text-right">Amount</Th>
              <Th>Maker / checker</Th>
              <Th>Flags</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cx(r.flags.length > 0 && "bg-critical-soft/30")}>
                <Td className="num whitespace-nowrap">{fmtDate(r.postedAt)}</Td>
                <Td className="num">{r.reference}</Td>
                <Td>
                  {r.counterparty}
                  <div className="text-xs text-ink-3">{r.description}</div>
                </Td>
                <Td>{r.country}</Td>
                <Td className="num text-right">{fmtMoney(r.amount, r.currency)}</Td>
                <Td className="text-xs text-ink-2">
                  {r.createdBy || "—"} / {r.approvedBy || <span className="text-critical">none</span>}
                </Td>
                <Td>
                  <div className="flex flex-col gap-1">
                    {r.flags.map((f) => (
                      <span key={f} className="flex items-center gap-1.5 text-xs">
                        <SeverityStamp severity={data.rules[f]?.severity ?? "low"} /> {data.rules[f]?.name ?? f}
                      </span>
                    ))}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 py-8 text-sm text-ink-3">No flagged rows in this file.</p>}
      </Sheet>
    </>
  );
}

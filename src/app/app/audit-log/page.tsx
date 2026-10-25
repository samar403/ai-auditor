"use client";
import { useMemo, useState } from "react";
import { useApi } from "@/components/use-api";
import { Empty, ErrorNote, Input, Loading, PageHeader, Sheet, Td, Th } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

type Entry = { entry: { id: string; action: string; entityType: string; entityId: string | null; details: Record<string, unknown>; createdAt: string }; actor: string | null };

function summarize(d: Record<string, unknown>) {
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export default function AuditLogPage() {
  const { data, error, loading } = useApi<{ items: Entry[] }>("/api/audit-log");
  const [q, setQ] = useState("");
  const items = useMemo(() => data?.items.filter(({ entry, actor }) => `${entry.action} ${entry.entityType} ${actor ?? ""} ${JSON.stringify(entry.details)}`.toLowerCase().includes(q.toLowerCase())) ?? [], [data, q]);

  return (
    <>
      <PageHeader eyebrow="Evidence" title="Audit trail" description="An append-only record of every analysis, decision and change in this workspace. Entries can't be edited or deleted from the app." />
      <Input className="mb-4 max-w-sm" placeholder="Filter by action, person or detail" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter audit trail" />
      {error && <ErrorNote>{error}</ErrorNote>}
      <Sheet className="overflow-x-auto">
        {loading && !data ? (
          <Loading />
        ) : !items.length ? (
          <Empty title="No entries" />
        ) : (
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ entry, actor }) => (
                <tr key={entry.id}>
                  <Td className="num whitespace-nowrap text-ink-2">{fmtDateTime(entry.createdAt)}</Td>
                  <Td className="whitespace-nowrap">{actor ?? <span className="text-ink-3">AI Auditor</span>}</Td>
                  <Td className="num text-[13px] whitespace-nowrap">{entry.action}</Td>
                  <Td className="max-w-md truncate text-xs text-ink-2">{summarize(entry.details) || entry.entityType}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sheet>
    </>
  );
}

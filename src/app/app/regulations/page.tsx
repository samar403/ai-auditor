"use client";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ApplicabilityLabel, ImpactMeter } from "@/components/app/impact";
import { useCan } from "@/components/app/session";
import { apiSend, useApi } from "@/components/use-api";
import { Button, cx, Empty, ErrorNote, Input, Loading, PageHeader, Select, Sheet, Tag } from "@/components/ui";
import type { Analysis, Regulation } from "@/lib/db/schema";
import { fmtDate } from "@/lib/format";

type Row = { regulation: Regulation; analysis: Analysis | null };

export default function RegulationsPage() {
  const canAct = useCan("analyst");
  const [q, setQ] = useState("");
  const [applicability, setApplicability] = useState("");
  const [docType, setDocType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (applicability) p.set("applicability", applicability);
    if (docType) p.set("docType", docType);
    if (jurisdiction) p.set("jurisdiction", jurisdiction);
    return `/api/regulations?${p}`;
  }, [q, applicability, docType, jurisdiction]);
  const { data, error, loading, reload } = useApi<{ items: Row[]; facets: { docTypes: string[]; jurisdictions: string[] } }>(url);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);

  async function sync() {
    setBusy("sync");
    setNote(null);
    try {
      const res = await apiSend<{ results: { label: string; fetched: number; inserted: number; error?: string }[]; analyzed: number }>("/api/regulations/sync?analyze=8", "POST");
      setNote({ text: res.results.map((r) => `${r.label}: ${r.error ? `unreachable (${r.error})` : `${r.inserted} new of ${r.fetched}`}`).join(" · ") + ` · ${res.analyzed} analyzed` });
      reload();
    } catch (e) {
      setNote({ text: (e as Error).message, error: true });
    } finally {
      setBusy(null);
    }
  }

  async function analyze(id: string) {
    setBusy(id);
    try {
      await apiSend(`/api/regulations/${id}/analyze`, "POST");
      reload();
    } catch (e) {
      setNote({ text: (e as Error).message, error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Regulation feed"
        description="New rules, proposals, guidance and enforcement from regulators, each scored for how much it matters to your business."
        actions={
          canAct && (
            <Button onClick={sync} disabled={busy === "sync"}>
              <RefreshCw className={cx("h-4 w-4", busy === "sync" && "animate-spin")} /> {busy === "sync" ? "Syncing…" : "Sync now"}
            </Button>
          )
        }
      />
      {note && <div className={cx("mb-4 rounded-[3px] border px-3 py-2 text-sm", note.error ? "border-critical/40 bg-critical-soft text-critical" : "border-ledger/40 bg-ledger-soft text-ledger")}>{note.text}</div>}

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_160px_120px]">
        <Input placeholder="Search title, agency or text" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <Select value={applicability} onChange={(e) => setApplicability(e.target.value)} aria-label="Applicability">
          <option value="">Any applicability</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="none">Not applicable</option>
          <option value="unanalyzed">Not analyzed yet</option>
        </Select>
        <Select value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type">
          <option value="">All types</option>
          {data?.facets.docTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} aria-label="Jurisdiction">
          <option value="">All regions</option>
          {data?.facets.jurisdictions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      <Sheet>
        {loading && !data ? (
          <Loading />
        ) : !data?.items.length ? (
          <Empty title="Nothing matches">Try clearing filters, or sync the feed to pull the latest documents.</Empty>
        ) : (
          <ul className="divide-y divide-rule">
            {data.items.map(({ regulation: r, analysis: a }) => (
              <li key={r.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[92px_1fr_auto]">
                <div className="text-xs text-ink-3">
                  <div className="num text-ink-2">{fmtDate(r.publishedAt)}</div>
                  <div className="mt-1">{r.jurisdiction}</div>
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Tag>{r.docType}</Tag>
                    {r.source === "sample" && <Tag>Sample</Tag>}
                    {r.topics.slice(0, 3).map((t) => (
                      <Tag key={t} tone="ledger">
                        {t}
                      </Tag>
                    ))}
                  </div>
                  <Link href={`/app/regulations/${r.id}`} className="font-serif text-[17px] leading-snug font-semibold hover:underline">
                    {r.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-ink-3">{r.agency}</div>
                  {a ? <p className="mt-2 line-clamp-2 text-sm text-ink-2">{a.summary}</p> : <p className="mt-2 line-clamp-2 text-sm text-ink-3">{r.abstract}</p>}
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  {a ? (
                    <>
                      <ImpactMeter score={a.impactScore} applicability={a.applicability} />
                      <ApplicabilityLabel value={a.applicability} />
                    </>
                  ) : (
                    canAct && (
                      <Button size="sm" variant="secondary" onClick={() => analyze(r.id)} disabled={busy === r.id}>
                        <Sparkles className="h-3.5 w-3.5" /> {busy === r.id ? "Analyzing…" : "Analyze"}
                      </Button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}

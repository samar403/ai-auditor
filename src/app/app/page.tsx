"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, RefreshCw } from "lucide-react";
import { useState } from "react";
import { FlowChart, PostureTrend } from "@/components/app/charts";
import { useCan, useSession } from "@/components/app/session";
import { apiSend, useApi } from "@/components/use-api";
import { Button, cx, ErrorNote, Loading, PageHeader, SeverityStamp, Sheet, SheetHeader, Stat, StatusTag, Tag } from "@/components/ui";
import { fmtDate, relDays, SEVERITY_LABEL, SOURCE_LABEL } from "@/lib/format";
import type { IssueStatus, Severity } from "@/lib/db/schema";

interface Dashboard {
  posture: { score: number; grade: string; label: string; delta: number };
  counts: { open: number; critical: number; overdue: number; newRegulations30d: number; watchlist: number; resolved30d: number };
  bySeverity: { severity: Severity; count: number }[];
  bySource: { source: keyof typeof SOURCE_LABEL; count: number }[];
  trend: { week: string; open: number; raised: number; resolved: number; score: number }[];
  deadlines: { kind: string; date: string; title: string; href: string }[];
  watch: { id: string; title: string; agency: string; impactScore: number; applicability: string; effectiveAt: string | null }[];
  priority: { id: string; title: string; severity: Severity; status: IssueStatus; dueAt: string | null; source: keyof typeof SOURCE_LABEL; overdue: boolean }[];
}

const sevBar: Record<Severity, string> = { critical: "bg-critical", high: "bg-high", medium: "bg-medium", low: "bg-low" };

export default function Overview() {
  const { me } = useSession();
  const canSync = useCan("analyst");
  const { data, error, reload } = useApi<Dashboard>("/api/dashboard");
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setSyncNote(null);
    try {
      const res = await apiSend<{ results: { label: string; inserted: number; error?: string }[]; analyzed: number }>("/api/regulations/sync", "POST");
      const inserted = res.results.reduce((s, r) => s + r.inserted, 0);
      const failed = res.results.filter((r) => r.error).length;
      setSyncNote(`${inserted} new documents, ${res.analyzed} analyzed${failed ? `, ${failed} feed${failed > 1 ? "s" : ""} unreachable` : ""}.`);
      reload();
    } catch (e) {
      setSyncNote((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  const maxSev = Math.max(1, ...(data?.bySeverity.map((s) => s.count) ?? [1]));

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${me.user.name.split(" ")[0]}`}
        description="Here is where your compliance stands today."
        actions={
          canSync && (
            <Button variant="secondary" onClick={sync} disabled={syncing}>
              <RefreshCw className={cx("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Syncing feeds…" : "Sync regulation feed"}
            </Button>
          )
        }
      />
      {syncNote && <div className="mb-4 rounded-[3px] border border-ledger/40 bg-ledger-soft px-3 py-2 text-sm text-ledger">{syncNote}</div>}
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data ? (
        <Loading />
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <Sheet className="flex flex-col">
              <SheetHeader eyebrow="Compliance posture" title="Score" />
              <div className="flex flex-1 items-center gap-5 px-5 py-6">
                <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full border-[3px] border-ink">
                  <div className="text-center">
                    <div className="num text-4xl leading-none font-semibold">{data.posture.score}</div>
                    <div className="mt-1 text-[10px] tracking-[0.18em] text-ink-3 uppercase">of 100</div>
                  </div>
                  <span className="absolute -top-2 -right-2 grid h-10 w-10 -rotate-12 place-items-center rounded-full border-2 border-ledger bg-sheet font-serif text-xl font-bold text-ledger">
                    {data.posture.grade}
                  </span>
                </div>
                <div>
                  <div className="font-serif text-xl font-semibold">{data.posture.label}</div>
                  <div className={cx("num mt-1 text-sm", data.posture.delta >= 0 ? "text-ok" : "text-critical")}>
                    {data.posture.delta >= 0 ? "▲" : "▼"} {Math.abs(data.posture.delta)} pts vs 8 weeks ago
                  </div>
                  <p className="mt-2 text-xs text-ink-3">Falls from 100 as open issues add up, weighted by severity. Overdue issues count double.</p>
                </div>
              </div>
            </Sheet>
            <Sheet>
              <SheetHeader eyebrow="Last 8 weeks" title="Posture trend" />
              <div className="px-3 pt-3 pb-2">
                <PostureTrend data={data.trend} />
              </div>
            </Sheet>
          </div>

          <Sheet className="grid grid-cols-2 divide-rule md:grid-cols-6 md:divide-x [&>*]:border-b [&>*]:border-rule md:[&>*]:border-b-0">
            <Stat label="Open issues" value={data.counts.open} />
            <Stat label="Critical" value={data.counts.critical} tone={data.counts.critical ? "critical" : undefined} />
            <Stat label="Overdue" value={data.counts.overdue} tone={data.counts.overdue ? "critical" : undefined} />
            <Stat label="Resolved · 30d" value={data.counts.resolved30d} tone="ok" />
            <Stat label="New rules · 30d" value={data.counts.newRegulations30d} />
            <Stat label="On watchlist" value={data.counts.watchlist} sub="high / medium applicability" />
          </Sheet>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Sheet>
              <SheetHeader
                eyebrow="Work these first"
                title="Priority issues"
                action={
                  <Link href="/app/issues" className="text-sm text-ledger hover:underline">
                    All issues →
                  </Link>
                }
              />
              <ul className="divide-y divide-rule">
                {data.priority.length === 0 && <li className="px-5 py-8 text-sm text-ink-3">No open issues. Nicely done.</li>}
                {data.priority.map((i) => (
                  <li key={i.id}>
                    <Link href={`/app/issues/${i.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-paper-2">
                      <SeverityStamp severity={i.severity} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{i.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                          <span>{SOURCE_LABEL[i.source]}</span>
                          {i.dueAt && <span className={cx(i.overdue && "font-semibold text-critical")}>Due {fmtDate(i.dueAt)} ({relDays(i.dueAt)})</span>}
                        </div>
                      </div>
                      <StatusTag status={i.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Sheet>

            <div className="grid gap-5">
              <Sheet>
                <SheetHeader eyebrow="Open issues" title="By severity" />
                <div className="space-y-2.5 px-5 py-4">
                  {data.bySeverity.map((s) => (
                    <Link key={s.severity} href={`/app/issues?severity=${s.severity}`} className="group grid grid-cols-[72px_1fr_28px] items-center gap-3 text-sm">
                      <span className="text-ink-2 group-hover:text-ink">{SEVERITY_LABEL[s.severity]}</span>
                      <span className="h-3 rounded-r-[4px] bg-paper-2">
                        <span className={cx("block h-3 rounded-r-[4px]", sevBar[s.severity])} style={{ width: `${(s.count / maxSev) * 100}%` }} />
                      </span>
                      <span className="num text-right">{s.count}</span>
                    </Link>
                  ))}
                  <div className="flex flex-wrap gap-1.5 border-t border-rule pt-3">
                    {data.bySource.map((s) => (
                      <Tag key={s.source}>
                        {SOURCE_LABEL[s.source]} · <span className="num ml-1">{s.count}</span>
                      </Tag>
                    ))}
                  </div>
                </div>
              </Sheet>
              <Sheet>
                <SheetHeader eyebrow="Throughput" title="Raised vs resolved" />
                <div className="px-3 pt-3 pb-2">
                  <FlowChart data={data.trend} />
                </div>
              </Sheet>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Sheet>
              <SheetHeader eyebrow="Calendar" title="Upcoming deadlines" />
              <ul className="divide-y divide-rule">
                {data.deadlines.length === 0 && <li className="px-5 py-8 text-sm text-ink-3">Nothing scheduled.</li>}
                {data.deadlines.map((d, k) => (
                  <li key={k}>
                    <Link href={d.href} className="flex items-center gap-4 px-5 py-3 hover:bg-paper-2">
                      <div className="w-14 shrink-0 border-r border-rule pr-3 text-center">
                        <div className="text-[10px] tracking-widest text-ink-3 uppercase">{fmtDate(d.date, { month: "short" })}</div>
                        <div className="num text-xl leading-tight">{fmtDate(d.date, { day: "numeric" })}</div>
                      </div>
                      <div className="min-w-0">
                        <div className={cx("flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase", d.kind === "Overdue" ? "text-critical" : "text-ledger")}>
                          <CalendarClock className="h-3 w-3" /> {d.kind} · {relDays(d.date)}
                        </div>
                        <div className="truncate text-sm">{d.title}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Sheet>
            <Sheet>
              <SheetHeader
                eyebrow="Regulatory watchlist"
                title="Highest impact for you"
                action={
                  <Link href="/app/regulations" className="text-sm text-ledger hover:underline">
                    Feed →
                  </Link>
                }
              />
              <ul className="divide-y divide-rule">
                {data.watch.length === 0 && <li className="px-5 py-8 text-sm text-ink-3">Sync the feed to start monitoring.</li>}
                {data.watch.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/regulations/${r.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-paper-2">
                      <div className="num w-10 shrink-0 text-right text-lg">{r.impactScore}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{r.title}</div>
                        <div className="text-xs text-ink-3">{r.agency}</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Sheet>
          </div>
        </div>
      )}
    </>
  );
}

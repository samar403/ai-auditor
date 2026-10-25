"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";
import { useState } from "react";
import { ApplicabilityLabel, ImpactMeter } from "@/components/app/impact";
import { useCan } from "@/components/app/session";
import { apiSend, useApi } from "@/components/use-api";
import { Button, Empty, ErrorNote, Loading, PageHeader, SeverityStamp, Sheet, SheetHeader, StatusTag, Tag } from "@/components/ui";
import type { Analysis, Issue, Regulation } from "@/lib/db/schema";
import { fmtDate, relDays } from "@/lib/format";

export default function RegulationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const canAct = useCan("analyst");
  const { data, error, reload } = useApi<{ regulation: Regulation; analysis: Analysis | null; issues: Issue[] }>(`/api/regulations/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function analyze() {
    setBusy(true);
    setActionError(null);
    try {
      await apiSend(`/api/regulations/${id}/analyze`, "POST");
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function raiseIssue() {
    if (!data?.analysis) return;
    const { regulation: r, analysis: a } = data;
    const res = await apiSend<{ issue: Issue }>("/api/issues", "POST", {
      title: `Implement: ${r.title}`.slice(0, 200),
      description: a.summary,
      recommendation: a.requiredActions.join("\n"),
      severity: a.impactScore >= 85 ? "critical" : a.impactScore >= 70 ? "high" : a.impactScore >= 50 ? "medium" : "low",
      dueAt: r.effectiveAt ? new Date(r.effectiveAt).toISOString().slice(0, 10) : null,
      regulationId: r.id,
    });
    router.push(`/app/issues/${res.issue.id}`);
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const { regulation: r, analysis: a } = data;

  return (
    <>
      <Link href="/app/regulations" className="no-print mb-3 inline-block text-sm text-ink-3 hover:text-ink">
        ← Regulation feed
      </Link>
      <PageHeader
        eyebrow={`${r.agency} · ${r.docType}`}
        title={r.title}
        actions={
          <>
            <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-rule-strong px-4 text-sm hover:bg-paper-2">
              Source <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {canAct && (
              <Button onClick={analyze} disabled={busy} variant={a ? "secondary" : "primary"}>
                <Sparkles className="h-4 w-4" /> {busy ? "Analyzing…" : a ? "Re-analyze" : "Analyze for my company"}
              </Button>
            )}
          </>
        }
      />
      {actionError && <div className="mb-4"><ErrorNote>{actionError}</ErrorNote></div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="grid content-start gap-5">
          {a ? (
            <Sheet>
              <SheetHeader eyebrow={`Analysis · ${a.model}`} title="What this means for you" action={<ImpactMeter score={a.impactScore} applicability={a.applicability} />} />
              <div className="space-y-5 px-5 py-4">
                <div>
                  <ApplicabilityLabel value={a.applicability} />
                  <p className="mt-2 font-serif text-[17px] leading-relaxed">{a.summary}</p>
                </div>
                <div>
                  <h3 className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Why</h3>
                  <p className="text-sm text-ink-2">{a.rationale}</p>
                </div>
                {a.obligations.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Obligations</h3>
                    <ol className="space-y-2">
                      {a.obligations.map((o, k) => (
                        <li key={k} className="flex gap-3 border-l-2 border-ledger pl-3 text-sm">
                          <span className="num text-ink-3">{String(k + 1).padStart(2, "0")}</span>
                          <div>
                            <div>{o.text}</div>
                            <div className="mt-1 flex gap-2">
                              <Tag tone="ledger">{o.controlArea}</Tag>
                              {o.deadline && <Tag>Due {fmtDate(o.deadline)}</Tag>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div>
                  <h3 className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Next steps</h3>
                  <ul className="list-inside list-[square] space-y-1 text-sm marker:text-ledger">
                    {a.requiredActions.map((x, k) => (
                      <li key={k}>{x}</li>
                    ))}
                  </ul>
                </div>
                {canAct && a.applicability !== "none" && (
                  <Button variant="secondary" onClick={raiseIssue}>
                    Raise an issue from this
                  </Button>
                )}
              </div>
            </Sheet>
          ) : (
            <Sheet>
              <Empty title="Not analyzed yet">Run an analysis to see whether this applies to your company, the obligations it creates, and what to do next.</Empty>
            </Sheet>
          )}
          <Sheet>
            <SheetHeader eyebrow="Source text" title="Abstract" />
            <p className="px-5 py-4 text-sm leading-relaxed whitespace-pre-line text-ink-2">{r.abstract || "No abstract was published with this document."}</p>
          </Sheet>
        </div>

        <div className="grid content-start gap-5">
          <Sheet>
            <SheetHeader title="Key dates" />
            <dl className="divide-y divide-rule text-sm">
              {[
                ["Published", r.publishedAt],
                ["Effective", r.effectiveAt],
                ["Comments close", r.commentDeadline],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between px-5 py-2.5">
                  <dt className="text-ink-3">{k as string}</dt>
                  <dd className="num text-right">
                    {fmtDate(v as string)}
                    {v && <div className="text-xs text-ink-3">{relDays(v as string)}</div>}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between px-5 py-2.5">
                <dt className="text-ink-3">Jurisdiction</dt>
                <dd>{r.jurisdiction}</dd>
              </div>
            </dl>
          </Sheet>
          {a && a.affectedFunctions.length > 0 && (
            <Sheet>
              <SheetHeader title="Affected teams" />
              <div className="flex flex-wrap gap-1.5 px-5 py-4">
                {a.affectedFunctions.map((f) => (
                  <Tag key={f}>{f}</Tag>
                ))}
              </div>
            </Sheet>
          )}
          <Sheet>
            <SheetHeader title="Linked issues" />
            {data.issues.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-3">None yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {data.issues.map((i) => (
                  <li key={i.id}>
                    <Link href={`/app/issues/${i.id}`} className="block space-y-1.5 px-5 py-3 hover:bg-paper-2">
                      <div className="flex items-center justify-between gap-2">
                        <SeverityStamp severity={i.severity} />
                        <StatusTag status={i.status} />
                      </div>
                      <div className="text-sm">{i.title}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Sheet>
        </div>
      </div>
    </>
  );
}

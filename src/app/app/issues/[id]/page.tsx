"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useCan } from "@/components/app/session";
import { apiSend, useApi } from "@/components/use-api";
import { Button, ErrorNote, Field, Input, Loading, PageHeader, Select, SeverityStamp, Sheet, SheetHeader, StatusTag, Tag, Textarea } from "@/components/ui";
import type { Issue, IssueStatus, Policy, Regulation, Severity, Transaction } from "@/lib/db/schema";
import { fmtDate, fmtDateTime, fmtMoney, relDays, SOURCE_LABEL, STATUS_LABEL, toIsoDate } from "@/lib/format";

interface Detail {
  issue: Issue;
  regulation: Regulation | null;
  policy: Policy | null;
  transaction: Transaction | null;
  comments: { id: string; body: string; createdAt: string; author: string | null }[];
  history: { id: string; action: string; details: Record<string, unknown>; createdAt: string; actor: string | null }[];
  members: { id: string; name: string; role: string }[];
}

const ACTION_LABEL: Record<string, string> = {
  "issue.auto_flagged": "Flagged automatically",
  "issue.created": "Created",
  "issue.updated": "Updated",
  "issue.commented": "Commented",
};

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const canEdit = useCan("analyst");
  const { data, error, reload } = useApi<Detail>(`/api/issues/${id}`);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await apiSend(`/api/issues/${id}`, "PATCH", body);
      setNote("");
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await apiSend(`/api/issues/${id}/comments`, "POST", { body: comment });
      setComment("");
      reload();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const { issue: i } = data;

  return (
    <>
      <Link href="/app/issues" className="mb-3 inline-block text-sm text-ink-3 hover:text-ink">
        ← Issues
      </Link>
      <PageHeader eyebrow={`${SOURCE_LABEL[i.source]}${i.ruleCode ? ` · ${i.ruleCode}` : ""} · raised ${fmtDate(i.createdAt)}`} title={i.title} actions={<div className="flex items-center gap-2"><SeverityStamp severity={i.severity} /><StatusTag status={i.status} /></div>} />
      {actionError && <div className="mb-4"><ErrorNote>{actionError}</ErrorNote></div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-5">
          <Sheet>
            <SheetHeader title="Finding" />
            <div className="space-y-4 px-5 py-4">
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{i.description}</p>
              {i.recommendation && (
                <div className="rounded-[3px] border-l-[3px] border-ledger bg-ledger-soft/60 px-4 py-3">
                  <div className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-ledger uppercase">Recommended remediation</div>
                  <p className="text-sm whitespace-pre-line">{i.recommendation}</p>
                </div>
              )}
            </div>
          </Sheet>

          {(data.regulation || data.policy || data.transaction) && (
            <Sheet>
              <SheetHeader title="Evidence" />
              <div className="divide-y divide-rule text-sm">
                {data.regulation && (
                  <Link href={`/app/regulations/${data.regulation.id}`} className="block px-5 py-3 hover:bg-paper-2">
                    <div className="text-[11px] tracking-wider text-ink-3 uppercase">Regulation</div>
                    <div className="font-medium">{data.regulation.title}</div>
                    <div className="text-xs text-ink-3">{data.regulation.agency}</div>
                  </Link>
                )}
                {data.policy && (
                  <Link href="/app/policies" className="block px-5 py-3 hover:bg-paper-2">
                    <div className="text-[11px] tracking-wider text-ink-3 uppercase">Policy</div>
                    <div className="font-medium">{data.policy.title}</div>
                    <div className="text-xs text-ink-3">{data.policy.controlArea} · owner {data.policy.owner || "unassigned"}</div>
                  </Link>
                )}
                {data.transaction && (
                  <Link href={`/app/transactions/${data.transaction.uploadId}`} className="block px-5 py-3 hover:bg-paper-2">
                    <div className="text-[11px] tracking-wider text-ink-3 uppercase">Transaction</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                      <span className="num">{data.transaction.reference}</span>
                      <span className="num">{fmtMoney(data.transaction.amount, data.transaction.currency)}</span>
                      <span>{data.transaction.counterparty}</span>
                      <span className="num">{fmtDate(data.transaction.postedAt)}</span>
                    </div>
                    <div className="mt-1 text-xs text-ink-3">
                      Country {data.transaction.country} · created by {data.transaction.createdBy || "—"} · approved by {data.transaction.approvedBy || "—"}
                    </div>
                  </Link>
                )}
              </div>
            </Sheet>
          )}

          <Sheet>
            <SheetHeader title="Discussion" />
            <ul className="divide-y divide-rule">
              {data.comments.length === 0 && <li className="px-5 py-4 text-sm text-ink-3">No comments yet.</li>}
              {data.comments.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="text-xs text-ink-3">
                    <span className="font-semibold text-ink-2">{c.author ?? "Former member"}</span> · {fmtDateTime(c.createdAt)}
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-line">{c.body}</p>
                </li>
              ))}
            </ul>
            {canEdit && (
              <form onSubmit={addComment} className="flex gap-2 border-t border-rule p-4">
                <Input placeholder="Add a note, evidence link, or update" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button disabled={busy || !comment.trim()}>Post</Button>
              </form>
            )}
          </Sheet>
        </div>

        <div className="grid content-start gap-5">
          <Sheet>
            <SheetHeader title="Workflow" />
            <div className="space-y-4 px-5 py-4">
              <Field label="Status">
                <Select disabled={!canEdit || busy} value={i.status} onChange={(e) => {
                  const status = e.target.value as IssueStatus;
                  if (status === "accepted_risk" && !note.trim()) {
                    setActionError("Write a justification in the note box below, then choose Accepted risk.");
                    return;
                  }
                  patch({ status, ...(note.trim() ? { note } : {}) });
                }}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Severity">
                <Select disabled={!canEdit || busy} value={i.severity} onChange={(e) => patch({ severity: e.target.value as Severity })}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </Field>
              <Field label="Owner">
                <Select disabled={!canEdit || busy} value={i.assigneeId ?? ""} onChange={(e) => patch({ assigneeId: e.target.value || null })}>
                  <option value="">Unassigned</option>
                  {data.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date" hint={i.dueAt ? relDays(i.dueAt) : undefined}>
                <Input type="date" disabled={!canEdit || busy} value={toIsoDate(i.dueAt)} onChange={(e) => patch({ dueAt: e.target.value || null })} />
              </Field>
              {canEdit && (
                <Field label="Decision note" hint="Required when accepting a risk. Saved to the discussion and audit trail.">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
                </Field>
              )}
              {canEdit && i.status !== "remediated" && (
                <Button className="w-full" disabled={busy} onClick={() => patch({ status: "remediated", ...(note.trim() ? { note } : {}) })}>
                  Mark remediated
                </Button>
              )}
            </div>
          </Sheet>
          <Sheet>
            <SheetHeader title="History" />
            <ol className="space-y-3 px-5 py-4">
              {data.history.map((h) => (
                <li key={h.id} className="relative border-l border-rule-strong pl-4 text-sm">
                  <span className="absolute top-1.5 -left-[4px] h-[7px] w-[7px] rounded-full bg-ink" />
                  <div className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</div>
                  <div className="text-xs text-ink-3">
                    {h.actor ?? "AI Auditor"} · {fmtDateTime(h.createdAt)}
                  </div>
                  {h.action === "issue.updated" && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(h.details)
                        .filter(([k]) => k !== "note")
                        .map(([k, v]) => (
                          <Tag key={k}>
                            {k}: {String(v ?? "none")}
                          </Tag>
                        ))}
                    </div>
                  )}
                </li>
              ))}
              {data.history.length === 0 && <li className="text-sm text-ink-3">No recorded changes.</li>}
            </ol>
          </Sheet>
        </div>
      </div>
    </>
  );
}

"use client";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useCan } from "@/components/app/session";
import { apiSend, useApi, useQueryParam } from "@/components/use-api";
import { Button, cx, Empty, ErrorNote, Field, Input, Loading, PageHeader, Select, SeverityStamp, Sheet, StatusTag, Td, Textarea, Th } from "@/components/ui";
import type { Issue } from "@/lib/db/schema";
import { fmtDate, relDays, SOURCE_LABEL } from "@/lib/format";

type Row = { issue: Issue; assignee: { id: string; name: string } | null };

export default function IssuesPage() {
  const canAct = useCan("analyst");
  const urlSeverity = useQueryParam("severity");
  const urlSource = useQueryParam("source");
  const [changed, setFilters] = useState<{ status: string; severity: string; source: string; q: string; mine: string } | null>(null);
  const filters = useMemo(() => changed ?? { status: "active", severity: urlSeverity ?? "", source: urlSource ?? "", q: "", mine: "" }, [changed, urlSeverity, urlSource]);
  const [creating, setCreating] = useState(false);
  const [now] = useState(() => Date.now());

  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString(), [filters]);
  const { data, error, loading, reload } = useApi<{ items: Row[] }>(`/api/issues?${query}`);
  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <>
      <PageHeader
        eyebrow="Findings"
        title="Issues"
        description="Every flag raised by regulation analysis, policy gap checks, transaction monitoring, or your team."
        actions={
          <>
            <a href={`/api/issues/export?${query}`} className="inline-flex h-10 items-center gap-2 rounded-[3px] border border-rule-strong bg-sheet px-4 text-sm hover:bg-paper-2">
              <Download className="h-4 w-4" /> Export CSV
            </a>
            {canAct && (
              <Button onClick={() => setCreating((v) => !v)}>
                <Plus className="h-4 w-4" /> New issue
              </Button>
            )}
          </>
        }
      />

      {creating && <NewIssue onDone={() => (setCreating(false), reload())} />}

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_150px_140px_150px_auto]">
        <Input placeholder="Search issues" value={filters.q} onChange={set("q")} aria-label="Search issues" />
        <Select value={filters.status} onChange={set("status")} aria-label="Status">
          <option value="active">Open + in progress</option>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="remediated">Remediated</option>
          <option value="accepted_risk">Accepted risk</option>
        </Select>
        <Select value={filters.severity} onChange={set("severity")} aria-label="Severity">
          <option value="">Any severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
        <Select value={filters.source} onChange={set("source")} aria-label="Source">
          <option value="">Any source</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 px-1 text-sm text-ink-2">
          <input type="checkbox" checked={!!filters.mine} onChange={(e) => setFilters({ ...filters, mine: e.target.checked ? "1" : "" })} className="accent-[var(--ledger)]" />
          Mine
        </label>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      <Sheet className="overflow-x-auto">
        {loading && !data ? (
          <Loading />
        ) : !data?.items.length ? (
          <Empty title="No issues here">Nothing matches these filters.</Empty>
        ) : (
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <Th>Severity</Th>
                <Th>Issue</Th>
                <Th>Source</Th>
                <Th>Owner</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(({ issue: i, assignee }) => {
                const overdue = (i.status === "open" || i.status === "in_progress") && i.dueAt && new Date(i.dueAt).getTime() < now;
                return (
                  <tr key={i.id} className="hover:bg-paper-2">
                    <Td>
                      <SeverityStamp severity={i.severity} />
                    </Td>
                    <Td className="max-w-md">
                      <Link href={`/app/issues/${i.id}`} className="font-medium hover:underline">
                        {i.title}
                      </Link>
                      {i.ruleCode && <div className="num mt-0.5 text-[11px] text-ink-3">{i.ruleCode}</div>}
                    </Td>
                    <Td className="text-ink-2">{SOURCE_LABEL[i.source]}</Td>
                    <Td className="text-ink-2">{assignee?.name ?? "Unassigned"}</Td>
                    <Td className={cx("num whitespace-nowrap", overdue ? "font-semibold text-critical" : "text-ink-2")}>
                      {fmtDate(i.dueAt)}
                      {i.dueAt && <div className="text-[11px] font-normal">{relDays(i.dueAt)}</div>}
                    </Td>
                    <Td>
                      <StatusTag status={i.status} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Sheet>
      {data && <p className="mt-2 text-xs text-ink-3">{data.items.length} issues</p>}
    </>
  );
}

function NewIssue({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", recommendation: "", severity: "medium", dueAt: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiSend("/api/issues", "POST", { ...form, dueAt: form.dueAt || null });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <Sheet className="mb-5">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <Field label="Title" className="sm:col-span-2">
          <Input required minLength={3} value={form.title} onChange={set("title")} />
        </Field>
        <Field label="What's wrong" className="sm:col-span-2">
          <Textarea required value={form.description} onChange={set("description")} />
        </Field>
        <Field label="Recommended fix" className="sm:col-span-2">
          <Textarea value={form.recommendation} onChange={set("recommendation")} className="min-h-20" />
        </Field>
        <Field label="Severity">
          <Select value={form.severity} onChange={set("severity")}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Due date">
          <Input type="date" value={form.dueAt} onChange={set("dueAt")} />
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <Button disabled={busy}>{busy ? "Saving…" : "Create issue"}</Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

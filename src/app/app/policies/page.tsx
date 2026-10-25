"use client";
import Link from "next/link";
import { Plus, ScanSearch } from "lucide-react";
import { useState } from "react";
import { useCan } from "@/components/app/session";
import { apiSend, useApi } from "@/components/use-api";
import { Button, Empty, ErrorNote, Field, Input, Loading, PageHeader, Select, Sheet, Tag, Textarea } from "@/components/ui";
import type { Issue, Policy } from "@/lib/db/schema";
import { fmtDate } from "@/lib/format";
import { CONTROL_AREAS } from "@/lib/taxonomy";

export default function PoliciesPage() {
  const canAct = useCan("analyst");
  const isAdmin = useCan("admin");
  const { data, error, loading, reload } = useApi<{ items: Policy[] }>("/api/policies");
  const [editing, setEditing] = useState<Policy | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { obligationsChecked: number; issues: Issue[] } | { error: string }>>({});

  async function check(id: string) {
    setBusy(id);
    try {
      const res = await apiSend<{ obligationsChecked: number; issues: Issue[] }>(`/api/policies/${id}/gap-check`, "POST");
      setResults((r) => ({ ...r, [id]: res }));
      reload();
    } catch (e) {
      setResults((r) => ({ ...r, [id]: { error: (e as Error).message } }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: Policy) {
    if (!window.confirm(`Delete "${p.title}"? Its gap issues stay in the issue log.`)) return;
    await apiSend(`/api/policies/${p.id}`, "DELETE");
    reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Controls"
        title="Policies"
        description="Your written policies and procedures. A gap check compares each one with every obligation AI Auditor has found in its control area."
        actions={
          canAct && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add policy
            </Button>
          )
        }
      />
      {editing && <PolicyForm policy={editing === "new" ? null : editing} onDone={() => (setEditing(null), reload())} />}
      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data ? (
        <Loading />
      ) : !data?.items.length ? (
        <Sheet>
          <Empty title="No policies yet">Paste your AML, sanctions, security or treasury policies so AI Auditor can test them against new rules.</Empty>
        </Sheet>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((p) => {
            const r = results[p.id];
            return (
              <Sheet key={p.id} className="flex flex-col">
                <div className="flex-1 px-5 pt-4 pb-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Tag tone="ledger">{p.controlArea}</Tag>
                    <span className="text-xs text-ink-3">{p.lastReviewedAt ? `Checked ${fmtDate(p.lastReviewedAt)}` : "Never checked"}</span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold">{p.title}</h3>
                  <div className="text-xs text-ink-3">Owner: {p.owner || "unassigned"}</div>
                  <p className="mt-2 line-clamp-4 text-sm text-ink-2">{p.content}</p>
                  {r && "error" in r && <div className="mt-3"><ErrorNote>{r.error}</ErrorNote></div>}
                  {r && "issues" in r && (
                    <div className="mt-3 rounded-[3px] border border-rule bg-paper-2 px-3 py-2 text-sm">
                      Checked against {r.obligationsChecked} obligation{r.obligationsChecked === 1 ? "" : "s"}:{" "}
                      {r.issues.length === 0 ? <span className="text-ok">no gaps found.</span> : <Link className="text-critical underline" href="/app/issues?source=policy_gap">{r.issues.length} gap{r.issues.length > 1 ? "s" : ""} flagged</Link>}
                    </div>
                  )}
                </div>
                {canAct && (
                  <div className="flex flex-wrap gap-2 border-t border-rule px-5 py-3">
                    <Button size="sm" onClick={() => check(p.id)} disabled={busy === p.id}>
                      <ScanSearch className="h-3.5 w-3.5" /> {busy === p.id ? "Checking…" : "Run gap check"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => remove(p)}>
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </Sheet>
            );
          })}
        </div>
      )}
    </>
  );
}

function PolicyForm({ policy, onDone }: { policy: Policy | null; onDone: () => void }) {
  const [form, setForm] = useState({ title: policy?.title ?? "", controlArea: policy?.controlArea ?? CONTROL_AREAS[0], owner: policy?.owner ?? "", content: policy?.content ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiSend(policy ? `/api/policies/${policy.id}` : "/api/policies", policy ? "PATCH" : "POST", form);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function loadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
    const text = await file.text();
    setForm((f) => ({ ...f, content: text }));
  }

  return (
    <Sheet className="mb-5">
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-3">
        {error && <div className="sm:col-span-3"><ErrorNote>{error}</ErrorNote></div>}
        <Field label="Title">
          <Input required value={form.title} onChange={set("title")} />
        </Field>
        <Field label="Control area">
          <Select value={form.controlArea} onChange={set("controlArea")}>
            {CONTROL_AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label="Owner">
          <Input value={form.owner} onChange={set("owner")} placeholder="e.g. BSA Officer" />
        </Field>
        <Field label="Policy text" className="sm:col-span-3" hint={<>Paste the text, or load a .txt / .md file: <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={loadFile} className="text-xs" /></>}>
          <Textarea required minLength={20} value={form.content} onChange={set("content")} className="min-h-48" />
        </Field>
        <div className="flex gap-2 sm:col-span-3">
          <Button disabled={busy}>{busy ? "Saving…" : policy ? "Save changes" : "Add policy"}</Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

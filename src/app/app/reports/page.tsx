"use client";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCan } from "@/components/app/session";
import { apiSend, useApi } from "@/components/use-api";
import { Button, Empty, ErrorNote, Field, Input, Loading, PageHeader, Sheet, SheetHeader } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";

type Item = { id: string; title: string; periodStart: string; periodEnd: string; createdAt: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsPage() {
  const router = useRouter();
  const canAct = useCan("analyst");
  const { data, error, loading } = useApi<{ items: Item[] }>("/api/reports");
  const today = new Date();
  const [form, setForm] = useState({ title: "", periodStart: iso(new Date(today.getTime() - 30 * 86_400_000)), periodEnd: iso(today) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await apiSend<{ report: { id: string } }>("/api/reports", "POST", { ...form, title: form.title || undefined });
      router.push(`/app/reports/${res.report.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Board & audit committee" title="Reports" description="A point-in-time compliance pack: posture, open findings, regulatory developments, and an executive summary written by Claude." />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {canAct && (
          <Sheet className="self-start">
            <SheetHeader title="New report" />
            <form onSubmit={generate} className="space-y-4 p-5">
              {err && <ErrorNote>{err}</ErrorNote>}
              <Field label="Title" hint="Optional">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Q4 audit committee pack" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <Input type="date" required value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
                </Field>
                <Field label="To">
                  <Input type="date" required value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
                </Field>
              </div>
              <Button className="w-full" disabled={busy}>
                <FileBarChart className="h-4 w-4" /> {busy ? "Writing report…" : "Generate report"}
              </Button>
            </form>
          </Sheet>
        )}
        <Sheet>
          <SheetHeader title="Archive" />
          {error && <ErrorNote>{error}</ErrorNote>}
          {loading && !data ? (
            <Loading />
          ) : !data?.items.length ? (
            <Empty title="No reports yet">Generate your first pack. Each report is frozen when created, so it stays a reliable record.</Empty>
          ) : (
            <ul className="divide-y divide-rule">
              {data.items.map((r) => (
                <li key={r.id}>
                  <Link href={`/app/reports/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper-2">
                    <div>
                      <div className="font-medium">{r.title}</div>
                      <div className="num text-xs text-ink-3">
                        {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)}
                      </div>
                    </div>
                    <span className="text-xs text-ink-3">{fmtDateTime(r.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>
    </>
  );
}

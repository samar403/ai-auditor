"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Logo } from "@/components/logo";
import { useApi } from "@/components/use-api";
import { Button, ErrorNote, Loading, SeverityStamp, Td, Th } from "@/components/ui";
import type { Severity } from "@/lib/db/schema";
import { fmtDate, SEVERITY_LABEL, SOURCE_LABEL, STATUS_LABEL } from "@/lib/format";
import type { ReportContent } from "@/lib/reports";

type Report = { id: string; title: string; periodStart: string; periodEnd: string; createdAt: string; content: ReportContent };

export default function ReportView() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<{ report: Report }>(`/api/reports/${id}`);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const { report: r } = data;
  const c = r.content;

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/app/reports" className="text-sm text-ink-3 hover:text-ink">
          ← Reports
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / save PDF
        </Button>
      </div>
      <article className="mx-auto max-w-3xl rounded-[4px] border border-rule-strong bg-sheet px-6 py-8 shadow-[6px_6px_0_var(--rule)] sm:px-12 sm:py-12 print:border-0 print:shadow-none">
        <header className="border-b-2 border-ink pb-5">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="text-[11px] font-semibold tracking-[0.18em] text-ink-3 uppercase">Confidential</span>
          </div>
          <h1 className="mt-6 font-serif text-3xl font-semibold">{r.title}</h1>
          <p className="num mt-1 text-sm text-ink-2">
            {c.orgName} · {fmtDate(r.periodStart)} – {fmtDate(r.periodEnd)} · generated {fmtDate(c.generatedAt)}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-px border-b border-rule bg-rule sm:grid-cols-4">
          {[
            ["Posture", `${c.posture.score}/100`, `Grade ${c.posture.grade} · ${c.posture.label}`],
            ["Open issues", c.counts.open, `${c.counts.overdue} overdue`],
            ["Raised in period", c.counts.newInPeriod, ""],
            ["Resolved in period", c.counts.resolvedInPeriod, `${c.counts.acceptedRisk} risks accepted`],
          ].map(([k, v, s]) => (
            <div key={k as string} className="bg-sheet px-3 py-4">
              <div className="text-[10.5px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{k}</div>
              <div className="num mt-1 text-2xl">{v}</div>
              <div className="text-xs text-ink-3">{s}</div>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold">Executive summary</h2>
          <p className="mt-2 leading-relaxed">{c.executiveSummary}</p>
          <h3 className="mt-5 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">Recommendations</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {c.recommendations.map((x, k) => (
              <li key={k}>{x}</li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] text-ink-3">Narrative: {c.model === "template" ? "standard template" : c.model}</p>
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold">Open findings by severity</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {(Object.keys(c.openBySeverity) as Severity[]).map((s) => (
              <span key={s} className="flex items-center gap-2">
                <SeverityStamp severity={s} /> <span className="num">{c.openBySeverity[s]}</span>
              </span>
            ))}
          </div>
          <div className="mt-2 text-xs text-ink-3">
            By source: {Object.entries(c.openBySource).map(([k, v]) => `${SOURCE_LABEL[k as keyof typeof SOURCE_LABEL] ?? k} ${v}`).join(" · ") || "none"}
          </div>
          <table className="mt-4 w-full border-collapse">
            <thead>
              <tr>
                <Th>Severity</Th>
                <Th>Finding</Th>
                <Th>Status</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody>
              {c.topIssues.map((i) => (
                <tr key={i.id}>
                  <Td>{SEVERITY_LABEL[i.severity]}</Td>
                  <Td>{i.title}</Td>
                  <Td className="whitespace-nowrap">{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL]}</Td>
                  <Td className="num whitespace-nowrap">{fmtDate(i.dueAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold">Regulatory developments</h2>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr>
                <Th>Impact</Th>
                <Th>Document</Th>
                <Th>Effective</Th>
              </tr>
            </thead>
            <tbody>
              {c.regulatoryHighlights.map((h) => (
                <tr key={h.id}>
                  <Td className="num">{h.impactScore}</Td>
                  <Td>
                    {h.title}
                    <div className="text-xs text-ink-3">{h.agency}</div>
                  </Td>
                  <Td className="num whitespace-nowrap">{fmtDate(h.effectiveAt)}</Td>
                </tr>
              ))}
              {c.regulatoryHighlights.length === 0 && (
                <tr>
                  <Td className="text-ink-3">No analyzed developments in this period.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <footer className="mt-10 border-t border-rule pt-3 text-[11px] text-ink-3">AI Auditor provides decision support, not legal advice. Findings should be reviewed by qualified compliance staff.</footer>
      </article>
    </>
  );
}

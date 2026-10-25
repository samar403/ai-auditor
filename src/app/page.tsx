import Link from "next/link";
import { ArrowRight, BookOpenCheck, FileWarning, Gauge, Landmark, MessagesSquare, ScanSearch, ScrollText, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

const STEPS = [
  { icon: Landmark, title: "Watch", body: "Pulls new rules, proposals, guidance and enforcement actions from the Federal Register, SEC, CFPB, FinCEN, OFAC, the FCA and more, every day." },
  { icon: ScanSearch, title: "Interpret", body: "Claude reads each document against your company profile, scores the impact, and extracts the concrete obligations and deadlines that apply to you." },
  { icon: FileWarning, title: "Flag", body: "High-impact rules, gaps in your written policies, and risky transactions in your ledger become tracked issues with owners and due dates." },
  { icon: ScrollText, title: "Prove", body: "Every analysis, change and decision lands in an append-only audit trail, and board-ready reports are one click away." },
];

const FEATURES = [
  { icon: Gauge, title: "Compliance posture score", body: "One number, weighted by severity and overdue work, tracked week over week." },
  { icon: BookOpenCheck, title: "Policy gap checks", body: "Paste a policy. AI Auditor compares it to every obligation in its control area and lists what is missing." },
  { icon: ShieldCheck, title: "Transaction monitoring", body: "Upload a ledger export. Explainable rules catch structuring, sanctioned jurisdictions, watchlist hits, duplicate payments and maker-checker breaks." },
  { icon: MessagesSquare, title: "Ask the auditor", body: "Chat with an assistant grounded in your own obligations and open issues, not the open internet." },
];

export default function Landing() {
  return (
    <div className="ledger-lines min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-2 text-sm text-ink-2 hover:text-ink">
            Sign in
          </Link>
          <ButtonLink href="/signup">Start free</ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 border-y border-ink py-1 text-[11px] font-semibold tracking-[0.2em] uppercase">
              AI-native compliance infrastructure
            </p>
            <h1 className="font-serif text-[44px] leading-[1.02] font-semibold tracking-tight sm:text-6xl">
              The regulations changed this morning. <em className="text-ledger not-italic underline decoration-2 underline-offset-[6px]">You already know what to do.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              AI Auditor monitors regulators around the clock, works out which changes apply to your business, and flags the issues in your policies and payments before an
              examiner or auditor does.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup">
                Create a workspace <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/login?demo=1" variant="secondary">
                Explore the demo
              </ButtonLink>
            </div>
            <p className="mt-3 text-xs text-ink-3">Demo login: demo@aiauditor.dev / demo1234</p>
          </div>

          <div className="relative">
            <div className="rotate-[0.6deg] rounded-[4px] border border-rule-strong bg-sheet p-5 shadow-[6px_6px_0_var(--rule)]">
              <div className="flex items-center justify-between border-b border-rule pb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                <span>Finding No. 0142</span>
                <span className="num">25 Oct 2026</span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <h3 className="font-serif text-xl leading-snug font-semibold">Beneficial ownership must be re-verified annually</h3>
                <span className="-rotate-6 rounded-[2px] border-2 border-critical px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-critical uppercase">Critical</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] tracking-wider text-ink-3 uppercase">Source</dt>
                  <dd>FinCEN final rule</dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-wider text-ink-3 uppercase">Impact</dt>
                  <dd className="num">90 / 100</dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-wider text-ink-3 uppercase">Gap</dt>
                  <dd>AML & KYC Program §2</dd>
                </div>
                <div>
                  <dt className="text-[11px] tracking-wider text-ink-3 uppercase">Due</dt>
                  <dd className="num">in 75 days</dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-dashed border-rule pt-3 text-sm text-ink-2">
                Your policy refreshes customer risk every 24 months. The new rule requires verifying legal-entity owners at onboarding and at least annually.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y-2 border-ink bg-sheet">
          <div className="mx-auto grid max-w-6xl gap-0 px-4 sm:px-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="border-rule py-8 md:border-r md:px-6 md:last:border-r-0 md:first:pl-0">
                <div className="num text-xs text-ink-3">0{i + 1}</div>
                <s.icon className="mt-3 h-6 w-6 text-ledger" />
                <h3 className="mt-3 font-serif text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-2">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="max-w-2xl font-serif text-3xl font-semibold tracking-tight">Built for the people who sign the numbers.</h2>
          <p className="mt-2 max-w-2xl text-ink-2">CFOs, controllers and compliance leads at fintechs, lenders, broker-dealers and public companies who can&apos;t afford to read every Federal Register notice.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-[4px] border border-rule bg-sheet p-5">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-ledger" />
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-3 sm:flex-row sm:justify-between sm:px-6">
          <span>AI Auditor provides decision support, not legal advice.</span>
          <span>Analysis powered by Claude.</span>
        </div>
      </footer>
    </div>
  );
}

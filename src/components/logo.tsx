export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect x="1.5" y="1.5" width="29" height="29" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 10h18M7 16h11M7 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m19 21 3 3 5-7" fill="none" stroke="var(--ledger)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-serif text-[19px] font-semibold tracking-tight">
        AI Auditor
      </span>
    </span>
  );
}

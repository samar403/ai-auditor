import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { SEVERITY_LABEL, STATUS_LABEL } from "@/lib/format";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-ledger text-ledger-ink hover:opacity-90 border border-ledger",
  secondary: "bg-sheet text-ink border border-rule-strong hover:bg-paper-2",
  ghost: "text-ink-2 hover:text-ink hover:bg-paper-2 border border-transparent",
  danger: "bg-critical-soft text-critical border border-critical/40 hover:border-critical",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[3px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={cx("inline-flex h-10 items-center justify-center gap-2 rounded-[3px] px-4 text-sm font-medium transition", buttonStyles[variant], className)} {...props} />;
}

/** A "sheet" of ledger paper: the base surface for content blocks. */
export function Sheet({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cx("min-w-0 rounded-[4px] border border-rule bg-sheet shadow-[0_1px_0_var(--rule)]", className)} {...props}>
      {children}
    </section>
  );
}

export function SheetHeader({ title, eyebrow, action }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-rule px-5 pt-4 pb-3">
      <div className="min-w-0">
        {eyebrow && <div className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{eyebrow}</div>}
        <h2 className="truncate font-serif text-lg font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b-2 border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-ledger uppercase">{eyebrow}</div>}
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-[34px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const sevStyles = {
  critical: "text-critical bg-critical-soft border-critical/50",
  high: "text-high bg-high-soft border-high/50",
  medium: "text-medium bg-medium-soft border-medium/50",
  low: "text-low bg-low-soft border-low/50",
} as const;

/** Severity rendered like an ink stamp. */
export function SeverityStamp({ severity }: { severity: keyof typeof sevStyles }) {
  return (
    <span className={cx("inline-flex items-center rounded-[2px] border px-1.5 py-px font-mono text-[10.5px] font-semibold tracking-wider uppercase", sevStyles[severity])}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

const statusStyles = {
  open: "text-ink border-rule-strong",
  in_progress: "text-high border-high/50",
  remediated: "text-ok border-ok/50",
  accepted_risk: "text-ink-3 border-rule-strong border-dashed",
} as const;

export function StatusTag({ status }: { status: keyof typeof statusStyles }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2 py-px text-[12px] whitespace-nowrap", statusStyles[status])}>
      <span className={cx("h-1.5 w-1.5 rounded-full", status === "remediated" ? "bg-ok" : status === "in_progress" ? "bg-high" : status === "open" ? "bg-ink" : "bg-ink-3")} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "ledger" }) {
  return (
    <span className={cx("inline-flex items-center rounded-[2px] px-1.5 py-px text-[11.5px] whitespace-nowrap", tone === "ledger" ? "bg-ledger-soft text-ledger" : "bg-paper-2 text-ink-2")}>
      {children}
    </span>
  );
}

export const inputClass =
  "h-10 w-full rounded-[3px] border border-rule-strong bg-sheet px-3 text-sm text-ink placeholder:text-ink-3 focus:border-ledger focus:outline-none";

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-[12px] font-semibold tracking-wide text-ink-2 uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(inputClass, "pr-8", props.className)} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(inputClass, "h-auto min-h-28 py-2 leading-relaxed", props.className)} />;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="font-serif text-lg font-semibold">{title}</div>
      {children && <div className="max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-10 text-sm text-ink-3" role="status">
      <span className="h-3 w-3 animate-pulse rounded-full bg-ledger" />
      {label}…
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div className="rounded-[3px] border border-critical/40 bg-critical-soft px-3 py-2 text-sm text-critical">{children}</div>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "critical" | "ok" }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">{label}</div>
      <div className={cx("num mt-1 text-3xl font-medium", tone === "critical" && "text-critical", tone === "ok" && "text-ok")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx("border-b border-rule-strong px-3 py-2 text-left text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("border-b border-rule px-3 py-2.5 align-top text-sm", className)}>{children}</td>;
}

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="ledger-lines flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-[4px] border border-rule-strong bg-sheet p-6 shadow-[5px_5px_0_var(--rule)] sm:p-8">
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <div className="mt-6 text-sm text-ink-2">{footer}</div>
    </div>
  );
}

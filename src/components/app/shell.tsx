"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ClipboardList, FileBarChart, Gauge, History, Landmark, Menu, MessagesSquare, Moon, NotebookPen, ReceiptText, Settings, Sun, X, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { apiSend, useApi } from "@/components/use-api";
import { cx, Loading } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/format";
import { SessionContext, type Me } from "./session";

const NAV = [
  { href: "/app", label: "Overview", icon: Gauge, exact: true },
  { href: "/app/regulations", label: "Regulation feed", icon: Landmark },
  { href: "/app/issues", label: "Issues", icon: ClipboardList },
  { href: "/app/policies", label: "Policies", icon: NotebookPen },
  { href: "/app/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/app/reports", label: "Reports", icon: FileBarChart },
  { href: "/app/assistant", label: "Ask the auditor", icon: MessagesSquare },
  { href: "/app/audit-log", label: "Audit trail", icon: History },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const THEME_EVENT = "aa-theme-change";

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribeTheme(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
}

function ThemeToggle() {
  // The saved theme is applied before paint by the inline script in the root layout.
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => null);
  const toggle = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("aa-theme", next);
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  return (
    <button onClick={toggle} className="rounded-[3px] p-2 text-ink-2 hover:bg-paper-2 hover:text-ink" aria-label="Toggle dark mode">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data, error, reload } = useApi<Me>("/api/auth/me");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (error) return <div className="p-8 text-sm text-critical">{error}</div>;
  if (!data) return <Loading label="Opening your ledger" />;

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cx(
              "flex items-center gap-3 rounded-[3px] px-3 py-2 text-[14px] transition",
              active ? "bg-ink font-medium text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const signOut = async () => {
    await apiSend("/api/auth/logout", "POST");
    router.push("/login");
  };

  return (
    <SessionContext value={{ me: data, refresh: reload }}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r-2 border-ink bg-sheet lg:flex">
          <Link href="/app" className="px-6 pt-6 pb-5">
            <Logo />
          </Link>
          <div className="mx-6 mb-4 border-y border-rule py-2">
            <div className="truncate text-sm font-semibold">{data.org.name}</div>
            <div className="text-xs text-ink-3">{data.org.industry}</div>
          </div>
          {nav}
          <div className="mt-auto border-t border-rule px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{data.user.name}</div>
                <div className="text-xs text-ink-3">{ROLE_LABEL[data.user.role]}</div>
              </div>
              <div className="flex">
                <ThemeToggle />
                <button onClick={signOut} className="rounded-[3px] p-2 text-ink-2 hover:bg-paper-2 hover:text-ink" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
            <AiBadge ai={data.ai} />
          </div>
        </aside>

        <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b-2 border-ink bg-sheet px-4 py-3 lg:hidden">
          <Link href="/app">
            <Logo />
          </Link>
          <div className="flex items-center">
            <ThemeToggle />
            <button onClick={() => setOpen(true)} className="p-2" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-sheet py-4">
              <button onClick={() => setOpen(false)} className="mr-3 mb-2 self-end p-2" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
              {nav}
              <div className="mt-auto px-6">
                <AiBadge ai={data.ai} />
                <button onClick={signOut} className="mt-3 text-sm text-ink-2 underline">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </SessionContext>
  );
}

function AiBadge({ ai }: { ai: Me["ai"] }) {
  return (
    <div className={cx("mt-3 flex items-center gap-2 rounded-[3px] border px-2 py-1.5 text-[11.5px]", ai.enabled ? "border-ledger/40 text-ledger" : "border-rule-strong text-ink-3")}>
      <span className={cx("h-1.5 w-1.5 rounded-full", ai.enabled ? "bg-ledger" : "bg-ink-3")} />
      {ai.enabled ? <span className="truncate">Claude · {ai.model}</span> : <span>Offline mode · add API key</span>}
    </div>
  );
}

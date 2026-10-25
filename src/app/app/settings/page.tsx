"use client";
import { useState } from "react";
import { useCan, useSession } from "@/components/app/session";
import { apiSend, useApi, useQueryParam } from "@/components/use-api";
import { Button, cx, ErrorNote, Field, Input, PageHeader, Select, Sheet, SheetHeader, Td, Th } from "@/components/ui";
import type { Role } from "@/lib/db/schema";
import { ROLE_LABEL } from "@/lib/format";
import { ENTITY_TYPES, JURISDICTIONS } from "@/lib/taxonomy";

function Chips({ options, value, onChange, disabled }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button"
            key={o}
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cx("rounded-full border px-3 py-1 text-[13px] transition disabled:opacity-60", on ? "border-ledger bg-ledger text-ledger-ink" : "border-rule-strong text-ink-2 hover:border-ink")}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const { me, refresh } = useSession();
  const isAdmin = useCan("admin");
  const [org, setOrg] = useState({ name: me.org.name, industry: me.org.industry, profile: me.org.profile });
  const [activities, setActivities] = useState(me.org.profile.activities.join(", "));
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const welcome = useQueryParam("welcome") !== null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiSend("/api/org", "PATCH", { ...org, profile: { ...org.profile, activities: activities.split(",").map((s) => s.trim()).filter(Boolean) } });
      setSaved("Profile saved. Re-run analyses on the feed to apply it to existing documents.");
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Settings" description="Your company profile drives every applicability decision AI Auditor makes. Keep it accurate." />
      {welcome && (
        <div className="mb-5 rounded-[3px] border border-ledger/40 bg-ledger-soft px-4 py-3 text-sm text-ledger">
          Welcome aboard. Start by describing your business below, then sync the regulation feed from the Overview page.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Sheet>
          <SheetHeader eyebrow="Used for applicability" title="Company profile" />
          <form onSubmit={save} className="space-y-5 p-5">
            {error && <ErrorNote>{error}</ErrorNote>}
            {saved && <div className="text-sm text-ok">{saved}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name">
                <Input disabled={!isAdmin} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
              </Field>
              <Field label="Industry">
                <Input disabled={!isAdmin} value={org.industry} onChange={(e) => setOrg({ ...org, industry: e.target.value })} />
              </Field>
            </div>
            <Field label="Jurisdictions you operate in">
              <Chips disabled={!isAdmin} options={JURISDICTIONS} value={org.profile.jurisdictions} onChange={(v) => setOrg({ ...org, profile: { ...org.profile, jurisdictions: v } })} />
            </Field>
            <Field label="What kind of entity are you">
              <Chips disabled={!isAdmin} options={ENTITY_TYPES} value={org.profile.entityTypes} onChange={(v) => setOrg({ ...org, profile: { ...org.profile, entityTypes: v } })} />
            </Field>
            <Field label="Business activities" hint="Comma separated, e.g. payments, lending, crypto custody, cross-border">
              <Input disabled={!isAdmin} value={activities} onChange={(e) => setActivities(e.target.value)} />
            </Field>
            <Field label="Annual revenue">
              <Select disabled={!isAdmin} value={org.profile.annualRevenueBand} onChange={(e) => setOrg({ ...org, profile: { ...org.profile, annualRevenueBand: e.target.value } })}>
                <option value="">Not set</option>
                {["<$10M", "$10M-$100M", "$100M-$500M", "$500M-$1B", ">$1B"].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
            </Field>
            {isAdmin && <Button>Save profile</Button>}
          </form>
        </Sheet>
        <div className="grid content-start gap-5">
          <Members />
          <Sheet>
            <SheetHeader title="AI engine" />
            <div className="space-y-2 px-5 py-4 text-sm">
              <div>
                Status: <strong className={me.ai.enabled ? "text-ok" : "text-high"}>{me.ai.enabled ? "Connected" : "Offline mode"}</strong>
              </div>
              <div className="num text-ink-2">Model: {me.ai.model}</div>
              {!me.ai.enabled && <p className="text-ink-3">Without an Anthropic API key, AI Auditor uses its built-in keyword engine. Set ANTHROPIC_API_KEY for full Claude analysis, gap checks, report narratives and the assistant.</p>}
            </div>
          </Sheet>
        </div>
      </div>
    </>
  );
}

function Members() {
  const { me } = useSession();
  const isAdmin = useCan("admin");
  const { data, reload } = useApi<{ items: { id: string; name: string; email: string; role: Role }[] }>("/api/org/members");
  const [form, setForm] = useState({ name: "", email: "", role: "analyst" as Role, password: "" });
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiSend("/api/org/members", "POST", form);
      setForm({ name: "", email: "", role: "analyst", password: "" });
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function act(id: string, method: "PATCH" | "DELETE", body?: unknown) {
    setError(null);
    try {
      await apiSend(`/api/org/members/${id}`, method, body);
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Sheet>
      <SheetHeader title="Team" />
      {error && <div className="px-5 pt-3"><ErrorNote>{error}</ErrorNote></div>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Role</Th>
              {isAdmin && <Th />}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((m) => (
              <tr key={m.id}>
                <Td>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-ink-3">{m.email}</div>
                </Td>
                <Td>
                  {isAdmin && m.id !== me.user.id ? (
                    <Select className="h-8 w-28 text-[13px]" value={m.role} onChange={(e) => act(m.id, "PATCH", { role: e.target.value })} aria-label={`Role for ${m.name}`}>
                      {Object.entries(ROLE_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    ROLE_LABEL[m.role]
                  )}
                </Td>
                {isAdmin && (
                  <Td className="text-right">
                    {m.id !== me.user.id && (
                      <button className="text-xs text-critical hover:underline" onClick={() => window.confirm(`Remove ${m.name}?`) && act(m.id, "DELETE")}>
                        Remove
                      </button>
                    )}
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <form onSubmit={add} className="grid gap-3 border-t border-rule p-5 sm:grid-cols-2">
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Name" />
          <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} aria-label="Role">
            <option value="viewer">Viewer (read only)</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </Select>
          <Input required minLength={8} type="text" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-label="Temporary password" />
          <Button className="sm:col-span-2" variant="secondary">
            Add teammate
          </Button>
        </form>
      )}
    </Sheet>
  );
}

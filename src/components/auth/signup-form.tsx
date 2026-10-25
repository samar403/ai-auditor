"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "@/components/use-api";
import { Button, ErrorNote, Field, Input } from "@/components/ui";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ orgName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiSend("/api/auth/signup", "POST", form);
      router.push("/app/settings?welcome=1");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Company">
        <Input required value={form.orgName} onChange={set("orgName")} placeholder="Acme Payments Inc." />
      </Field>
      <Field label="Your name">
        <Input required autoComplete="name" value={form.name} onChange={set("name")} />
      </Field>
      <Field label="Work email">
        <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
      </Field>
      <Button className="w-full" disabled={busy}>
        {busy ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}

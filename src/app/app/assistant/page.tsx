"use client";
import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/app/markdown";
import { useSession } from "@/components/app/session";
import { Button, cx, PageHeader, Sheet } from "@/components/ui";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What are our three most urgent compliance risks this month?",
  "Which open issues are overdue and who owns them?",
  "Summarize what the beneficial ownership rule requires from us.",
  "Draft a short update for the CFO on our compliance posture.",
];

export default function AssistantPage() {
  const { me } = useSession();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [turns]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;
    const history: Turn[] = [...turns, { role: "user", content: question }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setStreaming(true);
    abort.current = new AbortController();
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20) }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns([...history, { role: "assistant", content: acc }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setTurns(history.slice(0, -1));
        setInput(question);
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Grounded in your workspace" title="Ask the auditor" description="Questions are answered from your analyzed regulations, obligations and open issues. Decision support, not legal advice." />
      {!me.ai.enabled && (
        <div className="mb-4 rounded-[3px] border border-high/40 bg-high-soft px-3 py-2 text-sm text-high">
          The assistant needs Claude. Add <code>ANTHROPIC_API_KEY</code> to your environment and restart the server.
        </div>
      )}
      <Sheet className="flex min-h-[60vh] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {turns.length === 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={!me.ai.enabled} className="rounded-[3px] border border-rule bg-paper px-4 py-3 text-left text-sm text-ink-2 hover:border-ledger hover:text-ink disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          )}
          {turns.map((t, k) => (
            <div key={k} className={cx("flex", t.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[85%] rounded-[4px] px-4 py-3", t.role === "user" ? "bg-ink text-paper" : "border border-rule bg-paper")}>
                {t.role === "assistant" ? t.content ? <Markdown text={t.content} /> : <span className="text-sm text-ink-3">Reading your ledger…</span> : <p className="text-sm whitespace-pre-line">{t.content}</p>}
              </div>
            </div>
          ))}
          {error && <div className="text-sm text-critical">{error}</div>}
          <div ref={end} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t border-rule p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="Ask about a rule, an issue, or a deadline"
            aria-label="Message"
            className="max-h-40 min-h-10 flex-1 resize-y rounded-[3px] border border-rule-strong bg-sheet px-3 py-2 text-sm focus:border-ledger focus:outline-none"
            disabled={!me.ai.enabled}
          />
          {streaming ? (
            <Button type="button" variant="secondary" onClick={() => abort.current?.abort()} aria-label="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={!input.trim() || !me.ai.enabled} aria-label="Send">
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </form>
      </Sheet>
    </>
  );
}

import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Spins up a fake Messages API that streams a canned structured answer, so we can check the
// exact request the app sends and that the SDK's parsed output flows back through.
let server: Server;
let lastBody: Record<string, unknown> = {};
let lastHeaders: Record<string, string | string[] | undefined> = {};

const answer = {
  applicability: "high",
  impactScore: 88,
  summary: "Verify beneficial owners annually.",
  rationale: "You are an MSB in the US.",
  obligations: [{ text: "Re-verify owners annually", controlArea: "AML / KYC", deadline: "2027-01-08" }],
  requiredActions: ["Update KYC procedure"],
  affectedFunctions: ["Compliance"],
};

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      lastBody = JSON.parse(raw);
      lastHeaders = req.headers;
      const ev = (type: string, data: unknown) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      res.writeHead(200, { "content-type": "text/event-stream" });
      ev("message_start", { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } });
      ev("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
      ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: JSON.stringify(answer) } });
      ev("content_block_stop", { type: "content_block_stop", index: 0 });
      ev("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 50 } });
      ev("message_stop", { type: "message_stop" });
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_BASE_URL;
});

describe("regulation analysis request", () => {
  it("sends a structured-output request to the latest Opus and returns the parsed result", async () => {
    const { analyzeRegulation } = await import("@/lib/ai/regulation");
    const res = await analyzeRegulation(
      { title: "CDD rule", abstract: "Owners", agency: "FinCEN", jurisdiction: "US", docType: "Rule", publishedAt: new Date("2026-10-13"), effectiveAt: new Date("2027-01-08"), commentDeadline: null, url: "https://example.gov" } as never,
      { name: "Northwind", industry: "Fintech", profile: { jurisdictions: ["US"], entityTypes: ["Money services business"], activities: ["payments"], annualRevenueBand: "" } } as never,
    );
    expect(res).toMatchObject({ ...answer, model: "claude-opus-5-5" });
    expect(lastBody).toMatchObject({ model: "claude-opus-5-5", stream: true, thinking: { type: "adaptive" }, fallbacks: "default" });
    expect((lastBody.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    expect(String(lastHeaders["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
  });
});

import { z } from "zod";
import { HttpError, parseBody, withAuth } from "@/lib/api";
import { isAIEnabled } from "@/lib/ai/client";
import { buildContext, streamAssistant } from "@/lib/ai/assistant";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1].role === "user", "Last message must be from the user."),
});

/** Streams plain text chunks of Claude's answer. */
export const POST = withAuth("viewer", async ({ req, user }) => {
  if (!isAIEnabled()) throw new HttpError(503, "The assistant needs an Anthropic API key. Add ANTHROPIC_API_KEY to your environment.");
  if (!rateLimit(`assistant:${user.id}:${clientKey(req)}`, 30, 60 * 60_000)) throw new HttpError(429, "Hourly assistant limit reached.");
  const { messages } = await parseBody(req, Body);
  const stream = streamAssistant(await buildContext(user.orgId), messages);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      try {
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n_The model declined to answer this request._"));
      } catch (err) {
        console.error(err);
        controller.enqueue(encoder.encode("\n\n_Something went wrong while answering. Please try again._"));
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
});

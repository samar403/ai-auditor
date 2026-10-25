import "server-only";
import { db } from "@/lib/db";
import { regulations } from "@/lib/db/schema";
import { detectTopics } from "@/lib/ai/heuristics";
import { federalRegister } from "./federal-register";
import { rssSources } from "./rss";
import type { FeedSource } from "./types";

export const FEED_SOURCES: FeedSource[] = [federalRegister, ...rssSources];

export interface SyncResult {
  source: string;
  label: string;
  fetched: number;
  inserted: number;
  error?: string;
}

/** Pulls every feed and upserts new documents. One failing feed never blocks the others. */
export async function syncFeeds(opts: { sinceDays?: number; fetchImpl?: typeof fetch } = {}): Promise<SyncResult[]> {
  const since = new Date(Date.now() - (opts.sinceDays ?? 30) * 86_400_000);
  return Promise.all(
    FEED_SOURCES.map(async (src): Promise<SyncResult> => {
      try {
        const items = await src.fetch({ since, fetchImpl: opts.fetchImpl });
        let inserted = 0;
        for (const item of items) {
          const res = await db
            .insert(regulations)
            .values({ ...item, topics: detectTopics(`${item.title} ${item.abstract}`) })
            .onConflictDoNothing({ target: [regulations.source, regulations.externalId] })
            .returning({ id: regulations.id });
          inserted += res.length;
        }
        return { source: src.id, label: src.label, fetched: items.length, inserted };
      } catch (err) {
        return { source: src.id, label: src.label, fetched: 0, inserted: 0, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
}

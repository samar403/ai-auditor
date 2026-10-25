import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, regulations } from "@/lib/db/schema";
import { withAuth } from "@/lib/api";
import { syncFeeds } from "@/lib/feeds";
import { runRegulationAnalysis } from "@/lib/services/analysis";
import { recordAudit } from "@/lib/audit";

export const maxDuration = 300;

/** Pull every feed, then analyze up to `analyzeLimit` documents this org has not seen yet. */
export const POST = withAuth("analyst", async ({ req, user }) => {
  const url = new URL(req.url);
  const analyzeLimit = Math.min(Number(url.searchParams.get("analyze") ?? 5) || 0, 20);
  const results = await syncFeeds();

  const pending = await db
    .select({ id: regulations.id })
    .from(regulations)
    .leftJoin(analyses, and(eq(analyses.regulationId, regulations.id), eq(analyses.orgId, user.orgId)))
    .where(isNull(analyses.id))
    .orderBy(desc(regulations.publishedAt))
    .limit(analyzeLimit);

  let analyzed = 0;
  const errors: string[] = [];
  for (const p of pending) {
    try {
      await runRegulationAnalysis(user.orgId, p.id, user.id);
      analyzed++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "feed.synced", entityType: "feed", details: { results, analyzed } });
  return Response.json({ results, analyzed, errors });
});

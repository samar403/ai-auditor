import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, organizations, regulations } from "@/lib/db/schema";
import { syncFeeds } from "@/lib/feeds";
import { runRegulationAnalysis } from "@/lib/services/analysis";

export const maxDuration = 300;

/**
 * Scheduled job: sync all feeds, then analyze new documents for every workspace.
 * Call with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await syncFeeds({ sinceDays: 7 });
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  let analyzed = 0;
  for (const org of orgs) {
    const pending = await db
      .select({ id: regulations.id })
      .from(regulations)
      .leftJoin(analyses, and(eq(analyses.regulationId, regulations.id), eq(analyses.orgId, org.id)))
      .where(isNull(analyses.id))
      .orderBy(desc(regulations.publishedAt))
      .limit(10);
    for (const p of pending) {
      await runRegulationAnalysis(org.id, p.id, null).then(() => analyzed++, (err) => console.error("cron analysis failed", err));
    }
  }
  return Response.json({ results, analyzed });
}

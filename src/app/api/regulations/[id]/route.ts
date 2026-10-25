import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, issues, regulations } from "@/lib/db/schema";
import { HttpError, withAuth } from "@/lib/api";

export const GET = withAuth<{ id: string }>("viewer", async ({ user, params }) => {
  const regulation = await db.query.regulations.findFirst({ where: eq(regulations.id, params.id) });
  if (!regulation) throw new HttpError(404, "Regulation not found.");
  const [analysis, linked] = await Promise.all([
    db.query.analyses.findFirst({ where: and(eq(analyses.regulationId, params.id), eq(analyses.orgId, user.orgId)) }),
    db.query.issues.findMany({ where: and(eq(issues.regulationId, params.id), eq(issues.orgId, user.orgId)), orderBy: desc(issues.createdAt) }),
  ]);
  return Response.json({ regulation, analysis: analysis ?? null, issues: linked });
});

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { HttpError, withAuth } from "@/lib/api";

export const GET = withAuth<{ id: string }>("viewer", async ({ user, params }) => {
  const report = await db.query.reports.findFirst({ where: and(eq(reports.id, params.id), eq(reports.orgId, user.orgId)) });
  if (!report) throw new HttpError(404, "Report not found.");
  return Response.json({ report });
});

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { buildReport } from "@/lib/reports";

export const maxDuration = 300;

export const GET = withAuth("viewer", async ({ user }) => {
  const items = await db
    .select({ id: reports.id, title: reports.title, periodStart: reports.periodStart, periodEnd: reports.periodEnd, createdAt: reports.createdAt })
    .from(reports)
    .where(eq(reports.orgId, user.orgId))
    .orderBy(desc(reports.createdAt));
  return Response.json({ items });
});

const Body = z.object({ title: z.string().trim().min(2).max(160).optional(), periodStart: z.iso.date(), periodEnd: z.iso.date() });

export const POST = withAuth("analyst", async ({ req, user }) => {
  const body = await parseBody(req, Body);
  const start = new Date(`${body.periodStart}T00:00:00Z`);
  const end = new Date(`${body.periodEnd}T23:59:59Z`);
  const content = await buildReport(user.orgId, start, end);
  const [report] = await db
    .insert(reports)
    .values({ orgId: user.orgId, title: body.title ?? `Compliance report ${body.periodStart} to ${body.periodEnd}`, periodStart: start, periodEnd: end, content, createdBy: user.id })
    .returning();
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "report.generated", entityType: "report", entityId: report.id });
  return Response.json({ report }, { status: 201 });
});

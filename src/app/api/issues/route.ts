import { z } from "zod";
import { db } from "@/lib/db";
import { issues } from "@/lib/db/schema";
import { parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { listIssues } from "@/lib/issues";

export const GET = withAuth("viewer", async ({ req, user }) => {
  const search = new URL(req.url).searchParams;
  search.set("userId", user.id);
  return Response.json({ items: await listIssues(user.orgId, search) });
});

const Create = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(10_000),
  recommendation: z.string().trim().max(10_000).default(""),
  severity: z.enum(["critical", "high", "medium", "low"]),
  dueAt: z.iso.date().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  regulationId: z.string().nullable().optional(),
});

export const POST = withAuth("analyst", async ({ req, user }) => {
  const body = await parseBody(req, Create);
  const [issue] = await db
    .insert(issues)
    .values({ ...body, orgId: user.orgId, source: "manual", ruleCode: "MANUAL", dueAt: body.dueAt ? new Date(`${body.dueAt}T00:00:00Z`) : null })
    .returning();
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "issue.created", entityType: "issue", entityId: issue.id, details: { severity: issue.severity } });
  return Response.json({ issue }, { status: 201 });
});

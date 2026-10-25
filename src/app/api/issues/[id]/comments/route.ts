import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueComments, issues } from "@/lib/db/schema";
import { HttpError, parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

export const POST = withAuth<{ id: string }>("analyst", async ({ req, user, params }) => {
  const issue = await db.query.issues.findFirst({ where: and(eq(issues.id, params.id), eq(issues.orgId, user.orgId)) });
  if (!issue) throw new HttpError(404, "Issue not found.");
  const { body } = await parseBody(req, z.object({ body: z.string().trim().min(1).max(5000) }));
  const [comment] = await db.insert(issueComments).values({ issueId: issue.id, userId: user.id, body }).returning();
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "issue.commented", entityType: "issue", entityId: issue.id });
  return Response.json({ comment: { ...comment, author: user.name } }, { status: 201 });
});

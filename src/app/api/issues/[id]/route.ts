import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog, issueComments, issues, policies, regulations, transactions, users } from "@/lib/db/schema";
import { HttpError, parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

async function load(orgId: string, id: string) {
  const issue = await db.query.issues.findFirst({ where: and(eq(issues.id, id), eq(issues.orgId, orgId)) });
  if (!issue) throw new HttpError(404, "Issue not found.");
  return issue;
}

export const GET = withAuth<{ id: string }>("viewer", async ({ user, params }) => {
  const issue = await load(user.orgId, params.id);
  const [regulation, policy, transaction, comments, history] = await Promise.all([
    issue.regulationId ? db.query.regulations.findFirst({ where: eq(regulations.id, issue.regulationId) }) : null,
    issue.policyId ? db.query.policies.findFirst({ where: eq(policies.id, issue.policyId) }) : null,
    issue.transactionId ? db.query.transactions.findFirst({ where: eq(transactions.id, issue.transactionId) }) : null,
    db
      .select({ id: issueComments.id, body: issueComments.body, createdAt: issueComments.createdAt, author: users.name })
      .from(issueComments)
      .leftJoin(users, eq(users.id, issueComments.userId))
      .where(eq(issueComments.issueId, issue.id))
      .orderBy(asc(issueComments.createdAt)),
    db
      .select({ id: auditLog.id, action: auditLog.action, details: auditLog.details, createdAt: auditLog.createdAt, actor: users.name })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .where(and(eq(auditLog.orgId, user.orgId), eq(auditLog.entityType, "issue"), eq(auditLog.entityId, issue.id)))
      .orderBy(asc(auditLog.createdAt)),
  ]);
  const members = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.orgId, user.orgId));
  return Response.json({ issue, regulation, policy, transaction, comments, history, members });
});

const Patch = z
  .object({
    status: z.enum(["open", "in_progress", "remediated", "accepted_risk"]),
    severity: z.enum(["critical", "high", "medium", "low"]),
    assigneeId: z.string().nullable(),
    dueAt: z.iso.date().nullable(),
    title: z.string().trim().min(3).max(200),
    recommendation: z.string().max(10_000),
    note: z.string().trim().max(2000),
  })
  .partial();

export const PATCH = withAuth<{ id: string }>("analyst", async ({ req, user, params }) => {
  const issue = await load(user.orgId, params.id);
  const { note, dueAt, ...body } = await parseBody(req, Patch);
  if (body.status === "accepted_risk" && !note) throw new HttpError(400, "Accepting a risk needs a justification note.");
  if (body.assigneeId) {
    const member = await db.query.users.findFirst({ where: and(eq(users.id, body.assigneeId), eq(users.orgId, user.orgId)) });
    if (!member) throw new HttpError(400, "Assignee must be a member of your workspace.");
  }
  const update: Partial<typeof issues.$inferInsert> = { ...body, updatedAt: new Date() };
  if (dueAt !== undefined) update.dueAt = dueAt ? new Date(`${dueAt}T00:00:00Z`) : null;
  if (body.status) update.resolvedAt = body.status === "remediated" || body.status === "accepted_risk" ? new Date() : null;

  const [updated] = await db.update(issues).set(update).where(eq(issues.id, issue.id)).returning();
  const changes = Object.fromEntries(
    Object.entries({ ...body, dueAt }).filter(([k, v]) => v !== undefined && String(v) !== String((issue as Record<string, unknown>)[k] ?? "")),
  );
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "issue.updated", entityType: "issue", entityId: issue.id, details: { ...changes, ...(note ? { note } : {}) } });
  if (note) await db.insert(issueComments).values({ issueId: issue.id, userId: user.id, body: note });
  return Response.json({ issue: updated });
});

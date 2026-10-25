import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { policies } from "@/lib/db/schema";
import { HttpError, parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { PolicyBody } from "../route";

export const PATCH = withAuth<{ id: string }>("analyst", async ({ req, user, params }) => {
  const body = await parseBody(req, PolicyBody.partial());
  const [policy] = await db.update(policies).set(body).where(and(eq(policies.id, params.id), eq(policies.orgId, user.orgId))).returning();
  if (!policy) throw new HttpError(404, "Policy not found.");
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "policy.updated", entityType: "policy", entityId: policy.id, details: { fields: Object.keys(body) } });
  return Response.json({ policy });
});

export const DELETE = withAuth<{ id: string }>("admin", async ({ user, params }) => {
  const [policy] = await db.delete(policies).where(and(eq(policies.id, params.id), eq(policies.orgId, user.orgId))).returning();
  if (!policy) throw new HttpError(404, "Policy not found.");
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "policy.deleted", entityType: "policy", entityId: policy.id, details: { title: policy.title } });
  return Response.json({ ok: true });
});

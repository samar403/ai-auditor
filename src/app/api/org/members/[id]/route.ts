import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { HttpError, parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

async function guard(orgId: string, actorId: string, id: string) {
  if (id === actorId) throw new HttpError(400, "You can't change your own role or remove yourself.");
  const member = await db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.orgId, orgId)) });
  if (!member) throw new HttpError(404, "Member not found.");
  return member;
}

export const PATCH = withAuth<{ id: string }>("admin", async ({ req, user, params }) => {
  const member = await guard(user.orgId, user.id, params.id);
  const { role } = await parseBody(req, z.object({ role: z.enum(["admin", "analyst", "viewer"]) }));
  await db.update(users).set({ role }).where(eq(users.id, member.id));
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "member.role_changed", entityType: "user", entityId: member.id, details: { from: member.role, to: role } });
  return Response.json({ ok: true });
});

export const DELETE = withAuth<{ id: string }>("admin", async ({ user, params }) => {
  const member = await guard(user.orgId, user.id, params.id);
  await db.delete(users).where(eq(users.id, member.id));
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "member.removed", entityType: "user", entityId: member.id, details: { email: member.email } });
  return Response.json({ ok: true });
});

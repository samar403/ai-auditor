import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth";
import { HttpError, parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

export const GET = withAuth("viewer", async ({ user }) => {
  const items = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.orgId, user.orgId))
    .orderBy(asc(users.createdAt));
  return Response.json({ items });
});

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase(),
  role: z.enum(["admin", "analyst", "viewer"]),
  password: z.string().min(8).max(200),
});

/** Admins add teammates with a temporary password they share out of band. */
export const POST = withAuth("admin", async ({ req, user }) => {
  const body = await parseBody(req, Body);
  if (await db.query.users.findFirst({ where: eq(users.email, body.email) })) throw new HttpError(409, "That email already has an account.");
  const [member] = await db
    .insert(users)
    .values({ orgId: user.orgId, name: body.name, email: body.email, role: body.role, passwordHash: await hashPassword(body.password) })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "member.added", entityType: "user", entityId: member.id, details: { email: member.email, role: member.role } });
  return Response.json({ member }, { status: 201 });
});

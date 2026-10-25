import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, users } from "@/lib/db/schema";
import { withAuth } from "@/lib/api";

export const GET = withAuth("viewer", async ({ user }) => {
  const items = await db
    .select({ entry: auditLog, actor: users.name })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .where(eq(auditLog.orgId, user.orgId))
    .orderBy(desc(auditLog.createdAt))
    .limit(300);
  return Response.json({ items });
});

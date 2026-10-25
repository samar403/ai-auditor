import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export async function recordAudit(entry: {
  orgId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    orgId: entry.orgId,
    userId: entry.userId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    details: entry.details ?? {},
  });
}

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().max(120),
  profile: z.object({
    jurisdictions: z.array(z.string().trim().min(1).max(20)).max(20),
    entityTypes: z.array(z.string().trim().min(1).max(60)).max(20),
    activities: z.array(z.string().trim().min(1).max(60)).max(30),
    annualRevenueBand: z.string().trim().max(40),
  }),
});

export const PATCH = withAuth("admin", async ({ req, user }) => {
  const body = await parseBody(req, Body);
  const [org] = await db.update(organizations).set(body).where(eq(organizations.id, user.orgId)).returning();
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "org.profile_updated", entityType: "organization", entityId: org.id, details: body.profile as unknown as Record<string, unknown> });
  return Response.json({ org });
});

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { policies } from "@/lib/db/schema";
import { parseBody, withAuth } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { CONTROL_AREAS } from "@/lib/taxonomy";

export const PolicyBody = z.object({
  title: z.string().trim().min(2).max(160),
  controlArea: z.enum(CONTROL_AREAS),
  owner: z.string().trim().max(120).default(""),
  content: z.string().trim().min(20, "Paste at least a paragraph of policy text.").max(60_000),
});

export const GET = withAuth("viewer", async ({ user }) => {
  return Response.json({ items: await db.query.policies.findMany({ where: eq(policies.orgId, user.orgId), orderBy: desc(policies.createdAt) }) });
});

export const POST = withAuth("analyst", async ({ req, user }) => {
  const body = await parseBody(req, PolicyBody);
  const [policy] = await db.insert(policies).values({ ...body, orgId: user.orgId }).returning();
  await recordAudit({ orgId: user.orgId, userId: user.id, action: "policy.created", entityType: "policy", entityId: policy.id });
  return Response.json({ policy }, { status: 201 });
});

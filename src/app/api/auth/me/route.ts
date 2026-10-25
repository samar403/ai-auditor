import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { withAuth } from "@/lib/api";
import { AI_MODEL, isAIEnabled } from "@/lib/ai/client";

export const GET = withAuth("viewer", async ({ user }) => {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, user.orgId) });
  return Response.json({ user, org, ai: { enabled: isAIEnabled(), model: isAIEnabled() ? AI_MODEL : "offline-heuristic" } });
});

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { errorResponse, HttpError, parseBody } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  orgName: z.string().trim().min(2).max(120),
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`signup:${clientKey(req)}`, 5, 60 * 60_000)) throw new HttpError(429, "Too many sign-ups from this address. Try again later.");
    const body = await parseBody(req, Body);
    if (await db.query.users.findFirst({ where: eq(users.email, body.email) })) throw new HttpError(409, "An account with this email already exists.");

    const [org] = await db
      .insert(organizations)
      .values({ name: body.orgName, profile: { jurisdictions: ["US"], entityTypes: [], activities: [], annualRevenueBand: "" } })
      .returning();
    const [user] = await db
      .insert(users)
      .values({ orgId: org.id, email: body.email, name: body.name, role: "admin", passwordHash: await hashPassword(body.password) })
      .returning();
    await recordAudit({ orgId: org.id, userId: user.id, action: "org.created", entityType: "organization", entityId: org.id });
    await createSession(user);
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerUploads, transactions } from "@/lib/db/schema";
import { HttpError, withAuth } from "@/lib/api";
import { RULES } from "@/lib/monitoring/rules";

export const GET = withAuth<{ id: string }>("viewer", async ({ user, params }) => {
  const upload = await db.query.ledgerUploads.findFirst({ where: and(eq(ledgerUploads.id, params.id), eq(ledgerUploads.orgId, user.orgId)) });
  if (!upload) throw new HttpError(404, "Upload not found.");
  const rows = await db.query.transactions.findMany({ where: eq(transactions.uploadId, upload.id), orderBy: asc(transactions.postedAt) });
  return Response.json({ upload, rows, rules: RULES });
});

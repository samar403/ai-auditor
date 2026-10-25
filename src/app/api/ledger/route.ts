import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ledgerUploads } from "@/lib/db/schema";
import { HttpError, withAuth } from "@/lib/api";
import { ingestLedger } from "@/lib/services/ledger";

const MAX_BYTES = 5 * 1024 * 1024;

export const GET = withAuth("viewer", async ({ user }) => {
  return Response.json({ items: await db.query.ledgerUploads.findMany({ where: eq(ledgerUploads.orgId, user.orgId), orderBy: desc(ledgerUploads.createdAt) }) });
});

export const POST = withAuth("analyst", async ({ req, user }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach a CSV file in the 'file' field.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "Files are limited to 5 MB.");
  if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") throw new HttpError(400, "Upload a .csv file exported from your ERP or bank.");
  return Response.json(await ingestLedger(user.orgId, user.id, file.name, await file.text()), { status: 201 });
});

import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { issues, ledgerUploads, transactions } from "@/lib/db/schema";
import { recordAudit } from "@/lib/audit";
import { HttpError } from "@/lib/errors";
import { parseLedgerCsv } from "@/lib/monitoring/parse";
import { runRules } from "@/lib/monitoring/rules";

export const MAX_LEDGER_ROWS = 20_000;

export async function ingestLedger(orgId: string, userId: string, filename: string, csv: string) {
  const { rows, errors } = parseLedgerCsv(csv);
  if (rows.length === 0) throw new HttpError(400, errors[0] ?? "The file has no rows.");
  if (rows.length > MAX_LEDGER_ROWS) throw new HttpError(400, `Files are limited to ${MAX_LEDGER_ROWS.toLocaleString()} rows.`);

  const hits = runRules(rows);
  const flagsByRow = new Map<number, string[]>();
  for (const hit of hits) for (const r of hit.rows) flagsByRow.set(r, [...(flagsByRow.get(r) ?? []), hit.code]);

  const [upload] = await db
    .insert(ledgerUploads)
    .values({ orgId, filename, rowCount: rows.length, flaggedCount: flagsByRow.size, uploadedBy: userId })
    .returning();

  const ids: string[] = [];
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const inserted = await db
      .insert(transactions)
      .values(rows.slice(i, i + CHUNK).map((r, j) => ({ ...r, orgId, uploadId: upload.id, flags: flagsByRow.get(i + j) ?? [] })))
      .returning({ id: transactions.id });
    ids.push(...inserted.map((x) => x.id));
  }

  // Low-severity hits stay as row flags; medium and above become issues for the team.
  // Re-uploading an overlapping export must not duplicate findings that are still open.
  const open = await db
    .select({ ruleCode: issues.ruleCode, title: issues.title })
    .from(issues)
    .where(and(eq(issues.orgId, orgId), eq(issues.source, "transaction"), inArray(issues.status, ["open", "in_progress"])));
  const seen = new Set(open.map((o) => `${o.ruleCode}|${o.title}`));
  const toIssue = hits.filter((h) => h.severity !== "low" && !seen.has(`${h.code}|${h.title.slice(0, 200)}`));
  if (toIssue.length) {
    await db.insert(issues).values(
      toIssue.map((h) => ({
        orgId,
        title: h.title.slice(0, 200),
        description: h.description,
        recommendation: h.recommendation,
        severity: h.severity,
        source: "transaction" as const,
        ruleCode: h.code,
        transactionId: ids[h.rows[0]],
        dueAt: new Date(Date.now() + (h.severity === "critical" ? 2 : h.severity === "high" ? 7 : 30) * 86_400_000),
      })),
    );
  }

  await recordAudit({ orgId, userId, action: "ledger.uploaded", entityType: "ledger_upload", entityId: upload.id, details: { filename, rows: rows.length, hits: hits.length, issues: toIssue.length } });
  const finalUpload = await db.query.ledgerUploads.findFirst({ where: eq(ledgerUploads.id, upload.id) });
  return { upload: finalUpload!, hits: hits.length, issuesCreated: toIssue.length, warnings: errors.slice(0, 20) };
}

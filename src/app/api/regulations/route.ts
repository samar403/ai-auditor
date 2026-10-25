import { and, desc, eq, like, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, regulations } from "@/lib/db/schema";
import { withAuth } from "@/lib/api";

export const GET = withAuth("viewer", async ({ req, user }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const applicability = url.searchParams.get("applicability");
  const docType = url.searchParams.get("docType");
  const jurisdiction = url.searchParams.get("jurisdiction");

  const filters: (SQL | undefined)[] = [];
  if (q) filters.push(or(like(regulations.title, `%${q}%`), like(regulations.abstract, `%${q}%`), like(regulations.agency, `%${q}%`)));
  if (docType) filters.push(eq(regulations.docType, docType));
  if (jurisdiction) filters.push(eq(regulations.jurisdiction, jurisdiction));

  const rows = await db
    .select({ regulation: regulations, analysis: analyses })
    .from(regulations)
    .leftJoin(analyses, and(eq(analyses.regulationId, regulations.id), eq(analyses.orgId, user.orgId)))
    .where(and(...filters))
    .orderBy(desc(regulations.publishedAt))
    .limit(200);

  const filtered = applicability
    ? rows.filter((r) => (applicability === "unanalyzed" ? !r.analysis : r.analysis?.applicability === applicability))
    : rows;

  const facets = await db.selectDistinct({ docType: regulations.docType, jurisdiction: regulations.jurisdiction }).from(regulations);
  return Response.json({
    items: filtered,
    facets: {
      docTypes: [...new Set(facets.map((f) => f.docType))].sort(),
      jurisdictions: [...new Set(facets.map((f) => f.jurisdiction))].sort(),
    },
  });
});

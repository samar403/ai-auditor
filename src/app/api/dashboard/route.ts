import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyses, issues, ledgerUploads, regulations } from "@/lib/db/schema";
import { withAuth } from "@/lib/api";
import { isOpen, isOverdue, postureGrade, postureScore, SEVERITIES } from "@/lib/scoring";

const WEEK = 7 * 86_400_000;

export const GET = withAuth("viewer", async ({ user }) => {
  const now = new Date();
  const all = await db.query.issues.findMany({ where: eq(issues.orgId, user.orgId) });
  const open = all.filter(isOpen);
  const score = postureScore(all, now);

  // Weekly snapshot: issues open at the end of each of the last 8 weeks, and the score then.
  const trend = Array.from({ length: 8 }, (_, k) => {
    const at = new Date(now.getTime() - (7 - k) * WEEK);
    const snapshot = all
      .filter((i) => i.createdAt <= at && (!i.resolvedAt || i.resolvedAt > at) && i.status !== "accepted_risk")
      .map((i) => ({ ...i, status: "open" as const }));
    return {
      week: at.toISOString().slice(0, 10),
      open: snapshot.length,
      raised: all.filter((i) => i.createdAt > new Date(at.getTime() - WEEK) && i.createdAt <= at).length,
      resolved: all.filter((i) => i.resolvedAt && i.resolvedAt > new Date(at.getTime() - WEEK) && i.resolvedAt <= at).length,
      score: postureScore(snapshot, at),
    };
  });

  const watch = await db
    .select({
      id: regulations.id,
      title: regulations.title,
      agency: regulations.agency,
      docType: regulations.docType,
      effectiveAt: regulations.effectiveAt,
      commentDeadline: regulations.commentDeadline,
      publishedAt: regulations.publishedAt,
      impactScore: analyses.impactScore,
      applicability: analyses.applicability,
    })
    .from(analyses)
    .innerJoin(regulations, eq(regulations.id, analyses.regulationId))
    .where(and(eq(analyses.orgId, user.orgId), inArray(analyses.applicability, ["high", "medium"])))
    .orderBy(desc(analyses.impactScore));

  const deadlines = [
    ...watch.flatMap((r) => [
      r.effectiveAt && r.effectiveAt >= now ? { kind: "Effective date", date: r.effectiveAt, title: r.title, href: `/app/regulations/${r.id}` } : null,
      r.commentDeadline && r.commentDeadline >= now ? { kind: "Comments close", date: r.commentDeadline, title: r.title, href: `/app/regulations/${r.id}` } : null,
    ]),
    ...open.map((i) => (i.dueAt ? { kind: isOverdue(i, now) ? "Overdue" : "Issue due", date: i.dueAt, title: i.title, href: `/app/issues/${i.id}` } : null)),
  ]
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  const [regCount] = await Promise.all([db.$count(regulations, gte(regulations.publishedAt, new Date(now.getTime() - 30 * 86_400_000)))]);
  const lastUpload = await db.query.ledgerUploads.findFirst({ where: eq(ledgerUploads.orgId, user.orgId), orderBy: desc(ledgerUploads.createdAt) });

  return Response.json({
    posture: { score, ...postureGrade(score), delta: score - trend[0].score },
    counts: {
      open: open.length,
      critical: open.filter((i) => i.severity === "critical").length,
      overdue: open.filter((i) => isOverdue(i, now)).length,
      newRegulations30d: regCount,
      watchlist: watch.length,
      resolved30d: all.filter((i) => i.resolvedAt && i.resolvedAt > new Date(now.getTime() - 30 * 86_400_000)).length,
    },
    bySeverity: SEVERITIES.map((s) => ({ severity: s, count: open.filter((i) => i.severity === s).length })),
    bySource: ["regulation", "policy_gap", "transaction", "manual"].map((s) => ({ source: s, count: open.filter((i) => i.source === s).length })),
    trend,
    deadlines,
    watch: watch.slice(0, 5),
    priority: [...open]
      .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
      .slice(0, 6)
      .map((i) => ({ id: i.id, title: i.title, severity: i.severity, status: i.status, dueAt: i.dueAt, source: i.source, overdue: isOverdue(i, now) })),
    lastUpload,
  });
});

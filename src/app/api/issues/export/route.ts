import { withAuth } from "@/lib/api";
import { listIssues } from "@/lib/issues";

const cell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v);
  // Neutralize spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const GET = withAuth("viewer", async ({ req, user }) => {
  const rows = await listIssues(user.orgId, new URL(req.url).searchParams);
  const header = ["id", "title", "severity", "status", "source", "rule", "assignee", "due", "created", "resolved", "description", "recommendation"];
  const lines = rows.map(({ issue: i, assignee }) =>
    [i.id, i.title, i.severity, i.status, i.source, i.ruleCode, assignee?.name, i.dueAt, i.createdAt, i.resolvedAt, i.description, i.recommendation].map(cell).join(","),
  );
  return new Response([header.join(","), ...lines].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ai-auditor-issues-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
});

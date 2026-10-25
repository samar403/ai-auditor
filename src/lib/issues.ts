import "server-only";
import { and, desc, eq, inArray, like, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { issues, users, type IssueStatus, type Severity } from "@/lib/db/schema";

export const STATUSES: IssueStatus[] = ["open", "in_progress", "remediated", "accepted_risk"];

export async function listIssues(orgId: string, search: URLSearchParams) {
  const filters: (SQL | undefined)[] = [eq(issues.orgId, orgId)];
  const status = search.get("status");
  const severity = search.get("severity");
  const source = search.get("source");
  const q = search.get("q")?.trim();
  if (status === "active") filters.push(inArray(issues.status, ["open", "in_progress"]));
  else if (status) filters.push(eq(issues.status, status as IssueStatus));
  if (severity) filters.push(eq(issues.severity, severity as Severity));
  if (source) filters.push(eq(issues.source, source as (typeof issues.$inferSelect)["source"]));
  if (search.get("mine") === "1" && search.get("userId")) filters.push(eq(issues.assigneeId, search.get("userId")!));
  if (q) filters.push(or(like(issues.title, `%${q}%`), like(issues.description, `%${q}%`)));

  return db
    .select({ issue: issues, assignee: { id: users.id, name: users.name } })
    .from(issues)
    .leftJoin(users, eq(users.id, issues.assigneeId))
    .where(and(...filters))
    .orderBy(desc(issues.createdAt))
    .limit(500);
}

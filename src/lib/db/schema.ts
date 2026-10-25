import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export type Role = "admin" | "analyst" | "viewer";
export type Severity = "critical" | "high" | "medium" | "low";
export type IssueStatus = "open" | "in_progress" | "remediated" | "accepted_risk";
export type IssueSource = "regulation" | "policy_gap" | "transaction" | "manual";
export type Applicability = "high" | "medium" | "low" | "none";

export interface OrgProfile {
  jurisdictions: string[];
  entityTypes: string[];
  activities: string[];
  annualRevenueBand: string;
}

export interface Obligation {
  text: string;
  controlArea: string;
  deadline: string | null;
}

export const organizations = sqliteTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  industry: text("industry").notNull().default("Financial services"),
  profile: text("profile", { mode: "json" }).$type<OrgProfile>().notNull(),
  createdAt: createdAt(),
});

export const users = sqliteTable(
  "users",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<Role>().notNull().default("analyst"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const regulations = sqliteTable(
  "regulations",
  {
    id: id(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    agency: text("agency").notNull(),
    jurisdiction: text("jurisdiction").notNull().default("US"),
    docType: text("doc_type").notNull(),
    abstract: text("abstract").notNull().default(""),
    url: text("url").notNull(),
    topics: text("topics", { mode: "json" }).$type<string[]>().notNull().default([]),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
    effectiveAt: integer("effective_at", { mode: "timestamp_ms" }),
    commentDeadline: integer("comment_deadline", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("regulations_source_ext_idx").on(t.source, t.externalId), index("regulations_pub_idx").on(t.publishedAt)],
);

export const analyses = sqliteTable(
  "analyses",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    regulationId: text("regulation_id")
      .notNull()
      .references(() => regulations.id, { onDelete: "cascade" }),
    applicability: text("applicability").$type<Applicability>().notNull(),
    impactScore: integer("impact_score").notNull(),
    summary: text("summary").notNull(),
    rationale: text("rationale").notNull(),
    obligations: text("obligations", { mode: "json" }).$type<Obligation[]>().notNull(),
    requiredActions: text("required_actions", { mode: "json" }).$type<string[]>().notNull(),
    affectedFunctions: text("affected_functions", { mode: "json" }).$type<string[]>().notNull(),
    model: text("model").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("analyses_org_reg_idx").on(t.orgId, t.regulationId)],
);

export const policies = sqliteTable("policies", {
  id: id(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  controlArea: text("control_area").notNull(),
  owner: text("owner").notNull().default(""),
  content: text("content").notNull(),
  lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const ledgerUploads = sqliteTable("ledger_uploads", {
  id: id(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  rowCount: integer("row_count").notNull(),
  flaggedCount: integer("flagged_count").notNull().default(0),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    uploadId: text("upload_id")
      .notNull()
      .references(() => ledgerUploads.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    postedAt: integer("posted_at", { mode: "timestamp_ms" }).notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("USD"),
    counterparty: text("counterparty").notNull(),
    country: text("country").notNull().default("US"),
    account: text("account").notNull(),
    description: text("description").notNull().default(""),
    createdBy: text("created_by").notNull().default(""),
    approvedBy: text("approved_by").notNull().default(""),
    flags: text("flags", { mode: "json" }).$type<string[]>().notNull().default([]),
  },
  (t) => [index("transactions_upload_idx").on(t.uploadId)],
);

export const issues = sqliteTable(
  "issues",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    recommendation: text("recommendation").notNull().default(""),
    severity: text("severity").$type<Severity>().notNull(),
    status: text("status").$type<IssueStatus>().notNull().default("open"),
    source: text("source").$type<IssueSource>().notNull(),
    ruleCode: text("rule_code"),
    regulationId: text("regulation_id").references(() => regulations.id, { onDelete: "set null" }),
    policyId: text("policy_id").references(() => policies.id, { onDelete: "set null" }),
    transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
    assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
    dueAt: integer("due_at", { mode: "timestamp_ms" }),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("issues_org_status_idx").on(t.orgId, t.status)],
);

export const issueComments = sqliteTable("issue_comments", {
  id: id(),
  issueId: text("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const reports = sqliteTable("reports", {
  id: id(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp_ms" }).notNull(),
  content: text("content", { mode: "json" }).$type<import("@/lib/reports").ReportContent>().notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

// Append-only: the app never updates or deletes rows in this table.
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: text("details", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_org_created_idx").on(t.orgId, t.createdAt)],
);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Regulation = typeof regulations.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Issue = typeof issues.$inferSelect;
export type Report = typeof reports.$inferSelect;

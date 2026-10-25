// Idempotent setup: applies migrations, then seeds a demo workspace if the database is empty.
// Run with: npm run setup   (also runs automatically before `npm run dev`)
import { readFileSync, mkdirSync } from "node:fs";
import bcrypt from "bcryptjs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { issueComments, issues, organizations, policies, regulations, users } from "../src/lib/db/schema";
import { detectTopics } from "../src/lib/ai/heuristics";
import { runRegulationAnalysis } from "../src/lib/services/analysis";
import { runPolicyGapCheck } from "../src/lib/services/policy";
import { ingestLedger } from "../src/lib/services/ledger";
import { recordAudit } from "../src/lib/audit";
import { SAMPLE_POLICIES, SAMPLE_REGULATIONS } from "./seed-data";

async function main() {
  if ((process.env.DATABASE_URL ?? "file:./data/").startsWith("file:")) mkdirSync("data", { recursive: true });
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("✓ migrations applied");

  if (process.env.SEED_DEMO === "false") return;
  const existing = await db.query.organizations.findFirst();
  if (existing) {
    console.log("✓ database already has data, skipping seed");
    return;
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: "Northwind Capital",
      industry: "Fintech / payments",
      profile: {
        jurisdictions: ["US", "US-NY", "EU"],
        entityTypes: ["Public company", "Money services business", "Fintech / payments"],
        activities: ["payments", "digital wallet", "lending", "cross-border"],
        annualRevenueBand: "$100M-$500M",
      },
    })
    .returning();

  const hash = await bcrypt.hash("demo1234", 12);
  const [admin, analyst] = await db
    .insert(users)
    .values([
      { orgId: org.id, email: "demo@aiauditor.dev", name: "Dana Reyes", role: "admin", passwordHash: hash },
      { orgId: org.id, email: "analyst@aiauditor.dev", name: "Sam Okafor", role: "analyst", passwordHash: hash },
      { orgId: org.id, email: "viewer@aiauditor.dev", name: "Alex Chen", role: "viewer", passwordHash: hash },
    ])
    .returning();
  await recordAudit({ orgId: org.id, userId: admin.id, action: "org.created", entityType: "organization", entityId: org.id });

  const regs = await db
    .insert(regulations)
    .values(SAMPLE_REGULATIONS.map((r) => ({ ...r, source: "sample", url: "https://www.federalregister.gov/", topics: detectTopics(`${r.title} ${r.abstract}`) })))
    .returning();
  for (const r of regs) await runRegulationAnalysis(org.id, r.id, null);
  console.log(`✓ ${regs.length} sample regulations analyzed`);

  const pols = await db.insert(policies).values(SAMPLE_POLICIES.map((p) => ({ ...p, orgId: org.id }))).returning();
  for (const p of pols) await runPolicyGapCheck(org.id, p.id, admin.id);

  await ingestLedger(org.id, analyst.id, "sample-ledger.csv", readFileSync("public/sample-ledger.csv", "utf8"));

  // Spread history so the trend chart has shape: age issues and resolve some.
  const all = await db.query.issues.findMany({ where: eq(issues.orgId, org.id) });
  for (const [i, issue] of all.entries()) {
    const ageDays = 3 + ((i * 11) % 50);
    const createdAt = new Date(Date.now() - ageDays * 86_400_000);
    const resolved = i % 4 === 3;
    await db
      .update(issues)
      .set({
        createdAt,
        assigneeId: i % 2 ? analyst.id : admin.id,
        status: resolved ? "remediated" : i % 5 === 1 ? "in_progress" : issue.status,
        resolvedAt: resolved ? new Date(createdAt.getTime() + 6 * 86_400_000) : null,
      })
      .where(eq(issues.id, issue.id));
  }
  if (all[0]) {
    await db.insert(issueComments).values({ issueId: all[0].id, userId: analyst.id, body: "Pulled the payment file and confirmed with Treasury. Holding further payments while we screen." });
  }
  console.log(`✓ demo workspace ready: ${all.length} issues. Sign in as demo@aiauditor.dev / demo1234`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

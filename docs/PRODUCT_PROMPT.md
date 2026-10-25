# AI Auditor: product prompt

This is the brief AI Auditor was built from. Use it to explain the product, onboard contributors, or prompt an AI system that extends it.

---

**Build "AI Auditor": AI-native compliance infrastructure that monitors regulations and flags issues for finance teams.**

**Who it's for.** CFOs, controllers, heads of compliance and BSA officers at fintechs, payment companies, lenders, broker-dealers, investment advisers and public companies. They are accountable for compliance but have small teams, and they cannot read every rule, proposal, guidance note and enforcement action that might affect them.

**The problem.** Regulatory change arrives faster than people can read it, across many agencies and jurisdictions. Today teams skim feeds by hand, keep obligation registers in spreadsheets that go stale, and discover gaps in their policies and payment controls during audits or exams, when fixing them is most expensive.

**The product.** A system that does the work of a compliance analyst continuously:

1. **Watch.** Ingest new regulatory documents every day from official sources (US Federal Register for SEC, CFPB, FinCEN, OCC, Fed, FDIC, IRS, CFTC, OFAC; regulator RSS feeds such as SEC releases and the UK FCA).
2. **Interpret.** For each document, use Claude to decide whether it applies to *this* company, based on a company profile (jurisdictions, entity types, business activities, size). Produce a plain-English summary a CFO can read in ten seconds, a 0-100 impact score, the reasoning, concrete obligations tagged by control area with deadlines, recommended next steps and affected teams. Return validated structured output, never free text that must be scraped.
3. **Flag.** Turn findings into tracked issues with severity, owner, due date and status:
   - high-impact regulations open an issue automatically;
   - policy gap checks compare each written policy with every obligation in its control area and flag what is missing, vague, or contradictory;
   - transaction monitoring runs deterministic, explainable rules over ledger exports (sanctioned jurisdictions, watchlist matches, structuring, segregation of duties, large unapproved payments, duplicates, round amounts, weekend postings).
4. **Prove.** Record every analysis, decision and change in an append-only audit trail. Generate point-in-time reports for the audit committee with an AI-written executive summary and prioritized recommendations.

**Experience principles.**
- Lead with the answer: a single posture score, the few issues to work first, and the next deadlines.
- Every AI conclusion shows its reasoning and links to the source document.
- Explainable beats clever where money moves: payment flags are rule-based and reproducible.
- Accepting a risk always requires a written justification.
- It must work without an API key (transparent offline mode), so it can be demoed and tested anywhere.
- It is decision support, not legal advice, and says so.

**Must-haves.** Email/password auth with roles (admin, analyst, viewer) enforced server-side; workspace isolation; dashboard with posture score and trends; regulation feed with filters and per-document analysis; issues workflow with comments, history and CSV export; policy library with gap checks; ledger upload and monitoring; reports; a chat assistant grounded only in the workspace's own data; team management; audit trail; scheduled feed sync; light and dark themes; mobile-friendly layout.

**AI implementation.** Use the latest Claude model (Claude Opus 5.5) through the official Anthropic SDK, with adaptive thinking, an effort level matched to each task, structured outputs via JSON schema, streaming, refusal handling with server-side fallbacks, and prompt caching for the assistant.

**Design direction.** An "audit ledger" look: warm paper surfaces, ink-black rules, serif headlines, monospaced figures, ledger-green accents, and severity shown like ink stamps. Calm, precise and trustworthy, the opposite of a generic SaaS dashboard.

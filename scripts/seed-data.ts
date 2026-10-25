// Illustrative sample documents so a fresh install has something to analyze before the
// first live feed sync. Marked source "sample" and shown with a "Sample" badge in the UI.
const day = 86_400_000;
const now = Date.now();
const d = (offsetDays: number) => new Date(now + offsetDays * day);

export const SAMPLE_REGULATIONS = [
  {
    externalId: "S-001",
    title: "Customer Due Diligence: Beneficial Ownership Verification for Payment Platforms",
    agency: "Financial Crimes Enforcement Network",
    jurisdiction: "US",
    docType: "Rule",
    abstract:
      "FinCEN is amending its anti-money laundering program rules to require money services businesses and payment platforms to identify and verify beneficial owners of legal-entity customers at onboarding and at least annually thereafter. Covered institutions must maintain records of verification for five years and file suspicious activity reports when beneficial ownership information cannot be verified.",
    publishedAt: d(-12),
    effectiveAt: d(75),
    commentDeadline: null,
  },
  {
    externalId: "S-002",
    title: "Cybersecurity Incident Disclosure for Public Companies: Updated Guidance on Materiality",
    agency: "Securities and Exchange Commission",
    jurisdiction: "US",
    docType: "Guidance",
    abstract:
      "Staff guidance clarifies how registrants should assess the materiality of cybersecurity incidents for Form 8-K Item 1.05 disclosure, including aggregation of related incidents, involvement of third-party service providers, and documentation of the materiality determination by the disclosure committee.",
    publishedAt: d(-20),
    effectiveAt: null,
    commentDeadline: null,
  },
  {
    externalId: "S-003",
    title: "Personal Financial Data Rights: Compliance Dates for Data Providers",
    agency: "Consumer Financial Protection Bureau",
    jurisdiction: "US",
    docType: "Rule",
    abstract:
      "The CFPB finalizes staggered compliance dates under its open banking rule (section 1033). Covered data providers, including payment and digital wallet providers, must make consumer financial data available through a developer interface, maintain written policies on data access and retention, and respond to third-party access requests within set timeframes.",
    publishedAt: d(-30),
    effectiveAt: d(140),
    commentDeadline: null,
  },
  {
    externalId: "S-004",
    title: "Proposed Rule: Electronic Recordkeeping and Off-Channel Communications",
    agency: "Securities and Exchange Commission",
    jurisdiction: "US",
    docType: "Proposed Rule",
    abstract:
      "The Commission proposes amendments to books and records rules for broker-dealers and investment advisers to require retention of business communications sent over messaging apps, including off-channel communications, and annual certification of recordkeeping controls by a senior officer.",
    publishedAt: d(-8),
    effectiveAt: null,
    commentDeadline: d(52),
  },
  {
    externalId: "S-005",
    title: "OFAC Enforcement Action: Fintech Settles Apparent Violations for Payments to Sanctioned Jurisdictions",
    agency: "Office of Foreign Assets Control",
    jurisdiction: "US",
    docType: "Enforcement",
    abstract:
      "OFAC announced a settlement with a payment processor that processed transactions involving persons in comprehensively sanctioned jurisdictions due to deficient IP geolocation and sanctions screening controls. OFAC highlighted the need for screening of counterparties and beneficiary country at payment time, not only at onboarding.",
    publishedAt: d(-5),
    effectiveAt: null,
    commentDeadline: null,
  },
  {
    externalId: "S-006",
    title: "Internal Control over Financial Reporting: Auditor Communication of Critical Matters",
    agency: "Public Company Accounting Oversight Board",
    jurisdiction: "US",
    docType: "Rule",
    abstract:
      "New auditing standard requires auditors of public companies to communicate deficiencies in internal control over financial reporting, including segregation of duties failures and management review controls, to the audit committee within 30 days of identification.",
    publishedAt: d(-40),
    effectiveAt: d(60),
    commentDeadline: null,
  },
  {
    externalId: "S-007",
    title: "Digital Operational Resilience: ICT Third-Party Register Reporting",
    agency: "European Banking Authority",
    jurisdiction: "EU",
    docType: "Guidance",
    abstract:
      "Financial entities in the EU must submit their register of information on ICT third-party service providers under DORA, covering all contractual arrangements supporting critical or important functions, and maintain an exit strategy for each critical vendor.",
    publishedAt: d(-15),
    effectiveAt: d(30),
    commentDeadline: null,
  },
  {
    externalId: "S-008",
    title: "Overdraft and Non-Sufficient Funds Fee Disclosures",
    agency: "Consumer Financial Protection Bureau",
    jurisdiction: "US",
    docType: "Proposed Rule",
    abstract:
      "The Bureau proposes to treat certain overdraft fees charged by very large banks as extensions of credit subject to Truth in Lending disclosure requirements, and to prohibit non-sufficient funds fees on instantaneously declined transactions.",
    publishedAt: d(-25),
    effectiveAt: null,
    commentDeadline: d(20),
  },
  {
    externalId: "S-009",
    title: "Cybersecurity Requirements for Financial Services Companies: Multi-Factor Authentication Deadline",
    agency: "New York Department of Financial Services",
    jurisdiction: "US-NY",
    docType: "Rule",
    abstract:
      "Covered entities licensed by NYDFS must implement multi-factor authentication for all individuals accessing information systems, maintain an asset inventory, and have the CISO report annually to the board on material cybersecurity risks under 23 NYCRR 500.",
    publishedAt: d(-60),
    effectiveAt: d(18),
    commentDeadline: null,
  },
  {
    externalId: "S-010",
    title: "Information Reporting for Digital Asset Brokers (Form 1099-DA)",
    agency: "Internal Revenue Service",
    jurisdiction: "US",
    docType: "Rule",
    abstract:
      "Final regulations require brokers of digital assets, including custodial wallet providers, to report gross proceeds and basis on Form 1099-DA, collect taxpayer identification numbers, and apply backup withholding when a TIN is not provided.",
    publishedAt: d(-45),
    effectiveAt: d(95),
    commentDeadline: null,
  },
  {
    externalId: "S-011",
    title: "Agricultural Commodity Grading Standards Update",
    agency: "Agricultural Marketing Service",
    jurisdiction: "US",
    docType: "Notice",
    abstract: "Updates grading standards for certain grains. No impact on financial institutions.",
    publishedAt: d(-3),
    effectiveAt: d(30),
    commentDeadline: null,
  },
  {
    externalId: "S-012",
    title: "Consumer Duty: Fair Value Assessments for Payment Accounts",
    agency: "Financial Conduct Authority",
    jurisdiction: "UK",
    docType: "Guidance",
    abstract:
      "The FCA sets expectations for firms to evidence fair value assessments of fees charged on payment accounts and e-money products, and to report consumer outcomes data to the board annually.",
    publishedAt: d(-10),
    effectiveAt: null,
    commentDeadline: null,
  },
];

export const SAMPLE_POLICIES = [
  {
    title: "AML & KYC Program",
    controlArea: "AML / KYC",
    owner: "BSA Officer",
    content:
      "Northwind collects name, address, date of birth and government ID for every individual customer at onboarding and screens them against sanctions lists. Customer risk ratings are refreshed every 24 months. Suspicious activity is escalated to the BSA Officer, who decides whether to file a SAR within 30 days. Records are kept for five years.",
  },
  {
    title: "Information Security Policy",
    controlArea: "Cybersecurity",
    owner: "CISO",
    content:
      "All employees use single sign-on. Production access requires a hardware key. Security incidents are logged in the incident tracker and the CISO reviews them monthly. Penetration tests are run annually by an external firm.",
  },
  {
    title: "Treasury Payments Procedure",
    controlArea: "Payments",
    owner: "Treasurer",
    content:
      "Payments over $25,000 require approval by a second person in the finance team (maker-checker). New vendors are set up by AP and verified by callback to a known phone number. Wire transfers are released by the Treasurer only.",
  },
];

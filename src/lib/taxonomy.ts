// Shared vocabulary for control areas and regulatory topics. Used by the AI prompts,
// the offline heuristic engine, and the UI filters, so all three agree.

export const CONTROL_AREAS = [
  "AML / KYC",
  "Sanctions",
  "Financial reporting",
  "Disclosure",
  "Consumer protection",
  "Data privacy",
  "Cybersecurity",
  "Payments",
  "Tax",
  "Recordkeeping",
  "Governance",
  "Third-party risk",
] as const;

export type ControlArea = (typeof CONTROL_AREAS)[number];

/** Keyword signals per control area for the offline engine. */
export const TOPIC_KEYWORDS: Record<ControlArea, string[]> = {
  "AML / KYC": ["anti-money laundering", "aml", "bank secrecy", "beneficial owner", "customer due diligence", "kyc", "verify", "annually", "suspicious activity", "currency transaction", "fincen"],
  Sanctions: ["sanction", "ofac", "blocked person", "export control", "embargo", "geolocation", "screening"],
  "Financial reporting": ["financial statement", "audit", "internal control", "gaap", "sox", "sarbanes", "accounting", "pcaob", "10-k", "10-q"],
  Disclosure: ["disclosure", "climate", "prospectus", "filing", "form", "reporting requirement", "beneficial ownership report"],
  "Consumer protection": ["consumer", "unfair", "deceptive", "udaap", "fair lending", "overdraft", "fee", "credit card", "cfpb", "complaint"],
  "Data privacy": ["privacy", "personal data", "personal information", "gdpr", "glba", "data broker", "open banking", "1033"],
  Cybersecurity: ["cyber", "incident", "breach", "information security", "safeguards", "ransomware", "resilience", "multi-factor", "asset inventory", "materiality"],
  Payments: ["payment", "remittance", "screening", "beneficiary country", "electronic fund", "ach", "wire", "stablecoin", "money transmitter", "digital wallet"],
  Tax: ["tax", "irs", "withholding", "1099", "fatca", "vat"],
  Recordkeeping: ["recordkeeping", "record retention", "books and records", "off-channel", "retain"],
  Governance: ["board", "governance", "compensation", "clawback", "conflict of interest", "fiduciary"],
  "Third-party risk": ["third-party", "vendor", "outsourc", "service provider", "fintech partner"],
};

export const JURISDICTIONS = ["US", "US-NY", "US-CA", "EU", "UK", "IN", "SG"] as const;
export const ENTITY_TYPES = [
  "Public company",
  "Broker-dealer",
  "Investment adviser",
  "Bank",
  "Money services business",
  "Fintech / payments",
  "Lender",
  "Private company",
] as const;

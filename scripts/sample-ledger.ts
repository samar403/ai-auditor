// Generates public/sample-ledger.csv: realistic AP/treasury activity with planted control failures.
import { writeFileSync } from "node:fs";

const vendors = [
  ["Amazon Web Services", "US", "6100 Cloud hosting"],
  ["Stripe Payments", "US", "6200 Processing fees"],
  ["WeWork", "US", "6300 Rent"],
  ["Deloitte LLP", "US", "6400 Professional fees"],
  ["Gusto Payroll", "US", "5000 Payroll"],
  ["Salesforce", "US", "6100 Software"],
  ["Lufthansa", "DE", "6500 Travel"],
  ["Accenture", "IE", "6400 Professional fees"],
  ["Tata Consultancy", "IN", "6400 Contractors"],
  ["Datadog", "US", "6100 Software"],
];
const people = ["a.chen", "m.patel", "j.ruiz", "s.okafor"];
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rows: string[][] = [];
let ref = 10400;
const base = Date.UTC(2026, 8, 28);
for (let d = 0; d < 27; d++) {
  const date = new Date(base + d * 86_400_000);
  if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
  for (let k = 0; k < 2; k++) {
    const [v, c, acct] = vendors[Math.floor(rand() * vendors.length)];
    const amount = Math.round((300 + rand() * 18000) * 100) / 100;
    const maker = people[Math.floor(rand() * people.length)];
    const checker = people[(people.indexOf(maker) + 1) % people.length];
    rows.push([`AP-${ref++}`, date.toISOString().slice(0, 10), amount.toFixed(2), "USD", v, c, acct, `Invoice ${Math.floor(rand() * 90000)}`, maker, checker]);
  }
}
// Planted findings
rows.push(["AP-20001", "2026-10-06", "9500.00", "USD", "Coastal Supply Co", "US", "6700 Supplies", "Cash advance", "j.ruiz", "m.patel"]);
rows.push(["AP-20002", "2026-10-08", "9800.00", "USD", "Coastal Supply Co", "US", "6700 Supplies", "Cash advance", "j.ruiz", "m.patel"]);
rows.push(["AP-20003", "2026-10-09", "9250.00", "USD", "Coastal Supply Co", "US", "6700 Supplies", "Cash advance", "j.ruiz", "m.patel"]);
rows.push(["AP-20004", "2026-10-13", "48000.00", "USD", "Volkov Trading LLC", "AE", "6400 Consulting", "Advisory retainer", "s.okafor", "a.chen"]);
rows.push(["AP-20005", "2026-10-14", "12750.00", "USD", "Minsk Software Group", "BY", "6400 Contractors", "Dev services Q4", "m.patel", "j.ruiz"]);
rows.push(["AP-20006", "2026-10-15", "62000.00", "USD", "Brightline Media", "US", "6800 Marketing", "Campaign prepayment", "a.chen", ""]);
rows.push(["AP-20007", "2026-10-16", "18400.00", "USD", "Deloitte LLP", "US", "6400 Professional fees", "Q3 review", "s.okafor", "s.okafor"]);
rows.push(["AP-20008", "2026-10-19", "7425.50", "USD", "Datadog", "US", "6100 Software", "Annual true-up", "a.chen", "j.ruiz"]);
rows.push(["AP-20009", "2026-10-20", "7425.50", "USD", "Datadog", "US", "6100 Software", "Annual true-up", "a.chen", "j.ruiz"]);
rows.push(["AP-20010", "2026-10-18", "30000.00", "USD", "Harbor Bridge Partners", "US", "6400 Consulting", "Retainer", "m.patel", "a.chen"]);

const header = ["reference", "date", "amount", "currency", "counterparty", "country", "account", "description", "created_by", "approved_by"];
const csv = [header, ...rows.sort((a, b) => a[1].localeCompare(b[1]))].map((r) => r.map((x) => (/[",]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(",")).join("\n");
writeFileSync("public/sample-ledger.csv", csv + "\n");
console.log(`wrote ${rows.length} rows`);

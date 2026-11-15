export type StatusTone = "positive" | "warning" | "danger" | "neutral" | "proof";

export type DemoRun = {
  id: string;
  borrower: string;
  facility: string;
  reference: string;
  actual: "COMPLIANT" | "BREACHED" | "INDETERMINATE" | "NOT_ASSESSED";
  forecast: "NO_PROJECTED_BREACH" | "AT_RISK" | "INDETERMINATE";
  verification: "VERIFIED" | "IN_PROGRESS" | "STALE" | "BLOCKED";
  leverage: string;
  threshold: string;
  testDate: string;
  owner: string;
  updated: string;
};

export const demoRuns: DemoRun[] = [
  {
    id: "run-northwind-q3",
    borrower: "Northwind Components Ltd.",
    facility: "Term Loan A",
    reference: "NWC-2026-001",
    actual: "COMPLIANT",
    forecast: "AT_RISK",
    verification: "VERIFIED",
    leverage: "3.20x",
    threshold: "≤ 3.50x",
    testDate: "30 Sep 2026",
    owner: "Maya Chen",
    updated: "12 min ago",
  },
  {
    id: "run-harbor-q3",
    borrower: "Harborline Logistics",
    facility: "Revolver",
    reference: "HBL-2026-004",
    actual: "BREACHED",
    forecast: "AT_RISK",
    verification: "VERIFIED",
    leverage: "3.70x",
    threshold: "≤ 3.50x",
    testDate: "30 Sep 2026",
    owner: "Maya Chen",
    updated: "48 min ago",
  },
  {
    id: "run-morrow-q2",
    borrower: "Morrow Foods Group",
    facility: "Term Loan B",
    reference: "MFG-2026-002",
    actual: "INDETERMINATE",
    forecast: "INDETERMINATE",
    verification: "STALE",
    leverage: "—",
    threshold: "≤ 4.00x",
    testDate: "30 Jun 2026",
    owner: "Jon Bell",
    updated: "2 hr ago",
  },
  {
    id: "run-atlas-q3",
    borrower: "Atlas Field Services",
    facility: "Delayed Draw",
    reference: "AFS-2026-003",
    actual: "COMPLIANT",
    forecast: "NO_PROJECTED_BREACH",
    verification: "VERIFIED",
    leverage: "2.84x",
    threshold: "≤ 3.75x",
    testDate: "30 Sep 2026",
    owner: "Priya Raman",
    updated: "Yesterday",
  },
];

export const attentionItems = [
  {
    title: "Harborline Logistics — actual breach",
    detail: "Verified 3.70x against a 3.50x maximum. Case review and memo approval are required.",
    tone: "danger" as StatusTone,
    href: "/analysis-runs/run-harbor-q3",
  },
  {
    title: "Northwind — forecast at risk",
    detail: "Downside scenario projects 3.63x. Actual remains compliant; manager acknowledgement is required.",
    tone: "warning" as StatusTone,
    href: "/analysis-runs/run-northwind-q3",
  },
  {
    title: "Morrow Foods — evidence stale",
    detail: "A corrected debt schedule superseded the evidence used by the prior assessment.",
    tone: "neutral" as StatusTone,
    href: "/analysis-runs/run-morrow-q2",
  },
];

export const pipeline = [
  { step: "01", label: "Upload + redact", state: "Ready", detail: "Text-based agreement" },
  { step: "02", label: "Extract + confirm", state: "Analyst review", detail: "Source-linked terms" },
  { step: "03", label: "Calculate + prove", state: "Deterministic", detail: "Fixed circuit" },
  { step: "04", label: "Manager approval", state: "Human gate", detail: "Proof bound" },
];

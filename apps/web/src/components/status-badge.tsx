import Link from "next/link";
import { cn } from "@/lib/cn";

export type BadgeTone = "positive" | "warning" | "danger" | "neutral" | "proof" | "info";

const tones: Record<BadgeTone, string> = {
  positive: "border-positive/30 bg-[#e6f4ed] text-positive",
  warning: "border-warning/30 bg-[#fef0c7] text-warning",
  danger: "border-danger/30 bg-[#fee4e2] text-danger",
  neutral: "border-line bg-paper text-muted",
  proof: "border-ink/20 bg-acid-soft text-ink",
  info: "border-ink/20 bg-paper text-ink",
};

const statusTone: Record<string, BadgeTone> = {
  COMPLIANT: "positive",
  NO_PROJECTED_BREACH: "positive",
  BREACHED: "danger",
  AT_RISK: "warning",
  INDETERMINATE: "neutral",
  NOT_ASSESSED: "neutral",
  VERIFIED: "proof",
  IN_PROGRESS: "warning",
  STALE: "warning",
  BLOCKED: "danger",
  APPROVED: "positive",
  READY_FOR_MANAGER: "proof",
  PROOF_VERIFIED: "proof",
  PROOF_PENDING: "warning",
  PROOF_FAILED: "danger",
  CALCULATED: "positive",
  CALCULATED_SERV_PENDING: "warning",
  BREACH_REVIEW: "danger",
  TERMS_REVIEW: "warning",
  TERMS_CONFIRMED: "positive",
  FINANCIALS_PENDING: "warning",
  FINANCIALS_CONFIRMED: "positive",
  REDACTION_REVIEW: "warning",
  REDACTION_CONFIRMED: "positive",
  EXTRACTION_PENDING: "warning",
  FILE_UPLOADED: "neutral",
  PARSING: "warning",
  FAILED: "danger",
  REJECTED: "danger",
  CANCELLED: "neutral",
  ACTIVE: "positive",
  ARCHIVED: "neutral",
  UPLOADED: "neutral",
  PROCESSING: "warning",
  READY: "positive",
  SHREDDED: "neutral",
};

export function StatusBadge({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const resolved = tone ?? statusTone[String(children)] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tones[resolved],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-semibold underline decoration-ink/30 decoration-1 underline-offset-4 transition hover:decoration-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}

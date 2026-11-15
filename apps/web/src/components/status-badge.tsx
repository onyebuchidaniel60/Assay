import Link from "next/link";
import { cn } from "@/lib/cn";

export type BadgeTone = "positive" | "warning" | "danger" | "neutral" | "proof" | "info";

const tones: Record<BadgeTone, string> = {
  positive: "border-positive/25 bg-positive/10 text-positive",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  neutral: "border-line bg-ink/[0.03] text-muted",
  proof: "border-ink/15 bg-acid-soft/60 text-ink",
  info: "border-ink/15 bg-paper text-ink",
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

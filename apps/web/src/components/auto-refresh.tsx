"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 3000, label }: { intervalMs?: number; label: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, router]);
  return (
    <p role="status" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-muted">
      <span aria-hidden className="size-2 animate-pulse rounded-full bg-warning" />
      {label}
    </p>
  );
}

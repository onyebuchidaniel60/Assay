"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  FileSearch,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Menu,
  PlugZap,
  Scale,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/borrowers", label: "Borrowers", icon: Users },
  { href: "/facilities", label: "Facilities", icon: Building2 },
  { href: "/analysis-runs", label: "Analysis runs", icon: FileSearch },
  { href: "/covenants", label: "Covenants", icon: Scale },
];

const controlNav = [
  { href: "/cases", label: "Exception cases", icon: FolderKanban },
  { href: "/evaluations", label: "Evaluations", icon: ClipboardCheck },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/audit", label: "Audit trail", icon: ShieldCheck },
];

const systemNav = [
  { href: "/integrations", label: "Integrations", icon: PlugZap },
  { href: "/settings", label: "Settings", icon: Settings },
];

const labels: Record<string, string> = {
  dashboard: "Overview",
  borrowers: "Borrowers",
  facilities: "Facilities",
  covenants: "Covenants",
  "analysis-runs": "Analysis runs",
  approvals: "Approvals",
  audit: "Audit trail",
  integrations: "Integrations",
  settings: "Settings",
  login: "Sign in",
  cases: "Exception cases",
  evaluations: "Evaluations",
};

function navigationFor(pathname: string) {
  return { primaryNav, controlNav, systemNav, pathname };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = navigationFor(pathname);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const currentLabel = firstSegment ? labels[firstSegment] ?? "Workspace" : "Overview";

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-paper"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-ink text-paper transition-transform duration-200 lg:static lg:w-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <Link href="/dashboard" className="group flex items-center gap-3" aria-label="Assay overview">
            <Image src="/brand/assay-logo.png" alt="Assay" width={40} height={40} priority className="size-10 rounded-xl" />
            <span>
              <span className="block text-sm font-bold uppercase tracking-[0.24em]">Assay</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-white/50">Covenant operations</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Monitor</p>
          <nav className="space-y-1">
            {nav.primaryNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
            ))}
          </nav>

          <p className="mt-8 px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Controls</p>
          <nav className="space-y-1">
            {nav.controlNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
            ))}
          </nav>

          <p className="mt-8 px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Workspace</p>
          <nav className="space-y-1">
            {nav.systemNav.map((item) => (
              <NavItem key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
            ))}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/[0.06] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-acid">Credit workspace</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Synthetic borrowers only. No real credit, borrower or production data.
            </p>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              className="rounded-full border border-line bg-paper p-2 text-ink hover:bg-white lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
              <Image src="/brand/assay-logo.png" alt="Assay" width={24} height={24} className="size-6 rounded-md" />
              <span className="hidden font-semibold uppercase tracking-[0.16em] sm:inline">Assay</span>
              <span className="hidden text-line sm:inline">/</span>
              <span className="truncate font-medium text-ink">{currentLabel}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full border border-line bg-paper px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:inline">
                Live production
              </span>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-[11px] font-semibold text-paper transition hover:bg-ink-soft"
              >
                <Gauge className="size-3.5" />
                <span className="hidden sm:inline">Provider status</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
              <div className="grid size-9 place-items-center rounded-full border border-line bg-acid text-xs font-bold text-ink" aria-label="Signed-in role: Credit Analyst">
                MC
              </div>
            </div>
          </div>
        </header>

        <main id="main" className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1240px]">{children}</div>
        </main>

        <footer className="border-t border-line px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2"><Image src="/brand/assay-logo.png" alt="Assay" width={20} height={20} className="size-5 rounded" /> Assay — synthetic-data covenant operations. Not a production credit decision system.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link className="underline decoration-line underline-offset-4 hover:text-ink" href="/audit">
                Audit evidence
              </Link>
              <a
                className="underline decoration-line underline-offset-4 hover:text-ink"
                href="https://github.com/onyebuchidaniel60/Assay/tree/main/docs"
                target="_blank"
                rel="noreferrer"
              >
                Documentation
              </a>
              <a
                className="underline decoration-line underline-offset-4 hover:text-ink"
                href="https://github.com/onyebuchidaniel60/Assay"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NavItem({
  item,
  active,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        active ? "bg-acid font-semibold text-ink" : "text-white/60 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className={cn("size-4", active ? "text-ink" : "text-white/50")} />
      <span>{item.label}</span>
    </Link>
  );
}

import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">{eyebrow}</p>
        ) : null}
        <h1 className="display text-4xl font-semibold text-ink sm:text-5xl lg:text-6xl">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{children}</p>;
}

export function PlaceholderNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-paper/60 p-4 text-sm leading-6 text-muted">
      <span className="mr-2 inline-block rounded-full bg-acid px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
        Phase 1 shell
      </span>
      {children}
    </div>
  );
}

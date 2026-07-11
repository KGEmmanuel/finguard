import { cn } from "@/lib/utils";

/** Institutional dashboard panel — subtle inset shadow, mono label. */
export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "panel flex flex-col",
        "shadow-[inset_0_1px_0_0_oklch(1_0_0/0.03)]",
        className,
      )}
    >
      {(title || eyebrow || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div>
            {eyebrow && (
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 className="text-sm font-medium text-foreground">{title}</h3>
            )}
          </div>
          {action}
        </header>
      )}
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="panel px-4 py-3">
      <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className="mono mt-1 text-2xl font-semibold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && (
        <div className="mono mt-1 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

export function TierPill({
  tier,
  label,
}: {
  tier: 1 | 2 | 3;
  label?: string;
}) {
  const color =
    tier === 1 ? "var(--tier-1)" : tier === 2 ? "var(--tier-2)" : "var(--tier-3)";
  return (
    <span
      className="mono inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      T{tier}
      {label && <span className="opacity-80">· {label}</span>}
    </span>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: color,
        }}
      />
    </div>
  );
}

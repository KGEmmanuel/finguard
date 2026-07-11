import { ArrowUpRight, Sparkles } from "lucide-react";

const PRICING_URL = "https://app.cognitagrc.io/pricing";
const BEACON_URL = "/api/public/hooks/funnel-event";

export interface UpgradeCtaProps {
  surface: string;
  /** Compact = sidebar-style single-line card, default = full panel-style pitch. */
  variant?: "default" | "compact";
  headline?: string;
  subline?: string;
}

/**
 * Free-tier CTA that funnels demo users toward app.cognitagrc.io.
 * Fires a fire-and-forget beacon to funnel_events before opening the
 * pricing page.
 */
export function UpgradeCta({
  surface,
  variant = "default",
  headline = "Ready for signed policy packs + inline enforce?",
  subline = "Upgrade to the two-plane deployment with signed evidence, enforce mode, and regulator SDK access.",
}: UpgradeCtaProps) {
  const utm = new URLSearchParams({
    utm_source: "finguard",
    utm_medium: "demo",
    utm_content: surface,
  });
  const href = `${PRICING_URL}?${utm.toString()}`;

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Fire beacon; do not block navigation on network failure.
    try {
      void fetch(BEACON_URL, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface, kind: "pricing_click" }),
      });
    } catch {
      // ignore
    }
    // Let the default anchor navigation happen in a new tab.
    void e;
  };

  if (variant === "compact") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="mono flex items-center justify-between gap-2 rounded-md border border-border bg-background/50 px-2 py-1.5 text-[10px] uppercase tracking-widest text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" style={{ color: "var(--tier-3)" }} />
          Upgrade at cognitagrc.io
        </span>
        <ArrowUpRight className="h-3 w-3" />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-sm border border-border/70 bg-background/40 p-3 transition-colors hover:border-[color:var(--tier-3)] hover:bg-accent/40"
      style={{
        boxShadow:
          "inset 0 1px 0 0 color-mix(in oklab, var(--tier-3) 15%, transparent)",
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm"
        style={{
          background: "color-mix(in oklab, var(--tier-3) 15%, transparent)",
          color: "var(--tier-3)",
        }}
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Paid tier · app.cognitagrc.io
        </div>
        <div className="mt-0.5 text-sm font-medium text-foreground">
          {headline}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{subline}</div>
      </div>
      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </a>
  );
}

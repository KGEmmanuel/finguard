import custodianAsset from "@/assets/cognita-custodian.png.asset.json";

interface BrandMarkProps {
  size?: number;
  glow?: boolean;
  className?: string;
}

/**
 * Cognita "Custodian" brand mark — the spartan-helmet-in-shield lockup.
 * Used in the sidebar, auth page, and error surfaces. Optional glow ring
 * uses the app's --shadow-glow-primary token for premium surfaces.
 */
export function BrandMark({ size = 36, glow = false, className }: BrandMarkProps) {
  return (
    <div
      className={
        "relative flex shrink-0 items-center justify-center rounded-md " +
        (className ?? "")
      }
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(120% 120% at 30% 15%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
        boxShadow: glow
          ? "0 0 32px -6px color-mix(in oklab, var(--primary) 65%, transparent), inset 0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent)"
          : "inset 0 0 0 1px color-mix(in oklab, var(--border) 100%, transparent)",
      }}
      aria-hidden="true"
    >
      <img
        src={custodianAsset.url}
        alt=""
        width={size - 6}
        height={size - 6}
        style={{
          filter:
            "drop-shadow(0 0 6px color-mix(in oklab, var(--tier-3) 45%, transparent))",
        }}
      />
    </div>
  );
}

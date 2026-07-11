import { useMemo } from "react";
import { Loader2, Target } from "lucide-react";

import { Panel } from "@/components/panel";
import { useOutcomeKpis, type OutcomeKpi } from "@/lib/queries";

type Spec = {
  outcome: string;
  outcomeLabel: string;
  key: string;
  label: string;
  target: number;
  cmp: "lt" | "lte" | "gte" | "eq";
  unit: string;
  format: (v: number) => string;
};

const SPECS: Spec[] = [
  {
    outcome: "A",
    outcomeLabel: "Discoverability",
    key: "unmanaged_agent_age_p95",
    label: "Unmanaged agent age p95",
    target: 24,
    cmp: "lt",
    unit: "h",
    format: (v) => `${v.toFixed(1)}h`,
  },
  {
    outcome: "B",
    outcomeLabel: "Override coverage",
    key: "override_coverage_pct",
    label: "Soft flags justified",
    target: 95,
    cmp: "gte",
    unit: "%",
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    outcome: "C",
    outcomeLabel: "Offline verify",
    key: "verify_success_rate",
    label: "Pack verify success",
    target: 100,
    cmp: "eq",
    unit: "%",
    format: (v) => `${v.toFixed(0)}%`,
  },
  {
    outcome: "C",
    outcomeLabel: "Exam SLO",
    key: "mock_exam_generation_ms_p95",
    label: "Mock exam gen p95",
    target: 30000,
    cmp: "lt",
    unit: "ms",
    format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`),
  },
  {
    outcome: "D",
    outcomeLabel: "Chain of custody",
    key: "vault_entry_gap_count",
    label: "Vault sequence gaps",
    target: 0,
    cmp: "eq",
    unit: "",
    format: (v) => `${v}`,
  },
  {
    outcome: "E",
    outcomeLabel: "Security posture",
    key: "critical_linter_findings",
    label: "Critical linter findings",
    target: 0,
    cmp: "eq",
    unit: "",
    format: (v) => `${v}`,
  },
  {
    outcome: "F",
    outcomeLabel: "Funnel · cognitagrc.io",
    key: "funnel_click_through_rate",
    label: "Pack → pricing CTR",
    target: 0.03,
    cmp: "gte",
    unit: "",
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },

];

function passes(spec: Spec, v: number) {
  switch (spec.cmp) {
    case "lt":
      return v < spec.target;
    case "lte":
      return v <= spec.target;
    case "gte":
      return v >= spec.target;
    case "eq":
      return v === spec.target;
  }
}

function Sparkline({ values, ok }: { values: number[]; ok: boolean }) {
  if (values.length < 2) {
    return <div className="mono text-[10px] text-muted-foreground">no history</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 22;
  const step = w / (values.length - 1);
  const d = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = ok ? "var(--severity-ok)" : "var(--severity-high)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-full">
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.2} />
    </svg>
  );
}

export function OutcomeKpiBoard() {
  const { data, isLoading } = useOutcomeKpis();

  const byKey = useMemo(() => {
    const m = new Map<string, OutcomeKpi[]>();
    for (const row of data ?? []) {
      const arr = m.get(row.kpi_key) ?? [];
      arr.push(row);
      m.set(row.kpi_key, arr);
    }
    // Rows arrive newest-first; keep that order for "latest" lookup and
    // reverse for sparkline chronology.
    return m;
  }, [data]);

  const rows = SPECS.map((spec) => {
    const history = byKey.get(spec.key) ?? [];
    const latest = history[0];
    const chron = history.slice().reverse().map((r) => Number(r.value));
    return { spec, latest, chron };
  });

  return (
    <Panel
      eyebrow="Outcome-Driven Engineering · live KPIs"
      title="Regulator-visible outcome tree"
      action={
        <div className="mono flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Target className="h-3 w-3" />
          docs/outcomes.md
        </div>
      }
    >
      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ spec, latest, chron }) => {
            const v = latest ? Number(latest.value) : null;
            const ok = v !== null ? passes(spec, v) : false;
            const color = v === null
              ? "var(--muted-foreground)"
              : ok
                ? "var(--severity-ok)"
                : "var(--severity-high)";
            const targetStr =
              spec.cmp === "gte"
                ? `≥ ${spec.target}${spec.unit}`
                : spec.cmp === "lt"
                  ? `< ${spec.format(spec.target)}`
                  : spec.cmp === "lte"
                    ? `≤ ${spec.format(spec.target)}`
                    : `= ${spec.format(spec.target)}`;
            return (
              <div
                key={spec.key}
                className="rounded-sm border border-border/60 bg-background/40 p-3"
              >
                <div className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Sub-outcome {spec.outcome} · {spec.outcomeLabel}
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="text-sm text-foreground">{spec.label}</div>
                  <div
                    className="mono text-base font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {v === null ? "—" : spec.format(v)}
                  </div>
                </div>
                <div className="mono mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>target {targetStr}</span>
                  <span
                    className="rounded-full px-1.5 py-0.5"
                    style={{
                      color,
                      background: `color-mix(in oklab, ${color} 12%, transparent)`,
                    }}
                  >
                    {v === null ? "no data" : ok ? "PASS" : "BREACH"}
                  </span>
                </div>
                <div className="mt-2">
                  <Sparkline values={chron} ok={ok} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && (data ?? []).length === 0 && (
        <div className="mono mt-3 text-[10px] text-muted-foreground">
          No KPI rows yet — the nightly job populates{" "}
          <span className="text-foreground">outcome_kpis</span>. Trigger it
          manually to backfill.
        </div>
      )}
    </Panel>
  );
}

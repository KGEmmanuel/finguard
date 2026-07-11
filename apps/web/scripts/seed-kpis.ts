/**
 * seed-kpis — populate `outcome_kpis` with a fortnight of synthetic
 * points so a fresh clone has a populated OutcomeKpiBoard on first
 * load, without waiting for the nightly `pg_cron` job.
 *
 * Usage (from a shell with SUPABASE_URL and a service-role-equivalent
 * key exported):
 *
 *   bun run scripts/seed-kpis.ts
 *
 * On Lovable Cloud the service-role key is not user-accessible; in
 * that environment run this by inserting via a signed-in maintainer
 * account and adjusting the RLS insert path, or by pasting the SQL
 * printed with `--dry-run` into the migration console.
 *
 * Status: alpha. Values are illustrative, not benchmarks.
 */

import { createClient } from "@supabase/supabase-js";

type Row = {
  outcome_key: string;
  kpi_key: string;
  value: number;
  unit: string;
  window_label: string | null;
  measured_at: string;
};

const SERIES: Array<Omit<Row, "value" | "measured_at">> = [
  { outcome_key: "A", kpi_key: "unmanaged_agent_age_p95", unit: "hours", window_label: "live" },
  { outcome_key: "B", kpi_key: "override_coverage_pct", unit: "percent", window_label: null },
  { outcome_key: "C", kpi_key: "verify_success_rate", unit: "percent", window_label: null },
  { outcome_key: "C", kpi_key: "mock_exam_generation_ms_p95", unit: "ms", window_label: "30d" },
  { outcome_key: "D", kpi_key: "vault_entry_gap_count", unit: "count", window_label: "live" },
  { outcome_key: "E", kpi_key: "critical_linter_findings", unit: "count", window_label: null },
  { outcome_key: "F", kpi_key: "funnel_click_through_rate", unit: "ratio", window_label: "30d" },
];

function synthesize(kpi: string, dayOffset: number): number {
  // Small deterministic wobble so the board looks alive, not flat.
  const t = dayOffset / 14;
  switch (kpi) {
    case "unmanaged_agent_age_p95": return Number((6 + 4 * Math.sin(t * Math.PI)).toFixed(2));
    case "override_coverage_pct":   return Number((78 + 12 * t).toFixed(2));
    case "verify_success_rate":     return 100;
    case "mock_exam_generation_ms_p95": return Math.round(3200 - 400 * t);
    case "vault_entry_gap_count":   return 0;
    case "critical_linter_findings": return dayOffset === 3 ? 1 : 0;
    case "funnel_click_through_rate": return Number((0.02 + 0.015 * t).toFixed(4));
    default: return 0;
  }
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = process.argv.includes("--dry-run");

  const rows: Row[] = [];
  const now = Date.now();
  for (let d = 13; d >= 0; d--) {
    const measured_at = new Date(now - d * 86_400_000).toISOString();
    for (const s of SERIES) {
      rows.push({ ...s, value: synthesize(s.kpi_key, 13 - d), measured_at });
    }
  }

  if (dryRun || !url || !key) {
    for (const r of rows) {
      console.log(
        `INSERT INTO public.outcome_kpis (outcome_key, kpi_key, value, unit, window_label, measured_at) ` +
          `VALUES ('${r.outcome_key}', '${r.kpi_key}', ${r.value}, '${r.unit}', ` +
          `${r.window_label ? `'${r.window_label}'` : "NULL"}, '${r.measured_at}');`,
      );
    }
    if (!dryRun) {
      console.error(
        "\nNo SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY exported — printed SQL only.",
      );
    }
    return;
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("outcome_kpis").insert(rows);
  if (error) {
    console.error("seed failed:", error.message);
    process.exit(1);
  }
  console.log(`seeded ${rows.length} rows into outcome_kpis`);
}

main();

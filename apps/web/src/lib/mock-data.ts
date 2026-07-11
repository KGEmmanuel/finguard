/**
 * Static helpers for tier and event action metadata. All row-level data now
 * comes from Lovable Cloud — see src/lib/queries.ts.
 */

export type Tier = 1 | 2 | 3;
export type EventAction = "hard_block" | "soft_flag" | "silent_log";
export type AppRole = "ciso" | "md" | "analyst";

export function tierMeta(tier: Tier) {
  if (tier === 1)
    return {
      label: "Tier 1 — Execution",
      color: "var(--tier-1)",
      mode: "Post-execution telemetry",
      sla: "≤50ms alert, 0 inline latency",
    };
  if (tier === 2)
    return {
      label: "Tier 2 — Advisory",
      color: "var(--tier-2)",
      mode: "Inline guardrails",
      sla: "200–400ms proxy",
    };
  return {
    label: "Tier 3 — Productivity",
    color: "var(--tier-3)",
    mode: "Async sampling",
    sla: "Non-blocking, monthly review",
  };
}

export function actionMeta(a: EventAction) {
  if (a === "hard_block")
    return { label: "HARD BLOCK", color: "var(--severity-critical)" };
  if (a === "soft_flag")
    return { label: "SOFT FLAG", color: "var(--severity-medium)" };
  return { label: "SILENT LOG", color: "var(--severity-low)" };
}

export function roleMeta(role: AppRole | null | undefined) {
  if (role === "ciso")
    return {
      label: "CISO",
      description: "Full control · run exams · manage inventory",
      color: "var(--severity-critical)",
    };
  if (role === "md")
    return {
      label: "Managing Director",
      description: "Approve soft-flag overrides on client-facing agents",
      color: "var(--severity-medium)",
    };
  return {
    label: "Analyst",
    description: "Read-only visibility across the mesh",
    color: "var(--tier-3)",
  };
}

/** Continuously-scored defensibility dimensions. Static reference config. */
export const defensibilityDims = [
  { key: "chain_of_custody", label: "Chain-of-custody coverage" },
  { key: "override_completeness", label: "Tier-2 override completeness" },
  { key: "telemetry_latency", label: "Tier-1 telemetry latency SLA" },
  { key: "model_card_currency", label: "Model card currency" },
  { key: "unmanaged_remediation", label: "Unmanaged agent remediation" },
  { key: "statute_mapping", label: "Regulator statute mapping" },
] as const;

export const mockExamHistory = [
  { month: "Feb", hours: 6.2, score: 79 },
  { month: "Mar", hours: 5.4, score: 82 },
  { month: "Apr", hours: 4.8, score: 84 },
  { month: "May", hours: 4.3, score: 85 },
  { month: "Jun", hours: 4.1, score: 86 },
  { month: "Jul", hours: 3.9, score: 87 },
];

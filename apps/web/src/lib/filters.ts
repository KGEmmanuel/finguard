import type { AppRole, EventAction, Tier } from "@/lib/mock-data";

export type DateRangePreset = "24h" | "7d" | "30d" | "all" | "custom";

export interface FilterState {
  agents: string[]; // agent names
  tiers: Tier[];
  actions: EventAction[]; // for guardrail events
  kinds: string[]; // vault entry kinds
  roles: AppRole[];
  preset: DateRangePreset;
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
  query: string;
}

export const emptyFilters: FilterState = {
  agents: [],
  tiers: [],
  actions: [],
  kinds: [],
  roles: [],
  preset: "all",
  query: "",
};

export function resolveRange(f: FilterState): { from?: Date; to?: Date } {
  const now = new Date();
  if (f.preset === "24h") return { from: new Date(now.getTime() - 24 * 3600 * 1000) };
  if (f.preset === "7d") return { from: new Date(now.getTime() - 7 * 86400 * 1000) };
  if (f.preset === "30d") return { from: new Date(now.getTime() - 30 * 86400 * 1000) };
  if (f.preset === "custom") {
    return {
      from: f.from ? new Date(f.from + "T00:00:00") : undefined,
      to: f.to ? new Date(f.to + "T23:59:59") : undefined,
    };
  }
  return {};
}

export function inRange(iso: string, f: FilterState): boolean {
  const { from, to } = resolveRange(f);
  if (!from && !to) return true;
  const t = new Date(iso).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

export function activeChipCount(f: FilterState): number {
  return (
    f.agents.length +
    f.tiers.length +
    f.actions.length +
    f.kinds.length +
    f.roles.length +
    (f.preset !== "all" ? 1 : 0) +
    (f.query ? 1 : 0)
  );
}

/** Human-readable filename fragment for exports. */
export function filenameSuffix(f: FilterState): string {
  const parts: string[] = [];
  if (f.tiers.length) parts.push("tier" + f.tiers.join(""));
  if (f.actions.length) parts.push(f.actions.join("-"));
  if (f.kinds.length) parts.push(f.kinds.map((k) => k.replace(/\s+/g, "_")).join("-"));
  if (f.roles.length) parts.push(f.roles.join("-"));
  if (f.preset !== "all") parts.push(f.preset);
  if (f.query) parts.push("q_" + f.query.replace(/\W+/g, "_").slice(0, 20));
  return parts.length ? "_" + parts.join("_") : "";
}

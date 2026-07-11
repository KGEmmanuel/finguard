import { X, Filter, Download, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AppRole, EventAction, Tier } from "@/lib/mock-data";
import {
  activeChipCount,
  emptyFilters,
  filenameSuffix,
  type DateRangePreset,
  type FilterState,
} from "@/lib/filters";

export interface FilterOptions {
  agents?: string[]; // available agent names
  tiers?: Tier[]; // usually [1,2,3]
  actions?: EventAction[]; // guardrail actions
  kinds?: string[]; // vault kinds
  roles?: AppRole[];
  showDate?: boolean;
  showQuery?: boolean;
  queryPlaceholder?: string;
}

export interface ExportOption {
  label: string;
  onClick: (suffix: string) => void;
}

interface FilterBarProps {
  storageKey: string;
  options: FilterOptions;
  exports: ExportOption[];
  totalCount: number;
  filteredCount: number;
  onChange: (f: FilterState) => void;
}

function loadPersisted(key: string): FilterState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return { ...emptyFilters, ...JSON.parse(raw) } as FilterState;
  } catch {
    return null;
  }
}

export function FilterBar({
  storageKey,
  options,
  exports,
  totalCount,
  filteredCount,
  onChange,
}: FilterBarProps) {
  const [state, setState] = useState<FilterState>(
    () => loadPersisted(storageKey) ?? emptyFilters,
  );
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      onChange(state);
      return;
    }
    sessionStorage.setItem(storageKey, JSON.stringify(state));
    onChange(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const update = (patch: Partial<FilterState>) =>
    setState((s) => ({ ...s, ...patch }));

  const toggle = <K extends keyof FilterState>(key: K, value: unknown) => {
    setState((s) => {
      const arr = s[key] as unknown as unknown[];
      const has = arr.includes(value);
      return {
        ...s,
        [key]: has ? arr.filter((v) => v !== value) : [...arr, value],
      } as FilterState;
    });
  };

  const clearAll = () => setState(emptyFilters);
  const chipCount = activeChipCount(state);
  const suffix = filenameSuffix(state);

  const presets: { key: DateRangePreset; label: string }[] = [
    { key: "all", label: "All time" },
    { key: "24h", label: "Last 24h" },
    { key: "7d", label: "Last 7d" },
    { key: "30d", label: "Last 30d" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="mono h-8 text-[10px] uppercase tracking-widest"
              aria-label="Open filters"
            >
              <Filter className="mr-1.5 h-3 w-3" />
              Filters
              {chipCount > 0 && (
                <span
                  className="ml-1.5 rounded-sm px-1 text-[10px]"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 22%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  {chipCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-3">
            {options.showQuery !== false && (
              <div>
                <Label>Search</Label>
                <input
                  value={state.query}
                  onChange={(e) => update({ query: e.target.value })}
                  placeholder={options.queryPlaceholder ?? "Search…"}
                  className="mt-1 w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs"
                />
              </div>
            )}

            {options.tiers && (
              <FilterGroup label="Tier">
                {options.tiers.map((t) => (
                  <Chip
                    key={t}
                    active={state.tiers.includes(t)}
                    color={`var(--tier-${t})`}
                    onClick={() => toggle("tiers", t)}
                  >
                    T{t}
                  </Chip>
                ))}
              </FilterGroup>
            )}

            {options.actions && (
              <FilterGroup label="Event type">
                {options.actions.map((a) => (
                  <Chip
                    key={a}
                    active={state.actions.includes(a)}
                    onClick={() => toggle("actions", a)}
                  >
                    {a.replace("_", " ")}
                  </Chip>
                ))}
              </FilterGroup>
            )}

            {options.kinds && options.kinds.length > 0 && (
              <FilterGroup label="Vault kind">
                {options.kinds.map((k) => (
                  <Chip
                    key={k}
                    active={state.kinds.includes(k)}
                    onClick={() => toggle("kinds", k)}
                  >
                    {k}
                  </Chip>
                ))}
              </FilterGroup>
            )}

            {options.roles && (
              <FilterGroup label="Role">
                {options.roles.map((r) => (
                  <Chip
                    key={r}
                    active={state.roles.includes(r)}
                    onClick={() => toggle("roles", r)}
                  >
                    {r === "md" ? "MD" : r.toUpperCase()}
                  </Chip>
                ))}
              </FilterGroup>
            )}

            {options.agents && options.agents.length > 0 && (
              <FilterGroup label="Agent">
                <div className="max-h-32 w-full space-y-1 overflow-y-auto">
                  {options.agents.map((a) => (
                    <label
                      key={a}
                      className="mono flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-[11px] hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        checked={state.agents.includes(a)}
                        onChange={() => toggle("agents", a)}
                      />
                      <span className="truncate">{a}</span>
                    </label>
                  ))}
                </div>
              </FilterGroup>
            )}

            {options.showDate !== false && (
              <FilterGroup label="Date range">
                <div className="flex flex-wrap gap-1">
                  {presets.map((p) => (
                    <Chip
                      key={p.key}
                      active={state.preset === p.key}
                      onClick={() => update({ preset: p.key })}
                    >
                      {p.label}
                    </Chip>
                  ))}
                </div>
                {state.preset === "custom" && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={state.from ?? ""}
                      onChange={(e) => update({ from: e.target.value })}
                      className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
                    />
                    <input
                      type="date"
                      value={state.to ?? ""}
                      onChange={(e) => update({ to: e.target.value })}
                      className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                )}
              </FilterGroup>
            )}

            <div className="flex justify-end border-t border-border pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="mono h-7 text-[10px] uppercase tracking-widest"
                onClick={clearAll}
              >
                Clear all
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {exports.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="mono h-8 text-[10px] uppercase tracking-widest"
                aria-label="Export CSV"
              >
                <Download className="mr-1.5 h-3 w-3" />
                Export CSV
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              {exports.map((e) => (
                <button
                  key={e.label}
                  onClick={() => e.onClick(suffix)}
                  className="mono block w-full rounded-sm px-2 py-1.5 text-left text-[11px] hover:bg-muted"
                >
                  {e.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        <div className="mono text-[10px] text-muted-foreground">
          Showing <span className="tabular-nums text-foreground">{filteredCount}</span>{" "}
          of <span className="tabular-nums">{totalCount}</span>
        </div>
      </div>

      {chipCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {state.tiers.map((t) => (
            <ActiveChip key={"t" + t} onRemove={() => toggle("tiers", t)}>
              T{t}
            </ActiveChip>
          ))}
          {state.actions.map((a) => (
            <ActiveChip key={a} onRemove={() => toggle("actions", a)}>
              {a.replace("_", " ")}
            </ActiveChip>
          ))}
          {state.kinds.map((k) => (
            <ActiveChip key={k} onRemove={() => toggle("kinds", k)}>
              {k}
            </ActiveChip>
          ))}
          {state.roles.map((r) => (
            <ActiveChip key={r} onRemove={() => toggle("roles", r)}>
              {r === "md" ? "MD" : r.toUpperCase()}
            </ActiveChip>
          ))}
          {state.agents.map((a) => (
            <ActiveChip key={a} onRemove={() => toggle("agents", a)}>
              {a}
            </ActiveChip>
          ))}
          {state.preset !== "all" && (
            <ActiveChip onRemove={() => update({ preset: "all", from: undefined, to: undefined })}>
              {state.preset === "custom"
                ? `${state.from ?? "…"} → ${state.to ?? "…"}`
                : "Last " + state.preset}
            </ActiveChip>
          )}
          {state.query && (
            <ActiveChip onRemove={() => update({ query: "" })}>
              &ldquo;{state.query}&rdquo;
            </ActiveChip>
          )}
          <button
            onClick={clearAll}
            className="mono rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "mono rounded-sm border px-2 py-1 text-[10px] uppercase tracking-widest transition-colors " +
        (active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-muted-foreground hover:text-foreground")
      }
      style={active && color ? { color, borderColor: color } : undefined}
    >
      {children}
    </button>
  );
}

function ActiveChip({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="mono inline-flex items-center gap-1 rounded-sm border border-border bg-muted/60 px-1.5 py-0.5 text-[10px]">
      {children}
      <button
        onClick={onRemove}
        aria-label="Remove filter"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

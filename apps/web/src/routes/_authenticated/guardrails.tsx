import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Panel, TierPill, Stat, Bar } from "@/components/panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { FilterBar } from "@/components/filter-bar";
import { actionMeta } from "@/lib/mock-data";
import {
  useAgents,
  useCurrentUser,
  useGuardrailEvents,
  useOverrides,
  type GuardrailEvent,
} from "@/lib/queries";
import { recordOverride, shortHash } from "@/lib/audit";
import { emptyFilters, inRange, type FilterState } from "@/lib/filters";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/guardrails")({
  head: () => ({ meta: [{ title: "Guardrail Events — Cognita FinGuard" }] }),
  component: Guardrails,
});

function Guardrails() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const agents = useAgents();
  const events = useGuardrailEvents();
  const overrides = useOverrides();

  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [active, setActive] = useState<GuardrailEvent | null>(null);
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);

  const list = events.data ?? [];
  const agentNames = Array.from(new Set((agents.data ?? []).map((a) => a.name))).sort();
  const overrideMap = new Map((overrides.data ?? []).map((o) => [o.event_id, o]));

  const shown = useMemo(() => {
    const q = filters.query.toLowerCase();
    return list.filter((e) => {
      if (filters.agents.length && !filters.agents.includes(e.agent_name)) return false;
      if (filters.tiers.length && !filters.tiers.includes(e.tier)) return false;
      if (filters.actions.length && !filters.actions.includes(e.action)) return false;
      if (filters.roles.length) {
        const ov = overrideMap.get(e.id);
        if (!ov || !filters.roles.includes(ov.user_role)) return false;
      }
      if (!inRange(e.ts, filters)) return false;
      if (q) {
        const hay = `${e.rule} ${e.prompt} ${e.reg_ref} ${e.agent_name} ${e.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, filters, overrideMap]);

  if (events.isLoading || overrides.isLoading || agents.isLoading || !user)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  const canOverride = user.role === "md" || user.role === "ciso";

  const counts = {
    hard_block: list.filter((e) => e.action === "hard_block").length,
    soft_flag: list.filter((e) => e.action === "soft_flag").length,
    silent_log: list.filter((e) => e.action === "silent_log").length,
    overrides: (overrides.data ?? []).length,
  };

  const exportRows = (rows: GuardrailEvent[]) =>
    rows.map((e) => {
      const ov = overrideMap.get(e.id);
      return {
        id: e.id,
        ts: e.ts,
        agent_name: e.agent_name,
        tier: e.tier,
        action: e.action,
        category: e.category,
        rule: e.rule,
        reg_ref: e.reg_ref,
        user_label: e.user_label,
        user_trust: e.user_trust,
        prompt: e.prompt,
        override_by: ov?.user_display_name ?? "",
        override_role: ov?.user_role ?? "",
        override_hash: ov?.evidence_hash ?? "",
      };
    });

  const submit = async () => {
    if (!active || !user) return;
    if (justification.trim().length < 8) {
      toast.error("Justification must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const { hash } = await recordOverride({
        event: active,
        justification: justification.trim(),
        user,
      });
      toast.success("Override signed & hashed", {
        description: `${active.id} · vault ${shortHash(hash)}`,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["override_events"] }),
        qc.invalidateQueries({ queryKey: ["audit_vault"] }),
      ]);
      setActive(null);
      setJustification("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Override failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Toaster theme="dark" position="top-right" />

      <header>
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Module 2 · Probabilistic Guardrails
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Graded response — because hard-blocking every prompt gets bypassed
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Overrides are inserted into <span className="mono">override_events</span>{" "}
          and immediately hashed into the append-only{" "}
          <span className="mono">audit_vault</span>. RLS restricts inserts to
          Managing Directors and CISOs.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Hard Blocks" value={counts.hard_block} sub="Sec-Ops escalation" accent="var(--severity-critical)" />
        <Stat label="Soft Flags" value={counts.soft_flag} sub={`${counts.overrides} overridden w/ justification`} accent="var(--severity-medium)" />
        <Stat label="Silent Logs" value={counts.silent_log} sub="Monthly CRO review" accent="var(--severity-low)" />
        <Stat label="Your role" value={user.role.toUpperCase()} sub={canOverride ? "Override rights enabled" : "Read-only — cannot override"} accent={canOverride ? "var(--severity-ok)" : "var(--muted-foreground)"} />
      </section>

      <Panel eyebrow="Live enforcement feed · Lovable Cloud" title="Guardrail Events">
        <div className="mb-4">
          <FilterBar
            storageKey="finguard.filters.guardrails"
            options={{
              agents: agentNames,
              tiers: [1, 2, 3],
              actions: ["hard_block", "soft_flag", "silent_log"],
              roles: ["ciso", "md", "analyst"],
              showDate: true,
              showQuery: true,
              queryPlaceholder: "Search rule, prompt, statute…",
            }}
            totalCount={list.length}
            filteredCount={shown.length}
            onChange={setFilters}
            exports={[
              {
                label: `Filtered events (${shown.length})`,
                onClick: (suffix) =>
                  downloadCsv(exportRows(shown), `guardrail-events${suffix}.csv`),
              },
              {
                label: `All events (${list.length})`,
                onClick: () =>
                  downloadCsv(exportRows(list), "guardrail-events_all.csv"),
              },
              {
                label: `All overrides (${overrides.data?.length ?? 0})`,
                onClick: () =>
                  downloadCsv(
                    (overrides.data ?? []).map((o) => ({ ...o })),
                    "overrides_all.csv",
                  ),
              },
            ]}
          />
        </div>
        <ul className="divide-y divide-border">
          {shown.map((e) => {
            const a = actionMeta(e.action);
            const override = overrideMap.get(e.id);
            const eligible = e.action === "soft_flag" && !override;
            return (
              <li key={e.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="mono w-32 shrink-0 text-[11px] text-muted-foreground">
                    {new Date(e.ts).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
                        style={{ color: a.color, background: `color-mix(in oklab, ${a.color} 15%, transparent)` }}>
                        {e.action === "hard_block" && <ShieldOff className="h-3 w-3" />}
                        {e.action === "soft_flag" && <ShieldAlert className="h-3 w-3" />}
                        {e.action === "silent_log" && <ShieldCheck className="h-3 w-3" />}
                        {a.label}
                      </span>
                      <TierPill tier={e.tier} />
                      <span className="text-xs font-medium text-foreground">{e.agent_name}</span>
                      <span className="mono text-[11px] text-muted-foreground">· {e.id}</span>
                    </div>
                    <div className="mono mt-1 text-[11px] text-foreground/80">{e.rule}</div>
                    <div className="mono mt-1 text-[11px] text-muted-foreground">
                      {e.category} · <span className="text-accent">{e.reg_ref}</span> · user {e.user_label}
                    </div>
                    <div className="mt-2 rounded-sm border border-border bg-muted/40 p-2">
                      <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Prompt context</div>
                      <div className="mono mt-1 text-[11px] text-foreground/90">{e.prompt}</div>
                    </div>
                    {override && (
                      <div className="mt-2 flex items-start gap-2 rounded-sm border p-2 text-[11px]"
                        style={{ borderColor: "color-mix(in oklab, var(--severity-ok) 40%, transparent)", background: "color-mix(in oklab, var(--severity-ok) 8%, transparent)" }}>
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--severity-ok)" }} />
                        <div className="min-w-0 flex-1">
                          <div className="mono text-[10px] uppercase tracking-widest" style={{ color: "var(--severity-ok)" }}>
                            Signed by {override.user_display_name} ({override.user_role.toUpperCase()}) · vault {shortHash(override.evidence_hash)}
                          </div>
                          <div className="mono mt-0.5 text-foreground/85">"{override.justification}"</div>
                          <div className="mono mt-0.5 text-[10px] text-muted-foreground">
                            {new Date(override.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex w-32 shrink-0 flex-col items-end gap-2">
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Trust</div>
                    <div className="w-full">
                      <Bar value={e.user_trust} color={e.user_trust >= 80 ? "var(--severity-ok)" : e.user_trust >= 50 ? "var(--severity-medium)" : "var(--severity-high)"} />
                    </div>
                    <div className="mono text-[11px] tabular-nums text-foreground">{e.user_trust}/100</div>
                    {eligible && canOverride && (
                      <Button size="sm" variant="secondary" className="mono h-7 w-full text-[10px] uppercase tracking-widest" onClick={() => setActive(e)}>
                        Override
                      </Button>
                    )}
                    {eligible && !canOverride && (
                      <div className="mono flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" /> MD only
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {shown.length === 0 && (
            <li className="mono py-8 text-center text-[11px] text-muted-foreground">
              No events match the current filters.
            </li>
          )}
        </ul>
      </Panel>

      <Dialog open={active !== null} onOpenChange={(o) => { if (!o) { setActive(null); setJustification(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Business Justification Override</DialogTitle>
            <DialogDescription>
              This override is inserted into <span className="mono">override_events</span> and
              its SHA-256 hash is written to the append-only{" "}
              <span className="mono">audit_vault</span>. Neither row can be
              modified or deleted after this action.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="panel space-y-1 p-3 text-xs">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Event {active.id} · {active.reg_ref}
              </div>
              <div className="text-foreground">{active.rule}</div>
              <div className="mono text-[11px] text-muted-foreground">
                {active.agent_name} · {active.user_label}
              </div>
              <div className="mono mt-2 text-[10px] text-muted-foreground">
                Signer: {user.profile?.display_name ?? user.email} ({user.role.toUpperCase()})
              </div>
            </div>
          )}
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="e.g. Retrieving client tax records under signed advisory engagement 2026-Q3-118…"
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setActive(null); setJustification(""); }} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Signing…" : "Sign & Persist to Vault"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

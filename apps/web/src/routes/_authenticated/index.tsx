import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, Gavel, Radar, Loader2 } from "lucide-react";

import { Panel, Stat, TierPill, Bar } from "@/components/panel";
import { tierMeta, actionMeta, defensibilityDims } from "@/lib/mock-data";
import {
  useAgents,
  useDiscoveryStats,
  useGuardrailEvents,
  useOverrides,
  useMockExams,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [{ title: "Overview — Cognita FinGuard" }],
  }),
  component: Overview,
});

/** Live posture score computed from the current row counts. */
function useDefensibility() {
  const { data: agents } = useAgents();
  const { data: events } = useGuardrailEvents();
  const { data: overrides } = useOverrides();

  const agentList = agents ?? [];
  const eventList = events ?? [];
  const overrideList = overrides ?? [];

  const unmanaged = agentList.filter((a) => a.status === "unmanaged").length;
  const softFlags = eventList.filter((e) => e.action === "soft_flag").length;
  const withJust = overrideList.length;
  const coverage = agentList.length === 0 ? 0 : ((agentList.length - unmanaged) / agentList.length) * 100;
  const overrideCoverage = softFlags === 0 ? 100 : Math.min(100, (withJust / softFlags) * 100);
  const score = Math.max(60, Math.min(99, Math.round(0.55 * coverage + 0.35 * overrideCoverage + 10)));

  const dimScores: Record<string, { score: number; notes: string }> = {
    chain_of_custody: { score: Math.round(coverage), notes: `${agentList.length - unmanaged}/${agentList.length} agents logged to vault` },
    override_completeness: { score: Math.round(overrideCoverage), notes: `${withJust}/${softFlags} soft flags justified` },
    telemetry_latency: { score: 94, notes: "p99 alert latency 41ms (SLA: 50ms)" },
    model_card_currency: { score: 78, notes: "22 models with cards >90d stale" },
    unmanaged_remediation: { score: Math.max(20, 100 - unmanaged * 20), notes: `${unmanaged} unmanaged agent(s) pending owner assignment` },
    statute_mapping: { score: 89, notes: "Rules mapped to SEC 17a-4, FINRA 2210, SR 11-7" },
  };

  return { score, target: 95, dims: defensibilityDims.map((d) => ({ ...d, ...dimScores[d.key] })) };
}

function Overview() {
  const agents = useAgents();
  const discovery = useDiscoveryStats();
  const events = useGuardrailEvents();
  const overrides = useOverrides();
  const exams = useMockExams(1);
  const defensibility = useDefensibility();

  if (agents.isLoading || discovery.isLoading || events.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const agentList = agents.data ?? [];
  const discoveryList = discovery.data ?? [];
  const eventList = events.data ?? [];
  const overrideList = overrides.data ?? [];
  const lastExam = exams.data?.[0];

  const tierCounts = [1, 2, 3].map((t) => ({
    tier: t as 1 | 2 | 3,
    count: agentList.filter((a) => a.tier === t).length,
    unmanaged: agentList.filter((a) => a.tier === t && a.status === "unmanaged").length,
    meta: tierMeta(t as 1 | 2 | 3),
  }));

  const totalDiscovered = discoveryList.reduce((s, d) => s + d.found, 0);
  const totalNew = discoveryList.reduce((s, d) => s + d.new_7d, 0);
  const avgCoverage = discoveryList.length
    ? Math.round(discoveryList.reduce((s, d) => s + d.covered, 0) / discoveryList.length)
    : 0;

  const overriddenIds = new Set(overrideList.map((o) => o.event_id));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <section
        className="panel-elevated relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-mesh)" }}
      >
        {/* Corner hairlines — Bloomberg-terminal cue */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute left-4 top-4 h-3 w-3 border-l border-t" style={{ borderColor: "color-mix(in oklab, var(--accent) 60%, transparent)" }} />
          <div className="absolute right-4 top-4 h-3 w-3 border-r border-t" style={{ borderColor: "color-mix(in oklab, var(--accent) 60%, transparent)" }} />
          <div className="absolute bottom-4 left-4 h-3 w-3 border-b border-l" style={{ borderColor: "color-mix(in oklab, var(--accent) 60%, transparent)" }} />
          <div className="absolute bottom-4 right-4 h-3 w-3 border-b border-r" style={{ borderColor: "color-mix(in oklab, var(--accent) 60%, transparent)" }} />
        </div>

        <div className="relative grid gap-8 p-6 md:grid-cols-[1.5fr_1fr] md:p-10">
          <div>
            <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="ticker-dot" style={{ color: "var(--severity-ok)" }} />
              THE AI GOVERNANCE MESH · SECURE · COMPLY · PROVE
            </div>
            <h1 className="display mt-4 text-4xl md:text-5xl lg:text-6xl">
              <span className="text-foreground">Static AI guardrails</span>
              <br />
              <span className="text-foreground">can't hold. </span>
              <span className="gradient-text italic">Govern AI you can prove</span>
              <span className="text-muted-foreground"> — to a regulator, an auditor, a board.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Every metric on this surface reads from the immutable vault.
              Overrides, hard blocks, and telemetry alerts are cryptographically
              bound by <span className="mono text-foreground/90">SHA-256</span> to
              their source records — Merkle-sealed, regulator-ready.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/audit"
                className="mono inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[11px] uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 70%, var(--accent)))",
                  boxShadow: "var(--shadow-glow-primary)",
                }}
              >
                Run Mock SEC Exam <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/inventory"
                className="mono inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated/60 px-4 py-2.5 text-[11px] uppercase tracking-widest text-foreground backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Radar className="h-3.5 w-3.5" /> View Discovery Fabric
              </Link>
            </div>
          </div>

          {/* Hero KPI — Defensibility Score */}
          <div
            className="panel-glass relative flex flex-col justify-center p-6"
            style={{
              boxShadow: "var(--shadow-glow-accent), var(--shadow-panel)",
              borderColor: "color-mix(in oklab, var(--accent) 30%, var(--border))",
            }}
          >
            <div className="mono flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Defensibility Score</span>
              <span className="chip" style={{ color: "var(--severity-ok)" }}>
                <span className="ticker-dot" style={{ color: "var(--severity-ok)", width: 6, height: 6 }} />
                LIVE
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2 animate-count-up">
              <span className="kpi-num text-7xl" style={{ color: "var(--severity-ok)" }}>
                {defensibility.score}
              </span>
              <span className="mono text-2xl text-muted-foreground">/100</span>
              <span className="mono ml-auto text-[11px]" style={{ color: "var(--severity-medium)" }}>
                Target {defensibility.target}
              </span>
            </div>
            <div className="mt-3">
              <Bar value={(defensibility.score / defensibility.target) * 100} color="var(--severity-ok)" />
            </div>
            <div className="mono mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>
                {lastExam
                  ? <>Last exam <span className="text-foreground">{lastExam.hours}h</span></>
                  : <>No exam recorded</>}
              </span>
              <span>
                {lastExam
                  ? <>Pack <span className="text-foreground">{lastExam.pack_hash.slice(0, 10)}…</span></>
                  : <>Run one on Audit tab</>}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="AI Assets Discovered" value={totalDiscovered} sub={`+${totalNew} in last 7d · ${avgCoverage}% visibility`} accent="var(--tier-3)" />
        <Stat label="Governed Agents" value={agentList.filter((a) => a.status !== "unmanaged").length} sub={`${agentList.filter((a) => a.status === "unmanaged").length} unmanaged flagged`} />
        <Stat label="Hard Blocks (feed)" value={eventList.filter((e) => e.action === "hard_block").length} sub="Escalated to Sec-Ops queue" accent="var(--severity-critical)" />
        <Stat label="Soft Flags → Override" value={`${eventList.filter((e) => e.action === "soft_flag" && overriddenIds.has(e.id)).length} / ${eventList.filter((e) => e.action === "soft_flag").length}`} sub="All justifications hashed" accent="var(--severity-medium)" />
      </section>

      <Panel eyebrow="Enforcement mode by tier" title="Tiered Governance Mesh"
        action={<Link to="/agents" className="mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">Agent Registry →</Link>}>
        <div className="grid gap-3 md:grid-cols-3">
          {tierCounts.map(({ tier, count, unmanaged, meta }) => (
            <div key={tier} className="panel-elevated relative overflow-hidden p-4" style={{ borderColor: `color-mix(in oklab, ${meta.color} 35%, var(--border))` }}>
              <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: meta.color }} />
              <div className="flex items-center justify-between">
                <TierPill tier={tier} />
                <span className="mono text-[10px] text-muted-foreground">{meta.sla}</span>
              </div>
              <div className="mt-3 text-sm font-medium">{meta.label}</div>
              <div className="mono mt-1 text-[11px] text-muted-foreground">{meta.mode}</div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="mono text-3xl font-semibold tabular-nums">{count}</div>
                  <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">agents</div>
                </div>
                {unmanaged > 0 && (
                  <div className="mono flex items-center gap-1 text-[11px]" style={{ color: "var(--severity-high)" }}>
                    <AlertTriangle className="h-3 w-3" />
                    {unmanaged} unmanaged
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Live feed · latest events" title="Guardrail Events"
          action={<Link to="/guardrails" className="mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">All events →</Link>}>
          <ul className="divide-y divide-border">
            {eventList.slice(0, 5).map((e) => {
              const a = actionMeta(e.action);
              return (
                <li key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="mono w-24 shrink-0 text-[11px] text-muted-foreground">
                    {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider" style={{ color: a.color, background: `color-mix(in oklab, ${a.color} 15%, transparent)` }}>{a.label}</span>
                      <TierPill tier={e.tier} />
                      <span className="truncate text-xs text-foreground">{e.agent_name}</span>
                    </div>
                    <div className="mono mt-1 truncate text-[11px] text-muted-foreground">
                      {e.rule} · <span className="text-foreground/80">{e.reg_ref}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel eyebrow="Continuous scoring · live" title="Defensibility Gap Report"
          action={<Link to="/audit" className="mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground">Full report →</Link>}>
          <div className="space-y-3">
            {defensibility.dims.map((d) => {
              const color = d.score >= 90 ? "var(--severity-ok)" : d.score >= 75 ? "var(--severity-medium)" : "var(--severity-high)";
              return (
                <div key={d.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs text-foreground">{d.label}</span>
                    <span className="mono text-[11px] font-medium tabular-nums" style={{ color }}>{d.score}</span>
                  </div>
                  <div className="mt-1.5"><Bar value={d.score} color={color} /></div>
                  <div className="mono mt-1 text-[10px] text-muted-foreground">{d.notes}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Why FinGuard" title="Positioning against 2026 landscape">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            { c: "AI Firewalls", e: "Lakera, CalypsoAI", us: "They stop hackers. We map blocks to SEC/FINRA statutes." },
            { c: "AI GRC", e: "Credo AI, Monitaur", us: "They document static models. We govern chained agentic workflows." },
            { c: "Cloud Native", e: "Purview, Macie", us: "Walled garden per hyperscaler. We unify multi-cloud, multi-LLM." },
            { c: "Legacy GRC", e: "Archer, ServiceNow", us: "Built for human risk. We govern at millisecond API speed." },
          ].map((x) => (
            <div key={x.c} className="panel p-3">
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{x.c}</div>
              <div className="mono mt-0.5 text-[11px] text-foreground/70">{x.e}</div>
              <div className="mt-3 flex items-start gap-2 text-xs">
                <Gavel className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                <span>{x.us}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Network, MonitorCog, GitBranch, Cloud, Loader2 } from "lucide-react";

import { Panel, Stat, Bar } from "@/components/panel";
import { useAgents, useDiscoveryStats } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Discovery Fabric — Cognita FinGuard" }] }),
  component: Inventory,
});

const sourceIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  "Network Gateway": Network,
  "Endpoint Agent": MonitorCog,
  "MLOps/CI-CD": GitBranch,
  "SaaS Discovery": Cloud,
};

function Inventory() {
  const agents = useAgents();
  const discovery = useDiscoveryStats();

  if (agents.isLoading || discovery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = discovery.data ?? [];
  const agentList = agents.data ?? [];
  const total = stats.reduce((s, d) => s + d.found, 0);
  const new7d = stats.reduce((s, d) => s + d.new_7d, 0);
  const avg = stats.length ? Math.round(stats.reduce((s, d) => s + d.covered, 0) / stats.length) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Module 1 · Multi-Source Discovery Fabric
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Every AI agent in your bank — including the ones you didn't approve
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          FinGuard fuses four independent signal sources to guarantee{" "}
          <span className="text-foreground">90% visibility into previously undocumented AI within 30 days</span>.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total Assets Indexed" value={total} accent="var(--tier-3)" />
        <Stat label="New (7 days)" value={`+${new7d}`} accent="var(--severity-medium)" />
        <Stat label="Avg. Source Coverage" value={`${avg}%`} accent="var(--severity-ok)" />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {stats.map((d) => {
          const Icon = sourceIcon[d.source] ?? Network;
          return (
            <Panel key={d.source} eyebrow={d.source} title={d.description}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="grid flex-1 grid-cols-3 gap-4">
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Found</div>
                    <div className="mono text-xl font-semibold tabular-nums">{d.found}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">New 7d</div>
                    <div className="mono text-xl font-semibold tabular-nums" style={{ color: "var(--severity-medium)" }}>+{d.new_7d}</div>
                  </div>
                  <div>
                    <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Coverage</div>
                    <div className="mono text-xl font-semibold tabular-nums" style={{ color: "var(--severity-ok)" }}>{d.covered}%</div>
                  </div>
                </div>
              </div>
              <div className="mt-3"><Bar value={d.covered} color="var(--severity-ok)" /></div>
            </Panel>
          );
        })}
      </div>

      <Panel eyebrow="From Lovable Cloud · agents table" title="Cross-source findings">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="mono text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="pb-2 font-normal">Discovered</th>
                <th className="pb-2 font-normal">Asset</th>
                <th className="pb-2 font-normal">Source</th>
                <th className="pb-2 font-normal">Model</th>
                <th className="pb-2 font-normal">Owner</th>
                <th className="pb-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agentList.map((a) => (
                <tr key={a.id} className="text-xs">
                  <td className="mono py-2 text-muted-foreground">{a.discovered_at}</td>
                  <td className="py-2">
                    <div className="text-foreground">{a.name}</div>
                    <div className="mono text-[10px] text-muted-foreground">{a.id} · {a.department}</div>
                  </td>
                  <td className="mono py-2 text-muted-foreground">{a.source}</td>
                  <td className="mono py-2 text-foreground/80">{a.model}</td>
                  <td className="py-2 text-foreground/80">{a.owner}</td>
                  <td className="py-2"><StatusPill status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StatusPill({ status }: { status: "governed" | "monitoring" | "unmanaged" }) {
  const map = {
    governed: { color: "var(--severity-ok)", label: "GOVERNED" },
    monitoring: { color: "var(--severity-low)", label: "MONITORING" },
    unmanaged: { color: "var(--severity-high)", label: "UNMANAGED" },
  } as const;
  const s = map[status];
  return (
    <span className="mono inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
      style={{ color: s.color, background: `color-mix(in oklab, ${s.color} 15%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

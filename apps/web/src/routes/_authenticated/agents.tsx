import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Panel, TierPill } from "@/components/panel";
import { tierMeta } from "@/lib/mock-data";
import { useAgents } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({ meta: [{ title: "Agent Registry — Cognita FinGuard" }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const { data, isLoading } = useAgents();
  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  const agents = data ?? [];
  const tiers: (1 | 2 | 3)[] = [1, 2, 3];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Agent Registry · governed + shadow</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Every agent, classified by the enforcement it needs</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Rows persist in Lovable Cloud (`public.agents`). CISOs can add or edit;
          all other signed-in users have read access under row-level security.
        </p>
      </header>

      {tiers.map((t) => {
        const meta = tierMeta(t);
        const list = agents.filter((a) => a.tier === t);
        return (
          <Panel key={t} eyebrow={meta.mode + " · " + meta.sla}
            title={<div className="flex items-center gap-2"><TierPill tier={t} /><span>{meta.label}</span></div>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="mono text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="pb-2 font-normal">Agent</th>
                    <th className="pb-2 font-normal">Owner / Dept</th>
                    <th className="pb-2 font-normal">Model</th>
                    <th className="pb-2 font-normal">Calls / day</th>
                    <th className="pb-2 font-normal">Reg. mapping</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((a) => (
                    <tr key={a.id} className="text-xs">
                      <td className="py-2">
                        <div className="text-foreground">{a.name}</div>
                        <div className="mono text-[10px] text-muted-foreground">{a.id}</div>
                      </td>
                      <td className="py-2">
                        <div className="text-foreground/90">{a.owner}</div>
                        <div className="mono text-[10px] text-muted-foreground">{a.department}</div>
                      </td>
                      <td className="mono py-2 text-foreground/80">{a.model}</td>
                      <td className="mono py-2 tabular-nums text-foreground/90">{a.calls_per_day}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {a.reg_tags.length === 0 && <span className="mono text-[10px] text-muted-foreground">—</span>}
                          {a.reg_tags.map((tag) => (
                            <span key={tag} className="mono rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground/80">{tag}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

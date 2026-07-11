import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Radar,
  Shield,
  ScrollText,
  Cpu,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { BrandMark } from "@/components/brand-mark";
import { UpgradeCta } from "@/components/UpgradeCta";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/queries";
import { roleMeta } from "@/lib/mock-data";

const nav = [
  { title: "Overview", url: "/", icon: Activity, group: "Command" },
  { title: "Discovery Fabric", url: "/inventory", icon: Radar, group: "Discover" },
  { title: "Agent Registry", url: "/agents", icon: Cpu, group: "Discover" },
  { title: "Guardrail Events", url: "/guardrails", icon: Shield, group: "Enforce" },
  { title: "Audit Defensibility", url: "/audit", icon: ScrollText, group: "Prove" },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/" ? currentPath === "/" : currentPath.startsWith(p));
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const role = roleMeta(user?.role);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const groups = Array.from(new Set(nav.map((n) => n.group)));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <BrandMark size={36} glow />

          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                  Cognita
                </span>
                <span className="mono rounded-sm border border-sidebar-border bg-sidebar-accent px-1 py-px text-[9px] tracking-widest text-sidebar-foreground/80">
                  GRC
                </span>
              </div>
              <span className="mono text-[10px] tracking-widest text-muted-foreground">
                FINGUARD · v2.0
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g}>
            <SidebarGroupLabel className="mono text-[10px] tracking-widest">
              {g.toUpperCase()}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.filter((n) => n.group === g).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="space-y-2 px-2 py-2">
            {/* Tier legend — brand signature */}
            <div className="panel px-2 py-2">
              <div className="mono mb-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                Tier legend
              </div>
              <div className="space-y-1">
                {([1, 2, 3] as const).map((t) => {
                  const labels = { 1: "Execution", 2: "Advisory", 3: "Productivity" } as const;
                  return (
                    <div key={t} className="mono flex items-center gap-1.5 text-[10px]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: `var(--tier-${t})`, boxShadow: `0 0 8px var(--tier-${t})` }}
                      />
                      <span className="text-foreground/80">T{t}</span>
                      <span className="text-muted-foreground">· {labels[t]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mono mt-2 flex items-center gap-1.5 border-t border-sidebar-border pt-1.5 text-[10px] text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--severity-ok)", boxShadow: "0 0 8px var(--severity-ok)" }}
                />
                <span>Vault anchored · #4,821,097</span>
              </div>
            </div>

            {user && (
              <div className="panel px-2 py-2">
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Signed in
                </div>
                <div className="mt-0.5 truncate text-xs font-medium text-foreground">
                  {user.profile?.display_name ?? user.email}
                </div>
                <div className="mono mt-1 flex items-center gap-1.5 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: role.color }} />
                  <span style={{ color: role.color }}>{role.label}</span>
                  {user.profile?.department && (
                    <span className="text-muted-foreground">· {user.profile.department}</span>
                  )}
                </div>
                <div className="mono mt-1 text-[10px] text-muted-foreground">
                  Trust {user.profile?.trust_score ?? 50}/100
                </div>
              </div>
            )}

            {user && (
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="mono flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            )}
            <UpgradeCta surface="sidebar-footer" variant="compact" />


            <a
              href="https://github.com/KGEmmanuel/finguard"
              target="_blank"
              rel="noopener noreferrer"
              className="mono block text-center text-[9px] uppercase tracking-widest text-muted-foreground/70 hover:text-foreground"
            >
              Open source · MIT
            </a>
          </div>
        )}
        {collapsed && user && (
          <button
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="mx-auto my-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

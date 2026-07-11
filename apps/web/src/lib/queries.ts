import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Tier, EventAction } from "@/lib/mock-data";

export interface Agent {
  id: string;
  name: string;
  owner: string;
  department: string;
  tier: Tier;
  source: string;
  model: string;
  status: "governed" | "monitoring" | "unmanaged";
  discovered_at: string;
  calls_per_day: string;
  reg_tags: string[];
}

export interface DiscoveryStat {
  source: string;
  found: number;
  new_7d: number;
  covered: number;
  description: string;
}

export interface GuardrailEvent {
  id: string;
  ts: string;
  agent_id: string | null;
  agent_name: string;
  tier: Tier;
  user_label: string;
  user_trust: number;
  action: EventAction;
  category: string;
  rule: string;
  reg_ref: string;
  prompt: string;
}

export interface OverrideEvent {
  id: string;
  event_id: string;
  user_id: string;
  user_display_name: string;
  user_role: AppRole;
  justification: string;
  evidence_hash: string;
  created_at: string;
}

export interface VaultEntry {
  id: string;
  hash: string;
  kind: string;
  ref: string;
  actor_display_name: string | null;
  created_at: string;
  payload: Record<string, unknown>;
}

export interface MockExam {
  id: string;
  run_by: string;
  run_by_name: string;
  hours: number;
  score: number;
  agent_count: number;
  event_count: number;
  override_count: number;
  pack_hash: string;
  created_at: string;
  requested_at: string;
  generation_ms: number | null;
  filename: string | null;
  manifest: Record<string, unknown>;
}

export interface ExamDownload {
  id: string;
  exam_id: string;
  downloaded_by: string;
  downloaded_by_name: string;
  downloaded_by_role: AppRole;
  pack_hash: string;
  evidence_hash: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  department: string | null;
  trust_score: number;
}

export interface CurrentUser {
  userId: string;
  email: string;
  profile: UserProfile | null;
  role: AppRole;
}

/** Watches the Supabase session and returns the signed-in user + role + profile. */
export function useCurrentUser() {
  const [session, setSession] = useState<{ userId: string; email: string } | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) setSession({ userId: s.user.id, email: s.user.email ?? "" });
      else setSession(null);
      qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setSession({
          userId: data.session.user.id,
          email: data.session.user.email ?? "",
        });
      }
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const query = useQuery({
    queryKey: ["current-user", session?.userId],
    enabled: !!session,
    queryFn: async (): Promise<CurrentUser> => {
      if (!session) throw new Error("no session");
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.userId),
      ]);
      const role: AppRole =
        (roles?.find((r) => r.role === "ciso")?.role as AppRole) ??
        (roles?.find((r) => r.role === "md")?.role as AppRole) ??
        "analyst";
      return {
        userId: session.userId,
        email: session.email,
        profile: profile ?? null,
        role,
      };
    },
  });

  return { data: query.data ?? null, isLoading: !ready || query.isLoading, session };
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: async (): Promise<Agent[]> => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("tier")
        .order("id");
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });
}

export function useDiscoveryStats() {
  return useQuery({
    queryKey: ["discovery_stats"],
    queryFn: async (): Promise<DiscoveryStat[]> => {
      const { data, error } = await supabase.from("discovery_stats").select("*");
      if (error) throw error;
      return (data ?? []) as DiscoveryStat[];
    },
  });
}

export function useGuardrailEvents() {
  return useQuery({
    queryKey: ["guardrail_events"],
    queryFn: async (): Promise<GuardrailEvent[]> => {
      const { data, error } = await supabase
        .from("guardrail_events")
        .select("*")
        .order("ts", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuardrailEvent[];
    },
  });
}

export function useOverrides() {
  return useQuery({
    queryKey: ["override_events"],
    queryFn: async (): Promise<OverrideEvent[]> => {
      const { data, error } = await supabase
        .from("override_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OverrideEvent[];
    },
  });
}

export function useVault(limit = 20) {
  return useQuery({
    queryKey: ["audit_vault", limit],
    queryFn: async (): Promise<VaultEntry[]> => {
      const { data, error } = await supabase
        .from("audit_vault")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as VaultEntry[];
    },
  });
}

export function useMockExams(limit = 10) {
  return useQuery({
    queryKey: ["mock_exams", limit],
    queryFn: async (): Promise<MockExam[]> => {
      const { data, error } = await supabase
        .from("mock_exams")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as MockExam[];
    },
  });
}

export function useExamDownloads() {
  return useQuery({
    queryKey: ["mock_exam_downloads"],
    queryFn: async (): Promise<ExamDownload[]> => {
      const { data, error } = await supabase
        .from("mock_exam_downloads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExamDownload[];
    },
  });
}

export interface OutcomeKpi {
  id: string;
  outcome_key: string;
  kpi_key: string;
  value: number;
  unit: string;
  window_label: string;
  measured_at: string;
}

/** Returns the latest KPI row per `kpi_key`, plus a 30-day history for sparklines. */
export function useOutcomeKpis() {
  return useQuery({
    queryKey: ["outcome_kpis"],
    queryFn: async (): Promise<OutcomeKpi[]> => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("outcome_kpis")
        .select("*")
        .gte("measured_at", since)
        .order("measured_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as OutcomeKpi[];
    },
  });
}



import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_EMAIL, DEMO_PASSWORD, ensureDemoUser } from "@/lib/demo.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import type { AppRole } from "@/lib/mock-data";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Cognita FinGuard" },
      { name: "description", content: "Sign in or provision a role for the Cognita FinGuard governance console." },
    ],
  }),
  // If already signed in, bounce to /
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("Global Markets");
  const [role, setRole] = useState<AppRole>("analyst");

  const signInAsDemo = async () => {
    setDemoBusy(true);
    const toastId = toast.loading("Provisioning demo CISO…");
    try {
      const { email: demoEmail, password: demoPassword } = await ensureDemoUser();
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });
      if (error) throw error;
      toast.success("Signed in as Demo CISO", {
        id: toastId,
        description: "Full access to audit vault, guardrails, and mock exam.",
      });
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Demo sign-in failed";
      toast.error(msg, { id: toastId });
    } finally {
      setDemoBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName || email.split("@")[0],
              department,
              role,
            },
          },
        });
        if (error) throw error;
        toast.success("Account provisioned", {
          description: `Signed in as ${role.toUpperCase()}. Confirmation email sent.`,
        });
        // Auto sign-in usually works when email confirmations are disabled
        const { data } = await supabase.auth.getSession();
        if (data.session) navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auth failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4"
      style={{ backgroundImage: "var(--gradient-mesh)" }}
    >
      <Toaster theme="dark" position="top-right" />

      {/* Ambient mesh SVG — three tier nodes with pulsing edges */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[
          { x: 180, y: 220, color: "var(--tier-1)" },
          { x: 620, y: 300, color: "var(--tier-2)" },
          { x: 400, y: 600, color: "var(--tier-3)" },
        ].map((n, i) => (
          <g key={i} style={{ color: n.color }}>
            <circle cx={n.x} cy={n.y} r="80" fill="url(#node-glow)" />
            <circle cx={n.x} cy={n.y} r="4" fill="currentColor" />
          </g>
        ))}
        <g stroke="color-mix(in oklab, var(--accent) 40%, transparent)" strokeWidth="1" fill="none">
          <line x1="180" y1="220" x2="620" y2="300">
            <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="4s" repeatCount="indefinite" />
          </line>
          <line x1="620" y1="300" x2="400" y2="600">
            <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="4s" begin="1.3s" repeatCount="indefinite" />
          </line>
          <line x1="400" y1="600" x2="180" y2="220">
            <animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="4s" begin="2.6s" repeatCount="indefinite" />
          </line>
        </g>
      </svg>

      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel-glass flex flex-col justify-between p-8 md:p-10">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark size={48} glow />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-semibold tracking-tight">Cognita</span>
                  <span className="mono rounded-sm border border-border bg-surface-elevated px-1 py-px text-[9px] tracking-widest text-foreground/80">
                    GRC
                  </span>
                </div>
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  FinGuard · v2.0
                </div>
              </div>
            </div>


            <h1 className="display mt-10 text-4xl leading-[1.02] md:text-5xl">
              <span className="text-foreground">Govern AI </span>
              <span className="gradient-text italic">you can prove</span>
              <span className="text-foreground"> — to a regulator, an auditor, a board.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              Every override, block, and telemetry alert bound by SHA-256 hash
              to its source record. Provisioning creates a profile with one of
              three roles — each with a distinct trust band and enforcement
              rights across the tiered mesh.
            </p>
          </div>

          <div className="mt-10 space-y-2 border-t border-border/60 pt-6 text-[11px] text-muted-foreground">
            {(["ciso", "md", "analyst"] as AppRole[]).map((r) => (
              <div key={r} className="mono flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      r === "ciso"
                        ? "var(--severity-critical)"
                        : r === "md"
                          ? "var(--severity-medium)"
                          : "var(--tier-3)",
                    boxShadow:
                      r === "ciso"
                        ? "0 0 8px var(--severity-critical)"
                        : r === "md"
                          ? "0 0 8px var(--severity-medium)"
                          : "0 0 8px var(--tier-3)",
                  }}
                />
                <span className="w-16 uppercase">{r === "md" ? "MD" : r}</span>
                <span>
                  {r === "ciso"
                    ? "Run mock exams · manage agents · full vault"
                    : r === "md"
                      ? "Sign business-justification overrides"
                      : "Read-only across mesh"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Demo mode — instant CISO access, no signup required. */}
          <div
            className="panel space-y-3 p-5"
            style={{
              borderColor: "color-mix(in oklab, var(--accent) 45%, var(--border))",
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--accent) 8%, transparent), transparent 60%)",
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles
                className="h-4 w-4"
                style={{ color: "var(--accent)" }}
                aria-hidden="true"
              />
              <span
                className="mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--accent)" }}
              >
                Public demo · no signup
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                Continue as Demo CISO
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Full access to Audit Vault, Guardrail Events, and the Mock SEC
                Exam — signed into a shared, sandboxed CISO account.
              </p>
            </div>
            <div className="mono grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-sm border border-border bg-muted/40 p-2 text-[10px]">
              <span className="text-muted-foreground">EMAIL</span>
              <span className="text-foreground">{DEMO_EMAIL}</span>
              <span className="text-muted-foreground">PASSWORD</span>
              <span className="text-foreground">{DEMO_PASSWORD}</span>
            </div>
            <Button
              type="button"
              onClick={signInAsDemo}
              disabled={demoBusy}
              className="mono w-full uppercase tracking-widest"
            >
              {demoBusy ? "Signing in…" : "Continue as Demo CISO →"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Or use your account
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

        <form onSubmit={submit} className="panel space-y-4 p-6">
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={
                  "mono flex-1 rounded-sm px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors " +
                  (mode === m
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "signin" ? "Sign in" : "Provision access"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="A. Hollander"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ciso">CISO</SelectItem>
                      <SelectItem value="md">Managing Director</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">Corporate email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={busy} className="mono w-full uppercase tracking-widest">
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Provision & sign in"}
          </Button>

          {mode === "signup" && (
            <p className="mono text-[10px] leading-relaxed text-muted-foreground">
              Demo environment: your chosen role is stored in `user_roles`. RLS
              enforces Analyst (read-only), MD (override rights), and CISO (full
              control including Mock SEC Exam) at the database layer.
            </p>
          )}
        </form>
        </div>
      </div>
    </div>
  );
}

// Unused, but required so this file type-checks in isolation.
Textarea;

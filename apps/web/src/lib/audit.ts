import { supabase } from "@/integrations/supabase/client";
import type { CurrentUser, GuardrailEvent } from "@/lib/queries";

/** SHA-256 hex digest — used to hash override + exam evidence. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Short hash form displayed in the vault: `abcd…1234`. */
export function shortHash(hash: string) {
  if (hash.length < 10) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}

/**
 * Actor label used in chain-of-custody writes and evidence packs.
 *
 * The shared demo tenant (`demo@cognita.io`) is signed into by every visitor,
 * so writing a real profile display name into the vault would leak PII across
 * sessions. For that account we always record the role label instead. Private,
 * non-shared tenants continue to record their real user names.
 */
const SHARED_DEMO_EMAIL = "demo@cognita.io";
const DEMO_ROLE_LABELS: Record<string, string> = {
  ciso: "Demo CISO",
  md: "Demo MD",
  analyst: "Demo Analyst",
};
export function actorLabel(user: CurrentUser): string {
  if (user.email?.toLowerCase() === SHARED_DEMO_EMAIL) {
    return DEMO_ROLE_LABELS[user.role] ?? "Demo CISO";
  }
  return user.profile?.display_name ?? user.email;
}

/**
 * Records a business-justification override and its immutable vault entry.
 *
 * Two writes under RLS:
 *  - override_events: only MD or CISO for their own user_id
 *  - audit_vault:     append-only, actor must equal auth.uid()
 */
export async function recordOverride(opts: {
  event: GuardrailEvent;
  justification: string;
  user: CurrentUser;
}): Promise<{ hash: string }> {
  const { event, justification, user } = opts;
  const nowIso = new Date().toISOString();
  const hash = await sha256Hex(
    `${event.id}|${user.userId}|${user.role}|${justification}|${nowIso}`,
  );
  const displayName = actorLabel(user);

  const { error: ovErr } = await supabase.from("override_events").insert({
    event_id: event.id,
    user_id: user.userId,
    user_display_name: displayName,
    user_role: user.role,
    justification,
    evidence_hash: hash,
  });
  if (ovErr) throw ovErr;

  const { error: vErr } = await supabase.from("audit_vault").insert({
    hash,
    kind: "Business justification override",
    ref: `${event.id} → ${event.reg_ref}`,
    actor_id: user.userId,
    actor_display_name: displayName,
    payload: {
      event_id: event.id,
      agent: event.agent_name,
      tier: event.tier,
      rule: event.rule,
      justification,
      signed_at: nowIso,
    },
  });
  if (vErr) throw vErr;

  return { hash };
}

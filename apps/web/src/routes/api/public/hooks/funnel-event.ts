import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Fire-and-forget funnel click logger. Public route (no auth) — the
 * `funnel_events` table has an RLS INSERT policy that caps
 * `surface`/`kind` length, so a bad-actor flood is bounded to short
 * strings. No PII collected.
 */
export const Route = createFileRoute("/api/public/hooks/funnel-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { surface?: unknown; kind?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(
            JSON.stringify({ error: "invalid json" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const surface =
          typeof body.surface === "string" ? body.surface.slice(0, 64) : "";
        const kind =
          typeof body.kind === "string" ? body.kind.slice(0, 32) : "pricing_click";
        if (!surface) {
          return new Response(
            JSON.stringify({ error: "surface required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const url = process.env.SUPABASE_URL;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !anon) {
          return new Response(
            JSON.stringify({ error: "supabase env missing" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const supabase = createClient(url, anon, {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        const { error } = await supabase
          .from("funnel_events")
          .insert({ surface, kind });
        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

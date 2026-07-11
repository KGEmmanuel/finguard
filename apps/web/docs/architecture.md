# Architecture

The rendered diagram lives in [`architecture.mmd`](./architecture.mmd).
This file is its prose companion — read them together.

## Current shape (single plane)

Finguard is a TanStack Start application served from a Cloudflare
Worker, backed by a single Lovable Cloud (Supabase) project. Every
route, every server function, and every database row share one plane;
the only isolation primitive is Postgres Row-Level Security, gated by
`auth.uid()` and `has_role()`.

The browser talks to Postgres through `supabase-js` with the
publishable key. TanStack Query owns the client cache. Route loaders
prefetch with `ensureQueryData`; components read with
`useSuspenseQuery`. Server functions (`createServerFn`) handle the
handful of operations that need the service role — currently limited
to the demo bootstrap.

Two public HTTP endpoints run without auth:
`/api/public/hooks/compute-kpis` (called nightly by `pg_cron`) and
`/api/public/hooks/funnel-event` (called by the browser beacon on
pricing clicks). Both validate the caller before writing.

The evidence pack is built entirely in the browser:
[`src/lib/evidence-pack.ts`](../src/lib/evidence-pack.ts) reads the
audit tables, builds a PDF and CSVs, computes a `pack_hash` over the
sorted manifest, and returns a ZIP. The hash is stored in
`mock_exams.pack_hash`; the pack itself is not persisted server-side.

## Target shape (two plane)

The diagram's dashed nodes — the Cognita control plane and the
`finguard verify` CLI — do not exist in this repository yet. They live
in the closed-source platform at `app.cognitagrc.io`, or (in the CLI's
case) are on the roadmap. [`harness.md`](./harness.md) describes the
target; each unbuilt component is marked `Status: not implemented`.

The intended split:

- **Data plane** — Finguard, running inside the client's VNet (today:
  a Lovable-hosted Worker; tomorrow: a Foundry Agent Service extension
  inside the client tenant). Owns the audit vault, the guardrail feed,
  and the pack generator. Never sends raw event bodies out.
- **Control plane** — Cognita GRC, hosted separately. Publishes signed
  policy packs, receives redacted telemetry summaries, aggregates
  benchmarks across tenants, and issues the Ed25519 keys that regulators
  verify against.

A pack crosses the boundary as bytes only: PDF + CSVs + MANIFEST.json +
`.sig`. The control plane never reads the client's raw audit vault.

## Migrations

`supabase/migrations/*.sql` are the source of truth for the schema.
Grants are declared in the same migration as the table. Every migration
should carry a `-- description:` comment at the top so
`git log supabase/migrations` reads as a schema changelog.

## Deployment

The repository builds and deploys as a Cloudflare Worker via TanStack
Start's Vite plugin. There is no Node host — see the runtime notes in
[`harness.md`](./harness.md) before adding native or filesystem-heavy
dependencies.

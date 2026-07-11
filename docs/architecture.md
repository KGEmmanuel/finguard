# Architecture

## Single plane (this repo)

```
Browser (apps/web, Vite/React)          Supabase project (yours)
├─ agent inventory · guardrails   ──►   Postgres + RLS (isolation primitive)
├─ Mock SEC Exam                        pg_cron → outcome_kpis (nightly)
└─ pack builder (client-side)     ──►   audit_vault (two-phase custody, Spec §5)
        │
        ▼
finguard-evidence-<snapshot>.zip  — user-held; never touches Cognita
        │
        ▼
finguard-verify (packages/verify) — offline; recomputes everything
```

Design properties: packs are built in the browser and held by the user — "data never leaves the tenant" is an architecture property here, not a policy promise. The builder (`apps/web/src/pack-builder.ts`) and the verifier import the same `@finguard/pack-spec` module, so they cannot drift; CI proves it on every PR (`pnpm golden:check`).

## Two plane (commercial)

The client-data plane (telemetry, guardrail engine, vault, pack builder) runs inside the customer VNet. The Cognita control plane publishes signed policy packs and signs pack hashes — **only the 64-char `pack_hash` crosses the boundary, never data files** (Spec §7). Signing endpoint: `POST app.cognitagrc.io/api/v1/finguard/sign`; trust root: `GET /api/v1/finguard/keys`.

## Monorepo layout

```
apps/web/              console (Lovable-synced; see apps/web/README.md)
packages/pack-spec/    spec reference implementation — zero deps, isomorphic
packages/verify/       finguard-verify CLI (npm)
fixtures/golden-pack/  determinism fixture (input → byte-identical output)
scripts/               golden build/check, keygen, sign-pack (ops)
docs/spec/             Evidence Pack Spec v1
```

Deploy: Cloudflare Pages builds `apps/web` from `main`; custom domain `finguard.cognitagrc.io`. Design docs with full rationale live in the Cognita program folder (audits, funnel design, 6-phase implementation plan).

# FinGuard

**Prove AI governance to a regulator. In under four hours.**

Open-source, offline-verifiable evidence packs for AI systems in regulated finance — built for SEC, OCC, FCA and MAS examinations.

[![Verification gate](https://img.shields.io/badge/verification-pnpm%20verify%20on%20every%20push-2ea44f)](.githooks/pre-push)
[![Determinism](https://img.shields.io/badge/evidence%20packs-deterministic-2ea44f)](docs/spec/evidence-pack-v1.md)
[![npm](https://img.shields.io/npm/v/finguard-verify)](https://www.npmjs.com/package/finguard-verify)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<!-- TODO: 20-second GIF — run mock exam → download pack → finguard-verify → green checks -->

## Try it in 60 seconds

```bash
# 1. Run the hosted demo (no signup — shared Demo CISO account)
open https://finguard.cognitagrc.io

# 2. Run the Mock SEC Exam, download the evidence pack

# 3. Verify it offline — no vendor callback
npx finguard-verify finguard-evidence-*.zip
```

Or verify the golden pack checked into this repo right now:

```bash
git clone https://github.com/KGEmmanuel/finguard && cd finguard
pnpm install && pnpm build
node packages/verify/dist/cli.js fixtures/golden-pack/output/finguard-evidence-golden.zip
```

Every file in the pack is SHA-256 bound to its manifest. Same inputs + same pack version = byte-identical manifest and zip — enforced by [a verification gate](.githooks/pre-push) that rebuilds the pack from fixtures and diffs the bytes on **every push** (`pnpm verify`), not a slide. Anyone can run the gate themselves in one command — which is more than a green badge proves.

## Why

Examiners no longer stop at the balance sheet. They ask for the model card, the guardrail policy, the override log, and the chain of custody — on a Tuesday, for last Thursday. The gap at most firms isn't policy; it's **producibility**. FinGuard makes the evidence pack a first-class product: deterministic, hash-anchored, and verifiable offline by the examiner.

## What's in the box

- **[Evidence Pack Spec v1](docs/spec/evidence-pack-v1.md)** — an open format anyone (including competitors) can implement: canonical content-only pack hash, attested/informational scopes, two-phase chain of custody, Ed25519 signature envelope
- **[`@finguard/pack-spec`](packages/pack-spec)** — zero-dependency, isomorphic (browser + Node) reference implementation: hashing, MANIFEST builder, verify core
- **[`finguard-verify`](packages/verify)** — the CLI: recomputes every hash, recomputes the pack hash, verifies signatures via `--key` or `--registry`. No telemetry, no network
- **The console** (`apps/web`) — agent inventory, guardrail event feed, Mock SEC Exam → watermarked pack, KPI board; every PR maps to one outcome KPI
- **Golden fixtures** (`fixtures/golden-pack`) — a complete synthetic finance estate: 9 agents across desks, 6 guardrail events with statute mappings, one hash-bound signed override, typed vault custody

## What doesn't work yet

We publish our gaps: **[docs/audit.md](docs/audit.md)**. A buyer evaluating compliance vendors should trust the ones who name what doesn't work.

## Develop

```bash
git clone https://github.com/KGEmmanuel/finguard && cd finguard
pnpm install
pnpm verify         # the whole gate: typecheck + build + 18 tests + determinism + CLI round-trip
```

`pnpm install` wires `pnpm verify` as a git pre-push hook, so every push — maintainer or contributor — passes the same gate. (The GitHub Actions workflow is kept in-repo but dispatch-only for now.)

The hosted console self-hosts against your own Supabase project (Postgres + RLS, pg_cron KPI compute, client-side pack building — your data never leaves your project). See [apps/web/README.md](apps/web/README.md).

## Open core

The **format and the proof are open; the enforcement harness and the trust network are paid** — enforced by cryptography, not license text: anyone can build and verify packs; only the [published key registry](https://app.cognitagrc.io/api/v1/finguard/keys) signs them. Ed25519-signed packs, signed policy packs (ISO 42001 · EU AI Act · NIST AI RMF · SOC 2), inline enforce with break-glass, two-plane VNet deployment, and cross-tenant benchmarks are part of [Cognita FinGuard Enterprise](https://app.cognitagrc.io/pricing?utm_source=github&utm_medium=readme). Nothing in this repo will ever be relicensed or removed.

## Contributing

Rule packs and regulator mappings are great first contributions — see [good first issues](https://github.com/KGEmmanuel/finguard/labels/good%20first%20issue) and [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

MIT © Cognita. "FinGuard" and "Cognita" are trademarks — see [TRADEMARKS.md](TRADEMARKS.md).

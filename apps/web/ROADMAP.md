# Roadmap

The roadmap is organised around the outcome tree in
[`docs/outcomes.md`](./docs/outcomes.md). Each item ties to a
sub-outcome so progress is measurable, not aspirational.

Status legend: **alpha** (skeleton in tree) · **beta** (works, rough
edges) · **ga** (production-ready) · **planned** (not started).

## Near-term (next release)

| Item | Outcome | Status |
|------|---------|--------|
| Ed25519 detached signature on evidence packs | C | alpha |
| `scripts/verify-pack.mjs` — offline verify CLI skeleton | C | alpha |
| `scripts/seed-kpis.ts` for a populated first-run KPI board | — | alpha |
| Deterministic `pack_hash` regression test | C | planned |
| `GOVERNANCE.md`, `CHANGELOG.md`, `docs/` index | — | ga |

## Mid-term

| Item | Outcome | Status |
|------|---------|--------|
| Two-plane deployment reference (client VNet ↔ Cognita control plane) | G | planned |
| Signed policy pack format + loader | E | planned |
| `finguard verify` published to npm | C | planned |
| Inline enforce mode (Tier-1) SDK | B | planned |
| Foundry Agent Service extension | G | planned |

## Long-term

| Item | Outcome | Status |
|------|---------|--------|
| Curated policy packs (SOC 2, ISO 42001, EU AI Act, NIST AI RMF) | E | commercial only |
| SSO / SAML, multi-tenant org switcher | — | commercial only |
| Regulator SDK distribution program | C | planned |

Items marked *commercial only* live in the closed-source Cognita GRC
platform and will not land in this repository. See
[`docs/funnel.md`](./docs/funnel.md).

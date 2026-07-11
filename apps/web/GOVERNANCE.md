# Governance

Finguard is a single-vendor open-source project stewarded by
**Cognita GRC**. This document explains, in plain terms, how decisions
are made and where the boundary sits between the OSS project and the
paid Cognita GRC platform.

## Roles

- **Lead maintainer** — see [`MAINTAINERS.md`](./MAINTAINERS.md). Owns
  triage, release cuts, and final say on scope disputes.
- **Contributors** — anyone who has an accepted PR. Contributors are
  credited in release notes.
- **Cognita GRC (sponsor)** — funds development; sets the commercial
  roadmap that Finguard is the free tier of.

## Decision-making

1. **Bug fixes and small features** — a maintainer's review is enough.
2. **New surfaces, schema changes, or anything touching `_authenticated/`
   or `supabase/migrations/`** — opened as an RFC issue first. A
   maintainer summarises the discussion and merges when consensus is
   clear; otherwise the lead maintainer decides.
3. **Roadmap changes** — proposed as PRs to [`ROADMAP.md`](./ROADMAP.md).

## Relationship to Cognita GRC

- Finguard's OSS scope is fixed: Dashboard, Inventory, Agents,
  Guardrails, Audit, demo mode, the Lovable Cloud schema, and the
  outcome KPI board.
- Enterprise features (SSO, signed evidence packs, curated policy
  packs, multi-tenant control plane, Foundry runtime) live in the
  closed-source Cognita GRC platform and will not be accepted as PRs
  here. See [`CONTRIBUTING.md`](./CONTRIBUTING.md).
- When Cognita ships a change that requires a schema or contract change
  in Finguard, that change lands here first, as a normal PR, before the
  commercial release.

## Conflict of interest

Maintainers who are Cognita employees disclose that in their PR
descriptions when reviewing changes that affect the OSS/commercial
boundary.

## Changing this document

By PR, reviewed by the lead maintainer, with a minimum 5-business-day
comment window for community contributors to weigh in.

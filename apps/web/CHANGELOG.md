# Changelog

All notable changes to Finguard are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `docs/audit.md` — first-pass project audit with tiered gap analysis.
- `docs/architecture.mmd` — Mermaid architecture diagram of the current
  single-plane deployment and the aspirational two-plane target.
- `docs/architecture.md` — prose companion to the diagram.
- `docs/README.md` — index for the `docs/` folder.
- `ROADMAP.md`, `GOVERNANCE.md`, `ADOPTERS.md`.
- `docs/keys/finguard.pub` placeholder for the evidence-pack signing key.
- `scripts/verify-pack.mjs` — offline evidence-pack verifier (skeleton).
- `scripts/seed-kpis.ts` — populates `outcome_kpis` with a fortnight of
  synthetic points for a fresh clone.
- `.github/CODEOWNERS`, `.github/workflows/release.yml`,
  `.github/workflows/dependency-review.yml`.

### Notes
- Two-plane harness, Ed25519 pack signing, inline enforce mode, and the
  Foundry-hosted client runtime described in `docs/harness.md` remain
  **not implemented** — tracked in `ROADMAP.md`.

## [0.1.0] — 2026-07-06

Initial public release. Dashboard, Inventory, Agents, Guardrails, Audit
(with Mock SEC Exam evidence pack), Outcome KPI board, demo mode,
funnel beacon to `app.cognitagrc.io`.

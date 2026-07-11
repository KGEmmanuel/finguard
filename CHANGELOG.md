# Changelog

## Unreleased

### Added
- `@finguard/pack-spec` 1.0.0 — canonical hashing, MANIFEST types, Ed25519 verification, isomorphic verify core (Evidence Pack Spec v1.0). Zero dependencies.
- `finguard-verify` 1.0.0 — offline CLI verifier: per-file SHA-256, canonical pack_hash recomputation, Ed25519 signature verification via `--key` or `--registry`, `--json` output. No telemetry.
- Golden-pack determinism gate in CI: fixture inputs must rebuild to byte-identical MANIFEST and zip, in a non-UTC timezone, and verify with the CLI built from the same commit.
- Ops tooling: `scripts/keygen.ts`, `scripts/sign-pack.ts` (design-partner pilots; production signing lives in the Cognita control plane).
- Browser pack-builder reference implementation (`apps/web/src/pack-builder.ts`) with two-phase vault commit.
- Evidence Pack Spec v1.0 (`docs/spec/evidence-pack-v1.md`).

### Changed (vs. FinGuard v2.0 demo packs)
- **BREAKING (pack format):** `pack_hash` preimage no longer includes timestamps or `provisional` flags — same inputs now always produce the same hash.
- MANIFEST: `produced_by` (bare uuid) → `producer` object; added `pack_spec_version`, `generator`, `snapshot_id`, `signature`, `signature_status`, `key_id`, `vault_entry_id`; files split into `attested_files` / `informational_files`, sorted by name.
- Audit vault: packs no longer contain placeholder `(pending insert)` custody rows — generation is committed before download (two-phase).
- Demo dataset: PII scrubbed; includes one signed override (OVR-1042) demonstrating hash-bound business justification.

# Evidence Pack Specification — v1.0

Status: Draft. This document specifies the FinGuard evidence-pack format so that **any party — including competitors — can implement a conforming builder or verifier.** The format's value is its neutrality.

## 1. Pack layout

A pack is a ZIP archive containing exactly:

```
MANIFEST.json        required   the attestation root
VERIFY.md            required   offline verification instructions
SPEC.md              required   copy of (or pinned link to) this spec version
00_cover.pdf         optional   human-readable attestation cover
01_summary.json      required
02_agents.csv        required
03_guardrail_events.csv  required
04_overrides.csv     required   (may contain zero data rows; header + trailing newline required)
05_audit_vault.csv   required
06_defensibility.json required
```

## 2. MANIFEST.json

```jsonc
{
  "pack_spec_version": "1.0",
  "generator": { "name": "finguard", "version": "2.1.0" },
  "snapshot_id": "uuid",                  // identifies the input data snapshot
  "producer": {                            // identical shape wherever a producer appears
    "user_id": "uuid",
    "display_name": "string",
    "role": "ciso | md | analyst"
  },
  "generated_at": "RFC3339",              // informational — OUTSIDE the hash preimage
  "requested_at": "RFC3339",              // informational — OUTSIDE the hash preimage
  "attested_files": [                      // sorted ascending by name
    { "name": "01_summary.json", "sha256": "hex", "bytes": 450 }
  ],
  "informational_files": [                 // listed + hashed, but outside pack_hash
    { "name": "00_cover.pdf", "sha256": "hex", "bytes": 283958 }
  ],
  "pack_hash": "hex",
  "signature": null,                       // Ed25519 over pack_hash, or null
  "signature_status": "unsigned-demo | signed",
  "key_id": null,                          // identifies signer key in a published registry
  "vault_entry_id": "uuid"                 // committed BEFORE pack download (§5)
}
```

## 3. Canonical pack hash (determinism)

```
preimage = canonical_json({
  pack_spec_version,
  snapshot_id,
  producer,
  attested_files            // sorted by name; each {name, sha256, bytes}
})
pack_hash = sha256(preimage)
```

`canonical_json` = JSON with lexicographically sorted keys, no insignificant whitespace, UTF-8. **Timestamps, generator version, and informational files are excluded.** Consequence: same snapshot + same spec version + same producer ⇒ identical `pack_hash`, regardless of when or where the pack is built. Conforming implementations MUST pass a byte-identity test on a shared fixture.

## 4. Cover PDF

The cover is attested (`attested_files`) only if the implementation renders it deterministically (pinned renderer, embedded fonts, no wall-clock content beyond values also present in attested JSON). Otherwise it MUST be listed under `informational_files`. Verifiers report the two scopes distinctly.

## 5. Chain of custody (two-phase commit)

1. Builder computes `pack_hash` from attested files.
2. Builder commits an `audit_vault` entry `{kind: "pack_generated", hash: pack_hash, actor, created_at}` and obtains its id.
3. `vault_entry_id` is written into MANIFEST (outside the hash preimage), the ZIP is assembled, and only then offered for download.
4. Each download appends a `pack_downloaded` vault entry referencing `vault_entry_id`.

A pack MUST NOT contain placeholder vault ids. The vault CSV inside the pack contains entries committed **at or before** step 2.

## 6. Verification algorithm

A conforming verifier, fully offline:

1. Parse MANIFEST; check `pack_spec_version` supported.
2. For every listed file: recompute sha256 and byte count; compare. Report per-file.
3. Recompute `pack_hash` from attested entries; compare.
4. If `signature` present: verify Ed25519 over `pack_hash` against the key identified by `key_id` (from a user-supplied pubkey file or a pinned key-registry snapshot). Report `signed-verified | signed-invalid | unsigned-demo`.
5. Exit 0 only if all hash checks pass; signature absence is reported but is not a hash failure.

## 7. Signing (commercial extension, format is open)

`signature = Ed25519(sk, ascii(pack_hash))`. Signers publish public keys in a key registry (JSON: `{key_id, alg, public_key, valid_from, revoked_at?}`). The registry format is part of this spec; who operates a trusted registry is not.

## 8. CSV rules

RFC 4180, UTF-8, header row required, trailing newline required, RFC3339 timestamps in UTC. Column dictionaries for each file live in `SPEC.md` appendices (agents, guardrail_events, overrides, audit_vault).

## Changelog

- **1.0** — initial: canonical hash preimage, attested/informational split, two-phase vault commit, signature fields.

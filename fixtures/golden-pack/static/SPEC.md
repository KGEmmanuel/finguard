# Evidence Pack Spec — pinned reference

This pack conforms to **Evidence Pack Spec v1.0**.

Canonical specification:
https://github.com/KGEmmanuel/finguard/blob/main/docs/spec/evidence-pack-v1.md

Summary of guarantees:

1. Every enclosed file's SHA-256 and byte count are listed in `MANIFEST.json`.
2. `pack_hash` is computed over a canonical preimage of `{pack_spec_version, snapshot_id, producer, attested_files}` — timestamps are excluded, so identical inputs always produce an identical hash.
3. Chain of custody: the pack's generation was committed to the audit vault (see `vault_entry_id` in MANIFEST) before the pack was offered for download.
4. `signature`, when present, is Ed25519 over `ascii(pack_hash)`; `key_id` identifies the signing key in a published registry.

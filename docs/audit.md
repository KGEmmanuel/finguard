# Honest Gap Register

We publish what doesn't work yet. A buyer evaluating compliance vendors should trust the ones who name their gaps. Each gap links to a tracking issue; closed gaps move to the changelog with the version that closed them.

| # | Gap | Impact | Status |
|---|-----|--------|--------|
| 1 | `pack_hash` is a checksum, not a signature. Anyone can regenerate a manifest over altered files. Signature fields (`signature`, `signature_status`, `key_id`) exist in the schema but are `null`/`unsigned-demo` in OSS packs. | A pack proves internal consistency, not origin. Ed25519 signing is the commercial harness. | Open · by design (open-core boundary) |
| 2 | Demo defensibility score is a snapshot, not a live computation from your estate — the hosted demo uses seeded synthetic data. | Scores in the demo illustrate the mechanism, not your posture. | Open · permanent for demo tenant |
| 3 | Single-plane only: telemetry, vault, and pack builder share one Postgres with RLS as the isolation primitive. | Fine for evaluation and small estates; regulated production wants two-plane (vault in your VNet). | Open · two-plane is the enterprise deploy |
| 4 | Cover PDF determinism depends on the renderer version. If bytes drift across environments, the cover is listed under `informational_files` (spec §4) rather than the attested scope. | Attestation text integrity relies on the manifest listing, not the pack hash, in that mode. | Open · tracking |
| 5 | Guardrail engine evaluates events post-hoc in the demo; inline enforcement (blocking before execution) with break-glass is not in the OSS runtime. | OSS = detect and prove; Enterprise = prevent. | Open · by design |

**Rules of this register:** no gap is removed without a linked closing PR; gaps that are open-core boundaries are labeled "by design" and will not silently close; anything a security report reveals gets added here after coordinated disclosure.

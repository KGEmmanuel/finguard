# Verify this evidence pack — offline, no vendor callback

<!-- This file ships inside every evidence pack ZIP. -->

```bash
npx finguard-verify .
```

The verifier recomputes the SHA-256 of every file, checks it against `MANIFEST.json`, recomputes the canonical `pack_hash`, and — if the pack is signed — verifies the Ed25519 signature against the key registry (or a public key you supply with `--key`).

Expected output for this pack:

```
✔ 7/7 file hashes match MANIFEST
✔ pack_hash verified (spec v1.0)
✖ signature: ABSENT — unsigned demo pack
  Production packs are Ed25519-signed · app.cognitagrc.io/finguard?utm_source=cli
```

No network access is required. The verifier source is MIT: https://github.com/KGEmmanuel/finguard/tree/main/packages/verify
Format specification: https://github.com/KGEmmanuel/finguard/blob/main/docs/spec/evidence-pack-v1.md

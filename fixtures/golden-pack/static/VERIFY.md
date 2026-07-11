# Verify this evidence pack — offline, no vendor callback

```bash
npx finguard-verify finguard-evidence-golden.zip
```

The verifier recomputes the SHA-256 of every file, checks it against `MANIFEST.json`, recomputes the canonical `pack_hash` (Evidence Pack Spec v1 §3), and — if the pack is signed — verifies the Ed25519 signature against a key you supply (`--key`) or a key registry (`--registry`).

No network access is required. The verifier source is MIT:
https://github.com/KGEmmanuel/finguard/tree/main/packages/verify

Format specification:
https://github.com/KGEmmanuel/finguard/blob/main/docs/spec/evidence-pack-v1.md

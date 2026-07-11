/**
 * Static markdown shipped inside every evidence pack (Spec v1 §1).
 * VERIFY.md and SPEC.md are required pack members; UPGRADE.md is the
 * funnel carrier that travels into the buyer's compliance folder.
 */

export const VERIFY_MD = `# Verify this evidence pack — offline, no vendor callback

\`\`\`bash
npx finguard-verify <this-file>.zip
\`\`\`

The verifier recomputes the SHA-256 of every file, checks it against
\`MANIFEST.json\`, recomputes the canonical \`pack_hash\` (Evidence Pack Spec
v1 §3), and — if the pack is signed — verifies the Ed25519 signature against
a key you supply (\`--key\`) or a key registry (\`--registry\`).

No network access is required. The verifier source is MIT:
https://github.com/KGEmmanuel/finguard/tree/main/packages/verify

Format specification:
https://github.com/KGEmmanuel/finguard/blob/main/docs/spec/evidence-pack-v1.md
`;

export const SPEC_MD = `# Evidence Pack Spec — pinned reference

This pack conforms to **Evidence Pack Spec v1.0**.

Canonical specification:
https://github.com/KGEmmanuel/finguard/blob/main/docs/spec/evidence-pack-v1.md

Summary of guarantees:

1. Every enclosed file's SHA-256 and byte count are listed in \`MANIFEST.json\`.
2. \`pack_hash\` is computed over a canonical preimage of
   \`{pack_spec_version, snapshot_id, producer, attested_files}\` — timestamps
   are excluded, so identical inputs always produce an identical hash.
3. Chain of custody: the pack's generation was committed to the audit vault
   (see \`vault_entry_id\` in MANIFEST) before the pack was offered for download.
4. \`signature\`, when present, is Ed25519 over \`ascii(pack_hash)\`; \`key_id\`
   identifies the signing key in a published registry.
`;

export const UPGRADE_MD = `# This is an unsigned demo pack

Everything in this pack is hash-anchored and offline-verifiable — but it is
**not signed**. Anyone can rebuild an internally-consistent pack; a signature
proves origin.

Production packs from Cognita FinGuard Enterprise are:

- **Ed25519-signed** against HSM-held keys, verifiable by any examiner with
  \`finguard-verify --registry\`
- Built from **your live agent estate** inside your tenant (two-plane: raw
  events never leave your VNet)
- Backed by **signed policy packs** (ISO 42001 · EU AI Act · NIST AI RMF ·
  SOC 2) and inline enforcement with break-glass

Book a 30-minute enterprise walkthrough — your policy pack, your tenant,
your exam calendar:
https://app.cognitagrc.io/pricing?utm_source=finguard&utm_medium=pack&utm_content=upgrade-md
`;

/**
 * Browser-side evidence pack builder — Spec v1 reference implementation.
 * Drop-in replacement for the console's evidence-pack code (see ../README.md).
 *
 * Key properties:
 *  - pack_hash is canonical + content-only (deterministic; Spec §3)
 *  - two-phase custody: the vault entry is committed BEFORE download (Spec §5)
 *  - cover PDF ships as an informational file unless rendered deterministically (Spec §4)
 */
import { zipSync } from "fflate";
import {
  buildManifest,
  computePackHash,
  fileEntries,
  serializeManifest,
  utf8,
  PACK_SPEC_VERSION,
  type Producer,
} from "@finguard/pack-spec";

/** Minimal client the console must provide (Supabase RPC or REST). */
export interface VaultClient {
  /** Insert {kind:"pack_generated", hash, actor} into audit_vault; return the committed row id. */
  commitPackGenerated(packHash: string, actor: Producer): Promise<string>;
  /** Append a pack_downloaded entry referencing the generation entry. */
  recordDownload(vaultEntryId: string, actor: Producer): Promise<void>;
}

export interface PackInputs {
  snapshot_id: string;
  producer: Producer;
  requested_at: string;
  /** 01_summary.json … 06_defensibility.json, already serialized (CSV/JSON strings). */
  attested: Record<string, string>;
  /** e.g. deterministic-or-not cover PDF bytes. */
  informational?: Record<string, Uint8Array>;
  /** Static text shipped in every pack. */
  verifyMd: string;
  specMd: string;
  upgradeMd?: string;
  generatorVersion: string;
}

export async function buildEvidencePack(
  inputs: PackInputs,
  vault: VaultClient,
): Promise<{ blob: Blob; packHash: string; vaultEntryId: string; filename: string }> {
  const attestedFiles = new Map<string, Uint8Array>(
    Object.entries(inputs.attested).map(([name, text]) => [name, utf8(text)]),
  );
  const informationalFiles = new Map<string, Uint8Array>(
    Object.entries(inputs.informational ?? {}),
  );

  // Phase 1: hash content, commit custody BEFORE anything is downloadable.
  const packHash = await computePackHash({
    pack_spec_version: PACK_SPEC_VERSION,
    snapshot_id: inputs.snapshot_id,
    producer: inputs.producer,
    attested_files: await fileEntries(attestedFiles),
  });
  const vaultEntryId = await vault.commitPackGenerated(packHash, inputs.producer);

  // Phase 2: build MANIFEST referencing the committed vault entry.
  const manifest = await buildManifest({
    generator: { name: "finguard", version: inputs.generatorVersion },
    snapshot_id: inputs.snapshot_id,
    producer: inputs.producer,
    generated_at: new Date().toISOString(), // informational only — outside the hash
    requested_at: inputs.requested_at,
    attestedFiles,
    informationalFiles,
    vault_entry_id: vaultEntryId,
  });
  if (manifest.pack_hash !== packHash) {
    throw new Error("pack_hash drift between phases — refusing to build");
  }

  const entries: Record<string, Uint8Array> = {
    "MANIFEST.json": utf8(serializeManifest(manifest)),
    "VERIFY.md": utf8(inputs.verifyMd),
    "SPEC.md": utf8(inputs.specMd),
  };
  if (inputs.upgradeMd) entries["UPGRADE.md"] = utf8(inputs.upgradeMd);
  for (const [name, bytes] of attestedFiles) entries[name] = bytes;
  for (const [name, bytes] of informationalFiles) entries[name] = bytes;

  const zipped = zipSync(entries, {
    // local-time components: identical DOS-date bytes in every timezone
    mtime: new Date(1980, 0, 1, 12, 0, 0),
    level: 6,
  });

  await vault.recordDownload(vaultEntryId, inputs.producer);

  const filename = `finguard-evidence-${inputs.snapshot_id.slice(0, 8)}.zip`;
  const buf = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(buf).set(zipped);
  return { blob: new Blob([buf], { type: "application/zip" }), packHash, vaultEntryId, filename };
}

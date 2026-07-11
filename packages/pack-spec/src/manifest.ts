import { canonicalJson, type Json } from "./canonical.js";
import { sha256Hex, utf8 } from "./hash.js";

export const PACK_SPEC_VERSION = "1.0";

export type Role = "ciso" | "md" | "analyst";

export interface Producer {
  user_id: string;
  display_name: string;
  role: Role;
}

export interface FileEntry {
  name: string;
  sha256: string;
  bytes: number;
}

export type SignatureStatus = "unsigned-demo" | "signed";

export interface Manifest {
  pack_spec_version: string;
  generator: { name: string; version: string };
  snapshot_id: string;
  producer: Producer;
  /** Informational — OUTSIDE the pack_hash preimage (Spec v1 §2). */
  generated_at: string;
  /** Informational — OUTSIDE the pack_hash preimage (Spec v1 §2). */
  requested_at: string;
  /** Sorted ascending by name (Spec v1 §2). */
  attested_files: FileEntry[];
  /** Listed + hashed, but outside the pack_hash preimage (Spec v1 §4). */
  informational_files: FileEntry[];
  pack_hash: string;
  /** Base64 Ed25519 signature over ascii(pack_hash), or null. */
  signature: string | null;
  signature_status: SignatureStatus;
  key_id: string | null;
  /** Committed to the audit vault BEFORE download (Spec v1 §5). */
  vault_entry_id: string | null;
}

/** Hash every file and return entries sorted ascending by name. */
export async function fileEntries(
  files: ReadonlyMap<string, Uint8Array>,
): Promise<FileEntry[]> {
  const entries = await Promise.all(
    [...files.entries()].map(async ([name, bytes]) => ({
      name,
      sha256: await sha256Hex(bytes),
      bytes: bytes.byteLength,
    })),
  );
  return entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * The canonical pack_hash preimage (Spec v1 §3).
 * Timestamps, generator version, informational files, signature fields and
 * vault_entry_id are deliberately EXCLUDED — same snapshot + same spec version
 * + same producer must yield an identical pack_hash regardless of when or
 * where the pack is built.
 */
export function packHashPreimage(input: {
  pack_spec_version: string;
  snapshot_id: string;
  producer: Producer;
  attested_files: FileEntry[];
}): string {
  const sorted = [...input.attested_files].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  return canonicalJson({
    pack_spec_version: input.pack_spec_version,
    snapshot_id: input.snapshot_id,
    producer: { ...input.producer },
    attested_files: sorted.map((f) => ({ ...f })),
  } as unknown as Json);
}

export async function computePackHash(input: {
  pack_spec_version: string;
  snapshot_id: string;
  producer: Producer;
  attested_files: FileEntry[];
}): Promise<string> {
  return sha256Hex(utf8(packHashPreimage(input)));
}

export interface BuildManifestOptions {
  generator: { name: string; version: string };
  snapshot_id: string;
  producer: Producer;
  generated_at: string;
  requested_at: string;
  attestedFiles: ReadonlyMap<string, Uint8Array>;
  informationalFiles?: ReadonlyMap<string, Uint8Array>;
  vault_entry_id?: string | null;
  signature?: { value: string; key_id: string } | null;
}

export async function buildManifest(
  opts: BuildManifestOptions,
): Promise<Manifest> {
  const attested_files = await fileEntries(opts.attestedFiles);
  const informational_files = await fileEntries(
    opts.informationalFiles ?? new Map(),
  );
  const pack_hash = await computePackHash({
    pack_spec_version: PACK_SPEC_VERSION,
    snapshot_id: opts.snapshot_id,
    producer: opts.producer,
    attested_files,
  });
  return {
    pack_spec_version: PACK_SPEC_VERSION,
    generator: opts.generator,
    snapshot_id: opts.snapshot_id,
    producer: opts.producer,
    generated_at: opts.generated_at,
    requested_at: opts.requested_at,
    attested_files,
    informational_files,
    pack_hash,
    signature: opts.signature?.value ?? null,
    signature_status: opts.signature ? "signed" : "unsigned-demo",
    key_id: opts.signature?.key_id ?? null,
    vault_entry_id: opts.vault_entry_id ?? null,
  };
}

/** Stable, human-readable serialization used when writing MANIFEST.json to disk. */
export function serializeManifest(manifest: Manifest): string {
  return JSON.stringify(manifest, null, 2) + "\n";
}

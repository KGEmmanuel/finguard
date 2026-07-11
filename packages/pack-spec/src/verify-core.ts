import { sha256Hex } from "./hash.js";
import {
  computePackHash,
  PACK_SPEC_VERSION,
  type FileEntry,
  type Manifest,
} from "./manifest.js";
import { findRegistryKey, verifyEd25519, type RegistryKey } from "./ed25519.js";

export type Scope = "attested" | "informational";

export interface FileCheck {
  name: string;
  scope: Scope;
  present: boolean;
  expected_sha256: string;
  actual_sha256: string | null;
  expected_bytes: number;
  actual_bytes: number | null;
  ok: boolean;
}

export type SignatureResult =
  | "signed-verified"
  | "signed-invalid"
  | "signed-unverified-no-key"
  | "unsigned-demo";

export interface VerifyReport {
  spec_version: string;
  spec_supported: boolean;
  manifest: Manifest;
  files: FileCheck[];
  /** Files in the archive that the MANIFEST does not list (MANIFEST/VERIFY/SPEC excluded). */
  unlisted_files: string[];
  expected_pack_hash: string;
  computed_pack_hash: string;
  pack_hash_ok: boolean;
  signature: SignatureResult;
  /** True iff spec supported, every listed file checks out, and pack_hash matches.
   *  Signature ABSENCE does not fail verification; signature INVALIDITY does. */
  ok: boolean;
}

const SELF_FILES = new Set(["MANIFEST.json", "VERIFY.md", "SPEC.md", "UPGRADE.md"]);

/**
 * Verify a pack given its files as bytes — fully offline (Spec v1 §6).
 * Works identically in the browser and in Node; the CLI is a thin wrapper.
 */
export async function verifyPack(
  files: ReadonlyMap<string, Uint8Array>,
  opts: {
    /** Raw Ed25519 public key (hex/base64) to verify a signed pack against. */
    publicKey?: string | Uint8Array;
    /** Key registry (Spec v1 §7); used when key_id is present and no publicKey given. */
    registry?: RegistryKey[];
  } = {},
): Promise<VerifyReport> {
  const manifestBytes = files.get("MANIFEST.json");
  if (!manifestBytes) {
    throw new Error("MANIFEST.json not found in pack");
  }
  const manifest = JSON.parse(
    new TextDecoder().decode(manifestBytes),
  ) as Manifest;

  const spec_supported = manifest.pack_spec_version === PACK_SPEC_VERSION;

  const checks: FileCheck[] = [];
  const checkList = async (entries: FileEntry[], scope: Scope) => {
    for (const entry of entries ?? []) {
      const bytes = files.get(entry.name);
      if (!bytes) {
        checks.push({
          name: entry.name,
          scope,
          present: false,
          expected_sha256: entry.sha256,
          actual_sha256: null,
          expected_bytes: entry.bytes,
          actual_bytes: null,
          ok: false,
        });
        continue;
      }
      const actual = await sha256Hex(bytes);
      checks.push({
        name: entry.name,
        scope,
        present: true,
        expected_sha256: entry.sha256,
        actual_sha256: actual,
        expected_bytes: entry.bytes,
        actual_bytes: bytes.byteLength,
        ok: actual === entry.sha256 && bytes.byteLength === entry.bytes,
      });
    }
  };
  await checkList(manifest.attested_files, "attested");
  await checkList(manifest.informational_files, "informational");

  const listed = new Set([
    ...(manifest.attested_files ?? []).map((f) => f.name),
    ...(manifest.informational_files ?? []).map((f) => f.name),
  ]);
  const unlisted_files = [...files.keys()].filter(
    (name) => !listed.has(name) && !SELF_FILES.has(name),
  );

  const computed_pack_hash = await computePackHash({
    pack_spec_version: manifest.pack_spec_version,
    snapshot_id: manifest.snapshot_id,
    producer: manifest.producer,
    attested_files: manifest.attested_files ?? [],
  });
  const pack_hash_ok = computed_pack_hash === manifest.pack_hash;

  let signature: SignatureResult = "unsigned-demo";
  if (manifest.signature) {
    let key: string | Uint8Array | undefined = opts.publicKey;
    if (!key && opts.registry && manifest.key_id) {
      key = findRegistryKey(opts.registry, manifest.key_id)?.public_key;
    }
    if (!key) {
      signature = "signed-unverified-no-key";
    } else {
      const valid = await verifyEd25519({
        publicKey: key,
        message: manifest.pack_hash,
        signatureBase64: manifest.signature,
      });
      signature = valid ? "signed-verified" : "signed-invalid";
    }
  }

  const filesOk = checks.every((c) => c.ok);
  const ok =
    spec_supported && filesOk && pack_hash_ok && signature !== "signed-invalid";

  return {
    spec_version: manifest.pack_spec_version,
    spec_supported,
    manifest,
    files: checks,
    unlisted_files,
    expected_pack_hash: manifest.pack_hash,
    computed_pack_hash,
    pack_hash_ok,
    signature,
    ok,
  };
}

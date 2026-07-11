import { fromBase64, fromHex, utf8 } from "./hash.js";

/**
 * Ed25519 verification via WebCrypto (Node >= 18, Chrome >= 113, Firefox,
 * Safari). Signing is NOT implemented here — signing is the commercial
 * control plane's job; the open verifier only ever needs public keys.
 * (Spec v1 §7: the format is open, the trust anchor is operated.)
 */
export async function verifyEd25519(opts: {
  /** 32-byte raw public key, as hex or base64 string, or raw bytes. */
  publicKey: string | Uint8Array;
  /** The message that was signed: ascii(pack_hash). */
  message: string;
  /** Base64 signature from MANIFEST.signature. */
  signatureBase64: string;
}): Promise<boolean> {
  const raw = normalizeKey(opts.publicKey);
  if (raw.byteLength !== 32) {
    throw new Error(
      `Ed25519 public key must be 32 raw bytes, got ${raw.byteLength}`,
    );
  }
  const key = await crypto.subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    { name: "Ed25519" },
    key,
    fromBase64(opts.signatureBase64) as BufferSource,
    utf8(opts.message) as BufferSource,
  );
}

function normalizeKey(key: string | Uint8Array): Uint8Array {
  if (typeof key !== "string") return key;
  const trimmed = key.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return fromHex(trimmed);
  return fromBase64(trimmed);
}

/** Key registry format (Spec v1 §7). */
export interface RegistryKey {
  key_id: string;
  alg: "ed25519";
  /** base64 or hex raw 32-byte public key */
  public_key: string;
  valid_from: string;
  revoked_at?: string | null;
}

export function findRegistryKey(
  registry: RegistryKey[],
  key_id: string,
): RegistryKey | undefined {
  return registry.find((k) => k.key_id === key_id && !k.revoked_at);
}

export { canonicalJson, type Json } from "./canonical.js";
export { sha256Hex, hex, fromHex, fromBase64, utf8 } from "./hash.js";
export {
  PACK_SPEC_VERSION,
  fileEntries,
  packHashPreimage,
  computePackHash,
  buildManifest,
  serializeManifest,
  type Producer,
  type Role,
  type FileEntry,
  type Manifest,
  type SignatureStatus,
  type BuildManifestOptions,
} from "./manifest.js";
export {
  verifyEd25519,
  findRegistryKey,
  type RegistryKey,
} from "./ed25519.js";
export {
  verifyPack,
  type VerifyReport,
  type FileCheck,
  type SignatureResult,
  type Scope,
} from "./verify-core.js";

/**
 * Sign an evidence pack's MANIFEST (ops tooling / design-partner pilots).
 * Reads a pack zip, signs ascii(pack_hash) with an Ed25519 private key
 * (pkcs8 base64 via env FINGUARD_SIGNING_KEY), and writes a new zip with
 * the signed MANIFEST. Production signing runs in the Cognita control plane:
 * POST /api/v1/finguard/sign — only the MANIFEST hash ever leaves the tenant.
 *
 * Usage: FINGUARD_SIGNING_KEY=<pkcs8-b64> tsx scripts/sign-pack.ts <pack.zip> <key_id>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createPrivateKey, sign as edSign } from "node:crypto";
import { unzipSync, zipSync } from "fflate";
import { serializeManifest, utf8, type Manifest } from "@finguard/pack-spec";

const [packPath, keyId] = process.argv.slice(2);
const keyB64 = process.env.FINGUARD_SIGNING_KEY;
if (!packPath || !keyId || !keyB64) {
  console.error(
    "usage: FINGUARD_SIGNING_KEY=<pkcs8-b64> tsx scripts/sign-pack.ts <pack.zip> <key_id>",
  );
  process.exit(2);
}

const privateKey = createPrivateKey({
  key: Buffer.from(keyB64, "base64"),
  format: "der",
  type: "pkcs8",
});

const entries = unzipSync(new Uint8Array(readFileSync(packPath)));
const manifest = JSON.parse(
  new TextDecoder().decode(entries["MANIFEST.json"]),
) as Manifest;

const signature = edSign(
  null,
  Buffer.from(manifest.pack_hash, "ascii"),
  privateKey,
).toString("base64");

const signed: Manifest = {
  ...manifest,
  signature,
  signature_status: "signed",
  key_id: keyId,
};
entries["MANIFEST.json"] = utf8(serializeManifest(signed));

const outPath = packPath.replace(/\.zip$/, ".signed.zip");
writeFileSync(outPath, zipSync(entries, { mtime: new Date(1980, 0, 1, 12, 0, 0) /* local-time components: identical DOS-date bytes in every TZ */, level: 6 }));
console.log(`signed → ${outPath}\n  pack_hash: ${manifest.pack_hash}\n  key_id:    ${keyId}`);

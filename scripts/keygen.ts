/**
 * Generate an Ed25519 keypair for pack signing (ops tooling — the commercial
 * control plane holds production keys in KMS/HSM; this is for local testing
 * and design-partner pilots). NEVER commit a private key.
 *
 * Usage: tsx scripts/keygen.ts <key_id>
 */
import { generateKeyPairSync } from "node:crypto";

const keyId = process.argv[2] ?? "local-test";
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const spki = publicKey.export({ type: "spki", format: "der" });
const rawPub = Buffer.from(spki.subarray(spki.length - 32));

console.log(
  JSON.stringify(
    {
      registry_entry: {
        key_id: keyId,
        alg: "ed25519",
        public_key: rawPub.toString("base64"),
        valid_from: new Date().toISOString(),
      },
      private_key_pkcs8_base64: privateKey
        .export({ type: "pkcs8", format: "der" })
        .toString("base64"),
      warning: "Store the private key in KMS/secret manager. Do not commit it.",
    },
    null,
    2,
  ),
);

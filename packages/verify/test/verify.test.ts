import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { zipSync, unzipSync } from "fflate";
import {
  buildManifest,
  serializeManifest,
  verifyPack,
  utf8,
  type Producer,
} from "@finguard/pack-spec";

const producer: Producer = {
  user_id: "f7597336-ff0e-4517-b8ee-bd0c4150c651",
  display_name: "Demo CISO",
  role: "ciso",
};

async function makePack(sign?: { priv: any; keyId: string }) {
  const attested = new Map<string, Uint8Array>([
    ["01_summary.json", utf8('{"agents":2}\n')],
    ["02_agents.csv", utf8("id,name\nAGT-1,Alpha\nAGT-2,Beta\n")],
  ]);
  let manifest = await buildManifest({
    generator: { name: "finguard", version: "2.1.0" },
    snapshot_id: "snap-test-1",
    producer,
    generated_at: "2026-07-06T10:00:00Z",
    requested_at: "2026-07-06T10:00:00Z",
    attestedFiles: attested,
    vault_entry_id: "vault-1",
  });
  if (sign) {
    const sig = edSign(null, Buffer.from(manifest.pack_hash, "ascii"), sign.priv);
    manifest = {
      ...manifest,
      signature: sig.toString("base64"),
      signature_status: "signed",
      key_id: sign.keyId,
    };
  }
  const zipped = zipSync(
    {
      "MANIFEST.json": utf8(serializeManifest(manifest)),
      "01_summary.json": attested.get("01_summary.json")!,
      "02_agents.csv": attested.get("02_agents.csv")!,
    },
    { mtime: new Date(1980, 0, 1, 12, 0, 0) /* local-time components: identical DOS-date bytes in every TZ */, level: 6 },
  );
  return { zipped, manifest };
}

function toMap(zipped: Uint8Array): Map<string, Uint8Array> {
  return new Map(Object.entries(unzipSync(zipped)));
}

test("clean unsigned pack verifies (hashes ok, signature reported absent)", async () => {
  const { zipped } = await makePack();
  const report = await verifyPack(toMap(zipped));
  assert.equal(report.ok, true);
  assert.equal(report.pack_hash_ok, true);
  assert.equal(report.signature, "unsigned-demo");
  assert.ok(report.files.every((f) => f.ok));
});

test("tampering one byte fails verification", async () => {
  const { zipped } = await makePack();
  const files = toMap(zipped);
  files.set("02_agents.csv", utf8("id,name\nAGT-1,AlphA\nAGT-2,Beta\n"));
  const report = await verifyPack(files);
  assert.equal(report.ok, false);
  const bad = report.files.find((f) => f.name === "02_agents.csv")!;
  assert.equal(bad.ok, false);
});

test("missing attested file fails verification", async () => {
  const { zipped } = await makePack();
  const files = toMap(zipped);
  files.delete("01_summary.json");
  const report = await verifyPack(files);
  assert.equal(report.ok, false);
  const missing = report.files.find((f) => f.name === "01_summary.json")!;
  assert.equal(missing.present, false);
});

test("signed pack verifies against the correct raw public key", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spki = publicKey.export({ type: "spki", format: "der" });
  const raw = Buffer.from(spki.subarray(spki.length - 32)).toString("hex");
  const { zipped } = await makePack({ priv: privateKey, keyId: "cognita-test-1" });
  const report = await verifyPack(toMap(zipped), { publicKey: raw });
  assert.equal(report.signature, "signed-verified");
  assert.equal(report.ok, true);
});

test("signed pack against the WRONG key reports signed-invalid and fails", async () => {
  const signer = generateKeyPairSync("ed25519");
  const other = generateKeyPairSync("ed25519");
  const wrongSpki = other.publicKey.export({ type: "spki", format: "der" });
  const wrongRaw = Buffer.from(wrongSpki.subarray(wrongSpki.length - 32)).toString("hex");
  const { zipped } = await makePack({ priv: signer.privateKey, keyId: "cognita-test-1" });
  const report = await verifyPack(toMap(zipped), { publicKey: wrongRaw });
  assert.equal(report.signature, "signed-invalid");
  assert.equal(report.ok, false);
});

test("signed pack with no key supplied is unverified but not failed", async () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const { zipped } = await makePack({ priv: privateKey, keyId: "cognita-test-1" });
  const report = await verifyPack(toMap(zipped));
  assert.equal(report.signature, "signed-unverified-no-key");
  assert.equal(report.ok, true);
});

test("registry lookup by key_id works", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const spki = publicKey.export({ type: "spki", format: "der" });
  const raw = Buffer.from(spki.subarray(spki.length - 32)).toString("base64");
  const { zipped } = await makePack({ priv: privateKey, keyId: "cognita-prod-2026" });
  const report = await verifyPack(toMap(zipped), {
    registry: [
      { key_id: "cognita-prod-2026", alg: "ed25519", public_key: raw, valid_from: "2026-01-01T00:00:00Z" },
    ],
  });
  assert.equal(report.signature, "signed-verified");
});

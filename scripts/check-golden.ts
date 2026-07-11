/**
 * DETERMINISM GATE (CI): rebuilds the evidence pack from fixture inputs and
 * asserts the result is byte-identical to the checked-in golden output, then
 * verifies the golden zip with the verifier built from this same commit —
 * so the builder and the verifier can never drift.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { verifyPack } from "@finguard/pack-spec";
import { buildGolden, FIXTURE_DIR } from "./golden-lib.ts";

let failed = false;
const fail = (msg: string) => {
  console.error(`✖ ${msg}`);
  failed = true;
};

const { manifestBytes, zipBytes, manifest } = await buildGolden();
const outDir = join(FIXTURE_DIR, "output");

const goldenManifest = readFileSync(join(outDir, "MANIFEST.json"));
if (!Buffer.from(manifestBytes).equals(goldenManifest)) {
  fail(
    "MANIFEST.json is NOT byte-identical to the golden output. " +
      "If this change is intentional, run `pnpm golden:update` and justify it in the PR.",
  );
} else {
  console.log("✔ MANIFEST byte-identical to golden output");
}

const goldenZip = readFileSync(join(outDir, "finguard-evidence-golden.zip"));
if (!Buffer.from(zipBytes).equals(goldenZip)) {
  fail("zip is NOT byte-identical to the golden output.");
} else {
  console.log("✔ zip byte-identical to golden output");
}

// Round-trip: verify the checked-in golden zip.
const files = new Map(Object.entries(unzipSync(new Uint8Array(goldenZip))));
const report = await verifyPack(files);
if (!report.ok) {
  fail("golden zip failed verification");
  console.error(JSON.stringify(report, null, 2));
} else {
  console.log(
    `✔ golden zip verifies (pack_hash ${report.computed_pack_hash.slice(0, 16)}…, signature: ${report.signature})`,
  );
}
if (manifest.pack_hash !== report.computed_pack_hash) {
  fail("builder and verifier disagree on pack_hash");
}

if (failed) process.exit(1);
console.log("✔ determinism gate passed");

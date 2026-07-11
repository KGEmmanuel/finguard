/**
 * Regenerates the checked-in golden pack from fixtures/golden-pack/input.
 * Run ONLY when a spec change intentionally alters pack bytes, and explain
 * the change in the PR (see CONTRIBUTING.md rule 2).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildGolden, FIXTURE_DIR } from "./golden-lib.ts";

const { manifest, manifestBytes, zipBytes } = await buildGolden();
const outDir = join(FIXTURE_DIR, "output");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "MANIFEST.json"), manifestBytes);
writeFileSync(join(outDir, "finguard-evidence-golden.zip"), zipBytes);
console.log(`golden pack updated
  pack_hash: ${manifest.pack_hash}
  manifest:  ${manifestBytes.byteLength} bytes
  zip:       ${zipBytes.byteLength} bytes`);

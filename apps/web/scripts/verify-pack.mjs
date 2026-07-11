#!/usr/bin/env node
/**
 * finguard verify — offline evidence-pack verifier (skeleton).
 *
 * Usage:
 *   node scripts/verify-pack.mjs <pack.zip>
 *
 * Today this script:
 *   1. Opens the ZIP.
 *   2. Reads MANIFEST.json.
 *   3. Recomputes SHA-256 for every enclosed file and compares.
 *   4. Prints a PASS/FAIL summary and exits with the right code.
 *
 * Not yet implemented (tracked in ROADMAP.md):
 *   - Ed25519 signature verification against docs/keys/finguard.pub.
 *   - JSON output mode for CI pipelines.
 *   - Distribution as an installable `finguard` binary via npm.
 *
 * This file deliberately has zero runtime dependencies so a regulator
 * can drop it next to a pack and run it with a stock Node install.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { argv, exit } from "node:process";

async function main() {
  const [, , packPath] = argv;
  if (!packPath) {
    console.error("usage: node scripts/verify-pack.mjs <pack.zip>");
    exit(2);
  }

  let bytes;
  try {
    bytes = await readFile(packPath);
  } catch (err) {
    console.error(`cannot read ${packPath}: ${err.message}`);
    exit(2);
  }

  const files = parseZip(bytes);
  const manifestEntry = files.find((f) => f.name === "MANIFEST.json");
  if (!manifestEntry) {
    console.error("FAIL: MANIFEST.json missing from pack");
    exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestEntry.data));
  } catch (err) {
    console.error(`FAIL: MANIFEST.json is not valid JSON (${err.message})`);
    exit(1);
  }

  const declared = new Map(
    (manifest.files ?? []).map((f) => [f.name, f.sha256]),
  );

  let failures = 0;
  for (const f of files) {
    if (f.name === "MANIFEST.json" || f.name.endsWith(".sig")) continue;
    const expected = declared.get(f.name);
    const actual = createHash("sha256").update(f.data).digest("hex");
    if (!expected) {
      console.error(`FAIL: ${f.name} present in ZIP but not in MANIFEST`);
      failures++;
      continue;
    }
    if (expected !== actual) {
      console.error(`FAIL: ${f.name} hash mismatch`);
      console.error(`  expected ${expected}`);
      console.error(`  actual   ${actual}`);
      failures++;
    }
  }

  const sig = files.find((f) => f.name.endsWith(".sig"));
  if (sig) {
    console.warn(
      "WARN: signature verification not implemented yet — see ROADMAP.md",
    );
  } else {
    console.warn(
      "WARN: pack is unsigned (free-tier demo). Production packs from " +
        "app.cognitagrc.io ship a detached .sig alongside MANIFEST.json.",
    );
  }

  if (failures > 0) {
    console.error(`\nFAIL: ${failures} file(s) failed hash check.`);
    exit(1);
  }
  console.log(`PASS: ${files.length - 1} file(s) match MANIFEST.json.`);
}

// Minimal ZIP reader — central-directory walk, STORE and DEFLATE only.
function parseZip(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Find End of Central Directory record.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file");
  const cdOffset = view.getUint32(eocd + 16, true);
  const cdEntries = view.getUint16(eocd + 10, true);

  const files = [];
  let p = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("bad CD");
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localHeader = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));

    const lhNameLen = view.getUint16(localHeader + 26, true);
    const lhExtraLen = view.getUint16(localHeader + 28, true);
    const dataStart = localHeader + 30 + lhNameLen + lhExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);

    let data;
    if (method === 0) {
      data = raw;
    } else if (method === 8) {
      const zlib = require("node:zlib");
      data = zlib.inflateRawSync(raw);
    } else {
      throw new Error(`unsupported compression method ${method} for ${name}`);
    }
    files.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

main().catch((err) => {
  console.error(err);
  exit(2);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildManifest,
  computePackHash,
  fileEntries,
  PACK_SPEC_VERSION,
  type Producer,
} from "../src/manifest.js";
import { utf8 } from "../src/hash.js";

const producer: Producer = {
  user_id: "f7597336-ff0e-4517-b8ee-bd0c4150c651",
  display_name: "Demo CISO",
  role: "ciso",
};

const files = () =>
  new Map<string, Uint8Array>([
    ["02_agents.csv", utf8("id,name\nAGT-1,Alpha\n")],
    ["01_summary.json", utf8('{"agents":1}\n')],
  ]);

test("fileEntries are sorted by name regardless of insertion order", async () => {
  const entries = await fileEntries(files());
  assert.deepEqual(
    entries.map((e) => e.name),
    ["01_summary.json", "02_agents.csv"],
  );
});

test("DETERMINISM: same inputs => identical pack_hash across builds and times", async () => {
  const a = await buildManifest({
    generator: { name: "finguard", version: "2.1.0" },
    snapshot_id: "snap-1",
    producer,
    generated_at: "2026-07-06T10:00:00Z",
    requested_at: "2026-07-06T09:59:59Z",
    attestedFiles: files(),
  });
  const b = await buildManifest({
    generator: { name: "finguard", version: "9.9.9" }, // different generator
    snapshot_id: "snap-1",
    producer,
    generated_at: "2031-01-01T00:00:00Z", // different wall clock
    requested_at: "2031-01-01T00:00:00Z",
    attestedFiles: files(),
  });
  assert.equal(a.pack_hash, b.pack_hash);
});

test("pack_hash changes when any attested byte changes", async () => {
  const base = await computePackHash({
    pack_spec_version: PACK_SPEC_VERSION,
    snapshot_id: "snap-1",
    producer,
    attested_files: await fileEntries(files()),
  });
  const tampered = files();
  tampered.set("02_agents.csv", utf8("id,name\nAGT-1,AlphA\n"));
  const changed = await computePackHash({
    pack_spec_version: PACK_SPEC_VERSION,
    snapshot_id: "snap-1",
    producer,
    attested_files: await fileEntries(tampered),
  });
  assert.notEqual(base, changed);
});

test("informational files do not affect pack_hash", async () => {
  const a = await buildManifest({
    generator: { name: "finguard", version: "2.1.0" },
    snapshot_id: "snap-1",
    producer,
    generated_at: "2026-07-06T10:00:00Z",
    requested_at: "2026-07-06T10:00:00Z",
    attestedFiles: files(),
  });
  const b = await buildManifest({
    generator: { name: "finguard", version: "2.1.0" },
    snapshot_id: "snap-1",
    producer,
    generated_at: "2026-07-06T10:00:00Z",
    requested_at: "2026-07-06T10:00:00Z",
    attestedFiles: files(),
    informationalFiles: new Map([["00_cover.pdf", utf8("%PDF-fake")]]),
  });
  assert.equal(a.pack_hash, b.pack_hash);
  assert.equal(b.informational_files.length, 1);
});

test("unsigned manifests carry explicit unsigned-demo status", async () => {
  const m = await buildManifest({
    generator: { name: "finguard", version: "2.1.0" },
    snapshot_id: "snap-1",
    producer,
    generated_at: "2026-07-06T10:00:00Z",
    requested_at: "2026-07-06T10:00:00Z",
    attestedFiles: files(),
  });
  assert.equal(m.signature, null);
  assert.equal(m.signature_status, "unsigned-demo");
  assert.equal(m.key_id, null);
});

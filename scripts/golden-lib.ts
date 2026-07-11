import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";
import {
  buildManifest,
  serializeManifest,
  utf8,
  type Manifest,
  type Producer,
} from "@finguard/pack-spec";

export const FIXTURE_DIR = fileURLToPath(
  new URL("../fixtures/golden-pack/", import.meta.url),
);

interface Meta {
  snapshot_id: string;
  producer: Producer;
  generated_at: string;
  requested_at: string;
  vault_entry_id: string;
  generator: { name: string; version: string };
}

/** Build the golden pack fully in memory from fixtures/golden-pack/input. */
export async function buildGolden(fixtureDir: string = FIXTURE_DIR): Promise<{
  manifest: Manifest;
  manifestBytes: Uint8Array;
  zipBytes: Uint8Array;
}> {
  const inputDir = join(fixtureDir, "input");
  const staticDir = join(fixtureDir, "static");
  const meta = JSON.parse(readFileSync(join(inputDir, "meta.json"), "utf8")) as Meta;

  const attested = new Map<string, Uint8Array>();
  for (const name of readdirSync(inputDir).sort()) {
    if (name === "meta.json") continue;
    attested.set(name, new Uint8Array(readFileSync(join(inputDir, name))));
  }

  const manifest = await buildManifest({
    generator: meta.generator,
    snapshot_id: meta.snapshot_id,
    producer: meta.producer,
    generated_at: meta.generated_at,
    requested_at: meta.requested_at,
    attestedFiles: attested,
    vault_entry_id: meta.vault_entry_id,
  });
  const manifestBytes = utf8(serializeManifest(manifest));

  const zipEntries: Record<string, Uint8Array> = { "MANIFEST.json": manifestBytes };
  for (const name of readdirSync(staticDir).sort()) {
    zipEntries[name] = new Uint8Array(readFileSync(join(staticDir, name)));
  }
  for (const [name, bytes] of attested) zipEntries[name] = bytes;

  // Fixed mtime + fixed compression => deterministic zip bytes.
  const zipBytes = zipSync(zipEntries, { mtime: new Date(1980, 0, 1, 12, 0, 0) /* local-time components: identical DOS-date bytes in every TZ */, level: 6 });
  return { manifest, manifestBytes, zipBytes };
}

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";

/** Load a pack from a .zip file or an unpacked directory into a name→bytes map. */
export function loadPack(path: string): Map<string, Uint8Array> {
  const stat = statSync(path);
  const files = new Map<string, Uint8Array>();
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      const p = join(path, name);
      if (statSync(p).isFile()) files.set(name, new Uint8Array(readFileSync(p)));
    }
    return files;
  }
  const unzipped = unzipSync(new Uint8Array(readFileSync(path)));
  for (const [name, bytes] of Object.entries(unzipped)) {
    // flatten: packs are flat archives per spec §1
    if (!name.endsWith("/")) files.set(name.split("/").pop()!, bytes);
  }
  return files;
}

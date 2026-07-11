/**
 * Canonical JSON — the only serialization allowed inside a pack_hash preimage.
 * Rules (Evidence Pack Spec v1 §3): lexicographically sorted object keys,
 * no insignificant whitespace, UTF-8. Arrays keep their order (callers must
 * pre-sort where the spec requires it, e.g. attested_files by name).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export function canonicalJson(value: Json): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("canonicalJson: non-finite numbers are not permitted");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k]!)}`)
    .join(",");
  return `{${body}}`;
}

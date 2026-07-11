import { readFileSync } from "node:fs";
import {
  verifyPack,
  type RegistryKey,
  type VerifyReport,
} from "@finguard/pack-spec";
import { loadPack } from "./load.js";

export interface RunOptions {
  keyFile?: string;
  registryFile?: string;
  color?: boolean;
}

export async function runVerify(
  packPath: string,
  opts: RunOptions = {},
): Promise<VerifyReport> {
  const files = loadPack(packPath);
  let publicKey: string | undefined;
  let registry: RegistryKey[] | undefined;
  if (opts.keyFile) publicKey = readFileSync(opts.keyFile, "utf8").trim();
  if (opts.registryFile) {
    const parsed = JSON.parse(readFileSync(opts.registryFile, "utf8"));
    registry = Array.isArray(parsed) ? parsed : parsed.keys;
  }
  return verifyPack(files, { publicKey, registry });
}

const UPSELL =
  "Production packs are Ed25519-signed · https://app.cognitagrc.io/finguard?utm_source=cli&utm_medium=verify";

export function renderReport(report: VerifyReport, color = true): string {
  const g = (s: string) => (color ? `\x1b[32m${s}\x1b[0m` : s);
  const r = (s: string) => (color ? `\x1b[31m${s}\x1b[0m` : s);
  const y = (s: string) => (color ? `\x1b[33m${s}\x1b[0m` : s);
  const dim = (s: string) => (color ? `\x1b[2m${s}\x1b[0m` : s);
  const lines: string[] = [];

  lines.push(
    dim(
      `finguard-verify · Evidence Pack Spec v${report.spec_version}` +
        (report.spec_supported ? "" : "  (UNSUPPORTED SPEC VERSION)"),
    ),
  );

  const okFiles = report.files.filter((f) => f.ok).length;
  const total = report.files.length;
  lines.push(
    (okFiles === total ? g("✔") : r("✖")) +
      ` ${okFiles}/${total} file hashes match MANIFEST`,
  );
  for (const f of report.files.filter((f) => !f.ok)) {
    lines.push(
      r(`    ✖ ${f.name}`) +
        (f.present
          ? dim(` expected ${f.expected_sha256.slice(0, 12)}… got ${f.actual_sha256?.slice(0, 12)}…`)
          : dim(" MISSING from pack")),
    );
  }
  if (report.unlisted_files.length > 0) {
    lines.push(
      y(`⚠ unlisted files in archive: ${report.unlisted_files.join(", ")}`),
    );
  }

  lines.push(
    report.pack_hash_ok
      ? g("✔") + ` pack_hash verified ${dim(report.computed_pack_hash.slice(0, 16) + "…")}`
      : r("✖") +
          ` pack_hash MISMATCH ${dim(`manifest=${report.expected_pack_hash.slice(0, 12)}… computed=${report.computed_pack_hash.slice(0, 12)}…`)}`,
  );

  switch (report.signature) {
    case "signed-verified":
      lines.push(g("✔") + ` signature: VERIFIED (key ${report.manifest.key_id})`);
      break;
    case "signed-invalid":
      lines.push(r("✖") + " signature: INVALID — do not trust this pack");
      break;
    case "signed-unverified-no-key":
      lines.push(
        y("⚠") +
          ` signature present (key ${report.manifest.key_id}) but no key supplied — pass --key or --registry`,
      );
      break;
    case "unsigned-demo":
      lines.push(r("✖") + " signature: ABSENT — unsigned demo pack");
      lines.push(dim(`  ${UPSELL}`));
      break;
  }

  lines.push(
    report.ok
      ? g(`✔ PACK VERIFIED`) + dim(" (offline — no vendor callback)")
      : r(`✖ VERIFICATION FAILED`),
  );
  return lines.join("\n");
}

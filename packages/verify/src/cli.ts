#!/usr/bin/env node
import { runVerify, renderReport } from "./run.js";

const HELP = `finguard-verify — offline verifier for FinGuard evidence packs (Spec v1)

Usage:
  finguard-verify <pack.zip | directory> [options]

Options:
  --key <file>        Raw Ed25519 public key (hex or base64) to verify a signed pack
  --registry <file>   Key registry JSON (Spec v1 §7); matched by MANIFEST key_id
  --json              Machine-readable report on stdout
  --no-color          Disable ANSI colors
  -h, --help          Show this help

Exit codes: 0 verified · 1 verification failed · 2 usage/IO error

Verification is fully offline. No telemetry is sent. Source: https://github.com/KGEmmanuel/finguard`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(HELP);
    return args.length === 0 ? 2 : 0;
  }
  let packPath: string | undefined;
  let keyFile: string | undefined;
  let registryFile: string | undefined;
  let json = false;
  let color = process.stdout.isTTY ?? false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--key") keyFile = args[++i];
    else if (a === "--registry") registryFile = args[++i];
    else if (a === "--json") json = true;
    else if (a === "--no-color") color = false;
    else if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}\n\n${HELP}`);
      return 2;
    } else packPath = a;
  }
  if (!packPath) {
    console.error(`No pack specified.\n\n${HELP}`);
    return 2;
  }

  try {
    const report = await runVerify(packPath, { keyFile, registryFile });
    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(renderReport(report, color));
    }
    return report.ok ? 0 : 1;
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }
}

main().then((code) => {
  process.exitCode = code;
});

import JSZip from "jszip";
import jsPDF from "jspdf";
import {
  buildManifest,
  computePackHash,
  fileEntries,
  serializeManifest,
  verifyPack,
  PACK_SPEC_VERSION,
  type Manifest,
  type Producer,
} from "@finguard/pack-spec";

import { supabase } from "@/integrations/supabase/client";
import { actorLabel, sha256Hex } from "@/lib/audit";
import { SPEC_MD, UPGRADE_MD, VERIFY_MD } from "@/lib/pack-docs";
import { defensibilityDims } from "@/lib/mock-data";
import { downloadBlob, toCsv } from "@/lib/csv";
import {
  bar,
  ensureSpace,
  footer,
  h2,
  kv,
  newCursor,
  paragraph,
  PDF,
  sectionHeader,
  table,
} from "@/lib/pdf";
import type {
  Agent,
  CurrentUser,
  GuardrailEvent,
  MockExam,
  OverrideEvent,
  VaultEntry,
} from "@/lib/queries";
import custodianAsset from "@/assets/cognita-custodian.png.asset.json";

export { downloadBlob };

export interface ManifestEntry {
  name: string;
  sha256: string;
  bytes: number;
}

export interface ExamResult {
  examId: string;
  hours: number;
  score: number;
  agentCount: number;
  eventCount: number;
  overrideCount: number;
  packHash: string;
  manifest: ManifestEntry[];
  generationMs: number;
  zipBlob: Blob;
  filename: string;
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer to satisfy strict BufferSource typing
  // (subtle.digest rejects Uint8Array over SharedArrayBuffer).
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(custodianAsset.url);
    const blob = await res.blob();
    // Downscale to 256x256 — the cover renders at 90pt, so anything larger just bloats the PDF.
    if (typeof document !== "undefined" && "createElement" in document) {
      try {
        const bmp = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bmp, 0, 0, 256, 256);
          return canvas.toDataURL("image/png");
        }
      } catch {
        // fall through to raw dataURL
      }
    }
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Human-friendly UTC stamp: "2026-07-06 17:43:05 UTC". */
function formatUtc(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, "").replace(/Z$/, "") + " UTC";
}

/**
 * Runs a Mock SEC Exam and produces the full evidence pack:
 *   1. Records a "requested" vault entry (chain-of-custody start)
 *   2. Snapshots agents / events / overrides / vault
 *   3. Builds a multi-section PDF (cover, exec, overrides, gaps, custody, attestation)
 *   4. Hashes every file into a MANIFEST.json bound to a pack_hash
 *   5. Persists mock_exams row (with manifest) and vault entry (with manifest)
 */
export async function runMockExam(user: CurrentUser): Promise<ExamResult> {
  const started = performance.now();
  const requestedAtIso = new Date().toISOString();
  // Spec v1: every pack derives from one input snapshot. Same snapshot +
  // same spec version + same producer ⇒ identical pack_hash (Spec §3).
  const snapshotId = crypto.randomUUID();
  const producer: Producer = {
    user_id: user.userId,
    display_name: actorLabel(user),
    role: user.role as Producer["role"],
  };

  // 1. Chain-of-custody: "requested"
  const requestHash = await sha256Hex(
    `requested|${user.userId}|${requestedAtIso}`,
  );
  await supabase.from("audit_vault").insert({
    hash: requestHash,
    kind: "Mock exam requested",
    ref: `by ${actorLabel(user)}`,
    actor_id: user.userId,
    actor_display_name: actorLabel(user),
    payload: {
      requested_at: requestedAtIso,
      requester_role: user.role,
    },
  });

  const [agentsRes, eventsRes, overridesRes, vaultRes] = await Promise.all([
    supabase.from("agents").select("*"),
    supabase.from("guardrail_events").select("*").order("ts", { ascending: false }),
    supabase.from("override_events").select("*").order("created_at", { ascending: false }),
    supabase.from("audit_vault").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  const agents = (agentsRes.data ?? []) as Agent[];
  const events = (eventsRes.data ?? []) as GuardrailEvent[];
  const overrides = (overridesRes.data ?? []) as OverrideEvent[];
  const vault = (vaultRes.data ?? []) as VaultEntry[];

  // Deterministic defensibility score
  const unmanaged = agents.filter((a) => a.status === "unmanaged").length;
  const softFlags = events.filter((e) => e.action === "soft_flag").length;
  const withJust = overrides.length;
  const coverage = agents.length === 0 ? 0 : ((agents.length - unmanaged) / agents.length) * 100;
  const overrideCoverage = softFlags === 0 ? 100 : Math.min(100, (withJust / softFlags) * 100);
  const score = Math.max(60, Math.min(99, Math.round(0.55 * coverage + 0.35 * overrideCoverage + 10)));
  const hours = Math.max(1.5, 8 - score / 15);

  const stampIso = new Date().toISOString();
  const stamp = stampIso.replace(/[:.]/g, "-").slice(0, 19);
  const filename = `finguard-evidence-${stamp}.zip`;

  const dimScores: Record<string, { score: number; notes: string; remediation: string }> = {
    chain_of_custody: {
      score: Math.round(coverage),
      notes: `${agents.length - unmanaged}/${agents.length} agents logged to vault`,
      remediation: "Assign owners to unmanaged agents; ensure telemetry beacons emit within 24h.",
    },
    override_completeness: {
      score: Math.round(overrideCoverage),
      notes: `${withJust}/${softFlags} soft flags justified`,
      remediation: "Route unresolved soft flags to MD queue with 5-business-day SLA.",
    },
    telemetry_latency: {
      score: 94,
      notes: "p99 alert latency 41ms (SLA: 50ms)",
      remediation: "Latency within SLA; continue quarterly stress test.",
    },
    model_card_currency: {
      score: 78,
      notes: "22 models with cards >90d stale",
      remediation: "Automate model-card regeneration on any base-model or prompt change.",
    },
    unmanaged_remediation: {
      score: Math.max(20, 100 - unmanaged * 20),
      notes: `${unmanaged} unmanaged agent(s) pending owner assignment`,
      remediation: unmanaged > 0
        ? `Assign an accountable owner to each of the ${unmanaged} unmanaged agent(s) within 10 business days.`
        : "No unmanaged agents; maintain discovery cadence.",
    },
    statute_mapping: {
      score: 89,
      notes: "Rules mapped to SEC 17a-4, FINRA 2210, SR 11-7",
      remediation: "Extend mapping to include EU AI Act Annex III on next release.",
    },
  };

  // --- Build data files FIRST (PDF comes last, since it embeds pack_hash) ----
  const encoder = new TextEncoder();
  const stampHuman = formatUtc(stampIso);
  const requestedHuman = formatUtc(requestedAtIso);
  const hoursDisplay = hours.toFixed(1);
  const producedByLine = `${actorLabel(user)} (${user.role.toUpperCase()})`;

  const summaryJson = JSON.stringify(
    {
      generated_at: stampIso,
      requested_at: requestedAtIso,
      produced_by: {
        user_id: user.userId,
        display_name: actorLabel(user),
        role: user.role,
      },
      defensibility_score: score,
      estimated_response_hours: { value: Number(hoursDisplay), display: `${hoursDisplay} hours` },
      counts: {
        agents: agents.length,
        unmanaged,
        events: events.length,
        overrides: withJust,
        // Spec v1 §5: the vault CSV contains only entries committed at or
        // before hashing — never a predicted row for this pack itself.
        vault_entries: vault.length,
      },
    },
    null,
    2,
  );

  // Explicit column list keeps CSV header present even when overrides.length === 0.
  const overridesCsv = toCsv(
    overrides as unknown as Record<string, unknown>[],
    [
      "id",
      "event_id",
      "user_id",
      "user_display_name",
      "user_role",
      "justification",
      "evidence_hash",
      "created_at",
    ],
  );

  const defensibilityJson = JSON.stringify(
    {
      score,
      components: {
        coverage_pct: Math.round(coverage),
        override_coverage_pct: Math.round(overrideCoverage),
      },
      dimensions: defensibilityDims.map((d) => ({
        key: d.key,
        label: d.label,
        ...dimScores[d.key],
      })),
    },
    null,
    2,
  );

  // Spec v1 §5: the vault CSV snapshots entries committed AT OR BEFORE this
  // point — the "requested" entry is in (inserted above), this pack's own
  // "generated" entry is NOT (it is committed after hashing, and referenced
  // from MANIFEST.vault_entry_id instead). No placeholder rows, ever.
  const vaultCsvBytes = encoder.encode(
    toCsv(
      vault.map((v) => ({
        id: v.id,
        hash: v.hash,
        kind: v.kind,
        ref: v.ref,
        actor: v.actor_display_name,
        created_at: v.created_at,
      })),
    ),
  );

  // All six data files are attested (Spec §2) — including the vault CSV,
  // which no longer references the pack itself, so there is no cycle.
  const attestedFiles = new Map<string, Uint8Array>([
    ["01_summary.json", encoder.encode(summaryJson)],
    ["02_agents.csv", encoder.encode(toCsv(agents as unknown as Record<string, unknown>[]))],
    ["03_guardrail_events.csv", encoder.encode(toCsv(events as unknown as Record<string, unknown>[]))],
    ["04_overrides.csv", encoder.encode(overridesCsv)],
    ["05_audit_vault.csv", vaultCsvBytes],
    ["06_defensibility.json", encoder.encode(defensibilityJson)],
  ]);
  const dataFiles = [...attestedFiles.entries()].map(([name, bytes]) => ({ name, bytes }));

  // Canonical, content-only pack hash (Spec §3): no timestamps in the
  // preimage — same snapshot + same producer ⇒ byte-identical hash.
  const attestedEntries = await fileEntries(attestedFiles);
  const packHash = await computePackHash({
    pack_spec_version: PACK_SPEC_VERSION,
    snapshot_id: snapshotId,
    producer,
    attested_files: attestedEntries,
  });

  // Manifest table used INSIDE the PDF — sorted by canonical filename order.
  const manifestForPdf = [
    { name: "00_cover.pdf", note: "(this file)" },
    ...attestedEntries.map((f) => ({ name: f.name, sha: f.sha256, bytes: f.bytes })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  // --- Build multi-section PDF -----------------------------------------------
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pw = pdf.internal.pageSize.getWidth();
  const logoData = await loadLogoDataUrl();

  // COVER PAGE
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pw, 220, "F");
  if (logoData) {
    try {
      pdf.addImage(logoData, "PNG", pw - 130, 40, 90, 90);
    } catch {
      // ignore
    }
  }
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("COGNITA · FINGUARD v2.0", 40, 60);
  pdf.setFontSize(24);
  pdf.text("Regulator Evidence Pack", 40, 100);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text("Mock SEC Examination", 40, 122);
  pdf.setFontSize(9);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Produced ${stampHuman}`, 40, 140);
  pdf.text(`Produced by ${producedByLine} — unsigned demo pack`, 40, 155);
  pdf.text(`Pack hash ${packHash.slice(0, 24)}… (Spec v${PACK_SPEC_VERSION})`, 40, 170);
  pdf.text(
    "Verify offline: npx finguard-verify <this-zip> · Ed25519-signed packs at app.cognitagrc.io",
    40,
    185,
  );

  const c = newCursor();
  c.y = 240;

  // Cover attestation panel
  pdf.setFillColor(248, 250, 252);
  pdf.rect(40, c.y, pw - 80, 118, "F");
  pdf.setDrawColor(...PDF.ACCENT);
  pdf.setLineWidth(2);
  pdf.line(40, c.y, 40, c.y + 118);
  pdf.setDrawColor(0);
  pdf.setTextColor(...PDF.NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("ATTESTATION", 56, c.y + 20);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const attest = pdf.splitTextToSize(
    "This evidence pack was assembled from tamper-evident logs stored in the Cognita FinGuard append-only audit vault. Every override, block, and telemetry alert referenced herein is bound by SHA-256 hash to its source record. Chain of custody — request, generation, and each download — is recorded as an append-only vault entry; this pack's generation was committed to the vault before it was offered for download (MANIFEST vault_entry_id). The MANIFEST.json inside this ZIP conforms to Evidence Pack Spec v1 and can be re-verified fully offline by anyone with the MIT-licensed finguard-verify CLI — no vendor callback.",
    pw - 120,
  );
  pdf.text(attest, 56, c.y + 38);
  c.y += 138;

  // SECTION 1 · Snapshot — headlines on the cover, no page-turn needed.
  sectionHeader(pdf, c, "Section 1", "Snapshot");
  kv(pdf, c, [
    ["Defensibility score", `${score} / 100`],
    ["Estimated response time", `${hoursDisplay} hours`],
    ["Governed agents", `${agents.length - unmanaged} of ${agents.length}`],
    ["Guardrail events", String(events.length)],
    ["Overrides signed", `${withJust} of ${softFlags} soft flags`],
  ]);
  footer(pdf, c);

  // SECTION 2 · Executive summary
  pdf.addPage();
  c.page += 1;
  c.y = 60;
  sectionHeader(pdf, c, "Section 2", "Executive summary");
  kv(pdf, c, [
    ["Produced by", producedByLine],
    ["Requested at", requestedHuman],
    ["Generated at", stampHuman],
    ["Defensibility score", `${score} / 100`],
    ["Estimated response time", `${hoursDisplay} hours`],
    ["Governed agents", `${agents.length - unmanaged} of ${agents.length}`],
    ["Unmanaged agents", String(unmanaged)],
    ["Guardrail events snapshotted", String(events.length)],
    ["Overrides with signed justification", `${withJust} of ${softFlags}`],
    ["Vault entries in snapshot", String(vault.length + 1)],
  ]);

  h2(pdf, c, "Top defensibility gaps");
  const gapCandidates = defensibilityDims
    .map((d) => ({ label: d.label, ...dimScores[d.key] }))
    .filter((d) => d.score < 90)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  if (gapCandidates.length === 0) {
    paragraph(pdf, c, "No dimension below 90. Maintain current cadence.");
  } else {
    for (const g of gapCandidates) {
      paragraph(pdf, c, `• ${g.label} — ${g.score}/100. ${g.notes}`);
    }
  }

  // Inline overrides callout — no dedicated empty page anymore.
  h2(pdf, c, "Overrides");
  if (overrides.length === 0) {
    paragraph(
      pdf,
      c,
      "N/A — 0 business-justification overrides in this snapshot window.",
      { color: PDF.MUTED, size: 9 },
    );
  } else {
    paragraph(
      pdf,
      c,
      `${overrides.length} business-justification override(s) signed against the current guardrail feed. Each row is cryptographically bound to an audit_vault entry — see 04_overrides.csv for the full ledger.`,
      { color: PDF.MUTED, size: 9 },
    );
  }
  footer(pdf, c);

  // SECTION 3 · Overrides timeline — only if we actually have overrides.
  if (overrides.length > 0) {
    pdf.addPage();
    c.page += 1;
    c.y = 60;
    sectionHeader(pdf, c, "Section 3", "Overrides timeline");
    const grouped = new Map<string, OverrideEvent[]>();
    for (const o of overrides) {
      const day = new Date(o.created_at).toISOString().slice(0, 10);
      const arr = grouped.get(day) ?? [];
      arr.push(o);
      grouped.set(day, arr);
    }
    const days = Array.from(grouped.keys()).sort().reverse();
    for (const day of days) {
      ensureSpace(pdf, c, 30);
      h2(pdf, c, day);
      const rows = (grouped.get(day) ?? []).map((o) => {
        const ev = events.find((e) => e.id === o.event_id);
        return [
          o.event_id,
          ev?.agent_name ?? "—",
          `${o.user_display_name} (${o.user_role.toUpperCase()})`,
          o.justification.length > 90 ? o.justification.slice(0, 87) + "…" : o.justification,
          o.evidence_hash.slice(0, 12),
        ];
      });
      table(
        pdf,
        c,
        ["Event", "Agent", "Signer", "Justification", "Hash"],
        rows,
        [70, 110, 110, 200, 42],
      );
    }
    footer(pdf, c);
  }

  // SECTION 3/4 · Defensibility gap analysis
  pdf.addPage();
  c.page += 1;
  c.y = 60;
  const gapSectionLabel = overrides.length > 0 ? "Section 4" : "Section 3";
  sectionHeader(pdf, c, gapSectionLabel, "Defensibility gap analysis");
  for (const d of defensibilityDims) {
    const s = dimScores[d.key];
    bar(pdf, c, s.score, d.label, s.notes);
    paragraph(pdf, c, "Remediation: " + s.remediation, { color: PDF.MUTED, size: 8.5 });
    c.y += 4;
  }
  footer(pdf, c);

  // SECTION 4/5 · Chain of custody + real manifest table
  pdf.addPage();
  c.page += 1;
  c.y = 60;
  const custodyLabel = overrides.length > 0 ? "Section 5" : "Section 4";
  sectionHeader(pdf, c, custodyLabel, "Chain of custody");
  kv(pdf, c, [
    ["Vault entry — requested", `${requestHash.slice(0, 24)}…`],
    ["Vault entry — generated", `${packHash.slice(0, 24)}…`],
    ["Requester", producedByLine],
    ["Downloads", "Each download appends a new vault entry (see mock_exam_downloads)."],
  ]);
  h2(pdf, c, "Recent vault activity (last 20)");
  table(
    pdf,
    c,
    ["When", "Kind", "Actor", "Hash"],
    vault.slice(0, 20).map((v) => [
      formatUtc(v.created_at),
      v.kind,
      v.actor_display_name ?? "—",
      v.hash.slice(0, 12),
    ]),
    [130, 170, 130, 62],
  );

  // Manifest table — the real thing, not a "see MANIFEST.json" stub.
  h2(pdf, c, "Manifest (SHA-256, first 16 chars)");
  table(
    pdf,
    c,
    ["File", "Bytes", "SHA-256"],
    manifestForPdf.map((m) => [
      m.name,
      "bytes" in m && typeof m.bytes === "number" ? m.bytes.toLocaleString() : "—",
      "sha" in m && m.sha ? m.sha.slice(0, 16) + "…" : (m as { note?: string }).note ?? "—",
    ]),
    [180, 70, 232],
  );
  footer(pdf, c);

  // Serialize PDF
  const pdfArrayBuffer = pdf.output("arraybuffer");
  const pdfBytes = new Uint8Array(pdfArrayBuffer);

  // --- TWO-PHASE CUSTODY (Spec v1 §5) ----------------------------------------
  // Phase 1: pack_hash is final (computed from attested bytes above). Commit
  // the exam row and the "generated" vault entry BEFORE the pack becomes
  // downloadable, and reference the committed vault id from the MANIFEST.
  const generationMs = Math.round(performance.now() - started);

  const { data: examRow, error: examErr } = await supabase
    .from("mock_exams")
    .insert({
      run_by: user.userId,
      run_by_name: actorLabel(user),
      hours: Number(hoursDisplay),
      score,
      agent_count: agents.length,
      event_count: events.length,
      override_count: withJust,
      pack_hash: packHash,
      requested_at: requestedAtIso,
      generation_ms: generationMs,
      filename,
    })
    .select("id")
    .single();
  if (examErr) throw examErr;

  const { data: vaultRow, error: vaultErr } = await supabase
    .from("audit_vault")
    .insert({
      hash: packHash,
      kind: "Mock exam evidence pack",
      ref: filename,
      actor_id: user.userId,
      actor_display_name: actorLabel(user),
      payload: {
        exam_id: examRow.id,
        request_hash: requestHash,
        generation_ms: generationMs,
        snapshot_id: snapshotId,
        pack_spec_version: PACK_SPEC_VERSION,
        score,
        hours: Number(hoursDisplay),
        counts: { agents: agents.length, events: events.length, overrides: withJust },
      },
    })
    .select("id")
    .single();
  if (vaultErr) throw vaultErr;

  // Phase 2: build the Spec v1 MANIFEST referencing the committed vault entry.
  // The cover PDF is informational — jsPDF output is not byte-deterministic,
  // so it is listed + hashed but sits outside the pack_hash preimage (Spec §4).
  const specManifest: Manifest = await buildManifest({
    generator: { name: "finguard", version: "2.1.0" },
    snapshot_id: snapshotId,
    producer,
    generated_at: stampIso,
    requested_at: requestedAtIso,
    attestedFiles: attestedFiles,
    informationalFiles: new Map([["00_cover.pdf", pdfBytes]]),
    vault_entry_id: vaultRow.id,
  });
  if (specManifest.pack_hash !== packHash) {
    throw new Error("pack_hash drift between custody phases — refusing to build");
  }
  const manifestBytes = encoder.encode(serializeManifest(specManifest));
  const manifestSha = await hashBytes(manifestBytes);

  const manifest: ManifestEntry[] = [
    ...specManifest.attested_files,
    ...specManifest.informational_files,
  ].sort((a, b) => a.name.localeCompare(b.name));

  // Record the manifest on the exam row (non-fatal if it lags).
  await supabase
    .from("mock_exams")
    .update({
      manifest: JSON.parse(
        JSON.stringify({
          files: manifest,
          manifest_sha256: manifestSha,
          vault_entry_id: vaultRow.id,
          pack_spec_version: PACK_SPEC_VERSION,
        }),
      ),
    })
    .eq("id", examRow.id);

  const zip = new JSZip();
  zip.file("MANIFEST.json", manifestBytes);
  zip.file("VERIFY.md", encoder.encode(VERIFY_MD));
  zip.file("SPEC.md", encoder.encode(SPEC_MD));
  zip.file("UPGRADE.md", encoder.encode(UPGRADE_MD));
  zip.file("00_cover.pdf", pdfBytes);
  for (const f of dataFiles) zip.file(f.name, f.bytes);

  const zipBlob = await zip.generateAsync({ type: "blob" });

  return {
    examId: examRow.id,
    hours,
    score,
    agentCount: agents.length,
    eventCount: events.length,
    overrideCount: withJust,
    packHash,
    manifest,
    generationMs,
    zipBlob,
    filename,
  };
}

/**
 * Download an evidence pack while logging the download to the append-only
 * chain-of-custody ledger. Every download — including re-downloads and
 * regulator playback — creates a new mock_exam_downloads row plus a vault
 * entry, so the ledger is complete without relying on client-side memory.
 */
export async function downloadExamPack(opts: {
  examId: string;
  packHash: string;
  filename: string;
  blob: Blob;
  user: CurrentUser;
}) {
  const { examId, packHash, filename, blob, user } = opts;
  const nowIso = new Date().toISOString();
  const evidenceHash = await sha256Hex(
    `download|${examId}|${user.userId}|${packHash}|${nowIso}`,
  );

  const { error: dlErr } = await supabase.from("mock_exam_downloads").insert({
    exam_id: examId,
    downloaded_by: user.userId,
    downloaded_by_name: actorLabel(user),
    downloaded_by_role: user.role,
    pack_hash: packHash,
    evidence_hash: evidenceHash,
  });
  if (dlErr) throw dlErr;

  await supabase.from("audit_vault").insert({
    hash: evidenceHash,
    kind: "Mock exam pack downloaded",
    ref: filename,
    actor_id: user.userId,
    actor_display_name: actorLabel(user),
    payload: {
      exam_id: examId,
      pack_hash: packHash,
      downloaded_at: nowIso,
      downloader_role: user.role,
    },
  });

  downloadBlob(blob, filename);
}

// ---------------------------------------------------------------------------
// Verify Evidence Pack
// ---------------------------------------------------------------------------

export interface VerifyCheck {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface VerifyResult {
  ok: boolean;
  checks: VerifyCheck[];
  packHash?: string;
  exam?: MockExam;
  vaultEntry?: VaultEntry;
  downloads?: number;
  requestVaultEntry?: VaultEntry;
}

/**
 * Verify a downloaded evidence pack against the audit vault.
 * - Unzips MANIFEST.json
 * - Recomputes SHA-256 of every listed file from the ZIP
 * - Recomputes pack_hash from the manifest metadata
 * - Cross-references audit_vault + mock_exams for the recorded run
 *
 * Verification never mutates the vault.
 */
export async function verifyEvidencePack(file: File | Blob): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file("MANIFEST.json");
  if (!manifestFile) {
    return {
      ok: false,
      checks: [{ label: "MANIFEST.json present", ok: false, detail: "Missing from ZIP." }],
    };
  }
  checks.push({ label: "MANIFEST.json present", ok: true });

  const manifestText = await manifestFile.async("string");
  let parsedManifest: {
    pack_spec_version?: string;
    pack_hash: string;
    generated_at: string;
    requested_at?: string;
    produced_by?: string;
    files?: ManifestEntry[];
  };
  try {
    parsedManifest = JSON.parse(manifestText);
  } catch {
    return {
      ok: false,
      checks: [...checks, { label: "MANIFEST.json parseable", ok: false }],
    };
  }
  checks.push({ label: "MANIFEST.json parseable", ok: true });

  if (parsedManifest.pack_spec_version) {
    // Spec v1 pack — verify with the exact same module the finguard-verify
    // CLI is built from (@finguard/pack-spec), so in-app and offline
    // verification can never disagree.
    const filesMap = new Map<string, Uint8Array>();
    for (const [name, zf] of Object.entries(zip.files)) {
      if (!zf.dir) filesMap.set(name.split("/").pop()!, await zf.async("uint8array"));
    }
    const report = await verifyPack(filesMap);
    checks.push({
      label: `Evidence Pack Spec v${report.spec_version} supported`,
      ok: report.spec_supported,
    });
    const badFiles = report.files.filter((f) => !f.ok);
    checks.push({
      label: `Per-file SHA-256 matches (${report.files.length} files)`,
      ok: badFiles.length === 0,
      detail: badFiles.length
        ? badFiles.map((f) => `${f.name}${f.present ? " (hash mismatch)" : " (missing)"}`).join(", ")
        : undefined,
    });
    checks.push({
      label: "Canonical pack hash consistent (Spec §3)",
      ok: report.pack_hash_ok,
      detail: report.pack_hash_ok
        ? undefined
        : `Manifest says ${report.expected_pack_hash.slice(0, 12)}…, recomputed ${report.computed_pack_hash.slice(0, 12)}…`,
    });
    checks.push({
      label: "Signature",
      ok: report.signature !== "signed-invalid",
      detail:
        report.signature === "unsigned-demo"
          ? "ABSENT — unsigned demo pack (production packs are Ed25519-signed)"
          : report.signature,
    });
  } else {
    // Legacy (pre-Spec v1) pack — original data-files-only formula, kept so
    // historical packs remain verifiable.
    let filesOk = true;
    const mismatched: string[] = [];
    for (const entry of parsedManifest.files ?? []) {
      const zf = zip.file(entry.name);
      if (!zf) {
        filesOk = false;
        mismatched.push(`${entry.name} (missing)`);
        continue;
      }
      const bytes = await zf.async("uint8array");
      const actual = await hashBytes(bytes);
      if (actual !== entry.sha256) {
        filesOk = false;
        mismatched.push(`${entry.name} (hash mismatch)`);
      }
    }
    checks.push({
      label: `Per-file SHA-256 matches (${(parsedManifest.files ?? []).length} files)`,
      ok: filesOk,
      detail: filesOk ? undefined : mismatched.join(", "),
    });

    const legacyDataFiles = (parsedManifest.files ?? []).filter((f) => f.name !== "00_cover.pdf");
    const recomputed = await sha256Hex(
      JSON.stringify({
        provisional: true,
        files: legacyDataFiles
          .map((f) => [f.name, f.sha256] as const)
          .sort(([a], [b]) => a.localeCompare(b)),
        generated_at: parsedManifest.generated_at,
        produced_by: parsedManifest.produced_by,
      }),
    );
    const packHashOk = recomputed === parsedManifest.pack_hash;
    checks.push({
      label: "Pack hash consistent with manifest (legacy format)",
      ok: packHashOk,
      detail: packHashOk
        ? undefined
        : `Manifest says ${parsedManifest.pack_hash.slice(0, 12)}…, recomputed ${recomputed.slice(0, 12)}…`,
    });
  }

  const manifestJson = parsedManifest;

  // Vault lookup
  const { data: vaultEntry } = await supabase
    .from("audit_vault")
    .select("*")
    .eq("hash", manifestJson.pack_hash)
    .maybeSingle();
  const vaultOk = !!vaultEntry;
  checks.push({
    label: "Pack hash anchored in audit vault",
    ok: vaultOk,
    detail: vaultOk ? undefined : "No vault entry with this pack hash — pack may be forged or from another environment.",
  });

  // Exam row
  const { data: exam } = await supabase
    .from("mock_exams")
    .select("*")
    .eq("pack_hash", manifestJson.pack_hash)
    .maybeSingle();
  const examOk = !!exam;
  checks.push({
    label: "Exam run recorded in mock_exams",
    ok: examOk,
    detail: examOk ? `Run by ${exam.run_by_name} at ${exam.created_at}` : undefined,
  });

  // Request vault entry
  let requestVaultEntry: VaultEntry | undefined;
  if (vaultEntry) {
    const payload = vaultEntry.payload as { request_hash?: string } | null;
    const reqHash = payload?.request_hash;
    if (reqHash) {
      const { data } = await supabase
        .from("audit_vault")
        .select("*")
        .eq("hash", reqHash)
        .maybeSingle();
      if (data) requestVaultEntry = data as VaultEntry;
    }
  }

  // Download count
  let downloads = 0;
  if (exam) {
    const { count } = await supabase
      .from("mock_exam_downloads")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", exam.id);
    downloads = count ?? 0;
  }

  const ok = checks.every((c) => c.ok);

  return {
    ok,
    checks,
    packHash: manifestJson.pack_hash,
    exam: exam ? (exam as MockExam) : undefined,
    vaultEntry: vaultEntry ? (vaultEntry as VaultEntry) : undefined,
    requestVaultEntry,
    downloads,
  };
}

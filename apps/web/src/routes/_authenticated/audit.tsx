import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  FileCheck2,
  Play,
  Fingerprint,
  Timer,
  Lock,
  Loader2,
  Download,
  ShieldCheck,
  ShieldAlert,
  Upload,
  History,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Panel, Stat, Bar } from "@/components/panel";
import { OutcomeKpiBoard } from "@/components/audit/OutcomeKpiBoard";
import { UpgradeCta } from "@/components/UpgradeCta";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { FilterBar } from "@/components/filter-bar";
import { defensibilityDims, mockExamHistory } from "@/lib/mock-data";
import {
  useAgents,
  useCurrentUser,
  useExamDownloads,
  useGuardrailEvents,
  useMockExams,
  useOverrides,
  useVault,
  type MockExam,
} from "@/lib/queries";
import { shortHash } from "@/lib/audit";
import {
  downloadExamPack,
  runMockExam,
  verifyEvidencePack,
  type ExamResult,
  type VerifyResult,
} from "@/lib/evidence-pack";
import { downloadCsv } from "@/lib/csv";
import { emptyFilters, inRange, type FilterState } from "@/lib/filters";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Defensibility — Cognita FinGuard" }] }),
  component: Audit,
});

function Audit() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const agents = useAgents();
  const events = useGuardrailEvents();
  const overrides = useOverrides();
  const vault = useVault(500);
  const exams = useMockExams(50);
  const downloads = useExamDownloads();

  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ExamResult | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Verify pack state
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const agentList = agents.data ?? [];
  const eventList = events.data ?? [];
  const overrideList = overrides.data ?? [];
  const vaultList = vault.data ?? [];
  const examList = exams.data ?? [];
  const downloadList = downloads.data ?? [];

  const shownVault = useMemo(() => {
    const q = filters.query.toLowerCase();
    return vaultList.filter((v) => {
      if (filters.kinds.length && !filters.kinds.includes(v.kind)) return false;
      if (!inRange(v.created_at, filters)) return false;
      if (q) {
        const hay = `${v.kind} ${v.ref} ${v.actor_display_name ?? ""} ${v.hash}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vaultList, filters]);

  const shownExams = useMemo(() => {
    return examList.filter((e) => {
      if (!inRange(e.created_at, filters)) return false;
      const q = filters.query.toLowerCase();
      if (q) {
        const hay = `${e.run_by_name} ${e.pack_hash} ${e.filename ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [examList, filters]);

  if (agents.isLoading || events.isLoading || overrides.isLoading || vault.isLoading || !user) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const canRun = user.role === "ciso";

  const unmanaged = agentList.filter((a) => a.status === "unmanaged").length;
  const softFlags = eventList.filter((e) => e.action === "soft_flag").length;
  const coverage = agentList.length === 0 ? 0 : ((agentList.length - unmanaged) / agentList.length) * 100;
  const overrideCoverage = softFlags === 0 ? 100 : Math.min(100, (overrideList.length / softFlags) * 100);
  const score = Math.max(60, Math.min(99, Math.round(0.55 * coverage + 0.35 * overrideCoverage + 10)));

  const dimScores: Record<string, { score: number; notes: string }> = {
    chain_of_custody: { score: Math.round(coverage), notes: `${agentList.length - unmanaged}/${agentList.length} agents logged to vault` },
    override_completeness: { score: Math.round(overrideCoverage), notes: `${overrideList.length}/${softFlags} soft flags justified` },
    telemetry_latency: { score: 94, notes: "p99 alert latency 41ms (SLA: 50ms)" },
    model_card_currency: { score: 78, notes: "22 models with cards >90d stale" },
    unmanaged_remediation: { score: Math.max(20, 100 - unmanaged * 20), notes: `${unmanaged} unmanaged agent(s) pending owner assignment` },
    statute_mapping: { score: 89, notes: "Rules mapped to SEC 17a-4, FINRA 2210, SR 11-7" },
  };

  const runExam = async () => {
    if (!user) return;
    setRunning(true);
    const toastId = toast.loading("Regulator Simulator running…");
    try {
      const result = await runMockExam(user);
      setLastResult(result);
      toast.success("Mock SEC Exam complete", {
        id: toastId,
        description: `${result.hours.toFixed(1)}h simulated · ${result.score}/100 · pack ${shortHash(result.packHash)}`,
      });
      // Auto-log first download
      await downloadExamPack({
        examId: result.examId,
        packHash: result.packHash,
        filename: result.filename,
        blob: result.zipBlob,
        user,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["mock_exams"] }),
        qc.invalidateQueries({ queryKey: ["mock_exam_downloads"] }),
        qc.invalidateQueries({ queryKey: ["audit_vault"] }),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Exam failed";
      toast.error(msg, { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  const redownload = async () => {
    if (!lastResult || !user) return;
    try {
      await downloadExamPack({
        examId: lastResult.examId,
        packHash: lastResult.packHash,
        filename: lastResult.filename,
        blob: lastResult.zipBlob,
        user,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["mock_exam_downloads"] }),
        qc.invalidateQueries({ queryKey: ["audit_vault"] }),
      ]);
      toast.success("Download logged to chain of custody");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download log failed";
      toast.error(msg);
    }
  };

  // ------- Filtering vault + exams --------------------------------------
  const vaultKinds = Array.from(new Set(vaultList.map((v) => v.kind))).sort();

  const chartData = [
    ...mockExamHistory,
    ...examList
      .slice()
      .reverse()
      .map((e) => ({
        month: new Date(e.created_at).toLocaleString([], { month: "short", day: "numeric" }),
        hours: Number(e.hours),
        score: e.score,
      })),
  ].slice(-8);

  const downloadsByExam = new Map<string, typeof downloadList>();
  for (const d of downloadList) {
    const arr = downloadsByExam.get(d.exam_id) ?? [];
    arr.push(d);
    downloadsByExam.set(d.exam_id, arr);
  }

  const runVerify = async (file: File) => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifyEvidencePack(file);
      setVerifyResult(result);
      if (result.ok) toast.success("Evidence pack verified");
      else toast.error("Evidence pack failed verification");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verify failed";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Toaster theme="dark" position="top-right" />

      <header>
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Module 3 · Continuous Audit Defensibility
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          From a 3-week frantic data hunt to a 4-hour document production
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Running the Mock SEC Exam produces a regulator-ready ZIP with a
          multi-section signed PDF, machine-readable manifests, CSVs, and a
          MANIFEST.json bound to a pack hash — every generation and every
          download appends a tamper-evident entry to the vault.
        </p>
      </header>

      <OutcomeKpiBoard />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Defensibility Score" value={`${score}/100`} sub="Live from row counts" accent="var(--severity-ok)" />
        <Stat label="Vault Entries" value={vaultList.length} sub="Chain-of-custody hashes" />
        <Stat label="Overrides Recorded" value={overrideList.length} sub="Signed justifications" accent="var(--severity-medium)" />
        <Stat label="Pack Downloads" value={downloadList.length} sub={`${examList.length} exams generated`} accent="var(--tier-3)" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel eyebrow="Continuous scoring · live" title="Defensibility Gap Report">
          <div className="space-y-4">
            {defensibilityDims.map((d) => {
              const s = dimScores[d.key];
              const color = s.score >= 90 ? "var(--severity-ok)" : s.score >= 75 ? "var(--severity-medium)" : "var(--severity-high)";
              return (
                <div key={d.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-foreground">{d.label}</span>
                    <span className="mono text-sm font-semibold tabular-nums" style={{ color }}>{s.score}</span>
                  </div>
                  <div className="mt-1.5"><Bar value={s.score} color={color} /></div>
                  <div className="mono mt-1 text-[11px] text-muted-foreground">{s.notes}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel eyebrow="Regulator-ready evidence pack" title="Mock SEC Exam"
            action={
              canRun ? (
                <div className="flex gap-2">
                  <Button size="sm" className="mono text-[10px] uppercase tracking-widest" onClick={runExam} disabled={running}>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    {running ? "Running…" : "Run & Download"}
                  </Button>
                  {lastResult && (
                    <Button size="sm" variant="secondary" className="mono text-[10px] uppercase tracking-widest" onClick={redownload}>
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Re-download
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mono flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" /> CISO only
                </div>
              )
            }>
            <p className="text-xs text-muted-foreground">
              Produces <span className="text-foreground">finguard-evidence-*.zip</span>{" "}
              — signed cover PDF with exec summary, overrides timeline, and
              defensibility gap sections, plus CSVs and a{" "}
              <span className="mono">MANIFEST.json</span> bound to the pack hash.
              Every generation and download appends to{" "}
              <span className="mono">audit_vault</span>.
            </p>
            <div className="mt-4 grid grid-cols-8 gap-1.5">
              {chartData.map((m, i) => (
                <div key={i} className="text-center">
                  <div className="flex h-20 items-end">
                    <div className="w-full rounded-t" style={{ height: `${(m.score / 100) * 100}%`, background: `color-mix(in oklab, var(--tier-3) ${40 + m.score / 3}%, transparent)` }} />
                  </div>
                  <div className="mono mt-1 text-[9px] text-muted-foreground truncate">{m.month}</div>
                  <div className="mono text-[10px] font-medium tabular-nums text-foreground">{m.score}</div>
                </div>
              ))}
            </div>
            {lastResult && (
              <div className="mono mt-4 flex items-center gap-2 rounded-sm border p-2 text-[11px]"
                style={{ borderColor: "color-mix(in oklab, var(--severity-ok) 40%, transparent)", background: "color-mix(in oklab, var(--severity-ok) 8%, transparent)", color: "var(--severity-ok)" }}>
                <Timer className="h-3.5 w-3.5" />
                Pack {shortHash(lastResult.packHash)} · {lastResult.hours.toFixed(1)}h · {lastResult.score}/100 · {lastResult.manifest.length} files · {lastResult.generationMs}ms
              </div>
            )}
          </Panel>

          <VerifyPackCard
            onFile={runVerify}
            verifying={verifying}
            result={verifyResult}
            fileRef={fileRef}
          />

          <UpgradeCta surface="audit-post-exam" />
        </div>
      </div>

      <Panel eyebrow="Chain-of-custody · append-only" title="Immutable Vault">
        <div className="mb-4">
          <FilterBar
            storageKey="finguard.filters.vault"
            options={{
              kinds: vaultKinds,
              showDate: true,
              showQuery: true,
              queryPlaceholder: "Search hash, kind, actor…",
            }}
            totalCount={vaultList.length}
            filteredCount={shownVault.length}
            onChange={setFilters}
            exports={[
              {
                label: `Filtered vault (${shownVault.length})`,
                onClick: (suffix) =>
                  downloadCsv(
                    shownVault.map((v) => ({
                      id: v.id,
                      hash: v.hash,
                      kind: v.kind,
                      ref: v.ref,
                      actor: v.actor_display_name,
                      created_at: v.created_at,
                    })),
                    `audit-vault${suffix}.csv`,
                  ),
              },
              {
                label: `All vault (${vaultList.length})`,
                onClick: () =>
                  downloadCsv(
                    vaultList.map((v) => ({
                      id: v.id,
                      hash: v.hash,
                      kind: v.kind,
                      ref: v.ref,
                      actor: v.actor_display_name,
                      created_at: v.created_at,
                    })),
                    "audit-vault_all.csv",
                  ),
              },
              {
                label: `Mock exams (${examList.length})`,
                onClick: () =>
                  downloadCsv(
                    examList.map((e) => ({
                      id: e.id,
                      when: e.created_at,
                      run_by: e.run_by_name,
                      score: e.score,
                      hours: e.hours,
                      generation_ms: e.generation_ms,
                      pack_hash: e.pack_hash,
                      filename: e.filename,
                    })),
                    "mock-exams_all.csv",
                  ),
              },
              {
                label: `Pack downloads (${downloadList.length})`,
                onClick: () =>
                  downloadCsv(
                    downloadList.map((d) => ({ ...d })),
                    "pack-downloads_all.csv",
                  ),
              },
            ]}
          />
        </div>
        {shownVault.length === 0 ? (
          <div className="mono text-[11px] text-muted-foreground">No vault entries match the filters.</div>
        ) : (
          <ul className="divide-y divide-border">
            {shownVault.slice(0, 40).map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <Fingerprint className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                <span className="mono w-24 shrink-0 text-[11px] text-foreground">{shortHash(v.hash)}</span>
                <div className="min-w-0 flex-1">
                  <div className="mono truncate text-[11px] text-foreground/85">{v.kind}</div>
                  <div className="mono truncate text-[10px] text-muted-foreground">
                    {v.ref}{v.actor_display_name && <> · {v.actor_display_name}</>}
                  </div>
                </div>
                <span className="mono hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
                  {new Date(v.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {shownVault.length > 40 && (
          <div className="mono mt-2 text-[10px] text-muted-foreground">
            Showing first 40 of {shownVault.length}. Export CSV for full list.
          </div>
        )}
      </Panel>

      <Panel eyebrow="Chain of custody · per exam" title="Mock SEC Exam runs">
        {shownExams.length === 0 ? (
          <div className="mono text-[11px] text-muted-foreground">No exams recorded yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {shownExams.map((e) => {
              const dls = downloadsByExam.get(e.id) ?? [];
              const open = expanded === e.id;
              return (
                <li key={e.id} className="py-3 first:pt-0 last:pb-0">
                  <button
                    onClick={() => setExpanded(open ? null : e.id)}
                    aria-label={open ? "Collapse exam details" : "Expand exam details"}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <FileCheck2 className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="mono text-[11px] text-foreground">{shortHash(e.pack_hash)}</span>
                        <span className="text-xs text-foreground/90">{e.run_by_name}</span>
                        <span className="mono text-[10px] text-muted-foreground">· {new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mono mt-0.5 text-[10px] text-muted-foreground">
                        {e.score}/100 · {Number(e.hours).toFixed(1)}h · gen {e.generation_ms ?? "?"}ms · {dls.length} download{dls.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="mono mt-3 ml-6 space-y-2 rounded-sm border border-border bg-muted/30 p-3 text-[11px]">
                      <div className="flex gap-2">
                        <span className="w-24 text-muted-foreground">Requester</span>
                        <span className="text-foreground">{e.run_by_name}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-24 text-muted-foreground">Requested at</span>
                        <span className="text-foreground">{new Date(e.requested_at).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-24 text-muted-foreground">Generated at</span>
                        <span className="text-foreground">{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-24 text-muted-foreground">Pack hash</span>
                        <span className="break-all text-foreground/90">{e.pack_hash}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-24 text-muted-foreground">Filename</span>
                        <span className="text-foreground/90">{e.filename ?? "—"}</span>
                      </div>
                      <div className="border-t border-border pt-2">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                          <History className="h-3 w-3" /> Download ledger
                        </div>
                        {dls.length === 0 ? (
                          <div className="text-muted-foreground">No downloads recorded.</div>
                        ) : (
                          <ul className="space-y-1">
                            {dls.map((d) => (
                              <li key={d.id} className="flex flex-wrap items-center gap-2">
                                <span className="text-foreground">{d.downloaded_by_name}</span>
                                <span className="rounded-sm border border-border px-1 text-[9px] uppercase text-muted-foreground">{d.downloaded_by_role}</span>
                                <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                                <span className="text-foreground/70">· {shortHash(d.evidence_hash)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verify pack card
// ---------------------------------------------------------------------------

function VerifyPackCard({
  onFile,
  verifying,
  result,
  fileRef,
}: {
  onFile: (f: File) => void;
  verifying: boolean;
  result: VerifyResult | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <Panel
      eyebrow="Regulator on-demand · non-mutating"
      title="Verify Evidence Pack"
      action={
        <div className="mono flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" style={{ color: "var(--severity-ok)" }} /> Read-only
        </div>
      }
    >
      <p className="text-xs text-muted-foreground">
        Drop a <span className="mono">finguard-evidence-*.zip</span> to
        recompute per-file SHA-256 hashes, rebuild the pack hash from
        MANIFEST.json, and cross-check it against{" "}
        <span className="mono">audit_vault</span> and{" "}
        <span className="mono">mock_exams</span>.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={
          "mono mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-sm border border-dashed p-4 text-[11px] transition-colors " +
          (dragOver
            ? "border-accent bg-accent/10 text-accent"
            : "border-border text-muted-foreground hover:border-accent/60 hover:text-foreground")
        }
      >
        <Upload className="h-4 w-4" />
        <span>{verifying ? "Verifying…" : "Drop ZIP or click to browse"}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>

      {result && (
        <div
          className="mt-3 space-y-2 rounded-sm border p-3 text-[11px]"
          style={{
            borderColor: result.ok
              ? "color-mix(in oklab, var(--severity-ok) 45%, transparent)"
              : "color-mix(in oklab, var(--severity-high) 45%, transparent)",
            background: result.ok
              ? "color-mix(in oklab, var(--severity-ok) 8%, transparent)"
              : "color-mix(in oklab, var(--severity-high) 8%, transparent)",
          }}
        >
          <div className="mono flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: result.ok ? "var(--severity-ok)" : "var(--severity-high)" }}>
            {result.ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {result.ok ? "Verified — regulator ready" : "Verification failed"}
          </div>
          <ul className="mono space-y-1 text-[11px]">
            {result.checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: c.ok ? "var(--severity-ok)" : "var(--severity-high)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground/90">{c.label}</div>
                  {c.detail && <div className="text-[10px] text-muted-foreground">{c.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
          {result.exam && <VerifiedExamMeta exam={result.exam} downloads={result.downloads ?? 0} />}
        </div>
      )}
    </Panel>
  );
}

function VerifiedExamMeta({ exam, downloads }: { exam: MockExam; downloads: number }) {
  return (
    <div className="mono mt-2 space-y-0.5 border-t border-border pt-2 text-[10px] text-muted-foreground">
      <div>
        <span className="text-foreground/80">Requester:</span> {exam.run_by_name}
      </div>
      <div>
        <span className="text-foreground/80">Requested:</span>{" "}
        {new Date(exam.requested_at).toLocaleString()}
      </div>
      <div>
        <span className="text-foreground/80">Generated:</span>{" "}
        {new Date(exam.created_at).toLocaleString()} · {exam.generation_ms ?? "?"}ms
      </div>
      <div>
        <span className="text-foreground/80">Downloads on record:</span> {downloads}
      </div>
    </div>
  );
}

# FinGuard — Outcome-Driven Engineering (ODE)

Outcome-Driven Engineering inverts the "ship features" loop: commit to a
regulator-visible outcome, instrument it, and let the outcome pull the
backlog. This document is the source of truth for what FinGuard is trying
to move, how we measure it, and how work maps to it.

## North-star outcome

> **SEC exam evidence is producible in < 4 hours, defensibly, on any given
> trading day.**

Every sub-outcome, KPI, feature, and PR must be traceable back to this
sentence.

## Outcome tree

```text
North-star:  "SEC exam evidence is producible in < 4 hours,
              defensibly, on any given trading day."
    │
    ├── A. Every Tier-1 agent is discoverable + owned within 24h
    │       KPI: unmanaged_agent_age_p95 < 24h
    │
    ├── B. Every soft-flag has a signed justification within 5 BD
    │       KPI: override_coverage_pct ≥ 95
    │
    ├── C. Any evidence pack verifies offline
    │       KPI: verify_success_rate = 100%
    │            pack_size_p95      < 1 MB
    │
    ├── D. Chain-of-custody is unbroken from request → download
    │       KPI: vault_entry_gap_count = 0
    │
    ├── E. Zero critical database-linter findings on main
    │       KPI: critical_linter_findings = 0
    │
    ├── F. FinGuard demo converts qualified visitors to app.cognitagrc.io
    │       KPI: funnel_click_through_rate ≥ 0.03
    │
    └── G. Every deployment runs in two-plane, signed-pack mode within 12 months
            KPI: tenants_on_two_plane_pct → 100
```

Sub-outcomes F and G tie this repo to the paid product at
`app.cognitagrc.io` — see `docs/funnel.md` and `docs/harness.md`.


## SLO table

| Metric                        | Target      | Window | Source              |
| ----------------------------- | ----------- | ------ | ------------------- |
| `mock_exam_generation_ms_p95` | < 30 000 ms | 30 d   | `mock_exams`        |
| `verify_success_rate`         | = 100 %     | 30 d   | pack verify results |
| `pack_size_p95`               | < 1 048 576 | 30 d   | `mock_exams`        |
| `unmanaged_agent_age_p95`     | < 24 h      | live   | `agents`            |
| `override_coverage_pct`       | ≥ 95 %      | 30 d   | `override_events`   |
| `vault_entry_gap_count`       | 0           | live   | `audit_vault`       |
| `critical_linter_findings`    | 0           | daily  | manual / scanner    |
| `funnel_click_through_rate`   | ≥ 0.03      | 30 d   | `funnel_events`     |
| `tenants_on_two_plane_pct`    | → 100       | 30 d   | tenant registry (external) |

Values are recomputed nightly and stored in `outcome_kpis`; the `/audit`
dashboard renders the latest row per KPI plus a 30-day sparkline.

## FDE operating rules

1. **Every PR ties to exactly one sub-outcome KPI.** "Misc cleanup" is
   not a valid label. If a PR does not move a KPI, either add the KPI
   first or reject the PR.
2. **Weekly outcome review, not sprint review.** The KPI board on
   `/audit` is the agenda. CISO clients see the same numbers we do.
3. **Kill the feature if the KPI doesn't move.** Section 3 of the old
   evidence PDF was a feature that added zero signal when `overrides=0`
   — it was cut and inlined as a callout. Do that ruthlessly.
4. **Regulator dry-runs as acceptance tests.** Each release runs
   `runMockExam()` against synthetic + real data and diffs the pack
   against the last known-good. Any hash-changing diff needs a change
   record attached to the release.
5. **Security findings block the release train.** Sub-outcome E (zero
   critical linter findings) is a merge gate, not a nice-to-have.

## Backlog mapping (recent work)

| Change                                              | Sub-outcome |
| --------------------------------------------------- | ----------- |
| Evidence-pack audit: cover, manifest, size, custody | C, D        |
| `has_role` set to SECURITY INVOKER                  | E           |
| Section 3 collapsed to callout on empty overrides   | B           |
| CSV headers always emitted (`04_overrides.csv`)     | C           |
| Vault self-referential row inside pack              | D           |

## Known gaps → tracked as work

- **KPI table** (`outcome_kpis`) populated by a nightly job — required
  so the dashboard is data-driven, not code-driven.
- **Live KPI board on `/audit`** — surfaces the outcome tree above to
  clients in the same view they already use for evidence packs.
- **Regulator SDK** (offline `finguard verify` CLI + signed policy
  packs) — parked; see the FDE architecture doc.
- **CI enforcement of PR-to-KPI linkage** — parked; needs GitHub
  Actions.
- **SLO breach alerting** — parked; wire to Slack/email once
  `outcome_kpis` has 30d of history.

## How to add a new KPI

1. Add a row to the SLO table above.
2. Add the SQL that computes it to the nightly hook
   (`src/routes/api/public/hooks/compute-kpis.ts`).
3. Add the render entry to `src/components/audit/OutcomeKpiBoard.tsx`.
4. Backfill by invoking the hook once manually so the board is not
   empty on release day.

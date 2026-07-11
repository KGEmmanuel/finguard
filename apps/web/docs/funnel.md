# FinGuard as top-of-funnel for app.cognitagrc.io

FinGuard (this Lovable app) is positioned as the **free, hosted demo**
that qualifies buyers for the paid product at
[`app.cognitagrc.io/pricing`](https://app.cognitagrc.io/pricing).

## Funnel stages

```text
Visitor
   ↓
FinGuard demo (this app, public sign-up)
   ↓
Runs Mock SEC Exam
   ↓
Downloads watermarked evidence pack
   ↓
Clicks upgrade CTA
   ↓
app.cognitagrc.io/pricing  →  Trial  →  Signed contract
```

Instrumentation lives in the `funnel_events` table and in the
`funnel_click_through_rate` KPI (see `docs/outcomes.md`, sub-outcome F).

## What stays free (this app)

- Agent inventory, guardrail events, override capture.
- Mock SEC Exam with **watermarked** evidence pack (single cover-page
  line marking it as a demo pack).
- Public-tier KPI board (outcomes A–E).
- Offline verify against the demo public key.
- All source open at MIT — buyers can inspect the harness.

## What's paid at `app.cognitagrc.io`

- Signed policy pack subscription (SOC 2, ISO 42001, EU AI Act, NIST
  AI RMF), delivered on release cadence.
- **Inline enforce mode** for Tier-1 agents with break-glass.
- Two-plane deployment: control plane (SaaS) + client-data plane
  (customer VNet, Foundry Managed App).
- `finguard verify` CLI distributed directly to regulators, bundled
  Cognita public key.
- Cross-tenant benchmarks (anonymized aggregate KPIs).
- Enterprise SSO (Entra ID), SLA, named support, procurement paperwork.

## Upgrade CTA surfaces

| Surface           | Where                                    | UTM content        |
| ----------------- | ---------------------------------------- | ------------------ |
| `audit-post-exam` | `/audit`, above the vault                | `audit-post-exam`  |
| `sidebar-footer`  | Persistent, all authenticated pages      | `sidebar-footer`   |
| `pack-cover`      | Watermark line inside the evidence PDF   | (no click tracked) |

Every clickable CTA fires a beacon to
`POST /api/public/hooks/funnel-event` with `{ surface, kind }` before
navigating.

## Conversion goal

`funnel_click_through_rate ≥ 3%` of pack downloads → pricing clicks,
measured over rolling 30 days. Owned by the outcomes doc (sub-outcome
F).

# FinGuard Harness Architecture (FDE playbook)

The harness is the loop between FinGuard and the client's regulated
environment. Top-tier Forward-Deployed Engineers treat it as a
first-class product, not glue. This doc is the shape we build to.

> See `docs/outcomes.md` for the outcomes the harness serves. The harness
> exists so sub-outcomes A–E hold **inside a customer VNet** without
> exfiltrating data to Cognita.

## Two-plane diagram

```text
┌─────────────────── Client tenant (VNet / private) ──────────────────┐
│                                                                     │
│  [Agent telemetry]  →  [Ingress collector]  →  [Guardrail engine]   │
│         │                                              │            │
│         │                                              ▼            │
│         │                                    [Immutable audit vault]│
│         │                                              │            │
│         └────────► [Policy pack loader] ◄──────────────┤            │
│                                                        ▼            │
│                                            [Evidence pack builder]  │
│                                                        │            │
└────────────────────────────────────────────────────────┼────────────┘
                                                         │ signed pack
                                                         ▼
                                        [Regulator delivery channel]
                                     (email / SFTP / secure portal)
     ▲                                                   │
     │                                                   │
┌────┴──────── Cognita control plane (multi-tenant SaaS) ─────────────┐
│                                                                     │
│  [Policy pack registry]   [Model card registry]   [KPI service]     │
│  [Tenant provisioner]     [Telemetry aggregator]  [Benchmarks]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Plane responsibilities

| Concern                     | Client-data plane | Control plane |
| --------------------------- | :---------------: | :-----------: |
| Agent telemetry ingestion   | ✅ | — |
| Guardrail evaluation        | ✅ | — |
| Immutable audit vault       | ✅ | — |
| Evidence pack build + sign  | ✅ | — |
| Regulator delivery          | ✅ | — |
| Policy pack **authoring**   | — | ✅ |
| Policy pack **distribution**| pulls | serves signed |
| Model card registry         | mirrors | authoritative |
| Cross-tenant benchmarks     | — | ✅ (aggregated only) |
| Tenant provisioning         | — | ✅ |
| Outcome KPI aggregation     | local rollup | anonymized rollup |

Rule: **no raw event, prompt, or vault entry ever leaves the tenant.**
Only signed artifacts (evidence packs, policy pack acknowledgements) and
anonymized metric counts cross the boundary.

## Non-negotiables a top FDE bakes in from day one

### 1. Signed policy packs (Ed25519)

Each pack (SOC 2, ISO 42001, EU AI Act, NIST AI RMF) is a versioned,
Ed25519-signed bundle. The client-side loader pulls, verifies against
the bundled Cognita public key, and refuses to load on mismatch. This
is how the "curated packs" tier is sold without ever touching customer
data.

### 2. Deterministic, reproducible evidence

Same inputs + same policy pack version = byte-identical
`MANIFEST.json`. Regulators trust what they can re-derive. FinGuard is
already partway there: `pack_hash` is derived from data files only, so
regenerating the PDF does not invalidate the anchor. The remaining work
is stable serialization of every JSON/CSV and locking non-determinism
in the PDF layer.

### 3. Inline enforce mode, not monitor-only

For Tier-1 agents (execution, order-routing), the guardrail engine must
**block** — not just log. Break-glass is tied to the existing
signed-justification flow (`override_events`): an MD or CISO can force
through with a hash-anchored justification that lands in the vault
before the action proceeds. Monitor-only is the free-tier default;
enforce mode is the enterprise upgrade.

### 4. Regulator SDK

Ship a small `finguard verify pack.zip` CLI with a bundled Cognita
public key directly to regulators (OCC, FCA, MAS, SEC). They run our
CLI against our pack, offline, and get a green/red result. This alone
closes ~80% of exam meetings.

### 5. Data-never-leaves-tenant guarantee

Contractually and technically. Bank compliance (OCC 2013-29, FCA
SYSC 8.1, MAS OSPAR) requires vendors to demonstrate that customer
data does not leave regulated storage. Two-plane makes this an
architecture property, not a policy promise.

## Current FinGuard vs. target harness

| Property                 | Today (free demo)         | Target (enterprise)          |
| ------------------------ | ------------------------- | ---------------------------- |
| Deployment plane         | Single-plane (Lovable Cloud) | Two-plane (customer VNet + Cognita SaaS) |
| Enforcement mode         | Monitor-only              | Inline enforce for Tier-1 with break-glass |
| Policy packs             | Hardcoded in app          | Signed, versioned, remotely delivered |
| Evidence pack signing    | Pack hash only            | Detached Ed25519 + bundled public key |
| Regulator delivery       | Manual download           | SFTP / secure portal + `finguard verify` CLI |
| Vault storage            | Postgres append-only trigger | Azure SQL Ledger / immutable blob |
| KPI aggregation          | Local nightly job         | Local + anonymized rollup to control plane |

Every row is a paid-tier upgrade beat.

## Deployment target: Microsoft Foundry

Foundry is the fastest path to a defensible enterprise runtime for
banking clients that have already procured Azure.

- **Foundry Agent Service extension** — FinGuard runs as a Guardrail /
  Agent Grounding hook fired on every Tier-1 signal, keeping the
  guardrail engine inline with agent traffic.
- **Azure Marketplace Managed Application** — single-tenant per client,
  distroless image, pinned versions. Procurement is a click, not a
  legal cycle.
- **Azure SQL Ledger** — vault storage with native cryptographic
  tamper-evidence. Replaces the Postgres append-only trigger for the
  enterprise plane.
- **Azure Managed HSM (FIPS 140-3 Level 3)** — signing keys for
  evidence packs and policy pack verification.
- **Entra ID + Conditional Access** — identity, MFA, session policy,
  SSO to Cognita control plane.
- **Microsoft Purview** — data classification handoff so sensitive
  content flags feed the guardrail engine.

## Compliance surface unlocked by Foundry hosting

Each of these is table-stakes for a Tier-1 bank buyer; getting them via
Foundry costs zero engineering.

- **FedRAMP High** — US federal deployments.
- **DoD IL5** — controlled unclassified information workloads.
- **PCI DSS** — payments-adjacent agents.
- **HIPAA** — health data in insurance/annuities lines of business.
- **SOC 1 / 2 / 3** — annual audit inheritance for the platform layer.
- **ISO 27001 / 27017 / 27018 / 27701** — ISMS, cloud, cloud-PII,
  privacy.
- **FFIEC** — US bank examiners' framework, expected at RFI stage.

## Repo split

- This repo (`FinGuard`, Lovable): free demo, single-plane, monitor
  mode. Funnel to paid.
- `app.cognitagrc.io`: control plane + Foundry client-plane runtime.
- `finguard-verify`: standalone npm package + Go binary shipped to
  regulators.
- `policy-packs`: signed pack registry.

Each repo owns exactly one plane concern.

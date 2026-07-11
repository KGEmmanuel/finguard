# Finguard

Open-source AI governance, risk & compliance (GRC) demo for financial services — the free tier of the [Cognita GRC](https://app.cognitagrc.io) platform.

**Repo:** https://github.com/KGEmmanuel/vigil-mesh
**Live demo:** https://app.cognitagrc.io/finguard
**Paid tiers:** https://app.cognitagrc.io/pricing

Finguard gives you an inventory of AI systems, agent monitoring, policy guardrails, and an audit trail — enough to stand up lightweight AI GRC for a fintech without a commercial contract.

## Features (OSS)

- **Dashboard** — posture snapshot across AI systems, agents, and controls
- **Inventory** — register and classify AI/ML systems and models
- **Agents** — track autonomous agents, their tools and data access
- **Guardrails** — define and monitor policy checks
- **Audit** — evidence log with CSV / PDF export
- **Demo mode** — mock data + a `demo@cognita.io` login, no backend required to try it

## Paid tiers (Cognita GRC)

Not in this repo — available on the hosted platform:

- SSO / SAML, multi-tenant org switcher
- Signed evidence packs, SIEM export
- Curated policy packs for SOC 2, ISO 42001, EU AI Act, NIST AI RMF
- SLA & support

## Quickstart

```bash
bun install
bun run dev
```

Open http://localhost:8080 and sign in with `demo@cognita.io` (see the auth screen) or explore `/audit` and `/guardrails` in demo mode without an account.

## Stack

TanStack Start (React 19) · Vite 7 · Tailwind v4 · shadcn/ui · TanStack Query · Supabase (Lovable Cloud) for auth, DB and RLS.

## Architecture

Prose: [docs/architecture.md](./docs/architecture.md). Diagram:
[docs/architecture.mmd](./docs/architecture.mmd). Target two-plane
harness (aspirational): [docs/harness.md](./docs/harness.md). Honest
gap register: [docs/audit.md](./docs/audit.md).

## Project meta

[CHANGELOG](./CHANGELOG.md) · [ROADMAP](./ROADMAP.md) ·
[GOVERNANCE](./GOVERNANCE.md) · [ADOPTERS](./ADOPTERS.md) ·
[MAINTAINERS](./MAINTAINERS.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Security issues: [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © Cognita GRC

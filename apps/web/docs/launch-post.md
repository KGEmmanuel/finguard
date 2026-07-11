# Launch post — Show HN / LinkedIn draft

## Show HN title
Show HN: Finguard — open-source AI GRC for fintech (MIT)

## Body

Hi HN — we're releasing Finguard, the free/OSS tier of our Cognita GRC platform, under MIT.

Financial-services teams shipping AI/LLM features need to answer three questions that regulators (EU AI Act, NIST AI RMF, ISO 42001, SOC 2) are now asking in earnest:

1. What AI systems and agents do we actually run?
2. What guardrails fire, and who overrode them?
3. Can we prove it, with signed evidence, on demand?

Finguard is our take on that as a lightweight app: an inventory of AI systems, an agent monitor, policy guardrails with hard-block / soft-flag / silent-log tiers, and an append-only audit vault with CSV/PDF export.

Stack: TanStack Start (React 19), Vite 7, Tailwind v4, shadcn/ui, Supabase (auth + RLS). Demo mode with mock data runs with no backend.

- Repo: https://github.com/KGEmmanuel/vigil-mesh
- Live demo: https://app.cognitagrc.io/finguard  (demo@cognita.io, see auth screen)
- Paid tiers (SSO/SAML, signed evidence, policy packs): https://app.cognitagrc.io/pricing

Happy to answer questions on the RLS model, the guardrail tiering, or why we split open-core the way we did.

---

## LinkedIn variant (shorter)

We open-sourced Finguard today — the MIT-licensed free tier of Cognita GRC.

Inventory your AI systems, monitor agents, run policy guardrails, and keep an auditable trail — everything a fintech needs to start answering EU AI Act / NIST AI RMF / SOC 2 questions about AI, without a commercial contract.

- Repo → github.com/KGEmmanuel/vigil-mesh
- Demo → app.cognitagrc.io/finguard

SSO, signed evidence packs, and curated policy packs stay in the paid tiers.

#AIGovernance #GRC #Fintech #OpenSource

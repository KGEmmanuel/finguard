# Contributing to FinGuard

Thanks for helping make AI-governance evidence verifiable. Setup should take under 10 minutes — if it doesn't, that's a bug; please open an issue.

## Dev setup

```bash
git clone https://github.com/KGEmmanuel/finguard && cd finguard
pnpm install
cp .env.example .env        # Supabase URL + anon key (free project works)
pnpm db:seed                # demo agents, guardrail events, one signed override
pnpm dev                    # apps/web on http://localhost:5173
pnpm test                   # unit + golden-pack determinism test
```

Monorepo layout: `apps/web` (the console), `packages/pack-spec` (canonical hashing + MANIFEST types — shared by builder and verifier), `packages/verify` (the CLI), `fixtures/golden-pack` (determinism fixture).

## Ground rules

1. **Every PR maps to exactly one outcome KPI** (A–G, see the public roadmap). Say which one in the PR description. Features that don't move a KPI get closed — kindly, but closed.
2. **Determinism is a merge gate.** If your change alters pack bytes, regenerate the golden fixture in the same PR (`pnpm golden:update`) and explain why in the changelog entry. CI diffs bytes.
3. **Never touch `packages/pack-spec` hashing without a spec version bump** and an entry in `docs/spec/evidence-pack-v1.md`'s changelog. The builder and every deployed verifier must agree.
4. **No fabricated data.** Seeded demo data must be plainly synthetic (fictional firms, masked identifiers). Anything resembling real PII fails review.

## Great first contributions

Rule packs (new guardrail rules with statute mappings — SEC, FINRA, FCA, MAS, EU AI Act), regulator mapping extensions in `06_defensibility` dimensions, verify-CLI output improvements, docs. Look for [`good first issue`](https://github.com/KGEmmanuel/finguard/labels/good%20first%20issue).

## PR checklist

Tests pass locally, determinism gate green, KPI named, docs updated if behavior changed, `pnpm lint` clean. One approval from a CODEOWNER merges.

## Conduct

Be professional and assume good faith. Report unacceptable behavior to conduct@cognitagrc.io. (Contributor Covenant v2.1 applies.)

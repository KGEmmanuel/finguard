# Contributing to Finguard

Thanks for your interest in improving Finguard.

## Ground rules

- Be respectful — see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
- Open an issue before non-trivial changes so we can align on scope.
- Keep PRs focused: one topic per PR, with a clear description and screenshots for UI changes.
- By submitting a contribution, you agree it is licensed under the project's [MIT license](./LICENSE).

## Dev setup

```bash
bun install
bun run dev       # http://localhost:8080
bun run build     # production build
```

## What belongs in this repo (OSS scope)

Dashboard, Inventory, Agents, Guardrails, Audit, demo mode, and the Lovable Cloud schema / RLS migrations.

Please do NOT send PRs for enterprise features (SSO/SAML, signed evidence packs, curated policy packs, multi-tenant admin). Those live in the closed-source Cognita GRC platform.

## Style

- TypeScript strict, ESLint + Prettier on save.
- shadcn/ui components; Tailwind v4 tokens in `src/styles.css` — no hardcoded colors.
- Route files under `src/routes/` follow TanStack Start file-based routing.

## Reporting security issues

Do not open a public issue — see [SECURITY.md](./SECURITY.md).

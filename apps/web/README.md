# apps/web — the FinGuard console

This directory receives the Lovable-scaffolded console (currently in the private `vigil-mesh` project, live at finguards.lovable.app).

## Bringing the code in (one-time)

1. In Lovable: open the project → GitHub → **Connect repository** → select `KGEmmanuel/finguard`. If Lovable requires an empty repo or its own branch, sync to a branch (e.g. `lovable-sync`) and move the app:

   ```bash
   git fetch origin lovable-sync
   git checkout lovable-sync -- .
   git mv src index.html vite.config.ts public apps/web/   # adjust to actual layout
   git commit -m "chore: move Lovable console into apps/web"
   ```

2. Add `apps/web/package.json` name `@finguard/web` so pnpm picks it up as a workspace.
3. Point Cloudflare Pages at the repo: build command `pnpm install && pnpm --filter @finguard/web build`, output `apps/web/dist`.
4. After this, treat **GitHub as canonical**; use Lovable only for prototyping on branches (see docs/architecture.md, risk table in the implementation plan).

## Wiring the deterministic pack builder

Replace the console's current evidence-pack code with [`src/pack-builder.ts`](src/pack-builder.ts), which uses `@finguard/pack-spec` — the same module the CLI verifies with, so the builder and verifier can never drift. It implements Spec v1: canonical content-only pack hash, attested/informational split, and the two-phase vault commit (vault entry BEFORE download).

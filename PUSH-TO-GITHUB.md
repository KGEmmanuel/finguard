# Publishing this repo to github.com/KGEmmanuel/finguard

<!-- Delete this file after publishing. -->

Everything here is tested and ready. `vigil-mesh` is private, so the Lovable console must come in via Lovable's GitHub integration on your side — everything else is already in this folder.

## 1. Push (5 minutes)

```bash
cd finguard-repo
git init -b main
git add -A
git commit -m "feat: FinGuard open core — Evidence Pack Spec v1, finguard-verify CLI, determinism gate"
git remote add origin https://github.com/KGEmmanuel/finguard.git
git push -u origin main
```

## 2. Bring in the console from vigil-mesh (choose one)

**A — Lovable GitHub sync (recommended):** Lovable project → GitHub → connect. If it must create its own branch, sync to `lovable-sync`, then follow `apps/web/README.md` to move the app into `apps/web/`.

**B — Manual copy:** `git clone https://github.com/KGEmmanuel/vigil-mesh` locally (you have access), copy its `src`, `index.html`, `vite.config.ts`, `public` into `apps/web/`, add a `package.json` named `@finguard/web`, commit.

Then wire `apps/web/src/pack-builder.ts` into the console's mock-exam download flow (replaces the old non-deterministic pack code).

## 3. Repo settings (10 minutes)

Discussions: on. Branch protection on `main`: require CI + determinism checks. Security → private vulnerability reporting: on. Add topics: `ai-governance`, `regtech`, `compliance`, `audit`, `evidence`, `sec`, `ed25519`. Description: "Prove AI governance to a regulator in under 4 hours — open, offline-verifiable evidence packs for financial AI." Website: `https://finguard.cognitagrc.io`.

## 4. Cloudflare (Phase 1 of the implementation plan)

Pages → Create project → connect `KGEmmanuel/finguard` → build `pnpm install && pnpm --filter @finguard/web build`, output `apps/web/dist` → custom domain `finguard.cognitagrc.io`. Redirect `finguards.lovable.app` → new domain in Lovable settings.

## 5. Publish the CLI to npm (after first green CI)

```bash
cd packages/pack-spec && pnpm build && npm publish --access public
cd ../verify && pnpm build && npm publish --access public
```

Then `npx finguard-verify` works for anyone — including the reader of your lead magnet.

## 6. Verify it all (the Phase-2 gate)

```bash
pnpm install && pnpm build && pnpm test && pnpm golden:check
node packages/verify/dist/cli.js fixtures/golden-pack/output/finguard-evidence-golden.zip
```

Expected: 18/18 tests, determinism gate green, `✔ PACK VERIFIED (offline — no vendor callback)`.

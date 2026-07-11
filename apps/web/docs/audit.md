# Finguard — project audit

An honest read of the repo as it stands: what's solid, what's thin, and
what would have to change before a serious open-source maintainer, a
banking buyer, or a regulator would treat this as more than a demo.

Scope of this audit: repository layout, documentation, backend schema,
frontend architecture, release/CI posture, and the harness/funnel story
already drafted in `docs/harness.md` and `docs/funnel.md`.

---

## 1. What the project is today

Finguard is a single-tenant TanStack Start app backed by Supabase. It
gives a fintech team an AI system inventory, an agent register, a
guardrail event log, an audit trail, a Mock SEC Exam evidence pack, and
an outcome KPI board. Auth is email + Google. Roles are enforced via a
`user_roles` table and a `has_role()` security-definer function.

It is positioned as the free tier for the paid platform at
`app.cognitagrc.io`, and the plumbing for that positioning — upgrade
CTA, funnel event beacon, watermarked pack — is already in the code.

That framing is coherent. The rest of this document is where the shape
falls short of it.

---

## 2. Architecture as-built

```text
Browser  ──► TanStack Router routes  ──► TanStack Query (suspense)
                    │                                │
                    │                                ▼
                    │                     supabase-js (RLS-scoped)
                    ▼                                │
             evidence-pack.ts                        ▼
             (PDF + MANIFEST hash)         Postgres (Lovable Cloud)
                    │                     agents · guardrail_events
                    │                     audit_log · outcome_kpis
                    ▼                     funnel_events · user_roles
             UpgradeCta beacon
                    │
                    ▼
          /api/public/hooks/funnel-event
          /api/public/hooks/compute-kpis  ◄──  pg_cron 02:00 UTC

          - - - - - - - out of repo - - - - - - -
          app.cognitagrc.io control plane · finguard verify CLI
```

The rendered version lives at `docs/architecture.mmd`.

The important structural fact: everything runs in one plane. The
"control plane vs. data plane" split that `docs/harness.md` argues for
does not exist yet in code — the app is a single-tenant Supabase
project with an RLS boundary as its only isolation primitive.

---

## 3. Gaps ranked by cost of leaving them

### Tier 1 — blocking for the story the docs tell

1. **The two-plane harness is aspirational, not implemented.**
   `docs/harness.md` promises signed policy packs, an Ed25519 verify
   CLI, inline enforce mode, and a Foundry-hosted client-tenant runtime.
   None of that exists in the tree. A reader who follows the doc into
   the code will not find the seams. Fix by either (a) marking every
   unbuilt section with a `Status: not implemented` badge and a
   tracking issue link, or (b) landing the smallest possible skeleton —
   a `packs/` directory with one JSON pack, a signature stub, a `verify`
   script in `scripts/`. Do not leave the doc as prose only.

2. **No signed evidence.** `evidence-pack.ts` computes a `pack_hash`
   but nothing signs it. The whole regulator-facing thesis rests on
   "same inputs → same hash → verifiable by a third party." Without a
   signature the hash is a checksum, not evidence. First increment:
   detached signature file next to the pack, public key checked into
   `docs/keys/`, `scripts/verify-pack.mjs` that a maintainer (and later
   a regulator) can run.

3. **`outcome_kpis` is a table with no producer visible in the demo.**
   The nightly `compute-kpis` route depends on `pg_cron` and on data
   the demo user cannot generate. First-run experience for a
   contributor is an empty board. Ship a `bun run seed:kpis` script
   that inserts a fortnight of synthetic points so the OutcomeKpiBoard
   is populated on a fresh clone.

### Tier 2 — blocking for OSS credibility

4. **No `CHANGELOG.md`.** MAINTAINERS.md references tagged releases and
   semver but there is no changelog file. Add one now (Keep a Changelog
   format) even if the first entry is `0.1.0 — initial public release`.

5. **No `ROADMAP.md` and no `ADOPTERS.md`.** The docs describe an
   ambitious product; a public roadmap tied to the outcome tree in
   `docs/outcomes.md` is how you make that legible without looking like
   marketing. `ADOPTERS.md` can start empty with a one-line invitation.

6. **`.github/` is thin.** There is CI and CodeQL but no
   `CODEOWNERS`, no PR checklist beyond a template, no
   `dependency-review` action, no release workflow. Add `CODEOWNERS`
   pointing at `@KGEmmanuel` for `/supabase/**` and `/docs/**` at a
   minimum; add `actions/dependency-review-action` on PRs; add a
   `release.yml` that runs on tag push.

7. **No test suite.** `package.json` has no `test` script. For a
   project whose selling point is "deterministic evidence," the absence
   of a single test that asserts `pack_hash` stability across two runs
   is the most damaging omission on the page. One `vitest` file
   covering `evidence-pack.ts` (fixed input → known hash) would change
   the credibility of the whole repo.

8. **`SECURITY.md` is minimal and lists no PGP key or GitHub private
   advisory link.** Add both. Also enable GitHub's private
   vulnerability reporting in repo settings and reference it in the
   file.

### Tier 3 — polish, but the kind reviewers notice

9. **README does not show the product.** No screenshot, no GIF, no
   architecture diagram inline. A single hero screenshot of `/audit`
   and the Mermaid diagram from `docs/architecture.mmd` embedded near
   the top would carry more weight than the current feature bullets.

10. **`AGENTS.md` is a Lovable metadata file, not a document about the
    agent inventory feature.** A first-time reader will open it
    expecting content about the Agents route. Rename the current file
    to `.lovable/AGENTS.md` (or leave the marker comment inside
    `README.md`) and write a real `AGENTS.md` describing the Agents
    domain model — states, transitions, tier definitions.

11. **Docs are unlinked from each other.** `outcomes.md`, `harness.md`,
    `funnel.md`, `pricing-free-tier.md`, `launch-post.md` all live in
    `docs/` with no `docs/README.md` index. Add one. A reader landing
    on `harness.md` from a Hacker News link needs a way back to the
    outcome tree in one click.

12. **No `GOVERNANCE.md`.** For a project explicitly steered by a
    commercial entity (Cognita GRC), stating that publicly — how
    decisions get made, how the roadmap intersects with the paid
    product, what a PR to `_authenticated/` should expect — is what
    separates an OSS project from a marketing microsite.

13. **Migration filenames are timestamped but not described.** Add a
    one-line `-- description:` comment at the top of each migration so
    `git log supabase/migrations` and a `grep description` produce a
    readable history.

14. **No dependency policy.** `bun.lock` is committed (good) but
    Dependabot is configured (from `.github/dependabot.yml`) without a
    corresponding note in `CONTRIBUTING.md` about upgrade cadence.
    One paragraph.

### Tier 4 — worth stating but not blocking

15. Bundle size and Lighthouse budget are not tracked. A `size-limit`
    check in CI would be a light touch.
16. No `codeql.yml` custom queries; the default set is fine but worth
    a comment.
17. `scripts/` contains one SQL file. As the project grows this
    directory will need its own README.

---

## 4. Concrete file additions (proposed, not written yet)

The list below is the smallest set of new files that would close the
Tier 1 and Tier 2 gaps. Names are load-bearing — reviewers scan
filenames before content.

```text
CHANGELOG.md                 Keep-a-Changelog, seed with 0.1.0
ROADMAP.md                   Linked to docs/outcomes.md sub-outcomes
GOVERNANCE.md                Decision-making, Cognita GRC relationship
ADOPTERS.md                  Empty invitation
docs/README.md               Index for the docs folder
docs/architecture.md         Prose companion to architecture.mmd
docs/keys/finguard.pub       Placeholder Ed25519 public key
scripts/verify-pack.mjs      Offline pack verifier (skeleton)
scripts/seed-kpis.ts         Fills outcome_kpis for a fresh clone
src/lib/__tests__/           At least evidence-pack.test.ts
.github/CODEOWNERS           Route ownership by directory
.github/workflows/release.yml Tag-triggered GitHub Release
```

---

## 5. The "doesn't look AI-generated" test

Three things give AI-authored OSS repos away: relentless emoji bullet
lists, docs written in the second person plural ("We believe…"), and
feature READMEs with no screenshots. Finguard currently scores badly on
two of those. Concrete moves:

- Rewrite `README.md` to lead with a screenshot and the architecture
  diagram, then a two-paragraph "what this is / what this is not"
  section, then quickstart, then the features table. Cut the emoji
  section headers if any get added.
- Adopt a single narrative voice across `docs/` — third-person present
  ("Finguard emits…", "The harness pulls…"). Kill "we" and "you" from
  the harness and outcomes docs.
- Every prose doc gets one diagram, one code snippet, and one honest
  limitation section. Docs that read like a marketing landing page
  read as AI-written.

---

## 6. Suggested near-term sequence

Ordered so each step is defensible on its own.

1. Land this audit and the architecture diagram (this change).
2. Add `CHANGELOG.md`, `ROADMAP.md`, `docs/README.md`, `GOVERNANCE.md`.
3. Add `evidence-pack.test.ts` asserting hash stability. This one test
   is worth more than any doc.
4. Add `scripts/verify-pack.mjs` + `docs/keys/finguard.pub` as an empty
   skeleton, referenced from `docs/harness.md` with a `Status: alpha`
   badge.
5. Add `scripts/seed-kpis.ts` and wire it into `bun run seed`.
6. Rework `README.md` around a screenshot and the diagram.
7. Enable GitHub private vulnerability reporting and update
   `SECURITY.md`.
8. Add `CODEOWNERS` and `dependency-review` action.

Everything past step 8 is Tier 3 polish and can wait for a real first
external contributor to force the question.

## What

<!-- one paragraph -->

## Which outcome KPI does this move?

<!-- exactly one of A–G (see public roadmap). PRs that move no KPI get closed. -->

## Checklist

- [ ] Tests pass locally (`pnpm test`)
- [ ] Determinism gate green (`pnpm golden:check`) — golden fixture regenerated in this PR if pack bytes changed, with rationale below
- [ ] `packages/pack-spec` untouched, OR spec version bumped + spec changelog entry
- [ ] Docs updated if behavior changed

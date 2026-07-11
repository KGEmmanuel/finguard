# Maintainers

| Role | Handle | Scope |
|------|--------|-------|
| Lead maintainer | @KGEmmanuel | Triage, releases, security |

## Response SLA

- **Security reports** (security@cognitagrc.io): acknowledged within 3 business days.
- **Bugs / feature requests**: triaged within 5 business days.
- **PRs**: first review within 7 business days.

## Release process

1. Merge to `main`; CI green.
2. Bump version in `package.json` following semver.
3. Tag `vX.Y.Z`, publish GitHub Release with changelog.
4. Private `cognitagrc` bumps the pinned Finguard version.

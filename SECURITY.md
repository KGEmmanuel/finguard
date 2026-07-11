# Security Policy

FinGuard is governance software for regulated finance. We treat security reports as the highest-priority inbound.

## Reporting a vulnerability

Email **security@cognitagrc.io** or use [GitHub private vulnerability reporting](https://github.com/KGEmmanuel/finguard/security/advisories/new). Do not open public issues for vulnerabilities.

You will receive an acknowledgment within **48 hours** and a triage decision within **5 business days**. We follow a **90-day coordinated disclosure** window and will credit reporters in the advisory unless you prefer otherwise.

## Scope

In scope: this repository, the `finguard-verify` CLI, the evidence-pack format (spec confusion attacks, hash-scope ambiguity, manifest forgery), and the hosted demo at finguard.cognitagrc.io. Out of scope: the commercial control plane at app.cognitagrc.io (report to the same address; different response team), social engineering, volumetric DoS.

Of particular interest: anything that lets a pack **verify successfully while its contents were tampered with**. That is the property this project exists to provide.

## Supply chain

Releases are signed with cosign and ship SLSA provenance. GitHub Actions are pinned by SHA. Verify a release:

```bash
cosign verify-blob --certificate-identity-regexp 'github.com/KGEmmanuel/finguard' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --signature finguard-verify.sig finguard-verify.tgz
```

## Supported versions

Only the latest minor release receives security fixes.

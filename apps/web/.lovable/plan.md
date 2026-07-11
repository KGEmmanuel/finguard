
# FinGuard Lead-Magnet PDF

A single, designed PDF built to convert regulated-finance buyers (CISO, Head of Model Risk, Chief Compliance Officer at banks / asset managers) from the free FinGuard demo into `app.cognitagrc.io` trials. Delivered as `/mnt/documents/finguard-lead-magnet.pdf` plus supporting screenshots.

## Audience & conversion goal

- **Reader:** technical buyer who has ~10 minutes, will skim first, read second.
- **Job to be done:** give them enough proof + architecture to forward internally and book a call.
- **Primary CTA:** `app.cognitagrc.io/pricing?utm_source=finguard&utm_medium=pdf&utm_content=lead-magnet`
- **Secondary CTA:** GitHub repo (credibility) + "Run the mock SEC exam" (product-led).

## Deliverables

- `/mnt/documents/finguard-lead-magnet.pdf` — 10 pages, US Letter, print-safe.
- `/mnt/documents/screens/*.png` — Playwright captures of `/`, `/audit`, `/agents`, `/guardrails`, `/inventory`, OutcomeKpiBoard, evidence-pack cover.
- `/mnt/documents/diagrams/*.png` — rendered architecture + harness diagrams (from Mermaid via mmdc, or built with reportlab shapes if mmdc unavailable).

## Page-by-page structure

```text
1  Cover              North-star line + one screenshot + logo + URL
2  The problem        SEC 2026 exam reality; cost of a failed exam
3  What breaks today  4 concrete failure modes w/ regulator quotes
4  Impact             Board-visible numbers (fines, remediation, time)
5  The FinGuard demo  3 screenshots (audit, guardrails, KPI board)
6  Outcome-Driven     Outcome tree (A–G) as a diagram, KPIs beside it
7  Architecture       Current single-plane diagram (from architecture.mmd)
8  Harness (target)   Two-plane diagram from docs/harness.md
9  Azure Foundry      Foundry deployment architecture, compliance surface
10 Upgrade path       Free vs paid table + CTA + QR to pricing
```

Each page has: one visual anchor (screenshot / diagram / big stat), ≤ 60 words of body, one takeaway line in accent color.

## Content sources (already in repo)

- `docs/outcomes.md` — outcome tree, KPIs A–G.
- `docs/harness.md` — two-plane diagram, non-negotiables, Foundry section, compliance list.
- `docs/architecture.md` + `docs/architecture.mmd` — current shape.
- `docs/funnel.md` — free vs paid split.
- `docs/audit.md` — honest gap register (used sparingly, one line on p9).

No new prose written from scratch — the PDF is a curated visual re-cut of what's already true in the repo, which is what makes it defensible.

## Design system

- **Palette:** Midnight Executive (`#1E2761` navy, `#CADCFC` ice, `#F96167` coral accent for CTAs and stat callouts). Matches "regulated finance" register; avoids generic SaaS purple.
- **Type:** Inter for headings (bold, tight), IBM Plex Sans for body (institutional feel), IBM Plex Mono for KPI numbers and code refs.
- **Grid:** 12-col, 0.75" margins, one visual anchor per page.
- **Motif:** thin coral rule under each page number + a small "MANIFEST §" section marker in mono — reinforces the "evidence pack" identity of the product.
- **No emojis, no stock icons, no gradient meshes.** Diagrams are line-based, monochrome + one accent.

## Screenshots (Playwright, headless Chromium against localhost:8080)

Restore Supabase session from `LOVABLE_BROWSER_*` env vars, capture at 1440×900 @ 2x DPR:

- `/` (dashboard hero)
- `/audit` with OutcomeKpiBoard + UpgradeCta visible
- `/guardrails` with an override event expanded
- `/agents` inventory table
- Evidence pack PDF cover (opened in a viewer, screenshot the cover page)

If session vars are absent (`LOVABLE_BROWSER_AUTH_STATUS != injected`), fall back to the public `/` and `/auth` screens and note the limitation.

## Diagrams

- **Architecture (p7):** render `docs/architecture.mmd` to PNG via `mmdc`. If mmdc isn't installed, redraw in reportlab using the same node/edge set — do NOT ship a raw `.mmd` reference inside the PDF.
- **Two-plane harness (p8):** convert the ASCII diagram in `docs/harness.md` into a proper boxed diagram: left column "Client tenant / VNet", right column "Cognita control plane", signed-pack arrow crossing the boundary, dashed lines for aspirational components (matching the `classDef gap` convention already in the repo).
- **Foundry (p9):** new diagram showing Foundry Agent Service → FinGuard guardrail hook → Azure SQL Ledger vault → Managed HSM signing → Entra ID auth → Purview classification, with the compliance-surface chips (FedRAMP High, DoD IL5, PCI DSS, HIPAA, SOC 1/2/3, ISO 27001/17/18/701, FFIEC) as a footer strip.
- **Outcome tree (p6):** vertical tree, north-star at top, A–G as leaves, each leaf tagged with its KPI target in mono.

## Build pipeline

1. Playwright script under `/tmp/browser/leadmagnet/` — capture the 5 screenshots.
2. `mmdc` (or reportlab fallback) — render 3 diagrams to PNG under `/mnt/documents/diagrams/`.
3. `reportlab` (Platypus + custom Flowables) — assemble the 10-page PDF using the design system above. Reportlab, not docx-js, because this is print-first and needs precise diagram placement.
4. Convert every page to JPG at 150 DPI, view each one, list defects (overflow, contrast, alignment, cut-off text), fix, re-render. Do not deliver until a full pass finds nothing.

## Out of scope (called out, not built)

- Interactive/animated web version of the lead magnet.
- Personalization by industry vertical (banking vs insurance vs asset mgmt) — v1 targets banking.
- Localization.
- Gated download / email capture — that lives on `app.cognitagrc.io`, not in this repo.

## Verification

- 10 pages, all rendered, no lorem/placeholder text (grep the extracted text).
- All 5 screenshots visible and legible; no auth-wall or error state captured.
- All 3 diagrams present as raster images, not text fallbacks.
- CTAs use the correct UTM string.
- Extracted text passes a "doesn't look AI-generated" scan: no "In today's rapidly evolving landscape", no stacked em-dashes, no filler.
- Artifact tag emitted: `<presentation-artifact path="finguard-lead-magnet.pdf" mime_type="application/pdf"></presentation-artifact>`.

# PRAMITI interface verification

## Coverage

| Check | Result |
| --- | --- |
| FastAPI and research tests | 35 passed locally. GitHub CI runs the same suite against SQLite and PostgreSQL. |
| TypeScript and Vite | Production build passed. Research analytics is a lazy-loaded chunk. |
| Docker | The production image built with the existing calibration option and served the compiled frontend and real API. |
| Chrome through Playwright | Four tests passed. They cover navigation, theme persistence, original deep links, validation and Ed25519 signing, all three decisions, approval and rejection confirmations, evidence export, checkpoint verification and executed research data. |
| Automated accessibility | Axe WCAG 2.2 A/AA rules reported no violations in the scanned desktop and mobile states. A bilingual accessible-name mismatch found on the initial run was corrected. This is scoped verification rather than formal conformance certification. |
| Visual and responsive review | Baseline and redesigned captures were inspected at 1440 × 900, 768 × 1024 and 390 × 844. The capture runner asserts no overall horizontal overflow. Narrow transaction and research tables use labelled internal scrolling regions. |
| Bundle review | Scanned built assets for private-key material, provider-key patterns and credentialed PostgreSQL URLs. No matches. |

The audit captured the live landing and used the matching local application for the complete before set when the live workspace did not connect in time. The after set uses the locally built application with the calibrated model enabled. All captured transaction values are synthetic proposals recorded by the real backend.

## Before and after

| View | Baseline | Redesign |
| --- | --- | --- |
| Landing | [Desktop](ui-screenshots/before/desktop-landing.png) | [Desktop](ui-screenshots/after/desktop-landing.png), [tablet](ui-screenshots/after/tablet-landing.png), [mobile](ui-screenshots/after/mobile-landing.png) |
| Dashboard | [Desktop](ui-screenshots/before/desktop-dashboard-with-data.png) | [Desktop](ui-screenshots/after/desktop-dashboard-with-data.png), [dark theme](ui-screenshots/after/desktop-dark-dashboard.png) |
| Intent mandates | [Tablet](ui-screenshots/before/tablet-mandates.png) | [Tablet](ui-screenshots/after/tablet-mandates.png), [mobile receipt](ui-screenshots/after/mobile-mandate-receipt.png) |
| Agent activity | [Desktop](ui-screenshots/before/desktop-agent.png) | [Desktop](ui-screenshots/after/desktop-agent.png) |
| Payment verification | [Mobile](ui-screenshots/before/mobile-verification.png) | [Mobile](ui-screenshots/after/mobile-verification.png) |
| Human review | [Desktop](ui-screenshots/before/desktop-review.png) | [Desktop](ui-screenshots/after/desktop-review.png) |
| Evidence | [Desktop](ui-screenshots/before/desktop-evidence.png) | [Desktop](ui-screenshots/after/desktop-evidence.png), [ledger verification](ui-screenshots/after/desktop-ledger.png) |
| Research analytics | Unavailable in baseline | [Desktop](ui-screenshots/after/desktop-analytics.png), [mobile](ui-screenshots/after/mobile-analytics.png) |
| Mobile navigation | [Overflowed navigation row](ui-screenshots/before/mobile-dashboard.png) | [Modal drawer](ui-screenshots/after/mobile-drawer.png) |

[All 24 baseline screenshots](ui-screenshots/before/) · [All 41 redesigned screenshots](ui-screenshots/after/)

## Reproduce

Start the app using the repository setup instructions. Then run:

```sh
npm --prefix frontend ci
(cd frontend && npx playwright install chromium)
npm --prefix frontend run build
PRAMITI_BASE_URL=http://127.0.0.1:8000 npm --prefix frontend test
PRAMITI_BASE_URL=http://127.0.0.1:8000 npm --prefix frontend run screenshots
```

Set `PRAMITI_EXPECT_SEMANTIC=1` where the calibrated model is enabled. Screenshots go to `docs/ui-screenshots/after/` by default. For release smoke tests use the existing [Render service](https://pramiti-aqd7.onrender.com/) as the base URL and verify that `/health` reports PostgreSQL. The deployed UI should load the new landing and the existing sandbox workflows without GitHub authentication.

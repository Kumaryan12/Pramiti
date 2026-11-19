# PRAMITI interface audit

The audit used Chrome through Playwright against commit `be0473c`. The public landing rendered, but the workspace did not reach its connected state within the initial capture timeout. The complete comparison set was captured from the matching local application at 1440 × 900, 768 × 1024 and 390 × 844. [Baseline screenshots](ui-screenshots/before/)

## Architecture

React 19, TypeScript and Vite serve a single-page application. The original hash routes are `#dashboard`, `#mandates`, `#agent`, `#verification`, `#review` and `#evidence`. Local React state holds the mandate, selected proposal, status and form values. CSS and Tailwind supply the existing styling. FastAPI serves the built frontend and owns every verification and settlement decision.

`POST /api/session` issues the HttpOnly session cookie. The browser stores a non-exportable Ed25519 private key in IndexedDB. The signed JSON and public key go to `/api/mandates`. The agent and reviewer use `/api/agent/runs` and `/api/payments/{id}/review`. Catalogue, mandates, payments and evidence are read from the existing API. The browser suite already covered signing, all three scenarios, approving a pending case, checking evidence, and reloading in the same session. Docker packages the Vite build and Render supplies PostgreSQL.

## Observations from the baseline captures

| Screen | Observed issue | Redesign |
| --- | --- | --- |
| Landing | The decorative shield explains little about a payment decision. | Show a clearly labelled sample case, its authorization, and the evidence gap. |
| Dashboard | The promotional banner precedes the transaction record. Three counters omit automatic approvals and rejected proposals. | Lead with real session decisions, recent records and pending cases. |
| Mobile shell | Horizontal navigation clips later destinations inside an overflow row. There was no overall page overflow in the captured states. | Provide a focus-managed menu with all routes and clear location cues. |
| Mandates | A single tall form places all constraints and the signing checkbox together. It offers no review step or signed confirmation. | Separate description, constraints, review and signing, then confirmation. |
| Agent | The form and catalogue are displayed above and below each other. After a run, navigation moves away from the observation context. | Keep user instruction, merchant inputs and recorded agent activity visible in the workspace. |
| Verification | The first large block gives routine checks equal emphasis with the missing evidence that caused escalation. | Lead with the decision and cause, then expose the pipeline and supporting values. |
| Human review | A pending case goes straight from note entry to approve or reject. Multiple cases have no search, filters or sort. | Add triage and a case panel with confirmation before submission. |
| Evidence | Ledger verification and raw events share a single panel. It takes manual scanning to locate records for one proposal. | Add case filters, structured event summaries, copy/export controls and a distinct checkpoint view. |
| Research | The original workspace has no research or attack laboratory route. | Publish an in-app view of the executed evaluation and distinguish runnable sandbox scenarios from offline experiments. |

## Reference patterns

- Use explicit consent, plain-language context and a transaction receipt. [UX4G consent and declaration](https://www.ux4g.gov.in/patterns/consent-declaration), [UX4G payment and transactions](https://www.ux4g.gov.in/patterns/payment-transactions), [UX4G patterns](https://www.ux4g.gov.in/patterns)
- Let users check their answers before committing and link validation summaries to the fields. [GOV.UK check answers](https://design-system.service.gov.uk/patterns/check-answers/), [GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/)
- Use labelled steps for process state, semantic rows and readable data tables. [USWDS step indicator](https://designsystem.digital.gov/components/step-indicator/), [USWDS table](https://designsystem.digital.gov/components/table/)
- Give repeatable operations precedence over decorative summary space, and put an exception next to its investigation action. [Modern Treasury design article](https://www.moderntreasury.com/journal/behind-the-scenes-designing-our-new-ui), [Stripe Radar](https://stripe.com/radar)
- Keep the location bar stable and distinguish page-specific actions from navigation. [Linear design refresh](https://linear.app/now/behind-the-latest-design-refresh)

## Second visual audit · baseline 678b8a5

The running Docker application supplied 41 fresh viewport captures at 1440×900, 768×1024 and 390×844. The same signed test mandate produced an allowed purchase, a policy rejection and a substitution requiring review in each session. [Before captures](ui-screenshots/assurance-before/)

- The desktop landing placed a heavily weighted sans-serif headline beside a conventional summary card. On mobile the two calls to action stacked and the product comparison started low in the first viewport.
- The demo showed a long mandate select and three disconnected scenario cards. The run handler then navigated to Transactions, taking the original instruction out of view.
- The dashboard gave each count an individual box and repeated denominators. Recent transactions preceded the trend. At tablet width the five boxes wrapped to two rows.
- Human Review placed the decision under compatibility details. Mobile exposed only the first part of the horizontally scrollable review table.
- The signing flow already collected explicit consent. Evidence already exposed per-event hashes and exported the selected events. Analytics already used the executed experiment file, including tied operating points.
- Mercury’s editorial pacing, Linear’s quieter rail, Radar’s rules-and-outcomes pairing and Modern Treasury’s adjacency of detail and action informed the redesign. UX4G informed explicit consent and receipts. The supplied reference images served as visual references where direct image URLs were unavailable. [Mercury](https://mercury.com/) · [Linear](https://linear.app/now/behind-the-latest-design-refresh) · [Stripe Radar](https://stripe.com/radar) · [Modern Treasury](https://www.moderntreasury.com/journal/behind-the-scenes-designing-our-new-ui) · [UX4G](https://www.ux4g.gov.in/patterns/payment-transactions)

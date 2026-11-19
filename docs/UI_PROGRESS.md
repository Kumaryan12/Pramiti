# Interface redesign progress

- Created `redesign/institutional-assurance` from `be0473c`.
- Captured and visually reviewed 24 baseline Chrome screenshots across desktop, tablet and mobile. Documented routes, trust boundaries, accessibility and workflow gaps in [the audit](UI_AUDIT.md).
- Established the institutional palette, semantic design tokens and responsive workspace shell. The existing endpoints and signing implementation continue to serve the workspace.
- Rebuilt the landing experience, dashboard and demo entry point. The dashboard derives its counts, trend, queue and ledger state from the existing APIs. The landing page preview is labelled as a sample and uses catalogue data when available.
- Replaced the single mandate form with a four-step signing flow and a receipt. Added an investigation pipeline, a filtered case queue with confirmation, and an agent activity view. Browser signing and every transaction decision still use the existing service.
- Added evidence timeline filtering and export, separate checkpoint verification, a controlled attack lab, and lazy-loaded analytics from the executed experiment results. Added a persisted theme selection and self-hosted fonts. The backend, trust rules and Render resources were reused.
- Captured 41 redesigned views, including the signing receipt, dark dashboard, mobile navigation, investigation screens and evaluated research. Compared them with the baseline across the three requested viewports.
- The four browser tests passed, including the axe accessibility scan after the bilingual name correction. Confirmed evidence export and both review decisions through the API. The production frontend bundle and Docker configuration passed verification. The deployment uses the existing Render service and PostgreSQL database.

## Proof of Intent redesign

- Phase A. Branched from 678b8a5, captured the running baseline and reviewed all three viewport sheets. Applied the requested brand palette, added self-hosted Instrument Serif for public display text and aligned workspace navigation with task names.

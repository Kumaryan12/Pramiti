# PRAMITI design system

The interface uses an original institutional identity for a research sandbox. Navy marks navigation and high-level context. Teal marks primary actions and verified evidence. Amber and red distinguish review and rejection, with text and icons accompanying every decision.

## Foundations

| Role | Light foundation | Usage |
| --- | --- | --- |
| Navigation | Navy `#101C35` and midnight `#0D182C` | Sidebar, landing hero, mobile navigation |
| Action | Teal `#087F70` and soft teal `#E8F6F2` | Primary actions, focus and emphasis. A deeper teal strengthens light-theme text contrast. |
| Surface | `#F8FAFC`, `#FFFFFF` | Page background and cards |
| Content | `#334155`, `#64748B`, `#E2E8F0` | Neutral text, supporting text and dividers. Interactive borders use a stronger token. |
| Outcome | Green `#16794B`, amber `#B7791F`, red `#B42332` | Approval, review and rejection. Badge text uses higher-contrast semantic variants. |

`theme.css` provides semantic aliases for text, controls, focus, surfaces and statuses. Dark mode remaps these aliases to slate and navy surfaces. The selected theme persists in local browser storage. Inter Variable and the Devanagari fallback are self-hosted and swap in after their font files load. Transaction amounts use tabular numbers. Identifiers and prediction sets use the system monospace stack.

## Structure

The desktop shell has a collapsible rail and stable toolbar. A modal navigation drawer replaces the rail on tablet and mobile. Link labels preserve the original hash destinations. Case handoffs use `?tx=` to open the case directly. Narrow data tables scroll inside a labelled, keyboard-focusable region.

`components.tsx` provides section cards, page headers, status tags, transaction tables, filters, progress steps, timelines, error/empty/loading states, copyable IDs and confirmation dialogs. A case’s outcome appears before supporting checks. Transaction tables route to the detailed decision. Approval and rejection use native modal dialogs with a safe initial focus. The signing flow collects explicit consent after showing the final structured policy. The user owns the contract fields and the browser signs the exact JSON.

## Data and provenance

- The dashboard, cases and evidence use the existing FastAPI endpoints and browser session. Decision chips reflect server values.
- The landing preview identifies itself as a scenario and uses the real synthetic catalogue for product details.
- The agent workspace separates user instruction, merchant claims, agent tool calls and independent verifier decisions.
- Analytics loads the checked-in executed result when its route opens. A matched-budget selector changes only the displayed evaluation point. The lab runs the existing server scenarios and links other studied families to their offline results.
- Ledger verification presents service-reported chain integrity and checkpoint membership separately.

## Interaction and accessibility

Use semantic forms, tables, navigation and headings. Leave focus visible, preserve escape-to-close behavior and use labelled statuses. Show synchronous validation beside the field and in a focusable summary. Errors and route changes expose meaningful text for keyboard and assistive-technology users. CSS honours reduced motion and limits motion to state changes. [Interface audit and design references](UI_AUDIT.md)

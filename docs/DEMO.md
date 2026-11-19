# Five-minute competition demo

Open the assigned PRAMITI HTTPS home page, or http://localhost:8000 locally. A clean browser profile starts a separate sandbox session. Use the calibrated Docker build if you want a live prediction set on the verification screen.

| Time | Action | What to show |
| --- | --- | --- |
| 0:00–0:45 | Open **Project overview**, launch the sandbox, and open **Mandate Builder**. Accept the default 65W charger mandate, allow substitutions for consideration, and leave missing evidence set to human review. Tick the authorization box and sign. | The signed 65W requirement, ₹3,000 payment limit, allowed merchant and category, and browser-held signing key. |
| 0:45–1:35 | In **AI Shopping Agent**, click **Legitimate payment**. | The ₹2,399 charger clears the policy. The independent record covers 65W, USB-C and PD. Show the genuine prediction set if shown and the synthetic settlement reference if the decision is ALLOW. |
| 1:35–2:15 | Return to **AI Shopping Agent** and click **Policy violation**. | The ₹4,899 proposal is rejected. Point at the single-payment limit in the check grid. |
| 2:15–3:15 | Click **Suspicious substitution** using the same mandate. | The scripted shopper chooses the cheaper compact charger after reading a merchant recommendation. Amount, category and merchant checks pass. The inspection record confirms USB-C and PD, and merchant copy alone claims compatibility with 65W. Show the actual prediction set if available and the ESCALATE decision. |
| 3:15–4:00 | Open **Human Review**. | Read the original instruction. Record a decision. To demonstrate safe refusal, click **Reject** because the independent 65W evidence is missing. A human can approve a review-eligible case only after recording how the gap was resolved. |
| 4:00–5:00 | Open **Evidence Explorer** and expand the events. | Show mandate payload and signature, agent observations, proposal, policy checks, compatibility, any prediction set, review, and the legitimate payment’s simulated settlement. Copy the head digest, paste it as the trusted checkpoint and click **Verify chain**. |

State that the supplied scenarios use a deterministic shopper and synthetic listings. If the calibrated gate is disabled, explain that the compatibility decision came from the evidence gate. A previous head must come from a trusted copy to establish history across runs. Keep the browser session open if you want to revisit the evidence after a restart.

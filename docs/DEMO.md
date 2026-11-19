# Demonstration

1. Open the dashboard and create a mandate using the default 65W charger policy. Tick the explicit authorization box and sign.
2. Run **Legitimate payment**. Open the verification result and confirm ALLOW and a synthetic UPI settlement reference.
3. Return to **AI Shopping Agent** and run **Policy violation**. Confirm REJECT and the failed single-payment limit.
4. Run **Suspicious substitution**. The scripted shopper follows a merchant recommendation for the 20W charger. Confirm ESCALATE and inspect the actual proposal.
5. Open **Human Review**, add a note if desired, and approve or reject the pending simulated transaction. Create a fresh mandate to run the sequence again with its full cumulative budget.
6. Open **Evidence Explorer** and verify the chain. Save the head digest outside the browser and paste it into the trusted checkpoint field after more events have been added.

The **Propose payment** button runs the shopper against the selected mandate. Scripted mode works offline. LLM mode requires a server API key, an operator token, and network access.

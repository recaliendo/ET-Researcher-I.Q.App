# Demo script (about 12 minutes)

Audience: engineers and product leaders. Theme: **a research product that refuses to overclaim, and shows exactly what would change its mind.**

## Before you start (5 minutes ahead)

1. Open https://et-researcher-iq.onrender.com in the browser you will present from and press **Ctrl+F5**.
2. Sign in with `ADMIN_TOKEN` (top-right button → paste → **Sign in**). The button shows **RI** and the sidebar badge reads **v0.8 + v09**.
3. Pick a theme with the sun/moon button (dark reads best on projectors).
4. Optional second window, signed out (private window), to show what the public sees.

## 1. Overview: the position in one screen (2 min)

- Hero: "Follow the evidence." The two-pathway diagram: *a sensor record cannot establish specimen provenance.*
- Metric cards: 25 core cases, 31 sources, 11 same-artifact audits, and **Primary study (RQ1): 0 / 197 eligible incidents, not yet testable**.
- Say: *"The product's job is to make the gap between a compelling story and a testable claim visible and measurable. That 0 is the most important number on the page."*
- **What we know / don't know / what comes next.**
- **Progress since v0.8**: 21 of 24 claims dated from cited sources, 0 human-reviewed, statuses unchanged.

## 2. Statistical lab: real numbers, honest limits (2 min)

- RQ1 card: **Not yet testable** (protocol status BLOCKED) with progress bars. Explain the gate: no p-value until an eligible, independently coded dataset exists.
- GEIPAN result recomputed live in the browser: χ²(6) = 77.81, p ≈ 1.01×10⁻¹⁴, V ≈ 0.199, with the green ✓ that it matches the published package.
- Point out: *"Significant, and still not evidence of anything extraterrestrial. It's about how classification changed by era."* Show the leave-one-out table and the C ≠ D explanation.
- Power planner: drag w from 0.2 to 0.1 and watch N go from 197 to 785.

## 3. Case explorer: provenance you can inspect (2 min)

- Open **Roswell debris recovery**. Two-lane evidence graph: lane A (observation → instrumentation), lane B (recovery → object → custody → lab). Red dashed boxes are missing proof-chain links.
- Open **Nimitz Tic Tac** → **Primary-source extraction**: first public statements (NYT 2017; joint 60 Minutes interview 2021), delays in days, source tier, "awaiting second human coder".

## 4. Evidence & proof hypothesis: separating two questions (2 min)

- "Was it here?" versus "Can we prove it now?"
- Move a slider; the combined rate is **illustrative scenario arithmetic**, labelled as such.
- **Observed stage outcomes from real cases**: the ORNL/AARO 2024 test of the alleged 1947 magnesium specimen found terrestrial isotopes and an undocumented custody chain. *"This is where real chains break: custody, not chemistry."*

## 5. Psychology lab (1 min)

- Signal detection demo: viewing conditions versus willingness to say "yes".
- "Why more witnesses is not more evidence": drag information sharing ρ up; six witnesses collapse toward one effective account.
- Coverage chart: human-coded 0/24 versus AI-extracted (striped), *not counted as coded*.

## 6. Live intelligence and governance (2 min)

- Six real sources on provider-specific schedules; every item **Analyst review pending** until a human records a rationale.
- Research assistant: ask *"Which investigations have the most consequential custody gaps?"* Answers cite retrieved records and state their uncertainty.
- Operations: provider health, audit log, and the **Publication boundary** (staged changes, confirmation, stale-save protection). Witness data stays private.

## 7. Close (1 min)

*"Every number links to its source and its limitations. The roadmap says what would move each gate: 100 adjudicated incidents, a second blinded coder, and one artifact with an unbroken custody chain. That's the product: an evidence observatory that tells you what would change its mind."*

## Likely questions

| Question | Answer |
|---|---|
| Why not just say RQ1 passed or failed? | It can't be tested yet. Running a test on ineligible data would produce a meaningless p-value. |
| Is the AI deciding anything? | No. It retrieves and extracts with citations; human coders adjudicate. Citations outside the retrieved set are rejected. |
| How is private data protected? | Private by default, an audited publication boundary, role-based access, and a database closed to the internet. |
| What's the stack? | Next.js and TypeScript, PostgreSQL on Render, scheduled ingestion, axe-checked WCAG 2.2 AA. |

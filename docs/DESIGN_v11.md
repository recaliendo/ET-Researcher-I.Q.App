# v11 product design and frontend uplift (16 October 2026)

Goal: make the observatory more understandable to the public and harder for experts to misunderstand, without diluting any caveat.

**Method note.** The 4:11 screen recording could not be played in this environment, because no video tooling is available. The audit below uses:
- the brief's description of the recording;
- the running app, both local and live;
- the code;
- the v08 package.

## 1. Before → after screen audit

| Area | Before (recording, v0.8/v09) | After (v11) |
|---|---|---|
| Navigation | One flat list of 10 items; operations visible to everyone | Grouped: **Discover** (Overview, Live intelligence, Cases), **Research** (Findings, Statistics, Psychology, Proof & scenario lab, Priorities) and **Standards** (Methodology). Mars is a separate branch with a distinct accent. **Operations** appears only to signed-in roles. |
| Top bar | Breadcrumb, search, theme, notifications | Adds a dataset chip (version and access role), a keyboard-operable **Status key** and a density toggle (compact/comfortable). The breadcrumb truncates cleanly instead of overlapping. |
| Landing | Hero, metrics, scientific position | New subtitle; CTAs **Explore the evidence** and **Inspect the methods**; **What is established today** (four status-chipped statements, each linking to its proof); the two evidence tracks; "What makes this different from a sightings catalogue"; **How to verify this** micro-links. "Latest official developments" now uses the triage topic, so a social study *about* hearings is no longer listed as a hearing. |
| Status language | BLOCKED / PARTIAL tags repeated across pages, colour-led | Six semantic statuses (Verified ✓, Provisional ◐, Simulation ∿, Excluded ⊘, Negative ✗, Unknown ?). Each always has a symbol and a word, never colour alone, and is defined in the Status key and the Methodology glossary. |
| Statistics lab | Methods below the fold; RQ1 "BLOCKED" card beside GEIPAN | Methods first; then a three-way comparison (published association / novel RQ1 test / sandboxes). RQ1 becomes **"Not yet inferentially testable"** with its four gates linked to funnel stages. The readiness funnel, the GEIPAN explorer with a calculation-code link, a one-click reproducible re-run and checksummed manifest, and calculators are anchored as `#calculators`. |
| Proof hypothesis | Scenario sliders and a 0.82% composite shown on load | Renamed **Proof & scenario lab**. Real stage records come first. The calculator sits behind **Open the Scenario Lab**, under a permanent notice: "illustrative conditional assumptions; not an observed success rate, ET probability or predictive model". Presets are labelled "(assumed)", and there are a reset button and a dependence/uncertainty note. |
| Psychology | Theory list; uncoded references mixed in | Logic chain shown up front: perceptual conditions → encoding and memory → recorded account → independence assessment → RQ test. A research-question filter, and each theory shows its code, PSY mapping and coded-claim count. The sections are named as the brief asks, from Mechanism through Original research and DOI. The new section, "How it bears on RQ inclusion and conclusions", is placed after the limits. Simulations are badged "Simulation · not observed UAP data". |
| Live feed | Long cards; "Analyst review pending"; keyword categories | Filter by what each item studies (topic) and by disposition. Badges are precise ("source-verified metadata lead", "Machine-classified · research not adjudicated"). One evidence-status line per item, with novelty, significance and case links behind a disclosure. Titles wrap safely. |
| Case explorer | Country filter; graph only; empty panels | Filters for evidence track, primary-document status and custody records. Each card shows primary-doc, independence and custody status chips. **Graph / List** views. Clicking a red missing-link node gives the exact missing item, the next discriminating evidence and the research task. |
| Mars | Same styling as UAP pages | Distinct ochre accent and a banner: "Planetary chemistry, not UAP research. Nothing here counts toward any UAP case, statistic or readiness number." |
| Methodology | Collections and rules | Adds a searchable-by-eye **Glossary and status definitions** (`/methodology#glossary`). |

## 2. Component inventory (new or changed)

| Component | File | Purpose |
|---|---|---|
| `Status` | `src/components/chrome.tsx` | Semantic chip: symbol, word and tooltip definition |
| `StatusKey` | `src/components/chrome.tsx` | Top-bar disclosure; Escape and outside-click close it |
| `DensityToggle` | `src/components/chrome.tsx` | Compact/comfortable; `data-density` on `<html>` |
| `ReadinessGlance`, `ReadinessFunnel`, `MethodsFirst`, `ReproduceRun`, `GapBoard` | `src/components/readiness.tsx` | Readiness and reproducibility |
| `caseProfile` | `src/components/research-views.tsx` | Per-case evidence profile for filters; unknown stays unknown |
| Vocabulary | `src/lib/glossary.ts` | `statuses`, `glossary`, `navGroups`: single source for UI copy |

## 3. Tokens

All tokens live in `src/app/globals.css`, with each one redefined for dark mode.

- **Existing colour tokens:** `--bg`, `--surface`, `--ink`, `--muted`, `--accent` and the green/amber/red/blue pairs.
- **Additions:**
  - Status chips map to the soft/strong colour pairs.
  - Tabular numerals on every count, statistic and table cell.
  - `--font-mono` for IDs and codes.
  - Density overrides.
  - A Mars accent, scoped by `.mars-track`.
  - Headline scale `--text-3xl: clamp(1.9rem, 4.5vw, 3.4rem)` for narrow screens.
- **Unchanged:** the forest-green brand, editorial serif headings, sans body.

## 4. UI copy glossary

The glossary is defined once in `src/lib/glossary.ts` and rendered in the Status key and on Methodology. Key terms:
- BLOCKED / Not yet inferentially testable
- PARTIAL AUDIT
- NOT ESTABLISHED
- Source-verified metadata lead
- Human review required
- Operational progress versus evidence readiness
- Independent account
- Authenticated outcome
- GEIPAN category D
- Effect size
- Design effect
- Scenario Lab
- Private / access-restricted

## 5. Core-task measurements (automated, `scripts/e2e.ts`)

| Task | Path | Interactions |
|---|---|---|
| (a) What is established, in ≤30 s | Landing → "What is established today" | 0 (above the metrics) |
| (b) RQ1 exclusion criteria and GEIPAN code | Landing → **Inspect the methods** (exclusions at top; "Calculation code" link in the GEIPAN panel) | 1–2 |
| (c) Missing original account for a case | Cases → case → **List** (or click a red node) | 2–3 |
| (d) Low-risk source auto-dispositioned; high-risk escalated with a reason | Automatic (triage policy); human queue under Operations | 0 |
| (e) Mobile reach to results and sources | Drawer navigation; no horizontal overflow at 320–375 px | — |

**Not done:** usability sessions with statisticians, archival researchers and non-experts. These need real participants. The e2e script measures task paths and accessibility; it does not measure misreading by people.

## 6. Research-communication integrity assessment

- **No new scientific claim** is made anywhere in the redesign. Every "established" line links to its computation or record.
- **The scenario arithmetic** (formerly 0.82% on load) is no longer visible until a user deliberately opens the Scenario Lab, and it never appears in findings.
- **BLOCKED is reframed as a gate**, with the exact missing gates listed. It is not presented as a failed test, and the status itself is not upgraded.
- **The negative result** (2024 terrestrial specimen; no complete custody chain) is presented as prominently as open questions.
- **The Mars track** is visually and verbally separated from UAP evidence.
- **Residual risk:** the hero diagram is decorative. It is labelled "Two pathways. Distinct claims." and paired with the literal track lists below it, so readers should not mistake it for data.

## 7. How to run the frontend checks

```bash
pnpm build
pnpm start -- --port 3001
npx tsx scripts/e2e.ts http://127.0.0.1:3001 --screenshots ./tmp-shots
```

The script runs axe-core WCAG 2.2 A/AA on 11 pages in light and dark themes at 1440, 768, 375 and 320 px. It also checks for horizontal overflow, Scenario Lab gating, keyboard operation of the Status key, and the core tasks above.

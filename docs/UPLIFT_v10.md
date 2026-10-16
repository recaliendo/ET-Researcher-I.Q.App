# v10 research and engineering uplift (16 October 2026)

Scope: the first measurable slices of the "Expert Research + Staff Engineering End-to-End Uplift" brief: slices 0, 1, 2, 5 and part of 6. Nothing in this release changes an RQ status, adds incident records, simulates a coder or estimates an extraterrestrial-origin probability.

## 1. Baseline audit (slice 0)

**Stack (verified from the repository, not the demo):**
- Next.js 16 App Router (webpack) with React 19 and TypeScript.
- One API route, `src/app/api/[action]/route.ts`, serves health, data, export, document, notifications, login/logout, ingest, cron, ask, analysis, task, review, provider, publish, publish-set, subscribe and retriage.
- PostgreSQL on Render (PGlite locally).
- Raw SQL migrations: every `db/NNN_*.sql` file runs in order at startup and is idempotent.
- An in-process scheduler (PostgreSQL only).
- 6 allowlisted providers.
- HMAC session cookies with reader, editor and admin roles.

**Dependency graph:**

```
CSV/JSON research package ─▶ importer.ts ─▶ records (versioned, private by default) ─▶ /api/data ─▶ components
providers ─▶ ingestion.ts ─▶ feed_items ─▶ triage.ts (v10) ─▶ /api/data (public leads + human-reviewed)
records ─▶ funnel.ts (v10) ─▶ readiness_snapshots (v10) ─▶ Statistics lab, Overview
records ─▶ gaps.ts (v10) ─▶ Priorities gap board
statistics.ts ─▶ Statistics lab (live χ², bootstrap re-run, manifest)
```

**Placeholder or misleading surfaces found:**

| Surface | Problem | v10 change |
|---|---|---|
| Live feed | Every item showed "Analyst review pending" indefinitely | Deterministic triage, described in section 3 |
| Priorities | Phases 1–6 shown as "Not started" with no task-level view | G001–G012 gap board |
| Statistics lab | No methods-first protocol; the bootstrap interval was quoted but never re-run | Methods panel, funnel, one-click re-run |
| Psychology | Psychophysical scaling sat beside PSY01 with no code | Unique codes TH01–TH15 and an explicit crosswalk |

**Not done:**
- The screen recording was not analyzed frame by frame, because no video tooling is available in this environment. The brief's description of it was used.
- v07 originals are still absent (G001). No merge is claimed.

## 2. Metric reconciliation

| Displayed | Rows behind it | Rule |
|---|---|---|
| 25 core cases | `Events` (E001–E025) | Curated, nonrandom. Not a sampling frame. |
| 46 worldwide leads | `Worldwide_Cases` (C01–C46) | They overlap the core cases and are never summed with them. |
| 67 provisional links | `Worldwide_Crosswalk` | 21 have a v08 link decision (13 events, 8 witnesses); 46 are staging only; 0 are source-verified. |
| 31 source records | 16 in `Sources` + 15 in `Source_Registry_v08` | A registry entry is not proof that its content was verified. |
| 21 / 24 first statements | `Primary_Source_Extraction_v09` | AI-located. 13 cite Wikipedia as a locator and 11 cite news; **0 primary documents and 0 human-confirmed.** |
| 0 / 24 human-adjudicated | Coder 1 and Coder 2 in `Cognitive_Claim_Coding` | "Unknown" on every row. |
| 0 / 197 | Inclusion reason in `Statistical_Eligibility_v06` | All 25 events: "Excluded: no independent ground-truth outcome". |

**What 197 means:** it is a planning value, not a count of known incidents. It assumes an ideal independent 2×2 table, w = 0.20, α = .05 and 80% power. At the v08 illustrative design effect of 1.4 the figure is 276. The protocol's pilot milestone is 100 adjudicated incidents.

## 3. Live Intelligence triage (slice 2)

The policy is `src/lib/triage.ts`, version `triage-policy-2026-10-16.3`. Each item moves through these states: DISCOVERED → FETCHED → DEDUPED → METADATA_VERIFIED → AUTO_CLASSIFIED or HUMAN_REVIEW_REQUIRED, or REJECTED.

**Machine checks:**
- The link points to the expected publisher domain.
- A plausible title is present.
- The date is valid and not in the future.
- A persistent identifier is present (DOI, arXiv ID or document number).
- The item is not a duplicate (same title and same publication day).
- No private personal data is stored.

**Full text** is recorded as *not attempted*, because rights are not cleared.

**Possible outcomes:**
- **Source-verified metadata lead · research not adjudicated.** Public, and labelled as such.
- **Requires expert review.** Triggered by corrections or retractions, physical-material claims, or name-matched case associations. The service level is 7 days, and the owner stays unassigned until a real reviewer exists.
- **Metadata check failed** or **possible duplicate.** Not public.

**Guarantees:**
- Machines never set "human reviewed"; only a recorded human decision does.
- No confidence score is shown, because the rules are deterministic and uncalibrated.

**Topic** records what an item studies, not what it proves. For example, a study of social responses to UAP hearings is labelled "Studies human or institutional responses to UAP; it does not corroborate any UAP event."

**Local run** (58 items): 54 metadata leads and 4 sent for expert review. All 4 were case-name associations, including the Palomar sky-survey transients paper and two Trinity-era historical pieces.

## 4. Readiness funnel (slice 1)

`src/lib/funnel.ts` computes stages a–l. Each stage carries:
- an **operational** count (machine work or single passes) and an **evidence** count (rows that passed a gate);
- its rule, source collections and row IDs;
- the reason it is blocked and the task that unlocks it.

Snapshots are stored in `readiness_snapshots` only when a number changes.

Current evidence counts: 31 curated sources; 0/67 verified links; 3/25 primary dossiers indexed; 0/24 primary dated statements; 0/9 known contact chronologies; 0/25 authenticated outcomes; 0/24 human-coded; 0 dual-coded; 0 eligible; effective N 0 of 276.

## 5. Statistics lab (slice 5)

- **Methods before data:** estimand, unit, exposure, outcome, inclusion and exclusion, controls, clustering, confounders, missingness, decision rule and sample plan. It is labelled as a draft that is **not preregistered**.
- **One-click re-run:**
  - recomputes χ², p and V from the 14 published cells and re-runs 20,000 bootstrap resamples (seed 20261015);
  - uses a mulberry32 random generator, which differs from the package's numpy run;
  - compares everything with the package and issues a SHA-256-checksummed manifest.
  - Result: CI 0.174–0.237 against the published 0.174–0.236, which agrees within Monte Carlo error.

## 6. Psychology

- Every theory has a unique code, TH01–TH15, and an explicit crosswalk to v0.8 PSY01–PSY14.
- TH02 (psychophysical scaling) has no PSY code and is labelled as such.
- Each theory shows its research questions, evidence tier and generalizability, plus "how it can support or challenge a conclusion".
- Sliders carry the label **Simulation · not observed UAP data** and state their assumptions.

## 7. Blocker registry: what only people or outside parties can unblock

| Gap | Required action | Owner (role) |
|---|---|---|
| G001 / G012 | Supply the v07 package | Principal investigator |
| G005 | Recruit two trained, blinded human coders | Research methodologist |
| G003 | Retrieve primary statements (newspaper archives, transcripts, debriefs); some need paid or archival access | Archival historian |
| G006 / G010 | Obtain custody and accession records from specimen holders | Materials scientist |
| G011 | Run and log the registry search strategy (GEIPAN, NARA/Blue Book, UK, Canada, Brazil) | Methodologist with ingestion engineering |
| Preregistration | Register the RQ1 protocol on a public registry before any confirmatory test | Principal statistician |

## 8. Verification

- 38 automated tests pass, including the golden GEIPAN statistics and these guardrail cases:
  - a social-study lead;
  - duplicates and a false-duplicate guard;
  - wrong-domain, missing-DOI and future-date items;
  - no machine-set human review;
  - unknown treated as missing;
  - AI not counted as a coder;
  - no second coder;
  - ten retellings counted as one account;
  - the public partial view;
  - unique psychology codes;
  - crosswalk referential integrity.
- axe-core WCAG 2.2 AA: 0 violations on Priorities, Statistics, Live feed and Psychology.
- No horizontal overflow at 375 px.

# Protocol amendment A1 (v10): agent-adjudicated exploratory standard

**Amendment ID:** A1
**Date:** 16 October 2026
**Applies to:** RQ1 incident coding, and the RQ2, RQ4, RQ5 and RQ6 indicator variables
**Status:** in force for the *exploratory* pathway only. The confirmatory standard is unchanged.

## Why

v0.8 and v09 left RQ1 at 0 eligible incidents for two reasons:
- **A technical bottleneck:** no workflow existed to turn sources into coded incidents, so each step waited on a person.
- **A scientific limitation:** first statements, independence records and authenticated outcomes are genuinely missing or unpublished for many cases.

This amendment removes the technical bottleneck. It does not remove the scientific limitation and cannot.

## Two standards, kept apart

| | **Confirmatory (unchanged)** | **Exploratory (new, A1)** |
|---|---|---|
| Coders | Two blinded **human** coders, with agreement (κ/α) reported before adjudication | Two blinded **machine** coders (same rubric, separate runs, no access to each other's output) |
| Adjudication | Human adjudicator | Deterministic rules engine plus an adversarial machine review |
| Source verification | Human-checked primary sources | Machine: page retrieved, SHA-256 recorded, every cited quote found verbatim on the live page |
| Output | Confirmatory eligibility (B) | Exploratory eligibility (A) |
| Allowed use | Preregistered inferential tests | Descriptive statistics and hypothesis generation, labelled "exploratory, machine-adjudicated" |

- A machine-adjudicated record **never** satisfies the confirmatory standard.
- Machine–machine agreement is reported as such. It is **not** inter-rater reliability and not evidence of accuracy.

## Rubric R1 (version `R1-2026-10-16`)

Each variable takes a value from **YES / NO / UNKNOWN / CONFLICTED / NOT_APPLICABLE**.

| Code | Variable | YES requires | NO requires |
|---|---|---|---|
| V1 | Unique incident identity | A dated, located event in a retrieved source | Evidence that the "incident" is a duplicate or a composite |
| V2 | Firsthand testimony | At least one identified observer's own account in a retrieved document | Only second-hand accounts exist after search |
| V3 | Source authenticity | At least one retrieved primary-tier (official or archival) document about the event, with a verified quote | — (otherwise UNKNOWN) |
| V4 | Independent accounts (RQ1 exposure) | At least two firsthand accounts documented separately, before contact | Only one firsthand observer, or accounts documented as joint or post-contact |
| V5 | Objective corroboration (RQ1 outcome) | An independently authenticated instrument or physical record of the event, **whatever its origin** | An adequate investigation (V6 = YES) documents that no such record exists |
| V6 | Investigation adequacy | A documented official investigation with stated method and conclusion | Documented that no investigation was made |
| V7 | Conventional explanation recorded (RQ6) | An official or published conventional explanation exists | Investigators record that none fits |

- Missing evidence is UNKNOWN, never NO.
- An authenticated conventional sensor record satisfies V5 = YES and says nothing about extraterrestrial origin.

## Adjudication rules (deterministic, version `E1`)

1. A coder's YES or NO counts only if **every** citation it relies on is a verified quote or an imported record ID. Otherwise that coder's value is downgraded to UNKNOWN.
2. The adversarial reviewer may **reject** a variable. A rejected variable becomes UNKNOWN with the reason recorded. Rejection never turns a value into its opposite.
3. Both coders agree → that value. YES against NO → **CONFLICTED** (escalated to human review). A definite value against UNKNOWN → UNKNOWN, with the disagreement logged.
4. Incident state:
   - **AGENT_CONFLICT** plus **HUMAN_REVIEW_REQUIRED** if any of V1–V5 is CONFLICTED.
   - **INSUFFICIENT_EVIDENCE** if no source was verified, or if any required variable is UNKNOWN.
   - **MACHINE_ADJUDICATED** otherwise.
5. **Exploratory eligibility (A):** MACHINE_ADJUDICATED; V1 = V2 = V3 = YES; V4 ∈ {YES, NO}; V5 ∈ {YES, NO}; and V5 = NO only if V6 = YES.
6. **Confirmatory eligibility (B):** everything in A, plus two independent human validations recorded in the app. Machines cannot create these.

## Analysis plan for the exploratory pathway

- Report the 2×2 counts, risk ratio and Fisher exact p only when there are at least 20 exploratory-eligible incidents and every margin is non-zero. Otherwise report "not estimable".
- Every result is labelled exploratory. No optional stopping. No confirmatory claim.
- Power is re-estimated from the observed exposure prevalence; 197 remains only a planning value.

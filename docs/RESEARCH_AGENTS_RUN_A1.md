# Autonomous research run A1-1 (16 October 2026)

**Protocol:** [Amendment A1](PROTOCOL_AMENDMENT_v10.md)
**Rubric:** R1-2026-10-16 · **Engine:** E1 · **Prompt:** P1-2026-10-16
**Scope:** all 25 core incidents. The first 10 passed engineering and scientific QA before the other 15 were processed.

Run data (sources, quotes, agent outputs, `bundle.json`) is in `private/agent_runs/`. It is not committed, because it links named witnesses to statements.

## Pipeline as executed

| Agent | How it ran | Output |
|---|---|---|
| 1. Source acquisition | 7 web-research agents, each limited to a fixed number of tool calls per incident, then a deterministic verifier: HTTPS only, SSRF and DNS checks, SHA-256 of each page, every quote matched on the page re-fetched at verification time | 75 documents retrieved, 141 of 148 quotes verified |
| 2–4. Witness independence, cognitive variables, objective evidence | Encoded as rubric variables V2–V7, coded by agents 5 and 6 | — |
| 5–6. Blinded machine coders | Two separate agent contexts. Dossier only (records plus verified quotes), no web access, no access to each other's files | 50 codings (175 variable pairs) |
| 7. Adversarial reviewer | Separate context; may reject but never flip a value | Batch 1: 27 upheld, 18 rejected. Batch 2: 37 upheld, 17 rejected |
| 8. Statistical eligibility | Rules engine E1 (deterministic, tested) | 0 exploratory-eligible, 0 confirmatory-eligible |
| 9. Orchestrator | Job queue with leases, 3 retries, stuck-job recovery, idempotent re-runs | 25 of 25 done, 0 failures |

**Model:** claude-opus-5-5, run as Claude Code subagents with separate contexts. Both coders are the same model with the same prompt, so their errors are correlated. Their agreement (κ = 0.96 over 175 pairs, 97.7% identical) is **not** inter-rater reliability and not evidence of accuracy.

## Before and after

| Measure | Before (v09) | After (A1-1) |
|---|---|---|
| Incidents with retrieved, hashed sources | 0 | 25 |
| Primary documents with verified quotes | 0 | 18 |
| Machine-adjudicated incidents | 0 | 25 (all INSUFFICIENT_EVIDENCE) |
| Exploratory-eligible incidents | 0 | **0** |
| Confirmatory-eligible incidents | 0 | **0** |

## Why RQ1 is still 0: the gate that fails, per incident

| Gate | Incidents where it is not established |
|---|---|
| V5 Objective corroboration (authenticated record) | 22 / 25 |
| V2 Firsthand testimony in the witness's own words | 19 / 25 |
| V4 Documented independence of accounts | 19 / 25 (5 are NO: single or joint accounts) |
| V3 Primary source in hand | 18 / 25 |
| V1 Single, identifiable incident | 9 / 25 (4 are composites that need splitting) |

- **Closest to eligible:**
  - E015 Delphos: needs V2 and V5.
  - E016 Nimitz: needs V4 and V5.
  - E021 Aguadilla: needs V2 and V4.
  - E024 Betz sphere: needs V2, V3 and V4.
- **This is a scientific limitation, not a workflow failure.** The records the protocol requires are, for most cases, not openly retrievable. Examples:
  - Blue Book and FBI files exist only as image scans or behind 403 responses.
  - GEIPAN rate-limited every request (HTTP 429).
  - Authentication of the Navy videos was available only through secondary copies.
  - Specimen custody chains are undocumented.

## Defects found and fixed during the run

1. **Source agents ran too long and wrote nothing.** Cause: broad scope and no incremental output. Fix: 2–3 incidents per agent, capped tool calls, one file written per incident.
2. **Duplicate document and quote IDs** when one URL was listed twice (E006). Fix: merge by URL and keep the more conservative tier. Covered by a regression test. E006 was re-coded by both coders, and the old outputs were kept in `superseded/`.
3. **PDF extraction** failed in isolated Python mode and on non-ASCII text. Fix: an empty working directory and UTF-8 mode.
4. **Source-agent rate limits:** two agents stopped at the account limit. Their completed files were kept and only the two missing incidents were re-run.

## Corrections the agents flagged for the research record

- E021: the record title says "2003", the date is 2013-04-25, and AARO gives 26 April 2013.
- E008, E011, E017 and E023 are composites. Split them into separate incidents before any count.
- E006: the event may be conflated with an April 1957 aircraft crash (Kaufmann and Sturrock, 2004).

## What would move incidents to eligible (human or archival work)

- Retrieve the scanned primary files (Blue Book, FBI Vault, LAC RG77, MoD DEFE 24, GEIPAN technical notes) and OCR them, so quotes can be verified.
- Document authentication for sensor records (for example, the provenance of the Navy FLIR video) and custody for specimens.
- Locate dated first statements made separately before any contact (V4).
- Two human reviewers, each with an individual account, for confirmatory eligibility. Machine adjudication can never supply this.

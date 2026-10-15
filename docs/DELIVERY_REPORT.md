# Delivery report

**Repository:** https://github.com/recaliendo/ET-Researcher-I.Q.App (branch `main`)
**Local workspace:** `C:\Users\Richa\OneDrive\ETRESEARCHERIQAPP` (runtime data in `%LOCALAPPDATA%\ETResearcherIQ`, outside OneDrive)
**Date:** 15 October 2026

## Implemented

- **Source integration.** All 63 members of the v0.8 package are checksum-verified against `MANIFEST_v08.json` before import (a mismatch aborts). 38 tables, 637 records loaded with original IDs; normalized incidents (25), witnesses (32), claims (24), artifacts (14), custody (5), sources (16), witness links (9), tasks (16); 13 documents chunked for retrieval. Re-import is idempotent. Worldwide leads (46) stay separate from core cases. The v07 limitation is preserved throughout. See [SOURCE_LINEAGE.md](SOURCE_LINEAGE.md).
- **All primary views:** Overview, Live intelligence, Findings (8 categories), Case & evidence explorer, Psychology lab, Statistical lab, Evidence protection & proof, Priorities, Methodology, Operations, Research assistant.
- **Live ingestion:** 6 real providers with provider-specific cadence, conditional requests, deduplication, versioning, failure tracking with backoff, a job lease, in-process scheduler, standalone worker and cron endpoint. First live runs stored 58 items, all pending review.
- **Statistics:** GEIPAN era × D/non-D recomputed live and checked against the package values (χ²(6)=77.81085, p=1.0113×10⁻¹⁴, V=0.19879, min expected 6.19). Residuals, Wilson intervals, leave-one-out sensitivity, power planning that reproduces `Power_v08`, Fisher exact sandbox, export. RQ1 is displayed as BLOCKED with eligibility reasons; no p-value is issued for it.
- **Proof-chain module:** v01 six-stage model reproduces the document's scenarios (0.0307%, 0.819%, 52.63%); expanded eight-stage model; technology vs biology pathways; social hypotheses with tests; empirical roadmap. Every value labelled illustrative.
- **Psychology:** 14 theories mapped to PSY01–PSY14 with explanation, context, relevance, variables, original studies, limits; SDT and witness-independence demos (labelled educational); witness-pair evaluation from `Witness_Dependency_v08`; claim-coding coverage (currently 0/24 documented, shown as such).
- **Provenance graph:** two lanes with no shared edges (observation → instrumentation; observation → recovery → object → custody → laboratory); missing links shown as red dashed nodes.
- **Governance:** roles, signed sessions, CSRF guard, audited reviews/transitions/publication, private-by-default records, AI citation validation.

## Tests & verification

- `pnpm test`: 22 tests pass locally (statistical reproduction, Fisher, power, proof-chain presets, feed parsing for all 5 formats, XML entity rejection, URL canonicalization, ingestion dedupe and failure handling, job lease, v0.8 import counts/idempotency/checksum tampering, auth roles and CSRF, citation validation). The two import tests skip in CI because the private package is not in the repository.
- `pnpm typecheck` and `pnpm build`: pass.
- Browser checks (dev server): every view rendered with imported data in dark and light themes; no horizontal overflow at 375 px; sandbox server analysis, task transition (reverted), invalid-state rejection, cross-origin rejection and assistant answers exercised.
- Bugs found and fixed during verification: Crossref dates parsed in local time; review insert had a parameter-count error; client bundle pulled in the database driver; CSRF check rejected same-origin browser requests in dev; graph fit at minimum zoom; Crossref query returned unrelated “anomalous” papers.

## Not done / limitations

- **Not deployed.** No hosting credentials were provided. The Dockerfile and [DEPLOYMENT.md](DEPLOYMENT.md) describe the remaining steps (PostgreSQL, tokens, import, scheduler).
- **No public research content yet.** Imported collections are private until an administrator publishes them after a rights and witness-privacy review, so a public deployment initially shows structure, live metadata after review, and sandboxes only.
- **AI synthesis** is off by default (retrieval-only answers). Enabling it needs `OPENAI_API_KEY`/`OPENAI_MODEL`; no embeddings are used; ranking is IDF keyword retrieval.
- **Accessibility:** built to WCAG 2.2 AA patterns but no automated axe audit or Playwright suite has been run yet (dependencies are installed).
- **Sources not yet connected:** AARO and defense.gov (blocked/redirecting), Congress.gov and UK National Archives (API keys required), GEIPAN, Canadian and Brazilian archives (no permitted feed identified).
- **Python analytics service** is optional and was not run in this session; the TypeScript implementation covers the verified result.
- Feed case-linking is a name-match suggestion requiring analyst review; contradiction detection is not automated.

## Recommended next priorities

1. Deploy to a container host with PostgreSQL and enable the scheduled-ingestion workflow.
2. Publication review of non-sensitive collections (RQ outcomes, statistical results, integrity gates, gaps) so the public site shows findings.
3. Add Playwright navigation + axe accessibility tests to CI.
4. Add Congress.gov and UK National Archives adapters once API keys are available.
5. Extract first-statement fields for the 24 coded claims (unblocks RQ2 work) and add a second blind coder.
6. Add embeddings-based retrieval and LLM synthesis behind the existing citation validator.

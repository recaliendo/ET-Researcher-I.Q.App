# Architecture

## Overview

```
Browser (React client components)
   │  GET /api/data · POST /api/{ask,analysis,task,review,publish,…}
   ▼
Next.js 16 App Router (Node runtime)
   ├─ src/app/[[...section]]      single route; section → view
   ├─ src/app/api/[action]        validated JSON API (zod), role checks, audit
   ├─ src/instrumentation.ts      in-process ingestion scheduler
   └─ src/lib/*                   domain modules
        ├─ db.ts            PGlite (local) or PostgreSQL (DATABASE_URL), schema from db/001_initial.sql
        ├─ importer.ts      checksum-verified v0.8 import → records + normalized tables + document chunks
        ├─ ingestion.ts     provider allowlist, bounded fetch, parsers, dedupe, versioning, backoff, lease
        ├─ assistant.ts     IDF retrieval, optional LLM with JSON schema + citation validation
        ├─ statistics.ts    χ², residuals, Wilson, Fisher, power, leave-one-out, verified constants
        ├─ proof.ts         proof-chain stages, presets, chain rule
        ├─ psychology.ts    theory library, SDT functions
        └─ auth.ts          roles, token/cookie sessions, same-origin guard
analytics/service.py        optional FastAPI + SciPy service (bootstrap CI, Fisher, noncentral power)
scripts/                    import, ingest, worker, migrate, lineage, package audit
```

## Technical decisions

| Decision | Reason |
|---|---|
| Next.js App Router + TypeScript | One deployable for UI and API; server-only DB access |
| PGlite locally, PostgreSQL in production | Zero-setup local runs with the same SQL; PGlite allows one process, so the standalone worker requires PostgreSQL |
| Raw SQL over an ORM layer | The schema is small and stable; Drizzle adapters are wired for later typed queries |
| Records stored as JSONB with original IDs | Preserves every v0.8 column without lossy remapping; normalized tables (incidents, witnesses, claims, artifacts, custody, sources, relations, tasks) are derived alongside |
| Hand-rolled SVG charts | Few charts, exact control over uncertainty display, no extra bundle |
| @xyflow/react for provenance | Accessible, zoomable graph with node inspection |
| Deterministic summaries by default | No AI text is presented unless a provider is configured; method is labelled on every feed item |

## Data separation

| Layer | Where | Who can change it |
|---|---|---|
| Canonical imported research | `records` (+ normalized tables), `release='v08'` | Importer only (idempotent, checksum-gated) |
| Retrieved public metadata | `feed_items`, `feed_versions`, `retrievals` | Ingestion |
| Automated proposals | `feed_items.status='pending'`, suggested `incident_ids` | Ingestion; never shown publicly |
| Reviewed conclusions | `review_decisions`, `feed_items.status` | Editors, with rationale; audited |
| AI outputs | `ai_runs` | Assistant; never writes to records |
| Workflow | `tasks` | Editors; transitions audited |

The LLM never writes to the evidence record. Retrieved text is passed as data with an instruction to ignore embedded instructions, and any citation outside the retrieved set rejects the answer.

## Ingestion pipeline

1. Scheduler tick (in-process every 15 min, `/api/cron`, or the worker) acquires the `ingestion` lease.
2. For each enabled provider whose `next_attempt` is due: bounded fetch (allowlisted URL, no redirects, 25 s timeout, 4 MB cap, conditional ETag/Last-Modified).
3. Parse (RSS/Atom with entity expansion refused; Crossref, Europe PMC, Federal Register JSON).
4. Filter for relevance (title rules, or the provider's own full-text query), canonicalize URLs, hash content.
5. Deduplicate by canonical URL; unchanged content is skipped, changed content resets review to pending and is versioned.
6. Mark repeated headlines as possible repeats; suggest case associations by name (analyst review required).
7. On failure: record the error, increment failures, exponential backoff capped at 24 h.
8. Editors review items; reviewed items become public and generate subscriber notifications.

News volume and repetition are never counted as independent corroboration; every item carries “Unassessed; not independent corroboration” until reviewed.

## Live sources

| Provider | Endpoint type | Cadence | Notes |
|---|---|---|---|
| arXiv | Atom API | 24 h | UAP query |
| Crossref | REST JSON | 24 h | relevance-sorted, from 2021 |
| Europe PMC | REST JSON | 24 h | peer-reviewed literature |
| Federal Register | REST JSON | 12 h | full-text match for “unidentified anomalous phenomena” |
| GovInfo | RSS | 6 h | congressional hearings, title-filtered |
| NASA | RSS | 6 h | title-filtered |

AARO (aaro.mil returned 403 to automated requests) and the defense.gov RSS endpoint (redirects, which the bounded fetcher refuses) were tested during the build and not added. Congress.gov and UK National Archives APIs need keys; they are listed as next priorities.

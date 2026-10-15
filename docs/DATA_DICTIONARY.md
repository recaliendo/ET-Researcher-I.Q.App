# Data dictionary

The application schema is in [db/001_initial.sql](../db/001_initial.sql). The research package carries its own column-level dictionary (`Data_Dictionary_v08.csv`, private); this document covers the application tables.

## Research store

| Table | Key columns | Meaning |
|---|---|---|
| `imports` | `filename`, `sha256`, `status`, `record_count`, `limitations` | One row per verified package member. `status`: `imported` (rows loaded) or `lineage-preserved` (checksum verified, not converted to records) |
| `records` | `id = v08:<Collection>:<SourceID>`, `collection`, `source_id`, `release`, `payload` (JSONB), `publication` | Every imported CSV row with all original columns. `source_id` uses the table's own ID column (EventID, WitnessID, ClaimID…) or a zero-padded row number when the table has none. `publication` is `private` until an audited publish |
| `incidents` | `id` (EventID), `title`, `country`, `event_date` | 25 core cases. Worldwide leads stay in `records` and are not promoted |
| `witnesses` | `id` (WitnessID), `incident_id` | Attributed witnesses. No credibility score exists |
| `claims` | `id` (ClaimID), `incident_id`, `witness_id`, `artifact_id` | Atomic claims |
| `artifacts` | `id` (ArtifactID), `incident_id` | Reported material or trace |
| `custody_transfers` | `id` (CustodyID), `artifact_id` | Documented transfers and examinations |
| `sources` | `id` (SourceID), `url`, `title` | Source records |
| `relations` | `from_id`, `to_id`, `kind`, `basis`, `status` | Witness-dependency links; `status='imported'` means not adjudicated |
| `documents`, `chunks` | `sha256`; `ordinal`, `content` | Private full text split into ~1,800-character chunks for retrieval |

## Live intelligence

| Table | Key columns | Meaning |
|---|---|---|
| `providers` | `url` (allowlisted), `cadence_minutes` (≥ 60), `last_success`, `next_attempt`, `failures`, `last_error`, `etag`, `policy_url`, `license_note` | Source health and schedule |
| `retrievals` | `provider_id`, `status`, `sha256`, `item_count`, `error` | Every fetch attempt, success or failure |
| `feed_items` | `canonical_url` (unique), `content_hash`, `category`, `status`, `summary`, `summary_method`, `novelty`, `significance`, `contradictions`, `incident_ids`, `original_source_status` | Discovered items. `status`: pending → reviewed / rejected / corrected / retracted |
| `feed_versions` | `item_id`, `retrieval_id`, `content_hash` | History of metadata changes per item |
| `review_decisions` | `item_id`, `actor`, `decision`, `rationale` (≥ 20 chars) | Human review, audited |
| `subscriptions`, `notifications` | `subscriber_hash` (SHA-256 of a browser UUID), `category` | In-app notices; no email or personal data stored |

## Workflow & governance

| Table | Meaning |
|---|---|
| `tasks` | Research backlog from `Research_Queue`; `state` ∈ Proposed, Source Located, Collection in Progress, Evidence Extracted, Review Required, Adjudicated, Completed, Blocked |
| `audit_log` | Actor, action, target, details for imports, ingestion, reviews, task transitions, provider and publication changes |
| `analyses` | Inputs and outputs of server-side statistical runs |
| `ai_runs` | Assistant questions, mode, citations and answers |
| `job_leases` | Prevents overlapping ingestion runs |

## Missingness conventions

`Unknown`, `Not recorded` and blank values are kept as recorded. The application never converts them to “No” or “False”, never imputes, and displays them as gaps.

# Security, governance & publication boundary

## Publication boundary

- The GitHub repository is public. Research files (`UAP_*`), `private/`, local databases and `.env*` are git-ignored.
- Imported records are `private`. Public visitors see only collections an administrator publishes through **Operations → Publication boundary**; every change is audited.
- Before publishing a collection: confirm rights to republish, remove or pseudonymize private witness details, and confirm no copyrighted full text is exposed. Feed items store metadata and links only, never republished full text.

## Roles

| Role | Can |
|---|---|
| public | Read published collections and reviewed feed items; run sandboxes; subscribe to notices |
| reader | Read private research; use the assistant |
| editor | Review feed items, correct or retract, move research tasks |
| admin | Run ingestion, configure providers, change publication |

Tokens must be 32+ characters; comparisons are constant-time. Sessions are HMAC-signed, `HttpOnly`, `SameSite=Strict` cookies that expire after 8 hours. The loopback admin shortcut exists only when `NODE_ENV=development`.

## Request safety

- Every write requires the right role and a same-origin `Origin` header (CSRF guard); bodies are capped at 30 KB and validated with zod.
- Security headers: CSP, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, restrictive permissions policy.
- External text is rendered as React text (never HTML). Links are limited to http(s) and open with `noopener noreferrer`.
- Ingestion only fetches allowlisted provider URLs, refuses redirects, caps size and time, and rejects XML DTDs/entities.

## AI safeguards

- Retrieved text is passed as untrusted data with instructions to ignore embedded commands.
- Structured JSON output; any citation outside the retrieved set rejects the answer.
- Private records go to an external model only if `ALLOW_PRIVATE_AI=true`.
- AI output never modifies records; it is stored in `ai_runs` and labelled “analyst review required”.

## Corrections & retractions

Editors mark feed items `corrected` or `retracted` with a rationale. Decisions appear under **Methodology → Corrections & retractions**, are written to the audit log, and notify subscribers. Imported research is corrected by issuing a new package version and re-importing, never by editing records in place.

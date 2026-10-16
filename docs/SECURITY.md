# Security, governance & publication boundary

## Publication boundary

**Terminology:** “Private” denotes restricted access to a maintained research record, not exclusive possession of original scientific or physical evidence. “Published” denotes an approved visibility decision, not corroboration or authentication. See [Research, evidence and release classifications](CLAIM_AND_RELEASE_CLASSIFICATIONS.md).

- The GitHub repository is public. Research files (`UAP_*`), `private/`, local databases and `.env*` are git-ignored.
- Imported records are `private`. Public visitors see only collections an administrator publishes through **Operations → Publication boundary**; every change is audited. The public/private flag has no evidentiary-strength meaning.
- Before publishing a collection: confirm rights to republish, remove or pseudonymize private witness details, and confirm no copyrighted full text is exposed. An admin review for publication does not independently verify scientific claims. Feed items store metadata and links only, never republished full text.

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

The canonical corpus documents sources, assertions and secondary research with explicit limits; model outputs are not original evidence or adjudicated research findings.

- Retrieved text is passed as untrusted data with instructions to ignore embedded commands.
- Structured JSON output; any citation outside the retrieved set rejects the answer.
- Private records go to an external model only if `ALLOW_PRIVATE_AI=true`.
- AI output never modifies records; it is stored in `ai_runs` and labelled “analyst review required”.

## Corrections & retractions

Editors mark feed items `corrected` or `retracted` with a rationale. Decisions appear under **Methodology → Corrections & retractions**, are written to the audit log, and notify subscribers. Imported research is corrected by issuing a new package version and re-importing, never by editing records in place.

## Hardening (security-hardening branch, October 2026)

See [SECURITY_ASSESSMENT.md](SECURITY_ASSESSMENT.md) for the full register.

- **Response contracts:** `src/lib/contracts.ts` allow-lists fields per role for `GET /api/data`.
  - Public: published collections, labelled leads, provider health, and the public correction history only.
  - Reader: research data.
  - Editor: audit and imports.
  - Admin: publication settings.
- **Sessions:** sign-in creates a server-side session (`et_sid`, HttpOnly, Secure, SameSite=Strict, 8 h).
  - Sign-out revokes it. Rotating a role token ends every session issued with it.
  - Admins can revoke all sessions from Operations.
- **CSRF:** cookie-authenticated writes require a same-origin `Origin` or `Sec-Fetch-Site`. Login is same-origin only.
- **Rate limits:**
  - Login: 10 per 15 min per client, 100 overall.
  - Analysis: 30/min. Subscribe: 10/h. Data: 120/min. Export: 10/min. Ask: 20/min per session, concurrency 4.
- **Errors:** unexpected errors return a generic message with a log reference.
- **Headers:** CSP without `unsafe-eval` in production; HSTS, COOP, CORP, X-Frame-Options, nosniff and Permissions-Policy.
- **Agents:** `src/lib/agent-policy.ts` defines least-privilege grants and human-only actions. It also covers SSRF-safe URLs, prompt-injection flags and deterministic output validation.
- **CI gates:** `.github/workflows/security.yml` covers dependency audit, secret detection, CodeQL, container scan with SBOM, and the security tests. Dependabot is enabled.

# Security assessment and remediation register (16 October 2026)

**Branch:** `security-hardening` (based on `main` at `c2ee51e`)
**Status:** not merged and not deployed. Production is unchanged until this branch is approved and merged.

**Evidence labels used below:**
- **Confirmed (local):** reproduced with automated tests against an isolated fixture database.
- **Confirmed (production, read-only):** observed with a single anonymous GET on the live site. No destructive or load testing was run against production.
- **Unverified:** reasoned from code, not reproduced.

## 1. Confirmed vulnerabilities

| ID | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| S1 | **High** | `GET /api/data` returned every `review_decisions` row to anonymous visitors: internal rationales, reviewer identifiers, and decisions on unpublished items. | Confirmed (local). Before the fix, the fixture test leaked `INTERNAL REVIEW NOTE` and `editor:abc`; after the fix, nothing. Production (read-only): the field is served to anonymous callers, but currently **0 rows** exist, so no review data has been exposed yet. | **Fixed.** Public sees only corrected/retracted decisions on public items (the intended public correction history), without the actor. |
| S2 | Medium | Raw provider errors (for example `ECONNREFUSED 10.0.0.5:5432`) and internal provider URLs, ETags and attempt times were sent to anonymous visitors. | Confirmed (local); production returns the same fields to anonymous callers. | **Fixed.** Public provider contract: health and schedule only, with a generic error message. |
| S3 | Medium | Unexpected errors returned `e.message` verbatim, which can expose SQL, hostnames or stack details. | Confirmed (local): a simulated DB error leaked the table and host before the fix. | **Fixed.** Generic message plus a log reference; only validation, permission and declared public errors pass through. |
| S4 | Medium | Sessions were stateless HMAC cookies. Sign-out did not invalidate a copied cookie, and there was no way to revoke sessions. | Confirmed by code review and tests. | **Fixed.** Server-side sessions (`db/003_sessions.sql`), revoked on sign-out. Admin "Revoke all sessions". A session dies when its role token is rotated (token fingerprint). |
| S5 | Medium | No rate limiting on login, analysis, subscription, export or notifications. Anonymous `POST /api/subscribe` could grow the database without bound. Anonymous `POST /api/analysis` would call the remote analytics service and store a row per request whenever `ANALYTICS_URL` is set. | Confirmed (local). | **Fixed.** Per-client sliding windows (login 10/15 min with a global cap of 100; analysis 30/min; subscribe 10/h; data 120/min; export 10/min). Subscription cap of 50,000. Analysis input limits tightened. Remote analytics and storage restricted to signed-in researchers, with concurrency 2. Ask concurrency 4. |
| S6 | Medium | CSRF relied on a missing `Origin` header meaning "safe" for cookie-authenticated writes. Login accepted cross-origin requests (login CSRF). | Confirmed by tests. | **Fixed.** Cookie-authenticated writes need a matching `Origin` or `Sec-Fetch-Site: same-origin`. Login is same-origin only. Bearer clients are unchanged. |
| S7 | Low | Readers received the audit log and import manifests. | Confirmed (local). | **Fixed.** Audit and imports go to editor and above; publication settings to admin only. |
| S8 | Low | Production CSP allowed `'unsafe-eval'`; no HSTS, COOP or CORP headers. | Confirmed with response headers. | **Fixed.** No `unsafe-eval` in production, plus HSTS, COOP, CORP and `object-src 'none'`. All 10 pages and the in-browser bootstrap run with 0 console errors under the new policy. |
| S9 | Low | The cron token was compared with `!==` (not constant-time); role tokens were compared with a length-revealing early exit. | Code review. | **Fixed.** Hash-then-`timingSafeEqual` for all secrets. |
| S10 | Low | GitHub Actions were referenced by mutable tags, and checkout credentials persisted. There was no SAST, secret scan, dependency audit, container scan or SBOM. | Code review. | **Fixed.** Actions pinned to SHAs and `persist-credentials: false`. New `security.yml` runs `pnpm audit --prod` (high), gitleaks, CodeQL security-extended, a Grype container scan (critical, fixable) with an SPDX SBOM, and the security test suites. Dependabot runs with a 14-day cooldown. |
| S11 | **High** | The production container shipped critical and high CVEs: Debian `perl-base`, the Go standard library inside the dev-only `esbuild` binary, and dev-only npm packages. Dev dependencies stayed in the image so `next.config.ts` could be loaded. | Confirmed by the new CI container scan (Grype, first run). | **Fixed in Dockerfile:** `apt-get upgrade` in the runtime stage, `pnpm prune --prod`, and config moved to `next.config.mjs`. Verified by the CI re-scan on this PR. |

## 2. Security for planned autonomous agents (Priority 4)

`src/lib/agent-policy.ts` puts these controls in place before any agent exists:

- **Least-privilege grants per agent.** For example, the orchestrator can only write logs, and the cognitive-science agent cannot read restricted research.
- **Human-only actions.** No agent can publish, review, validate, change tasks or providers, or revoke sessions. This holds regardless of any input.
- **SSRF-safe source URLs.** HTTPS only; no credentials, private or link-local addresses, internal names, odd ports, or calls to this app. DNS-rebinding protection must be enforced at fetch time and is documented as a requirement.
- **Untrusted content.** External text is carried as data with prompt-injection flags.
- **Deterministic output validation.** Fixed verdict vocabulary; protected fields cannot be set; every non-UNKNOWN verdict must cite records the agent was given; output size is bounded.

These are covered by `tests/agent-security.test.ts`.

## 3. Tests

| Suite | Count | Result |
|---|---|---|
| `tests/security.test.ts` (route handlers + fixture DB) | 12 | pass |
| `tests/agent-security.test.ts` | 6 | pass |
| Existing suites | 38 | pass |
| **Total (`npm test`)** | **56** | **pass** |

The security suite covers 11 of the 12 requested categories:

1. Anonymous/private data separation
2. Role escalation attempts
3. Unauthorized operations
4. Sessions and CSRF
5. Resource exhaustion
6. Malformed requests
7. Ingestion attacks
8. Prompt injection
9. Unauthorized agent actions
10. Restricted publication
11. Error disclosure

The twelfth, frontend regressions, was checked with a production-build browser run: 10 pages, 0 console or CSP errors, and the bootstrap re-run passing.

## 4. Unresolved risks

| Risk | Why open | Recommended next step |
|---|---|---|
| Shared role tokens, not individual identities | Tokens identify a role, not a person; audit entries now name the session, not a human | Individual accounts with passkeys/WebAuthn or TOTP for admins. Migration plan: add a `users` table; keep role tokens for automation only; require MFA for admin; retire shared admin sign-in once every admin has an account. |
| In-memory rate limits | Per instance; reset on deploy | Fine at one instance. Move to Postgres or Redis counters if scaled out. |
| `'unsafe-inline'` scripts in CSP | Next.js inline bootstrap scripts | Nonce-based CSP via middleware (needs dynamic rendering of the shell). |
| Database role privileges | The app connects as the database owner | Create a least-privilege app role (DML only) and run migrations with a separate owner role. Needs Render dashboard work. |
| Branch protection | A repository setting I cannot change | Require PR review plus the `CI` and `Security` checks before merging to `main`. Disallow force-push. |
| Production verification | Only read-only checks were performed | After merge, re-run the anonymous GET check and confirm the headers on the live site. |
| Legacy cookies | Old `et_session` cookies are honoured until they expire (≤8 h) | Set `ET_LEGACY_SESSIONS=off` after one day. |

## 5. Deployment safeguards and rollback

**Deploying:**
1. Merge only after CI and Security pass.
2. Render auto-deploys `main`.
3. Health checks gate the cut-over.
4. Migration `003_sessions.sql` only adds a table, so it is backward compatible.

**Optional:** add `SESSION_SECRET` (32+ random characters) in Render. Without it, the session key is derived from the role tokens.

**Rollback:** in Render → et-researcher-iq → Events, choose the previous deploy → **Rollback**. Alternatively, run `git revert` on the merge commit and push. The `sessions` table can stay; the old code ignores it. Signed-in users simply sign in again.

## 6. Post-merge incident (16 October 2026)

- **What happened:** PR #1 was merged and deployed successfully (`c1917e5`). Six Dependabot PRs were then merged. The Node `22-slim` → `25-slim` bump removed the bundled `corepack`, so `RUN corepack enable` failed, and every later Render build failed. Production stayed on the last good deploy.
- **CodeQL breakage:** Dependabot moved `codeql-action/analyze` to v4 while `init` stayed on v3, which broke CodeQL.
- **Fix:**
  - Back to Node 22 LTS, and Dependabot now ignores Node major updates.
  - CodeQL `init` and `analyze` are pinned to the same v4.38.2 SHA.
  - The S11 image hardening is included.

# Commercialization: Product & Engineering Release Roadmap

**Status:** Proposed / not implemented  
**Scope:** Individual customer accounts, subscription billing, usage metering and limits, commercial onboarding, and team-specific workspaces.  
**Baseline:** The current Next.js 16 / React 19 / TypeScript app; PostgreSQL in production, PGlite locally; the v08 canonical evidence corpus with optional v09 extension records.  
**Intended initial product:** A useful free Public Observatory, optional individual Researcher Pro access, then a Team tier. Pricing such as $19/month or $149+/month is a hypothesis to test, not an implemented plan or forecast.

> North star: Sell a safer and more productive evidence-investigation experience, not a claim of extraterrestrial authentication. A paid subscription must never automatically override evidence publication controls, witness privacy, data rights, source qualification, or scientific integrity gates.

## 1. Repository-grounded starting point

| What already exists | Why it matters / work remaining |
| --- | --- |
| Four roles (public, reader, editor, admin), environment-issued bearer tokens and HMAC-signed eight-hour session cookies (src/lib/auth.ts) | These are shared role credentials, **not individual customers**. Replace browser/customer use with per-user identity and sessions; retain controlled service/admin migration paths. |
| Private-by-default records and an audited, administrator-managed collection publication boundary | Keep independent from paid access. Commercial entitlement is not permission to publish or expose a private witness/record/document. |
| PostgreSQL/PGlite data layer with schema in db/001_initial.sql | Introduce additive versioned migrations and a restore-tested staging path before commercial schema changes. Do not rewrite the canonical research imports. |
| Dynamic server API in src/app/api/[action]/route.ts, Zod validation and audit logging | Split or harden commercial endpoints; enforce ownership, membership and entitlements **server-side** on every route, export and document lookup. |
| Source-grounded assistant with IDF retrieval; optional external OpenAI synthesis in src/lib/assistant.ts | Meter expensive operations and preserve ALLOW_PRIVATE_AI=false default. The present ask route requires the reader role. No GPU is required by baseline retrieval. |
| Analysis API with TypeScript statistics and optional Python FastAPI/SciPy, plus research operations/ingestion | Meter computation appropriately; scheduler and ingestion should count against system capacity, not a subscriber's quotas. |
| Public in-app notices indexed by browser-generated subscriber UUID | Not customer identity or email notifications; migrate/associate only with appropriate consent. |
| Render Docker web service and managed PostgreSQL configuration | Add secrets via provider dashboard, webhook endpoint and production monitoring; never commit credentials or private corpus data. |

Current schema has no users, customer subscriptions, usage ledgers, onboarding state, organizations, or memberships. Current access to all private research for any reader/editor/admin must be explicitly reconsidered before customer sign-up.

## 2. Delivery sequence and release contracts

The phases are sequential gates, not a promise that all features are production-ready today. R0 establishes the security/data foundations. R1–R5 deliver the five requested commercial milestones in order; R2 can support a flat-rate pilot before detailed consumption billing is attempted.

| Release | User-visible milestone | Dependencies | Indicative size | Release gate |
| --- | --- | --- | --- | --- |
| R0 · Foundation | No public paywall; architectural hardening | Existing app | M | Migration/permission design approved, staging backup and restores tested |
| R1 · Identity | Individual customer accounts | R0 | L | One customer cannot access another user or private research through any route |
| R2 · Billing | Subscription checkout and self-service management | R1 | M–L | Provider webhook reconciliation and cancel/failure/retry scenarios pass |
| R3 · Metering | Plan entitlements, consumption and limits | R2; instrument key operations in R1/R2 | M | No bypass through concurrent requests, exports, API calls or retries |
| R4 · Onboarding | Conversion-ready commercial customer journey | R1–R3 | M | New user can activate, understand plan access and self-serve without operator intervention |
| R5 · Teams | Isolated, paid organization workspaces | R0 tenant-aware schema; R1–R4 | L–XL | Cross-tenant isolation and role/invite tests pass, including exports and AI retrieval |

Sizes are relative planning estimates (M: roughly one focused sprint, L: multiple; XL: larger). Capacity, actual dates and costs require an owner estimate after technical spikes. Do not pre-sell capabilities behind an unreleased gate.

## 3. R0 — Commercial architecture and security foundation

**Goal:** Make the current single-corpus, shared-role application safe to evolve without jeopardizing research integrity.

- [ ] Publish an authorization matrix with four *distinct* concepts: platform administration; curator/research access; paid product entitlement; and future workspace membership. These must never be treated as interchangeable.
- [ ] Establish public scientific collections vs curator-private canonical collections vs customer-owned data. Customer payment alone grants only product features and expressly published/licensed research, not existing private records.
- [ ] Design immutable account IDs and nullable future workspace/tenant ownership on new commercial objects; do not attach workspace ownership to the canonical imported corpus.
- [ ] Add additive, versioned SQL migrations, tested against PostgreSQL and the supported local-development mode, with snapshot/restore and rollback instructions. Preserve db/001_initial.sql compatibility and importer idempotency.
- [ ] Inventory every existing read/write surface: /api/data, /api/export, /api/document, /api/ask, /api/analysis, /api/notifications, /api/task, /api/review, /api/publish*, /api/provider and /api/ingest. Identify public vs curator vs billable vs system actions.
- [ ] Define the identity provider and payment provider through an ADR (candidate: managed identity + Stripe Billing) after comparing security, fees, webhooks and operational burden. Use provider-hosted checkout; never collect payment card data.
- [ ] Define data-retention, deletion, export, source-license and witness/privacy review rules. Add request IDs, structured metrics, redacted logging, failure alerts, and a production incident/rollback runbook.
- [ ] Add integration tests for existing scientific calculations, imported identifiers, public/private publication, and unauthenticated access so commercialization cannot silently change research conclusions.

**Definition of done:** Signed ADRs (identity, tenant/data boundaries, billing), approved permission matrix, working migration rehearsal and restore, prioritized API threat model, no private research regressions.

## 4. R1 — Individual customer accounts

**Product outcome:** A person can create and manage *their own* Researcher account without shared access tokens.

**Engineering scope**
- [ ] Implement managed identity with email verification or passwordless/OAuth as chosen in the ADR; secure, revocable, expiring sessions and account recovery. Provide logout-all-sessions and account deletion request flow.
- [ ] Add users, identities, sessions (if application-managed), account_preferences and an initial personal workspace or owner scope. Use stable opaque IDs; avoid using email as a foreign key.
- [ ] Introduce server-side current-user context and explicit route policies. Preserve non-customer curator/editor/admin privileges through a separately controlled migration; retire shared role tokens from the consumer UI before launch.
- [ ] Make account ownership mandatory for saved searches/investigations, personal preferences, AI-run history, future billing links and future usage events.
- [ ] Maintain published public research as anonymous-accessible; authorized customers must not inherit the current reader token's blanket private-corpus access.
- [ ] Add profile, security, privacy and data-export/delete request pages; accessible email verification and recovery states.

**Tests / acceptance**
- A new verified user can sign up, sign in, sign out, recover access and see only their data.
- Unauthorized calls to data, export, documents, analysis history, assistant and administrative actions return safe denials, including direct-ID enumeration and forged cookie/header tests.
- Current public research remains public. Existing curator/admin functions still work under controlled identities.
- Session invalidation, CSRF, rate limiting, deletion/anonymization and audit tests pass.

**Not in R1:** Charging, payment-card handling, organization invitations or blanket access to private research.

## 5. R2 — Subscription billing

**Product outcome:** An individual can purchase, upgrade/downgrade, cancel and inspect a Researcher Pro subscription.

**Engineering scope**
- [ ] Use hosted provider checkout and customer portal (provider choice from R0). Start with free and flat-rate Pro; keep price/product IDs in provider configuration and a versioned internal plan catalog, not UI conditionals.
- [ ] Add billing_customers, subscriptions, plan_catalog, billing_webhook_events and entitlement projection tables keyed to user/account; store provider opaque IDs and status, never card numbers.
- [ ] Implement authenticated checkout/session creation; bind completion to the correct user. Verify webhook signatures against raw request body; deduplicate provider event IDs and tolerate duplicate, delayed and out-of-order events.
- [ ] Make subscription state derive from reconciled provider status (trialing/active/past_due/canceled, etc.), not a success redirect or client claim. Add scheduled reconciliation and admin-safe troubleshooting/audit views.
- [ ] Define and visibly communicate upgrades, downgrade effective dates, payment failures/grace behavior, refunds, taxes/country availability and cancellation access windows before launch. Avoid assuming jurisdiction-specific tax treatment without review.
- [ ] Preserve core public material if a payment fails; restrict only the explicitly paid features. Staging/test-mode checkout and provider sandbox must be segregated from production.

**Tests / acceptance**
- End-to-end sandbox: checkout succeeds, webhook is repeated, delivery is reordered, user cancels, payment fails, plan changes and provider is temporarily unavailable—all converge to the correct access state.
- No customer can change another user's billing customer or subscription; no secrets or card data in source, logs or database.
- Customer sees plan, next billing state (when available), cancellation/manage action and understandable status.

**Commercial gate:** A small, explicitly invited founding cohort can purchase the flat-rate plan only after support, refund and monitoring paths exist.

## 6. R3 — Usage metering and limits

**Product outcome:** Usage is transparent; expensive features are controlled without compromising the public observatory.

**Engineering scope**
- [ ] Define versioned plan entitlements separately from research publication: e.g., assistant queries, optional LLM synthesis, export volume, stored investigations, analytical job volume and later team seats. Do not meter basic access to approved public facts.
- [ ] Implement append-only usage_events with account/workspace ID, actor, operation, unit, provider-cost estimate if relevant, occurred_at, period, request/idempotency key and result status; expose aggregated usage_periods.
- [ ] Reserve/check quotas transactionally before costly execution; finalize or release on success/failure. Support concurrency, retries, idempotency, period reset, timezone and plan changes. Distinguish system ingestion/cron from customer usage.
- [ ] Meter /api/ask and optional external-model calls separately so IDF retrieval and LLM cost are not conflated; instrument server analysis, paid export and background customer-owned tasks as appropriate.
- [ ] Enforce limits on server API routes, not only hidden UI buttons. Return a predictable, accessible limit response and plan-upgrade path. Set hard provider-cost ceilings and operational alerts.
- [ ] Build a usage dashboard showing included units, consumed units, renewal/reset, limits and understandable privacy-preserving event summaries. Do not log sensitive witness prompts or full answers as billing telemetry.
- [ ] Ship soft-limit/observability mode first to validate accounting; enable hard limits only after reconciliation and concurrency tests.

**Tests / acceptance**
- Parallel requests cannot evade quotas; failed operations do not double-charge units; repeated request IDs count once; system jobs count zero toward customer quotas.
- Metered events reconcile with dashboard and provider spend within an explicitly set tolerance; all gated features remain inaccessible via direct API.
- Limits do not transform uncertain scientific results into paywalled claims of certainty.

## 7. R4 — Commercial onboarding and activation

**Product outcome:** A new user can understand the product, choose a plan, reach a useful first research result, and get help unaided.

**Engineering scope**
- [ ] Public landing/product page: audience, scientific caveats, evidence methodology, features, transparent pricing, privacy and sample cases; distinguish live/available from roadmap-only features.
- [ ] Guided flow: create account → verify identity → select free/Pro → choose interests → explore a pre-approved case → run a permitted demonstration or grounded query → optionally save an investigation.
- [ ] Seed an approved demo dataset and sample questions with cited answers; no private witnesses, unlicensed excerpts or fabricated case outcomes. Clearly label simulations, secondary statistics and blocked research questions.
- [ ] Contextual feature discovery for psychology/statistics/proof labs; progress, empty/error states, accessible mobile experience, billing/help/feedback and cancellation links.
- [ ] Record consent-aware activation funnel events (landing, signup, verification, plan selected, first meaningful result, return visit) without placing raw witness content or full research prompts into analytics.
- [ ] Add feature flags, invited-cohort rollout and support/incident handling. Track activation and retention separately from page views.

**Tests / acceptance**
- A first-time user can complete onboarding, use an approved research experience and see their plan/remaining usage without staff help.
- Mobile and keyboard paths, failures, unsubscribed/free state, pricing clarity, emails and deletion/cancellation paths are tested.
- Pilot has defined, instrumented decision thresholds for activation, weekly return, conversion, support load, infra/AI cost and retention; thresholds are agreed before using results.

## 8. R5 — Team-specific workspaces

**Product outcome:** Organizations can collaborate on private investigations without mixing their data or obtaining unauthorized access to the master research corpus.

**Engineering scope**
- [ ] Add workspaces, workspace_members, workspace_invitations, workspace_roles and workspace_entitlements. Make user identity global but workspace roles contextual (owner/admin/member/viewer). Create explicit workspace switching.
- [ ] Add workspace_id/tenant ownership to new customer-owned cases, annotations, saved investigations, research tasks, exports, assistant histories and usage; canonical imported records remain separately governed and read-only.
- [ ] Build invitation acceptance, expiration, removal, transfer of ownership, seat counts and billing-owner controls. Enforce one active billing workspace/account per metered request.
- [ ] Implement workspace-specific research queues, notes, source attachments where rights permit, export, activity and admin controls. Retain existing editorial review/publication as *platform* privileges only.
- [ ] Authorize every table/query/API/document lookup against user membership and object workspace, with default-deny behavior; add PostgreSQL row-level security as defense in depth if compatible with the app's DB session/pooling approach, never as the only check.
- [ ] Rework assistant retrieval to include only (a) published/licensed shared collections, plus (b) material permitted for the current user/workspace, and (c) separately authorized curator material when acting in a curator context. Preserve external-AI consent and source rights per workspace.
- [ ] Isolate billing, usage, exports, notifications and deletion by workspace; protect cross-workspace caches, background jobs and logs. Establish a workspace-specific retention/offboarding policy.

**Tests / acceptance**
- Two unrelated workspaces cannot discover each other's record titles, direct IDs, files, prompts, tasks, search hits, exports, billing, notifications or usage.
- Invitation, role change, member removal, seat exhaustion, owner transfer and workspace deletion all work and immediately revoke prohibited access.
- Shared public research remains accessible; publishing team content to the public corpus requires a separate, explicit rights and curator process.
- Team plan is not marketed as shipped until tenant isolation passes automated adversarial tests and an independent security review.

## 9. Architecture guardrails (apply across all releases)

1. **Data domains stay separate:** canonical imported scientific evidence; curated public feed; platform editorial/audit; individual customer data; organization data; billing/usage. No monetization mutation of v08/v09 source records or research-question states.
2. **Authorization is conjunctive, not additive:** user identity + correct object ownership/workspace membership + feature entitlement + independent record publication/source permission. A paid plan is not an editorial role.
3. **AI is a consumer, never the evidence writer:** preserve retrieval citation validation, uncertainty, prompt-injection defenses, analyst-review labeling and external-private-AI opt-in. No generic AI answer becomes authenticated evidence.
4. **Migrate safely:** additive, versioned SQL; backups before migration; rehearsal on anonymized staging; rollback/roll-forward plan; keep the private research package and production secrets out of Git.
5. **Payments are an external source of truth:** server-side webhook verification, idempotency and reconciliation; provider-hosted payment collection; no client-controlled entitlements.
6. **Operations:** request tracing, redacted metrics, quota/cost alerting, uptime checks, source-provider health, data backup and restore drills; guard admin and cron/service credentials.
7. **Quality gates:** tests for security/tenancy, commercial billing and meter semantics, original statistics, imports, public publication and methodology caveats on every release.

## 10. Engineering delivery board (issue-ready)

| ID | Priority | Epic / deliverable | Exit artifact |
| --- | --- | --- | --- |
| COM-001 | P0 | Authorization, publication and ownership ADR | Reviewed permission matrix + misuse tests |
| COM-002 | P0 | Incremental migration framework and backup rehearsal | Staging migration + restore report |
| COM-003 | P0 | Identity provider decision + customer auth | Verified sign-up/login/recovery, user IDs |
| COM-004 | P0 | Server-side access policy refactor | Direct-route authorization tests |
| COM-005 | P0 | Personal account/profile and privacy controls | Customer account flows |
| COM-006 | P0 | Billing provider integration, checkout and portal | Full sandbox purchase/cancel |
| COM-007 | P0 | Signed webhook ledger and reconciliation | Duplicate/reordered event tests |
| COM-008 | P0 | Plan and entitlement model | Correct free/Pro effective access |
| COM-009 | P0 | Append-only usage ledger and quotas | Reconciliation + concurrency tests |
| COM-010 | P1 | Usage dashboard and guardrails | Visible budgets and upgrade path |
| COM-011 | P1 | Onboarding, guided first investigation, demo content | End-to-end activation smoke test |
| COM-012 | P1 | Consent-aware funnel, pilot feature flags and support | Measurable founding-cohort experiment |
| COM-013 | P1 | Workspace schema, membership, invitations, seat policy | Two isolated demo tenants |
| COM-014 | P1 | Workspace-aware retrieval, saved research and exports | Cross-tenant adversarial test suite |
| COM-015 | P1 | Team billing, admin, offboarding and release hardening | Team-tier go/no-go review |

**Suggested ownership:** product lead owns pricing/value hypotheses, onboarding acceptance, support and pilot gates; engineering lead owns ADRs, migration, auth, payments, tenancy and operational reliability; research/editorial owner owns disclosure rights, source integrity and scientific presentation. One person can fill multiple roles; the sign-offs must remain distinct.

## 11. Go / no-go checkpoints and measurement

| Gate | Evidence required before release |
| --- | --- |
| R0 → R1 | No loss of imported records, public/private logic or statistical reproduction; threat-model and migration review signed |
| R1 → R2 | Identity and authorization adversarial suite passes; no blanket private-corpus entitlement |
| R2 → R3 | Purchase, payment failure, cancellation and refund/support workflows verified in sandbox |
| R3 → R4 | Accurate per-account counters, concurrency protection, safe limit behavior and bounded model spend |
| R4 → pilot expansion | Measure signup-to-first-insight, weekly active usage, free-to-paid intent/conversion, retention, support tickets and gross margin; agree thresholds upfront |
| R5 → team launch | Tenant-isolation tests and workspace-specific privacy, billing and recovery/security review completed |

**Initial product hypotheses to validate:** Free Public Observatory → Researcher Pro → Team; annual billing, seat pricing and overages are deferred until actual pilot evidence supports them. Paid reports/commissioned research may be separately tested but must maintain source licensing and independent scientific review.

## 12. Implementation entry points

- src/lib/auth.ts — identity and role-policy migration.
- src/app/api/[action]/route.ts — authenticated APIs, entitlement enforcement, usage, billing; consider dedicated webhook route for raw-body signature validation.
- db/001_initial.sql, src/lib/db.ts, scripts/migrate.ts — additive schema/versioning/backup strategy.
- src/lib/assistant.ts and analytics/service.py — usage instrumentation and retrieval boundary.
- src/components/observatory.tsx and src/components/workflows.tsx — account/plan/usage/onboarding/admin UI.
- render.yaml, .env.example, .github/workflows/ci.yml — secrets, deployment and test infrastructure.
- docs/SECURITY.md, docs/DEPLOYMENT.md, docs/DATA_DICTIONARY.md — keep operational/security documents synchronized **when** features ship.

**Implementation note:** This document is the roadmap only. It does not create users, process payments, provision a billing provider or declare any R1–R5 release complete.

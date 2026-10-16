# Research, evidence and release classifications

This is the terminology policy for README/product copy, demos, scientific findings, public publication controls and commercialization planning. It clarifies claims; **it does not reclassify any imported research record, change a research-question outcome, or release private data.**

## 1. What the project actually maintains

**Preferred description:** “A privately maintained, versioned scientific research corpus containing structured UAP case records, source documentation, witness and artifact *claims*, evidence-provenance assessments, cognitive-science frameworks and reproducible statistical analyses.”

- `Private` describes **access/publication status** of the maintained records and imported research package. It does not mean the underlying reports are exclusive, unpublished, privately discovered, owned physical specimens, or independently authenticated.
- `Evidence record` or `research record` describes a documented source, observation, allegation, calculation, or assessment. Its evidentiary value depends on provenance, source tier, directness, missingness, alternative explanations and independent examination.
- `Documented witness/artifact/custody claim` means the database records the claim. It does **not** establish that testimony is independent, an artifact exists in the project's possession, the same artifact was examined, or custody is complete.
- `Reproduced statistical result` means the numerical calculation agrees with the source/package using stated inputs. The GEIPAN era/classification association is **not** a probability of extraterrestrial origin, experimental replication of a physical finding, or authentication of any recovered object.
- `AI-extracted` means provisional machine-assisted source extraction subject to the specified human review; it is not adjudicated evidence. An assistant answer is never a canonical source record.
- `Independently authenticated extraterrestrial evidence` requires specific, appropriately sourced, discriminating proof (including relevant event-to-object identity, custody, raw assay/control data and independent replication for a physical specimen). **The audited corpus has not established a complete public proof chain.** That conclusion is bounded to the audited subset, not a claim of worldwide absence.

### Claim tiers (use in external language)

| Tier | Accurate shorthand | What may be said | What must not be inferred |
| --- | --- | --- | --- |
| C1 | Maintained research corpus | Versioned, checksum-audited records and methodological documents are maintained | Exclusive unpublished discoveries; possession of original artifacts |
| C2 | Documented source/claim | Reports, records, and attributed assertions exist in the accessible corpus | The underlying event, independent corroboration or claim is proven |
| C3 | Reproduced secondary analysis | A calculation was independently recomputed from stated secondary counts | ET attribution, causation, specimen testing or independent event-level validation |
| C4 | Adjudicated case-level evidence | Only when cited original material is independently reviewed against case-specific criteria | More than the actual reviewed finding permits |
| C5 | Independently authenticated extraordinary-origin proof | **Not established in the current audited public subset** | Do not market as a possessed or completed discovery |

C1–C5 are **communications/evidence-description tiers**, not replacement values for `records.publication`, `feed_items.status` or `RQ_Outcomes_v08.State`. Do not auto-upgrade a record based on membership in the corpus, payment, source volume or an AI-generated answer.

## 2. Four independent classification axes

| Axis | Existing terms | Meaning |
| --- | --- | --- |
| Publication/access | `private`, `public` | Visibility of a research record/document; access control, **not evidentiary strength**. A collection is published only after an admin's rights and privacy review. |
| Editorial feed | `pending`, `reviewed`, `rejected`, `corrected`, `retracted` | Human disposition of a retrieved metadata lead; `reviewed` is not independent authentication. |
| Scientific outcome | Values in the canonical v08 outcome and gate tables, e.g. `BLOCKED`, `PARTIAL`, `NOT ESTABLISHED` | Dataset/protocol-specific scientific status, not application feature delivery status. Preserve verbatim. |
| Commercial feature release | `Proposed` → `In development` → `In verification` → `Released` (with `Blocked` when applicable) | Product delivery status of roadmap R0–R5; does not alter source, proof, RQ or publication status. |

**Version labels are another distinction:** `v08` refers to the research baseline; `v09` refers to additional extraction records (provisional until human reviewed). Neither is equivalent to commercialization releases `R0–R5`, application semantic version, or a claim that all proposed commercial features are deployed.

### Commercial milestones (at roadmap creation)

| Milestone | Commercial status | Meaning |
| --- | --- | --- |
| Existing Research Observatory | Implemented in repository | Research views, API, role tokens, publication workflow and source ingestion code; this does not establish production readiness for paying customers |
| R0 — Commercial foundation | Proposed | Architecture, rights/access boundaries, migration/security gates |
| R1 — Individual customer accounts | Proposed | No individual account system shipped in the reviewed baseline |
| R2 — Subscription billing | Proposed | No hosted checkout/subscription engine shipped in the reviewed baseline |
| R3 — Usage metering and limits | Proposed | No per-customer quota/ledger shipped in the reviewed baseline |
| R4 — Commercial onboarding | Proposed | No commercial signup/activation flow shipped in the reviewed baseline |
| R5 — Team workspaces | Proposed | No tenant-isolated organization workspace shipped in the reviewed baseline |

A planned release becomes **Released** only when its acceptance tests, operational readiness and product owner sign-off are recorded. A roadmap commit is not a deployed feature.

## 3. Publication and monetization boundaries

1. `Publication = public` means the approved research collection may be viewed; it is not an endorsement of every underlying claim. Protect witness privacy and source republication rights.
2. `Subscription = paid` means a customer may access contracted software features. It does not grant the legacy `reader` role's blanket access to the internal corpus or editorial privileges.
3. Authorized researchers may inspect curator-private source material under the existing policy; this is a trust/access distinction, not evidence validation or exclusive ownership.
4. External model processing of private material remains opt-in under `ALLOW_PRIVATE_AI=true`; commercialization must not silently alter it.
5. Do not publicly label the project “possessing private scientific evidence of extraterrestrial life/technology” or “independently verified artifacts.” Use “privately maintained research corpus” and specify the type, source and limitations of any cited finding.
6. Keep research results and hypothetical modeling visibly separate; no invented observations, confidence scores, p-values, material tests or source access.

## 4. Example copy

**Recommended:** “ET Researcher I.Q. is an interactive evidence-intelligence platform built on a privately maintained, versioned research corpus of UAP reports, documented claims, source provenance, cognitive-science frameworks and reproducible statistical analyses; it separates what is reported, independently assessed and still unproven.”

**Avoid:** “We hold private scientific evidence proving extraterrestrial technology.” This implies exclusivity, possession and validation the record does not establish.

**Commercial-release disclosure:** “R0–R5 describe planned commercialization milestones. They are not launched product features until their published release gates have passed.”

## 5. Source and implementation anchors

- `docs/SOURCE_LINEAGE.md`: v08 archive verification, 63 members, 637 imported records, limitations and overlapping leads.
- `docs/RESEARCH_SPRINT_v09.md`: machine-assisted v09 extraction; 0 human-reviewed at the documented sprint, RQ outcomes unchanged.
- `src/lib/statistics.ts` and `src/components/labs.tsx`: reproduced GEIPAN secondary association and limits.
- `src/lib/progress.ts`, `src/components/research-views.tsx`: provisional source extraction and case qualification.
- `docs/SECURITY.md`, `db/001_initial.sql`: private/public collection access and distinct feed editorial states.
- `docs/COMMERCIALIZATION_ROADMAP.md`: proposed R0–R5 work and release gates.

Do not change scientific labels in imported v08/v09 records solely to conform to communications terminology; use this document to explain them in context.

# ET Researcher I.Q.

**An evidence-intelligence platform for extraordinary claims.** It answers five questions continuously: what we know, what remains unknown, what new information has emerged, how strong the evidence is, and what to investigate next.

It is not a UFO news site. Every finding links to its source record and its methodological qualifications, and the application enforces the project's integrity rules: unknown is not negative evidence, unexplained is not extraterrestrial, and statistical significance is not authentication.

**Scope of the corpus:** The project maintains a privately maintained, versioned scientific research corpus of case records, source documents, witness and artifact *claims*, provenance assessments, and reproducible secondary analyses. Here, *private* describes record access and publication controls—not possession of original material, exclusive unpublished discoveries, or independently authenticated extraterrestrial evidence. The audited subset has not established a complete public extraterrestrial-origin proof chain; this is not a claim of worldwide absence. See [Research, evidence and release classifications](docs/CLAIM_AND_RELEASE_CLASSIFICATIONS.md).

## What's inside

| Area | What it does |
|---|---|
| **Intelligence overview** | Current scientific position, *What we know / don't know / what comes next*, release changes, study readiness, latest official developments |
| **Live intelligence** | Scheduled retrieval from arXiv, Crossref, Europe PMC, Federal Register, GovInfo hearings and NASA, with deduplication, review queue and notifications |
| **Research findings** | Established, secondary, associations, hypotheses, disputed, blocked, missing and milestones, all from the v0.8 records |
| **Case & evidence explorer** | 25 core cases, 46 worldwide leads, two-lane provenance graph (instrumentation vs recovery → custody → lab), same-artifact audit |
| **Psychology & perception lab** | 14 cognitive theories with variables, original studies and limits; SDT and witness-independence demonstrations; witness-pair evaluation; claim-coding coverage |
| **Statistical research lab** | Live recomputation of the verified GEIPAN result (χ²(6)=77.81, p≈1.01×10⁻¹⁴, V≈0.199), residuals, Wilson CIs, leave-one-out sensitivity, power planning, Fisher sandbox; RQ1 shown as **BLOCKED** |
| **Evidence protection & proof** | Interactive six-stage (v01) and eight-stage proof-chain scenarios, technology vs biology pathways, social hypotheses, empirical roadmap; every value labelled illustrative |
| **Research priorities** | Workflow board (Proposed → … → Completed/Blocked) with role-checked transitions and an evidence-gap view |
| **Methodology & sources** | Objectives, rules, research questions, lineage with checksums, codebook, requirements trace, source registry, corrections, export |
| **Research assistant** | Retrieval-grounded answers with citations and uncertainty; optional LLM synthesis with citation validation |
| **Operations** | Provider health and cadence, review queue, publication boundary, audit log |

## Quick start (Windows, local)

Requires Node 22.12+ and pnpm 10.

```bash
pnpm install
```

Place the private research package next to the app (`UAP_Research_Consolidated_v08/` and `UAP_Evidence_Protection_and_Proof_Hypothesis_v01.md`), then:

```bash
pnpm import
```

```bash
pnpm ingest
```

```bash
pnpm dev
```

Open http://127.0.0.1:3000. On loopback in development you have the admin role automatically. The local database lives in `%LOCALAPPDATA%\ETResearcherIQ` (outside OneDrive) unless `ET_DATA_DIR` is set.

Other commands: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm lineage` (regenerates [docs/SOURCE_LINEAGE.md](docs/SOURCE_LINEAGE.md)).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data dictionary](docs/DATA_DICTIONARY.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Deployment & environment](docs/DEPLOYMENT.md)
- [Security, governance & publication boundary](docs/SECURITY.md)
- [Source lineage manifest](docs/SOURCE_LINEAGE.md)
- [Delivery report](docs/DELIVERY_REPORT.md)
- [Commercialization product & engineering roadmap (R0–R5 proposed; not shipped)](docs/COMMERCIALIZATION_ROADMAP.md)
- [Research, evidence and release classifications](docs/CLAIM_AND_RELEASE_CLASSIFICATIONS.md)

## Publication boundary

This repository is public. The v0.8 research package, witness records and full-text documents are **not** committed (`.gitignore` excludes `UAP_*`, `private/` and local data). Imported records are private by default; an administrator can publish a collection only through the audited publication control after a rights and witness-privacy review. Publishing changes visibility, not the scientific validity or independence of any underlying claim.

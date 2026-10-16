# v09 research sprint (16 October 2026)

**Goal:** advance the blocked and partial research questions with real, cited evidence, without changing any v0.8 status that the evidence does not support.

## Method

- Public web sources were retrieved for each of the 24 seed claims and the same-artifact candidates. Each extracted value cites the page actually retrieved and records its source tier (primary document, news/secondary, or Wikipedia as a locator of a cited primary).
- Extraction was AI-assisted (Claude). Every row is marked **AI-extracted, awaiting blinded second human coder**. Nothing counts as adjudicated until a human coder confirms it.
- The data lives in `private/research_extractions_v09.json` (not committed: it links named witnesses to statements) and is loaded as separate `v09` collections: `Primary_Source_Extraction_v09` (24 rows) and `Artifact_Lab_Evidence_v09` (5 rows). v0.8 records are never modified. Both collections are private by default.

## Results

| Question | v0.8 state | What changed |
|---|---|---|
| RQ1 | BLOCKED | No change: 0 eligible independent incidents (≈197 needed for 80% power at w = 0.2). |
| RQ2 | BLOCKED | Earliest public statement located for 21 of 24 claims (12 with exact dates); 2 show a statement made before contact with other witnesses. 0 human-reviewed. |
| RQ4 | PARTIAL AUDIT | Nimitz pilots flew separate aircraft, but the earliest public statements found are 2017 and a 2021 joint interview; Trinity 1945 is a joint account first published in 2003. Independence of first statements not shown. |
| RQ5 | NOT ESTABLISHED | The ORNL/AARO magnesium specimen now has a documented independent lab examination (primary document read): terrestrial Mg and Pb isotopes, not a terahertz waveguide, and an "undocumented chain of custody". Ubatuba Mg isotopes are within terrestrial limits (secondary review). |
| RQ6 | PARTIAL | No change. |

States are unchanged because the protocol requires adjudicated, independent evidence; extraction alone is not adjudication. The sprint produces the first case-level proof-chain stage records (shown in the Evidence & proof module) without turning them into a rate.

## Next steps

1. A blinded second human coder reviews the 24 extraction rows (roadmap Phase 4).
2. Replace tertiary locators with retrieved primary documents (newspaper scans, hearing transcripts, GEPAN note).
3. Build contact and media-exposure chronologies for multi-witness events (RQ2, RQ4).

# Source ingestion & research lineage manifest

Generated 2026-10-15T22:55:02.278Z by `pnpm lineage` from the local private import table.

**Baseline:** v0.8 consolidated research package (`UAP_Research_Consolidated_v08`). Every member's SHA-256 was checked against `MANIFEST_v08.json` before import; any mismatch aborts the import.

**Historical limitation (preserved):** v0.8 incorporates the accessible v07 Deep Research *narrative*. It is **not** a verified byte-level import of the unavailable v07 XLSX/ZIP. Prior versions (v01–v07 artifacts) are kept for lineage and add no independent cases. The 25 core events and 46 worldwide leads overlap and are not counted as 71 independent incidents.

**Publication boundary:** this file lists file names and checksums only. The research files themselves are private and are excluded from the public repository by `.gitignore`.

## Summary

- Files verified: 63
- Tabular records imported: 637
- Derived normalized rows: incidents 25 · witnesses 32 · claims 24 · artifacts 14 · custody_transfers 5 · sources 16 · relations 9 · tasks 16 · documents 13 · chunks 44

## Files

| File | Version | Status | Records | SHA-256 |
|---|---|---|---:|---|
| Data_Dictionary_v08.csv | v08 | lineage-preserved | 0 | `0fe3e7224360d5365922bf2569c596c310b341f1274579c68a73e4a0c0f2d8d3` |
| Prior_Artifacts/# Major Theories & Principles of Perception, Memory, and Recall.txt | v08 | lineage-preserved | 0 | `60adf80a0429551e520591f2891147e6ecc17db6be64e3175ee71c6901c59d74` |
| Prior_Artifacts/UAP_Evidence_Research_Database_v01.xlsx | v08 | lineage-preserved | 0 | `0fc214ffe1991a8a304174c5bd5b84f087815dedcbb71928dfe480f33200c2d5` |
| Prior_Artifacts/UAP_Evidence_Research_Database_v02.xlsx | v08 | lineage-preserved | 0 | `3898d404191c7fba13049fc6af97b5a820c7c30442371c7ea91dcf659feb28af` |
| Prior_Artifacts/UAP_Evidence_Research_Database_v03.xlsx | v08 | lineage-preserved | 0 | `4322ddfc36a391346e02374fbd4d16906752f6c622f4ad8639e4cdec68839a01` |
| Prior_Artifacts/UAP_Evidence_Research_Database_v04.xlsx | v08 | lineage-preserved | 0 | `863c0fa28e0db70273b93330ae2b357fc75e6b660222843a18be45ada553e718` |
| Prior_Artifacts/UAP_Evidence_Research_Database_v05.xlsx | v08 | lineage-preserved | 0 | `bf612a1707521fd8eb4044db82b703a33e1813419615cb72b56f285e712c8cd3` |
| Prior_Artifacts/UAP_Evidence_Research_Database_v06.xlsx | v08 | lineage-preserved | 0 | `7598d4c52895957371dc2ebd9bcc61387243ee896c9aab7538d458dadcf9160b` |
| Prior_Artifacts/UAP_Inference_Readiness_Report_v06.md | v08 | lineage-preserved | 0 | `989239cef6ba5a5adf6cfa51e5bea4d6c7a49f6baafdc4dc55eeeb790c18718c` |
| Prior_Artifacts/UAP_Master_Research_Protocol_v1.md | v08 | lineage-preserved | 0 | `2b621c915d2fcbc0c7025303389a1e0b5e561aa8d617cb8015b375ac2d7554f4` |
| Prior_Artifacts/UAP_Research_Execution_Report_v03.md | v08 | lineage-preserved | 0 | `6cc3b54d5fff1783a6ab45b1d9d4c8a1bdea42e962d48fbac6d168fe1f32126b` |
| Prior_Artifacts/UAP_Research_First_Run_2026-10-15.md | v08 | lineage-preserved | 0 | `128c74c8f15743ce9e89f38bb410835b87ebe81c897e051121d8a2a5f5927acd` |
| Prior_Artifacts/UAP_Updated_Research_Prompt_v2.md | v08 | lineage-preserved | 0 | `08177318f009e2a0e1755d925ba0929aaa7fa5012f1ef113a95140461cf5a90e` |
| Prior_Artifacts/UAP_Worldwide_Inventory.xlsx | v08 | lineage-preserved | 0 | `8035dbfe5cbb07c2b42e3301e52ef5efbcc32ecd8ea496579686fd20c4dc0f8f` |
| README_v08.md | v08 | lineage-preserved | 0 | `60dcc8fda4d3a57c01c985a646e40cf9b4aa741df1f0c60ba69119e568c5b548` |
| UAP_Evidence_Research_Database_v08.xlsx | v08 | lineage-preserved | 0 | `b3c3445a74ac4c604eac1d0f81b1f18437dc6408f0d345dbd7a3e578cf46d721` |
| UAP_Independent_Corroboration_Report_v08.md | v08 | lineage-preserved | 0 | `253477a12a2a8499d1432c54b4173af7365e730261e913ce794604e601018e20` |
| UAP_Integrated_Master_Research_Protocol_v08.md | v08 | lineage-preserved | 0 | `c653600d16be9c20848799b7d23578b96cedb80b8a0b39564ef83ddecce10cfd` |
| UAP_Integrated_Research_Manuscript_v08.md | v08 | lineage-preserved | 0 | `6b415507f48e66e0bf72b4dde96af1f25ebfc8c739dce6deb3c55d463ab0a213` |
| UAP_Iterative_Prompt_and_Findings_Index_v08.md | v08 | lineage-preserved | 0 | `2de0a8ff880e77bd70073bf56e7a0304b5356d08645197bff6df6bb1069aec2a` |
| UAP_Research_Integrity_Report_v08.md | v08 | lineage-preserved | 0 | `72c2be40947005aa32fb9fd00fb48a48ceebc9f5ce19d8570c17fb7debd9cc4b` |
| UAP_v08_reproducible_statistics.py | v08 | lineage-preserved | 0 | `84d0578046599b2ca668d17c39452afc53fa316814a48b5ebca935b073feba8b` |
| Workbook_CSV_Exports/Artifacts.csv | v08 | imported | 14 | `5297a521dedeffdef453da0349b2815a212675486f0031d37e6967d5916b2055` |
| Workbook_CSV_Exports/Blocked_Tests_v03.csv | v08 | imported | 7 | `9252fab66cc184d0f0c1944b6cc7e3e49a881bea1c5f8e9c29feb84b87775b4d` |
| Workbook_CSV_Exports/Claims.csv | v08 | imported | 24 | `4b32e31421ea2ac89ea6074f6c791b11f686bcb01ca3c343398084ca9b3e2ce5` |
| Workbook_CSV_Exports/Codebook.csv | v08 | imported | 17 | `84178185f3fd286fe02fc6514df5d0ecc021c7996fe77d336e9a31dd14ec970c` |
| Workbook_CSV_Exports/Cognitive_Claim_Coding.csv | v08 | imported | 24 | `97674080556f12572ef947058130da5f9bbbc80f381b5f2f6d93e1e79c1840fc` |
| Workbook_CSV_Exports/Cognitive_Theory_Map.csv | v08 | imported | 14 | `9dab544b446c83cd94a8f800129e0647c3448d48fce4efb137b594f4a66de403` |
| Workbook_CSV_Exports/Custody.csv | v08 | imported | 5 | `97e462a3498bbcdf54cd07fb786b623741e6e8b5f0257130646b6c0b9d3cc448` |
| Workbook_CSV_Exports/Events.csv | v08 | imported | 25 | `62781ba4d37d13d081aa8ab89bc82512c3954a93c4491d05ca1722c4775c0783` |
| Workbook_CSV_Exports/Evidence_Matrix_v03.csv | v08 | imported | 25 | `158a6eeb033cee51f10585fb5b6018daeb1509ae2618c7d3dbf12e4bae7a8962` |
| Workbook_CSV_Exports/External_Series_v08.csv | v08 | imported | 6 | `f7deeef9855cb8eaada99478b3a971ab31b2dbcb5bd362dadb0be5abf035572a` |
| Workbook_CSV_Exports/GEIPAN_Era_v08.csv | v08 | imported | 8 | `aa9a4937c95ff813474d948545683ae42c42dd0b7358244d13675f0caea60fa0` |
| Workbook_CSV_Exports/Inference_Decision_v06.csv | v08 | imported | 11 | `aef8f5e09ae1a7a50c5b7d6155daa48793d48e2bb8d5e318796e98611fc73481` |
| Workbook_CSV_Exports/Integration_Log.csv | v08 | imported | 3 | `47d998348c3bdc37b78631404f13421eb90148355e2fa30776020c2a761bf2f8` |
| Workbook_CSV_Exports/Integrity_Gates_v08.csv | v08 | imported | 13 | `a5bd0d5432cfb6159e8a9aebc5b6c9e86f66cd3565d26568ffed638d92742e12` |
| Workbook_CSV_Exports/Null_Finding_v02.csv | v08 | imported | 10 | `53c74d460c525904524bf4a4cdad02c48517603fc87864ad3dfb449190d8fd04` |
| Workbook_CSV_Exports/Power_v08.csv | v08 | imported | 6 | `59011f8b6528126c2e1e9e0750b05e042d7cc96045b9f9d12bd58f757d6618e5` |
| Workbook_CSV_Exports/Primary_Source_Audit_v06.csv | v08 | imported | 6 | `991b08411e2aa14e82b8c5e839c88595ccc80f897bdb93c0f67494e0faa9ce08` |
| Workbook_CSV_Exports/README.csv | v08 | imported | 22 | `f0d4f55940c3f5b19f016993284bd566e29b0e06a07814e988672148374a7558` |
| Workbook_CSV_Exports/RQ_Outcomes_v08.csv | v08 | imported | 7 | `2dfc61b9a95e1205a467c59e8cb8bc67c3cb1be9d188cbc2ec151e2246f4b2df` |
| Workbook_CSV_Exports/Release_Status_v08.csv | v08 | imported | 11 | `4bf98fb23d0b339694721a47ba7cace22bebda913ebd47623cab4f863fb43aac` |
| Workbook_CSV_Exports/Requirements_Trace_v08.csv | v08 | imported | 30 | `f281a6382e6eeba6dc881f0e0ca7e385289243eedde181dc243f389d42776e55` |
| Workbook_CSV_Exports/Research_Queue.csv | v08 | imported | 16 | `9adf78bad55a2154333b662ae314d888f62f1fc33410e7c90db9e118532ba7e5` |
| Workbook_CSV_Exports/Run_Summary_v05.csv | v08 | imported | 11 | `5d4b8c36d3896134b8908c22d912d986f983175b7f211f3505309691ce6d9290` |
| Workbook_CSV_Exports/Same_Artifact_v08.csv | v08 | imported | 11 | `97cab0677665b26bdb2fccf647951e9f5085666f4d639dd6f806815fc3a31035` |
| Workbook_CSV_Exports/Source_Access_v03.csv | v08 | imported | 4 | `e524d4e58d18456e2013be55b743c3a7d35523042f2c683e74cd4925c5a462df` |
| Workbook_CSV_Exports/Source_Registry_v08.csv | v08 | imported | 15 | `d3fa0ae967e9353623e852c68b3698e0cbb4559369267bd12a0646e9719b4228` |
| Workbook_CSV_Exports/Sources.csv | v08 | imported | 16 | `3260ed9e36f2d350bcfe5806005ecb67f3a8906debb28f87ad576d41ad1b1030` |
| Workbook_CSV_Exports/Stat_Results_v08.csv | v08 | imported | 14 | `8844f295751a62c9c298e909288ea6a2e64c4baf28a4713d1b2b22415be5257b` |
| Workbook_CSV_Exports/Statistical_Eligibility_v06.csv | v08 | imported | 25 | `3a2fe896c671d93bd3a2d105aef5da96b2ce42791fe2c317641975fc6e46cac6` |
| Workbook_CSV_Exports/Unresolved_Gaps_v08.csv | v08 | imported | 12 | `cd7121b07752ad8c9e6a3257635d948415cd6124276ccc722ff6d31d12e5d2a9` |
| Workbook_CSV_Exports/Witness_Dependency_v08.csv | v08 | imported | 9 | `395dd95c99b38f2afe58adb34383aeaac65361b3c7e64bf3fdb09a219058cad8` |
| Workbook_CSV_Exports/Witness_Links.csv | v08 | imported | 9 | `e401b70ba93e4e0493db2e7d8ed4da92b8431895694dc20673e491f5303afe2c` |
| Workbook_CSV_Exports/Witnesses.csv | v08 | imported | 32 | `834525c90fd60a4ac0b34e234feb855e5c3772223447bcfc77cdef20e1be234d` |
| Workbook_CSV_Exports/Worldwide_Cases.csv | v08 | imported | 46 | `113ec68e5f3a7a61a213dc1e82763db996786176236af9decdd29280dd6ed3e1` |
| Workbook_CSV_Exports/Worldwide_Crosswalk.csv | v08 | imported | 67 | `7538797a4e3d8b6b50c6b9d0d94af3e5d8377c6da204ddabae39664117982454` |
| Workbook_CSV_Exports/Worldwide_Registries.csv | v08 | imported | 24 | `a7ef4e4906925d0cbdc4fd2bbf5afad29505630f35caec8c38e15cdeafca3b70` |
| Workbook_CSV_Exports/Worldwide_Studies.csv | v08 | imported | 17 | `7a082369c25df37877a1e737b4965834dda5bd50eb5deffe156e90b1f931cc10` |
| Workbook_CSV_Exports/Worldwide_Witnesses.csv | v08 | imported | 21 | `a44769ec9977f5ba91d94178d04f132fe9bdf7d22c60c3cc9d0ae4b8f774c54b` |
| geipan_era_contingency_v08.csv | v08 | lineage-preserved | 0 | `412ad5c41f3f205500697cf7185a4e83dbda480bc311a0251671cd8248316e53` |
| statistical_power_v08.csv | v08 | lineage-preserved | 0 | `3b31554b969fb7ba3889729481158ef53e446d24363fb9a528c78ecfc320eb48` |
| statistical_results_v08.json | v08 | lineage-preserved | 0 | `89ba7c1fd7f07bcdb2c396417404db05e661c88f15f19ad11ef14424c999f108` |

Status meanings: **imported** = CSV rows loaded as records with original IDs; **lineage-preserved** = checksum verified and (for Markdown/text) chunked for retrieval, but not converted into evidence records.

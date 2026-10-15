// Writes docs/SOURCE_LINEAGE.md from the local import table: file, version, checksum, status, record counts.
// Lists file names and hashes only; no research content leaves the private store.
import {writeFile} from 'node:fs/promises';
import {connect} from '../src/lib/db';
async function main(){
 const db=await connect();
 try{
  const rows=(await db.query<{filename:string;version:string;sha256:string;status:string;record_count:number;limitations:string;created_at:string}>('SELECT filename,version,sha256,status,record_count,limitations,created_at FROM imports ORDER BY filename')).rows;
  if(!rows.length)throw new Error('No imports found. Run `pnpm import` first.');
  const total=rows.reduce((n,r)=>n+Number(r.record_count),0);
  const derived=(await db.query<{kind:string;n:number}>("SELECT 'incidents' AS kind,count(*)::int AS n FROM incidents UNION ALL SELECT 'witnesses',count(*)::int FROM witnesses UNION ALL SELECT 'claims',count(*)::int FROM claims UNION ALL SELECT 'artifacts',count(*)::int FROM artifacts UNION ALL SELECT 'custody_transfers',count(*)::int FROM custody_transfers UNION ALL SELECT 'sources',count(*)::int FROM sources UNION ALL SELECT 'relations',count(*)::int FROM relations UNION ALL SELECT 'tasks',count(*)::int FROM tasks UNION ALL SELECT 'documents',count(*)::int FROM documents UNION ALL SELECT 'chunks',count(*)::int FROM chunks")).rows;
  const md=`# Source ingestion & research lineage manifest

Generated ${new Date().toISOString()} by \`pnpm lineage\` from the local private import table.

**Baseline:** v0.8 consolidated research package (\`UAP_Research_Consolidated_v08\`). Every member's SHA-256 was checked against \`MANIFEST_v08.json\` before import; any mismatch aborts the import.

**Historical limitation (preserved):** v0.8 incorporates the accessible v07 Deep Research *narrative*. It is **not** a verified byte-level import of the unavailable v07 XLSX/ZIP. Prior versions (v01–v07 artifacts) are kept for lineage and add no independent cases. The 25 core events and 46 worldwide leads overlap and are not counted as 71 independent incidents.

**Publication boundary:** this file lists file names and checksums only. The research files themselves are private and are excluded from the public repository by \`.gitignore\`.

## Summary

- Files verified: ${rows.length}
- Tabular records imported: ${total}
- Derived normalized rows: ${derived.map(d=>`${d.kind} ${d.n}`).join(' · ')}

## Files

| File | Version | Status | Records | SHA-256 |
|---|---|---|---:|---|
${rows.map(r=>`| ${r.filename} | ${r.version} | ${r.status} | ${r.record_count} | \`${r.sha256}\` |`).join('\n')}

Status meanings: **imported** = CSV rows loaded as records with original IDs; **lineage-preserved** = checksum verified and (for Markdown/text) chunked for retrieval, but not converted into evidence records.
`;
  await writeFile('docs/SOURCE_LINEAGE.md',md);console.log(`Wrote docs/SOURCE_LINEAGE.md (${rows.length} files, ${total} records).`);
 }finally{await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

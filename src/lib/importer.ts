import { readFile,readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { Database,audit } from './db';
import { ResearchRow } from './research';
export const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
export function recordIdentity(collection:string,row:ResearchRow,index:number) {
 const key=Object.keys(row)[0];const stable=/^(ID|EventID|WitnessID|ClaimID|ArtifactID|CustodyID|SourceID|TaskID|TheoryID|LinkID|GapID|SeriesID|Question)$/.test(key);return `${collection}:${stable?row[key]:String(index+1).padStart(4,'0')}`;
}
export async function importResearch(db:Database,root:string) {
 const manifest=JSON.parse(await readFile(path.join(root,'MANIFEST_v08.json'),'utf8'));
 const files=await Promise.all(manifest.members.map(async(m:{path:string;sha256:string})=>{
   const target=path.resolve(root,m.path);if(!target.startsWith(path.resolve(root)+path.sep))throw new Error('Unsafe manifest path');
   const bytes=await readFile(target);if(hash(bytes)!==m.sha256)throw new Error(`Checksum mismatch: ${m.path}`);return {...m,bytes};
 }));
 const all:Record<string,{id:string;payload:ResearchRow}[]>={};
 await db.transaction(async tx=>{
 for(const f of files){
   const iid=hash(f.path+f.sha256);const isCSV=f.path.startsWith('Workbook_CSV_Exports/');
   const rows:ResearchRow[]=isCSV?parse(f.bytes,{columns:true,bom:true,skip_empty_lines:true}):[];
   await tx.query('INSERT INTO imports(id,version,filename,sha256,status,limitations,record_count) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[iid,'v08',f.path,f.sha256,isCSV?'imported':'lineage-preserved','Private. v07 narrative only; original v07 workbook absent. Prior versions do not add independent cases.',rows.length]);
   const collection=path.basename(f.path,'.csv');all[collection]=[];const ids=new Set<string>();
   for(const [index,payload] of rows.entries()){
     const sourceId=recordIdentity(collection,payload,index);if(ids.has(sourceId))throw new Error(`Duplicate ID ${sourceId}`);ids.add(sourceId);
     const id=`v08:${sourceId}`;all[collection].push({id,payload});
     await tx.query('INSERT INTO records(id,collection,source_id,release,import_id,payload) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[id,collection,sourceId,'v08',iid,JSON.stringify(payload)]);
   }
   if(/\.(md|txt)$/.test(f.path)){
     const content=f.bytes.toString('utf8');const id='doc:'+f.sha256;
     await tx.query('INSERT INTO documents(id,import_id,title,content,sha256) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[id,iid,f.path,content,f.sha256]);
     const chunks=content.match(/[\s\S]{1,1800}/g)||[];
     for(const [i,text] of chunks.entries())await tx.query('INSERT INTO chunks(id,document_id,ordinal,content) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[`${id}:${i}`,id,i,text]);
   }
 }
 for(const {id,payload:r} of all.Events||[])await tx.query('INSERT INTO incidents VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[r.EventID,id,r.Case,r.Country,r['Date/precision']]);
 for(const {id,payload:r} of all.Witnesses||[])await tx.query('INSERT INTO witnesses VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[r.WitnessID,id,r.EventID]);
 for(const {id,payload:r} of all.Sources||[])await tx.query('INSERT INTO sources VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[r.SourceID,id,r.URL,r.Title]);
 for(const {id,payload:r} of all.Artifacts||[])await tx.query('INSERT INTO artifacts VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[r.ArtifactID,id,r.EventID]);
 for(const {id,payload:r} of all.Claims||[])await tx.query('INSERT INTO claims VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[r.ClaimID,id,r.EventID,r.WitnessID||null,r.ArtifactID||null]);
 for(const {id,payload:r} of all.Custody||[])await tx.query('INSERT INTO custody_transfers VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[r.CustodyID,id,r.ArtifactID]);
 for(const {id,payload:r} of all.Witness_Links||[])await tx.query('INSERT INTO relations(id,from_id,to_id,kind,basis) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[id,r.WitnessA,r.WitnessB,'witness-dependency',JSON.stringify(r)]);
 for(const {payload:r} of all.Research_Queue||[])await tx.query('INSERT INTO tasks(id,incident_id,title,purpose,priority,metadata) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[r.TaskID,r.EventID,r['Next research action'],r.Purpose,r.Priority,JSON.stringify({source:'Research_Queue',feasibility:'Requires analyst estimate',effort:'Unestimated',dependencies:[],discrimination:'Resolve source-level evidence gaps',missingLink:'See case evidence matrix'})]);
 await audit(tx,'importer','import','v08',{files:files.length,collections:Object.keys(all).filter(k=>all[k].length).length});
 });
 // Companion hypothesis is preserved privately, including its original six-stage formulation.
 for(const name of ['UAP_Evidence_Protection_and_Proof_Hypothesis_v01.md']){
   let content:string;try{content=await readFile(path.join(root,'..',name),'utf8');}catch{continue;}
   const h=hash(content);await db.query('INSERT INTO documents(id,title,content,sha256) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',['doc:'+h,name,content,h]);
 }
 return {files:files.length,counts:Object.fromEntries(Object.entries(all).filter(([,r])=>r.length).map(([k,r])=>[k,r.length]))};
}
// v09+ research extensions: separate releases and collections that never overwrite v08 records.
// Each file holds {release, method, collections:{Name:[rows]}}; rows keep their original IDs.
export async function importExtension(db:Database,file:string){
 const bytes=await readFile(file);const sha=hash(bytes);const data=JSON.parse(bytes.toString('utf8')) as {release:string;method:string;collections:Record<string,ResearchRow[]>};
 if(!data.release||!data.collections)throw new Error('Not a research extension file');
 const iid=hash(path.basename(file)+sha);const counts:Record<string,number>={};
 await db.transaction(async tx=>{
  const total=Object.values(data.collections).reduce((n,r)=>n+r.length,0);
  await tx.query('INSERT INTO imports(id,version,filename,sha256,status,limitations,record_count) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[iid,data.release,path.basename(file),sha,'imported',data.method,total]);
  for(const [collection,rows] of Object.entries(data.collections)){
   counts[collection]=rows.length;
   for(const [index,payload] of rows.entries()){
    const sourceId=`${collection}:${payload.ClaimID||payload.ArtifactID&&`${payload.ArtifactID}-${payload.EventID}`||String(index+1).padStart(4,'0')}`;
    // Re-importing a corrected file replaces that release's rows; v08 rows are untouched.
    await tx.query("INSERT INTO records(id,collection,source_id,release,import_id,payload) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(collection,source_id,release) DO UPDATE SET payload=excluded.payload,import_id=excluded.import_id",[`${data.release}:${sourceId}`,collection,sourceId,data.release,iid,JSON.stringify(payload)]);
   }
  }
  await audit(tx,'importer','import-extension',data.release,{file:path.basename(file),sha256:sha,counts});
 });
 return {release:data.release,counts};
}

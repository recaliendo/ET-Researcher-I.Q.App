import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {connect} from '../src/lib/db';
import {importResearch,recordIdentity} from '../src/lib/importer';
import {roleFor,requireRole} from '../src/lib/auth';
import {validateCitations} from '../src/lib/assistant';

// The research package is private and is never committed; these tests run where it is present locally.
const pkg=path.resolve(process.env.RESEARCH_PACKAGE_DIR||'UAP_Research_Consolidated_v08');
const havePackage=existsSync(path.join(pkg,'MANIFEST_v08.json'));

test('v0.8 import preserves identifiers and counts, and is idempotent',{skip:!havePackage&&'private research package not present'},async()=>{
 const db=await connect('memory://');
 try{
  const first=await importResearch(db,pkg);
  assert.equal(first.files,63);
  assert.equal(first.counts.Events,25);assert.equal(first.counts.Witnesses,32);assert.equal(first.counts.Claims,24);
  assert.equal(first.counts.Worldwide_Cases,46);assert.equal(first.counts.GEIPAN_Era_v08,8);
  const n=async(sql:string)=>Number((await db.query<{n:number}>(sql)).rows[0].n);
  const records=await n('SELECT count(*)::int AS n FROM records');
  assert.equal(await n('SELECT count(*)::int AS n FROM incidents'),25);
  assert.ok(await n("SELECT count(*)::int AS n FROM records WHERE source_id='Events:E001'")===1);
  // Worldwide leads stay a separate collection; they are not merged into core incidents.
  assert.equal(await n("SELECT count(*)::int AS n FROM incidents WHERE id LIKE 'WC%'"),0);
  // Everything imported is private until a publication review.
  assert.equal(await n("SELECT count(*)::int AS n FROM records WHERE publication<>'private'"),0);
  await importResearch(db,pkg);
  assert.equal(await n('SELECT count(*)::int AS n FROM records'),records,'re-import must not duplicate records');
  const geipan=(await db.query<{payload:Record<string,string>}>("SELECT payload FROM records WHERE collection='Stat_Results_v08' AND payload->>'Metric'='Chi-square statistic'")).rows[0];
  assert.equal(geipan.payload.Value,'77.81084994145675');
 }finally{await db.close();}
});
test('import refuses a package whose checksum does not match the manifest',{skip:!havePackage&&'private research package not present'},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'et-import-'));
 try{
  await cp(pkg,dir,{recursive:true});const target=path.join(dir,'Workbook_CSV_Exports','Events.csv');
  await writeFile(target,(await readFile(target,'utf8'))+'\nTAMPERED');
  const db=await connect('memory://');try{await assert.rejects(()=>importResearch(db,dir),/Checksum mismatch/);}finally{await db.close();}
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('stable identifiers come from the source ID column, not row order',()=>{
 assert.equal(recordIdentity('Events',{EventID:'E007',Case:'x'},0),'Events:E007');
 assert.equal(recordIdentity('Integration_Log',{Date:'2026-10-15',Action:'x'},2),'Integration_Log:0003');
});

test('roles: production has no loopback bypass and needs strong tokens',()=>{
 const env=process.env as Record<string,string|undefined>;const saved={...env};
 try{
  env.NODE_ENV='production';env.ADMIN_TOKEN='a'.repeat(40);env.EDITOR_TOKEN='short';
  assert.equal(roleFor(new Request('http://127.0.0.1/api/data')),'public');
  assert.equal(roleFor(new Request('http://x/api',{headers:{authorization:'Bearer '+'a'.repeat(40)}})),'admin');
  assert.equal(roleFor(new Request('http://x/api',{headers:{authorization:'Bearer short'}})),'public');
  assert.throws(()=>requireRole(new Request('http://x/api',{method:'POST'}),'editor'),/FORBIDDEN/);
  assert.throws(()=>requireRole(new Request('http://x/api',{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(40),origin:'http://evil'}}),'admin'),/FORBIDDEN/);
  env.NODE_ENV='development';
  assert.equal(roleFor(new Request('http://127.0.0.1:3000/api/data')),'admin');
  assert.equal(roleFor(new Request('http://192.168.1.4:3000/api/data')),'public');
 }finally{for(const k of Object.keys(env))if(!(k in saved))delete env[k];Object.assign(env,saved);}
});
test('AI answers citing anything outside the retrieved set are rejected',()=>{
 const allowed=new Set(['v08:Events:E001']);
 assert.doesNotThrow(()=>validateCitations({answer:'a',citations:['v08:Events:E001'],uncertainty:'u'},allowed));
 assert.throws(()=>validateCitations({answer:'a',citations:['made-up'],uncertainty:'u'},allowed),/ungrounded/);
});

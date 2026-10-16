import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {parse} from 'csv-parse/sync';
import {triage,POLICY_VERSION} from '../src/lib/triage';
import {funnel} from '../src/lib/funnel';
import {gaps,crosswalkAudit,GAP_STATUSES} from '../src/lib/gaps';
import {bootstrapV,historicalTable,verified,effectiveWitnesses} from '../src/lib/statistics';
import {theories} from '../src/lib/psychology';
import {connect} from '../src/lib/db';
import {ingest} from '../src/lib/ingestion';

const now=new Date('2026-10-16T00:00:00Z');
const base={provider:'crossref',url:'https://doi.org/10.1234/abcd.5678',title:'Social responses to the 2023 congressional UAP hearings',published_at:'2025-03-01T00:00:00.000Z',now};

test('a Crossref study of social reactions becomes a bibliographic lead, not UAP evidence',()=>{
 const t=triage(base);
 assert.equal(t.disposition,'source-verified metadata lead');assert.equal(t.state,'AUTO_CLASSIFIED');
 assert.equal(t.topic,'Social, cultural or policy study');assert.match(t.evidenceRelation,/does not corroborate/);
 assert.ok(t.publicLead);assert.ok(!t.humanRequired);assert.equal(t.policy,POLICY_VERSION);
 assert.equal(t.checks.find(c=>c.id==='content')!.pass,null,'full text is never claimed as checked');
});
test('two copies of the same release are not independent: the second is a duplicate',()=>{
 const t=triage({...base,duplicateOf:'abc'});assert.equal(t.disposition,'possible duplicate');assert.ok(!t.publicLead);
});
test('physical-material claims, corrections and case associations go to a human',()=>{
 for(const title of ['Isotopic analysis of an alleged UAP fragment','Retraction note: UAP sensor study'])assert.equal(triage({...base,title}).disposition,'requires expert review');
 assert.equal(triage({...base,caseSuggestions:1}).disposition,'requires expert review');
});
test('metadata failures are not published: wrong domain, missing DOI, future date',()=>{
 assert.equal(triage({...base,url:'https://evil.example/10.1/x'}).disposition,'metadata check failed');
 assert.equal(triage({...base,url:'https://doi.org/not-a-doi'}).disposition,'metadata check failed');
 assert.equal(triage({...base,published_at:'2031-01-01T00:00:00Z'}).disposition,'metadata check failed');
});
test('machines never produce a human-reviewed disposition; only a recorded human status does',()=>{
 assert.notEqual(triage(base).disposition,'human reviewed');
 assert.equal(triage({...base,status:'reviewed'}).disposition,'human reviewed');
 assert.equal(triage({...base,status:'retracted'}).state,'RETRACTED');
});
test('ingestion triages every stored item and leaves human status pending',async()=>{
 const db=await connect('memory://');
 try{
  const body=JSON.stringify({message:{items:[{title:['Public perception of UAP reports'],URL:'https://doi.org/10.1234/x',published:{'date-parts':[[2024,5]]},publisher:'Pub'}]}});
  await ingest(db,(async(p:{id:string})=>({res:new Response(p.id==='crossref'?body:'',{status:p.id==='crossref'?200:304}),body:p.id==='crossref'?body:''})) as never);
  const rows=(await db.query<{disposition:string;policy_version:string;status:string}>('SELECT disposition,policy_version,status FROM feed_items')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].disposition,'source-verified metadata lead');assert.equal(rows[0].policy_version,POLICY_VERSION);assert.equal(rows[0].status,'pending');
 }finally{await db.close();}
});
test('funnel: unknown is missing, AI is not a coder, and no second coder means zero dual coding',()=>{
 const tables={Cognitive_Claim_Coding:[{ClaimID:'CL1','Coder 1':'Unknown','Coder 2':'Unknown',Adjudicated:'No'}],Primary_Source_Extraction_v09:[{ClaimID:'CL1','Earliest statement date':'2017-12-16','Source tier':'News/secondary report','Review status':'AI-extracted, awaiting blinded second human coder'}],
  Statistical_Eligibility_v06:[{EventID:'E1','Ground truth label':'Not measured','Inferential inclusion reason':'Excluded: no independent ground-truth outcome','Primary dossier extraction':'Pending source-specific extraction'}],Claims:[{ClaimID:'CL1'}]};
 const s=Object.fromEntries(funnel(tables).map(x=>[x.key,x]));
 assert.equal(s.d.operational!.value,1);assert.equal(s.d.evidence.value,0,'secondary, unreviewed date is not evidence');
 assert.equal(s.f.evidence.value,0);assert.equal(s.h.evidence.value,0);assert.equal(s.h.operational!.value,1);
 assert.equal(s.i.evidence.value,0);assert.equal(s.k.evidence.value,0);assert.equal(s.l.evidence.value,0);
});
test('funnel never throws on the public (partial) view and flags private stages as unavailable',()=>{
 const s=funnel({});assert.equal(s.length,12);assert.ok(s.filter(x=>!x.available).length>=10);assert.ok(s.every(x=>x.evidence.value===0));
});
test('ten retellings by one witness are one independent account',()=>{assert.equal(effectiveWitnesses(10,1),1);});
test('seeded bootstrap is repeatable and agrees with the published interval within Monte Carlo error',()=>{
 const a=bootstrapV(historicalTable(),2000,7),b=bootstrapV(historicalTable(),2000,7);assert.deepEqual(a.ci,b.ci);
 const full=bootstrapV(historicalTable(),verified.bootstrapResamples,verified.seed);
 assert.ok(Math.abs(full.ci[0]-verified.bootstrapCI[0])<.005&&Math.abs(full.ci[1]-verified.bootstrapCI[1])<.005,String(full.ci));
});
test('gap statuses use the fixed vocabulary and none is completed without meeting its criterion',()=>{
 for(const g of gaps({})){assert.ok(GAP_STATUSES.includes(g.status));if(g.status==='completed')assert.equal(g.done,g.total);}
 assert.equal(gaps({}).find(g=>g.id==='G005')!.status,'externally required');
});
test('psychology codes are unique and psychophysical scaling is not silently PSY01',()=>{
 const codes=theories.map(t=>t.code);assert.equal(new Set(codes).size,codes.length);
 const pp=theories.find(t=>t.id==='psychophysics')!;assert.deepEqual(pp.psy,[]);assert.notEqual(pp.code,theories.find(t=>t.psy.includes('PSY01'))!.code);
});

// Real-package checks (the package is private and not committed).
const dir=path.resolve('UAP_Research_Consolidated_v08/Workbook_CSV_Exports');
const have=existsSync(dir);
const load=():Record<string,Record<string,string>[]>=>Object.fromEntries(readdirSync(dir).filter(f=>f.endsWith('.csv')).map(f=>[f.replace(/\.csv$/,''),parse(readFileSync(path.join(dir,f)),{columns:true,bom:true,skip_empty_lines:true})]));
test('v0.8 funnel reconciles with the package: 67 provisional links, 0 eligible, 0 dual-coded',{skip:!have&&'package not present'},()=>{
 const t=load();const s=Object.fromEntries(funnel(t).map(x=>[x.key,x]));
 assert.equal(s.b.operational!.of,67);assert.equal(s.b.evidence.value,0);assert.equal(s.a.evidence.value,31,'16 Sources + 15 Source_Registry_v08');
 assert.equal(s.c.evidence.value,3);assert.equal(s.k.evidence.value,0);assert.equal(s.i.evidence.value,0);assert.equal(s.e.evidence.value,0);
});
test('crosswalk audit: unique IDs, every link target exists, nothing silently relinked',{skip:!have&&'package not present'},()=>{
 const a=crosswalkAudit(load());assert.equal(a.rows,67);assert.equal(a.uniqueIds,67);assert.equal(a.targetsExist,a.linked);assert.equal(a.sourceVerified,0);
});
test('the word "public" alone does not make an item a social study',()=>{
 assert.notEqual(triage({...base,title:'Multimodal evidence mapping of a public unidentified anomalous phenomena archive'}).topic,'Social, cultural or policy study');
 assert.equal(triage({...base,title:'Public perception of UAP sightings'}).topic,'Social, cultural or policy study');
});
test('a sky-survey paper is an observation analysis, not a social study',()=>{
 assert.equal(triage({...base,provider:'arxiv',url:'https://arxiv.org/abs/2407.12345',title:'Transients in the Palomar Observatory Sky Survey'}).topic,'Sensor or observation analysis');
});

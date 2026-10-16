import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adjudicate,combine,effective,machineAgreement,type CoderOutput,type VarCode} from '../src/lib/agents/engine';
import {checkQuote,htmlToText} from '../src/lib/agents/verify';
import {connect} from '../src/lib/db';
import {importBundle,adjudicateIncident,runOrchestrator,researchProgress,parseCoder,dossier,docId,quoteId,type Bundle} from '../src/lib/agents/pipeline';

const all=(v:string,cite:string[]=['Q1']):CoderOutput['variables']=>Object.fromEntries(['V1','V2','V3','V4','V5','V6','V7'].map(c=>[c,{value:v as never,citations:v==='UNKNOWN'?[]:cite,rationale:'r'}]));
const coder=(c:'machine-coder-a'|'machine-coder-b',vars:CoderOutput['variables']):CoderOutput=>({coder:c,variables:vars});
const base={incident:'E1',challenges:[],verified:new Set(['Q1','R1']),sourcesVerified:1,humanValidations:0};

test('agreement, abstention and conflict follow the rules; uncertain cases are never forced',()=>{
 assert.deepEqual(combine('YES','YES'),{value:'YES',agreement:'agree'});
 assert.deepEqual(combine('YES','NO'),{value:'CONFLICTED',agreement:'conflict'});
 assert.deepEqual(combine('YES','UNKNOWN'),{value:'UNKNOWN',agreement:'abstain-split'});
});
test('a YES/NO resting on an unverified or missing citation is downgraded to UNKNOWN',()=>{
 assert.equal(effective({value:'YES',citations:['FAKE'],rationale:''},new Set(['Q1'])).value,'UNKNOWN');
 assert.equal(effective({value:'NO',citations:[],rationale:''},new Set(['Q1'])).value,'UNKNOWN');
 assert.equal(effective({value:'YES',citations:['Q1'],rationale:''},new Set(['Q1'])).value,'YES');
});
test('well-supported agreement is machine-adjudicated and exploratory-eligible, never confirmatory',()=>{
 const r=adjudicate({...base,a:coder('machine-coder-a',all('YES')),b:coder('machine-coder-b',all('YES'))});
 assert.equal(r.state,'MACHINE_ADJUDICATED');assert.equal(r.exploratory,true);assert.equal(r.confirmatory,false);
 assert.equal(adjudicate({...base,humanValidations:2,a:coder('machine-coder-a',all('YES')),b:coder('machine-coder-b',all('YES'))}).state,'HUMAN_VALIDATED');
});
test('YES vs NO on a required variable escalates to human review and blocks eligibility',()=>{
 const b=all('YES');b.V4={value:'NO',citations:['Q1'],rationale:''};
 const r=adjudicate({...base,a:coder('machine-coder-a',all('YES')),b:coder('machine-coder-b',b)});
 assert.equal(r.state,'AGENT_CONFLICT');assert.equal(r.exploratory,false);assert.equal(r.variables.V4.value,'CONFLICTED');
});
test('adversarial rejection makes a value UNKNOWN; it never flips YES to NO',()=>{
 const r=adjudicate({...base,challenges:[{variable:'V5' as VarCode,verdict:'reject',reason:'video authenticity not documented'}],a:coder('machine-coder-a',all('YES')),b:coder('machine-coder-b',all('YES'))});
 assert.equal(r.variables.V5.value,'UNKNOWN');assert.equal(r.state,'INSUFFICIENT_EVIDENCE');assert.equal(r.exploratory,false);
});
test('unknown is not negative: V5 = NO counts only after an adequate investigation',()=>{
 const v=all('YES');v.V5={value:'NO',citations:['Q1'],rationale:''};v.V6={value:'UNKNOWN',citations:[],rationale:''};
 const r=adjudicate({...base,a:coder('machine-coder-a',v),b:coder('machine-coder-b',v)});
 assert.equal(r.state,'MACHINE_ADJUDICATED');assert.equal(r.exploratory,false);
 v.V6={value:'YES',citations:['Q1'],rationale:''};assert.equal(adjudicate({...base,a:coder('machine-coder-a',v),b:coder('machine-coder-b',v)}).exploratory,true);
});
test('no verified source means insufficient evidence; adjudication is deterministic',()=>{
 const x={...base,sourcesVerified:0,a:coder('machine-coder-a',all('YES')),b:coder('machine-coder-b',all('YES'))};
 assert.equal(adjudicate(x).state,'INSUFFICIENT_EVIDENCE');assert.equal(adjudicate(x).inputsSha256,adjudicate(x).inputsSha256);
});
test('machine agreement is computed as kappa over paired codes',()=>{
 const k=machineAgreement([['YES','YES'],['NO','NO'],['YES','UNKNOWN'],['UNKNOWN','UNKNOWN']]);assert.equal(k.n,4);assert.equal(k.observed,.75);assert.ok(k.kappa!>0&&k.kappa!<1);
});
test('quote verification: exact, typographic normalisation, and fabricated quotes fail',()=>{
 const page=htmlToText('<p>The object was observed &ldquo;for about five minutes&rdquo; &mdash; then left.</p><script>var x="for about five minutes"</script>');
 assert.equal(checkQuote(page,'The object was observed "for about five minutes" - then left.').verified,true);
 assert.equal(checkQuote(page,'The object landed and left marks on the ground for everyone to see').verified,false);
 assert.equal(checkQuote('','anything').match,'unverifiable-format');
});
test('coder isolation and grounding: citations outside the dossier are refused',()=>{
 assert.throws(()=>parseCoder('machine-coder-a',{variables:{V1:{value:'YES',citations:['NOT-IN-DOSSIER'],rationale:'x'}}},new Set(['Q1'])));
 assert.throws(()=>parseCoder('machine-coder-b',{variables:{V1:{value:'MAYBE',citations:['Q1'],rationale:'x'}}},new Set(['Q1'])));
 const ok=parseCoder('machine-coder-b',{variables:{V1:{value:'YES',citations:['Q1'],rationale:'x'}}},new Set(['Q1']));assert.equal(ok.variables.V2!.value,'UNKNOWN');
});
test('end to end: ingestion → verification record → coding → adversarial → adjudication → eligibility → dashboard; reruns are idempotent',async()=>{
 const db=await connect('memory://');
 try{
  const t={Events:[{EventID:'E900',Case:'Fixture A',_recordId:'v08:Events:E900'},{EventID:'E901',Case:'Fixture B',_recordId:'v08:Events:E901'}]} as any;
  const url='https://example.gov/report';const d=docId('E900',url),q=quoteId(d,0);
  const doc={url,title:'Report',kind:'official_report',tier:'primary',quotes:['Officer reported the object at 21:00.'],id:d,http_status:200,sha256:'x',content_type:'text/html',bytes:10,retrieved_at:new Date().toISOString(),verification:'retrieved' as const,quoteChecks:[{id:q,quote:'Officer reported the object at 21:00.',verified:true,match:'exact'}]};
  const out=(v:string)=>({variables:Object.fromEntries(['V1','V2','V3','V4','V5','V6','V7'].map(c=>[c,{value:c==='V4'?'NO':v,citations:[q],rationale:'fixture'}]))});
  const bundle:Bundle={runs:[{id:'R-A',agent:'machine-coder-a',model:'m',prompt_version:'p',rubric_version:'r',completed_at:'2026-10-16T00:00:00Z'},{id:'R-B',agent:'machine-coder-b',model:'m',prompt_version:'p',rubric_version:'r',completed_at:'2026-10-16T00:00:00Z'},{id:'R-S',agent:'source-acquisition',model:'m',prompt_version:'p',rubric_version:'r'}],
   sources:[{incident_id:'E900',run_id:'R-S',documents:[doc]}],assessments:[{incident_id:'E900',agent:'machine-coder-a',run_id:'R-A',output:out('YES')},{incident_id:'E900',agent:'machine-coder-b',run_id:'R-B',output:out('YES')}]};
  await importBundle(db,bundle);
  const first=await runOrchestrator(db,t);
  assert.equal(first.find(o=>o.incident==='E900')!.state,'MACHINE_ADJUDICATED');
  assert.equal(first.find(o=>o.incident==='E901')!.state,'SOURCE_DISCOVERED','an incident without sources stays visible, not stuck');
  const again=await adjudicateIncident(db,t,'E900');assert.equal(again.changed,false,'idempotent rerun');
  const p=await researchProgress(db,t);
  assert.equal(p.exploratoryEligible,1);assert.equal(p.confirmatoryEligible,0);assert.equal(p.table.unexposedOutcome,1);assert.equal(p.quotesVerified,1);
  assert.equal(p.incidents[0].variables.V4.value,'NO');
  // Stuck-job recovery and failure recording.
  await db.query("UPDATE agent_jobs SET state='running',locked_until=now()-interval '1 minute' WHERE incident_id='E900'");
  await runOrchestrator(db,t);assert.equal((await db.query<{state:string}>("SELECT state FROM agent_jobs WHERE incident_id='E900'")).rows[0].state,'done');
  assert.ok(dossier(t,'E900',[doc],[{id:q,document_id:d,quote:doc.quotes[0],verified:true}]).allowed.includes(q));
 }finally{await db.close();}
});

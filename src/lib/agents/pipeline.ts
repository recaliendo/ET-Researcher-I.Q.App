// Agent 9 (orchestrator) and persistence for Amendment A1. Every step is idempotent: re-running with the
// same inputs changes nothing; changed inputs supersede the previous adjudication and keep it for audit.
import {createHash} from 'node:crypto';
import type {Database} from '../db';
import {audit} from '../db';
import type {ResearchRow} from '../research-types';
import {validateProposals,authorizeAgent,type AgentName} from '../agent-policy';
import {adjudicate,machineAgreement,VARIABLES,RUBRIC_VERSION,ENGINE_VERSION,type CoderOutput,type Challenge,type VarCode,type Verdict} from './engine';

export const PROMPT_VERSION='P1-2026-10-16';
export type SourceDoc={url:string;title?:string;publisher?:string;document_date?:string;kind:string;tier:string;witness?:string|null;statement_date?:string|null;quotes:string[];notes?:string};
export type VerifiedDoc=SourceDoc&{id:string;http_status:number;sha256:string;content_type:string;bytes:number;retrieved_at:string;verification:'retrieved'|'failed';error?:string;quoteChecks:{id:string;quote:string;verified:boolean;match:string}[]};
export type Run={id:string;agent:AgentName;model:string;prompt_version:string;rubric_version:string;snapshot_sha256?:string;started_at?:string;completed_at?:string;details?:Record<string,unknown>};
export type Bundle={runs:Run[];sources:{incident_id:string;run_id:string;documents:VerifiedDoc[]}[];assessments:{incident_id:string;agent:AgentName;run_id:string;output:unknown}[]};

const sha=(x:unknown)=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export const docId=(incident:string,url:string)=>`DOC-${incident}-${sha(url).slice(0,10)}`;
export const quoteId=(doc:string,i:number)=>`${doc}-Q${i+1}`;

// Dossier given to the machine coders: imported v08/v09 record rows for the incident plus verified quotes only.
export function dossier(t:Record<string,ResearchRow[]>,incident:string,docs:{id:string;url:string;title?:string|null;publisher?:string|null;document_date?:string|null;kind:string;tier:string;witness?:string|null;statement_date?:string|null}[],quotes:{id:string;document_id:string;quote:string;verified:boolean}[]){
 const collections=['Events','Witnesses','Claims','Artifacts','Custody','Witness_Dependency_v08','Same_Artifact_v08','Statistical_Eligibility_v06','Primary_Source_Audit_v06','Primary_Source_Extraction_v09','Artifact_Lab_Evidence_v09'];
 const records=collections.flatMap(c=>(t[c]||[]).filter(r=>r.EventID===incident).map(r=>({id:r._recordId,collection:c,fields:Object.fromEntries(Object.entries(r).filter(([k,v])=>k!=='_recordId'&&v))})));
 const evidence=docs.map(d=>({document:d.id,url:d.url,title:d.title,publisher:d.publisher,date:d.document_date,kind:d.kind,tier:d.tier,witness:d.witness,statement_date:d.statement_date,quotes:quotes.filter(q=>q.document_id===d.id&&q.verified).map(q=>({id:q.id,text:q.quote}))})).filter(d=>d.quotes.length);
 const allowed=[...records.map(r=>r.id),...evidence.flatMap(e=>e.quotes.map(q=>q.id))];
 return {incident,records,evidence,allowed,snapshot:sha({records,evidence})};
}

// Validate a coder's output against the rubric vocabulary and the dossier it was given.
export function parseCoder(agent:'machine-coder-a'|'machine-coder-b',raw:unknown,allowed:Set<string>):CoderOutput{
 const vars=(raw as {variables?:Record<string,unknown>})?.variables;if(!vars||typeof vars!=='object')throw new Error(`${agent}: missing variables`);
 const proposals=VARIABLES.map(v=>({field:v.code,...(vars[v.code] as object||{value:'UNKNOWN',citations:[],rationale:'not assessed'})}));
 const ok=validateProposals(agent,proposals,allowed);
 return {coder:agent,variables:Object.fromEntries(ok.map(p=>[p.field,{value:p.value,citations:p.citations,rationale:p.rationale}])) as CoderOutput['variables']};
}
export function parseChallenges(raw:unknown,allowed:Set<string>):Challenge[]{
 authorizeAgent('adversarial-review','write:proposal');
 const list=(raw as {challenges?:unknown[]})?.challenges;if(!Array.isArray(list))throw new Error('adversarial-review: missing challenges');
 return list.map((c,i)=>{const x=c as Record<string,unknown>;
  if(!VARIABLES.some(v=>v.code===x.variable)||!['uphold','reject'].includes(String(x.verdict))||typeof x.reason!=='string')throw new Error(`adversarial-review: invalid challenge ${i}`);
  const cites=Array.isArray(x.citations)?x.citations.filter(c=>typeof c==='string'&&allowed.has(c)):[];
  return {variable:x.variable as VarCode,verdict:x.verdict as Challenge['verdict'],reason:String(x.reason).slice(0,1000)+(cites.length?` [${cites.join(', ')}]`:'')};});
}

export async function importBundle(db:Database,b:Bundle,actor='orchestrator'){
 const counts={runs:0,documents:0,quotes:0,assessments:0};
 await db.transaction(async tx=>{
  for(const r of b.runs){await tx.query('INSERT INTO agent_runs(id,agent,model,prompt_version,rubric_version,snapshot_sha256,started_at,completed_at,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING',[r.id,r.agent,r.model,r.prompt_version,r.rubric_version,r.snapshot_sha256||null,r.started_at||null,r.completed_at||null,JSON.stringify(r.details||{})]);counts.runs++;}
  for(const s of b.sources)for(const d of s.documents){
   await tx.query(`INSERT INTO source_documents(id,incident_id,url,title,publisher,document_date,kind,tier,witness,statement_date,http_status,sha256,content_type,bytes,retrieved_at,verification,run_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT(incident_id,url) DO UPDATE SET sha256=excluded.sha256,http_status=excluded.http_status,retrieved_at=excluded.retrieved_at,verification=excluded.verification`,[d.id,s.incident_id,d.url,d.title||null,d.publisher||null,d.document_date||null,d.kind,d.tier,d.witness||null,d.statement_date||null,d.http_status,d.sha256||null,d.content_type||null,d.bytes||0,d.retrieved_at,d.verification,s.run_id]);counts.documents++;
   for(const q of d.quoteChecks){await tx.query('INSERT INTO evidence_quotes(id,document_id,incident_id,quote,verified,match) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET verified=excluded.verified,match=excluded.match,checked_at=now()',[q.id,d.id,s.incident_id,q.quote,q.verified,q.match]);counts.quotes++;}
  }
  for(const a of b.assessments){await tx.query('INSERT INTO agent_assessments(id,incident_id,agent,run_id,output) VALUES($1,$2,$3,$4,$5) ON CONFLICT(incident_id,agent,run_id) DO UPDATE SET output=excluded.output',[`${a.run_id}:${a.incident_id}`,a.incident_id,a.agent,a.run_id,JSON.stringify(a.output)]);counts.assessments++;}
  await audit(tx,actor,'agent-bundle-import','agents',counts);
 });
 return counts;
}

// Adjudicate one incident from the latest stored outputs. Returns the adjudication and whether it changed.
export async function adjudicateIncident(db:Database,t:Record<string,ResearchRow[]>,incident:string){
 const docs=(await db.query<any>('SELECT * FROM source_documents WHERE incident_id=$1 ORDER BY id',[incident])).rows;
 const quotes=(await db.query<any>('SELECT id,document_id,quote,verified FROM evidence_quotes WHERE incident_id=$1 ORDER BY id',[incident])).rows;
 const d=dossier(t,incident,docs,quotes);const allowed=new Set(d.allowed);
 const latest=async(agent:string)=>(await db.query<{output:unknown}>("SELECT a.output FROM agent_assessments a JOIN agent_runs r ON r.id=a.run_id WHERE a.incident_id=$1 AND a.agent=$2 ORDER BY r.completed_at DESC NULLS LAST,a.created_at DESC LIMIT 1",[incident,agent])).rows[0]?.output;
 const ra=await latest('machine-coder-a'),rb=await latest('machine-coder-b'),rc=await latest('adversarial-review');
 if(!ra||!rb)return {incident,state:docs.length?'MACHINE_REVIEW_PENDING':'SOURCE_DISCOVERED',changed:false};
 const a=parseCoder('machine-coder-a',ra,allowed),b=parseCoder('machine-coder-b',rb,allowed);const challenges=rc?parseChallenges(rc,allowed):[];
 const human=Number((await db.query<{n:number}>("SELECT count(DISTINCT actor)::int AS n FROM human_validations WHERE incident_id=$1 AND decision='validated'",[incident])).rows[0].n);
 const verifiedDocs=docs.filter((x:any)=>x.verification==='retrieved'&&quotes.some((q:any)=>q.document_id===x.id&&q.verified)).length;
 const r=adjudicate({incident,a,b,challenges,verified:allowed,sourcesVerified:verifiedDocs,humanValidations:human});
 const cur=(await db.query<{inputs_sha256:string}>('SELECT inputs_sha256 FROM adjudications WHERE incident_id=$1 AND current',[incident])).rows[0];
 if(cur?.inputs_sha256===r.inputsSha256)return {...r,changed:false};
 await db.transaction(async tx=>{await tx.query('UPDATE adjudications SET current=false WHERE incident_id=$1 AND current',[incident]);
  await tx.query('INSERT INTO adjudications(id,incident_id,rubric_version,engine_version,state,variables,exploratory_eligible,confirmatory_eligible,reasons,inputs_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[`ADJ-${incident}-${r.inputsSha256.slice(0,12)}`,incident,RUBRIC_VERSION,ENGINE_VERSION,r.state,JSON.stringify(r.variables),r.exploratory,r.confirmatory,JSON.stringify(r.reasons),r.inputsSha256]);
  await audit(tx,'rules-engine','adjudicate',incident,{state:r.state,exploratory:r.exploratory,engine:ENGINE_VERSION});});
 return {...r,changed:true};
}

// Orchestrator: lease, run, retry (3 attempts), recover stuck jobs, record failures. Safe to run concurrently.
export async function runOrchestrator(db:Database,t:Record<string,ResearchRow[]>){
 const incidents=(t.Events||[]).map(e=>e.EventID);
 for(const id of incidents)await db.query("INSERT INTO agent_jobs(id,incident_id,stage,state) VALUES($1,$2,'adjudicate','queued') ON CONFLICT(incident_id,stage) DO NOTHING",[`JOB-${id}-adjudicate`,id]);
 await db.query("UPDATE agent_jobs SET state='queued',locked_until=NULL WHERE state='running' AND locked_until<now()"); // stuck-job recovery
 await db.query("UPDATE agent_jobs SET state='queued' WHERE state IN ('done','waiting') ");                            // re-evaluate (idempotent)
 const out:{incident:string;state:string;changed:boolean;error?:string}[]=[];
 for(const id of incidents){
  const lease=await db.query("UPDATE agent_jobs SET state='running',locked_until=now()+interval '5 minutes',attempts=attempts+1,updated_at=now() WHERE incident_id=$1 AND stage='adjudicate' AND state='queued' RETURNING attempts",[id]);
  if(!lease.rows.length)continue;
  try{const r=await adjudicateIncident(db,t,id);const waiting=r.state==='SOURCE_DISCOVERED'||r.state==='MACHINE_REVIEW_PENDING';
   await db.query("UPDATE agent_jobs SET state=$2,last_error=NULL,locked_until=NULL,attempts=0,updated_at=now() WHERE incident_id=$1 AND stage='adjudicate'",[id,waiting?'waiting':'done']);out.push({incident:id,state:r.state,changed:r.changed});}
  catch(e){const msg=e instanceof Error?e.message:String(e);const attempts=Number((lease.rows[0] as {attempts:number}).attempts);
   await db.query("UPDATE agent_jobs SET state=$2,last_error=$3,locked_until=NULL,updated_at=now() WHERE incident_id=$1 AND stage='adjudicate'",[id,attempts>=3?'failed':'queued',msg.slice(0,500)]);out.push({incident:id,state:'ERROR',changed:false,error:msg});}
 }
 await audit(db,'orchestrator','run','agents',{processed:out.length,changed:out.filter(o=>o.changed).length,errors:out.filter(o=>o.error).length});
 return out;
}

// Live model path (used only when a key is configured). Same rubric and prompt as the offline coders.
export async function callModel(system:string,user:string){
 if(process.env.ANTHROPIC_API_KEY){const model=process.env.AGENT_MODEL||'claude-opus-5-5';
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:AbortSignal.timeout(120000),headers:{'x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model,max_tokens:4000,system,messages:[{role:'user',content:user}]})});
  if(!r.ok)throw new Error(`Model request failed (${r.status})`);const j=await r.json();return {model,text:(j.content||[]).map((c:{text?:string})=>c.text||'').join('')};}
 throw new Error('No model configured (set ANTHROPIC_API_KEY to run coders in the app).');
}

// Phase 6 metrics, all from persisted rows.
export async function researchProgress(db:Database,t:Record<string,ResearchRow[]>){
 const q=async(sql:string)=>Number((await db.query<{n:number}>(sql)).rows[0].n);
 const adj=(await db.query<{incident_id:string;state:string;variables:Record<VarCode,{value:Verdict;a:Verdict;b:Verdict;agreement:string}>;exploratory_eligible:boolean;confirmatory_eligible:boolean;reasons:string[]}>('SELECT incident_id,state,variables,exploratory_eligible,confirmatory_eligible,reasons FROM adjudications WHERE current ORDER BY incident_id')).rows;
 const pairs:[Verdict,Verdict][]=adj.flatMap(a=>VARIABLES.map(v=>[a.variables[v.code]?.a,a.variables[v.code]?.b] as [Verdict,Verdict]).filter(([x,y])=>x&&y));
 const eligible=adj.filter(a=>a.exploratory_eligible);
 const cell=(e:Verdict,o:Verdict)=>eligible.filter(a=>a.variables.V4.value===e&&a.variables.V5.value===o).length;
 return {
  candidates:(t.Events||[]).length,
  incidentsWithSources:await q('SELECT count(DISTINCT incident_id)::int AS n FROM source_documents'),
  sourcesRetrieved:await q("SELECT count(*)::int AS n FROM source_documents WHERE verification='retrieved'"),
  primarySourcesVerified:await q("SELECT count(DISTINCT d.id)::int AS n FROM source_documents d JOIN evidence_quotes e ON e.document_id=d.id AND e.verified WHERE d.tier='primary'"),
  quotesChecked:await q('SELECT count(*)::int AS n FROM evidence_quotes'),quotesVerified:await q('SELECT count(*)::int AS n FROM evidence_quotes WHERE verified'),
  machineReviews:await q("SELECT count(*)::int AS n FROM agent_assessments WHERE agent IN ('machine-coder-a','machine-coder-b')"),
  adversarialReviews:await q("SELECT count(*)::int AS n FROM agent_assessments WHERE agent='adversarial-review'"),
  adjudicated:adj.length,states:Object.fromEntries([...new Set(adj.map(a=>a.state))].map(s=>[s,adj.filter(a=>a.state===s).length])),
  conflicts:adj.filter(a=>a.state==='AGENT_CONFLICT').length,
  exploratoryEligible:eligible.length,confirmatoryEligible:adj.filter(a=>a.confirmatory_eligible).length,
  humanValidations:await q('SELECT count(*)::int AS n FROM human_validations'),
  agreement:machineAgreement(pairs),
  table:{exposedOutcome:cell('YES','YES'),exposedNoOutcome:cell('YES','NO'),unexposedOutcome:cell('NO','YES'),unexposedNoOutcome:cell('NO','NO')},
  jobs:(await db.query<{state:string;n:number}>('SELECT state,count(*)::int AS n FROM agent_jobs GROUP BY state')).rows,
  failures:(await db.query<{incident_id:string;last_error:string}>("SELECT incident_id,last_error FROM agent_jobs WHERE state='failed' OR last_error IS NOT NULL")).rows,
  incidents:adj.map(a=>({id:a.incident_id,state:a.state,exploratory:a.exploratory_eligible,confirmatory:a.confirmatory_eligible,reasons:a.reasons,variables:Object.fromEntries(VARIABLES.map(v=>[v.code,a.variables[v.code]]))}))
 };
}

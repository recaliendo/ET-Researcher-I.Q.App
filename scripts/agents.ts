// Research-agent pipeline CLI (Amendment A1). Inputs and outputs live in private/agent_runs (git-ignored).
//   tsx scripts/agents.ts verify E001 E002 ...   retrieve each source, hash it, check every quote verbatim
//   tsx scripts/agents.ts dossiers E001 ...        build the coder dossiers (records + verified quotes only)
//   tsx scripts/agents.ts run                      import runs/sources/assessments, adjudicate, print progress
import {readFileSync,writeFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {retrieve,checkQuote} from '../src/lib/agents/verify';
import {dossier,docId,quoteId,mergeByUrl,importBundle,runOrchestrator,researchProgress,PROMPT_VERSION,type Bundle,type VerifiedDoc,type SourceDoc} from '../src/lib/agents/pipeline';
import {RUBRIC_VERSION} from '../src/lib/agents/engine';
import {connect} from '../src/lib/db';
import {researchSnapshot} from '../src/lib/research';

const dir=path.resolve('private/agent_runs');
const read=(f:string)=>JSON.parse(readFileSync(path.join(dir,f),'utf8'));
const write=(f:string,x:unknown)=>writeFileSync(path.join(dir,f),JSON.stringify(x,null,1));
// PDF text via pypdf (local only). Runs from an empty temp directory so no module can be planted beside it. The in-app verifier records PDFs as hash-only.
async function pdfText(buf:Buffer){const tmp=mkdtempSync(path.join(os.tmpdir(),'etpdf-'));const f=path.join(tmp,'d.pdf');writeFileSync(f,buf);
 const viaPdftotext=()=>{try{return execFileSync('pdftotext',['-enc','UTF-8',f,'-'],{cwd:tmp,encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});}catch{return '';}};
 // pypdf first; pdftotext (poppler) as fallback for encrypted or oddly encoded PDFs. Both texts are searched.
 try{let t='';try{t=execFileSync('python',['-E','-X','utf8','-c','import sys,pypdf;r=pypdf.PdfReader(sys.argv[1]);print("\\n".join((p.extract_text() or "") for p in r.pages))',f],{cwd:tmp,encoding:'utf8',maxBuffer:64*1024*1024,timeout:120000});}catch{t='';}return t+'\n'+viaPdftotext();}finally{rmSync(tmp,{recursive:true,force:true});}}

async function verify(ids:string[]){
 for(const id of ids){
  // Base pass plus any targeted supplements (sources_<ID>_s2.json, ...). Base documents come first, so existing
  // document and quote IDs never change; a supplement listing the same URL only appends quotes.
  const extra=(await import('node:fs')).readdirSync(dir).filter(f=>new RegExp(`^sources_${id}_[a-z0-9]+[.]json$`).test(f)).sort();
  const src={documents:[read(`sources_${id}.json`),...extra.map(read)].flatMap((x:{documents:SourceDoc[]})=>x.documents)};const docs:VerifiedDoc[]=[];
  for(const d of mergeByUrl(src.documents)){const did=docId(id,d.url);const at=new Date().toISOString();
   try{const r=await retrieve(d.url,{pdfText,maxBytes:60_000_000,timeoutMs:120_000});const ok=r.status>=200&&r.status<300;
    docs.push({...d,id:did,http_status:r.status,sha256:r.sha256,content_type:r.contentType,bytes:r.bytes,retrieved_at:at,verification:ok?'retrieved':'failed',quoteChecks:(d.quotes||[]).map((q,i)=>({id:quoteId(did,i),...(ok?checkQuote(r.text,q):{quote:q,verified:false,match:'none'})}))});}
   catch(e){docs.push({...d,id:did,http_status:0,sha256:'',content_type:'',bytes:0,retrieved_at:at,verification:'failed',error:e instanceof Error?e.message:String(e),quoteChecks:(d.quotes||[]).map((q,i)=>({id:quoteId(did,i),quote:q,verified:false,match:'none'}))});}
  }
  write(`verified_${id}.json`,{incident_id:id,documents:docs});
  console.log(id,docs.map(d=>`${d.verification}:${d.http_status} ${d.quoteChecks.filter(q=>q.verified).length}/${d.quoteChecks.length} ${d.tier} ${new URL(d.url).hostname}${d.error?' ('+d.error+')':''}`).join('\n   '));
 }
}
async function withDb<T>(fn:(db:any,t:any)=>Promise<T>){const db=await connect();try{return await fn(db,await researchSnapshot(true));}finally{await db.close();}}
async function dossiers(ids:string[]){
 await withDb(async(_db,t)=>{for(const id of ids){const v=read(`verified_${id}.json`) as {documents:VerifiedDoc[]};
  const d=dossier(t,id,v.documents.filter(x=>x.verification==='retrieved'),v.documents.flatMap(x=>x.verification==='retrieved'?x.quoteChecks.map(q=>({id:q.id,document_id:x.id,quote:q.quote,verified:q.verified})):[]));
  write(`dossier_${id}.json`,d);console.log(id,'records',d.records.length,'verified quotes',d.evidence.reduce((n,e)=>n+e.quotes.length,0),'snapshot',d.snapshot.slice(0,12));}});
}
async function run(){
 const runs=existsSync(path.join(dir,'runs.json'))?read('runs.json'):[];
 const ids=(await import('node:fs')).readdirSync(dir).filter(f=>/^verified_E\d+\.json$/.test(f)).map(f=>f.slice(9,13));
 const bundle:Bundle={runs:[{id:'RUN-source-acquisition-1',agent:'source-acquisition',model:'claude-code-subagent (claude-opus-5-5) + deterministic verifier',prompt_version:PROMPT_VERSION,rubric_version:RUBRIC_VERSION,completed_at:new Date().toISOString()},...runs],
  sources:ids.map(id=>({incident_id:id,run_id:'RUN-source-acquisition-1',documents:read(`verified_${id}.json`).documents})),assessments:[]};
 // A run may be scoped to some incidents with its own file suffix (re-codes after new evidence); the latest
 // completed run per agent and incident wins at adjudication time, older runs stay for audit.
 for(const r of runs){const scope:string[]|undefined=r.details?.incidents;const suffix=r.details?.file_suffix||'';
  for(const id of ids){if(scope&&!scope.includes(id))continue;const f=`${r.agent}_${id}${suffix}.json`;if(existsSync(path.join(dir,f)))bundle.assessments.push({incident_id:id,agent:r.agent,run_id:r.id,output:read(f)});}}
 write('bundle.json',bundle);
 await withDb(async(db,t)=>{console.log('import',await importBundle(db,bundle,'agents-cli'));const out=await runOrchestrator(db,t);console.log(out.map(o=>`${o.incident} ${o.state}${o.error?' '+o.error:''}`).join('\n'));
  const p=await researchProgress(db,t);write('progress.json',p);console.log(JSON.stringify({...p,incidents:undefined},null,1));});
}
const [cmd,...args]=process.argv.slice(2);
(cmd==='verify'?verify(args):cmd==='dossiers'?dossiers(args):cmd==='run'?run():Promise.reject(new Error('usage: verify|dossiers|run'))).catch(e=>{console.error(e);process.exitCode=1;});

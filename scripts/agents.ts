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
   const hf=(d as SourceDoc&{human_file?:{sha256:string;bytes:number}}).human_file;
   if(hf){docs.push({...d,id:did,http_status:0,sha256:hf.sha256,content_type:'human-supplied',bytes:hf.bytes,retrieved_at:at,verification:'retrieved',quoteChecks:d.quotes.map((q,i)=>({id:quoteId(did,i),quote:q,verified:true,match:'human-file'}))});continue;}
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
// Human-supplied evidence: a document a person obtained legitimately but automation cannot fetch (paywalled
// newspaper archive via a library card, a FOIA response letter, an archive scan). The file is hashed, its text
// extracted, and every quote must still be found verbatim in it. It is recorded as human-supplied, never as
// machine-retrieved, and appended to the incident's evidence through a supplement file.
//   tsx scripts/agents.ts attach E015 path/to/file.pdf --url <citation URL or archive reference> --title "..." //     --publisher "..." --date 1971-11-05 --kind firsthand_statement --tier primary --quote "exact text" [--quote ...]
async function attach(args:string[]){
 const [id,file,...rest]=args;if(!/^E\d{3}$/.test(id||'')||!file||!existsSync(file))throw new Error('usage: attach <EventID> <file> --url ... --title ... --kind ... --tier ... --quote "..."');
 const opt=(k:string)=>{const i=rest.indexOf('--'+k);return i>=0?rest[i+1]:undefined;};const quotes=rest.flatMap((v,i)=>rest[i-1]==='--quote'?[v]:[]);
 const buf=readFileSync(file);const sha256=(await import('node:crypto')).createHash('sha256').update(buf).digest('hex');
 const text=buf.subarray(0,5).toString()==='%PDF-'?await pdfText(buf):buf.toString('utf8');
 const missing=quotes.filter(q=>!checkQuote(text,q).verified);if(!quotes.length||missing.length)throw new Error(`Every quote must appear verbatim in the file. Not found: ${missing.join(' | ')||'(no quotes given)'}`);
 const sup=`sources_${id}_human.json`;const cur=existsSync(path.join(dir,sup))?read(sup):{incident_id:id,agent:'human-supplied',documents:[]};
 cur.documents=cur.documents.filter((d:SourceDoc)=>d.url!==opt('url'));
 cur.documents.push({url:opt('url')||`file:sha256:${sha256}`,title:opt('title'),publisher:opt('publisher'),document_date:opt('date'),kind:opt('kind')||'official_report',tier:opt('tier')||'secondary',quotes,human_file:{sha256,bytes:buf.length,name:path.basename(file),text_chars:text.length},notes:`Human-supplied file (sha256 ${sha256.slice(0,16)}…); quotes verified against the file.`});
 write(sup,cur);console.log(`Attached to ${id}: ${quotes.length} quote(s) verified in ${path.basename(file)} (sha256 ${sha256.slice(0,16)}…). Run verify, dossiers, then re-code ${id}.`);
}
const [cmd,...args]=process.argv.slice(2);
(cmd==='attach'?attach(args):cmd==='verify'?verify(args):cmd==='dossiers'?dossiers(args):cmd==='run'?run():Promise.reject(new Error('usage: verify|dossiers|run'))).catch(e=>{console.error(e);process.exitCode=1;});

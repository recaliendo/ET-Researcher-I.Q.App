// Security regression tests against the real API route handlers, using an isolated temporary database.
// Never run against production.
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir=mkdtempSync(path.join(os.tmpdir(),'et-sec-'));
const env=process.env as Record<string,string|undefined>;
env.ET_DATA_DIR=dir;env.NODE_ENV='production';env.ET_SCHEDULER='off';delete env.DATABASE_URL;
const ADMIN='A'.repeat(40),EDITOR='E'.repeat(40),READER='R'.repeat(40);
env.ADMIN_TOKEN=ADMIN;env.EDITOR_TOKEN=EDITOR;env.READER_TOKEN=READER;env.CRON_TOKEN='C'.repeat(40);
delete env.OPENAI_API_KEY;delete env.ANALYTICS_URL;

type Handler=(req:Request,ctx:{params:Promise<{action:string}>})=>Promise<Response>;
let GET:Handler,POST:Handler,db:any,resetRateLimits:()=>void;
const BASE='https://et.test';
let n=0;const ip=()=>`198.51.100.${(n++%250)+1}`;
const get=(action:string,headers:Record<string,string>={},query='')=>GET(new Request(`${BASE}/api/${action}${query}`,{headers:{'cf-connecting-ip':ip(),...headers}}),{params:Promise.resolve({action})});
const post=(action:string,body:unknown,headers:Record<string,string>={})=>POST(new Request(`${BASE}/api/${action}`,{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':ip(),...headers},body:typeof body==='string'?body:JSON.stringify(body)}),{params:Promise.resolve({action})});
const browser={origin:BASE,host:'et.test'};

before(async()=>{
 ({GET,POST}=await import('../src/app/api/[action]/route'));
 ({resetRateLimits}=await import('../src/lib/security'));
 db=await (await import('../src/lib/db')).database();
 // Fixtures: one public and one private collection, a witness record, review decisions, documents, AI runs.
 await db.query("INSERT INTO imports(id,version,filename,sha256,status,limitations) VALUES('imp','test','fixture.csv','x','ok','fixture')");
 await db.query("INSERT INTO records(id,collection,source_id,release,import_id,payload,publication) VALUES('r-pub','Events','E1','t','imp','{\"EventID\":\"E1\",\"Case\":\"Public case\"}','public'),('r-wit','Witnesses','W1','t','imp','{\"WitnessID\":\"W1\",\"Name/identifier\":\"PRIVATE WITNESS NAME\"}','private')");
 await db.query("INSERT INTO providers(id,name,url,kind,cadence_minutes,policy_url,license_note,last_error) VALUES('crossref','Crossref','https://internal.example/secret-endpoint','crossref',1440,'https://p','n','ECONNREFUSED 10.0.0.5:5432')");
 await db.query("INSERT INTO feed_items(id,provider_id,canonical_url,title,content_hash,metadata,category,summary,summary_method,novelty,significance,status,disposition) VALUES ('f-lead','crossref','https://doi.org/10.1234/a','Lead','h','{}','x','s','m','n','s','pending','source-verified metadata lead'),('f-priv','crossref','https://doi.org/10.1234/b','PRIVATE PENDING ITEM','h','{}','x','s','m','n','s','pending','requires expert review'),('f-corr','crossref','https://doi.org/10.1234/c','Corrected','h','{}','x','s','m','n','s','corrected','human reviewed')");
 await db.query("INSERT INTO review_decisions(id,item_id,actor,decision,rationale) VALUES('rv1','f-priv','editor:abc','rejected','INTERNAL REVIEW NOTE about a private item'),('rv2','f-corr','editor:abc','corrected','Public correction: title fixed')");
 await db.query("INSERT INTO documents(id,title,content,sha256,publication) VALUES('d-priv','Private doc','PRIVATE DOCUMENT TEXT','x','private')");
 await db.query("INSERT INTO ai_runs(id,question,mode,citations,answer) VALUES('ai1','PRIVATE QUESTION','m','[]','{}')");
 await db.query("INSERT INTO audit_log(id,actor,action,target,details) VALUES('au1','admin','publication-set','records','{}')");
});
beforeEach(()=>resetRateLimits());
after(async()=>{await db.close();rmSync(dir,{recursive:true,force:true});});

test('1. anonymous GET /api/data contains no private records, internal reviews, documents, audit or AI runs',async()=>{
 const res=await get('data');const text=await res.text();const d=JSON.parse(text);
 assert.equal(d.role,'public');
 for(const secret of ['PRIVATE WITNESS NAME','INTERNAL REVIEW NOTE','PRIVATE PENDING ITEM','PRIVATE DOCUMENT TEXT','PRIVATE QUESTION','secret-endpoint','ECONNREFUSED','editor:abc'])assert.ok(!text.includes(secret),`leaked: ${secret}`);
 assert.deepEqual(Object.keys(d.tables),['Events']);
 assert.deepEqual(d.reviews.map((r:any)=>r.id),['rv2'],'only the public correction is visible');
 assert.equal(d.audit.length,0);assert.equal(d.imports.length,0);assert.equal(d.documents.length,0);assert.deepEqual(d.publication,{});
 assert.equal(d.providers[0].url,undefined);
});
test('reader sees research data but not audit, imports or publication settings; editor sees audit',async()=>{
 const r=await (await get('data',{authorization:'Bearer '+READER})).json();
 assert.equal(r.role,'reader');assert.ok(r.tables.Witnesses);assert.equal(r.audit.length,0);assert.equal(r.imports.length,0);assert.deepEqual(r.publication,{});
 assert.ok(r.reviews.every((x:any)=>!('actor' in x)));
 const e=await (await get('data',{authorization:'Bearer '+EDITOR})).json();assert.ok(e.audit.length>0);assert.deepEqual(e.publication,{});
 const a=await (await get('data',{authorization:'Bearer '+ADMIN})).json();assert.ok(Object.keys(a.publication).length>0);
});
test('private documents and exports are refused to anonymous callers',async()=>{
 assert.equal((await get('document',{},'?id=d-priv')).status,404);
 const ex=await (await get('export')).text();assert.ok(!ex.includes('PRIVATE WITNESS NAME'));
});
test('2. role escalation: weak, wrong or cross-role tokens get nothing',async()=>{
 for(const t of ['short',ADMIN.slice(0,39),ADMIN+'x',READER.toLowerCase()])assert.equal((await (await get('data',{authorization:'Bearer '+t})).json()).role,'public');
 assert.equal((await post('publish-set',{public:[]},{authorization:'Bearer '+READER})).status,403);
 assert.equal((await post('review',{id:'f-priv',decision:'reviewed',rationale:'x'.repeat(30)},{authorization:'Bearer '+READER})).status,403);
});
test('3. unauthorized operations are refused without changing data',async()=>{
 for(const [action,body] of [['publish-set',{public:['Witnesses']}],['publish',{collection:'Witnesses',publication:'public'}],['provider',{id:'crossref',enabled:false,cadence:60}],['ingest',{}],['retriage',{}],['task',{id:'t',state:'Completed'}],['revoke-sessions',{}],['ask',{question:'witness names'}]] as const)
  assert.equal((await post(action,body)).status,403,action);
 assert.equal((await db.query("SELECT publication FROM records WHERE id='r-wit'")).rows[0].publication,'private');
});
test('4. sessions: login creates a revocable session; logout and token rotation invalidate it; CSRF is enforced',async()=>{
 const login=await post('login',{token:ADMIN},browser);assert.equal(login.status,200);
 const cookie=(login.headers.get('set-cookie')||'').match(/et_sid=([^;]+)/)![1];const c={cookie:'et_sid='+cookie};
 assert.equal((await (await get('data',c)).json()).role,'admin');
 // CSRF: a cookie-authenticated write from another origin, or with no origin evidence, is refused.
 assert.equal((await post('retriage',{},{...c,origin:'https://evil.example',host:'et.test'})).status,403);
 assert.equal((await post('retriage',{},{...c})).status,403);
 assert.equal((await post('retriage',{},{...c,...browser})).status,200);
 // Token rotation invalidates sessions issued under the old token.
 env.ADMIN_TOKEN='B'.repeat(40);assert.equal((await (await get('data',c)).json()).role,'public');env.ADMIN_TOKEN=ADMIN;
 assert.equal((await (await get('data',c)).json()).role,'admin');
 await post('logout',{},{...c,...browser});assert.equal((await (await get('data',c)).json()).role,'public');
 // Tampered session id or signature.
 assert.equal((await (await get('data',{cookie:'et_sid='+cookie.replace(/^./,'0')})).json()).role,'public');
 // Cross-origin login is refused (login CSRF).
 assert.equal((await post('login',{token:ADMIN},{origin:'https://evil.example',host:'et.test'})).status,403);
});
test('login brute force is rate limited and failures are audited',async()=>{
 const h={...browser,'cf-connecting-ip':'203.0.113.9'};let last=0;
 for(let i=0;i<11;i++)last=(await post('login',{token:'x'.repeat(40)},h)).status;
 assert.equal(last,429);
 assert.ok((await db.query("SELECT count(*)::int AS n FROM audit_log WHERE action='login-failed'")).rows[0].n>=10);
});
test('5. statistical endpoint: bounded input, rate limited, never stored for anonymous users',async()=>{
 assert.equal((await post('analysis',{table:Array.from({length:21},()=>[1,1]),mode:'educational'})).status,400);
 assert.equal((await post('analysis',{table:[[1e7,1],[1,1]],mode:'educational'})).status,400);
 const h={'cf-connecting-ip':'203.0.113.10'};let status=0;for(let i=0;i<31;i++)status=(await post('analysis',{table:[[5,5],[5,5]],mode:'educational'},h)).status;
 assert.equal(status,429);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM analyses')).rows[0].n,0);
});
test('subscriptions are rate limited per client',async()=>{
 const h={'cf-connecting-ip':'203.0.113.11'};let s=0;for(let i=0;i<11;i++)s=(await post('subscribe',{subscriber:crypto.randomUUID(),category:'all'},h)).status;assert.equal(s,429);
});
test('6. malformed requests fail cleanly with 4xx',async()=>{
 assert.equal((await post('analysis','{not json')).status,400);
 assert.equal((await post('analysis','x'.repeat(31000))).status,413);
 assert.equal((await post('login',{token:123},browser)).status,400);
 assert.equal((await get('notifications',{},'?subscriber=../../etc')).status,400);
});
test('11. unexpected errors reveal no internals',async()=>{
 const saved=db.query;db.query=async()=>{throw new Error('relation "secret_table" does not exist at 10.0.0.5');};
 try{const res=await get('health');const t=await res.text();assert.equal(res.status,500);assert.ok(!t.includes('secret_table')&&!t.includes('10.0.0.5'));assert.match(t,/reference [a-z0-9]+/);}finally{db.query=saved;}
});
test('10. publication requires an admin session and a same-origin request',async()=>{
 assert.equal((await post('publish-set',{public:['Witnesses']},{authorization:'Bearer '+EDITOR})).status,403);
 assert.equal((await post('publish-set',{public:['Events','Witnesses']},{authorization:'Bearer '+ADMIN,origin:'https://evil.example',host:'et.test'})).status,403);
 assert.equal((await db.query("SELECT publication FROM records WHERE id='r-wit'")).rows[0].publication,'private');
});

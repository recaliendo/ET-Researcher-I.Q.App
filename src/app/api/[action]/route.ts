import {NextResponse} from 'next/server';
import {database,audit} from '@/lib/db';
import {researchSnapshot,taskStates} from '@/lib/research';
import {principal,requireRole,createSession,revokeSession,revokeAllSessions,actor,atLeast,equal,roleFor,sameOrigin,type Principal} from '@/lib/auth';
import {shapeFeed,shapeProviders,shapeReviews} from '@/lib/contracts';
import {PublicError,clientKey,rateLimit,withConcurrency,errorReference} from '@/lib/security';
import {seedProviders,ingest,retriage} from '@/lib/ingestion';
import {POLICY_VERSION} from '@/lib/triage';
import {funnel,fingerprint} from '@/lib/funnel';
import {ask} from '@/lib/assistant';
import {hash} from '@/lib/importer';
import {contingency} from '@/lib/statistics';
import {z} from 'zod';
import {importBundle,runOrchestrator,researchProgress,adjudicateIncident,type Bundle} from '@/lib/agents/pipeline';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{action:string}>};
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
// Only validation messages, permission refusals and PublicError messages reach the caller. Anything else
// (database, network, programming errors) is logged with a reference and returned as a generic message.
const fail=(e:unknown)=>e instanceof z.ZodError?json({error:'Invalid input: '+e.issues.map(i=>`${i.path.join('.')||'body'} — ${i.message}`).join('; ')},400):e instanceof SyntaxError?json({error:'Request body must be valid JSON.'},400):e instanceof Error&&e.message==='FORBIDDEN'?json({error:'Sign in with the required role.'},403):e instanceof PublicError?json({error:e.message},e.status):json({error:`Request failed (reference ${errorReference(e)}).`},500);
export async function GET(req:Request,{params}:Context){try{
 const {action}=await params;const db=await database();const who=await principal(req,db);const role=who.role;const priv=role!=='public';
 // Aggregate counts only (no record content); the same totals are published in docs/SOURCE_LINEAGE.md.
 if(action==='health'){const c=(await db.query<Record<string,number>>("SELECT (SELECT count(*) FROM imports)::int AS imports,(SELECT count(*) FROM records)::int AS records,(SELECT count(DISTINCT collection) FROM records)::int AS collections,(SELECT count(*) FROM incidents)::int AS incidents,(SELECT count(*) FROM feed_items)::int AS feed_items,(SELECT count(*) FROM providers WHERE last_success IS NOT NULL)::int AS providers_synced")).rows[0];return json({ok:true,database:{ok:1},counts:c,time:new Date().toISOString()});}
 if(action==='data'){
  rateLimit('data',clientKey(req),120,60_000);
  await seedProviders(db);
  // Backfill items triaged under an older policy (cheap check first; retriage is idempotent).
  if((await db.query('SELECT 1 FROM feed_items WHERE policy_version IS DISTINCT FROM $1 LIMIT 1',[POLICY_VERSION])).rows.length)await retriage(db);
  const tables=await researchSnapshot(priv);
  // Public visitors see human-reviewed items plus machine-verified bibliographic leads (clearly labelled as such).
  const feed=(await db.query<{id:string;disposition:string|null}>("SELECT f.*,p.name AS publisher FROM feed_items f JOIN providers p ON p.id=f.provider_id WHERE $1 OR f.status IN ('reviewed','corrected','retracted') OR f.disposition='source-verified metadata lead' ORDER BY published_at DESC NULLS LAST LIMIT 200",[priv])).rows;
  let snapshots:unknown[]=[];
  if(priv){const stages=funnel(tables,feed);await db.query('INSERT INTO readiness_snapshots(id,fingerprint,stages) VALUES($1,$2,$3) ON CONFLICT(fingerprint) DO NOTHING',[crypto.randomUUID(),fingerprint(stages),JSON.stringify(stages.map(s=>({key:s.key,title:s.title,operational:s.operational?.value??null,evidence:s.evidence.value,of:s.evidence.of??null})))]);
   snapshots=(await db.query('SELECT fingerprint,stages,created_at FROM readiness_snapshots ORDER BY created_at DESC LIMIT 20')).rows;}
  const triageCounts=(await db.query("SELECT coalesce(disposition,'untriaged') AS disposition,count(*)::int AS n FROM feed_items GROUP BY 1 ORDER BY 2 DESC")).rows;
  // Response contract per role (src/lib/contracts.ts): every field below is gated by role at query time
  // and shaped (allow-listed) at serialization time.
  const staff=atLeast(role,'editor');
  // Research-agent progress: counts and the 2×2 for everyone; per-incident variables and failures for readers.
  const progress=await researchProgress(db,await researchSnapshot(true));
  const agents=priv?progress:{...progress,incidents:[],failures:[],jobs:[]};
  return json({role,tables,feed:shapeFeed(feed,role),snapshots,triageCounts,agents,
   providers:shapeProviders((await db.query('SELECT * FROM providers ORDER BY name')).rows,role),
   tasks:priv?(await db.query('SELECT * FROM tasks ORDER BY priority,id')).rows:[],
   imports:staff?(await db.query('SELECT * FROM imports ORDER BY filename')).rows:[],
   audit:staff?(await db.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 30')).rows:[],
   documents:priv?(await db.query('SELECT id,title,sha256 FROM documents ORDER BY title')).rows:[],
   reviews:shapeReviews((await db.query(priv?'SELECT * FROM review_decisions ORDER BY created_at DESC LIMIT 40':"SELECT r.* FROM review_decisions r JOIN feed_items f ON f.id=r.item_id WHERE r.decision IN ('corrected','retracted') AND f.status IN ('corrected','retracted') ORDER BY r.created_at DESC LIMIT 40")).rows,role),
   publication:role==='admin'?Object.fromEntries((await db.query<{collection:string;publication:string}>("SELECT collection,CASE WHEN bool_and(publication='public') THEN 'public' ELSE 'private' END AS publication FROM records GROUP BY collection")).rows.map(r=>[r.collection,r.publication])):{}});
 }
 if(action==='export'){rateLimit('export',clientKey(req),10,60_000);const tables=await researchSnapshot(priv);return new Response(JSON.stringify({exportedAt:new Date().toISOString(),scope:priv?'private authorized export':'public approved records',limitations:'v07 narrative only. RQ1 blocked. Worldwide leads overlap core cases.',tables},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="et-research-export.json"','Cache-Control':'no-store'}});}
 if(action==='document'){
  const url=new URL(req.url),id=url.searchParams.get('id'),chunk=url.searchParams.get('chunk');
  const row=chunk?(await db.query<{content:string}>("SELECT c.content FROM chunks c JOIN documents d ON c.document_id=d.id WHERE c.id=$1 AND ($2 OR d.publication='public')",[chunk,priv])).rows[0]:(await db.query<{content:string}>("SELECT content FROM documents WHERE id=$1 AND ($2 OR publication='public')",[id,priv])).rows[0];
  return row?new Response(row.content,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):json({error:'Document unavailable'},404);
 }
 if(action==='notifications'){rateLimit('notifications',clientKey(req),60,60_000);const subscriber=new URL(req.url).searchParams.get('subscriber');if(!subscriber||!/^[0-9a-f-]{36}$/i.test(subscriber))throw new PublicError('Missing subscription key');return json((await db.query('SELECT n.*,f.canonical_url FROM notifications n JOIN subscriptions s ON s.id=n.subscription_id JOIN feed_items f ON f.id=n.item_id WHERE s.subscriber_hash=$1 ORDER BY n.created_at DESC',[hash(subscriber)])).rows);}
 return json({error:'Not found'},404);
 }catch(e){return fail(e);}}
export async function POST(req:Request,{params}:Context){try{
 const {action}=await params;const limit=action==='agents-import'?4_000_000:30000;
 if(Number(req.headers.get('content-length')||0)>limit)throw new PublicError('Request too large',413);
 const raw=await req.text();if(raw.length>limit)throw new PublicError('Request too large',413);const body=raw?JSON.parse(raw):{};const db=await database();
 const who:Principal=await principal(req,db);const ip=clientKey(req);
 if(action==='login'){
  // Login CSRF and brute force: same-origin only; 10 attempts per 15 minutes per client, 100 overall.
  if(!sameOrigin(req))throw new Error('FORBIDDEN');rateLimit('login',ip,10,15*60_000);rateLimit('login-all','global',100,15*60_000);
  const b=z.object({token:z.string().min(32).max(256)}).parse(body);const role=roleFor(new Request(req.url,{headers:{authorization:'Bearer '+b.token}}));
  if(role==='public'){await audit(db,'anonymous','login-failed','session',{client:ip});throw new Error('FORBIDDEN');}
  const s=await createSession(db,role,ip);await audit(db,`${role}:${s.sid.slice(0,8)}`,'login','session',{client:ip});
  const res=json({role});const secure=new URL(req.url).protocol==='https:'||process.env.NODE_ENV==='production';
  res.cookies.set('et_sid',s.value,{httpOnly:true,secure,sameSite:'strict',path:'/',maxAge:s.maxAge});res.cookies.delete('et_session');return res;}
 if(action==='logout'){await revokeSession(db,who.session);if(who.session)await audit(db,actor(who),'logout','session',{});const res=json({ok:true});res.cookies.delete('et_sid');res.cookies.delete('et_session');return res;}
 if(action==='revoke-sessions'){requireRole(req,'admin',who);const n=await revokeAllSessions(db);await audit(db,actor(who),'revoke-all-sessions','sessions',{revoked:n});const res=json({ok:true,revoked:n});res.cookies.delete('et_sid');return res;}
 if(action==='ingest'){requireRole(req,'admin',who);rateLimit('ingest',ip,6,60*60_000);return json(await ingest(db));}
 if(action==='retriage'){requireRole(req,'admin',who);rateLimit('retriage',ip,6,60*60_000);return json(await retriage(db,true));}
 if(action==='cron'){const token=process.env.CRON_TOKEN;rateLimit('cron','global',30,60*60_000);if(!token||token.length<32||!equal(req.headers.get('authorization')||'','Bearer '+token))throw new Error('FORBIDDEN');return json(await ingest(db));}
 if(action==='ask'){requireRole(req,'reader',who);rateLimit('ask',who.session||ip,20,60_000);const b=z.object({question:z.string().min(3).max(1000)}).parse(body);return json(await withConcurrency('ask',4,()=>ask(b.question,true)));}
 if(action==='analysis'){
  // Anonymous use is a cheap in-process calculation, rate limited and never stored. The remote analytics
  // service (bootstrap, power) and persistence are for signed-in researchers, with bounded concurrency.
  rateLimit('analysis',ip,30,60_000);
  const b=z.object({table:z.array(z.array(z.number().int().min(0).max(1e6)).length(2)).min(2).max(20),mode:z.enum(['secondary','educational']),bootstrap:z.number().int().min(100).max(20000).optional(),effect:z.number().positive().max(1).optional(),power:z.number().gt(.5).lt(1).optional()}).parse(body);
  if(b.table.flat().reduce((a,v)=>a+v,0)>5e6)throw new PublicError('Table total exceeds 5,000,000.');
  if(process.env.ANALYTICS_URL&&atLeast(who.role,'reader')){requireRole(req,'reader',who);return json(await withConcurrency('analytics',2,async()=>{const res=await fetch(process.env.ANALYTICS_URL+'/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(process.env.ANALYTICS_TOKEN||'')},body:JSON.stringify(b),signal:AbortSignal.timeout(30000)});if(!res.ok)throw new PublicError('Analytical service rejected the request',502);const result=await res.json();await db.query('INSERT INTO analyses(id,kind,inputs,outputs) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),b.mode,JSON.stringify(b),JSON.stringify(result)]);return result;}));}
  return json({...contingency(b.table),warning:'TypeScript Pearson calculation (not stored). Bootstrap intervals and power run only for signed-in researchers when the analytics service is connected.'});
 }
 if(action==='task'){requireRole(req,'editor',who);const role=actor(who);const b=z.object({id:z.string().max(100),state:z.enum(taskStates)}).parse(body);await db.transaction(async tx=>{const before=(await tx.query('SELECT state FROM tasks WHERE id=$1',[b.id])).rows[0];if(!before)throw new PublicError('Task not found',404);await tx.query('UPDATE tasks SET state=$2,updated_at=now() WHERE id=$1',[b.id,b.state]);await audit(tx,role,'task-transition',b.id,{before,after:b.state});});return json({ok:true});}
 if(action==='review'){requireRole(req,'editor',who);const role=actor(who);const b=z.object({id:z.string().max(100),decision:z.enum(['reviewed','rejected','corrected','retracted']),rationale:z.string().min(20).max(4000)}).parse(body);
  await db.transaction(async tx=>{const item=(await tx.query<{title:string;category:string}>('SELECT title,category FROM feed_items WHERE id=$1',[b.id])).rows[0];if(!item)throw new PublicError('Item not found',404);await tx.query('INSERT INTO review_decisions(id,item_id,actor,decision,rationale) VALUES($1,$2,$3,$4,$5)',[crypto.randomUUID(),b.id,role,b.decision,b.rationale]);await tx.query('UPDATE feed_items SET status=$2,policy_version=NULL WHERE id=$1',[b.id,b.decision]);await audit(tx,role,'review',b.id,b);
   const subs=(await tx.query<{id:string}>('SELECT id FROM subscriptions WHERE category=$1 OR category=$2',[item.category,'all'])).rows;
   for(const s of subs)await tx.query('INSERT INTO notifications(id,subscription_id,item_id,message) VALUES($1,$2,$3,$4) ON CONFLICT(subscription_id,item_id) DO UPDATE SET message=excluded.message,created_at=now()',[crypto.randomUUID(),s.id,b.id,`${b.decision}: ${item.title}. ${b.rationale}`]);});await retriage(db);return json({ok:true});
 }
 if(action==='provider'){requireRole(req,'admin',who);const b=z.object({id:z.string(),enabled:z.boolean(),cadence:z.number().int().min(60).max(10080)}).parse(body);await db.query('UPDATE providers SET enabled=$2,cadence_minutes=$3 WHERE id=$1',[b.id,b.enabled,b.cadence]);await audit(db,actor(who),'provider-config',b.id,b);return json({ok:true});}
 if(action==='publish'){requireRole(req,'admin',who);const role=actor(who);const b=z.object({collection:z.string().regex(/^[A-Za-z0-9_]{1,80}$/),publication:z.enum(['public','private'])}).parse(body);await db.transaction(async tx=>{const r=await tx.query('UPDATE records SET publication=$2 WHERE collection=$1 RETURNING id',[b.collection,b.publication]);if(!r.rows.length)throw new PublicError('Collection not found',404);await audit(tx,role,'publication-change',b.collection,{...b,records:r.rows.length});});return json({ok:true});}
 if(action==='publish-set'){requireRole(req,'admin',who);const role=actor(who);const b=z.object({public:z.array(z.string().regex(/^[A-Za-z0-9_]{1,80}$/)).max(200),expected:z.array(z.string()).max(200).optional()}).parse(body);
  const result=await db.transaction(async tx=>{const known=new Set((await tx.query<{collection:string}>('SELECT DISTINCT collection FROM records')).rows.map(r=>r.collection));const unknown=b.public.filter(c=>!known.has(c));if(unknown.length)throw new PublicError('Unknown collection: '+unknown.join(', '));
   const before=(await tx.query<{collection:string}>("SELECT DISTINCT collection FROM records WHERE publication='public' ORDER BY 1")).rows.map(r=>r.collection);
   // Optimistic concurrency: refuse to overwrite a change made after this page was loaded.
   if(b.expected&&[...b.expected].sort().join('|')!==before.join('|'))throw new PublicError('The public set changed since this page was loaded (another browser or tab saved first). Reload the page and review again.');
   await tx.query("UPDATE records SET publication=CASE WHEN collection = ANY($1::text[]) THEN 'public' ELSE 'private' END",[b.public]);
   await audit(tx,role,'publication-set','records',{before,after:[...b.public].sort()});return {public:b.public.length};});
  return json({ok:true,...result});}
 // Agent pipeline (Amendment A1). Importing and running are admin actions; agents themselves cannot call these.
 if(action==='agents-import'){requireRole(req,'admin',who);rateLimit('agents-import',ip,10,60*60_000);
  const b=z.object({runs:z.array(z.any()).max(50),sources:z.array(z.any()).max(500),assessments:z.array(z.any()).max(2000)}).parse(body) as unknown as Bundle;
  const counts=await importBundle(db,b,actor(who));const out=await runOrchestrator(db,await researchSnapshot(true));return json({ok:true,counts,adjudicated:out});}
 if(action==='agents-run'){requireRole(req,'admin',who);rateLimit('agents-run',ip,20,60*60_000);return json({ok:true,results:await runOrchestrator(db,await researchSnapshot(true))});}
 // Human validation is the only route to confirmatory eligibility. Each signed-in reviewer session counts once.
 if(action==='human-validate'){requireRole(req,'editor',who);const b=z.object({incident:z.string().regex(/^E\d{3}$/),decision:z.enum(['validated','rejected']),rationale:z.string().min(30).max(4000)}).parse(body);
  await db.query('INSERT INTO human_validations(id,incident_id,actor,decision,rationale) VALUES($1,$2,$3,$4,$5) ON CONFLICT(incident_id,actor) DO UPDATE SET decision=excluded.decision,rationale=excluded.rationale,created_at=now()',[crypto.randomUUID(),b.incident,actor(who),b.decision,b.rationale]);
  await audit(db,actor(who),'human-validate',b.incident,{decision:b.decision});const r=await adjudicateIncident(db,await researchSnapshot(true),b.incident);return json({ok:true,state:r.state});}
 if(action==='subscribe'){rateLimit('subscribe',ip,10,60*60_000);if(Number((await db.query<{n:number}>('SELECT count(*)::int AS n FROM subscriptions')).rows[0].n)>=50000)throw new PublicError('Subscriptions are temporarily unavailable.',503);const b=z.object({subscriber:z.string().uuid(),category:z.enum(['all','official reports','hearings','physical evidence','corrections'])}).parse(body);await db.query('INSERT INTO subscriptions(id,subscriber_hash,category) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[crypto.randomUUID(),hash(b.subscriber),b.category]);return json({ok:true,delivery:'In-app notification inbox. No email delivery configured.'});}
 return json({error:'Not found'},404);
 }catch(e){return fail(e);}}

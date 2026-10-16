import {NextResponse} from 'next/server';
import {database,audit} from '@/lib/db';
import {researchSnapshot,taskStates} from '@/lib/research';
import {roleFor,requireRole,sessionCookie} from '@/lib/auth';
import {seedProviders,ingest} from '@/lib/ingestion';
import {ask} from '@/lib/assistant';
import {hash} from '@/lib/importer';
import {contingency} from '@/lib/statistics';
import {z} from 'zod';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{action:string}>};
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>e instanceof z.ZodError?json({error:'Invalid input: '+e.issues.map(i=>`${i.path.join('.')||'body'} — ${i.message}`).join('; ')},400):e instanceof SyntaxError?json({error:'Request body must be valid JSON.'},400):json({error:e instanceof Error?(e.message==='FORBIDDEN'?'Sign in with the required role.':e.message):'Request failed'},e instanceof Error&&e.message==='FORBIDDEN'?403:400);
export async function GET(req:Request,{params}:Context){try{
 const {action}=await params;const db=await database();const role=roleFor(req);const priv=role!=='public';
 // Aggregate counts only (no record content); the same totals are published in docs/SOURCE_LINEAGE.md.
 if(action==='health'){const c=(await db.query<Record<string,number>>("SELECT (SELECT count(*) FROM imports)::int AS imports,(SELECT count(*) FROM records)::int AS records,(SELECT count(DISTINCT collection) FROM records)::int AS collections,(SELECT count(*) FROM incidents)::int AS incidents,(SELECT count(*) FROM feed_items)::int AS feed_items,(SELECT count(*) FROM providers WHERE last_success IS NOT NULL)::int AS providers_synced")).rows[0];return json({ok:true,database:{ok:1},counts:c,time:new Date().toISOString()});}
 if(action==='data'){
  await seedProviders(db);return json({role,tables:await researchSnapshot(priv),feed:(await db.query("SELECT f.*,p.name AS publisher FROM feed_items f JOIN providers p ON p.id=f.provider_id WHERE $1 OR f.status IN ('reviewed','corrected','retracted') ORDER BY published_at DESC NULLS LAST LIMIT 200",[priv])).rows,
   providers:(await db.query('SELECT * FROM providers ORDER BY name')).rows,
   tasks:priv?(await db.query('SELECT * FROM tasks ORDER BY priority,id')).rows:[],
   imports:priv?(await db.query('SELECT * FROM imports ORDER BY filename')).rows:[],
   audit:priv?(await db.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 30')).rows:[],
   documents:priv?(await db.query('SELECT id,title,sha256 FROM documents ORDER BY title')).rows:[],
   reviews:(await db.query('SELECT * FROM review_decisions ORDER BY created_at DESC LIMIT 40')).rows,
   publication:priv?Object.fromEntries((await db.query<{collection:string;publication:string}>("SELECT collection,CASE WHEN bool_and(publication='public') THEN 'public' ELSE 'private' END AS publication FROM records GROUP BY collection")).rows.map(r=>[r.collection,r.publication])):{}});
 }
 if(action==='export'){const tables=await researchSnapshot(priv);return new Response(JSON.stringify({exportedAt:new Date().toISOString(),scope:priv?'private authorized export':'public approved records',limitations:'v07 narrative only. RQ1 blocked. Worldwide leads overlap core cases.',tables},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="et-research-export.json"','Cache-Control':'no-store'}});}
 if(action==='document'){
  const url=new URL(req.url),id=url.searchParams.get('id'),chunk=url.searchParams.get('chunk');
  const row=chunk?(await db.query<{content:string}>("SELECT c.content FROM chunks c JOIN documents d ON c.document_id=d.id WHERE c.id=$1 AND ($2 OR d.publication='public')",[chunk,priv])).rows[0]:(await db.query<{content:string}>("SELECT content FROM documents WHERE id=$1 AND ($2 OR publication='public')",[id,priv])).rows[0];
  return row?new Response(row.content,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):json({error:'Document unavailable'},404);
 }
 if(action==='notifications'){const subscriber=new URL(req.url).searchParams.get('subscriber');if(!subscriber||subscriber.length<32)throw new Error('Missing subscription key');return json((await db.query('SELECT n.*,f.canonical_url FROM notifications n JOIN subscriptions s ON s.id=n.subscription_id JOIN feed_items f ON f.id=n.item_id WHERE s.subscriber_hash=$1 ORDER BY n.created_at DESC',[hash(subscriber)])).rows);}
 return json({error:'Not found'},404);
 }catch(e){return fail(e);}}
export async function POST(req:Request,{params}:Context){try{
 const {action}=await params;if(Number(req.headers.get('content-length')||0)>30000)throw new Error('Request too large');
 const raw=await req.text();if(raw.length>30000)throw new Error('Request too large');const body=raw?JSON.parse(raw):{};const db=await database();
 if(action==='login'){const b=z.object({token:z.string().min(32).max(256)}).parse(body);const test=new Request(req.url,{headers:{authorization:'Bearer '+b.token}});const role=roleFor(test);if(role==='public')throw new Error('FORBIDDEN');const res=json({role});res.cookies.set('et_session',sessionCookie(role),{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:28800});return res;}
 if(action==='logout'){const res=json({ok:true});res.cookies.delete('et_session');return res;}
 if(action==='ingest'){requireRole(req,'admin');return json(await ingest(db));}
 if(action==='cron'){const token=process.env.CRON_TOKEN;if(!token||token.length<32||req.headers.get('authorization')!=='Bearer '+token)throw new Error('FORBIDDEN');return json(await ingest(db));}
 if(action==='ask'){requireRole(req,'reader');const b=z.object({question:z.string().min(3).max(1000)}).parse(body);return json(await ask(b.question,true));}
 if(action==='analysis'){
  const b=z.object({table:z.array(z.array(z.number().int().min(0).max(1e7)).length(2)).min(2).max(100),mode:z.enum(['secondary','educational']),bootstrap:z.number().int().min(100).max(20000).optional(),effect:z.number().positive().max(1).optional(),power:z.number().gt(.5).lt(1).optional()}).parse(body);
  if(process.env.ANALYTICS_URL){const res=await fetch(process.env.ANALYTICS_URL+'/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(process.env.ANALYTICS_TOKEN||'')},body:JSON.stringify(b),signal:AbortSignal.timeout(30000)});if(!res.ok)throw new Error('Analytical service rejected the request');const result=await res.json();await db.query('INSERT INTO analyses(id,kind,inputs,outputs) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),b.mode,JSON.stringify(b),JSON.stringify(result)]);return json(result);}
  return json({...contingency(b.table),warning:'TypeScript Pearson calculation. Python service not connected: Fisher, bootstrap intervals and power unavailable.'});
 }
 if(action==='task'){const role=requireRole(req,'editor');const b=z.object({id:z.string().max(100),state:z.enum(taskStates)}).parse(body);await db.transaction(async tx=>{const before=(await tx.query('SELECT state FROM tasks WHERE id=$1',[b.id])).rows[0];if(!before)throw new Error('Task not found');await tx.query('UPDATE tasks SET state=$2,updated_at=now() WHERE id=$1',[b.id,b.state]);await audit(tx,role,'task-transition',b.id,{before,after:b.state});});return json({ok:true});}
 if(action==='review'){const role=requireRole(req,'editor');const b=z.object({id:z.string().max(100),decision:z.enum(['reviewed','rejected','corrected','retracted']),rationale:z.string().min(20).max(4000)}).parse(body);
  await db.transaction(async tx=>{const item=(await tx.query<{title:string;category:string}>('SELECT title,category FROM feed_items WHERE id=$1',[b.id])).rows[0];if(!item)throw new Error('Item not found');await tx.query('INSERT INTO review_decisions(id,item_id,actor,decision,rationale) VALUES($1,$2,$3,$4,$5)',[crypto.randomUUID(),b.id,role,b.decision,b.rationale]);await tx.query('UPDATE feed_items SET status=$2 WHERE id=$1',[b.id,b.decision]);await audit(tx,role,'review',b.id,b);
   const subs=(await tx.query<{id:string}>('SELECT id FROM subscriptions WHERE category=$1 OR category=$2',[item.category,'all'])).rows;
   for(const s of subs)await tx.query('INSERT INTO notifications(id,subscription_id,item_id,message) VALUES($1,$2,$3,$4) ON CONFLICT(subscription_id,item_id) DO UPDATE SET message=excluded.message,created_at=now()',[crypto.randomUUID(),s.id,b.id,`${b.decision}: ${item.title}. ${b.rationale}`]);});return json({ok:true});
 }
 if(action==='provider'){requireRole(req,'admin');const b=z.object({id:z.string(),enabled:z.boolean(),cadence:z.number().int().min(60).max(10080)}).parse(body);await db.query('UPDATE providers SET enabled=$2,cadence_minutes=$3 WHERE id=$1',[b.id,b.enabled,b.cadence]);await audit(db,'admin','provider-config',b.id,b);return json({ok:true});}
 if(action==='publish'){const role=requireRole(req,'admin');const b=z.object({collection:z.string().regex(/^[A-Za-z0-9_]{1,80}$/),publication:z.enum(['public','private'])}).parse(body);await db.transaction(async tx=>{const r=await tx.query('UPDATE records SET publication=$2 WHERE collection=$1 RETURNING id',[b.collection,b.publication]);if(!r.rows.length)throw new Error('Collection not found');await audit(tx,role,'publication-change',b.collection,{...b,records:r.rows.length});});return json({ok:true});}
 if(action==='publish-set'){const role=requireRole(req,'admin');const b=z.object({public:z.array(z.string().regex(/^[A-Za-z0-9_]{1,80}$/)).max(200)}).parse(body);
  const result=await db.transaction(async tx=>{const known=new Set((await tx.query<{collection:string}>('SELECT DISTINCT collection FROM records')).rows.map(r=>r.collection));const unknown=b.public.filter(c=>!known.has(c));if(unknown.length)throw new Error('Unknown collection: '+unknown.join(', '));
   const before=(await tx.query<{collection:string}>("SELECT DISTINCT collection FROM records WHERE publication='public' ORDER BY 1")).rows.map(r=>r.collection);
   await tx.query("UPDATE records SET publication=CASE WHEN collection = ANY($1::text[]) THEN 'public' ELSE 'private' END",[b.public]);
   await audit(tx,role,'publication-set','records',{before,after:[...b.public].sort()});return {public:b.public.length};});
  return json({ok:true,...result});}
 if(action==='subscribe'){const b=z.object({subscriber:z.string().uuid(),category:z.enum(['all','official reports','hearings','physical evidence','corrections'])}).parse(body);await db.query('INSERT INTO subscriptions(id,subscriber_hash,category) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[crypto.randomUUID(),hash(b.subscriber),b.category]);return json({ok:true,delivery:'In-app notification inbox. No email delivery configured.'});}
 return json({error:'Not found'},404);
 }catch(e){return fail(e);}}

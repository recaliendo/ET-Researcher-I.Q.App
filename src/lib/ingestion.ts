import { XMLParser } from 'fast-xml-parser';
import { Database,audit } from './db';
import { hash } from './importer';
import { triage,POLICY_VERSION } from './triage';
export type Provider={id:string;name:string;url:string;kind:string;cadence_minutes:number;last_success?:string;last_error?:string;failures:number;etag?:string;modified?:string;enabled:boolean;next_attempt?:string;policy_url:string;license_note:string};
export const providerSeeds=[
 {id:'nasa',name:'NASA · science & official releases',url:'https://www.nasa.gov/feed/',kind:'rss',cadence:360,policy:'https://www.nasa.gov/rss-feeds/'},
 {id:'arxiv',name:'arXiv · UAP research',url:'https://export.arxiv.org/api/query?search_query=all:%22unidentified%20anomalous%22%20OR%20all:%22unidentified%20aerial%22&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending',kind:'atom',cadence:1440,policy:'https://info.arxiv.org/help/api/user-manual.html'},
 {id:'crossref',name:'Crossref · scholarly metadata',url:'https://api.crossref.org/works?query.bibliographic=%22unidentified+anomalous+phenomena%22+UAP+UFO&filter=from-pub-date:2021-01-01&rows=30&sort=relevance',kind:'crossref',cadence:1440,policy:'https://www.crossref.org/documentation/retrieve-metadata/rest-api/'},
 {id:'europepmc',name:'Europe PMC · peer-reviewed literature',url:'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=%22unidentified%20anomalous%20phenomena%22%20OR%20%22unidentified%20aerial%20phenomena%22%20OR%20%22unidentified%20flying%20objects%22&format=json&pageSize=25&sort=P_PDATE_D%20desc',kind:'europepmc',cadence:1440,policy:'https://europepmc.org/RestfulWebService'},
 {id:'federalregister',name:'Federal Register · official U.S. notices',url:'https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=%22unidentified+anomalous+phenomena%22&order=newest&per_page=20',kind:'federalregister',cadence:720,policy:'https://www.federalregister.gov/developers/documentation/api/v1',queryMatched:true},
 {id:'govinfo',name:'GovInfo · congressional hearings',url:'https://www.govinfo.gov/rss/chrg.xml',kind:'rss',cadence:360,policy:'https://www.govinfo.gov/feeds'}
];
// Provider URLs are code-owned allowlist entries; seeding refreshes them so a query fix reaches existing databases.
export async function seedProviders(db:Database){for(const p of providerSeeds)await db.query('INSERT INTO providers(id,name,url,kind,cadence_minutes,policy_url,license_note) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,url=excluded.url,kind=excluded.kind,policy_url=excluded.policy_url,next_attempt=CASE WHEN providers.url<>excluded.url THEN NULL ELSE providers.next_attempt END',[p.id,p.name,p.url,p.kind,p.cadence,p.policy,'Metadata and original links only. Source-specific rights retained; full text not republished.']);}
export const plain=(s:unknown)=>String(typeof s==='object'&&s!==null?('#text' in s?(s as Record<string,unknown>)['#text']:''):s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function canonicalUrl(raw:string){try{const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);return u.toString();}catch{return null;}}
type Item={title:string;url:string;date:string|null;publisher?:string;type?:string};
const validDate=(s:unknown)=>{const t=Date.parse(String(s));return Number.isFinite(t)?new Date(t).toISOString():null;};
export function parseFeed(body:string,kind:string):Item[]{
 if(body.length>4_000_000)throw new Error('Feed exceeds safe size limit');
 if(kind==='europepmc'){
   const data=JSON.parse(body);return (data.resultList?.result||[]).map((r:Record<string,any>)=>({title:plain(r.title),url:r.doi?`https://doi.org/${r.doi}`:`https://europepmc.org/article/${r.source}/${r.id}`,date:validDate(r.firstPublicationDate),publisher:plain(r.journalTitle||r.bookOrReportDetails?.publisher||'Europe PMC'),type:r.pubType}));
 }
 if(kind==='federalregister'){
   const data=JSON.parse(body);return (data.results||[]).map((r:Record<string,any>)=>({title:plain(r.title),url:r.html_url,date:validDate(r.publication_date),publisher:plain(r.agencies?.map((a:Record<string,string>)=>a.name).filter(Boolean).join('; ')||'Federal Register'),type:r.type}));
 }
 if(kind==='crossref'){
   const data=JSON.parse(body);return (data.message?.items||[]).map((r:Record<string,any>)=>{
     const parts=r.published?.['date-parts']?.[0];return {title:plain(r.title?.[0]),url:r.URL,date:parts?.[0]?new Date(Date.UTC(parts[0],(parts[1]||1)-1,parts[2]||1)).toISOString():null,publisher:plain(r.publisher),type:r.type};
   });
 }
 if(/<!DOCTYPE|<!ENTITY/i.test(body))throw new Error('XML entities are prohibited');
 const xml=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(body);
 if(!xml.rss && !xml.feed)throw new Error('Response is not RSS or Atom');
 const raw=xml.rss?.channel?.item||xml.feed?.entry||[];const rows=Array.isArray(raw)?raw:[raw];
 return rows.map((r:any)=>{const links:any[]=Array.isArray(r.link)?r.link:[r.link];const link=links.find((l:any)=>typeof l==='string'||l?.['@_rel']==='alternate')||links[0];return {title:plain(r.title),url:typeof link==='string'?link:link?.['@_href']||r.id,date:validDate(r.pubDate||r.published||r.updated)};});
}
export const relevant=(title:string)=>/\buap\b|\bufo\b|unidentified (aerial|anomalous|flying)|extraterrestrial|biosignature|astrobiology|atmospher|meteor|sensor|skywatch|life.detect/i.test(title);
export function categoryFor(title:string,id:string){return /retract|correction|erratum/i.test(title)?'corrections':id==='govinfo'||/hearing/i.test(title)?'hearings':/testimony|whistleblow/i.test(title)?'testimony':/material|isotop|alloy|specimen/i.test(title)?'physical evidence':/sighting/i.test(title)?'sightings':id==='nasa'||id==='federalregister'?'official reports':'scientific findings';}
async function boundedFetch(p:Provider){
 const allowed=providerSeeds.find(s=>s.id===p.id);if(!allowed||p.url!==allowed.url)throw new Error('Provider URL not allowlisted');
 const res=await fetch(p.url,{headers:{'User-Agent':'ETResearcherIQ/0.1 (+https://github.com/recaliendo/ET-Researcher-I.Q.App)',...(p.etag?{'If-None-Match':p.etag}:{}),...(p.modified?{'If-Modified-Since':p.modified}:{})},signal:AbortSignal.timeout(25000),redirect:'error'});
 if(res.status===304)return {res,body:''};if(!res.ok)throw new Error(`HTTP ${res.status}`);
 const reader=res.body?.getReader();if(!reader)throw new Error('Empty response');let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4_000_000){await reader.cancel();throw new Error('Feed exceeds safe size limit');}chunks.push(value);}
 return {res,body:Buffer.concat(chunks).toString('utf8')};
}
export async function storeItems(db:Database,p:Provider,items:Item[],retrievalId:string){
 let added=0;const cases=(await db.query<{id:string;title:string}>('SELECT id,title FROM incidents')).rows;
 for(const item of items){
  const url=canonicalUrl(item.url);const queryMatched=!!providerSeeds.find(s=>s.id===p.id&&'queryMatched' in s);if(!url||!item.title||(!queryMatched&&!relevant(item.title))||item.title.length>1500)continue;
  const contentHash=hash(JSON.stringify(item));const id=hash(url);const existing=(await db.query<{content_hash:string}>('SELECT content_hash FROM feed_items WHERE id=$1',[id])).rows[0];
  if(existing?.content_hash===contentHash)continue;
  const associations=cases.filter(c=>{const word=c.title.split(/[ ,–-]/)[0];return word.length>4&&item.title.toLowerCase().includes(word.toLowerCase());}).map(c=>({id:c.id,status:'Suggested name match; analyst review required'}));
  const repeat=(await db.query('SELECT id FROM feed_items WHERE lower(title)=lower($1) LIMIT 1',[item.title])).rows.length>0;
  const novelty=existing?'Publisher metadata changed; review reset':repeat?'Matching headline already ingested; possible repeated report':'New to this feed. Originality and independence not yet assessed.';
  await db.query(`INSERT INTO feed_items(id,provider_id,canonical_url,title,published_at,content_hash,metadata,category,summary,summary_method,novelty,significance,incident_ids)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
   ON CONFLICT(id) DO UPDATE SET title=excluded.title,published_at=excluded.published_at,content_hash=excluded.content_hash,metadata=excluded.metadata,status='pending',novelty=excluded.novelty,summary=excluded.summary,policy_version=NULL`,
   [id,p.id,url,item.title,item.date,contentHash,JSON.stringify(item),categoryFor(item.title,p.id),`${item.publisher||p.name} lists “${item.title}”${item.type?` (${item.type})`:''}. ${queryMatched?'Matched by the provider’s own full-text search; the title may not name UAP. ':''}Metadata discovery only; underlying evidence has not been adjudicated.`,'Deterministic metadata summary (not AI)',novelty,'Potential research lead; retrieve the original document and compare provenance before drawing conclusions.',JSON.stringify(associations)]);
  await db.query('INSERT INTO feed_versions(id,item_id,retrieval_id,content_hash,metadata) VALUES($1,$2,$3,$4,$5)',[crypto.randomUUID(),id,retrievalId,contentHash,JSON.stringify(item)]);
  if(!existing)added++;
 }return added;
}
// Apply the current triage policy to every item whose stored policy is older (or missing). Idempotent.
// The earliest item with the same title and publication day is the original; later ones are possible duplicates.
// (Title alone is not enough: generic notices such as "Comment Request" share titles across distinct documents.)
export async function retriage(db:Database,force=false){
 const rows=(await db.query<{id:string;provider_id:string;canonical_url:string;title:string;published_at:string|Date|null;metadata:Record<string,string>;status:string;incident_ids:unknown[];policy_version:string|null}>('SELECT id,provider_id,canonical_url,title,published_at,metadata,status,incident_ids,policy_version FROM feed_items ORDER BY ingested_at,id')).rows;
 const first=new Map<string,string>();let changed=0;const tally:Record<string,number>={};
 for(const r of rows){
  const key=r.title.toLowerCase().replace(/\s+/g,' ').trim()+'|'+(r.published_at?new Date(r.published_at).toISOString().slice(0,10):'undated');const dup=first.get(key)??null;if(!dup)first.set(key,r.id);
  if(!force&&r.policy_version===POLICY_VERSION)continue;
  const t=triage({provider:r.provider_id,url:r.canonical_url,title:r.title,published_at:r.published_at?new Date(r.published_at).toISOString():null,publisher:r.metadata?.publisher,type:r.metadata?.type,duplicateOf:dup,caseSuggestions:Array.isArray(r.incident_ids)?r.incident_ids.length:0,status:r.status});
  await db.query('UPDATE feed_items SET workflow_state=$2,disposition=$3,topic=$4,triage=$5,policy_version=$6 WHERE id=$1',[r.id,t.state,t.disposition,t.topic,JSON.stringify(t),POLICY_VERSION]);
  changed++;tally[t.disposition]=(tally[t.disposition]||0)+1;
 }
 if(changed)await audit(db,'triage-policy','retriage','feed_items',{policy:POLICY_VERSION,changed,tally});
 return {policy:POLICY_VERSION,changed,tally};
}
export async function ingest(db:Database,fetcher=boundedFetch){
 await seedProviders(db);
 const lease=await db.query("INSERT INTO job_leases(id,expires_at) VALUES('ingestion',now()+interval '10 minutes') ON CONFLICT(id) DO UPDATE SET expires_at=excluded.expires_at WHERE job_leases.expires_at<now() RETURNING id");
 if(!lease.rows.length)return {busy:true,results:[]};
 const results=[];
 try{
 const providers=(await db.query<Provider>('SELECT * FROM providers WHERE enabled AND (next_attempt IS NULL OR next_attempt<=now()) ORDER BY id')).rows;
 for(const p of providers){const rid=crypto.randomUUID();try{
  await db.query('UPDATE providers SET last_attempt=now() WHERE id=$1',[p.id]);const {res,body}=await fetcher(p);
  const items=res.status===304?[]:parseFeed(body,p.kind);
  await db.transaction(async tx=>{
   await tx.query('INSERT INTO retrievals(id,provider_id,status,sha256,item_count) VALUES($1,$2,$3,$4,$5)',[rid,p.id,res.status,hash(body),items.length]);
   const added=await storeItems(tx,p,items,rid);
   await tx.query("UPDATE providers SET last_success=now(),next_attempt=now()+($2 * interval '1 minute'),failures=0,last_error=NULL,etag=$3,modified=$4 WHERE id=$1",[p.id,p.cadence_minutes,res.headers.get('etag'),res.headers.get('last-modified')]);
   results.push({provider:p.id,status:'success',received:items.length,added});
  });
 }catch(e){const message=e instanceof Error?e.message:'Unknown retrieval error';await db.query('INSERT INTO retrievals(id,provider_id,error) VALUES($1,$2,$3)',[rid,p.id,message]);
  await db.query("UPDATE providers SET failures=failures+1,last_error=$2,next_attempt=now()+($3 * interval '1 minute') WHERE id=$1",[p.id,message,Math.min(1440,60*2**p.failures)]);results.push({provider:p.id,status:'failed',error:message});
 }}await retriage(db);await audit(db,'scheduler','ingest','providers',results);
 }finally{await db.query("DELETE FROM job_leases WHERE id='ingestion'");}return {busy:false,results};
}

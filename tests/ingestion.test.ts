import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connect} from '../src/lib/db';
import {parseFeed,canonicalUrl,relevant,categoryFor,ingest,providerSeeds,type Provider} from '../src/lib/ingestion';

const rss=`<?xml version="1.0"?><rss><channel><item><title>UAP hearing &amp; records</title><link>https://example.gov/a?utm_source=x</link><pubDate>Tue, 10 Sep 2024 12:00:00 GMT</pubDate></item><item><title>Unrelated budget notice</title><link>https://example.gov/b</link></item></channel></rss>`;
const atom=`<feed><entry><title>Unidentified anomalous phenomena survey</title><link rel="alternate" href="https://arxiv.org/abs/1"/><published>2025-01-01T00:00:00Z</published></entry></feed>`;
const crossref=JSON.stringify({message:{items:[{title:['UFO reports and perception'],URL:'https://doi.org/10.1/x',published:{'date-parts':[[2024,5]]},publisher:'Pub'}]}});
const epmc=JSON.stringify({resultList:{result:[{title:'Psychological aspects in UAP witnesses',doi:'10.2/y',firstPublicationDate:'2025-02-03',journalTitle:'J'}]}});
const fedreg=JSON.stringify({results:[{title:'Records Schedules',html_url:'https://www.federalregister.gov/d/1',publication_date:'2024-12-11',agencies:[{name:'National Archives and Records Administration'}],type:'Notice'}]});

test('parses RSS, Atom, Crossref, Europe PMC and Federal Register',()=>{
 assert.equal(parseFeed(rss,'rss').length,2);
 assert.equal(parseFeed(atom,'atom')[0].url,'https://arxiv.org/abs/1');
 assert.equal(parseFeed(crossref,'crossref')[0].date,'2024-05-01T00:00:00.000Z');
 assert.equal(parseFeed(epmc,'europepmc')[0].url,'https://doi.org/10.2/y');
 assert.equal(parseFeed(fedreg,'federalregister')[0].publisher,'National Archives and Records Administration');
});
test('rejects XML entity expansion and non-feeds',()=>{
 assert.throws(()=>parseFeed('<!DOCTYPE x [<!ENTITY a "b">]><rss/>','rss'));
 assert.throws(()=>parseFeed('<html></html>','rss'));
});
test('canonical URLs drop tracking and refuse unsafe schemes',()=>{
 assert.equal(canonicalUrl('https://a.gov/x?utm_source=1&id=2#frag'),'https://a.gov/x?id=2');
 assert.equal(canonicalUrl('javascript:alert(1)'),null);assert.equal(canonicalUrl('https://u:p@a.gov/'),null);
});
test('relevance and category rules',()=>{
 assert.ok(relevant('New UAP report'));assert.ok(!relevant('Quarterly budget'));
 assert.equal(categoryFor('Erratum: UAP study','arxiv'),'corrections');assert.equal(categoryFor('Anything','govinfo'),'hearings');
});

function fakeFetcher(bodies:Record<string,string|Error>){
 return async(p:Provider)=>{const b=bodies[p.kind];if(b instanceof Error)throw b;return {res:new Response('',{status:200,headers:{etag:'"v1"'}}),body:b??JSON.stringify({message:{items:[]},resultList:{result:[]},results:[]})};};
}
test('ingestion stores, deduplicates and tracks failures',async()=>{
 const db=await connect('memory://');
 try{
  const bodies={rss,atom,crossref,europepmc:epmc,federalregister:fedreg};
  const first=await ingest(db,fakeFetcher(bodies) as never);
  assert.equal(first.busy,false);
  const count=async()=>Number((await db.query<{n:number}>('SELECT count(*)::int AS n FROM feed_items')).rows[0].n);
  const stored=await count();assert.ok(stored>=4,`stored ${stored}`);
  // Unrelated RSS items are filtered; query-matched Federal Register items are kept even without UAP in the title.
  assert.equal((await db.query("SELECT 1 FROM feed_items WHERE title='Unrelated budget notice'")).rows.length,0);
  assert.equal((await db.query("SELECT 1 FROM feed_items WHERE title='Records Schedules'")).rows.length,1);
  // Everything new waits for analyst review and is never marked independent corroboration.
  assert.equal((await db.query("SELECT 1 FROM feed_items WHERE status<>'pending'")).rows.length,0);
  assert.equal((await db.query("SELECT 1 FROM feed_items WHERE original_source_status NOT LIKE '%not independent corroboration%'")).rows.length,0);
  // Second run: same content is not duplicated.
  await db.query('UPDATE providers SET next_attempt=NULL');
  await ingest(db,fakeFetcher(bodies) as never);
  assert.equal(await count(),stored);
  // Failure: provider records error, failure count and backoff; earlier items survive.
  await db.query('UPDATE providers SET next_attempt=NULL');
  const failed=await ingest(db,fakeFetcher({...bodies,rss:new Error('HTTP 503')}) as never);
  assert.ok(failed.results.some((r:any)=>r.status==='failed'&&r.error==='HTTP 503'));
  const rssProviders=(await db.query<{failures:number;last_error:string;next_attempt:string}>("SELECT failures,last_error,next_attempt FROM providers WHERE kind='rss'")).rows;
  for(const p of rssProviders){assert.equal(p.failures,1);assert.equal(p.last_error,'HTTP 503');assert.ok(p.next_attempt);}
  assert.equal(await count(),stored);
  assert.equal(Number((await db.query<{n:number}>('SELECT count(*)::int AS n FROM providers')).rows[0].n),providerSeeds.length);
 }finally{await db.close();}
});
test('a concurrent run is refused by the job lease',async()=>{
 const db=await connect('memory://');
 try{await db.query("INSERT INTO job_leases(id,expires_at) VALUES('ingestion',now()+interval '5 minutes')");const r=await ingest(db,fakeFetcher({}) as never);assert.equal(r.busy,true);}finally{await db.close();}
});

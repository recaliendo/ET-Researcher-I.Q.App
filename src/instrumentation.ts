// In-process ingestion scheduler. Runs once per server process; providers are only fetched when their own cadence is due,
// and the database job lease prevents overlap with the standalone worker or the /api/cron endpoint.
export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs'||process.env.ET_SCHEDULER==='off')return;
 const minutes=Math.max(5,Number(process.env.ET_SCHEDULER_MINUTES)||15);
 const {database}=await import('./lib/db');const {ingest}=await import('./lib/ingestion');
 const tick=async()=>{try{const r=await ingest(await database());if(r.results.length)console.log('[scheduler]',JSON.stringify(r.results));}catch(e){console.error('[scheduler] ingestion failed:',e instanceof Error?e.message:e);}};
 setTimeout(tick,30_000);setInterval(tick,minutes*60_000).unref();
}

// In-process ingestion scheduler (Node runtime only). Providers are fetched only when their own cadence is due,
// and the database job lease prevents overlap with the standalone worker or the /api/cron endpoint.
import {database} from './lib/db';
import {ingest} from './lib/ingestion';
export function startScheduler(){
 // Embedded PGlite allows one owner per directory and Next.js loads this module separately from the routes,
 // so the in-process scheduler runs only against PostgreSQL. Locally, use `pnpm ingest` or Operations → Run.
 if(process.env.ET_SCHEDULER==='off'||!process.env.DATABASE_URL?.startsWith('postgres'))return;
 const minutes=Math.max(5,Number(process.env.ET_SCHEDULER_MINUTES)||15);
 const tick=async()=>{try{const r=await ingest(await database());if(r.results.length)console.log('[scheduler]',JSON.stringify(r.results));}catch(e){console.error('[scheduler] ingestion failed:',e instanceof Error?e.message:e);}};
 setTimeout(tick,30_000);setInterval(tick,minutes*60_000).unref();
}

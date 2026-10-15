// One-time import into a hosted database. Prompts for the connection URL with hidden input so the
// password never appears on screen, in shell history or in this repository.
import {createInterface} from 'node:readline';
import {Writable} from 'node:stream';
import {connect} from '../src/lib/db';
import {importResearch} from '../src/lib/importer';

function askHidden(question:string){
 let muted=false;
 const out=new Writable({write(chunk,_enc,cb){if(!muted)process.stdout.write(chunk);cb();}});
 const rl=createInterface({input:process.stdin,output:out,terminal:true});
 return new Promise<string>(resolve=>{rl.question(question,answer=>{rl.close();process.stdout.write('\n');resolve(answer.trim());});muted=true;});
}

async function main(){
 const pkg=process.env.RESEARCH_PACKAGE_DIR||'./UAP_Research_Consolidated_v08';
 let url=process.env.DATABASE_URL||await askHidden('Paste the External Database URL from Render, then press Enter (input is hidden): ');
 if(!/^postgres(ql)?:\/\//.test(url))throw new Error('That does not look like a database URL. It should start with postgresql://');
 if(!/[?&]sslmode=/.test(url))url+=(url.includes('?')?'&':'?')+'sslmode=require';
 console.log('Connecting and importing… (this takes about a minute)');
 const db=await connect(url);
 try{
  const r=await importResearch(db,pkg);
  console.log(`\nSUCCESS: ${r.files} files verified, ${Object.keys(r.counts).length} tables, ${r.counts.Events} core cases, ${r.counts.Witnesses} witnesses.`);
  console.log('Now remove your IP address from the database access-control list in Render.');
 }finally{await db.close();}
}
main().catch(e=>{
 const msg=e instanceof Error?e.message:String(e);
 console.error('\nIMPORT FAILED: '+msg);
 if(/ETIMEDOUT|ECONNREFUSED|timeout|no pg_hba|not allowed/i.test(msg))console.error('Most likely cause: your IP address is not in the database access-control list yet.');
 if(/password authentication/i.test(msg))console.error('Most likely cause: the URL was copied incompletely. Copy the full External Database URL again.');
 process.exitCode=1;
});

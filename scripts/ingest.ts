import {connect} from '../src/lib/db';import {ingest} from '../src/lib/ingestion';
async function main(){const db=await connect();try{console.log(JSON.stringify(await ingest(db),null,2));}finally{await db.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});

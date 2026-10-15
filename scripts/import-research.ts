import { connect } from '../src/lib/db';
import { importResearch } from '../src/lib/importer';
async function main(){const db=await connect();try{console.log(JSON.stringify(await importResearch(db,process.env.RESEARCH_PACKAGE_DIR||'./UAP_Research_Consolidated_v08'),null,2));}finally{await db.close();}}main().catch(e=>{console.error(e);process.exitCode=1;});

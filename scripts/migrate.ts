import { connect } from '../src/lib/db';
async function main(){const db=await connect();console.log('Database migrations applied.');await db.close();}main().catch(e=>{console.error(e);process.exitCode=1;});

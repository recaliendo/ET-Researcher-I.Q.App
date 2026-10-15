import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { drizzle as localDrizzle } from 'drizzle-orm/pglite';
import { drizzle as remoteDrizzle } from 'drizzle-orm/node-postgres';

export const dataDir = () => process.env.ET_DATA_DIR || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(),'.local','share'),'ETResearcherIQ');
export type Row = Record<string, unknown>;
export interface Database {
 query<T = Row>(sql:string, params?:unknown[]): Promise<{rows:T[]}>;
 exec(sql:string):Promise<unknown>;
 transaction<T>(fn:(tx:Database)=>Promise<T>):Promise<T>;
 close():Promise<void>;
}
let pending:Promise<Database>|undefined;
export async function connect(location?:string):Promise<Database> {
  const url=location ?? process.env.DATABASE_URL;
  let db:Database;
  const schema=await readFile(path.join(process.cwd(),'db','001_initial.sql'),'utf8');
  if(url?.startsWith('postgres')) {
    const pool=new Pool({connectionString:url,max:8});
    // Several server entry points can start at once; serialize CREATE IF NOT EXISTS, which races in PostgreSQL.
    const setup=await pool.connect();
    try{await setup.query('SELECT pg_advisory_lock(7241001)');await setup.query(schema);}finally{await setup.query('SELECT pg_advisory_unlock(7241001)').catch(()=>{});setup.release();}
    remoteDrizzle(pool); // Shared SQL schema; the native adapter handles transactional bulk ingestion.
    db={query:async<T>(sql:string,p?:unknown[])=>pool.query(sql,p) as unknown as Promise<{rows:T[]}>,exec:sql=>pool.query(sql),close:()=>pool.end(),transaction:async fn=>{
      const client=await pool.connect();
      const tx:Database={query:async<T>(s:string,p?:unknown[])=>client.query(s,p) as unknown as Promise<{rows:T[]}>,exec:s=>client.query(s),close:async()=>{},transaction:fn=>fn(tx)};
      try{await client.query('BEGIN');const out=await fn(tx);await client.query('COMMIT');return out;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    }};
  } else {
    const dir=url || path.join(dataDir(),'postgres');
    if(dir!=='memory://') await mkdir(dir,{recursive:true});
    const engine=new PGlite(dir);await engine.waitReady;localDrizzle(engine);
    const wrap=(e:Pick<PGlite,'query'|'exec'>):Database=>({query:async<T>(s:string,p?:unknown[])=>e.query<T>(s,p),exec:s=>e.exec(s),close:()=>engine.close(),transaction:fn=>engine.transaction(t=>fn(wrap(t)))});
    db=wrap(engine);await db.exec(schema);
  }
  return db;
}
export const database=()=>pending??=(connect());
export async function audit(db:Database,actor:string,action:string,target:string,details:unknown) {
  await db.query('INSERT INTO audit_log(id,actor,action,target,details) VALUES($1,$2,$3,$4,$5)',[crypto.randomUUID(),actor,action,target,JSON.stringify(details)]);
}

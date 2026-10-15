import { database } from './db';
import type {ResearchRecord,ResearchRow} from './research-types';
export * from './research-types';
export async function collection(name:string,privateAccess=false) {
  const db=await database();return (await db.query<ResearchRecord>('SELECT * FROM records WHERE collection=$1 AND ($2 OR publication=\'public\') ORDER BY source_id',[name,privateAccess])).rows;
}
export async function researchSnapshot(privateAccess=false) {
  const db=await database();const records=(await db.query<ResearchRecord>("SELECT * FROM records WHERE $1 OR publication='public' ORDER BY collection,source_id",[privateAccess])).rows;
  const tables:Record<string,ResearchRow[]>={};for(const r of records)(tables[r.collection]??=[]).push({...r.payload,_recordId:r.id});
  return tables;
}

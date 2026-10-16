// Explicit response contracts for GET /api/data, one per role. Fields are allow-listed (never "SELECT * and
// hope"): adding a column to a table can never leak it, because only the fields named here are serialized.
import type {Role} from './auth';
import {atLeast} from './auth';

type Row=Record<string,unknown>;
const pick=<T extends Row>(row:T,keys:readonly string[])=>Object.fromEntries(keys.filter(k=>k in row).map(k=>[k,row[k]]));

const PUBLIC_FEED=['id','provider_id','canonical_url','title','published_at','ingested_at','category','status','summary','summary_method','novelty','significance','contradictions','original_source_status','workflow_state','disposition','topic','triage','publisher','incident_ids'] as const;
const PUBLIC_PROVIDER=['id','name','kind','cadence_minutes','enabled','last_success','next_attempt','failures','policy_url','license_note'] as const;
const STAFF_PROVIDER=[...PUBLIC_PROVIDER,'url','last_attempt','last_error'] as const;
const PUBLIC_REVIEW=['id','item_id','decision','rationale','created_at'] as const;

// What each role may receive. Witness and other restricted records arrive only through `tables`, which the
// query layer already limits to published collections for the public role.
export const CONTRACT={
 public:{tables:'published only',feed:'machine-verified leads and human-reviewed items',providers:'health without error detail or internal URLs',reviews:'corrections and retractions only (public correction history), no actor',tasks:false,imports:false,audit:false,documents:false,publication:false,snapshots:false},
 reader:{tables:'all',feed:'all',providers:'full',reviews:'all, no actor',tasks:true,imports:false,audit:false,documents:true,publication:false,snapshots:true},
 editor:{tables:'all',feed:'all',providers:'full',reviews:'all with actor',tasks:true,imports:true,audit:true,documents:true,publication:false,snapshots:true},
 admin:{tables:'all',feed:'all',providers:'full',reviews:'all with actor',tasks:true,imports:true,audit:true,documents:true,publication:true,snapshots:true}
} as const;

export function shapeFeed(rows:Row[],role:Role){
 if(atLeast(role,'reader'))return rows;
 // Public items must not carry suggested case links (a research decision) even if a row slips through.
 return rows.map(r=>({...pick(r,PUBLIC_FEED),incident_ids:[]}));
}
export function shapeProviders(rows:Row[],role:Role){
 if(atLeast(role,'reader'))return rows.map(r=>pick(r,STAFF_PROVIDER));
 return rows.map(r=>({...pick(r,PUBLIC_PROVIDER),last_error:r.last_error?'Retrieval failed; retrying on schedule':null}));
}
export function shapeReviews(rows:Row[],role:Role){
 if(atLeast(role,'editor'))return rows;
 if(role==='reader')return rows.map(r=>pick(r,PUBLIC_REVIEW));
 return rows.filter(r=>r.decision==='corrected'||r.decision==='retracted').map(r=>pick(r,PUBLIC_REVIEW));
}

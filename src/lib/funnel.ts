// Research-readiness funnel (stages a–l). Every number is recomputed from imported rows and carries the row IDs,
// rule and source collection behind it. Two axes are kept apart on purpose:
//   operational = work done by machines or single passes (discovery, extraction, indexing)
//   evidence    = rows that passed a scientific gate (primary source, human coding, eligibility)
// Nothing here changes an RQ status; the statistical numerator (k, l) moves only when eligibility rules pass.
import type {ResearchRow} from './research-types';
import {requiredN} from './statistics';
import {EXTRACTION} from './progress';

export type Count={value:number;of?:number;label:string;ids:string[]};
export type Stage={key:string;title:string;rq:string;operational?:Count;evidence:Count;rule:string;sources:string[];blocked?:string;unlock?:string;task?:string;available:boolean};

const id=(r:ResearchRow,k:string)=>r[k]||r._recordId||'';
const unknown=(v?:string)=>!v||/^(unknown|not (recorded|measured|assigned|established|found|extracted)|pending|n\/a|none|—|-)\b/i.test(v.trim());
const primaryTier=(r:ResearchRow)=>/^primary/i.test(r['Source tier']||'');
const humanReviewed=(r:ResearchRow)=>/human/i.test(r['Review status']||'')&&!/awaiting/i.test(r['Review status']||'');
const exactDate=(r:ResearchRow)=>/^\d{4}-\d{2}-\d{2}/.test(r['Earliest statement date']||'');

// v08 power table (statistical_power_v08.csv): ideal independent 2×2, α = .05, w = .20, 80% power; illustrative design effect 1.4.
export const DESIGN_EFFECT=1.4;
export const targets=()=>{const iid=requiredN(.2,.8);return {iid,clustered:Math.ceil(iid*DESIGN_EFFECT),pilot:100};};

export function funnel(t:Record<string,ResearchRow[]>,feed:{disposition?:string|null;id:string}[]=[]):Stage[]{
 const events=t.Events||[],sources=t.Sources||[],registry=t.Source_Registry_v08||[],world=t.Worldwide_Cases||[],cross=t.Worldwide_Crosswalk||[];
 const audit=t.Primary_Source_Audit_v06||[],elig=t.Statistical_Eligibility_v06||[],deps=t.Witness_Dependency_v08||[],coding=t.Cognitive_Claim_Coding||[],x=t[EXTRACTION]||[];
 const {iid,clustered,pilot}=targets();
 const leads=feed.filter(f=>f.disposition==='source-verified metadata lead');
 const linked=cross.filter(r=>/^link/i.test(r['Integration decision']||'')),verifiedLinks=cross.filter(r=>!/needs/i.test(r['Verification status']||'needs'));
 const indexed=elig.filter(r=>!/pending/i.test(r['Primary dossier extraction']||'pending'));
 const located=x.filter(r=>!unknown(r['Earliest statement date'])),primaryDated=x.filter(r=>exactDate(r)&&primaryTier(r)&&humanReviewed(r));
 const contactKnown=deps.filter(r=>!unknown(r['Pre-first-report contact'])),aiSeparate=x.filter(r=>/^yes/i.test(r['Separate pre-contact statement?']||''));
 const outcome=elig.filter(r=>!unknown(r['Ground truth label']));
 const explained=world.filter(r=>/^explained/i.test(r.Status||''));
 const coder1=coding.filter(r=>!unknown(r['Coder 1'])),dual=coding.filter(r=>!unknown(r['Coder 1'])&&!unknown(r['Coder 2']));
 const adjudicated=coding.filter(r=>/^yes/i.test(r.Adjudicated||''));
 const eligible=elig.filter(r=>/^included/i.test(r['Inferential inclusion reason']||''));
 const has=(...k:string[])=>k.every(c=>(t[c]||[]).length>0);
 return [
  {key:'a',title:'Source discovery',rq:'All',available:has('Sources'),sources:['Sources','Source_Registry_v08','feed_items'],
   operational:{value:leads.length,label:'feed items passing machine metadata checks (bibliographic leads)',ids:leads.map(f=>f.id).slice(0,200)},
   evidence:{value:sources.length+registry.length,label:'curated source records in the v08 registries',ids:[...sources.map(r=>id(r,'SourceID')),...registry.map(r=>id(r,'SourceID'))]},
   rule:'Curated = a row in Sources or Source_Registry_v08. A feed lead is metadata only and never counts as evidence.'},
  {key:'b',title:'Incidents screened and duplicates adjudicated',rq:'RQ1',available:has('Events'),sources:['Events','Worldwide_Cases','Worldwide_Crosswalk'],
   operational:{value:linked.length,of:cross.length,label:'provisional crosswalk rows with a link decision (name-level)',ids:linked.map(r=>id(r,'Inventory ID'))},
   evidence:{value:verifiedLinks.length,of:cross.length,label:'crosswalk rows source-verified',ids:verifiedLinks.map(r=>id(r,'Inventory ID'))},
   rule:`${events.length} core events and ${world.length} worldwide leads overlap; they are never summed into one denominator. A link becomes verified only after source-specific review.`,
   blocked:'All 67 crosswalk rows are marked “Needs source-specific review” (gap G007).',unlock:'Review each row against its source and record a reversible decision.',task:'/priorities#G007'},
  {key:'c',title:'Primary dossiers retrieved',rq:'RQ1–RQ6',available:has('Statistical_Eligibility_v06'),sources:['Statistical_Eligibility_v06','Primary_Source_Audit_v06'],
   operational:{value:audit.length,label:'primary-source audit rows (document existence checked)',ids:audit.map(r=>id(r,'Audit ID'))},
   evidence:{value:indexed.length,of:elig.length,label:'core events with a primary document indexed',ids:indexed.map(r=>id(r,'EventID'))},
   rule:'Indexed = Primary dossier extraction is not “Pending”. Indexing a document is not extracting its content.',
   blocked:`${elig.length-indexed.length} events are pending source-specific extraction.`,unlock:'Retrieve and extract the original dossier for each event.',task:'/priorities#G002'},
  {key:'d',title:'Independently dated firsthand statements',rq:'RQ1, RQ2',available:has('Claims'),sources:[EXTRACTION,'Cognitive_Claim_Coding'],
   operational:{value:located.length,of:(t.Claims||[]).length||x.length,label:'claims with an AI-located earliest public statement',ids:located.map(r=>id(r,'ClaimID'))},
   evidence:{value:primaryDated.length,of:(t.Claims||[]).length||x.length,label:'exact-dated from a primary source and human-verified',ids:primaryDated.map(r=>id(r,'ClaimID'))},
   rule:'Evidence requires an exact date, a primary-tier source and a human review. v09 rows cite Wikipedia (as a locator) or news reports, not primary documents.',
   blocked:x.length?`0 of ${x.length} v09 rows cite a primary document; none is human-reviewed.`:'Sign in to see v09 extraction rows.',unlock:'Retrieve the original newspaper, transcript or archive record and have a human confirm the date.',task:'/priorities#G003'},
  {key:'e',title:'Witness contact chronology evaluated',rq:'RQ2, RQ4',available:has('Witness_Dependency_v08'),sources:['Witness_Dependency_v08',EXTRACTION],
   operational:{value:aiSeparate.length,label:'claims where AI extraction found a statement made before contact',ids:aiSeparate.map(r=>id(r,'ClaimID'))},
   evidence:{value:contactKnown.length,of:deps.length,label:'witness pairs with documented pre-report contact status',ids:contactKnown.map(r=>id(r,'LinkID'))},
   rule:'Unknown contact is missing, not “no contact”.',blocked:`All ${deps.length} witness pairs have unknown pre-report contact.`,unlock:'Contact and media-exposure chronology from original records.',task:'/priorities#G003'},
  {key:'f',title:'Authenticated objective outcomes',rq:'RQ1, RQ6',available:has('Statistical_Eligibility_v06'),sources:['Statistical_Eligibility_v06'],
   evidence:{value:outcome.length,of:elig.length,label:'events with an independently authenticated sensor or physical outcome',ids:outcome.map(r=>id(r,'EventID'))},
   rule:'Outcome = independently authenticated sensor or physical evidence, whatever its origin. “Not measured” is missing, not negative.',
   blocked:'Ground-truth outcome is “Not measured” for every core event.',unlock:'Raw sensor files or physical records with independent authentication, coded blind to testimony.',task:'/priorities#G002'},
  {key:'g',title:'Conventional comparisons',rq:'RQ6',available:has('Worldwide_Cases'),sources:['Worldwide_Cases'],
   operational:{value:explained.length,of:world.length,label:'worldwide leads with a recorded conventional finding',ids:explained.map(r=>id(r,'ID'))},
   evidence:{value:0,of:world.length,label:'with investigation adequacy coded',ids:[]},
   rule:'A recorded finding (official, probable, consensus) is not yet an adequacy assessment. Adequacy is not a field in v08.',
   blocked:'No investigation-adequacy field exists yet.',unlock:'Code investigation completeness per case (raw data, calibration, alternatives checked).',task:'/priorities#G009'},
  {key:'h',title:'Single-coded incident records',rq:'RQ1–RQ3',available:has('Cognitive_Claim_Coding'),sources:['Cognitive_Claim_Coding',EXTRACTION],
   operational:{value:x.length,of:coding.length,label:'claims with an AI extraction pass (not a coder)',ids:x.map(r=>id(r,'ClaimID'))},
   evidence:{value:coder1.length,of:coding.length,label:'claims with a named human Coder 1',ids:coder1.map(r=>id(r,'ClaimID'))},
   rule:'AI extraction is never counted as a coder.',blocked:'Coder 1 is “Unknown” on every claim row.',unlock:'Assign a trained human coder.',task:'/priorities#G005'},
  {key:'i',title:'Blinded dual-human-coded records',rq:'RQ1–RQ3',available:has('Cognitive_Claim_Coding'),sources:['Cognitive_Claim_Coding'],
   evidence:{value:dual.length,of:coding.length,label:'claims coded by two blinded humans',ids:dual.map(r=>id(r,'ClaimID'))},
   rule:'Requires Coder 1 and Coder 2, both human, coding independently. Never simulated.',blocked:'No second human coder exists.',unlock:'Recruit a second blinded coder; measure agreement (κ/α).',task:'/priorities#G005'},
  {key:'j',title:'Adjudicated disagreements',rq:'RQ1–RQ3',available:has('Cognitive_Claim_Coding'),sources:['Cognitive_Claim_Coding'],
   evidence:{value:adjudicated.length,label:'claims with an adjudication recorded',ids:adjudicated.map(r=>id(r,'ClaimID'))},
   rule:'Adjudication follows dual coding.',blocked:'Depends on stage i.',unlock:'Conflict register after dual coding.',task:'/priorities#G005'},
  {key:'k',title:'Study-eligible incident-level 2×2 records',rq:'RQ1',available:has('Statistical_Eligibility_v06'),sources:['Statistical_Eligibility_v06'],
   evidence:{value:eligible.length,of:pilot,label:`eligible incidents (first milestone: ${pilot} adjudicated)`,ids:eligible.map(r=>id(r,'EventID'))},
   rule:'Eligible = inclusion reason starts with “Included”. Requires stages c–j for the incident.',blocked:`All ${elig.length} screened core events are excluded: no independent ground-truth outcome.`,unlock:'Stages d, e, f and i for each incident.',task:'/priorities#G002'},
  {key:'l',title:'Effective N and power',rq:'RQ1',available:true,sources:['statistical_power_v08.csv'],
   evidence:{value:eligible.length,of:clustered,label:`achieved effective N vs planning target (${iid} if independent; ${clustered} at design effect ${DESIGN_EFFECT})`,ids:[]},
   rule:`Planning only: w = 0.20, α = .05, 80% power, ideal independent 2×2. Real N depends on prevalence, imbalance, clustering and missingness. No optional stopping.`,blocked:'Power is not estimable with zero eligible incidents.',unlock:'Eligible incidents from stage k.'}
 ];
}
// Stable fingerprint for snapshot de-duplication (values only, not IDs).
export const fingerprint=(s:Stage[])=>s.map(x=>`${x.key}:${x.operational?.value??'-'}/${x.evidence.value}`).join('|');

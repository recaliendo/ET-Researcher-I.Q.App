// Deterministic, versioned triage for Live Intelligence items. It replaces a blanket "analyst review pending"
// with what machines can actually check from metadata. It never marks anything as evidence or as human-reviewed:
// the best automatic outcome is a "source-verified metadata lead · research not adjudicated".
export const POLICY_VERSION='triage-policy-2026-10-16.3';

export const STATES=['DISCOVERED','FETCHED','DEDUPED','METADATA_VERIFIED','CONTENT_RETRIEVED','SOURCE_GRADED','CLAIMS_EXTRACTED','AUTO_QA_PASSED','AUTO_CLASSIFIED','HUMAN_REVIEW_REQUIRED','HUMAN_APPROVED_RESEARCH_RECORD','REJECTED','RETRACTED','STALE'] as const;
export type State=typeof STATES[number];
export const DISPOSITIONS=['source-verified metadata lead','requires expert review','metadata check failed','possible duplicate','human reviewed','rejected','retracted'] as const;
export type Disposition=typeof DISPOSITIONS[number];
export type Check={id:string;label:string;pass:boolean|null;detail:string};
export type Triage={state:State;disposition:Disposition;topic:string;evidenceRelation:string;checks:Check[];reasons:string[];reached:State[];policy:string;publicLead:boolean;humanRequired:boolean};
export type TriageInput={provider:string;url:string;title:string;published_at?:string|null;publisher?:string;type?:string;duplicateOf?:string|null;caseSuggestions?:number;status?:string;now?:Date};

const hosts:Record<string,RegExp>={nasa:/(^|\.)nasa\.gov$/,arxiv:/(^|\.)arxiv\.org$/,crossref:/^(dx\.)?doi\.org$/,europepmc:/^(doi\.org|europepmc\.org)$/,federalregister:/^www\.federalregister\.gov$/,govinfo:/^www\.govinfo\.gov$/};
const identifier:Partial<Record<string,(u:URL)=>boolean>>={crossref:u=>/^\/10\.\d{4,9}\//.test(u.pathname),europepmc:u=>/^\/10\.\d{4,9}\//.test(u.pathname)||/^\/article\//.test(u.pathname),arxiv:u=>/\/abs\/\d{4}\.\d{4,5}/.test(u.pathname),federalregister:u=>/^\/documents\/\d{4}\//.test(u.pathname),govinfo:u=>/\/(details|app\/details)\//.test(u.pathname)||u.pathname.length>1};

// What the item studies, in order of precedence. A social study of UAP is about people, not about an event.
const topics:[string,RegExp,string][]=[
 ['Correction or retraction notice',/\b(retract|erratum|corrigend|correction to)\w*/i,'Changes the status of earlier literature; needs a human to propagate it.'],
 ['Physical-material claim',/\b(isotop|alloy|specimen|metamaterial|debris|fragment|material analysis|implant)/i,'Concerns physical material; provenance and custody decisions need expert review.'],
 ['Social, cultural or policy study',/\b(public (perception|opinion|attitude|reaction|response|interest|discourse|trust)|perception|belief|attitude|social|societ|media|discourse|religio|stigma|policy|politic|governance|disclosure|reaction|response|narrative|conspira|cultur|histor|communicat|trust|ethic|law)\w*/i,'Studies human or institutional responses to UAP; it does not corroborate any UAP event.'],
 ['Astrobiology or space science',/\b(astrobiolog|biosignature|exoplanet|mars|abiogen|technosignature|seti|life)\w*/i,'Separate science track; not part of UAP incident counts.'],
 ['Atmospheric or meteor science',/\b(meteor|atmospher|bolide|plasma|lightning|weather|ionospher)\w*/i,'Possible conventional-explanation context for RQ6; not UAP evidence.'],
 ['Sensor or observation analysis',/\b(sensor|radar|infrared|detect|observ|measur|photometr|spectr|tracking|camera|imag|telescope|transient|calibrat)\w*/i,'May bear on RQ6; the original data have not been retrieved or assessed.'],
 ['Official notice or hearing record',/\b(hearing|act|authorization|notice|committee|congress|senate|house|rule)\b/i,'Official record exists; its contents are not yet extracted.']
];
export function topicFor(title:string,provider:string){
 const hit=topics.find(([,re])=>re.test(title));if(hit)return {topic:hit[0],relation:hit[2]};
 if(provider==='federalregister'||provider==='govinfo')return {topic:'Official notice or hearing record',relation:'Official record exists; its contents are not yet extracted.'};
 return {topic:'General UAP topic',relation:'Bibliographic lead only; content not yet assessed.'};
}

export function triage(i:TriageInput):Triage{
 const now=i.now||new Date();const checks:Check[]=[];const reasons:string[]=[];
 let url:URL|null=null;try{url=new URL(i.url);}catch{}
 const host=!!url&&url.protocol==='https:'&&(hosts[i.provider]?.test(url.hostname)??false);
 checks.push({id:'host',label:'Link points to the expected publisher domain',pass:host,detail:url?url.hostname:'Invalid URL'});
 const titled=i.title.trim().length>=8&&i.title.length<=1500;
 checks.push({id:'title',label:'Title present and plausible length',pass:titled,detail:`${i.title.trim().length} characters`});
 const t=i.published_at?Date.parse(i.published_at):NaN;const dated=Number.isFinite(t)&&t<=now.getTime()+864e5&&t>Date.UTC(1900,0,1);
 checks.push({id:'date',label:'Publication date valid and not in the future',pass:dated,detail:i.published_at||'No date supplied'});
 const idCheck=identifier[i.provider];const ided=idCheck&&url?idCheck(url):null;
 checks.push({id:'identifier',label:'Persistent identifier present (DOI, arXiv ID or document number)',pass:ided,detail:idCheck?(ided?url!.pathname:'No identifier found in link'):'Not applicable to this provider'});
 checks.push({id:'dedupe',label:'Not a repeat of an item already ingested',pass:!i.duplicateOf,detail:i.duplicateOf?`Same title as ${i.duplicateOf}`:'No matching title'});
 checks.push({id:'privacy',label:'No private personal data stored',pass:true,detail:'Only public bibliographic metadata is stored; full text is not republished.'});
 checks.push({id:'content',label:'Full text retrieved and checked',pass:null,detail:'Not attempted: rights to retrieve and store full text are not cleared for these providers.'});
 const {topic,relation}=topicFor(i.title,i.provider);
 const reached:State[]=['DISCOVERED','FETCHED','DEDUPED'];
 const human=i.status&&i.status!=='pending'?i.status:null;
 if(human){
  const map:Record<string,[State,Disposition]>={reviewed:['HUMAN_APPROVED_RESEARCH_RECORD','human reviewed'],corrected:['HUMAN_APPROVED_RESEARCH_RECORD','human reviewed'],rejected:['REJECTED','rejected'],retracted:['RETRACTED','retracted']};
  const [state,disposition]=map[human]||['HUMAN_REVIEW_REQUIRED','requires expert review'];
  return {state,disposition,topic,evidenceRelation:relation,checks,reasons:['A human decision is recorded in the audit log.'],reached,policy:POLICY_VERSION,publicLead:disposition==='human reviewed',humanRequired:false};
 }
 if(i.duplicateOf){reasons.push('Repeats an item already ingested; a repeated report is not independent.');return {state:'REJECTED',disposition:'possible duplicate',topic,evidenceRelation:relation,checks,reasons,reached,policy:POLICY_VERSION,publicLead:false,humanRequired:false};}
 const metaOk=host&&titled&&dated&&ided!==false;
 if(!metaOk){reasons.push('One or more metadata checks failed: '+checks.filter(c=>c.pass===false).map(c=>c.label.toLowerCase()).join('; ')+'.');return {state:'HUMAN_REVIEW_REQUIRED',disposition:'metadata check failed',topic,evidenceRelation:relation,checks,reasons,reached,policy:POLICY_VERSION,publicLead:false,humanRequired:true};}
 reached.push('METADATA_VERIFIED');
 if(topic==='Correction or retraction notice')reasons.push('Corrections and retractions must be propagated by a human.');
 if(topic==='Physical-material claim')reasons.push('Material provenance decisions require subject-matter review.');
 if(i.caseSuggestions)reasons.push(`Suggested association with ${i.caseSuggestions} core case${i.caseSuggestions===1?'':'s'} by name match; linking an item to a case is a research decision.`);
 if(reasons.length)return {state:'HUMAN_REVIEW_REQUIRED',disposition:'requires expert review',topic,evidenceRelation:relation,checks,reasons,reached,policy:POLICY_VERSION,publicLead:false,humanRequired:true};
 reached.push('AUTO_CLASSIFIED');
 reasons.push('All applicable metadata checks passed. Published as a labelled bibliographic lead; the research it reports has not been adjudicated.');
 return {state:'AUTO_CLASSIFIED',disposition:'source-verified metadata lead',topic,evidenceRelation:relation,checks,reasons,reached,policy:POLICY_VERSION,publicLead:true,humanRequired:false};
}
// Review service level for items a human must see. Owner stays unassigned until a real reviewer exists.
export const SLA_DAYS=7;
export const dueDate=(ingested:string)=>new Date(Date.parse(ingested)+SLA_DAYS*864e5).toISOString();

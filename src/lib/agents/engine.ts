// Amendment A1 rules engine (docs/PROTOCOL_AMENDMENT_v10.md). Pure and deterministic: the same inputs always
// give the same adjudication, so it can be re-run safely and audited.
import {createHash} from 'node:crypto';
import {VERDICTS} from '../agent-policy';
export type Verdict=typeof VERDICTS[number];
export const RUBRIC_VERSION='R1-2026-10-16';
export const ENGINE_VERSION='E1';
export const VARIABLES=[
 {code:'V1',name:'Unique incident identity',rq:'RQ1',required:true},
 {code:'V2',name:'Firsthand testimony',rq:'RQ1, RQ2',required:true},
 {code:'V3',name:'Source authenticity',rq:'All',required:true},
 {code:'V4',name:'Independent accounts (exposure)',rq:'RQ1, RQ2, RQ4',required:true},
 {code:'V5',name:'Objective corroboration (outcome)',rq:'RQ1, RQ5, RQ6',required:true},
 {code:'V6',name:'Investigation adequacy',rq:'RQ1, RQ6',required:false},
 {code:'V7',name:'Conventional explanation recorded',rq:'RQ6',required:false}
] as const;
export type VarCode=typeof VARIABLES[number]['code'];
export const STATES=['SOURCE_DISCOVERED','SOURCE_VERIFIED','DOSSIER_PREPARED','MACHINE_REVIEW_PENDING','MACHINE_REVIEW_COMPLETED','AGENT_CONFLICT','MACHINE_ADJUDICATED','INSUFFICIENT_EVIDENCE','HUMAN_REVIEW_REQUIRED','HUMAN_VALIDATED'] as const;
export type State=typeof STATES[number];

export type CoderValue={value:Verdict;citations:string[];rationale:string};
export type CoderOutput={coder:'machine-coder-a'|'machine-coder-b';variables:Partial<Record<VarCode,CoderValue>>};
export type Challenge={variable:VarCode;verdict:'uphold'|'reject';reason:string};
export type Adjudicated={value:Verdict;a:Verdict;b:Verdict;agreement:'agree'|'abstain-split'|'conflict';rejected?:string;notes:string[]};
export type Adjudication={incident:string;state:State;variables:Record<VarCode,Adjudicated>;exploratory:boolean;confirmatory:boolean;reasons:string[];inputsSha256:string;rubric:string;engine:string};

// A coder value counts only if every citation it relies on is verified (a verified quote or an imported record).
export function effective(v:CoderValue|undefined,verified:Set<string>):{value:Verdict;note?:string}{
 if(!v)return {value:'UNKNOWN',note:'not assessed'};
 if(v.value==='YES'||v.value==='NO'){
  if(!v.citations.length)return {value:'UNKNOWN',note:`${v.value} without citations downgraded to UNKNOWN`};
  const bad=v.citations.filter(c=>!verified.has(c));if(bad.length)return {value:'UNKNOWN',note:`${v.value} relied on unverified citation(s) ${bad.join(', ')}; downgraded to UNKNOWN`};
 }
 return {value:v.value};
}
export function combine(a:Verdict,b:Verdict):{value:Verdict;agreement:Adjudicated['agreement']}{
 if(a===b)return {value:a,agreement:'agree'};
 if((a==='YES'&&b==='NO')||(a==='NO'&&b==='YES')||a==='CONFLICTED'||b==='CONFLICTED')return {value:'CONFLICTED',agreement:'conflict'};
 return {value:'UNKNOWN',agreement:'abstain-split'};
}
export function adjudicate(input:{incident:string;a:CoderOutput;b:CoderOutput;challenges:Challenge[];verified:Set<string>;sourcesVerified:number;humanValidations:number}):Adjudication{
 const vars={} as Record<VarCode,Adjudicated>;const reasons:string[]=[];
 for(const {code} of VARIABLES){
  const ea=effective(input.a.variables[code],input.verified),eb=effective(input.b.variables[code],input.verified);
  const c=combine(ea.value,eb.value);const notes=[ea.note&&`A: ${ea.note}`,eb.note&&`B: ${eb.note}`].filter(Boolean) as string[];
  let value=c.value;let rejected:string|undefined;
  const ch=input.challenges.find(x=>x.variable===code&&x.verdict==='reject');
  // Adversarial rejection makes a definite value UNKNOWN; it never flips it to the opposite.
  if(ch&&(value==='YES'||value==='NO')){rejected=ch.reason;notes.push(`Adversarial review rejected ${value}: ${ch.reason}`);value='UNKNOWN';}
  vars[code]={value,a:ea.value,b:eb.value,agreement:c.agreement,rejected,notes};
 }
 const required=VARIABLES.filter(v=>v.required).map(v=>v.code);
 let state:State;
 if(required.some(c=>vars[c].value==='CONFLICTED')){state='AGENT_CONFLICT';reasons.push('Machine coders disagree (YES vs NO) on: '+required.filter(c=>vars[c].value==='CONFLICTED').join(', ')+'. Escalated to human review.');}
 else if(!input.sourcesVerified){state='INSUFFICIENT_EVIDENCE';reasons.push('No source document could be retrieved and verified.');}
 else if(required.some(c=>vars[c].value==='UNKNOWN')){state='INSUFFICIENT_EVIDENCE';reasons.push('Unknown after machine review: '+required.filter(c=>vars[c].value==='UNKNOWN').map(c=>`${c} ${VARIABLES.find(v=>v.code===c)!.name}`).join('; ')+'.');}
 else state='MACHINE_ADJUDICATED';
 const v=(c:VarCode)=>vars[c].value;
 let exploratory=state==='MACHINE_ADJUDICATED'&&v('V1')==='YES'&&v('V2')==='YES'&&v('V3')==='YES'&&['YES','NO'].includes(v('V4'))&&['YES','NO'].includes(v('V5'));
 if(exploratory&&v('V5')==='NO'&&v('V6')!=='YES'){exploratory=false;reasons.push('V5 = NO counts only after an adequate investigation (V6 = YES); unknown is not negative.');}
 if(state==='MACHINE_ADJUDICATED'&&!exploratory&&!reasons.length)reasons.push('Adjudicated, but V1–V3 are not all YES.');
 if(exploratory)reasons.push(`Exploratory-eligible: exposure ${v('V4')}, outcome ${v('V5')}.`);
 const confirmatory=exploratory&&input.humanValidations>=2;
 if(exploratory&&!confirmatory)reasons.push(`Confirmatory eligibility needs two independent human validations (${input.humanValidations} recorded).`);
 const inputsSha256=createHash('sha256').update(JSON.stringify({a:input.a,b:input.b,c:input.challenges,v:[...input.verified].sort(),s:input.sourcesVerified,h:input.humanValidations,r:RUBRIC_VERSION,e:ENGINE_VERSION})).digest('hex');
 return {incident:input.incident,state:confirmatory?'HUMAN_VALIDATED':state,variables:vars,exploratory,confirmatory,reasons,inputsSha256,rubric:RUBRIC_VERSION,engine:ENGINE_VERSION};
}
// Machine–machine agreement (Cohen's kappa over definite values). Reported as such, never as inter-rater reliability.
export function machineAgreement(pairs:[Verdict,Verdict][]){
 const n=pairs.length;if(!n)return {n:0,observed:null,kappa:null};
 const cats=[...VERDICTS];const po=pairs.filter(([a,b])=>a===b).length/n;
 const pe=cats.reduce((s,c)=>s+(pairs.filter(([a])=>a===c).length/n)*(pairs.filter(([,b])=>b===c).length/n),0);
 return {n,observed:po,kappa:pe===1?null:(po-pe)/(1-pe)};
}

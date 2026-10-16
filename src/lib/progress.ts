// Progress since v0.8, computed only from imported records. Research-question STATES come from v0.8 and are never
// changed here: AI-extracted rows count as progress toward a test, not as adjudicated evidence.
import type {ResearchRow} from './research-types';
import {requiredN} from './statistics';

export const EXTRACTION='Primary_Source_Extraction_v09';
export const LAB='Artifact_Lab_Evidence_v09';
const located=(r:ResearchRow)=>!!r['Earliest statement date']&&!/^unknown/i.test(r['Earliest statement date']);
const exact=(r:ResearchRow)=>/^\d{4}-\d{2}-\d{2}/.test(r['Earliest statement date']||'');

export type Progress={rq:string;headline:string;detail:string;remaining:string;moved:boolean};
export function sprintProgress(t:Record<string,ResearchRow[]>):{available:boolean;items:Progress[];summary:{claims:number;located:number;exact:number;reviewed:number;separate:number;labDone:number;lab:number}}{
 const x=t[EXTRACTION]||[],lab=t[LAB]||[];
 const claims=(t.Claims||[]).length||x.length;
 const loc=x.filter(located).length,ex=x.filter(exact).length,reviewed=x.filter(r=>/human/i.test(r['Review status']||'')&&!/awaiting/i.test(r['Review status']||'')).length;
 const separate=x.filter(r=>/^yes/i.test(r['Separate pre-contact statement?']||'')).length;
 const labDone=lab.filter(r=>/done/i.test(r['Proof-chain stages']||'')).length;
 const n=requiredN(.2,.8);
 const items:Progress[]=[
  {rq:'RQ1',moved:false,headline:`0 of ${n} eligible independent incidents`,detail:`Eligibility needs adjudicated independent first statements and authenticated objective outcomes per incident. The v09 sprint dated statements, but none is human-adjudicated yet.`,remaining:`Phase 2–5: 100 fully adjudicated incidents first, then ≈${n} for 80% power at w = 0.2.`},
  {rq:'RQ2',moved:loc>0,headline:`${loc} of ${claims} claims now have a located earliest public statement (${ex} with an exact date)`,detail:`AI-extracted from cited public sources; ${reviewed} human-reviewed. Only ${separate} claim(s) show a statement made before contact with other witnesses.`,remaining:'Second blinded coder; contact and media-exposure chronology; original (not tertiary) sources.'},
  {rq:'RQ4',moved:x.length>0,headline:'Witness pairs checked for statement independence',detail:'Nimitz: separate aircraft, but the earliest public statements found were 2017 (one pilot) and a 2021 joint interview. Trinity 1945: joint account first published 2003. Neither pair yet shows independent first statements.',remaining:'Locate separately preserved earliest statements (e.g. 2004 debrief records).'},
  {rq:'RQ5',moved:labDone>0,headline:`${labDone} candidate(s) with documented independent laboratory examination`,detail:'ORNL/AARO 2024: the alleged 1947 magnesium specimen is terrestrial (Mg and Pb isotopes) and its chain of custody is undocumented. Ubatuba: Mg isotopes within terrestrial limits. Neither supports extraterrestrial origin.',remaining:'A candidate with continuous, documented event-to-item custody and replicated testing.'},
  {rq:'RQ6',moved:false,headline:'No change',detail:'Trace cases (Trans-en-Provence, Delphos) remain unexplained with contested methods; no new raw sensor data retrieved.',remaining:'Case-specific investigation completeness and raw data.'}
 ];
 return {available:x.length>0||lab.length>0,items,summary:{claims,located:loc,exact:ex,reviewed,separate,labDone,lab:lab.length}};
}

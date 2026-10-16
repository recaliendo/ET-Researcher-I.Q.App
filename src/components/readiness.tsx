'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Download,Play} from 'lucide-react';
import type {Snapshot} from './observatory';
import {Badge,Note,Panel,download} from './ui';
import {funnel,targets,DESIGN_EFFECT,type Count} from '@/lib/funnel';
import {gaps,GAP_STATUSES,type GapStatus} from '@/lib/gaps';
import {bootstrapV,contingency,historical,historicalTable,verified,fisherExact} from '@/lib/statistics';
import {Status} from './chrome';

const pct=(a:number,b?:number)=>b?Math.round(a/b*100)+'%':'';
function Num({c,axis}:{c?:Count;axis:string}){
 if(!c)return <div><div className="axis">{axis}</div><div className="muted small">Not applicable</div></div>;
 return <div><div className="axis">{axis}</div><div className="num">{c.value}{c.of!=null&&<small className="muted"> / {c.of}</small>}</div><div className="small">{c.label}</div></div>;
}

/* Research-readiness funnel: operational progress and scientific evidence readiness on separate axes. */
export function ReadinessFunnel({data,compact=false}:{data:Snapshot;compact?:boolean}){
 const stages=funnel(data.tables,data.feed);const {iid,clustered}=targets();const snaps=data.snapshots||[];
 return <Panel title="Research-readiness funnel" eyebrow="STAGES A–L · RECOMPUTED FROM ROWS" action={<Badge tone="green">Live from imported records</Badge>}>
  <p className="muted small">Each stage shows two numbers. <b>Operational</b> counts work done by machines or single passes. <b>Evidence</b> counts only rows that passed a scientific gate. Open a stage to see the rule and the row IDs behind its numbers. The RQ1 target ({iid} independent incidents, or {clustered} at an illustrative design effect of {DESIGN_EFFECT}) is a planning assumption, not a quota of known incidents.</p>
  <div className="funnel">{stages.map(s=><div className="funnel-row" key={s.key} id={'stage-'+s.key}>
   <span className="key">{s.key}</span>
   <div><h3>{s.title}</h3><small className="muted">{s.rq}</small>{s.blocked&&s.available&&<p className="blocked">Blocked because: {s.blocked}</p>}</div>
   <Num c={s.operational} axis="Operational"/><Num c={s.evidence} axis="Evidence readiness"/>
   {!compact&&<details><summary>Rule, sources and row IDs</summary>
    {!s.available&&<Note>Some source collections are private. Sign in to recompute this stage from the full record set.</Note>}
    <p><b>Rule:</b> {s.rule}</p><p><b>Collections:</b> {s.sources.join(', ')}</p>
    {s.operational&&<p><b>Operational IDs ({s.operational.ids.length}):</b> <code>{s.operational.ids.join(', ')||'none'}</code></p>}
    <p><b>Evidence IDs ({s.evidence.ids.length}):</b> <code>{s.evidence.ids.join(', ')||'none'}</code></p>
    {s.unlock&&<p><b>What unlocks it:</b> {s.unlock} {s.task&&<Link href={s.task}>Open the task</Link>}</p>}
   </details>}
  </div>)}</div>
  {snaps.length>0&&!compact&&<details><summary>History ({snaps.length} recorded {snaps.length===1?'snapshot':'snapshots'})</summary><div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Recorded</th>{snaps[0].stages.map(x=><th key={x.key}>{x.key}</th>)}</tr></thead><tbody>{snaps.map(sn=><tr key={sn.fingerprint}><td>{new Date(sn.created_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</td>{sn.stages.map(x=><td key={x.key}>{x.operational??'–'} / {x.evidence}</td>)}</tr>)}</tbody></table></div><p className="muted small">A snapshot is stored only when a number changes (operational / evidence per stage).</p></details>}
 </Panel>;
}

/* Methodology first: what the confirmatory RQ1 analysis will be, before any data exist. */
export function MethodsFirst(){
 const {iid,clustered,pilot}=targets();
 const items:[string,string][]=[
  ['Question (RQ1)','Does separately acquired firsthand testimony predict independently authenticated objective corroboration?'],
  ['Unit of analysis','One independently identified incident. Not a witness, statement or repost.'],
  ['Exposure','At least two pre-contact, independent, original firsthand accounts documented in separate primary records.'],
  ['Outcome','Independently authenticated sensor or physical corroboration, whatever its origin (prosaic or not), coded blind to testimony where feasible.'],
  ['Estimand','Risk ratio (and odds ratio) of authenticated corroboration, exposed vs unexposed incidents, with 95% CI.'],
  ['Inclusion','Incident has an identified primary dossier, dated first statements and an adequately investigated outcome.'],
  ['Exclusion','Duplicate or derivative reports; outcome pending or unknown (kept as missing, never as “absent”).'],
  ['Controls','Resolved conventional incidents drawn from the same registries (target ≥150), not only famous cases.'],
  ['Clustering','Source networks and shared investigations; cluster-robust or hierarchical estimates. Illustrative design effect '+DESIGN_EFFECT+'.'],
  ['Confounders','Era, country/registry, sensor availability, observation conditions, investigation intensity. No rank or prestige score.'],
  ['Missingness','Report complete-case and bounded (best/worst) estimates; test sensitivity to missing-not-at-random.'],
  ['Tests and decision rule','Fisher exact when any expected count < 5, else Pearson; cluster-adjusted model as primary if clustering is present. Holm correction across pre-specified secondary tests. No optional stopping.'],
  ['Sample plan',`Pilot of ${pilot} adjudicated incidents; ${iid} for 80% power at w = 0.20 if independent; ≈${clustered} at design effect ${DESIGN_EFFECT}. Re-estimated from pilot data, prospectively.`],
  ['Preregistration','Draft only. Not yet registered; to be timestamped on a public registry before any confirmatory test.']
 ];
 return <Panel title="Methods before data" eyebrow="RQ1 CONFIRMATORY PROTOCOL · DRAFT, NOT PREREGISTERED" action={<Badge tone="amber">Draft protocol</Badge>}>
  <dl className="method-grid">{items.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  <p className="muted small">Labels used on this page: <Badge tone="green">Research result</Badge> executed on real published counts · <Badge tone="blue">Simulation</Badge> or <Badge tone="blue">Educational</Badge> invented inputs · <Badge tone="amber">Draft</Badge> or blocked: not run, with the reason.</p>
 </Panel>;
}

async function sha256(text:string){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');}

/* One-click reproducibility: recompute the GEIPAN statistics, re-run the bootstrap and issue a checksummed manifest. */
export function ReproduceRun(){
 const [state,setState]=useState<'idle'|'running'|'done'>('idle'),[manifest,setManifest]=useState<Record<string,any>|null>(null);
 const run=()=>{setState('running');setTimeout(async()=>{
  const table=historicalTable();const input={source:verified.source,periods:historical.periods,table};
  const r=contingency(table);const boot=bootstrapV(table,verified.bootstrapResamples,verified.seed);
  const outputs={chi2:r.chi2,df:r.df,p:r.p,v:r.v,minimumExpected:r.minimumExpected,bootstrapCI:boot.ci,bootstrapValid:boot.valid};
  const checks={chi2:Math.abs(r.chi2-verified.chi2)<1e-6,p:Math.abs(Math.log10(r.p)-Math.log10(verified.p))<1e-4,v:Math.abs(r.v-verified.v)<1e-9,bootstrapWithinMonteCarloError:Math.abs(boot.ci[0]-verified.bootstrapCI[0])<.005&&Math.abs(boot.ci[1]-verified.bootstrapCI[1])<.005};
  const body={run:'geipan-era-v08-rerun',generated:new Date().toISOString(),software:{implementation:'src/lib/statistics.ts (TypeScript, browser)',prng:'mulberry32',bootstrap:boot.method},seed:boot.seed,resamples:boot.resamples,input,inputSha256:await sha256(JSON.stringify(input)),outputs,published:verified,checks,interpretation:'Secondary classification-process association. Not evidence about extraterrestrial origin.'};
  setManifest({...body,manifestSha256:await sha256(JSON.stringify(body))});setState('done');},30);};
 const ok=manifest&&Object.values(manifest.checks).every(Boolean);
 return <Panel title="Reproduce the GEIPAN result" eyebrow="ONE-CLICK RE-RUN · CHECKSUMMED MANIFEST" action={<Badge tone="green">Real published counts</Badge>}>
  <p className="muted small">Recomputes χ², p and Cramér’s V from the 14 published cell counts, re-runs {verified.bootstrapResamples.toLocaleString()} bootstrap resamples (seed {verified.seed}) in this browser, and compares every output with the v0.8 package. The bootstrap uses a different random generator from the package’s Python run, so the interval should agree within Monte Carlo error, not to the last digit.</p>
  <div className="button-row"><button className="button primary" onClick={run} disabled={state==='running'}><Play size={14}/> {state==='running'?'Running…':'Re-run now'}</button>{manifest&&<button className="button" onClick={()=>download('geipan-run-manifest.json',manifest)}><Download size={14}/> Download manifest</button>}</div>
  {manifest&&<><div className="stat-grid"><div><span>χ²(6)</span><strong>{manifest.outputs.chi2.toFixed(5)}</strong></div><div><span>Cramér’s V</span><strong>{manifest.outputs.v.toFixed(5)}</strong></div><div><span>Bootstrap 95% CI (this run)</span><strong>{manifest.outputs.bootstrapCI.map((x:number)=>x.toFixed(3)).join('–')}</strong></div><div><span>Published CI</span><strong>{verified.bootstrapCI.map(x=>x.toFixed(3)).join('–')}</strong></div></div>
   <Note tone={ok?'success':'warning'}>{ok?'✓ All checks pass.':'A check failed; see the manifest.'} Input SHA-256 <code>{manifest.inputSha256.slice(0,16)}…</code> · manifest SHA-256 <code>{manifest.manifestSha256.slice(0,16)}…</code></Note></>}
 </Panel>;
}

/* G001–G012 as a task board with distinct statuses. */
const tone:Record<GapStatus,string>={completed:'green','in progress':'blue',blocked:'red','externally required':'amber','not started':'neutral'};
export function GapBoard({data}:{data:Snapshot}){
 const list=gaps(data.tables,data.agents);const [filter,setFilter]=useState<GapStatus|'all'>('all');
 const shown=list.filter(g=>filter==='all'||g.status===filter);
 return <Panel title="Gap board: G001–G012" eyebrow="TASK-LEVEL PROGRESS · STATUSES ARE NEVER ROUNDED UP">
  <div className="chip-row" role="group" aria-label="Filter by status">{(['all',...GAP_STATUSES] as const).map(s=><button key={s} className={'chip '+(filter===s?'selected':'')} aria-pressed={filter===s} onClick={()=>setFilter(s)}>{s} <span>{s==='all'?list.length:list.filter(g=>g.status===s).length}</span></button>)}</div>
  <div className="gap-board">{shown.map(g=><article className="gap-card" id={g.id} key={g.id}>
   <header><b>{g.id}</b><h3>{g.title}</h3><Badge tone={tone[g.status]}>{g.status}</Badge><Badge>{g.rq}</Badge></header>
   <dl>
    <div><dt>Acceptance criterion</dt><dd>{g.acceptance}</dd></div>
    <div><dt>Accepted so far</dt><dd>{g.done} / {g.total} {pct(g.done,g.total)&&`(${pct(g.done,g.total)})`}</dd></div>
    <div><dt>Work performed</dt><dd>{g.work.length?g.work.join(' '):'None yet.'}</dd></div>
    {g.blockedBy&&<div><dt>Blocked because</dt><dd>{g.blockedBy}</dd></div>}
    {g.dependsOn&&<div><dt>Depends on</dt><dd>{g.dependsOn.map(d=><a key={d} href={'#'+d}>{d} </a>)}</dd></div>}
    <div><dt>Next action</dt><dd>{g.nextAction}</dd></div>
    <div><dt>Expected value</dt><dd>{g.value}</dd></div>
    <div><dt>Accountable owners</dt><dd>Science: {g.scientificOwner} · Technical: {g.technicalOwner} <small className="muted">(roles; no person assigned yet)</small></dd></div>
   </dl>
  </article>)}</div>
 </Panel>;
}

/* Overview summary: a few stages, both axes, linking to the full funnel. */
export function ReadinessGlance({data}:{data:Snapshot}){
 const stages=funnel(data.tables,data.feed).filter(s=>['a','b','d','f','i','k'].includes(s.key));
 return <Panel title="Research readiness at a glance" eyebrow="OPERATIONAL WORK VS EVIDENCE THAT PASSED A GATE" action={<Link href="/statistics#stage-a">Full funnel</Link>}>
  <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Stage</th><th>Operational</th><th>Evidence</th></tr></thead><tbody>{stages.map(s=><tr key={s.key}><td><b>{s.key}.</b> {s.title}</td><td>{s.operational?`${s.operational.value}${s.operational.of!=null?' / '+s.operational.of:''}`:'–'}</td><td>{s.evidence.value}{s.evidence.of!=null?' / '+s.evidence.of:''}</td></tr>)}</tbody></table></div>
  <p className="muted small">Operational counts are real work by machines or single passes; evidence counts only rows that passed a scientific gate. {stages.some(s=>!s.available)?'Some stages need sign-in to be computed from private records.':''}</p>
 </Panel>;
}

/* Amendment A1: autonomous research pipeline progress. Four axes kept apart; every number is a persisted row. */
const VARS:[string,string][]=[['V1','Identity'],['V2','Firsthand'],['V3','Authentic source'],['V4','Independent accounts'],['V5','Objective corroboration'],['V6','Investigation'],['V7','Conventional expl.']];
const verdictKey=(v:string)=>v==='YES'?'verified':v==='NO'?'negative':v==='CONFLICTED'?'excluded':'unknown';
export function AgentPipeline({data}:{data:Snapshot}){
 const p=data.agents;if(!p)return null;const t=p.table;const n=p.exploratoryEligible;
 const margins=[t.exposedOutcome+t.exposedNoOutcome,t.unexposedOutcome+t.unexposedNoOutcome,t.exposedOutcome+t.unexposedOutcome,t.exposedNoOutcome+t.unexposedNoOutcome];
 const estimable=n>=20&&margins.every(m=>m>0);
 const fisher=estimable?fisherExact([[t.exposedOutcome,t.exposedNoOutcome],[t.unexposedOutcome,t.unexposedNoOutcome]]):null;
 const axes:[string,[string,string|number][]][]=[
  ['Operational progress',[['Candidate incidents',p.candidates],['Incidents with retrieved sources',p.incidentsWithSources],['Source documents retrieved',p.sourcesRetrieved],['Quotes verified on the live page',`${p.quotesVerified} / ${p.quotesChecked}`],['Machine coder reviews',p.machineReviews],['Adversarial reviews',p.adversarialReviews]]],
  ['Scientific readiness',[['Incidents adjudicated by rules engine',p.adjudicated],...Object.entries(p.states).map(([k,v])=>[k.replace(/_/g,' ').toLowerCase(),v] as [string,number]),['Agent conflicts escalated',p.conflicts]]],
  ['Evidentiary confidence',[['Primary documents with verified quotes',p.primarySourcesVerified],['Exploratory-eligible (machine-adjudicated)',p.exploratoryEligible],['Human validations recorded',p.humanValidations],['Confirmatory-eligible (two humans)',p.confirmatoryEligible]]],
  ['Statistical power',[['Exploratory effective N',n],['Confirmatory effective N',p.confirmatoryEligible],['Planning target (independent / clustered)',`${targets().iid} / ${targets().clustered}`],['Exploratory test',estimable?'run':'not estimable (needs ≥20 and all margins > 0)']]]
 ];
 return <Panel title="Autonomous research pipeline" eyebrow="AMENDMENT A1 · MACHINE-ADJUDICATED EXPLORATORY STANDARD" action={<Badge tone="blue">Exploratory · not confirmatory</Badge>}>
  <p className="muted small">Source acquisition, two blinded machine coders, an adversarial reviewer and a deterministic rules engine. Machine adjudication never meets the confirmatory two-human standard, and agreement between machines is not inter-rater reliability. <a href="https://github.com/recaliendo/ET-Researcher-I.Q.App/blob/main/docs/PROTOCOL_AMENDMENT_v10.md">Protocol amendment A1</a></p>
  <div className="axes">{axes.map(([title,rows])=><section key={title}><h3>{title}</h3><dl>{rows.map(([k,v])=><div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl></section>)}</div>
  <h3>Exploratory RQ1 table (machine-adjudicated incidents only)</h3>
  <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Exposure (V4) \ Outcome (V5)</th><th>Corroborated</th><th>Not corroborated</th></tr></thead><tbody><tr><td>Independent accounts</td><td>{t.exposedOutcome}</td><td>{t.exposedNoOutcome}</td></tr><tr><td>No independent accounts</td><td>{t.unexposedOutcome}</td><td>{t.unexposedNoOutcome}</td></tr></tbody></table></div>
  <Note tone={estimable?'success':'warning'}>{estimable?`Exploratory Fisher exact p = ${fisher!.p.toFixed(4)} (n = ${n}). Hypothesis-generating only.`:`Not estimable: ${n} exploratory-eligible ${n===1?'incident':'incidents'}. The pre-specified minimum is 20 with every margin above zero. No p-value is issued.`}</Note>
  <p className="muted small">Machine–machine agreement on {p.agreement.n} variable codings: {p.agreement.observed==null?'—':pct(p.agreement.observed*100,100)} identical{p.agreement.kappa==null?'':`, κ = ${p.agreement.kappa.toFixed(2)}`}. This measures consistency between two model runs, not accuracy.</p>
  {p.incidents.length>0&&<details><summary>Per-incident adjudication ({p.incidents.length})</summary><div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Incident</th><th>State</th>{VARS.map(([c,l])=><th key={c} title={l}>{c}</th>)}<th>Eligibility and reasons</th></tr></thead><tbody>{p.incidents.map(i=><tr key={i.id}><td><a href={'/cases/'+i.id}>{i.id}</a></td><td><small>{i.state.replace(/_/g,' ').toLowerCase()}</small></td>{VARS.map(([c])=>{const v=i.variables[c];return <td key={c} title={`A: ${v?.a} · B: ${v?.b}${v?.rejected?' · rejected: '+v.rejected:''}`}><Status k={verdictKey(v?.value||'UNKNOWN')}>{v?.value||'—'}</Status></td>;})}<td><small>{i.exploratory?'Exploratory-eligible. ':''}{i.reasons.join(' ')}</small></td></tr>)}</tbody></table></div><p className="muted small">Hover a value to see coder A, coder B and any adversarial rejection. Variables: {VARS.map(([c,l])=>`${c} ${l}`).join(' · ')}.</p></details>}
  {p.failures.length>0&&<Note tone="warning">Processing failures: {p.failures.map(f=>`${f.incident_id}: ${f.last_error}`).join('; ')}</Note>}
 </Panel>;
}

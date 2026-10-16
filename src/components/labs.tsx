'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Download,FlaskConical,Lock,RotateCcw} from 'lucide-react';
import type {Snapshot} from './observatory';
import {Badge,Empty,More,Note,Panel,RecordList,SectionHeader,SourceLink,download,post} from './ui';
import {theories,codingVariables,isUnknown,pdf,sdt} from '@/lib/psychology';
import {contingency,historical,historicalTable,verified,reproduces,residuals,leaveOneOut,wilson,fisherExact,requiredN,effectiveWitnesses} from '@/lib/statistics';
import {sixStage,eightStage,presets6,presets8,chain,mostLeveraged,socialVariables} from '@/lib/proof';
import {sprintProgress,EXTRACTION,LAB} from '@/lib/progress';

const pct=(x:number,d=1)=>(x*100).toFixed(d)+'%';
const superscript:Record<string,string>={'-':'⁻','+':'','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const sci=(x:number)=>{if(x>=1e-4)return x.toFixed(4);const [m,e]=x.toExponential(4).split('e');return `${m}×10${[...e].map(c=>superscript[c]??c).join('')}`;};
function Label({kind}:{kind:'real'|'educational'|'illustrative'}){return kind==='real'?<Badge tone="green">Research result · v0.8</Badge>:kind==='educational'?<Badge tone="blue">Educational demonstration</Badge>:<Badge tone="amber">Illustrative scenario · not evidence</Badge>;}

/* ───────────── Psychology & Human Perception Lab ───────────── */
export function Psychology({data}:{data:Snapshot}){
 const t=data.tables;const [open,setOpen]=useState(theories[0].id);const theory=theories.find(x=>x.id===open)!;
 const map=(t.Cognitive_Theory_Map||[]).filter(r=>theory.psy.includes(r.TheoryID));
 const coding=t.Cognitive_Claim_Coding||[];
 const linked=coding.filter(r=>theory.psy.some(p=>(r['Theory IDs']||'').includes(p)));
 return <>
  <SectionHeader label="RESEARCH / PSYCHOLOGY & PERCEPTION" title="How people see, remember and report." description="Perception and memory science applied to testimony as research variables, never as a diagnosis of any witness."/>
  <Note>Identifying a cognitive mechanism that <em>could</em> affect an account does not show that it <em>did</em>. Each theory below names the record a researcher would need before applying it to a real case.</Note>
  <div className="lab-layout">
   <nav className="theory-index" aria-label="Theories">{theories.map(x=><button key={x.id} className={x.id===open?'selected':''} aria-pressed={x.id===open} onClick={()=>setOpen(x.id)}><span>{x.psy.join(' · ')||'Source reference'}</span>{x.name}</button>)}</nav>
   <article className="panel theory-detail">
    <div className="eyebrow">{theory.psy.join(' · ')||'SOURCE REFERENCE · NOT YET CODED'}</div><h2>{theory.name}</h2>
    <p className="large-text">{theory.plain}</p>
    <div className="theory-grid">
     <section><h3>Scientific context</h3><p>{theory.context}</p></section>
     <section><h3>Relevance to UAP testimony</h3><p>{theory.relevance}</p></section>
     <section><h3>Measurable research variables</h3><ul>{theory.variables.map(v=><li key={v}>{v}</li>)}</ul></section>
     <section><h3>Limits on application</h3><p>{theory.limits}</p></section>
    </div>
    <h3>Original studies</h3>{theory.references.map(r=><p className="reference" key={r.citation}>{r.citation} {r.doi&&<SourceLink href={'https://doi.org/'+r.doi}>doi:{r.doi}</SourceLink>}</p>)}
    <h3>Project codebook mapping</h3>{map.length?map.map(r=><div className="citation" key={r.TheoryID}><strong>{r.TheoryID} · {r['Source principle']}</strong><p>Construct: {r['Potential measurement construct']}. Extract: {r['Data to extract']}.</p><p className="muted">Guardrail: {r['Validity guardrail']}</p></div>):<p className="muted">{theory.psy.length?'Sign in to view the private project codebook mapping.':'Not yet in the project codebook. Adding it needs a PSY code, measurement construct and validity guardrail.'}</p>}
    <h3>Examples from the dataset</h3>{linked.length?<p>{linked.length} coded claims are tagged with this theory, but their first-statement fields are not yet extracted, so no source-supported example can be shown. <Link href="/cases">Inspect the claims</Link></p>:<p className="muted">No source-supported example in the accessible corpus.</p>}
   </article>
  </div>
  <div className="two-columns"><SdtDemo/><IndependenceDemo/></div>
  <WitnessIndependence data={data}/>
  <Panel title="What the claim records actually contain" eyebrow="CODING COMPLETENESS · REAL DATA" action={<Label kind="real"/>}>
   {coding.length?<><p className="muted small">Share of the {coding.length} imported claim rows with a documented value for each cognitive variable. Unknown stays unknown; nothing is imputed.</p><div className="bars">{codingVariables.map(v=>{const known=coding.filter(r=>!isUnknown(r[v])).length;const ai=(t[EXTRACTION]||[]).filter(r=>v in r&&!isUnknown(r[v])&&!/^unknown|^not (found|extracted)/i.test(r[v])).length;return <div className="bar-row" key={v}><span>{v}</span><div className="bar-track stacked" role="img" aria-label={`${v}: ${known} human-coded and ${ai} AI-extracted of ${coding.length}`}><div className="bar-fill" style={{width:pct(known/coding.length)}}/><div className="bar-fill ai" style={{width:pct(Math.min(ai,coding.length-known)/coding.length)}}/></div><b>{known}{ai?<small className="ai-count"> +{ai}</small>:null}/{coding.length}</b></div>;})}</div>{(t[EXTRACTION]||[]).length>0&&<p className="legend small"><span className="swatch"/> human-coded (v0.8) <span className="swatch ai"/> AI-extracted from cited public sources (v09, awaiting second human coder; not counted as coded)</p>}<Note tone="warning">RQ2 (does agreement survive memory and contamination controls?) remains BLOCKED until these fields are extracted from original statements.</Note></>:<Empty>Sign in to view claim-level coding coverage.</Empty>}
  </Panel>
 </>;
}
function SdtDemo(){
 const [d,setD]=useState(1.5),[c,setC]=useState(.5);const {hit,falseAlarm}=sdt(d,c);
 const xs=Array.from({length:121},(_,i)=>-4+i*(8/120));const X=(x:number)=>20+(x+4)*45;const Y=(y:number)=>150-y*300;
 const curve=(mu:number)=>xs.map((x,i)=>`${i?'L':'M'}${X(x).toFixed(1)},${Y(pdf(x,mu)).toFixed(1)}`).join(' ');
 return <Panel title="Seeing versus saying “yes”" eyebrow="SIGNAL DETECTION" action={<Label kind="educational"/>}>
  <p className="muted small">Two overlapping distributions: ordinary objects (noise) and the thing being looked for (signal). Move the sliders to see how viewing conditions and willingness to report change hits and false alarms.</p>
  <svg viewBox="0 0 400 170" className="chart" role="img" aria-label={`Hit rate ${pct(hit)}, false alarm rate ${pct(falseAlarm)}`}><path d={curve(-d/2)} className="curve-noise"/><path d={curve(d/2)} className="curve-signal"/><line x1={X(c)} x2={X(c)} y1="20" y2="155" className="criterion"/><text x={X(c)+4} y="30" className="chart-label">report “yes” →</text><text x="24" y="166" className="chart-label">ordinary</text><text x="330" y="166" className="chart-label">target</text></svg>
  <label className="slider">Viewing conditions (d′ = {d.toFixed(1)})<input type="range" min="0" max="4" step=".1" value={d} onChange={e=>setD(+e.target.value)}/></label>
  <label className="slider">Reporting threshold (criterion = {c.toFixed(1)})<input type="range" min="-2" max="2.5" step=".1" value={c} onChange={e=>setC(+e.target.value)}/></label>
  <div className="stat-pair"><div><strong>{pct(hit)}</strong><span>targets reported</span></div><div><strong>{pct(falseAlarm)}</strong><span>ordinary objects reported</span></div></div>
 </Panel>;
}
function IndependenceDemo(){
 const [n,setN]=useState(6),[rho,setRho]=useState(.3);const eff=effectiveWitnesses(n,rho);
 return <Panel title="Why more witnesses is not more evidence" eyebrow="WITNESS INDEPENDENCE" action={<Label kind="educational"/>}>
  <p className="muted small">If witnesses share information before their first statements, their accounts overlap. The effective number of independent accounts shrinks as sharing (ρ) grows.</p>
  <div className="dots" role="img" aria-label={`${n} witnesses equal about ${eff.toFixed(1)} independent accounts`}>{Array.from({length:n},(_,i)=><span key={i} className={i<Math.round(eff)?'dot solid':'dot'}/>)}</div>
  <label className="slider">Witnesses reporting ({n})<input type="range" min="1" max="20" value={n} onChange={e=>setN(+e.target.value)}/></label>
  <label className="slider">Information sharing before first statement (ρ = {rho.toFixed(2)})<input type="range" min="0" max="1" step=".05" value={rho} onChange={e=>setRho(+e.target.value)}/></label>
  <div className="stat-pair"><div><strong>{n}</strong><span>named witnesses</span></div><div><strong>{eff.toFixed(1)}</strong><span>effective independent accounts</span></div></div>
  <p className="muted small">Formula: n ÷ (1 + (n − 1)ρ). Real ρ is unknown for every case in the corpus.</p>
 </Panel>;
}
function WitnessIndependence({data}:{data:Snapshot}){
 const links=data.tables.Witness_Dependency_v08||[];const events=[...new Set(links.map(l=>l.EventID))];const [event,setEvent]=useState('');const active=event||events[0];
 const rows=links.filter(l=>l.EventID===active);const known=(v?:string)=>!isUnknown(v)&&!/not (documented|established|located)/i.test(v||'');
 return <Panel title="Witness-independence evaluation" eyebrow="DOCUMENTED FIRST STATEMENTS VS LATER SHARING" action={<Label kind="real"/>}>
  {!links.length?<Empty>Sign in to evaluate witness pairs from the private corpus.</Empty>:<>
   <label className="inline-select">Event <select value={active} onChange={e=>setEvent(e.target.value)}>{events.map(e=><option key={e}>{e}</option>)}</select></label>
   <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Pair</th><th>Shared assertion</th><th>First statement A</th><th>First statement B</th><th>Contact before first report</th><th>Independence proven</th><th>Next original record</th></tr></thead><tbody>{rows.map(r=><tr key={r.LinkID}><td>{r.LinkID}<br/><small>{r['Witness A']} ↔ {r['Witness B']}</small></td><td>{r['Shared assertion']}</td><td><Status ok={known(r['First statement A date'])} text={r['First statement A date']}/></td><td><Status ok={known(r['First statement B date'])} text={r['First statement B date']}/></td><td>{r['Pre-first-report contact']}</td><td><Badge tone={/^yes/i.test(r['Independence proven'])?'green':'amber'}>{r['Independence proven']}</Badge></td><td>{r['Next original record']}</td></tr>)}</tbody></table></div>
   <p className="muted small">A pair counts as independent only when both first statements are documented and no contact before the first report is shown. <More href={'/cases/'+active}>Open the case</More></p></>}
 </Panel>;
}
function Status({ok,text}:{ok:boolean;text?:string}){return <span className={ok?'status-ok':'status-gap'}>{ok?'':'⚠ '}{text||'Not recorded'}</span>;}

/* ───────────── Statistical Research Lab ───────────── */
export function StatisticsLab({data}:{data:Snapshot}){
 const t=data.tables;const table=historicalTable();const result=useMemo(()=>contingency(table),[]);const ok=reproduces(result);const res=residuals(table);
 const sens=leaveOneOut(table,historical.periods);const eligibility=t.Statistical_Eligibility_v06||[];
 const reasons=Object.entries(eligibility.reduce<Record<string,number>>((a,r)=>{const k=r['Inferential inclusion reason']||'Not recorded';a[k]=(a[k]||0)+1;return a;},{}));
 return <>
  <SectionHeader label="RESEARCH / STATISTICAL LAB" title="Show the numbers. Show their limits." description="Live, reproducible calculations on the actual published counts, kept apart from educational sandboxes and blocked analyses."/>
  <div className="rq-status"><article className="panel blocked-card"><Lock size={20}/><div><div className="eyebrow">PRIMARY TEST · RQ1 · PROTOCOL STATUS: BLOCKED</div><h2>Not yet testable</h2><p>Does separately acquired firsthand testimony predict independently authenticated objective corroboration? No event-level table of independent first statements against authenticated corroboration exists. No p-value is issued.</p><RQ1Progress data={data}/></div></article>
   <article className="panel"><div className="eyebrow">SECONDARY TEST · EXECUTED</div><h2>GEIPAN era × category D</h2><p>An association between the decade of investigation and whether GEIPAN classified a case as D (unexplained after investigation). It describes classification history, not extraterrestrial likelihood.</p></article></div>
  <Panel title="Verified result: historical GEIPAN classification by era" eyebrow="SECONDARY · EXPLORATORY REANALYSIS" action={<Label kind="real"/>}>
   <div className="result-strip">{[['n',verified.n.toLocaleString()],['Pearson χ²('+result.df+')',result.chi2.toFixed(2)],['p',sci(result.p)],['Cramér’s V',result.v.toFixed(3)],['Bootstrap 95% CI for V',verified.bootstrapCI.map(x=>x.toFixed(3)).join('–')]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
   <Note tone={ok?'success':'warning'}>{ok?'✓ Recomputed live in this browser and matches the v0.8 package (χ² = 77.81085, p = 1.0113×10⁻¹⁴, V = 0.19879).':'The live calculation does not match the package values. Treat this result as unverified.'} The bootstrap interval comes from the package’s Python run ({verified.bootstrapResamples.toLocaleString()} resamples, seed {verified.seed}).</Note>
   <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Period</th><th>Total</th><th>D observed</th><th>D expected</th><th>Non-D observed</th><th>Non-D expected</th><th>D residual</th><th>D share (95% Wilson CI)</th></tr></thead><tbody>{table.map((r,i)=>{const [lo,hi]=wilson(r[0],r[0]+r[1]);return <tr key={i}><td>{historical.periods[i]}</td><td>{r[0]+r[1]}</td><td>{r[0]}</td><td>{result.expected[i][0].toFixed(1)}</td><td>{r[1]}</td><td>{result.expected[i][1].toFixed(1)}</td><td className={Math.abs(res[i][0])>2?'strong':''}>{res[i][0].toFixed(2)}</td><td>{pct(r[0]/(r[0]+r[1]))} ({pct(lo)}–{pct(hi)})</td></tr>;})}</tbody></table></div>
   <EraChart table={table}/>
   <div className="theory-grid"><section><h3>Assumptions checked</h3><ul><li>Minimum expected cell {result.minimumExpected.toFixed(2)} (&gt; 5)</li><li>Each case counted once in the original paper</li><li>No continuity correction (7×2 table)</li></ul></section><section><h3>Interpretation</h3><p>V ≈ 0.2 is a small-to-moderate association. Later eras have fewer D classifications, consistent with changing investigation methods and definitions (gap G009). It is not causation and not a measure of extraterrestrial likelihood.</p></section><section><h3>C is not D</h3><p>GEIPAN category C means <em>insufficient information</em> to conclude. Category D means <em>unexplained after investigation</em> with adequate data. This table compares D against all non-D (A, B and C together). It never merges C into D.</p></section></div>
   <div className="button-row"><button className="button" onClick={()=>download('geipan-era-v08-reanalysis.json',{source:verified.source,periods:historical.periods,table,result,residuals:res,verifiedAgainst:verified,reproduced:ok,generated:new Date().toISOString(),caution:'Secondary classification-process association; not ET likelihood.'})}><Download size={15}/> Export calculation</button><SourceLink href={verified.source}>Laurent et al. source table</SourceLink></div>
  </Panel>
  <Panel title="Sensitivity: drop one era at a time" eyebrow="ROBUSTNESS" action={<Label kind="real"/>}>
   <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Era omitted</th><th>n</th><th>χ²</th><th>df</th><th>p</th><th>V</th></tr></thead><tbody>{sens.map(s=><tr key={s.omitted}><td>{s.omitted}</td><td>{s.n}</td><td>{s.chi2.toFixed(2)}</td><td>{s.df}</td><td>{sci(s.p)}</td><td>{s.v.toFixed(3)}</td></tr>)}</tbody></table></div>
   <p className="muted small">The association persists after omitting any single era, so no one decade drives it alone. It does not rule out definitional changes across eras.</p>
  </Panel>
  <div className="two-columns"><Panel title="Dataset eligibility for the primary test" eyebrow="RQ1 · INCLUSION AND EXCLUSION" action={<Label kind="real"/>}>{reasons.length?<><div className="bars">{reasons.map(([k,v])=><div className="bar-row" key={k}><span>{k}</span><div className="bar-track"><div className="bar-fill amber" style={{width:pct(v/eligibility.length)}}/></div><b>{v}</b></div>)}</div><p className="muted small">{eligibility.length} core events screened; eligible 2×2 rows: 0. Unknown evidence is not treated as absent evidence.</p></>:<Empty>Sign in to view eligibility records.</Empty>}</Panel>
   <Panel title="Blocked analyses" eyebrow="NOT RUN, WITH REASONS">{(t.Blocked_Tests_v03||[]).length?<RecordList rows={t.Blocked_Tests_v03} titleKey="Analysis"/>:<Empty>Sign in to view blocked-analysis records.</Empty>}</Panel></div>
  <div className="two-columns"><PowerPlanner rows={t.Power_v08||[]}/><Sandbox/></div>
 </>;
}
function RQ1Progress({data}:{data:Snapshot}){
 const p=sprintProgress(data.tables);const n=requiredN(.2,.8);
 return <div className="progress-lines"><div><span>Eligible independent incidents</span><b>0 / {n}</b></div><div className="bar-track"><div className="bar-fill amber" style={{width:'0.5%'}}/></div>{p.available&&<><div><span>Seed claims with located first statement (AI, unreviewed)</span><b>{p.summary.located} / {p.summary.claims}</b></div><div className="bar-track"><div className="bar-fill ai" style={{width:pct(p.summary.located/Math.max(1,p.summary.claims))}}/></div><div><span>Human-adjudicated</span><b>{p.summary.reviewed} / {p.summary.claims}</b></div></>}<p className="muted small">Unblocks when ≥100 incidents are fully adjudicated by two blinded coders (roadmap Phases 2–5), then ≈{n} for 80% power at w = 0.2.</p></div>;
}
function EraChart({table}:{table:number[][]}){
 const w=56,max=.6;return <figure className="chart-figure"><svg viewBox="0 0 440 200" className="chart" role="img" aria-label="Share of cases classified D by era, declining after 1999">{table.map((r,i)=>{const p=r[0]/(r[0]+r[1]);const [lo,hi]=wilson(r[0],r[0]+r[1]);const x=30+i*w,y=(v:number)=>170-v/max*150;return <g key={i}><rect x={x} y={y(p)} width={w-18} height={170-y(p)} className="bar"/><line x1={x+(w-18)/2} x2={x+(w-18)/2} y1={y(hi)} y2={y(lo)} className="whisker"/><text x={x+(w-18)/2} y="186" className="chart-label" textAnchor="middle">{historical.periods[i].slice(0,4)}s</text><text x={x+(w-18)/2} y={y(hi)-4} className="chart-label" textAnchor="middle">{Math.round(p*100)}%</text></g>;})}<line x1="24" x2="430" y1="170" y2="170" className="axis"/></svg><figcaption>Share classified D by era, with 95% Wilson intervals. Small early samples (n = 34, 32) have wide intervals.</figcaption></figure>;
}
function PowerPlanner({rows}:{rows:Record<string,string>[]}){
 const [w,setW]=useState(.2),[power,setPower]=useState(.8),[deff,setDeff]=useState(1.4);const n=requiredN(w,power);
 return <Panel title="Power planning for a future 2×2 study" eyebrow="STATISTICAL POWER" action={<Label kind="educational"/>}>
  <label className="slider">Effect size w = {w.toFixed(2)}<input type="range" min=".05" max=".5" step=".01" value={w} onChange={e=>setW(+e.target.value)}/></label>
  <label className="slider">Target power = {power.toFixed(2)}<input type="range" min=".6" max=".95" step=".05" value={power} onChange={e=>setPower(+e.target.value)}/></label>
  <label className="slider">Design effect for clustered witnesses = {deff.toFixed(1)}<input type="range" min="1" max="3" step=".1" value={deff} onChange={e=>setDeff(+e.target.value)}/></label>
  <div className="stat-pair"><div><strong>{n.toLocaleString()}</strong><span>independent incidents</span></div><div><strong>{Math.ceil(n*deff).toLocaleString()}</strong><span>after clustering adjustment</span></div></div>
  <p className="muted small">α = 0.05, df = 1. {rows.length?`Package table check: w = 0.2, power 0.8 → ${rows.find(r=>r['Cohen w']==='0.2'&&r['Target power']==='0.8')?.['IID incidents']||'—'} incidents.`:''} The current eligible sample is zero.</p>
 </Panel>;
}
function Sandbox(){
 const [rows,setRows]=useState([[12,8],[5,15]]);const [server,setServer]=useState<any>(null),[err,setErr]=useState('');
 let local:ReturnType<typeof contingency>|null=null,fisher:ReturnType<typeof fisherExact>|null=null;try{local=contingency(rows);if(rows.length===2)fisher=fisherExact(rows);}catch{}
 const set=(i:number,j:number,v:string)=>{const next=rows.map(r=>[...r]);next[i][j]=Math.max(0,Math.floor(+v||0));setRows(next);setServer(null);};
 return <Panel title="Contingency-table sandbox" eyebrow="HYPOTHETICAL COUNTS" action={<Label kind="educational"/>}>
  <p className="muted small">Enter hypothetical counts to see how χ², expected counts and Fisher’s exact test behave. Nothing entered here is research data.</p>
  <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table className="input-table"><thead><tr><th>Row</th><th>Outcome A</th><th>Outcome B</th><th/></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>Group {i+1}</td>{r.map((v,j)=><td key={j}><input aria-label={`Group ${i+1} outcome ${j?'B':'A'}`} type="number" min="0" value={v} onChange={e=>set(i,j,e.target.value)}/></td>)}<td>{rows.length>2&&<button className="icon-button" aria-label="Remove row" onClick={()=>setRows(rows.filter((_,k)=>k!==i))}>×</button>}</td></tr>)}</tbody></table></div>
  <div className="button-row"><button className="button" onClick={()=>setRows([...rows,[5,5]])} disabled={rows.length>=8}>Add row</button><button className="button" onClick={()=>setRows([[12,8],[5,15]])}><RotateCcw size={14}/> Reset</button><button className="button primary" onClick={async()=>{try{setErr('');setServer(await post('analysis',{table:rows,mode:'educational'}));}catch(e){setErr(String(e));}}}><FlaskConical size={14}/> Run on server</button></div>
  {local?<div className="stat-grid"><div><span>χ²({local.df})</span><strong>{local.chi2.toFixed(3)}</strong></div><div><span>p</span><strong>{sci(local.p)}</strong></div><div><span>Cramér’s V</span><strong>{local.v.toFixed(3)}</strong></div><div><span>Min expected</span><strong className={local.minimumExpected<5?'warn':''}>{local.minimumExpected.toFixed(2)}</strong></div>{fisher&&<div><span>Fisher exact p</span><strong>{sci(fisher.p)}</strong></div>}</div>:<Note tone="warning">Every row and column needs a positive total.</Note>}
  {local&&local.minimumExpected<5&&<Note tone="warning">An expected count is below 5; prefer Fisher’s exact test for a 2×2 table.</Note>}
  {server&&<p className="muted small">Server result: χ² = {Number(server.chi2).toFixed(3)}, p = {sci(Number(server.p))}. {server.warning}</p>}{err&&<Note tone="warning">{err}</Note>}
 </Panel>;
}

/* ───────────── Evidence Protection & Proof Hypothesis ───────────── */
export function ProofLab({data}:{data?:Snapshot}){
 const [model,setModel]=useState<'six'|'eight'>('six'),[path,setPath]=useState<'technology'|'biology'>('technology');
 const stages=model==='six'?sixStage:eightStage,presets=model==='six'?presets6:presets8;
 const [values,setValues]=useState<number[]>(presets6[1].values);
 const switchModel=(m:'six'|'eight')=>{setModel(m);setValues((m==='six'?presets6:presets8)[1].values);};
 const cumulative=chain(values),final=cumulative.at(-1)!,lever=mostLeveraged(values);
 return <>
  <SectionHeader label="RESEARCH / EVIDENCE PROTECTION & PROOF" title="Was it here, or can we prove it now?" description="Two different questions. This module models only the second: the chance that investigators could find, access, preserve, authenticate and replicate proof if an authentic item had existed."/>
  <Note tone="warning"><strong>Every percentage on this page is an adjustable scenario input.</strong> None is measured. The combined figure is scenario arithmetic, not the probability that extraterrestrial technology or biology was ever on Earth, and 100% minus it is not a probability of non-visitation.</Note>
  <div className="toolbar"><div className="segmented" role="group" aria-label="Model">{([['six','v01 six-stage model'],['eight','Expanded eight-stage model']] as const).map(([id,l])=><button key={id} className={model===id?'selected':''} aria-pressed={model===id} onClick={()=>switchModel(id)}>{l}</button>)}</div><div className="segmented" role="group" aria-label="Evidence pathway">{([['technology','Technology pathway'],['biology','Biological-material pathway']] as const).map(([id,l])=><button key={id} className={path===id?'selected':''} aria-pressed={path===id} onClick={()=>setPath(id)}>{l}</button>)}</div></div>
  <div className="proof-layout"><Panel title="Conditional stage success rates" eyebrow="SCENARIO INPUTS" action={<Label kind="illustrative"/>}>
   <div className="button-row">{presets.map(p=><button key={p.name} className="button" onClick={()=>setValues(p.values)}>{p.name}</button>)}</div>
   {stages.map((s,i)=><div className="stage" key={s.id}><label className="slider"><span><b>{i+1}. {s.label}</b> — {values[i]}% <small>given all earlier stages succeeded</small></span><input type="range" min="0" max="100" value={values[i]} onChange={e=>{const next=[...values];next[i]=+e.target.value;setValues(next);}}/></label><p className="muted small">{s.question} <em>{path==='technology'?s.technology:s.biology}</em></p></div>)}
  </Panel>
  <Panel title="Scenario arithmetic" eyebrow="CHAIN RULE · NOT EVIDENCE">
   <div className="proof-total"><span>Combined conditional rate (illustrative)</span><strong>{final<.001?(final*100).toFixed(4):(final*100).toFixed(2)}%</strong></div>
   <svg viewBox={`0 0 320 ${stages.length*34+10}`} className="chart" role="img" aria-label="Cumulative scenario rate after each stage">{cumulative.map((v,i)=><g key={i}><text x="0" y={i*34+22} className="chart-label">{stages[i].label.split(' ')[0]}</text><rect x="110" y={i*34+8} width="200" height="18" className="track"/><rect x="110" y={i*34+8} width={Math.max(1,200*v)} height="18" className="bar"/><text x="314" y={i*34+22} className="chart-label" textAnchor="end">{pct(v,v<.01?3:1)}</text></g>)}</svg>
   <p className="small">Raising <b>{stages[lever.index].label}</b> by 10 points changes this scenario most. That identifies a stage worth <em>measuring</em>, not a fact about any case.</p>
   <p className="muted small">P(all stages | an authentic item existed) = P(S) × P(L|S) × … Each factor is conditional on earlier stages, so stages need not be independent. None has been estimated empirically.</p>
  </Panel></div>
  <ObservedStages rows={data?.tables[LAB]||[]}/>
  <div className="two-columns"><Panel title="Social and institutional hypotheses" eyebrow="HYPOTHESES REQUIRING EVIDENCE"><div className="hypothesis-list">{socialVariables.map(v=><div key={v.name}><h3>{v.name}</h3><p>{v.prediction}</p><p className="muted small">Test: {v.test}</p></div>)}</div><p className="muted small">These are testable hypotheses, not presumed explanations of any case.</p></Panel>
   <Panel title="Roadmap: replacing assumptions with measurements" eyebrow="PRE-SPECIFIED PILOT"><ol className="roadmap"><li><b>Sample.</b> Draw about 100 independently identifiable material-claim cases from official archives, matched with conventionally resolved records.</li><li><b>Code stages.</b> Record each stage as demonstrated, failed after adequate inquiry, restricted, lost or unknown, with exact source and date.</li><li><b>Dual coding.</b> Two blind coders; measure agreement before adjudication.</li><li><b>Estimate.</b> Stage-specific conditional success proportions with intervals and conservative missingness bounds, clustered by source network.</li><li><b>Compare.</b> Pre-specified non-ET control objects; prospective artifacts to measure change.</li></ol><Note>The GEIPAN chi-square result does not evaluate this hypothesis.</Note><More href="/priorities">See related research tasks</More></Panel></div>
  <Panel title="Separate evidence pathways" eyebrow="DISTINCT EXPERIMENTS"><div className="pathways"><div><h3>Observation → instrumentation</h3><p>Independent original reports plus raw, calibrated multisensor data can establish that something objectively unusual happened. On its own it cannot answer the recovery question.</p></div><div><h3>Observation → recovery → object → custody → laboratory</h3><p>Requires a uniquely identified surviving item, an unbroken custody chain and independent, replicated diagnostic results. Unusual composition alone does not establish non-human manufacture.</p></div></div></Panel>
 </>;
}

function ObservedStages({rows}:{rows:Record<string,string>[]}){
 const tested=rows.filter(r=>/done/i.test(r['Proof-chain stages']||''));
 if(!rows.length)return null;
 return <Panel title="Observed stage outcomes from real cases" eyebrow="FIRST EMPIRICAL STAGE RECORDS · V09" action={<Label kind="real"/>}>
  <p className="muted small">The scenario above is arithmetic. These are documented outcomes for actual candidates, the kind of records the roadmap needs to replace assumptions. With {tested.length} tested {tested.length===1?'candidate':'candidates'}, they are case records, not a rate.</p>
  <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table><thead><tr><th>Candidate</th><th>Stage outcomes</th><th>Laboratory result</th><th>Custody</th><th>Source tier</th></tr></thead><tbody>{rows.map(r=><tr key={r._recordId||r.Candidate}><td><b>{r.Candidate}</b><br/><small>{r.Laboratory}</small></td><td>{r['Proof-chain stages']}</td><td>{r.Result}</td><td>{r.Custody}</td><td><small>{r['Source tier']}</small><br/><SourceLink href={r.Sources}/></td></tr>)}</tbody></table></div>
  <Note>Both tested magnesium specimens failed at custody (C) and produced terrestrial or inconclusive diagnostics (D). That shows where real chains break; it is not an estimate of how often authentic material would survive.</Note>
 </Panel>;
}

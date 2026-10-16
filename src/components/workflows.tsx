'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Bell,Bot,Download,RefreshCw,Send,X} from 'lucide-react';
import type {FeedItem,Snapshot} from './observatory';
import {Badge,Empty,Fields,More,Note,Panel,RecordList,SectionHeader,SourceLink,download,post} from './ui';
import {taskStates,type ResearchRow} from '@/lib/research-types';
import {roadmap,recruitment,guardrails,mars} from '@/lib/handoff';
import {sprintProgress} from '@/lib/progress';

const date=(s?:string|null)=>s?new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Not stated';
const time=(s?:string|null)=>s?new Date(s).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Never';
const editor=(role:string)=>role==='editor'||role==='admin';
const param=(k:string)=>typeof window==='undefined'?null:new URLSearchParams(window.location.search).get(k);

/* ───────────── Live Intelligence Feed ───────────── */
const categories=['all','official reports','scientific findings','hearings','sightings','testimony','physical evidence','news','corrections'];
export function Feed({data,reload}:{data:Snapshot;reload:()=>void}){
 const [cat,setCat]=useState('all'),[status,setStatus]=useState('all'),[q,setQ]=useState('');
 const items=data.feed.filter(f=>(cat==='all'||f.category===cat)&&(status==='all'||f.status===status)&&(f.title+' '+f.publisher).toLowerCase().includes(q.toLowerCase()));
 const counts=Object.fromEntries(categories.map(c=>[c,c==='all'?data.feed.length:data.feed.filter(f=>f.category===c).length]));
 return <>
  <SectionHeader label="RESEARCH / LIVE INTELLIGENCE" title="New information, kept in its place." description="Scheduled retrieval from permitted public sources. Newly reported is not newly verified, and a repeated report is never counted as independent corroboration."/>
  <div className="provider-strip">{data.providers.map(p=><div key={p.id} className="provider-chip"><span className={'health '+(p.last_error?'bad':p.last_success?'good':'idle')} aria-hidden="true"/><div><b>{p.name}</b><small>{p.last_error?`Failed: ${p.last_error}`:p.last_success?`Synced ${time(p.last_success)}`:'Not yet synced'} · every {Math.round(p.cadence_minutes/60)} h</small></div></div>)}</div>
  <div className="toolbar"><div className="chip-row" role="group" aria-label="Filter by category">{categories.map(c=><button key={c} className={'chip '+(cat===c?'selected':'')} aria-pressed={cat===c} onClick={()=>setCat(c)}>{c} <span>{counts[c]}</span></button>)}</div>
   <select aria-label="Filter by review status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All review states</option><option value="pending">Analyst review pending</option><option value="reviewed">Reviewed</option><option value="corrected">Corrected</option><option value="retracted">Retracted</option><option value="rejected">Rejected</option></select>
   <label className="search-input"><input aria-label="Search the feed" placeholder="Search headlines or publishers…" value={q} onChange={e=>setQ(e.target.value)}/></label></div>
  {!data.feed.length?<Empty>No items yet. {data.role==='public'?'Public visitors see items only after analyst review.':'Run ingestion from the operations view.'}</Empty>:!items.length?<Empty>No items match these filters.</Empty>:<div className="feed-list">{items.map(f=><FeedCard key={f.id} item={f} role={data.role} reload={reload}/>)}</div>}
  <Notifications/>
 </>;
}
function FeedCard({item:f,role,reload}:{item:FeedItem;role:string;reload:()=>void}){
 const [open,setOpen]=useState(false),[decision,setDecision]=useState('reviewed'),[why,setWhy]=useState(''),[err,setErr]=useState('');
 return <article className="feed-card">
  <div className="feed-meta"><Badge>{f.category}</Badge><Badge tone={f.status==='pending'?'amber':f.status==='retracted'||f.status==='rejected'?'red':'green'}>{f.status==='pending'?'Analyst review pending':f.status}</Badge><span>{f.publisher}</span><span>Published {date(f.published_at)}</span><span>Ingested {date(f.ingested_at)}</span></div>
  <h2><a href={f.canonical_url} target="_blank" rel="noopener noreferrer">{f.title}</a></h2>
  <p>{f.summary}</p>
  <dl className="feed-facts"><div><dt>What’s new</dt><dd>{f.novelty}</dd></div><div><dt>Research significance</dt><dd>{f.significance}</dd></div><div><dt>Contradictions</dt><dd>{f.contradictions}</dd></div><div><dt>Evidence status</dt><dd>{f.original_source_status}</dd></div><div><dt>Case associations</dt><dd>{f.incident_ids?.length?f.incident_ids.map(a=><Link key={a.id} href={'/cases/'+a.id}>{a.id} <small>({a.status})</small> </Link>):'None suggested'}</dd></div><div><dt>Summary method</dt><dd>{f.summary_method}</dd></div></dl>
  <div className="button-row"><SourceLink href={f.canonical_url}/>{editor(role)&&<button className="button" onClick={()=>setOpen(!open)}>{open?'Cancel review':'Review item'}</button>}</div>
  {open&&<form className="review-form" onSubmit={async e=>{e.preventDefault();try{await post('review',{id:f.id,decision,rationale:why});setOpen(false);reload();}catch(x){setErr(String(x));}}}>
   <label>Decision<select value={decision} onChange={e=>setDecision(e.target.value)}><option value="reviewed">Reviewed — publish as a lead</option><option value="corrected">Corrected</option><option value="retracted">Retracted</option><option value="rejected">Rejected — not relevant</option></select></label>
   <label>Rationale (recorded in the audit log)<textarea required minLength={20} value={why} onChange={e=>setWhy(e.target.value)} placeholder="What was checked against the original source, and why this decision?"/></label>
   <button className="button primary">Record decision</button>{err&&<Note tone="warning">{err}</Note>}</form>}
 </article>;
}
function Notifications(){
 const [subscriber,setSubscriber]=useState(''),[items,setItems]=useState<{id:string;message:string;canonical_url:string;created_at:string}[]>([]),[cat,setCat]=useState('all'),[msg,setMsg]=useState('');
 useEffect(()=>{let id='';try{id=localStorage.getItem('et-subscriber')||'';if(!id){id=crypto.randomUUID();localStorage.setItem('et-subscriber',id);}}catch{id=crypto.randomUUID();}setSubscriber(id);},[]);
 useEffect(()=>{if(subscriber)fetch('/api/notifications?subscriber='+subscriber).then(r=>r.ok?r.json():[]).then(setItems).catch(()=>{});},[subscriber]);
 return <Panel title="Research notifications" eyebrow="SUBSCRIPTIONS"><div id="notifications"/>
  <p className="muted small">Get an in-app notice when an analyst publishes a reviewed item in a category. Delivered to this browser only; no email is collected.</p>
  <div className="button-row"><select aria-label="Notification category" value={cat} onChange={e=>setCat(e.target.value)}>{['all','official reports','hearings','physical evidence','corrections'].map(c=><option key={c}>{c}</option>)}</select><button className="button" onClick={async()=>{try{await post('subscribe',{subscriber,category:cat});setMsg(`Subscribed to ${cat}.`);}catch(e){setMsg(String(e));}}}><Bell size={14}/> Subscribe</button>{msg&&<span className="muted small">{msg}</span>}</div>
  {items.length?<ul className="plain-list">{items.map(n=><li key={n.id}><a href={n.canonical_url} target="_blank" rel="noopener noreferrer">{n.message}</a> <small className="muted">{time(n.created_at)}</small></li>)}</ul>:<p className="muted small">No notifications yet.</p>}
 </Panel>;
}

/* ───────────── Research Findings ───────────── */
const tabs=[['established','Established findings'],['secondary','Secondary statistical findings'],['associations','Supported associations'],['hypotheses','Working hypotheses'],['disputed','Disputed interpretations'],['blocked','Blocked conclusions'],['missing','Missing information'],['milestones','Next milestones']] as const;
export function Findings({data}:{data:Snapshot}){
 const t=data.tables;const [tab,setTab]=useState<string>('established');
 useEffect(()=>{const p=param('tab');if(p&&tabs.some(x=>x[0]===p))setTab(p);},[]);
 const rq=t.RQ_Outcomes_v08||[],nulls=t.Null_Finding_v02||[],gates=t.Integrity_Gates_v08||[],gaps=t.Unresolved_Gaps_v08||[];
 const disputed=/unverified|contested|not established|official negative/i;
 const content:Record<string,React.ReactNode>={
  established:<><FindingCards rows={nulls.filter(r=>/positive|established;|^zero|zero identified/i.test(r.Status)&&!/not established in/i.test(r.Status))} title="Claim / condition" status="Status" body="Interpretation" qualify="Required upgrade" pointer="Record pointers"/><Panel title="Integrity gates passed" eyebrow="METHOD CHECKS"><RecordList rows={gates.filter(g=>g.Status==='PASS')} titleKey="Audit test"/></Panel></>,
  secondary:<><FindingCards rows={rq.filter(r=>/SECOND/.test(r.Question))} title="Predefined question" status="State" body="Evidence at integration" qualify="Key limitation" pointer="Question" link="/statistics"/><Panel title="Statistical result record" eyebrow="STAT_RESULTS_V08"><RecordList rows={t.Stat_Results_v08||[]} titleKey="Metric"/></Panel></>,
  associations:<><FindingCards rows={rq.filter(r=>/PARTIAL/.test(r.State))} title="Predefined question" status="State" body="Evidence at integration" qualify="Key limitation" pointer="Question"/><Note>An association in the historical GEIPAN series links investigation era with classification. Gap G009 (changing methods and definitions) is the leading competing explanation. <More href="/statistics">Inspect</More></Note></>,
  hypotheses:<div className="finding-grid"><article className="panel finding-panel"><Badge tone="amber">Working hypothesis</Badge><h2>Evidence protection & proof</h2><p>The probability that investigators could locate, access, preserve, authenticate and replicate proof today differs from the probability that such material ever existed.</p><More href="/protection">Open the interactive model</More></article><article className="panel finding-panel"><Badge tone="amber">Working hypothesis</Badge><h2>Memory and social contamination</h2><p>Witness agreement may reflect shared information as well as shared observation. Testable only with dated first statements and a contact graph.</p><More href="/psychology">Open the psychology lab</More></article></div>,
  disputed:<FindingCards rows={nulls.filter(r=>disputed.test(r.Status))} title="Claim / condition" status="Status" body="Interpretation" qualify="Required upgrade" pointer="Record pointers"/>,
  blocked:<><FindingCards rows={rq.filter(r=>/BLOCKED|NOT ESTABLISHED/.test(r.State))} title="Predefined question" status="State" body="Evidence at integration" qualify="Key limitation" pointer="Question"/><Panel title="Blocked analyses" eyebrow="BLOCKED_TESTS_V03"><RecordList rows={t.Blocked_Tests_v03||[]} titleKey="Analysis"/></Panel><Panel title="Gates not met" eyebrow="INTEGRITY_GATES_V08"><RecordList rows={gates.filter(g=>g.Status!=='PASS')} titleKey="Audit test"/></Panel></>,
  missing:<FindingCards rows={gaps} title="Missing item" status="Priority" body="Consequence" qualify="Interpretation guardrail" pointer="GapID" next="Exact next retrieval"/>,
  milestones:<div className="table-wrap"><table><thead><tr><th>Question</th><th>State</th><th>Next proof requirement</th></tr></thead><tbody>{rq.map(r=><tr key={r.Question}><td><b>{r.Question}</b><br/><small>{r['Predefined question']}</small></td><td><Badge tone={r.State==='BLOCKED'?'amber':'neutral'}>{r.State}</Badge></td><td>{r['Next proof requirement']}</td></tr>)}</tbody></table></div>
 };
 return <>
  <SectionHeader label="RESEARCH / FINDINGS" title="What the evidence supports." description="Six research questions. Explicit limitations. No shortcut from an unexplained event to an extraordinary origin."/>
  <Note tone="warning">The public audit has not established a complete, independently replicated extraterrestrial technology or biological-material proof chain. This describes the audited subset, not worldwide absence.</Note>
  <SprintPanel data={data}/>
  <div className="rq-row">{rq.map(r=><a key={r.Question} href={'#'+r.Question} className="rq-pill" onClick={()=>setTab(/BLOCKED|NOT ESTABLISHED/.test(r.State)?'blocked':/SECOND/.test(r.Question)?'secondary':'associations')}><b>{r.Question.replace('SECONDARY ','2° ')}</b><span className={/BLOCKED|NOT/.test(r.State)?'amber':'green'}>{r.State}</span></a>)}</div>
  <div className="tab-list" role="tablist">{tabs.map(([id,l])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{l}</button>)}</div>
  <div role="tabpanel">{rq.length||tab==='hypotheses'?content[tab]:<Empty>Sign in to view imported research findings.</Empty>}</div>
  <Panel title="Research evolution across releases" eyebrow="INTEGRATION LOG"><RecordList rows={t.Integration_Log||[]} titleKey="Action"/><More href="/methodology#lineage">Full version lineage</More></Panel>
 </>;
}
function FindingCards({rows,title,status,body,qualify,pointer,next,link}:{rows:ResearchRow[];title:string;status:string;body:string;qualify:string;pointer:string;next?:string;link?:string}){
 if(!rows.length)return <Empty>No records in this category.</Empty>;
 return <div className="finding-grid">{rows.map(r=><article className="panel finding-panel" key={r._recordId} id={r[pointer]}><div className="panel-heading"><span className="eyebrow">{r[pointer]}</span><Badge tone={/BLOCKED|Critical|NOT|Zero|Unverified|contested/i.test(r[status])?'amber':'neutral'}>{r[status]}</Badge></div><h2>{r[title]}</h2><p>{r[body]}</p><h3>Methodological qualification</h3><p>{r[qualify]}</p>{next&&<><h3>Next retrieval</h3><p>{r[next]}</p></>}<More href={link||'/methodology?record='+encodeURIComponent(r._recordId)}>Inspect source record</More></article>)}</div>;
}

/* ───────────── Research Priorities ───────────── */
type Task={id:string;incident_id:string;title:string;purpose:string;priority:string;state:string;metadata:Record<string,unknown>;updated_at:string};
const rank=(p:string)=>/critical|^p?1|high/i.test(p)?0:/medium|^p?2|important/i.test(p)?1:2;
export function Priorities({data,reload}:{data:Snapshot;reload:()=>void}){
 const tasks=data.tasks as Task[];const [focus,setFocus]=useState(''),[view,setView]=useState('roadmap'),[err,setErr]=useState('');
 useEffect(()=>{setFocus(param('case')||'');},[]);
 const events=Object.fromEntries((data.tables.Events||[]).map(e=>[e.EventID,e]));const gaps=data.tables.Unresolved_Gaps_v08||[];
 const shown=useMemo(()=>tasks.filter(x=>!focus||x.incident_id===focus).sort((a,b)=>rank(a.priority)-rank(b.priority)||a.id.localeCompare(b.id)),[tasks,focus]);
 async function move(id:string,state:string){try{setErr('');await post('task',{id,state});reload();}catch(e){setErr(String(e));}}
 return <>
  <SectionHeader label="RESEARCH / PRIORITIES" title="What to investigate next." description="An evidence-gap backlog. Each task names the missing proof-chain link it could close. Priority is a workflow judgement, never a probability that a case is extraterrestrial."/>
  {err&&<Note tone="warning">{err}</Note>}
  <div className="toolbar"><div className="segmented">{[['roadmap','Research roadmap'],['board','Workflow board'],['list','Ranked list'],['gaps','Evidence gaps']].map(([id,l])=><button key={id} className={view===id?'selected':''} onClick={()=>setView(id)}>{l}</button>)}</div>{focus&&<button className="chip selected" onClick={()=>setFocus('')}>Case {focus} ×</button>}</div>
  {view==='roadmap'?<Roadmap gaps={gaps}/>:!tasks.length&&view!=='gaps'?<Empty>Sign in to view and manage the research backlog.</Empty>:view==='board'?<div className="board">{taskStates.map(s=><section key={s} className="board-column" aria-label={s}><h2>{s} <span>{shown.filter(x=>x.state===s).length}</span></h2>{shown.filter(x=>x.state===s).map(x=><TaskCard key={x.id} task={x} event={events[x.incident_id]} role={data.role} move={move}/>)}</section>)}</div>
  :view==='list'?<div className="task-list">{shown.map(x=><TaskCard key={x.id} task={x} event={events[x.incident_id]} role={data.role} move={move} wide/>)}</div>
  :<FindingCards rows={gaps} title="Missing item" status="Priority" body="Consequence" qualify="Interpretation guardrail" pointer="GapID" next="Exact next retrieval"/>}
 </>;
}
function Roadmap({gaps}:{gaps:ResearchRow[]}){
 const gapTitle=(id:string)=>gaps.find(g=>g.GapID===id)?.['Missing item'];
 return <>
  <Note>Validate the existing evidence before expanding the catalog of famous cases. Each phase has an acceptance requirement that must be met before the next one is claimed.</Note>
  <div className="roadmap-grid">{roadmap.map(p=><article key={p.phase} className={'phase '+(p.done?'done':'')}><div className="feed-meta"><b>{p.phase}</b>{p.done?<Badge tone="green">Completed</Badge>:<Badge>Not started</Badge>}</div><h3>{p.title}</h3><p>{p.work}</p><p className="acceptance"><b>Acceptance:</b> {p.acceptance}</p>{p.gaps&&<p className="muted small">Closes: {p.gaps.map(g=><span key={g} title={gapTitle(g)}>{g} </span>)}</p>}</article>)}</div>
  <Panel title="Recruitment targets" eyebrow="PROTOCOL · NOT QUOTAS"><div className="stat-grid">{recruitment.map(r=><div key={r.unit}><span>{r.unit}</span><strong>{r.target}</strong><span>{r.note}</span></div>)}</div><Note tone="warning">Synthetic or invented observations must never be used to meet these targets. Current eligible RQ1 sample: 0.</Note></Panel>
 </>;
}
function TaskCard({task:x,event,role,move,wide}:{task:Task;event?:ResearchRow;role:string;move:(id:string,s:string)=>void;wide?:boolean}){
 const m=x.metadata||{};
 return <article className={'task-card '+(wide?'wide':'')}>
  <div className="feed-meta"><b>{x.id}</b><Badge tone={rank(x.priority)===0?'amber':'neutral'}>{x.priority}</Badge>{x.incident_id&&<Link href={'/cases/'+x.incident_id}>{x.incident_id}</Link>}</div>
  <h3>{x.title}</h3>
  <dl className="task-facts"><div><dt>Why it matters</dt><dd>{x.purpose}</dd></div><div><dt>Evidence needed</dt><dd>{event?.['Verification next step']||String(m.missingLink||'See case evidence matrix')}</dd></div><div><dt>Conclusion it could resolve</dt><dd>{String(m.discrimination||'Source-level evidence gap')}</dd></div>{wide&&<><div><dt>Feasibility</dt><dd>{String(m.feasibility||'Unassessed')}</dd></div><div><dt>Effort</dt><dd>{String(m.effort||'Unestimated')}</dd></div></>}</dl>
  {editor(role)?<label className="inline-select">State<select value={x.state} onChange={e=>move(x.id,e.target.value)}>{taskStates.map(s=><option key={s}>{s}</option>)}</select></label>:<Badge>{x.state}</Badge>}
 </article>;
}

/* ───────────── Methodology, Sources & History ───────────── */
export function Methodology({data}:{data:Snapshot}){
 const t=data.tables;const [record,setRecord]=useState<string|null>(null);
 useEffect(()=>{setRecord(param('record'));const c=param('collection');if(c)setTimeout(()=>document.getElementById('c-'+c)?.scrollIntoView(),300);},[]);
 const found=record?Object.values(t).flat().find(r=>r._recordId===record):null;
 const collections=Object.keys(t).sort();
 return <>
  <SectionHeader label="RESEARCH / METHODOLOGY & SOURCES" title="How we know what we claim." description="Objectives, research questions, lineage, criteria, limitations and every imported record, so any claim can be traced to its source and its qualifications." action={<a className="button" href="/api/export"><Download size={15}/> Export accessible data</a>}/>
  {record&&<Panel title="Requested source record" eyebrow={record}>{found?<Fields row={found}/>:<Empty>Record unavailable in this view. It may be private.</Empty>}</Panel>}
  <div className="two-columns"><Panel title="Project objectives" eyebrow="WHY THIS EXISTS"><ul className="plain-list"><li>Separate what is established, disputed, unresolved and insufficiently documented.</li><li>Test whether independent testimony predicts authenticated objective corroboration (RQ1, currently blocked).</li><li>Treat perception and memory science as measurable research variables.</li><li>Keep instrument evidence and recovered-material provenance as separate tracks.</li><li>Prioritize the specific records that could change a conclusion.</li></ul></Panel>
   <Panel title="Integrity rules" eyebrow="NON-NEGOTIABLE"><ul className="plain-list rules">{['Unknown evidence is not negative evidence.','An unexplained incident is not automatically extraterrestrial.','An official document confirms what the institution recorded, not necessarily the underlying assertion.','Witness rank, status or clearance is not a numerical truth prior.','Multiple witnesses to one incident are not automatically independent observations.','Sensor corroboration and recovered-material provenance are separate tracks.','Unusual laboratory composition does not establish non-human manufacture.','Zero verified cases in a limited corpus is not proof of worldwide absence.','Statistical significance is not causation or extraterrestrial authentication.','Never invent p-values, records, provenance, access, reliability or replication.',...guardrails].map(r=><li key={r}>{r}</li>)}</ul></Panel></div>
  <Panel title="Research questions" eyebrow="PREDEFINED"><div className="table-wrap"><table><thead><tr><th>ID</th><th>Question</th><th>State</th><th>Key limitation</th></tr></thead><tbody>{(t.RQ_Outcomes_v08||[]).map(r=><tr key={r.Question}><td>{r.Question}</td><td>{r['Predefined question']}</td><td>{r.State}</td><td>{r['Key limitation']}</td></tr>)}</tbody></table></div></Panel>
  <Panel title="Version lineage & source ingestion manifest" eyebrow="IMPORTS · CHECKSUMS"><div id="lineage"/><Note>v0.8 is the integrated baseline. It incorporates the accessible v07 Deep Research narrative but is <b>not</b> a verified byte-level import of the unavailable v07 XLSX/ZIP. Earlier versions are preserved for lineage and add no independent cases.</Note>
   {data.imports.length?<div className="table-wrap"><table><thead><tr><th>File</th><th>Version</th><th>Status</th><th>Records</th><th>SHA-256</th></tr></thead><tbody>{data.imports.map(i=><tr key={i.id}><td>{i.filename}</td><td>{i.version}</td><td>{i.status}</td><td>{i.record_count}</td><td><code>{String(i.sha256).slice(0,16)}…</code></td></tr>)}</tbody></table></div>:<Empty>The ingestion manifest is visible to signed-in researchers.</Empty>}
   <RecordList rows={t.Release_Status_v08||[]} titleKey="Key"/></Panel>
  <div className="two-columns"><Panel title="Inclusion & coding criteria" eyebrow="CODEBOOK"><RecordList rows={t.Codebook||[]} titleKey="Field"/></Panel><Panel title="Requirements trace" eyebrow="HISTORICAL REQUIREMENTS"><RecordList rows={t.Requirements_Trace_v08||[]} titleKey="Requirement"/></Panel></div>
  <div className="two-columns"><Panel title="Source registry" eyebrow="ACCESS GRADES RETAINED"><RecordList rows={t.Source_Registry_v08||[]} titleKey="Name"/></Panel><Panel title="Primary-source audit" eyebrow="WHAT EACH SOURCE PERMITS"><RecordList rows={t.Primary_Source_Audit_v06||[]} titleKey="Primary source"/></Panel></div>
  <Panel title="Corrections & retractions" eyebrow="CHANGE HISTORY">{data.reviews.filter(r=>['corrected','retracted'].includes(r.decision)).length?<ul className="plain-list">{data.reviews.filter(r=>['corrected','retracted'].includes(r.decision)).map(r=><li key={r.id}><Badge tone="red">{r.decision}</Badge> {r.rationale} <small className="muted">{time(r.created_at)}</small></li>)}</ul>:<p className="muted small">No corrections or retractions recorded since import.</p>}</Panel>
  <Panel title="Source-ingestion health" eyebrow="LIVE PROVIDERS"><ProviderTable providers={data.providers}/></Panel>
  <Panel title="All accessible collections" eyebrow="RAW RECORDS">{collections.length?collections.map(c=><details key={c} id={'c-'+c} className="collection"><summary>{c} <span className="muted">· {t[c].length} records</span></summary><RecordList rows={t[c]}/></details>):<Empty>No collections are published publicly yet.</Empty>}</Panel>
 </>;
}
function ProviderTable({providers}:{providers:Snapshot['providers']}){
 return <div className="table-wrap"><table><thead><tr><th>Source</th><th>Cadence</th><th>Last success</th><th>Next attempt</th><th>Failures</th><th>Last error</th><th>Use policy</th></tr></thead><tbody>{providers.map(p=><tr key={p.id}><td><span className={'health '+(p.last_error?'bad':p.last_success?'good':'idle')}/> {p.name}{!p.enabled&&<Badge>disabled</Badge>}</td><td>{Math.round(p.cadence_minutes/60)} h</td><td>{time(p.last_success)}</td><td>{time(p.next_attempt)}</td><td>{p.failures}</td><td>{p.last_error||'—'}</td><td><SourceLink href={p.policy_url}>Policy</SourceLink></td></tr>)}</tbody></table></div>;
}

/* ───────────── Research assistant ───────────── */
const suggestions=['Which recovery cases have multiple independently documented witnesses?','What is the statistical distinction between GEIPAN classifications C and D?','Which investigations have the most consequential custody gaps?','Which cases contain independently accessible laboratory analysis?','What new congressional hearing developments were ingested?','What has changed in the evidence since the previous research release?'];
export function Assistant({close}:{close:()=>void}){
 const [q,setQ]=useState(''),[busy,setBusy]=useState(false),[answer,setAnswer]=useState<{answer:string;citations:{id:string;title:string;url:string}[];uncertainty:string;mode:string}|null>(null),[err,setErr]=useState('');
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);},[close]);
 async function ask(question:string){setQ(question);setBusy(true);setErr('');setAnswer(null);try{setAnswer(await post('ask',{question}));}catch(e){setErr(String(e).replace('Error: ',''));}finally{setBusy(false);}}
 return <div className="assistant-backdrop" onClick={close}><aside className="assistant" role="dialog" aria-modal="true" aria-label="Research assistant" onClick={e=>e.stopPropagation()}>
  <header><Bot size={20}/><div><h2>Research assistant</h2><small>Answers only from retrieved records, with citations</small></div><button className="icon-button" aria-label="Close assistant" onClick={close}><X size={18}/></button></header>
  <form onSubmit={e=>{e.preventDefault();if(q.trim().length>2)ask(q);}}><textarea autoFocus aria-label="Your question" value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about cases, sources, statistics or gaps…"/><button className="button primary" disabled={busy}><Send size={14}/> {busy?'Searching…':'Ask'}</button></form>
  {!answer&&!busy&&<div className="suggestions">{suggestions.map(s=><button key={s} onClick={()=>ask(s)}>{s}</button>)}</div>}
  {err&&<Note tone="warning">{err}</Note>}
  {answer&&<div className="answer"><Badge tone="blue">{answer.mode}</Badge><div className="answer-text">{answer.answer}</div><h3>Sources</h3>{answer.citations.length?<ol>{answer.citations.map(c=><li key={c.id}>{/^https?:/.test(c.url)?<a href={c.url} target="_blank" rel="noopener noreferrer">{c.title}</a>:<Link href={c.url} onClick={close}>{c.title}</Link>} <code>{c.id}</code></li>)}</ol>:<p className="muted">No supporting record retrieved.</p>}<h3>Uncertainty</h3><p className="muted">{answer.uncertainty}</p></div>}
 </aside></div>;
}

/* ───────────── Operations: ingestion health, review queue, publication boundary ───────────── */
export function Operations({data,reload}:{data:Snapshot;reload:()=>void}){
 const [busy,setBusy]=useState(false),[result,setResult]=useState(''),[err,setErr]=useState('');const admin=data.role==='admin';
 const pending=data.feed.filter(f=>f.status==='pending');
 async function run(){setBusy(true);setErr('');try{const r=await post('ingest');setResult(r.busy?'Another ingestion run is in progress.':r.results.map((x:any)=>`${x.provider}: ${x.status}${x.added!==undefined?` (+${x.added})`:''}${x.error?` — ${x.error}`:''}`).join(' · ')||'No providers were due.');reload();}catch(e){setErr(String(e));}finally{setBusy(false);}}
 if(data.role==='public')return <><SectionHeader label="OPERATIONS" title="Ingestion & review" description="Administrative workspace."/><Empty>Sign in as an editor or administrator.</Empty></>;
 return <>
  <SectionHeader label="OPERATIONS" title="Ingestion, review & publication" description="Source health, the analyst review queue, the public publication boundary and the audit trail." action={admin&&<button className="button primary" onClick={run} disabled={busy}><RefreshCw size={15}/> {busy?'Retrieving…':'Run due sources now'}</button>}/>
  {result&&<Note tone="success">{result}</Note>}{err&&<Note tone="warning">{err}</Note>}
  <Panel title="Source-ingestion health" eyebrow="PROVIDER-SPECIFIC CADENCE"><ProviderTable providers={data.providers}/>{admin&&<div className="provider-controls">{data.providers.map(p=><ProviderControl key={p.id} p={p} reload={reload}/>)}</div>}</Panel>
  <Panel title={`Analyst review queue · ${pending.length} pending`} eyebrow="AUTOMATED PROPOSALS ARE NOT CONCLUSIONS"><p className="muted small">Retrieved items stay private discovery leads until an editor records a decision with a rationale. Reviews are audited and trigger notifications.</p>{pending.length?<ul className="plain-list">{pending.slice(0,25).map(f=><li key={f.id}><Badge>{f.category}</Badge> <a href={f.canonical_url} target="_blank" rel="noopener noreferrer">{f.title}</a> <small className="muted">{f.publisher}</small></li>)}</ul>:<p className="muted">Queue is clear.</p>}<More href="/feed">Review in the live feed</More></Panel>
  <Panel title="Publication boundary" eyebrow="PRIVATE BY DEFAULT"><Note tone="warning">Imported research and witness records are private. Publish a collection only after a publication-rights and witness-privacy review. Changes are audited.</Note>{admin?<PublicationControl data={data} reload={reload}/>:<p className="muted">Administrator role required.</p>}</Panel>
  <Panel title="Audit log" eyebrow="LATEST 30 ACTIONS"><div className="table-wrap"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>{data.audit.map(a=><tr key={a.id}><td>{time(a.created_at)}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.target}</td></tr>)}</tbody></table></div></Panel>
 </>;
}
// Staged selection: nothing changes until the admin reviews the exact differences and confirms. One atomic request.
export const lowRiskCollections=['Blocked_Tests_v03','Codebook','Cognitive_Theory_Map','External_Series_v08','GEIPAN_Era_v08','Inference_Decision_v06','Integrity_Gates_v08','Power_v08','Release_Status_v08','RQ_Outcomes_v08','Run_Summary_v05','Stat_Results_v08','Unresolved_Gaps_v08'];
const sensitive=/witness|claim|custody|artifact|crosswalk|readme/i;
function PublicationControl({data,reload}:{data:Snapshot;reload:()=>void}){
 const all=Object.keys(data.tables).sort((a,b)=>a.localeCompare(b));
 const current=new Set(all.filter(c=>data.publication?.[c]==='public'));
 const [draft,setDraft]=useState<Set<string>>(new Set(current)),[confirming,setConfirming]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 useEffect(()=>{if(!confirming&&!busy)setDraft(new Set(current));},[data.publication]);
 const toPublish=all.filter(c=>draft.has(c)&&!current.has(c)),toHide=all.filter(c=>!draft.has(c)&&current.has(c));
 const toggle=(c:string)=>{const n=new Set(draft);n.has(c)?n.delete(c):n.add(c);setDraft(n);setConfirming(false);};
 async function apply(){setBusy(true);setMsg('');try{await post('publish-set',{public:[...draft]});setConfirming(false);setMsg(`Saved. ${draft.size} collection(s) are public.`);reload();}catch(e){setMsg(String(e));}finally{setBusy(false);}}
 return <>
  <p className="small"><b>{current.size}</b> of {all.length} collections are public now. Tick the ones that should be public, review the changes, then confirm. Nothing changes until you confirm.</p>
  <div className="button-row"><button className="button" onClick={()=>{setDraft(new Set(lowRiskCollections.filter(c=>all.includes(c))));setConfirming(false);}}>Select only the 13 low-risk collections</button><button className="button" onClick={()=>{setDraft(new Set());setConfirming(false);}}>Make everything private</button><button className="button" onClick={()=>{setDraft(new Set(current));setConfirming(false);}}>Discard my changes</button></div>
  <div className="table-wrap"><table><thead><tr><th>Public?</th><th>Collection</th><th>Records</th><th>Now</th></tr></thead><tbody>{all.map(c=><tr key={c}><td><input type="checkbox" aria-label={`Public: ${c}`} checked={draft.has(c)} onChange={()=>toggle(c)}/></td><td>{c}{sensitive.test(c)&&<> <Badge tone="red">personal or internal</Badge></>}</td><td>{data.tables[c].length}</td><td><Badge tone={current.has(c)?'green':'neutral'}>{current.has(c)?'public':'private'}</Badge></td></tr>)}</tbody></table></div>
  {(toPublish.length||toHide.length)?<div className="review-form"><b>Pending changes</b>{toPublish.length>0&&<p className="small">Will become <b>public</b> ({toPublish.length}): {toPublish.join(', ')}</p>}{toHide.length>0&&<p className="small">Will become <b>private</b> ({toHide.length}): {toHide.join(', ')}</p>}{toPublish.some(c=>sensitive.test(c))&&<Note tone="warning">Your selection publishes collections marked personal or internal. Confirm that the privacy review is done.</Note>}{confirming?<div className="button-row"><button className="button primary" disabled={busy} onClick={apply}>{busy?'Saving…':'Yes, apply these changes'}</button><button className="button" onClick={()=>setConfirming(false)}>Back</button></div>:<div className="button-row"><button className="button primary" onClick={()=>setConfirming(true)}>Review & apply</button></div>}</div>:<p className="muted small">No pending changes.</p>}
  {msg&&<Note tone={msg.startsWith('Saved')?'success':'warning'}>{msg}</Note>}
 </>;
}
function ProviderControl({p,reload}:{p:Snapshot['providers'][number];reload:()=>void}){
 const [enabled,setEnabled]=useState(p.enabled),[cadence,setCadence]=useState(p.cadence_minutes);
 return <form className="provider-control" onSubmit={async e=>{e.preventDefault();await post('provider',{id:p.id,enabled,cadence});reload();}}><b>{p.name}</b><label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Enabled</label><label>Every <input type="number" min="60" max="10080" step="60" value={cadence} onChange={e=>setCadence(+e.target.value)}/> min</label><button className="button">Save</button></form>;
}

/* ───────────── Separate science track: Mars & abiogenesis ───────────── */
export function MarsTrack(){
 return <>
  <SectionHeader label="SEPARATE SCIENCE TRACK / MARS & ABIOGENESIS" title="Does life emerge when conditions allow?" description="A distinct research question about planetary chemistry. Nothing on this page is UAP evidence, and nothing from the UAP corpus is used here."/>
  <Note tone="warning"><strong>Scope boundary (REQ025).</strong> Mars-abiogenesis work is never mixed into UAP event counts, models or extraterrestrial attribution. The v08 archive contains <strong>no</strong> Mars simulation package, reaction-network output, measurement dataset or laboratory report, so this page records scope and plans only.</Note>
  <Panel title="Governing question" eyebrow="RESEARCH PROBLEM"><p className="large-text">{mars.question}</p></Panel>
  <Panel title="What exists at each level of evidence" eyebrow="STATUS · 15 OCTOBER 2026"><div className="ladder">{mars.ladder.map(l=><div key={l.level} className={/Defined/.test(l.status)?'proposed':'none'}><b>{l.level}</b><span>{l.status}</span></div>)}</div><p className="muted small">Mathematical feasibility, simulation, existing measurements, proposed experiments and completed laboratory findings are kept separate. A simulation is never presented as a laboratory discovery.</p></Panel>
  <div className="two-columns"><Panel title="Planned research sequence" eyebrow="FROM PROJECT CONVERSATIONS"><ol className="roadmap">{mars.sequence.map(x=><li key={x.step}><b>{x.step}.</b> {x.detail} <Badge>Planned · no preserved output</Badge></li>)}</ol></Panel>
   <Panel title="Next decisive milestones" eyebrow="OPEN REQUIREMENTS"><ul className="plain-list">{mars.open.map(x=><li key={x}>{x}</li>)}</ul><Note>No biological origin or new discovery may be claimed without discriminating evidence.</Note></Panel></div>
 </>;
}

/* ───────────── Progress since v0.8 (v09 research sprint) ───────────── */
export function SprintPanel({data,compact}:{data:Snapshot;compact?:boolean}){
 const p=sprintProgress(data.tables);
 if(!p.available)return null;
 return <Panel title="Progress since v0.8" eyebrow="V09 RESEARCH SPRINT · AI-EXTRACTED, AWAITING HUMAN REVIEW" action={<Badge tone="blue">Statuses unchanged</Badge>}>
  <p className="muted small">Research-question states below are the v0.8 states. This sprint retrieved public sources and extracted cited facts; it moves the work toward a valid test without claiming the test has been passed.</p>
  <div className="sprint-grid">{p.items.filter(i=>!compact||i.moved||i.rq==='RQ1').map(i=><article key={i.rq} className={'sprint-item '+(i.moved?'moved':'')}><div className="feed-meta"><b>{i.rq}</b><Badge tone={i.moved?'green':'neutral'}>{i.moved?'Progress':'No change'}</Badge></div><h3>{i.headline}</h3>{!compact&&<p className="small">{i.detail}</p>}<p className="muted small"><b>Still needed:</b> {i.remaining}</p></article>)}</div>
  <More href="/methodology?collection=Primary_Source_Extraction_v09">Inspect every extracted value and its source</More>
 </Panel>;
}

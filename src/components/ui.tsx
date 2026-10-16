'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import type {ResearchRow} from '@/lib/research-types';
export function Badge({children,tone='neutral'}:{children:React.ReactNode;tone?:string}){return <span className={'badge '+tone}>{children}</span>;}
export function SourceLink({href,children}:{href?:string;children?:React.ReactNode}){if(!href||!/^https?:\/\//.test(href))return <span className="muted">Original source not linked</span>;return <a className="source-link" href={href} target="_blank" rel="noopener noreferrer">{children||'Original source'} <ArrowUpRight size={13}/></a>;}
export function Panel({title,eyebrow,children,action}:{title:string;eyebrow?:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="panel"><div className="panel-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;}
export function Note({children,tone=''}:{children:React.ReactNode;tone?:string}){return <div className={'note '+tone}>{children}</div>;}
export function Empty({children}:{children:React.ReactNode}){return <div className="empty"><div className="empty-symbol">∅</div>{children}</div>;}
export function Fields({row}:{row:ResearchRow}){return <dl className="fields">{Object.entries(row).filter(([k])=>!k.startsWith('_')).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{/^https?:\/\//.test(v)?<SourceLink href={v}/>:v||'Not recorded'}</dd></div>)}</dl>;}
export function RecordList({rows,titleKey}:{rows:ResearchRow[];titleKey?:string}){return rows.length?<div className="record-list">{rows.map((r,i)=><RecordItem key={r._recordId||i} row={r} index={i} titleKey={titleKey}/>)}</div>:<Empty>No records available in the accessible corpus.</Empty>;}
// Fields render only once a record is opened (or when it is the URL target), keeping long lists light.
function RecordItem({row:r,index:i,titleKey}:{row:ResearchRow;index:number;titleKey?:string}){
 const [open,setOpen]=useState(()=>typeof location!=='undefined'&&!!r._recordId&&location.hash==='#'+r._recordId);
 return <details id={r._recordId} open={open||undefined} onToggle={e=>setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary><span className="record-number">{String(i+1).padStart(2,'0')}</span><span className="record-title">{r[titleKey||Object.keys(r)[0]]}</span><span className="detail-plus" aria-hidden="true">+</span></summary>{open&&<Fields row={r}/>}</details>;
}
export function LazyDetails({id,className,summary,children}:{id?:string;className?:string;summary:React.ReactNode;children:()=>React.ReactNode}){
 const [open,setOpen]=useState(false);
 return <details id={id} className={className} onToggle={e=>setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>{summary}</summary>{open&&children()}</details>;
}
export function SectionHeader({label,title,description,action}:{label:string;title:string;description:string;action?:React.ReactNode}){return <header className="section-header"><div><div className="eyebrow">{label}</div><h1>{title}</h1><p>{description}</p></div>{action}</header>;}
export function More({href,children}:{href:string;children:React.ReactNode}){return <Link className="text-link" href={href}>{children}<ArrowUpRight size={16}/></Link>;}
export function download(name:string,value:unknown){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
// Root cause of the "Failed to fetch" reports: a network failure (for example while Render swaps instances
// during a deploy) surfaced as a raw TypeError, and a non-JSON proxy error page surfaced as a parse error.
// Writes are never retried automatically, so an action is never applied twice.
export async function post(action:string,body:unknown={}){
 let r:Response;try{r=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
 catch{throw new Error('No response from the server (network interruption or a deployment in progress). Check the result before retrying.');}
 const json=await r.json().catch(()=>({error:r.status>=500?`The service is temporarily unavailable (HTTP ${r.status}). Try again in a minute.`:`Unexpected response (HTTP ${r.status}).`}));
 if(!r.ok)throw new Error(json.error||'Request failed');return json;}

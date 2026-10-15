'use client';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import type {ResearchRow} from '@/lib/research-types';
export function Badge({children,tone='neutral'}:{children:React.ReactNode;tone?:string}){return <span className={'badge '+tone}>{children}</span>;}
export function SourceLink({href,children}:{href?:string;children?:React.ReactNode}){if(!href||!/^https?:\/\//.test(href))return <span className="muted">Original source not linked</span>;return <a className="source-link" href={href} target="_blank" rel="noopener noreferrer">{children||'Original source'} <ArrowUpRight size={13}/></a>;}
export function Panel({title,eyebrow,children,action}:{title:string;eyebrow?:string;children:React.ReactNode;action?:React.ReactNode}){return <section className="panel"><div className="panel-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;}
export function Note({children,tone=''}:{children:React.ReactNode;tone?:string}){return <div className={'note '+tone}>{children}</div>;}
export function Empty({children}:{children:React.ReactNode}){return <div className="empty"><div className="empty-symbol">∅</div>{children}</div>;}
export function Fields({row}:{row:ResearchRow}){return <dl className="fields">{Object.entries(row).filter(([k])=>!k.startsWith('_')).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{/^https?:\/\//.test(v)?<SourceLink href={v}/>:v||'Not recorded'}</dd></div>)}</dl>;}
export function RecordList({rows,titleKey}:{rows:ResearchRow[];titleKey?:string}){return rows.length?<div className="record-list">{rows.map((r,i)=><details key={r._recordId||i} id={r._recordId}><summary><span className="record-number">{String(i+1).padStart(2,'0')}</span>{r[titleKey||Object.keys(r)[0]]}<span className="detail-plus">+</span></summary><Fields row={r}/></details>)}</div>:<Empty>No records available in the accessible corpus.</Empty>;}
export function SectionHeader({label,title,description,action}:{label:string;title:string;description:string;action?:React.ReactNode}){return <header className="section-header"><div><div className="eyebrow">{label}</div><h1>{title}</h1><p>{description}</p></div>{action}</header>;}
export function More({href,children}:{href:string;children:React.ReactNode}){return <Link className="text-link" href={href}>{children}<ArrowUpRight size={16}/></Link>;}
export function download(name:string,value:unknown){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
export async function post(action:string,body:unknown={}){const r=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const json=await r.json();if(!r.ok)throw new Error(json.error||'Request failed');return json;}

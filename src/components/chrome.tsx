'use client';
import {useEffect,useRef,useState} from 'react';
import {Rows3,Rows4} from 'lucide-react';
import {statuses,type StatusKey as Key} from '@/lib/glossary';

// A status chip always carries a symbol and a word, never colour alone.
export function Status({k,children}:{k:Key;children?:React.ReactNode}){
 const s=statuses.find(x=>x.key===k)!;
 return <span className={'status-chip '+s.tone} title={s.meaning}><span aria-hidden="true">{s.symbol}</span> {children??s.label}</span>;
}

// Status key available from every page (top bar). A disclosure, so it works by keyboard and touch, not hover.
export function StatusKey(){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary')?.focus();}};const outside=(e:MouseEvent)=>{if(ref.current?.open&&!ref.current.contains(e.target as Node))ref.current.open=false;};document.addEventListener('keydown',close);document.addEventListener('click',outside);return()=>{document.removeEventListener('keydown',close);document.removeEventListener('click',outside);};},[]);
 return <details className="status-key" ref={ref}><summary>Status key</summary><div className="status-key-panel" role="group" aria-label="Status definitions">
  <dl>{statuses.map(s=><div key={s.key}><dt><Status k={s.key}/></dt><dd>{s.meaning}</dd></div>)}</dl>
  <p className="muted small">Operational progress (work done) is always shown separately from evidence readiness (gates passed). <a href="/methodology#glossary">Full glossary</a></p>
 </div></details>;
}

// Compact or comfortable density; remembered per browser (a convenience only).
export function DensityToggle(){
 const [compact,setCompact]=useState(false);
 useEffect(()=>{let v:string|null=null;try{v=localStorage.getItem('et-density');}catch{}if(v==='compact'){setCompact(true);document.documentElement.dataset.density='compact';}},[]);
 const toggle=()=>{const next=!compact;setCompact(next);document.documentElement.dataset.density=next?'compact':'comfortable';try{localStorage.setItem('et-density',next?'compact':'comfortable');}catch{}};
 return <button className="icon-button density-toggle" aria-pressed={compact} aria-label={compact?'Use comfortable density':'Use compact density'} title={compact?'Comfortable density':'Compact density'} onClick={toggle}>{compact?<Rows3 size={18}/>:<Rows4 size={18}/>}</button>;
}

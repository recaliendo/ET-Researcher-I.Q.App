// Shared request-security primitives: client identification, rate limiting, concurrency limits and
// error messages that are safe to show to the public.
import {createHash} from 'node:crypto';

// An error whose message is safe to return to any caller. Everything else is replaced by a generic message.
export class PublicError extends Error{constructor(message:string,public status=400){super(message);}}

// Client address for rate limiting only (never for authorization). Render sits behind Cloudflare, which sets
// cf-connecting-ip; otherwise the right-most X-Forwarded-For entry is the address our proxy actually saw
// (left-most entries are client-supplied and spoofable).
export function clientKey(req:Request){
 const h=req.headers;const ip=h.get('cf-connecting-ip')||h.get('true-client-ip')||(h.get('x-forwarded-for')||'').split(',').map(s=>s.trim()).filter(Boolean).pop()||'local';
 return createHash('sha256').update('et-rl:'+ip).digest('hex').slice(0,24);
}

// Sliding-window limiter held in memory. The service runs as a single instance (render.yaml); with more
// instances each one enforces its own window, which still bounds total load linearly.
const windows=new Map<string,number[]>();const MAX_KEYS=20000;
export function rateLimit(bucket:string,key:string,limit:number,windowMs:number){
 const id=bucket+':'+key,now=Date.now();const hits=(windows.get(id)||[]).filter(t=>now-t<windowMs);
 if(hits.length>=limit){windows.set(id,hits);const retry=Math.ceil((windowMs-(now-hits[0]))/1000);throw new PublicError(`Too many requests. Try again in ${retry} s.`,429);}
 hits.push(now);windows.set(id,hits);
 if(windows.size>MAX_KEYS){for(const k of windows.keys()){windows.delete(k);if(windows.size<=MAX_KEYS*.9)break;}}
}
export const resetRateLimits=()=>windows.clear();

// Bounded concurrency for expensive work (remote analytics, AI calls).
const running=new Map<string,number>();
export async function withConcurrency<T>(name:string,max:number,fn:()=>Promise<T>){
 const n=running.get(name)||0;if(n>=max)throw new PublicError('The service is busy. Try again shortly.',503);
 running.set(name,n+1);try{return await fn();}finally{running.set(name,(running.get(name)||1)-1);}
}

// Generic message plus a short reference that appears in server logs, so details never reach the caller.
export function errorReference(e:unknown){const ref=Math.random().toString(36).slice(2,10);console.error(`[api error ${ref}]`,e instanceof Error?e.stack||e.message:e);return ref;}

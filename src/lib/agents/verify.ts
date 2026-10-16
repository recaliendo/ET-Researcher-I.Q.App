// Deterministic source verification (Agent 1, verification half). A quote counts only if it is found on the
// page actually retrieved now. Nothing an agent claims about a document is trusted without this check.
import {createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {safeSourceUrl,AgentPolicyError} from '../agent-policy';

export type Retrieved={url:string;finalUrl:string;status:number;contentType:string;bytes:number;sha256:string;text:string;error?:string};
export type QuoteCheck={quote:string;verified:boolean;match:'exact'|'normalized'|'alphanumeric'|'none'|'unverifiable-format'};

const privateAddr=(ip:string)=>isIP(ip)===4?/^(10\.|127\.|169\.254\.|192\.168\.|0\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip):isIP(ip)===6?/^(::1|fc|fd|fe80|::ffff:(10|127|192\.168)\.)/i.test(ip):true;
// DNS-rebinding guard: the hostname must resolve only to public addresses at fetch time.
async function publicHost(url:string){const h=new URL(url).hostname;const addrs=await lookup(h,{all:true});if(!addrs.length||addrs.some(a=>privateAddr(a.address)))throw new AgentPolicyError(`Host ${h} resolves to a private address`);}

export async function retrieve(raw:string,opts:{maxBytes?:number;timeoutMs?:number;pdfText?:(buf:Buffer)=>Promise<string>}={}):Promise<Retrieved>{
 const maxBytes=opts.maxBytes??15_000_000;let url=safeSourceUrl(raw);
 for(let hop=0;hop<5;hop++){
  await publicHost(url);
  const res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(opts.timeoutMs??30000),headers:{'User-Agent':'ETResearcherIQ-SourceVerifier/1.0 (+https://github.com/recaliendo/ET-Researcher-I.Q.App)','Accept':'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.5'}});
  if(res.status>=300&&res.status<400&&res.headers.get('location')){url=safeSourceUrl(new URL(res.headers.get('location')!,url).toString());continue;}
  const reader=res.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new AgentPolicyError('Document exceeds size limit');}chunks.push(value);}
  const buf=Buffer.concat(chunks);const ct=res.headers.get('content-type')||'';
  let text='';
  if(/pdf/i.test(ct)||buf.subarray(0,5).toString()==='%PDF-')text=opts.pdfText?await opts.pdfText(buf).catch(()=>''):'';
  else text=htmlToText(buf.toString('utf8'));
  return {url:raw,finalUrl:url,status:res.status,contentType:ct.split(';')[0],bytes:buf.length,sha256:createHash('sha256').update(buf).digest('hex'),text};
 }
 throw new AgentPolicyError('Too many redirects');
}
const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:"'",lsquo:"'",rdquo:'"',ldquo:'"',ndash:'-',mdash:'-',hellip:'...',eacute:'é',egrave:'è',agrave:'à',ccedil:'ç',ecirc:'ê',ocirc:'ô',icirc:'î',ugrave:'ù'};
export function htmlToText(html:string){
 return html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi,' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi,'\n').replace(/<[^>]+>/g,' ')
  .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&([a-z]+);/gi,(m,n)=>entities[n.toLowerCase()]??m);
}
const norm=(s:string)=>s.normalize('NFKC').replace(/[‘’‚′`´]/g,"'").replace(/[“”„″«»]/g,'"').replace(/[‐-―−]/g,'-').replace(/…/g,'...').replace(/\s+/g,' ').trim().toLowerCase();
const alnum=(s:string)=>norm(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'');
export function checkQuote(text:string,quote:string):QuoteCheck{
 if(!text)return {quote,verified:false,match:'unverifiable-format'};
 if(text.includes(quote))return {quote,verified:true,match:'exact'};
 if(norm(text).includes(norm(quote)))return {quote,verified:true,match:'normalized'};
 const q=alnum(quote);if(q.length>=30&&alnum(text).includes(q))return {quote,verified:true,match:'alphanumeric'};
 return {quote,verified:false,match:'none'};
}

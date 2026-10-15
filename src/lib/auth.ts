import { timingSafeEqual,createHmac } from 'node:crypto';
export type Role='public'|'reader'|'editor'|'admin';
const equal=(a:string,b:string)=>a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function roleFor(req:Request):Role {
  const url=new URL(req.url);
  // Development server binds loopback. Production never has a localhost bypass.
  if(process.env.NODE_ENV==='development' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname))return 'admin';
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'') || '';
  for(const [role,key] of [['admin','ADMIN_TOKEN'],['editor','EDITOR_TOKEN'],['reader','READER_TOKEN']] as const){
    const secret=process.env[key];if(secret && secret.length>=32 && equal(token,secret))return role;
  }
  const cookies=req.headers.get('cookie')||'';const session=cookies.match(/(?:^|; )et_session=([^;]+)/)?.[1];
  if(session){const [role,expiry,sig]=session.split('.');if(['admin','editor','reader'].includes(role)&&Number(expiry)>Date.now()){
    const key=process.env[role.toUpperCase()+'_TOKEN'];if(key&&key.length>=32&&equal(sig||'',createHmac('sha256',key).update(role+'.'+expiry).digest('hex')))return role as Role;
  }}return 'public';
}
export function requireRole(req:Request,min:'reader'|'editor'|'admin') {
  const role=roleFor(req);if(['public','reader','editor','admin'].indexOf(role)<['public','reader','editor','admin'].indexOf(min))throw new Error('FORBIDDEN');
  if(req.method!=='GET' && !sameOrigin(req))throw new Error('FORBIDDEN');return role;
}
// CSRF guard: a browser Origin header must match the host the request was sent to. Non-browser clients send no Origin.
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return true;try{const host=req.headers.get('x-forwarded-host')||req.headers.get('host')||new URL(req.url).host;return new URL(origin).host===host;}catch{return false;}}
export function sessionCookie(role:Role){const exp=Date.now()+8*3600_000;const secret=process.env[role.toUpperCase()+'_TOKEN']!;return `${role}.${exp}.${createHmac('sha256',secret).update(role+'.'+exp).digest('hex')}`;}

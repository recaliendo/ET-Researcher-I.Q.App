import { timingSafeEqual,createHmac,createHash,randomBytes } from 'node:crypto';
import type { Database } from './db';
export type Role='public'|'reader'|'editor'|'admin';
export type Principal={role:Role;session?:string;via:'none'|'dev'|'bearer'|'session'|'legacy-session'};
const ORDER:Role[]=['public','reader','editor','admin'];
const SESSION_HOURS=8;
// Constant-time comparison that also hides length differences (both sides are hashed first).
export const equal=(a:string,b:string)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
const tokenFor=(role:Exclude<Role,'public'>)=>{const t=process.env[role.toUpperCase()+'_TOKEN'];return t&&t.length>=32?t:null;};
// Fingerprint of the current role token. Rotating a token changes it and so invalidates every session it issued.
export const fingerprint=(role:Exclude<Role,'public'>)=>{const t=tokenFor(role);return t?createHash('sha256').update('et-fp:'+t).digest('hex').slice(0,32):'';};
const sessionKey=()=>{const s=process.env.SESSION_SECRET;if(s&&s.length>=32)return s;
 // Fallback: derive from the role tokens so existing deployments work without a new secret.
 return createHash('sha256').update(['ADMIN_TOKEN','EDITOR_TOKEN','READER_TOKEN'].map(k=>process.env[k]||'').join('|')).digest('hex');};
const sign=(sid:string)=>createHmac('sha256',sessionKey()).update('et-sid:'+sid).digest('hex');

// Synchronous checks that need no database: development loopback, bearer tokens, and legacy role cookies.
export function roleFor(req:Request):Role {return bearerOrLegacy(req).role;}
function bearerOrLegacy(req:Request):Principal{
  const url=new URL(req.url);
  // Development server binds loopback. Production never has a localhost bypass.
  if(process.env.NODE_ENV==='development' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname))return {role:'admin',via:'dev'};
  const token=req.headers.get('authorization')?.replace(/^Bearer /,'') || '';
  if(token)for(const role of ['admin','editor','reader'] as const){const secret=tokenFor(role);if(secret&&equal(token,secret))return {role,via:'bearer'};}
  // Legacy cookie (role.expiry.hmac) from before server-side sessions. Accepted only until it expires
  // (at most 8 hours after deployment) unless ET_LEGACY_SESSIONS=off. It cannot be revoked, so it is phased out.
  const legacy=cookie(req,'et_session');
  if(legacy&&process.env.ET_LEGACY_SESSIONS!=='off'){const [role,expiry,sig]=legacy.split('.');if(['admin','editor','reader'].includes(role)&&Number(expiry)>Date.now()&&Number(expiry)<Date.now()+SESSION_HOURS*3600_000+60_000){
    const key=tokenFor(role as 'admin');if(key&&equal(sig||'',createHmac('sha256',key).update(role+'.'+expiry).digest('hex')))return {role:role as Role,via:'legacy-session'};
  }}
  return {role:'public',via:'none'};
}
const cookie=(req:Request,name:string)=>(req.headers.get('cookie')||'').match(new RegExp('(?:^|; )'+name+'=([^;]+)'))?.[1];

// Full resolution including revocable server-side sessions.
export async function principal(req:Request,db:Database):Promise<Principal>{
 const base=bearerOrLegacy(req);if(base.role!=='public')return base;
 const raw=cookie(req,'et_sid');if(!raw)return base;
 const [sid,sig]=raw.split('.');if(!sid||!sig||!/^[a-f0-9]{48}$/.test(sid)||!equal(sig,sign(sid)))return base;
 const row=(await db.query<{role:Exclude<Role,'public'>;token_fingerprint:string}>('SELECT role,token_fingerprint FROM sessions WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()',[sid])).rows[0];
 if(!row||!equal(row.token_fingerprint,fingerprint(row.role)))return base;
 return {role:row.role,session:sid,via:'session'};
}
export async function createSession(db:Database,role:Exclude<Role,'public'>,clientHash:string){
 const sid=randomBytes(24).toString('hex');
 await db.query("INSERT INTO sessions(id,role,token_fingerprint,client_hash,expires_at) VALUES($1,$2,$3,$4,now()+($5 * interval '1 hour'))",[sid,role,fingerprint(role),clientHash,SESSION_HOURS]);
 await db.query("DELETE FROM sessions WHERE expires_at<now()-interval '7 days'");
 return {value:`${sid}.${sign(sid)}`,maxAge:SESSION_HOURS*3600,sid};
}
export async function revokeSession(db:Database,sid?:string){if(sid)await db.query('UPDATE sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL',[sid]);}
export async function revokeAllSessions(db:Database){return (await db.query('UPDATE sessions SET revoked_at=now() WHERE revoked_at IS NULL RETURNING id')).rows.length;}
// Audit actor: role plus a session reference, so actions are attributable to a sign-in (not yet to a named person).
export const actor=(p:Principal)=>p.session?`${p.role}:${p.session.slice(0,8)}`:`${p.role}:${p.via}`;
export const atLeast=(role:Role,min:Role)=>ORDER.indexOf(role)>=ORDER.indexOf(min);

export function requireRole(req:Request,min:'reader'|'editor'|'admin',p?:Principal) {
  const role=p?.role??roleFor(req);if(!atLeast(role,min))throw new Error('FORBIDDEN');
  if(req.method!=='GET' && !csrfSafe(req,p?.via??(req.headers.get('authorization')?'bearer':'session')))throw new Error('FORBIDDEN');return role;
}
// CSRF guard. Cookie-authenticated (browser) writes must prove same origin: an Origin header matching the host,
// or Sec-Fetch-Site: same-origin. Bearer-token clients are not browsers and carry no ambient credentials.
export function csrfSafe(req:Request,via:Principal['via']){
 if(via==='bearer'||via==='dev')return sameOrigin(req);
 const origin=req.headers.get('origin');if(origin)return sameOrigin(req);
 return req.headers.get('sec-fetch-site')==='same-origin';
}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return true;try{const host=req.headers.get('x-forwarded-host')||req.headers.get('host')||new URL(req.url).host;return new URL(origin).host===host;}catch{return false;}}
// Legacy cookie issuer kept for the test-suite contract; new sign-ins use createSession.
export function sessionCookie(role:Role){const exp=Date.now()+SESSION_HOURS*3600_000;const secret=process.env[role.toUpperCase()+'_TOKEN']!;return `${role}.${exp}.${createHmac('sha256',secret).update(role+'.'+exp).digest('hex')}`;}

// Security policy for autonomous research agents. Agents are untrusted with respect to authority: they may
// read and propose, never publish, approve, change provider configuration or alter statistics directly.
// Every external document is DATA. Nothing an agent reads can grant it a capability.
import {isIP} from 'node:net';

export const AGENT_CAPABILITIES=['read:published','read:restricted-research','fetch:external-source','write:proposal','write:agent-log'] as const;
export type Capability=typeof AGENT_CAPABILITIES[number];
// Actions that always require an authenticated human with the stated role, whatever any agent proposes.
export const HUMAN_ONLY_ACTIONS={publish:'admin','publish-set':'admin',provider:'admin','revoke-sessions':'admin',review:'editor',task:'editor','human-validate':'editor'} as const;
export type AgentName='source-acquisition'|'witness-independence'|'cognitive-science'|'objective-evidence'|'machine-coder-a'|'machine-coder-b'|'adversarial-review'|'statistical-eligibility'|'orchestrator';
// Least privilege: each agent gets only what its job needs.
export const AGENT_GRANTS:Record<AgentName,Capability[]>={
 'source-acquisition':['read:published','fetch:external-source','write:proposal','write:agent-log'],
 'witness-independence':['read:restricted-research','write:proposal','write:agent-log'],
 'cognitive-science':['read:published','write:proposal','write:agent-log'],
 'objective-evidence':['read:restricted-research','write:proposal','write:agent-log'],
 'machine-coder-a':['read:restricted-research','write:proposal','write:agent-log'],
 'machine-coder-b':['read:restricted-research','write:proposal','write:agent-log'],
 'adversarial-review':['read:restricted-research','write:proposal','write:agent-log'],
 'statistical-eligibility':['read:restricted-research','write:proposal','write:agent-log'],
 'orchestrator':['write:agent-log']
};
export class AgentPolicyError extends Error{}
export function authorizeAgent(agent:AgentName,need:Capability|keyof typeof HUMAN_ONLY_ACTIONS){
 if(need in HUMAN_ONLY_ACTIONS)throw new AgentPolicyError(`${agent} may not perform "${need}": it requires a signed-in ${HUMAN_ONLY_ACTIONS[need as keyof typeof HUMAN_ONLY_ACTIONS]}.`);
 if(!AGENT_GRANTS[agent]?.includes(need as Capability))throw new AgentPolicyError(`${agent} lacks capability ${need}.`);
}

// SSRF guard for source acquisition: https only, no credentials, standard port, public hostnames only.
const privateV4=[/^10\./,/^127\./,/^169\.254\./,/^172\.(1[6-9]|2\d|3[01])\./,/^192\.168\./,/^0\./,/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];
export function safeSourceUrl(raw:string){
 let u:URL;try{u=new URL(raw);}catch{throw new AgentPolicyError('Not a URL');}
 if(u.protocol!=='https:')throw new AgentPolicyError('Only https sources are fetched');
 if(u.username||u.password)throw new AgentPolicyError('URLs with credentials are refused');
 if(u.port&&u.port!=='443')throw new AgentPolicyError('Non-standard ports are refused');
 const h=u.hostname.replace(/^\[|\]$/g,'').toLowerCase();
 if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||!h.includes('.'))throw new AgentPolicyError('Internal hostnames are refused');
 if(isIP(h)===4&&privateV4.some(r=>r.test(h)))throw new AgentPolicyError('Private addresses are refused');
 if(isIP(h)===6)throw new AgentPolicyError('Literal IPv6 addresses are refused');
 if(/(^|\.)onrender\.com$/.test(h)&&/et-researcher/.test(h))throw new AgentPolicyError('Agents may not call this application');
 u.hash='';return u.toString();
}
// Note: DNS rebinding (a public name resolving to a private address) must also be blocked at fetch time by
// resolving the name and re-checking the address; see fetchExternal in the agent runtime.

// Untrusted text: flag instruction-like content and wrap it so a model sees it as quoted data.
const injection=[/ignore (all|any|the|previous|prior) (instructions|rules)/i,/you are (now|no longer)/i,/system prompt/i,/\b(publish|approve|mark .* as (verified|validated|human))\b/i,/set (status|classification|eligibility) to/i,/<\s*\/?\s*(system|assistant|tool)\s*>/i,/\bBEGIN (SYSTEM|ADMIN)\b/i];
export function inspectUntrusted(text:string){return injection.filter(r=>r.test(text)).map(r=>r.source);}
export function asData(sourceId:string,text:string){return {sourceId,untrusted:true as const,flags:inspectUntrusted(text),text:text.slice(0,20000)};}

// Deterministic validation of anything an agent returns. Agents can only propose values from the vocabulary,
// must cite records they were given, and can never claim human validation or change publication.
export const VERDICTS=['YES','NO','UNKNOWN','CONFLICTED','NOT_APPLICABLE'] as const;
export type Proposal={field:string;value:typeof VERDICTS[number];citations:string[];rationale:string};
const FORBIDDEN_FIELDS=/^(publication|status|human_validated|reviewer|actor|role|p_value|statistic)/i;
export function validateProposals(agent:AgentName,proposals:unknown,allowedCitations:Set<string>):Proposal[]{
 authorizeAgent(agent,'write:proposal');
 if(!Array.isArray(proposals)||proposals.length>200)throw new AgentPolicyError('Proposals must be a list of at most 200 items');
 return proposals.map((p,i)=>{
  const x=p as Partial<Proposal>;
  if(typeof x.field!=='string'||!/^[A-Za-z0-9_ /?-]{1,80}$/.test(x.field))throw new AgentPolicyError(`Proposal ${i}: invalid field`);
  if(FORBIDDEN_FIELDS.test(x.field))throw new AgentPolicyError(`Proposal ${i}: agents may not set "${x.field}"`);
  if(!VERDICTS.includes(x.value as never))throw new AgentPolicyError(`Proposal ${i}: value must be one of ${VERDICTS.join(', ')}`);
  if(!Array.isArray(x.citations))throw new AgentPolicyError(`Proposal ${i}: citations required`);
  if(x.value!=='UNKNOWN'&&x.value!=='NOT_APPLICABLE'&&!x.citations.length)throw new AgentPolicyError(`Proposal ${i}: a ${x.value} needs at least one citation`);
  const bad=x.citations.filter(c=>!allowedCitations.has(c));if(bad.length)throw new AgentPolicyError(`Proposal ${i}: cites records it was not given (${bad.join(', ')})`);
  if(typeof x.rationale!=='string'||x.rationale.length>4000)throw new AgentPolicyError(`Proposal ${i}: rationale required (≤4000 chars)`);
  return {field:x.field,value:x.value as Proposal['value'],citations:x.citations,rationale:x.rationale};
 });
}

// Evidence-protection & proof hypothesis (v01). Every value here is a SCENARIO INPUT, never an observed estimate.
export type Stage={id:string;label:string;question:string;technology:string;biology:string;evidenceNeeded:string;variables:string[]};
export const sixStage:Stage[]=[
 {id:'S',label:'Survival',question:'An authentic item survives in examinable condition.',technology:'Material remains intact enough for microscopy, trace chemistry and isotope work.',biology:'Tissue or residue survives without degradation that prevents molecular, structural or isotopic analysis.',evidenceNeeded:'Storage records, condition reports, preservation history.',variables:['Elapsed time','Storage conditions','Organizational preservation practice']},
 {id:'L',label:'Locatability',question:'The item is uniquely locatable and identifiable, with a custodian or accession number.',technology:'Accessioned object with a unique identifier.',biology:'Labelled specimen with a collection record.',evidenceNeeded:'Accession numbers, finding aids, inventories.',variables:['Record discoverability','Classification','Organizational turnover']},
 {id:'A',label:'Access',question:'Lawful, adequately controlled researcher access is secured.',technology:'Legal access for independent laboratories.',biology:'Access with biosafety, consent and export permissions.',evidenceNeeded:'FOIA and records responses, custodian agreements.',variables:['Institutional secrecy and compartmentalization','Legal ownership','Reputational incentives']},
 {id:'C',label:'Custody',question:'Event-to-item provenance, dated transfers and contamination controls are reconstructable and withstand audit.',technology:'Continuous signed transfer chain from recovery to laboratory.',biology:'Sterile sampling and controls documented at every transfer.',evidenceNeeded:'Transfer manifests, item labels, handling logs.',variables:['Reporting dependence','Record loss','Social contamination of accounts']},
 {id:'D',label:'Diagnosis',question:'Testing gives independently discriminating positive evidence after terrestrial, industrial, meteoritic and fraud alternatives.',technology:'Blind microscopy, isotope and manufacturing analysis that excludes terrestrial, industrial and meteoritic origins.',biology:'Orthogonal molecular, structural, chemical and isotopic evidence excluding Earth contamination and unknown terrestrial species.',evidenceNeeded:'Raw assay data, controls, documented negative alternatives.',variables:['Laboratory independence','Method validity']},
 {id:'R',label:'Replication',question:'Blinded independent split-sample replication and methodological scrutiny corroborate the origin inference.',technology:'Independent laboratories reproduce the discriminating result.',biology:'Independent laboratories reproduce results on split samples with controls.',evidenceNeeded:'Split-sample protocols, independent reports.',variables:['Media amplification','Publication incentives']}
];
// Expanded eight-stage model requested for the platform; it refines S–R without changing their meaning.
export const eightStage:Stage[]=[
 {...sixStage[0],id:'survival',label:'Physical survival'},
 {...sixStage[1],id:'discoverability',label:'Record & item discoverability',question:'Records and the item itself can be found by an outside investigator.'},
 {...sixStage[2],id:'access',label:'Legal & institutional access'},
 {id:'identification',label:'Event-to-item identification',question:'The located item is correctly identified as the one from the specific event.',technology:'Unique markings or inventory linking the object to the event.',biology:'Specimen labelling linking the sample to the event and recovery.',evidenceNeeded:'Contemporaneous inventories, photographs, item descriptions from independent first statements.',variables:['Reporting dependence','Co-witness contamination']},
 {id:'preservation',label:'Preservation & contamination control',question:'Handling has not altered or contaminated the item.',technology:'Handling logs, cleanroom procedures, surface-contamination controls.',biology:'Sterile handling, negative and positive controls, contamination exclusion.',evidenceNeeded:'Handling protocols and control results.',variables:['Organizational preservation practices']},
 {id:'custody',label:'Chain-of-custody continuity',question:'Every transfer from recovery to laboratory is documented without gaps.',technology:'Signed, dated transfer manifests.',biology:'Signed, dated transfer manifests with storage conditions.',evidenceNeeded:'Transfer manifests and a custody audit.',variables:['Institutional secrecy','Record loss']},
 {...sixStage[4],id:'diagnosis',label:'Independent diagnostic examination'},
 {...sixStage[5],id:'replication',label:'Independent replication & falsification'}
];
// The v01 document's own illustrative scenarios (six-stage). Products: 0.0307%, 0.819%, 52.63%.
export const presets6:{name:string;values:number[]}[]=[
 {name:'Fragmented historic archive',values:[35,15,20,10,45,65]},
 {name:'Illustrative midpoint',values:[60,30,35,25,65,80]},
 {name:'Prospective best practice',values:[95,90,90,95,80,90]}
];
// Platform scenarios for the expanded model. Equally illustrative; none is measured.
export const presets8:{name:string;values:number[]}[]=[
 {name:'Fragmented historic archive',values:[35,15,20,40,50,25,45,65]},
 {name:'Illustrative midpoint',values:[60,30,35,60,60,45,65,80]},
 {name:'Prospective best practice',values:[95,90,90,98,98,97,80,90]}
];
export function chain(values:number[]){if(!values.length||values.some(v=>!Number.isFinite(v)||v<0||v>100))throw new Error('Scenario inputs must be 0–100%.');let product=1;return values.map(v=>(product*=v/100));}
// Which single stage, raised by `step` points, most increases the combined rate: a measurement-priority hint, not evidence.
export function mostLeveraged(values:number[],step=10){const base=chain(values).at(-1)!;return values.map((v,i)=>{const next=[...values];next[i]=Math.min(100,v+step);return {index:i,gain:chain(next).at(-1)!-base};}).sort((a,b)=>b.gain-a.gain)[0];}
export const socialVariables=[
 {name:'Institutional secrecy & classification',prediction:'Restricted holdings reduce stage A (access) without changing what the item is.',test:'Compare access outcomes for classified versus unclassified records of matched conventional objects.'},
 {name:'Reputational incentives & stigma',prediction:'Stigma suppresses some first reports; attention rewards later retelling.',test:'Compare timing of first statements with public attention spikes.'},
 {name:'Reporting dependence',prediction:'Later witnesses repeat details introduced by earlier ones.',test:'Build a contact-and-media exposure graph before counting witnesses.'},
 {name:'Organizational preservation practices',prediction:'Routine disposal and turnover reduce survival (S) and discoverability (L).',test:'Measure retention outcomes for comparable conventional evidence in the same institutions.'},
 {name:'Media amplification',prediction:'Retelling volume grows faster than accessioned original files or replicated measurements.',test:'Track counts of articles versus counts of new primary records over time.'},
 {name:'Social contamination',prediction:'Shared narratives converge on gist while fine details drift.',test:'Compare earliest and later statement versions for gist and verbatim detail.'}
];

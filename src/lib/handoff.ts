// Content from the Science project handoff (15 Oct 2026), cross-checked against the v08 protocol and Requirements_Trace_v08.
// Nothing here is a research result; it records plans, targets, guardrails and scope.

export const roadmap=[
 {phase:'Completed',title:'v08 consolidation',work:'Archive preservation, research-question mapping, quantitative reproduction and integrity documentation.',acceptance:'Done: 63 package members checksum-verified; GEIPAN result reproduced.',done:true},
 {phase:'Phase 1',title:'Dataset reconciliation',work:'Retrieve the missing v07 files, verify historical versions and resolve provisional case identity matches.',acceptance:'Auditable lineage without duplicated independent incidents.',gaps:['G001','G007','G012']},
 {phase:'Phase 2',title:'Primary source acquisition',work:'Prioritize 100 fully source-adjudicated independent incident records: earliest firsthand statements, original investigative materials, conventional counterevidence and technical records.',acceptance:'Every coded finding traces to an identifiable source and retrieval record.',gaps:['G002','G008','G011']},
 {phase:'Phase 3',title:'Independent corroboration',work:'Reconstruct testimony chronology, witness information networks, artifact identity, custody transfers and instrument provenance.',acceptance:'Independence and object identity are demonstrated rather than assumed.',gaps:['G003','G006']},
 {phase:'Phase 4',title:'Independent coding',work:'Introduce a blinded second human coder, a discrepancy register and actual inter-rater reliability calculations.',acceptance:'Defensible, reproducible classification.',gaps:['G005']},
 {phase:'Phase 5',title:'Valid statistical analysis',work:'Build the incident-level RQ1 dataset, establish resolved comparison groups, assess missingness and clustering, and preregister confirmatory analysis where appropriate.',acceptance:'Statistical eligibility established before testing.',gaps:['G002','G004','G009']},
 {phase:'Phase 6',title:'External scientific validation',work:'Pursue independent material testing only where authenticated surviving samples genuinely exist; keep sensor and physical-recovery pathways parallel.',acceptance:'Raw measurements, appropriate controls and independent reproducibility.',gaps:['G006','G010']}
];

export const recruitment=[
 {target:'100',unit:'fully source-adjudicated independent incidents',note:'First milestone, before attempting RQ1 (protocol).'},
 {target:'≈500',unit:'incident records',note:'Original recruitment ambition, if genuinely obtainable.'},
 {target:'≈1,000',unit:'witness statements',note:'Collection aspiration, not a quota.'},
 {target:'≥150',unit:'resolved comparison cases',note:'Conventional controls for the RQ1 design.'}
];

export const guardrails=[
 'Never turn multiple retellings of one originating account into independent witnesses.',
 'Never present a mathematical simulation as an empirical laboratory discovery.',
 'Never generate a significance test merely because a numerical table can be constructed.',
 'Preserve contrary evidence with the same rigor applied to supporting evidence.',
 'Never use synthetic or invented observations to meet recruitment targets.'
];

// Secondary Science track. Requirement REQ025: kept separate from UAP evidentiary inference and event counts.
export const mars={
 question:'Given sufficient energy, liquid water, suitable chemical precursors, environmental stability and time, is the emergence of life a probable natural process or an extraordinarily rare chemical transition?',
 sequence:[
  {step:'Mathematical feasibility modeling',detail:'Whether established physics and chemistry suffice to simulate plausible pathways toward more complex prebiotic chemistry.'},
  {step:'Planetary environment selection',detail:'A research-supported environment potentially compatible with past or present life, emphasizing Mars (Jezero).'},
  {step:'Environmental & energy modeling',detail:'Known or constrained conditions: energy availability, water, precursor molecules and environmental variability.'},
  {step:'Chemical reaction network',detail:'Couple Mars-relevant precursor chemistry to the environmental model, rather than relying on abstract probability estimates.'},
  {step:'Experimental calibration',detail:'Identify the empirical measurements needed to make the computational model meaningful.'},
  {step:'Abiotic mineral-structure hypothesis',detail:'Could an iron-phosphate rim with an iron-sulfide core form without biological activity?'},
  {step:'Mars-analog simulation conditions',detail:'Mars-analog sediment, 0–10 °C, no biological activity, with appropriate controls.'},
  {step:'Sequence computation',detail:'Modeled reaction sequences exploring plausible chemical and mineral formation pathways.'}
 ],
 // Evidence ladder: what exists at each level today. The v08 archive holds no Mars outputs.
 ladder:[
  {level:'Mathematical feasibility',status:'Requested in project conversations; no preserved output'},
  {level:'Computational simulation',status:'No simulation package or raw reaction-network output preserved'},
  {level:'Existing empirical measurements',status:'Not yet compiled into a project dataset'},
  {level:'Proposed experiments',status:'Defined: abiotic Fe-phosphate rim / Fe-sulfide core reproduction at 0–10 °C in Mars-analog sediment'},
  {level:'Completed laboratory findings',status:'None'}
 ],
 open:[
  'A controlled abiotic comparison for the iron-phosphate / iron-sulfide association.',
  'A stated list of observations that would distinguish abiotic formation from biological or biologically influenced processes, written before testing.',
  'Empirical calibration against appropriate Mars-analog mineral and reaction data.',
  'Recovery of any earlier computational outputs, with inputs and code, before they are cited.'
 ]
};

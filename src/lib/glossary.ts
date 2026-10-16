// Semantic status vocabulary shared by every page. Each status has a text label and a symbol, so meaning never
// depends on colour alone. The same definitions feed the sticky status key and the Methodology glossary.
export type StatusKey='verified'|'provisional'|'simulation'|'excluded'|'negative'|'unknown';
export const statuses:{key:StatusKey;label:string;symbol:string;tone:string;meaning:string}[]=[
 {key:'verified',label:'Verified',symbol:'✓',tone:'green',meaning:'Passed a stated gate: computed from real published counts, or confirmed against a primary source.'},
 {key:'provisional',label:'Provisional',symbol:'◐',tone:'blue',meaning:'Real work by a machine or a single pass (AI extraction, name match, metadata check). Not yet adjudicated by a person.'},
 {key:'simulation',label:'Simulation',symbol:'∿',tone:'blue',meaning:'Invented inputs for teaching or planning. Never observed UAP data, a rate or a probability.'},
 {key:'excluded',label:'Excluded',symbol:'⊘',tone:'amber',meaning:'Kept on record but left out of an analysis for a stated reason (for example, no independent outcome).'},
 {key:'negative',label:'Negative',symbol:'✗',tone:'red',meaning:'Checked adequately and not supported (for example, terrestrial isotopes). A result, not a failure of the project.'},
 {key:'unknown',label:'Unknown',symbol:'?',tone:'neutral',meaning:'Not yet established. Missing evidence is never treated as negative evidence.'}
];
// Plain-language definitions for terms used across the interface.
export const glossary:[string,string][]=[
 ['BLOCKED / Not yet inferentially testable','The protocol forbids running the test until eligible data exist. It is not a negative result.'],
 ['PARTIAL AUDIT','Some links in a chain are documented; at least one required link is missing.'],
 ['NOT ESTABLISHED','The standard was checked against the audited records and is not met.'],
 ['Source-verified metadata lead','A publication whose link, title, date and identifier passed machine checks. Its research has not been adjudicated.'],
 ['Human review required','A person must decide: corrections, physical-material claims, case links or failed checks.'],
 ['Operational progress','Work done (retrieved, extracted, indexed). Shown separately from evidence that passed a gate.'],
 ['Evidence readiness','Rows that passed a scientific gate (primary source, human coding, eligibility).'],
 ['Independent account','A first statement made before contact with other witnesses or media coverage, documented in a separate original record.'],
 ['Authenticated outcome','Sensor or physical evidence independently verified as genuine, whatever its origin.'],
 ['GEIPAN category D','Unexplained after investigation with adequate data. Not the same as C (insufficient information) and not an origin.'],
 ['Effect size (Cramér’s V)','Strength of association from 0 to 1; about 0.2 is small to moderate.'],
 ['Design effect','How much clustering (shared sources, shared investigations) inflates the sample needed.'],
 ['Scenario Lab','Teaching calculators with user-chosen inputs. Outputs are arithmetic, not findings.'],
 ['Private / access-restricted','A publication setting. It says nothing about evidential strength or possession of physical evidence.']
];
// Navigation groups (information architecture). Mars stays a separate branch.
export const navGroups:{label:string;items:string[]}[]=[
 {label:'Discover',items:['overview','feed','cases']},
 {label:'Research',items:['findings','statistics','psychology','protection','priorities']},
 {label:'Standards',items:['methodology']},
 {label:'Separate science track',items:['mars']}
];

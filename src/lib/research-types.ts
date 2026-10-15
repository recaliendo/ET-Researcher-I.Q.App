// Browser-safe research types and constants (no database imports).
export type ResearchRow=Record<string,string>;
export type ResearchRecord={id:string;collection:string;source_id:string;release:string;payload:ResearchRow;publication:string};
export const taskStates=['Proposed','Source Located','Collection in Progress','Evidence Extracted','Review Required','Adjudicated','Completed','Blocked'] as const;

export const historical={periods:['1950–1959','1960–1969','1970–1979','1980–1989','1990–1999','2000–2009','2010–2013'],total:[34,32,691,422,325,306,159],d:[11,9,149,105,80,23,4]};
export function contingency(table:number[][]){
 if(table.length<2||table.length>100||table.some(r=>r.length!==2||r.some(v=>!Number.isSafeInteger(v)||v<0||v>1e7)))throw new Error('Use 2–100 rows of two nonnegative integer counts.');
 const n=table.flat().reduce((a,b)=>a+b,0),cols=[0,1].map(j=>table.reduce((a,r)=>a+r[j],0));
 if(!n||cols.some(c=>c===0)||table.some(r=>r[0]+r[1]===0))throw new Error('Every row and column must have a positive total.');
 const expected=table.map(r=>cols.map(c=>(r[0]+r[1])*c/n));
 const contributions=table.map((r,i)=>r.map((o,j)=>(o-expected[i][j])**2/expected[i][j]));
 const chi2=contributions.flat().reduce((a,b)=>a+b,0);const df=table.length-1;
 return {n,chi2,df,expected,contributions,v:Math.sqrt(chi2/n),minimumExpected:Math.min(...expected.flat()),p:gammaQ(df/2,chi2/2)};
}
// Regularized upper incomplete gamma, evaluated directly in the tail to avoid cancellation.
function logGamma(z:number):number{const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);z--;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+7.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);}
function gammaQ(a:number,x:number){if(x===0)return 1;const factor=Math.exp(-x+a*Math.log(x)-logGamma(a));if(x<a+1){let sum=1/a,del=sum,ap=a;for(let n=1;n<1000;n++){ap++;del*=x/ap;sum+=del;if(Math.abs(del)<Math.abs(sum)*1e-14)break;}return Math.max(0,1-sum*factor);}let b=x+1-a,c=1e30,d=1/b,h=d;for(let i=1;i<1000;i++){const an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-30)d=1e-30;c=b+an/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<1e-14)break;}return h*factor;}
export function proofChain(values:number[]){if(values.some(v=>!Number.isFinite(v)||v<0||v>100))throw new Error('Invalid scenario input');let product=1;return values.map(v=>(product*=v/100));}
// Values published in the v0.8 package (statistical_results_v08.json); the live calculation must reproduce them.
export const verified={chi2:77.81084994145675,df:6,p:1.0113352396285667e-14,v:0.19879123030466417,minimumExpected:6.19197562214322,n:1969,bootstrapCI:[0.1738062653346751,0.23646825703924387] as [number,number],bootstrapResamples:20000,seed:20261015,source:'https://arxiv.org/pdf/1509.00571'};
export const historicalTable=()=>historical.total.map((t,i)=>[historical.d[i],t-historical.d[i]]);
export function reproduces(result:{chi2:number;p:number;v:number},tolerance=1e-6){return Math.abs(result.chi2-verified.chi2)<tolerance*verified.chi2&&Math.abs(result.v-verified.v)<tolerance&&Math.abs(Math.log10(result.p)-Math.log10(verified.p))<1e-4;}
// Standardized (Pearson) residual for each cell: (O−E)/√E.
export function residuals(table:number[][]){const {expected}=contingency(table);return table.map((r,i)=>r.map((o,j)=>(o-expected[i][j])/Math.sqrt(expected[i][j])));}
// Sensitivity: recompute after dropping each row in turn, so no single era silently drives the association.
export function leaveOneOut(table:number[][],labels:string[]){return table.map((_,i)=>{const r=contingency(table.filter((__,j)=>j!==i));return {omitted:labels[i],n:r.n,chi2:r.chi2,df:r.df,p:r.p,v:r.v};});}
// Wilson score interval for a row proportion.
export function wilson(k:number,n:number,z=1.959963984540054){if(!n)return [0,0];const p=k/n,d=1+z*z/n,c=p+z*z/(2*n),h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return [(c-h)/d,(c+h)/d];}
function logFactorial(n:number){let s=0;for(let i=2;i<=n;i++)s+=Math.log(i);return s;}
// Two-sided Fisher exact test for a 2×2 table (sums hypergeometric probabilities no larger than the observed one).
export function fisherExact(table:number[][]){
 if(table.length!==2||table.some(r=>r.length!==2||r.some(v=>!Number.isSafeInteger(v)||v<0)))throw new Error('Fisher exact test requires a 2×2 table of nonnegative counts.');
 const [[a,b],[c,d]]=table,r1=a+b,r2=c+d,c1=a+c,n=r1+r2;if(n>20000)throw new Error('Table too large for exact enumeration.');
 const base=logFactorial(r1)+logFactorial(r2)+logFactorial(c1)+logFactorial(n-c1)-logFactorial(n);
 const prob=(x:number)=>Math.exp(base-logFactorial(x)-logFactorial(r1-x)-logFactorial(c1-x)-logFactorial(r2-c1+x));
 const observed=prob(a);let p=0;for(let x=Math.max(0,c1-r2);x<=Math.min(r1,c1);x++){const q=prob(x);if(q<=observed*(1+1e-7))p+=q;}
 return {p:Math.min(1,p),oddsRatio:b*c===0?null:(a*d)/(b*c)};
}
// Acklam rational approximation of the standard normal quantile; adequate for planning arithmetic.
function normalQuantile(p:number){
 const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
 const q=p<.5?p:1-p;let x:number;
 if(q<.02425){const t=Math.sqrt(-2*Math.log(q));x=(((((c[0]*t+c[1])*t+c[2])*t+c[3])*t+c[4])*t+c[5])/((((d[0]*t+d[1])*t+d[2])*t+d[3])*t+1);}
 else{const t=q-.5,r=t*t;x=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*t/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
 return p<.5?x:-x;
}
// Planning N for a df=1 chi-square test (2×2) at effect size w; assumes independent units.
export function requiredN(w:number,power=.8,alpha=.05){if(!(w>0&&w<=1&&power>.5&&power<1&&alpha>0&&alpha<.5))throw new Error('Invalid planning inputs');return Math.ceil((normalQuantile(1-alpha/2)+normalQuantile(power))**2/(w*w));}
// Effective number of independent accounts under average pairwise dependence rho (design-effect identity). Educational only.
export function effectiveWitnesses(n:number,rho:number){if(n<1||rho<0||rho>1)throw new Error('Invalid inputs');return n/(1+(n-1)*rho);}

"""Independent numerical service. No research labels are inferred from user counts."""
import math, os
import numpy as np
from scipy.stats import chi2_contingency, fisher_exact, chi2, ncx2
from scipy.optimize import brentq
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field

app=FastAPI(title='ET Researcher I.Q. analytical service')
class Analysis(BaseModel):
    table: list[list[int]]
    mode: str='educational'
    bootstrap: int=Field(default=2000,ge=100,le=20000)
    effect: float=Field(default=.2,gt=0,le=1)
    power: float=Field(default=.8,gt=.5,lt=1)

@app.post('/analyze')
def analyze(body:Analysis, authorization:str|None=Header(default=None)):
    token=os.getenv('ANALYTICS_TOKEN')
    if token and authorization!='Bearer '+token: raise HTTPException(403,'Forbidden')
    a=np.array(body.table)
    if a.ndim!=2 or a.shape[1]!=2 or not 2<=a.shape[0]<=100 or (a<0).any() or (a>10_000_000).any() or (a.sum(0)==0).any() or (a.sum(1)==0).any(): raise HTTPException(400,'Invalid counts or zero margin')
    x,p,df,e=chi2_contingency(a,correction=False)
    n=int(a.sum()); v=math.sqrt(x/n); rng=np.random.default_rng(20261015); draws=[]
    for _ in range(body.bootstrap):
        b=rng.multinomial(n,a.flatten()/n).reshape(a.shape)
        if (b.sum(0)>0).all() and (b.sum(1)>0).all(): draws.append(math.sqrt(chi2_contingency(b,correction=False)[0]/n))
    critical=chi2.isf(.05,1)
    required=math.ceil(brentq(lambda m:ncx2.sf(critical,1,m*body.effect**2)-body.power,1,1e9))
    fisher=None
    if a.shape==(2,2):
        odds,fp=fisher_exact(a);fisher={'odds_ratio':float(odds) if math.isfinite(odds) else None,'p':float(fp),'alternative':'two-sided'}
    return {'n':n,'chi2':float(x),'p':float(p),'df':int(df),'expected':e.tolist(),'v':v,'ci':np.quantile(draws,[.025,.975]).tolist(),'fisher':fisher,'power_n':required,'seed':20261015,'resamples':len(draws),'warning':'Secondary association or educational counts, never ET likelihood. CI is conditional multinomial bootstrap; no independent replication. Planning N assumes independent units and df=1.'}

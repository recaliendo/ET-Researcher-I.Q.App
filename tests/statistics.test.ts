import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contingency,historicalTable,verified,reproduces,leaveOneOut,historical,fisherExact,requiredN,wilson,effectiveWitnesses} from '../src/lib/statistics';
import {chain,presets6,presets8,sixStage,eightStage,mostLeveraged} from '../src/lib/proof';
import {sdt} from '../src/lib/psychology';

test('GEIPAN era × D/non-D reproduces the verified v0.8 result',()=>{
 const r=contingency(historicalTable());
 assert.equal(r.n,1969);assert.equal(r.df,6);
 assert.ok(Math.abs(r.chi2-77.81084994145675)<1e-8,`chi2 ${r.chi2}`);
 assert.ok(Math.abs(r.v-0.19879123030466417)<1e-10,`V ${r.v}`);
 assert.ok(Math.abs(r.p-1.0113352396285667e-14)/1.0113352396285667e-14<1e-4,`p ${r.p}`);
 assert.ok(Math.abs(r.minimumExpected-verified.minimumExpected)<1e-9);
 assert.ok(reproduces(r));
});
test('category counts keep D separate from non-D totals',()=>{
 assert.equal(historical.d.reduce((a,b)=>a+b),381);
 assert.equal(historicalTable().reduce((a,r)=>a+r[1],0),1588);
});
test('leave-one-out sensitivity drops exactly one era each time',()=>{
 const s=leaveOneOut(historicalTable(),historical.periods);
 assert.equal(s.length,7);for(const row of s){assert.equal(row.df,5);assert.ok(row.n<1969);}
});
test('contingency rejects invalid tables',()=>{
 assert.throws(()=>contingency([[1,2]]));assert.throws(()=>contingency([[0,0],[1,1]]));assert.throws(()=>contingency([[1,-1],[1,1]]));
});
test('Fisher exact test matches known values',()=>{
 assert.ok(Math.abs(fisherExact([[3,1],[1,3]]).p-0.4857142857)<1e-8);
 assert.ok(Math.abs(fisherExact([[10,0],[0,10]]).p-1.0825088224469026e-5)<1e-10);
 assert.equal(fisherExact([[5,5],[5,5]]).p,1);
});
test('power planning matches the package Power_v08 table',()=>{
 assert.equal(requiredN(.1,.8),785);assert.equal(requiredN(.1,.9),1051);assert.equal(requiredN(.2,.8),197);
 assert.equal(requiredN(.2,.9),263);assert.equal(requiredN(.3,.8),88);assert.equal(requiredN(.3,.9),117);
});
test('Wilson interval contains the point estimate',()=>{const [lo,hi]=wilson(11,34);assert.ok(lo<11/34&&11/34<hi&&lo>0&&hi<1);});
test('effective witnesses shrink with information sharing',()=>{assert.equal(effectiveWitnesses(6,0),6);assert.equal(effectiveWitnesses(6,1),1);});

test('v01 proof-chain scenarios reproduce the hypothesis document',()=>{
 const r=presets6.map(p=>chain(p.values).at(-1)!*100);
 assert.ok(Math.abs(r[0]-0.0307125)<1e-6);assert.ok(Math.abs(r[1]-0.819)<1e-9);assert.ok(Math.abs(r[2]-52.6338)<1e-3);
});
test('proof-chain models have matching stage and preset lengths',()=>{
 assert.equal(sixStage.length,6);assert.equal(eightStage.length,8);
 for(const p of presets6)assert.equal(p.values.length,6);for(const p of presets8)assert.equal(p.values.length,8);
 assert.throws(()=>chain([120]));assert.ok(mostLeveraged(presets6[1].values).gain>0);
});
test('signal detection demo is symmetric at a neutral criterion',()=>{const {hit,falseAlarm}=sdt(2,0);assert.ok(Math.abs(hit+falseAlarm-1)<1e-6);});

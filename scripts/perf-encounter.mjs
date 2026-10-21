// Headless simulation cost only (Node, no rendering). This is NOT browser frame time or device performance.
// PERF_BATTLEFIELD=<registered battlefield id> also measures the extended encounter on that battlefield, alternating with Meadow in every
// round; without it the runs and the output are the legacy ones.
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{Simulation}=require('../.test-build/simulation/Simulation.js');
const ticks=Number(process.env.PERF_TICKS||9000),rounds=5,out=process.env.EVIDENCE_ROOT||'docs/phase2c',field=process.env.PERF_BATTLEFIELD;
const {runPolicy}=await import('./simulate-encounter.mjs');
function run(encounter,battlefield){const r=runPolicy('defend',{encounter,battlefield,maxMinutes:ticks/1800,measure:true,seed:'perf'});return {msPerTick:r.advanceMs/(r.seconds*30),maxTickMs:r.maxAdvanceMs,peakUnits:r.peakUnits,ticks:Math.round(r.seconds*30),ended:r.outcome,waves:r.waves,...(battlefield&&{navigation:r.navigation})};}
const result={scenario:`Deterministic 'defend' policy bot (attacks, casts skills, builds towers) for up to ${ticks} ticks; only Simulation.advance time is measured, serial alternating ${rounds} rounds, Node ${process.version}, headless simulation only`,prototype:[],extended:[],...(field&&{battlefield:field,extendedOnBattlefield:[]})};
run('extended');run('prototype');if(field)run('extended',field);
for(let r=0;r<rounds;r++){result.prototype.push(run('prototype'));result.extended.push(run('extended'));if(field)result.extendedOnBattlefield.push(run('extended',field));}
const med=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
result.median={prototypeMsPerTick:med(result.prototype.map(x=>x.msPerTick)),extendedMsPerTick:med(result.extended.map(x=>x.msPerTick)),extendedMaxTickMs:Math.max(...result.extended.map(x=>x.maxTickMs)),extendedPeakUnits:Math.max(...result.extended.map(x=>x.peakUnits))};
if(field){const f=result.extendedOnBattlefield;Object.assign(result.median,{battlefieldExtendedMsPerTick:med(f.map(x=>x.msPerTick)),battlefieldExtendedMaxTickMs:Math.max(...f.map(x=>x.maxTickMs)),
 battlefieldMaxPlansPerTick:Math.max(...f.map(x=>x.navigation.maxPlansPerTick)),battlefieldMaxExpandedPerPlan:Math.max(...f.map(x=>x.navigation.maxExpandedPerPlan))});}
await mkdir(out,{recursive:true});await writeFile(`${out}/performance-headless.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result.median,null,1),'\nextended runs:',JSON.stringify(result.extended.map(x=>({ended:x.ended,ticks:x.ticks,waves:x.waves}))),...(field?['\n'+field+' runs:',JSON.stringify(result.extendedOnBattlefield.map(x=>({ended:x.ended,ticks:x.ticks,waves:x.waves})))]:[]));

// Headless simulation cost only (Node, no rendering). This is NOT browser frame time or device performance.
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{Simulation}=require('../.test-build/simulation/Simulation.js');
const ticks=Number(process.env.PERF_TICKS||9000),rounds=5,out=process.env.EVIDENCE_ROOT||'docs/phase2c';
const {runPolicy}=await import('./simulate-encounter.mjs');
function run(encounter){const r=runPolicy('defend',{encounter,maxMinutes:ticks/1800,measure:true,seed:'perf'});return {msPerTick:r.advanceMs/(r.seconds*30),maxTickMs:r.maxAdvanceMs,peakUnits:r.peakUnits,ticks:Math.round(r.seconds*30),ended:r.outcome,waves:r.waves};}
const result={scenario:`Deterministic 'defend' policy bot (attacks, casts skills, builds towers) for up to ${ticks} ticks; only Simulation.advance time is measured, serial alternating ${rounds} rounds, Node ${process.version}, headless simulation only`,prototype:[],extended:[]};
run('extended');run('prototype');
for(let r=0;r<rounds;r++){result.prototype.push(run('prototype'));result.extended.push(run('extended'));}
const med=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
result.median={prototypeMsPerTick:med(result.prototype.map(x=>x.msPerTick)),extendedMsPerTick:med(result.extended.map(x=>x.msPerTick)),extendedMaxTickMs:Math.max(...result.extended.map(x=>x.maxTickMs)),extendedPeakUnits:Math.max(...result.extended.map(x=>x.peakUnits))};
await mkdir(out,{recursive:true});await writeFile(`${out}/performance-headless.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result.median,null,1),'\nextended runs:',JSON.stringify(result.extended.map(x=>({ended:x.ended,ticks:x.ticks,waves:x.waves}))));

import {waves as prototypeWaves,type MinionArchetype} from './combat';
import {matchRules} from './match';
import {gameplayV04} from './gameplayV04';
import {gameplayV03} from './gameplayV03';
// Explicit, deterministic encounter data. Both encounters run on the same simulation.
// prototype = inherited Phase 1D/2B six-enemy baseline. extended = Phase 2C provisional playtest proposal.
export type EncounterId='prototype'|'extended';
// Chapter 2 S7: a flank sends the tagged units of a wave round one bank first. lane is set only on tagged spawns.
export type FlankLane='north'|'south';
export type FlankUnits='raiders'|'all';
export interface WaveFlank{lane:FlankLane;units:FlankUnits}
// Chapter 2 S9C: a seeded split sends every unit of a wave round one bank; south is the inclusive range of units sent south and the rest go north.
export interface WaveLaneSplit{wave:number;south:[number,number]}
export interface LaneCounts{north:number;south:number}
export interface SpawnEntry{tick:number;team:'red'|'blue';id:string;x:number;y:number;wave:number;archetype?:MinionArchetype;lane?:FlankLane} // archetype omitted = Crimson (Chapter 2 S3)
export interface Defender{id:string;kind:'tower';x:number;y:number}
export interface Encounter{id:EncounterId;waves:{tick:number;flank?:WaveFlank;lanes?:LaneCounts}[];spawns:SpawnEntry[];caps:{red:number;blue:number};deferBlocked:boolean;continuous:boolean;defenders:Defender[];reserved:number[][]}
export const encounterIds:EncounterId[]=['prototype','extended'];
export const isEncounterId=(v:unknown):v is EncounterId=>v==='prototype'||v==='extended';
// Phase 2C provisional values (see docs/PHASE_2C_PLAN.md).
export const extendedRules={
 firstWaveTick:300,waveInterval:1200,spawnStagger:24,spawnClearance:26,
 enemyPerWave:gameplayV04.waves.enemyPerWave,alliedPerWave:2,caps:{red:24,blue:16},
 raidersPerWave:[] as number[], // Chapter 2 S3: Desert Raiders inside each wave's total; empty = none
 redSlots:[[1380,556],[1380,600],[1380,644]] as number[][],
 blueSlots:[[500,552],[500,648],[552,504],[552,696]] as number[][],
 towers:([[1464,504,"front-north"],[1464,600,"front-center"],[1464,696,"front-south"],[1512,456,"rear-north"],[1512,744,"rear-south"],[1560,480,"keep-north"],[1560,720,"keep-south"],[1760,600,"keep-rear"]] as [number,number,string][]).map(([x,y,n])=>({id:"red-tower-"+n,kind:"tower" as const,x,y})),
};
// Functional HUD warning: enemy minion near Azure Keep or keep damaged in the last 5 s (Phase 2C provisional).
export const threatRules={radius:420,recentTicks:150};
export function alliedBaseThreatened(s:{units:Record<string,{team:string;kind:string;hp:number;x:number;y:number}>;bases:Record<string,{x:number;y:number;hp:number}>;encounter:{alliedBaseHitTick?:number}},tick:number){
 const base=s.bases['blue-base'];if(!base||base.hp<=0)return false;
 if(s.encounter.alliedBaseHitTick!==undefined&&tick-s.encounter.alliedBaseHitTick<=threatRules.recentTicks)return true;
 return Object.values(s.units).some(u=>u.team==='red'&&u.kind.startsWith('minion')&&u.hp>0&&Math.hypot(u.x-base.x,u.y-base.y)<=threatRules.radius);
}
// Extended wave schedule as plain data. extendedWaveRules() copies the live values (extendedRules and gameplayV04.waves, which the
// balance harness mutates between matches), so a match keeps the schedule it started with and later edits cannot leak into it.
export interface WaveRules{firstWaveTick:number;waveInterval:number;spawnStagger:number;spawnClearance:number;enemyPerWave:number[];raidersPerWave?:number[];flanks?:({wave:number}&WaveFlank)[];lanes?:WaveLaneSplit[];laneSeed?:number;late:{firstWave:number;startCount:number;stepEveryWaves:number;cap:number};alliedPerWave:number;caps:{red:number;blue:number};redSlots:number[][];blueSlots:number[][]}
export function extendedWaveRules():WaveRules{
 const r=extendedRules,w=gameplayV04.waves;
 return {firstWaveTick:r.firstWaveTick,waveInterval:r.waveInterval,spawnStagger:r.spawnStagger,spawnClearance:r.spawnClearance,enemyPerWave:[...r.enemyPerWave],raidersPerWave:[...r.raidersPerWave],
  late:{firstWave:gameplayV03.waves.lateFirstWave,startCount:w.lateStartCount,stepEveryWaves:w.lateStepEveryWaves,cap:w.lateCap},
  alliedPerWave:r.alliedPerWave,caps:{...r.caps},redSlots:r.redSlots.map(s=>[...s]),blueSlots:r.blueSlots.map(s=>[...s])};
}
// Same formula as gameplayV04 lateWaveCount, read from the match's own rules.
const crimsonPerWave=(r:WaveRules,n:number)=>n<=r.enemyPerWave.length?r.enemyPerWave[n-1]:Math.min(r.late.cap,r.late.startCount+Math.floor((n-r.late.firstWave)/r.late.stepEveryWaves));
// Desert Raiders in wave n (1-based) of a wave size: the configured value, the last one repeated past the end of the list, clamped to the wave size. No list = none.
export const raidersInWave=(r:WaveRules,n:number,size:number)=>{const a=r.raidersPerWave;return a&&a.length?Math.max(0,Math.min(size,a[Math.min(n,a.length)-1])):0;};
// Wave n (1-based) of the extended encounter: scripted waves 1-12 plus the bounded continuous waves from 13 on. Same cadence and slots throughout.
// The flank configured for wave n (1-based), if any. Authored data only: nothing is random and a wave without an entry never flanks.
export const flankOfWave=(r:WaveRules,n:number):WaveFlank|undefined=>{const f=r.flanks?.find(x=>x.wave===n);return f&&{lane:f.lane,units:f.units};};
// Stateless 32-bit mix of (seed, wave, slot). Independent of the critical-hit generator, so lane choice never depends on combat order.
export const laneHash=(seed:number,wave:number,slot:number)=>{let h=Math.imul((seed>>>0)^0x9E3779B9,0x85EBCA6B);h=Math.imul(h^(wave+0x7F4A7C15)^h>>>15,0xC2B2AE35);h=Math.imul(h^(slot*0x27D4EB2F+0x165667B1)^h>>>13,0x85EBCA6B);h^=h>>>16;h=Math.imul(h,0x7FEB352D);h^=h>>>15;return h>>>0;};
export const defaultLaneSeed=1;
// A lane seed named in the page URL: plain decimal digits within 0..2^32-1, otherwise undefined (never a partial parse).
export const parseLaneSeed=(raw:string|null):number|undefined=>{if(raw===null||!/^\d{1,10}$/.test(raw))return undefined;const n=Number(raw);return n<=0xFFFFFFFF?n:undefined;};
// The lane of each of the count units of wave n, or undefined when the wave has no split. The south count comes first (hash slot 0), then the units with the lowest hash go south.
export function laneSplit(r:WaveRules,n:number,count:number):FlankLane[]|undefined{
 const e=r.lanes?.find(x=>x.wave===n);if(!e)return undefined;
 const [lo,hi]=e.south;if(!(Number.isSafeInteger(lo)&&Number.isSafeInteger(hi)&&lo>=1&&lo<=hi&&hi<=count-1))throw new Error(`Invalid lane split for wave ${n}`);
 const seed=r.laneSeed??defaultLaneSeed,south=lo+laneHash(seed,n,0)%(hi-lo+1);
 const order=Array.from({length:count},(_,i)=>i).sort((a,b)=>laneHash(seed,n,a+1)-laneHash(seed,n,b+1)||a-b),sent=new Set(order.slice(0,south));
 return Array.from({length:count},(_,i)=>sent.has(i)?'south':'north');
}
export function extendedWaveSpawns(n:number,r:WaveRules=extendedWaveRules()):SpawnEntry[]{
 const index=n-1,tick=r.firstWaveTick+index*r.waveInterval,count=crimsonPerWave(r,n),spawns:SpawnEntry[]=[];
 const raiders=raidersInWave(r,n,count),flank=flankOfWave(r,n),split=flank?undefined:laneSplit(r,n,count);
 for(let i=0;i<count;i++){const [x,y]=r.redSlots[i%r.redSlots.length];spawns.push({tick:tick+i*r.spawnStagger,team:'red',id:`red-w${n}-${i}`,x,y,wave:n,...(i>=count-raiders&&{archetype:'desert-raider' as const}),...(flank&&(flank.units==='all'||i>=count-raiders)&&{lane:flank.lane}),...(split&&{lane:split[i]})});} // Raiders take the last indices
 for(let i=0;i<r.alliedPerWave;i++){const [x,y]=r.blueSlots[(index*r.alliedPerWave+i)%r.blueSlots.length];spawns.push({tick:tick+i*r.spawnStagger,team:'blue',id:`blue-w${n}-${i}`,x,y,wave:n});}
 return spawns;
}
// Wave label that stays truthful beyond the scripted waves: no denominator once the encounter has gone past them.
export const waveLabel=(spawned:number,scripted:number)=>spawned>scripted?`Wave ${spawned}`:`Wave ${spawned} / ${scripted}`;
export function buildEncounter(id:EncounterId):Encounter{
 if(id==='prototype'){
  const spawns:SpawnEntry[]=[];
  prototypeWaves.forEach((w,index)=>{
   w.positions.forEach(([x,y],i)=>spawns.push({tick:w.tick,team:'red',id:`red-${index}-${i}`,x,y,wave:index+1}));
   if(index>0)w.alliedPositions.forEach(([x,y],i)=>spawns.push({tick:w.tick,team:'blue',id:`blue-${index}-${i}`,x,y,wave:index+1}));
  });
  return {id,waves:prototypeWaves.map(w=>({tick:w.tick})),spawns,caps:{red:matchRules.unitCap,blue:matchRules.unitCap},deferBlocked:false,continuous:false,defenders:[],reserved:prototypeWaves.flatMap(w=>[...w.positions,...w.alliedPositions])};
 }
 return extendedEncounter(extendedWaveRules());
}
export function extendedEncounter(r:WaveRules):Encounter{
 const spawns:SpawnEntry[]=[],waveList:Encounter['waves']=[];
 r.enemyPerWave.forEach((count,index)=>{const flank=flankOfWave(r,index+1),made=extendedWaveSpawns(index+1,r),red=made.filter(e=>e.team==='red'),lanes=r.lanes?.some(x=>x.wave===index+1)?{north:red.filter(e=>e.lane==='north').length,south:red.filter(e=>e.lane==='south').length}:undefined;waveList.push({tick:r.firstWaveTick+index*r.waveInterval,...(flank&&{flank}),...(lanes&&{lanes})});spawns.push(...made);});
 spawns.sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id));
 return {id:'extended',waves:waveList,spawns,caps:{...r.caps},deferBlocked:true,continuous:true,defenders:extendedRules.towers.map(t=>({...t})),reserved:[...r.redSlots,...r.blueSlots]};
}

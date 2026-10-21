import {waves as prototypeWaves,type MinionArchetype} from './combat';
import {matchRules} from './match';
import {gameplayV04} from './gameplayV04';
import {gameplayV03} from './gameplayV03';
// Explicit, deterministic encounter data. Both encounters run on the same simulation.
// prototype = inherited Phase 1D/2B six-enemy baseline. extended = Phase 2C provisional playtest proposal.
export type EncounterId='prototype'|'extended';
export interface SpawnEntry{tick:number;team:'red'|'blue';id:string;x:number;y:number;wave:number;archetype?:MinionArchetype} // archetype omitted = Crimson (Chapter 2 S3)
export interface Defender{id:string;kind:'tower';x:number;y:number}
export interface Encounter{id:EncounterId;waves:{tick:number}[];spawns:SpawnEntry[];caps:{red:number;blue:number};deferBlocked:boolean;continuous:boolean;defenders:Defender[];reserved:number[][]}
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
export interface WaveRules{firstWaveTick:number;waveInterval:number;spawnStagger:number;spawnClearance:number;enemyPerWave:number[];raidersPerWave?:number[];late:{firstWave:number;startCount:number;stepEveryWaves:number;cap:number};alliedPerWave:number;caps:{red:number;blue:number};redSlots:number[][];blueSlots:number[][]}
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
export function extendedWaveSpawns(n:number,r:WaveRules=extendedWaveRules()):SpawnEntry[]{
 const index=n-1,tick=r.firstWaveTick+index*r.waveInterval,count=crimsonPerWave(r,n),spawns:SpawnEntry[]=[];
 const raiders=raidersInWave(r,n,count);
 for(let i=0;i<count;i++){const [x,y]=r.redSlots[i%r.redSlots.length];spawns.push({tick:tick+i*r.spawnStagger,team:'red',id:`red-w${n}-${i}`,x,y,wave:n,...(i>=count-raiders&&{archetype:'desert-raider' as const})});} // Raiders take the last indices
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
 const spawns:SpawnEntry[]=[],waveList:{tick:number}[]=[];
 r.enemyPerWave.forEach((count,index)=>{waveList.push({tick:r.firstWaveTick+index*r.waveInterval});spawns.push(...extendedWaveSpawns(index+1,r));});
 spawns.sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id));
 return {id:'extended',waves:waveList,spawns,caps:{...r.caps},deferBlocked:true,continuous:true,defenders:extendedRules.towers.map(t=>({...t})),reserved:[...r.redSlots,...r.blueSlots]};
}

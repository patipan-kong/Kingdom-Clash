import {buildEncounter,extendedEncounter,extendedRules,extendedWaveRules,type Encounter,type EncounterId,type WaveRules} from './encounters';
import {gameplayV04,type KeepDefense} from './gameplayV04';
import {startingResources} from './resources';
import {validateMission,type MissionDefinition} from './mission';
// Stage 2 S0: everything encounter-specific that a Simulation reads to set up one match, as data.
// matchSetup('prototype'|'extended') reproduces the legacy encounters exactly. It copies the live, harness-mutable configuration
// (extendedRules, gameplayV04.waves, gameplayV04.keepDefense) when called, so each match keeps the values it was built with.
// Still hardcoded elsewhere (future migration): respawn points, build territory and the reserved cell at (450,600), initial Azure
// minions from world/layout, the trading catalogue and Keep HP.
export interface MatchSetup{
 readonly encounterId:EncounterId; // reported as Simulation.encounter.id and GameState.encounter.id
 readonly encounter:Encounter; // fixed waves, spawns, caps, Crimson defenders, reserved spawn cells
 readonly waveRules:WaveRules|null; // continuous-wave schedule and spawn clearance (extended); null = fixed waves only
 readonly keepDefense:{readonly red:KeepDefense|null;readonly blue:KeepDefense|null}; // null = inert Keep
 readonly start:{readonly gold:number;readonly wood:number;readonly iron:number;readonly guardian:{readonly x:number;readonly y:number}};
 readonly shop:boolean;
 readonly mission:MissionDefinition|null; // Stage 2 S1: null = the legacy Keep-destruction outcome
}
export interface MatchSetupOverrides{
 waves?:Partial<Pick<WaveRules,'firstWaveTick'|'waveInterval'|'enemyPerWave'|'alliedPerWave'|'caps'>>; // extended only
 defenders?:readonly string[]; // Crimson tower ids from extendedRules.towers
 crimsonKeepArmed?:boolean; // true uses the configured gameplayV04.keepDefense.red
 start?:Partial<MatchSetup['start']>;
 shop?:boolean;
 mission?:MissionDefinition;
}
export const guardianSpawn={x:820,y:590} as const;
const whole=(v:number,min:number)=>Number.isSafeInteger(v)&&v>=min;
const copyDefense=(d:KeepDefense|null)=>d?{...d}:null;
export function matchSetup(id:EncounterId,o:MatchSetupOverrides={}):MatchSetup{
 if(id!=='prototype'&&id!=='extended')throw new Error(`Unknown encounter ${String(id)}`);
 const extended=id==='extended';
 if(o.waves&&!extended)throw new Error('Wave overrides need the extended encounter');
 const waveRules=extended?{...extendedWaveRules(),...o.waves,...o.waves?.enemyPerWave&&{enemyPerWave:[...o.waves.enemyPerWave]},...o.waves?.caps&&{caps:{...o.waves.caps}}}:null;
 if(waveRules&&!(waveRules.enemyPerWave.length>0&&waveRules.enemyPerWave.every(n=>whole(n,1))&&whole(waveRules.firstWaveTick,1)&&whole(waveRules.waveInterval,1)&&whole(waveRules.alliedPerWave,0)&&whole(waveRules.caps.red,1)&&whole(waveRules.caps.blue,1)))throw new Error('Invalid wave rules');
 let encounter=waveRules?extendedEncounter(waveRules):buildEncounter(id);
 if(o.defenders){
  const ids=new Set(o.defenders);
  if(ids.size!==o.defenders.length||o.defenders.some(d=>!extendedRules.towers.some(t=>t.id===d)))throw new Error('Unknown or repeated Crimson defender');
  encounter={...encounter,defenders:extendedRules.towers.filter(t=>ids.has(t.id)).map(t=>({...t}))};
 }
 const armed=o.crimsonKeepArmed??extended;
 if(armed&&!gameplayV04.keepDefense.red&&o.crimsonKeepArmed)throw new Error('No Crimson Keep defense is configured');
 // A mission may replace the wave continuation: until-objectives repeats the final scripted size (late formula pinned to it), scripted stops.
 const mission=o.mission?structuredClone(o.mission):null;
 if(mission&&waveRules&&mission.waveMode==='until-objectives'){const last=waveRules.enemyPerWave[waveRules.enemyPerWave.length-1];waveRules.late={firstWave:waveRules.enemyPerWave.length+1,startCount:last,stepEveryWaves:1,cap:last};}
 if(mission?.waveMode==='scripted')encounter={...encounter,continuous:false};
 if(mission)validateMission(mission,{defenders:encounter.defenders.map(d=>d.id),finite:!encounter.continuous,scriptedWaves:encounter.waves.length,crimsonSpawns:encounter.spawns.filter(e=>e.team==='red').length,extended});
 const start={...startingResources,guardian:{...guardianSpawn},...o.start};
 if(!(whole(start.gold,0)&&whole(start.wood,0)&&whole(start.iron,0)&&Number.isFinite(start.guardian.x)&&Number.isFinite(start.guardian.y)))throw new Error('Invalid start');
 return {encounterId:id,encounter,waveRules,
  keepDefense:{red:armed?copyDefense(gameplayV04.keepDefense.red):null,blue:extended?copyDefense(gameplayV04.keepDefense.blue):null},
  start:{...start,guardian:{...start.guardian}},shop:o.shop??extended,mission};
}

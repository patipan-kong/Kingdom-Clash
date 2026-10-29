import {buildEncounter,defaultLaneSeed,extendedEncounter,extendedRules,extendedWaveRules,raidersInWave,type Encounter,type EncounterId,type WaveRules} from './encounters';
import {gameplayV04,type KeepDefense} from './gameplayV04';
import {enemyXpOf} from './progression';
import {startingResources} from './resources';
import {validateMission,type MissionDefinition} from './mission';
import {desertRaider,minionStats} from './combat';
import {battlefield,type Battlefield,type BattlefieldId} from '../world/battlefield';
import {GRID,WORLD} from '../world/layout';
// Stage 2 S0: everything encounter-specific that a Simulation reads to set up one match, as data.
// matchSetup('prototype'|'extended') reproduces the legacy encounters exactly. It copies the live, harness-mutable configuration
// (extendedRules, gameplayV04.waves, gameplayV04.keepDefense) when called, so each match keeps the values it was built with.
// Chapter 2 S1: the map itself (collision, construction territory, reserved cell, respawn points, Keep positions, opening Azure minions)
// is the setup's Battlefield. Still hardcoded elsewhere (future migration): the trading catalogue and Keep HP.
export interface MatchSetup{
 readonly encounterId:EncounterId; // reported as Simulation.encounter.id and GameState.encounter.id
 readonly encounter:Encounter; // fixed waves, spawns, caps, Crimson defenders, reserved spawn cells
 readonly waveRules:WaveRules|null; // continuous-wave schedule and spawn clearance (extended); null = fixed waves only
 readonly keepDefense:{readonly red:KeepDefense|null;readonly blue:KeepDefense|null}; // null = inert Keep
 readonly start:{readonly gold:number;readonly wood:number;readonly iron:number;readonly guardian:{readonly x:number;readonly y:number}};
 readonly shop:boolean;
 readonly mission:MissionDefinition|null; // Stage 2 S1: null = the legacy Keep-destruction outcome
 readonly crimsonKeepHp?:number; // Phase B2B: the Crimson Keep's hit points when a mission sets them; omitted entirely otherwise, so every earlier setup is unchanged (the Keep has baseHp)
 readonly crimsonKeepInvulnerable:boolean; // Chapter 2 S9D: the inert Crimson Keep cannot be targeted or damaged; default false
 readonly laneSeed:number; // the seed the lane splits were built with; the same seed reproduces every spawn lane
 readonly battlefield:Battlefield; // Chapter 2 S1: the match's map; a shared read-only reference, never copied into GameState
 readonly gates?:readonly MatchGate[]; // Chapter 3 C3-1: Crimson Frost Gates this match starts with; omitted entirely when there are none, so every earlier setup is unchanged
 readonly garrison?:MatchGarrison; // Chapter 3 C3-1 balance v3: garrison waves released when a gate falls; omitted entirely when there are none
 readonly barracks?:readonly MatchBarracks[]; // Chapter 3 C3-2: destructible Crimson Barracks that own spawn slots; omitted entirely when there are none
}
// A battlefield gate site plus the level's hit points for it. Becomes a pre-completed red wall (Simulation).
export interface MatchGate{readonly id:string;readonly x:number;readonly y:number;readonly columns:number;readonly rows:number;readonly hp:number}
// Garrison waves (balance v3): once the gate `after` is destroyed, `delayTicks` later and every `intervalTicks` after that, a wave of `counts[n mod counts.length]` ordinary Crimson minions
// spawns on `slots` (round-robin) through the normal spawn queue, as wave 0 so the mission's wave objectives never count them. They stop when the Crimson Keep falls.
export interface MatchGarrison{readonly after:string;readonly slots:readonly (readonly [number,number])[];readonly counts:readonly number[];readonly delayTicks:number;readonly intervalTicks:number}
// Chapter 3 C3-2: a battlefield Barracks site plus the level's hit points and the Crimson spawn slots it owns (outside redSlots or garrison slots). Becomes a pre-completed red wall (Simulation);
// once it dies, every queued or future Crimson spawn at one of its slots is dropped and nobody else takes them over.
export interface MatchBarracks{readonly id:string;readonly x:number;readonly y:number;readonly columns:number;readonly rows:number;readonly hp:number;readonly slots:readonly (readonly [number,number])[]}
export interface MatchSetupOverrides{
 waves?:Partial<Pick<WaveRules,'firstWaveTick'|'waveInterval'|'enemyPerWave'|'raidersPerWave'|'flanks'|'lanes'|'alliedPerWave'|'caps'|'redSlots'>>; // extended only; redSlots (Chapter 3 C3-1) replaces the Crimson spawn points, which a fortress map must keep outside its walls
 defenders?:readonly string[]; // Crimson tower ids from extendedRules.towers or the battlefield's own towers (Chapter 3 C3-1)
 crimsonKeepHp?:number; // Phase B2B: whole hit points of the Crimson Keep, at least 1; default baseHp (3,000)
 crimsonKeepInvulnerable?:boolean; // Chapter 2 S9D: protects an inert Crimson Keep; rejected together with crimsonKeepArmed
 crimsonKeepArmed?:boolean; // true uses the configured gameplayV04.keepDefense.red
 start?:Partial<MatchSetup['start']>;
 shop?:boolean;
 mission?:MissionDefinition;
 battlefield?:BattlefieldId; // default 'meadow' (every Chapter 1 level and Full Battle)
 laneSeed?:number; // Chapter 2 S9C: seeds the per-unit lane split of waves with a lanes entry; default is a fixed seed
 gates?:readonly {readonly id:string;readonly hp:number}[]; // Chapter 3 C3-1: sites of the battlefield's gates to place, with their hit points; default none
 garrison?:MatchGarrison; // Chapter 3 C3-1 balance v3: requires the named gate; default none
 barracks?:readonly {readonly id:string;readonly hp:number;readonly slots:readonly (readonly [number,number])[]}[]; // Chapter 3 C3-2: sites of the battlefield's Barracks to place, with hit points and owned spawn slots; default none
}
export const guardianSpawn={x:820,y:590} as const;
const whole=(v:number,min:number)=>Number.isSafeInteger(v)&&v>=min;
const copyDefense=(d:KeepDefense|null)=>d?{...d}:null;
export function matchSetup(id:EncounterId,o:MatchSetupOverrides={}):MatchSetup{
 if(id!=='prototype'&&id!=='extended')throw new Error(`Unknown encounter ${String(id)}`);
 const extended=id==='extended';
 if(o.waves&&!extended)throw new Error('Wave overrides need the extended encounter');
 const waveRules=extended?{...extendedWaveRules(),...o.waves,...o.waves?.enemyPerWave&&{enemyPerWave:[...o.waves.enemyPerWave]},...o.waves?.raidersPerWave&&{raidersPerWave:[...o.waves.raidersPerWave]},...o.waves?.redSlots&&{redSlots:o.waves.redSlots.map(s=>Array.isArray(s)?[...s]:s)},...o.waves?.flanks&&{flanks:o.waves.flanks.map(f=>({...f}))},...o.waves?.lanes&&{lanes:o.waves.lanes.map(l=>({wave:l.wave,south:[...l.south] as [number,number],...(l.commit!==undefined&&{commit:l.commit})}))},...(o.laneSeed!==undefined&&{laneSeed:o.laneSeed}),...o.waves?.caps&&{caps:{...o.waves.caps}}}:null;
 if(waveRules&&!(waveRules.enemyPerWave.length>0&&waveRules.enemyPerWave.every(n=>whole(n,1))&&whole(waveRules.firstWaveTick,1)&&whole(waveRules.waveInterval,1)&&whole(waveRules.alliedPerWave,0)&&whole(waveRules.caps.red,1)&&whole(waveRules.caps.blue,1)&&waveRules.redSlots.length>0&&waveRules.redSlots.every(s=>Array.isArray(s)&&s.length===2&&Number.isFinite(s[0])&&Number.isFinite(s[1])&&s[0]>=0&&s[0]<=WORLD.width&&s[1]>=0&&s[1]<=WORLD.height)))throw new Error('Invalid wave rules');
 // Chapter 2 S3: Desert Raiders sit inside a wave's total, so every entry is a whole number, never above its scripted wave, and the list is no longer than the scripted waves.
 const raiders=waveRules?.raidersPerWave;
 if(waveRules&&raiders&&!(raiders.length<=waveRules.enemyPerWave.length&&raiders.every((n,i)=>whole(n,0)&&n<=waveRules.enemyPerWave[i])))throw new Error('Invalid Raider counts');
 // Chapter 2 S7: a flank names a scripted wave once, a lane the battlefield has a waypoint for, and (for raiders) a wave that has Raiders.
 const flanks=waveRules?.flanks;
 if(waveRules&&flanks){const wr=waveRules,field=battlefield(o.battlefield??'meadow');if(!(Array.isArray(flanks)&&flanks.every((f,i)=>whole(f.wave,1)&&f.wave<=wr.enemyPerWave.length&&(f.lane==='north'||f.lane==='south')&&(f.units==='raiders'||f.units==='all')&&!flanks.some((g,j)=>j<i&&g.wave===f.wave)&&!!field.flankVia?.[f.lane]&&(f.units==='all'||raidersInWave(wr,f.wave,wr.enemyPerWave[f.wave-1])>0))))throw new Error('Invalid flanks');}
 // Chapter 2 S9C: a lane split names a scripted wave once, never one that also flanks, and keeps at least one unit in each lane. Nothing is clamped.
 const lanes=waveRules?.lanes;
 if(waveRules&&lanes){const wr=waveRules,field=battlefield(o.battlefield??'meadow');if(!(Array.isArray(lanes)&&lanes.every((l,i)=>whole(l.wave,1)&&l.wave<=wr.enemyPerWave.length&&Array.isArray(l.south)&&l.south.length===2&&whole(l.south[0],1)&&Number.isSafeInteger(l.south[1])&&l.south[0]<=l.south[1]&&l.south[1]<=wr.enemyPerWave[l.wave-1]-1&&!lanes.some((g,j)=>j<i&&g.wave===l.wave)&&!wr.flanks?.some(f=>f.wave===l.wave)&&(l.commit===undefined||typeof l.commit==='boolean')&&!!field.flankVia?.north&&!!field.flankVia?.south)))throw new Error('Invalid lanes');}
 if(waveRules&&waveRules.laneSeed!==undefined&&!(Number.isSafeInteger(waveRules.laneSeed)&&waveRules.laneSeed>=0&&waveRules.laneSeed<=0xFFFFFFFF))throw new Error('Invalid lane seed');
 let encounter=waveRules?extendedEncounter(waveRules):buildEncounter(id);
 const field=battlefield(o.battlefield??'meadow');
 if(o.defenders){
  const ids=new Set(o.defenders),sites=[...extendedRules.towers,...(field.towers??[]).map(t=>({id:t.id,kind:'tower' as const,x:t.x,y:t.y}))];
  if(ids.size!==o.defenders.length||o.defenders.some(d=>!sites.some(t=>t.id===d)))throw new Error('Unknown or repeated Crimson defender');
  encounter={...encounter,defenders:sites.filter(t=>ids.has(t.id)).map(t=>({...t}))};
 }
 const armed=o.crimsonKeepArmed??extended;
 if(o.crimsonKeepInvulnerable!==undefined&&typeof o.crimsonKeepInvulnerable!=='boolean')throw new Error('Invalid Keep protection');
 if(o.crimsonKeepInvulnerable&&o.crimsonKeepArmed)throw new Error('An armed Crimson Keep cannot be invulnerable');
 if(o.crimsonKeepHp!==undefined&&!(whole(o.crimsonKeepHp,1)&&!o.crimsonKeepInvulnerable))throw new Error('Invalid Crimson Keep hit points');
 if(armed&&!gameplayV04.keepDefense.red&&o.crimsonKeepArmed)throw new Error('No Crimson Keep defense is configured');
 // A mission may replace the wave continuation: until-objectives repeats the final scripted size (late formula pinned to it), scripted stops.
 const mission=o.mission?structuredClone(o.mission):null;
 if(mission&&waveRules&&mission.waveMode==='until-objectives'){const last=waveRules.enemyPerWave[waveRules.enemyPerWave.length-1];waveRules.late={firstWave:waveRules.enemyPerWave.length+1,startCount:last,stepEveryWaves:1,cap:last};}
 if(mission?.waveMode==='scripted')encounter={...encounter,continuous:false};
 if(mission)validateMission(mission,{defenders:encounter.defenders.map(d=>d.id),finite:!encounter.continuous,scriptedWaves:encounter.waves.length,crimsonSpawns:encounter.spawns.filter(e=>e.team==='red').length,crimsonHp:encounter.spawns.filter(e=>e.team==='red').reduce((n,e)=>n+(e.archetype?desertRaider.stats.maxHp:minionStats.maxHp),0),crimsonXp:encounter.spawns.filter(e=>e.team==='red').reduce((n,e)=>n+(enemyXpOf({kind:'minion-red',archetype:e.archetype})??0),0),extended});
 const start={...startingResources,guardian:{...guardianSpawn},...o.start};
 if(!(whole(start.gold,0)&&whole(start.wood,0)&&whole(start.iron,0)&&Number.isFinite(start.guardian.x)&&Number.isFinite(start.guardian.y)))throw new Error('Invalid start');
 // Chapter 3 C3-1: each named gate must be a site of this battlefield, named once, with whole hit points, and stand well clear of every Crimson spawn slot (a unit within 26 px of a slot stalls the red queue).
 // That the gates leave a Crimson route open is checked by the Simulation, which owns the geometry.
 const gates=(o.gates??[]).map(g=>{
  const site=field.gates?.find(s=>s.id===g?.id);
  if(!site||!whole(g.hp,1)||o.gates!.filter(x=>x.id===g.id).length!==1)throw new Error(`Invalid gate ${String(g?.id)}`);
  if(waveRules?.redSlots.some(([x,y])=>Math.hypot(x-site.x,y-site.y)<4*GRID))throw new Error(`Gate ${site.id} is too close to a Crimson spawn slot`);
  return {id:site.id,x:site.x,y:site.y,columns:site.columns,rows:site.rows,hp:g.hp};
 });
 // The slots must lie inside the sealed area and be open for a minion once the gate is gone: the Simulation owns that geometry (checkGates).
 const g=o.garrison;
 if(g&&!(waveRules&&gates.some(x=>x.id===g.after)&&Array.isArray(g.slots)&&g.slots.length>0&&g.slots.every(s=>Array.isArray(s)&&s.length===2&&Number.isFinite(s[0])&&Number.isFinite(s[1])&&s[0]>=0&&s[0]<=WORLD.width&&s[1]>=0&&s[1]<=WORLD.height)
  &&Array.isArray(g.counts)&&g.counts.length>0&&g.counts.every(n=>whole(n,1))&&whole(g.delayTicks,0)&&whole(g.intervalTicks,1)))throw new Error('Invalid garrison');
 // Chapter 3 C3-2: each named Barracks is a site of this battlefield, named once, with whole hit points and owned slots. Every slot is a Crimson spawn slot (an outside wave slot or a garrison slot), owned by one Barracks only,
 // and every outside wave slot is owned, so no wave can outlive the Barracks that is meant to supply it. Whether the slots are open and reachable is checked by the Simulation (checkGates).
 const owned=new Set<string>(),barracks=(o.barracks??[]).map(b=>{
  const site=field.barracks?.find(s=>s.id===b?.id);
  if(!site||!waveRules||!whole(b.hp,1)||o.barracks!.filter(x=>x.id===b.id).length!==1||!Array.isArray(b.slots)||b.slots.length===0)throw new Error(`Invalid barracks ${String(b?.id)}`);
  const slots=b.slots.map(s=>{
   if(!Array.isArray(s)||s.length!==2||!(waveRules.redSlots.some(r=>r[0]===s[0]&&r[1]===s[1])||g?.slots.some(r=>r[0]===s[0]&&r[1]===s[1]))||owned.has(`${s[0]},${s[1]}`))throw new Error(`Barracks ${site.id} has an invalid spawn slot`);
   owned.add(`${s[0]},${s[1]}`);return [s[0],s[1]] as [number,number];});
  return {id:site.id,x:site.x,y:site.y,columns:site.columns,rows:site.rows,hp:b.hp,slots};
 });
 if(barracks.length>0&&waveRules!.redSlots.some(([x,y])=>!owned.has(`${x},${y}`)))throw new Error('A Crimson wave slot has no Barracks');
 return {encounterId:id,encounter,waveRules,crimsonKeepInvulnerable:o.crimsonKeepInvulnerable??false,laneSeed:waveRules?.laneSeed??defaultLaneSeed,
  keepDefense:{red:armed?copyDefense(gameplayV04.keepDefense.red):null,blue:extended?copyDefense(gameplayV04.keepDefense.blue):null},
  start:{...start,guardian:{...start.guardian}},shop:o.shop??extended,mission,battlefield:field,...(o.crimsonKeepHp!==undefined&&{crimsonKeepHp:o.crimsonKeepHp}),...(gates.length>0&&{gates}),...(barracks.length>0&&{barracks}),...(g&&{garrison:{after:g.after,slots:g.slots.map(s=>[s[0],s[1]] as [number,number]),counts:[...g.counts],delayTicks:g.delayTicks,intervalTicks:g.intervalTicks}})};
}

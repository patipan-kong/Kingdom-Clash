import {minionStats} from './combat';
import {enemyXp,nextLevelXp,progressionRules,skillLevel,upgradeRules,type GuardianUpgrade} from './progression';
// Stage 2 S1: mission objectives as plain data. A MissionDefinition is attached to a MatchSetup; matchSetup() validates it against
// that setup (validateMission below) and the Simulation's MissionTracker evaluates it from authoritative events and state.
// Two kinds of objective:
// - counters (waves-defeated, structures-completed, tower-kills, tower-damage, skill-impact) count only what happens while their phase is active;
// - conditions (destroy, structures-standing, guardian-level, skill-rank) read the world, so one already true counts on activation.
// Both latch: a completed objective stays completed and its progress is capped at its target.
export type StructureKind='tower'|'wall';
export type SkillImpact='stun'|'taunt'|'slow'|'shield-granted'|'shield-absorbed';
export interface ObjectiveDisplay{readonly label:string;readonly detail?:string}
interface Base{readonly id:string;readonly display?:ObjectiveDisplay}
export type ObjectiveDefinition=Base&(
 |{readonly type:'destroy';readonly targets:readonly string[];readonly count?:number} // Crimson defender tower ids and/or 'red-base'; count defaults to all
 |{readonly type:'waves-defeated';readonly count:number} // spawned and every Crimson member eliminated
 |{readonly type:'structures-completed';readonly kind?:StructureKind;readonly count:number} // player constructions finished
 |{readonly type:'structures-standing';readonly kind?:StructureKind;readonly count:number} // finished player structures alive now
 |{readonly type:'tower-kills';readonly count:number} // Crimson minions killed by player-built Archer Towers
 |{readonly type:'tower-damage';readonly count:number} // HP that player-built Archer Towers remove from Crimson units (S2); last hits not needed
 |{readonly type:'skill-impact';readonly effect:SkillImpact;readonly count:number} // stun=Shield Bash, taunt=Taunt, slow=Charge, shield-*=Guardian Zone
 |{readonly type:'guardian-level';readonly level:number}
 |{readonly type:'skill-rank';readonly skill:GuardianUpgrade;readonly rank:number});
export type ObjectiveType=ObjectiveDefinition['type'];
export interface MissionPhase{readonly id:string;readonly objectives:readonly ObjectiveDefinition[];readonly display?:ObjectiveDisplay}
// waveMode: 'continuous' = the encounter's own schedule (extended: late-wave formula); 'until-objectives' = after the scripted waves,
// keep the cadence and repeat the final scripted wave size until the match ends; 'scripted' = the scripted waves only (finite supply).
export type WaveMode='continuous'|'until-objectives'|'scripted';
export interface MissionDefinition{
 readonly phases:readonly MissionPhase[]; // sequential; a single phase = parallel objectives
 readonly failure?:{readonly azureKeepHpBelow?:number}; // defeat once Azure Keep HP < fraction * max HP (0 < fraction < 1)
 readonly waveMode?:WaveMode; // default 'continuous'
}
export const counterTypes:readonly ObjectiveType[]=['waves-defeated','structures-completed','tower-kills','tower-damage','skill-impact'];
export const objectiveTarget=(o:ObjectiveDefinition)=>o.type==='destroy'?o.count??o.targets.length:o.type==='guardian-level'?o.level:o.type==='skill-rank'?o.rank:o.count;
// What the setup offers, for the feasibility checks. finite = no waves beyond the scripted list.
export interface MissionContext{readonly defenders:readonly string[];readonly finite:boolean;readonly scriptedWaves:number;readonly crimsonSpawns:number;readonly extended:boolean}
// Highest level reachable with a fixed amount of XP from level 1.
export function reachableLevel(xp:number){let level=1;while(level<progressionRules.maxLevel&&xp>=nextLevelXp(level)){xp-=nextLevelXp(level);level++;}return level;}
const whole=(v:unknown,min=1)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min;
const fail=(why:string):never=>{throw new Error(`Invalid mission: ${why}`);};
// Rejects malformed and clearly impossible missions. Limits: kills and stuns are bounded only by the Crimson supply, not by whether the
// player can reach them in time; XP bounds assume every Crimson unit and tower dies near the Guardian.
export function validateMission(m:MissionDefinition,c:MissionContext){
 if(!m||!Array.isArray(m.phases)||!m.phases.length)fail('no phases');
 const mode=m.waveMode??'continuous';
 if(!['continuous','until-objectives','scripted'].includes(mode))fail(`unknown wave mode ${String(mode)}`);
 if(mode==='until-objectives'&&!c.extended)fail('until-objectives waves need the extended encounter');
 const finite=c.finite||mode==='scripted',ids=new Set<string>();
 const f=m.failure?.azureKeepHpBelow;if(f!==undefined&&!(typeof f==='number'&&f>0&&f<1))fail('azureKeepHpBelow must be between 0 and 1');
 const totals={waves:0,kills:0,damage:0};let level=1;const ranks:Partial<Record<GuardianUpgrade,number>>={};
 for(const p of m.phases){
  if(typeof p.id!=='string'||!p.id||ids.has(p.id))fail(`missing or repeated id ${String(p.id)}`);ids.add(p.id);
  if(!Array.isArray(p.objectives)||!p.objectives.length)fail(`phase ${p.id} has no objectives`);
  for(const o of p.objectives){
   if(typeof o.id!=='string'||!o.id||ids.has(o.id))fail(`missing or repeated id ${String(o.id)}`);ids.add(o.id);
   switch(o.type){
    case 'destroy':
     if(!Array.isArray(o.targets)||!o.targets.length||new Set(o.targets).size!==o.targets.length)fail(`${o.id}: targets must be distinct`);
     for(const t of o.targets)if(t!=='red-base'&&!c.defenders.includes(t))fail(`${o.id}: ${t} is not in this match`);
     if(o.count!==undefined&&!(whole(o.count)&&o.count<=o.targets.length))fail(`${o.id}: count exceeds targets`);break;
    case 'waves-defeated':totals.waves+=whole(o.count)?o.count:fail(`${o.id}: count`);break;
    case 'tower-kills':totals.kills+=whole(o.count)?o.count:fail(`${o.id}: count`);break;
    case 'tower-damage':totals.damage+=whole(o.count)?o.count:fail(`${o.id}: count`);break;
    case 'structures-completed':case 'structures-standing':
     if(o.kind!==undefined&&o.kind!=='tower'&&o.kind!=='wall')fail(`${o.id}: unknown structure ${String(o.kind)}`);
     if(!whole(o.count))fail(`${o.id}: count`);break;
    case 'skill-impact':
     if(!['stun','taunt','slow','shield-granted','shield-absorbed'].includes(o.effect))fail(`${o.id}: unknown effect ${String(o.effect)}`);
     if(!whole(o.count))fail(`${o.id}: count`);break;
    case 'guardian-level':
     if(!(whole(o.level)&&o.level<=progressionRules.maxLevel))fail(`${o.id}: level ${String(o.level)} unavailable`);level=Math.max(level,o.level);break;
    case 'skill-rank':
     if(!Object.hasOwn(upgradeRules,o.skill))fail(`${o.id}: unknown skill ${String(o.skill)}`);
     if(!(whole(o.rank)&&o.rank<=upgradeRules[o.skill].maxRank))fail(`${o.id}: ${o.skill} rank ${String(o.rank)} unavailable`);
     level=Math.max(level,skillLevel(o.skill,o.rank));ranks[o.skill]=Math.max(ranks[o.skill]??0,o.rank);break;
    default:fail(`${(o as Base).id}: unknown objective type ${String((o as {type:unknown}).type)}`);
   }
  }
 }
 if(!finite)return;
 // Finite Crimson supply: each wave is defeated once and each minion dies once, so sequential phases share them.
 if(totals.waves>c.scriptedWaves)fail(`needs ${totals.waves} defeated waves but only ${c.scriptedWaves} spawn`);
 if(totals.kills>c.crimsonSpawns)fail(`needs ${totals.kills} tower kills but only ${c.crimsonSpawns} Crimson minions spawn`);
 // Player towers stand in Azure territory, out of reach of every Crimson structure, so their damage is bounded by Crimson minion HP.
 if(totals.damage>c.crimsonSpawns*minionStats.maxHp)fail(`needs ${totals.damage} tower damage but Crimson minions have only ${c.crimsonSpawns*minionStats.maxHp} HP`);
 const maxLevel=reachableLevel(c.crimsonSpawns*(enemyXp['minion-red']??0)+c.defenders.length*(enemyXp.tower??0));
 if(level>maxLevel)fail(`needs Guardian level ${level} but at most ${maxLevel} is reachable`);
 const points=progressionRules.initialPoints+maxLevel-1,spent=Object.values(ranks).reduce((a,b)=>a+b,0);
 if(spent>points)fail(`needs ${spent} skill points but at most ${points} are available`);
}

import type {GameEvent,GameState} from './GameState';
import type {Encounter,SpawnEntry} from '../data/encounters';
import {objectiveTarget,type MissionDefinition,type ObjectiveDefinition,type ObjectiveDisplay,type SkillImpact} from '../data/mission';
import {skillLevel} from '../data/progression';
// Stage 2 S1: headless mission objective tracking. The Simulation calls evaluate() once per tick, after combat, construction and income
// and before wave scheduling, with the events that tick produced. Reads state; never writes it, never draws random numbers.
// Same tick: every event of the tick is credited to the phase active when the tick began. A phase that completes hands over at the
// end of the evaluation; the next phase's conditions are checked at once (and may cascade), its counters start with the next tick.
export type OutcomeReason='crimson-keep-destroyed'|'azure-keep-destroyed'|'both-keeps-destroyed'|'objectives-complete'|'azure-keep-hp-threshold';
export interface MatchOutcome{readonly outcome:'victory'|'defeat';readonly reason:OutcomeReason;readonly tick:number}
// Why an active objective can no longer progress in this match. Diagnostic only: nothing is awarded and the match does not end.
export type BlockedReason='no-more-waves'|'no-more-enemies'|'no-allied-minions'|'no-xp-sources'|'not-enough-skill-points';
export interface ObjectiveStatus{readonly id:string;readonly phaseId:string;readonly type:ObjectiveDefinition['type'];readonly definition:ObjectiveDefinition;readonly target:number;readonly progress:number;readonly complete:boolean;readonly active:boolean;readonly display?:ObjectiveDisplay;readonly blocked?:BlockedReason}
export interface MissionStatus{readonly status:'active'|'victory'|'defeat';readonly outcome:MatchOutcome|null;readonly activePhase:string|null;readonly activePhaseIndex:number;readonly completedPhases:readonly string[];readonly objectives:readonly ObjectiveStatus[]}
export interface MissionView{readonly state:GameState;readonly spawnQueue:readonly SpawnEntry[];readonly encounter:Encounter}
const effects:Record<string,SkillImpact>={stun:'stun',taunt:'taunt',slow:'slow'};
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const k of Object.keys(v))freeze((v as Record<string,unknown>)[k]);Object.freeze(v);}return v;};
export class MissionTracker{
 private phase=0;
 private completed:string[]=[];
 private counts=new Map<string,number>(); // counter totals while active; reported capped at the target
 private done=new Set<string>(); // latched
 private seen=new Set<string>(); // event keys already credited
 private roster=new Map<string,{kind:string;team:string}>(); // every entity this match has had, by id (removed units included)
 private playerTowers=new Set<string>();
 private members=new Map<number,Set<string>>(); // wave -> living Crimson members
 private waveOf=new Map<string,number>();
 private open:number[]=[]; private announced=0; private defeated=0; private tick=0;
 private blocked=new Map<string,BlockedReason>();
 constructor(readonly definition:MissionDefinition,private view:MissionView){
  const s=view.state;
  for(const u of [...Object.values(s.units),...Object.values(s.structures),...Object.values(s.bases)])this.roster.set(u.id,{kind:u.kind,team:u.team});
  this.refresh();this.diagnose();
 }
 get complete(){return this.phase>=this.definition.phases.length;}
 get wavesDefeated(){return this.defeated;}
 // Optional failure condition, Azure Keep destruction excluded (the Simulation always treats that as defeat).
 get failed(){const f=this.definition.failure?.azureKeepHpBelow,b=this.view.state.bases['blue-base'];return f!==undefined&&!!b&&b.hp<f*b.maxHp;}
 // Called by the Simulation when a queued entry becomes a unit: the only place wave membership is known.
 spawned(e:SpawnEntry){
  this.roster.set(e.id,{kind:e.team==='red'?'minion-red':'minion-blue',team:e.team});
  if(e.team!=='red')return;
  this.waveOf.set(e.id,e.wave);let m=this.members.get(e.wave);if(!m)this.members.set(e.wave,m=new Set());m.add(e.id);
 }
 evaluate(tick:number,events:readonly GameEvent[]){
  this.tick=tick;
  if(this.complete)return;
  const active=this.definition.phases[this.phase].objectives;
  for(const e of events)this.observe(e,tick,active);
  this.waveDefeats(active);
  this.refresh();this.diagnose();
 }
 private credit(active:readonly ObjectiveDefinition[],key:string,amount:number,match:(o:ObjectiveDefinition)=>boolean){
  if(this.seen.has(key))return;this.seen.add(key);
  for(const o of active)if(!this.done.has(o.id)&&match(o))this.counts.set(o.id,(this.counts.get(o.id)??0)+amount);
 }
 private observe(e:GameEvent,tick:number,active:readonly ObjectiveDefinition[]){
  const s=this.view.state;
  if(e.type==='built'){const b=s.structures[e.id];if(b){this.roster.set(b.id,{kind:b.kind,team:b.team});if(b.team==='blue'&&b.kind==='tower')this.playerTowers.add(b.id);}return;}
  if(e.type==='death'){
   const who=this.roster.get(e.id);if(who?.team!=='red')return;
   const wave=this.waveOf.get(e.id);if(wave!==undefined)this.members.get(wave)?.delete(e.id);
   if(who.kind==='minion-red'&&this.playerTowers.has(e.sourceId))this.credit(active,`kill:${e.id}`,1,o=>o.type==='tower-kills');
   return;
  }
  if(e.type==='construction-complete'){const b=s.structures[e.id];if(b?.team==='blue')this.credit(active,`complete:${e.id}`,1,o=>o.type==='structures-completed'&&(!o.kind||o.kind===b.kind));return;}
  if(e.type==='status'){const effect=effects[e.status];if(effect&&this.roster.get(e.id)?.team==='red')this.credit(active,`status:${e.id}:${e.status}:${tick}`,1,o=>o.type==='skill-impact'&&o.effect===effect);return;}
  // Guardian Zone shields on allies: the Guardian's own shield is not counted.
  if(e.type==='shield'){if(e.id!=='guardian'&&this.roster.get(e.id)?.team==='blue')this.credit(active,`shield:${e.zoneId}:${e.id}`,1,o=>o.type==='skill-impact'&&o.effect==='shield-granted');return;}
  // S2: HP a player-built Archer Tower removes from Crimson targets (the damage event's amount, so overkill and armor are excluded).
  if(e.type==='damage'&&e.amount>0&&this.playerTowers.has(e.sourceId)&&this.roster.get(e.id)?.team==='red'){for(const o of active)if(!this.done.has(o.id)&&o.type==='tower-damage')this.counts.set(o.id,(this.counts.get(o.id)??0)+e.amount);}
  if(e.type==='damage'&&(e.absorbed??0)>0&&this.roster.get(e.id)?.team==='blue'){for(const o of active)if(!this.done.has(o.id)&&o.type==='skill-impact'&&o.effect==='shield-absorbed')this.counts.set(o.id,(this.counts.get(o.id)??0)+e.absorbed!);}
 }
 // A wave is defeated once it has spawned (announced on an earlier tick), none of its Crimson entries is still queued, and every
 // Crimson member that spawned has died. Entries dropped at a cap (prototype) never become members.
 private waveDefeats(active:readonly ObjectiveDefinition[]){
  const s=this.view.state;
  while(this.announced<s.spawnedWaves)this.open.push(++this.announced);
  this.open=this.open.filter(n=>{
   if((this.members.get(n)?.size??0)>0||this.view.spawnQueue.some(e=>e.team==='red'&&e.wave===n))return true;
   this.members.delete(n);this.defeated++;this.credit(active,`wave:${n}`,1,o=>o.type==='waves-defeated');return false;
  });
 }
 private current(o:ObjectiveDefinition){
  const s=this.view.state,p=s.heroProgression;
  switch(o.type){
   case 'destroy':return o.targets.filter(id=>id==='red-base'?(s.bases[id]?.hp??0)<=0:!s.structures[id]).length;
   case 'structures-standing':return Object.values(s.structures).filter(b=>b.team==='blue'&&b.hp>0&&this.tick>=b.completeTick&&(!o.kind||b.kind===o.kind)).length;
   case 'guardian-level':return p.level;
   case 'skill-rank':return o.skill==='fortitude'?p.fortitude:p.ranks[o.skill];
   default:return this.counts.get(o.id)??0;
  }
 }
 private refresh(){
  while(!this.complete){
   const p=this.definition.phases[this.phase];
   for(const o of p.objectives)if(!this.done.has(o.id)&&this.current(o)>=objectiveTarget(o))this.done.add(o.id);
   if(!p.objectives.every(o=>this.done.has(o.id)))return;
   this.completed.push(p.id);this.phase++;
  }
 }
 private diagnose(){
  this.blocked.clear();if(this.complete)return;
  const s=this.view.state,e=this.view.encounter,units=Object.values(s.units);
  const exhausted=!e.continuous&&s.spawnedWaves>=e.waves.length;
  const crimson=!exhausted||this.view.spawnQueue.some(q=>q.team==='red')||units.some(u=>u.kind==='minion-red');
  const allies=!exhausted||this.view.spawnQueue.some(q=>q.team==='blue')||units.some(u=>u.kind==='minion-blue');
  const towers=Object.values(s.structures).some(b=>b.team==='red'),keep=s.bases['red-base'],armed=!!keep&&keep.hp>0&&keep.damage>0;
  const p=s.heroProgression;
  for(const o of this.definition.phases[this.phase].objectives){
   if(this.done.has(o.id))continue;
   let why:BlockedReason|undefined;
   if(o.type==='waves-defeated'&&!crimson)why='no-more-waves';
   else if((o.type==='tower-kills'||o.type==='tower-damage'||(o.type==='skill-impact'&&effects[o.effect]))&&!crimson)why='no-more-enemies';
   else if(o.type==='skill-impact'&&o.effect==='shield-granted'&&!allies)why='no-allied-minions';
   else if(o.type==='skill-impact'&&o.effect==='shield-absorbed'&&!crimson&&!towers&&!armed)why='no-more-enemies';
   else if(o.type==='guardian-level'&&!crimson&&!towers)why='no-xp-sources';
   else if(o.type==='skill-rank'&&!crimson&&!towers){const rank=o.skill==='fortitude'?p.fortitude:p.ranks[o.skill];why=p.level<skillLevel(o.skill,o.rank)?'no-xp-sources':p.skillPoints<o.rank-rank?'not-enough-skill-points':undefined;}
   if(why)this.blocked.set(o.id,why);
  }
 }
 status(outcome:MatchOutcome|null):MissionStatus{
  const objectives=this.definition.phases.flatMap((p,i)=>p.objectives.map(o=>{
   const target=objectiveTarget(o),complete=this.done.has(o.id),active=i===this.phase;
   const progress=complete?target:active?Math.min(target,Math.floor(this.current(o))):0,why=this.blocked.get(o.id);
   return {id:o.id,phaseId:p.id,type:o.type,definition:structuredClone(o),target,progress,complete,active,...(o.display?{display:structuredClone(o.display)}:{}),...(why?{blocked:why}:{})};
  }));
  return freeze({status:outcome?.outcome??'active',outcome:outcome?{...outcome}:null,activePhase:this.complete?null:this.definition.phases[this.phase].id,activePhaseIndex:this.phase,completedPhases:[...this.completed],objectives});
 }
}

import {Economy} from './Economy';
import {buildings} from '../data/buildings';
import {placementReason} from './Building';
import {Clock,HZ} from './Clock';
import type {Command,GameEvent,GameState,Structure,Unit} from './GameState';
import {guardianStats,minionStats,previewSeconds} from '../data/combat';
import {buildEncounter,extendedRules,type Encounter,type EncounterId,type SpawnEntry} from '../data/encounters';
import {blocked} from './Collision';
import {updateMovement} from './Movement';
import {canAttack,damageAfterArmor} from './Combat';
import {Navigation} from './Navigation';
import {entities} from '../world/layout';
import {initialBases,matchRules} from '../data/match';
import {combatStructures} from './GameState';
import {initialProgression,Progression} from './Progression';
import {respawnTicks,skillRules,upgradeRules} from '../data/progression';
import {GuardianSkills,initialSkills} from './GuardianSkills';
import {XPRewards} from './XPRewards';
import {stunned} from './Statuses';
export class Simulation {
 readonly clock=new Clock();
 readonly navigation=new Navigation();
 readonly state:GameState={heroProgression:initialProgression(),skills:initialSkills(),bases:initialBases(),match:{phase:'initializing'},units:{},structures:{},wood:180,iron:30,move:{x:0,y:0},attacking:false,encounter:{id:'prototype',waveCount:0,reserved:[]},gold:250,kills:0,spawnedWaves:0,previewReady:{}};
 readonly encounter:Encounter;
 readonly spawnQueue:SpawnEntry[]=[];
 private progression=new Progression(this.state.heroProgression);
 private rewards:XPRewards;
 readonly skills:GuardianSkills;
 private economy=new Economy(this.state);
 private placements=new Set<string>();
 placementReason(kind:'wall'|'tower',col:number,row:number){return placementReason(this.state,kind,col,row);}
 private commands:Command[]=[]; private events:GameEvent[]=[];
 constructor(matchId='match',encounterId:EncounterId='prototype'){this.encounter=buildEncounter(encounterId);this.state.encounter={id:encounterId,waveCount:this.encounter.waves.length,reserved:this.encounter.reserved};this.rewards=new XPRewards(matchId);this.skills=new GuardianSkills(this.state,(source,target,amount,type,castId)=>this.hit(source,target,amount,type,castId),e=>this.events.push(e),u=>this.rewards.life(u));this.state.units.guardian=this.unit('guardian','guardian',820,590);for(const e of entities.filter(e=>e.kind==='minion-blue'))this.state.units[e.id]=this.unit(e.id,'minion-blue',e.x,e.y);for(const d of this.encounter.defenders)this.state.structures[d.id]=this.defender(d.id,d.kind,d.x,d.y);this.state.match.phase='playing';for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures)])this.rewards.life(u);}
 // Pre-completed enemy structure: same tower stats and combat as player-built towers, no special rules.
 private defender(id:string,kind:'tower',x:number,y:number):Structure{const d=buildings[kind];return {id,kind,team:'red',x,y,col:Math.floor(x/48),row:Math.floor(y/48),startTick:0,completeTick:0,progress:1,constructionDamage:0,...d,hp:d.maxHp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};}
 private spawnOpen(e:SpawnEntry){if(!this.encounter.deferBlocked)return true;const s=this.state;return !blocked(e.x,e.y,minionStats.radius,combatStructures(s))&&Object.values(s.units).every(u=>u.hp<=0||Math.hypot(u.x-e.x,u.y-e.y)>=extendedRules.spawnClearance);}
 // Due entries spawn in schedule order. Extended defers a blocked/capped team's entries; prototype keeps its inherited drop-at-cap behavior.
 private spawnDue(tick:number){
  const s=this.state,stalled=new Set<string>();
  for(const e of [...this.spawnQueue]){
   if(e.tick>tick||stalled.has(e.team))continue;
   const kind=e.team==='red'?'minion-red':'minion-blue',active=Object.values(s.units).filter(u=>u.kind===kind).length;
   if(active>=this.encounter.caps[e.team]||!this.spawnOpen(e)){if(this.encounter.deferBlocked){stalled.add(e.team);continue;}this.spawnQueue.splice(this.spawnQueue.indexOf(e),1);continue;}
   this.spawnQueue.splice(this.spawnQueue.indexOf(e),1);s.units[e.id]=this.unit(e.id,kind,e.x,e.y);this.events.push({type:'spawn',id:e.id});
  }
 }
 private unit(id:string,kind:Unit['kind'],x:number,y:number):Unit{
  const stats=kind==='guardian'?guardianStats:minionStats;
  return {id,kind,team:kind==='guardian'||kind==='minion-blue'?'blue':'red',x,y,...stats,hp:stats.maxHp,readyTick:0,protectionTick:0};
 }
 get hero(){return this.state.units.guardian;}
 get ended(){return !!this.state.match.result;}
 clearHeroInput(){this.commands=this.commands.filter(c=>c.type==='place'||c.type==='learn');this.state.move={x:0,y:0};this.state.attacking=false;this.state.selectedTarget=undefined;this.hero.strike=undefined;}
 beginRestart(){this.state.match.phase='restarting';this.clock.paused=true;this.clearInput();}
 send(c:Command){
  if(this.ended||this.state.match.phase==='restarting')return false;
  if(this.clock.paused||this.clock.timeScale===0){this.events.push({type:'rejected',reason:'Paused'});return false;}
  if(!c||!['move','attack','target','preview','place','learn','cast'].includes(c.type)||(c.type==='place'&&(!Object.hasOwn(buildings,c.kind)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100||!Number.isInteger(c.col)||!Number.isInteger(c.row)))||(c.type==='learn'&&(!Object.hasOwn(upgradeRules,c.skill)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100))||(c.type==='cast'&&(!Object.hasOwn(skillRules,c.skill)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100||(c.direction&&(!Number.isFinite(c.direction.x)||!Number.isFinite(c.direction.y)))||(c.distance!==undefined&&(!Number.isFinite(c.distance)||c.distance<=0))))||(c.type==='move'&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)))||(c.type==='target'&&(!(this.state.units[c.id]??this.state.structures[c.id]??this.state.bases[c.id])||(this.state.units[c.id]??this.state.structures[c.id]??this.state.bases[c.id]).team==='blue'))||(c.type==='preview'&&!Object.hasOwn(previewSeconds,c.key))){this.events.push({type:'rejected',reason:'Invalid command'});return false;}
  if(c.type==='move')this.commands=this.commands.filter(v=>v.type!=='move');
  if(this.commands.length>=128)return false;
  this.commands.push({...c});return true;
 }
 clearInput(resetClock=true){this.commands=[];this.state.move={x:0,y:0};this.state.attacking=false;this.state.selectedTarget=undefined;for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures)]){u.strike=undefined;u.targetId=undefined;}if(resetClock)this.clock.reset();}
 setPaused(v:boolean){if(this.ended||this.state.match.phase==='restarting')return;this.clock.paused=v;this.state.match.phase=v||this.clock.timeScale===0?'paused':'playing';this.clearInput();}
 setTimeScale(v:number){if(!Number.isFinite(v)||v<0||v>2)throw new Error('Invalid timeScale');if(this.ended)return;this.clock.timeScale=v;this.state.match.phase=this.clock.paused||v===0?'paused':'playing';this.clock.reset();if(v===0)this.clearInput();}
 advance(delta:number){this.clock.advance(delta,()=>this.step());}
 drainEvents(){const result=this.events;this.events=[];return result;}
 remaining(key:string){return Math.max(0,((key==='attack'?this.hero.readyTick:this.state.skills.ready[key as keyof typeof this.state.skills.ready]||this.state.previewReady[key]||0)-this.clock.tick)/HZ);}
 teleportHero(x:number,y:number){if(this.ended||!Number.isFinite(x)||!Number.isFinite(y)||blocked(x,y,this.hero.radius,combatStructures(this.state)))return false;this.hero.x=x;this.hero.y=y;this.hero.strike=undefined;return true;}
 private step(){
  const tick=this.clock.tick,s=this.state,h=this.hero;
  this.skills.expire(tick);this.rewards.expire(tick);
  for(const c of this.commands){
   if(c.type==='learn'){this.events.push(this.progression.allocate(c.requestId,c.skill));this.skills.refreshStats();continue;}
   if(c.type==='cast'){continue;}
   if(h.hp<=0&&c.type!=='place')continue;
   if(c.type==='place'){
    if(this.placements.has(c.requestId)){this.events.push({type:'rejected',reason:'Duplicate construction request'});continue;}
    this.placements.add(c.requestId);const reason=this.placementReason(c.kind,c.col,c.row);
    if(reason){this.events.push({type:'rejected',reason});continue;}
    const d=buildings[c.kind],id=`built-${c.requestId}`;
    if(!this.economy.apply({type:'construction',id:c.requestId,kind:c.kind}))continue;
    s.structures[id]={id,kind:c.kind,team:'blue',x:(c.col+.5)*48,y:(c.row+.5)*48,col:c.col,row:c.row,startTick:tick,completeTick:tick+d.buildTicks,progress:1/d.buildTicks,constructionDamage:0,...d,hp:d.maxHp/d.buildTicks,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};
    this.events.push({type:'built',id,requestId:c.requestId});
   }
   if(c.type==='move'){const n=Math.max(1,Math.hypot(c.x,c.y));s.move={x:c.x/n,y:c.y/n};}
   if(c.type==='attack')s.attacking=true;
   if(c.type==='target')s.selectedTarget=c.id;
   if(c.type==='preview'&&this.remaining(c.key)===0){s.previewReady[c.key]=tick+Math.ceil(previewSeconds[c.key]*HZ);this.events.push({type:'preview',key:c.key});}
  }
  for(const c of this.commands.filter((c):c is Extract<Command,{type:'cast'}>=>c.type==='cast').sort((a,b)=>a.requestId.localeCompare(b.requestId)))this.skills.accept(c,tick);
  this.commands=[];
  if(h.hp<=0&&h.respawnTick!==undefined&&tick>=h.respawnTick){
   const candidates=[{x:450,y:600},...Array.from({length:6},(_,i)=>[552,600,648].map(y=>({x:450+i*48,y}))).flat()];
   const p=candidates.find(p=>!blocked(p.x,p.y,h.radius,combatStructures(s))&&Object.values(s.units).every(u=>u===h||u.hp<=0||Math.hypot(p.x-u.x,p.y-u.y)>=h.radius+u.radius));
   if(p){h.x=p.x;h.y=p.y;this.rewards.revive(h);h.hp=h.maxHp;h.respawnTick=undefined;h.protectionTick=tick+60;h.readyTick=tick;this.events.push({type:'respawn',id:h.id});}
  }
  const heroLocked=this.skills.locksMovement(tick);
  this.skills.dash(tick);
  updateMovement(s,this.navigation,tick,heroLocked);
  this.skills.expire(tick);this.skills.resolve(tick);
  const structures=combatStructures(s);
  for(const u of [...Object.values(s.units),...Object.values(s.structures)].sort((a,b)=>Number(b.kind==='guardian')-Number(a.kind==='guardian')||a.id.localeCompare(b.id))){
   if(u.kind==='wall'||(s.structures[u.id]&&tick<s.structures[u.id].completeTick))continue;
   if(u.hp<=0||stunned(u,tick)||(u===h&&(s.skills.cast||tick<s.skills.lockTick)))continue;
   if(u.kind==='guardian'||u.kind==='tower'){
    const candidates=[...Object.values(s.units),...Object.values(s.structures),...Object.values(s.bases)].filter(t=>canAttack(u,t,structures)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id));
    u.targetId=(u.kind==='tower'||s.attacking)?(candidates.find(t=>u.kind==='guardian'&&t.id===s.selectedTarget)??candidates[0])?.id:undefined;
   }
   if(u.strike){const target=(s.units[u.strike.targetId]??s.structures[u.strike.targetId]??s.bases[u.strike.targetId]);if(!target||!canAttack(u,target,structures))u.strike=undefined;else if(tick>=u.strike.atTick){u.strike=undefined;if(target.protectionTick<=tick)this.hit(u,target);}}
   const target=u.targetId?(s.units[u.targetId]??s.structures[u.targetId]??s.bases[u.targetId]):undefined;
   if(!u.strike&&target&&canAttack(u,target,structures)&&tick>=u.readyTick){u.readyTick=tick+u.cooldownTicks;u.strike={targetId:target.id,atTick:tick+u.windupTicks};u.protectionTick=0;this.events.push({type:'attack',id:u.id,targetId:target.id});if(u.windupTicks===0){u.strike=undefined;this.hit(u,target);}}
  }
  for(const b of Object.values(s.structures)){const progress=Math.min(1,(tick-b.startTick+1)/(b.completeTick-b.startTick));if(progress>b.progress){b.hp=Math.max(0,progress*b.maxHp-b.constructionDamage);b.progress=progress;}if(tick===b.completeTick)this.events.push({type:'construction-complete',id:b.id});}
  this.economy.apply({type:'income',tick});
  this.encounter.waves.forEach((w,index)=>{if(tick>=w.tick&&s.spawnedWaves===index){this.spawnQueue.push(...this.encounter.spawns.filter(e=>e.wave===index+1));s.spawnedWaves++;this.events.push({type:'wave',index:index+1});}});
  this.spawnDue(tick);
  const allied=s.bases['blue-base'],enemy=s.bases['red-base'];
  if(allied.hp<=0||enemy.hp<=0){const outcome=allied.hp<=0?matchRules.simultaneousResult:'victory';s.match={phase:outcome,result:{outcome,tick,kills:s.kills,gold:s.gold,alliedHp:allied.hp,enemyHp:enemy.hp}};this.clock.paused=true;this.clearInput();this.skills.clear();this.events.push({type:'match-end',outcome,tick});}
 }
 private hit(source:Unit,target:Unit,raw=source.damage,type:'physical'|'magic'|'direct'='physical',castId?:string){
  if(target.hp<=0||target.team===source.team||target.protectionTick>this.clock.tick||this.ended)return;
  const mitigated=damageAfterArmor(raw,target.armor,type),absorbed=type==='direct'?0:Math.min(target.shield?.remaining??0,mitigated);
  if(target.shield)target.shield.remaining-=absorbed;
  const amount=Math.min(target.hp,mitigated-absorbed);target.hp=Math.max(0,target.hp-amount);this.events.push({type:'damage',id:target.id,sourceId:source.id,amount,raw,mitigated,absorbed,damageType:type,castId});
  this.rewards.record(source,target,amount,this.clock.tick);if(target.id==='blue-base'&&amount>0)this.state.encounter.alliedBaseHitTick=this.clock.tick;
  const construction=this.state.structures[target.id];if(construction&&construction.progress<1)construction.constructionDamage+=amount;
  if(target.hp>0)return;
  target.strike=undefined;target.targetId=undefined;this.events.push({type:'death',id:target.id,sourceId:source.id});
  for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures)]){if(u.targetId===target.id)u.targetId=undefined;if(u.strike?.targetId===target.id)u.strike=undefined;}
  this.events.push(...this.rewards.award(target,this.clock.tick,[{unit:this.hero,progression:this.progression}],combatStructures(this.state),this.ended));
  target.statuses=[];target.shield=undefined;this.skills.refreshStats();
  if(target.kind.startsWith('base'))return; // Keep objective tombstone/HP for final results; no reward.
  if(target.kind==='guardian'){this.clearInput(false);this.skills.clear();target.respawnTick=this.clock.tick+respawnTicks(this.state.heroProgression.level);}
  else if(target.kind==='wall'||target.kind==='tower'){delete this.state.structures[target.id];}
  else {delete this.state.units[target.id];if(target.team==='red'){this.state.kills++;if(this.economy.apply({type:'minion-reward',id:this.rewards.life(target)}))this.events.push({type:'reward',id:target.id,gold:15});}}
 }
}

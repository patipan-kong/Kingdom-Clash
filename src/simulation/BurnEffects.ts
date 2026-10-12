import {artifact} from '../data/artifacts';
import {HZ} from './Clock';
import {canAttack} from './Combat';
import {combatStructures,type GameState,type Unit} from './GameState';

const originalBurn=artifact('flame-blade').modifiers.find(m=>m.kind==='burn')!;
if(originalBurn.kind!=='burn')throw new Error('Missing original Burn definition');
export const burnRules=Object.freeze({damage:originalBurn.damagePerSecond,intervalTicks:HZ,durationTicks:originalBurn.durationSeconds*HZ});
export interface BurnEffect {
 readonly targetId:string;readonly targetLife:string;
 sourceId:string;sourceLife:string;source:Unit;damage:number;
 readonly appliedTick:number;nextTick:number;expiresTick:number;
}
type Impact=(source:Unit,target:Unit,damage:number)=>void;
// Dedicated match-owned effect registry, separate from stun/slow/taunt expiry.
// B1 has no ordinary-play application caller. Tests apply only after an actual basic hit.
export class BurnEffects {
 constructor(private state:GameState,private life:(u:Unit)=>string,private impact:Impact){}
 applyAfterBasicHit(source:Unit,target:Unit,tick:number,hpLost:number,damage=burnRules.damage){
  if(this.state.match.phase!=='playing'||this.state.match.result||source.kind!=='guardian'||this.state.units[source.id]!==source||this.state.units[target.id]!==target||!(target.kind==='guardian'||target.kind.startsWith('minion'))||target.protectionTick>tick||!Number.isFinite(hpLost)||hpLost<=0||!Number.isFinite(damage)||damage<=0||!Number.isSafeInteger(tick)||!Number.isSafeInteger(tick+burnRules.durationTicks)||tick<0||!canAttack(source,target,combatStructures(this.state)))return false;
  const targetLife=this.life(target),sourceLife=this.life(source),old=this.state.burns[target.id];
  const snapshot=()=>Object.freeze({...source,lifeId:sourceLife,statuses:undefined,shield:undefined,strike:undefined,targetId:undefined});
  if(old&&old.targetLife===targetLife&&old.expiresTick>=tick){
   old.expiresTick=Math.max(old.expiresTick,tick+burnRules.durationTicks);
   // Stronger application takes ownership; equal/weaker only refresh duration.
   if(damage>old.damage){old.damage=damage;old.source=snapshot();old.sourceId=source.id;old.sourceLife=sourceLife;}
  }else this.state.burns[target.id]={targetId:target.id,targetLife,sourceId:source.id,sourceLife,source:snapshot(),damage,appliedTick:tick,nextTick:tick+burnRules.intervalTicks,expiresTick:tick+burnRules.durationTicks};
  return true;
 }
 clearTarget(target:Unit){const effect=this.state.burns[target.id];if(effect&&effect.targetLife===this.life(target))delete this.state.burns[target.id];}
 clear(){this.state.burns={};}
 process(tick:number){
  if(this.state.match.result||['victory','defeat','restarting'].includes(this.state.match.phase)){this.clear();return;}
  if(this.state.match.phase!=='playing')return;
  for(const id of Object.keys(this.state.burns).sort()){
   const effect=this.state.burns[id],target=this.state.units[id];
   if(!target||target.hp<=0||this.life(target)!==effect.targetLife||target.team===effect.source.team||tick>effect.expiresTick||!(target.kind==='guardian'||target.kind.startsWith('minion'))){delete this.state.burns[id];continue;}
   // Shared clock visits every tick. The inclusive final due tick precedes expiry.
   if(tick>=effect.nextTick&&effect.nextTick<=effect.expiresTick){effect.nextTick+=burnRules.intervalTicks;this.impact(effect.source,target,effect.damage);}
   if(this.state.burns[id]===effect&&(target.hp<=0||tick>=effect.expiresTick))delete this.state.burns[id];
  }
 }
}

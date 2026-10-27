import {alliedBaseThreatened} from '../data/encounters';
import type {Geometry} from '../simulation/Collision';
import {canAttackOn} from '../simulation/Combat';
import {combatStructures,type GameEvent,type GameState} from '../simulation/GameState';

export const guidanceRules={duration:4000,spacing:8000,engagement:2000,danger:3000,nearby:240,structure:320} as const;
export const guidanceMessages={orientation:'Destroy Crimson Keep.\nDefend Azure Keep.',skills:'Learn a skill with Skills.',support:'Support your blue troops.',structures:'Use Attack on towers and Keeps.'} as const;
export type GuidanceKey=keyof typeof guidanceMessages;
type Engagement={allyId:string;targetId:string;at:number};
// Read-only presentation policy: no commands, simulation timers or progression mutations.
// Every query takes the match's own Geometry (Simulation.geo), so attack reach and line of sight follow the active battlefield.
export class ContextGuidance {
 private delivered=new Set<GuidanceKey>();
 private lastHint=-Infinity;
 private engagements:Engagement[]=[];
 private heroHits=new Map<string,number>();
 private previous?:{x:number;y:number};
 private moved=false;
 private supported=false;
 private dangerUntil=0;
 reset(){this.delivered.clear();this.lastHint=-Infinity;this.moved=false;this.supported=false;this.clearTransient();}
 clearTransient(){this.engagements=[];this.heroHits.clear();this.previous=undefined;this.dangerUntil=0;}
 sync(state:GameState,now:number){
  const h=state.units.guardian;
  if(h.hp>0&&this.previous&&Math.hypot(state.move.x,state.move.y)>0&&Math.hypot(h.x-this.previous.x,h.y-this.previous.y)>1)this.moved=true;
  this.previous={x:h.x,y:h.y};
  this.engagements=this.engagements.filter(e=>now-e.at<=guidanceRules.engagement);
  for(const [id,at] of this.heroHits)if(now-at>guidanceRules.engagement)this.heroHits.delete(id);
 }
 private unit(state:GameState,id:string){return state.units[id]??state.structures[id]??state.bases[id];}
 private nearbyAlly(state:GameState,e:Engagement){const ally=state.units[e.allyId],h=state.units.guardian;return ally?.hp>0&&ally.team===h.team&&ally.kind==='minion-blue'&&Math.hypot(ally.x-h.x,ally.y-h.y)<=guidanceRules.nearby;}
 observe(event:GameEvent,state:GameState,now:number){
  if((event.type==='death'||event.type==='respawn')&&event.id==='guardian'||event.type==='match-end'){this.clearTransient();return;}
  const h=state.units.guardian;if(h.hp<=0||state.match.result)return;
  if(event.type==='damage'&&event.id===h.id&&event.amount>0||event.type==='attack'&&event.targetId===h.id)this.dangerUntil=now+guidanceRules.danger;
  if(event.type!=='attack'&&event.type!=='damage')return;
  if(event.type==='damage'&&event.amount<=0)return;
  const sourceId=event.type==='attack'?event.id:event.sourceId,targetId=event.type==='attack'?event.targetId:event.id,source=this.unit(state,sourceId),target=this.unit(state,targetId);
  if(sourceId===h.id&&event.type==='damage'){
   this.heroHits.set(targetId,now);
   if(this.engagements.some(e=>e.targetId===targetId&&now-e.at<=guidanceRules.engagement&&this.nearbyAlly(state,e)))this.supported=true;
  }
  if(source?.kind==='minion-blue'&&source.team===h.team&&target&&target.team!==h.team){
   const e={allyId:sourceId,targetId,at:now};this.engagements=this.engagements.filter(v=>v.allyId!==sourceId);this.engagements.push(e);
   const hit=this.heroHits.get(targetId);if(hit!==undefined&&now-hit<=guidanceRules.engagement&&this.nearbyAlly(state,e))this.supported=true;
  }
 }
 danger(geo:Geometry,state:GameState,tick:number,now:number){
  const h=state.units.guardian,structures=combatStructures(state);
  return now<this.dangerUntil||alliedBaseThreatened(state,tick)||[...Object.values(state.units),...Object.values(state.structures)].some(u=>u.team!==h.team&&u.damage>0&&canAttackOn(geo,u,h,structures));
 }
 valid(geo:Geometry,key:GuidanceKey,state:GameState,tick:number,now:number){
  const h=state.units.guardian,p=state.heroProgression;if(h.hp<=0||state.match.result||state.match.phase!=='playing'||this.danger(geo,state,tick,now))return false;
  const learned=Object.values(p.ranks).some(rank=>rank>0);
  if(key==='orientation')return true;
  if(key==='skills')return this.moved&&p.skillPoints>0&&!learned&&!p.fortitude;
  if(key==='support')return this.engagements.some(e=>{const target=this.unit(state,e.targetId),ally=state.units[e.allyId];return now-e.at<=guidanceRules.engagement&&this.nearbyAlly(state,e)&&target?.hp>0&&target.team!==h.team&&ally.targetId===target.id&&Math.hypot(target.x-h.x,target.y-h.y)<=guidanceRules.nearby;});
  return learned&&this.supported&&[...Object.values(state.structures),...Object.values(state.bases)].some(u=>u.hp>0&&u.team!==h.team&&(u.kind==='tower'||u.kind.startsWith('base'))&&Math.hypot(u.x-h.x,u.y-h.y)<=guidanceRules.structure);
 }
 next(geo:Geometry,state:GameState,tick:number,now:number):GuidanceKey|undefined{
  if(!this.delivered.has('orientation'))return this.valid(geo,'orientation',state,tick,now)?'orientation':undefined;
  if(now-this.lastHint<guidanceRules.spacing)return;
  return (['skills','support','structures'] as const).find(key=>!this.delivered.has(key)&&this.valid(geo,key,state,tick,now));
 }
 shown(key:GuidanceKey,now:number){this.delivered.add(key);this.lastHint=now;}
}

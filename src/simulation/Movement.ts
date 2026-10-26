import {stunned,slowFactor} from './Statuses';
import {HZ} from './Clock';
import {combatStructures} from './GameState';
import {canAttackOn} from './Combat';
import type {Navigation} from './Navigation';
import type {GameState,Unit} from './GameState';
import {guardianPursuableOn,trackPursuit} from './MinionAggro';
import {flankEnd,flankSuspended} from './Flank';

// Movement finishes for every unit before this tick's attacks resolve. Geometry is the match's own, carried by its Navigation (S1).
export function updateMovement(state:GameState,navigation:Navigation,tick:number,heroLocked=false){
 const hero=state.units.guardian,geo=navigation.geo;
 const structures=combatStructures(state);
 const living=Object.values(state.units).filter(u=>u.hp>0);
 // Player input may gently displace a crowd, but passive crowd contacts never
 // move the Guardian. The bounded nudge uses the same terrain/unit checks.
 if(hero.hp>0&&!heroLocked&&Math.hypot(state.move.x,state.move.y)>0)for(const unit of living.filter(u=>u!==hero).sort((a,b)=>a.id.localeCompare(b.id))){
  const dx=unit.x-hero.x,dy=unit.y-hero.y,d=Math.hypot(dx,dy),minimum=unit.radius+hero.radius;
  const intrusion=minimum-Math.hypot(dx-state.move.x*hero.speed/HZ,dy-state.move.y*hero.speed/HZ);
  if(intrusion>0&&d>0){const push=Math.min(2,intrusion);geo.moveUnit(unit,dx/d*push,dy/d*push,living,structures);}
 }
 if(hero.hp>0&&!heroLocked)geo.moveUnit(hero,state.move.x*hero.speed/HZ*slowFactor(hero,tick),state.move.y*hero.speed/HZ*slowFactor(hero,tick),living,structures);
 navigation.begin(state);
 const minions=Object.values(state.units).filter(u=>u.kind.startsWith('minion')&&u.hp>0).sort((a,b)=>a.id.localeCompare(b.id));
 for(const unit of navigation.order(minions)){
  if(stunned(unit,tick))continue;
  // Chapter 2 S9D: a committed lane unit is released here too, so a unit held in combat cannot stay committed past the Flank timeout.
  if(unit.flank?.commit&&flankEnd(unit,geo.field.flankVia?.[unit.flank.lane],tick))unit.flank=undefined;
  const pursue=(g:Unit,pursuing:boolean)=>!unit.flank?.commit&&guardianPursuableOn(geo,unit,g,tick,pursuing,structures);
  const taunt=unit.statuses?.find(s=>s.type==='taunt'&&s.expiresTick>tick);
  let target=unit.targetId?(state.units[unit.targetId]??structures[unit.targetId]):undefined;
  const distance=(a:Unit,b:Unit)=>Math.hypot(a.x-b.x,a.y-b.y);
  if(!target||target.hp<=0||target.team===unit.team||(!target.kind.startsWith('base')&&distance(unit,target)>560)||(target.kind==='guardian'&&!pursue(target,true))){target=undefined;unit.targetId=undefined;}
  // Reconsider the strategic objective once per second; a newly opened route may beat breaching.
  if(unit.breachId&&tick>=(unit.targetSinceTick??0)+30){unit.breachId=undefined;unit.targetId=undefined;target=undefined;}
  const breach=unit.breachId?structures[unit.breachId]:undefined;
  if(breach&&breach.hp>0&&breach.team!==unit.team)target=breach;else unit.breachId=undefined;
  if(!unit.breachId&&(!target||tick>=(unit.decisionTick??0))){
   unit.decisionTick=tick+6;
   const visible=[...Object.values(state.units),...Object.values(structures).filter(u=>u.kind==='tower'||u.kind.startsWith('base'))].filter(u=>u.hp>0&&u.team!==unit.team&&distance(unit,u)<=560&&(u.kind!=='guardian'||pursue(u,false)));
   const nearest=visible.sort((a,b)=>Number(canAttackOn(geo,unit,b,structures))-Number(canAttackOn(geo,unit,a,structures))||Number(b.kind==='guardian'||b.kind.startsWith('minion'))-Number(a.kind==='guardian'||a.kind.startsWith('minion'))||distance(unit,a)-distance(unit,b)||a.id.localeCompare(b.id))[0];
   if(!target||tick>=(unit.targetSinceTick??0)+30||(unit.retaliateTick!==undefined&&unit.retaliateTick>=(unit.targetSinceTick??0))){if(nearest?.id!==target?.id)unit.targetSinceTick=tick;target=nearest??state.bases[unit.team==='blue'?'red-base':'blue-base'];}
  }
  if(taunt)target=state.units[taunt.sourceId];
  unit.targetId=target?.id;trackPursuit(unit,target?.kind,tick);
  if(target&&canAttackOn(geo,unit,target,structures))continue;
  // Chapter 2 S7: a unit a wave flank tagged routes to its bank waypoint first (src/simulation/Flank.ts). Anything already in range was attacked above; a nearby non-Keep target suspends the flank for the tick.
  let via;
  if(unit.flank&&!unit.breachId){via=geo.field.flankVia?.[unit.flank.lane];if(flankEnd(unit,via,tick))unit.flank=undefined;if(!unit.flank||flankSuspended(unit,target))via=undefined;}
  let route=via?navigation.route(unit,target,state,tick,via):navigation.route(unit,target,state,tick);
  if(via&&route&&route.cost===Infinity){unit.flank=undefined;route=navigation.route(unit,target,state,tick);} // unreachable waypoint: release at once
  if(!route)continue;
  if(route.breachId){const wall=structures[route.breachId];if(wall&&wall.team!==unit.team){if(unit.breachId!==wall.id)unit.targetSinceTick=tick;unit.breachId=wall.id;unit.targetId=wall.id;if(canAttackOn(geo,unit,wall,structures))continue;}}
  while(route.points.length){const p=route.points[0];if(Math.hypot(p.x-unit.x,p.y-unit.y)<.001||(route.points.length>1&&hero.hp>0&&Math.hypot(p.x-hero.x,p.y-hero.y)<unit.radius+hero.radius)||(route.points.length>1&&geo.clearSegment(unit,route.points[1],unit.radius,structures)&&Math.hypot(p.x-unit.x,p.y-unit.y)<=14))route.points.shift();else break;}
  let next=route.points[0];
  // Retain a safe lateral lane on straight edges rather than pull a separated crowd to one center.
  if(next&&route.points.length>1){const following=route.points[1];const lane=following.y===next.y&&Math.abs(unit.y-next.y)<=14?{x:next.x,y:unit.y}:following.x===next.x&&Math.abs(unit.x-next.x)<=14?{x:unit.x,y:next.y}:next;if(Math.hypot(lane.x-unit.x,lane.y-unit.y)>.001&&geo.clearSegment(unit,lane,unit.radius,structures))next=lane;}
  if(!next)continue;
  const dx=next.x-unit.x,dy=next.y-unit.y,length=Math.hypot(dx,dy),step=Math.min(length,unit.speed/HZ*slowFactor(unit,tick));
  if(length>0){
   const hx=unit.x-hero.x,hy=unit.y-hero.y,d=Math.hypot(hx,hy),minimum=unit.radius+hero.radius;
   const t=Math.max(0,Math.min(1,-(hx*dx+hy*dy)/(length*length)));
   // Follow a stable tangent until the intended segment clears the Guardian,
   // rather than alternate a sideways step with returning to the blocked lane.
   if(hero.hp>0&&d>0&&d<=minimum+step+2&&Math.hypot(hx+t*dx,hy+t*dy)<minimum){
    const side=[...unit.id].reduce((n,c)=>n+c.charCodeAt(0),0)%2?1:-1;
    geo.moveUnit(unit,(-hy*side+hx*.1)/d*step,(hx*side+hy*.1)/d*step,living,structures);
   }else if(geo.clearSegment(unit,next,unit.radius,structures))geo.moveUnit(unit,dx/length*step,dy/length*step,living,structures);
   else if(hero.hp>0&&d<minimum+48){
    // Recenter after the local detour before entering the narrow bridge.
    if(Math.abs(dy)>.001)geo.moveUnit(unit,0,Math.sign(dy)*Math.min(step,Math.abs(dy)),living,structures);
   }
  }
 }
 // Symmetric separation never pushes a minion into terrain or construction.
 for(let i=0;i<minions.length;i++)for(let j=i+1;j<minions.length;j++){
  const a=minions[i],b=minions[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),minimum=a.radius+b.radius+2;
  if(d>=minimum)continue;
  const x=d?dx/d:0,y=d?dy/d:1,push=Math.min(1,(minimum-d)/2);
  geo.moveUnit(a,-x*push,-y*push,living,structures);geo.moveUnit(b,x*push,y*push,living,structures);
 }
 // Repair spawn/fixture overlaps gradually without crowd impulses on the player.
 // The Guardian stays responsive and cannot be shoved into terrain/construction.
 if(hero.hp>0)for(const unit of minions){
  const dx=unit.x-hero.x,dy=unit.y-hero.y,d=Math.hypot(dx,dy),minimum=unit.radius+hero.radius;
  if(d>=minimum)continue;
  const x=d?dx/d:0,y=d?dy/d:1,push=Math.min(1,minimum-d);
  geo.move(unit,x*push,y*push,structures);
 }
}

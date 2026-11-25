import {heroId} from '../data/combat';
import type {MatchSetup} from '../data/matchSetup';
import {stunned,slowFactor} from './Statuses';
import {zoneSlow} from '../world/battlefield';
import {HZ} from './Clock';
import {combatStructures,structuresFor} from './GameState';
import {canAttackOn,damageImmune,inWarlordArena} from './Combat';
import {clearsContact} from './Navigation';
import type {Navigation,Route} from './Navigation';
import type {GameState,Structure,Unit} from './GameState';
import {guardianPursuableOn,trackPursuit} from './MinionAggro';
import {flankEnd,flankSuspended} from './Flank';
import {allyPlan,allyStandoff} from './AllyProbe';
import {isSoldier,isBarracks,hasAttackCell,soldierAnchor,standoff,hybridReturning,ENGAGE,HOLD,LEASH,type SoldierProto} from './SoldierProto';

type CourtyardArea=NonNullable<MatchSetup['courtyard']>['entry'];
type Position=Pick<Unit,'x'|'y'>;
export const inCourtyard=(p:Position,keep:Position,area:CourtyardArea)=>
 p.x>=area.minX&&p.y>=area.minY&&p.y<=area.maxY&&Math.hypot(p.x-keep.x,p.y-keep.y)<=area.radius;

// A grid attack cell can overlap its target on a narrow Keep face. Finish the approach at a free melee position.
function openMeleePosition(navigation:Navigation,unit:Unit,target:Unit,living:Unit[],structures:Record<string,Structure>,from:Position){
 const {geo}=navigation,reach=unit.range-2;
 if(reach<unit.radius+target.radius||Math.hypot(from.x-target.x,from.y-target.y)>unit.range*2)return;
 const facing=Math.atan2(from.y-target.y,from.x-target.x);
 for(const offset of [0,30,-30,60,-60,90,-90]){
  const angle=facing+offset*Math.PI/180;
  const p={x:target.x+Math.cos(angle)*reach,y:target.y+Math.sin(angle)*reach};
  if(living.some(u=>u!==unit&&u!==target&&Math.hypot(u.x-p.x,u.y-p.y)<u.radius+unit.radius+2))continue;
  if(clearsContact(from,p,target,unit.radius)&&geo.clearSegment(from,p,unit.radius,structures)&&canAttackOn(geo,{...unit,...p},target,structures))return p;
 }
}

// Movement finishes for every unit before this tick's attacks resolve. Geometry is the match's own, carried by its Navigation (S1).
export function updateMovement(state:GameState,navigation:Navigation,tick:number,heroLocked=false,proto?:SoldierProto,keepDefenseArea?:CourtyardArea){
 const hero=state.units.guardian,geo=navigation.geo;
 const structures=combatStructures(state),redView=structuresFor(state,'red'),blueView=structuresFor(state,'blue'),view=(u:Unit)=>u.team==='red'?redView:blueView; // Chapter 4 M4: each team passes the faction gates it owns
 const living=Object.values(state.units).filter(u=>u.hp>0);
 const warlord=living.find(u=>u.warlord);
 // Player input may gently displace a crowd, but passive crowd contacts never
 // move the Guardian. The bounded nudge uses the same terrain/unit checks.
 if(hero.hp>0&&!heroLocked&&Math.hypot(state.move.x,state.move.y)>0)for(const unit of living.filter(u=>u!==hero).sort((a,b)=>a.id.localeCompare(b.id))){
  const dx=unit.x-hero.x,dy=unit.y-hero.y,d=Math.hypot(dx,dy),minimum=unit.radius+hero.radius;
  const intrusion=minimum-Math.hypot(dx-state.move.x*hero.speed/HZ,dy-state.move.y*hero.speed/HZ);
  if(intrusion>0&&d>0&&!unit.cleave&&!unit.warlordCharge){const push=Math.min(2,intrusion);geo.moveUnit(unit,dx/d*push,dy/d*push,living,view(unit));}
 }
 if(hero.hp>0&&!heroLocked){const slow=Math.min(slowFactor(hero,tick),1-zoneSlow(geo.field,hero));geo.moveUnit(hero,state.move.x*hero.speed/HZ*slow,state.move.y*hero.speed/HZ*slow,living,blueView);} // the Guardian passes a gate Azure owns (or one that stands open)
 navigation.begin(state);
 const minions=Object.values(state.units).filter(u=>u.kind.startsWith('minion')&&u.hp>0).sort((a,b)=>a.id.localeCompare(b.id));
 for(const unit of navigation.order(minions)){
  const structures=view(unit);
  if(stunned(unit,tick)||unit.cleave||unit.warlordCharge||tick<(unit.cleaveRecoveryTick??0)||(unit.warlord&&unit.invulnerable))continue;
  // Chapter 2 S9D: a committed lane unit is released here too, so a unit held in combat cannot stay committed past the Flank timeout.
  if(unit.flank?.commit&&flankEnd(unit,geo.field.flankVia?.[unit.flank.lane],tick))unit.flank=undefined;
  const pursue=(g:Unit,pursuing:boolean)=>!unit.flank?.commit&&guardianPursuableOn(geo,unit,g,tick,pursuing,structures);
  const court=unit.localGuard?.defendKeep?keepDefenseArea:undefined;
  const taunt=unit.statuses?.find(s=>s.type==='taunt'&&s.expiresTick>tick&&
   (!court||state.units[s.sourceId]?.hp>0&&inCourtyard(state.units[s.sourceId],state.bases['red-base'],court))&&
   (!unit.warlord||!!state.units[s.sourceId]&&inWarlordArena(unit,state.units[s.sourceId])));
  let target=unit.targetId?(state.units[unit.targetId]??structures[unit.targetId]):undefined;
  const distance=(a:Unit,b:Unit)=>Math.hypot(a.x-b.x,a.y-b.y);
  // PROTOTYPE soldier AI (src/simulation/SoldierProto.ts): inert unless proto is set and the unit is a "blue-s-" soldier.
  const soldier=proto&&isSoldier(unit)?proto:undefined,ref=soldier?(hero.hp>0?hero:state.bases['blue-base']):undefined;
  const anchored=soldier?.mode==='anchored'||(soldier?.mode==='hybrid'&&hybridReturning(unit,Math.hypot(unit.x-ref!.x,unit.y-ref!.y),soldier.leash)),centre=anchored?ref:undefined;
  const reach=(u:Unit)=>centre?Math.hypot(u.x-centre.x,u.y-centre.y)<=ENGAGE:distance(unit,u)<=560;
  if(!target||target.hp<=0||target.team===unit.team||(warlord&&unit.team==='blue'&&damageImmune(target))||(!target.kind.startsWith('base')&&distance(unit,target)>560)||(anchored&&!reach(target))||(target.kind==='guardian'&&!pursue(target,true))){target=undefined;unit.targetId=undefined;}
  // Reconsider the strategic objective once per second; a newly opened route may beat breaching.
  if(unit.breachId&&tick>=(unit.targetSinceTick??0)+30){unit.breachId=undefined;unit.targetId=undefined;target=undefined;}
  const breach=unit.breachId?structures[unit.breachId]:undefined;
  if(breach&&breach.hp>0&&breach.team!==unit.team)target=breach;else unit.breachId=undefined;
  if(!unit.breachId&&(!target||tick>=(unit.decisionTick??0))){
   unit.decisionTick=tick+6;
   const visible=[...Object.values(state.units),...Object.values(structures).filter(u=>(u.kind==='tower'&&!(soldier?.assist&&!hasAttackCell(geo,u,unit.radius,unit.range)))||u.banner||u.kind.startsWith('base')||(soldier&&isBarracks(u))||(soldier?.assist&&hero.hp>0&&u.kind==='wall'&&u.team==='red'&&hero.targetId===u.id))].filter(u=>u.hp>0&&u.team!==unit.team&&(soldier?reach(u):distance(unit,u)<=560)&&(u.kind!=='guardian'||pursue(u,false))&&!(warlord&&unit.team==='blue'&&damageImmune(u)));
   const nearest=visible.sort((a,b)=>(soldier?.assist?Number(b.kind==='wall'&&b.id===hero.targetId)-Number(a.kind==='wall'&&a.id===hero.targetId):0)||Number(canAttackOn(geo,unit,b,structures))-Number(canAttackOn(geo,unit,a,structures))||Number(!!b.warBanner)-Number(!!a.warBanner)||Number(b.kind==='guardian'||b.kind.startsWith('minion'))-Number(a.kind==='guardian'||a.kind.startsWith('minion'))||distance(unit,a)-distance(unit,b)||a.id.localeCompare(b.id))[0];
   if(!target||tick>=(unit.targetSinceTick??0)+30||(unit.retaliateTick!==undefined&&unit.retaliateTick>=(unit.targetSinceTick??0))){if(nearest?.id!==target?.id)unit.targetSinceTick=tick;target=nearest??(anchored||warlord&&unit.team==='blue'?undefined:state.bases[unit.team==='blue'?'red-base':'blue-base']);}
  }
  let home:{x:number;y:number}|undefined;
  if(unit.warlordReinforcement==='horn'&&!taunt){
   const post=state.post,banner=post?.owner==='azure'&&post.bannerId?structures[post.bannerId]:undefined;
   target=banner?.hp?banner:state.bases['blue-base'];
  }
  if((unit.archetype==='crimson-hero'||unit.courtyardBarracks||unit.warlordReinforcement==='iron')&&state.bases['blue-base'].hp>0&&!taunt){
   unit.breachId=undefined;
   // A Defender guards its own post and hunts its Banner if it turns Azure. The Raider has no post and hunts any Banner.
   const camps=state.posts??(state.post?[state.post]:[]),mine=camps.find(p=>p.anchor&&(p.defenderId??heroId)===unit.id),nearest=(us:Unit[])=>us.sort((p,q)=>distance(unit,p)-distance(unit,q)||p.id.localeCompare(q.id))[0];
    const guard=state.guard,ward=unit.localGuard?{a:unit.localGuard.anchor,r:unit.localGuard.radius}:mine?.anchor&&mine.guard!==undefined&&mine.owner==='crimson'?{a:mine.anchor,r:mine.guard}:unit.id===heroId&&guard&&!guard.raid&&!guard.raidTarget?{a:guard.anchor,r:guard.radius}:undefined; // Chapter 4 M4: a guard post is a Warden until its raid starts
    if(unit.commander){ // Chapter 4 M6: the Iron Marshal takes the nearest Azure tower, then Barracks, on his road or past its west end, then the Azure Keep; the Shadowblade keeps the target chosen at its warning, then the Azure Keep
     const cmd=unit.commander,v=geo.field.flankVia?.[cmd.lane],o=geo.field.flankVia?.[cmd.lane==='north'?'south':'north'],west=(p:Unit)=>!v||p.x<v.x-48,mine=(p:Unit)=>west(p)||!v||!o||Math.abs(p.y-v.y)<Math.abs(p.y-o.y);
     const blue=Object.values(structures).filter(u=>u.hp>0&&u.team==='blue');
     if(cmd.role==='marshal')target=nearest(blue.filter(u=>u.kind==='tower'&&mine(u)))??nearest(blue.filter(u=>u.azureBarracks&&!u.eliteBarracks&&mine(u)))??state.bases['blue-base'];
     else{const fixed=cmd.targetId?structures[cmd.targetId]??state.bases[cmd.targetId]:undefined;if(fixed&&fixed.hp>0&&fixed.team==='blue')target=fixed;else{cmd.targetId=undefined;target=state.bases['blue-base'];}}
     if(unit.flank&&target&&!west(target))unit.flank=undefined; // the target stands on the road itself, which is already the shortest way there
    }
    else if(unit.id===heroId&&guard?.raidTarget)target=structures[guard.raidTarget]; // A scheduled guard counterattack commits to the named Banner.
    else if(!ward&&(!camps.length||(unit.id===heroId&&!mine))&&(!guard||guard.raid))target=state.bases['blue-base']; // Chapter 3 M6: the Crimson Hero marches on the Azure Keep and fights nothing else (Chapter 5 M6: so does the Lord, the heroId Hero of a mission with camps and no Warden) (a Guardian Taunt still holds it)
    else if(ward){ // Chapter 4 M1, Warden: fights what comes within the guard radius of his anchor, otherwise stands there
     const a=ward.a,r=ward.r;
    // Wardens strike a wall's centre, which is out of reach inside a seized Elite Barracks footprint.
    target=nearest([...(unit.warlord?living:Object.values(state.units)),...(unit.warlord?[]:Object.values(structures))].filter(u=>u.hp>0&&u.team==='blue'&&!u.kind.startsWith('base')&&!(isBarracks(u)&&state.captures?.[u.id])&&
     (court?inCourtyard(u,state.bases['red-base'],court):Math.hypot(u.x-a.x,u.y-a.y)<=r)));
    if(!target)home=a;
   }else{ // Raider: a standing Banner first, then the Azure towers inside an Azure camp's circle (nearest first), then the Azure Keep. The Defender hunts his own camp only.
    const hunt=mine?[mine]:camps,banners=hunt.map(p=>p.bannerId?structures[p.bannerId]:undefined).filter((b):b is Structure=>!!b&&b.team==='blue'&&b.hp>0);
    target=nearest(banners)??nearest(Object.values(structures).filter(u=>u.hp>0&&u.team==='blue'&&u.kind==='tower'&&hunt.some(p=>p.owner==='azure'&&Math.hypot(u.x-p.circle.x,u.y-p.circle.y)<=p.circle.radius+24)))??state.bases['blue-base'];
   }
  }
  if(unit.escortOf){ // Escorts follow their leader's target and revert to ordinary soldiers when he falls.
   const lead=state.units[unit.escortOf];
   if(!lead||lead.hp<=0)unit.escortOf=undefined;
   else{
    const banner=lead.id===heroId&&state.guard?.raidTarget?structures[state.guard.raidTarget]:undefined;
    const foe=[...Object.values(state.units),...Object.values(structures)].filter(u=>u.hp>0&&u.team==='blue'&&!u.kind.startsWith('base')&&Math.hypot(u.x-lead.x,u.y-lead.y)<=200&&(!banner||canAttackOn(geo,unit,u,structures))).sort((a,b)=>distance(unit,a)-distance(unit,b)||a.id.localeCompare(b.id))[0];
    target=foe??banner??(lead.targetId?state.units[lead.targetId]??structures[lead.targetId]??state.bases[lead.targetId]:undefined);unit.flank=lead.flank?{...lead.flank}:undefined;
   }
  }
  // Chapter 4 M4: a siege cart attacks structures only. Crimson: the nearest Azure structure, then the Azure Keep. Azure: its ordered list (gates, then the Keep). An Azure cart walks only while the Guardian is near (below).
  if(unit.cart){
   const enemyKeep=state.bases[unit.team==='blue'?'red-base':'blue-base'],alive=(s:Unit|undefined)=>!!s&&s.hp>0&&s.team!==unit.team&&!s.open;
   target=unit.cart.order?unit.cart.order.map(id=>structures[id]).find(alive)??enemyKeep:Object.values(structures).filter(s=>alive(s)&&!s.kind.startsWith('base')).sort((p,q)=>distance(unit,p)-distance(unit,q)||p.id.localeCompare(q.id))[0]??enemyKeep;
  }
  if(unit.ally){const p=allyPlan(state,geo,unit,structures,tick,unit.breachId?breach:undefined);target=p.target;home=p.home;unit.ally.goal=target?undefined:home;if(target?.id!==unit.breachId)unit.breachId=undefined;if(!target&&!home){unit.targetId=undefined;continue;}} // PROTOTYPE Chapter 5: an Allied Hero's Simple Command (AllyProbe.ts)
  if(taunt&&!unit.cart)target=state.units[taunt.sourceId];
  unit.targetId=target?.id;trackPursuit(unit,target?.kind,tick);
  if(target&&canAttackOn(geo,unit,target,structures))continue; // structures is this unit's own view (line 28)
  if(unit.cart?.follow!==undefined&&!(hero.hp>0&&distance(unit,hero)<=unit.cart.follow))continue; // an Azure cart waits for the Guardian and resumes the moment he is back within range
  // Chapter 2 S7: a unit a wave flank tagged routes to its bank waypoint first (src/simulation/Flank.ts). Anything already in range was attacked above; a nearby non-Keep target suspends the flank for the tick.
  let via;
  if(home&&!target){if(Math.hypot(home.x-unit.x,home.y-unit.y)<=30)continue;via=home;} // Chapter 4 M1: a Warden with nothing to fight returns to his anchor
  if(unit.flank&&!unit.breachId){via=geo.field.flankVia?.[unit.flank.lane];if(flankEnd(unit,via,tick))unit.flank=undefined;if(!unit.flank||flankSuspended(unit,target))via=undefined;}
  // Idle soldiers rally to the Guardian. Allied Heroes already have a waypoint from their own order.
  if(!target&&!unit.ally&&(anchored||warlord&&unit.team==='blue')){const a=soldierAnchor(state,tick,(x,y)=>!geo.blocked(x,y,unit.radius,structures),!!soldier?.cellAnchor||!!warlord);if(Math.hypot(a.x-unit.x,a.y-unit.y)<=HOLD)continue;via=a;}
  // PROTOTYPE: steer straight at the stand-off point (or the anchor) when the segment is clear; otherwise plan as usual.
  const meleeTarget=target&&(court||unit.warlord||target.warlord)&&state.units[target.id];
  const meleePosition=meleeTarget?(from:Position)=>openMeleePosition(navigation,unit,meleeTarget,living,structures,from):undefined;
  const aim=meleePosition?.(unit)??((soldier&&(soldier.steer||soldier.mode==='hybrid'||anchored))||unit.ally?(target&&!via?(unit.ally?allyStandoff(geo,unit,target,hero,structures):standoff(unit,target)):via):undefined);
  let route=aim&&geo.clearSegment(unit,aim,unit.radius,structures)?({points:[aim],version:navigation.version,goal:"steer",retryTick:0,cost:0} as Route):navigation.route(unit,target,state,tick,via,meleePosition);
  if(via&&route&&route.cost===Infinity&&!(anchored&&!target)&&!unit.ally&&!unit.courtyardBarracks&&!court&&!unit.warlord&&!(warlord&&unit.team==='blue'&&!target)){unit.flank=undefined;route=navigation.route(unit,target,state,tick);} // local defenders and Allied Heroes hold when their waypoint is unreachable
  if(!route)continue;
  if(route.breachId){const wall=structures[route.breachId];if(wall&&wall.team!==unit.team){if(unit.breachId!==wall.id)unit.targetSinceTick=tick;unit.breachId=wall.id;unit.targetId=wall.id;if(canAttackOn(geo,unit,wall,structures))continue;}}
  while(route.points.length){const p=route.points[0];if(Math.hypot(p.x-unit.x,p.y-unit.y)<.001||(route.points.length>1&&hero.hp>0&&Math.hypot(p.x-hero.x,p.y-hero.y)<unit.radius+hero.radius)||(route.points.length>1&&geo.clearSegment(unit,route.points[1],unit.radius,structures)&&Math.hypot(p.x-unit.x,p.y-unit.y)<=14))route.points.shift();else break;}
  let next=route.points[0];
  // Retain a safe lateral lane on straight edges rather than pull a separated crowd to one center.
  if(next&&route.points.length>1){const following=route.points[1];const lane=following.y===next.y&&Math.abs(unit.y-next.y)<=14?{x:next.x,y:unit.y}:following.x===next.x&&Math.abs(unit.x-next.x)<=14?{x:unit.x,y:next.y}:next;if(Math.hypot(lane.x-unit.x,lane.y-unit.y)>.001&&geo.clearSegment(unit,lane,unit.radius,structures))next=lane;}
  if(!next)continue;
  // PROTOTYPE (hybrid): at the tether a soldier does not step further from the Guardian; it stands and fights.
  if(soldier?.mode==='hybrid'&&!anchored){const d0=Math.hypot(unit.x-ref!.x,unit.y-ref!.y);if(d0>=(soldier.leash??LEASH)&&Math.hypot(next.x-ref!.x,next.y-ref!.y)>d0)continue;}
  const dx=next.x-unit.x,dy=next.y-unit.y,length=Math.hypot(dx,dy),step=Math.min(length,unit.speed/HZ*Math.min(slowFactor(unit,tick),1-zoneSlow(geo.field,unit)));
  if(length>0){
   const wasInArena=unit.warlord&&inWarlordArena(unit,unit),x=unit.x,y=unit.y;
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
   if(wasInArena&&!inWarlordArena(unit,unit)){unit.x=x;unit.y=y;}
  }
 }
 // Symmetric separation never pushes a minion into terrain or construction.
 for(let i=0;i<minions.length;i++)for(let j=i+1;j<minions.length;j++){
  const a=minions[i],b=minions[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),minimum=a.radius+b.radius+2;
  if(d>=minimum)continue;
  const x=d?dx/d:0,y=d?dy/d:1,push=Math.min(1,(minimum-d)/2);
  if(!a.cleave&&!a.warlordCharge)geo.moveUnit(a,-x*push,-y*push,living,view(a));
  if(!b.cleave&&!b.warlordCharge)geo.moveUnit(b,x*push,y*push,living,view(b));
 }
 // Repair spawn/fixture overlaps gradually without crowd impulses on the player.
 // The Guardian stays responsive and cannot be shoved into terrain/construction.
 if(hero.hp>0)for(const unit of minions){
  const dx=unit.x-hero.x,dy=unit.y-hero.y,d=Math.hypot(dx,dy),minimum=unit.radius+hero.radius;
  if(d>=minimum||unit.cleave||unit.warlordCharge)continue;
  const x=d?dx/d:0,y=d?dy/d:1,push=Math.min(1,minimum-d);
  geo.move(unit,x*push,y*push,view(unit));
 }
}

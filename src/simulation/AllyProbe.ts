import {crimsonHero} from '../data/combat';
import type {Geometry} from './Collision';
import {standoff} from './SoldierProto';
import {canAttackOn} from './Combat';
import type {AllyOrder,GameState,Structure,Unit} from './GameState';
// PROTOTYPE (Chapter 5 Phase 0, docs/CHAPTER5_ALLY_PROBE.md): an Allied Hero under three Simple Commands. Nothing here runs unless a harness or the dev-only ?allyTest launch calls Simulation.spawnAlly,
// which no scene, campaign level or ordinary debug launch does. An Allied Hero is a blue minion whose id starts with "blue-h-" and that carries Unit.ally; it is never a soldier (SoldierProto), so the
// Barracks soldiers' Guardian tether does not apply, and it is not counted against the Azure soldier cap.
// - follow (default): fights what comes within FOLLOW_ENGAGE px of the Guardian (the Guardian's own target first; a unit within SELF_DEFENSE px of itself before others); otherwise walks to its slot beside the Guardian once
//   it is more than FOLLOW_LEAVE px from him, and stops on reaching the slot or FOLLOW_STOP px from him. While the Guardian is dead it holds where it stood, as Defend, until he is back.
// - attack: walks to the ordered target and fights it. On the way it fights back only a Crimson unit within CLEAR px that is attacking it (a passer-by marching elsewhere would drag it off its order). When the target is gone it defends where it stands.
// - defend: fights what comes within DEFEND_RADIUS px of its point, then walks back to the point.
// No retreat at low HP (predictable orders); death is final in the probe (Tavern rules are Phase 1).
export const ALLY_ID='blue-h-';
// REACH: strike reach beyond the Crimson Hero's 48 px; SLACK: Navigation plans attack cells this much inside the reach, so a crowd push off the cell does not cancel the strike wind-up (Navigation.search).
export const ALLY={FOLLOW_ENGAGE:320,FOLLOW_LEAVE:150,FOLLOW_STOP:96,SELF_DEFENSE:120,CLEAR:160,DEFEND_RADIUS:280,ARRIVE:30,REACH:12,SLACK:6,GIVE_UP:75,IGNORE:150} as const;
// The Knight: the Crimson Hero's stats (833 HP, armor 20, 80 damage every 23 ticks), 60 px reach (planned at 54: a tower centred on a cell edge has a diagonal cell at 53.7 px). Speed matches the Guardian's soldiers (120) so he keeps up on Follow.
export const allyKnight={...crimsonHero.stats,speed:120,range:crimsonHero.stats.range+ALLY.REACH};
// Slot offsets around the Guardian (world px), in ally order: Azure lies west, so the slots trail him to the west.
const SLOTS=[[-72,0],[-48,-72],[-48,72],[-120,0]] as const;
// The nearest open cell centre to a point, within two cells (Navigation can always plan to a cell centre; a raw point beside a wall may be unreachable: the soldier anchor-snap trap). Nearest, not the cell the
// point falls in: a Defend point tapped near a cell edge must not move a whole cell off (probe finding: a point 72 px from a flag snapped to 96 px, the ring's edge).
export function openCell(geo:Geometry,x:number,y:number,radius:number,structures:Record<string,Structure>){
 const cx=Math.floor(x/48),cy=Math.floor(y/48),cells:{x:number;y:number}[]=[];
 for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)cells.push({x:(cx+dx+.5)*48,y:(cy+dy+.5)*48});
 cells.sort((p,q)=>Math.hypot(p.x-x,p.y-y)-Math.hypot(q.x-x,q.y-y)||p.x-q.x||p.y-q.y);
 return cells.find(p=>!geo.blocked(p.x,p.y,radius,structures));
}
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
// Every point an Allied Hero holds (Defend, the hold while the Guardian is dead, the end of an Attack) is a cell centre: Navigation's waypoint goal is the cells within 24 px of the point,
// and a raw point can be more than 24 px from every centre (probe finding: a hold at 862.6,868.1 had no goal cell, the route cost Infinity and the Knight froze).
export const standAt=(geo:Geometry,p:{x:number;y:number},structures:Record<string,Structure>,radius:number=allyKnight.radius)=>openCell(geo,p.x,p.y,radius,structures)??{x:(Math.floor(p.x/48)+.5)*48,y:(Math.floor(p.y/48)+.5)*48};
// The point the Knight steers to for a strike. Navigation and the straight-line steer ignore unit bodies, so with the Guardian standing on the line to the usual stand-off point (probe finding: Follow
// assist on a tower he is hitting) the Knight shuffles against him. For a target measured from its centre (a unit or a tower) the stand-off point is turned round the target, 35 degrees at a time,
// to the first open point whose straight approach clears the Guardian; a footprinted target (a wall, a Keep) keeps the usual point.
export function allyStandoff(geo:Geometry,unit:Unit,target:Unit,hero:Unit,structures:Record<string,Structure>){
 const base=standoff(unit,target);
 if(target.kind.startsWith('base')||(target.kind==='wall'&&!!target.columns)||!(hero.hp>0))return base;
 const gap=hero.radius+unit.radius+2,clear=(p:{x:number;y:number})=>{const dx=p.x-unit.x,dy=p.y-unit.y,l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((hero.x-unit.x)*dx+(hero.y-unit.y)*dy)/l2)):0;return Math.hypot(unit.x+t*dx-hero.x,unit.y+t*dy-hero.y)>=gap;};
 if(clear(base))return base;
 const vx=base.x-target.x,vy=base.y-target.y;
 for(const deg of [35,-35,70,-70,105,-105,140,-140]){const r=deg*Math.PI/180,p={x:target.x+vx*Math.cos(r)-vy*Math.sin(r),y:target.y+vx*Math.sin(r)+vy*Math.cos(r)};if(!geo.blocked(p.x,p.y,unit.radius,structures)&&clear(p))return p;}
 return base;
}
// Hostiles an Allied Hero may fight: living Crimson units and structures, never an invulnerable (shielded) Keep or a captured gate that stands open.
const hostile=(u:Unit)=>u.hp>0&&u.team==='red'&&!u.invulnerable&&!u.open;
const mobile=(u:Unit)=>u.kind.startsWith('minion');
// Units before structures, then the nearest to `from`, then id (deterministic).
const pick=(list:Unit[],from:Unit)=>list.sort((a,b)=>Number(mobile(b))-Number(mobile(a))||dist(from,a)-dist(from,b)||a.id.localeCompare(b.id))[0];
export function resolveTarget(state:GameState,id:string){return state.units[id]??state.structures[id]??state.bases[id];}
// What the Allied Hero fights this tick and, when it fights nothing, the point it walks to (Movement stops within ALLY.ARRIVE px of it); neither = it stands.
// A breach the route planner chose (a wall in the way) is kept while it stands, as for every blue minion.
// Two guards against standing still for good (probe findings, the stress run): a Crimson unit inside a structure that is solid for Azure (a soldier walking through its own faction gate) is never a target,
// and a chosen target the Knight neither struck nor moved toward for GIVE_UP ticks is ignored for IGNORE ticks. The ordered Attack target and a breach are exempt: those it keeps until they fall.
export function allyPlan(state:GameState,geo:Geometry,unit:Unit,structures:Record<string,Structure>,tick:number,breach?:Unit):{target?:Unit;home?:{x:number;y:number}}{
 const a=unit.ally!,hero=state.units.guardian;
 const foes=[...Object.values(state.units),...Object.values(structures),...Object.values(state.bases)].filter(f=>hostile(f)&&!((a.ignore?.[f.id]??-1)>tick)&&!(mobile(f)&&geo.blocked(f.x,f.y,1,structures)));
 const near=(c:{x:number;y:number},r:number,units=false)=>foes.filter(f=>(!units||mobile(f))&&!f.kind.startsWith('base')&&dist(f,c)<=r);
 const fight=(t:Unit|undefined)=>{
  if(!t){a.watch=undefined;return t;}
  if(a.watch?.id!==t.id||dist(unit,a.watch)>=4||canAttackOn(geo,unit,t,structures)){a.watch={id:t.id,x:unit.x,y:unit.y,tick};return t;}
  if(tick-a.watch.tick<ALLY.GIVE_UP)return t;
  const ignore:Record<string,number>={};for(const [id,until] of Object.entries(a.ignore??{}))if(until>tick)ignore[id]=until;ignore[t.id]=tick+ALLY.IGNORE;a.ignore=ignore;a.watch=undefined;return undefined;
 };
 if(breach&&hostile(breach))return {target:breach};
 let order:AllyOrder=a.order;
 if(order.type==='attack'){
  const t=resolveTarget(state,order.targetId);
  if(!t||!hostile(t))order=a.order={type:'defend',...standAt(geo,unit,structures)};
  else return {target:fight(pick(near(unit,ALLY.CLEAR,true).filter(f=>f.targetId===unit.id||f.strike?.targetId===unit.id),unit))??t};
 }
 if(order.type==='follow'&&!(hero.hp>0))a.hold??=standAt(geo,unit,structures);
 if(order.type==='follow'&&hero.hp>0){
  a.hold=undefined;
  const assist=hero.targetId?resolveTarget(state,hero.targetId):undefined;
  const target=fight((assist&&hostile(assist)&&dist(assist,hero)<=ALLY.FOLLOW_ENGAGE?assist:undefined)??pick(near(unit,ALLY.SELF_DEFENSE,true).filter(f=>dist(f,hero)<=ALLY.FOLLOW_ENGAGE),unit)??pick(near(hero,ALLY.FOLLOW_ENGAGE,true),unit)); // never chased away from the Guardian
  if(target)return {target};
  const [ox,oy]=SLOTS[a.slot%SLOTS.length],slot=openCell(geo,hero.x+ox,hero.y+oy,unit.radius,structures)??openCell(geo,hero.x,hero.y,unit.radius,structures);
  if(!slot)return {};
  if(!a.moving&&dist(unit,hero)>ALLY.FOLLOW_LEAVE)a.moving=true;
  if(a.moving&&(dist(unit,slot)<=ALLY.ARRIVE||dist(unit,hero)<=ALLY.FOLLOW_STOP))a.moving=undefined; // close enough beside him: a slot on his far side would have it push against his body
  return a.moving?{home:slot}:{};
 }
 const post=order.type==='defend'?{x:order.x,y:order.y}:a.hold!;
 const target=fight(pick(near(post,ALLY.DEFEND_RADIUS),unit));
 return target?{target}:{home:post};
}

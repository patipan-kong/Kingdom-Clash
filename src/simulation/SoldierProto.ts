import type {GameState,Unit} from './GameState';
// PROTOTYPE (Chapter 3 S0 + soldier AI). Nothing here runs unless a harness sets Simulation.soldierProto, which no scene, campaign level or debug launch does.
// A soldier is any blue minion whose id starts with "blue-s-". Two behaviours are compared:
// - anchored: a soldier fights hostile units, towers, Keeps and Barracks within ENGAGE px of the Guardian (the Azure Keep while the Guardian is dead) and otherwise walks to a throttled, grid-snapped
//   anchor at the Guardian, holding within HOLD px of it. Straight lines are used whenever the way is clear, so open ground costs no route plan.
// - advance: the stock blue-minion rules (nearest hostile within 560 px, otherwise the Crimson Keep, planned with Navigation), plus hostile Barracks as targets.
// - hybrid: advance, tethered to the Guardian. A soldier advances as in 'advance' but never moves further than LEASH px from the Guardian (the Azure Keep while it is dead); it stands at the tether
//   and fights what comes. Beyond leash + 60 px (the Guardian ran off, or a chase pulled it away) it behaves as 'anchored' until it is back within leash - 120 px, then advances again. The gap between
//   the two is the hysteresis; standing at the tether, not walking back to it, keeps a still Guardian from making the army pace in and out.
// steer (either mode): walk straight at the target (or anchor) whenever the segment is clear, and plan with Navigation only when it is not.
export interface SoldierProto{mode:'anchored'|'advance'|'hybrid';steer?:boolean;leash?:number} // leash: hybrid tether in px (default LEASH); the return and resume distances follow it
export const ENGAGE=360,HOLD=120,ANCHOR_TICKS=20,ANCHOR_GRID=96,LEASH=600,RETURN_MARGIN=60,RESUME_MARGIN=120;
const back=new WeakSet<Unit>();
// Mode changes, for the harness only.
export const hybridStats={toReturn:0,toAdvance:0};
// d = the soldier's distance from the Guardian (or Keep). True while the soldier is returning: from leash + RETURN_MARGIN until back within leash - RESUME_MARGIN.
export function hybridReturning(u:Unit,d:number,leash=LEASH){
 if(back.has(u)){if(d<leash-RESUME_MARGIN){back.delete(u);hybridStats.toAdvance++;return false;}return true;}
 if(d>leash+RETURN_MARGIN){back.add(u);hybridStats.toReturn++;return true;}
 return false;
}
export const isSoldier=(u:Unit)=>u.kind==='minion-blue'&&u.id.startsWith('blue-s-');
export const isBarracks=(u:Unit)=>u.kind==='wall'&&u.id.includes('barracks');
// Combat.canAttackOn: a soldier measures its reach to a footprinted wall from the footprint edge, as every unit already does for a Keep. A melee reach of 48 px cannot otherwise touch a 2 x 2 wall
// (its edge is 48 px from the centre and a soldier's centre stays 12 px outside it).
export const footprintWall=(a:Unit,b:Unit)=>b.kind==='wall'&&!!b.columns&&a.id.startsWith('blue-s-');
const anchors=new WeakMap<GameState,{x:number;y:number;tick:number}>();
// open(x,y) says whether a soldier can stand at a point. The coarse snap can land inside scenery, which Navigation reports as unreachable, so the first open point is used: the snap, then the cells around the Guardian by distance.
export function soldierAnchor(state:GameState,tick:number,open:(x:number,y:number)=>boolean=()=>true){
 let a=anchors.get(state);
 if(!a||tick>=a.tick+ANCHOR_TICKS){
  const g=state.units.guardian,src=g&&g.hp>0?g:state.bases['blue-base'],snap={x:Math.round(src.x/ANCHOR_GRID)*ANCHOR_GRID,y:Math.round(src.y/ANCHOR_GRID)*ANCHOR_GRID};
  let at=snap;
  if(!open(snap.x,snap.y)){
   const cx=Math.floor(src.x/48),cy=Math.floor(src.y/48),ring:{x:number;y:number}[]=[];
   for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++)ring.push({x:(cx+dx+.5)*48,y:(cy+dy+.5)*48});
   ring.sort((p,q)=>Math.hypot(p.x-src.x,p.y-src.y)-Math.hypot(q.x-src.x,q.y-src.y)||p.x-q.x||p.y-q.y);
   at=ring.find(p=>open(p.x,p.y))??snap;
  }
  a={x:at.x,y:at.y,tick};anchors.set(state,a);
 }
 return a;
}
// The point a soldier walks to when it wants to attack target: inside its reach, on the near side. Keeps and footprinted walls measure reach from the footprint edge, everything else from its centre.
export function standoff(unit:Unit,target:Unit){
 const edge=target.kind.startsWith('base')||(target.kind==='wall'&&!!target.columns);
 const fx=edge?Math.max(target.x-(target.columns??3)*24,Math.min(target.x+(target.columns??3)*24,unit.x)):target.x,fy=edge?Math.max(target.y-(target.rows??3)*24,Math.min(target.y+(target.rows??3)*24,unit.y)):target.y;
 const dx=unit.x-fx,dy=unit.y-fy,d=Math.hypot(dx,dy)||1,k=Math.min(d,unit.range*(edge?.6:.8));
 return {x:fx+dx/d*k,y:fy+dy/d*k};
}

import {GRID,WORLD} from '../world/layout';
import {blocked} from './Collision';
import {canAttack,damageAfterArmor} from './Combat';
import {HZ} from './Clock';
import type {GameState,Structure,Unit} from './GameState';

export interface Route {
 points:{x:number;y:number}[]; version:number; goal:string; retryTick:number;
 breachId?:string; cost:number;
}
const COLS=WORLD.width/GRID,ROWS=WORLD.height/GRID,COUNT=COLS*ROWS;
const point=(i:number)=>({x:(i%COLS+.5)*GRID,y:(Math.floor(i/COLS)+.5)*GRID});
// Used for both graph edges and steering: a grid route never replaces collision.
export function clearSegment(a:{x:number;y:number},b:{x:number;y:number},radius:number,structures:Record<string,Structure>={}) {
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
 for(let i=0;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,radius,structures))return false;
 return true;
}
export class Navigation {
 version=0;
 readonly stats={plans:0,expanded:0,plansThisTick:0,maxPlansPerTick:0,maxExpandedPerPlan:0};
 private signature='';
 private routes=new Map<string,Route>();
 private staticGrid=new Map<number,boolean[]>();
 private cursor=0;
 begin(state:GameState) {
  this.stats.plansThisTick=0;
  const signature=Object.values(state.structures).filter(b=>b.hp>0).sort((a,b)=>a.id.localeCompare(b.id)).map(b=>`${b.id}:${b.team}:${b.x}:${b.y}`).join('|');
  if(signature!==this.signature){this.signature=signature;this.version++;}
  for(const id of this.routes.keys())if(!state.units[id])this.routes.delete(id);
 }
 routeFor(id:string){return this.routes.get(id);}
 // Rotate planning priority so a crowd cannot starve a later unit.
 order(units:Unit[]){if(!units.length)return units;const at=this.cursor++%units.length;return [...units.slice(at),...units.slice(0,at)];}
 private grid(radius:number){
  let grid=this.staticGrid.get(radius);
  if(!grid){grid=Array.from({length:COUNT},(_,i)=>{const p=point(i);return !blocked(p.x,p.y,radius);});this.staticGrid.set(radius,grid);}
  return grid;
 }
 route(unit:Unit,target:Unit|undefined,state:GameState,tick:number):Route|undefined {
  if(unit.speed<=0)return undefined;
  const destination=target??{x:unit.team==='blue'?1490:450,y:600};
  const key=`${target?.id??'objective'}:${Math.floor(destination.x/GRID)}:${Math.floor(destination.y/GRID)}`;
  let route=this.routes.get(unit.id);
  if(route?.version!==this.version){
   // Retain unaffected routes on additions; removals can unlock a shorter route.
   const valid=route&&route.points.length>0&&!route.breachId&&route.points.every((p,i)=>clearSegment(i?route!.points[i-1]:unit,p,unit.radius,state.structures));
   if(valid&&route&&route.goal===key&&tick<route.retryTick)route.version=this.version;
   else route=undefined;
  }
  if(route&&route.goal===key&&tick<route.retryTick)return route;
  if(this.stats.plansThisTick>=2)return undefined; // Wait safely until budget is available.
  this.stats.plans++;this.stats.plansThisTick++;this.stats.maxPlansPerTick=Math.max(this.stats.maxPlansPerTick,this.stats.plansThisTick);
  const normal=this.search(unit,destination,target,state.structures,false);
  const breach=Object.values(state.structures).some(b=>b.team!==unit.team&&b.hp>0)?this.search(unit,destination,target,state.structures,true):undefined;
  // A stable route is preferred unless breaching improves travel time by >20%.
  const result=breach&&(!normal||breach.cost<normal.cost*.8)?breach:normal;
  route={points:result?.points??[],breachId:result?.breachId,cost:result?.cost??Infinity,version:this.version,goal:key,retryTick:tick+30};
  this.routes.set(unit.id,route);return route;
 }
 private search(unit:Unit,destination:{x:number;y:number},target:Unit|undefined,structures:Record<string,Structure>,allowBreach:boolean){
  const staticGrid=this.grid(unit.radius),live=Object.values(structures).filter(b=>b.hp>0);
  const masks=Array.from({length:COUNT},(_,i)=>{const p=point(i);return live.filter(b=>Math.abs(p.x-b.x)<24+unit.radius&&Math.abs(p.y-b.y)<24+unit.radius);});
  const usable=(i:number)=>staticGrid[i]&&masks[i].every(b=>allowBreach&&b.team!==unit.team&&unit.damage>0);
  // Every node is an actual radius-safe attack position (or objective approach).
  const goals=new Set<number>();
  for(let i=0;i<COUNT;i++)if(usable(i)&&!masks[i].length){const p=point(i);if(target?canAttack({...unit,...p},target,structures):Math.hypot(p.x-destination.x,p.y-destination.y)<=GRID/2)goals.add(i);}
  if(!goals.size)return undefined;
  const starts=Array.from({length:COUNT},(_,i)=>i).filter(i=>staticGrid[i]&&!masks[i].length&&Math.hypot(point(i).x-unit.x,point(i).y-unit.y)<=GRID*1.5&&clearSegment(unit,point(i),unit.radius,structures)).sort((a,b)=>Math.hypot(point(a).x-unit.x,point(a).y-unit.y)-Math.hypot(point(b).x-unit.x,point(b).y-unit.y)||a-b);
  if(!starts.length)return undefined;
  const start=starts[0],cost=new Float64Array(COUNT).fill(Infinity),parent=new Int32Array(COUNT).fill(-1),closed=new Uint8Array(COUNT);
  cost[start]=Math.hypot(point(start).x-unit.x,point(start).y-unit.y)/unit.speed;
  const goalPoints=[...goals].map(point);
  // Distance to the actual attack cells is admissible even when target and attacker ranges differ.
  const heuristic=(i:number)=>Math.min(...goalPoints.map(g=>Math.abs(point(i).x-g.x)+Math.abs(point(i).y-g.y)))/unit.speed;
  const open=[start];let end=-1,expanded=0;
  while(open.length){
   open.sort((a,b)=>(cost[a]+heuristic(a))-(cost[b]+heuristic(b))||a-b);
   const current=open.shift()!;if(closed[current])continue;closed[current]=1;expanded++;
   if(goals.has(current)){end=current;break;}
   const col=current%COLS,row=Math.floor(current/COLS);
   const neighbors=[col>0?current-1:-1,col<COLS-1?current+1:-1,row>0?current-COLS:-1,row<ROWS-1?current+COLS:-1];
   for(const next of neighbors){
    if(next<0||closed[next]||!usable(next))continue;
    // Ignore only hostile destructibles in a strategic breach plan, never terrain/friendlies.
    const blockers=allowBreach?Object.fromEntries(live.filter(b=>b.team===unit.team).map(b=>[b.id,b])):structures;
    if(!clearSegment(point(current),point(next),unit.radius,blockers))continue;
    const penalty=masks[next].filter(b=>!masks[current].includes(b)).reduce((sum,b)=>sum+b.hp/Math.max(.001,damageAfterArmor(unit.damage,b.armor))*unit.cooldownTicks/HZ,0);
    const candidate=cost[current]+GRID/unit.speed+penalty;
    if(candidate<cost[next]){cost[next]=candidate;parent[next]=current;open.push(next);}
   }
  }
  this.stats.expanded+=expanded;this.stats.maxExpandedPerPlan=Math.max(this.stats.maxExpandedPerPlan,expanded);
  if(end<0)return undefined;
  const indices:number[]=[];for(let i=end;i>=0;i=parent[i])indices.unshift(i);
  const breachId=indices.flatMap(i=>masks[i]).find(b=>b.team!==unit.team)?.id;
  return {points:indices.map(point),breachId,cost:cost[end]};
 }
}

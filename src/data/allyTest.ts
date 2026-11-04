import type {Simulation} from '../simulation/Simulation';
import {combatStructures} from '../simulation/GameState';
import {buildings} from './buildings';
import {minionStatsOf} from './combat';
import {RESOURCE_UNITS} from './resources';
// PROTOTYPE Chapter 5 Phase 0 (docs/CHAPTER5_ALLY_PROBE.md): development-only Allied Hero playtest on any campaign level, for the real-device (Galaxy S24) performance check:
// ?debug=1&level=36&allyTest=1 (three Knights) or ?debug=1&level=36&allyTest=stress (also an Azure War Cart, an Azure Ballista and resources for every Barracks pad). Pure parse; production (dev=false),
// a missing debug=1 and any other value return null, so normal play never has Allied Heroes. The orders are scripted (there is no command UI in the probe):
// Knight 1 follows the Guardian, Knight 2 attacks the Crimson tower nearest the Azure Keep, Knight 3 defends the road 360 px east of the Azure Keep. Nothing is saved.
export type AllyTest='1'|'stress';
export function allyTestFromSearch(search:string,dev:boolean):AllyTest|null{
 if(!dev)return null;
 const q=new URLSearchParams(search),v=q.get('allyTest');
 return q.get('debug')==='1'&&(v==='1'||v==='stress')?v:null;
}
const RING=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2]] as const;
// The first open spot on a 48 px ring around x,y for a unit of this radius.
function spot(sim:Simulation,x:number,y:number,radius:number){const st=combatStructures(sim.state);for(const [dx,dy] of RING){const p={x:x+dx*48,y:y+dy*48};if(!sim.geo.blocked(p.x,p.y,radius,st)&&Object.values(sim.state.units).every(u=>u.hp<=0||Math.hypot(u.x-p.x,u.y-p.y)>=u.radius+radius))return p;}return undefined;}
export function applyAllyTest(sim:Simulation,mode:AllyTest){
 const h=sim.hero,keep=sim.state.bases['blue-base'],ids:string[]=[];
 for(const [dx,dy] of [[-60,0],[-60,-60],[-60,60]]){const p=spot(sim,h.x+dx,h.y+dy,20);const id=p&&sim.spawnAlly(p.x,p.y);if(id)ids.push(id);}
 const tower=Object.values(sim.state.structures).filter(s=>s.team==='red'&&s.kind==='tower'&&s.hp>0).sort((a,b)=>Math.hypot(a.x-keep.x,a.y-keep.y)-Math.hypot(b.x-keep.x,b.y-keep.y)||a.id.localeCompare(b.id))[0];
 if(ids[1]&&tower)sim.orderAlly(ids[1],{type:'attack',targetId:tower.id});
 const post=spot(sim,keep.x+360,keep.y,20);if(ids[2]&&post)sim.orderAlly(ids[2],{type:'defend',...post});
 if(mode==='stress'){
  const economy=(sim as unknown as {economy:{balances:Record<string,number>}}).economy;economy.balances={...economy.balances,wood:5000*RESOURCE_UNITS,iron:1000*RESOURCE_UNITS};
  sim.azurePads.forEach((p,i)=>sim.send({type:'place',requestId:`ally-test-${i}`,kind:'barracks',col:p.col,row:p.row}));
  const c=spot(sim,h.x-110,h.y,12),stats=minionStatsOf('war-cart');
  if(c)sim.state.units['blue-c-probe']={id:'blue-c-probe',kind:'minion-blue',team:'blue',x:c.x,y:c.y,...stats,hp:stats.maxHp,readyTick:0,protectionTick:0,cart:{follow:300,order:(sim.setup.gates??[]).map(g=>g.id)}};
  const b=spot(sim,(Math.floor((keep.x+144)/48)+.5)*48,(Math.floor((keep.y-144)/48)+.5)*48,24),d=buildings.ballista; // a cell centre (the ring keeps it on centres)
  if(b){const col=Math.floor(b.x/48),row=Math.floor(b.y/48);sim.state.structures['probe-ballista']={id:'probe-ballista',kind:'tower',ballista:true,team:'blue',x:(col+.5)*48,y:(row+.5)*48,col,row,startTick:0,completeTick:0,progress:1,constructionDamage:0,...d,hp:d.maxHp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};}
 }
 console.info(`[Kingdom Clash] ALLY TEST ${mode}: ${ids.length} Knights (follow, attack ${tower?.id??'-'}, defend ${post?`${post.x},${post.y}`:'-'})${mode==='stress'?', War Cart, Ballista, Barracks pads funded':''}`);
}

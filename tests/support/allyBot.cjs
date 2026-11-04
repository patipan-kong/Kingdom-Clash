// Chapter 5 Phase 0 probe drivers (docs/CHAPTER5_ALLY_PROBE.md): Allied Heroes under Simple Commands on the Chapter 4 maps. Lives outside tests/*.cjs, so scripts/test.mjs never runs it as a test file.
const assert=require('node:assert/strict');
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {ALLY}=require('../../.test-build/simulation/AllyProbe.js');
const {structuresFor}=require('../../.test-build/simulation/GameState.js');
const {canAttackOn}=require('../../.test-build/simulation/Combat.js');
const {stunned}=require('../../.test-build/simulation/Statuses.js');
const {buildings}=require('../../.test-build/data/buildings.js');
const {minionStatsOf}=require('../../.test-build/data/combat.js');
const {RESOURCE_UNITS}=require('../../.test-build/data/resources.js');
const {DT,dist,route,strike}=require('./campaignBot.cjs');
const level=n=>new Simulation(`ally-${n}`,campaign.setup(n));
// No waves: the scripted list and the continuous cadence are emptied, so only what a test spawns (and the level's Heroes, cart and Elites) is on the field.
const calm=sim=>{sim.encounter={...sim.encounter,waves:[],continuous:false};sim.commanderPlan.clear();return sim;}; // and no Chapter 4 M6 Commanders
const strong=u=>{u.hp=u.maxHp=1e6;return u;};
const fund=sim=>{sim.economy.balances={...sim.economy.balances,wood:5000*RESOURCE_UNITS,iron:1000*RESOURCE_UNITS};};
const allies=sim=>Object.values(sim.state.units).filter(u=>u.ally);
// Per-tick watch over every Allied Hero (giveUps: targets the stall breaker dropped; each is a would-be stall). A stall is 90 ticks (3 s) in which it moved under 4 px while it wanted to move (a goal beyond ALLY.ARRIVE, or a target it cannot strike). A stun is not a stall.
function watcher(sim){
 const hist=new Map(),seen=new Set(),out={stalls:0,stallTicks:0,episodes:[],giveUps:0,giveUpLog:[]};
 out.tick=()=>{
  const blue=structuresFor(sim.state,'blue'),t=sim.clock.tick;
  for(const u of allies(sim)){
   for(const [id,until] of Object.entries(u.ally.ignore??{}))if(!seen.has(u.id+id+until)){seen.add(u.id+id+until);out.giveUps++;out.giveUpLog.push({id:u.id,target:id,tick:t,x:Math.round(u.x),y:Math.round(u.y),order:u.ally.order.type});} // the stall breaker gave up on a target (AllyProbe.allyPlan)
   const tgt=u.targetId&&(sim.state.units[u.targetId]??sim.state.structures[u.targetId]??sim.state.bases[u.targetId]);
   const wants=!stunned(u,t)&&((u.ally.goal&&dist(u,u.ally.goal)>ALLY.ARRIVE+2)||(tgt&&tgt.hp>0&&!canAttackOn(sim.geo,u,tgt,blue)));
   let h=hist.get(u.id);if(!h)hist.set(u.id,h={from:{x:u.x,y:u.y},at:t,stalled:false});
   if(!wants||dist(u,h.from)>=4){h.from={x:u.x,y:u.y};h.at=t;h.stalled=false;continue;}
   if(t-h.at>=90){out.stallTicks++;if(!h.stalled){h.stalled=true;out.stalls++;out.episodes.push({id:u.id,tick:t,x:Math.round(u.x),y:Math.round(u.y),order:u.ally.order.type,target:u.targetId,goal:u.ally.goal})}}
  }
 };
 return out;
}
// Drives the Guardian along a walkable route to `to` (snapped to open ground) with real move commands (Guardian speed), one waypoint at a time.
function walker(sim,to){
 const st={...sim.state.structures,...sim.state.bases},goal=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2]].map(([dx,dy])=>({x:Math.round((to.x+dx*24)/8)*8,y:Math.round((to.y+dy*24)/8)*8})).find(p=>!sim.geo.blocked(p.x,p.y,21,st))??to; // the nearest open 8 px grid point
 const path=route(sim,goal);let i=0;
 return ()=>{const h=sim.hero;if(h.hp<=0)return true;while(i<path.length&&dist(h,path[i])<10)i++;if(i>=path.length){sim.send({type:'move',x:0,y:0});return true;}const p=path[i];sim.send({type:'move',x:p.x-h.x,y:p.y-h.y});return false;};
}
// Advances `ticks`, calling each(tick) before every step; logs events with their tick.
function run(sim,ticks,each,log=[]){const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){each?.(sim.clock.tick);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;}
// The nearest open spot to x,y for a unit of this radius (ally spawns, the stress cart).
function openSpot(sim,x,y,radius=20){const st={...sim.state.structures,...sim.state.bases};for(let r=0;r<=6;r++)for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const p={x:x+dx*48*r,y:y+dy*48*r};if(!sim.geo.blocked(p.x,p.y,radius,st)&&Object.values(sim.state.units).every(u=>u.hp<=0||dist(u,p)>=u.radius+radius))return p;}assert.fail(`no open spot near ${x},${y}`);}
function ally(sim,x,y,opts={}){const p=openSpot(sim,x,y);const id=sim.spawnAlly(p.x,p.y);assert.ok(id,'ally spawned');if(opts.strong)strong(sim.state.units[id]);return id;}
// Stress additions (the returning Chapter 4 support): an Azure War Cart (Guardian-follow 300 px, ordered against the level's gates then the Keep) and a finished Azure Ballista on an open cell near x,y.
function azureCart(sim,x,y){const p=openSpot(sim,x,y,12),id='blue-c-probe',s=minionStatsOf('war-cart');sim.state.units[id]={...sim.unit(id,'minion-blue',p.x,p.y,undefined,undefined,sim.clock.tick),...s,hp:s.maxHp,cart:{follow:300,order:(sim.setup.gates??[]).map(g=>g.id)}};return id;}
function azureBallista(sim,x,y){const d=buildings.ballista,st={...sim.state.structures,...sim.state.bases};for(let r=0;r<=4;r++)for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const col=Math.floor(x/48)+dx*r,row=Math.floor(y/48)+dy*r,px=(col+.5)*48,py=(row+.5)*48;if(sim.geo.blocked(px,py,24,st))continue;const id='probe-ballista';sim.state.structures[id]={id,kind:'tower',ballista:true,team:'blue',x:px,y:py,col,row,startTick:0,completeTick:0,progress:1,constructionDamage:0,...d,hp:d.maxHp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};return id;}assert.fail('no Ballista cell');}
module.exports={level,calm,strong,fund,allies,watcher,walker,run,openSpot,ally,azureCart,azureBallista,strike,dist,DT,ALLY};

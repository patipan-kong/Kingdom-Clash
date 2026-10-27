// Headless deterministic policy bots for balance exploration (not a browser measurement).
// Requires `npm test` (it transpiles src into .test-build). Usage: node scripts/simulate-encounter.mjs [policy] [maxMinutes]
// (ENCOUNTER=prototype|extended, BATTLEFIELD=<registered battlefield id>, default Meadow)
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {upgradeRules,skillLevel}=require('../.test-build/data/progression.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
export const policies=['idle','rush','defend','balanced','casual'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Off Meadow the bot has no map-specific waypoints. It walks toward the farthest visible point of a grid path (24 px, 8 neighbours)
// through the match's own geometry (sim.geo), replanned every 30 ticks or when the goal changes cell; an unreachable goal paths to the
// nearest reachable cell.
function pathWaypoint(sim,h,goal,cache){
 const st=combatStructures(sim.state),r=h.radius,geo=sim.geo;
 if(geo.clearSegment(h,goal,r,st))return goal;
 const G=24,key=`${Math.round(goal.x/G)},${Math.round(goal.y/G)}`;
 if(cache.key!==key||sim.clock.tick>=cache.until||!cache.path.length){
  const k=(x,y)=>x+','+y,sx=Math.round(h.x/G)*G,sy=Math.round(h.y/G)*G,prev=new Map([[k(sx,sy),null]]),q=[[sx,sy]];let best=q[0];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];if(Math.hypot(x-goal.x,y-goal.y)<Math.hypot(best[0]-goal.x,best[1]-goal.y))best=q[i];
   for(const [dx,dy] of [[G,0],[-G,0],[0,G],[0,-G],[G,G],[G,-G],[-G,G],[-G,-G]]){const nx=x+dx,ny=y+dy;if(prev.has(k(nx,ny))||geo.blocked(nx,ny,r,st))continue;prev.set(k(nx,ny),[x,y]);q.push([nx,ny]);}}
  const path=[];for(let c=best;c;c=prev.get(k(c[0],c[1])))path.unshift({x:c[0],y:c[1]});
  Object.assign(cache,{key,until:sim.clock.tick+30,path});
 }
 const p=cache.path;
 while(p.length>1&&geo.clearSegment(h,p[1],r,st))p.shift();
 if(p.length>1&&dist(h,p[0])<=32)p.shift(); // never stall on a waypoint inside the bot's stopping distance
 return p[0]??goal;
}
// battlefield: a registered battlefield id; omitted (or 'meadow') runs the legacy encounter exactly as before.
export function runPolicy(policy,{encounter='extended',battlefield,maxMinutes=20,seed='bot',measure=false}={}){
 const sim=new Simulation(`${seed}-${policy}`,battlefield&&battlefield!=='meadow'?matchSetup(encounter,{battlefield}):encounter),s=sim.state,h=sim.hero,pathCache={path:[]};
 const stats={policy,encounter,battlefield:sim.field.id,casts:{bash:0,taunt:0,charge:0,zone:0},dealt:0,taken:0,peakUnits:0,deaths:0,xpEvents:[],baseTimeline:[],levelTimeline:[],xp:0,towersKilled:0,firstR:null,levelAtWave:{}};
 let req=0,mode='defend',lastDamageToBase=0;
 const order=['bash','charge','taunt','zone','bash','taunt','charge'];
 const dtMs=1000/30+0.01;
 const maxTicks=maxMinutes*60*30;
 while(!sim.ended&&sim.clock.tick<maxTicks){
  const tick=sim.clock.tick;
  // allocation: first legal point in a fixed priority order
  const p=s.heroProgression;
  if(p.skillPoints>0){const pick=['zone','bash','charge','taunt','fortitude'].find(k=>{const rank=k==='fortitude'?p.fortitude:p.ranks[k],max=upgradeRules[k].maxRank;return rank<max&&p.level>=skillLevel(k,rank+1);});if(pick)sim.send({type:'learn',requestId:`l${++req}`,skill:pick});}
  const enemies=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0);
  const foes=[...enemies,...Object.values(s.structures).filter(b=>b.team==='red'&&b.hp>0)];
  const base=s.bases['red-base'];
  // modes
  const smart=policy==='balanced'||policy==='casual',pushLevel=smart?Number(process.env.PUSH_LEVEL??7):99,pushWave=smart?Number(process.env.PUSH_WAVE??6):99;
  if(policy==='rush')mode='push';
  else if(policy==='defend')mode='defend';
  else if(smart)mode=(p.level>=pushLevel||s.spawnedWaves>=pushWave)&&s.bases['blue-base'].hp>1500?'push':'defend';
  else mode='idle';
  if(policy!=='idle'&&h.hp>0&&tick%(policy==='casual'?20:1)===0){
   let goal;
   if(mode==='push'){goal={x:base.x-130,y:base.y};const near=foes.filter(u=>dist(u,h)<400).sort((a,b)=>dist(a,h)-dist(b,h))[0];if(near)goal=near;}
   else {const threat=enemies.filter(u=>dist(u,{x:330,y:600})<650).sort((a,b)=>dist(a,h)-dist(b,h))[0];goal=threat??{x:620,y:600};}
   // Meadow: river crossing by the bridge (the legacy waypoint, unchanged). Any other battlefield: a path through its own geometry.
   let way=goal;if(sim.field.id==='meadow'){if(h.x<1060&&goal.x>1000&&Math.abs(h.y-600)>25&&h.x>820)way={x:h.x<860?860:h.x,y:600};}
   else way=pathWaypoint(sim,h,goal,pathCache);
   const d=dist(h,way),stop=goal.id?70:30;
   const mv=d>stop?{x:(way.x-h.x)/d,y:(way.y-h.y)/d}:{x:0,y:0};
   sim.send({type:'move',...mv});sim.send({type:'attack'});
   const nearest=foes.filter(u=>dist(u,h)<=240).sort((a,b)=>dist(a,h)-dist(b,h))[0];
   if(nearest&&policy!=='casual'){
    const ready=k=>p.ranks[k]>0&&sim.remaining(k)===0;
    if(ready('zone')&&enemies.filter(u=>dist(u,h)<260).length>=3&&h.hp<h.maxHp*.8){sim.send({type:'cast',requestId:`c${++req}`,skill:'zone'});}
    else if(ready('taunt')&&enemies.filter(u=>dist(u,h)<144).length>=2){sim.send({type:'cast',requestId:`c${++req}`,skill:'taunt'});}
    else if(ready('bash')&&dist(nearest,h)<=90&&nearest.kind.startsWith('minion')){sim.send({type:'cast',requestId:`c${++req}`,skill:'bash'});}
    else if(ready('charge')&&dist(nearest,h)>110){sim.send({type:'cast',requestId:`c${++req}`,skill:'charge',direction:{x:nearest.x-h.x,y:nearest.y-h.y}});}
   }
   // spend wood on towers at the base when affordable, in a fixed deterministic order
   if(policy!=='rush'&&s.wood>=80&&s.iron>=10){const spots=[[10,11],[10,13],[12,10],[12,14],[9,9],[9,15],[13,12],[11,8]];for(const [c,r] of spots){if(!sim.placementReason('tower',c,r)){sim.send({type:'place',requestId:`b${++req}`,kind:'tower',col:c,row:r});break;}}}
  }
  if(measure){const t=performance.now();sim.advance(dtMs);const d=performance.now()-t;stats.advanceMs=(stats.advanceMs??0)+d;stats.maxAdvanceMs=Math.max(stats.maxAdvanceMs??0,d);}else sim.advance(dtMs);
  for(const e of sim.drainEvents()){
   if(e.type==='cast-accepted'){stats.casts[e.skill]++;if(e.skill==='zone'&&stats.firstR===null)stats.firstR=sim.clock.tick/30;}
   if(e.type==='damage'){if(e.sourceId==='guardian')stats.dealt+=e.amount;if(e.id==='guardian')stats.taken+=e.amount;}
   if(e.type==='death'&&e.id==='guardian')stats.deaths++;
   if(e.type==='death'&&e.id.startsWith('red-tower'))stats.towersKilled++;
   if(e.type==='xp')stats.xpEvents.push({sourceId:e.sourceId,amount:e.amount,level:p.level});
   if(e.type==='wave')stats.levelAtWave[e.index]=p.level;
  }
  stats.peakUnits=Math.max(stats.peakUnits,Object.keys(s.units).length);
  if(sim.clock.tick%900===0)stats.baseTimeline.push({t:sim.clock.tick/30,blue:Math.round(s.bases['blue-base'].hp),red:Math.round(s.bases['red-base'].hp),level:p.level,units:Object.keys(s.units).length});
 }
 return {...stats,navigation:{...sim.navigation.stats},outcome:s.match.result?.outcome??'timeout',seconds:sim.clock.tick/30,level:s.heroProgression.level,xp:s.heroProgression.xp,kills:s.kills,waves:s.spawnedWaves,blueHp:Math.round(s.bases['blue-base'].hp),redHp:Math.round(s.bases['red-base'].hp),towersLeft:Object.values(s.structures).filter(b=>b.team==='red').length,builtTowers:Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length};
}
if(process.argv[1]?.endsWith('simulate-encounter.mjs')){
 const wanted=process.argv[2]?[process.argv[2]]:policies,minutes=Number(process.argv[3]??20);
 for(const policy of wanted){const t=performance.now(),r=runPolicy(policy,{maxMinutes:minutes,encounter:process.env.ENCOUNTER||'extended',battlefield:process.env.BATTLEFIELD});r.wallMsPerTick=(performance.now()-t)/(r.seconds*30);console.log(JSON.stringify({...r,xpEvents:undefined,baseTimeline:undefined,levelAtWave:r.levelAtWave}));}
}

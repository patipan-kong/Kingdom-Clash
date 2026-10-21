// Shared deterministic campaign drivers (S4, extended in S6B). Lives outside tests/*.cjs, so scripts/test.mjs never runs it as a test file.
// Players are command drivers (move, attack, target, place, learn, cast) with real movement and combat. Scripted strikes (marked "scripted")
// run inside Simulation.step and call the Simulation's own damage path directly; every damage, death, XP and mission event they cause is the
// authoritative in-match event.
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const DT=1000/30+.01,HZ=30;
function scripted(sim){
 const plan=new Map(),r=sim.rewards,expire=r.expire.bind(r);
 r.expire=t=>{expire(t);for(const f of plan.get(t)??[])f(t);};
 return (tick,f)=>plan.set(tick,[...(plan.get(tick)??[]),f]);
}
const entity=(sim,id)=>sim.state.units[id]??sim.state.structures[id]??sim.state.bases[id];
function strike(sim,sourceId,targetId,amount){const s=entity(sim,sourceId),t=entity(sim,targetId);assert.ok(s&&t,`${sourceId} -> ${targetId}`);t.protectionTick=0;sim.hit(s,t,amount??t.hp+1e6,'direct');}
function until(sim,tick,log=[],before){while(sim.clock.tick<tick&&!sim.ended){before?.(sim.clock.tick+1);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;}
const objective=(sim,id)=>sim.missionStatus().objectives.find(o=>o.id===id);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CELLS=[[12,10],[12,14],[9,9],[9,15],[13,12],[11,8]];
// Grid path (8 px, 8 neighbours) around the match's own terrain (sim.geo: river, cliffs, scenery) and structures, as a list of waypoints.
function route(sim,to){
 const G=8,st=combatStructures(sim.state),h=sim.hero,k=(x,y)=>x+','+y,sx=Math.round(h.x/G)*G,sy=Math.round(h.y/G)*G,tx=Math.round(to.x/G)*G,ty=Math.round(to.y/G)*G;
 const prev=new Map([[k(sx,sy),null]]),q=[[sx,sy]];
 for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty)break;for(const [dx,dy] of [[G,0],[-G,0],[0,G],[0,-G],[G,G],[G,-G],[-G,G],[-G,-G]]){const nx=x+dx,ny=y+dy;if(prev.has(k(nx,ny))||sim.geo.blocked(nx,ny,21,st))continue;prev.set(k(nx,ny),[x,y]);q.push([nx,ny]);}}
 assert.ok(prev.has(k(tx,ty)),`a walkable route exists to ${tx},${ty}`);
 const path=[];for(let c=[tx,ty];c;c=prev.get(k(c[0],c[1])))path.unshift({x:c[0],y:c[1]});
 return path.filter((p,i)=>i%3===0||i===path.length-1);
}
// Where the Guardian stands to strike a tower: 75 px west of it (the S4 spot) or, when another structure covers that spot (S6B: a gate tower
// beside a standing front tower), the first open point around the tower within Guardian reach, west side first.
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]];
const KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
function approach(sim,t){const st=combatStructures(sim.state),G=8;for(const [dx,dy] of t.id==='red-base'?KEEP_APPROACH:APPROACH){const x=Math.round((t.x+dx)/G)*G,y=Math.round((t.y+dy)/G)*G;if(!sim.geo.blocked(x,y,21,st))return {x:t.x+dx,y:t.y+dy};}return {x:t.x-(t.id==='red-base'?112:75),y:t.y};}
// Crimson raiders this close to the Azure Keep count as a threat (the return-home gate of S6B).
const threatened=(sim,radius=520)=>Object.values(sim.state.units).some(u=>u.team==='red'&&u.hp>0&&dist(u,{x:330,y:600})<radius);
// A player: builds up to `towers` Archer Towers, defends near the Azure Keep while gate(sim) holds, then walks to each target tower and
// attacks it from the west. Learns one rank of each skill as points arrive. Returns the event log.
// cast (S6B, optional, every 10 ticks): {charge:r} (S6D) Vanguard Charge at the nearest raider within r px (aimed at it); {bash:true} Shield Bash when a raider is within 100 px; {taunt:n} Taunt when n raiders are within 140 px.
// stop (S6B, optional): ends the run early once it returns true.
function play(sim,maxTicks,{towers=0,leash=420,hold={x:540,y:600},gate=()=>false,targets=[],park=false,cast={},stop=()=>false,log=[]}={}){
 const s=sim.state,h=sim.hero;let n=0,path=null,wi=0,goalFor=null,spot=null;
 if(park)sim.teleportHero(250,1050);
 while(!sim.ended&&sim.clock.tick<maxTicks&&!stop(sim)){
  const t=sim.clock.tick,p=s.heroProgression;
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(towers&&t%15===0&&s.wood>=80&&s.iron>=10&&Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length<towers){const c=CELLS.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)sim.send({type:'place',requestId:'p'+(++n),kind:'tower',col:c[0],row:c[1]});}
  if(!park&&h.hp>0&&t%10===0&&(cast.bash||cast.taunt||cast.charge)){
   const reds=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0);
   if(cast.bash&&p.ranks.bash&&sim.remaining('bash')===0&&reds.some(u=>dist(u,h)<100))sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
   if(cast.charge&&p.ranks.charge&&sim.remaining('charge')===0&&!s.skills.cast){const f=reds.filter(u=>dist(u,h)<cast.charge).sort((a,b)=>dist(a,h)-dist(b,h))[0];if(f){const d=dist(f,h)||1;sim.send({type:'cast',skill:'charge',requestId:'c'+(++n),direction:{x:(f.x-h.x)/d,y:(f.y-h.y)/d}});}}
   if(cast.taunt&&p.ranks.taunt&&sim.remaining('taunt')===0&&reds.filter(u=>dist(u,h)<140).length>=cast.taunt)sim.send({type:'cast',skill:'taunt',requestId:'c'+(++n)});
  }
  const next=targets.map(id=>id==='red-base'?s.bases[id]:s.structures[id]).find(x=>x&&x.hp>0);
  if(!park&&h.hp>0){
   if(!next||gate(sim)){
    const foe=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0&&dist(u,{x:330,y:600})<leash).sort((a,b)=>dist(a,h)-dist(b,h))[0],goal=foe??hold,d=dist(goal,h);
    sim.send({type:'move',...(d>(foe?70:30)?{x:(goal.x-h.x)/d,y:(goal.y-h.y)/d}:{x:0,y:0})});sim.send({type:'attack'});path=null;
   }else{
    if(goalFor!==next.id||!path){goalFor=next.id;spot=approach(sim,next);path=route(sim,spot);wi=0;}
    const goal=wi<path.length?path[wi]:spot;if(wi<path.length&&dist(h,goal)<14)wi++;
    const d=dist(goal,h),k=Math.min(1,d/(280/HZ))/(d||1);
    sim.send({type:'target',id:next.id});sim.send({type:'attack'});sim.send({type:'move',...(d>1?{x:(goal.x-h.x)*k,y:(goal.y-h.y)*k}:{x:0,y:0})});
   }
  }
  if(h.hp<=0)path=null;
  sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});
 }
 return log;
}
const standing=sim=>Object.values(sim.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower'&&sim.clock.tick>=b.completeTick).length;
const finalHash=(sim,log)=>createHash('sha256').update(JSON.stringify(log)).update(JSON.stringify(sim.state)).digest('hex');
module.exports={DT,HZ,scripted,entity,strike,until,objective,dist,CELLS,route,threatened,play,standing,finalHash};

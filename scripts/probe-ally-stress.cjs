// Chapter 5 Phase 0 stress probe (docs/CHAPTER5_ALLY_PROBE.md): simulation cost with 3 Allied Heroes + an Azure War Cart + an Azure Ballista + Barracks soldiers + live waves, against the same match without them.
// Build the test bundle first: node scripts/test.mjs ally-probe.cjs   Then: node scripts/probe-ally-stress.cjs [seconds=360]
// Deterministic: each configuration runs twice and must end in the same state hash. Timings are this machine's Node, one core; the browser adds rendering on top (see the ?allyTest launch).
const {createHash}=require('node:crypto');
const {level,strong,fund,allies,watcher,walker,run,ally,azureCart,azureBallista,openSpot,dist}=require('../tests/support/allyBot.cjs');
const seconds=Number(process.argv[2]??360);
// The Guardian (kept alive: navigation load, not balance) walks to the front and fights there with auto-attack on; Barracks fill their pads.
const FRONT={34:{x:900,y:600},36:{x:1000,y:330}},PADS={34:[{col:10,row:14}],36:[{col:10,row:14}]},ATTACK={34:'c4-fwd-north',36:'c6-north-a'},DEFEND={34:{x:700,y:600},36:{x:720,y:600}};
// mode: none (the Chapter 4 match), real (Knights, cart and Ballista with their stats), held (the same with 1e6 HP: the worst case lasts the whole run).
function play(n,mode){const withAllies=mode!=='none';
 const sim=level(n);fund(sim);const keep=sim.state.bases['blue-base'];keep.hp=keep.maxHp=1e6; // the match must last the whole run (an invulnerable Keep would leave Crimson no route)
 for(const [i,p] of PADS[n].entries())sim.send({type:'place',requestId:`stress-${i}`,kind:'barracks',col:p.col,row:p.row});
 const ids=[];
 if(withAllies){
  ids.push(ally(sim,sim.hero.x-60,sim.hero.y),ally(sim,sim.hero.x-60,sim.hero.y-60),ally(sim,sim.hero.x-60,sim.hero.y+60));
  sim.orderAlly(ids[1],{type:'attack',targetId:ATTACK[n]});sim.orderAlly(ids[2],{type:'defend',...DEFEND[n]});
  const cart=azureCart(sim,sim.hero.x-100,sim.hero.y),bal=azureBallista(sim,456,456);
  if(mode==='held')for(const u of [...ids.map(id=>sim.state.units[id]),sim.state.units[cart],sim.state.structures[bal]])strong(u);
 }
 const w=watcher(sim),step=walker(sim,FRONT[n]),times=[];let done=false,peak=0,blue=0,red=0;
 const log=[],start=process.hrtime.bigint();
 const end=seconds*30;
 while(sim.clock.tick<end&&!sim.ended){
  if(sim.hero.hp>0&&sim.hero.maxHp<1e6)strong(sim.hero);
  if(!done)done=step();sim.send({type:'attack'});
  const t0=process.hrtime.bigint();run(sim,1,undefined,log);times.push(Number(process.hrtime.bigint()-t0)/1e6);
  w.tick();
  const alive=Object.values(sim.state.units).filter(u=>u.hp>0);peak=Math.max(peak,alive.length);blue=Math.max(blue,alive.filter(u=>u.team==='blue').length);red=Math.max(red,alive.filter(u=>u.team==='red').length);
 }
 const wall=Number(process.hrtime.bigint()-start)/1e6;
 times.sort((a,b)=>a-b);const q=p=>+times[Math.min(times.length-1,Math.floor(times.length*p))].toFixed(3);
 const nav=sim.navigation.stats,deaths=ids.filter(id=>log.some(e=>e.type==='death'&&e.id===id)).length;
 const hash=createHash('sha256').update(JSON.stringify(log)).update(JSON.stringify(sim.state)).digest('hex').slice(0,16);
 return {level:n,mode,ticks:sim.clock.tick,outcome:sim.outcome?.outcome??'running',peakUnits:peak,peakBlue:blue,peakRed:red,
  msPerTick:{avg:+(times.reduce((a,b)=>a+b,0)/times.length).toFixed(3),p50:q(.5),p95:q(.95),p99:q(.99),max:+times[times.length-1].toFixed(2)},budgetShareAvg:+((times.reduce((a,b)=>a+b,0)/times.length)/(1000/30)*100).toFixed(1)+'%',
  wallSeconds:+(wall/1000).toFixed(1),nav:{plans:nav.plans,maxPlansPerTick:nav.maxPlansPerTick,maxExpandedPerPlan:nav.maxExpandedPerPlan,expanded:nav.expanded},
  allyStalls:w.stalls,allyStallEpisodes:w.episodes.slice(0,5),giveUps:w.giveUps,giveUpLog:w.giveUpLog.slice(0,6),allyDeaths:deaths,cart:!!sim.state.units['blue-c-probe'],ballista:!!sim.state.structures['probe-ballista'],hash};
}
for(const n of [34,36])for(const mode of ['none','real','held']){
 const a=play(n,mode),b=play(n,mode);
 console.log(JSON.stringify({...a,reproducible:a.hash===b.hash}));
}

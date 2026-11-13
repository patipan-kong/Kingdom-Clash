// Chapter 5 M3 "The Divided Road" bot (docs/CHAPTER5_M3.md). A deterministic player that plays the production level (campaign-43) through commands only: the Tavern, up to two Azure Barracks, two Allied Heroes and the Guardian on two roads.
// Plans: none | no-barracks (heroes and towers) | concentrate-south | concentrate-north | split (a hero takes the Rim alone) | split-keep (a hero Defends the Azure Keep). Results are bot behaviour, not human-playtest outcomes.
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {mercenary,reviveCost}=require('../../.test-build/data/mercenaries.js');
const {watcher,allies}=require('./allyBot.cjs');
const {route,dist,DT,HZ}=require('./campaignBot.cjs');
const KEEP={x:330,y:600},HOME_TOWERS=[[14,12],[14,11],[14,13],[13,10],[13,14]],ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]];
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
const HOLD={x:520,y:600};
// order: which camp the Guardian takes first; heroes: merc plus its job. jobs: follow | defend-keep | rim (take and hold the Rim alone)
const PLANS={
 none:{order:['basin','rim'],heroes:[],barracks:false},
 'no-barracks':{order:['basin','rim'],heroes:[{merc:'roland',job:'follow'},{merc:'borin',job:'follow'}],barracks:false},
 'concentrate-south':{order:['basin','rim'],heroes:[{merc:'roland',job:'follow'},{merc:'borin',job:'follow'}],barracks:true},
 'concentrate-north':{order:['rim','basin'],heroes:[{merc:'roland',job:'follow'},{merc:'borin',job:'follow'}],barracks:true},
 split:{order:['basin','rim'],heroes:[{merc:'roland',job:'follow'},{merc:'borin',job:'rim'}],barracks:true},
 'split-keep':{order:['rim','basin'],heroes:[{merc:'roland',job:'follow'},{merc:'borin',job:'defend-keep'}],barracks:true},
};
function run(o={}){
 o={plan:'concentrate-south',homeTowers:1,forward:1,repair:true,recall:420,cap:900,startAt:0,waitHires:true,forwardBarracks:false,...o};
 const P=PLANS[o.plan],setup=campaign.setup(43);if(o.mod)o.mod(setup);const sim=new Simulation('c5m3',setup,o.seed),s=sim.state,h=sim.hero,camps=sim.setup.posts;
 const camp=id=>camps.find(c=>c.id===id),stateOf=id=>s.posts.find(p=>p.id===id),plan=o.heroes??P.heroes;
 const log=[],m={captures:{},losses:[],failed:0,repairs:0,hires:[],tavernAt:null,tavernDone:null,revives:0,keepMin:s.bases['blue-base'].hp,barracksBuilt:[],barracksLost:0,peakLive:0,peakRed:0,peakFoot:0,peakAt:0,bought:[]};
 const watch=watcher(sim);let n=0,firstCapture=null,keepFirst=null,secondCapture=null;
 const live=()=>Object.values(s.units).filter(u=>u.hp>0),red=()=>live().filter(u=>u.team==='red');
 let path=null,pathKey='',pathAt=0,wi=0;
 const goTo=(goal,stopAt=8)=>{const key=Math.round(goal.x/24)+','+Math.round(goal.y/24),t=sim.clock.tick;
  if(key!==pathKey||t>=pathAt){try{path=route(sim,goal);}catch{path=[goal];}pathKey=key;pathAt=t+45;wi=0;}
  while(wi<path.length-1&&dist(h,path[wi])<14)wi++;const aim=path[Math.min(wi,path.length-1)]??goal,d=dist(aim,h),final=wi>=path.length-1;
  sim.send({type:'move',...(d>(final?stopAt:1)?{x:(aim.x-h.x)/d*Math.min(1,d/(280/HZ)),y:(aim.y-h.y)/d*Math.min(1,d/(280/HZ))}:{x:0,y:0})});};
 const approach=t=>{const st=combatStructures(s);for(const [dx,dy] of t.id==='red-base'?KEEP_APPROACH:APPROACH){const p={x:t.x+dx,y:t.y+dy};if(!sim.geo.blocked(Math.round(p.x/8)*8,Math.round(p.y/8)*8,21,st))return p;}return {x:t.x-75,y:t.y};};
 const fight=(foe,stop=60)=>{sim.send({type:'target',id:foe.id});(sim.state.autoAttack=true);goTo(foe,stop);};
 const alive=id=>{const x=s.structures[id];return !!x&&x.hp>0;};
 const place=(c,r,kind='tower')=>{if(sim.placementReason(kind,c,r)==='')sim.send({type:'place',requestId:'p'+(++n),kind,col:c,row:r});};
 const towersAt=cells=>cells.filter(([c,r])=>Object.values(s.structures).some(b=>b.team==='blue'&&b.kind==='tower'&&b.col===c&&b.row===r&&b.hp>0)).length;
 const circleOf=c=>{const out=[];for(let a=0;a<50;a++)for(let b=0;b<24;b++){const x=(a+.5)*48,y=(b+.5)*48;if(Math.hypot(x-c.circle.x,y-c.circle.y)<=c.circle.radius&&!(a===c.ruin.col&&b===c.ruin.row)&&!(Math.abs(x-c.flag.x)<48&&Math.abs(y-c.flag.y)<48))out.push([a,b]);}return out.sort((p,q)=>Math.hypot((p[0]+.5)*48-c.flag.x,(p[1]+.5)*48-c.flag.y)-Math.hypot((q[0]+.5)*48-c.flag.x,(q[1]+.5)*48-c.flag.y));};
 const circles=Object.fromEntries(camps.map(c=>[c.id,circleOf(c)]));
 const tavern=()=>Object.values(s.structures).find(b=>b.tavern&&b.hp>0),slots=()=>s.tavern?.slots??[];
 const barracks=()=>Object.values(s.structures).filter(b=>b.azureBarracks&&b.hp>0);
 const tavernCell=()=>{let best=null;for(let r=0;r<24;r++)for(let c=0;c<24;c++){if(sim.placementReason('tavern',c,r))continue;const d=Math.hypot((c+.5)*48-460,(r+.5)*48-600);if(!best||d<best.d)best={c,r,d};}return best;};
 const order=(u,ord)=>{const cur=u.ally.order,same=cur.type===ord.type&&(ord.type==='attack'?cur.targetId===ord.targetId:ord.type==='defend'?cur.x===ord.x&&cur.y===ord.y:true);if(!same)sim.send({type:'ally',requestId:'o'+(++n),id:u.id,order:ord});};
 const seenBarracks=new Set();
 const end=o.cap*HZ;
 while(!sim.ended&&sim.clock.tick<end){
  const t=sim.clock.tick,p=s.heroProgression,owned=id=>stateOf(id).owner==='azure',holdersDead=c=>c.holders.every(id=>!alive(id));
  const hired=slots().length>=plan.length&&!slots().some(x=>x.status!=='alive');
  // ---- spending: Tavern, first Barracks, hires and Revives, a home tower, the second Barracks, repairs, one forward tower per camp
  if(t%15===0){
   if(plan.length&&!tavern()&&m.tavernAt===null){const c=tavernCell();if(c){sim.send({type:'place',requestId:'tv'+(++n),kind:'tavern',col:c.c,row:c.r});m.tavernAt=t;}}
   else if(plan.length&&tavern()&&tavern().progress>=1&&m.tavernDone===null)m.tavernDone=t;
   let spent=false;
   if(P.barracks&&barracks().length===0&&!m.barracksBuilt.length&&(!plan.length||m.tavernAt!==null)){const pad=sim.azurePads.find(q=>sim.placementReason('barracks',q.col,q.row)==='');if(pad){sim.send({type:'place',requestId:'bk'+(++n),kind:'barracks',col:pad.col,row:pad.row});m.barracksBuilt.push({at:Math.round(t/HZ),pad:`${pad.col},${pad.row}`});}}
   if(plan.length&&m.tavernDone!==null&&tavern()&&tavern().progress>=1){
    const dead=slots().findIndex(x=>x.status==='dead');
    if(dead>=0){if(s.gold>=reviveCost(mercenary(slots()[dead].merc)).gold){sim.send({type:'tavern',requestId:'r'+(++n),action:'revive',slot:dead});m.revives++;}}
    else{const next=plan.find(q=>!slots().some(x=>x.merc===q.merc));if(next&&s.gold>=mercenary(next.merc).gold)sim.send({type:'tavern',requestId:'h'+(++n),action:'hire',merc:next.merc});}
   }
   if(towersAt(HOME_TOWERS)<o.homeTowers&&(!plan.length||m.tavernAt!==null)&&(!P.barracks||m.barracksBuilt.length)){const c=HOME_TOWERS.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c){place(...c);spent=true;}}
   if(!spent){
    // the second Barracks: on a forward pad if that plan holds a camp, otherwise on a home pad
    if(P.barracks&&m.barracksBuilt.length===1&&barracks().length<2&&towersAt(HOME_TOWERS)>=o.homeTowers){
     const fwd=o.forwardBarracks?sim.azurePads.find(q=>(q.col===23&&q.row===6||q.col===21&&q.row===20)&&sim.placementReason('barracks',q.col,q.row)===''):undefined;
     const pad=fwd??(o.forwardBarracks?undefined:sim.azurePads.find(q=>sim.placementReason('barracks',q.col,q.row)===''));
     if(pad){sim.send({type:'place',requestId:'bk'+(++n),kind:'barracks',col:pad.col,row:pad.row});m.barracksBuilt.push({at:Math.round(t/HZ),pad:`${pad.col},${pad.row}`});}
    }
    for(const c of camps){
     if(!owned(c.id))continue;
     const ruin=c.ruin,ruinFree=!Object.values(s.structures).some(b=>b.col===ruin.col&&b.row===ruin.row&&b.hp>0);
     if(o.repair&&ruinFree){if(sim.placementReason('tower',ruin.col,ruin.row)===''){sim.send({type:'place',requestId:'repair'+(++n),kind:'tower',col:ruin.col,row:ruin.row});m.repairs++;break;}}
     else if(towersAt(circles[c.id])<o.forward){const cell=circles[c.id].find(([a,b])=>sim.placementReason('tower',a,b)==='');if(cell){place(...cell);break;}}
    }
   }
  }
  // ---- the Guardian's next camp
  const next=P.order.map(camp).find(c=>!owned(c.id));
  const homeFoe=red().filter(u=>dist(u,KEEP)<o.recall).sort((a,b)=>dist(a,h)-dist(b,h))[0];
  const go=t>=o.startAt&&!(o.waitHires&&slots().length<plan.length);
  const assaultT=['c5-yard-north','c5-yard-south','red-base'].map(id=>id==='red-base'?s.bases[id]:s.structures[id]).filter(x=>x&&x.hp>0&&!x.invulnerable).sort((a,b)=>dist(a,h)-dist(b,h))[0];
  const rimC=camp('rim'),basinC=camp('basin');
  // ---- Hero Commands
  for(const u of allies(sim)){
   const job=plan.find(q=>q.merc===u.ally.merc)?.job;
   if(job==='defend-keep')order(u,{type:'defend',x:HOLD.x,y:HOLD.y});
   else if(job==='rim'&&go){
    if(!owned('rim')&&!holdersDead(rimC)){const tw=rimC.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0);order(u,tw?{type:'attack',targetId:tw.id}:{type:'follow'});}
    else order(u,{type:'defend',x:rimC.flag.x,y:rimC.flag.y});
   }
   else if(!go||job==='rim')order(u,{type:'follow'});
   else if(next&&!holdersDead(next)){const tw=next.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0);order(u,tw?{type:'attack',targetId:tw.id}:{type:'follow'});}
   else if(next)order(u,{type:'follow'});
   else if(assaultT&&dist(h,assaultT)<400)order(u,{type:'attack',targetId:assaultT.id});
   else order(u,{type:'follow'});
  }
  // ---- Guardian
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(h.hp>0){
   if(t%10===0&&p.ranks.bash&&sim.remaining('bash')===0&&red().some(u=>dist(u,h)<100))sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
   if(m.bought.length<ITEMS.length&&(!plan.length||hired)){const [id,price]=ITEMS[m.bought.length];if(s.gold>=price&&!sim.shopAccessReason()){sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:s.inventory.ownerHeroId,requestId:'b'+(++n),itemId:id});m.bought.push(id);}}
   const banner=camps.map(c=>s.structures[stateOf(c.id).bannerId]).filter(b=>b&&b.hp>0).map(b=>({b,near:red().filter(u=>dist(u,b)<240).sort((x,y)=>dist(x,h)-dist(y,h))})).find(x=>x.near.length>=2&&dist(h,x.b)<700);
   if(homeFoe&&!o.noRecall)fight(homeFoe,40);
   else if(!go){(sim.state.autoAttack=true);goTo({x:460,y:600},20);}
   else if(banner)fight(banner.near[0],40);
   else if(next){
    if(!holdersDead(next)){const tw=next.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0);sim.send({type:'target',id:tw.id});(sim.state.autoAttack=true);goTo(approach(tw));}
    else{(sim.state.autoAttack=true);goTo({x:next.flag.x,y:next.flag.y+(next.id==='rim'?48:64)},4);}
   }
   else if(assaultT){sim.send({type:'target',id:assaultT.id});(sim.state.autoAttack=true);goTo(approach(assaultT));}
   else{(sim.state.autoAttack=true);goTo({x:1128,y:600},20);}
  }
  watch.tick();
  sim.advance(DT);
  const liveN=live(),redN=liveN.filter(u=>u.team==='red').length,footN=liveN.filter(u=>u.id.startsWith('blue-s-')).length;
  if(liveN.length>m.peakLive){m.peakLive=liveN.length;m.peakAt=Math.round(sim.clock.tick/HZ);}m.peakRed=Math.max(m.peakRed,redN);m.peakFoot=Math.max(m.peakFoot,footN);
  for(const b of barracks())seenBarracks.add(b.id);
  for(const e of sim.drainEvents()){log.push({at:sim.clock.tick,...e});
   if(e.type==='post'){const sec=Math.round(sim.clock.tick/HZ);if(e.change==='captured'){(m.captures[e.camp]??=[]).push(sec);if(firstCapture===null)firstCapture=sim.clock.tick;else if(secondCapture===null&&Object.keys(m.captures).length>=2)secondCapture=sim.clock.tick;}else if(e.change==='lost')m.losses.push({sec,camp:e.camp});else if(e.change==='failed')m.failed++;}
   if(e.type==='tavern'&&e.action==='hire')m.hires.push(Math.round(sim.clock.tick/HZ));}
  const keep=s.bases['blue-base'];m.keepMin=Math.min(m.keepMin,keep.hp);if(keepFirst===null&&keep.hp<keep.maxHp)keepFirst=Math.round(sim.clock.tick/HZ);
 }
 m.barracksLost=[...seenBarracks].filter(id=>!(s.structures[id]?.hp>0)).length;
 const deaths=id=>log.filter(e=>e.type==='death'&&e.id===id).length;
 const heroFalls=log.filter(e=>e.type==='tavern'&&e.action==='fallen').length;
 const win=(e,from,len)=>from!==null&&e.at>=from&&e.at<from+len*HZ,fallsIn=from=>log.filter(e=>win(e,from,60)&&((e.type==='death'&&e.id==='guardian')||(e.type==='tavern'&&e.action==='fallen'))).length;
 return {sim,log,plan:o.plan,outcome:sim.outcome?.outcome??'timeout',sec:sim.outcome?Math.round(sim.outcome.tick/HZ):null,captures:m.captures,lost:m.losses.length,failed:m.failed,
  hires:m.hires,heroFalls,revives:m.revives,stalls:watch.stalls,giveUps:watch.giveUps,episodes:watch.episodes.slice(0,6),
  gDeaths:deaths('guardian'),keepMin:Math.round(m.keepMin),keepFirst,spikeFirst:fallsIn(firstCapture),spikeSecond:fallsIn(secondCapture),raiderKills:deaths('red-raider'),wardenKills:deaths('red-hero'),
  repairs:m.repairs,barracks:m.barracksBuilt,barracksLost:m.barracksLost,peakLive:m.peakLive,peakRed:m.peakRed,peakFoot:m.peakFoot,peakAt:m.peakAt,items:m.bought.length,kills:s.kills,level:s.heroProgression.level};
}
module.exports={run,PLANS};
if(require.main===module){const {sim,log,...r}=run(JSON.parse(process.argv[2]||'{}'));console.log(JSON.stringify(r));}

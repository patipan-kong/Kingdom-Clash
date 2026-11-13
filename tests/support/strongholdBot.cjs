// Chapter 5 M5 "The Last Stronghold" bot (docs/CHAPTER5_M5.md), brokenBot.cjs adapted to campaign-45: it also repairs the Ballista (North Outpost) and the War Cart (South Outpost) when its plan says so and leads the cart to the Fortress Gate.
// Plans: none | rush (heroes and Barracks, straight at the gate, no outposts) | no-siege | north-first | south-first | ballista-only | cart-only. Results are bot behaviour, not human-playtest outcomes.
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {mercenary,reviveCost}=require('../../.test-build/data/mercenaries.js');
const {watcher,allies}=require('./allyBot.cjs');
const {route,dist,DT,HZ}=require('./campaignBot.cjs');
const KEEP={x:330,y:600},HOME_TOWERS=[[14,12],[14,11],[14,13],[13,10],[13,14]],ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]];
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
const HOLD={x:520,y:600};
// order: which camp the Guardian takes first; heroes: merc plus its job. jobs: follow | defend-keep | north (take and hold the North Outpost alone)
const WRECK={x:984,y:936},BALLISTA=[24,5];
const two=[{merc:'roland',job:'follow'},{merc:'borin',job:'follow'}];
const PLANS={
 none:{order:['south','north'],heroes:[],barracks:false,siege:[]},
 rush:{order:[],heroes:two,barracks:true,siege:[]},
 'no-siege':{order:['south','north'],heroes:two,barracks:true,siege:[]},
 'north-first':{order:['north','south'],heroes:two,barracks:true,siege:['ballista','cart']},
 'south-first':{order:['south','north'],heroes:two,barracks:true,siege:['cart','ballista']},
 'ballista-only':{order:['north','south'],heroes:two,barracks:true,siege:['ballista']},
 'cart-only':{order:['south','north'],heroes:two,barracks:true,siege:['cart']},
};
function run(o={}){
 o={plan:'north-first',homeTowers:1,forward:1,repair:true,recall:420,cap:900,startAt:0,waitHires:true,forwardBarracks:false,...o};
 const P=PLANS[o.plan],setup=campaign.setup(45);if(o.mod)o.mod(setup);const sim=new Simulation('c5m5',setup,o.seed),s=sim.state,h=sim.hero,camps=sim.setup.posts;if(o.init)o.init(sim);const ironLog=[],commLog=[],bal={at:null,try:null,id:null,dmg:0,lost:0,builtAt:null},cartLog={repairedAt:null,gateDownAt:null,gateDmgByCart:0,cartDeaths:0,cartDmg:0};
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
   const ballistaBuilt=Object.values(s.structures).some(b=>b.ballista&&b.hp>0),bAvail=P.siege.includes('ballista')&&owned('north')&&!ballistaBuilt&&(bal.try===null||t>bal.try+200),cAvail=P.siege.includes('cart')&&!!s.cartWreck&&!sim.cartLocked&&!s.cartWreck.repair;
   // the first-listed available asset is saved for; the Ballista is bought the moment it is affordable
   if(bAvail&&sim.placementReason('ballista',BALLISTA[0],BALLISTA[1])===''){sim.send({type:'place',requestId:'bal'+(++n),kind:'ballista',col:BALLISTA[0],row:BALLISTA[1]});bal.try=t;if(bal.at===null)bal.at=Math.round(t/HZ);}
   let spent=bAvail||cAvail||(o.save&&P.siege.some(a=>a==="ballista"?!(ballistaBuilt||bal.at!==null):!cartLog.repairedAt));
   if(P.barracks&&barracks().length===0&&!m.barracksBuilt.length&&(!plan.length||m.tavernAt!==null)){const pad=sim.azurePads.find(q=>sim.placementReason('barracks',q.col,q.row)==='');if(pad){sim.send({type:'place',requestId:'bk'+(++n),kind:'barracks',col:pad.col,row:pad.row});m.barracksBuilt.push({at:Math.round(t/HZ),pad:`${pad.col},${pad.row}`});}}
   if(plan.length&&m.tavernDone!==null&&tavern()&&tavern().progress>=1){
    const dead=slots().findIndex(x=>x.status==='dead');
    if(dead>=0){if(s.gold>=reviveCost(mercenary(slots()[dead].merc)).gold){sim.send({type:'tavern',requestId:'r'+(++n),action:'revive',slot:dead});m.revives++;}}
    else{const next=plan.find(q=>!slots().some(x=>x.merc===q.merc));if(next&&s.gold>=mercenary(next.merc).gold)sim.send({type:'tavern',requestId:'h'+(++n),action:'hire',merc:next.merc});}
   }
   if(!spent&&towersAt(HOME_TOWERS)<o.homeTowers&&(!plan.length||m.tavernAt!==null)&&(!P.barracks||m.barracksBuilt.length)){const c=HOME_TOWERS.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c){place(...c);spent=true;}}
   if(!spent){
    // the second Barracks: on a forward pad if that plan holds a camp, otherwise on a home pad
    if(P.barracks&&m.barracksBuilt.length===1&&barracks().length<2&&towersAt(HOME_TOWERS)>=o.homeTowers){
     const fwd=o.forwardBarracks?sim.azurePads.find(q=>(q.col===20&&q.row===7||q.col===18&&q.row===18)&&sim.placementReason('barracks',q.col,q.row)===''):undefined;
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
  const assaultT=(()=>{const gate=s.structures['red-fortress-gate'];if(gate&&gate.hp>0)return gate;const tw=['c5-gate-north','c5-gate-south'].map(id=>s.structures[id]).filter(x=>x&&x.hp>0).sort((p,q)=>dist(p,h)-dist(q,h))[0];if(tw)return tw;const k=s.bases['red-base'];return k&&k.hp>0&&!k.invulnerable?k:undefined;})(); // the gate first (its towers stand behind the wall and see out only once it falls), then the gate towers, then the Keep
  const northC=camp('north'),southC=camp('south');
  // ---- Hero Commands
  for(const u of allies(sim)){
   const job=plan.find(q=>q.merc===u.ally.merc)?.job;
   if(job==='defend-keep')order(u,{type:'defend',x:HOLD.x,y:HOLD.y});
   else if(job==='north'&&go){
    if(!owned('north')&&!holdersDead(northC)){const tw=northC.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0);order(u,tw?{type:'attack',targetId:tw.id}:{type:'follow'});}
    else order(u,{type:'defend',x:northC.flag.x,y:northC.flag.y});
   }
   else if(!go||job==='north')order(u,{type:'follow'});
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
   else if(P.siege.includes('cart')&&s.cartWreck&&!sim.cartLocked&&!s.cartWreck.repair&&s.wood>=160&&s.iron>=40){(sim.state.autoAttack=true);goTo(WRECK,20);}
   else if(!go){(sim.state.autoAttack=true);goTo({x:460,y:600},20);}
   else if(banner)fight(banner.near[0],40);
   else if(next){
    if(!holdersDead(next)){const tw=next.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0);sim.send({type:'target',id:tw.id});(sim.state.autoAttack=true);goTo(approach(tw));}
    else{(sim.state.autoAttack=true);goTo({x:next.flag.x,y:next.flag.y+48},4);}
   }
   else if(assaultT){const cart=s.units['blue-c-1'];sim.send({type:'target',id:assaultT.id});(sim.state.autoAttack=true);if(cart&&cart.hp>0&&dist(h,cart)>200)goTo({x:cart.x,y:cart.y},60);else goTo(approach(assaultT));} // a cart moves only while the Guardian is within 300 px: wait for it
   else{(sim.state.autoAttack=true);goTo({x:1300,y:600},20);}
  }
  if(t%(30*HZ)===0)ironLog.push([t/HZ,Math.round(s.wood),Math.round(s.iron),Math.round(s.gold)]);
  watch.tick();
  sim.advance(DT);
  const liveN=live(),redN=liveN.filter(u=>u.team==='red').length,footN=liveN.filter(u=>u.id.startsWith('blue-s-')).length;
  if(liveN.length>m.peakLive){m.peakLive=liveN.length;m.peakAt=Math.round(sim.clock.tick/HZ);}m.peakRed=Math.max(m.peakRed,redN);m.peakFoot=Math.max(m.peakFoot,footN);
  for(const b of barracks())seenBarracks.add(b.id);
  for(const e of sim.drainEvents()){log.push({at:sim.clock.tick,...e});
   if(e.type==='site'&&e.id==='cart'&&e.change==='repaired'&&cartLog.repairedAt===null)cartLog.repairedAt=Math.round(sim.clock.tick/HZ);
   if(e.type==='damage'&&e.sourceId==='blue-c-1'){cartLog.cartDmg+=e.amount;if(e.id==='red-fortress-gate')cartLog.gateDmgByCart+=e.amount;}
   if(e.type==='death'&&e.id==='red-fortress-gate'&&cartLog.gateDownAt===null)cartLog.gateDownAt=Math.round(sim.clock.tick/HZ);
   if(e.type==='death'&&(e.id==='blue-c-1'||e.id==='red-cart'))cartLog.cartDeaths++;
   if(!bal.id){const b=Object.values(s.structures).find(x=>x.ballista);if(b){bal.id=b.id;bal.builtAt=Math.round(sim.clock.tick/HZ);}}
   if(bal.id&&e.type==='damage'&&e.sourceId===bal.id)bal.dmg+=e.amount;
   if(bal.id&&e.type==='death'&&e.id===bal.id){bal.lost++;bal.id=null;}
   if(e.type==='commander'&&(e.change==='warning'||e.change==='released'))commLog.push([Math.round(sim.clock.tick/HZ),e.id,e.change,e.lane]);
   if(e.type==='post'){const sec=Math.round(sim.clock.tick/HZ);if(e.change==='captured'){(m.captures[e.camp]??=[]).push(sec);if(firstCapture===null)firstCapture=sim.clock.tick;else if(secondCapture===null&&Object.keys(m.captures).length>=2)secondCapture=sim.clock.tick;}else if(e.change==='lost')m.losses.push({sec,camp:e.camp});else if(e.change==='failed')m.failed++;}
   if(e.type==='tavern'&&e.action==='hire')m.hires.push(Math.round(sim.clock.tick/HZ));}
  const keep=s.bases['blue-base'];m.keepMin=Math.min(m.keepMin,keep.hp);if(keepFirst===null&&keep.hp<keep.maxHp)keepFirst=Math.round(sim.clock.tick/HZ);
 }
 m.barracksLost=[...seenBarracks].filter(id=>!(s.structures[id]?.hp>0)).length;
 const deaths=id=>log.filter(e=>e.type==='death'&&e.id===id).length;
 const heroFalls=log.filter(e=>e.type==='tavern'&&e.action==='fallen').length;
 const win=(e,from,len)=>from!==null&&e.at>=from&&e.at<from+len*HZ,fallsIn=from=>log.filter(e=>win(e,from,60)&&((e.type==='death'&&e.id==='guardian')||(e.type==='tavern'&&e.action==='fallen'))).length;
 const sec=ev=>Math.round(ev.at/HZ),rel=id=>log.filter(e=>e.type==='commander'&&e.id===id&&e.change==='released').map(sec),die=id=>log.filter(e=>e.type==='death'&&e.id===id).map(sec);
 const mR=rel('red-marshal'),mD=die('red-marshal'),sR=rel('red-shadowblade'),sD=die('red-shadowblade');
 // a Marshal is alive at second t when its latest release is not followed by a death at or before t
 const marshalAlive=t=>{const r=mR.filter(x=>x<=t).pop();return r!==undefined&&!mD.some(d=>d>=r&&d<=t);};
 const overlap=sR.filter(marshalAlive).length,towersDown=Object.fromEntries(['c5-sally-north','c5-sally-south','c5-gate-north','c5-gate-south','c5-north-a','c5-north-b','c5-south-a','c5-south-b'].map(id=>[id,die(id)[0]??null]));
 return {sim,log,cartLog,ironLog,commLog,ballista:bal,marshalReleases:mR,marshalDeaths:mD,shadowReleases:sR,shadowDeaths:sD,overlap,towersDown,tavernAt:m.tavernAt===null?null:Math.round(m.tavernAt/HZ),plan:o.plan,outcome:sim.outcome?.outcome??'timeout',sec:sim.outcome?Math.round(sim.outcome.tick/HZ):null,captures:m.captures,lost:m.losses.length,failed:m.failed,
  hires:m.hires,heroFalls,revives:m.revives,stalls:watch.stalls,stallTicks:watch.stallTicks,giveUps:watch.giveUps,episodes:watch.episodes.slice(0,6),
  gDeaths:deaths('guardian'),keepMin:Math.round(m.keepMin),keepFirst,spikeFirst:fallsIn(firstCapture),spikeSecond:fallsIn(secondCapture),marshalKills:deaths('red-marshal'),shadowKills:deaths('red-shadowblade'),wardenKills:deaths('red-hero'),
  repairs:m.repairs,barracks:m.barracksBuilt,barracksLost:m.barracksLost,peakLive:m.peakLive,peakRed:m.peakRed,peakFoot:m.peakFoot,peakAt:m.peakAt,items:m.bought.length,kills:s.kills,level:s.heroProgression.level};
}
module.exports={run,PLANS};
if(require.main===module){const {sim,log,ironLog,commLog,...r}=run(JSON.parse(process.argv[2]||'{}'));console.log(JSON.stringify(r));}

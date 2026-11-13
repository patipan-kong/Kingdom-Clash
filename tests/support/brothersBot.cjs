// Chapter 5 M2 "Brothers in Arms" bot (docs/CHAPTER5_M2.md). A deterministic player that plays the production level (campaign-42) through commands only, with up to two Allied Heroes given a role each.
// Plans: none | balanced (Borin defends the Keep, Roland follows the Guardian) | follow2 (Roland and Borin both go with the Guardian) | defend2 (both defend the Keep). Results are bot behaviour, not human-playtest outcomes.
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {mercenary,reviveCost}=require('../../.test-build/data/mercenaries.js');
const {watcher,allies}=require('./allyBot.cjs');
const {route,dist,DT,HZ}=require('./campaignBot.cjs');
const HOME=[[14,12],[14,11],[14,13],[13,12],[13,11],[13,13]],KEEP={x:330,y:600},ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]];
const ASSAULT=['red-tower-front-north','red-tower-front-south','red-base'];
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
const PLANS={none:[],balanced:[{merc:'borin',role:'defend'},{merc:'roland',role:'follow'}],follow2:[{merc:'roland',role:'follow'},{merc:'borin',role:'follow'}],defend2:[{merc:'roland',role:'defend'},{merc:'borin',role:'defend'}]};
function run(o={}){
 o={plan:'balanced',homeTowers:1,forward:1,repair:true,recall:420,cap:900,hireAt:0,startAt:0,...o};
 const setup=campaign.setup(42);if(o.mod)o.mod(setup);const sim=new Simulation('c5m2',setup,o.seed),s=sim.state,h=sim.hero,post=sim.setup.post,[NORTH,SOUTH]=post.holders;
 const log=[],m={captures:[],losses:[],failed:0,repairs:0,forwardBuilt:0,keepMin:s.bases['blue-base'].hp,hires:[],tavernDone:null,tavernAt:null,revives:0,hireTries:0};
 const watch=watcher(sim);
 let n=0,firstCapture=null,keepFirst=null;
 const red=()=>Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0);
 let path=null,pathKey='',pathAt=0,wi=0;
 const goTo=(goal,stopAt=8)=>{const key=Math.round(goal.x/24)+','+Math.round(goal.y/24),t=sim.clock.tick;
  if(key!==pathKey||t>=pathAt){try{path=route(sim,goal);}catch{path=[goal];}pathKey=key;pathAt=t+45;wi=0;}
  while(wi<path.length-1&&dist(h,path[wi])<14)wi++;const aim=path[Math.min(wi,path.length-1)]??goal,d=dist(aim,h),final=wi>=path.length-1;
  sim.send({type:'move',...(d>(final?stopAt:1)?{x:(aim.x-h.x)/d*Math.min(1,d/(280/HZ)),y:(aim.y-h.y)/d*Math.min(1,d/(280/HZ))}:{x:0,y:0})});};
 const approach=t=>{const st=combatStructures(s);for(const [dx,dy] of t.id==='red-base'?KEEP_APPROACH:APPROACH){const p={x:t.x+dx,y:t.y+dy};if(!sim.geo.blocked(Math.round(p.x/8)*8,Math.round(p.y/8)*8,21,st))return p;}return {x:t.x-75,y:t.y};};
 const fight=(foe,stop=60)=>{sim.send({type:'target',id:foe.id});(sim.state.autoAttack=true);goTo(foe,stop);};
 const place=(c,r,kind='tower')=>{if(sim.placementReason(kind,c,r)==='')sim.send({type:'place',requestId:'p'+(++n),kind,col:c,row:r});};
 const towersAt=cells=>cells.filter(([c,r])=>Object.values(s.structures).some(b=>b.team==='blue'&&b.kind==='tower'&&b.col===c&&b.row===r&&b.hp>0)).length;
 const circle=[];for(let c=0;c<50;c++)for(let r=0;r<24;r++){const x=(c+.5)*48,y=(r+.5)*48;if(Math.hypot(x-post.circle.x,y-post.circle.y)<=post.circle.radius&&!(c===post.ruin.col&&r===post.ruin.row)&&!(Math.abs(x-post.flag.x)<48&&Math.abs(y-post.flag.y)<48))circle.push([c,r]);}
 circle.sort((a,b)=>Math.hypot((a[0]+.5)*48-post.flag.x,(a[1]+.5)*48-post.flag.y)-Math.hypot((b[0]+.5)*48-post.flag.x,(b[1]+.5)*48-post.flag.y));
 const tavernCell=()=>{let best=null;for(let r=0;r<24;r++)for(let c=0;c<24;c++){if(sim.placementReason('tavern',c,r))continue;const d=Math.hypot((c+.5)*48-460,(r+.5)*48-600);if(!best||d<best.d)best={c,r,d};}return best;};
 const plan=o.heroes??PLANS[o.plan],DEFEND={x:520,y:600};
 const tavern=()=>Object.values(s.structures).find(b=>b.tavern&&b.hp>0),slots=()=>s.tavern?.slots??[];
 const alive=id=>{const x=s.structures[id];return !!x&&x.hp>0;};
 const order=(u,ord)=>{const cur=u.ally.order,same=cur.type===ord.type&&(ord.type==='attack'?cur.targetId===ord.targetId:ord.type==='defend'?cur.x===ord.x&&cur.y===ord.y:true);if(!same)sim.send({type:'ally',requestId:'o'+(++n),id:u.id,order:ord});};
 const end=o.cap*HZ;
 while(!sim.ended&&sim.clock.tick<end){
  const t=sim.clock.tick,p=s.heroProgression,owned=s.post.owner==='azure',bannerId=s.post.bannerId;
  const holdersDead=post.holders.every(id=>!alive(id));
  const hired=slots().length>=plan.length&&!slots().some(x=>x.status!=='alive');
  // ---- spending: the Tavern, then the hires (and Revives) before anything else, a home tower, the repair, one tower in the camp
  if(t%15===0){
   if(plan.length&&!tavern()&&m.tavernAt===null&&t>=o.hireAt){const c=tavernCell();if(c){sim.send({type:'place',requestId:'tv'+(++n),kind:'tavern',col:c.c,row:c.r});m.tavernAt=t;}}
   else if(plan.length&&tavern()&&tavern().progress>=1&&m.tavernDone===null)m.tavernDone=t;
   if(plan.length&&m.tavernDone!==null&&tavern()&&tavern().progress>=1){
    const dead=slots().findIndex(x=>x.status==='dead');
    if(dead>=0){if(s.gold>=reviveCost(mercenary(slots()[dead].merc)).gold){sim.send({type:'tavern',requestId:'r'+(++n),action:'revive',slot:dead});m.revives++;}}
    else{const next=plan.find(q=>!slots().some(x=>x.merc===q.merc));if(next&&s.gold>=mercenary(next.merc).gold){sim.send({type:'tavern',requestId:'h'+(++n),action:'hire',merc:next.merc});m.hireTries++;}}
   }
   if(towersAt(HOME)<o.homeTowers&&(!plan.length||m.tavernAt!==null)){const c=HOME.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)place(...c);}
   else if(owned){
    const ruin=post.ruin,ruinFree=!Object.values(s.structures).some(b=>b.col===ruin.col&&b.row===ruin.row&&b.hp>0);
    if(o.repair&&ruinFree){if(sim.placementReason('tower',ruin.col,ruin.row)===''){sim.send({type:'place',requestId:'repair'+(++n),kind:'tower',col:ruin.col,row:ruin.row});m.repairs++;}}
    else if(towersAt(circle)<o.forward){const c=circle.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c){place(...c);m.forwardBuilt++;}}
   }
  }
  // ---- Hero Commands: a defender holds the road in front of the Azure Keep; a follower goes where the Guardian goes
  const southT=alive(SOUTH)?s.structures[SOUTH]:null,northT=alive(NORTH)?s.structures[NORTH]:null;
  const assaultT=ASSAULT.map(id=>id==='red-base'?s.bases[id]:s.structures[id]).find(x=>x&&x.hp>0&&!x.invulnerable);
  const go=t>=o.startAt&&!(o.waitHires&&slots().length<plan.length);
  for(const u of allies(sim)){
   const role=plan.find(q=>q.merc===u.ally.merc)?.role;
   if(role==='defend')order(u,{type:'defend',x:DEFEND.x,y:DEFEND.y});
   else if(!go)order(u,{type:'follow'});
   else if(!holdersDead&&southT)order(u,{type:'attack',targetId:southT.id});
   else if(!holdersDead&&northT)order(u,{type:'attack',targetId:northT.id});
   else if(!owned)order(u,{type:'follow'});
   else if(assaultT&&dist(h,assaultT)<400)order(u,{type:'attack',targetId:assaultT.id});
   else order(u,{type:'follow'});
  }
  // ---- Guardian
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(h.hp>0){
   if(t%10===0&&p.ranks.bash&&sim.remaining('bash')===0&&red().some(u=>dist(u,h)<100))sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
   const bought=m.bought??=[];if(bought.length<ITEMS.length&&(!plan.length||hired)){const [id,price]=ITEMS[bought.length];if(s.gold>=price&&!sim.shopAccessReason()){sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:s.inventory.ownerHeroId,requestId:'b'+(++n),itemId:id});bought.push(id);}}
   const homeFoe=red().filter(u=>dist(u,KEEP)<o.recall).sort((a,b)=>dist(a,h)-dist(b,h))[0];
   const banner=bannerId&&s.structures[bannerId],near=banner&&red().filter(u=>dist(u,banner)<240).sort((a,b)=>dist(a,h)-dist(b,h));
   if(homeFoe&&!o.noRecall)fight(homeFoe,40);
   else if(!go){(sim.state.autoAttack=true);goTo({x:460,y:600},20);} // the human plan: stay home until every hero is hired and the player is ready (startAt)
   else if(banner&&near.length&&(near.length>=2||!owned))fight(near[0],40);
   else if(!holdersDead){const own=(alive(NORTH)?s.structures[NORTH]:null)||post.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0);sim.send({type:'target',id:own.id});(sim.state.autoAttack=true);goTo(approach(own));}
   else if(!owned){(sim.state.autoAttack=true);goTo({x:post.flag.x,y:post.flag.y+64},4);}
   else if(assaultT){sim.send({type:'target',id:assaultT.id});(sim.state.autoAttack=true);goTo(approach(assaultT));}
   else{(sim.state.autoAttack=true);goTo({x:1128,y:600},20);}
  }
  watch.tick();
  sim.advance(DT);
  for(const e of sim.drainEvents()){log.push({at:sim.clock.tick,...e});
   if(e.type==='post'){const sec=Math.round(sim.clock.tick/HZ);if(e.change==='captured'){m.captures.push(sec);firstCapture??=sim.clock.tick;}else if(e.change==='lost')m.losses.push(sec);else if(e.change==='failed')m.failed++;}
   if(e.type==='tavern'&&e.action==='hire')m.hires.push(Math.round(sim.clock.tick/HZ));}
  const keep=s.bases['blue-base'];m.keepMin=Math.min(m.keepMin,keep.hp);if(keepFirst===null&&keep.hp<keep.maxHp)keepFirst=Math.round(sim.clock.tick/HZ);
 }
 const deaths=id=>log.filter(e=>e.type==='death'&&e.id===id).length;
 const heroFalls=log.filter(e=>e.type==='tavern'&&e.action==='fallen').length;
 const win=(e,from,len)=>from!==null&&e.at>=from&&e.at<from+len*HZ,spike=log.filter(e=>win(e,firstCapture,60)&&((e.type==='death'&&e.id==='guardian')||(e.type==='tavern'&&e.action==='fallen'))).length; // Guardian deaths and Hero falls in the 60 s after the first capture (the Warden, the Raider and the Elites arrive)
 return {sim,log,plan:o.plan,outcome:sim.outcome?.outcome??'timeout',sec:sim.outcome?Math.round(sim.outcome.tick/HZ):null,capture:m.captures,lost:m.losses,failed:m.failed,
  hires:m.hires,tavernBuilt:m.tavernDone===null?null:Math.round(m.tavernDone/HZ),heroFalls,revives:m.revives,stalls:watch.stalls,giveUps:watch.giveUps,episodes:watch.episodes.slice(0,6),giveUpLog:watch.giveUpLog.slice(0,6),
  gDeaths:deaths('guardian'),keepMin:Math.round(m.keepMin),keepFirst,spike,raiderKills:deaths('red-raider'),wardenKills:deaths('red-hero'),repairs:m.repairs,items:(m.bought||[]).length,gold:s.gold,kills:s.kills,level:s.heroProgression.level};
}
module.exports={run};
if(require.main===module){const {sim,log,...r}=run(JSON.parse(process.argv[2]||'{}'));console.log(JSON.stringify(r));}

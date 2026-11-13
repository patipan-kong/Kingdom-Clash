// Chapter 5 M1 "The Old Tavern" regression bot (docs/CHAPTER5_M1.md). A deterministic player that plays the production level (campaign-41) through commands only: the Tavern, the hire, the Hero Commands, the Banner, the repair, the Barracks and the assault are the engine's.
// Plans: hero none | roland | borin | kael; split (the Guardian takes the north watchtower, the Hero the south one) or together. Results are bot behaviour, not human-playtest outcomes; they guard against regressions, not for balance sign-off.
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {mercenary,reviveCost}=require('../../.test-build/data/mercenaries.js');
const {watcher,allies}=require('./allyBot.cjs');
const {route,dist,DT,HZ}=require('./campaignBot.cjs');
const HOME=[[14,12],[14,11],[14,13],[13,12],[13,11],[13,13]],KEEP={x:330,y:600},ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]];
const ASSAULT=['red-tower-front-north','red-tower-front-south','red-base'];
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
function run(o={}){
 o={hero:'none',split:true,homeTowers:1,forward:1,barracks:true,repair:true,defendBanner:true,recall:420,cap:900,heroCaptures:false,hireAt:0,waitForHero:false,...o};
 const setup=campaign.setup(41);if(o.keepHp)setup.crimsonKeepHp=o.keepHp;const sim=new Simulation('c5m1',setup,o.seed),s=sim.state,h=sim.hero,post=sim.setup.post,[NORTH,SOUTH]=post.holders;
 const log=[],m={captures:[],losses:[],failed:0,repairs:0,forwardBuilt:0,keepMin:s.bases['blue-base'].hp,hired:null,tavernDone:null,tavernAt:null,revives:0,hireTries:0};
 const watch=watcher(sim);
 let n=0,firstCapture=null,heroTarget='';
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
 const circle=[];for(let c=0;c<50;c++)for(let r=0;r<24;r++){const x=(c+.5)*48,y=(r+.5)*48;if(Math.hypot(x-post.circle.x,y-post.circle.y)<=post.circle.radius&&!(c===post.ruin.col&&r===post.ruin.row)&&!(Math.abs(x-post.flag.x)<48&&Math.abs(y-post.flag.y)<48)&&!sim.azurePads.some(p=>p.col===c&&p.row===r))circle.push([c,r]);}
 circle.sort((a,b)=>Math.hypot((a[0]+.5)*48-post.flag.x,(a[1]+.5)*48-post.flag.y)-Math.hypot((b[0]+.5)*48-post.flag.x,(b[1]+.5)*48-post.flag.y));
 const tavernCell=()=>{let best=null;for(let r=0;r<24;r++)for(let c=0;c<24;c++){if(sim.placementReason('tavern',c,r))continue;const d=Math.hypot((c+.5)*48-460,(r+.5)*48-600);if(!best||d<best.d)best={c,r,d};}return best;};
 const forwardIds=()=>Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower'&&b.hp>0&&Math.hypot(b.x-post.circle.x,b.y-post.circle.y)<=post.circle.radius+1).map(b=>b.id);
 const tavern=()=>Object.values(s.structures).find(b=>b.tavern&&b.hp>0),slot=()=>s.tavern?.slots[0],heroUnit=()=>allies(sim)[0];
 const alive=id=>{const x=s.structures[id];return !!x&&x.hp>0;};
 const order=(id,ord)=>{const u=heroUnit();if(!u)return;const cur=u.ally.order,same=cur.type===ord.type&&(ord.type==='attack'?cur.targetId===ord.targetId:ord.type==='defend'?cur.x===ord.x&&cur.y===ord.y:true);if(!same)sim.send({type:'ally',requestId:'o'+(++n),id:u.id,order:ord});};
 const end=o.cap*HZ;
 while(!sim.ended&&sim.clock.tick<end){
  const t=sim.clock.tick,p=s.heroProgression,owned=s.post.owner==='azure',bannerId=s.post.bannerId;
  const holdersDead=post.holders.every(id=>!alive(id));
  // ---- spending: the Tavern first, then the hire, then a home tower, the repair, the forward Barracks and tower
  if(t%15===0){
   if(o.hero!=='none'&&!tavern()&&m.tavernAt===null&&t>=o.hireAt){const c=tavernCell();if(c){sim.send({type:'place',requestId:'tv'+(++n),kind:'tavern',col:c.c,row:c.r});m.tavernAt=t;}}
   else if(o.hero!=='none'&&tavern()&&tavern().progress>=1&&m.tavernDone===null)m.tavernDone=t;
   if(o.hero!=='none'&&m.tavernDone!==null&&tavern()&&tavern().progress>=1){
    const sl=slot(),mc=mercenary(o.hero);
    if(!sl&&s.gold>=mc.gold){sim.send({type:'tavern',requestId:'h'+(++n),action:'hire',merc:o.hero});m.hireTries++;}
    else if(sl&&sl.status==='dead'&&s.gold>=reviveCost(mc).gold){sim.send({type:'tavern',requestId:'r'+(++n),action:'revive',slot:0});m.revives++;}
   }
   const heroOk=o.hero==='none'||!!slot(); // the hire comes before any other spending
   if(towersAt(HOME)<o.homeTowers&&(o.hero==='none'||m.tavernAt!==null)){const c=HOME.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)place(...c);}
   else if(owned){
    const ruin=post.ruin,ruinFree=!Object.values(s.structures).some(b=>b.col===ruin.col&&b.row===ruin.row&&b.hp>0);
    if(o.barracks&&heroOk&&!Object.values(s.structures).some(b=>b.azureBarracks&&b.hp>0)&&sim.azurePads.some(q=>sim.placementReason('barracks',q.col,q.row)==='')){const q=sim.azurePads.find(q=>sim.placementReason('barracks',q.col,q.row)==='');sim.send({type:'place',requestId:'bk'+(++n),kind:'barracks',col:q.col,row:q.row});m.barracks=(m.barracks||0)+1;}
    else if(o.repair&&ruinFree){if(sim.placementReason('tower',ruin.col,ruin.row)===''){sim.send({type:'place',requestId:'repair'+(++n),kind:'tower',col:ruin.col,row:ruin.row});m.repairs++;}}
    else if(towersAt(circle)<o.forward){const c=circle.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c){place(...c);m.forwardBuilt++;}}
   }
  }
  // ---- Hero Commands (the Allied Hero acts on what the Guardian does)
  if(heroUnit()){
   const southT=alive(SOUTH)?s.structures[SOUTH]:null,northT=alive(NORTH)?s.structures[NORTH]:null;
   const assaultT=ASSAULT.map(id=>id==='red-base'?s.bases[id]:s.structures[id]).find(x=>x&&x.hp>0&&!x.invulnerable);
   if(!holdersDead&&o.split&&southT)order(0,{type:'attack',targetId:southT.id});
   else if(!holdersDead&&northT)order(0,{type:'attack',targetId:northT.id});
   else if(!owned&&o.heroCaptures)order(0,{type:'defend',x:post.flag.x,y:post.flag.y+48});
   else if(!owned)order(0,{type:'follow'});
   else if(assaultT&&dist(h,assaultT)<400&&heroUnit())order(0,{type:'attack',targetId:assaultT.id});
   else order(0,{type:'follow'});
  }
  // ---- Guardian
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(h.hp>0){
   if(t%10===0&&p.ranks.bash&&sim.remaining('bash')===0&&red().some(u=>dist(u,h)<100))sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
   const bought=m.bought??=[];if(bought.length<ITEMS.length&&(o.hero==='none'||(slot()&&slot().status==='alive')||m.revives>0)){const [id,price]=ITEMS[bought.length];if(s.gold>=price&&!sim.shopAccessReason()){sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:s.inventory.ownerHeroId,requestId:'b'+(++n),itemId:id});bought.push(id);}}
   const homeFoe=red().filter(u=>dist(u,KEEP)<o.recall).sort((a,b)=>dist(a,h)-dist(b,h))[0];
   const banner=bannerId&&s.structures[bannerId],near=banner&&red().filter(u=>dist(u,banner)<240).sort((a,b)=>dist(a,h)-dist(b,h));
   if(homeFoe)fight(homeFoe,40);
   else if(o.waitForHero&&o.hero!=='none'&&!slot()){(sim.state.autoAttack=true);goTo({x:460,y:600},20);} // the human plan: wait at home for the hire
   else if(banner&&o.defendBanner&&near.length&&(near.length>=2||!owned))fight(near[0],40);
   else if(!holdersDead){const own=!heroUnit()||!o.split?post.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0):(northT=>northT||post.holders.map(id=>s.structures[id]).find(x=>x&&x.hp>0))(alive(NORTH)?s.structures[NORTH]:null);sim.send({type:'target',id:own.id});(sim.state.autoAttack=true);goTo(approach(own));}
   else if(!owned){(sim.state.autoAttack=true);goTo({x:post.flag.x,y:post.flag.y+64},4);}
   else{const tgt=ASSAULT.map(id=>id==='red-base'?s.bases[id]:s.structures[id]).find(x=>x&&x.hp>0&&!x.invulnerable);
    if(tgt){sim.send({type:'target',id:tgt.id});(sim.state.autoAttack=true);goTo(approach(tgt));}else{(sim.state.autoAttack=true);goTo({x:1128,y:600},20);}}
  }
  watch.tick();
  sim.advance(DT);
  for(const e of sim.drainEvents()){log.push({at:sim.clock.tick,...e});
   if(e.type==='post'){const sec=Math.round(sim.clock.tick/HZ);if(e.change==='captured'){m.captures.push(sec);firstCapture??=sim.clock.tick;}else if(e.change==='lost')m.losses.push(sec);else if(e.change==='failed')m.failed++;}
   if(e.type==='tavern'&&e.action==='hire'&&m.hired===null)m.hired=Math.round(sim.clock.tick/HZ);}
  m.keepMin=Math.min(m.keepMin,s.bases['blue-base'].hp);
 }
 const deaths=id=>log.filter(e=>e.type==='death'&&e.id===id).length;
 const heroFalls=log.filter(e=>e.type==='tavern'&&e.action==='fallen').length;
 return {sim,log,hero:o.hero,split:o.split,outcome:sim.outcome?.outcome??'timeout',sec:sim.outcome?Math.round(sim.outcome.tick/HZ):null,capture:m.captures,lost:m.losses,failed:m.failed,
  hired:m.hired,tavernBuilt:m.tavernDone===null?null:Math.round(m.tavernDone/HZ),heroFalls,revives:m.revives,stalls:watch.stalls,giveUps:watch.giveUps,
  gDeaths:deaths('guardian'),keepMin:Math.round(m.keepMin),repairs:m.repairs,barracks:m.barracks||0,forward:m.forwardBuilt,items:(m.bought||[]).length,gold:s.gold,kills:s.kills,level:s.heroProgression.level};
}
module.exports={run};
if(require.main===module){const {sim,log,...r}=run(JSON.parse(process.argv[2]||'{}'));console.log(JSON.stringify(r));}

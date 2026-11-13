// Chapter 4 M2 "Cliff Pass" regression bot (docs/CHAPTER4_M2.md), forestBot.cjs adapted to campaign-32: the Guardian breaks the faction gate, the gate towers and then the Keep, and a Ballista is repaired on request.
// A deterministic player that plays the production level through commands only:
// no emulated mechanics (the scratch probe emulated the Banner, the shield, the repair and the Hero; the engine owns them now). Plans: conquer (default), turtle, rush.
// Results are bot behaviour, not human-playtest outcomes; they guard against regressions, not for balance sign-off.
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {route,dist,DT,HZ}=require('./campaignBot.cjs');
const HOME=[[14,12],[14,11],[14,13],[13,12],[13,11],[13,13]],KEEP={x:330,y:600},ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]];
const ASSAULT=['red-gate','c4-gate-north','c4-gate-south','red-base'];
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
function run(o={}){
 o={plan:'conquer',homeTowers:1,forward:2,barracks:false,repair:true,ballista:true,defendBanner:true,recall:420,cap:900,...o};
 const setup=campaign.setup(32);if(o.heroRespawn)setup.post={...setup.post,hero:{...setup.post.hero,respawnTicks:o.heroRespawn*HZ}};const sim=new Simulation('c4m2',setup,o.seed),s=sim.state,h=sim.hero,post=sim.setup.post;
 const log=[],m={captures:[],losses:[],failed:0,repairs:0,forwardBuilt:0,keepMin:3000,bannerHits:{},guardianAt:{home:0,camp:0,assault:0,raise:0}};
 let n=0,firstCapture=null;
 const red=()=>Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0);
 let path=null,pathKey='',pathAt=0,wi=0;
 const goTo=(goal,stopAt=8)=>{const key=Math.round(goal.x/24)+','+Math.round(goal.y/24),t=sim.clock.tick;
  if(key!==pathKey||t>=pathAt){try{path=route(sim,goal);}catch{path=[goal];}pathKey=key;pathAt=t+45;wi=0;}
  while(wi<path.length-1&&dist(h,path[wi])<14)wi++;const aim=path[Math.min(wi,path.length-1)]??goal,d=dist(aim,h),final=wi>=path.length-1;
  sim.send({type:'move',...(d>(final?stopAt:1)?{x:(aim.x-h.x)/d*Math.min(1,d/(280/HZ)),y:(aim.y-h.y)/d*Math.min(1,d/(280/HZ))}:{x:0,y:0})});};
 const approach=t=>{const st=combatStructures(s);for(const [dx,dy] of t.id==='red-base'?KEEP_APPROACH:APPROACH){const p={x:t.x+dx,y:t.y+dy};if(!sim.geo.blocked(Math.round(p.x/8)*8,Math.round(p.y/8)*8,21,st))return p;}return {x:t.x-75,y:t.y};};
 const fight=(foe,stop=60)=>{sim.send({type:'target',id:foe.id});(sim.state.autoAttack=true);goTo(foe,stop);};
 const place=(c,r)=>{if(sim.placementReason('tower',c,r)==='')sim.send({type:'place',requestId:'p'+(++n),kind:'tower',col:c,row:r});};
 const towersAt=cells=>cells.filter(([c,r])=>Object.values(s.structures).some(b=>b.team==='blue'&&b.kind==='tower'&&b.col===c&&b.row===r&&b.hp>0)).length;
 const circle=[];for(let c=0;c<40;c++)for(let r=0;r<24;r++){const x=(c+.5)*48,y=(r+.5)*48;if(Math.hypot(x-post.circle.x,y-post.circle.y)<=post.circle.radius&&!(c===post.ruin.col&&r===post.ruin.row)&&!(c===post.ballista.col&&r===post.ballista.row)&&!(Math.abs(x-post.flag.x)<48&&Math.abs(y-post.flag.y)<48))circle.push([c,r]);}
 circle.sort((a,b)=>Math.hypot((a[0]+.5)*48-1176,(a[1]+.5)*48-600)-Math.hypot((b[0]+.5)*48-1176,(b[1]+.5)*48-600));
 const forwardIds=()=>Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower'&&b.hp>0&&Math.hypot(b.x-post.circle.x,b.y-post.circle.y)<=post.circle.radius+1).map(b=>b.id);
 const end=o.cap*HZ;
 while(!sim.ended&&sim.clock.tick<end){
  const t=sim.clock.tick,p=s.heroProgression,owned=s.post.owner==='azure',bannerId=s.post.bannerId,hero=s.units['red-hero'];
  const holdersDead=post.holders.every(id=>!s.structures[id]);
  // ---- spending: home towers, then the repair, then forward towers
  if(t%15===0){
   if(o.barracks==='first'&&!Object.values(s.structures).some(b=>b.azureBarracks&&b.hp>0)){const p=sim.azurePads.find(p=>sim.placementReason('barracks',p.col,p.row)===''); if(p){sim.send({type:'place',requestId:'bk'+(++n),kind:'barracks',col:p.col,row:p.row});m.barracks=(m.barracks||0)+1;}}
   else if(towersAt(HOME)<o.homeTowers){const c=HOME.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)place(...c);}
   else if(o.barracks&&!Object.values(s.structures).some(b=>b.azureBarracks&&b.hp>0)&&(sim.azurePads||[]).some(p=>sim.placementReason('barracks',p.col,p.row)==='')){const p=sim.azurePads.find(p=>sim.placementReason('barracks',p.col,p.row)==='');sim.send({type:'place',requestId:'bk'+(++n),kind:'barracks',col:p.col,row:p.row});m.barracks=(m.barracks||0)+1;}
   else if(owned){
    const bal=post.ballista,balFree=!Object.values(s.structures).some(b=>b.col===bal.col&&b.row===bal.row&&b.hp>0);
    if(o.ballista&&balFree&&sim.placementReason('ballista',bal.col,bal.row)===''){sim.send({type:'place',requestId:'ballista'+(++n),kind:'ballista',col:bal.col,row:bal.row});m.ballistas=(m.ballistas||0)+1;}
    else{const ruin=post.ruin,ruinFree=!Object.values(s.structures).some(b=>b.col===ruin.col&&b.row===ruin.row&&b.hp>0);
    if(o.repair&&ruinFree){if(sim.placementReason('tower',ruin.col,ruin.row)===''){sim.send({type:'place',requestId:'repair'+(++n),kind:'tower',col:ruin.col,row:ruin.row});m.repairs++;}}
    else if(towersAt(circle)<o.forward){const c=circle.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c){place(...c);m.forwardBuilt++;}}}
   }
  }
  // ---- Guardian
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(h.hp>0){
   if(t%10===0&&p.ranks.bash&&sim.remaining('bash')===0&&red().some(u=>dist(u,h)<100))sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
   const bought=m.bought??=[];if(bought.length<ITEMS.length){const [id,price]=ITEMS[bought.length];if(s.gold>=price&&!sim.shopAccessReason()){sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:s.inventory.ownerHeroId,requestId:'b'+(++n),itemId:id});bought.push(id);}}
   const homeFoe=red().filter(u=>dist(u,KEEP)<o.recall).sort((a,b)=>dist(a,h)-dist(b,h))[0];
   const banner=bannerId&&s.structures[bannerId],near=banner&&red().filter(u=>dist(u,banner)<240).sort((a,b)=>Number(b.id==='red-hero')-Number(a.id==='red-hero')||dist(a,h)-dist(b,h));
   const heroNear=hero&&hero.hp>0&&dist(hero,h)<150;
   if(homeFoe){m.guardianAt.home++;fight(homeFoe,40);}
   else if(banner&&o.defendBanner&&near.length&&(near[0].id==='red-hero'||near.length>=2||!owned)){m.guardianAt.camp++;fight(near[0],40);}
   else if(!holdersDead){m.guardianAt.camp++;if(heroNear)fight(hero,40);else{const tgt=post.holders.map(id=>s.structures[id]).find(Boolean);sim.send({type:'target',id:tgt.id});(sim.state.autoAttack=true);goTo(approach(tgt));}}
   else if(!owned){m.guardianAt.raise++;if(heroNear)fight(hero,40);else{(sim.state.autoAttack=true);goTo({x:post.flag.x,y:post.flag.y+64},4);}}
   else if(o.plan==='turtle'&&forwardIds().length<o.forward+(o.repair?1:0)){m.guardianAt.camp++;const foe=red().filter(u=>dist(u,post.circle)<300).sort((a,b)=>dist(a,h)-dist(b,h))[0];if(foe)fight(foe,40);else{(sim.state.autoAttack=true);goTo({x:1128,y:600},20);}}
   else{m.guardianAt.assault++;const tgt=ASSAULT.map(id=>id==='red-base'?s.bases[id]:s.structures[id]).find(x=>x&&x.hp>0&&!x.invulnerable);
    if(heroNear&&o.plan!=='rush')fight(hero,40);else if(tgt){sim.send({type:'target',id:tgt.id});(sim.state.autoAttack=true);goTo(approach(tgt));}else{(sim.state.autoAttack=true);goTo({x:1128,y:600},20);}}
  }
  sim.advance(DT);
  for(const e of sim.drainEvents()){log.push({at:sim.clock.tick,...e});
   if(e.type==='post'){const sec=Math.round(sim.clock.tick/HZ);if(e.change==='captured'){m.captures.push(sec);firstCapture??=sim.clock.tick;}else if(e.change==='lost')m.losses.push(sec);else if(e.change==='failed')m.failed++;}
   if(e.type==='damage'&&s.post.bannerId&&e.id===s.post.bannerId){const k=e.sourceId==='red-hero'?'hero':/^red-ca/.test(e.sourceId)?'elite':/tower/.test(e.sourceId)?'tower':'wave';m.bannerHits[k]=(m.bannerHits[k]||0)+Math.round(e.amount);}}
  if(firstCapture!==null){m.since=(m.since||0)+1;if(s.post.owner==='azure')m.own=(m.own||0)+1;}
  m.keepMin=Math.min(m.keepMin,s.bases['blue-base'].hp);
 }
 const deaths=id=>log.filter(e=>e.type==='death'&&e.id===id).length;
 return {sim,log,held:m.since?Math.round(100*(m.own||0)/m.since):null,plan:o.plan,outcome:sim.outcome?.outcome??'timeout',sec:sim.outcome?Math.round(sim.outcome.tick/HZ):null,capture:m.captures,lost:m.losses,failed:m.failed,
  gDeaths:deaths('guardian'),heroDeaths:deaths('red-hero'),keepMin:Math.round(m.keepMin),repairs:m.repairs,ballistas:m.ballistas||0,gateHp:Math.round(s.structures['red-gate']?.hp??0),ballistaAlive:Object.values(s.structures).some(b=>b.ballista&&b.hp>0),ballistaLost:log.filter(e=>e.type==='death'&&sim.state.structures[e.id]?.ballista).length,barracksOrders:m.barracks||0,soldiers:log.filter(e=>e.type==='spawn'&&/^blue-s-/.test(e.id||'')).length,forward:m.forwardBuilt,towersLost:log.filter(e=>e.type==='death'&&/^built-/.test(e.id)).length,
  bannerHits:m.bannerHits,level:s.heroProgression.level,items:(m.bought||[]).length,time:Object.fromEntries(Object.entries(m.guardianAt).map(([k,v])=>[k,Math.round(v/HZ)]))};
}
module.exports={run};
if(require.main===module){const {sim,log,...r}=run(JSON.parse(process.argv[2]||'{}'));console.log(JSON.stringify(r));}

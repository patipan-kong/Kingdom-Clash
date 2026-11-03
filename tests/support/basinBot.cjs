// Chapter 4 M5 "Canyon Basin" regression bot (docs/CHAPTER4_M5.md), cliffBot.cjs adapted to campaign-35's two camps: the Guardian takes the camps in `order`, repairs each ruin, then breaks the courtyard tower on `road` and the Keep.
// A deterministic player that plays the production level through commands only. Plans: conquer (default), turtle (forward towers in every camp before the assault), rush (no fighting the Heroes on the way).
// Results are bot behaviour, not human-playtest outcomes; they guard against regressions, not for balance sign-off.
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {route,dist,DT,HZ}=require('./campaignBot.cjs');
const HOME=[[14,12],[14,11],[14,13],[13,12],[13,11],[13,13]],KEEP={x:330,y:600},ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]];
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
const HEROES=['red-hero','red-raider'];
function run(o={}){
 o={plan:'conquer',order:['basin','rim'],road:'north',homeTowers:1,forward:1,barracks:false,repair:true,defendBanner:true,recall:420,cap:900,...o};
 const setup=campaign.setup(35);if(o.raider)setup.hero={...setup.hero,...o.raider};if(o.noRaider)delete setup.hero;
 const sim=new Simulation('c4m5',setup,o.seed),s=sim.state,h=sim.hero,camps=sim.camps;
 const log=[],m={captures:[],losses:[],failed:0,repairs:0,forwardBuilt:0,keepMin:3000,bannerHits:{},guardianAt:{home:0,camp:0,assault:0,raise:0,defend:0}};
 let n=0,firstCapture=null,shieldDown=null;
 const red=()=>Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0);
 let path=null,pathKey='',pathAt=0,wi=0;
 const goTo=(goal,stopAt=8)=>{const key=Math.round(goal.x/24)+','+Math.round(goal.y/24),t=sim.clock.tick;
  if(key!==pathKey||t>=pathAt){try{path=route(sim,goal);}catch{path=[goal];}pathKey=key;pathAt=t+45;wi=0;}
  while(wi<path.length-1&&dist(h,path[wi])<14)wi++;const aim=path[Math.min(wi,path.length-1)]??goal,d=dist(aim,h),final=wi>=path.length-1;
  sim.send({type:'move',...(d>(final?stopAt:1)?{x:(aim.x-h.x)/d*Math.min(1,d/(280/HZ)),y:(aim.y-h.y)/d*Math.min(1,d/(280/HZ))}:{x:0,y:0})});};
 const approach=t=>{const st=combatStructures(s);for(const [dx,dy] of t.id==='red-base'?KEEP_APPROACH:APPROACH){const p={x:t.x+dx,y:t.y+dy};if(!sim.geo.blocked(Math.round(p.x/8)*8,Math.round(p.y/8)*8,21,st))return p;}return {x:t.x-75,y:t.y};};
 const fight=(foe,stop=60)=>{sim.send({type:'target',id:foe.id});sim.send({type:'attack'});goTo(foe,stop);};
 const place=(c,r)=>{if(sim.placementReason('tower',c,r)==='')sim.send({type:'place',requestId:'p'+(++n),kind:'tower',col:c,row:r});};
 const towersAt=cells=>cells.filter(([c,r])=>Object.values(s.structures).some(b=>b.team==='blue'&&b.kind==='tower'&&b.col===c&&b.row===r&&b.hp>0)).length;
 // each camp's buildable cells, nearest its holders first (the ruin and the flag cell excluded)
 const cells=camps.map(c=>{const out=[];for(let col=0;col<40;col++)for(let row=0;row<24;row++){const x=(col+.5)*48,y=(row+.5)*48;if(Math.hypot(x-c.circle.x,y-c.circle.y)<=c.circle.radius&&!(col===c.ruin.col&&row===c.ruin.row)&&!(Math.abs(x-c.flag.x)<96&&Math.abs(y-c.flag.y)<96)&&!sim.azurePads.some(p=>p.col===col&&p.row===row))out.push([col,row]);}
  const hx=s.structures[c.holders[0]].x,hy=(s.structures[c.holders[0]].y+s.structures[c.holders[1]].y)/2;return out.sort((a,b)=>Math.hypot((a[0]+.5)*48-hx,(a[1]+.5)*48-hy)-Math.hypot((b[0]+.5)*48-hx,(b[1]+.5)*48-hy));});
 const idx=id=>camps.findIndex(c=>c.id===id),yard=o.road==='north'?'c4-yard-north':'c4-yard-south';
 const end=o.cap*HZ;
 while(!sim.ended&&sim.clock.tick<end){
  const t=sim.clock.tick,p=s.heroProgression,ps=sim.postStates;
  // ---- spending: home towers, then each Azure camp's repair, then forward towers
  if(t%15===0){
   const pad=sim.azurePads.find(p=>sim.placementReason('barracks',p.col,p.row)==='');
   if(towersAt(HOME)<o.homeTowers){const c=HOME.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)place(...c);}
   else if(o.barracks&&pad&&Object.values(s.structures).filter(b=>b.azureBarracks&&b.hp>0).length<(o.barracks===true?1:o.barracks)){sim.send({type:'place',requestId:'bk'+(++n),kind:'barracks',col:pad.col,row:pad.row});m.barracks=(m.barracks||0)+1;}
   else for(const [i,c] of camps.entries()){
    if(ps[i].owner!=='azure')continue;
    const ruinFree=!Object.values(s.structures).some(b=>b.col===c.ruin.col&&b.row===c.ruin.row&&b.hp>0);
    if(o.repair&&ruinFree){if(sim.placementReason('tower',c.ruin.col,c.ruin.row)===''){sim.send({type:'place',requestId:'repair'+(++n),kind:'tower',col:c.ruin.col,row:c.ruin.row});m.repairs++;}break;}
    if(towersAt(cells[i])<o.forward){const cell=cells[i].find(([c,r])=>sim.placementReason('tower',c,r)==='');if(cell){place(...cell);m.forwardBuilt++;}break;}
   }
  }
  // ---- Guardian
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(h.hp>0){
   if(t%10===0&&p.ranks.bash&&sim.remaining('bash')===0&&red().some(u=>dist(u,h)<100))sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
   const bought=m.bought??=[];if(bought.length<ITEMS.length){const [id,price]=ITEMS[bought.length];if(s.gold>=price&&!sim.shopAccessReason()){sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:s.inventory.ownerHeroId,requestId:'b'+(++n),itemId:id});bought.push(id);}}
   const homeFoe=red().filter(u=>dist(u,KEEP)<o.recall).sort((a,b)=>Number(HEROES.includes(b.id))-Number(HEROES.includes(a.id))||dist(a,h)-dist(b,h))[0];
   const threat=o.defendBanner&&ps.map(q=>q.bannerId&&s.structures[q.bannerId]).filter(Boolean).map(b=>({b,near:red().filter(u=>dist(u,b)<240).sort((x,y)=>Number(HEROES.includes(y.id))-Number(HEROES.includes(x.id))||dist(x,h)-dist(y,h))})).find(x=>x.near.length&&(HEROES.includes(x.near[0].id)||x.near.length>=2));
   const heroNear=HEROES.map(id=>s.units[id]).find(u=>u&&u.hp>0&&dist(u,h)<150);
   const next=o.order.map(idx).find(i=>ps[i].owner!=='azure'),c=next===undefined?null:camps[next];
   const forwardDone=camps.every((c,i)=>towersAt(cells[i])>=o.forward);
   if(homeFoe){m.guardianAt.home++;fight(homeFoe,40);}
   else if(threat){m.guardianAt.defend++;fight(threat.near[0],40);}
   else if(c&&c.holders.some(id=>s.structures[id])){m.guardianAt.camp++;if(heroNear&&o.plan!=='rush')fight(heroNear,40);else{const tgt=c.holders.map(id=>s.structures[id]).find(Boolean);sim.send({type:'target',id:tgt.id});sim.send({type:'attack'});goTo(approach(tgt));}}
   else if(c){m.guardianAt.raise++;if(heroNear&&o.plan!=='rush')fight(heroNear,40);else{sim.send({type:'attack'});goTo({x:c.flag.x,y:c.flag.y+(c.flag.y<600?64:-64)},4);}}
   else if(o.plan==='turtle'&&!forwardDone){m.guardianAt.camp++;sim.send({type:'attack'});goTo({x:camps[0].flag.x-60,y:camps[0].flag.y},20);}
   else{m.guardianAt.assault++;const tgt=[yard,'red-base'].map(id=>id==='red-base'?s.bases[id]:s.structures[id]).find(x=>x&&x.hp>0&&!x.invulnerable);
    if(heroNear&&o.plan!=='rush')fight(heroNear,40);else if(tgt){sim.send({type:'target',id:tgt.id});sim.send({type:'attack'});goTo(approach(tgt));}else{sim.send({type:'attack'});goTo({x:1300,y:o.road==='north'?312:864},20);}}
  }
  sim.advance(DT);
  for(const e of sim.drainEvents()){log.push({at:sim.clock.tick,...e});
   if(e.type==='post'){const sec=Math.round(sim.clock.tick/HZ);if(e.change==='captured'){m.captures.push(`${e.camp}@${sec}`);firstCapture??=sim.clock.tick;}else if(e.change==='lost')m.losses.push(`${e.camp}@${sec}`);else if(e.change==='failed')m.failed++;}
   if(e.type==='damage'&&ps.some(q=>q.bannerId===e.id)){const k=e.sourceId==='red-hero'?'defender':e.sourceId==='red-raider'?'raider':/^red-ca/.test(e.sourceId)?'elite':/tower/.test(e.sourceId)?'tower':'wave';m.bannerHits[k]=(m.bannerHits[k]||0)+Math.round(e.amount);}}
  if(shieldDown===null&&!s.bases['red-base'].invulnerable)shieldDown=Math.round(sim.clock.tick/HZ);
  m.keepMin=Math.min(m.keepMin,s.bases['blue-base'].hp);
 }
 const deaths=id=>log.filter(e=>e.type==='death'&&e.id===id).length;
 return {sim,log,plan:o.plan,order:o.order.join('>'),road:o.road,outcome:sim.outcome?.outcome??'timeout',sec:sim.outcome?Math.round(sim.outcome.tick/HZ):null,shieldDown,capture:m.captures,lost:m.losses,failed:m.failed,
  gDeaths:deaths('guardian'),defenderDeaths:deaths('red-hero'),raiderDeaths:deaths('red-raider'),raiderKeepDmg:Math.round(log.filter(e=>e.type==='damage'&&e.id==='blue-base'&&e.sourceId==='red-raider').reduce((a,e)=>a+e.amount,0)),keepMin:Math.round(m.keepMin),repairs:m.repairs,forward:m.forwardBuilt,
  towersLost:log.filter(e=>e.type==='death'&&/^built-/.test(e.id)).length,barracksOrders:m.barracks||0,bannerHits:m.bannerHits,level:s.heroProgression.level,items:(m.bought||[]).length,time:Object.fromEntries(Object.entries(m.guardianAt).map(([k,v])=>[k,Math.round(v/HZ)]))};
}
module.exports={run};
if(require.main===module){const {sim,log,...r}=run(JSON.parse(process.argv[2]||'{}'));console.log(JSON.stringify(r));}

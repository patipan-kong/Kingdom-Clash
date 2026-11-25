const {test}=require('node:test');
const assert=require('node:assert/strict');
const {crimsonReckoningCampaign}=require('../.test-build/data/crimsonReckoningLevels.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {DT,HZ,dist,entity,route}=require('./support/campaignBot.cjs');

const setup=crimsonReckoningCampaign.setup(55);
const [north,south]=setup.captures;
const MAIN='red-main-gate',KEEP='red-base',HOME='blue-base';
const towerCells=[[9,6],[9,18],[10,6],[10,18],[8,6],[8,18],[8,9],[8,15],[10,10],[10,14]];
const home={x:456,y:600};

function targetRoute(sim,target){
 const isKeep=target.id===KEEP;
 const offsets=isKeep?[[-112,0],[-112,-48],[-112,48],[0,120],[0,-120],[112,0]]:
  [[-72,0],[0,-72],[0,72],[72,0],[-64,-56],[-64,56],[64,-56],[64,56]];
 const view=structuresFor(sim.state,'blue');
 const candidates=offsets.map(([dx,dy])=>({x:target.x+dx,y:target.y+dy}))
  .filter(p=>!sim.geo.blocked(p.x,p.y,21,view)&&canAttackOn(sim.geo,{...sim.hero,...p},{...target,invulnerable:false},view))
  .sort((a,b)=>dist(sim.hero,a)-dist(sim.hero,b));
 for(const p of candidates){
  try{return route(sim,p);}catch(error){if(error.code!=='ERR_ASSERTION')throw error;}
 }
 return null;
}

function run(choices,{rush=false,central=true,clearCourtyard=false}={}){
 const sim=new Simulation('m5-v3-strategies',setup),s=sim.state,h=sim.hero;
 const actions=[],pressure=[0,0],spawnSources=new Map(),reached=new Set();
 const eliteDamage=[0,0],innerDown=[],wardenHits={},fortressDown=[],courtyardDown=[];
 let courtyardDamage=0,peakCourtyard=0,peakRegular=0,firstCourtyardHit,clearedCourtyard;
 let heroesDefeated=0,regularKills=0,serial=0,shieldReached=false,wingKeepDamage=[0,0];
 let action=0,path,marker,index=0,waitingAt=0,lastRepath=0,peakRed=0,contactBeforeBreach=new Set();
 const hit=id=>actions.push({id,done:()=>!entity(sim,id)?.hp});
 const post={get id(){return s.post.bannerId;},point:{x:888,y:600},name:'Central',done:()=>s.post.owner==='azure'};
 const takePost=()=>{setup.post.holders.forEach(hit);actions.push(post);};
 if(central)takePost();
 if(!rush){
  for(const [i,site] of setup.captures.entries()){
   if(choices[i]==='raze'){
    site.holders.slice(0,-1).forEach(hit);
    hit(site.id);
    hit(site.holders.at(-1));
   }else{
    site.holders.forEach(hit);
    const b=entity(sim,site.id);
    actions.push({point:{x:b.x-104,y:b.y},name:site.id,done:()=>s.captures[site.id].stage==='azure'});
   }
  }
 }
 hit(MAIN);
 if(!rush){
  // Silence the inner sources while the wall is open. A direct push skips this detour.
  ['m5-inner-north','m5-keep-north',setup.barracks[0].id,'m5-inner-south','m5-keep-south',setup.barracks[1].id,'m5-keep-court'].forEach(hit);
 }
 if(clearCourtyard)setup.courtyard.barracks.forEach(b=>hit(b.id));
 hit(KEEP);
 const issue=c=>sim.send({...c,requestId:`v3-${++serial}`});
 const steer=p=>{
  const k=1/Math.max(dist(h,p),h.speed/HZ);
  sim.send({type:'move',x:(p.x-h.x)*k,y:(p.y-h.y)*k});
 };
 const homeGuard={point:home,name:'rear defense'};
 let rearDefense=false;
 for(let t=0;t<720*HZ&&!sim.ended&&!shieldReached;t++){
  if(t%15===0){
   const skill=['bash','charge','taunt','zone'].find(k=>s.heroProgression.skillPoints>0&&!s.heroProgression.ranks[k]&&(k!=='zone'||s.heroProgression.level>=6));
   if(skill)issue({type:'learn',skill});
   const owned=Object.values(s.inventory.instances).map(i=>i.itemId);
   if(!owned.includes('siege-hammer')&&sim.shopPurchaseQuote('siege-hammer').available)
    issue({type:'buy-item',itemId:'siege-hammer',matchId:s.inventory.matchId,heroId:h.id});
   else if(!owned.includes('guardian-shield')&&sim.shopPurchaseQuote('guardian-shield').available)
    issue({type:'buy-item',itemId:'guardian-shield',matchId:s.inventory.matchId,heroId:h.id});
   if(!rush){
    const unfinished=setup.captures.filter((c,i)=>choices[i]==='seize'&&s.captures[c.id].stage!=='azure').length;
    const minWood=96*unfinished,minIron=24*unfinished;
    const towers=Object.values(s.structures).filter(u=>u.id.startsWith('built-')&&u.kind==='tower');
    const cell=towerCells.find(([col,row])=>!sim.placementReason('tower',col,row));
    if(cell&&towers.length<8&&(towers.length<2||s.wood>=minWood+80&&s.iron>=minIron+10))
     issue({type:'place',kind:'tower',col:cell[0],row:cell[1]});
    const tavern=Object.values(s.structures).some(u=>u.tavern);
    if(!tavern&&s.wood>=minWood+100&&s.iron>=minIron+10&&!sim.placementReason('tavern',6,9))
     issue({type:'place',kind:'tavern',col:6,row:9});
    else if(tavern){
     const dead=s.tavern.slots.findIndex(x=>x.status==='dead');
     if(dead>=0&&!sim.tavernReason({action:'revive',slot:dead}))issue({type:'tavern',action:'revive',slot:dead});
     else for(const merc of ['roland','borin'])if(!sim.tavernReason({action:'hire',merc})){
      issue({type:'tavern',action:'hire',merc});break;
     }
    }
    const threats=Object.values(s.units).filter(u=>u.team==='red'&&dist(u,s.bases[HOME])<245);
    rearDefense=threats.length>=(rearDefense?1:3)&&s.bases[HOME].hp<2350;
   }
   const redNear=Object.values(s.units).filter(u=>u.team==='red'&&dist(u,h)<120);
   if(redNear.length&&s.heroProgression.ranks.bash&&sim.remaining('bash')===0)issue({type:'cast',skill:'bash'});
   if(redNear.length&&h.hp<h.maxHp*.6&&s.heroProgression.ranks.zone&&sim.remaining('zone')===0)issue({type:'cast',skill:'zone'});
  }
  if(h.hp<=0)path=null;
  else{
   while(actions[action]?.done()){
    action++;waitingAt=t;path=null;
   }
   const next=rearDefense?homeGuard:central&&action>setup.post.holders.length&&s.post.owner==='crimson'?post:actions[action];
   if(next!==marker){marker=next;path=null;}
   const target=next?.id&&entity(sim,next.id),view=structuresFor(s,'blue');
   const inReach=target&&canAttackOn(sim.geo,h,{...target,invulnerable:false},view);
   if(inReach&&target.id===KEEP&&target.invulnerable){shieldReached=true;break;}
   if(inReach){sim.send({type:'target',id:target.id});steer(h);}
   else if(next?.point||target){
    if(!path&&(lastRepath===0||t-lastRepath>=15)||t-lastRepath>=180){
     lastRepath=t;
     if(target)path=targetRoute(sim,target);
     else{
      try{path=route(sim,next.point);}catch(error){if(error.code!=='ERR_ASSERTION')throw error;path=null;}
     }
     index=0;
    }
    if(path){
     while(index<path.length-1&&dist(h,path[index])<9)index++;
     steer(path[index]);
    }else steer(h);
    if(target)sim.send({type:'target',id:target.id});
   }else steer(h);
  }
  sim.advance(DT);
  const livingRed=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0);
  peakRed=Math.max(peakRed,livingRed.length);
  const local=livingRed.filter(u=>u.courtyardBarracks).length;
  peakCourtyard=Math.max(peakCourtyard,local);
  peakRegular=Math.max(peakRegular,livingRed.length-local);
  for(const e of sim.drainEvents()){
   const waveSlot=e.type==='spawn'&&/^red-w\d+-(\d+)$/.exec(e.id);
   if(waveSlot){
    // An advance can include two ticks, so the unit may already have moved.
    const [sx,sy]=setup.waveRules.redSlots[Number(waveSlot[1])%setup.waveRules.redSlots.length];
    const src=setup.barracks.findIndex(b=>b.slots.some(([x,y])=>x===sx&&y===sy));
    assert.ok(src>=0);spawnSources.set(e.id,src);
   }
   if(e.type==='death'){
    if(/^red-(hero-|warden-)/.test(e.id))heroesDefeated++;
    if(spawnSources.has(e.id))regularKills++;
    if(setup.barracks.some(b=>b.id===e.id))innerDown.push(e.id);
    if(setup.courtyard.barracks.some(b=>b.id===e.id)){
     courtyardDown.push(e.id);
     if(courtyardDown.length===setup.courtyard.barracks.length)clearedCourtyard=sim.clock.tick;
    }
    if(/^m5-(inner|keep)-/.test(e.id))fortressDown.push(e.id);
   }
   if(e.type==='damage'){
    if(e.id==='guardian'&&e.sourceId.startsWith('red-court-'))courtyardDamage+=e.amount;
    if(e.amount>0&&setup.courtyard.barracks.some(b=>b.id===e.id))firstCourtyardHit??=sim.clock.tick;
    if(e.id===KEEP)for(const [i,site] of setup.captures.entries())
     if(e.sourceId.startsWith(`blue-s-${site.id}-`))eliteDamage[i]+=e.amount;
    if(e.id===HOME&&spawnSources.has(e.sourceId))wingKeepDamage[spawnSources.get(e.sourceId)]+=e.amount;
    if(/^red-(hero-|warden-)/.test(e.sourceId))wardenHits[e.sourceId]=(wardenHits[e.sourceId]??0)+1;
   }
  }
  for(const u of livingRed){
   const origin=spawnSources.get(u.id);
   if(origin===undefined||reached.has(u.id)||u.x<504||u.x>672||(origin===0?u.y>=384:u.y<=816))continue;
   reached.add(u.id);pressure[origin]++;
   if(entity(sim,MAIN))contactBeforeBreach.add(origin);
  }
 }
 return {
  outcome:shieldReached?'shield stopped rush':sim.outcome?.outcome??'time limit',
  seconds:+(sim.clock.tick/HZ).toFixed(1),guardianDeaths:s.guardianDeaths,heroesDefeated,regularKills,
  innerDown,eliteDamage,pressure,wingKeepDamage,peakRed,peakRegular,peakCourtyard,contactBeforeBreach:[...contactBeforeBreach],fortressDown,
  courtyardDown,courtyardDamage:Math.round(courtyardDamage),
  courtyardClearSeconds:clearedCourtyard===undefined?null:(clearedCourtyard-firstCourtyardHit)/HZ,
  resources:{gold:s.gold,wood:Math.floor(s.wood),iron:Math.floor(s.iron)},
  central:s.post.owner,keepHp:s.bases[KEEP].hp,homeHp:s.bases[HOME].hp,wardenHits,
  pocketStages:setup.captures.map(c=>s.captures[c.id].stage),
  lastAction:marker?.id??marker?.name??null,actionAge:Math.floor((sim.clock.tick-waitingAt)/HZ),
  position:[Math.round(h.x),Math.round(h.y)],
 };
}

for(const [name,choices,options] of [
 ['Raze Both',['raze','raze'],{}],
 ['Seize Both',['seize','seize'],{}],
 ['Raze North / Seize South',['raze','seize'],{}],
 ['Seize North / Raze South',['seize','raze'],{}],
 ['Seize Both / clear courtyard Barracks first',['seize','seize'],{clearCourtyard:true}],
 ['Direct Rush without Central',[],{rush:true,central:false}],
 ['Direct Rush with Central',[],{rush:true}],
])test(name,t=>{
 const result=run(choices,options);
 t.diagnostic(JSON.stringify(result));
 if(options.central===false){
  assert.equal(result.outcome,'shield stopped rush');
  assert.equal(result.keepHp,3000);
  assert.equal(result.central,'crimson');
 }else{
  assert.ok(result.outcome!=='time limit',JSON.stringify(result));
  if(result.outcome==='victory')assert.equal(result.central,'azure');
  if(!options.rush){
   assert.equal(result.outcome,'victory');
   assert.ok(result.courtyardDamage>0);
  }
 }
 assert.ok(result.peakRegular<=19&&result.peakCourtyard<=4&&result.peakRed<=23);
 if(options.clearCourtyard)assert.equal(result.courtyardDown.length,2);
 if(options.rush)assert.deepEqual(result.pocketStages,['crimson','crimson']);
});

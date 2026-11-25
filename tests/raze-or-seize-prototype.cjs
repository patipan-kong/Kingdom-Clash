const {test}=require('node:test');
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const {CampaignRegistry}=require('../.test-build/data/campaign.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {razeOrSeizeV2Level,razeOrSeizeLevelId}=require('../.test-build/data/razeOrSeizePrototype.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {Navigation}=require('../.test-build/simulation/Navigation.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
const {DT,HZ,dist,route,strike,until}=require('./support/campaignBot.cjs');

const registry=new CampaignRegistry([razeOrSeizeV2Level]);
const fresh=()=>new Simulation('raze-or-seize-test',registry.setup(razeOrSeizeLevelId));
const [north,south]=registry.setup(razeOrSeizeLevelId).captures;
const KEEP='red-base',FORWARD='red-forward-gate',MAIN='red-main-gate';
const gateTowers=['m5-gate-north','m5-gate-south','m5-gate-overlook'];
const siegeTowers=['m5-inner-north','m5-inner-south','m5-keep-north','m5-keep-south'];
const wardens=['red-hero-'+north.id,'red-hero-'+south.id,'red-hero'];
const living=(sim,id)=>sim.state.units[id]??sim.state.structures[id]??sim.state.bases[id];
const advance=(sim,n)=>until(sim,sim.clock.tick+n);
const move=(sim,to)=>{
 const d=dist(sim.hero,to),k=1/Math.max(d,sim.hero.speed/HZ);
 sim.send({type:'move',x:(to.x-sim.hero.x)*k,y:(to.y-sim.hero.y)*k});
};
const moveStop=sim=>sim.send({type:'move',x:0,y:0});

test('The historical V2 fixture stays out of quick matches and pairs a single post with three independent Wardens',()=>{
 const sim=fresh(),{match:{overrides}}=registry.get(razeOrSeizeLevelId);
 assert.equal(battlefieldFromSearch('?battlefield=raze-or-seize',true),'meadow');
 assert.deepEqual(sim.camps.map(c=>c.id),['central']);
 assert.deepEqual(sim.geo.size,{width:2880,height:1536});
 assert.deepEqual(Object.values(sim.state.units).filter(u=>u.team==='red').map(u=>u.id),wardens);
 assert.ok(sim.setup.captures.every(c=>c.holders.length===3));
 assert.equal(sim.setup.tavern.cap,2);
 assert.deepEqual(sim.setup.captures.map(c=>[c.elite.hp,c.ring,c.captureTicks,c.repair,c.elite.intervalTicks,c.elite.count]),
  [45,55].map(interval=>[2000,120,4*HZ,{wood:96,iron:24,ticks:5*HZ},interval*HZ,2]));
 assert.throws(()=>matchSetup('extended',{...overrides,post:{...overrides.post,hero:{
  anchor:[1512,600],spawn:[1512,600],guard:216,respawnTicks:2400,
 }}}),/Invalid guard/);
 assert.throws(()=>matchSetup('extended',{...overrides,respawnChain:[{...overrides.respawnChain[0],post:'north'}]}),/Invalid Guardian respawn chain/);
});

test('all three towers cover the forward gate’s west strike position',()=>{
 const sim=fresh(),gate=living(sim,FORWARD),view=structuresFor(sim.state,'red');
 const attacker={...sim.hero,x:gate.x-72,y:gate.y};
 assert.equal(sim.geo.blocked(attacker.x,attacker.y,attacker.radius,structuresFor(sim.state,'blue')),false);
 assert.equal(gate.maxHp,3000);
 for(const id of gateTowers)assert.ok(canAttackOn(sim.geo,living(sim,id),attacker,view),id);
});

test('each Warden fights locally and a yard Warden only returns while its own Barracks is Crimson',()=>{
 const sim=fresh();
 for(const id of wardens){
  const probe=fresh(),warden=living(probe,id);
  assert.ok(probe.teleportHero(warden.x-72,warden.y),id);
  assert.ok(advance(probe,75).some(e=>e.type==='damage'&&e.sourceId===id),id);
 }
 for(const id of wardens.slice(0,2))strike(sim,'guardian',id);
 strike(sim,'guardian',north.id);
 const waited=advance(sim,south.warden.respawnTicks+1);
 assert.ok(waited.some(e=>e.type==='spawn'&&e.id===wardens[1]));
 assert.ok(!living(sim,wardens[0]));
 assert.ok(living(sim,wardens[2]));
});

test('Central ownership shields the Keep and controls uncontested, contested and dead-trade respawns',()=>{
 const sim=fresh();
 const setup={...sim.setup,encounter:{...sim.setup.encounter,waves:[],spawns:[],continuous:false}};
 const isolated=new Simulation('central-respawn',setup),state=isolated.state,central=state.post;
 for(const u of Object.values(state.units))if(u.id!=='guardian'&&u.id!=='red-hero')delete state.units[u.id];
 assert.equal(state.bases[KEEP].invulnerable,true);
 assert.equal(central.owner,'crimson');
 for(const id of isolated.camps[0].holders)strike(isolated,'guardian',id);
 advance(isolated,1);
 strike(isolated,'guardian',central.bannerId);
 advance(isolated,1);
 assert.equal(central.owner,'azure');
 assert.equal(state.bases[KEEP].invulnerable,undefined);
 const respawn=(before)=>{
  strike(isolated,KEEP,'guardian');
  const due=isolated.hero.respawnTick;
  until(isolated,due-1);
  before?.();
  const event=advance(isolated,1).find(e=>e.type==='respawn');
  assert.ok(event);
  return event;
 };
 assert.equal(respawn().post,'central');
 const contested=respawn(()=>{
  const {flag}=isolated.camps[0],unit=isolated.unit('red-contender','minion-red',flag.x-48,flag.y);
  unit.statuses=[{type:'stun',expiresTick:isolated.clock.tick+100}];
  state.units[unit.id]=unit;
 });
 assert.equal(contested.contestedPost,'central');
 assert.equal(contested.post,undefined);
 delete state.units['red-contender'];
 const trade=respawn(()=>isolated.send({type:'buy-item',itemId:'iron-sword',heroId:'guardian',matchId:state.inventory.matchId,requestId:'dead-trade'}));
 assert.equal(trade.post,undefined);
 assert.ok(Object.values(state.inventory.instances).some(item=>item.itemId==='iron-sword'));
 assert.equal(isolated.hero.x,isolated.field.respawn[0].x);
 assert.equal(respawn().post,'central','the trade reroutes only that respawn');
 strike(isolated,KEEP,central.bannerId);
 advance(isolated,1);
 assert.equal(state.bases[KEEP].invulnerable,true);
 assert.equal(central.owner,'crimson');
});

test('pocket shutdown removes only entries at that site, including production already queued',()=>{
 for(const [site,other] of [[north,south],[south,north]]){
  const sim=fresh(),wave=sim.setup.waveRules.redSlots[0];
  const entry=(id,[x,y])=>({id,x,y,team:'red',wave:0,tick:9999,archetype:'crimson-elite'});
  sim.spawnQueue.push(entry('own',site.elite.slots[0]),entry('other',other.elite.slots[0]),entry('wave',wave));
  if(site===north)strike(sim,'guardian',site.id);
  else{
   for(const id of site.holders)strike(sim,'guardian',id);
   const {x,y}=living(sim,site.id);
   assert.ok(sim.teleportHero(x-104,y));
   advance(sim,site.captureTicks);
   assert.equal(sim.state.captures[site.id].stage,'captured');
  }
  advance(sim,1);
  assert.deepEqual(sim.spawnQueue.filter(e=>['own','other','wave'].includes(e.id)).map(e=>e.id),['other','wave']);
  assert.equal(sim.state.captures[other.id].stage,'crimson');
 }
});

test('each Crimson Elite slot has a route out of its pocket with every defense standing',()=>{
 const sim=fresh(),navigation=new Navigation(sim.geo),keep=sim.state.bases['blue-base'];
 const slots=new Set(sim.setup.waveRules.redSlots.map(slot=>slot.join(',')));
 for(const site of [north,south])for(const [x,y] of site.elite.slots){
  assert.ok(!slots.has(`${x},${y}`),'the spawn belongs to only one source');
  slots.add(`${x},${y}`);
  const unit=sim.unit(`probe-${x}-${y}`,'minion-red',x,y,'crimson-elite');
  navigation.begin(sim.state);
  const path=navigation.route(unit,keep,sim.state,sim.clock.tick);
  assert.ok(Number.isFinite(path?.cost),`an Elite from ${site.id} can reach the Azure Keep`);
 }
});

test('both yard repair approaches reconnect to the courtyard for Guardian, Hero and infantry',()=>{
 const sim=fresh(),navigation=new Navigation(sim.geo),destination={x:2328,y:648};
 for(const id of [FORWARD,MAIN,...north.holders,...south.holders])strike(sim,'guardian',id);
 const blue=structuresFor(sim.state,'blue');
 for(const site of [north,south]){
  const {x,y}=living(sim,site.id),approach={x:x-104,y};
  for(const radius of [sim.hero.radius,20,12]){
   assert.equal(sim.geo.blocked(approach.x,approach.y,radius,blue),false);
   assert.ok(navigation.canReachWaypoint({...sim.hero,...approach,radius},destination,blue),site.id);
  }
 }
});

// Find a usable angle before walking to a structure. Close combat still runs through the same
// target preference, movement, construction, skill and trade commands as a live match.
const meleeOffsets=[[-72,0],[0,-72],[0,72],[72,0],[-64,-56],[-64,56],[64,-56],[64,56]];
const keepOffsets=[[-112,0],[-112,-48],[-112,48],[0,-120],[0,120]];
function attackPoint(sim,target){
 const view=structuresFor(sim.state,'blue');
 const offsets=target.id===KEEP?keepOffsets:meleeOffsets;
 const points=offsets.map(([x,y])=>({x:target.x+x,y:target.y+y}))
  .filter(p=>!sim.geo.blocked(p.x,p.y,21,view)&&canAttackOn(sim.geo,{...sim.hero,...p},{...target,invulnerable:undefined},view));
 assert.ok(points.length,`attack position for ${target.id}`);
 return points[0];
}

function run(razeNorth,razeSouth,{rush=false,pressSiege=false}={}){
 const sim=fresh(),s=sim.state,h=sim.hero;
 const actions=[],events=[],sitePlans=[[north,razeNorth],[south,razeSouth]];
 const strikeAction=id=>({id,finished:()=>!living(sim,id)?.hp,goal:()=>attackPoint(sim,living(sim,id))});
 const attack=id=>actions.push(strikeAction(id));
 const takeCentral={get id(){return s.post.bannerId;},finished:()=>s.post.owner==='azure',goal:()=>attackPoint(sim,living(sim,s.post.bannerId))};
 const visit=(name,goal,finished)=>actions.push({name,goal:()=>goal,finished});
 let escortX=pressSiege?2416:2144;
 const escort={name:'escort to Keep',goal:()=>({x:escortX,y:648}),finished:()=>
  sitePlans.every(([site,raze])=>raze||keepDamage[site.id]>0)};
 if(!rush){
  for(const holder of sim.camps[0].holders)attack(holder);
  actions.push(takeCentral);
 }
 for(const id of gateTowers)attack(id);
 attack(FORWARD);
 if(!rush)for(const [site,raze] of sitePlans){
  if(raze){
   for(const holder of site.holders.slice(0,-1))attack(holder);
   attack(site.id);
  }
  else{
   for(const holder of site.holders)attack(holder);
   const {x,y}=living(sim,site.id);
   visit(site.name,{x:x-104,y},()=>s.captures[site.id].stage==='azure');
  }
 }
 if(!rush&&sitePlans.some(([,raze])=>!raze))visit('assemble escorts',{x:1776,y:624},()=>
  sitePlans.every(([site,raze])=>raze||Object.values(s.units).some(u=>u.id.startsWith('blue-s-'+site.id)&&dist(u,{x:1776,y:624})<150)));
 attack(MAIN);
 if(!rush)for(const id of siegeTowers)attack(id);
 if(!rush&&sitePlans.some(([,raze])=>!raze))actions.push(escort);
 attack(KEEP);
 const sites=sitePlans.map(([site])=>site.id),eliteSource=id=>sites.find(site=>id.startsWith('blue-s-'+site+'-'));
 const redSpawns=Object.fromEntries(sites.map(id=>[id,0])),keepDamage=Object.fromEntries(sites.map(id=>[id,0]));
 const homeDefense=[[9,11],[9,13],[10,9],[10,15],[8,9],[8,15]];
 const centralDefense=[[19,10],[19,14],[17,10],[17,14],[18,9],[18,15]];
 const defendHome={name:'defend the Azure Keep',goal:()=>({x:504,y:600})};
 let action=0,actionsDone=0,plan=null,index=0,serial=0,peakRed=0,peakBlue=0,advanceMs=0,peakTickMs=0,planFor;
 let blockedAtKeep=false,returningHome=false;
 const command=c=>sim.send({...c,requestId:'bot-'+(++serial)});
 for(let t=0;t<21600&&!sim.ended&&!blockedAtKeep;t++){
  const p=s.heroProgression;
  if(t%15===0){
   const skill=['bash','charge','taunt','zone'].find(k=>p.skillPoints>0&&p.ranks[k]<1&&(k!=='zone'||p.level>=6));
   if(skill)command({type:'learn',skill});
   const repairPending=sitePlans.some(([site,raze])=>!raze&&s.captures[site.id].stage==='captured'&&s.captures[site.id].repairDone===undefined);
   for(const [cells,max] of [[homeDefense,4],[centralDefense,4]]){
    const standing=Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower'&&cells.some(([c,r])=>b.col===c&&b.row===r)).length;
    const cell=standing<max&&cells.find(([c,r])=>!sim.placementReason('tower',c,r));
    if(cell&&(!repairPending||s.wood>=176&&s.iron>=34)){command({type:'place',kind:'tower',col:cell[0],row:cell[1]});break;}
   }
   const owned=Object.values(s.inventory.instances).map(item=>item.itemId);
   const itemId=['siege-hammer','guardian-shield'].find(id=>!owned.includes(id));
   if(itemId&&sim.shopPurchaseQuote(itemId).available)command({type:'buy-item',itemId,matchId:s.inventory.matchId,heroId:h.id});
   if(!rush&&owned.includes('siege-hammer')){
    const fallen=s.tavern.slots.findIndex(slot=>slot.status==='dead');
    if(!repairPending&&!Object.values(s.structures).some(b=>b.tavern)&&!sim.placementReason('tavern',9,10))
     command({type:'place',kind:'tavern',col:9,row:10});
    else if(!pressSiege&&fallen>=0&&!sim.tavernReason({action:'revive',slot:fallen}))
     command({type:'tavern',action:'revive',slot:fallen});
    else if(!sim.tavernReason({action:'hire',merc:'roland'}))
     command({type:'tavern',action:'hire',merc:'roland'});
   }
   if(h.hp>0){
    const nearest=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0).sort((a,b)=>dist(a,h)-dist(b,h))[0];
    if(nearest&&dist(nearest,h)<100&&p.ranks.bash&&sim.remaining('bash')===0)command({type:'cast',skill:'bash'});
    if(nearest&&dist(nearest,h)<120&&h.hp<h.maxHp*.6&&p.ranks.zone&&sim.remaining('zone')===0)command({type:'cast',skill:'zone'});
   }
  }
  if(h.hp<=0)plan=null;
  else{
   while(actions[action]?.finished()){action++;actionsDone=t;plan=null;}
   if(!rush&&!pressSiege&&t%15===0){
    const pressure=Object.values(s.units).filter(u=>u.team==='red'&&dist(u,s.bases['blue-base'])<=360).length;
    returningHome=pressure>=(returningHome?1:3);
   }
   const next=returningHome?defendHome:!rush&&action>sim.camps[0].holders.length&&s.post.owner==='crimson'?takeCentral:actions[action];
   const target=next?.id&&living(sim,next.id);
   if(next!==planFor){plan=null;planFor=next;}
   if(next===escort&&!pressSiege&&t%30===0){
    const fighters=Object.values(s.units);
    const throughGate=sitePlans.every(([site,raze])=>raze||keepDamage[site.id]>0||
     fighters.some(u=>u.id.startsWith('blue-s-'+site.id)&&u.x>=2184));
    const x=throughGate?2448:2144;
    if(x!==escortX){escortX=x;plan=null;}
   }
   if(target?.id===KEEP&&rush&&dist(h,attackPoint(sim,target))<12)blockedAtKeep=true;
   if(!next||(!target&&!next.name))moveStop(sim);
   else if(target&&canAttackOn(sim.geo,h,target,structuresFor(s,'blue'))){sim.send({type:'target',id:target.id});moveStop(sim);}
   else{
    if(!plan){plan=route(sim,next.goal());index=0;}
    while(index<plan.length-1&&dist(h,plan[index])<9)index++;
    move(sim,plan[index]);
    if(target&&s.selectedTarget!==target.id)sim.send({type:'target',id:target.id});
   }
  }
  const start=performance.now();
  sim.advance(DT);
  const elapsed=performance.now()-start;
  advanceMs+=elapsed;peakTickMs=Math.max(peakTickMs,elapsed);
  for(const e of sim.drainEvents()){
   if(e.type==='spawn'&&e.id.startsWith('red-w'))events.push(e);
   if(e.type==='spawn'&&eliteSource(e.id)){
    assert.equal(s.captures[eliteSource(e.id)].stage,'azure','Azure production waits for conversion');
    events.push(e);
   }
   if(e.type==='spawn'&&e.id.startsWith('red-eb-')){
    const u=living(sim,e.id),site=sitePlans.find(([c])=>c.elite.slots.some(([x,y])=>u?.x===x&&u.y===y));
    assert.ok(site,'Elite came from a pocket');
    assert.equal(s.captures[site[0].id].stage,'crimson');
    redSpawns[site[0].id]++;
   }
   if(e.type==='damage'&&e.id===KEEP){const source=eliteSource(e.sourceId);if(source)keepDamage[source]+=e.amount;}
   if(e.type==='post'||e.type==='site'||e.type==='built'||e.type==='item-traded'||(e.type==='damage'&&e.sourceId.startsWith('red-hero')))events.push(e);
  }
  const units=Object.values(s.units);
  peakRed=Math.max(peakRed,units.filter(u=>u.hp>0&&u.team==='red').length);
  peakBlue=Math.max(peakBlue,units.filter(u=>u.hp>0&&u.team==='blue'&&!u.ally&&u.kind==='minion-blue').length);
 }
 return {sim,blockedAtKeep,events,redSpawns,keepDamage,peakRed,peakBlue,advanceMs,peakTickMs,action:actions[action]?.id??actions[action]?.name,actionsDone};
}

// The south-only army also has a sustained siege plan. It pushes with the first recruits
// while the fixed defenders handle the Azure side, rather than returning to reinforce home.
for(const [razeNorth,razeSouth,pressSiege] of [[true,true],[false,false],[true,false,true],[false,true]]){
 const choices=[razeNorth,razeSouth].map(raze=>raze?'Raze':'Seize');
 test(`Normal commands: ${choices[0]} North / ${choices[1]} South`,context=>{
  const result=run(razeNorth,razeSouth,{pressSiege}),{sim}=result,s=sim.state,raze=[razeNorth,razeSouth];
  const repairs=result.events.filter(e=>e.type==='site'&&e.change==='repairing').map(e=>sim.setup.captures.find(c=>c.id===e.id).repair);
  const stats={
   seconds:+(sim.clock.tick/HZ).toFixed(1),deaths:s.guardianDeaths,kills:s.kills,
   azureKeepHp:s.bases['blue-base'].hp,
   repairWood:repairs.reduce((sum,job)=>sum+job.wood,0),repairIron:repairs.reduce((sum,job)=>sum+job.iron,0),
   structuresBuilt:result.events.filter(e=>e.type==='built').length,
   artifactGoldSpent:result.events.filter(e=>e.type==='item-traded').reduce((sum,e)=>sum-e.goldDelta,0),
   redSpawns:result.redSpawns,keepDamage:result.keepDamage,
   survivingElites:[north,south].map(site=>Object.values(s.units).filter(u=>u.id.startsWith('blue-s-'+site.id+'-')&&u.hp>0).length),
   peakUnits:[result.peakRed,result.peakBlue],msPerTick:+(result.advanceMs/sim.clock.tick).toFixed(3),peakTickMs:+result.peakTickMs.toFixed(2),
   wardenHits:wardens.map(id=>result.events.filter(e=>e.type==='damage'&&e.sourceId===id).length),
  };
  context.diagnostic(JSON.stringify(stats));
  const elitePositions=Object.values(s.units).filter(u=>u.id.startsWith('blue-s-red-barracks')).map(u=>[u.id,Math.round(u.x),Math.round(u.y),u.targetId]);
  assert.equal(sim.outcome?.outcome,'victory',`last action ${result.action} since ${result.actionsDone/HZ}s at ${Math.round(sim.hero.x)},${Math.round(sim.hero.y)}; Central ${s.post.owner}; Elites ${JSON.stringify(elitePositions)}`);
  assert.equal(s.post.owner,'azure');
  assert.ok(result.events.some(e=>e.type==='spawn'&&/^red-w[4-9]-/.test(e.id)));
  assert.ok(stats.wardenHits.every(n=>n>0));
  assert.ok(result.peakRed<=sim.setup.waveRules.caps.red+1&&result.peakBlue<=sim.setup.waveRules.caps.blue);
  for(const [i,site] of [north,south].entries()){
   assert.equal(s.captures[site.id].stage,raze[i]?'lost':'azure');
   const stages=result.events.filter(e=>e.type==='site'&&e.id===site.id&&e.change!=='short').map(e=>e.change);
   assert.deepEqual(stages,raze[i]?['lost']:['captured','repairing','converted']);
   assert.equal(sim.economy.applied.has('repair:repair:'+site.id),!raze[i]);
   assert.equal(result.keepDamage[site.id]>0,!raze[i]);
  }
 });
}

test('Direct Keep rush stalls on the shield without touching either pocket',()=>{
 const {sim,blockedAtKeep}=run(true,true,{rush:true}),s=sim.state;
 assert.equal(blockedAtKeep,true);
 assert.equal(s.bases[KEEP].hp,s.bases[KEEP].maxHp);
 assert.equal(s.bases[KEEP].invulnerable,true);
 assert.equal(s.post.owner,'crimson');
 assert.deepEqual(Object.values(s.captures).map(c=>c.stage),['crimson','crimson']);
});

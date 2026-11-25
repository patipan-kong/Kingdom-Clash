const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CampaignRegistry}=require('../.test-build/data/campaign.js');
const {crimsonReckoningCampaign}=require('../.test-build/data/crimsonReckoningLevels.js');
const {lastWarlordPhaseELevel}=require('../.test-build/data/lastWarlordPrototype.js');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {DT,HZ,entity,scripted,strike,until}=require('./support/campaignBot.cjs');

const setup=crimsonReckoningCampaign.setup(56);
const original=new CampaignRegistry([lastWarlordPhaseELevel]).setup(56);
const [north,south]=setup.barracks;
const BOSS='red-warlord',ASSAULT='red-assault-warden',FORT='red-hero-forward';
const gates=setup.gates.filter(g=>g.arenaGate);
const tick=(sim,n=1)=>until(sim,sim.clock.tick+n);
const waveSource=e=>setup.barracks.find(b=>b.slots.some(([x,y])=>e.x===x&&e.y===y))?.id??'arena';
const fixture=({quiet=true}={})=>{
 const sim=new Simulation('e2',quiet?{...setup,encounter:{...setup.encounter,waves:[],spawns:[],continuous:false}}:setup);
 sim.state.autoAttack=false;
 return sim;
};
function capture(sim){
 for(const id of setup.post.holders)if(entity(sim,id))strike(sim,'guardian',id);
 assert.ok(sim.teleportHero(2904,792));
 assert.ok(tick(sim,setup.post.raiseTicks+1).some(e=>e.type==='post'&&e.change==='captured'));
}

test('Canonical M6 uses XFE2 and inherits the Phase E boss and goals',()=>{
 assert.deepEqual(original.battlefield.size,{width:2400,height:1200});
 assert.deepEqual(setup.battlefield.size,{width:3840,height:1584});
 assert.equal(battlefieldFromSearch('?battlefield=last-warlord-xl-fort',true),'meadow');
 assert.deepEqual(setup.warlord,{...original.warlord,anchor:[3528,792]});
 assert.deepEqual(setup.mission,original.mission);
 assert.deepEqual(setup.encounter.defenders.map(t=>t.hp),[900,900,900,900,1100,1100,1625,1625]);
 assert.deepEqual(setup.barracks.map(b=>b.hp),[2000,2000]);
 assert.deepEqual(setup.encounter.caps,{red:22,blue:16});
 assert.equal(setup.tavern.cap,2);
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick),Array.from({length:8},(_,i)=>150+i*675));
 assert.deepEqual(setup.waveRules.enemyPerWave,[6,6,6,7,7,8,8,8]);
 assert.deepEqual(setup.waveRules.elitesPerWave,[0,0,0,0,2,2,2,2]);
 for(let i=1;i<=11;i++){
  const elites=extendedWaveSpawns(i,setup.waveRules).filter(e=>e.archetype==='crimson-elite');
  assert.deepEqual(elites.map(waveSource),i<5?[]:[north.id,south.id]);
 }
});

test('approaches can reach their chosen breaching gates and every fortress target has a melee face',()=>{
 const approaches=[
  {point:{x:1272,y:264},doors:['red-north-camp-gate','red-north-postern','red-post-gate-north']},
  {point:{x:1272,y:1320},doors:['red-south-camp-gate','red-south-postern','red-post-gate-south']},
  {point:{x:2280,y:792},doors:['red-main-gate','red-post-gate-west']},
 ];
 for(const {point,doors} of approaches){
  const sim=fixture();
  assert.ok(sim.navigation.canReachWaypoint(sim.hero,point,structuresFor(sim.state,'blue')));
  Object.assign(sim.hero,point);
  for(const id of doors){
   sim.navigation.begin(sim.state);
   assert.ok(Number.isFinite(sim.navigation.route(sim.hero,entity(sim,id),sim.state,sim.clock.tick)?.cost),id);
   strike(sim,'guardian',id);
  }
  assert.ok(sim.navigation.canReachWaypoint(sim.hero,{x:2904,y:792},structuresFor(sim.state,'blue')));
 }
 const sim=fixture(),targets=[...setup.encounter.defenders,...setup.barracks,...setup.gates.filter(g=>!g.arenaGate)];
 for(const {id} of targets){
  const target=entity(sim,id),view=structuresFor(sim.state,'blue');
  let reachable=false;
  for(let y=target.y-144;y<=target.y+144&&!reachable;y+=16)for(let x=target.x-144;x<=target.x+144&&!reachable;x+=16){
   const from={...sim.hero,x,y};
   reachable=!sim.geo.blocked(x,y,from.radius,view)&&canAttackOn(sim.geo,from,target,view);
  }
  assert.ok(reachable,id);
 }
});

test('an Allied Hero walks to the ordered Defend point instead of following the Guardian in a Warlord match',()=>{
 const sim=fixture();
 assert.ok(sim.teleportHero(792,792));
 sim.send({type:'tavern',requestId:'defend-hire',action:'hire',merc:'borin'});
 tick(sim);
 const unit=entity(sim,sim.state.tavern.slots[0].unitId);
 const order={type:'defend',x:504,y:1032};
 sim.send({type:'ally',requestId:'defend-yard',id:unit.id,order});
 const events=tick(sim,8*HZ);
 assert.ok(events.some(e=>e.type==='ally-order'&&e.order.type==='defend'));
 assert.deepEqual(unit.ally.order,order);
 assert.ok(Math.hypot(unit.x-order.x,unit.y-order.y)<=30,JSON.stringify({x:unit.x,y:unit.y}));
 assert.ok(Math.hypot(unit.x-sim.hero.x,unit.y-sim.hero.y)>250);
 sim.send({type:'ally',requestId:'follow-again',id:unit.id,order:{type:'follow'}});
 tick(sim,8*HZ);
 assert.equal(unit.ally.order.type,'follow');
 assert.ok(Math.hypot(unit.x-sim.hero.x,unit.y-sim.hero.y)<=150);
});

test('camp production is removed without redistribution, and the arena continues through wave 9',()=>{
 for(const dead of [[north],[south],[north,south]]){
  const sim=fixture();
  for(const b of dead)strike(sim,'guardian',b.id);
  for(const wave of [5,9]){
   const entries=extendedWaveSpawns(wave,setup.waveRules).filter(e=>e.team==='red');
   for(const entry of entries){
    sim.spawnQueue.push({...entry,tick:0});
    sim.spawnDue(200);
    assert.equal(!!entity(sim,entry.id),!dead.some(b=>b.id===waveSource(entry)),entry.id);
    delete sim.state.units[entry.id];
   }
   assert.ok(entries.some(e=>waveSource(e)==='arena'));
   assert.equal(sim.spawnQueue.length,0);
  }
 }
});

test('ordinary camp Wardens respawn at 100 seconds only while their Barracks stands',()=>{
 const sim=fixture(),[n,s]=setup.wardens;
 strike(sim,'guardian',n.id);
 strike(sim,'guardian',s.id);
 strike(sim,'guardian',north.id);
 sim.heroDue(100*HZ-1);
 assert.ok(!entity(sim,n.id)&&!entity(sim,s.id));
 sim.heroDue(100*HZ);
 assert.equal(entity(sim,n.id),undefined);
 assert.deepEqual([entity(sim,s.id).x,entity(sim,s.id).y],s.anchor);
});

test('Assault Warden uses either surviving camp, keeps the red cap and cancels when both fall',()=>{
 const {warningTicks,firstTick,restTicks}=setup.commanders[0];
 for(const [dead,lane] of [[north,'south'],[south,'north']]){
  const sim=fixture();
  strike(sim,'guardian',dead.id);
  sim.commanderDue(firstTick-warningTicks);
  const warning=sim.drainEvents().find(e=>e.type==='commander');
  assert.deepEqual([warning.change,warning.lane,warning.targetId,warning.releaseTick],['warning',lane,'azure-barracks-0',firstTick]);
  sim.commanderDue(firstTick-1);
  assert.equal(entity(sim,ASSAULT),undefined);
  const regularCount=()=>Object.values(sim.state.units).filter(u=>u.team==='red'&&!u.warlordReinforcement).length;
  for(let i=0;regularCount()<21;i++){
   const id='red-test-'+i;
   sim.state.units[id]=sim.unit(id,'minion-red',600+i*48,792);
  }
  sim.commanderDue(firstTick);
  assert.equal(entity(sim,ASSAULT),undefined);
  delete sim.state.units['red-test-0'];delete sim.state.units['red-test-1'];
  sim.commanderDue(firstTick+1);
  const w=entity(sim,ASSAULT);
  assert.deepEqual([w.hp,w.damage,w.commander.structureBonus,w.commander.keepBonus],[833,80,1,.35]);
  assert.equal(w.commander.lane,lane);
  assert.equal(Object.values(sim.state.units).filter(u=>u.escortOf===ASSAULT).length,2);
  assert.equal(regularCount(),22);
  strike(sim,'guardian',ASSAULT);
  strike(sim,'guardian',dead===north?south.id:north.id);
  sim.drainEvents();
  sim.commanderDue(firstTick+restTicks+warningTicks+1);
  assert.ok(!sim.drainEvents().some(e=>e.type==='commander'));
  assert.equal(entity(sim,ASSAULT),undefined);
 }
});

test('destroying the warned camp redirects the pending raid with a warning from the surviving road',()=>{
 const sim=fixture(),{firstTick,warningTicks,sources}=setup.commanders[0];
 sim.commanderDue(firstTick-warningTicks);
 const original=sim.drainEvents().find(e=>e.type==='commander');
 strike(sim,'guardian',sources[original.lane]);
 sim.commanderDue(firstTick-1);
 const revised=sim.drainEvents().find(e=>e.type==='commander');
 assert.notEqual(revised.lane,original.lane);
 assert.equal(revised.releaseTick,firstTick-1+warningTicks);
 assert.equal(entity(sim,ASSAULT),undefined);
 sim.commanderDue(revised.releaseTick);
 assert.equal(entity(sim,ASSAULT).commander.lane,revised.lane);
});

test('translated arena seals Azure, opens permanently, and preserves recapture and phase positions',()=>{
 const sim=fixture(),boss=entity(sim,BOSS);
 strike(sim,'guardian',FORT);
 const [west,east]=[3120,3168];
 for(const y of [36,432,528,624,720,792,864,960,1056,1152,1548]){
  const from={x:west-55,y},to={x:east+55,y};
  assert.ok(!sim.geo.clearSegment(from,to,sim.hero.radius,structuresFor(sim.state,'blue')),String(y));
 }
 assert.ok(sim.teleportHero(3072,792));
 sim.state.heroProgression.skillPoints=1;
 sim.send({type:'learn',skill:'charge',requestId:'closed-learn'});
 sim.send({type:'cast',skill:'charge',requestId:'closed-charge',direction:{x:1,y:0},distance:144});
 assert.ok(tick(sim,HZ).some(e=>e.type==='cast-effect'&&e.requestId==='closed-charge'));
 assert.ok(sim.hero.x<=west-sim.hero.radius);
 for(const g of gates)assert.equal(entity(sim,g.id).open,undefined);
 const soldier=sim.unit('blue-s-gate-test','minion-blue',3072,792);
 sim.send({type:'tavern',requestId:'roland',action:'hire',merc:'roland'});
 sim.advance(DT);
 const ally=entity(sim,sim.state.tavern.slots.find(slot=>slot.merc==='roland').unitId);
 Object.assign(ally,{x:3072,y:792});
 assert.ok([soldier,ally].every(u=>!sim.navigation.canReachWaypoint(u,{x:3240,y:792},structuresFor(sim.state,'blue'))));
 capture(sim);
 assert.ok([soldier,ally].every(u=>sim.navigation.canReachWaypoint(u,{x:3240,y:792},structuresFor(sim.state,'blue'))));
 assert.ok(gates.every(g=>entity(sim,g.id).open));
 assert.deepEqual(sim.setup.respawnChain[0].candidates,[{x:2904,y:792},{x:2952,y:720},{x:2952,y:864}]);
 const banner=entity(sim,sim.state.post.bannerId);
 strike(sim,BOSS,banner.id);
 assert.ok(tick(sim).some(e=>e.type==='post'&&e.change==='lost'));
 assert.ok(gates.every(g=>entity(sim,g.id).open));
 capture(sim);
 assert.equal(entity(sim,sim.state.post.bannerId).hp,2000);
 strike(sim,BOSS,'guardian');
 sim.hero.respawnTick=sim.clock.tick+1;
 assert.ok(tick(sim).some(e=>e.type==='respawn'&&e.post==='forward'));
 assert.deepEqual([sim.hero.x,sim.hero.y],[2904,792]);
 strike(sim,'guardian',BOSS,5000);
 assert.equal(boss.hp,6336);
 assert.deepEqual(['north','south'].map(l=>[entity(sim,'red-war-banner-'+l).x,entity(sim,'red-war-banner-'+l).y]),[[3528,528],[3528,1056]]);
 assert.equal(Object.values(sim.state.units).filter(u=>u.warlordReinforcement==='iron').length,3);
 for(const lane of ['north','south'])strike(sim,'guardian','red-war-banner-'+lane);
 strike(sim,'guardian',BOSS,4000);
 assert.equal(boss.hp,3168);
 assert.equal(Object.values(sim.state.units).filter(u=>u.warlordReinforcement==='horn').length,4);
 scripted(sim)(sim.clock.tick+1,()=>strike(sim,'guardian',BOSS,5000));
 tick(sim);
 assert.equal(sim.outcome.outcome,'victory');
});

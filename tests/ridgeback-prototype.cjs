const {test}=require('node:test');
const assert=require('node:assert/strict');
const {crimsonReckoningCampaign}=require('../.test-build/data/crimsonReckoningLevels.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {ridgebackLevelId}=require('../.test-build/data/ridgebackPrototype.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {minionStats}=require('../.test-build/data/combat.js');
const {allyKnight}=require('../.test-build/simulation/AllyProbe.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {Navigation}=require('../.test-build/simulation/Navigation.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {canyonBasin,valeSiegeWall}=require('../.test-build/world/battlefield.js');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
const {objective,strike,until}=require('./support/campaignBot.cjs');

const fresh=()=>new Simulation('ridgeback-test',crimsonReckoningCampaign.setup(ridgebackLevelId));
const advance=(sim,ticks)=>until(sim,sim.clock.tick+ticks);
const flag=(sim,post)=>sim.postStates.find(p=>p.id===post);
const point=(x,y)=>({x,y});
function reveal(sim,post){
 for(const id of sim.camps.find(c=>c.id===post).holders)if(sim.state.structures[id])strike(sim,'guardian',id);
 advance(sim,1);
 const banner=sim.state.structures[flag(sim,post).bannerId];
 assert.equal(banner?.team,'red');
 assert.equal(banner.hp,1200);
 return banner;
}
function capture(sim,post){
 const banner=flag(sim,post).bannerId??reveal(sim,post).id;
 strike(sim,'guardian',banner);
 const events=advance(sim,1);
 assert.equal(flag(sim,post).owner,'azure');
 assert.equal(sim.state.structures[flag(sim,post).bannerId].maxHp,1200);
 return events;
}
function respawn(sim,post,destination,contestedPost){
 strike(sim,'red-base','guardian');
 const event=until(sim,sim.hero.respawnTick).find(e=>e.type==='respawn');
 assert.ok(event);
 assert.equal(event.post,post);
 assert.equal(event.contestedPost,contestedPost);
 assert.deepEqual(point(sim.hero.x,sim.hero.y),destination);
}

test('Ridgeback extends Canyon Basin without moving its Keeps',()=>{
 const sim=fresh();
 assert.equal(battlefieldFromSearch('?battlefield=ridgeback',true),'meadow');
 assert.notEqual(sim.field,canyonBasin);
 assert.equal(canyonBasin.barriers.length,5);
 assert.ok(sim.field.barriers.length>canyonBasin.barriers.length);
 const keeps=field=>field.entities.filter(e=>e.kind.startsWith('base'));
 assert.deepEqual(keeps(sim.field),keeps(canyonBasin));
 assert.deepEqual(sim.camps.map(c=>[c.id,c.ring]),[['forest',96],['ridge',96],['camp',96]]);
 assert.deepEqual(sim.setup.respawnChain.map(link=>link.post),['forest','ridge']);
 assert.deepEqual(Object.values(sim.state.units).filter(u=>u.team==='red').map(u=>u.id),['red-hero-ridge','red-hero-camp','red-hero']);
 assert.equal(sim.setup.guard.counterattack,undefined);
 assert.equal(sim.setup.captures,undefined);
 assert.ok(sim.camps.every(c=>!c.ballista));
});

test('both roads have clear paths and reachable attack positions for the Guardian, Hero and soldier',()=>{
 const sim=fresh(),s=sim.state;
 reveal(sim,'forest');
 const blue=structuresFor(s,'blue');
 const wall=s.structures[valeSiegeWall],tower=s.structures['ridgeback-siege-tower'];
 const defenses=Object.values(s.structures).filter(u=>u.team==='red');
 const lanePoints=[
  [point(744,312),point(1128,312),point(1416,312),point(1464,408)],
  [point(744,888),point(1080,888),point(1416,840),point(1464,792)],
 ];
 for(const stats of [sim.hero,{...allyKnight,ally:{order:{type:'follow'},slot:0}},{...minionStats,id:'blue-s-probe',kind:'minion-blue'}]){
  const unit={...sim.hero,...stats,...sim.field.respawn[0]};
  for(const lane of lanePoints){
   const nav=new Navigation(sim.geo);
   const steps=[sim.field.respawn[0],...lane];
   for(let i=1;i<steps.length;i++)assert.ok(nav.canReachWaypoint({...unit,...steps[i-1]},steps[i],blue));
   const route=nav.route({...unit,...lane.at(-1)},{...s.bases['red-base'],invulnerable:false},s,1);
   assert.ok(Number.isFinite(route?.cost)&&!route.breachId,'road can reach the Keep with the wall still standing');
  }
  for(const target of defenses){
   const route=new Navigation(sim.geo).route(unit,target,s,1);
   assert.ok(Number.isFinite(route?.cost)&&!route.breachId,target.id);
   assert.ok(canAttackOn(sim.geo,{...unit,...route.points.at(-1)},target,blue),target.id);
  }
 }
 assert.ok(canAttackOn(sim.geo,tower,{...sim.hero,x:1464,y:792},structuresFor(s,'red')),'the tower covers the southern bypass');
 assert.equal(sim.geo.clearSegment(point(1464,504),point(1464,696),sim.hero.radius,blue),false);
 strike(sim,'guardian',wall.id);
 assert.ok(sim.geo.clearSegment(point(1464,504),point(1464,696),sim.hero.radius,structuresFor(s,'blue')));
});

test('both regular wave slots march through their own road and threaten the Forest Banner',()=>{
 const sim=fresh(),s=sim.state;
 const firstWave=sim.encounter.spawns.filter(e=>e.wave===1&&e.team==='red');
 assert.equal(firstWave.length,6);
 assert.equal(firstWave.filter(e=>e.archetype==='crimson-elite').length,1);
 assert.equal(sim.encounter.caps.red,19);
 capture(sim,'forest');
 const banner=flag(sim,'forest').bannerId;
 const crossings=new Set(),hits=new Set();
 until(sim,55*30,[],()=>{
  assert.ok(Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0).length<=20);
  for(const u of Object.values(s.units)){
   if(!u.id.startsWith('red-w1-')||u.x<912||u.x>1344)continue;
   const north=Number(u.id.split('-').at(-1))%2===0;
   assert.ok(north?u.y<432:u.y>768);
   crossings.add(north?'north':'south');
  }
 }).forEach(e=>{
  if(e.type==='damage'&&e.id===banner&&e.sourceId.startsWith('red-w1-'))hits.add(Number(e.sourceId.split('-').at(-1))%2===0?'north':'south');
 });
 assert.deepEqual([...crossings].sort(),['north','south']);
 assert.deepEqual([...hits].sort(),['north','south']);
});

test('the late waves substitute a fourth Elite into the same wave budget and cadence',()=>{
 const rules=fresh().setup.waveRules;
 for(const [i,total] of [6,7,7,8,8,9,9,9].entries()){
  const wave=extendedWaveSpawns(i+1,rules).filter(e=>e.team==='red');
  assert.equal(wave.length,total);
  assert.equal(wave[0].tick,450+i*720);
  assert.equal(wave.filter(e=>e.archetype==='crimson-elite').length,[1,2,2,2,4,4,4,4][i]);
 }
 assert.deepEqual(rules.caps,{red:19,blue:16});
});

test('the one-shot Ridge counterattack reaches Forest, and an allied Hero on Defend engages it',()=>{
 for(const defend of [false,true]){
  const sim=fresh(),s=sim.state;
  for(const id of ['blue-0','blue-1','blue-2'])delete s.units[id]; // Isolate the post fight after the opening vanguard.
  capture(sim,'forest');
  const forest=flag(sim,'forest').bannerId;
  let ally;
  if(defend){
   sim.send({type:'place',kind:'tavern',col:10,row:10,requestId:'tavern'});
   advance(sim,180);
   assert.ok(sim.tavernStanding());
   sim.send({type:'tavern',action:'hire',merc:'borin',requestId:'hire'});
   advance(sim,1);
   ally=s.tavern.slots[0].unitId;
   sim.send({type:'ally',id:ally,order:{type:'defend',x:648,y:600},requestId:'hold-forest'});
   assert.ok(advance(sim,1).some(e=>e.type==='ally-order'));
  }
  assert.ok(sim.teleportHero(1176,240));
  const log=capture(sim,'ridge').concat(advance(sim,14*30)),raid=id=>id?.startsWith('red-ca-ridge-');
  assert.equal(log.filter(e=>e.type==='spawn'&&raid(e.id)).length,3);
  if(defend)assert.ok(log.some(e=>e.type==='damage'&&e.sourceId===ally&&raid(e.id)));
  else assert.ok(log.some(e=>e.type==='damage'&&e.id===forest&&raid(e.sourceId)));
  strike(sim,'red-base',flag(sim,'ridge').bannerId);
  advance(sim,1);
  capture(sim,'ridge');
  assert.equal(advance(sim,120).filter(e=>e.type==='spawn'&&raid(e.id)).length,0);
 }
});

test('Forest loss cuts the chain until recaptured, with sticky objectives and an unshielded Keep',()=>{
 const {match:{overrides},mission}=crimsonReckoningCampaign.get(ridgebackLevelId);
 const sim=new Simulation('ridgeback-recovery',matchSetup('extended',{...overrides,mission,waves:{...overrides.waves,firstWaveTick:30000}}));
 const s=sim.state,[forest,ridge]=sim.setup.respawnChain;
 for(const id of ['blue-0','blue-1','blue-2'])delete s.units[id];
 for(const id of ['red-hero-ridge','red-hero-camp'])strike(sim,'guardian',id);
 capture(sim,'forest');
 capture(sim,'ridge');
 for(const id of ['red-ca-ridge-0','red-ca-ridge-1','red-ca-ridge-2']){
  delete s.units[id];
  const queued=sim.spawnQueue.findIndex(e=>e.id===id);
  if(queued>=0)sim.spawnQueue.splice(queued,1);
 }
 assert.match(sim.placementReason('barracks',20,18),/Capture/);
 capture(sim,'camp');
 assert.equal(sim.placementReason('barracks',20,18),'');
 respawn(sim,'ridge',ridge.candidates[0]);
 const enemy=sim.unit('red-contender','minion-red',1176,216);
 enemy.statuses=[{type:'stun',expiresTick:sim.clock.tick+1000}];
 s.units[enemy.id]=enemy;
 respawn(sim,'forest',forest.candidates[0],'ridge');
 strike(sim,'red-base',flag(sim,'forest').bannerId);
 advance(sim,1);
 assert.ok(objective(sim,'forest').complete);
 assert.equal(flag(sim,'ridge').owner,'azure');
 assert.ok(!s.bases['red-base'].invulnerable);
 respawn(sim,undefined,sim.field.respawn[0]);
 capture(sim,'forest');
 delete s.units[enemy.id];
 respawn(sim,'ridge',ridge.candidates[0]);
 strike(sim,'red-base','guardian');
 const due=sim.hero.respawnTick;
 until(sim,due-1);
 sim.send({type:'buy-item',itemId:'iron-sword',heroId:'guardian',matchId:s.inventory.matchId,requestId:'trade'});
 const events=advance(sim,1);
 assert.ok(events.some(e=>e.type==='item-traded'));
 assert.equal(events.find(e=>e.type==='respawn')?.post,undefined);
 assert.deepEqual(point(sim.hero.x,sim.hero.y),sim.field.respawn[0]);
 assert.equal(sim.guardianRespawnAtKeep,false);
 strike(sim,'guardian','red-base');
 advance(sim,1);
 assert.equal(sim.outcome?.outcome,'victory');
});

test('the Keep must survive until all three first captures, and a lost post never resets the shield',()=>{
 for(const order of [['forest','camp','ridge'],['forest','ridge','camp']]){
  const sim=fresh(),s=sim.state,keep=s.bases['red-base'],keepHp=keep.hp;
  assert.ok(sim.teleportHero(1632,order[1]==='camp'?720:480));
  assert.equal(keep.invulnerable,true);
  for(const post of order.slice(0,2))capture(sim,post);
  assert.equal(keep.invulnerable,true);
  assert.equal(objective(sim,'keep').progress,0);
  assert.equal(canAttackOn(sim.geo,sim.hero,keep,structuresFor(s,'blue')),false);
  strike(sim,'guardian',keep.id);
  const shielded=advance(sim,1);
  assert.ok(shielded.some(e=>e.type==='post'&&e.change==='shielded'));
  assert.ok(!shielded.some(e=>e.type==='death'&&e.id===keep.id));
  assert.equal(keep.hp,keepHp);
  assert.strictEqual(s.bases['red-base'],keep);
  assert.equal(sim.ended,false);
  if(order[1]==='ridge'){
   strike(sim,'red-base',flag(sim,'forest').bannerId);
   advance(sim,1);
  }
  capture(sim,order[2]);
  assert.equal(keep.invulnerable,undefined);
  if(order[1]==='camp'){
   strike(sim,'red-base',flag(sim,'forest').bannerId);
   advance(sim,1);
  }
  assert.equal(flag(sim,'forest').owner,'crimson');
  assert.ok(objective(sim,'forest').complete);
  assert.equal(keep.invulnerable,undefined);
  assert.equal(canAttackOn(sim.geo,sim.hero,keep,structuresFor(s,'blue')),true);
  strike(sim,'guardian',keep.id);
  const events=advance(sim,1);
  assert.equal(keep.hp,0);
  assert.deepEqual(events.filter(e=>e.type==='death'&&e.id===keep.id||e.type==='match-end').map(e=>e.type),['death','match-end']);
  assert.equal(sim.outcome?.outcome,'victory');
 }
});

test('each Barracks loses only its own queued and future slot share, independently of the Ridge counter',()=>{
 for(const [barracks,expected] of [['red-barracks-ridgeback',1],['red-barracks-ridgeback-south',0]]){
  const sim=fresh(),s=sim.state;
  for(const id of ['blue-0','blue-1','blue-2'])delete s.units[id];
  capture(sim,'forest');
  const first=advance(sim,sim.setup.waveRules.firstWaveTick).find(e=>e.type==='spawn'&&e.id.startsWith('red-w1-'));
  assert.ok(first&&s.units[first.id]);
  strike(sim,'guardian',barracks);
  const log=capture(sim,'ridge').concat(advance(sim,34*30));
  for(const wave of [1,2]){
   const slots=log.filter(e=>e.type==='spawn'&&e.id.startsWith('red-w'+wave+'-')).map(e=>Number(e.id.split('-').at(-1))%2);
   assert.ok(slots.length>=2);
   assert.ok(slots.every(slot=>slot===expected));
  }
  assert.equal(log.filter(e=>e.type==='spawn'&&e.id.startsWith('red-ca-ridge')).length,3);
 }
});

test('the Keep Warden engages a Guardian at the siege and returns once per defeat on its guard anchor',()=>{
 const sim=fresh(),s=sim.state;
 assert.ok(sim.teleportHero(1512,504));
 assert.ok(advance(sim,4*30).some(e=>e.type==='damage'&&e.id==='guardian'&&e.sourceId==='red-hero'));
 strike(sim,'guardian','red-hero');
 assert.ok(sim.teleportHero(456,600));
 assert.equal(sim.setup.guard.respawnTicks,80*30);
 const due=sim.clock.tick+80*30;
 assert.ok(!until(sim,due-1).some(e=>e.type==='spawn'&&e.id==='red-hero'));
 assert.ok(until(sim,due+10).some(e=>e.type==='spawn'&&e.id==='red-hero'));
 assert.equal(Object.values(s.units).filter(u=>u.id==='red-hero').length,1);
 assert.deepEqual(point(s.units['red-hero'].x,s.units['red-hero'].y),point(...sim.setup.guard.anchor));
});

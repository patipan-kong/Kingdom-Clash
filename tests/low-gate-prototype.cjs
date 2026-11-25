const {test}=require('node:test');
const assert=require('node:assert/strict');
const {lowGateLevelId}=require('../.test-build/data/lowGatePrototype.js');
const {crimsonReckoningCampaign}=require('../.test-build/data/crimsonReckoningLevels.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {crimsonHero,heroId}=require('../.test-build/data/combat.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {Navigation}=require('../.test-build/simulation/Navigation.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {valeLowGate,valeSiegeWall}=require('../.test-build/world/battlefield.js');
const {isFrostGate}=require('../.test-build/world/frostGateAppearance.js');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
const {strike,until}=require('./support/campaignBot.cjs');

const fresh=(id=lowGateLevelId)=>new Simulation('serpent-vale',crimsonReckoningCampaign.setup(id));
const advance=(sim,ticks)=>until(sim,sim.clock.tick+ticks);
const at=(sim,x,y)=>assert.ok(sim.teleportHero(x,y),`open ground at ${x}, ${y}`);
function hollowWithoutRegularWaves(keepRaider){
 const {match:{overrides},mission}=crimsonReckoningCampaign.get('campaign-52');
 const posts=overrides.posts.map(post=>({...post,counter:{count:0,slots:[]}}));
 return new Simulation('hollow-hero-test',matchSetup('extended',{
  ...overrides,posts,hero:keepRaider?overrides.hero:undefined,waves:{...overrides.waves,firstWaveTick:30*60*30},mission,
 }));
}

function lowGateWithoutRegularWaves(){
 const {match:{overrides},mission}=crimsonReckoningCampaign.get(lowGateLevelId);
 const posts=overrides.posts.map(post=>({...post,counter:{count:0,slots:[]}}));
 return new Simulation('yard-raid-test',matchSetup('extended',{
  ...overrides,posts,waves:{...overrides.waves,firstWaveTick:20000},mission,
 }));
}

function capturePost(sim,index){
 const post=sim.camps[index];
 for(const id of post.holders)if(sim.state.structures[id])strike(sim,'guardian',id);
 const {x,y}=[{x:984,y:912},{x:1008,y:336},{x:1368,y:216}][index];
 at(sim,x,y);
 const log=advance(sim,1);
 const banner=sim.state.structures[sim.postStates[index].bannerId];
 assert.equal(banner?.team,'red');
 strike(sim,'guardian',banner.id);
 until(sim,sim.clock.tick+1,log);
 assert.equal(sim.postStates[index].owner,'azure');
 return log;
}

function respawn(sim,point,post,contestedPost){
 strike(sim,'red-base','guardian');
 sim.hero.respawnTick=sim.clock.tick+1;
 const event=advance(sim,1).find(e=>e.type==='respawn');
 assert.ok(event);
 assert.equal(event.post,post);
 assert.equal(event.contestedPost,contestedPost);
 assert.deepEqual([sim.hero.x,sim.hero.y],[point.x,point.y]);
 assert.equal(sim.hero.protectionTick,sim.clock.tick+60);
}

test('Serpent Vale keeps contested forward respawn scoped to its campaign setups and stays out of quick battlefield launch',()=>{
 for(const id of [51,52,53])assert.equal(crimsonReckoningCampaign.setup(id).contestForwardRespawn,true);
 for(const id of [31,35,41,45])assert.equal(campaign.setup(id).contestForwardRespawn,undefined);
 for(const field of ['serpent-vale','serpent-vale-sealed','serpent-vale-intro']){
  assert.equal(battlefieldFromSearch(`?battlefield=${field}`,true),'meadow');
 }
 const sim=fresh();
 assert.equal(sim.field.id,'serpent-vale');
 assert.equal(sim.state.bases['red-base'].invulnerable,undefined);
 assert.deepEqual(sim.setup.respawnChain.map(link=>link.post),['forest','camp','outpost']);
});

test('every authored Chapter 6 post requires Banner destruction, and each flip creates one new Banner life',()=>{
 for(const [level,ids] of [[51,['forest','camp']],[52,['forest','camp','outpost']],[53,['forest','camp','outpost']]]){
  const sim=fresh(`campaign-${level}`),s=sim.state;
  s.autoAttack=false;
  assert.deepEqual(sim.postStates.map(p=>p.id),ids);
  advance(sim,1);
  for(const [index,post] of sim.postStates.entries()){
   const c=sim.camps[index];
   assert.equal(post.bannerId,undefined,'holders prevent Crimson Banner creation');
   for(const id of c.holders.slice(0,-1))strike(sim,'guardian',id);
   advance(sim,1);
   assert.equal(post.bannerId,undefined,'one surviving holder is enough');
   strike(sim,'guardian',c.holders.at(-1));
   advance(sim,1);
   assert.equal(s.structures[post.bannerId]?.team,'red','no Guardian or Hero in the ring is required');
   at(sim,...[[984,912],[1008,336],[1368,216]][index]);
   advance(sim,c.raiseTicks+2);
   const red=s.structures[post.bannerId];
   assert.deepEqual([post.owner,post.captured,red.team,red.hp,red.maxHp,red.progress],['crimson',false,'red',1200,1200,1]);
   assert.equal(isFrostGate(red),false);
   sim.send({type:'target',id:red.id});
   advance(sim,1);
   assert.equal(s.selectedTarget,red.id);
   strike(sim,'guardian',red.id,1199);
   advance(sim,1);
   assert.equal(post.owner,'crimson');
   strike(sim,'guardian',red.id,1);
   const captured=advance(sim,1).find(e=>e.type==='post'&&e.camp===post.id);
   const blue=s.structures[post.bannerId];
   assert.equal(captured?.first,true);
   assert.deepEqual([post.owner,post.captured,blue.team,blue.hp,blue.maxHp,blue.progress],['azure',true,'blue',1200,1200,1]);
   assert.equal(s.selectedTarget,undefined);
   strike(sim,'red-base',blue.id);
   assert.ok(advance(sim,1).some(e=>e.type==='post'&&e.camp===post.id&&e.change==='lost'));
   const rebuilt=s.structures[post.bannerId];
   assert.deepEqual([post.owner,post.captured,post.losses,rebuilt.team,rebuilt.hp],['crimson',true,1,'red',1200]);
   assert.equal(new Set([red.id,blue.id,rebuilt.id]).size,3);
   assert.deepEqual(Object.values(s.structures).filter(b=>b.banner&&b.x===c.flag.x&&b.y===c.flag.y).map(b=>b.id),[rebuilt.id]);
   strike(sim,'guardian',rebuilt.id);
   const retake=advance(sim,1).find(e=>e.type==='post'&&e.camp===post.id);
   assert.equal(retake?.change,'captured');
   assert.equal(retake.first,undefined);
  }
 }
});

test('Guardian, allied Hero and Barracks soldier deal real damage to Crimson Banners',()=>{
 for(const attacker of ['guardian','ally','soldier']){
  const sim=lowGateWithoutRegularWaves(),s=sim.state;
  strike(sim,'guardian','vale-forest-tower');
  advance(sim,1);
  const post=sim.postStates[0],banner=s.structures[post.bannerId];
  let actor=sim.hero.id;
  if(attacker==='guardian'){
   at(sim,984,912);
   sim.send({type:'target',id:banner.id});
  }else{
   s.autoAttack=false;
   at(sim,936,912);
   if(attacker==='ally'){
    actor=sim.spawnAlly(984,936);
    assert.ok(actor);
    sim.send({type:'ally',id:actor,requestId:'attack-banner',order:{type:'attack',targetId:banner.id}});
   }else{
    actor='blue-s-banner-test';
    sim.spawnSoldier(actor,984,936);
   }
  }
  const log=advance(sim,attacker==='soldier'?2000:1000);
  assert.ok(log.some(e=>e.type==='damage'&&e.sourceId===actor&&e.id===banner.id&&e.amount>0),attacker);
  assert.ok(log.some(e=>e.type==='death'&&e.sourceId===actor&&e.id===banner.id),attacker);
  assert.equal(post.owner,'azure');
  assert.notEqual(s.units[actor].targetId,banner.id);
  assert.notEqual(s.units[actor].strike?.targetId,banner.id);
  if(attacker==='ally')assert.equal(s.units[actor].ally.order.type,'defend');
 }
});

test('Azure Watchtower, Ballista and Keep cannot capture a Crimson Banner in firing range',()=>{
 const sim=lowGateWithoutRegularWaves(),s=sim.state;
 strike(sim,'guardian','vale-forest-tower');
 advance(sim,1);
 const post=sim.postStates[0],banner=s.structures[post.bannerId];
 const defences=[['watchtower',936,936],['ballista',1032,936],['blue-base',984,864]];
 for(const [id,x,y] of defences){
  const tower=id==='blue-base'?s.bases[id]:(s.structures[id]={...sim.defender(id,'tower',x,y),team:'blue',...(id==='ballista'&&{ballista:true})});
  Object.assign(tower,{x,y,range:200,damage:999});
  if(id==='blue-base')sim.keepTargeting[id]='nearest';
  assert.ok(canAttackOn(sim.geo,tower,{...banner,banner:undefined}),'the equivalent ordinary target is in range');
  assert.equal(canAttackOn(sim.geo,tower,banner),false);
  strike(sim,id,banner.id);
 }
 const log=advance(sim,90);
 assert.ok(!log.some(e=>(e.type==='attack'&&e.targetId===banner.id)||(e.type==='damage'&&e.id===banner.id)));
 assert.equal(banner.hp,1200);
 assert.equal(post.owner,'crimson');
});

test('M1 requires Forest, Camp and the Crimson Keep, with a one-time counterattack from the north road',()=>{
 const sim=fresh('campaign-51'),s=sim.state,keep=s.bases['red-base'];
 assert.equal(s.structures[valeLowGate],undefined);
 assert.ok(sim.geo.blocked(1248,792,sim.hero.radius));
 assert.equal(sim.inTerritory(1464,216),false,'M1 has no Outpost build territory');
 assert.equal(sim.missionStatus().activePhase,'foothold');
 strike(sim,'guardian','red-base');
 assert.equal(keep.hp,keep.maxHp,'the Keep is shielded until both posts are held');
 const forestCounter=capturePost(sim,0);
 forestCounter.push(...advance(sim,5));
 assert.ok(forestCounter.some(e=>e.type==='spawn'&&e.id==='red-ca-forest-0'));
 assert.equal(sim.missionStatus().activePhase,'advance');
 respawn(sim,sim.setup.respawnChain[0].candidates[0],'forest');
 const log=until(sim,sim.setup.waveRules.firstWaveTick+100);
 assert.deepEqual(log.filter(e=>e.type==='spawn'&&e.id.startsWith('red-w')).map(e=>e.id),['red-w1-0','red-w1-1','red-w1-2','red-w1-3']);
 const raid=capturePost(sim,1);
 assert.equal(sim.ended,false,'capturing both posts alone does not win');
 assert.equal(sim.missionStatus().activePhase,'assault');
 assert.ok(!keep.invulnerable);
 for(const [x,y] of sim.camps[1].counter.slots){
  assert.ok(x>sim.camps[1].flag.x,'Camp counterattack comes from the east road');
  assert.ok(!sim.geo.blocked(x,y,12,structuresFor(s,'red')));
 }
 raid.push(...advance(sim,90));
 const campElites=['red-ca-camp-0','red-ca-camp-1','red-ca-camp-2'];
 assert.deepEqual(raid.filter(e=>e.type==='spawn'&&e.id.startsWith('red-ca-camp-')).map(e=>e.id),campElites);
 for(const id of campElites)if(s.units[id])strike(sim,'guardian',id);
 strike(sim,'red-base',sim.postStates[1].bannerId);
 advance(sim,2);
 assert.ok(keep.invulnerable,'losing Camp restores the shield');
 const retake=capturePost(sim,1);
 retake.push(...advance(sim,60));
 assert.ok(!retake.some(e=>e.type==='spawn'&&e.id.startsWith('red-ca-')));
 assert.ok(sim.isRespawnContested(0)&&sim.isRespawnContested(1),'the original Forest counterattack and the Camp troops are still present');
 respawn(sim,sim.field.respawn[0],undefined,'camp');
 strike(sim,'guardian','red-base');
 advance(sim,2);
 assert.equal(sim.outcome?.outcome,'victory');
 assert.equal(keep.hp,0);
});

test('M1’s Warden fights at Camp and returns only once to guard the Keep during the assault',()=>{
 const sim=fresh('campaign-51'),s=sim.state,warden=s.units[heroId];
 assert.deepEqual(Object.values(s.units).filter(u=>u.archetype==='crimson-hero').map(u=>u.id),[heroId]);
 assert.deepEqual([warden.x,warden.y],[1080,312]);
 assert.equal(warden.maxHp,crimsonHero.stats.maxHp);
 assert.ok(!sim.geo.blocked(warden.x,warden.y,warden.radius,structuresFor(s,'red')));
 assert.ok(new Navigation(sim.geo).canReachWaypoint(sim.hero,warden,structuresFor(s,'blue')));

 capturePost(sim,0);
 for(const id of sim.camps[1].holders)strike(sim,'guardian',id);
 at(sim,1008,504);
 advance(sim,12);
 assert.deepEqual([warden.x,warden.y],[1080,312],'the Warden holds Camp while the Guardian is outside his guard radius');
 sim.send({type:'target',id:heroId});
 sim.send({type:'move',x:0,y:-1});
 const duel=advance(sim,15);
 sim.send({type:'move',x:0,y:0});
 duel.push(...advance(sim,400));
 assert.ok(duel.some(e=>e.type==='damage'&&e.sourceId===heroId&&e.id==='guardian'),'the Warden lands a hit on the Camp approach');
 assert.ok(duel.some(e=>e.type==='damage'&&e.sourceId==='guardian'&&e.id===heroId),'the Guardian can hit back from the road');
 assert.ok(duel.some(e=>e.type==='death'&&e.id===heroId));

 const beforeAssault=advance(sim,sim.camps[1].hero.respawnTicks+1);
 assert.ok(!beforeAssault.some(e=>e.type==='spawn'&&e.id===heroId));
 assert.equal(s.units[heroId],undefined,'the Warden waits for the final assault');
 const assault=capturePost(sim,1);
 assault.push(...advance(sim,3));
 assert.equal(assault.filter(e=>e.type==='spawn'&&e.id===heroId).length,1);
 const returned=s.units[heroId];
 assert.deepEqual([returned.x,returned.y],[1656,456]);
 assert.ok(new Navigation(sim.geo).canReachWaypoint(sim.hero,returned,structuresFor(s,'blue')));
 assert.deepEqual(s.guard.anchor,{x:1656,y:456});
 strike(sim,'guardian',heroId);
 at(sim,456,600);
 const returnWindow=sim.clock.tick+1500;
 const later=until(sim,returnWindow);
 assert.equal(sim.clock.tick,returnWindow);
 assert.ok(!later.some(e=>e.type==='spawn'&&(e.id===heroId||e.id==='red-raider')));
 assert.equal(s.units[heroId],undefined);
});

test('M1 substitutes Elites into the regular waves without increasing their size',()=>{
 const sim=fresh('campaign-51');
 for(const [i,elites] of [0,0,1,1,2,2,2].entries()){
  const wave=extendedWaveSpawns(i+1,sim.setup.waveRules).filter(e=>e.team==='red');
  assert.equal(wave.length,[4,4,5,5,6,6,6][i]);
  assert.equal(wave.filter(e=>e.archetype==='crimson-elite').length,elites);
  for(const {x,y} of wave)assert.ok(!sim.geo.blocked(x,y,12,structuresFor(sim.state,'red')));
 }
});

test('M2 sends one Hollow raid against Camp, unlocks the Ballista and finishes at the Crimson Keep',()=>{
 const sim=fresh('campaign-52'),s=sim.state,keep=s.bases['red-base'];
 assert.ok(sim.geo.blocked(1248,792,sim.hero.radius));
 assert.ok(keep.invulnerable);
 assert.deepEqual(sim.ballistaRuin,{col:31,row:6},'the repair card can find the Outpost ruin');
 assert.match(sim.placementReason('ballista',31,6),/Capture/);
 assert.equal(sim.placementReason('ballista',30,6),'Not a Ballista ruin');
 capturePost(sim,0);
 strike(sim,'guardian','red-hero-camp');
 assert.equal(sim.repairSite('tower',22,8),false);
 assert.equal(sim.missionStatus().activePhase,'advance');
 const raid=capturePost(sim,1);
 assert.equal(sim.repairSite('tower',22,8),true);
 assert.equal(sim.missionStatus().activePhase,'siege-position');
 assert.ok(!sim.geo.blocked(840,168,12,structuresFor(s,'red')));
 at(sim,456,600);
 raid.push(...advance(sim,250));
 const campBanner=sim.postStates[1].bannerId;
 assert.deepEqual(raid.filter(e=>e.type==='spawn'&&e.id.startsWith('red-ca-camp-')).map(e=>e.id),['red-ca-camp-0','red-ca-camp-1','red-ca-camp-2']);
 assert.ok(raid.some(e=>e.type==='attack'&&e.id.startsWith('red-ca-camp-')&&e.targetId===campBanner));
 for(const id of ['red-ca-camp-0','red-ca-camp-1','red-ca-camp-2'])if(s.units[id])strike(sim,'guardian',id);
 strike(sim,'red-base',campBanner);
 advance(sim,2);
 assert.equal(sim.postStates[1].owner,'crimson');
 const retake=capturePost(sim,1);
 retake.push(...advance(sim,36));
 assert.ok(!retake.some(e=>e.type==='spawn'&&e.id.startsWith('red-ca-')));
 assert.equal(sim.postStates[1].owner,'azure');
 capturePost(sim,2);
 assert.equal(sim.repairSite('ballista',31,6),true);
 assert.equal(sim.placementReason('ballista',31,6),'');
 const quote=sim.repairPrice('ballista');
 assert.deepEqual([quote.wood,quote.iron],[84,18]);
 assert.equal(sim.missionStatus().activePhase,'assault');
 assert.ok(!keep.invulnerable);
 respawn(sim,sim.setup.respawnChain[2].candidates[0],'outpost');
 strike(sim,'guardian','red-base');
 advance(sim,2);
 assert.equal(sim.outcome?.outcome,'victory');
});

test('the repaired Camp Watchtower engages the Hollow raid while the Guardian is away',()=>{
 const sim=fresh('campaign-52');
 capturePost(sim,0);
 strike(sim,'guardian','red-hero-camp');
 capturePost(sim,1);
 sim.send({type:'place',requestId:'watchtower',kind:'tower',col:22,row:8});
 at(sim,456,600);
 const log=advance(sim,1300);
 assert.ok(log.some(e=>e.type==='construction-complete'&&e.id==='built-watchtower'));
 assert.ok(log.some(e=>e.type==='attack'&&e.targetId.startsWith('red-ca-camp-')&&e.id==='built-watchtower'));
});

test('M2 skips every fourth free Azure reinforcement and preserves the existing spawn rotation',()=>{
 const {waveRules}=fresh('campaign-52').setup;
 const waves=Array.from({length:12},(_,i)=>extendedWaveSpawns(i+1,waveRules));
 const blue=waves.flat().filter(e=>e.team==='blue');
 assert.deepEqual(blue.map(e=>e.wave),[1,2,3,5,6,7,9,10,11]);
 assert.deepEqual(blue.map(e=>[e.x,e.y]),blue.map((_,i)=>waveRules.blueSlots[i%waveRules.blueSlots.length]));
 assert.deepEqual(waves.map(w=>w.filter(e=>e.team==='red').length),[5,5,6,6,7,7,7,7,7,7,7,7]);
});

test('Wolf Hollow fields three distinct Wardens with regular waves at the existing Outpost release',()=>{
 const sim=fresh('campaign-52'),s=sim.state;
 const livingWardens=()=>Object.values(s.units).filter(u=>u.hp>0&&u.id.startsWith('red-hero-')).map(u=>u.id).sort();
 assert.deepEqual(livingWardens(),['red-hero-camp','red-hero-forest']);
 const due=sim.camps[2].hero.delayTicks;
 until(sim,due-1);
 assert.deepEqual(livingWardens(),['red-hero-camp','red-hero-forest']);
 assert.equal(due,70*30);
 assert.ok(advance(sim,1).some(e=>e.type==='spawn'&&e.id==='red-hero-outpost'));
 assert.deepEqual(livingWardens(),['red-hero-camp','red-hero-forest','red-hero-outpost']);
});

test('the Forest Warden engages on the Guardian’s normal approach',()=>{
 const sim=hollowWithoutRegularWaves(false),warden='red-hero-forest';
 sim.state.autoAttack=false;
 at(sim,912,960);
 const log=advance(sim,90);
 assert.ok(log.some(e=>e.type==='damage'&&e.sourceId===warden&&e.id==='guardian'));
});

test('all three M2 Wardens repeatedly respawn only at their own Crimson posts and resume after recapture',()=>{
 const sim=hollowWithoutRegularWaves(false);
 const s=sim.state,ids=['red-hero-forest','red-hero-camp','red-hero-outpost'],spots=[[1032,936],[1080,312],[1464,264]],nav=new Navigation(sim.geo);
 const spawns=(log,id)=>log.filter(e=>e.type==='spawn'&&e.id===id);
 assert.deepEqual(sim.camps.map(c=>c.hero.respawnTicks),[65*30,65*30,85*30]);
 until(sim,sim.camps[2].hero.delayTicks);
 for(const [i,id] of ids.entries()){
  const warden=s.units[id],delay=sim.camps[i].hero.respawnTicks;
  assert.deepEqual([warden.x,warden.y],spots[i]);
  assert.ok(nav.canReachWaypoint(sim.hero,warden,structuresFor(s,'blue')));
  for(let life=0;life<2;life++){
   strike(sim,'guardian',id);
   assert.equal(spawns(advance(sim,delay-1),id).length,0);
   assert.equal(spawns(advance(sim,1),id).length,1);
   assert.equal(spawns(advance(sim,5),id).length,0,'a living Warden never spawns again');
  }
 }

 for(const [i,id] of ids.entries()){
  strike(sim,'guardian',id);
  capturePost(sim,i);
  at(sim,456,600);
  assert.equal(spawns(advance(sim,sim.camps[i].hero.respawnTicks+5),id).length,0,`${id} waits while Azure holds its post`);
  assert.equal(sim.postStates[i].owner,'azure');
  strike(sim,'red-base',sim.postStates[i].bannerId);
  assert.equal(spawns(advance(sim,5),id).length,1,'the elapsed cooldown is eligible again after banner loss');
  assert.equal(sim.postStates[i].owner,'crimson');
  assert.equal(spawns(advance(sim,5),id).length,0);
 }
});

test('the timed Wolf Hollow Raider still attacks an Azure Banner and can return it to Crimson',()=>{
 const sim=hollowWithoutRegularWaves(true),s=sim.state,raider='red-raider';
 capturePost(sim,0);
 strike(sim,'guardian','red-hero-camp');
 capturePost(sim,1);
 at(sim,456,600);
 const due=sim.setup.hero.delayTicks;
 const log=until(sim,due);
 assert.ok(log.some(e=>e.type==='spawn'&&e.id===raider));
 assert.deepEqual([s.units[raider].x,s.units[raider].y],[840,168]);
 const banner=sim.postStates[1].bannerId;
 s.structures[banner].hp=1;
 log.push(...advance(sim,1200));
 assert.ok(log.some(e=>e.type==='death'&&e.sourceId===raider&&e.id===banner));
 assert.ok(log.some(e=>e.type==='post'&&e.change==='lost'&&e.camp==='camp'));
});

test('living M2 Wardens hunt their own Banner after capture and can retake the post',()=>{
 const sim=hollowWithoutRegularWaves(false),s=sim.state;
 // Hold both defenders away from the flags until their posts flip to Azure.
 capturePost(sim,0);
 advance(sim,sim.camps[2].hero.delayTicks);
 const wardens=['red-hero-camp','red-hero-outpost'].map(id=>s.units[id]);
 for(const [i,warden] of wardens.entries()){
  for(const id of sim.camps[i+1].holders)strike(sim,'guardian',id);
  warden.x=warden.x+96;
  warden.statuses=[{type:'stun',expiresTick:sim.clock.tick+120}];
  capturePost(sim,i+1);
  assert.equal(sim.postStates[i+1].owner,'azure');
  const banner=s.structures[sim.postStates[i+1].bannerId];
  banner.hp=1;
  at(sim,456,600);
  const log=advance(sim,180);
  assert.ok(log.some(e=>e.type==='death'&&e.sourceId===warden.id&&e.id===banner.id));
  assert.equal(sim.postStates[i+1].owner,'crimson');
 }
});

test('the Low Gate opens to both factions, reroutes all wave slots, and repairs into an Azure door',()=>{
 const sim=fresh(),s=sim.state,nav=new Navigation(sim.geo),capture=sim.setup.captures[0];
 sim.state.autoAttack=false;
 capturePost(sim,0);
 const forest=s.structures[sim.postStates[0].bannerId];
 const crossing=team=>sim.geo.clearSegment({x:1152,y:792},{x:1368,y:792},sim.hero.radius,structuresFor(s,team));
 const waveRoads=()=>sim.setup.waveRules.redSlots.map(([x,y],i)=>{
  const soldier=sim.unit(`red-probe-${i}`,'minion-red',x,y);
  nav.begin(s);
  const route=nav.route(soldier,forest,s,sim.clock.tick);
  assert.ok(route.points.length);
  return route.points.some(p=>p.x>=1200&&p.x<1344&&p.y>=720&&p.y<864);
 });
 assert.deepEqual([crossing('blue'),crossing('red')],[false,false]);
 assert.deepEqual(waveRoads(),[false,false,false]);
 const closedVersion=nav.version;
 for(const id of capture.holders)if(s.structures[id])strike(sim,'guardian',id);
 at(sim,1160,792);
 assert.ok(advance(sim,capture.captureTicks).some(e=>e.type==='site'&&e.change==='captured'&&e.id===valeLowGate));
 assert.deepEqual([crossing('blue'),crossing('red')],[true,true]);
 advance(sim,31); // a valid cached route can wait for its normal retry
 assert.deepEqual(waveRoads(),[true,true,true]);
 assert.ok(nav.version>closedVersion);
 const openedVersion=nav.version;
 advance(sim,capture.repair.ticks);
 assert.equal(s.captures[valeLowGate].stage,'azure');
 assert.deepEqual([crossing('blue'),crossing('red')],[true,false]);
 assert.deepEqual(waveRoads(),[false,false,false]);
 assert.ok(nav.version>openedVersion);
});

test('destruction leaves a permanent breach and does not seal either Keep approach',()=>{
 const sim=fresh(),s=sim.state,nav=new Navigation(sim.geo);
 const view=()=>structuresFor(s,'blue');
 const north={x:1608,y:504},south={x:1608,y:744};
 assert.ok(nav.canReachWaypoint(sim.hero,north,view()));
 strike(sim,'guardian',valeLowGate);
 advance(sim,2);
 assert.equal(s.captures[valeLowGate].stage,'lost');
 assert.ok(sim.geo.clearSegment({x:1152,y:792},{x:1368,y:792},sim.hero.radius,view()));
 assert.ok(nav.canReachWaypoint(sim.hero,south,view()));
 at(sim,1160,792);
 advance(sim,300);
 assert.equal(s.structures[valeLowGate],undefined);
});

test('the Keep wall closes the direct southern passage under tower fire, with a way around and an open north approach',()=>{
 const sim=fresh(),s=sim.state,wall=s.structures[valeSiegeWall],tower=s.structures['vale-keep-breach'],barracks=s.structures['red-barracks-keep'];
 const structures=()=>structuresFor(s,'blue');
 for(const building of [wall,tower,barracks]){
  const halfW=(building.columns??1)*24,halfH=(building.rows??1)*24;
  const overlaps=(x,y,w,h)=>Math.abs(building.x-x)<halfW+w&&Math.abs(building.y-y)<halfH+h;
  for(const other of Object.values(structures()))if(other!==building)assert.ok(!overlaps(other.x,other.y,(other.columns??1)*24,(other.rows??1)*24),`${building.id} overlaps ${other.id}`);
  for(const b of sim.field.barriers)assert.ok(!overlaps((b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.x1-b.x0)/2,(b.y1-b.y0)/2),`${building.id} overlaps terrain`);
 }
 assert.equal(isFrostGate(wall),false);
 const south={x:1464,y:744},north={x:1464,y:648},forecourt={x:1608,y:504};
 const sight=at=>canAttackOn(sim.geo,tower,{...sim.hero,...at},structuresFor(s,'red'));
 assert.ok(sight(south));
 assert.equal(sight(forecourt),false);
 const nav=new Navigation(sim.geo);
 assert.ok(nav.canReachWaypoint(sim.hero,forecourt,structures()));
 assert.ok(nav.canReachWaypoint({...sim.hero,...south},north,structures()),'the covered position still has a way around');
 assert.ok(!sim.geo.clearSegment(south,north,sim.hero.radius,structures()));
 strike(sim,'guardian',wall.id);
 assert.ok(sim.geo.clearSegment(south,north,sim.hero.radius,structures()),'destroying the wall opens the direct passage');
});

test('Azure attackers reach the southern siege defenses and destroy them with ordinary attacks',()=>{
 const sim=lowGateWithoutRegularWaves(),s=sim.state,tower='vale-keep-breach',barracks='red-barracks-keep';
 // Start the siege after the Yard encounter. Leave each new defense at full HP.
 for(const id of [heroId,'red-barracks-south'])strike(sim,'guardian',id);
 at(sim,1464,792);
 sim.spawnSoldier('blue-s-siege-test',1368,744);
 sim.send({type:'target',id:tower});
 const log=advance(sim,330);
 assert.ok(log.some(e=>e.type==='damage'&&e.sourceId==='blue-s-siege-test'&&e.id===tower));
 assert.ok(log.some(e=>e.type==='death'&&e.id===tower));
 const ally=sim.spawnAlly(1368,792);
 assert.ok(ally);
 at(sim,456,600);
 for(const targetId of [valeSiegeWall,barracks]){
  assert.equal(sim.send({type:'ally',id:ally,requestId:`attack-${targetId}`,order:{type:'attack',targetId}}),true);
  const events=advance(sim,300);
  assert.ok(events.some(e=>e.type==='death'&&e.sourceId===ally&&e.id===targetId),targetId);
  assert.equal(s.structures[targetId],undefined);
 }
});

test('M3 halves free Azure waves, and the Yard Warden returns to hold the breach approach',()=>{
 const sim=fresh(),s=sim.state,nav=new Navigation(sim.geo);
 const waves=Array.from({length:8},(_,i)=>extendedWaveSpawns(i+1,sim.setup.waveRules));
 assert.deepEqual(waves.flat().filter(e=>e.team==='blue').map(e=>e.wave),[1,3,5,7]);
 assert.deepEqual(waves.map(w=>w.filter(e=>e.team==='red'&&e.archetype==='crimson-elite').length),[0,1,1,2,2,2,2,2]);
 assert.deepEqual([s.units[heroId].x,s.units[heroId].y],[1464,792]);
 capturePost(sim,0);
 strike(sim,'guardian',valeLowGate);
 advance(sim,2);
 assert.equal(s.guard.raid,false,'the Warden remains in the Yard after a permanent breach');
 assert.ok(nav.canReachWaypoint(sim.hero,s.units[heroId],structuresFor(s,'blue')));
 at(sim,1368,792);
 assert.ok(advance(sim,120).some(e=>e.type==='attack'&&e.id===heroId&&e.targetId==='guardian'));
 if(s.units[heroId])strike(sim,'guardian',heroId);
 at(sim,456,600);
 const returned=advance(sim,sim.setup.guard.respawnTicks+1);
 assert.equal(returned.filter(e=>e.type==='spawn'&&e.id===heroId).length,1);
 assert.equal(s.guard.raid,false);
 assert.ok(nav.canReachWaypoint(sim.hero,{x:1416,y:792},structuresFor(s,'blue')));
 assert.ok(s.units['red-hero-outpost'],'the north road has its own defender');
 assert.deepEqual(s.posts.slice(1).map(p=>p.owner),['crimson','crimson']);
 assert.equal(s.bases['red-base'].invulnerable,undefined,'the southern route does not require northern posts');
});

test('the Yard Warden and its Barracks escort reach Forest around the closed Low Gate',()=>{
 const sim=lowGateWithoutRegularWaves(),s=sim.state,cfg=sim.setup.guard.counterattack;
 const raid=e=>e.type==='site'&&e.change==='raid'&&e.id===cfg.barracks;
 capturePost(sim,0);
 assert.ok(!advance(sim,cfg.delayTicks+1).some(raid),'Forest alone does not start the raids');
 const camp=capturePost(sim,1).find(e=>e.type==='post'&&e.change==='captured');
 at(sim,456,600);
 assert.ok(!until(sim,camp.at+cfg.delayTicks-1).some(raid));
 assert.ok(advance(sim,1).some(raid));

 const banner=sim.postStates[0].bannerId,escortIds=new Set();
 let aroundSpur=false,peak=0;
 const log=until(sim,sim.clock.tick+1250,[],()=>{
  const w=s.units[heroId];
  if(w&&w.x>=1200&&w.x<1344&&w.y<288)aroundSpur=true;
  const red=Object.values(s.units).filter(u=>u.team==='red');
  peak=Math.max(peak,red.length);
  for(const u of red)if(u.escortOf===heroId&&u.x===1800&&u.y===840)escortIds.add(u.id);
 });
 assert.equal(s.captures[valeLowGate].stage,'crimson');
 assert.ok(aroundSpur,'the Warden walks around the north tip of the spur');
 assert.equal(escortIds.size,3,'all three soldiers originate at the owned southern slot');
 assert.ok(peak<=sim.encounter.caps.red);
 assert.ok(log.some(e=>e.type==='damage'&&e.id===banner&&e.sourceId===heroId));
 assert.ok(log.some(e=>e.type==='damage'&&e.id===banner&&escortIds.has(e.sourceId)));
 assert.ok((s.structures[banner]?.hp??0)<sim.camps[0].bannerHp/2,'the raid threatens a full-health Banner');

 const next=camp.at+cfg.delayTicks+cfg.intervalTicks;
 const survivor=[...escortIds].map(id=>s.units[id]).find(Boolean);
 assert.ok(survivor);
 // Keep one soldier safely alive so overlap is tested independently of combat.
 Object.assign(survivor,{x:1800,y:840,statuses:[{type:'stun',expiresTick:next+500}]});
 for(const id of escortIds)if(s.units[id]&&id!==survivor.id)strike(sim,'guardian',id);
 if(sim.postStates[0].owner==='crimson')capturePost(sim,0);
 at(sim,456,600);
 assert.ok(until(sim,next+5).every(e=>!raid(e)),'surviving escorts prevent a new group');
 if(sim.postStates[0].owner==='crimson')capturePost(sim,0);
 assert.ok(s.units[survivor.id]);
 strike(sim,'guardian',survivor.id);
 at(sim,456,600);
 assert.equal(advance(sim,500).filter(raid).length,1);
});

test('opening the Low Gate or destroying the Yard Barracks prevents the north-route counterattack',()=>{
 for(const change of ['captured','destroyed','barracks']){
  const sim=lowGateWithoutRegularWaves(),s=sim.state,cfg=sim.setup.guard.counterattack;
  capturePost(sim,0);
  if(change==='captured'){
   strike(sim,'guardian','vale-gate-north');
   at(sim,1160,792);
   advance(sim,sim.setup.captures[0].captureTicks+sim.setup.captures[0].repair.ticks+2);
   assert.equal(s.captures[valeLowGate].stage,'azure');
  }else strike(sim,'guardian',change==='destroyed'?valeLowGate:cfg.barracks);
  capturePost(sim,1);
  at(sim,456,600);
  const log=advance(sim,cfg.delayTicks+50);
  assert.ok(!log.some(e=>e.type==='site'&&e.change==='raid'&&e.id===cfg.barracks),change);
  assert.equal(s.guard.raidTarget,undefined);
 }
});

test('the Yard waits while the Guardian approaches the gate and drops queued escorts if the gate opens',()=>{
 const sim=lowGateWithoutRegularWaves(),s=sim.state,cfg=sim.setup.guard.counterattack;
 const raid=e=>e.type==='site'&&e.change==='raid'&&e.id===cfg.barracks;
 capturePost(sim,0);
 capturePost(sim,1);
 at(sim,1160,792);
 assert.ok(!advance(sim,cfg.delayTicks+30).some(raid));
 assert.equal(s.captures[valeLowGate].stage,'crimson');
 at(sim,456,600);
 assert.ok(advance(sim,1).some(raid));
 assert.ok(sim.spawnQueue.some(e=>e.escortOf===heroId));
 strike(sim,'guardian',valeLowGate);
 advance(sim,1);
 assert.equal(s.guard.raidTarget,undefined);
 assert.ok(sim.spawnQueue.every(e=>e.escortOf!==heroId));
});

test('respawn uses the deepest connected candidate, skips blocked points, and falls back after a middle loss',()=>{
 const sim=fresh(),[forest,camp,outpost]=sim.setup.respawnChain;
 respawn(sim,sim.field.respawn[0]);
 for(let index=0;index<3;index++)capturePost(sim,index);
 respawn(sim,outpost.candidates[0],'outpost');
 for(const [index,p] of outpost.candidates.entries()){
  const id=`blue-blocker-${index}`;
  sim.state.units[id]={...sim.unit(id,'minion-blue',p.x,p.y),speed:0};
  if(index===0)respawn(sim,outpost.candidates[1],'outpost');
 }
 respawn(sim,camp.candidates[0],'camp');
 strike(sim,'red-base',sim.postStates[1].bannerId);
 respawn(sim,forest.candidates[0],'forest');
 assert.equal(sim.postStates[2].owner,'azure');
 assert.equal(sim.repairSite('ballista',31,6),true);
 assert.ok(!sim.state.bases['red-base'].invulnerable);
 strike(sim,'red-base',sim.postStates[0].bannerId);
 respawn(sim,sim.field.respawn[0]);
});

function respawnContender(sim,id,x,y){
 return sim.state.units[id]={...sim.unit(id,'minion-red',x,y),statuses:[{type:'stun',expiresTick:sim.clock.tick+2000}]};
}

test('the flag ring includes its boundary but ignores enemies beyond it, dead units, structures and queued spawns',()=>{
 const sim=lowGateWithoutRegularWaves(),s=sim.state,[forest]=sim.setup.respawnChain;
 capturePost(sim,0);
 const {x,y}=sim.camps[0].flag;
 respawn(sim,forest.candidates[0],'forest');
 const enemy=respawnContender(sim,'red-test',x-96,y);
 assert.equal(sim.isRespawnContested(0),true);
 respawn(sim,sim.field.respawn[0],undefined,'forest');
 assert.equal(sim.postStates[0].owner,'azure');
 assert.equal(sim.repairSite('tower',19,21),true);
 enemy.x=x-97;
 assert.equal(sim.isRespawnContested(0),false);
 respawn(sim,forest.candidates[0],'forest');
 enemy.x=x-96;enemy.hp=0;
 s.structures['red-test-tower']=sim.defender('red-test-tower','tower',x-72,y);
 sim.spawnQueue.push({tick:sim.clock.tick+30,team:'red',id:'red-queued',x:x-72,y,wave:0});
 assert.equal(sim.isRespawnContested(0),false);
 respawn(sim,forest.candidates[0],'forest');
});

test('contested links preserve ownership connectivity and explain only a fallback that contesting caused',()=>{
 const sim=lowGateWithoutRegularWaves(),s=sim.state,[forest,camp,outpost]=sim.setup.respawnChain;
 for(let index=0;index<3;index++)capturePost(sim,index);
 respawnContender(sim,'red-test-camp',1128,264);
 respawn(sim,outpost.candidates[0],'outpost');
 respawnContender(sim,'red-test-outpost',1464,144);
 respawn(sim,forest.candidates[0],'forest','outpost');
 for(const [i,p] of outpost.candidates.entries()){
  const id=`blue-spawn-blocker-${i}`;
  s.units[id]={...sim.unit(id,'minion-blue',p.x,p.y),speed:0};
 }
 respawn(sim,forest.candidates[0],'forest','camp');
 delete s.units['red-test-camp'];
 respawn(sim,camp.candidates[0],'camp');
 strike(sim,'red-base',s.posts[1].bannerId);
 respawn(sim,forest.candidates[0],'forest');
 assert.equal(s.posts[2].owner,'azure');
});

test('an enemy entering or leaving during the countdown only matters at the respawn tick',()=>{
 const sim=lowGateWithoutRegularWaves(),[forest]=sim.setup.respawnChain;
 capturePost(sim,0);
 const enemy=respawnContender(sim,'red-test',888,984);
 for(const enters of [true,false]){
  enemy.x=enters?887:888;
  assert.equal(sim.isRespawnContested(0),!enters);
  strike(sim,'red-base','guardian');
  const due=sim.hero.respawnTick;
  assert.ok(!until(sim,due-1).some(e=>e.type==='respawn'));
  enemy.x=enters?888:887;
  const event=advance(sim,1).find(e=>e.type==='respawn');
  assert.equal(event?.at,due);
  assert.equal(event.post,enters?undefined:forest.post);
  assert.equal(event.contestedPost,enters?forest.post:undefined);
 }
});

function shopTrade(sim,command){
 assert.equal(sim.send({matchId:sim.state.inventory.matchId,heroId:'guardian',...command}),true);
}

function shopRespawnFixture(){
 const {match:{overrides},mission}=crimsonReckoningCampaign.get(lowGateLevelId);
 const sim=new Simulation('shop-respawn-test',matchSetup('extended',{
  ...overrides,start:{...overrides.start,gold:1000},posts:overrides.posts.map(post=>({...post,counter:{count:0,slots:[]}})),
  waves:{...overrides.waves,firstWaveTick:20000},mission,
 }));
 return sim;
}

test('each successful dead trade commits the Guardian to Azure Keep, including on the respawn tick',()=>{
 for(const type of ['buy-item','sell-item','fuse-item']){
  const sim=shopRespawnFixture();
  shopTrade(sim,{type:'buy-item',requestId:'alive-item',itemId:'iron-sword'});
  assert.ok(advance(sim,1).some(e=>e.type==='item-traded'));
  assert.equal(sim.guardianRespawnAtKeep,false);
  const instanceId=sim.state.inventory.slots[0];
  capturePost(sim,0);
  assert.equal(sim.shopPurchaseQuote('ruby-gem').reason,'Return to Azure Keep');
  strike(sim,'red-base','guardian');
  const due=sim.hero.respawnTick;
  if(type==='fuse-item')until(sim,due-1);
  shopTrade(sim,{type,requestId:'dead-trade',...(type==='sell-item'?{instanceId}:type==='buy-item'?{itemId:'ruby-gem'}:{itemId:'flame-blade',componentIds:[instanceId]})});
  const events=advance(sim,1);
  assert.ok(events.some(e=>e.type==='item-traded'&&e.requestId==='dead-trade'));
  if(type!=='fuse-item'){
   assert.equal(sim.guardianRespawnAtKeep,true);
   assert.equal(sim.hero.respawnTick,due);
   shopTrade(sim,{type:'buy-item',requestId:'second-dead-trade',itemId:'ruby-gem'});
   assert.ok(advance(sim,1).some(e=>e.type==='item-traded'&&e.requestId==='second-dead-trade'));
   assert.equal(sim.hero.respawnTick,due);
   until(sim,due,events);
  }
  const event=events.find(e=>e.type==='respawn');
  assert.equal(event?.at,due);
  assert.equal(event.post,undefined);
  assert.equal(event.contestedPost,undefined);
  assert.deepEqual({x:sim.hero.x,y:sim.hero.y},sim.field.respawn[0]);
  assert.equal(sim.guardianRespawnAtKeep,false);
  assert.equal(sim.shopAccessReason(),undefined);
  respawn(sim,sim.setup.respawnChain[0].candidates[0],'forest');
 }
});

test('browsing, rejected trades and skill learning leave forward respawn available',()=>{
 const sim=lowGateWithoutRegularWaves(),[forest]=sim.setup.respawnChain;
 capturePost(sim,0);
 assert.equal(sim.shopAccessReason(),'Return to Azure Keep');
 shopTrade(sim,{type:'buy-item',itemId:'ruby-gem',requestId:'alive-far'});
 assert.ok(advance(sim,1).some(e=>e.reason==='Return to Azure Keep'));
 strike(sim,'red-base','guardian');
 const due=sim.hero.respawnTick,gold=sim.state.gold;
 assert.equal(sim.shopPurchaseQuote('guardian-shield').reason,'Not enough Gold');
 shopTrade(sim,{type:'buy-item',itemId:'guardian-shield',requestId:'poor'});
 shopTrade(sim,{type:'fuse-item',itemId:'flame-blade',componentIds:['missing'],requestId:'invalid-fusion'});
 shopTrade(sim,{type:'sell-item',instanceId:'missing',requestId:'invalid-sale'});
 assert.equal(sim.send({type:'learn',requestId:'dead-skill',skill:'bash'}),true);
 const events=until(sim,due);
 assert.deepEqual(events.filter(e=>e.type==='rejected').map(e=>e.requestId),['poor','invalid-fusion','invalid-sale']);
 assert.ok(events.some(e=>e.type==='skill-upgraded'&&e.skill==='bash'));
 assert.ok(!events.some(e=>e.type==='item-traded'));
 assert.equal(sim.state.gold,gold);
 assert.equal(events.find(e=>e.type==='respawn')?.post,forest.post);
});

test('dead trading waits for a clear Keep spawn even when a forward post is available',()=>{
 const sim=shopRespawnFixture();
 capturePost(sim,0);
 strike(sim,'red-base','guardian');
 const due=sim.hero.respawnTick;
 for(const [index,p] of sim.field.respawn.entries()){
  const id=`home-blocker-${index}`;
  sim.state.units[id]={...sim.unit(id,'minion-blue',p.x,p.y),speed:0};
 }
 shopTrade(sim,{type:'buy-item',itemId:'ruby-gem',requestId:'dead-buy'});
 assert.ok(!until(sim,due+2).some(e=>e.type==='respawn'));
 assert.equal(sim.hero.hp,0);
 assert.equal(sim.hero.respawnTick,due);
 assert.equal(sim.guardianRespawnAtKeep,true);
 delete sim.state.units['home-blocker-1'];
 assert.ok(advance(sim,1).some(e=>e.type==='respawn'&&!e.post));
 assert.deepEqual({x:sim.hero.x,y:sim.hero.y},sim.field.respawn[1]);
 assert.equal(sim.guardianRespawnAtKeep,false);
});

test('Chapter 4 and 5 still permit dead trades without setting a respawn commitment',()=>{
 for(const level of [35,45]){
  const sim=new Simulation(`legacy-${level}`,campaign.setup(level));
  for(let i=0;i<20;i++)sim.economy.apply({type:'minion-reward',id:`fund-${i}`});
  strike(sim,'red-base','guardian');
  shopTrade(sim,{type:'buy-item',itemId:'ruby-gem',requestId:'legacy-buy'});
  assert.ok(advance(sim,1).some(e=>e.type==='item-traded'));
  assert.equal(sim.guardianRespawnAtKeep,false);
  assert.ok(until(sim,sim.hero.respawnTick).some(e=>e.type==='respawn'&&!e.post));
 }
});

test('the real M3 Yard raid can contest Forest before its Banner falls',()=>{
 const sim=lowGateWithoutRegularWaves(),s=sim.state,cfg=sim.setup.guard.counterattack;
 capturePost(sim,0);
 capturePost(sim,1);
 at(sim,456,600);
 assert.ok(advance(sim,cfg.delayTicks+1).some(e=>e.type==='site'&&e.change==='raid'&&e.id===cfg.barracks));
 strike(sim,'red-base',s.posts[1].bannerId);
 const deadline=sim.clock.tick+1250;
 while(sim.clock.tick<deadline&&!sim.isRespawnContested(0))advance(sim,1);
 assert.equal(s.guard.raidTarget,s.posts[0].bannerId);
 assert.equal(sim.isRespawnContested(0),true);
 assert.equal(s.posts[0].owner,'azure');
 respawn(sim,sim.field.respawn[0],undefined,'forest');
});

test('destroying either southern Barracks drops only its own current and future wave share',()=>{
 for(const id of ['red-barracks-south','red-barracks-keep']){
  const sim=fresh(),rules=sim.setup.waveRules;
  const [[x,y]]=sim.setup.barracks.find(b=>b.id===id).slots;
  const waves=sim.encounter.spawns.filter(e=>e.team==='red'&&e.wave<=2);
  assert.equal(waves.length,10,'the new slot redistributes the original wave size');
  const expected=waves.filter(e=>e.x!==x||e.y!==y).map(e=>e.id);
  const log=until(sim,rules.firstWaveTick);
  strike(sim,'guardian',id);
  until(sim,rules.firstWaveTick+rules.waveInterval+rules.spawnStagger*4,log);
  assert.deepEqual(log.filter(e=>e.type==='spawn'&&e.id.startsWith('red-w')).map(e=>e.id),expected);
  assert.ok(sim.state.structures['red-barracks-north']?.hp>0);
 }
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CampaignRegistry}=require('../.test-build/data/campaign.js');
const {lastWarlordPhaseELevel}=require('../.test-build/data/lastWarlordPrototype.js');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {inCleaveCone,warlordCleave}=require('../.test-build/simulation/WarlordCleave.js');
const {insideChargeLeash,warlordCharge}=require('../.test-build/simulation/WarlordCharge.js');
const {warlordPhases}=require('../.test-build/simulation/WarlordPhases.js');
const {stunned}=require('../.test-build/simulation/Statuses.js');
const {DT,HZ,dist,entity,route,scripted,strike,until}=require('./support/campaignBot.cjs');

// Historical arena fixture for the original mechanics and Phase E strategy scenarios.
const setup=new CampaignRegistry([lastWarlordPhaseELevel]).setup(56),{id:BOSS,anchor:[x,y]}=setup.warlord;
const WARDEN='red-hero-forward',HOME='blue-base';
const arenaGates=setup.gates.filter(g=>g.arenaGate);
const wallWest=arenaGates[0].x-24,wallEast=arenaGates[0].x+24;
const quiet=(cleave=true,charge=false,barrier,phases=false)=>new Simulation('m6-fixture',{...setup,warlord:{...setup.warlord,cleave:cleave?true:undefined,charge:charge?true:undefined,phases:phases?true:undefined},
 ...(barrier&&{battlefield:{...setup.battlefield,barriers:[...setup.battlefield.barriers,barrier]}}),
 encounter:{...setup.encounter,waves:[],spawns:[],continuous:false}});
const tick=(sim,count=1)=>until(sim,sim.clock.tick+count);
const enterPost=sim=>{
 const p=setup.respawnChain[0].candidates[0];
 assert.ok(sim.teleportHero(p.x,p.y));
};
function capture(sim){
 for(const id of setup.post.holders)if(entity(sim,id))strike(sim,'guardian',id);
 enterPost(sim);
 tick(sim,setup.post.raiseTicks+1);
 assert.equal(sim.state.post.owner,'azure');
}
function hire(sim,merc){
 sim.send({type:'tavern',requestId:'hire-'+merc,action:'hire',merc});
 tick(sim);
 const slot=sim.state.tavern.slots.find(s=>s.merc===merc);
 assert.ok(slot?.unitId);
 return entity(sim,slot.unitId);
}

test('Original Phase E arena keeps its prebuilt Tavern and Barracks and its stat fixture',()=>{
 assert.equal(battlefieldFromSearch('?battlefield=last-warlord',true),'meadow');
 const sim=quiet(),boss=entity(sim,BOSS);
 assert.deepEqual(sim.field.size,{width:2400,height:1200});
 assert.ok(sim.tavernStanding()&&entity(sim,'azure-barracks-0'));
 assert.deepEqual([boss.hp,boss.armor,boss.speed,boss.damage,boss.cooldownTicks,boss.windupTicks,boss.range,boss.radius],
  [9600,30,85,110,30,9,60,20]);
 assert.equal(boss.maxHp,9600);
 assert.deepEqual(setup.post.holders.map(id=>[entity(sim,id).hp,entity(sim,id).maxHp]),[[1625,1625],[1625,1625]]);
 assert.equal(sim.defender('unconfigured-tower','tower',456,600).hp,650);
 assert.deepEqual(setup.post.hero,{anchor:[1416,504],spawn:[1416,504],guard:216,respawnTicks:90*HZ});
 assert.deepEqual(warlordPhases.hornSlots,[[1800,504],[1848,552],[1848,648],[1800,696]]);
 assert.equal(sim.missionStatus().activePhase,'break-line');
 assert.match(sim.placementReason('barracks',32,10),/Capture/);
 assert.ok(sim.state.bases['red-base'].invulnerable&&sim.state.bases['red-base'].damage===0);
});

test('Forward Post raises for exactly eight seconds, then opens the gates and has 2000 HP',()=>{
 const sim=quiet(),boss=entity(sim,BOSS);
 sim.state.autoAttack=false;
 strike(sim,'guardian',WARDEN);
 for(const id of setup.post.holders)strike(sim,'guardian',id);
 enterPost(sim);
 assert.ok(tick(sim).some(e=>e.type==='post'&&e.change==='raising'));
 const banner=entity(sim,sim.state.post.bannerId);
 assert.equal(banner.completeTick-banner.startTick,8*HZ);
 assert.equal(banner.maxHp,2000);
 until(sim,banner.completeTick-1);
 assert.equal(sim.state.post.owner,'crimson');
 assert.ok(boss.invulnerable&&arenaGates.every(g=>!entity(sim,g.id).open));
 assert.ok(tick(sim).some(e=>e.type==='post'&&e.change==='captured'&&e.first));
 assert.equal(banner.hp,2000);
 assert.ok(!boss.invulnerable&&arenaGates.every(g=>entity(sim,g.id).open));
});

test('regular waves start at five seconds and repeat every 675 ticks without Elites',()=>{
 const sim=new Simulation('m6-wave-timing',setup);
 assert.deepEqual(setup.encounter.caps,{red:19,blue:16});
 assert.equal(setup.tavern.cap,2);
 assert.deepEqual(setup.waveRules.enemyPerWave,[5,5,6,6,6,7,7,7]);
 assert.ok(setup.encounter.spawns.filter(e=>e.team==='red').every(e=>e.archetype===undefined));
 assert.deepEqual(setup.encounter.waves.map(e=>e.tick),Array.from({length:8},(_,i)=>5*HZ+i*675));
 const events=until(sim,50*HZ).filter(e=>e.type==='wave');
 assert.deepEqual(events.map(e=>e.at),[150,825,1500]);
});

test('normal capture activates the reserved, protected boss once under full red cap',()=>{
 const sim=quiet(),boss=entity(sim,BOSS),state=sim.state;
 sim.state.autoAttack=false;
 assert.ok(sim.teleportHero(x-80,y));
 strike(sim,'guardian',BOSS);
 tick(sim,60);
 assert.equal(boss.hp,9600);
 assert.equal(boss.targetId,undefined);
 assert.ok(boss.invulnerable);
 for(let i=0;i<17;i++){
  const id='red-cap-'+i;
  state.units[id]=sim.unit(id,'minion-red',216+i*48,1104);
  state.units[id].speed=0;
 }
 assert.equal(Object.values(state.units).filter(u=>u.team==='red').length,19);
 for(const id of setup.post.holders)strike(sim,'guardian',id);
 tick(sim);
 assert.equal(sim.missionStatus().activePhase,'seize-post');
 capture(sim);
 assert.equal(sim.missionStatus().activePhase,'arena');
 assert.equal(entity(sim,BOSS),boss);
 assert.equal(boss.invulnerable,undefined);
 assert.ok(arenaGates.every(g=>entity(sim,g.id).open));
 assert.equal(sim.placementReason('barracks',32,10),'');
 strike(sim,'guardian',BOSS,250);
 strike(sim,WARDEN,state.post.bannerId);
 assert.ok(tick(sim).some(e=>e.type==='post'&&e.change==='lost'));
 assert.ok(arenaGates.every(g=>entity(sim,g.id).open));
 assert.match(sim.placementReason('barracks',32,10),/Capture/);
 const recapture=tick(sim,setup.post.raiseTicks+1);
 assert.ok(recapture.some(e=>e.type==='post'&&e.change==='captured'&&!e.first));
 assert.equal(entity(sim,BOSS),boss);
 assert.equal(boss.hp,9350);
 assert.ok(state.bases['red-base'].invulnerable);
});

test('the gate line blocks walking and Vanguard Charge until Forward Post opens it',()=>{
 const sim=quiet(),hero=sim.hero;
 sim.state.autoAttack=false;
 strike(sim,'guardian',WARDEN);
 for(const gate of arenaGates){
  strike(sim,'guardian',gate.id,10000);
  assert.equal(entity(sim,gate.id).hp,gate.hp);
 }
 // Test all three openings, both map edges, and the seams beside the gates.
 for(const row of [hero.radius,216,240,360,432,528,600,672,768,840,960,1180]){
  assert.ok(sim.teleportHero(wallWest-56,row));
  sim.send({type:'move',x:1,y:0});
  tick(sim,20);
  assert.ok(hero.x<=wallWest-hero.radius+1e-7,`walk bypass at y=${row}`);
 }
 sim.send({type:'move',x:0,y:0});
 assert.ok(sim.teleportHero(wallWest-56,600));
 sim.state.heroProgression.skillPoints=1;
 sim.send({type:'learn',skill:'charge',requestId:'gate-learn'});
 sim.send({type:'cast',skill:'charge',requestId:'closed-charge',direction:{x:1,y:0},distance:144});
 assert.ok(tick(sim,HZ).some(e=>e.type==='cast-effect'&&e.requestId==='closed-charge'));
 assert.ok(hero.x<=wallWest-hero.radius+1e-7);
 capture(sim);
 assert.ok(sim.teleportHero(wallWest-56,600));
 sim.state.skills.ready.charge=0;
 sim.send({type:'cast',skill:'charge',requestId:'open-charge',direction:{x:1,y:0},distance:144});
 assert.ok(tick(sim,HZ).some(e=>e.type==='cast-effect'&&e.requestId==='open-charge'));
 assert.ok(hero.x>wallEast+hero.radius);
 for(const {y:row} of arenaGates){
  assert.ok(sim.teleportHero(wallWest-56,row));
  sim.send({type:'move',x:1,y:0});
  tick(sim,20);
  assert.ok(hero.x>wallEast+hero.radius);
 }
});

test('an Allied Hero and an Azure Barracks soldier only navigate into the arena once opened',()=>{
 const sim=quiet(),s=sim.state;
 sim.state.autoAttack=false;
 const ally=hire(sim,'roland'),soldier=Object.values(s.units).find(u=>u.id.startsWith('blue-s-'));
 assert.ok(soldier);
 strike(sim,'guardian',WARDEN);
 assert.ok(sim.teleportHero(1552,720));
 Object.assign(ally,{x:1560,y:632});Object.assign(soldier,{x:1560,y:552});
 const enemy=s.units['red-gate-probe']=sim.unit('red-gate-probe','minion-red',1816,600);
 Object.assign(enemy,{speed:0,hp:3000,maxHp:3000,readyTick:Infinity});
 sim.send({type:'ally',requestId:'beyond-the-gate',id:ally.id,order:{type:'defend',x:1800,y:648}});
 // Give the soldier a hostile target ahead, then exercise the ordinary movement and navigation ticks.
 soldier.targetId=enemy.id;
 tick(sim,HZ*4);
 for(const u of [ally,soldier]){
  assert.ok(u.x<wallWest);
  assert.ok(!sim.navigation.canReachWaypoint(u,enemy,structuresFor(s,'blue')));
 }
 capture(sim);
 assert.ok(sim.teleportHero(1572,728));
 for(const u of [ally,soldier])assert.ok(sim.navigation.canReachWaypoint(u,enemy,structuresFor(s,'blue')));
 const events=tick(sim,HZ*6);
 for(const u of [ally,soldier]){
  assert.ok(u.x>wallEast,JSON.stringify({id:u.id,x:u.x,y:u.y,goal:u.ally?.goal,target:u.targetId,order:u.ally?.order,route:sim.navigation.routeFor(u.id)}));
  assert.ok(events.some(e=>e.type==='damage'&&e.sourceId===u.id&&e.id===enemy.id));
 }
});

for(const open of [false,true])test(`both Crimson reinforcement routes work with the arena ${open?'open':'closed'}`,t=>{
 const sim=new Simulation('m6-gate-waves',setup);
 if(open){
  capture(sim);
  assert.ok(sim.teleportHero(setup.start.guardian.x,setup.start.guardian.y));
 }
 const crossings=new Map();
 until(sim,24*HZ,[],()=>{
  for(const u of Object.values(sim.state.units))if(/^red-w1-/.test(u.id)&&u.x<wallWest&&!crossings.has(u.id))crossings.set(u.id,Math.round(u.y));
 });
 assert.ok(arenaGates.every(g=>!!entity(sim,g.id).open===open));
 for(const [index,side] of ['north','south'].entries()){
  const rows=[...crossings].filter(([id])=>Number(id.split('-').at(-1))%2===index).map(([,row])=>row);
  // The first wave now begins before the gates open. Once unlocked, troops
  // from either source may use the main entrance as well as the side gates.
  assert.ok(rows.length>0&&rows.every(row=>open?
   arenaGates.some(g=>Math.abs(row-g.y)<g.rows*24):
   Math.abs(row-arenaGates[index*2].y)<96),JSON.stringify([...crossings]));
  t.diagnostic(`${side} crossed at y=${rows.join(', ')}`);
 }
});

test('the frontline Warden returns at 90 seconds while Crimson holds the post and waits while Azure owns it',()=>{
 const sim=quiet();
 strike(sim,'guardian',WARDEN);
 tick(sim,setup.post.hero.respawnTicks-1);
 assert.equal(entity(sim,WARDEN),undefined);
 assert.ok(tick(sim).some(e=>e.type==='spawn'&&e.id===WARDEN));
 strike(sim,'guardian',WARDEN);
 capture(sim);
 tick(sim,setup.post.hero.respawnTicks);
 assert.equal(entity(sim,WARDEN),undefined);
});

test('Warlord attacks mobile units, ignores towers and out-of-arena taunts, and returns without healing',()=>{
 const sim=quiet(),boss=entity(sim,BOSS);
 sim.state.autoAttack=false;
 capture(sim);
 assert.ok(sim.teleportHero(x-230,y));
 const events=tick(sim,4*HZ);
 assert.ok(events.some(e=>e.type==='damage'&&e.sourceId===BOSS&&e.id==='guardian'));
 strike(sim,'guardian',BOSS,100);
 assert.ok(sim.teleportHero(x-370,y));
 boss.statuses=[{type:'taunt',sourceId:'guardian',sourceLife:sim.hero.lifeId,startTick:sim.clock.tick,
  expiresTick:sim.clock.tick+4*HZ,magnitude:1}];
 const outsideTower={...entity(sim,'azure-tavern'),id:'tower-probe',kind:'tower',x:x-365,y,range:240};
 assert.equal(canAttackOn(sim.geo,outsideTower,{...boss,warlord:undefined,x:x-280}),true);
 assert.equal(canAttackOn(sim.geo,{...outsideTower}, {...boss,x:x-280}),false);
 const retreat=tick(sim,4*HZ);
 assert.ok(!retreat.some(e=>e.type==='damage'&&e.sourceId===BOSS));
 assert.ok(dist(boss,{x,y})<=30);
 assert.equal(boss.hp,9500);
});

for(const source of ['guardian','hero','soldier'])test(`real ${source} melee damage can finish the mission`,()=>{
 const sim=quiet(),boss=entity(sim,BOSS);
 capture(sim);
 delete sim.state.units[WARDEN];
 const attacker=source==='guardian'?sim.hero:source==='hero'?hire(sim,'roland'):
  Object.values(sim.state.units).find(u=>u.id.startsWith('blue-s-'));
 assert.ok(attacker);
 sim.state.autoAttack=source==='guardian';
 assert.ok(sim.teleportHero(x-52,y));
 if(attacker!==sim.hero)Object.assign(attacker,{x:x+44,y});
 if(source==='hero')sim.send({type:'ally',requestId:'boss',id:attacker.id,order:{type:'attack',targetId:BOSS}});
 sim.send({type:'target',id:BOSS});
 boss.hp=1;
 const events=tick(sim,2*HZ);
 assert.ok(events.some(e=>e.type==='death'&&e.id===BOSS&&e.sourceId===attacker.id));
 assert.equal(sim.outcome.outcome,'victory');
 assert.equal(entity(sim,BOSS),undefined);
});

test('absence cannot complete the boss objective and same-tick Keep defeat takes precedence',()=>{
 const missing=quiet();
 delete missing.state.units[BOSS];
 capture(missing);
 tick(missing);
 assert.equal(missing.missionStatus().activePhase,'arena');
 assert.equal(missing.ended,false);
 const disappeared=quiet();
 capture(disappeared);
 delete disappeared.state.units[BOSS];
 tick(disappeared);
 assert.equal(disappeared.ended,false);
 const sim=quiet();
 capture(sim);
 scripted(sim)(sim.clock.tick+1,()=>{
  strike(sim,'guardian',BOSS);
  strike(sim,WARDEN,HOME);
 });
 tick(sim);
 assert.equal(sim.outcome.outcome,'defeat');
});

test('Forward Post respawn works and falls back under contest or loss',()=>{
 for(const how of ['owned','contested','lost']){
  const sim=quiet();
  delete sim.state.structures['azure-barracks-0'];
  capture(sim);
  const warden=entity(sim,WARDEN);
  if(how==='contested')Object.assign(warden,{x:setup.post.flag.x+72,y:setup.post.flag.y,speed:0,readyTick:Infinity});
  if(how==='owned')Object.assign(warden,{x:1104,y:840,speed:0});
  if(how==='lost')strike(sim,WARDEN,sim.state.post.bannerId);
  strike(sim,WARDEN,'guardian');
  const events=until(sim,sim.hero.respawnTick);
  const event=events.find(e=>e.type==='respawn');
  assert.ok(event);
  assert.equal(event.post,how==='owned'?'forward':undefined);
  if(how==='contested')assert.equal(event.contestedPost,'forward',JSON.stringify({event,warden:entity(sim,WARDEN),post:sim.state.post}));
 }
});

test('Bash, Taunt, Charge, and Zone work on the active Warlord through existing commands',()=>{
 const sim=quiet(false),boss=entity(sim,BOSS);
 sim.state.autoAttack=false;
 capture(sim);
 sim.state.heroProgression.level=6;
 sim.state.heroProgression.skillPoints=4;
 for(const skill of ['bash','taunt','charge','zone'])sim.send({type:'learn',requestId:'learn-'+skill,skill});
 tick(sim);
 const cast=(skill,options={})=>{
  sim.send({type:'cast',requestId:'cast-'+skill,skill,...options});
  return tick(sim,30);
 };
 assert.ok(sim.teleportHero(x-52,y));
 const bash=cast('bash',{targetId:BOSS});
 assert.ok(bash.some(e=>e.type==='damage'&&e.id===BOSS&&e.castId==='cast-bash'));
 assert.ok(bash.some(e=>e.type==='status'&&e.id===BOSS&&e.status==='stun'));
 assert.ok(cast('taunt').some(e=>e.type==='status'&&e.id===BOSS&&e.status==='taunt'));
 assert.ok(cast('charge',{direction:{x:1,y:0},distance:100}).some(e=>
  e.type==='damage'&&e.id===BOSS&&e.castId==='cast-charge'));
 const zone=cast('zone');
 assert.ok(zone.some(e=>e.type==='shield'&&e.id==='guardian'));
 assert.ok(zone.some(e=>e.type==='damage'&&e.id==='guardian'&&e.sourceId===BOSS&&e.absorbed>0));
});

function cleaveFixture(){
 const sim=quiet();
 sim.state.autoAttack=false;
 delete sim.state.structures['azure-barracks-0'];
 for(const id of Object.keys(sim.state.units))if(id!==BOSS&&id!=='guardian')delete sim.state.units[id];
 capture(sim);
 sim.state.heroProgression.level=6;
 sim.state.heroProgression.skillPoints=4;
 for(const skill of ['bash','taunt','zone'])sim.send({type:'learn',requestId:'learn-'+skill,skill});
 tick(sim);
 return {sim,boss:entity(sim,BOSS),hero:sim.hero};
}

test('Cleave cone includes the 120 px and 60 degree edges and rejects points beyond them',()=>{
 const cast={x,y,angle:.72};
 const inside=(radius,angle)=>inCleaveCone(cast,{x:x+radius*Math.cos(cast.angle+angle),y:y+radius*Math.sin(cast.angle+angle)});
 for(const a of [-Math.PI/3,0,Math.PI/3])assert.ok(inside(120,a));
 assert.ok(!inside(120.01,0)&&!inside(80,Math.PI/3+.001)&&!inside(80,-Math.PI/3-.001)&&!inside(40,Math.PI));
});

test('Cleave damages at most six nearby Azure mobiles using physical armor and Guardian Zone',()=>{
 const {sim,boss,hero}=cleaveFixture();
 const ally=hire(sim,'roland');
 assert.ok(sim.teleportHero(x-60,y));
 Object.assign(ally,{x:x-82,y:y-22,speed:0,readyTick:Infinity});
 for(let n=0;n<6;n++){
  const id='blue-cone-'+n;
  sim.state.units[id]={...sim.unit(id,'minion-blue',x-88-n*4,y+(n%2?13:-13)),speed:0,radius:1,readyTick:Infinity};
 }
 Object.assign(boss,{speed:0,readyTick:Infinity,targetId:hero.id});
 sim.send({type:'cast',requestId:'cleave-zone',skill:'zone'});
 const e=tick(sim,HZ+1),start=e.find(v=>v.type==='cleave-start'),impact=e.find(v=>v.type==='cleave-impact');
 assert.ok(start&&impact);
 assert.equal(impact.at-start.at,HZ);
 assert.equal(impact.hits.length,6);
 const damage=e.filter(v=>v.type==='damage'&&v.castId===`cleave-${start.at}`);
 assert.equal(damage.length,6);
 for(const v of damage){
  assert.equal(v.raw,180);
  assert.equal(v.damageType,'physical');
  assert.ok(Math.abs(v.mitigated-180*100/(100+entity(sim,v.id).armor))<1e-8);
  assert.ok(v.absorbed>0);
 }
 assert.ok(damage.some(v=>v.id===hero.id)&&damage.some(v=>v.id===ally.id)&&damage.some(v=>v.id.startsWith('blue-cone-')));
 assert.ok(impact.hits.every(p=>inCleaveCone(impact.cast,p)));
 assert.ok(!e.some(v=>v.type==='status'&&v.id===hero.id));
});

test('walkable dodge, locked origin, recovery and start-to-start cooldown',()=>{
 const {sim,boss,hero}=cleaveFixture();
 boss.speed=0;
 assert.ok(sim.teleportHero(x-98,y));
 assert.ok(!tick(sim).some(e=>e.type==='cleave-start'));
 assert.ok(sim.teleportHero(x-64,y));
 const start=tick(sim).find(e=>e.type==='cleave-start');
 assert.ok(start);
 boss.speed=setup.warlord.speed;
 sim.send({type:'move',x:0,y:-1});
 const dodge=tick(sim,HZ);
 const impact=dodge.find(e=>e.type==='cleave-impact');
 assert.ok(impact?.dodged&&!impact.hits.length);
 assert.equal(impact.cast,start.cast);
 assert.deepEqual([boss.x,boss.y],[start.cast.x,start.cast.y]);
 assert.ok(dodge.every(e=>e.sourceId!==BOSS));
 sim.send({type:'move',x:0,y:0});
 assert.ok(sim.teleportHero(x-50,y));
 boss.targetId=hero.id;
 assert.ok(tick(sim,warlordCleave.recoveryTicks-1).every(e=>e.type!=='attack'||e.id!==BOSS));
 assert.ok(tick(sim).some(e=>e.type==='attack'&&e.id===BOSS));
 const later=until(sim,start.at+warlordCleave.cooldownTicks-1);
 assert.ok(later.every(e=>e.type!=='cleave-start'));
 assert.ok(tick(sim).some(e=>e.type==='cleave-start'));
});

test('Shield Bash interrupts an active cone and leaves its cooldown spent',()=>{
 const {sim,boss}=cleaveFixture();
 assert.ok(sim.teleportHero(x-65,y));
 const start=tick(sim).find(e=>e.type==='cleave-start');
 assert.ok(start);
 sim.send({type:'cast',requestId:'cleave-bash',skill:'bash',targetId:BOSS});
 const events=tick(sim,HZ);
 assert.ok(events.some(e=>e.type==='cleave-interrupt'&&e.cast===start.cast));
 assert.ok(events.every(e=>e.type!=='cleave-impact'));
 assert.equal(boss.cleave,undefined);
 assert.equal(boss.cleaveReadyTick,start.at+8*HZ);
});

test('crowd contact cannot displace the casting Warlord and death cancels the cast',()=>{
 const {sim,boss}=cleaveFixture();
 assert.ok(sim.teleportHero(x-45,y));
 const start=tick(sim).find(e=>e.type==='cleave-start');
 assert.ok(start);
 sim.send({type:'move',x:1,y:0});
 tick(sim,12);
 assert.deepEqual([boss.x,boss.y],[start.cast.x,start.cast.y]);
 assert.equal(boss.cleave,start.cast);
 scripted(sim)(sim.clock.tick+1,()=>strike(sim,'guardian',BOSS));
 const events=tick(sim,HZ);
 assert.equal(sim.outcome.outcome,'victory');
 assert.equal(boss.cleave,undefined);
 assert.ok(events.every(e=>e.type!=='cleave-impact'));
});

test('Taunt can select the Guardian before Cleave but cannot redirect the windup',()=>{
 const {sim,boss,hero}=cleaveFixture();
 const ally=hire(sim,'roland');
 Object.assign(ally,{x:x+48,y,speed:0,readyTick:Infinity});
 Object.assign(boss,{speed:0,readyTick:Infinity,cleaveReadyTick:Infinity});
 assert.ok(sim.teleportHero(x-75,y));
 tick(sim);
 assert.equal(boss.targetId,ally.id);
 sim.send({type:'cast',requestId:'aim-taunt',skill:'taunt'});
 assert.ok(tick(sim,12).some(e=>e.type==='status'&&e.id===BOSS&&e.status==='taunt'));
 boss.cleaveReadyTick=0;
 const start=tick(sim).find(e=>e.type==='cleave-start');
 assert.ok(start);
 assert.equal(start.cast.targetId,hero.id);
 assert.ok(inCleaveCone(start.cast,hero)&&!inCleaveCone(start.cast,ally));
 assert.ok(sim.teleportHero(x+88,y));
 sim.state.skills.ready.taunt=0;
 sim.state.skills.lockTick=0;
 sim.send({type:'cast',requestId:'locked-taunt',skill:'taunt'});
 const events=tick(sim,HZ);
 assert.ok(events.some(e=>e.type==='status'&&e.id===BOSS&&e.status==='taunt'));
 const impact=events.find(e=>e.type==='cleave-impact');
 assert.ok(impact?.dodged&&!impact.hits.length);
 assert.equal(impact.cast,start.cast);
});

function chargeFixture(barrier){
 const sim=quiet(true,true,barrier);
 sim.state.autoAttack=false;
 delete sim.state.structures['azure-barracks-0'];
 for(const id of Object.keys(sim.state.units))if(id!==BOSS&&id!=='guardian')delete sim.state.units[id];
 capture(sim);
 const boss=entity(sim,BOSS),hero=sim.hero;
 Object.assign(boss,{speed:0,readyTick:Infinity,cleaveReadyTick:Infinity});
 const soldier=(id,dx,dy)=>sim.state.units[id]={...sim.unit(id,'minion-blue',x+dx,y+dy),speed:0,readyTick:Infinity};
 assert.ok(sim.teleportHero(x,y+62));
 return {sim,boss,hero,soldier};
}
const chargeStarted=e=>e.find(v=>v.type==='warlord-charge-start');
const chargeEnded=e=>e.find(v=>v.type==='warlord-charge-end');

test('Charge unlocks ten seconds after first damage, excludes the current target and selects the farthest valid unit',()=>{
 const {sim,boss,soldier}=chargeFixture();
 tick(sim,11*HZ);
 assert.equal(boss.chargeReadyTick,undefined);
 strike(sim,'guardian',BOSS,50);
 const ready=boss.chargeReadyTick;
 assert.equal(ready,sim.clock.tick+10*HZ);
 assert.ok(!chargeStarted(until(sim,ready)));
 const far=soldier('blue-far',-285,0);
 soldier('blue-near',-130,80);
 soldier('blue-outside',-364,0);
 soldier('blue-protected',-314,0).protectionTick=Infinity;
 const start=chargeStarted(tick(sim));
 assert.equal(start?.cast.targetId,far.id);
 assert.equal(start.cast.dx,-1);
 assert.equal(start.cast.dy,0);
 assert.equal(boss.chargeReadyTick,start.at+16*HZ);
});

test('Charge locks its axis, allows a walking dodge and stops with its footprint inside the leash',()=>{
 const {sim,boss,hero,soldier}=chargeFixture();
 soldier('blue-current',0,62);
 assert.ok(sim.teleportHero(x-255,y));
 boss.chargeReadyTick=0;
 const start=chargeStarted(tick(sim));
 assert.equal(start?.cast.targetId,hero.id);
 assert.ok(Math.abs(start.cast.distance-340)<1e-5);
 sim.send({type:'move',x:0,y:-1});
 tick(sim,warlordCharge.windupTicks-1);
 assert.deepEqual([boss.x,boss.y],[start.cast.x,start.cast.y]);
 tick(sim);
 assert.ok(Math.abs(boss.x-(x-20))<1e-6);
 const end=chargeEnded(tick(sim,HZ));
 assert.ok(end?.dodged&&!end.hit);
 assert.equal(end.cast.dx,start.cast.dx);
 assert.equal(end.cast.dy,start.cast.dy);
 assert.ok(insideChargeLeash(boss,end.x,end.y));
 assert.ok(Math.abs(end.x-(x-340))<1e-5);
});

test('a soldier intercepts the Charge with armor and Guardian Zone, and receives a 23-tick stun',()=>{
 const {sim,boss,hero,soldier}=chargeFixture();
 const intercept=soldier('blue-intercept',-105,0),far=soldier('blue-target',-272,0);
 intercept.baseArmor=intercept.armor=20;
 sim.state.heroProgression.level=6;
 sim.state.heroProgression.skillPoints=1;
 sim.send({type:'learn',requestId:'learn-protection',skill:'zone'});
 sim.send({type:'cast',requestId:'charge-zone',skill:'zone'});
 boss.chargeReadyTick=0;
 const events=tick(sim,2*HZ),start=chargeStarted(events),end=chargeEnded(events);
 assert.equal(start?.cast.targetId,far.id);
 assert.ok(end?.hit?.soldier);
 assert.equal(end.hit.id,intercept.id);
 assert.ok(Math.abs(end.x-(end.hit.x+boss.radius+intercept.radius))<1e-6);
 const hit=events.find(e=>e.type==='damage'&&e.id===intercept.id&&e.castId?.startsWith('warlord-charge-'));
 assert.equal(hit.raw,150);
 assert.equal(hit.damageType,'physical');
 assert.ok(Math.abs(hit.mitigated-150*100/130)<1e-8&&hit.absorbed>0);
 assert.ok(!events.some(e=>e.type==='damage'&&e.sourceId===BOSS&&e.id===far.id));
 const stun=intercept.statuses.find(s=>s.type==='stun');
 assert.equal(stun.expiresTick-end.at,warlordCharge.stunTicks);
 assert.ok(stunned(intercept,stun.expiresTick-1)&&!stunned(intercept,stun.expiresTick));
 assert.ok(hero.hp>0);
});

test('Charge previews terrain clipping and stops for a structure added during the windup',()=>{
 const wall={x0:x-218,x1:x-194,y0:y-96,y1:y+96,reason:'Charge test cliff'};
 const fixed=chargeFixture(wall);
 const far=fixed.soldier('blue-near-cliff',-145,0);
 fixed.boss.chargeReadyTick=0;
 const plan=chargeStarted(tick(fixed.sim));
 assert.equal(plan?.cast.targetId,far.id);
 assert.ok(Math.abs(plan.cast.distance-174)<1e-5);
 far.y-=130;
 const terrain=chargeEnded(tick(fixed.sim,2*HZ));
 assert.equal(terrain?.stop,'terrain');
 assert.ok(Math.abs(terrain.x-(x-174))<1e-5);
 const dynamic=chargeFixture();
 dynamic.soldier('blue-beyond-wall',-255,0);
 dynamic.boss.chargeReadyTick=0;
 assert.ok(chargeStarted(tick(dynamic.sim)));
 const wallId='red-charge-collision-wall';
 dynamic.sim.state.structures[wallId]=dynamic.sim.gate({id:wallId,x:x-136,y,columns:1,rows:1,hp:1000,faction:true,arenaGate:true});
 const blocked=chargeEnded(tick(dynamic.sim,2*HZ));
 assert.equal(blocked?.stop,'terrain');
 assert.ok(Math.abs(blocked.x-(x-92))<1e-5);
 assert.equal(dynamic.sim.state.structures[wallId].hp,1000);
});

test('Bash spends the Charge cooldown and a normal-combat window separates Cleave and Charge',()=>{
 const {sim,boss,soldier}=chargeFixture();
 soldier('blue-far',-255,0);
 assert.ok(sim.teleportHero(x,y+52));
 boss.chargeReadyTick=0;
 boss.cleaveReadyTick=0;
 const cleave=tick(sim).find(e=>e.type==='cleave-start');
 assert.ok(cleave&&!boss.warlordCharge);
 const end=tick(sim,HZ).find(e=>e.type==='cleave-impact');
 assert.ok(end);
 boss.readyTick=0;
 const recovery=tick(sim,warlordCleave.recoveryTicks+warlordCharge.abilityGapTicks-1);
 assert.ok(!chargeStarted(recovery)&&recovery.some(e=>e.type==='attack'&&e.id===BOSS));
 const start=chargeStarted(tick(sim,HZ));
 assert.ok(start&&!boss.cleave);
 sim.state.heroProgression.skillPoints=1;
 sim.send({type:'learn',requestId:'learn-interrupt',skill:'bash'});
 sim.send({type:'cast',requestId:'charge-interrupt',skill:'bash',targetId:BOSS});
 const events=tick(sim,20);
 assert.ok(events.some(e=>e.type==='warlord-charge-interrupt'));
 assert.equal(boss.warlordCharge,undefined);
 assert.equal(boss.chargeReadyTick,start.at+16*HZ);
 assert.ok(!chargeEnded(events));
});

test('pause holds the Charge windup and boss death clears it before contact',()=>{
 const {sim,boss,soldier}=chargeFixture();
 soldier('blue-far',-255,0);
 boss.chargeReadyTick=0;
 const start=chargeStarted(tick(sim));
 assert.ok(start);
 sim.setPaused(true);
 sim.advance(100);
 assert.equal(sim.clock.tick,start.at);
 assert.ok(boss.warlordCharge);
 sim.setPaused(false);
 scripted(sim)(sim.clock.tick+1,()=>strike(sim,'guardian',BOSS));
 const events=tick(sim,2*HZ);
 assert.equal(sim.outcome.outcome,'victory');
 assert.equal(boss.warlordCharge,undefined);
 assert.ok(!chargeEnded(events));
});

test('the Warlord can use basic attacks before starting a ready Cleave after Charge',()=>{
 const {sim,boss,soldier}=chargeFixture();
 soldier('blue-charge-target',-220,0);
 boss.chargeReadyTick=0;
 const end=chargeEnded(tick(sim,48));
 assert.ok(end?.hit);
 assert.ok(sim.teleportHero(boss.x,boss.y+52));
 boss.readyTick=0;
 boss.cleaveReadyTick=0;
 const window=until(sim,end.at+warlordCharge.abilityGapTicks-1);
 assert.ok(window.some(e=>e.type==='attack'&&e.id===BOSS));
 assert.ok(!window.some(e=>e.type==='cleave-start'));
 assert.ok(tick(sim).some(e=>e.type==='cleave-start'));
});

const warBannerIds=warlordPhases.banners.map(b=>b.id);
function phaseFixture(){
 const sim=quiet(true,true,undefined,true);
 // Isolate boss tests from Warden damage during the longer post raise.
 const warden=entity(sim,WARDEN);
 warden.readyTick=Infinity;
 capture(sim);
 warden.readyTick=0;
 sim.state.autoAttack=false;
 return {sim,boss:entity(sim,BOSS),hero:sim.hero};
}
function removeWarBanners(sim){for(const id of warBannerIds)strike(sim,'guardian',id);}

test('huge hits stop at both one-shot thresholds and all Azure damage respects Iron Guard',()=>{
 const {sim,boss}=phaseFixture();
 const guard=sim.hero,ally=hire(sim,'roland');
 const soldier=Object.values(sim.state.units).find(u=>u.id.startsWith('blue-s-'));
 const tower=sim.defender('blue-test-tower','tower',x-58,y);
 tower.team='blue';
 assert.ok(sim.teleportHero(x-55,y));
 boss.speed=0;
 assert.equal(boss.hp,9600);
 assert.ok(warBannerIds.every(id=>entity(sim,id).invulnerable&&entity(sim,id).hp===1200&&entity(sim,id).maxHp===1200));
 strike(sim,'guardian',BOSS);
 assert.equal(boss.hp,6336);
 assert.equal(boss.warlordStage,'iron');
 assert.ok(warBannerIds.every(id=>!entity(sim,id).invulnerable));
 for(const attacker of [guard,ally,soldier,tower]){
  for(const type of ['physical','magic','direct'])sim.hit(attacker,boss,10000,type);
  assert.equal(boss.hp,6336);
  assert.equal(canAttackOn(sim.geo,{...attacker,x:x-45,y},boss,structuresFor(sim.state,'blue')),false);
 }
 const ironEvents=tick(sim,3*HZ);
 assert.equal(ironEvents.filter(e=>e.type==='warlord-phase'&&e.stage==='iron').length,1);
 assert.ok(ironEvents.some(e=>e.type==='damage'&&e.sourceId===BOSS&&e.amount>0));
 assert.equal(boss.cooldownTicks,30);
 removeWarBanners(sim);
 assert.equal(boss.warlordStage,'exposed');
 const ready=boss.cleaveReadyTick,charge=boss.chargeReadyTick,strikeAt=boss.strike;
 strike(sim,'guardian',BOSS);
 assert.equal(boss.hp,3168);
 assert.equal(boss.warlordStage,'fury');
 assert.equal(boss.cooldownTicks,23);
 assert.equal(boss.damage,110);
 assert.equal(boss.cleaveReadyTick,ready);
 assert.equal(boss.chargeReadyTick,charge);
 assert.equal(boss.strike,strikeAt);
 const events=tick(sim);
 assert.equal(events.filter(e=>e.type==='warlord-phase'&&e.stage==='exposed'&&e.reason==='banners').length,1);
 assert.equal(events.filter(e=>e.type==='warlord-phase'&&e.stage==='fury').length,1);
 boss.warlordAbilityGapTick=0;
 boss.cleaveReadyTick=0;
 boss.cleaveRecoveryTick=0;
 assert.ok(sim.teleportHero(x-54,y));
 const cleave=tick(sim,5).find(e=>e.type==='cleave-start');
 assert.ok(cleave);
 assert.equal(boss.cleaveReadyTick,cleave.at+6*HZ);
});

test('all three Azure troop types reach and damage War Banners using normal targeting',()=>{
 const {sim,boss}=phaseFixture();
 const [north,south]=warlordPhases.banners;
 const ally=hire(sim,'roland'),soldier=Object.values(sim.state.units).find(u=>u.id.startsWith('blue-s-'));
 assert.ok(sim.teleportHero(north.x-150,north.y));
 Object.assign(ally,{x:south.x-145,y:south.y});
 Object.assign(soldier,{x:north.x+160,y:north.y});
 Object.assign(boss,{damage:0,speed:0,readyTick:Infinity,cleaveReadyTick:Infinity,chargeReadyTick:Infinity});
 strike(sim,'guardian',BOSS);
 for(const u of Object.values(sim.state.units))if(u.warlordReinforcement==='iron')Object.assign(u,{damage:0,speed:0,readyTick:Infinity});
 sim.state.autoAttack=true;
 sim.send({type:'ally',requestId:'keep-boss-order',id:ally.id,order:{type:'attack',targetId:BOSS}});
 sim.send({type:'target',id:north.id});
 sim.send({type:'move',x:1,y:0});
 const events=tick(sim,8);
 sim.send({type:'move',x:0,y:0});
 events.push(...tick(sim,5*HZ));
 for(const u of [sim.hero,ally,soldier])
  assert.ok(events.some(e=>e.type==='damage'&&e.sourceId===u.id&&warBannerIds.includes(e.id)),u.id);
 assert.equal(ally.ally.order.targetId,BOSS);
});

test('Iron Guard continues to use Cleave and Charge during the shield',()=>{
 const {sim,boss}=phaseFixture();
 assert.ok(sim.teleportHero(x-54,y));
 const target=sim.state.units['blue-charge-probe']=sim.unit('blue-charge-probe','minion-blue',x-230,y+100);
 target.speed=0;target.readyTick=Infinity;
 boss.speed=0;
 strike(sim,'guardian',BOSS);
 for(const unit of Object.values(sim.state.units))if(unit.warlordReinforcement==='iron')unit.readyTick=Infinity;
 boss.chargeReadyTick=0;
 const events=tick(sim,6*HZ);
 assert.ok(events.some(e=>e.type==='cleave-impact'&&e.id===BOSS));
 assert.ok(events.some(e=>e.type==='warlord-charge-end'&&e.id===BOSS));
 assert.equal(boss.warlordStage,'iron');
 assert.equal(boss.hp,6336);
});

test('Iron Guard expires at 60 seconds and removes the remaining Banner',()=>{
 const {sim,boss}=phaseFixture();
 strike(sim,'guardian',BOSS);
 strike(sim,'guardian',warBannerIds[0]);
 const expired=boss.ironUntil;
 assert.equal(expired-sim.clock.tick,60*HZ);
 until(sim,expired-1);
 assert.equal(boss.warlordStage,'iron');
 assert.ok(entity(sim,warBannerIds[1]));
 assert.ok(tick(sim).some(e=>e.type==='warlord-phase'&&e.stage==='exposed'&&e.reason==='timeout'));
 assert.ok(warBannerIds.every(id=>!entity(sim,id)));
 assert.equal(boss.hp,6336);
});

test('both Elite formations fit above a full 19-unit regular cap and Horn reaches Forward Post',()=>{
 const {sim,boss}=phaseFixture();
 const s=sim.state;
 for(const id of Object.keys(s.units))if(id!==BOSS&&id!=='guardian')delete s.units[id];
 assert.ok(sim.teleportHero(600,1000));
 for(let i=0;i<17;i++){
  const id='red-cap-fixture-'+i;
  s.units[id]={...sim.unit(id,'minion-red',200+i*60,1090),speed:0,readyTick:Infinity};
 }
 strike(sim,'guardian',BOSS);
 removeWarBanners(sim);
 strike(sim,'guardian',BOSS);
 sim.spawnQueue.push({tick:sim.clock.tick+1,team:'red',id:'red-normal-slot',x:1848,y:360,wave:1});
 const events=tick(sim,2);
 const regular=()=>Object.values(s.units).filter(u=>u.team==='red'&&!u.warlordReinforcement).length;
 assert.equal(regular(),19);
 assert.equal(Object.values(s.units).filter(u=>u.team==='red').length,26);
 assert.equal(events.filter(e=>e.type==='spawn'&&e.id.startsWith('red-warlord-iron-')).length,3);
 assert.equal(events.filter(e=>e.type==='spawn'&&e.id.startsWith('red-warlord-horn-')).length,4);
 const hits=tick(sim,12*HZ);
 assert.ok(hits.some(e=>e.type==='damage'&&e.sourceId.startsWith('red-warlord-horn-')&&e.id==='c4-banner-forward'));
 assert.equal(boss.warlordStage,'fury');
});

test('War Horn with a lost Forward Post uses the Keep target and recapture/respawn preserves Fury',()=>{
 const {sim,boss}=phaseFixture(),s=sim.state;
 strike(sim,'guardian',BOSS);
 removeWarBanners(sim);
 strike(sim,WARDEN,s.post.bannerId);
 tick(sim);
 assert.equal(s.post.owner,'crimson');
 strike(sim,'guardian',BOSS);
 tick(sim,2);
 const horn=Object.values(s.units).filter(u=>u.warlordReinforcement==='horn');
 assert.equal(horn.length,4);
 assert.ok(horn.every(u=>u.targetId===HOME));
 for(const u of horn)strike(sim,'guardian',u.id);
 strike(sim,WARDEN,'guardian');
 const hp=boss.hp;
 assert.ok(until(sim,sim.hero.respawnTick).some(e=>e.type==='respawn'));
 if(entity(sim,WARDEN))strike(sim,'guardian',WARDEN);
 capture(sim);
 assert.equal(boss.warlordStage,'fury');
 assert.equal(boss.hp,hp);
 assert.equal(boss.cooldownTicks,23);
 assert.ok(arenaGates.every(g=>s.structures[g.id].open));
 assert.equal(Object.values(s.units).filter(u=>u.warlordReinforcement==='horn').length,0);
 const iron=Object.values(s.units).find(u=>u.warlordReinforcement==='iron');
 scripted(sim)(sim.clock.tick+1,()=>{strike(sim,'guardian',BOSS);strike(sim,iron.id,HOME);});
 tick(sim);
 assert.equal(sim.outcome.outcome,'defeat');
});

function run(policy,cleave,charge,phases,bannerPolicy){
 const sim=new Simulation('m6-'+policy,{...setup,warlord:{...setup.warlord,cleave,charge,phases}}),s=sim.state,h=sim.hero;
 const damage={guardian:0,heroes:0,soldiers:0},wavePressure={spawned:[0,0],crossed:[0,0],keep:0,post:0};
 const basic={starts:0,hits:0,damage:0,windupTicks:0},charges={started:0,hits:0,dodges:0,interruptions:0,interceptions:0,terrainStops:0};
 const casts={started:0,landed:0,hitTargets:0,dodges:0,interruptions:0},casualties={heroes:0,soldiers:0,cleave:0,charge:0};
 const bannerDamage={guardian:0,heroes:0,soldiers:0},stageTicks={},phaseSpawns={iron:0,horn:0},postChanges=[],frontlineDestroyed={};
 let ironEnd,hornPostDamage=0,totalPostDamage=0,peakRegular=0,peakPhase=0,peakAll=0;
 let lastDamage;
 const contact=new Set(),crossed=new Set(),towers=[[10,8],[10,16],[11,8],[11,16],[9,8],[9,16],[12,8],[12,16]];
 let serial=0,activation,firstContact,path=[],pathAt=-Infinity,goalId,goalAt,stallTicks=0;
 let lastLocation={x:h.x,y:h.y},peakRed=0,maxMelee=0,windowMelee=new Set();
 const send=c=>sim.send({requestId:`m6-${++serial}`,...c});
 const move=p=>{const k=1/Math.max(dist(h,p),h.speed/HZ);sim.send({type:'move',x:(p.x-h.x)*k,y:(p.y-h.y)*k});};
 const arena={x:x-92,y};
 const toTarget=(target,view)=>[[-76,0],[0,-76],[0,76],[76,0],[-56,-56],[-56,56]].map(([dx,dy])=>({x:target.x+dx,y:target.y+dy}))
  .filter(p=>!sim.geo.blocked(p.x,p.y,h.radius,view)&&canAttackOn(sim.geo,{...h,...p},target,view))
  .sort((a,b)=>dist(a,h)-dist(b,h))[0];
 const supported=policy!=='early rush';
 for(let t=0;t<600*HZ&&!sim.ended;t++){
  const boss=entity(sim,BOSS);
  const assault=activation!==undefined&&(!supported||t>=activation+12*HZ);
  const banners=warBannerIds.map(id=>s.structures[id]).filter(u=>u&&!u.invulnerable);
  const retake=bannerPolicy==='retake'&&boss?.warlordStage==='fury'&&postChanges.length<3;
  const hold=retake&&s.post.owner==='azure';
  if(t%15===0){
   const skill=['bash','taunt','zone','charge'].find(k=>s.heroProgression.skillPoints>0&&!s.heroProgression.ranks[k]&&(k!=='zone'||s.heroProgression.level>=6));
   if(skill)send({type:'learn',skill});
   if(supported){
    const dead=s.tavern.slots.findIndex(m=>m.status==='dead');
    if(dead>=0&&!sim.tavernReason({action:'revive',slot:dead}))send({type:'tavern',action:'revive',slot:dead});
    else{
     const merc=['roland','borin'].find(m=>!sim.tavernReason({action:'hire',merc:m}));
     if(merc)send({type:'tavern',action:'hire',merc});
    }
    const hasBarracks=Object.values(s.structures).some(b=>b.azureBarracks&&b.x>1350);
    if(activation&&!hasBarracks&&!sim.placementReason('barracks',32,10))send({type:'place',kind:'barracks',col:32,row:10});
    const cell=towers.find(([col,row])=>!sim.placementReason('tower',col,row));
    if(cell&&(hasBarracks||s.wood>=200||!activation&&s.iron>=30))send({type:'place',kind:'tower',col:cell[0],row:cell[1]});
    for(const slot of s.tavern.slots){
     const u=s.units[slot.unitId];
     if(!u?.ally)continue;
     const defend=policy==='split Heroes'&&slot.merc==='borin';
     const banner=bannerPolicy==='heroes'&&banners[(slot.merc==='borin'?1:0)%banners.length];
     const order=hold?{type:'defend',x:1800,y:240}:retake?{type:'follow'}:
      defend?{type:'defend',...(activation?{x:1632,y:752}:{x:552,y:720})}:
      assault?{type:'attack',targetId:banner?.id??BOSS}:{type:'follow'};
     const old=u.ally.order;
     if(old.type!==order.type||order.type==='defend'&&dist(old,order)>40||order.type==='attack'&&old.targetId!==order.targetId)
      send({type:'ally',id:u.id,order});
    }
   }
   if(h.hp>0&&s.heroProgression.ranks.bash&&!sim.remaining('bash')&&sim.skills.nearest())send({type:'cast',skill:'bash'});
   if(h.hp>0&&s.heroProgression.ranks.zone&&!sim.remaining('zone')&&h.hp<h.maxHp*.65)send({type:'cast',skill:'zone'});
   if(bannerPolicy==='heroes'&&banners.length&&h.hp>0&&s.heroProgression.ranks.taunt&&!sim.remaining('taunt')&&boss&&dist(h,boss)<140)send({type:'cast',skill:'taunt'});
  }
  if(h.hp>0){
   const view=structuresFor(s,'blue'),priority=bannerPolicy==='guardian'?banners.sort((a,b)=>dist(a,h)-dist(b,h))[0]:undefined;
   const target=setup.post.holders.map(id=>entity(sim,id)).find(Boolean)??(assault&&!retake?(priority??boss):undefined);
   const id=target?.id??(hold?'leave post':retake?'retake post':activation?'army rally':'forward ring');
   if(target&&canAttackOn(sim.geo,h,target,view)){
    sim.send({type:'target',id:target.id});move(h);path=[];
   }else{
    const desired=target?toTarget(target,view)??arena:hold?{x:2208,y:288}:retake?{x:1416,y:600}:activation?{x:1680,y:600}:{x:1416,y:600};
    if(goalId!==id||!path.length&&t-pathAt>=30||t-pathAt>=90&&dist(goalAt,desired)>32){
     goalId=id;goalAt=desired;pathAt=t;
     try{path=route(sim,desired);}catch(error){if(error.code!=='ERR_ASSERTION')throw error;path=[];}
    }
    while(path.length>1&&dist(h,path[0])<9)path.shift();
    move(path[0]??desired);
    if(target)sim.send({type:'target',id:target.id});
    if(t>0&&t%30===0&&dist(lastLocation,h)<4&&dist(h,desired)>20)stallTicks++;
   }
   if(t%30===0)lastLocation={x:h.x,y:h.y};
  }else{path=[];goalId=undefined;}
  sim.advance(DT);
  if(firstContact!==undefined&&entity(sim,BOSS)?.strike)basic.windupTicks++;
  const red=Object.values(s.units).filter(u=>u.team==='red'),phaseRed=red.filter(u=>u.warlordReinforcement).length;
  peakRed=Math.max(peakRed,red.length);peakRegular=Math.max(peakRegular,red.length-phaseRed);peakPhase=Math.max(peakPhase,phaseRed);
  peakAll=Math.max(peakAll,Object.values(s.units).filter(u=>u.hp>0).length);
  for(const u of Object.values(s.units))if(contact.has(u.id)&&!crossed.has(u.id)&&u.x<1152){
   crossed.add(u.id);
   wavePressure.crossed[Number(u.y>600)]++;
  }
  for(const e of sim.drainEvents()){
   if(e.type==='death'&&setup.post.holders.includes(e.id))frontlineDestroyed[e.id]=sim.clock.tick;
   if(e.type==='warlord-phase'){stageTicks[e.stage]=sim.clock.tick;if(e.stage==='exposed')ironEnd=e.reason;}
   if(e.type==='post'&&['captured','lost'].includes(e.change))postChanges.push([e.change,sim.clock.tick]);
   if(e.type==='spawn'&&e.id.startsWith('red-warlord-iron-'))phaseSpawns.iron++;
   if(e.type==='spawn'&&e.id.startsWith('red-warlord-horn-'))phaseSpawns.horn++;
   if(e.type==='attack'&&e.id===BOSS)basic.starts++;
   if(e.type==='damage'&&e.sourceId===BOSS&&!e.castId){basic.hits++;basic.damage+=e.amount;}
   if(e.type==='warlord-charge-start')charges.started++;
   if(e.type==='warlord-charge-interrupt')charges.interruptions++;
   if(e.type==='warlord-charge-end'){
    charges.hits+=Number(!!e.hit);charges.dodges+=Number(e.dodged);
    charges.interceptions+=Number(!!e.hit?.soldier&&e.hit.id!==e.cast.targetId);
    charges.terrainStops+=Number(e.stop==='terrain');
   }
   if(e.type==='cleave-start')casts.started++;
   if(e.type==='cleave-impact'){casts.landed++;casts.hitTargets+=e.hits.length;casts.dodges+=Number(e.dodged);}
   if(e.type==='cleave-interrupt')casts.interruptions++;
   if(e.type==='damage'&&e.amount>0)lastDamage=e;
   if(e.type==='death'&&/^blue-(h-|s-|w\d+-)/.test(e.id)){
    casualties[e.id.startsWith('blue-h-')?'heroes':'soldiers']++;
    if(lastDamage?.id===e.id&&lastDamage.castId?.startsWith('cleave-'))casualties.cleave++;
    if(lastDamage?.id===e.id&&lastDamage.castId?.startsWith('warlord-charge-'))casualties.charge++;
   }
   if(e.type==='post'&&e.change==='captured'&&e.first)activation=sim.clock.tick;
   if(e.type==='spawn'&&/^red-w\d+-/.test(e.id)){
    const wing=Number(e.id.split('-').at(-1))%2;wavePressure.spawned[wing]++;contact.add(e.id);
   }
   if(e.type!=='damage'||e.amount<=0)continue;
   if(e.id==='c4-banner-forward'){
    totalPostDamage+=e.amount;
    if(e.sourceId.startsWith('red-warlord-horn-'))hornPostDamage+=e.amount;
   }
   if(warBannerIds.includes(e.id))bannerDamage[e.sourceId==='guardian'?'guardian':e.sourceId.startsWith('blue-h-')?'heroes':'soldiers']+=e.amount;
   if(contact.has(e.sourceId)&&e.id===HOME)wavePressure.keep+=e.amount;
   if(contact.has(e.sourceId)&&e.id.startsWith('c4-banner'))wavePressure.post+=e.amount;
   if(e.id===BOSS||e.sourceId===BOSS)firstContact??=sim.clock.tick;
   if(e.id===BOSS){
    damage[e.sourceId==='guardian'?'guardian':e.sourceId.startsWith('blue-h-')?'heroes':'soldiers']+=e.amount;
    windowMelee.add(e.sourceId);
   }
  }
  if(t%HZ===0){maxMelee=Math.max(maxMelee,windowMelee.size);windowMelee=new Set();}
 }
 const seconds=t=>t===undefined?null:Math.round(t/HZ*10)/10;
 const stageDuration=(start,end)=>start===undefined?null:seconds((end??sim.clock.tick)-start);
 return {outcome:sim.outcome?.outcome??'time limit',capture:seconds(activation),bossContact:seconds(firstContact),
  frontlineDestroyed:Object.fromEntries(Object.entries(frontlineDestroyed).map(([id,tick])=>[id,seconds(tick)])),
  contactToVictory:sim.outcome?.outcome==='victory'?seconds(sim.clock.tick-firstContact):null,total:seconds(sim.clock.tick),
  deaths:s.guardianDeaths,damage,basic:{...basic,damage:Math.round(basic.damage),uptimePercent:Math.round(1000*basic.windupTicks/Math.max(1,sim.clock.tick-firstContact))/10},
  casts,charges,casualties,homeHp:Math.round(s.bases[HOME].hp),wavePressure,stallSamples:stallTicks,
  stages:{opening:stageDuration(firstContact,stageTicks.iron),iron:stageDuration(stageTicks.iron,stageTicks.exposed),ironEnd,
   exposed:stageDuration(stageTicks.exposed,stageTicks.fury),fury:stageDuration(stageTicks.fury)},
  phaseSpawns,bannerDamage,totalPostDamage,hornPostDamage,postChanges:postChanges.map(([c,tick])=>[c,seconds(tick)]),
  attackersInOneSecond:maxMelee,peakRed,peakRegular,peakPhase,peakAll,maxPlansPerTick:sim.navigation.stats.maxPlansPerTick};
}

for(const strategy of ['early rush','split Heroes','two attacking Heroes'])for(const phase of ['A','B','C','D'])test(`Phase E balance, Phase ${phase} abilities: ${strategy}`,t=>{
 const cleave=phase!=='A'?true:undefined,charge=phase==='C'||phase==='D'?true:undefined;
 const result=run(strategy,cleave,charge,phase==='D'?true:undefined);
 t.diagnostic(JSON.stringify(result));
 assert.ok(result.peakRegular<=19&&result.peakRed<=26&&result.wavePressure.spawned.every(n=>n>0));
 if(strategy==='early rush'){
  assert.ok(result.wavePressure.crossed.every(n=>n>0));
 }else{
  assert.ok(result.capture!==null);
  assert.equal(result.outcome,'victory');
 }
 if(strategy==='two attacking Heroes')assert.ok(result.damage.guardian>0&&result.damage.heroes>0);
 if(strategy==='split Heroes')assert.ok(result.damage.soldiers>0);
 if(cleave&&strategy!=='early rush')assert.ok(result.casts.started>0&&result.casts.hitTargets>0);
});

for(const strategy of ['guardian','heroes','retake'])test(`Phase E tactic: ${strategy}`,t=>{
 const result=run('two attacking Heroes',true,true,true,strategy);
 t.diagnostic(JSON.stringify(result));
 assert.equal(result.outcome,'victory');
 if(strategy==='guardian')assert.ok(result.bannerDamage.guardian>0);
 if(strategy==='heroes')assert.ok(result.bannerDamage.heroes>0);
 if(strategy==='retake')assert.deepEqual(result.postChanges.slice(0,3).map(([change])=>change),['captured','lost','captured']);
});

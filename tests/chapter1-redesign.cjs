const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {fordCaptainId}=require('../.test-build/data/fordCaptain.js');
const {crimsonHero}=require('../.test-build/data/combat.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {play,standing,strike,until,objective,dist}=require('./support/campaignBot.cjs');
const legacy=require('./support/legacyCampaign.cjs').campaign;
// Phase B2A (Revision 2): Chapter 1 Missions 2-6 as redesigned. Definition checks plus short, focused plays; no bot suites. Bot results are correctness evidence, not a verdict on fun.
const rows=id=>campaign.get(id).mission.phases.map(p=>p.objectives.map(o=>`${o.type}${o.count!==undefined?':'+o.count:''}`));
const FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'],GATE=['red-tower-keep-north','red-tower-keep-south'];
const BATTERIES=['red-tower-front-north','red-tower-rear-north','red-tower-keep-rear','red-tower-front-south','red-tower-rear-south'];
const alive=(sim,id)=>sim.state.structures[id].hp>0;

test('Chapter 1 retains the approved match settings outside the Keep, perimeter and Captain changes',()=>{
 assert.deepEqual(campaign.get('campaign-01').mission.phases[0].objectives[0],legacy.byNumber(1).mission.phases[0].objectives[0]);
 for(const [id,n] of [['campaign-03',8],['campaign-06',10]]){const {wardens:_wardens,...o}=campaign.get(id).match.overrides;assert.deepEqual({...campaign.get(id).match,overrides:o},legacy.byNumber(n).match,`${id} retains the other settings from old Level ${n}`);}
 const {defenders,crimsonKeepHp,...fortify}=campaign.get('campaign-02').match.overrides;
 const {defenders:_oldDefenders,...source}=legacy.byNumber(2).match.overrides;
 assert.deepEqual(fortify,source);assert.equal(crimsonKeepHp,4000);
 assert.equal(defenders.length,8);
 assert.deepEqual(campaign.setup('campaign-02').encounter.defenders,campaign.setup('campaign-01').encounter.defenders);
 const o=campaign.get('campaign-04').match.overrides;
 assert.deepEqual(o.waves,{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,4,4,5,5,6,6,7],alliedPerWave:2});
 assert.deepEqual(o.defenders,BATTERIES);assert.equal(o.crimsonKeepArmed,false);
 const rear=campaign.setup('campaign-04').encounter.defenders.find(d=>d.id==='red-tower-keep-rear');
 assert.deepEqual([rear.x,rear.y],[1760,600]);
 assert.equal('start' in o,false,'default starting resources');assert.equal('shop' in o,false);
});

test('Hold the Ford advances only Crimson, preserving all five Azure groups and the original spawns within each group',()=>{
 const setup=campaign.setup('campaign-01'),baseline=legacy.setup(1),{encounter}=setup;
 const redTicks=[240,915,1590,2265,2940];
 assert.equal(setup.waveRules.waveInterval,675);
 assert.deepEqual(setup.start,baseline.start);
 assert.deepEqual(encounter.defenders,baseline.encounter.defenders);
 assert.equal(encounter.continuous,false);
 assert.deepEqual(encounter.waves.map(w=>w.tick),redTicks);
 assert.deepEqual(encounter.spawns.filter(e=>e.team==='blue'),baseline.encounter.spawns.filter(e=>e.team==='blue'));
 assert.deepEqual(encounter.spawns.filter(e=>e.team==='red'),
  baseline.encounter.spawns.filter(e=>e.team==='red').map(e=>({...e,tick:e.tick-(e.wave-1)*75})));
 const sim=new Simulation('c1-m1-crimson-cadence',setup);
 const log=play(sim,6000,{hold:{x:820,y:590},leash:760,cast:{bash:true}});
 assert.equal(sim.outcome?.outcome,'victory');
 assert.deepEqual(log.filter(e=>e.type==='wave').map(e=>e.at),redTicks);
 assert.deepEqual(log.filter(e=>e.type==='spawn'&&e.id.startsWith('blue-w')).map(e=>[e.id,e.at]),
  encounter.spawns.filter(e=>e.team==='blue').map(e=>[e.id,e.tick]));
});

test('no Chapter 1 mission keeps a skill-count, tower-damage, tower-kill or level row; only Mission 2 asks for towers',()=>{
 const all=['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05','campaign-06'].flatMap(id=>campaign.get(id).mission.phases.flatMap(p=>p.objectives.map(o=>[id,o.type])));
 assert.deepEqual(all.filter(([,t])=>['skill-impact','tower-damage','tower-kills','guardian-level','structures-standing'].includes(t)),[]);
 assert.deepEqual(all.filter(([,t])=>t==='structures-completed').map(([id])=>id),['campaign-02']);
 assert.deepEqual(all.filter(([,t])=>t==='waves-defeated').map(([id])=>id),['campaign-01','campaign-02'],'Missions 3-6 have no wave gate');
});

test('mission-by-mission objectives, failure lines and targets',()=>{
 assert.deepEqual(rows('campaign-01'),[['waves-defeated:5','destroy']]);
 const ford=campaign.setup('campaign-01');
 assert.deepEqual(ford.mission.phases[0].anyOf.ids,['waves','keep']);
 assert.equal(ford.crimsonKeepHp,4000);assert.equal(ford.keepDefense.red,null);
 assert.equal(ford.crimsonKeepInvulnerable,false);assert.equal(ford.crimsonKeepScenery,undefined);
 assert.deepEqual(rows('campaign-02'),[['structures-completed:2','waves-defeated:6','destroy']]);
 assert.deepEqual(campaign.get('campaign-02').mission.phases[0].anyOf.ids,['waves','keep']);
 for(const id of ['campaign-03','campaign-04','campaign-05'])assert.deepEqual(rows(id),[['destroy','destroy']]);
 assert.deepEqual(rows('campaign-06'),[['destroy']]);
 assert.equal(campaign.get('campaign-01').mission.failure,undefined);assert.equal(campaign.get('campaign-02').mission.failure,undefined);
 for(const id of ['campaign-03','campaign-04','campaign-05','campaign-06']){assert.equal(campaign.get(id).mission.failure,undefined,'the Azure Keep is lost only at 0 HP');assert.doesNotMatch(campaign.get(id).display.briefing,/below d+%/);}
 const targets=id=>campaign.get(id).mission.phases[0].objectives[0].targets;
 assert.deepEqual(targets('campaign-03'),FRONT);
 assert.deepEqual(targets('campaign-04'),BATTERIES);
 assert.deepEqual(targets('campaign-05'),['red-barracks-camp'],'the Crimson War Camp');
 assert.deepEqual(targets('campaign-06'),['red-base']);
});

test('HUD title rules are not triggered by accident: no first row targets 5 waves (except Mission 1) or 3 battery towers',()=>{
 for(const id of ['campaign-02','campaign-03','campaign-04','campaign-05','campaign-06']){
  const first=campaign.get(id).mission.phases[0].objectives[0],n=first.count??first.targets?.length;
  assert.ok(!(first.type==='waves-defeated'&&first.count===5)&&!(n===3&&/battery/i.test(first.display.label)),id);
  assert.ok(campaign.get(id).display.briefing.length<=320,`${id} briefing fits the panel`);
 }
});

test('Mission 2 cannot stall on its build row: waves keep coming past the sixth, and the towers row is the only gate',()=>{
 const setup=campaign.setup('campaign-02');
 assert.equal(setup.mission.waveMode,'until-objectives');
 for(const n of [7,8,12])assert.equal(extendedWaveSpawns(n,setup.waveRules).filter(e=>e.team==='red').length,6,`wave ${n} repeats the final size`);
 // Hold at the Ford with no towers: the sixth wave falls, the mission is not won, and waves 7+ keep arriving.
 const sim=new Simulation('c1-m2-none',setup);play(sim,12000,{towers:0,leash:650,hold:{x:620,y:600}});
 const wave7=Object.keys(sim.state.units).some(k=>/^red-w(?:[7-9]|\d\d)-/.test(k));
 assert.notEqual(sim.outcome&&sim.outcome.outcome,'victory');assert.equal(objective(sim,'towers').progress,0);assert.equal(objective(sim,'waves').progress,6,'waves are capped at the target, not stalled');assert.ok(sim.ended||wave7,'play continued past wave 6');
 // Two towers and the same hold win.
 const win=new Simulation('c1-m2-win',setup),log=[];play(win,9000,{towers:2,leash:650,hold:{x:620,y:600},log});
 assert.equal(win.outcome.outcome,'victory');assert.ok(log.filter(e=>e.type==='construction-complete').length>=2);
});

test('Mission 3 (Against the Tide): old Level 8 setup, the front line is the only target, the gate towers are not',()=>{
 const setup=campaign.setup('campaign-03');
 assert.deepEqual([setup.start.wood,setup.start.iron],[80,10]);assert.equal(setup.waveRules.alliedPerWave,1);assert.equal(setup.shop,true);
 assert.deepEqual(setup.waveRules.enemyPerWave,[3,3,4,4,5,5,6,6]);assert.equal(setup.waveRules.waveInterval,750);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),[...FRONT,...GATE].sort());
 const sim=new Simulation('c1-m3-win',setup);
 until(sim,2);strike(sim,'guardian',FRONT[0]);strike(sim,'guardian',FRONT[1]);assert.equal(sim.missionStatus().status,'active','two of three front towers is not enough');
 strike(sim,'guardian',FRONT[2]);until(sim,sim.clock.tick+2);
 assert.equal(sim.outcome.outcome,'victory');assert.ok(GATE.every(id=>alive(sim,id)),'victory with both gate towers still standing');
 assert.ok(sim.state.units[fordCaptainId]?.hp>0,'victory with the Captain alive');
 // The gate towers alone never win.
 const gates=new Simulation('c1-m3-gates',campaign.setup('campaign-03'));until(gates,2);for(const id of GATE)strike(gates,'guardian',id);until(gates,gates.clock.tick+2);
 assert.equal(gates.missionStatus().status,'active');assert.equal(gates.ended,false);
 const lose=new Simulation('c1-m3-idle',campaign.setup('campaign-03'));play(lose,9000,{park:true});
 assert.equal(lose.outcome.outcome,'defeat');assert.equal(lose.outcome.reason,'azure-keep-destroyed');
});

test('Mission 3: a prepared no-boost assault naturally meets the Captain before breaking the line',()=>{
 const sim=new Simulation('c1-m3-prepared',campaign.setup('campaign-03'));
 let contact;
 play(sim,12000,{targets:[FRONT[1],FRONT[0],FRONT[2]],towers:1,hold:{x:820,y:590},leash:820,gate:s=>s.clock.tick<750,cast:{bash:true},stop:s=>{
  const captain=s.state.units[fordCaptainId];
  if(contact===undefined&&captain&&s.hero.hp>0&&dist(s.hero,captain)<=190)contact=s.clock.tick;
  return false;
 }});
 assert.ok(contact>=25*30&&contact<=45*30,'Captain survived Azure soldiers until the Guardian arrived');
 assert.equal(sim.outcome?.outcome,'victory');
});

test('Mission 3: the Captain uses the existing Hero footprint, a dodgeable 18-tick strike and one life',()=>{
 const setup=campaign.setup('campaign-03'),sim=new Simulation('c1-m3-captain',setup);
 const captain=sim.state.units[fordCaptainId],stats=crimsonHero.stats;
 for(const key of ['maxHp','armor','damage','speed','radius','range','cooldownTicks'])assert.equal(captain[key],stats[key],key);
 assert.equal(captain.hp,833);assert.equal(captain.localGuard.radius,156);
 assert.ok(sim.teleportHero(captain.x-40,captain.y));
 const attacks=until(sim,1),attack=attacks.find(e=>e.type==='attack'&&e.id===fordCaptainId);
 assert.equal(attack?.targetId,'guardian');assert.equal(captain.strike.atTick-attack.at,18);
 assert.ok(sim.teleportHero(820,590));
 assert.ok(!until(sim,19).some(e=>e.type==='damage'&&e.sourceId===fordCaptainId&&e.id==='guardian'));
 assert.ok(sim.teleportHero(captain.x-55,captain.y));
 const gold=sim.state.gold;strike(sim,'guardian',fordCaptainId);
 const rewards=sim.drainEvents();
 assert.equal(rewards.find(e=>e.type==='reward'&&e.id===fordCaptainId)?.gold,25);
 assert.equal(sim.state.gold-gold,25);
 assert.equal(rewards.find(e=>e.type==='xp'&&e.heroId==='guardian')?.amount,150);
 assert.ok(!until(sim,1800).some(e=>e.type==='spawn'&&e.id===fordCaptainId));
 assert.equal(sim.state.units[fordCaptainId],undefined);
});

test('Mission 4 (The Twin Batteries): five towers, default resources, two allies; four of five does not win',()=>{
 const setup=campaign.setup('campaign-04');
 assert.deepEqual([setup.start.wood,setup.start.iron],[180,30]);assert.equal(setup.waveRules.alliedPerWave,2);assert.equal(setup.shop,true);
 assert.deepEqual(setup.waveRules.enemyPerWave,[3,4,4,5,5,6,6,7]);assert.equal(setup.waveRules.waveInterval,750);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),[...BATTERIES].sort());
 const all=BATTERIES,sim=new Simulation('c1-m4-win',setup);
 until(sim,2);for(const id of all.slice(0,4))strike(sim,'guardian',id);assert.equal(sim.missionStatus().status,'active');assert.equal(sim.ended,false);
 strike(sim,'guardian',all[4]);until(sim,sim.clock.tick+2);assert.equal(sim.outcome.outcome,'victory');
 const lose=new Simulation('c1-m4-idle',campaign.setup('campaign-04'));play(lose,12000,{park:true});
 assert.equal(lose.outcome.outcome,'defeat');assert.equal(lose.outcome.reason,'azure-keep-destroyed');
});

test('Mission 4 raid probes: only 0 HP loses, and two towers at home sustain the battery assault',()=>{
 const all=BATTERIES;
 const none=new Simulation('c1-m4-none',campaign.setup('campaign-04'));play(none,14000,{targets:all});
 const keep=none.state.bases['blue-base'];assert.ok(none.outcome,'the match is decided');
 if(none.outcome.outcome==='defeat'){assert.equal(none.outcome.reason,'azure-keep-destroyed');assert.ok(keep.hp<=0,'a defeat never happens while the Azure Keep has HP');}
 else assert.ok(keep.hp>0,'a win with nothing at home leaves a standing Azure Keep');
 const two=new Simulation('c1-m4-two',campaign.setup('campaign-04'));play(two,14000,{targets:all,towers:2});
 assert.equal(two.outcome.outcome,'victory');assert.ok(two.clock.tick>=30*45,'the five-tower assault takes real time');
});

test('Mission 5 is won by the War Camp alone, with or without breaking the five-tower perimeter',()=>{
 const setup=campaign.setup('campaign-05'),sim=new Simulation('c1-m5',setup);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id),[...FRONT,...GATE]);
 until(sim,2);for(const id of [...FRONT,...GATE])strike(sim,'guardian',id);until(sim,sim.clock.tick+2);
 assert.equal(sim.missionStatus().status,'active','every tower down is not a win');
 const bypass=new Simulation('c1-m5-bypass',setup);
 until(bypass,2);strike(bypass,'guardian','red-barracks-camp');until(bypass,4);
 assert.equal(bypass.outcome.outcome,'victory');assert.equal(bypass.outcome.reason,'objectives-complete');
 assert.ok([...FRONT,...GATE].every(id=>alive(bypass,id)));
 assert.equal(bypass.state.bases['red-base'].hp,3000);
});

test('Mission 6 is won the moment the Crimson Keep falls, with the gate towers still standing; the Keep still fights back',()=>{
 const setup=campaign.setup('campaign-06');assert.ok(setup.keepDefense.red);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),['red-tower-front-center','red-tower-keep-north','red-tower-keep-south']);
 assert.equal(setup.mission.phases.length,1);
 const sim=new Simulation('c1-m6',setup);
 until(sim,2);strike(sim,'guardian','red-base');until(sim,sim.clock.tick+2);
 assert.equal(sim.outcome.outcome,'victory');assert.equal(sim.outcome.reason,'objectives-complete');
 assert.ok(GATE.every(id=>alive(sim,id)),'victory with both gate towers standing');
});

test('Mission 6 raid probes: a Keep rush with nothing at home is lost, with two towers it is won (no trivial rush)',()=>{
 const none=new Simulation('c1-m6-none',campaign.setup('campaign-06'));play(none,16000,{targets:['red-base']});
 assert.equal(none.outcome.outcome,'defeat');
 const two=new Simulation('c1-m6-two',campaign.setup('campaign-06')),log=[];play(two,16000,{targets:['red-base'],towers:2,log});
 assert.equal(two.outcome.outcome,'victory');assert.ok(log.filter(e=>e.type==='death'&&e.id==='guardian').length>=1,'the armed Keep costs the Guardian');
});

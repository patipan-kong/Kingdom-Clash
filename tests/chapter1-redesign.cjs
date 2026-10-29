const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {play,standing,strike,until,objective}=require('./support/campaignBot.cjs');
const legacy=require('./support/legacyCampaign.cjs').campaign;
// Phase B2A (Revision 2): Chapter 1 Missions 2-6 as redesigned. Definition checks plus short, focused plays; no bot suites. Bot results are correctness evidence, not a verdict on fun.
const rows=id=>campaign.get(id).mission.phases.map(p=>p.objectives.map(o=>`${o.type}${o.count!==undefined?':'+o.count:''}`));
const T=n=>`red-tower-${n}`;
const FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'],GATE=['red-tower-keep-north','red-tower-keep-south'];
const NORTH=['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'],SOUTH=['red-tower-front-south','red-tower-rear-south'];
const alive=(sim,id)=>sim.state.structures[id].hp>0;

test('Mission 1 is old Level 1 untouched; Missions 2, 3, 5 and 6 keep their source match; Mission 4 is the two-battery setup',()=>{
 assert.deepEqual(campaign.get('campaign-01').mission,legacy.byNumber(1).mission);
 for(const [id,n] of [['campaign-02',2],['campaign-03',8],['campaign-05',9],['campaign-06',10]])assert.deepEqual(campaign.get(id).match,legacy.byNumber(n).match,`${id} keeps old Level ${n}'s match`);
 const o=campaign.get('campaign-04').match.overrides;
 assert.deepEqual(o.waves,{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,4,4,5,5,6,6,7],alliedPerWave:2});
 assert.deepEqual(o.defenders,[...NORTH,...SOUTH]);assert.equal(o.crimsonKeepArmed,false);
 assert.equal('start' in o,false,'default starting resources');assert.equal('shop' in o,false);
});

test('no Chapter 1 mission keeps a skill-count, tower-damage, tower-kill or level row; only Mission 2 asks for towers',()=>{
 const all=['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05','campaign-06'].flatMap(id=>campaign.get(id).mission.phases.flatMap(p=>p.objectives.map(o=>[id,o.type])));
 assert.deepEqual(all.filter(([,t])=>['skill-impact','tower-damage','tower-kills','guardian-level','structures-standing'].includes(t)),[]);
 assert.deepEqual(all.filter(([,t])=>t==='structures-completed').map(([id])=>id),['campaign-02']);
 assert.deepEqual(all.filter(([,t])=>t==='waves-defeated').map(([id])=>id),['campaign-01','campaign-02'],'Missions 3-6 have no wave gate');
});

test('mission-by-mission objectives, failure lines and targets',()=>{
 assert.deepEqual(rows('campaign-01'),[['waves-defeated:5']]);
 assert.deepEqual(rows('campaign-02'),[['structures-completed:2','waves-defeated:6']]);
 for(const id of ['campaign-03','campaign-04','campaign-05','campaign-06'])assert.deepEqual(rows(id),[['destroy']],`${id} has one phase with one outcome objective`);
 assert.equal(campaign.get('campaign-01').mission.failure,undefined);assert.equal(campaign.get('campaign-02').mission.failure,undefined);
 for(const id of ['campaign-03','campaign-04','campaign-05','campaign-06'])assert.equal(campaign.get(id).mission.failure.azureKeepHpBelow,.5);
 const targets=id=>campaign.get(id).mission.phases[0].objectives[0].targets;
 assert.deepEqual(targets('campaign-03'),FRONT);
 assert.deepEqual(targets('campaign-04'),[...NORTH,...SOUTH]);
 assert.deepEqual(targets('campaign-05'),['red-tower-front-center','red-tower-rear-north','red-tower-rear-south']);
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
 // The gate towers alone never win.
 const gates=new Simulation('c1-m3-gates',campaign.setup('campaign-03'));until(gates,2);for(const id of GATE)strike(gates,'guardian',id);until(gates,gates.clock.tick+2);
 assert.equal(gates.missionStatus().status,'active');assert.equal(gates.ended,false);
 const lose=new Simulation('c1-m3-idle',campaign.setup('campaign-03'));play(lose,9000,{park:true});
 assert.equal(lose.outcome.outcome,'defeat');assert.equal(lose.outcome.reason,'azure-keep-hp-threshold');
});

test('Mission 3 can be completed by a raid with or without a tower at home (no early-win or stall)',()=>{
 for(const [name,opts] of [['raid, no tower',{}],['raid, one tower',{towers:1}],['hold 60 s, one tower',{towers:1,gate:s=>s.clock.tick<1800}]]){
  const sim=new Simulation('c1-m3-'+name,campaign.setup('campaign-03'));play(sim,12000,{targets:FRONT,...opts});
  assert.equal(sim.outcome&&sim.outcome.outcome,'victory',name);assert.ok(sim.clock.tick>=600,`${name}: not an instant win`);
 }
});

test('Mission 4 (The Twin Batteries): five towers, default resources, two allies; four of five does not win',()=>{
 const setup=campaign.setup('campaign-04');
 assert.deepEqual([setup.start.wood,setup.start.iron],[180,30]);assert.equal(setup.waveRules.alliedPerWave,2);assert.equal(setup.shop,true);
 assert.deepEqual(setup.waveRules.enemyPerWave,[3,4,4,5,5,6,6,7]);assert.equal(setup.waveRules.waveInterval,750);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),[...NORTH,...SOUTH].sort());
 const all=[...NORTH,...SOUTH],sim=new Simulation('c1-m4-win',setup);
 until(sim,2);for(const id of all.slice(0,4))strike(sim,'guardian',id);assert.equal(sim.missionStatus().status,'active');assert.equal(sim.ended,false);
 strike(sim,'guardian',all[4]);until(sim,sim.clock.tick+2);assert.equal(sim.outcome.outcome,'victory');
 const lose=new Simulation('c1-m4-idle',campaign.setup('campaign-04'));play(lose,12000,{park:true});
 assert.equal(lose.outcome.outcome,'defeat');assert.equal(lose.outcome.reason,'azure-keep-hp-threshold');
});

test('Mission 4 raid probes: with no tower at home the raid is lost; with two towers it is won, slowly',()=>{
 const all=[...NORTH,...SOUTH];
 const none=new Simulation('c1-m4-none',campaign.setup('campaign-04'));play(none,14000,{targets:all});
 assert.equal(none.outcome.outcome,'defeat','a raid with nothing at home loses');assert.equal(none.outcome.reason,'azure-keep-hp-threshold');
 const two=new Simulation('c1-m4-two',campaign.setup('campaign-04'));play(two,14000,{targets:all,towers:2});
 assert.equal(two.outcome.outcome,'victory');assert.ok(two.clock.tick>=30*45,'the five-tower assault takes real time');
});

test('Mission 5 is won by the wedge alone: the slow row is gone and no other objective exists',()=>{
 const sim=new Simulation('c1-m5',campaign.setup('campaign-05'));
 until(sim,2);strike(sim,'guardian',T('rear-north'));strike(sim,'guardian',T('rear-south'));assert.equal(sim.missionStatus().status,'active');strike(sim,'guardian',T('front-center'));until(sim,sim.clock.tick+2);
 assert.equal(sim.outcome.outcome,'victory');
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

const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {play,standing,strike,until,objective}=require('./support/campaignBot.cjs');
const legacy=require('./support/legacyCampaign.cjs').campaign;
// Phase B2A: Chapter 1 Missions 2-6 as redesigned. Definition checks plus short, focused plays; no bot suites. Bot results are correctness evidence, not a verdict on fun.
const rows=id=>campaign.get(id).mission.phases.map(p=>p.objectives.map(o=>`${o.type}${o.count!==undefined?':'+o.count:''}`));
const T=n=>`red-tower-${n}`;

test('Mission 1 is old Level 1 untouched; Missions 2-6 keep their source match except where stated',()=>{
 assert.deepEqual(campaign.get('campaign-01').mission,legacy.byNumber(1).mission);
 for(const [id,n] of [['campaign-02',2],['campaign-03',4],['campaign-05',9],['campaign-06',10]])assert.deepEqual(campaign.get(id).match,legacy.byNumber(n).match,`${id} keeps old Level ${n}'s match`);
 // Mission 3 is old Level 4's match exactly: the two-tower south battery. An experimental third defender (front-center) was tried and reverted; the raid question goes to the human playtest.
 const was=legacy.byNumber(7).match.overrides,now=campaign.get('campaign-04').match.overrides;
 assert.equal(was.shop,false);assert.equal('shop' in now,false,'The Killing Ground opens the Shop (default) and changes nothing else');
 assert.deepEqual({...was,shop:undefined},{...now,shop:undefined});
 assert.equal(campaign.setup('campaign-04').shop,true);
});

test('no Chapter 1 mission keeps a skill-count, tower-damage or tower-kill row; only Mission 2 asks for towers',()=>{
 const all=['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05','campaign-06'].flatMap(id=>campaign.get(id).mission.phases.flatMap(p=>p.objectives.map(o=>[id,o.type])));
 assert.deepEqual(all.filter(([,t])=>['skill-impact','tower-damage','tower-kills','guardian-level','structures-standing'].includes(t)),[]);
 assert.deepEqual(all.filter(([,t])=>t==='structures-completed').map(([id])=>id),['campaign-02']);
});

test('mission-by-mission objectives, failure lines and objective counts',()=>{
 assert.deepEqual(rows('campaign-01'),[['waves-defeated:5']]);
 assert.deepEqual(rows('campaign-02'),[['structures-completed:2','waves-defeated:6']]);
 assert.deepEqual(rows('campaign-03'),[['destroy']]);
 assert.deepEqual(rows('campaign-04'),[['waves-defeated:6']]);
 assert.deepEqual(rows('campaign-05'),[['destroy']]);
 assert.deepEqual(rows('campaign-06'),[['destroy'],['destroy']]);
 assert.equal(campaign.get('campaign-01').mission.failure,undefined);assert.equal(campaign.get('campaign-02').mission.failure,undefined);
 for(const id of ['campaign-03','campaign-04','campaign-05','campaign-06'])assert.equal(campaign.get(id).mission.failure.azureKeepHpBelow,.5);
 assert.deepEqual(campaign.get('campaign-03').mission.phases[0].objectives[0].targets,['red-tower-front-south','red-tower-rear-south']);
 assert.deepEqual(campaign.get('campaign-05').mission.phases[0].objectives[0].targets,['red-tower-front-center','red-tower-rear-north','red-tower-rear-south']);
 assert.deepEqual(campaign.get('campaign-06').mission.phases.map(p=>p.objectives[0].targets),[['red-tower-keep-north','red-tower-keep-south'],['red-base']]);
});

test('HUD title rules are not triggered by accident: no first row targets 5 waves (except Mission 1) or 3 battery towers',()=>{
 for(const id of ['campaign-02','campaign-03','campaign-04','campaign-05','campaign-06']){
  const first=campaign.get(id).mission.phases[0].objectives[0];
  assert.ok(!(first.type==='waves-defeated'&&first.count===5)&&!(first.count===3&&/battery/i.test(first.display.label)),id);
 }
 for(const id of ['campaign-02','campaign-03','campaign-04','campaign-05','campaign-06'])assert.ok(campaign.get(id).display.briefing.length<=320,`${id} briefing fits the panel`);
});

test('Mission 2 cannot stall on its build row: waves keep coming past the sixth, and the towers row is the only gate',()=>{
 const setup=campaign.setup('campaign-02');
 assert.equal(setup.mission.waveMode,'until-objectives');
 for(const n of [7,8,12])assert.equal(extendedWaveSpawns(n,setup.waveRules).filter(e=>e.team==='red').length,6,`wave ${n} repeats the final size`);
 // Hold at the Ford with no towers: the sixth wave falls, the mission is not won, and waves 7+ keep arriving.
 const sim=new Simulation('c1-m2-none',setup);play(sim,12000,{towers:0,leash:650,hold:{x:620,y:600}});
 const st=sim.missionStatus(),wave7=Object.keys(sim.state.units).some(k=>/^red-w(?:[7-9]|\d\d)-/.test(k));
 assert.notEqual(sim.outcome&&sim.outcome.outcome,'victory');assert.equal(objective(sim,'towers').progress,0);assert.equal(objective(sim,'waves').progress,6,'waves are capped at the target, not stalled');assert.ok(sim.ended||wave7,'play continued past wave 6');
 // Two towers and the same hold win.
 const win=new Simulation('c1-m2-win',setup),log=[];play(win,9000,{towers:2,leash:650,hold:{x:620,y:600},log});
 assert.equal(win.outcome.outcome,'victory');assert.ok(log.filter(e=>e.type==='construction-complete').length>=2);
});

test('Mission 3 is lost with the Keep at 50%, is won by taking the battery, and has the Shop open',()=>{
 const setup=campaign.setup('campaign-03');assert.equal(setup.shop,true);assert.equal(setup.start.gold,250);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),['red-tower-front-south','red-tower-rear-south']);
 const sim=new Simulation('c1-m3-win',setup);
 until(sim,2,[]);strike(sim,'guardian',T('front-south'));assert.equal(sim.missionStatus().status,'active');strike(sim,'guardian',T('rear-south'));until(sim,sim.clock.tick+2);
 assert.equal(sim.outcome.outcome,'victory','the two battery towers win');
 const lose=new Simulation('c1-m3-idle',campaign.setup('campaign-03'));play(lose,9000,{park:true});
 assert.equal(lose.outcome.outcome,'defeat');assert.equal(lose.outcome.reason,'azure-keep-hp-threshold');
});

test('Mission 3, a hold-first approach and a raid both end in victory (the early raid is the open question for the human playtest)',()=>{
 const S=['red-tower-front-south','red-tower-rear-south'];
 for(const [name,opts] of [['hold 60 s',{towers:2,gate:s=>s.clock.tick<1800}],['raid at once',{towers:2}]]){
  const sim=new Simulation('c1-m3-'+name,campaign.setup('campaign-03'));play(sim,9000,{targets:S,...opts});
  assert.equal(sim.outcome&&sim.outcome.outcome,'victory',name);
 }
});

test('Mission 4: no towers lose, three towers win; resources are scarce and nobody helps',()=>{
 const setup=campaign.setup('campaign-04');
 assert.deepEqual([setup.start.wood,setup.start.iron],[100,10]);assert.equal(setup.waveRules.alliedPerWave,0);assert.equal(setup.encounter.defenders.length,0);
 assert.deepEqual(setup.waveRules.enemyPerWave,[4,5,5,6,6,7]);
 const idle=new Simulation('c1-m4-idle',setup);play(idle,12000,{park:true});assert.equal(idle.outcome.reason,'azure-keep-hp-threshold');
 const win=new Simulation('c1-m4-win',campaign.setup('campaign-04'));play(win,12000,{towers:3,leash:650,hold:{x:620,y:600},cast:{taunt:2}});
 assert.equal(win.outcome.outcome,'victory');assert.equal(objective(win,'waves').progress,6);
});

test('Mission 5 is won by the wedge alone: the slow row is gone and no other objective exists',()=>{
 const sim=new Simulation('c1-m5',campaign.setup('campaign-05'));
 until(sim,2);strike(sim,'guardian',T('rear-north'));strike(sim,'guardian',T('rear-south'));assert.equal(sim.missionStatus().status,'active');strike(sim,'guardian',T('front-center'));until(sim,sim.clock.tick+2);
 assert.equal(sim.outcome.outcome,'victory');
});

test('Mission 6 needs the gate towers first, then the Crimson Keep; the Keep still fights back',()=>{
 const setup=campaign.setup('campaign-06');assert.ok(setup.keepDefense.red);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),['red-tower-front-center','red-tower-keep-north','red-tower-keep-south']);
 const sim=new Simulation('c1-m6',setup);
 until(sim,2);strike(sim,'guardian',T('keep-north'));strike(sim,'guardian',T('keep-south'));until(sim,sim.clock.tick+2);
 assert.equal(sim.missionStatus().status,'active');assert.equal(sim.missionStatus().activePhase,'siege');
 strike(sim,'guardian','red-base');until(sim,sim.clock.tick+2);assert.equal(sim.outcome.outcome,'victory');
});

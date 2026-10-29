const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign,sixMissionSources}=require('../.test-build/data/campaignLevels.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {baseHp}=require('../.test-build/data/match.js');
const {play,strike,until}=require('./support/campaignBot.cjs');
const legacy=require('./support/legacyCampaign.cjs').campaign;
// Phase B2B: Chapter 2 as six outcome missions. Definition checks, the optional Crimson Keep hit points, and short scripted probes; no bot suites.
// Bot results are guardrails (no trivial win, no unreachable objective, no stall), not evidence about fun.
const IDS=[11,12,13,14,15,16].map(n=>`campaign-${n}`);
const rows=id=>campaign.get(id).mission.phases.map(p=>p.objectives.map(o=>`${o.type}${o.count!==undefined?':'+o.count:''}`));
const FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'],GATE=['red-tower-keep-north','red-tower-keep-south'];
const won=sim=>assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['victory','objectives-complete'],JSON.stringify(sim.missionStatus().objectives.map(o=>[o.id,o.progress])));

test('the six slots take their missions from old Levels 13, 14, 19, 18, 17 and 20',()=>{
 assert.deepEqual(IDS.map(id=>sixMissionSources[id]),[13,14,19,18,17,20]);
 assert.deepEqual(IDS.map(id=>campaign.get(id).display.title),['The Dust Riders','The Southern Flank','The Sandstone Line','The Twin Banks','The Long Dusk','The Crimson Last Stand']);
 assert.deepEqual(IDS.map(id=>campaign.setup(id).battlefield.id),['canyon-pass','oasis','canyon-pass','oasis','canyon-pass','oasis'],'Canyon and Oasis alternate');
});

test('every mission keeps its source match (waves, defenders, start, Keep rules); only the Dust Riders gain a protected Keep and the Twin Banks a 5,000 HP Keep',()=>{
 for(const [id,n] of [['campaign-12',14],['campaign-13',19],['campaign-15',17],['campaign-16',20]])assert.deepEqual(campaign.get(id).match,legacy.byNumber(n).match,`${id} keeps old Level ${n}'s match`);
 assert.deepEqual(campaign.get('campaign-11').match.overrides,{...legacy.byNumber(13).match.overrides,crimsonKeepInvulnerable:true});
 assert.deepEqual(campaign.get('campaign-14').match.overrides,{...legacy.byNumber(18).match.overrides,crimsonKeepHp:5000});
 assert.deepEqual(campaign.setup('campaign-11').waveRules.raidersPerWave,[0,0,2,2,3,3],'Raiders appear from wave 3');
 assert.equal(campaign.setup('campaign-12').waveRules.alliedPerWave,0);assert.equal(campaign.setup('campaign-12').waveRules.enemyPerWave.length,8);
 assert.deepEqual(campaign.setup('campaign-15').waveRules.raidersPerWave.slice(0,2),[0,2],'Raiders from wave 2');
 assert.equal(campaign.setup('campaign-15').waveRules.waveInterval,600,'a wave every 20 seconds');assert.equal(campaign.setup('campaign-15').waveRules.enemyPerWave.length,10);
 for(const id of ['campaign-13','campaign-16'])assert.deepEqual(campaign.setup(id).start,{gold:0,wood:0,iron:0,guardian:campaign.setup(id).start.guardian});
 assert.deepEqual([campaign.setup('campaign-14').start.gold,campaign.setup('campaign-14').start.wood,campaign.setup('campaign-14').start.iron],[250,0,0]);
 for(const id of ['campaign-13','campaign-16'])assert.equal(campaign.setup(id).encounter.defenders.length,5,'five Crimson towers');
 for(const id of ['campaign-12','campaign-14','campaign-15'])assert.equal(campaign.setup(id).waveRules.alliedPerWave,0,'no allies');
});

test('objectives: waves-only defences, one gate-tower objective, two Keep-only sieges; no checklist rows and no phases',()=>{
 assert.deepEqual(rows('campaign-11'),[['waves-defeated:6']]);assert.deepEqual(rows('campaign-12'),[['waves-defeated:8']]);
 assert.deepEqual(rows('campaign-13'),[['destroy']]);assert.deepEqual(rows('campaign-14'),[['destroy']]);
 assert.deepEqual(rows('campaign-15'),[['waves-defeated:10']]);assert.deepEqual(rows('campaign-16'),[['destroy']]);
 assert.deepEqual(campaign.get('campaign-13').mission.phases[0].objectives[0].targets,GATE,'the gate towers, not the front line');
 for(const id of ['campaign-14','campaign-16'])assert.deepEqual(campaign.get(id).mission.phases[0].objectives[0].targets,['red-base']);
 assert.deepEqual(IDS.map(id=>campaign.get(id).mission.failure),IDS.map(()=>undefined),'the Azure Keep is lost only at 0 HP');IDS.forEach(id=>assert.doesNotMatch(campaign.get(id).display.briefing,/below d+%/));
 for(const id of IDS)assert.equal(campaign.get(id).mission.phases.length,1,`${id} is a single phase`);
 for(const id of IDS)for(const p of campaign.get(id).mission.phases)for(const o of p.objectives)assert.ok(['waves-defeated','destroy'].includes(o.type),`${id}: ${o.type} is an outcome`);
});

test('briefings fit the Briefing panel (about 320 characters) and name no checklist',()=>{
 for(const id of IDS){const d=campaign.get(id).display;assert.ok(d.briefing.length<=320,`${id} briefing is ${d.briefing.length} characters`);assert.ok(d.strategy.length<=260,`${id} tip is ${d.strategy.length} characters`);assert.ok(!/Build \d|Complete \d|Archer Towers deal/i.test(d.briefing),`${id}: ${d.briefing}`);}
});

test('Crimson Keep hit points: 3,000 everywhere by default, 5,000 only in The Twin Banks, validated, and the Azure Keep is never touched',()=>{
 assert.equal(baseHp,3000);
 for(const id of campaign.list().map(l=>l.id)){
  const setup=campaign.setup(id),sim=new Simulation('hp-'+id,setup),want=id==='campaign-14'?5000:3000;
  assert.equal(sim.state.bases['red-base'].hp,want,`${id} Crimson Keep`);assert.equal(sim.state.bases['red-base'].maxHp,want);assert.equal(sim.state.bases['blue-base'].hp,3000,`${id} Azure Keep`);
  assert.equal('crimsonKeepHp' in setup,id==='campaign-14','the field exists only when a mission sets it');
 }
 assert.equal(new Simulation('hp-prototype','prototype').state.bases['red-base'].hp,3000);
 assert.equal(new Simulation('hp-custom',matchSetup('extended',{crimsonKeepHp:1234})).state.bases['red-base'].hp,1234);
 for(const bad of [0,-1,2.5,NaN,Infinity,'5000'])assert.throws(()=>matchSetup('extended',{crimsonKeepHp:bad}),/Crimson Keep hit points/,String(bad));
 assert.throws(()=>matchSetup('extended',{crimsonKeepHp:4000,crimsonKeepInvulnerable:true,crimsonKeepArmed:false}),/Crimson Keep hit points/,'a protected Keep has nothing to configure');
 const a=campaign.setup('campaign-14');assert.deepEqual(a,campaign.setup('campaign-14'),'deterministic');
});

test('The Twin Banks: 5,000 HP is real damage to take down, persists, and ends the match when the Keep falls',()=>{
 const sim=new Simulation('m4-hp',campaign.setup('campaign-14',1)),red=sim.state.bases['red-base'];
 until(sim,2);strike(sim,'guardian','red-base',3000);assert.equal(red.hp,2000);assert.equal(sim.missionStatus().status,'active','3,000 damage no longer destroys it');
 strike(sim,'guardian','red-base',1999);assert.equal(sim.missionStatus().status,'active');assert.equal(red.hp,1);
 strike(sim,'guardian','red-base',1);until(sim,sim.clock.tick+2);won(sim);
});

test('The Sandstone Line: the gate towers alone win; the front line is optional; the Keep cannot be damaged',()=>{
 const sim=new Simulation('m3-front',campaign.setup('campaign-13',1));until(sim,2);
 for(const id of FRONT)strike(sim,'guardian',id);until(sim,sim.clock.tick+2);assert.equal(sim.missionStatus().status,'active','razing the front line does not win');assert.equal(sim.missionStatus().objectives[0].progress,0);
 strike(sim,'guardian',GATE[0]);assert.equal(sim.missionStatus().status,'active');strike(sim,'guardian',GATE[1]);until(sim,sim.clock.tick+2);won(sim);
 const bypass=new Simulation('m3-bypass',campaign.setup('campaign-13',1));until(bypass,2);for(const id of GATE)strike(bypass,'guardian',id);until(bypass,bypass.clock.tick+2);won(bypass);
 assert.ok(FRONT.every(id=>bypass.state.structures[id]?.hp>0),'the front towers still stand: bypassing them is allowed');
 const keep=new Simulation('m3-keep',campaign.setup('campaign-13',1));until(keep,2);strike(keep,'guardian','red-base');assert.equal(keep.state.bases['red-base'].hp,3000);assert.equal(keep.missionStatus().status,'active');
});

test('The Crimson Last Stand: the Keep alone wins, with every Crimson tower still standing and the Keep armed at 3,000 HP',()=>{
 const sim=new Simulation('m6-keep',campaign.setup('campaign-16',1)),red=sim.state.bases['red-base'];
 assert.ok(red.damage>0&&red.range===140,'armed');assert.equal(red.hp,3000);until(sim,2);
 strike(sim,'guardian','red-base');until(sim,sim.clock.tick+2);won(sim);
 assert.ok([...FRONT,...GATE].every(id=>sim.state.structures[id]?.hp>0),'all five Crimson towers stand at victory');
});

test('The Dust Riders and The Southern Flank: allies cannot end the match by razing the protected Keep; waves decide the result',()=>{
 for(const id of ['campaign-11','campaign-12','campaign-15']){
  const sim=new Simulation('prot-'+id,campaign.setup(id,1));until(sim,2);strike(sim,'guardian','red-base');assert.equal(sim.state.bases['red-base'].hp,3000,`${id}: the Keep cannot be damaged`);assert.equal(sim.missionStatus().status,'active');
 }
});

// Short guardrail probes (the shared bot never shops): a Guardian with towers at home and one that leaves at once.
const run=(id,seed,opts,max)=>{const sim=new Simulation('p-'+id+'-'+seed,campaign.setup(id,seed)),log=[];play(sim,max,{...opts,log});return {sim,log};};
test('guardrail: a rush at 10 seconds loses every attack mission, and the defence missions still finish',()=>{
 for(const [id,targets] of [['campaign-13',['red-tower-front-north',...GATE]],['campaign-14',['red-base']],['campaign-16',['red-tower-front-north','red-tower-front-center','red-base']]]){
  const {sim}=run(id,1,{towers:3,targets,gate:s=>s.clock.tick<300,cast:{bash:true}},6000);
  assert.equal(sim.outcome?.outcome,'defeat',`${id}: a 10 s rush is a defeat, not a win (${sim.outcome?.outcome} at ${Math.round(sim.clock.tick/30)} s)`);
 }
});
test('guardrail: The Twin Banks and The Sandstone Line are winnable by a measured raid, and nothing stalls',()=>{
 const m4=run('campaign-14',1,{towers:3,targets:['red-base'],gate:s=>s.clock.tick<150*30,cast:{bash:true}},12000);won(m4.sim);assert.ok(m4.sim.clock.tick/30>=150,'the siege cannot end before the raid starts');
 const m3=run('campaign-13',1,{towers:3,targets:['red-tower-front-north',...GATE],gate:s=>s.clock.tick<90*30,cast:{bash:true}},12000);won(m3.sim);
});
test('guardrail: the defence missions are winnable with towers at home',()=>{
 for(const id of ['campaign-11','campaign-12','campaign-15']){const {sim}=run(id,1,{towers:3,cast:{bash:true}},16000);won(sim);}
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign,sixMissionSources}=require('../.test-build/data/campaignLevels.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {baseHp}=require('../.test-build/data/match.js');
const {play,strike,until,DT}=require('./support/campaignBot.cjs');
const legacy=require('./support/legacyCampaign.cjs').campaign;
// Phase B2B: Chapter 2 as six outcome missions. Definition checks, the optional Crimson Keep hit points, and short scripted probes; no bot suites.
// Bot results are guardrails (no trivial win, no unreachable objective, no stall), not evidence about fun.
const IDS=[11,12,13,14,15,16].map(n=>`campaign-${n}`);
const rows=id=>campaign.get(id).mission.phases.map(p=>p.objectives.map(o=>`${o.type}${o.count!==undefined?':'+o.count:''}`));
const FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'],GATE=['red-tower-keep-north','red-tower-keep-south'];
const won=sim=>assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['victory','objectives-complete'],JSON.stringify(sim.missionStatus().objectives.map(o=>[o.id,o.progress])));

test('the six slots take their missions from old Levels 13, 14, 19, 18, 17 and 20',()=>{
 assert.deepEqual(IDS.map(id=>sixMissionSources[id]),[13,14,19,17,18,20]);
 assert.deepEqual(IDS.map(id=>campaign.get(id).display.title),['The Dust Riders','Three Tides','The Sandstone Line','Break the Siege','The Twin Banks','The Crimson Last Stand']);
 assert.deepEqual(IDS.map(id=>campaign.setup(id).battlefield.id),['canyon-pass','oasis','canyon-pass','canyon-siege','oasis','oasis'],'C2M4 Break the Siege is on Canyon Siege (Canyon Pass plus one Barracks); C2M5 The Twin Banks and C2M6 are on the Oasis');
});

test('Chapter 2 keeps its approved wave and economy settings alongside the mission-specific Keep changes',()=>{
 const match=id=>{const {crimsonKeepScenery:_s,...overrides}=campaign.get(id).match.overrides;return {...campaign.get(id).match,overrides};};
 assert.deepEqual(match('campaign-16'),legacy.byNumber(20).match);
 assert.deepEqual(match('campaign-13').overrides,{...legacy.byNumber(19).match.overrides,crimsonKeepInvulnerable:false});
 // C2M1 Hold the Line: the Dust Riders' match with a faster, allyless wave plan and the Crimson slots moved to the eastern edge.
 assert.deepEqual(match('campaign-11').overrides,{...legacy.byNumber(13).match.overrides,defenders:GATE,crimsonKeepHp:4000,waves:{...legacy.byNumber(13).match.overrides.waves,waveInterval:640,enemyPerWave:[5,6,7,7,8,9],raidersPerWave:[0,2,3,4,4,5],alliedPerWave:0,redSlots:[[1848,552],[1848,600],[1848,648]]}});
 assert.deepEqual(campaign.get('campaign-15').match.overrides,{...legacy.byNumber(18).match.overrides,crimsonKeepHp:5000});
 assert.deepEqual(campaign.setup('campaign-11').waveRules.raidersPerWave,[0,2,3,4,4,5],'Raiders appear from wave 2');
 assert.equal(campaign.setup('campaign-11').waveRules.alliedPerWave,0);assert.equal(campaign.setup('campaign-11').waveRules.waveInterval,640,'a wave about every 21 seconds');
 // C2M2 Three Tides: Level 14's Oasis match with a 21 s wave plan from the eastern edge, split banks from wave 2, and the three front towers as optional guards.
 const tides=match('campaign-12'),l14=legacy.byNumber(14).match;
 assert.deepEqual({...tides.overrides,waves:undefined,defenders:undefined},{...l14.overrides,waves:undefined,defenders:undefined},'only the waves and the defenders change');
 assert.deepEqual(tides.overrides.defenders,FRONT);assert.equal(tides.overrides.crimsonKeepInvulnerable,true);
 const w=campaign.setup('campaign-12').waveRules;
 assert.deepEqual([w.alliedPerWave,w.waveInterval,w.firstWaveTick],[0,640,300]);assert.deepEqual(w.redSlots,[[1848,552],[1848,600],[1848,648]]);
 assert.deepEqual(w.enemyPerWave,[4,5,6,7,7,8,8,9,9,9,9,9,9,9,9,9]);assert.deepEqual(w.raidersPerWave,[0,2,2,3,3,4,4,4,5,5,5,5,5,5,5,5]);
 assert.deepEqual(w.lanes.map(l=>l.wave),[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],'every wave (sixteen scripted waves, so late waves keep both banks) from the second takes a bank');assert.ok(w.lanes.every(l=>l.commit&&l.south[1]<w.enemyPerWave[l.wave-1]),'both banks always get units');
 // C2M4 Break the Siege: the Barracks still owns both eastern wave slots, with a wave every 20 s.
 const siege=campaign.setup('campaign-14'),sw=siege.waveRules;
 assert.equal(siege.battlefield.id,'canyon-siege');assert.deepEqual(siege.barracks.map(b=>[b.id,b.hp,b.slots]),[['red-barracks-siege',3500,[[1824,528],[1824,672]]]]);assert.deepEqual(sw.redSlots,[[1824,528],[1824,672]]);
 assert.deepEqual(sw.enemyPerWave,[5,6,6,7,7,8,8,9]);assert.deepEqual(sw.raidersPerWave,[0,2,3,3,4,4,5,5],'Raiders from wave 2');assert.equal(sw.waveInterval,600,'a wave every 20 seconds');
 assert.deepEqual(siege.encounter.defenders.map(d=>d.id),['red-tower-keep-north','red-tower-keep-south']);
 for(const id of ['campaign-13','campaign-16'])assert.deepEqual(campaign.setup(id).start,{gold:0,wood:0,iron:0,guardian:campaign.setup(id).start.guardian});
 assert.deepEqual([campaign.setup('campaign-15').start.gold,campaign.setup('campaign-15').start.wood,campaign.setup('campaign-15').start.iron],[250,0,0]);
 for(const id of ['campaign-13','campaign-16'])assert.equal(campaign.setup(id).encounter.defenders.length,5,'five Crimson towers');
 for(const id of ['campaign-12','campaign-15','campaign-14'])assert.equal(campaign.setup(id).waveRules.alliedPerWave,0,'no allies');
});

test('objectives: Three Tides retains its three stages and Keep alternatives retain their original objectives',()=>{
 assert.deepEqual(rows('campaign-11'),[['waves-defeated:6','destroy']]);assert.deepEqual(rows('campaign-12'),[['skill-impact:4'],['skill-impact:4'],['tower-damage:900']],'Shield Bash, Charge, then Archer Tower damage, in that order');
 assert.deepEqual(campaign.get('campaign-12').mission.phases.flatMap(p=>p.objectives.map(o=>o.effect??o.type)),['stun','slow','tower-damage']);
 assert.ok(campaign.get('campaign-12').mission.phases.every(p=>p.objectives.every(o=>o.type!=='structures-standing')),'no continuous defence requirement');
 assert.deepEqual(rows('campaign-13'),[['destroy','destroy']]);assert.deepEqual(rows('campaign-15'),[['destroy']]);
 assert.deepEqual(rows('campaign-14'),[['destroy','destroy']]);assert.deepEqual(campaign.get('campaign-14').mission.phases[0].objectives[0].targets,['red-barracks-siege'],'the Barracks remains a victory target');assert.deepEqual(rows('campaign-16'),[['destroy']]);
 assert.deepEqual(campaign.get('campaign-13').mission.phases[0].objectives[0].targets,GATE,'the gate towers, not the front line');
 for(const id of ['campaign-15','campaign-16'])assert.deepEqual(campaign.get(id).mission.phases[0].objectives[0].targets,['red-base']);
 assert.deepEqual(IDS.map(id=>campaign.get(id).mission.failure),IDS.map(()=>undefined),'the Azure Keep is lost only at 0 HP');IDS.forEach(id=>assert.doesNotMatch(campaign.get(id).display.briefing,/below d+%/));
 const single=IDS.filter(id=>id!=='campaign-12');assert.equal(campaign.get('campaign-12').mission.phases.length,3,'Three Tides has three phases');
 for(const id of single)assert.equal(campaign.get(id).mission.phases.length,1,`${id} is a single phase`);
 for(const id of single)for(const p of campaign.get(id).mission.phases)for(const o of p.objectives)assert.ok(['waves-defeated','destroy'].includes(o.type),`${id}: ${o.type} is an outcome`);
});

test('briefings fit the Briefing panel (about 320 characters) and name no checklist',()=>{
 for(const id of IDS){const d=campaign.get(id).display;assert.ok(d.briefing.length<=320,`${id} briefing is ${d.briefing.length} characters`);assert.ok(d.strategy.length<=260,`${id} tip is ${d.strategy.length} characters`);if(id!=='campaign-12')assert.ok(!/Build \d|Complete \d|Archer Towers deal/i.test(d.briefing),`${id}: ${d.briefing}`);}
});

test('Crimson Keep HP overrides are mission-specific and never affect the Azure Keep',()=>{
 assert.equal(baseHp,3000);
 const overrides={'campaign-01':4000,'campaign-02':4000,'campaign-11':4000,'campaign-15':5000};
 for(const id of campaign.list().map(l=>l.id)){
  const setup=campaign.setup(id),sim=new Simulation('hp-'+id,setup),want=overrides[id]??3000;
  assert.equal(sim.state.bases['red-base'].hp,want,`${id} Crimson Keep`);assert.equal(sim.state.bases['red-base'].maxHp,want);assert.equal(sim.state.bases['blue-base'].hp,3000,`${id} Azure Keep`);
  assert.equal('crimsonKeepHp' in setup,id in overrides,'the field exists only when a mission sets it');
 }
 assert.equal(new Simulation('hp-prototype','prototype').state.bases['red-base'].hp,3000);
 assert.equal(new Simulation('hp-custom',matchSetup('extended',{crimsonKeepHp:1234})).state.bases['red-base'].hp,1234);
 for(const bad of [0,-1,2.5,NaN,Infinity,'5000'])assert.throws(()=>matchSetup('extended',{crimsonKeepHp:bad}),/Crimson Keep hit points/,String(bad));
 assert.throws(()=>matchSetup('extended',{crimsonKeepHp:4000,crimsonKeepInvulnerable:true,crimsonKeepArmed:false}),/Crimson Keep hit points/,'a protected Keep has nothing to configure');
 const a=campaign.setup('campaign-15');assert.deepEqual(a,campaign.setup('campaign-15'),'deterministic');
});

test('The Twin Banks: 5,000 HP is real damage to take down, persists, and ends the match when the Keep falls',()=>{
 const sim=new Simulation('m4-hp',campaign.setup('campaign-15',1)),red=sim.state.bases['red-base'];
 until(sim,2);strike(sim,'guardian','red-base',3000);assert.equal(red.hp,2000);assert.equal(sim.missionStatus().status,'active','3,000 damage no longer destroys it');
 strike(sim,'guardian','red-base',1999);assert.equal(sim.missionStatus().status,'active');assert.equal(red.hp,1);
 strike(sim,'guardian','red-base',1);until(sim,sim.clock.tick+2);won(sim);
});

test('The Sandstone Line: both gate towers alone still win, with the front line and Keep standing',()=>{
 const sim=new Simulation('m3-front',campaign.setup('campaign-13',1));until(sim,2);
 for(const id of FRONT)strike(sim,'guardian',id);until(sim,sim.clock.tick+2);assert.equal(sim.missionStatus().status,'active','razing the front line does not win');assert.equal(sim.missionStatus().objectives[0].progress,0);
 strike(sim,'guardian',GATE[0]);assert.equal(sim.missionStatus().status,'active');strike(sim,'guardian',GATE[1]);until(sim,sim.clock.tick+2);won(sim);
 const bypass=new Simulation('m3-bypass',campaign.setup('campaign-13',1));until(bypass,2);for(const id of GATE)strike(bypass,'guardian',id);until(bypass,bypass.clock.tick+2);won(bypass);
 assert.ok(FRONT.every(id=>bypass.state.structures[id]?.hp>0),'the front towers still stand: bypassing them is allowed');
 assert.equal(bypass.state.bases['red-base'].hp,3000);
});

test('The Crimson Last Stand: the Keep alone wins, with every Crimson tower still standing and the Keep armed at 3,000 HP',()=>{
 const sim=new Simulation('m6-keep',campaign.setup('campaign-16',1)),red=sim.state.bases['red-base'];
 assert.ok(red.damage>0&&red.range===140,'armed');assert.equal(red.hp,3000);until(sim,2);
 strike(sim,'guardian','red-base');until(sim,sim.clock.tick+2);won(sim);
 assert.ok([...FRONT,...GATE].every(id=>sim.state.structures[id]?.hp>0),'all five Crimson towers stand at victory');
});


// Short guardrail probes (the shared bot never shops): a Guardian with towers at home and one that leaves at once.
const run=(id,seed,opts,max)=>{const sim=new Simulation('p-'+id+'-'+seed,campaign.setup(id,seed)),log=[];play(sim,max,{...opts,log});return {sim,log};};
test('guardrail: a rush at 10 seconds loses every attack mission, and the defence missions still finish',()=>{
 for(const [id,targets] of [['campaign-13',['red-tower-front-north',...GATE]],['campaign-15',['red-base']],['campaign-16',['red-tower-front-north','red-tower-front-center','red-base']]]){
  const {sim}=run(id,1,{towers:3,targets,gate:s=>s.clock.tick<300,cast:{bash:true}},6000);
  assert.equal(sim.outcome?.outcome,'defeat',`${id}: a 10 s rush is a defeat, not a win (${sim.outcome?.outcome} at ${Math.round(sim.clock.tick/30)} s)`);
 }
});
test('guardrail: The Twin Banks and The Sandstone Line are winnable by a measured raid, and nothing stalls',()=>{
 const m4=run('campaign-15',1,{towers:3,targets:['red-base'],gate:s=>s.clock.tick<150*30,cast:{bash:true}},12000);won(m4.sim);assert.ok(m4.sim.clock.tick/30>=150,'the siege cannot end before the raid starts');
 const m3=run('campaign-13',1,{towers:3,targets:['red-tower-front-north',...GATE],gate:s=>s.clock.tick<90*30,cast:{bash:true}},12000);won(m3.sim);
});
test('The Dust Riders: the front Keep rush loses, and six defeated waves still win with towers at home',()=>{
 const rush=run('campaign-11',1,{targets:['red-base'],cast:{bash:true}},12000).sim;
 assert.equal(rush.outcome?.reason,'azure-keep-destroyed');
 assert.ok(rush.state.bases['red-base'].hp>0);
 const defense=run('campaign-11',1,{towers:3,cast:{bash:true}},16000).sim;
 won(defense);
 assert.equal(defense.mission.wavesDefeated,6);
 assert.equal(defense.state.bases['red-base'].hp,4000);
});

// C2M2 Three Tides: the three phases in order, by the real Guardian skills against the real waves (the shared bot's Charge is too unreliable to prove this).
test('Three Tides: the starting point buys Shield Bash, one level-up buys Charge, and the three phases complete in order',()=>{
 const sim=new Simulation('c2m2-flow',campaign.setup('campaign-12',1));let n=0;
 const step=k=>{for(let i=0;i<k&&!sim.ended;i++){sim.advance(DT);sim.drainEvents();}};
 const reds=()=>Object.values(sim.state.units).filter(u=>u.team==='red'&&u.hp>0),p=()=>sim.state.heroProgression,phase=()=>sim.missionStatus().activePhase;
 assert.deepEqual([p().level,p().skillPoints],[1,1],'one skill point at the start');
 sim.send({type:'learn',requestId:'l'+(++n),skill:'bash'});step(2);assert.equal(p().ranks.bash,1);assert.equal(p().skillPoints,0);
 step(400);assert.ok(reds().length>0,'the first wave has spawned');
 for(let k=0;p().level<2;k++){assert.ok(k<40,'two kills reach level 2');const u=reds()[0];if(!u)step(30);else strike(sim,'guardian',u.id);step(2);}
 assert.equal(p().skillPoints,1,'the level-up pays for Charge');sim.send({type:'learn',requestId:'l'+(++n),skill:'charge',});step(2);assert.equal(p().ranks.charge,1);
 assert.equal(sim.missionStatus().objectives.find(o=>o.id==='damage').progress,0,'no tower damage counts before its phase');
 // Stand beside the westernmost Crimson unit and cast; a spot may be blocked, so try the open sides.
 const close=d=>{const u=reds().sort((a,b)=>a.x-b.x)[0];for(const [dx,dy] of [[-d,0],[d,0],[0,-d],[0,d],[-d,-d],[-d,d]])if(sim.teleportHero(u.x+dx,u.y+dy))return u;return null;};
 const cast=(skill,d)=>{for(let k=0;k<400&&!sim.ended;k++){if(!reds().length||sim.remaining(skill)>0){step(10);continue;}const u=close(d);if(!u){step(30);continue;}step(1);const h=sim.hero,l=Math.hypot(u.x-h.x,u.y-h.y)||1;sim.send({type:'cast',skill,requestId:'c'+(++n),...(skill==='charge'&&{direction:{x:(u.x-h.x)/l,y:(u.y-h.y)/l}})});step(20);return;}assert.fail('could not cast '+skill);};
 for(let k=0;phase()==='shore';k++){assert.ok(k<12,'Shield Bash completes the first phase');cast('bash',45);}
 assert.equal(sim.missionStatus().objectives.find(o=>o.id==='stuns').complete,true);assert.equal(phase(),'charge');
 for(let k=0;phase()==='charge';k++){assert.ok(k<14,'Charge completes the second phase');cast('charge',100);}
 assert.equal(phase(),'banks');assert.ok(sim.clock.tick/30<240,'both skill phases fit inside four minutes of waves');
 play(sim,14000,{towers:3,cast:{bash:true,charge:150},hold:{x:800,y:600},leash:1300});
 won(sim);assert.ok(sim.state.spawnedWaves>=6&&sim.state.spawnedWaves<=14,'waves kept coming through all three phases');
});
test('Three Tides: Archer Towers built early stay useful but their damage only counts in the last phase, and the Guardian alone cannot win or bypass it',()=>{
 const early=run('campaign-12',2,{towers:3,cast:{bash:true},hold:{x:800,y:600},leash:1300},1800);
 const damage=early.sim.missionStatus().objectives.find(o=>o.id==='damage');assert.equal(early.sim.missionStatus().activePhase==='banks',false);assert.equal(damage.progress,0,'damage in an earlier phase is not credited');assert.equal(early.sim.state.bases['blue-base'].hp,3000,'towers at home hold the first minute');
 const alone=run('campaign-12',1,{towers:0,cast:{bash:true,charge:150},hold:{x:800,y:600},leash:1300},12000);
 assert.equal(alone.sim.outcome?.outcome,'defeat','a Guardian with no towers cannot finish the tower phase and loses the Keep');assert.equal(alone.sim.missionStatus().objectives.find(o=>o.id==='damage').complete,false);
 assert.ok(alone.sim.state.spawnedWaves>10,'the waves had not run out');
});

// C2M4 Break the Siege: the Barracks is the original objective and still owns the wave slots.
const BARRACKS='red-barracks-siege';
test('Break the Siege: destroying the Barracks wins at once, stops its reinforcements and leaves the Keep and towers alone',()=>{
 const sim=new Simulation('c2m5-strike',campaign.setup('campaign-14',1));until(sim,330);
 assert.ok(sim.state.structures[BARRACKS]?.hp===3500,'the Barracks stands at 3,500 HP');assert.equal(sim.missionStatus().status,'active');
 assert.ok(sim.spawnQueue.some(e=>e.team==='red')||Object.values(sim.state.units).some(u=>u.team==='red'),'wave 1 has been sent');
 const first=Object.keys(sim.state.units).filter(id=>id.startsWith('red-')).length;
 strike(sim,'guardian','red-tower-keep-north');until(sim,sim.clock.tick+2);
 assert.equal(sim.missionStatus().status,'active','a Crimson tower alone does not end it');assert.equal(sim.state.bases['red-base'].hp,3000);
 strike(sim,'guardian',BARRACKS);until(sim,sim.clock.tick+2);won(sim);
 assert.equal(sim.state.structures[BARRACKS],undefined,'the Barracks is gone'); assert.ok(first>0);
});
test('Break the Siege: both wave slots are open ground clear of scenery, and the Barracks is reachable from the west and attackable',()=>{
 const sim=new Simulation('c2m5-geo',campaign.setup('campaign-14',1));
 for(const [x,y] of campaign.setup('campaign-14').waveRules.redSlots){assert.equal(sim.geo.blocked(x,y,12,[]),false,`slot ${x},${y} is open`);assert.ok(sim.field.scenery.every(p=>Math.hypot(p.x-x,p.y-y)-p.radius>150),`slot ${x},${y} is clear of scenery`);}
 const b=sim.state.structures[BARRACKS];assert.deepEqual([b.team,b.kind,b.x,b.y,b.maxHp],['red','wall',1728,600,3500]);
 assert.equal(campaign.setup('campaign-11').battlefield.barracks,undefined,'Canyon Pass itself has no Barracks');
});
test('Break the Siege: a 10 s rush loses, a patient push wins, and sitting at home never ends it',()=>{
 const T={towers:3,cast:{bash:true,charge:130}};
 const rush=run('campaign-14',1,{...T,towers:0,targets:[BARRACKS],gate:s=>s.clock.tick<300},12000);assert.equal(rush.sim.outcome?.outcome,'defeat','a rush with no towers loses the Keep');
 const push=run('campaign-14',1,{...T,targets:[BARRACKS],gate:s=>s.clock.tick<90*30},12000);won(push.sim);assert.ok(push.sim.clock.tick/30>=120,`a push cannot finish inside two minutes (${Math.round(push.sim.clock.tick/30)} s)`);
 const home=run('campaign-14',1,T,12000);assert.equal(home.sim.outcome,null,'defending alone neither wins nor loses');assert.equal(home.sim.state.bases['blue-base'].hp,3000);
});

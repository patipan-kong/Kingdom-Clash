const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {campaignSelection}=require('../.test-build/data/campaignSelection.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {gameplayV04}=require('../.test-build/data/gameplayV04.js');
const {activeCombatVariant}=require('../.test-build/data/gameplayV041.js');
const {play,finalHash,HZ,DT}=require('./support/campaignBot.cjs');
// Chapter 3 C3-1: Level 21 "The Frost Citadel", the first Chapter 3 level: a siege of a walled Crimson Keep behind a Frost Gate and two bastions. Every balance value is provisional (docs/CHAPTER3_C3-1.md);
// the bot results are preliminary evidence, not a human playtest, and nothing here was tuned to make a bot win faster. Level 21 is registered but Chapter 3 stays "coming soon", so Chapter Select shows no playable mission.
const L=campaign.get('campaign-21'),G='red-gate',N='red-bastion-north',S='red-bastion-south',FN='red-forward-north',FS='red-forward-south',IN='red-inner-north',IS='red-inner-south',K='red-base',SLOTS=[[1224,552],[1296,264],[1224,648],[1296,936]],FRONT=SLOTS.filter(([x])=>x===1224);
const MOUTH=[[14,12],[14,11],[14,13],[13,12],[13,11],[13,13],[12,12],[12,11],[12,13],[11,12]],SIX=[FN,FS,N,S,IN,IS];
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
const holdPhase=s=>s.missionStatus().activePhase==='hold';
const waveCounts=(setup,n)=>Array.from({length:n},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===i+1).length);
// Balance v2 (human playtest: too easy, the Keep never fought back, Crimson units ignored the siege): the Keep is armed with the existing Keep defense and half of every wave spawns in front of the gate.
// Balance v3: six bastions, a 3,000 HP gate and gate-triggered garrison waves. Every bot result here is preliminary evidence, not a tuning target.
// The shared bot: four Archer Towers, rebuilt on the first free of ten cells when one falls (the level asks for two, but a 4-5 minute siege away from home needs more), Shield Bash, home until `leave` seconds (or, by default, until the hold phase is over), then the targets in order.
const siege=(label,targets,leave=null)=>{
 const sim=new Simulation('l21-'+label,campaign.setup(21)),log=[];let holdEnd=null;const gate=s=>{if(holdEnd===null&&!holdPhase(s))holdEnd=s.clock.tick;return leave===null?holdPhase(s):s.clock.tick<leave*HZ;};
 play(sim,600*HZ,{towers:4,cells:MOUTH,cast:{bash:true},leash:650,hold:{x:620,y:600},targets,gate,log});
 const at=id=>log.find(e=>e.type==='death'&&e.id===id)?.at;
 return {sim,log,at,holdEnd:()=>holdEnd,garrison:log.filter(e=>e.type==='spawn'&&/^red-g/.test(e.id)),seconds:sim.outcome?sim.outcome.tick/HZ:null,deaths:log.filter(e=>e.type==='death'&&e.id==='guardian').length,
  bastionDamage:log.filter(e=>e.type==='damage'&&e.id==='guardian'&&/^red-(bastion|forward|inner)/.test(String(e.sourceId))).reduce((n,e)=>n+e.amount,0)};
};

test('Level 21 is The Frost Citadel: hold, then storm the Keep behind a gate that is never an objective',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[21,3,'campaign-21','The Frost Citadel','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.ok(L.display.briefing.length<=320,`the briefing body must fit three lines of the mission briefing (${L.display.briefing.length} characters)`);
 assert.match(L.display.briefing,/two Archer Towers/);assert.match(L.display.briefing,/four Crimson waves/);assert.match(L.display.briefing,/Crimson Keep/);assert.match(L.display.briefing,/Frost Gate/);assert.match(L.display.briefing,/four outer bastions/);assert.match(L.display.briefing,/two inner bastions/);assert.match(L.display.briefing,/garrison/);assert.match(L.display.briefing,/50%/);
 assert.deepEqual(L.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
  {id:'hold',objectives:[{id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},{id:'waves',type:'waves-defeated',count:4,display:{label:'Defeat 4 Crimson waves'}}]},
  {id:'storm',objectives:[{id:'keep',type:'destroy',targets:[K],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(L.mission.phases.flatMap(p=>p.objectives).some(o=>o.type==='destroy'&&o.targets.includes(G)),false,'the gate is not an objective');
 const o=L.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.crimsonKeepInvulnerable,o.start,o.shop],['frost-citadel',true,undefined,undefined,undefined],'an armed, vulnerable Keep, the default start and an open Shop');
 assert.deepEqual(o.defenders,[FN,FS,N,S,IN,IS],'the six bastions are the only Crimson towers');
 assert.deepEqual(o.waves,{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4,5,5,6],alliedPerWave:1,redSlots:SLOTS});assert.equal(o.waves.raidersPerWave,undefined,'no Desert Raiders');
 assert.deepEqual(o.gates,[{id:G,hp:3000}]);assert.deepEqual(o.garrison,{after:G,slots:[[1800,552],[1800,648]],counts:[3,4],delayTicks:90,intervalTicks:900});
});
test('Level 21 builds the Frost Citadel match: 3-6 Crimson per wave from outside the fortress, one ally, six bastions, a 3,000 HP gate, a garrison, an armed damageable Keep, the default start and the Shop',()=>{
 const setup=campaign.setup(21),sim=new Simulation('l21',setup);
 assert.equal(setup.battlefield.id,'frost-citadel');assert.equal(setup.shop,true);assert.deepEqual([setup.start.gold,setup.start.wood,setup.start.iron],[250,180,30]);assert.equal(setup.crimsonKeepInvulnerable,false);
 assert.deepEqual(waveCounts(setup,7),[3,3,4,4,5,5,6]);assert.equal(setup.encounter.spawns.some(e=>e.archetype),false,'no Raiders or other archetypes');
 assert.equal(setup.encounter.spawns.filter(e=>e.team==='blue').length,7,'one allied unit per wave');assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),[...SIX].sort());
 assert.ok(setup.encounter.spawns.filter(e=>e.team==='red').every(e=>SLOTS.some(([x,y])=>e.x===x&&e.y===y)),'Crimson spawns outside the fortress');
 assert.equal(setup.encounter.spawns.some(e=>e.lane||e.commit),false,'no lane splits or flanks: the walls decide the routes');
 assert.deepEqual([sim.state.structures[G].hp,sim.state.structures[G].maxHp,sim.state.structures[G].kind,sim.state.structures[G].team],[3000,3000,'wall','red']);
 assert.deepEqual(Object.values(sim.state.structures).map(b=>b.id).sort(),[G,...SIX].sort(),'the gate and the six bastions are the only Crimson structures');
 assert.ok(SIX.every(id=>sim.state.structures[id].hp===650&&sim.state.structures[id].kind==='tower'));
 const keep=sim.state.bases[K],d=gameplayV04.keepDefense.red;assert.equal(keep.invulnerable,undefined);assert.equal(keep.hp,3000);
 assert.deepEqual([keep.damage,keep.range,keep.cooldownTicks],[activeCombatVariant.crimsonKeepDamage??d.damage,d.range,d.cooldownTicks],'the Crimson Keep uses the existing Keep defense, unchanged');
 assert.equal(sim.missionStatus().activePhase,'hold');assert.equal(sim.setup.garrison.after,G);
});
test('Level 21 is Chapter 3 Mission 1 in the released chapter: it unlocks in order after Chapter 2 and the earlier Chapter 3 missions, never earlier',()=>{
 const {through}=require('./support/chapter3Save.cjs');
 assert.equal(campaignChapters[2].slots[0].levelId,'campaign-21');assert.equal(campaignChapters[2].release,'available');
 const v=chapterViews(campaignChapters,campaign.list(),through(0).progress)[2];assert.equal(v.state,'available');assert.equal(v.released,6);
 assert.equal(campaign.list().filter(l=>l.chapter===3).length,6);assert.equal(campaign.list().at(-1).id,'full-battle');
 assert.equal(through(0).isUnlocked(L),true,'unlocked once the mission before it is cleared');assert.equal(through(0).progress.next.id,'campaign-21');
 assert.equal(store(15).isUnlocked(L),false,'locked until Chapter 2 is cleared');
 assert.equal(through(0).recordVictory(L).recorded,true);
});
test('bot, wall pair then gate: the gate and the Keep fall in order, the garrison rallies and fights, and the Azure Keep is never touched',()=>{
 const run=()=>siege('wall',[N,S,G,K]),r=run();
 assert.deepEqual(r.sim.outcome&&[r.sim.outcome.outcome,r.sim.outcome.reason],['victory','objectives-complete']);assert.deepEqual(r.sim.missionStatus().completedPhases,['hold','storm']);
 assert.ok(r.at(N)<r.at(G)&&r.at(S)<r.at(G)&&r.at(G)<r.at(K),'wall bastions, then the gate, then the Keep');assert.equal(r.sim.state.bases['blue-base'].hp,3000);assert.ok(r.deaths<=8,`${r.deaths} Guardian deaths`);
 assert.equal(r.log.some(e=>e.type==='xp'&&String(e.sourceId).includes(`:${G}:`)),false,'no XP for the gate');
 assert.ok(r.garrison.length>=6,`${r.garrison.length} garrison units spawned`);assert.ok(r.garrison.every(e=>e.at>=r.at(G)+89),'only after the gate fell');
 assert.ok(r.log.some(e=>e.type==='damage'&&e.id==='guardian'&&/^red-g/.test(e.sourceId)),'the garrison strikes the Guardian');
 const again=run();assert.equal(finalHash(r.sim,r.log),finalHash(again.sim,again.log),'the same inputs replay to the same state');
});
test('bot, gate rush after the hold phase: the gate falls first and costs the Guardian far more than chopping it with the wall pair silenced',()=>{
 const rush=siege('rush',[G,K]),wall=siege('wall',[N,S,G,K]);
 for(const r of [rush,wall])assert.deepEqual(r.sim.outcome&&[r.sim.outcome.outcome,r.sim.outcome.reason],['victory','objectives-complete']);
 assert.ok(rush.at(G)<rush.at(K));assert.equal(rush.at(N),undefined);assert.equal(rush.at(S),undefined);
 assert.ok(rush.bastionDamage>1.3*wall.bastionDamage,`the rush took ${Math.round(rush.bastionDamage)} damage from the bastions against ${Math.round(wall.bastionDamage)}`);
});
test('bot, full clear: all six bastions fall, the outer pair before the wall pair, the inner pair after the gate',()=>{
 const r=siege('full',[FN,FS,N,S,G,IN,IS,K]);
 assert.deepEqual(r.sim.outcome&&[r.sim.outcome.outcome,r.sim.outcome.reason],['victory','objectives-complete']);
 assert.ok(r.at(FN)<r.at(G)&&r.at(FS)<r.at(G)&&r.at(N)<r.at(G)&&r.at(S)<r.at(G),'the outer four before the gate');assert.ok(r.at(G)<r.at(IN)&&r.at(G)<r.at(IS)&&r.at(IN)<r.at(K)&&r.at(IS)<r.at(K),'the inner pair after the gate, before the Keep');
 assert.ok(r.sim.state.bases['blue-base'].hp>=1500,'the Azure Keep holds');
});
test('bot, early raid at 5 s: the gate falls during the hold phase, the garrison rallies, and the hold objective still completes',()=>{
 const r=siege('raid',[N,S,G,K],5);
 assert.deepEqual(r.sim.outcome&&[r.sim.outcome.outcome,r.sim.outcome.reason],['victory','objectives-complete']);assert.deepEqual(r.sim.missionStatus().completedPhases,['hold','storm']);
 assert.ok(r.holdEnd()!==null&&r.at(G)<r.holdEnd(),'the gate fell at '+(r.at(G)/HZ).toFixed(0)+' s, before the hold phase ended at '+(r.holdEnd()/HZ).toFixed(0)+' s');
 assert.ok(r.garrison.length>=3&&r.garrison[0].at>=r.at(G)+89,'the garrison spawned after the gate fell');
 assert.ok(r.sim.state.spawnedWaves>=4,'the four outside waves still came and were defeated with the garrison alive or dead');
 assert.ok(r.deaths>=1,'a level-1 raid into six bastions costs the Guardian');
});

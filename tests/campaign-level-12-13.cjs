const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {desertRaider,minionStats}=require('../.test-build/data/combat.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {play,standing,finalHash,HZ}=require('./support/campaignBot.cjs');
// Chapter 2 S6: Level 12 "Hold the Sunwell" (Oasis) and Level 13 "The Dust Riders" (Canyon Pass, first Desert Raiders).
// Every balance value is provisional (docs/CHAPTER2_S6.md). A tower-focused strategy that never moves the Guardian may win; that is allowed.
const L=id=>campaign.get(id),WAVES=[3,3,4,4,5,5];
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
// Tower cells (col,row) found by probing placementReason: Oasis north-outpost and Keep cells; Canyon mouth cells.
const OASIS=[[17,7],[16,8],[13,12]],MOUTH=[[14,12],[14,11],[14,13]];

test('Level 12 is Hold the Sunwell on Oasis: three towers and six waves, no kill objective, no Raiders',()=>{
 const l=L('campaign-12');
 assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[12,2,'Hold the Sunwell','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);
 assert.deepEqual(l.match,{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:WAVES,alliedPerWave:1},defenders:[],crimsonKeepArmed:false}});
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'defend',objectives:[
  {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Build 3 Archer Towers'}},
  {id:'waves',type:'waves-defeated',count:6,display:{label:'Defeat 6 Crimson waves'}}]}]});
 assert.equal(l.mission.phases[0].objectives.some(o=>o.type==='tower-kills'),false);
 assert.ok(Object.isFrozen(l)&&!/raider/i.test(JSON.stringify(l.display)),'read-only, and the text promises no Raiders');
});

test('Level 13 is The Dust Riders on Canyon Pass: two towers and six waves, Raiders from Wave 3',()=>{
 const l=L('campaign-13');
 assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[13,2,'The Dust Riders','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);
 assert.deepEqual(l.match,{encounter:'extended',overrides:{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:WAVES,raidersPerWave:[0,0,2,2,3,3],alliedPerWave:1},defenders:[],crimsonKeepArmed:false}});
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'defend',objectives:[
  {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
  {id:'waves',type:'waves-defeated',count:6,display:{label:'Defeat 6 Crimson waves'}}]}]});
});

test('both levels set up their battlefield, an inert Crimson Keep, the Shop and default starting resources',()=>{
 for(const [id,field] of [['campaign-12','oasis'],['campaign-13','canyon-pass']]){
  const setup=campaign.setup(id),sim=new Simulation('s6-setup',setup);
  assert.equal(sim.field.id,field);assert.equal(setup.shop,true);assert.equal(setup.keepDefense.red,null);assert.equal(setup.encounter.defenders.length,0,'no Crimson towers');
  assert.deepEqual(setup.start,matchSetup('extended').start,'default starting resources');
 }
});

test('exact spawn tables: Level 12 has no Raider; Level 13 has 0,0,2,2,3,3 Raiders in waves of 3,3,4,4,5,5',()=>{
 const table=id=>[1,2,3,4,5,6].map(n=>{const e=campaign.setup(id).encounter.spawns.filter(s=>s.team==='red'&&s.wave===n);return [e.length,e.filter(s=>s.archetype==='desert-raider').length];});
 assert.deepEqual(table('campaign-12'),WAVES.map(n=>[n,0]));
 assert.deepEqual(table('campaign-13'),[[3,0],[3,0],[4,2],[4,2],[5,3],[5,3]]);
 assert.deepEqual(campaign.setup('campaign-13').encounter.waves.map(w=>w.tick),[300,1200,2100,3000,3900,4800]);
});

test('Level 13 puts live Desert Raiders in the match from Wave 3, faster and frailer than Crimson, and none before',()=>{
 assert.ok(desertRaider.stats.speed>minionStats.speed*1.5&&desertRaider.stats.maxHp<minionStats.maxHp,'the speed difference is large');
 const sim=new Simulation('s6-raiders',campaign.setup('campaign-13')),seen={};
 const count=()=>Object.values(sim.state.units).filter(u=>u.team==='red'&&u.archetype==='desert-raider').length;
 while(sim.clock.tick<2100-1)sim.advance(1000/30+.01);
 assert.equal(count(),0,'no Raider before Wave 3');
 while(sim.clock.tick<2100+300)sim.advance(1000/30+.01);
 assert.equal(count(),2,'Wave 3 brings two');
 const ids=Object.values(sim.state.units).filter(u=>u.archetype==='desert-raider').map(u=>u.id);
 assert.equal(ids.length,2);for(const id of ids)assert.equal(sim.state.units[id].speed,desertRaider.stats.speed);
 const sim12=new Simulation('s6-no-raiders',campaign.setup('campaign-12'));
 while(sim12.clock.tick<2400)sim12.advance(1000/30+.01);
 assert.equal(Object.values(sim12.state.units).some(u=>u.archetype),false);
});

test('Levels 11 to 13 unlock in sequence, the chapter text says four missions are released (S8 added Level 14) and 15-20 stay pending',()=>{
 const views=n=>chapterViews(campaignChapters,campaign.list(),store(n).progress)[1];
 assert.equal(store(10).isUnlocked(L('campaign-12')),false);assert.equal(store(11).isUnlocked(L('campaign-12')),true);
 assert.equal(store(11).isUnlocked(L('campaign-13')),false);assert.equal(store(12).isUnlocked(L('campaign-13')),true);
 assert.equal(store(11).progress.next.id,'campaign-12');assert.equal(store(12).progress.next.id,'campaign-13');
 assert.deepEqual(views(11).missions.slice(0,4).map(m=>m.state),['completed','available','locked','locked']);
 assert.deepEqual(views(13).missions.slice(0,4).map(m=>m.state),['completed','completed','completed','available']);
 assert.equal(views(10).released,4);assert.match(campaignChapters[1].narrative,/first four missions are released/);
 const s=store(12),w=s.recordVictory(L('campaign-13'));assert.deepEqual([w.recorded,w.firstClear,w.upToDate],[true,true,false],'Level 14 is next after Level 13');
});

// Four fixed deterministic scenarios (no balance matrix): the shared test bot, active or parked. Outcomes are recorded in docs/CHAPTER2_S6.md.
const T=(sim,log)=>({sec:sim.clock.tick/HZ,keep:sim.state.bases['blue-base'].hp,guardianDeaths:log.filter(e=>e.type==='death'&&e.id==='guardian').length,
 towersLost:log.filter(e=>e.type==='death'&&sim.state.structures[e.id]?.team==='blue').length});
const scenario=(id,cells,towers,opts,max)=>{const sim=new Simulation('s6-'+id,campaign.setup(id)),log=[];play(sim,max,{towers,cells,log,...opts});return {sim,log,...T(sim,log)};};
const ACTIVE={cast:{bash:true},leash:650,hold:{x:620,y:600}};
for(const [id,cells,towers,floor] of [['campaign-12',OASIS,3,175],['campaign-13',MOUTH,2,170]]){
 for(const mode of ['active','parked']){
  test(`${id} ${mode} Guardian: a tower-focused bot wins, not instantly, with the Keep above half and no towers lost`,()=>{
   const r=scenario(id,cells,towers,mode==='active'?ACTIVE:{park:true},16000);
   assert.deepEqual([r.sim.outcome.outcome,r.sim.outcome.reason],['victory','objectives-complete']);
   assert.ok(r.sec>=floor&&r.sec<400,`finishes in a plausible time (${r.sec} s)`);assert.ok(r.sim.state.spawnedWaves>=6,'six waves spawned');
   assert.ok(r.keep>=1500,'the Azure Keep stayed above half');assert.equal(standing(r.sim),towers);assert.equal(r.towersLost,0);
   assert.equal(r.log.filter(e=>e.type==='match-end').length,1);
  });
 }
}

test('with no towers built the missions cannot be won and the Keep falls (nothing is awarded for waiting)',()=>{
 for(const id of ['campaign-12','campaign-13']){
  const sim=new Simulation('s6-idle-'+id,campaign.setup(id)),log=[];play(sim,12000,{park:true,log});
  assert.equal(sim.outcome?.outcome,'defeat',id);
 }
});

test('losing the Azure Keep ends Levels 12 and 13 in defeat',()=>{
 for(const id of ['campaign-12','campaign-13']){
  const sim=new Simulation('s6-defeat-'+id,campaign.setup(id));
  sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp*.49;sim.advance(1000/30+.01);
  assert.deepEqual([sim.outcome.outcome,sim.outcome.reason],['defeat','azure-keep-hp-threshold']);
 }
});

test('Level 12 and 13 bot matches replay identically from the same seed and inputs',()=>{
 for(const [id,cells,towers] of [['campaign-12',OASIS,3],['campaign-13',MOUTH,2]]){
  const a=scenario(id,cells,towers,ACTIVE,16000),b=scenario(id,cells,towers,ACTIVE,16000);
  assert.equal(finalHash(a.sim,a.log),finalHash(b.sim,b.log),id);
 }
});

test('the shared bot keeps its Meadow default cells when none are passed',()=>{
 const {CELLS}=require('./support/campaignBot.cjs');
 assert.deepEqual(CELLS,[[12,10],[12,14],[9,9],[9,15],[13,12],[11,8]]);
});

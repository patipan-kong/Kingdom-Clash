const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {progressOf,isSequential,specialModeHeading}=require('../.test-build/data/campaignProgress.js');
const {play,standing,finalHash,HZ}=require('./support/campaignBot.cjs');
// Chapter 2 S4: Level 11 "Canyon Pass", the first Chapter 2 mission, and the Full Battle special mode that left campaign-20 for it.
// Every Level 11 balance value is provisional (docs/CHAPTER2_S4.md).
const L=id=>campaign.get(id),frontLine=['red-tower-front-north','red-tower-front-center','red-tower-front-south'];
let writes=0;
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{writes++;raw=v;}}));s.refresh();return s;};

test('Level 11 is the registered Canyon Pass mission of Chapter 2, with the approved provisional values',()=>{
 const l=L('campaign-11');
 assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[11,2,'Canyon Pass','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);
 assert.deepEqual(l.match,{encounter:'extended',overrides:{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4,5,5],alliedPerWave:1},defenders:frontLine,crimsonKeepArmed:false}});
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
  {id:'hold',objectives:[{id:'towers',type:'structures-completed',kind:'tower',count:1,display:{label:'Build 1 Archer Tower'}},{id:'waves',type:'waves-defeated',count:3,display:{label:'Defeat 3 Crimson waves'}}]},
  {id:'breach',objectives:[{id:'front',type:'destroy',targets:frontLine,count:2,display:{label:'Destroy 2 of 3 front towers'}}]}]});
 assert.ok(Object.isFrozen(l)&&Object.isFrozen(l.match.overrides.waves.enemyPerWave),'registered levels are read-only');
});

test('Level 11 builds a Canyon match with the front towers, an inert Crimson Keep, the Shop open and no Desert Raiders',()=>{
 const setup=campaign.setup(11),sim=new Simulation('l11-setup',setup);
 assert.equal(sim.field.id,'canyon-pass');assert.equal(setup.shop,true,'the Shop stays enabled');assert.equal(setup.keepDefense.red,null);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id),frontLine);assert.equal(setup.waveRules.raidersPerWave.length,0);
 assert.deepEqual([1,2,3,4,5,6].map(n=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===n).length),[3,3,4,4,5,5]);
 assert.equal(setup.encounter.spawns.some(e=>e.archetype),false,'no spawn entry carries an archetype');
});

test('a Level 11 match spawns only Crimson minions: no unit carries an archetype',()=>{
 const sim=new Simulation('l11-crimson',campaign.setup(11));
 while(sim.clock.tick<2400)sim.advance(1000/30+.01);
 const red=Object.values(sim.state.units).filter(u=>u.team==='red');
 assert.ok(red.length>0);for(const u of red)assert.equal(Object.hasOwn(u,'archetype'),false,u.id);
});

test('Level 11 unlocks after Level 10 is cleared and needs no purchases; Levels 12 to 19 stay locked behind it, only 20 pending',()=>{
 const views=n=>chapterViews(campaignChapters,campaign.list(),store(n).progress)[1];
 assert.equal(views(9).state,'locked');assert.equal(views(9).missions[0].state,'locked');
 assert.equal(store(9).isUnlocked(L('campaign-11')),false);assert.equal(store(10).isUnlocked(L('campaign-11')),true);assert.equal(store(10).progress.next.id,'campaign-11');
 const ten=views(10);assert.equal(ten.state,'available');assert.equal(ten.missions[0].state,'available');
 assert.deepEqual(ten.missions.slice(1).map(m=>m.state),[...Array(8).fill('locked'),'pending']);
 const s=store(10),r=s.recordVictory(L('campaign-10'));assert.deepEqual([r.recorded,r.firstClear,r.next.id],[true,false,'campaign-11'],'replaying Level 10 points at Level 11');
 const won=store(10).recordVictory(L('campaign-11'));assert.deepEqual([won.recorded,won.firstClear,won.upToDate,won.next.id],[true,true,false,'campaign-12'],'Level 11 is recorded and Level 12 is next');
});

test('Full Battle is the special mode full-battle: reachable, never a story level, never saved and campaign-20 stays free',()=>{
 const fb=L('full-battle');
 assert.deepEqual([fb.number,fb.chapter,isSequential(fb)],[0,0,false]);assert.equal(specialModeHeading,'FULL BATTLE · SPECIAL MODE');
 assert.equal(campaign.has('campaign-20'),false);assert.equal(campaign.list().at(-1).id,'full-battle','special modes list last');
 const s=store(0),before=writes,r=s.recordVictory(fb);assert.equal(r.recorded,false);assert.equal(writes,before,'a Full Battle Victory writes nothing');
 assert.equal(s.isUnlocked(fb),true,'always available');
 assert.equal(progressOf(campaign.list(),{version:1,levels:{}}).sequence.some(l=>l.id==='full-battle'),false);
 assert.equal(campaignChapters.flatMap(c=>c.slots).some(slot=>slot.levelId==='full-battle'),false,'no chapter slot refers to it');
 assert.equal(campaignChapters[1].slots[9].levelId,'campaign-20','the Chapter 2 finale identity is reserved');
 assert.equal(campaignLevels.filter(l=>l.chapter===1).length,10,'Chapter 1 is unchanged');
});

// One bot simulation, the first result of the first run (see docs/CHAPTER2_S4.md): the Level 6 shape of play, north lane. Provisional balance is not asserted beyond a win.
const T=n=>'red-tower-'+n,policy=log=>({towers:1,cast:{bash:true},leash:650,hold:{x:620,y:600},targets:[T('front-north'),T('front-center')],gate:s=>s.missionStatus().activePhase==='hold',log});
test('Level 11 is winnable by the shared test bot through hold then breach, with the Azure Keep held, and replays identically',()=>{
 const run=()=>{const sim=new Simulation('l11-bot',campaign.setup(11)),log=[];play(sim,16000,policy(log));return {sim,log};};
 const {sim,log}=run(),m=sim.missionStatus();
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
 assert.deepEqual(m.completedPhases,['hold','breach']);assert.equal(standing(sim),1,'the Archer Tower still stands');
 assert.ok(sim.state.bases['blue-base'].hp>=1500,'the Azure Keep stayed above half');
 assert.equal(log.filter(e=>e.type==='match-end').length,1);
 assert.ok(sim.clock.tick/HZ>60&&sim.clock.tick/HZ<600,'finishes in a plausible time');
 assert.equal(finalHash(sim,log),finalHash(...(r=>[r.sim,r.log])(run())),'same seed and inputs replay identically');
});

test('losing the Azure Keep ends Level 11 in defeat',()=>{
 const sim=new Simulation('l11-defeat',campaign.setup(11));
 sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp*.49;
 sim.advance(1000/30+.01);
 assert.deepEqual([sim.outcome.outcome,sim.outcome.reason],['defeat','azure-keep-hp-threshold']);
});

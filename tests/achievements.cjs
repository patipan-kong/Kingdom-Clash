const test=require('node:test');
const assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {progressOf,PROGRESS_KEY}=require('../.test-build/data/campaignProgress.js');
const {achievementCatalog,earnedBy,isBallistaRepair,formatTicks}=require('../.test-build/data/achievements.js');
const {ACHIEVEMENT_KEY,parseAchievementSave,mergeAchievementSaves,technologiesOf,applyRun,emptyAchievementSave}=require('../.test-build/data/achievementSave.js');
const {AchievementStore}=require('../.test-build/data/achievementStore.js');
const {achievementList,previewList,previewModes}=require('../.test-build/data/achievementView.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
// Achievement V1: strict save, monotonic merge, derived technologies, the store's fallbacks, the Ballista rule against a real simulation, and what the screen may show.
const fake=(initial)=>{const s={data:new Map(initial===undefined?[]:[[ACHIEVEMENT_KEY,initial]]),writes:0,failRead:false,failWrite:false,
 getItem(k){if(s.failRead)throw new Error('read denied');return s.data.has(k)?s.data.get(k):null;},
 setItem(k,v){if(s.failWrite)throw new Error('quota');s.writes++;s.data.set(k,String(v));}};return s;};
const run=(over={})=>({levelId:'campaign-32',victory:true,ticks:9000,ballistaRepaired:true,...over});
const json=(unlocked={},bestTimes={},version=1)=>JSON.stringify({version,unlocked,bestTimes});
const DAY=Date.UTC(2026,10,2);

test('the catalogue has the one Ballista achievement, a technology of Cliff Pass, and its rule needs repair AND victory',()=>{
 assert.equal(achievementCatalog.length,3);const a=achievementCatalog[0];
 assert.deepEqual([a.id,a.levelId,a.kind,a.technology],['ballista-recovered','campaign-32','technology','ballista']);
 assert.deepEqual(earnedBy(run()),['ballista-recovered']);
 assert.deepEqual(earnedBy(run({victory:false})),[],'repair + defeat earns nothing');
 assert.deepEqual(earnedBy(run({ballistaRepaired:false})),[],'victory without a repair earns nothing');
 assert.deepEqual(earnedBy(run({levelId:'campaign-33'})),[],'another mission earns nothing');
 assert.equal(formatTicks(7*60*30+15*30),'7:15');assert.equal(formatTicks(59*30),'0:59');
});

test('strict parse: fresh, valid, corrupted, wrong shape, dropped bad entries, and a newer version that is never writable',()=>{
 assert.deepEqual(parseAchievementSave(null),{save:emptyAchievementSave(),status:'fresh',writable:true});
 const ok=parseAchievementSave(json({'ballista-recovered':DAY},{'campaign-32':9000}));assert.equal(ok.status,'ok');assert.deepEqual(ok.save,{version:1,unlocked:{'ballista-recovered':DAY},bestTimes:{'campaign-32':9000}});
 for(const raw of ['{not json','[]','null','"x"','{"version":0}','{"version":1.5}','{"version":"1"}','{"version":1}'])assert.equal(parseAchievementSave(raw).status,'recovered',raw);
 assert.deepEqual(parseAchievementSave('{not json').save,emptyAchievementSave());
 const bad=parseAchievementSave(json({'ballista-recovered':DAY,'Bad Id':DAY,'neg':-5,'frac':1.5,'str':'x'},{'campaign-32':9000,'level':5,'campaign-33':0}));
 assert.equal(bad.status,'recovered');assert.deepEqual(bad.save,{version:1,unlocked:{'ballista-recovered':DAY},bestTimes:{'campaign-32':9000}},'only the valid entries survive');
 const future=parseAchievementSave(json({'ballista-recovered':DAY},{},2));assert.deepEqual([future.status,future.writable],['newer-version',false]);
 assert.equal(parseAchievementSave(json({'future-badge':DAY})).save.unlocked['future-badge'],DAY,'a well-formed id this catalogue does not know is kept');
});

test('merge is monotonic, commutative and idempotent; the earlier unlock and the smaller tick count win',()=>{
 const a={version:1,unlocked:{x:200,y:50},bestTimes:{'campaign-32':9000}},b={version:1,unlocked:{x:100,z:7},bestTimes:{'campaign-32':8000,'campaign-33':5}};
 const m=mergeAchievementSaves(a,b);assert.deepEqual(m,{version:1,unlocked:{x:100,y:50,z:7},bestTimes:{'campaign-32':8000,'campaign-33':5}});
 assert.deepEqual(mergeAchievementSaves(b,a),m);assert.deepEqual(mergeAchievementSaves(m,m),m);assert.deepEqual(mergeAchievementSaves(m,emptyAchievementSave()),m);
});

test('technologies are derived from unlocked achievement ids only',()=>{
 assert.deepEqual(technologiesOf(emptyAchievementSave()),[]);
 assert.deepEqual(technologiesOf({version:1,unlocked:{'ballista-recovered':DAY},bestTimes:{}}),['ballista']);
 assert.deepEqual(technologiesOf({version:1,unlocked:{'future-badge':DAY},bestTimes:{'campaign-32':1}}),[],'unknown ids and best times grant nothing');
});

test('applyRun: victory only, minimum ticks, original unlock time kept, idempotent, never retroactive',()=>{
 const empty=emptyAchievementSave();
 assert.deepEqual(applyRun(empty,run({victory:false}),DAY),{save:empty,newlyUnlocked:[]},'a defeat changes nothing, not even a best time');
 assert.equal(applyRun(empty,run({ticks:0}),DAY).save,empty);assert.equal(applyRun(empty,run({ticks:1.5}),DAY).save,empty);
 const one=applyRun(empty,run({ballistaRepaired:false,ticks:12000}),DAY);
 assert.deepEqual(one,{save:{version:1,unlocked:{},bestTimes:{'campaign-32':12000}},newlyUnlocked:[]},'a win without a repair records the time and no achievement');
 const two=applyRun(one.save,run({ticks:9000}),DAY+5);assert.deepEqual(two.newlyUnlocked,['ballista-recovered']);assert.deepEqual(two.save,{version:1,unlocked:{'ballista-recovered':DAY+5},bestTimes:{'campaign-32':9000}});
 const slower=applyRun(two.save,run({ticks:15000}),DAY+99);assert.deepEqual(slower.newlyUnlocked,[]);assert.deepEqual(slower.save,two.save,'a slower win changes nothing; the unlock time is the first');
 const faster=applyRun(two.save,run({ticks:7000}),DAY+99);assert.equal(faster.save.bestTimes['campaign-32'],7000);assert.equal(faster.save.unlocked['ballista-recovered'],DAY+5);
});

test('the store: persists under its own key, leaves the campaign key alone, is idempotent, and merges what another tab wrote',()=>{
 const fs=fake();fs.data.set(PROGRESS_KEY,'{"version":1,"levels":{}}');const st=new AchievementStore(()=>fs);st.refresh();assert.equal(st.status,'fresh');assert.equal(st.persistent,true);
 assert.deepEqual(st.record(run(),DAY),['ballista-recovered']);assert.equal(fs.writes,1);
 assert.deepEqual(st.record(run(),DAY+1),[],'the same result again unlocks nothing');assert.equal(fs.writes,1,'and writes nothing');
 assert.equal(fs.data.get(PROGRESS_KEY),'{"version":1,"levels":{}}','the campaign save is untouched');
 assert.deepEqual(JSON.parse(fs.data.get(ACHIEVEMENT_KEY)),{version:1,unlocked:{'ballista-recovered':DAY},bestTimes:{'campaign-32':9000}});
 assert.deepEqual(st.technologies,['ballista']);assert.equal(st.hasTechnology('ballista'),true);assert.equal(st.hasTechnology('war-cart'),false);
 const other=fake(json({'future-badge':50},{'campaign-33':77}));const st2=new AchievementStore(()=>other);st2.record(run(),DAY);
 assert.deepEqual(JSON.parse(other.data.get(ACHIEVEMENT_KEY)),{version:1,unlocked:{'future-badge':50,'ballista-recovered':DAY},bestTimes:{'campaign-32':9000,'campaign-33':77}},'another tab\'s entries are merged, not overwritten');
});

test('the store: unreadable, unwritable and newer-version storage keep this session\'s progress in memory and never overwrite',()=>{
 const unread=fake();unread.failRead=true;const a=new AchievementStore(()=>unread);a.refresh();assert.equal(a.status,'unavailable');assert.equal(a.persistent,false);
 assert.deepEqual(a.record(run(),DAY),['ballista-recovered']);assert.equal(unread.writes,0);assert.deepEqual(a.technologies,['ballista'],'still earned this session');
 const nostorage=new AchievementStore(()=>null);nostorage.refresh();assert.equal(nostorage.status,'unavailable');assert.deepEqual(nostorage.record(run(),DAY),['ballista-recovered']);
 const full=fake();full.failWrite=true;const b=new AchievementStore(()=>full);assert.deepEqual(b.record(run(),DAY),['ballista-recovered']);assert.equal(b.persistent,false);assert.deepEqual(b.technologies,['ballista']);
 const raw=json({'ballista-recovered':DAY},{},2),future=fake(raw);const c=new AchievementStore(()=>future);c.record(run(),DAY+1);
 assert.equal(c.status,'newer-version');assert.equal(future.writes,0);assert.equal(future.data.get(ACHIEVEMENT_KEY),raw,'a newer save is never overwritten');
 const corrupt=fake('{broken');const d=new AchievementStore(()=>corrupt);d.record(run(),DAY);assert.deepEqual(JSON.parse(corrupt.data.get(ACHIEVEMENT_KEY)).unlocked,{'ballista-recovered':DAY},'a corrupted save recovers and is rewritten');
});

// ---- the Ballista rule against the real Cliff Pass simulation ----
const L=campaign.get('campaign-32'),BAL={col:21,row:9};
const play=(sim,ticks,log)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}};
test('a finished Ballista repair is recognised from the real construction-complete event; a repair that never finishes or a plain tower is not',()=>{
 const sim=new Simulation('ach',campaign.setup(32)),s=sim.state,log=[];
 for(const id of ['blue-0','blue-1','blue-2']){const u=s.units[id];if(u){u.x=700;u.y=300;}}
 strike(sim,'guardian','red-hero');for(const id of ['c4-camp-north','c4-camp-south'])strike(sim,'guardian',id);sim.teleportHero(1080,624);play(sim,125,log);assert.equal(s.post.owner,'azure');
 sim.economy.balances.wood=200*120;sim.economy.balances.iron=40*120;
 sim.send({type:'place',requestId:'t1',kind:'tower',col:23,row:13});sim.send({type:'place',requestId:'b1',kind:'ballista',col:BAL.col,row:BAL.row});
 let repaired=false,towerSeen=false;const mark=log.length;play(sim,1,log);
 assert.equal(isBallistaRepair(s.structures['built-b1']),true,'the Ballista structure is Azure and flagged');assert.equal(isBallistaRepair(s.structures['built-t1']),false);
 for(let i=0;i<5*HZ+5;i++){play(sim,1,log);}
 for(const e of log.slice(mark))if(e.type==='construction-complete'){if(isBallistaRepair(s.structures[e.id]))repaired=true;if(e.id==='built-t1')towerSeen=true;}
 assert.equal(repaired,true,'the Ballista repair completed');assert.equal(towerSeen,true,'the tower repair completed too and did not count');
 assert.equal(isBallistaRepair(undefined),false);assert.equal(isBallistaRepair({team:'red'}),false);
});

// ---- what the screen may show ----
const chapter4=(open=true)=>[{number:4,release:'available',slots:[{localNumber:1,levelId:'campaign-31'},{localNumber:2,levelId:'campaign-32'},{localNumber:3,levelId:'campaign-33'}]}];
const progress=(clears,chapters=chapter4())=>progressOf(chapters,campaign.list(),{version:1,levels:Object.fromEntries(clears.map(id=>[id,{clears:1}]))});
test('the list shows only achievements of missions the player can open now; with none it is empty and hides the counter',()=>{
 const none=achievementList(emptyAchievementSave(),campaign.list(),progress([]));
 assert.deepEqual([none.cards.length,none.showCounter,none.total],[0,false,0],'Mission 2 is still locked: nothing shown');
 const real=achievementList(emptyAchievementSave(),campaign.list(),progressOf(campaignChapters,campaign.list(),{version:1,levels:{}}));
 assert.equal(real.cards.length,0,'with the real chapters (Chapter 4 not released) the screen is empty: campaign availability is unchanged');
 const open=achievementList(emptyAchievementSave(),campaign.list(),progress(['campaign-31']));
 assert.deepEqual([open.cards.length,open.showCounter,open.unlockedCount,open.total],[1,true,0,1]);
 assert.deepEqual([open.cards[0].def.id,open.cards[0].unlocked,open.cards[0].replay,open.cards[0].unlockedAt,open.cards[0].bestTicks],['ballista-recovered',false,true,undefined,undefined]);
 const done=achievementList({version:1,unlocked:{'ballista-recovered':DAY},bestTimes:{'campaign-32':8100}},campaign.list(),progress(['campaign-31']));
 assert.deepEqual([done.cards[0].unlocked,done.cards[0].unlockedAt,done.cards[0].bestTicks,done.unlockedCount],[true,DAY,8100,1]);
 const timeOnly=achievementList({version:1,unlocked:{},bestTimes:{'campaign-32':8100}},campaign.list(),progress(['campaign-31']));
 assert.equal(timeOnly.cards[0].bestTicks,undefined,'a locked card shows no best time');
});
test('Replay is offered exactly where the campaign allows the mission, and the Mission Briefing enforces the same rule',()=>{
 const p=progress(['campaign-31']);const card=achievementList(emptyAchievementSave(),campaign.list(),p).cards[0];
 assert.equal(card.replay,p.isUnlocked(campaign.get(card.def.levelId)));
 assert.equal(progress([]).isUnlocked(campaign.get('campaign-32')),false);assert.equal(progressOf(campaignChapters,campaign.list(),{version:1,levels:{}}).isUnlocked(campaign.get('campaign-32')),false);
 assert.equal(achievementList(emptyAchievementSave(),campaign.list(),progress(['campaign-31']),[]).showCounter,false);
});
test('preview fixtures: four modes, never a replay, an empty one hides the counter, and no real catalogue entry is changed',()=>{
 assert.deepEqual(previewModes,['mixed','locked','unlocked','empty']);
 const mixed=previewList('mixed');assert.deepEqual([mixed.cards.length,mixed.unlockedCount,mixed.showCounter],[3,1,true]);assert.ok(mixed.cards.every(c=>c.replay===false));
 assert.deepEqual([previewList('locked').unlockedCount,previewList('unlocked').unlockedCount],[0,1]);const empty=previewList('empty');assert.deepEqual([empty.cards.length,empty.showCounter],[0,false]);
 assert.equal(achievementCatalog.length,3);
});
// Chapter 4 M4: the War Cart and Elite Barracks technology achievements share the Ballista infrastructure.
test('M4 achievements: each needs its own finished repair AND victory in campaign-34; neither repair is needed to win; a defeat earns nothing',()=>{
 const m4=(over={})=>({levelId:'campaign-34',victory:true,ticks:12000,ballistaRepaired:false,...over});
 assert.deepEqual(achievementCatalog.filter(a=>a.levelId==='campaign-34').map(a=>[a.id,a.kind,a.technology]),[['warcart-recovered','technology','war-cart'],['elitebarracks-recovered','technology','elite-barracks']]);
 assert.deepEqual(earnedBy(m4()),[],'a win with no repair earns nothing');
 assert.deepEqual(earnedBy(m4({warCartRepaired:true})),['warcart-recovered']);assert.deepEqual(earnedBy(m4({eliteBarracksRepaired:true})),['elitebarracks-recovered']);
 assert.deepEqual(earnedBy(m4({warCartRepaired:true,eliteBarracksRepaired:true})),['warcart-recovered','elitebarracks-recovered']);
 assert.deepEqual(earnedBy(m4({warCartRepaired:true,eliteBarracksRepaired:true,victory:false})),[],'repairs without the victory earn nothing');
 assert.deepEqual(earnedBy({levelId:'campaign-32',victory:true,ticks:9000,ballistaRepaired:true,warCartRepaired:true}),['ballista-recovered'],'a repair flag never earns another mission\'s achievement');
 const r=applyRun(emptyAchievementSave(),m4({warCartRepaired:true}),DAY);assert.deepEqual(r.newlyUnlocked,['warcart-recovered']);assert.deepEqual(technologiesOf(r.save),['war-cart']);assert.equal(r.save.bestTimes['campaign-34'],12000);
 const none=applyRun(emptyAchievementSave(),m4({victory:false,warCartRepaired:true}),DAY);assert.deepEqual(none.save,emptyAchievementSave(),'a defeat saves nothing');
});
test('M4 achievements against a real simulation: the repairs raise the events Battle reads (site repaired cart / site converted on the Elite Barracks)',()=>{
 const sim=new Simulation('ach34',campaign.setup(34)),log=[];const play=n=>{for(let i=0;i<n;i++){sim.advance(DT);log.push(...sim.drainEvents());}};
 sim.hero.hp=sim.hero.maxHp=1e6;play(950);strike(sim,'guardian','red-cart');play(2);const w=sim.state.cartWreck;
 sim.economy.balances={...sim.economy.balances,wood:1e9,iron:1e9};sim.teleportHero(w.x+40,w.y);play(160);
 assert.ok(log.some(e=>e.type==='site'&&e.change==='repaired'&&e.id==='cart'),'the War Cart repair event');
 for(const id of ['c4-elite-west','c4-elite-east'])strike(sim,'guardian',id);sim.teleportHero(1104,1008);play(125);sim.teleportHero(1104,1008);sim.hero.hp=sim.hero.maxHp=1e6;play(160);
 assert.ok(log.some(e=>e.type==='site'&&e.change==='converted'&&e.id==='red-barracks-elite')&&sim.state.structures['red-barracks-elite'].eliteBarracks,'the Elite Barracks conversion event');
});

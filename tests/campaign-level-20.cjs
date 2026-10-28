const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {play,finalHash,threatened,scripted,strike,until,HZ}=require('./support/campaignBot.cjs');
// Chapter 2 S10C-B2: Level 20 "The Crimson Last Stand", the Chapter 2 finale (Oasis hold, front line, armed Crimson Keep). Every balance value is provisional (docs/CHAPTER2_S10C.md);
// the bot results here are preliminary evidence, not a human playtest. The matrix runs KC_SEEDS lane seeds (default 10; the S10C-B2 acceptance run used 20, `KC_SEEDS=20`).
// The test bot never uses the Shop, so the matrix adds a test-local hook that buys the next listed item as soon as it is affordable and the Guardian is home (Level 20 has no Gold at the start).
const L=n=>campaign.get(`campaign-${n}`),FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'],GATES=['red-tower-keep-north','red-tower-keep-south'];
const OASIS=[[9,11],[9,13],[10,10],[10,14],[8,12]],ROUTE=['red-tower-front-north','red-tower-front-center','red-base'];
const SEEDS=Array.from({length:Math.max(1,+(process.env.KC_SEEDS||10))},(_,i)=>i+1);
const HAMMER_FIRST=['siege-hammer','guardian-shield'],SHIELD_FIRST=['guardian-shield','siege-hammer'];
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
const won=sim=>assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['victory','objectives-complete'],JSON.stringify(sim.missionStatus().objectives.map(o=>[o.id,o.progress])));
const prog=(sim,id)=>sim.missionStatus().objectives.find(o=>o.id===id);
const holdPhase=s=>s.missionStatus().activePhase==='hold';
const waveCounts=(setup,n)=>Array.from({length:n},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===i+1).length);
const raiderCounts=(setup,n)=>Array.from({length:n},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===i+1&&e.archetype==='desert-raider').length);
const guardianDeaths=log=>log.filter(e=>e.type==='death'&&e.id==='guardian').length;
// Counts spawn deferral: ticks in which the first due Crimson spawn is blocked by a live unit within 26 px of its slot (measured, not fixed here).
function deferral(sim){const o={ticks:0},adv=sim.advance.bind(sim);
 sim.advance=dt=>{adv(dt);const due=sim.spawnQueue.find(q=>q.team==='red'&&q.tick<=sim.clock.tick);if(due&&Object.values(sim.state.units).some(u=>u.hp>0&&Math.hypot(u.x-due.x,u.y-due.y)<26))o.ticks++;};return o;}
// Test-local Shop hook: every 15 ticks, buys the next item in `order` when the quote is available (Guardian near home, enough Gold). Records [item, second].
function shopper(sim,order){const queue=[...order],bought=[],adv=sim.advance.bind(sim);
 sim.advance=dt=>{if(queue.length&&sim.clock.tick%15===0&&sim.hero.hp>0&&sim.shopPurchaseQuote(queue[0]).available){const item=queue.shift();
  sim.send({type:'buy-item',matchId:sim.state.inventory.matchId,heroId:'guardian',requestId:'buy'+bought.length,itemId:item});bought.push([item,Math.round(sim.clock.tick/HZ)]);}adv(dt);};return bought;}
// Policies. "wait" holds at home through the hold phase and then until the first Shop purchase (or 200 s), then sorties and never returns; "early" leaves at a fixed second.
const waitGate=bought=>s=>holdPhase(s)||(bought.length<1&&s.clock.tick<200*HZ);
function run(seed,{towers=3,order=HAMMER_FIRST,pol='wait',leave=0,max=480,targets=ROUTE}={}){
 const sim=new Simulation('l20-'+seed,campaign.setup(20,seed)),log=[],d=deferral(sim),bought=shopper(sim,order),t={marks:{},azureMin:3000},adv=sim.advance.bind(sim);
 sim.advance=dt=>{adv(dt);t.azureMin=Math.min(t.azureMin,sim.state.bases['blue-base'].hp);const p=sim.missionStatus().activePhase;if(p&&!(p in t.marks))t.marks[p]=Math.round(sim.clock.tick/HZ);};
 const gate={wait:waitGate(bought),early:s=>s.clock.tick<leave*HZ,return:s=>holdPhase(s)||threatened(s,520),parked:()=>true}[pol];
 play(sim,max*HZ,{towers,cells:OASIS,targets:pol==='parked'?[]:targets,gate,park:pol==='parked',leash:420,hold:{x:540,y:600},cast:{bash:true},log});
 return {sim,log,d,bought,t};
}
const tally=(opts,seeds=SEEDS)=>{const rows=seeds.map(seed=>run(seed,opts));return {rows,wins:rows.filter(r=>r.sim.outcome?.outcome==='victory'),n:seeds.length};};
const secs=r=>r.sim.outcome.tick/HZ;

test('Level 20 is The Crimson Last Stand: Oasis, hold then front line then Keep, an empty start, five defending towers, an armed vulnerable Keep',()=>{
 const l=L(20);assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[20,2,'The Crimson Last Stand','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l));
 assert.match(l.display.briefing,/Final assault/);assert.match(l.display.briefing,/no Gold, Wood or Iron/);assert.match(l.display.briefing,/two Archer Towers/);assert.match(l.display.briefing,/two of the three front towers/);assert.match(l.display.briefing,/Crimson Keep/);assert.match(l.display.briefing,/shoots/);assert.match(l.display.briefing,/50% health/);
 assert.ok(l.display.briefing.length<=320,'the briefing body must fit three lines of the mission briefing (longer text overlaps PRIMARY OBJECTIVES)');
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
  {id:'hold',objectives:[{id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},{id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]},
  {id:'line',objectives:[{id:'front',type:'destroy',targets:FRONT,count:2,display:{label:'Destroy 2 of 3 front towers'}}]},
  {id:'keep',objectives:[{id:'crimson',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]});
 const o=l.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.crimsonKeepInvulnerable],['oasis',true,undefined]);assert.deepEqual(o.defenders,[...FRONT,...GATES]);assert.deepEqual(o.start,{gold:0,wood:0,iron:0});
 assert.deepEqual([o.waves.firstWaveTick,o.waves.waveInterval,o.waves.alliedPerWave],[300,800,0]);assert.deepEqual(o.waves.enemyPerWave,[3,3,4,5,6,6,7,8]);assert.deepEqual(o.waves.raidersPerWave,[0,0,2,2,3,3,4,4]);
 assert.deepEqual(o.waves.lanes,L(18).match.overrides.waves.lanes,"Level 18's committed seeded lanes, verbatim");
 assert.deepEqual([o.waves.enemyPerWave,o.waves.raidersPerWave,o.waves.waveInterval],[L(18).match.overrides.waves.enemyPerWave,L(18).match.overrides.waves.raidersPerWave,L(18).match.overrides.waves.waveInterval],"Level 18's wave table");
 const setup=campaign.setup(20,5);assert.equal(setup.battlefield.id,'oasis');assert.equal(setup.shop,true);assert.deepEqual([setup.start.gold,setup.start.wood,setup.start.iron],[0,0,0]);
 assert.equal(setup.crimsonKeepInvulnerable,false);assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),[...FRONT,...GATES].sort());
 assert.deepEqual(waveCounts(setup,8),[3,3,4,5,6,6,7,8]);assert.deepEqual(raiderCounts(setup,8),[0,0,2,2,3,3,4,4]);assert.equal(setup.encounter.spawns.some(e=>e.team==='blue'),false,'no allied reinforcement');
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick).slice(0,3),[300,1100,1900]);
 assert.equal(l.mission.phases.flatMap(p=>p.objectives).some(x=>x.type==='destroy'&&x.targets.some(t=>GATES.includes(t))),false,'the gate towers are defenders, not objectives');
});
test('Level 20: the Crimson Keep is armed exactly as in Level 10 (guardian-first, 140 px, unchanged damage), vulnerable, 3,000 HP, and every Crimson tower stands from the start',()=>{
 const sim=new Simulation('l20-setup',campaign.setup(20,1)),ref=new Simulation('l10-ref',campaign.setup(10,1)),red=sim.state.bases['red-base'],r10=ref.state.bases['red-base'];
 assert.equal(red.hp,3000);assert.notEqual(red.invulnerable,true);assert.deepEqual([red.damage,red.cooldownTicks,red.range,red.windupTicks],[r10.damage,r10.cooldownTicks,r10.range,r10.windupTicks]);
 assert.ok(red.damage>0&&red.range===140,`Keep damage ${red.damage}, range ${red.range}`);assert.equal(sim.keepTargeting['red-base'],'guardian-first');assert.deepEqual(campaign.setup(20).keepDefense.red,campaign.setup(10).keepDefense.red);
 assert.equal(sim.field.id,'oasis');assert.deepEqual([sim.state.gold,sim.state.wood,sim.state.iron],[0,0,0]);assert.ok([...FRONT,...GATES].every(id=>sim.state.structures[id]?.hp>0),'all five Crimson towers stand');
 assert.equal(Object.values(sim.state.structures).filter(s=>s.team==='red').length,5);
});
test('Level 20: the armed Keep shoots a Guardian standing at its west side and the damage dealt to it is never repaired',()=>{
 const sim=new Simulation('l20-keep',campaign.setup(20,1)),red=sim.state.bases['red-base'];sim.hero.x=red.x-130;sim.hero.y=red.y;const before=sim.hero.hp;
 until(sim,60);assert.ok(sim.hero.hp<before,'the armed Keep hit the Guardian');
 const sim2=new Simulation('l20-persist',campaign.setup(20,1)),k=sim2.state.bases['red-base'];strike(sim2,'guardian','red-base',1000);const hp=k.hp;until(sim2,1800);assert.equal(k.hp,hp,'Keep HP does not regenerate');
});
test('Level 20 lanes: waves 1-2 are unsplit, waves 3-8 take both banks by a seed, committed, and the seed reproduces the plan',()=>{
 const plan=setup=>JSON.stringify(setup.encounter.spawns.filter(e=>e.team==='red').map(e=>[e.id,e.lane??null,!!e.commit]));
 const a=campaign.setup(20,2024),b=campaign.setup(20,2024),c=campaign.setup(20,2025);assert.equal(plan(a),plan(b));assert.notEqual(plan(a),plan(c));
 for(const n of [1,2])assert.ok(a.encounter.spawns.filter(e=>e.wave===n&&e.team==='red').every(e=>!e.lane&&!e.commit));
 for(const seed of [1,2,3,4]){const s=campaign.setup(20,seed),s18=campaign.setup(18,seed);
  assert.equal(plan(s),plan(s18),`seed ${seed}: the same committed plan as Level 18`);
  for(const n of [3,4,5,6,7,8]){const red=s.encounter.spawns.filter(e=>e.wave===n&&e.team==='red');assert.ok(red.every(e=>e.commit&&(e.lane==='north'||e.lane==='south')),`seed ${seed} wave ${n}`);}}
});
test('Level 20 starts empty: no Gold, Wood or Iron, the first tower waits for income (about 40 s) and the first purchase waits for kills',()=>{
 const sim=new Simulation('l20-empty',campaign.setup(20,1));assert.deepEqual([sim.state.gold,sim.state.wood,sim.state.iron],[0,0,0]);assert.notEqual(sim.placementReason('tower',9,11),'');
 assert.equal(sim.shopPurchaseQuote('siege-hammer').available,false,'no Gold, so no purchase');
 until(sim,41*HZ);assert.ok(sim.state.wood>=80&&sim.state.iron>=10,`${sim.state.wood} Wood, ${sim.state.iron} Iron at 41 s`);assert.equal(sim.placementReason('tower',9,11),'');assert.equal(sim.state.gold,0,'Gold comes only from Crimson kills');
});
test('Level 20 phases open in order: the front line only after two towers and five waves, the Keep only after two front towers, and the win is the Crimson Keep falling',()=>{
 const seen=[];const sim=new Simulation('l20-1',campaign.setup(20,1)),log=[],bought=shopper(sim,HAMMER_FIRST),adv=sim.advance.bind(sim);
 sim.advance=dt=>{const p=sim.missionStatus().activePhase;if(seen.at(-1)!==p&&!sim.ended)seen.push(p);return adv(dt);};
 play(sim,480*HZ,{towers:3,cells:OASIS,targets:ROUTE,gate:waitGate(bought),leash:420,hold:{x:540,y:600},cast:{bash:true},log});
 won(sim);assert.deepEqual(seen,['hold','line','keep']);assert.deepEqual(sim.missionStatus().completedPhases,['hold','line','keep']);
 assert.equal(prog(sim,'waves').progress,5);assert.equal(prog(sim,'towers').progress,2);assert.ok(prog(sim,'front').progress>=2);assert.equal(sim.state.bases['red-base'].hp<=0,true);assert.equal(log.filter(e=>e.type==='match-end').length,1);
});
test('Level 20: razing the Keep early does not end the match; it is credited only when the last phase opens, and the five towers still have to fall',()=>{
 const sim=new Simulation('l20-early-keep',campaign.setup(20,1)),at=scripted(sim),log=[];at(10,()=>strike(sim,'guardian','red-base'));
 until(sim,600,log);assert.equal(sim.state.bases['red-base'].hp<=0,true);assert.equal(sim.ended,false,'no instant victory');assert.equal(sim.missionStatus().activePhase,'hold');assert.equal(prog(sim,'crimson').progress,0,'not credited during the hold');
 const bought=shopper(sim,HAMMER_FIRST);
 play(sim,480*HZ,{towers:2,cells:OASIS,targets:[FRONT[0],FRONT[1]],gate:waitGate(bought),leash:420,hold:{x:540,y:600},cast:{bash:true},log});
 won(sim);assert.deepEqual(sim.missionStatus().completedPhases,['hold','line','keep']);
});

// Bot matrix (preliminary evidence). Acceptance targets from the S10C Level 20 design review.
test('Level 20 matrix: three towers and a Hammer-first Shop win at least 70% of seeds in 245-300 s, within four Guardian deaths, and replay identically',()=>{
 const {rows,wins,n}=tally({towers:3});
 assert.ok(wins.length>=Math.ceil(.7*n),`3 towers, Hammer first: ${wins.length}/${n} won`);
 for(const r of wins){assert.deepEqual(r.sim.missionStatus().completedPhases,['hold','line','keep']);assert.ok(secs(r)>=245&&secs(r)<=300,`${secs(r)} s`);assert.ok(r.sim.state.bases['blue-base'].hp>=1000,'Azure Keep survives');}
 for(const r of rows){assert.ok(guardianDeaths(r.log)<=4,`${guardianDeaths(r.log)} Guardian deaths`);assert.ok(r.d.ticks<=12*HZ,`${r.d.ticks/HZ}s spawn deferral`);assert.ok(r.bought.length>=1,'a purchase was made');}
 const a=run(1,{towers:3}),b=run(1,{towers:3});assert.equal(finalHash(a.sim,a.log),finalHash(b.sim,b.log));
});
test('Level 20 matrix: two towers win at most 55% of seeds and one tower never wins',()=>{
 const two=tally({towers:2}),one=tally({towers:1},SEEDS.slice(0,4));
 assert.ok(two.wins.length<=Math.floor(.55*two.n),`2 towers: ${two.wins.length}/${two.n} won`);
 assert.equal(one.wins.length,0,'1 tower never wins');
});
// DEVIATION from the design target 'early raids never win': a 60 s raid won 1 of 6 seeds in the S10C-B2 acceptance run (197 s, 4 Guardian deaths, Azure Keep 1,912); 90 s won 2/6 and 120 s 5/6 (225 s, 3 deaths, faster than holding). Reported for owner review, not tuned.
test('Level 20 matrix: early raids at 10 and 30 s never win, a 60 s raid rarely wins (a reported deviation), and a parked Guardian loses before 60 s',()=>{
 for(const leave of [10,30])assert.equal(tally({towers:2,pol:'early',leave},SEEDS.slice(0,6)).wins.length,0,`raid at ${leave} s`);
 const sixty=tally({towers:2,pol:'early',leave:60},SEEDS.slice(0,6));assert.ok(sixty.wins.length<=2,`raid at 60 s: ${sixty.wins.length}/6`);for(const r of sixty.wins)assert.ok(guardianDeaths(r.log)>=4,'a winning 60 s raid pays an extra Guardian death');
 for(const seed of SEEDS.slice(0,3)){const {sim}=run(seed,{pol:'parked',max:120});assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['defeat','azure-keep-hp-threshold']);assert.ok(sim.outcome.tick<60*HZ,`parked lost at ${sim.outcome.tick/HZ}s`);}
});
test('Level 20 matrix: the Shop order is a real choice (Shield first wins less often than Hammer first) and no purchase runs without Gold',()=>{
 const hammer=tally({towers:3,order:HAMMER_FIRST},SEEDS.slice(0,6)),shield=tally({towers:3,order:SHIELD_FIRST},SEEDS.slice(0,6)),none=tally({towers:3,order:[]},SEEDS.slice(0,6));
 assert.ok(hammer.wins.length>=shield.wins.length,`Hammer ${hammer.wins.length}, Shield ${shield.wins.length}`);assert.ok(none.wins.length<hammer.wins.length,`no Shop ${none.wins.length}, Hammer ${hammer.wins.length}`);
 for(const r of hammer.rows)for(const [,sec] of r.bought)assert.ok(sec>=60,`first purchase at ${sec} s: Gold comes from kills`);
});

// Registration, unlock sequence and chapter view
test('Level 20 unlocks only after Level 19, Chapter 2 shows ten released missions and is complete when Level 20 is cleared; the campaign is then up to date',()=>{
 assert.equal(campaign.has('campaign-20'),true);assert.equal(store(18).isUnlocked(L(20)),false);assert.equal(store(19).isUnlocked(L(20)),true);assert.equal(store(19).progress.next.id,'campaign-20');
 const views=n=>chapterViews(campaignChapters,campaign.list(),store(n).progress)[1];
 assert.equal(views(10).released,10);assert.match(campaignChapters[1].narrative,/All ten missions are released/);
 assert.deepEqual(views(19).missions.map(m=>m.state),[...Array(9).fill('completed'),'available']);assert.equal(views(19).complete,false);
 const w=store(19).recordVictory(L(20));assert.deepEqual([w.recorded,w.firstClear,w.upToDate,w.next?.id],[true,true,false,'campaign-21'],'Level 21 (Chapter 3 C3-1) is registered, so Continue moves on to it');
 assert.equal(store(18).recordVictory(L(20)).recorded,false,'Level 20 cannot be recorded before Level 19');
 assert.equal(campaignChapters[1].slots[9].levelId,'campaign-20');assert.equal(chapterViews(campaignChapters,campaign.list(),store(20).progress)[1].complete,true);
});
test('Levels 1 to 19 and Full Battle are unchanged by S10C-B2',()=>{
 for(const l of campaign.list())assert.equal(Object.isFrozen(l),true);
 assert.equal(campaign.get('full-battle').mission,null);assert.equal(campaign.setup('full-battle').battlefield.id,'meadow');
 const l18=L(18).match.overrides;assert.equal(l18.crimsonKeepArmed,false);assert.deepEqual(l18.start,{wood:0,iron:0});assert.deepEqual(L(19).match.overrides.start,{gold:0,wood:0,iron:0});assert.equal(L(19).match.overrides.crimsonKeepInvulnerable,true);
 assert.equal(campaign.list().filter(l=>l.chapter===2).length,10);assert.equal(campaign.list().filter(l=>l.chapter===1).length,10);
});
// Release-readiness finding (S10C-B2), documented here and NOT fixed: no migration. Before Chapter 2 S4 the id 'campaign-20' was the Full Battle special mode, which was never recorded
// (recordVictory refuses non-sequential levels), so no shipped build wrote it to a v1 save. A hand-edited or imported save could still hold it.
test('a stale v1 save entry for campaign-20 is ignored unless Levels 1-19 are all saved, and then counts Level 20 as cleared (accepted, not migrated)',()=>{
 const withEntries=ids=>{const s=new ProgressStore(()=>({getItem:()=>JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))}),setItem:()=>{}}));s.refresh();return s;};
 const first=n=>Array.from({length:n},(_,i)=>`campaign-${String(i+1).padStart(2,'0')}`);
 const partial=withEntries([...first(12),'campaign-20']);assert.equal(partial.isCompleted(L(20)),false);assert.equal(partial.isUnlocked(L(20)),false);assert.equal(partial.progress.next.id,'campaign-13');
 const nineteen=withEntries([...first(19),'campaign-20']);assert.equal(nineteen.isCompleted(L(20)),true,'a stale entry on top of Levels 1-19 marks Level 20 cleared');assert.equal(nineteen.progress.next?.id,'campaign-21');
 const clean=withEntries(first(19));assert.equal(clean.isCompleted(L(20)),false);assert.equal(clean.progress.next.id,'campaign-20');
});

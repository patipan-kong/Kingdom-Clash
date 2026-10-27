const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {play,finalHash,threatened,scripted,strike,until,HZ}=require('./support/campaignBot.cjs');
// Chapter 2 S10C-A: Level 18 "The Twin Banks" (Oasis siege) and Level 19 "The Sandstone Line" (Canyon assault in depth). Every balance value is provisional (docs/CHAPTER2_S10C.md);
// the bot results here are preliminary evidence, not a human playtest. The Level 18 matrix runs KC_SEEDS lane seeds (default 10; the S10C-A acceptance run used 20, `KC_SEEDS=20`). Level 19 has no lane split, so it is deterministic.
const L=n=>campaign.get(`campaign-${n}`),FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'],GATES=['red-tower-keep-north','red-tower-keep-south'];
const OASIS=[[9,11],[9,13],[10,10],[10,14],[8,12]],CANYON=[[14,12],[14,11],[14,13],[13,12]];
const SEEDS=Array.from({length:Math.max(1,+(process.env.KC_SEEDS||10))},(_,i)=>i+1);
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
const won=sim=>assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['victory','objectives-complete'],JSON.stringify(sim.missionStatus().objectives.map(o=>[o.id,o.progress])));
const between=(sim,lo,hi)=>assert.ok(sim.outcome.tick>=lo*HZ&&sim.outcome.tick<=hi*HZ,`${(sim.outcome.tick/HZ).toFixed(1)}s, expected ${lo}-${hi}s`);
const prog=(sim,id)=>sim.missionStatus().objectives.find(o=>o.id===id);
const waveCounts=(setup,n)=>Array.from({length:n},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===i+1).length);
const raiderCounts=(setup,n)=>Array.from({length:n},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===i+1&&e.archetype==='desert-raider').length);
const holdPhase=s=>s.missionStatus().activePhase==='hold';
// Counts spawn deferral: ticks in which the first due Crimson spawn is blocked by a live unit within 26 px of its slot (measured, not fixed here).
function deferral(sim){const o={ticks:0},adv=sim.advance.bind(sim);
 sim.advance=dt=>{adv(dt);const due=sim.spawnQueue.find(q=>q.team==='red'&&q.tick<=sim.clock.tick);if(due&&Object.values(sim.state.units).some(u=>u.hp>0&&Math.hypot(u.x-due.x,u.y-due.y)<26))o.ticks++;};return o;}
const guardianDeaths=log=>log.filter(e=>e.type==='death'&&e.id==='guardian').length;

// Level 18 policies (the Oasis bot of the S10C experiment): Keep-only siege route, front-line towers are defenders, not targets.
const keep18=(towers,gate)=>log=>({towers,cells:OASIS,targets:['red-base'],gate,leash:420,hold:{x:540,y:600},cast:{bash:true},log});
const raid18=leave=>s=>s.clock.tick<leave*HZ||(holdPhase(s)&&s.state.bases['red-base'].hp<=0);
function run18(seed,opts,max=16000){const sim=new Simulation('l18-'+seed,campaign.setup(18,seed)),log=[],d=deferral(sim);play(sim,max,opts(log));return {sim,log,d};}
const tally=(policy,max)=>{const rows=SEEDS.map(seed=>run18(seed,policy,max));return {rows,wins:rows.filter(r=>r.sim.outcome?.outcome==='victory'),n:SEEDS.length};};

test('Level 18 is The Twin Banks: Oasis, hold then siege, 8 seeded two-bank waves, an empty start, standing front line and a vulnerable inert Keep',()=>{
 const l=L(18);assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[18,2,'The Twin Banks','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l));
 assert.match(l.display.briefing,/Siege mission/);assert.match(l.display.briefing,/no Wood or Iron/);assert.match(l.display.briefing,/two Archer Towers/);assert.match(l.display.briefing,/destroy the Crimson Keep/i);assert.match(l.display.briefing,/front towers do/);assert.ok(l.display.briefing.length<=320,'the briefing body must fit three lines of the mission briefing (longer text overlaps PRIMARY OBJECTIVES)');assert.match(l.display.briefing,/50% health/);
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
  {id:'hold',objectives:[{id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},{id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]},
  {id:'siege',objectives:[{id:'crimson',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]});
 const o=l.match.overrides;assert.equal(o.battlefield,'oasis');assert.equal(o.crimsonKeepArmed,false);assert.equal(o.crimsonKeepInvulnerable,undefined,'the Keep must be vulnerable');assert.deepEqual(o.defenders,FRONT);assert.deepEqual(o.start,{wood:0,iron:0});
 assert.deepEqual([o.waves.firstWaveTick,o.waves.waveInterval,o.waves.alliedPerWave],[300,800,0]);assert.deepEqual(o.waves.enemyPerWave,[3,3,4,5,6,6,7,8]);assert.deepEqual(o.waves.raidersPerWave,[0,0,2,2,3,3,4,4]);
 assert.deepEqual(o.waves.lanes.map(x=>[x.wave,...x.south,x.commit]),[[3,1,2,true],[4,1,2,true],[5,2,3,true],[6,2,3,true],[7,3,4,true],[8,3,5,true]]);
 const setup=campaign.setup(18,5);assert.equal(setup.battlefield.id,'oasis');assert.equal(setup.shop,true);assert.deepEqual([setup.start.gold,setup.start.wood,setup.start.iron],[250,0,0]);
 assert.equal(setup.keepDefense.red,null,'inert: the Keep does not fight');assert.equal(setup.crimsonKeepInvulnerable,false);assert.deepEqual(setup.encounter.defenders.map(d=>d.id),FRONT);
 assert.deepEqual(waveCounts(setup,8),[3,3,4,5,6,6,7,8]);assert.deepEqual(raiderCounts(setup,8),[0,0,2,2,3,3,4,4]);assert.equal(setup.encounter.spawns.some(e=>e.team==='blue'),false,'no allied reinforcement');
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick).slice(0,3),[300,1100,1900]);
 const sim=new Simulation('l18-setup',setup),red=sim.state.bases['red-base'];assert.equal(sim.field.id,'oasis');assert.equal(red.hp,3000);assert.notEqual(red.invulnerable,true);assert.deepEqual([sim.state.wood,sim.state.iron],[0,0]);
 assert.ok(FRONT.every(id=>sim.state.structures[id]?.hp>0),'the front line stands');assert.ok(!GATES.some(id=>sim.state.structures[id]),'no gate towers on this level');
 assert.equal(l.mission.phases.flatMap(p=>p.objectives).some(x=>x.type==='destroy'&&x.targets.some(t=>FRONT.includes(t))),false,'the front towers are defenders, not objectives');
});
test('Level 18 lanes: waves 1-2 are unsplit, waves 3-8 take both banks by a seed, committed, and the seed reproduces the plan',()=>{
 const plan=setup=>JSON.stringify(setup.encounter.spawns.filter(e=>e.team==='red').map(e=>[e.id,e.lane??null,!!e.commit]));
 const a=campaign.setup(18,2024),b=campaign.setup(18,2024),c=campaign.setup(18,2025);assert.equal(plan(a),plan(b));assert.notEqual(plan(a),plan(c));assert.equal(a.laneSeed,2024);
 for(const n of [1,2])assert.ok(a.encounter.spawns.filter(e=>e.wave===n&&e.team==='red').every(e=>!e.lane&&!e.commit),`wave ${n} unsplit`);
 const bounds={3:[1,2],4:[1,2],5:[2,3],6:[2,3],7:[3,4],8:[3,5]};
 for(const seed of [1,2,3,4,5,6,7,8]){const s=campaign.setup(18,seed);for(const n of [3,4,5,6,7,8]){
  const red=s.encounter.spawns.filter(e=>e.wave===n&&e.team==='red'),south=red.filter(e=>e.lane==='south').length,north=red.filter(e=>e.lane==='north').length;
  assert.equal(south+north,red.length,`seed ${seed} wave ${n}: every unit takes a bank`);assert.ok(north>=1,`seed ${seed} wave ${n}: north bank is never empty`);assert.ok(south>=bounds[n][0]&&south<=bounds[n][1],`seed ${seed} wave ${n}: ${south} south`);assert.ok(red.every(e=>e.commit),`seed ${seed} wave ${n}: committed`);}}
});
test('Level 18 starts empty: no Wood or Iron, income buys the first tower after about 40 s, and nothing can be built at the start',()=>{
 const sim=new Simulation('l18-empty',campaign.setup(18,1));assert.deepEqual([sim.state.wood,sim.state.iron],[0,0]);
 assert.notEqual(sim.placementReason('tower',9,11),'');
 until(sim,41*HZ);assert.ok(sim.state.wood>=80&&sim.state.iron>=10,`${sim.state.wood} Wood, ${sim.state.iron} Iron at 41 s`);assert.equal(sim.placementReason('tower',9,11),'');
});
test('Level 18 phases open in order: the siege starts only after two towers and five waves, and the win is the Crimson Keep falling',()=>{
 const sim=new Simulation('l18-order',campaign.setup(18,1)),log=[];let siegeAt=null;const adv=sim.advance.bind(sim);
 sim.advance=dt=>{if(siegeAt===null&&sim.missionStatus().activePhase==='siege')siegeAt=sim.clock.tick;return adv(dt);};
 play(sim,16000,keep18(2,holdPhase)(log));won(sim);assert.deepEqual(sim.missionStatus().completedPhases,['hold','siege']);
 assert.ok(siegeAt!==null&&siegeAt>=3900,`siege opened at ${siegeAt}`);assert.equal(prog(sim,'waves').progress,5);assert.equal(prog(sim,'towers').progress,2);
 assert.equal(sim.state.bases['red-base'].hp<=0,true,'the Crimson Keep fell');assert.equal(log.filter(e=>e.type==='match-end').length,1);
});
test('Level 18: razing the Keep early does not end the match; it is credited only when the siege phase opens, so the empty start is what forces the hold',()=>{
 const sim=new Simulation('l18-early-keep',campaign.setup(18,1)),at=scripted(sim),log=[];at(10,()=>strike(sim,'guardian','red-base'));
 until(sim,600,log);assert.equal(sim.state.bases['red-base'].hp<=0,true);assert.equal(sim.ended,false,'no instant victory');assert.equal(sim.missionStatus().activePhase,'hold');assert.equal(prog(sim,'crimson').progress,0,'not credited during the hold');
 play(sim,16000,{towers:2,cells:OASIS,targets:[],cast:{bash:true},leash:420,hold:{x:540,y:600},log});
 won(sim);assert.deepEqual(sim.missionStatus().completedPhases,['hold','siege']);
});
test('Level 18 matrix: staying for the hold and never coming home wins in 3-4 minutes with two towers (Azure Keep stays safe) and replays identically',()=>{
 const {rows,wins,n}=tally(keep18(2,holdPhase));
 assert.ok(wins.length>=Math.ceil(.9*n),`${wins.length}/${n} won`);
 for(const r of wins){assert.deepEqual(r.sim.missionStatus().completedPhases,['hold','siege']);between(r.sim,180,240);assert.ok(r.sim.state.bases['blue-base'].hp>=2000,'Azure Keep stays above 2,000 at the end');}
 for(const r of rows){assert.ok(guardianDeaths(r.log)<=2,`${guardianDeaths(r.log)} Guardian deaths`);assert.ok(r.d.ticks<=5*HZ,`${r.d.ticks/HZ}s spawn deferral`);}
 const a=run18(1,keep18(2,holdPhase)),b=run18(1,keep18(2,holdPhase));assert.equal(finalHash(a.sim,a.log),finalHash(b.sim,b.log));
});
test('Level 18 matrix: coming home to defend usually fails the siege with two towers and mostly works with three',()=>{
 const two=tally(keep18(2,s=>holdPhase(s)||threatened(s,520))),three=tally(keep18(3,s=>holdPhase(s)||threatened(s,520)));
 assert.ok(two.wins.length<=Math.floor(.4*two.n),`2 towers, returning: ${two.wins.length}/${two.n}`);
 assert.ok(three.wins.length>=Math.ceil(.75*three.n),`3 towers, returning: ${three.wins.length}/${three.n}`);
 for(const r of [...two.rows,...three.rows]){assert.ok(guardianDeaths(r.log)<=2);assert.ok(r.d.ticks<=5*HZ,`${r.d.ticks/HZ}s spawn deferral`);}
});
test('Level 18 matrix: the early raids are closed (10 s and 30 s never win, 60 s rarely) and a parked Guardian loses before 90 s',()=>{
 for(const leave of [10,30])assert.equal(tally(keep18(2,raid18(leave))).wins.length,0,`raid at ${leave} s`);
 const sixty=tally(keep18(2,raid18(60)));assert.ok(sixty.wins.length<=Math.floor(.25*sixty.n),`raid at 60 s: ${sixty.wins.length}/${sixty.n}`);
 for(const seed of SEEDS.slice(0,3)){const {sim}=run18(seed,log=>({towers:2,cells:OASIS,park:true,log}),4000);assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['defeat','azure-keep-hp-threshold']);assert.ok(sim.outcome.tick<90*HZ,`parked lost at ${sim.outcome.tick/HZ}s`);}
});

// Level 19
const NORTH=['red-tower-front-north','red-tower-front-center','red-tower-keep-north','red-tower-keep-south'],SOUTH=['red-tower-front-south','red-tower-front-center','red-tower-keep-south','red-tower-keep-north'];
const route19=(targets,gate)=>log=>({towers:2,cells:CANYON,targets,gate,leash:650,hold:{x:620,y:600},cast:{bash:true},log});
const raid19=(leave,targets)=>s=>s.clock.tick<leave*HZ||(holdPhase(s)&&!targets.some(id=>s.state.structures[id]?.hp>0));
function run19(opts,max=16000){const sim=new Simulation('l19',campaign.setup(19,1)),log=[],d=deferral(sim);play(sim,max,opts(log));return {sim,log,d};}
const phaseOf=s=>s.missionStatus().activePhase;

test('Level 19 is The Sandstone Line: Canyon, hold then front line then gates, an empty start, five defending towers and an invulnerable Keep',()=>{
 const l=L(19);assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[19,2,'The Sandstone Line','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l));
 assert.match(l.display.briefing,/Assault mission/);assert.match(l.display.briefing,/no Gold, Wood or Iron/);assert.match(l.display.briefing,/two of the three front towers/);assert.match(l.display.briefing,/both gate towers/);assert.match(l.display.briefing,/cannot be damaged/);assert.match(l.display.briefing,/50% health/);assert.ok(l.display.briefing.length<=320,'the briefing body must fit three lines of the mission briefing');
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
  {id:'hold',objectives:[{id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},{id:'waves',type:'waves-defeated',count:6,display:{label:'Defeat 6 Crimson waves'}}]},
  {id:'line',objectives:[{id:'front',type:'destroy',targets:FRONT,count:2,display:{label:'Destroy 2 of 3 front towers'}}]},
  {id:'gates',objectives:[{id:'gatetowers',type:'destroy',targets:GATES,display:{label:'Destroy both gate towers'}}]}]});
 assert.equal(l.mission.phases.flatMap(p=>p.objectives).some(o=>/skill|guardian|level|rank/i.test(o.type)),false,'the redundant Guardian level objective is removed');
 const o=l.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.crimsonKeepInvulnerable],['canyon-pass',false,true]);assert.deepEqual(o.defenders,[...FRONT,...GATES]);assert.deepEqual(o.start,{gold:0,wood:0,iron:0});
 assert.deepEqual([o.waves.firstWaveTick,o.waves.waveInterval,o.waves.alliedPerWave],[300,750,0]);assert.deepEqual(o.waves.enemyPerWave,[3,4,4,5,5,6,6,7]);assert.deepEqual(o.waves.raidersPerWave,[0,0,2,2,3,3,4,4]);
 const setup=campaign.setup(19);assert.equal(setup.battlefield.id,'canyon-pass');assert.equal(setup.shop,true);assert.deepEqual([setup.start.gold,setup.start.wood,setup.start.iron],[0,0,0]);
 assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),[...FRONT,...GATES].sort());assert.equal(setup.keepDefense.red,null);assert.equal(setup.crimsonKeepInvulnerable,true);
 assert.deepEqual(waveCounts(setup,8),[3,4,4,5,5,6,6,7]);assert.deepEqual(raiderCounts(setup,8),[0,0,2,2,3,3,4,4]);assert.equal(setup.encounter.spawns.some(e=>e.team==='blue'),false);
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick).slice(0,3),[300,1050,1800]);assert.equal(setup.waveRules.lanes,undefined);assert.equal(setup.waveRules.flanks,undefined);
});
test('Level 19: the Crimson Keep is inert, visible and invulnerable, and nothing can target or damage it',()=>{
 const l=L(19),setup=campaign.setup(l.id,3),sim=new Simulation('l19-keep',setup),red=sim.state.bases['red-base'];
 assert.equal(red.invulnerable,true);assert.equal(red.hp,3000);assert.ok(!JSON.stringify(l.mission).includes('red-base'),'no objective names the Keep');
 const guardian=Object.assign({},sim.hero,{x:red.x-100,y:red.y});assert.equal(canAttackOn(sim.geo,guardian,red,sim.state.bases),false);
 sim.hit(sim.hero,red,1e6,'direct');assert.equal(red.hp,3000);
 for(let t=0;t<1200;t++){sim.send({type:'target',targetId:'red-base'});sim.send({type:'attack'});sim.advance(1000/30+.01);sim.drainEvents();}
 assert.equal(red.hp,3000);
});
test('Level 19 phases open in order and a hold-first Guardian wins in 220-300 s; replays identically',()=>{
 const policy=route19(NORTH,s=>holdPhase(s)||threatened(s,520)),seen=[];
 const run=()=>{const sim=new Simulation('l19-bot',campaign.setup(19)),log=[],d=deferral(sim),adv=sim.advance.bind(sim);
  sim.advance=dt=>{const p=phaseOf(sim);if(seen.at(-1)!==p&&!sim.ended)seen.push(p);return adv(dt);};play(sim,16000,policy(log));return {sim,log,d};};
 const {sim,log,d}=run();won(sim);between(sim,220,300);assert.deepEqual(sim.missionStatus().completedPhases,['hold','line','gates']);assert.deepEqual(seen,['hold','line','gates']);
 assert.equal(sim.state.bases['red-base'].hp,3000,'the Keep is never damaged');assert.equal(sim.state.bases['blue-base'].hp,3000);assert.ok(d.ticks<=5*HZ,`${d.ticks/HZ}s spawn deferral`);
 assert.ok([prog(sim,'front').progress,prog(sim,'gatetowers').progress].join()==='2,2');
 const again=run();assert.equal(finalHash(again.sim,again.log),finalHash(sim,log));
});
test('Level 19: all four tested routes win hold-first in 215-300 s without ever damaging the Crimson Keep',()=>{
 for(const [name,targets] of Object.entries({north:NORTH,south:SOUTH,flanks:['red-tower-front-north','red-tower-front-south',...GATES],sides:['red-tower-front-north','red-tower-keep-north','red-tower-front-center','red-tower-keep-south']})){
  const {sim}=run19(route19(targets,holdPhase));won(sim);between(sim,215,300);assert.equal(sim.state.bases['red-base'].hp,3000,name);
 }
});
test('Level 19: raids at 10 s and 30 s and a parked Guardian lose',()=>{
 for(const leave of [10,30]){const {sim}=run19(route19(NORTH,raid19(leave,NORTH)),9000);assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['defeat','azure-keep-hp-threshold'],`raid at ${leave} s`);}
 const {sim}=run19(log=>({towers:2,cells:CANYON,park:true,log}),9000);assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['defeat','azure-keep-hp-threshold']);assert.ok(sim.outcome.tick<90*HZ);
});
test('Level 19: leaving at 60 s is faster than holding first and costs one more Guardian death; a later leave is a finding, not asserted as costly',()=>{
 const base=run19(route19(NORTH,s=>holdPhase(s)||threatened(s,520))),early=run19(route19(NORTH,raid19(60,NORTH)));won(base.sim);won(early.sim);
 assert.ok(early.sim.outcome.tick<base.sim.outcome.tick,`${early.sim.outcome.tick/HZ}s against ${base.sim.outcome.tick/HZ}s`);
 assert.ok(guardianDeaths(early.log)>guardianDeaths(base.log),`${guardianDeaths(early.log)} deaths against ${guardianDeaths(base.log)}`);
 // Measured in the S10C-A acceptance run (north route, one run each): leaving at 70-150 s wins in 159-221 s with the same two Guardian deaths as holding first, so the extra death is a 50-60 s effect only.
 const late=run19(route19(NORTH,raid19(90,NORTH)));won(late.sim);assert.ok(late.sim.outcome.tick<base.sim.outcome.tick);
});

// Registration, unlock sequence and chapter view
test('Levels 18 and 19 unlock in sequence after Level 17, Chapter 2 shows nine released missions with Level 20 pending, and campaign-20 is unregistered',()=>{
 for(const n of [18,19]){assert.equal(campaign.has(`campaign-${n}`),true);assert.equal(store(n-2).isUnlocked(L(n)),false);assert.equal(store(n-1).isUnlocked(L(n)),true);assert.equal(store(n-1).progress.next.id,`campaign-${n}`);}
 const views=n=>chapterViews(campaignChapters,campaign.list(),store(n).progress)[1];
 assert.equal(views(10).released,9);assert.deepEqual(views(17).missions.map(m=>m.state),[...Array(7).fill('completed'),'available','locked','pending']);
 assert.deepEqual(views(19).missions.map(m=>m.state),[...Array(9).fill('completed'),'pending']);assert.equal(views(19).complete,false,'Level 20 is not registered, so the chapter is not complete');
 assert.match(campaignChapters[1].narrative,/first nine missions are released/);assert.equal(campaign.has('campaign-20'),false);
 const w=store(18).recordVictory(L(19));assert.deepEqual([w.recorded,w.firstClear,w.upToDate],[true,true,true],'the registered campaign is up to date after Level 19');
 assert.equal(store(16).recordVictory(L(18)).recorded,false,'Level 18 cannot be recorded before Level 17');
});
test('Levels 1 to 17 and Full Battle are unchanged by S10C-A',()=>{
 for(const l of campaign.list().filter(l=>l.number<=17))assert.equal(Object.isFrozen(l),true);
 assert.equal(campaign.get('full-battle').mission,null);assert.deepEqual(campaign.get('campaign-17').match.overrides.waves.enemyPerWave,[4,4,5,5,6,6,7,7,8,8]);
 assert.deepEqual(campaign.get('campaign-16').mission.phases[1].objectives[0].targets,FRONT);assert.equal(campaign.get('campaign-16').match.overrides.start,undefined);
});

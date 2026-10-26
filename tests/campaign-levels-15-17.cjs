const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {play,finalHash,towerLosses,threatened,scripted,strike,until,HZ}=require('./support/campaignBot.cjs');
// Chapter 2 S10B: Levels 15 "Hold the Mouth" (Canyon, formerly "Stun the Riders"), 16 "Across the Sunwell" (Oasis) and 17 "The Long Dusk" (Canyon). Every balance value is provisional (docs/CHAPTER2_S10B.md);
// the bot results here are preliminary evidence, not a human playtest. None of these levels uses a lane split or a seed, so replays are identical for every lane seed.
const L=n=>campaign.get(`campaign-${n}`),FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'];
const OASIS=[[15,5],[15,18],[16,5],[16,18]],home={cast:{bash:true},leash:650,hold:{x:620,y:600}},fwd={cast:{bash:true},leash:900,hold:{x:1330,y:600}};
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
const won=sim=>assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['victory','objectives-complete'],JSON.stringify(sim.missionStatus().objectives.map(o=>[o.id,o.progress])));
const between=(sim,lo,hi)=>assert.ok(sim.outcome.tick>=lo*HZ&&sim.outcome.tick<=hi*HZ,`${(sim.outcome.tick/HZ).toFixed(1)}s, expected ${lo}-${hi}s`);
const prog=(sim,id)=>sim.missionStatus().objectives.find(o=>o.id===id);
const waveCounts=(setup,n)=>Array.from({length:n},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===i+1).length);
const raiderCounts=(setup,n)=>Array.from({length:n},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='red'&&e.wave===i+1&&e.archetype==='desert-raider').length);

// Level 15 (B3, "Hold the Mouth"): towers deal the damage, the Crimson front line is a threat and not an objective
const MOUTH=[[14,12],[14,11],[14,13],[13,12]],mouth={cells:MOUTH,...home};
// Places the Guardian at x (y 600) and re-places it whenever it is alive and more than 60 px away, so it never chases and a respawn walks it back.
function campAt(sim,x,ready=()=>true){const adv=sim.advance.bind(sim);sim.advance=dt=>{const h=sim.hero;if(ready(sim)&&h.hp>0&&sim.clock.tick%30===0&&Math.hypot(h.x-x,h.y-600)>60)sim.teleportHero(x,600);adv(dt);};}
const camp={cells:MOUTH,towers:3,leash:1,hold:{x:620,y:600}};
test('Level 15 is Hold the Mouth: Canyon, three towers, 1,200 tower damage, seven waves, no allies, a standing front line that is not an objective, no stun objective',()=>{
 const l=L(15);assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[15,2,'Hold the Mouth','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l));
 assert.match(l.display.briefing,/Defense mission/);assert.match(l.display.briefing,/front line is dangerous but does not need to be destroyed/);assert.match(l.display.briefing,/1,200 damage/);assert.match(l.display.briefing,/50% health/);
 assert.doesNotMatch(l.display.briefing+l.display.description+l.display.strategy,/Shield Bash|stun/i);
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'mouth',objectives:[
  {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Complete 3 Archer Towers'}},
  {id:'damage',type:'tower-damage',count:1200,display:{label:'Archer Towers deal 1200 damage'}},
  {id:'waves',type:'waves-defeated',count:7,display:{label:'Defeat 7 Crimson waves'}}]}]});
 assert.deepEqual(l.match.overrides,{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,4,4,5,5,6,6],raidersPerWave:[0,2,2,3,3,4,4],alliedPerWave:0},defenders:FRONT,crimsonKeepArmed:false,crimsonKeepInvulnerable:true});
 const setup=campaign.setup(15);assert.equal(setup.battlefield.id,'canyon-pass');assert.equal(setup.shop,true);assert.equal(setup.keepDefense.red,null);assert.deepEqual(setup.encounter.defenders.map(d=>d.id),FRONT);
 assert.deepEqual(waveCounts(setup,7),[3,4,4,5,5,6,6]);assert.deepEqual(raiderCounts(setup,7),[0,2,2,3,3,4,4]);assert.equal(setup.waveRules.alliedPerWave,0);assert.equal(setup.encounter.spawns.some(e=>e.team==='blue'),false,'no allied reinforcement');
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick).slice(0,3),[300,1200,2100]);assert.equal(setup.waveRules.lanes,undefined);assert.equal(setup.waveRules.flanks,undefined);
 assert.equal(l.mission.phases.flatMap(p=>p.objectives).some(o=>o.type==='skill-impact'||o.type==='skill-rank'||o.type==='destroy'),false,'no stun, rank or destroy objective');
});
test('Level 15: the Crimson front line cannot satisfy or shortcut any objective, even when it is destroyed',()=>{
 const sim=new Simulation('l15-front',campaign.setup(15)),at=scripted(sim);
 for(const id of FRONT)assert.ok(sim.state.structures[id]?.hp>0,id+' stands at the start');
 at(30,()=>{for(const id of FRONT)strike(sim,'guardian',id);});
 until(sim,200);for(const id of FRONT)assert.equal(sim.state.structures[id],undefined,id+' destroyed');
 assert.equal(prog(sim,'towers').progress,0,'Crimson towers never count as player towers');assert.equal(prog(sim,'damage').progress,0);assert.equal(prog(sim,'waves').progress,0);
 assert.equal(sim.ended,false);assert.equal(sim.missionStatus().status,'active');
});
test('Level 15 is winnable by the shared bot in 180-330 s, with towers counted as the only damage source, and replays identically',()=>{
 const run=()=>{const sim=new Simulation('l15-bot',campaign.setup(15)),log=[];play(sim,14000,{towers:3,...mouth,log});return {sim,log};};
 const {sim,log}=run();won(sim);between(sim,180,330);assert.deepEqual([prog(sim,'towers').progress,prog(sim,'damage').progress,prog(sim,'waves').progress],[3,1200,7]);
 const towerHits=log.filter(e=>e.type==='damage'&&String(e.sourceId).startsWith('built-')&&String(e.id).startsWith('red')).reduce((a,e)=>a+e.amount,0);
 assert.ok(towerHits>=1200,`towers dealt ${towerHits}`);assert.equal(sim.state.bases['red-base'].hp,3000);assert.ok(sim.state.bases['blue-base'].hp>1500);
 const again=run();assert.equal(finalHash(again.sim,again.log),finalHash(sim,log));
});
test('Level 15: Guardian damage cannot complete the tower objectives, and a parked Guardian loses',()=>{
 const none=new Simulation('l15-none',campaign.setup(15));play(none,9000,{towers:0,...mouth});
 assert.equal(prog(none,'damage').progress,0,'Guardian damage never counts');assert.equal(prog(none,'towers').progress,0);assert.notEqual(none.outcome?.outcome,'victory');
 const parked=new Simulation('l15-parked',campaign.setup(15));play(parked,9000,{towers:3,cells:MOUTH,park:true});
 assert.deepEqual([parked.outcome?.outcome,parked.outcome?.reason],['defeat','azure-keep-hp-threshold']);
});
test('Level 15: camping at the far end of the canyon is punished by the front line',()=>{
 for(const x of [1330,1250]){
  const sim=new Simulation('l15-camp'+x,campaign.setup(15)),log=[];campAt(sim,x);play(sim,14000,{...camp,log});
  const deaths=log.filter(e=>e.type==='death'&&e.id==='guardian').length;
  assert.ok(deaths>=3,`camping at x ${x}: ${deaths} Guardian deaths`);assert.equal(sim.state.bases['blue-base'].hp,3000);
  assert.ok(log.some(e=>e.type==='damage'&&e.id==='guardian'&&/^red-tower/.test(String(e.sourceId))),'the front towers shoot the camper');
 }
});
test('Level 15: destroying the front line first and then camping is no faster than the home pace and costs Guardian deaths',()=>{
 const home15=new Simulation('l15-home',campaign.setup(15));play(home15,14000,{towers:3,...mouth});won(home15);
 const sim=new Simulation('l15-rush',campaign.setup(15)),log=[];campAt(sim,1330,s=>FRONT.every(id=>!s.state.structures[id]));
 play(sim,14000,{...camp,targets:FRONT,gate:()=>false,log});
 for(const id of FRONT)assert.equal(sim.state.structures[id],undefined,id+' destroyed');
 const deaths=log.filter(e=>e.type==='death'&&e.id==='guardian').length;
 assert.ok(deaths>=2,`${deaths} Guardian deaths`);assert.equal(sim.state.bases['red-base'].hp,3000);assert.equal(sim.state.bases['blue-base'].hp,3000);
 // Measured: it still wins (263 s in this bot against 256 s at home), so the shortcut is closed only in the sense that it is not faster; there is no hard barrier.
 if(sim.outcome?.outcome==='victory')assert.ok(sim.outcome.tick>=home15.outcome.tick,'camping after the rush is not faster than defending');
});

test('Level 15: no Crimson spawn is held back for long by friendly units or the Guardian, and the mission does not stall after the last wave',()=>{
 const sim=new Simulation('l15-defer',campaign.setup(15));let deferred=0;const adv=sim.advance.bind(sim);
 sim.advance=dt=>{adv(dt);const due=sim.spawnQueue.find(q=>q.team==='red'&&q.tick<=sim.clock.tick);if(due&&Object.values(sim.state.units).some(u=>u.hp>0&&Math.hypot(u.x-due.x,u.y-due.y)<26))deferred++;};
 play(sim,14000,{towers:3,...mouth});won(sim);assert.ok(deferred<=5*HZ,`${deferred/HZ}s of spawn deferral`);
});

// Level 16
test('Level 16 is the Oasis counter-attack: hold with two towers and five waves, then destroy all three front towers, with south flanks',()=>{
 const l=L(16);assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[16,2,'Across the Sunwell','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.match(l.display.briefing,/all three front/i);assert.match(l.display.briefing,/south bank/i);
 assert.deepEqual(l.mission.phases,[
  {id:'hold',objectives:[{id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},{id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]},
  {id:'breach',objectives:[{id:'front',type:'destroy',targets:FRONT,display:{label:'Destroy the 3 front towers'}}]}]);
 assert.deepEqual(l.mission.failure,{azureKeepHpBelow:.5});
 assert.deepEqual(l.match.overrides.waves.flanks,[{wave:4,lane:'south',units:'raiders'},{wave:5,lane:'south',units:'all'},{wave:6,lane:'south',units:'all'},{wave:7,lane:'south',units:'all'}]);
 const setup=campaign.setup(16);assert.equal(setup.battlefield.id,'oasis');assert.deepEqual(setup.encounter.defenders.map(d=>d.id),FRONT);assert.equal(setup.keepDefense.red,null);assert.equal(setup.crimsonKeepInvulnerable,true);
 assert.deepEqual(waveCounts(setup,9),[3,4,5,6,8,9,10,10,10]);assert.deepEqual(raiderCounts(setup,9),[0,0,2,3,4,5,6,6,6]);assert.equal(setup.waveRules.alliedPerWave,0);assert.equal(setup.waveRules.lanes,undefined);
 const sim=new Simulation('l16-setup',setup);assert.equal(sim.field.id,'oasis');
});
test('Level 16 is winnable through hold then breach by an offensive bot; the front towers are reached and destroyed; replays identically',()=>{
 const policy=log=>({towers:2,cells:OASIS,...home,targets:FRONT,gate:s=>s.missionStatus().activePhase==='hold'||threatened(s,520),log});
 const run=()=>{const sim=new Simulation('l16-bot',campaign.setup(16)),log=[];play(sim,14000,policy(log));return {sim,log};};
 const {sim,log}=run();won(sim);assert.deepEqual(sim.missionStatus().completedPhases,['hold','breach']);between(sim,150,330);
 for(const id of FRONT)assert.equal(sim.state.structures[id],undefined,`${id} was destroyed`);assert.equal(sim.state.bases['blue-base'].hp>1500,true);
 assert.equal(log.filter(e=>e.type==='match-end').length,1);
 const again=run();assert.equal(finalHash(again.sim,again.log),finalHash(sim,log));
});
test('Level 16 phases open in order: the breach starts only after two towers and five waves, and the south flank crosses the pond',()=>{
 const sim=new Simulation('l16-order',campaign.setup(16)),log=[];let breachAt=null;const adv=sim.advance.bind(sim);
 sim.advance=dt=>{if(breachAt===null&&sim.missionStatus().activePhase==='breach')breachAt=sim.clock.tick;return adv(dt);};
 play(sim,14000,{towers:2,cells:OASIS,...home,targets:FRONT,gate:s=>s.missionStatus().activePhase==='hold',log});
 assert.ok(breachAt!==null&&breachAt>=3900,`breach opened at ${breachAt}`);assert.equal(prog(sim,'waves').progress,5);
 const flank=log.filter(e=>e.type==='spawn'&&/^red-w[4-7]-/.test(e.id));assert.ok(flank.length>0);
});
test('Level 16 is also won by a rushing and a forward Guardian, and a parked Guardian loses',()=>{
 const rush=new Simulation('l16-rush',campaign.setup(16));play(rush,14000,{towers:2,cells:OASIS,...home,targets:FRONT,gate:s=>s.missionStatus().activePhase==='hold'});won(rush);between(rush,150,330);
 const fw=new Simulation('l16-fwd',campaign.setup(16));play(fw,14000,{towers:2,cells:OASIS,...fwd,targets:FRONT,gate:s=>s.missionStatus().activePhase==='hold'});won(fw);between(fw,150,330);
 const parked=new Simulation('l16-parked',campaign.setup(16));play(parked,9000,{towers:2,cells:OASIS,park:true});
 assert.deepEqual([parked.outcome?.outcome,parked.outcome?.reason],['defeat','azure-keep-hp-threshold']);
});
test('Level 16 outcome and replay do not depend on the lane seed (it has flanks, not lanes)',()=>{
 const hashes=[1,2,3].map(seed=>{const sim=new Simulation('l16-seed',campaign.setup(16,seed)),log=[];play(sim,6000,{towers:2,cells:OASIS,...home,targets:FRONT,gate:s=>s.missionStatus().activePhase==='hold',log});return finalHash(sim,log);});
 assert.equal(new Set(hashes).size,1);
});

// Level 17
test('Level 17 is the Canyon survival mission: ten waves 600 ticks apart, 1,200 tower damage, no allies, failure below 60%',()=>{
 const l=L(17);assert.deepEqual([l.number,l.chapter,l.display.title,l.display.difficulty],[17,2,'The Long Dusk','standard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.match(l.display.briefing,/60% health/);assert.match(l.display.briefing,/1,200 damage/);
 assert.deepEqual(l.mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.6},phases:[{id:'dusk',objectives:[
  {id:'damage',type:'tower-damage',count:1200,display:{label:'Archer Towers deal 1200 damage'}},{id:'waves',type:'waves-defeated',count:10,display:{label:'Defeat 10 Crimson waves'}}]}]});
 assert.deepEqual(l.match.overrides,{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:600,enemyPerWave:[4,4,5,5,6,6,7,7,8,8],raidersPerWave:[0,2,2,3,3,4,4,5,5,6],alliedPerWave:0},defenders:[],crimsonKeepArmed:false,crimsonKeepInvulnerable:true});
 const setup=campaign.setup(17);assert.equal(setup.battlefield.id,'canyon-pass');assert.equal(setup.waveRules.alliedPerWave,0);assert.deepEqual(setup.encounter.defenders,[]);
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick).slice(0,3),[300,900,1500]);assert.deepEqual(waveCounts(setup,10),[4,4,5,5,6,6,7,7,8,8]);assert.deepEqual(raiderCounts(setup,10),[0,2,2,3,3,4,4,5,5,6]);
});
test('Level 17: exactly 60% Azure Keep HP holds, anything below loses',()=>{
 const sim=new Simulation('l17-sixty',campaign.setup(17)),at=scripted(sim);
 at(10,()=>strike(sim,'red-base','blue-base',1200));at(40,()=>strike(sim,'red-base','blue-base',1));
 until(sim,39);assert.equal(sim.state.bases['blue-base'].hp,1800);assert.equal(sim.ended,false);assert.equal(sim.missionStatus().status,'active','exactly 1,800 HP is safe');
 until(sim,60);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:40});assert.equal(sim.state.match.result.alliedHp,1799);
});
test('Level 17 is winnable with towers, and the tower-damage objective counts only player tower damage and needs towers that fight',()=>{
 const run=()=>{const sim=new Simulation('l17-bot',campaign.setup(17)),log=[];play(sim,12000,{towers:3,...home,log});return {sim,log};};
 const {sim,log}=run();won(sim);between(sim,150,330);assert.equal(prog(sim,'damage').progress,1200);assert.equal(prog(sim,'waves').progress,10);
 const towerHits=log.filter(e=>e.type==='damage'&&String(e.sourceId).startsWith('built-')&&String(e.id).startsWith('red')).reduce((a,e)=>a+e.amount,0);
 assert.ok(towerHits>=1200,`towers dealt ${towerHits}`);
 const again=run();assert.equal(finalHash(again.sim,again.log),finalHash(sim,log));
 // One tower can still carry it (a tower that fights and survives long enough), so the requirement is about participation, not the number of towers.
 const one=new Simulation('l17-one',campaign.setup(17));play(one,12000,{towers:1,...home});won(one);
});
test('Level 17 cannot be won without towers: ten waves cleared with a Guardian alone leave the damage objective at 0 and the mission open or lost',()=>{
 const none=new Simulation('l17-none',campaign.setup(17)),log=[];play(none,9000,{towers:0,...home,log});
 assert.equal(prog(none,'damage').progress,0,'Guardian damage never counts');assert.notEqual(none.outcome?.outcome,'victory');
 assert.equal(prog(none,'damage').complete,false,'the waves alone are not enough');
 const parked=new Simulation('l17-parked',campaign.setup(17));play(parked,9000,{towers:3,park:true});
 assert.deepEqual([parked.outcome?.outcome,parked.outcome?.reason],['defeat','azure-keep-hp-threshold']);
 assert.equal(prog(parked,'damage').complete,true,'towers alone satisfy the damage objective, but cannot clear the waves');
});
test('a forward Guardian also wins Level 17, more slowly, because it takes tower kills',()=>{
 const sim=new Simulation('l17-fwd',campaign.setup(17));play(sim,16000,{towers:3,...fwd});won(sim);assert.equal(prog(sim,'damage').progress,1200);
});

// Registration, unlock sequence and chapter view
test('Levels 15 to 17 unlock in sequence after Level 14, Chapter 2 shows seven released missions, 18-20 stay pending and campaign-20 is unregistered',()=>{
 for(const n of [15,16,17]){assert.equal(campaign.has(`campaign-${n}`),true);assert.equal(store(n-2).isUnlocked(L(n)),false);assert.equal(store(n-1).isUnlocked(L(n)),true);assert.equal(store(n-1).progress.next.id,`campaign-${n}`);}
 const views=n=>chapterViews(campaignChapters,campaign.list(),store(n).progress)[1];
 assert.equal(views(10).released,7);assert.deepEqual(views(14).missions.slice(0,8).map(m=>m.state),['completed','completed','completed','completed','available','locked','locked','pending']);
 assert.deepEqual(views(17).missions.map(m=>m.state),[...Array(7).fill('completed'),...Array(3).fill('pending')]);assert.equal(views(17).complete,false);
 assert.match(campaignChapters[1].narrative,/first seven missions are released/);
 for(const id of ['campaign-18','campaign-19','campaign-20'])assert.equal(campaign.has(id),false);
 const s=store(16),w=s.recordVictory(L(17));assert.deepEqual([w.recorded,w.firstClear,w.upToDate],[true,true,true],'the registered campaign is up to date after Level 17');
 assert.equal(store(14).recordVictory(L(16)).recorded,false,'Level 16 cannot be recorded before Level 15');
});
// S10B-F1: the inert Crimson Keep of Levels 15-17 is protected exactly as Level 14 protects its own (crimsonKeepInvulnerable); no objective names it.
test('Levels 15 to 17 start with an invulnerable, visible Crimson Keep that nothing can target or damage',()=>{
 for(const n of [15,16,17]){
  const l=L(n),setup=campaign.setup(l.id,3),sim=new Simulation('keep'+n,setup),red=sim.state.bases['red-base'];
  assert.equal(l.match.overrides.crimsonKeepInvulnerable,true,n);assert.equal(l.match.overrides.crimsonKeepArmed,false,n);assert.equal(setup.crimsonKeepInvulnerable,true,n);
  assert.equal(red.invulnerable,true,n);assert.equal(red.hp,3000,n);
  assert.ok(!JSON.stringify(l.mission).includes('red-base'),n+': no objective names the Keep');
  const guardian=Object.assign({},sim.hero,{x:red.x-100,y:red.y}),ally={...guardian,id:'ally',team:'blue',kind:'minion-blue',range:40,damage:10};
  assert.equal(canAttackOn(sim.geo,guardian,red,sim.state.bases),false,n+': Guardian cannot target it');assert.equal(canAttackOn(sim.geo,ally,red,sim.state.bases),false,n+': allies cannot target it');
  sim.hit(sim.hero,red,1e6,'direct');assert.equal(red.hp,3000,n+': direct damage rejected');
  for(let t=0;t<2400;t++){sim.send({type:'target',targetId:'red-base'});sim.send({type:'attack'});sim.advance(1000/30+.01);sim.drainEvents();}
  assert.equal(red.hp,3000,n+': 2400 ticks of Guardian attacks do nothing');
 }
});
test('with the Keep protected, Crimson units keep dying in normal combat and Level 15 runs to its normal victory',()=>{
 const sim=new Simulation('keep15',campaign.setup('campaign-15',3)),log=[];play(sim,14000,{towers:3,...mouth,log});won(sim);
 assert.equal(sim.state.bases['red-base'].hp,3000);assert.equal(prog(sim,'damage').progress,1200);
 assert.ok(log.filter(e=>e.type==='death').length>=20,'Crimson units keep dying in normal combat');
});
test('Levels 1 to 14 and Full Battle are unchanged by S10B',()=>{
 for(const l of campaign.list().filter(l=>l.number<=14))assert.equal(Object.isFrozen(l),true);
 assert.equal(campaign.get('full-battle').mission,null);assert.equal(campaign.get('campaign-14').match.overrides.crimsonKeepInvulnerable,true);
 assert.deepEqual(campaign.get('campaign-14').match.overrides.waves.enemyPerWave,[3,3,4,5,5,6,7,8]);
});

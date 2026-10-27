const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {extendedWaveRules,extendedWaveSpawns,extendedEncounter,raidersInWave}=require('../.test-build/data/encounters.js');
const {minionStats,desertRaider,minionStatsOf}=require('../.test-build/data/combat.js');
const {enemyXpOf}=require('../.test-build/data/progression.js');
const {validateMission}=require('../.test-build/data/mission.js');
const {desertRaiderPixels,desertRaiderScale}=require('../.test-build/world/desertRaiderAppearance.js');
// Chapter 2 S3: Desert Raider archetype. Every Raider number is provisional; the assertions read them from the data table where they
// are not the point of the test. Chapter 1 output itself is protected by golden-simulation.cjs.
const DT=1000/30+.01;
const rules=o=>({...extendedWaveRules(),...o});
const wave=(spawns,n)=>spawns.filter(e=>e.team==='red'&&e.wave===n);
const raiders=list=>list.filter(e=>e.archetype==='desert-raider');
const unitsAfter=(setup,ticks)=>{const sim=new Simulation('raider',setup);for(let i=0;i<ticks;i++)sim.advance(DT);return sim;};
const mission=(objectives,extra={})=>({waveMode:'scripted',phases:[{id:'p',objectives}],...extra});

test('provisional Desert Raider stats keep Crimson armor, range, timing and collision radius',()=>{
 const r=desertRaider.stats;
 assert.equal(r.maxHp,130);assert.equal(r.speed,150);assert.equal(r.damage,14);assert.equal(desertRaider.xp,40);assert.equal(desertRaider.visualRadius,11);
 for(const k of ['armor','range','cooldownTicks','windupTicks','radius'])assert.equal(r[k],minionStats[k],k);
 assert.equal(r.radius,12,'collision radius is not changed, so there is no second navigation grid');
 assert.equal(minionStatsOf(),minionStats);assert.equal(minionStatsOf('desert-raider'),desertRaider.stats);
});

test('with no Raider configuration no spawn carries an archetype key and wave sizes are unchanged',()=>{
 const base=extendedWaveRules();
 for(const config of [undefined,[],[0,0,0]]){
  const r=rules({raidersPerWave:config});
  for(let n=1;n<=16;n++){
   const list=extendedWaveSpawns(n,r),plain=extendedWaveSpawns(n,{...base,raidersPerWave:undefined});
   assert.deepEqual(list,plain,`wave ${n}`);
   for(const e of list)assert.equal(Object.hasOwn(e,'archetype'),false,e.id);
  }
 }
});

test('Raiders are included in the wave total, occupy the last indices and keep the red-w{n}-{i} ids',()=>{
 const r=rules({enemyPerWave:[3,3,4,5],raidersPerWave:[0,0,2]});
 const sizes=[1,2,3,4].map(n=>wave(extendedWaveSpawns(n,r),n).length);
 assert.deepEqual(sizes,[3,3,4,5],'wave size never grows');
 assert.equal(raiders(wave(extendedWaveSpawns(1,r),1)).length,0);assert.equal(raiders(wave(extendedWaveSpawns(2,r),2)).length,0);
 const w3=wave(extendedWaveSpawns(3,r),3);
 assert.deepEqual(w3.map(e=>e.id),['red-w3-0','red-w3-1','red-w3-2','red-w3-3']);
 assert.deepEqual(w3.map(e=>e.archetype),[undefined,undefined,'desert-raider','desert-raider']);
 assert.deepEqual(wave(extendedWaveSpawns(4,r),4).map(e=>e.archetype),[undefined,undefined,undefined,'desert-raider','desert-raider'],'the last value repeats');
});

test('the last configured value repeats past the list and is clamped to the wave size',()=>{
 const r=rules({enemyPerWave:[3,3,4],raidersPerWave:[0,0,2]});
 assert.equal(raidersInWave(r,3,4),2);assert.equal(raidersInWave(r,9,4),2);assert.equal(raidersInWave(r,9,1),1,'clamped to a smaller wave');
 assert.equal(raidersInWave(rules({raidersPerWave:[5]}),1,3),3);
 assert.equal(raidersInWave(rules({raidersPerWave:[]}),1,3),0);assert.equal(raidersInWave(rules({raidersPerWave:undefined}),1,3),0);
 const late=wave(extendedWaveSpawns(14,rules({raidersPerWave:[1]})),14);
 assert.equal(raiders(late).length,1);assert.equal(late.length,wave(extendedWaveSpawns(14,rules({})),14).length);
});

test('a match builds Raider units from their spawn entries and Crimson units without the archetype key',()=>{
 const setup=matchSetup('extended',{waves:{firstWaveTick:1,enemyPerWave:[3],raidersPerWave:[1],alliedPerWave:0},defenders:[],crimsonKeepArmed:false});
 const sim=unitsAfter(setup,200),red=Object.values(sim.state.units).filter(u=>u.team==='red');
 assert.equal(red.length,3);
 const raider=sim.state.units['red-w1-2'],crimson=sim.state.units['red-w1-0'];
 assert.equal(raider.kind,'minion-red');assert.equal(raider.archetype,'desert-raider');
 for(const k of ['maxHp','speed','damage','armor','range','radius','cooldownTicks','windupTicks'])assert.equal(raider[k],desertRaider.stats[k],k);
 assert.equal(Object.hasOwn(crimson,'archetype'),false);
 for(const k of Object.keys(minionStats))assert.equal(crimson[k],minionStats[k],k);
});

test('XP is archetype-aware and gold stays wave-based',()=>{
 assert.equal(enemyXpOf({kind:'minion-red'}),60);assert.equal(enemyXpOf({kind:'minion-red',archetype:'desert-raider'}),40);assert.equal(enemyXpOf({kind:'minion-blue'}),60);
 const setup=matchSetup('extended',{waves:{firstWaveTick:1,enemyPerWave:[3],raidersPerWave:[1],alliedPerWave:0},defenders:[],crimsonKeepArmed:false});
 const sim=unitsAfter(setup,200);
 // Read the xp event, not the XP counter, which resets on a level-up.
 const kill=id=>{const u=sim.state.units[id],gold=sim.state.gold;sim.drainEvents();sim.hit(sim.hero,u,99999);return {xp:sim.drainEvents().filter(e=>e.type==='xp').reduce((n,e)=>n+e.amount,0),gold:sim.state.gold-gold};};
 assert.deepEqual(kill('red-w1-2'),{xp:40,gold:25},'Raider: 40 XP, unchanged 25 Gold');
 assert.deepEqual(kill('red-w1-0'),{xp:60,gold:25},'Crimson: 60 XP, 25 Gold');
});

test('mission validation totals HP and XP from the actual spawn composition',()=>{
 const damage=n=>mission([{id:'d',type:'tower-damage',count:n,display:{label:'x'}}]);
 const opts=raidersPerWave=>({waves:{enemyPerWave:[3],...(raidersPerWave&&{raidersPerWave}),alliedPerWave:0},defenders:[],crimsonKeepArmed:false});
 // All Crimson: 3 x 240 = 720 HP. With two Raiders: 240 + 2 x 130 = 500 HP.
 assert.doesNotThrow(()=>matchSetup('extended',{...opts(),mission:damage(720)}));
 assert.doesNotThrow(()=>matchSetup('extended',{...opts([2]),mission:damage(500)}));
 assert.throws(()=>matchSetup('extended',{...opts([2]),mission:damage(501)}),/only 500 HP/);
 // Level 3 needs 185 XP: 4 Crimson give 240, 4 Raiders only 160.
 const level=mission([{id:'l',type:'guardian-level',level:3,display:{label:'x'}}]);
 assert.doesNotThrow(()=>matchSetup('extended',{waves:{enemyPerWave:[4],alliedPerWave:0},defenders:[],crimsonKeepArmed:false,mission:level}));
 assert.throws(()=>matchSetup('extended',{waves:{enemyPerWave:[4],raidersPerWave:[4],alliedPerWave:0},defenders:[],crimsonKeepArmed:false,mission:level}),/level 3 but at most 2/);
 // A context without the new totals keeps the all-Crimson bounds.
 const ctx={defenders:[],finite:true,scriptedWaves:1,crimsonSpawns:3,extended:true};
 assert.doesNotThrow(()=>validateMission(damage(720),ctx));assert.throws(()=>validateMission(damage(721),ctx),/only 720 HP/);
});

test('invalid Raider counts are rejected',()=>{
 const bad=raidersPerWave=>()=>matchSetup('extended',{waves:{enemyPerWave:[3,3],raidersPerWave}});
 assert.throws(bad([4]),/Invalid Raider counts/);assert.throws(bad([-1]),/Invalid Raider counts/);assert.throws(bad([1.5]),/Invalid Raider counts/);assert.throws(bad([0,0,1]),/Invalid Raider counts/);
 assert.doesNotThrow(bad([]));assert.doesNotThrow(bad([0,3]));
 assert.throws(()=>matchSetup('prototype',{waves:{raidersPerWave:[1]}}),/Wave overrides need the extended encounter/);
});

test('the encounter copies its Raider list, so later edits cannot leak into a running match',()=>{
 const source={raidersPerWave:[1]},r=rules({raidersPerWave:source.raidersPerWave,enemyPerWave:[3]}),e=extendedEncounter(r);
 source.raidersPerWave[0]=3;
 assert.equal(raiders(e.spawns).length,1);
 const setup=matchSetup('extended',{waves:{enemyPerWave:[3],raidersPerWave:source.raidersPerWave}});
 source.raidersPerWave[0]=0;assert.equal(raiders(setup.encounter.spawns).length,3);
});

test('same setup and seed give identical Raider matches',()=>{
 const setup=()=>matchSetup('extended',{waves:{firstWaveTick:1,enemyPerWave:[4],raidersPerWave:[2],alliedPerWave:1},defenders:[],crimsonKeepArmed:false});
 const run=()=>{const sim=unitsAfter(setup(),600);return JSON.stringify([sim.state.units,sim.clock.tick]);};
 assert.equal(run(),run());
});

test('the sand recolour changes only red cloth and keeps alpha; the sprite scale is the visual radius',()=>{
 const px=new Uint8ClampedArray([200,40,40,255, 90,160,70,255, 200,40,40,0, 120,120,120,255]),before=[...px];
 desertRaiderPixels(px);
 assert.notDeepEqual([...px.slice(0,3)],before.slice(0,3));assert.ok(px[0]>px[2]+40&&px[1]>px[2],'sand: red and green well above blue');assert.equal(px[3],255);
 assert.deepEqual([...px.slice(4,8)],before.slice(4,8),'non-red pixels are untouched');
 assert.deepEqual([...px.slice(8,12)],before.slice(8,12),'transparent pixels are untouched');
 assert.deepEqual([...px.slice(12)],before.slice(12),'neutral pixels are untouched');
 assert.equal(desertRaiderScale,11/12);
});

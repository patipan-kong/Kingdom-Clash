const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {laneHash,laneSplit,extendedWaveRules,extendedWaveSpawns,defaultLaneSeed}=require('../.test-build/data/encounters.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {play,finalHash,towerLosses,DT}=require('./support/campaignBot.cjs');
// Chapter 2 S9C: the opt-in seeded per-unit lane split (WaveRules.lanes + laneSeed). Pure data: a stateless hash of seed, wave and unit index.
const WAVES={firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,5,5,6,7,8],raidersPerWave:[0,0,2,2,2,3,3,4],alliedPerWave:0};
const LANES=[{wave:3,south:[1,2]},{wave:6,south:[3,4]}];
const build=(waves={},seed,battlefield='oasis')=>matchSetup('extended',{battlefield,waves:{...WAVES,...waves},...(seed!==undefined&&{laneSeed:seed})});
const red=(setup,n)=>setup.encounter.spawns.filter(s=>s.team==='red'&&s.wave===n);
const lanesOf=(setup,n)=>red(setup,n).map(s=>s.lane??'-').join('');

test('invalid lane configurations are rejected, never clamped',()=>{
 const bad=[
  [[{wave:0,south:[1,1]}],'wave 0'],[[{wave:9,south:[1,1]}],'wave beyond the scripted waves'],[[{wave:3.5,south:[1,1]}],'fractional wave'],
  [[{wave:3,south:[0,1]}],'no south unit allowed'],[[{wave:3,south:[1,4]}],'no north unit left (max = count)'],[[{wave:3,south:[2,1]}],'min above max'],
  [[{wave:3,south:[1.5,2]}],'fractional count'],[[{wave:3,south:[1]}],'one-element range'],[[{wave:3,south:[1,2]},{wave:3,south:[1,2]}],'duplicate wave'],
  [[{wave:1,south:[3,3]}],'wave of three cannot send three south'],[[{wave:3,south:[NaN,2]}],'NaN'],
 ];
 for(const [lanes,why] of bad)assert.throws(()=>build({lanes}),/Invalid lanes/,why);
 assert.throws(()=>build({lanes:[{wave:3,south:[1,2]}]},undefined,'meadow'),/Invalid lanes/,'a battlefield without flank waypoints cannot split');
 for(const seed of [-1,1.5,2**32,NaN,'3'])assert.throws(()=>build({lanes:LANES},seed),/Invalid lane seed/,`seed ${String(seed)}`);
 assert.doesNotThrow(()=>build({lanes:LANES},0));assert.doesNotThrow(()=>build({lanes:LANES},2**32-1));
 assert.throws(()=>matchSetup('prototype',{waves:{lanes:LANES}}),/Wave overrides need the extended encounter/);
 // laneSplit itself refuses data that the setup validator would have refused.
 const rules=extendedWaveRules();rules.lanes=[{wave:2,south:[1,9]}];assert.throws(()=>laneSplit(rules,2,3),/Invalid lane split/);
});

test('a wave cannot both flank (S7) and split; each works on its own wave',()=>{
 assert.throws(()=>build({lanes:LANES,flanks:[{wave:3,lane:'south',units:'raiders'}]}),/Invalid lanes/);
 const mixed=build({lanes:LANES,flanks:[{wave:4,lane:'south',units:'raiders'}]});
 assert.deepEqual(mixed.encounter.waves[3].flank,{lane:'south',units:'raiders'});assert.equal(mixed.encounter.waves[3].lanes,undefined);
 assert.ok(mixed.encounter.waves[2].lanes&&!mixed.encounter.waves[2].flank);
 assert.deepEqual(red(mixed,4).filter(s=>s.lane).map(s=>s.archetype),['desert-raider','desert-raider'],'the S7 flank keeps tagging only the Raiders');
});

test('every split wave puts at least one unit on each bank, within the configured range, for many seeds',()=>{
 const full=[1,2,3,4,5,6,7,8].map(wave=>({wave,south:[1,WAVES.enemyPerWave[wave-1]-1]})).filter(l=>l.south[1]>=1);
 let seen=new Set();
 for(let seed=0;seed<200;seed++){
  const s=build({lanes:full},seed);
  for(const {wave,south:[lo,hi]} of full){
   const r=red(s,wave),south=r.filter(x=>x.lane==='south').length,north=r.filter(x=>x.lane==='north').length;
   assert.equal(south+north,WAVES.enemyPerWave[wave-1]);assert.ok(south>=Math.max(1,lo)&&south<=hi&&north>=1,`seed ${seed} wave ${wave}: ${north}/${south}`);
   assert.deepEqual(s.encounter.waves[wave-1].lanes,{north,south});
   if(wave===8)seen.add(south);
  }
 }
 assert.ok(seen.size>=4,`wave 8 south count varies across seeds (${[...seen].sort()})`);
});

test('the same seed and wave data give identical spawn lanes; different seeds vary both the count and the assignment',()=>{
 const a=build({lanes:LANES},7),b=build({lanes:LANES},7);
 assert.deepEqual(a.encounter,b.encounter);assert.equal(a.laneSeed,7);
 const counts=new Set(),shapes=new Set(),sameCountDifferentUnits=new Set();
 for(let seed=0;seed<64;seed++){const s=build({lanes:[{wave:6,south:[2,4]}]},seed),l=lanesOf(s,6);counts.add(l.split('south').length-1);shapes.add(l);
  const c=l.split('south').length-1;sameCountDifferentUnits.add(c+':'+l);}
 assert.deepEqual([...counts].sort(),[2,3,4],'all three counts occur');assert.ok(shapes.size>=10,`${shapes.size} distinct assignments`);
 assert.ok([...sameCountDifferentUnits].filter(x=>x.startsWith('3:')).length>=3,'one south count has several different unit assignments');
 assert.notEqual(build({lanes:LANES},1).encounter.spawns.map(s=>s.lane).join(),build({lanes:LANES},2).encounter.spawns.map(s=>s.lane).join());
 assert.equal(build({lanes:LANES}).laneSeed,defaultLaneSeed,'no seed means the fixed default seed');
 assert.deepEqual(build({lanes:LANES}).encounter,build({lanes:LANES},defaultLaneSeed).encounter);
 assert.ok(laneHash(1,3,0)!==laneHash(2,3,0)||laneHash(1,3,1)!==laneHash(2,3,1),'the hash is seed dependent');
});

test('composition is exact: ids, order, ticks, positions, Raider placement and totals do not depend on the split',()=>{
 const plain=build({}),split=build({lanes:LANES},5);
 const strip=s=>s.encounter.spawns.map(({lane,...rest})=>rest);
 assert.deepEqual(strip(split),strip(plain),'only the lane field differs');
 assert.deepEqual(split.encounter.waves.map(w=>w.tick),plain.encounter.waves.map(w=>w.tick));
 for(const n of [3,6]){const r=red(split,n);assert.equal(r.length,WAVES.enemyPerWave[n-1]);assert.equal(r.filter(s=>s.archetype==='desert-raider').length,WAVES.raidersPerWave[n-1]);
  assert.deepEqual(r.map(s=>s.id),r.map((_,i)=>`red-w${n}-${i}`));assert.ok(r.every(s=>s.lane==='north'||s.lane==='south'),'every unit in a split wave has a lane');}
 for(const n of [1,2,4,5,7,8])assert.ok(red(split,n).every(s=>!s.lane),`wave ${n} has no lane`);
 assert.ok(split.encounter.spawns.filter(s=>s.team==='blue').every(s=>!s.lane));
});

test('legacy spawns are unchanged: no lanes means no lane data, and Chapter 1, Levels 11 to 13, 15, 17, 19 and Full Battle match the unconfigured build',()=>{
 const rules=extendedWaveRules();
 for(let n=1;n<=14;n++)assert.deepEqual(extendedWaveSpawns(n,rules),extendedWaveSpawns(n,{...rules,laneSeed:99}),`wave ${n} ignores the seed when it has no lanes`);
 assert.equal(build({lanes:[]}).encounter.waves.some(w=>w.lanes),false);
 assert.deepEqual(build({lanes:[]},3).encounter,build({}).encounter);
 for(const l of campaign.list().filter(l=>l.number!==14&&l.number!==16&&l.number!==18)){const s=campaign.setup(l.id,12345);assert.ok(!s.encounter.spawns.some(x=>x.lane)&&!s.encounter.waves.some(w=>w.lanes||w.flank),`${l.id}`);assert.deepEqual(s.encounter,campaign.setup(l.id).encounter,`${l.id} ignores the seed`);}
 assert.equal(matchSetup('prototype').laneSeed,defaultLaneSeed);
 // The S7 flank still builds exactly as before.
 const f=build({flanks:[{wave:4,lane:'south',units:'raiders'}]});assert.deepEqual(red(f,4).map(s=>s.lane??null),[null,null,null,'south','south']);
});

test('replay: the same lane seed gives a bit-identical match; the seed never touches the critical-hit generator',()=>{
 const run=seed=>{const sim=new Simulation('s9c-replay',build({lanes:LANES},seed)),log=[];play(sim,3000,{towers:2,log,cast:{bash:true},leash:650,hold:{x:620,y:600}});return {sim,log};};
 let other=12;while(lanesOf(build({lanes:LANES},other),3)===lanesOf(build({lanes:LANES},11),3))other++; // a seed whose wave 3 differs, so the first 3000 ticks can tell them apart
 const a=run(11),b=run(11),c=run(other);
 assert.equal(finalHash(a.sim,a.log),finalHash(b.sim,b.log));assert.notEqual(finalHash(a.sim,a.log),finalHash(c.sim,c.log));
 const x=new Simulation('m',build({lanes:LANES},1)),y=new Simulation('m',build({lanes:LANES},2));
 assert.deepEqual(x.state.criticalRandom,y.state.criticalRandom,'the critical-hit generator starts from the same state regardless of lane seed');
 assert.equal(x.setup.laneSeed,1);assert.equal(y.setup.laneSeed,2);
 const events=a.log.filter(e=>e.type==='wave'&&e.index===3)[0];assert.deepEqual(events.lanes,a.sim.setup.encounter.waves[2].lanes);
});

test('both lane waypoints must be open for a lane split, as for a flank',()=>{
 const s=build({lanes:LANES});const sim=new Simulation('ok',s);assert.ok(sim);
 const field={...s.battlefield,flankVia:{north:s.battlefield.flankVia.north,south:{x:1032,y:600}}};
 assert.throws(()=>new Simulation('blocked',{...s,battlefield:field}),/Flank waypoint south is missing or blocked|blocked|Unknown/i);
});

test('tower losses are counted from death events: a destroyed tower is deleted from state, so a state lookup would read zero',()=>{
 const sim=new Simulation('s9c-loss',campaign.setup('campaign-14')),log=[];
 play(sim,420,{towers:1,cells:[[15,5]],log,...{park:true}});
 const id=Object.keys(sim.state.structures).find(k=>k.startsWith('built-')),tower=sim.state.structures[id];
 assert.ok(tower&&tower.team==='blue','a tower was built');assert.equal(towerLosses(log),0);
 const attacker=Object.values(sim.state.units).find(u=>u.team==='red');assert.ok(attacker);
 sim.hit(attacker,tower,1e6,'direct');sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});
 assert.equal(sim.state.structures[id],undefined,'the destroyed tower is gone from state');
 assert.equal(log.filter(e=>e.type==='death'&&sim.state.structures[e.id]?.team==='blue').length,0,'the old deleted-entity lookup reads zero');
 assert.equal(towerLosses(log),1,'the death-event ledger counts the loss');
 assert.equal(towerLosses([{type:'death',id:'red-w1-0'},{type:'death',id:'guardian'},{type:'death',id:'blue-base'}]),0,'only player structures count');
});

test('URL lane seed: plain digits within 32 bits are taken, anything else is rejected, never partially parsed',()=>{
 const {parseLaneSeed}=require('../.test-build/data/encounters.js');
 assert.equal(parseLaneSeed('7'),7);assert.equal(parseLaneSeed('0'),0);assert.equal(parseLaneSeed('4294967295'),4294967295);assert.equal(parseLaneSeed('0000000007'),7);
 for(const bad of [null,'','-1','1.5','abc','7abc',' 7','7 ','4294967296','99999999999','1e3','0x10','٣'])assert.equal(parseLaneSeed(bad),undefined,String(bad));
});

test('seed lifecycle: an explicit seed gives the same lane plan on every (re)start, other seeds differ, no seed keeps the fixed default, and non-campaign setups are unaffected',()=>{
 const plan=s=>JSON.stringify(s.encounter.spawns.map(x=>x.lane??null));
 const a=campaign.setup('campaign-14',2024),b=campaign.setup('campaign-14',2024);assert.equal(plan(a),plan(b));assert.equal(a.laneSeed,2024);
 assert.notEqual(plan(campaign.setup('campaign-14',2025)),plan(a));
 assert.equal(campaign.setup('campaign-14').laneSeed,defaultLaneSeed);
 for(const enc of ['prototype','extended']){const s=matchSetup(enc);assert.ok(!s.encounter.spawns.some(x=>x.lane)&&!s.encounter.waves.some(w=>w.lanes),enc);assert.equal(s.laneSeed,defaultLaneSeed);}
 const full=campaign.setup('full-battle',99);assert.deepEqual(full.encounter,campaign.setup('full-battle').encounter);
});

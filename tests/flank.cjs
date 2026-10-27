const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {extendedWaveSpawns,extendedWaveRules}=require('../.test-build/data/encounters.js');
const {oasis,canyonPass,meadow}=require('../.test-build/world/battlefield.js');
const {FLANK,flankEnd,flankSuspended}=require('../.test-build/simulation/Flank.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {finalHash}=require('./support/campaignBot.cjs');
// Chapter 2 S7: wave-specific flanking. Opt-in per wave (WaveRules.flanks), Oasis first; untagged units and every existing level are untouched.
const DT=1000/30+.01,WAVES=[3,3,4,4,5,5],RAIDERS=[0,0,2,2,3,3];
const FLANKS=[{wave:4,lane:'south',units:'raiders'},{wave:6,lane:'north',units:'all'}];
const waves=(extra={})=>({firstWaveTick:300,waveInterval:900,enemyPerWave:WAVES,raidersPerWave:RAIDERS,alliedPerWave:1,...extra});
const setup=(extra,field='oasis')=>matchSetup('extended',{battlefield:field,waves:waves(extra),defenders:[],crimsonKeepArmed:false});
const probe=(x,y,radius=12)=>({id:'probe',kind:'minion-red',team:'red',x,y,radius,speed:95,damage:18,cooldownTicks:30,armor:0,range:48,hp:240,maxHp:240});
// Routing tests do not defend the Keep, so it is made unbreakable (test only) to let every wave spawn. Run a match with the Guardian parked far away; trace every red unit's extremes while it crosses the pond (x 880-1120) and its flank state.
function trace(setupObj,ticks,{hero=[250,1050],hook}={}){
 const sim=new Simulation('s7-flank',setupObj),seen={},events=[];sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e9;
 if(hero)sim.teleportHero(hero[0],hero[1]);
 while(sim.clock.tick<ticks&&!sim.ended){
  sim.advance(DT);events.push(...sim.drainEvents().map(e=>({at:sim.clock.tick,...e})));
  for(const u of Object.values(sim.state.units)){
   if(u.team!=='red'||u.hp<=0)continue;
   const t=seen[u.id]??={tagged:undefined,lane:undefined,start:undefined,minY:Infinity,maxY:-Infinity,releasedAt:undefined,sawFlank:false,spawnTick:sim.clock.tick};
   if(u.flank){t.sawFlank=true;t.lane=u.flank.lane;t.start=u.flank.startTick;}else if(t.sawFlank&&t.releasedAt===undefined)t.releasedAt=sim.clock.tick;
   if(u.x>=880&&u.x<=1120){t.minY=Math.min(t.minY,u.y);t.maxY=Math.max(t.maxY,u.y);}
  }
  hook?.(sim);
 }
 return {sim,seen,events};
}

test('every existing setup except Levels 14 (S8), 16 (S10B) and 18 (S10C-A) is unflanked: no lane on a spawn, no flank on a wave or a unit, no waypoint outside Oasis',()=>{
 for(const sp of [matchSetup('extended'),matchSetup('extended',{battlefield:'oasis'}),matchSetup('extended',{battlefield:'canyon-pass',waves:{raidersPerWave:[0,0,2,2,3,3]}}),...campaign.list().filter(l=>l.id!=='campaign-14'&&l.id!=='campaign-16'&&l.id!=='campaign-18').map(l=>campaign.setup(l.id))]){
  assert.equal(sp.encounter.spawns.some(s=>'lane'in s),false);assert.equal(sp.encounter.waves.some(w=>'flank'in w),false);assert.equal(sp.waveRules===null||sp.waveRules.flanks===undefined,true);
 }
 assert.equal(meadow.flankVia,undefined);assert.equal(canyonPass.flankVia,undefined);
 assert.deepEqual(oasis.flankVia,{north:{x:1032,y:312},south:{x:1032,y:888}});
 const sim=new Simulation('s7-plain',campaign.setup('campaign-12'));while(sim.clock.tick<2400&&!sim.ended)sim.advance(DT);
 assert.equal(Object.values(sim.state.units).some(u=>'flank'in u),false,'no unit carries flank state in an unflanked match');
 assert.equal(extendedWaveSpawns(4,extendedWaveRules()).some(s=>'lane'in s),false);
});

test('flank configuration is validated: scripted wave, lane, unit set, one flank per wave, a waypoint on the battlefield, Raiders present',()=>{
 const bad=(flanks,field='oasis')=>assert.throws(()=>setup({flanks},field),/Invalid flanks/);
 bad([{wave:0,lane:'south',units:'all'}]);bad([{wave:7,lane:'south',units:'all'}]);bad([{wave:1.5,lane:'south',units:'all'}]);
 bad([{wave:4,lane:'east',units:'all'}]);bad([{wave:4,lane:'south',units:'some'}]);
 bad([{wave:4,lane:'south',units:'all'},{wave:4,lane:'north',units:'all'}]);
 bad([{wave:2,lane:'south',units:'raiders'}]);// wave 2 has no Raiders
 bad([{wave:4,lane:'south',units:'all'}],'canyon-pass');bad([{wave:4,lane:'north',units:'all'}],'meadow');// no waypoints there
 assert.throws(()=>matchSetup('prototype',{waves:waves({flanks:FLANKS})}),/extended/);
 const input=FLANKS.map(f=>({...f})),s=setup({flanks:input});input[0].lane='north';input.length=0;
 assert.deepEqual(s.waveRules.flanks,FLANKS,'the setup keeps its own copy');
 assert.deepEqual(s.encounter.waves.map(w=>w.flank??null),[null,null,null,{lane:'south',units:'raiders'},null,{lane:'north',units:'all'}]);
});

test('spawn tables tag only the authored units: Raiders of wave 4, every Crimson unit of wave 6, never allies or other waves',()=>{
 const s=setup({flanks:FLANKS}),tagged=s.encounter.spawns.filter(e=>e.lane);
 assert.deepEqual(tagged.map(e=>[e.id,e.lane,e.archetype??'crimson']).sort(),[
  ['red-w4-2','south','desert-raider'],['red-w4-3','south','desert-raider'],
  ...[0,1,2,3,4].map(i=>[`red-w6-${i}`,'north',i>=2?'desert-raider':'crimson'])].sort());
 assert.equal(tagged.some(e=>e.team==='blue'),false);
 const plain=setup({}),strip=e=>{const {lane,...rest}=e;return rest;};
 assert.deepEqual(s.encounter.spawns.map(strip),plain.encounter.spawns.map(strip),'tagging adds the lane and changes nothing else');
});

test('tagged units cross the pond by their bank, untagged units keep the existing route, and the wave event announces the flank',()=>{
 const r=trace(setup({flanks:FLANKS}),5600),{seen,events}=r;
 for(const id of ['red-w4-2','red-w4-3']){assert.equal(seen[id].lane,'south');assert.equal(seen[id].start,seen[id].spawnTick,'assigned at its spawn tick');assert.ok(seen[id].maxY>780,`${id} crossed the south bank (y ${seen[id].maxY})`);}
 for(let i=0;i<5;i++){const t=seen[`red-w6-${i}`];assert.equal(t.lane,'north');assert.ok(t.minY<420,`red-w6-${i} crossed the north bank (y ${t.minY})`);}
 for(const [id,t] of Object.entries(seen))if(!['red-w4-2','red-w4-3'].includes(id)&&!id.startsWith('red-w6-'))assert.equal(t.sawFlank,false,`${id} was never tagged`);
 const waveEvents=events.filter(e=>e.type==='wave');
 assert.deepEqual(waveEvents.map(e=>e.flank??null),[null,null,null,{lane:'south',units:'raiders'},null,{lane:'north',units:'all'}]);
});

test('the flank ends: reached or passed, never past the 600 tick timeout, and the unit then routes as before',()=>{
 const {seen}=trace(setup({flanks:FLANKS}),5600);
 for(const [id,t] of Object.entries(seen))if(t.sawFlank){assert.ok(t.releasedAt!==undefined,`${id} was released`);assert.ok(t.releasedAt-t.start<=FLANK.timeout,`${id} released within the timeout`);}
 const mk=(x,y,start=0)=>({x,y,flank:{lane:'south',startTick:start}}),via={x:1032,y:888};
 assert.equal(flankEnd({x:1,y:1},via,5),undefined,'an untagged unit has nothing to end');
 assert.equal(flankEnd(mk(1380,600),via,10),undefined);
 assert.equal(flankEnd(mk(1032,888-FLANK.reach),via,10),'reached');assert.equal(flankEnd(mk(1032,888-FLANK.reach-1),via,10),undefined);
 assert.equal(flankEnd(mk(1032-FLANK.reach,888),via,10),'reached');
 assert.equal(flankEnd(mk(1032-FLANK.reach-1,888-FLANK.corridor),via,10),'passed');
 assert.equal(flankEnd(mk(1032-FLANK.reach-1,888-FLANK.corridor-1),via,10),undefined,'west of the waypoint but not in its corridor is not passed');
 assert.equal(flankEnd(mk(1300,888),via,10),undefined,'in the corridor but east of the waypoint is not passed');
 assert.equal(flankEnd(mk(1380,600,100),via,100+FLANK.timeout-1),undefined);assert.equal(flankEnd(mk(1380,600,100),via,100+FLANK.timeout),'timeout');
 assert.equal(flankEnd(mk(1380,600),undefined,10),'no-waypoint');
 assert.equal(flankSuspended({x:0,y:0},undefined),false);
 assert.equal(flankSuspended({x:0,y:0},{x:FLANK.engage,y:0,kind:'guardian'}),true);assert.equal(flankSuspended({x:0,y:0},{x:FLANK.engage+1,y:0,kind:'guardian'}),false);
 assert.equal(flankSuspended({x:0,y:0},{x:10,y:0,kind:'base-blue'}),false,'the Keep never suspends a flank');
});

test('the timeout releases a unit that is still flanking after 600 ticks, whatever it is doing',()=>{
 const sim=new Simulation('s7-timeout',setup({flanks:[{wave:4,lane:'south',units:'all'}]}));sim.teleportHero(250,1050);sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e9;
 while(!sim.state.units['red-w4-0']&&sim.clock.tick<4000)sim.advance(DT);
 const u=sim.state.units['red-w4-0'];assert.deepEqual(u.flank,{lane:'south',startTick:sim.clock.tick});
 u.flank.startTick=sim.clock.tick-FLANK.timeout+1;sim.advance(DT);assert.ok(sim.state.units['red-w4-0']);
 sim.advance(DT);assert.equal(sim.state.units['red-w4-0'].flank,undefined,'released at the timeout');
});

test('both waypoints are reachable from every Crimson slot and lead on to the Azure Keep, for radius 12 and 20',()=>{
 const sim=new Simulation('s7-reach',setup({flanks:FLANKS})),nav=sim.navigation,st=combatStructures(sim.state),base=sim.state.bases['blue-base'];
 const slots=extendedWaveRules().redSlots;
 for(const radius of [12,20])for(const lane of ['north','south']){
  const via=oasis.flankVia[lane];assert.equal(sim.geo.blocked(via.x,via.y,radius),false,`${lane} waypoint open at radius ${radius}`);
  for(const [x,y] of slots){const there=nav.search(probe(x,y,radius),via,undefined,st,false);assert.ok(there&&there.points.length,`${lane} from (${x},${y}) r${radius}`);}
  const on=nav.search(probe(via.x,via.y,radius),{x:base.x,y:base.y},base,st,false);assert.ok(on&&on.points.length,`Keep from the ${lane} waypoint r${radius}`);
 }
 assert.throws(()=>new Simulation('s7-bad',{...setup({flanks:FLANKS}),battlefield:{...oasis,flankVia:{south:{x:1000,y:600}}}}),/blocked/);
 assert.throws(()=>new Simulation('s7-none',{...setup({flanks:FLANKS}),battlefield:{...oasis,flankVia:undefined}}),/missing or blocked/);
});

test('an unreachable waypoint is released at once and the unit routes to the Keep as normal',()=>{
 // An enclosed pocket: open for the radius check, cut off from every route.
 const wall=(x0,y0,x1,y1)=>Object.freeze({x0,y0,x1,y1,reason:'Water overlaps cell'});
 const pocket=Object.freeze({...oasis,id:'s7-pocket',barriers:[...oasis.barriers,wall(960,830,1104,850),wall(960,926,1104,946),wall(960,830,980,946),wall(1084,830,1104,946)]});
 const s=setup({flanks:[{wave:4,lane:'south',units:'all'}]}),r=trace({...s,battlefield:pocket},4400);
 const t=r.seen['red-w4-0'];assert.equal(t.sawFlank,true);assert.ok(t.releasedAt-t.start<=3,`released at once (${t.releasedAt-t.start} ticks after spawn)`);
 const lowest=Math.max(...['red-w4-0','red-w4-1','red-w4-2','red-w4-3'].map(id=>r.seen[id].maxY));assert.ok(lowest<900,'nobody went into the pocket');
});

test('combat comes first: tagged Raiders strike a Guardian standing on their way instead of walking past it',()=>{
 const r=trace(setup({flanks:[{wave:4,lane:'south',units:'raiders'}]}),3600,{hook:sim=>{if(sim.clock.tick===2995){sim.teleportHero(1250,620);sim.hero.hp=sim.hero.maxHp;}}});
 assert.ok(r.seen['red-w4-2'].sawFlank,'tagged');
 const all=r.events;
 assert.ok(all.some(e=>e.type==='damage'&&['red-w4-2','red-w4-3'].includes(e.sourceId)&&e.id==='guardian')||all.some(e=>e.type==='attack'&&['red-w4-2','red-w4-3'].includes(e.id)&&e.targetId==='guardian'),'a tagged Raider attacked the Guardian');
});

test('a flank match replays identically, and differs from the same match without the flank',()=>{
 const run=extra=>{const r=trace(setup(extra),5600);const log=r.events;return finalHash(r.sim,log);};
 assert.equal(run({flanks:FLANKS}),run({flanks:FLANKS}));
 assert.notEqual(run({flanks:FLANKS}),run({}));
 assert.equal(run({}),run({flanks:undefined}),'omitting the flanks is the same match');
});

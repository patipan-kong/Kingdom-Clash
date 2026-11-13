const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
// Playtest (Fortify the Crossing): "Enemy wave 8" at 3:04 with the objective at 3/6 and no Crimson on the field. A unit standing on a Crimson slot deferred
// its entries and, behind them, the whole Crimson queue, for as long as it stayed. Waves kept being announced by the clock while nothing spawned.
const DT=1000/30+.01,SLOT=[1380,600];
const run=(seconds,park)=>{
 const sim=new Simulation('starve',campaign.setup(2));
 for(let t=0;t<30*seconds;t++){if(park&&sim.clock.tick===30*45){sim.hero.x=SLOT[0];sim.hero.y=SLOT[1];}sim.advance(DT);sim.drainEvents();}
 return sim;
};
const waves=sim=>sim.missionStatus().objectives.find(o=>o.id==='waves');
test('an undisturbed Fortify the Crossing finishes its six waves and leaves no queue behind',()=>{
 const sim=run(200,false);assert.equal(waves(sim).progress,6);assert.ok(sim.spawnQueue.length<=6);
});
test('a Guardian parked on a Crimson slot delays the spawn but cannot starve the mission',()=>{
 const sim=run(200,true);
 assert.ok(waves(sim).progress>=5,`waves defeated ${waves(sim).progress}`);assert.ok(sim.spawnQueue.length<=12,`queue ${sim.spawnQueue.length}`);
});
test('the deferral still holds for ten seconds, then the entry spawns, so nothing is dropped or lost',()=>{
 const sim=new Simulation('hold',campaign.setup(2));
 const due=sim.encounter.spawns.find(e=>e.wave===2&&e.x===SLOT[0]&&e.y===SLOT[1]).tick;let before,after;
 for(let t=0;t<30*80;t++){if(sim.clock.tick===due-5){sim.hero.x=SLOT[0];sim.hero.y=SLOT[1];}sim.advance(DT);sim.drainEvents();
  if(sim.clock.tick===due+280)before=sim.spawnQueue.some(e=>e.x===SLOT[0]&&e.y===SLOT[1]&&e.wave===2);if(sim.clock.tick===due+320)after=sim.spawnQueue.some(e=>e.x===SLOT[0]&&e.y===SLOT[1]&&e.wave===2);}
 assert.equal(before,true,'still deferred inside ten seconds');assert.equal(after,false,'spawned once the patience ran out');
});
// Gate 2: the bounded deferral never releases a backlog in one tick, counts stay exact, and wave timing does not move.
const spawnLog=(park)=>{
 const sim=new Simulation('log',campaign.setup(2)),spawns=[],waveTicks=[];
 for(let t=0;t<30*160;t++){if(park&&sim.clock.tick>=30*60){sim.hero.x=SLOT[0];sim.hero.y=SLOT[1];}sim.advance(DT);for(const e of sim.drainEvents()){if(e.type==='spawn'&&e.id.startsWith('red-w'))spawns.push([sim.clock.tick,e.id]);if(e.type==='wave')waveTicks.push([e.index,sim.clock.tick]);}}
 return {sim,spawns,waveTicks};
};
test('a delayed backlog is released one entry at a time, never all in one tick',()=>{
 const {spawns}=spawnLog(true),perTick=new Map();for(const [t] of spawns)perTick.set(t,(perTick.get(t)??0)+1);
 assert.equal(Math.max(...perTick.values()),1);
});
test('no enemy is duplicated or invented while spawns are deferred: no id spawns twice',()=>{
 const {sim,spawns}=spawnLog(true),scheduled=new Set(sim.encounter.spawns.map(e=>e.id)),ids=spawns.map(s=>s[1]);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(ids.length>=20);
});
test('wave announcements keep the exact clock whether or not a unit blocks a slot, and the objective stays six waves',()=>{
 const a=spawnLog(false),b=spawnLog(true);assert.deepEqual(b.waveTicks,a.waveTicks);
 assert.equal(a.sim.missionStatus().objectives.find(o=>o.id==='waves').target,6);
 assert.deepEqual(a.waveTicks.slice(0,3),[[1,450],[2,1170],[3,1890]]);
});
test('normal unblocked spawning: every Crimson entry spawns on its due tick or a few ticks after, one per tick',()=>{
 const {sim,spawns}=spawnLog(false),due=new Map(sim.encounter.spawns.map(e=>[e.id,e.tick]));
 for(const [t,id] of spawns.slice(0,12))assert.ok(t>=due.get(id)&&t-due.get(id)<=8,`${id} spawned ${t-due.get(id)} ticks late`);
});

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

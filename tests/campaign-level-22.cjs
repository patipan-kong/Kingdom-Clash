const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {debugLevelFromSearch}=require('../.test-build/data/debugLaunch.js');
const {strike,until}=require('./support/campaignBot.cjs');
// Chapter 3 Mission 2: Level 22 "The Broken Wall" (src/data/campaignLevels.ts). One objective, the Crimson Keep; three Crimson Barracks, five Crimson towers and a wall with two breaches in front of it.
// No Azure Barracks yet (they arrive in Mission 3). Every balance value is provisional; these tests pin the rules, not the difficulty.
const L=campaign.get('campaign-22'),T=['red-siege-north','red-siege-centre','red-siege-south','red-guard-north','red-guard-south'],B=['red-barracks-north','red-barracks-south','red-barracks-keep'];
const make=(id='l22')=>new Simulation(id,campaign.setup(22));
const reds=sim=>Object.values(sim.state.units).filter(u=>u.team==='red'&&u.hp>0);
const keepAlive=sim=>{sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp;sim.hero.hp=sim.hero.maxHp;};

test('Level 22 is The Broken Wall: Chapter 3 Mission 2, one objective (the Crimson Keep), waves until it falls, no failure threshold',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[22,3,'campaign-22','The Broken Wall','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]});
 const o=L.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.crimsonKeepInvulnerable,o.defenders],['broken-wall',false,undefined,T]);
 assert.deepEqual(o.barracks.map(b=>b.id),B);assert.equal(o.azure,undefined,'no Azure Barracks in Mission 2');
 assert.deepEqual(o.start,{gold:100,wood:100,iron:10});assert.equal(o.waves.alliedPerWave,0);
});
test('Level 22 is Chapter 3 Mission 2 and the chapter is released; the debug URL opens it and the production URL does not',()=>{
 assert.equal(campaignChapters[2].slots[1].levelId,'campaign-22');assert.equal(campaignChapters[2].release,'available');
 const resolve=(q,dev=true)=>debugLevelFromSearch(q,dev,campaignChapters,id=>campaign.has(id));
 assert.equal(resolve('?debug=1&chapter=3&mission=2'),'campaign-22');assert.equal(resolve('?debug=1&level=22'),'campaign-22');
 assert.equal(resolve('?debug=1&chapter=3&mission=2',false),null);assert.equal(resolve('?chapter=3&mission=2'),null);
});
test('the player has no Azure Barracks yet: no pads, no starting Barracks, no soldiers, and the start is 100 Gold, 100 Wood, 10 Iron',()=>{
 const sim=make();until(sim,3);
 assert.equal(sim.azurePads.length,0);assert.equal(Object.values(sim.state.structures).some(b=>b.azureBarracks),false);
 assert.equal(Object.values(sim.state.units).some(u=>u.id.startsWith('blue-s-')),false);
 assert.equal(sim.placementReason('barracks',10,10),'Not an Azure Barracks pad');
 assert.deepEqual([sim.state.gold,sim.state.wood,sim.state.iron].map(Math.floor),[100,100,10]);
});
test('three Crimson Barracks, five Crimson towers and the Keep stand; every wave slot belongs to one Barracks and reaches the Azure Keep; the Guardian reaches every one of them',()=>{
 const sim=make('l22-layout'),s=sim.state;until(sim,3);
 for(const id of [...T,...B])assert.ok(s.structures[id],`${id} stands`);assert.equal(s.bases['red-base'].hp,3000);assert.notEqual(s.bases['red-base'].invulnerable,true);
 assert.deepEqual(sim.setup.barracks.flatMap(b=>b.slots),L.match.overrides.waves.redSlots);
 const st=combatStructures(s),G=12,reach=(from,to,r)=>{const k=(x,y)=>x+','+y,seen=new Set([k(from.x,from.y)]),q=[from];
  for(let i=0;i<q.length;i++){const p=q[i];if(Math.hypot(p.x-to.x,p.y-to.y)<=G*2)return true;for(const [dx,dy] of [[G,0],[-G,0],[0,G],[0,-G]]){const x=p.x+dx,y=p.y+dy;if(seen.has(k(x,y))||sim.geo.blocked(x,y,r,st))continue;seen.add(k(x,y));q.push({x,y});}}return false;};
 for(const [x,y] of L.match.overrides.waves.redSlots)assert.ok(reach({x,y},{x:462,y:600},20),`slot ${x},${y} reaches the Azure Keep`);
 for(const id of [...T,...B]){const t=s.structures[id];assert.ok(reach({x:820,y:590},{x:t.x-72,y:t.y},21)||reach({x:820,y:590},{x:t.x,y:t.y-96},21)||reach({x:820,y:590},{x:t.x,y:t.y+96},21),`the Guardian reaches ${id}`);}
 {const k=s.bases['red-base'];assert.ok(reach({x:820,y:590},{x:k.x-112,y:k.y},21),'the Guardian reaches the Crimson Keep');}
 // the wall line (x 1392-1440): the two breaches are open, the pieces are solid
 for(const y of [480,720])assert.equal(sim.geo.blocked(1416,y,20,st),false,`breach at y ${y}`);
 for(const y of [360,600,840])assert.equal(sim.geo.blocked(1416,y,12,st),true,`wall piece at y ${y}`);
});
test('waves keep coming until the Keep falls: more than five spawn, from all four slots, on a 26 s cadence',()=>{
 const sim=make('l22-waves'),w=L.match.overrides.waves,slots=new Set();
 until(sim,w.firstWaveTick+w.waveInterval*6+30,[],()=>{keepAlive(sim);for(const u of reds(sim))slots.add(`${Math.round(u.x)},${Math.round(u.y)}`);});
 assert.ok(sim.state.spawnedWaves>=7,`wave ${sim.state.spawnedWaves}`);assert.equal(sim.ended,false);
});
test('each Crimson Barracks owns its own spawn slots: destroying one drops its supply and nobody takes it over; the others keep sending',()=>{
 const w=L.match.overrides.waves,origin=(id)=>{const sim=make('l22-'+id),seen=new Map();if(id!=='none')strike(sim,'guardian',id);
  until(sim,w.firstWaveTick+w.waveInterval*3+60,[],()=>{keepAlive(sim);for(const u of Object.values(sim.state.units))if(u.id.startsWith('red-w')&&!seen.has(u.id))seen.set(u.id,{x:u.x,y:u.y});});return [...seen.values()];};
 const near=(list,[x,y])=>list.filter(p=>Math.hypot(p.x-x,p.y-y)<150).length;
 const control=origin('none'),slots=L.match.overrides.waves.redSlots;
 for(const s of slots)assert.ok(near(control,s)>0,`slot ${s} sends troops while its Barracks stands`);
 for(const [id,owned] of [['red-barracks-north',[slots[0]]],['red-barracks-south',[slots[1]]],['red-barracks-keep',[slots[2],slots[3]]]]){
  const run=origin(id);for(const s of owned)assert.equal(near(run,s),0,`${id} dead: nothing spawns at ${s}`);
  assert.ok(run.length>0&&run.length<control.length,`${id} dead: fewer troops overall (${run.length} < ${control.length})`);
  for(const s of slots.filter(x=>!owned.includes(x)))assert.ok(near(run,s)>0,`${id} dead: the other slots still send`);
 }
});
test('Victory is the Crimson Keep and only the Crimson Keep: no tower, wing or Barracks count, in any number',()=>{
 const sim=make('l22-victory');keepAlive(sim);
 const row=()=>sim.missionStatus().objectives[0];assert.equal(sim.missionStatus().objectives.length,1);assert.equal(row().progress,0);
 for(const id of [...T,...B]){strike(sim,'guardian',id);until(sim,sim.clock.tick+2,[],()=>keepAlive(sim));assert.equal(sim.ended,false,`${id} down is not victory`);assert.equal(row().progress,0);}
 assert.equal(sim.state.bases['red-base'].hp,3000,'nothing else touches the Keep');
 strike(sim,'guardian','red-base',1000);until(sim,sim.clock.tick+2,[],()=>keepAlive(sim));assert.equal(sim.ended,false,'a damaged Keep is not destroyed');
 strike(sim,'guardian','red-base');until(sim,sim.clock.tick+2);
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
});
test('the towers and Barracks are optional: the Keep alone wins with all of them standing; the Azure Keep reaching 0 HP is defeat, 1 HP is alive',()=>{
 const a=make('l22-bypass');strike(a,'guardian','red-base');until(a,3);assert.equal(a.outcome&&a.outcome.outcome,'victory');for(const id of [...T,...B])assert.ok(a.state.structures[id]);
 const b=make('l22-1hp');b.state.bases['blue-base'].hp=1;until(b,30);assert.equal(b.ended,false);
 const c=make('l22-0hp');c.state.bases['blue-base'].hp=0;until(c,3);assert.deepEqual(c.outcome&&[c.outcome.outcome,c.outcome.reason],['defeat','azure-keep-destroyed']);
});
test('the objective row is one short line, and Mission 2 is deterministic; Missions 1 and 3 are untouched by it',()=>{
 const rows=make().missionStatus().objectives;assert.deepEqual(rows.map(o=>[o.id,o.phaseId,o.definition.display.label,o.target,o.active]),[['keep','assault','Destroy the Crimson Keep',1,true]]);
 const run=()=>{const sim=make('det');until(sim,900);return createHash('sha256').update(JSON.stringify(sim.state)).digest('hex');};assert.equal(run(),run());
 assert.equal(campaign.setup(21).azure,undefined);assert.equal(campaign.setup(23).azure.initial.length,1,'Mission 3 starts with an Azure Barracks');
 assert.equal(campaign.setup(22).battlefield.id,'broken-wall');assert.equal(campaign.setup(23).battlefield.id,'frost-citadel');
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const {scenarios,stateHash,run,load,write,firstDivergence}=require('./support/golden.cjs');
// Chapter 2 S0: golden simulation baselines for Chapter 1 Levels 1, 6 and 10 and legacy Full Battle, recorded at main 5b31ef8 before the
// Battlefield refactor. A failure here means gameplay changed. If that change is intended, regenerate on purpose and review the fixture diff:
// GOLDEN_UPDATE=1 node scripts/test.mjs golden-simulation.cjs
const update=process.env.GOLDEN_UPDATE==='1';
const names=Object.keys(scenarios);
const results=new Map();
const once=name=>{if(!results.has(name))results.set(name,run(name));return results.get(name);};

for(const name of names)test(`golden: ${name} matches its recorded checkpoints`,()=>{
 const r=once(name);
 if(update){write(name,r);return;}
 const g=load(name);
 assert.equal(firstDivergence(g.checkpoints,r.checkpoints),null,`${name}: ${firstDivergence(g.checkpoints,r.checkpoints)}${g.generatedWith.node!==process.version?` (fixtures were generated with Node ${g.generatedWith.node}, this is ${process.version})`:''}`);
 assert.deepEqual(r.summary,g.summary);
});

test('golden scenarios reach the states they are meant to protect',()=>{
 const [l1,l6,l10,full]=names.map(once);
 assert.equal(l1.summary.outcome?.startsWith('victory/objectives-complete'),true,'Level 1 is won');assert.equal(l1.summary.spawnedWaves,5);
 assert.equal(l6.summary.outcome?.startsWith('victory/objectives-complete'),true,'Level 6 is won');assert.deepEqual(l6.summary.mission.completedPhases,['hold','breach']);
 assert.equal(l10.summary.outcome?.startsWith('victory/objectives-complete'),true,'Level 10 is won');assert.deepEqual(l10.summary.mission.completedPhases,['gates','siege']);
 assert.ok(l10.summary.playerTowers>=1&&l10.summary.crimsonKeepHp<=0,'towers were built and the Crimson Keep fell');
 assert.equal(full.summary.mission,null,'Full Battle has no mission');assert.ok(full.summary.spawnedWaves>=8,'Full Battle ran through many waves');
 assert.ok(full.summary.ranks.bash>=1&&full.summary.ranks.charge>=1&&full.summary.ranks.taunt>=1,'skills were learned');
 for(const r of [l1,l6,l10,full])assert.ok(r.checkpoints.length>=20,'at least 20 checkpoints');
});

test('two independent runs of every scenario produce identical checkpoints, alone or interleaved',()=>{
 const first=names.map(once),again=[...names].reverse().map(n=>run(n)).reverse();
 names.forEach((n,i)=>assert.deepEqual(again[i].checkpoints,first[i].checkpoints,n));
 const hashes=new Set(first.map(r=>r.checkpoints.at(-1).split(' ')[1]));assert.equal(hashes.size,names.length,'every scenario ends in a different state');
});

// Each perturbation changes one gameplay value by the smallest meaningful amount. Every checkpoint before it must still match the golden
// fixture and the first checkpoint after it must not, which shows the digest covers that value and the comparison detects it.
const perturbations=[
 ['Crimson raider HP -1',s=>{const u=Object.values(s.state.units).find(u=>u.team==='red'&&u.hp>0);u.hp-=1;}],
 ['Crimson raider x +0.001',s=>{Object.values(s.state.units).find(u=>u.team==='red'&&u.hp>0).x+=.001;}],
 ['Guardian y +0.001',s=>{s.hero.y+=.001;}],
 ['Guardian XP +1',s=>{s.state.heroProgression.xp+=1;}],
 ['Shield Bash cooldown +1 tick',s=>{s.state.skills.ready.bash+=1;}],
 ['Crimson tower HP -1',s=>{Object.values(s.state.structures).find(b=>b.team==='red').hp-=1;}],
 ['Azure Keep HP -1',s=>{s.state.bases['blue-base'].hp-=1;}],
 ['Wood +1 economy unit',s=>{s.economy.balances.wood+=1;}],
 ['spawned waves +1',s=>{s.state.spawnedWaves+=1;}],
 ['critical-hit RNG advanced',s=>{s.state.criticalRandom.state=(s.state.criticalRandom.state+1)>>>0;}],
 // Level 1 wave 2 is queued at tick 990 and its raiders enter 24 ticks apart, so at tick 995 two of them are still pending.
 ['pending spawn delayed 1 tick',s=>{assert.ok(s.spawnQueue.length,'a spawn is pending');s.spawnQueue[0].tick+=1;},995],
 ['mission progress +1',s=>{const status=s.missionStatus.bind(s);s.missionStatus=()=>{const m=status();return {...m,objectives:m.objectives.map((o,i)=>i?o:{...o,progress:o.progress+1})};};}],
];
test('the golden comparison fails when any gameplay-relevant value is perturbed',()=>{
 const name='chapter1-level-01',golden=load(name).checkpoints;
 for(const [label,apply,at=901] of perturbations){
  const r=run(name,{perturb:{tick:at,apply},stopAfter:at});
  const i=r.checkpoints.length-1,before=r.checkpoints.slice(0,i);
  assert.deepEqual(before,golden.slice(0,i),`${label}: checkpoints before the change still match`);
  const [tick,state]=r.checkpoints[i].split(' '),[gtick,gstate]=golden[i].split(' ');
  assert.equal(tick,gtick,`${label}: same checkpoint tick`);assert.notEqual(state,gstate,`${label}: the state hash changed at tick ${tick}`);
  assert.notEqual(firstDivergence(golden,r.checkpoints),null,`${label}: the comparison reports a divergence`);
 }
});

test('the state hash ignores excluded bookkeeping and raw input echo',()=>{
 const r=run('chapter1-level-01',{stopAfter:900}),sim=r.sim,h=stateHash(sim);
 const u=Object.values(sim.state.units).find(u=>u.team==='red'&&u.hp>0);
 u.decisionTick=(u.decisionTick??0)+99;u.targetSinceTick=(u.targetSinceTick??0)+99;sim.state.previewReady.attack=12345;sim.state.move={x:1,y:0};
 sim.navigation.stats.plans+=7;
 assert.equal(stateHash(sim),h);
});

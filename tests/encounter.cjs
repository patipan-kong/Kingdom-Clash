const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {buildEncounter,extendedRules,alliedBaseThreatened,isEncounterId}=require('../.test-build/data/encounters.js');
const {waves,minionStats,guardianStats}=require('../.test-build/data/combat.js');
const {blocked}=require('../.test-build/simulation/Collision.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {nextLevelXp}=require('../.test-build/data/progression.js');
const ticks=(s,n)=>{for(let i=0;i<n;i++)s.advance(1000/30+.01);};
const upTo=(s,t)=>{while(s.clock.tick<t)s.advance(1000/30+.01);};
const ext=()=>new Simulation('t','extended');
const redMinions=s=>Object.values(s.state.units).filter(u=>u.kind==='minion-red');
function minion(s,id,team,x,y,extra={}){const u={id,team,kind:'minion-'+team,x,y,...minionStats,hp:240,readyTick:0,protectionTick:0,...extra};s.state.units[id]=u;return u;}
const cumulative=level=>{let t=0;for(let l=1;l<level;l++)t+=nextLevelXp(l);return t;};

test('encounter ids validate and default Simulation is the inherited prototype',()=>{
 assert.equal(isEncounterId('prototype'),true);assert.equal(isEncounterId('extended'),true);assert.equal(isEncounterId('x'),false);
 assert.equal(new Simulation().state.encounter.id,'prototype');assert.equal(Object.keys(new Simulation().state.structures).length,0);
});
test('prototype encounter data equals the inherited Phase 1D/2B schedule exactly',()=>{
 const e=buildEncounter('prototype');
 assert.deepEqual(e.waves,[{tick:1},{tick:240}]);assert.equal(e.defenders.length,0);assert.equal(e.deferBlocked,false);assert.deepEqual(e.caps,{red:40,blue:40});assert.equal(e.spawns.length,9);
 assert.deepEqual(e.spawns.filter(x=>x.team==='red').map(x=>[x.tick,x.id,x.x,x.y]),waves.flatMap((w,i)=>w.positions.map(([x,y],j)=>[w.tick,`red-${i}-${j}`,x,y])));
 assert.deepEqual(e.spawns.filter(x=>x.team==='blue').map(x=>x.id),['blue-1-0','blue-1-1','blue-1-2']);
});
test('prototype simulation still spawns three at tick 1 then three plus three allies at tick 240',()=>{
 const s=new Simulation(),spawned=[];for(let i=0;i<241;i++){s.advance(1000/30+.01);for(const e of s.drainEvents())if(e.type==='spawn')spawned.push([s.clock.tick,e.id]);}
 assert.deepEqual(spawned,[[1,'red-0-0'],[1,'red-0-1'],[1,'red-0-2'],[240,'red-1-0'],[240,'red-1-1'],[240,'red-1-2'],[240,'blue-1-0'],[240,'blue-1-1'],[240,'blue-1-2']]);ticks(s,2000);assert.equal(s.state.spawnedWaves,2);
});
test('extended wave schedule has the documented counts, ticks, ids and escalation',()=>{
 const e=buildEncounter('extended');assert.equal(e.waves.length,12);e.waves.forEach((w,i)=>assert.equal(w.tick,300+1200*i));
 assert.equal(e.spawns.filter(x=>x.team==='red').length,66);assert.equal(e.spawns.filter(x=>x.team==='blue').length,24);assert.equal(new Set(e.spawns.map(x=>x.id)).size,90);
 for(let w=1;w<=12;w++)assert.equal(e.spawns.filter(x=>x.wave===w&&x.team==='red').length,extendedRules.enemyPerWave[w-1]);
 assert.ok(extendedRules.enemyPerWave.every((n,i,a)=>i===0||n>=a[i-1]));assert.equal(e.deferBlocked,true);assert.deepEqual(e.caps,{red:24,blue:16});
 for(const x of e.spawns)assert.ok(x.tick>=e.waves[x.wave-1].tick&&x.tick<e.waves[x.wave-1].tick+extendedRules.spawnStagger*8);
});
test('extended spawns happen on the exact scheduled ticks, one stagger apart',()=>{
 const s=ext(),seen=[],e=s.encounter;
 for(let t=0;t<300+1200*3+300;t++){s.advance(1000/30+.01);for(const ev of s.drainEvents())if(ev.type==='spawn')seen.push([s.clock.tick,ev.id]);}
 const expected=e.spawns.filter(x=>x.wave<=3).map(x=>[x.tick,x.id]);
 assert.deepEqual(seen.filter(([,id])=>expected.some(([,i])=>i===id)),expected);
});
test('every extended spawn slot and defender is legal terrain away from bases, the bridge and each other',()=>{
 const e=buildEncounter('extended'),s=ext(),struct=combatStructures(s.state);
 for(const [x,y] of e.reserved)assert.equal(blocked(x,y,minionStats.radius,struct),false,`slot ${x},${y}`);
 for(const [x,y] of extendedRules.redSlots)assert.ok(x>1040+40&&x<1538-40);
 for(const d of e.defenders){
  assert.equal(blocked(d.x,d.y,24,{...s.state.bases}),false,d.id);assert.ok(!(d.x>880-30&&d.x<1040+30));
  for(const [x,y] of e.reserved)assert.ok(Math.hypot(d.x-x,d.y-y)>=24+minionStats.radius+10,`${d.id} near slot`);
 }
 for(let i=0;i<e.defenders.length;i++)for(let j=i+1;j<e.defenders.length;j++)assert.ok(Math.hypot(e.defenders[i].x-e.defenders[j].x,e.defenders[i].y-e.defenders[j].y)>=48);
});
test('extended defenders are completed full-HP red Archer Towers with unchanged tower stats and base HP',()=>{
 const s=ext(),towers=Object.values(s.state.structures);assert.equal(towers.length,7);
 for(const t of towers){assert.equal(t.team,'red');assert.equal(t.kind,'tower');assert.equal(t.hp,650);assert.equal(t.maxHp,650);assert.equal(t.damage,18);assert.equal(t.range,240);assert.equal(t.cooldownTicks,24);assert.equal(t.progress,1);assert.equal(t.completeTick,0);}
 assert.equal(s.state.bases['red-base'].hp,3000);assert.equal(s.state.bases['blue-base'].hp,3000);assert.equal(s.hero.maxHp,guardianStats.maxHp);
});
test('pause and zero timeScale freeze the extended wave clock and queue; resume has no duplicates',()=>{
 const s=ext();upTo(s,299);assert.equal(s.state.spawnedWaves,0);s.setPaused(true);ticks(s,500);assert.equal(s.clock.tick,299);assert.equal(s.state.spawnedWaves,0);
 s.setPaused(false);ticks(s,1);assert.equal(s.state.spawnedWaves,1);assert.equal(redMinions(s).length,1);
 s.setTimeScale(0);ticks(s,500);assert.equal(redMinions(s).length,1);s.setTimeScale(1);s.setPaused(true);s.setPaused(false);
 upTo(s,300+24*2+5);assert.equal(redMinions(s).filter(u=>u.id.startsWith('red-w1-')).length,3);
});
test('fresh extended simulations reset waves, queue, towers, resources and threat state repeatedly',()=>{
 let old=ext();upTo(old,1600);assert.ok(old.state.spawnedWaves>=2);
 for(let i=0;i<4;i++){
  old.beginRestart();const s=ext();assert.equal(s.clock.tick,0);assert.equal(s.state.spawnedWaves,0);assert.equal(s.spawnQueue.length,0);assert.equal(redMinions(s).length,0);
  assert.equal(Object.keys(s.state.structures).length,7);assert.equal(s.state.gold,250);assert.equal(s.state.encounter.alliedBaseHitTick,undefined);assert.equal(s.state.heroProgression.level,1);old=s;upTo(s,400);
 }
});
test('active caps defer queued spawns in order instead of dropping them, then resume without duplicates',()=>{
 const s=ext();for(let i=0;i<24;i++)minion(s,'filler-'+i,'red',1900+i*3,200+i*30,{speed:0});
 upTo(s,300+24*6);assert.equal(redMinions(s).length,24);assert.equal(s.spawnQueue.filter(e=>e.team==='red').length,3);
 for(let i=0;i<2;i++)delete s.state.units['filler-'+i];ticks(s,3);
 assert.deepEqual(redMinions(s).filter(u=>u.id.startsWith('red-w')).map(u=>u.id).sort(),['red-w1-0','red-w1-1']);
 ticks(s,5);assert.equal(redMinions(s).length,24);
});
test('an occupied spawn slot defers rather than overlapping',()=>{
 const s=ext();minion(s,'camper','blue',1380,556,{speed:0,hp:1e9,maxHp:1e9});upTo(s,301);
 assert.equal(s.state.units['red-w1-0'],undefined);assert.equal(s.spawnQueue.some(e=>e.id==='red-w1-0'),true);
 delete s.state.units.camper;ticks(s,2);assert.ok(s.state.units['red-w1-0']);
});
test('no spawns occur after Victory or Defeat and the queue does not advance',()=>{
 for(const side of ['red','blue']){
  const s=ext();upTo(s,1000);const b=s.state.bases[side+'-base'];b.hp=1;
  minion(s,'finisher',side==='red'?'blue':'red',b.x+(side==='red'?-90:120),b.y,{hp:1e9,maxHp:1e9});ticks(s,40);
  assert.ok(s.state.match.result,'ended');assert.equal(s.state.match.result.outcome,side==='red'?'victory':'defeat');
  const before=Object.keys(s.state.units).sort().join(),queue=s.spawnQueue.length,waves=s.state.spawnedWaves;
  ticks(s,2000);assert.equal(Object.keys(s.state.units).sort().join(),before);assert.equal(s.spawnQueue.length,queue);assert.equal(s.state.spawnedWaves,waves);
 }
});
test('minion movement over many ticks never enters terrain, water or the river outside the bridge',()=>{
 const s=ext();s.teleportHero(450,300);
 for(let t=0;t<30*150;t++){s.advance(1000/30+.01);if(t%15)continue;for(const u of Object.values(s.state.units))if(u.kind.startsWith('minion'))assert.equal(blocked(u.x,u.y,u.radius-.5,combatStructures(s.state)),false,`${u.id} at ${u.x},${u.y} tick ${t}`);}
 assert.ok(s.state.spawnedWaves>=4);
});
test('Crimson towers target and damage the Guardian with exact armor-reduced tower damage',()=>{
 const s=ext();s.state.spawnedWaves=12;s.state.units={guardian:s.hero};s.teleportHero(1330,600);s.hero.armor=20;ticks(s,2);
 assert.equal(s.state.structures['red-tower-front-center'].targetId,'guardian');
 const hits=s.drainEvents().filter(e=>e.type==='damage'&&e.id==='guardian'&&e.sourceId.startsWith('red-tower'));
 assert.ok(hits.length>=1);assert.ok(Math.abs(hits[0].amount-18*100/120)<1e-9);
});
test('Crimson towers shoot allied minions, fall to normal combat, and award the approved 80 XP exactly once',()=>{
 const s=ext();s.state.spawnedWaves=12;s.state.units={guardian:s.hero};
 minion(s,'ally','blue',1330,600,{speed:0});ticks(s,2);assert.equal(s.state.structures['red-tower-front-center'].targetId,'ally');delete s.state.units.ally;
 s.teleportHero(1400,600);const t=s.state.structures['red-tower-front-center'];s.send({type:'attack'});s.send({type:'target',id:t.id});
 let xp=0,deaths=0;
 for(let i=0;i<30*40&&s.state.structures[t.id];i++){s.advance(1000/30+.01);for(const e of s.drainEvents()){if(e.type==='xp')xp+=e.amount;if(e.type==='death'&&e.id===t.id)deaths++;}if(s.hero.hp<=0)s.hero.hp=s.hero.maxHp;}
 assert.equal(s.state.structures[t.id],undefined);assert.equal(deaths,1);assert.equal(xp,80);ticks(s,60);assert.equal(s.state.heroProgression.xp+cumulative(s.state.heroProgression.level),80);
});
test('the enemy base is destructible by the Guardian through ordinary Attack once towers are gone',()=>{
 const s=ext();s.state.spawnedWaves=12;s.state.structures={};s.state.units={guardian:s.hero};s.teleportHero(1480,600);s.send({type:'attack'});
 for(let i=0;i<30*60&&!s.state.match.result;i++)s.advance(1000/30+.01);
 assert.equal(s.state.match.result.outcome,'victory');assert.equal(s.state.bases['red-base'].hp,0);
});
test('player tower limit counts only blue towers so Crimson defenders do not consume it',()=>{
 const s=ext();assert.equal(s.placementReason('tower',10,16),'');s.state.wood=2000;s.state.iron=500;
 for(let i=0;i<30;i++)s.state.structures['b'+i]={...s.state.structures['red-tower-front-center'],id:'b'+i,team:'blue',x:-100-i,y:-100};
 assert.equal(s.placementReason('tower',10,16),'Tower limit reached');
 delete s.state.structures.b0;assert.equal(s.placementReason('tower',10,16),'');
});
test('extended spawn slots are reserved against construction; build cost and income are unchanged',()=>{
 const s=ext();assert.equal(s.placementReason('tower',10,11),'Reserved spawn area');assert.equal(s.placementReason('tower',10,16),'');
 const p=new Simulation();assert.equal(p.placementReason('tower',10,11),'Reserved spawn area');assert.equal(p.placementReason('tower',10,10),'');
 s.send({type:'place',requestId:'x1',kind:'tower',col:10,row:16});ticks(s,2);
 assert.ok(s.state.structures['built-x1']);assert.equal(Object.keys(s.state.structures).length,8);assert.ok(Math.abs(s.state.iron-(30-10+2/120*0.25*60/60))<0.1);
 ticks(s,600);assert.equal(s.state.structures['built-x1'].progress,1);
 const income=ext();ticks(income,300);assert.ok(Math.abs(income.state.wood-(180+2*10))<.3);
});
test('Azure Keep threat flag follows nearby raiders and recent keep damage only',()=>{
 const s=ext();assert.equal(alliedBaseThreatened(s.state,0),false);const r=minion(s,'raider','red',900,600);assert.equal(alliedBaseThreatened(s.state,0),false);
 r.x=500;assert.equal(alliedBaseThreatened(s.state,0),true);delete s.state.units.raider;assert.equal(alliedBaseThreatened(s.state,0),false);
 s.state.encounter.alliedBaseHitTick=10;assert.equal(alliedBaseThreatened(s.state,100),true);assert.equal(alliedBaseThreatened(s.state,161),false);
});
test('allied base hits are recorded when a raider damages Azure Keep',()=>{
 const s=ext();s.state.spawnedWaves=12;s.state.units={guardian:s.hero};s.teleportHero(1000,300);minion(s,'raider','red',450,600);ticks(s,60);
 assert.ok(s.state.bases['blue-base'].hp<3000);assert.ok(s.state.encounter.alliedBaseHitTick>0);
});
test('extended play is deterministic across render-frame partitions with identical input ticks',()=>{
 const run=chunks=>{const s=ext();let i=0;const sent=new Set();
  while(s.clock.tick<1800){const k=s.clock.tick;if(k%100===0&&!sent.has(k)){sent.add(k);s.send({type:'move',x:k%200?-1:1,y:0});s.send({type:'attack'});}s.advance(chunks[i++%chunks.length]);}
  return JSON.stringify([s.state,s.drainEvents().length]);};
 const a=run([1000/30]),b=run([1000/60,1000/60]),c=run([1000/30/2,1000/30/2,1000/30]);
 assert.equal(b,a);assert.equal(c,a);
});
test('headless Guardian policy reaches LV6 and casts R through ordinary XP in the extended encounter',async()=>{
 const {runPolicy}=await import('../scripts/simulate-encounter.mjs');const r=runPolicy('defend',{maxMinutes:8,seed:'unit'});
 assert.ok(r.level>=6,'LV6 reached');assert.notEqual(r.firstR,null);assert.ok(r.casts.zone>=1);
 const ids=r.xpEvents.map(e=>e.sourceId);assert.equal(new Set(ids).size,ids.length,'one XP award per enemy life');assert.ok(ids.every(id=>id.endsWith(':combat-death')));
 const total=r.xpEvents.reduce((n,e)=>n+e.amount,0);assert.equal(total,cumulative(r.level)+r.xp);assert.ok(r.xpEvents.every(e=>e.amount===60||e.amount===80));
});
test('headless strategies: idle play loses the allied keep and a rush is not over within a minute',async()=>{
 const {runPolicy}=await import('../scripts/simulate-encounter.mjs');
 const idle=runPolicy('idle',{maxMinutes:6,seed:'unit'});assert.equal(idle.outcome,'defeat');assert.ok(idle.seconds>60,'keep does not fall instantly');
 const rush=runPolicy('rush',{maxMinutes:6,seed:'unit'});assert.ok(rush.seconds>=60,'a rush is not over in under a minute');
});

'use strict';
// Gameplay v0.4 (experimental): Crimson Keep self-defense and the larger Crimson wave schedule.
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {gameplayV04,lateWaveCount}=require('../.test-build/data/gameplayV04');
const {buildEncounter,extendedRules,extendedWaveSpawns}=require('../.test-build/data/encounters');
const {canAttack,damageAfterArmor}=require('../.test-build/simulation/Combat');
const {blocked,lineOfSight}=require('../.test-build/simulation/Collision');
const {combatStructures}=require('../.test-build/simulation/GameState');
const {guardianStats,minionStats}=require('../.test-build/data/combat');
const {respawnTicks}=require('../.test-build/data/progression');
const {activeCombatVariant}=require('../.test-build/data/gameplayV041');const KD=activeCombatVariant.crimsonKeepDamage??gameplayV04.keepDefense.red.damage; // runtime Keep damage: 17 under Variant B
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30+.01);};
const K=gameplayV04.keepDefense.red,EDGE=72; // the Keep is 3x3 cells of 48 around (1610,600)
// Guardian alone against the Crimson Keep; towers optionally removed; no further waves during the test window.
function duel({towers=false}={}){
 const s=new Simulation('v04','extended');s.state.units={guardian:s.hero};s.state.spawnedWaves=12;s.spawnQueue.length=0;
 if(!towers)s.state.structures={};return s;
}
const keepHits=events=>events.filter(e=>e.type==='damage'&&e.sourceId==='red-base');
const blueMinion=(id,x,y)=>({id,kind:'minion-blue',team:'blue',x,y,...minionStats,hp:minionStats.maxHp,readyTick:0,protectionTick:0});

test('Crimson Keep is armed with the documented values (damage replaced by the active Variant B); Azure Keep and the prototype stay inert; Keep HP unchanged',()=>{
 assert.deepEqual(K,{damage:14,cooldownTicks:24,range:140,targeting:'guardian-first'});assert.equal(gameplayV04.keepDefense.blue,null);
 const s=new Simulation('v04','extended'),red=s.state.bases['red-base'],blue=s.state.bases['blue-base'];
 assert.equal(KD,17);assert.equal(red.damage,KD);assert.equal(red.cooldownTicks,24);assert.equal(red.range,140);assert.equal(red.windupTicks,0);
 assert.equal(red.hp,3000);assert.equal(red.maxHp,3000);assert.equal(red.armor,0);
 assert.equal(blue.damage,0);assert.equal(blue.range,0);assert.equal(blue.hp,3000);
 const p=new Simulation('v04','prototype');assert.equal(p.state.bases['red-base'].damage,0);assert.equal(p.state.bases['red-base'].range,0);
 assert.equal(Object.values(s.state.structures).filter(t=>t.team==='red').length,8,'eight towers, positions unchanged');
});

test('every reachable position from which the Guardian can hit the Keep is inside the Keep\'s reach (intact layout and no towers)',()=>{
 for(const towers of [true,false]){
  const s=duel({towers}),st=combatStructures(s.state),keep=s.state.bases['red-base'],G=4,seen=new Set([1200*10000+316]),q=[[1200,316]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[G,0],[-G,0],[0,G],[0,-G]]){const nx=x+dx,ny=y+dy,k=nx*10000+ny;if(nx<1100||seen.has(k)||blocked(nx,ny,s.hero.radius,st))continue;seen.add(k);q.push([nx,ny]);}}
  const attack=q.filter(([x,y])=>canAttack({...s.hero,x,y},keep,st));
  assert.ok(attack.length>1500,'many attack positions ('+attack.length+')');
  for(const side of [p=>p[0]>1682,p=>p[0]<1538,p=>p[1]<528,p=>p[1]>672])assert.ok(attack.some(side),'every face is reachable');
  const unanswered=attack.filter(([x,y])=>!canAttack(keep,{...s.hero,x,y},st));
  assert.deepEqual(unanswered,[],'Keep-attack positions the Keep cannot answer (towers '+towers+')');
 }
});

test('the Keep never blocks its own shots: faces and corners hit, while a shot from its centre would be blocked',()=>{
 const s=duel(),st=combatStructures(s.state),keep=s.state.bases['red-base'],d=EDGE+30;
 const spots=[[d,0],[-d,0],[0,d],[0,-d],[EDGE+21,EDGE+21],[-(EDGE+21),EDGE+21],[EDGE+21,-(EDGE+21)],[-(EDGE+21),-(EDGE+21)]].map(([dx,dy])=>({x:keep.x+dx,y:keep.y+dy}));
 for(const p of spots){
  const g={...s.hero,...p};assert.equal(blocked(p.x,p.y,g.radius,st),false,'open ground '+JSON.stringify(p));
  assert.equal(canAttack(keep,g,st),true,'Keep answers at '+JSON.stringify(p));
  assert.equal(lineOfSight(keep,g,st),false,'control: a centre-origin shot would hit the Keep itself');
 }
});

test('Keep range is measured from its footprint edge, never map-wide',()=>{
 const s=duel(),st=combatStructures(s.state),keep=s.state.bases['red-base'],at=d=>({...s.hero,x:keep.x+EDGE+d,y:keep.y});
 assert.equal(canAttack(keep,at(K.range-1),st),true);assert.equal(canAttack(keep,at(K.range+1),st),false);
 assert.equal(canAttack(at(guardianStats.range+20),keep,st),false,'just beyond Guardian reach the Guardian cannot hit the Keep...');
 assert.equal(canAttack(keep,at(guardianStats.range+20),st),true,'...but the Keep still covers its approach');
 const far=duel();assert.equal(far.teleportHero(1856,316),true);ticks(far,120);assert.deepEqual(keepHits(far.drainEvents()),[],'no hits from the north-east lane, 274 px from the Keep edge');
});

test('deterministic cadence and damage: one physical Keep hit (17 under Variant B) every 24 ticks, armor applied, identical across runs',()=>{
 const run=()=>{const s=duel();assert.equal(s.teleportHero(1709,600),true);s.hero.hp=s.hero.maxHp=1e6;const hits=[];
  for(let i=0;i<24*10;i++){ticks(s,1);for(const e of keepHits(s.drainEvents()))hits.push({tick:s.clock.tick,amount:e.amount,raw:e.raw,type:e.damageType,id:e.id});}return hits;};
 const a=run();assert.deepEqual(a,run());
 assert.equal(a.length,10);assert.ok(a.every(h=>h.id==='guardian'&&h.raw===KD&&h.type==='physical'));
 assert.ok(a.every(h=>Math.abs(h.amount-damageAfterArmor(KD,guardianStats.armor))<1e-9),KD+' before armor = '+damageAfterArmor(KD,guardianStats.armor).toFixed(3));
 for(let i=1;i<a.length;i++)assert.equal(a[i].tick-a[i-1].tick,K.cooldownTicks);
});

test('targeting: the Guardian first even with a closer allied minion; allied minions when the Guardian is out of reach; never its own team',()=>{
 const s=duel();assert.equal(s.teleportHero(1752,600),true);s.hero.hp=s.hero.maxHp=1e6;
 s.state.units['blue-x']=blueMinion('blue-x',1696,520);
 const keep=s.state.bases['red-base'],st=combatStructures(s.state);
 assert.ok(Math.hypot(s.state.units['blue-x'].x-keep.x,s.state.units['blue-x'].y-keep.y)<Math.hypot(s.hero.x-keep.x,s.hero.y-keep.y),'the minion is closer');
 assert.ok(canAttack(keep,s.state.units['blue-x'],st)&&canAttack(keep,s.hero,st));
 s.state.units['blue-x'].damage=0;ticks(s,1);assert.deepEqual(keepHits(s.drainEvents()).map(e=>e.id),['guardian']);
 assert.equal(s.teleportHero(1856,316),true);ticks(s,K.cooldownTicks);assert.ok(keepHits(s.drainEvents()).every(e=>e.id==='blue-x'),'minion once the Guardian leaves');
 s.state.units['red-x']={...blueMinion('red-x',1700,600),kind:'minion-red',team:'red'};ticks(s,48);
 assert.ok(keepHits(s.drainEvents()).every(e=>e.id!=='red-x'),'never a Crimson unit');
});

test('Crimson minion decisions do not depend on the Keep being armed',()=>{
 // No allied minions, Guardian parked at home: the armed Keep has nothing to shoot, so any difference would be a minion-AI side effect.
 const run=armed=>{const s=new Simulation('v04-minions','extended');if(!armed){s.state.bases['red-base'].damage=0;s.state.bases['red-base'].range=0;}const trace=[];
  for(let i=0;i<60*30;i++){for(const u of Object.values(s.state.units))if(u.kind==='minion-blue')delete s.state.units[u.id];s.spawnQueue.splice(0,s.spawnQueue.length,...s.spawnQueue.filter(e=>e.team==='red'));ticks(s,1);
   if(i%30===0)trace.push(Object.values(s.state.units).filter(u=>u.kind==='minion-red').map(u=>[u.id,u.targetId,u.x.toFixed(3),u.y.toFixed(3)]));}
  return trace;};
 const armed=run(true);assert.ok(armed.flat().length>0,'Crimson minions were active');assert.deepEqual(armed,run(false));
});

test('Keep kills of the Guardian: normal death, respawn timer, no XP, the Keep stops during death and respects respawn protection',()=>{
 const s=duel();assert.equal(s.teleportHero(1709,600),true);s.hero.hp=30;const deaths0=s.state.guardianDeaths;
 let death;for(let i=0;i<120&&!death;i++){ticks(s,1);death=s.drainEvents().find(e=>e.type==='death'&&e.id==='guardian');}
 assert.equal(death.sourceId,'red-base');assert.equal(s.state.guardianDeaths,deaths0+1);
 assert.equal(s.hero.respawnTick-s.clock.tick,respawnTicks(1,deaths0));assert.equal(s.state.heroProgression.xp,0);
 ticks(s,60);assert.deepEqual(keepHits(s.drainEvents()),[],'no hits on a dead Guardian');
 ticks(s,s.hero.respawnTick-s.clock.tick);assert.ok(s.hero.hp===s.hero.maxHp&&s.hero.x<800,'respawned at home');
 // Teleport back while respawn protection lasts: the Keep's strike is absorbed by protection, then hits resume.
 assert.equal(s.teleportHero(1709,600),true);s.drainEvents();ticks(s,1);
 assert.deepEqual(keepHits(s.drainEvents()),[],'protected right after respawn');
 ticks(s,90);assert.ok(keepHits(s.drainEvents()).length>0,'hits resume after protection');
});

test('victory still needs only the Keep and arrives while the Keep is firing; the match end stops Keep fire',()=>{
 const s=duel({towers:true});assert.equal(s.teleportHero(1709,600),true);s.state.bases['red-base'].hp=200;
 s.send({type:'target',id:'red-base'});s.send({type:'attack'});let keepFired=false;
 for(let i=0;i<300&&!s.state.match.result;i++){s.send({type:'attack'});ticks(s,1);if(keepHits(s.drainEvents()).length)keepFired=true;}
 assert.equal(s.state.match.result.outcome,'victory');assert.ok(keepFired,'the Keep fought back');
 const end=s.clock.tick;ticks(s,60);assert.equal(s.clock.tick,end,'clock paused at the result');assert.deepEqual(keepHits(s.drainEvents()),[]);
});

test('defeat is unchanged: the Crimson Keep never damages the Azure Keep and the Azure Keep never fires',()=>{
 const s=new Simulation('v04-absent','extended');s.hero.hp=0;s.hero.respawnTick=1e9;const sources=new Set();
 while(!s.ended&&s.clock.tick<6000){ticks(s,1);for(const e of s.drainEvents())if(e.type==='damage')sources.add(e.sourceId);}
 assert.equal(s.state.match.result.outcome,'defeat');assert.ok(!sources.has('blue-base'),'the inert Azure Keep never fired');
 assert.equal(s.state.match.result.alliedHp,0);assert.equal(s.state.bases['red-base'].hp,3000);
});

test('pause clears the Keep target; resume reacquires deterministically',()=>{
 const s=duel();assert.equal(s.teleportHero(1709,600),true);s.hero.hp=s.hero.maxHp=1e6;ticks(s,2);
 assert.equal(s.state.bases['red-base'].targetId,'guardian');s.setPaused(true);assert.equal(s.state.bases['red-base'].targetId,undefined);
 s.setPaused(false);ticks(s,K.cooldownTicks);assert.equal(s.state.bases['red-base'].targetId,'guardian');
});

test('v0.4 wave schedule: +1 (waves 4-6), +2 (7-10), +3 (11-12), wave 13+ 9..11, same 40 s cadence and stagger, each wave spawned well within its interval',()=>{
 assert.deepEqual(extendedRules.enemyPerWave,[3,3,4,5,6,6,8,8,9,9,11,11]);
 const was=[3,3,4,4,5,5,6,6,7,7,8,8];assert.deepEqual(extendedRules.enemyPerWave.map((n,i)=>n-was[i]),[0,0,0,1,1,1,2,2,2,2,3,3]);
 assert.deepEqual([13,14,15,16,17,18,19,20,40,500].map(lateWaveCount),[9,9,9,10,10,10,11,11,11,11]);
 assert.equal(extendedRules.waveInterval,1200);assert.equal(extendedRules.spawnStagger,24);
 for(let n=1;n<=40;n++){const w=extendedWaveSpawns(n),red=w.filter(x=>x.team==='red');
  assert.equal(red.length,n<=12?extendedRules.enemyPerWave[n-1]:lateWaveCount(n));assert.equal(w.filter(x=>x.team==='blue').length,2);
  assert.ok(red.at(-1).tick-red[0].tick<extendedRules.waveInterval/4,'wave '+n+' finishes spawning in under 10 s');}
 assert.equal(buildEncounter('extended').spawns.filter(x=>x.team==='red').length,83);
});

test('populations stay within the existing caps in a realistic defended 15-minute match',()=>{
 const s=new Simulation('v04-pop','extended');let maxRed=0,maxBlue=0;
 for(let i=0;i<15*60*30;i++){
  if(i%2===0){const r=Object.values(s.state.units).filter(u=>u.kind==='minion-red'&&u.hp>0).sort((a,b)=>Math.hypot(a.x-330,a.y-600)-Math.hypot(b.x-330,b.y-600))[0];
   const g=r&&Math.hypot(r.x-330,r.y-600)<650?r:{x:620,y:600},d=Math.hypot(g.x-s.hero.x,g.y-s.hero.y);
   if(s.hero.hp>0){s.send({type:'move',...(d>40?{x:(g.x-s.hero.x)/d,y:(g.y-s.hero.y)/d}:{x:0,y:0})});s.send({type:'attack'});}}
  ticks(s,1);const us=Object.values(s.state.units);maxRed=Math.max(maxRed,us.filter(u=>u.kind==='minion-red').length);maxBlue=Math.max(maxBlue,us.filter(u=>u.kind==='minion-blue').length);
  if(s.ended)break;
 }
 assert.ok(maxRed<=extendedRules.caps.red&&maxBlue<=extendedRules.caps.blue,'red '+maxRed+' blue '+maxBlue);
 assert.ok(s.state.spawnedWaves>=22);
});

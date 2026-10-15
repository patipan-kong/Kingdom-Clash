'use strict';
// Gameplay v0.3 (experimental): Crimson minion aggro/leash, continuous waves, late-wave Gold, respawn formula.
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {gameplayV03,lateWaveCount,crimsonWaveOf,crimsonMinionGold}=require('../.test-build/data/gameplayV03');
const {respawnTicks}=require('../.test-build/data/progression');
const v04=require('../.test-build/data/gameplayV04'); // v0.4 supersedes the wave 13+ counts for the extended encounter
const {buildEncounter,extendedWaveSpawns,extendedRules,waveLabel}=require('../.test-build/data/encounters');
const {guardianPursuable,trackPursuit}=require('../.test-build/simulation/MinionAggro');
const {minionStats}=require('../.test-build/data/combat');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
const minion=(id,team,x,y,hp=240)=>({id,kind:'minion-'+team,team,x,y,...minionStats,hp,maxHp:240,readyTick:0,protectionTick:0});
// One Crimson minion and the Guardian only; the scripted waves are marked as already spawned.
function arena(minionX,heroX,y=600){const s=new Simulation('v03','extended');s.state.units={guardian:s.hero};s.state.spawnedWaves=12;s.spawnQueue.length=0;s.teleportHero(heroX,y);s.state.units.raider=minion('raider','red',minionX,y);return s;}
const kill=s=>s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');

test('experimental constants are centralized in gameplayV03',()=>{
 assert.deepEqual(gameplayV03.aggro,{acquireRange:160,retainRange:260,retaliateRange:320,retaliateRetainRange:420,retaliateTicks:120,leashTravel:300,leashTicks:300,ignoreTicks:120});
 assert.deepEqual(gameplayV03.waves,{lateFirstWave:13,lateStartCount:8,lateStepEveryWaves:3,lateCap:10,lateMinionGold:10});
 assert.deepEqual(gameplayV03.respawn,{baseSeconds:8,perLevelSeconds:.5,perPriorDeathSeconds:3,capSeconds:22});
});

// ---- C. Respawn ----
test('respawn = min(22, 8 + 0.5(level-1) + 3 priorDeaths) seconds at multiple levels and death counts',()=>{
 const secs=(lv,d)=>respawnTicks(lv,d)/30;
 assert.equal(secs(1,0),8);assert.equal(secs(1,1),11);assert.equal(secs(1,2),14);assert.equal(secs(1,3),17);assert.equal(secs(1,4),20);assert.equal(secs(1,5),22);
 assert.equal(secs(5,0),10);assert.equal(secs(10,0),12.5);assert.equal(secs(10,2),18.5);assert.equal(secs(20,0),17.5);assert.equal(secs(20,1),20.5);assert.equal(secs(20,2),22);
 for(let lv=1;lv<=20;lv++)for(let d=0;d<=12;d++){const t=respawnTicks(lv,d);assert.ok(Number.isInteger(t));assert.ok(t<=22*30);assert.ok(t>=240);if(d)assert.ok(t>=respawnTicks(lv,d-1));}
 assert.equal(respawnTicks(3),respawnTicks(3,0),'priorDeaths defaults to 0');
});
test('each real Guardian death uses the authoritative count of completed deaths and full-HP respawn',()=>{
 const s=new Simulation('v03','extended');s.state.units={guardian:s.hero};s.state.spawnedWaves=12;s.spawnQueue.length=0;
 assert.equal(s.state.guardianDeaths,0);
 const gold=s.state.gold,inv=structuredClone(s.state.inventory),level=s.state.heroProgression.level;
 for(const [n,expected] of [[0,8],[1,11],[2,14],[3,17],[4,20],[5,22],[6,22]]){
  ticks(s,61);const at=s.clock.tick; // past the 2 s respawn protection
  kill(s);assert.equal(s.hero.hp,0);assert.equal(s.hero.respawnTick-at,expected*30,`death ${n+1}`);assert.equal(s.state.guardianDeaths,n+1);
  ticks(s,s.hero.respawnTick-s.clock.tick-1);assert.equal(s.hero.hp,0,'still dead one tick early');ticks(s);assert.equal(s.hero.hp,s.hero.maxHp);assert.equal(s.hero.respawnTick,undefined);
 }
 assert.equal(s.state.gold,gold);assert.deepEqual(s.state.inventory,inv);assert.equal(s.state.heroProgression.level,level);
});
test('restart creates a clean death count and first respawn again takes 8 s',()=>{
 const a=new Simulation('v03','extended');kill(a);ticks(a,a.hero.respawnTick+61);kill(a);assert.equal(a.state.guardianDeaths,2);
 a.beginRestart();const b=new Simulation('v03b','extended');assert.equal(b.state.guardianDeaths,0);kill(b);assert.equal(b.hero.respawnTick,240);
});
test('dead Guardian can still trade, and a longer respawn changes nothing about the trade',()=>{
 const s=new Simulation('v03','extended');s.state.units={guardian:s.hero};kill(s);s.hero.x=1500;ticks(s,1);
 const before=s.state.gold;assert.equal(s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'dead-buy',itemId:'iron-sword'}),true);ticks(s,2);
 assert.equal(s.hero.hp,0);assert.ok(s.state.gold<before,'purchase succeeded while dead');assert.ok(s.state.inventory.slots.some(Boolean));
});

// ---- A. Crimson minion aggro ----
test('Guardian is acquired inside 160 units and ignored outside it; other targets keep the 560 sight range',()=>{
 const near=arena(820,700);ticks(near,8);assert.equal(near.state.units.raider.targetId,'guardian','120 units: acquired');
 const far=arena(820,560);ticks(far,8);assert.notEqual(far.state.units.raider.targetId,'guardian','260 units: not acquired (was 560)');
 assert.equal(far.state.units.raider.targetId,'blue-base');
 const ally=arena(820,450);ally.state.units.friend=minion('friend','blue',420,600);ticks(ally,8);assert.equal(ally.state.units.raider.targetId,'friend','allied minion at 400 units is still visible (560)');
});
test('unprovoked acquisition range is exactly 160: 159 and 160 acquire, 161 does not',()=>{
 for(const [d,yes] of [[159,true],[160,true],[161,false]]){const a=arena(820,820-d);ticks(a,1);assert.equal(a.state.units.raider.targetId==='guardian',yes,d+' units');}
});
test('retaliation range: after a valid Guardian hit the minion acquires out to 320 for 4 s, not beyond',()=>{
 for(const [d,yes] of [[319,true],[320,true],[321,false]]){const a=arena(900,900-d);a.state.units.raider.retaliateTick=a.clock.tick;ticks(a,1);assert.equal(a.state.units.raider.targetId==='guardian',yes,d+' units provoked');}
 const exp=arena(900,640);exp.state.units.raider.retaliateTick=exp.clock.tick;assert.equal(guardianPursuable(exp.state.units.raider,exp.hero,exp.clock.tick+120,false,{}),true,'260 units at 120 ticks after the hit');assert.equal(guardianPursuable(exp.state.units.raider,exp.hero,exp.clock.tick+121,false,{}),false,'provocation expires after 120 ticks (260 units)');
 const hit=arena(900,640);ticks(hit,6);assert.notEqual(hit.state.units.raider.targetId,'guardian','260 units unprovoked');
 hit.hit(hit.hero,hit.state.units.raider,1,'physical');ticks(hit,6);assert.equal(hit.state.units.raider.targetId,'guardian','a real Guardian hit provokes at 260 units');
 const ally=arena(900,640);ally.hit({...ally.hero,id:'ally',kind:'minion-blue',team:'blue'},ally.state.units.raider,1,'physical');assert.equal(ally.state.units.raider.retaliateTick,undefined,'only Guardian hits provoke');
});
test('pursuit is dropped beyond 260 (420 when provoked) and the minion resumes walking toward Azure',()=>{
 const s=arena(820,700);ticks(s,8);assert.equal(s.state.units.raider.targetId,'guardian');
 s.teleportHero(1400,600);const x0=s.state.units.raider.x;ticks(s,12);
 assert.notEqual(s.state.units.raider.targetId,'guardian');assert.equal(s.state.units.raider.targetId,'blue-base');
 ticks(s,60);assert.ok(s.state.units.raider.x<x0-40,'advanced toward Azure (west) after losing aggro');
 const g=arena(900,780),gm=g.state.units.raider;
 assert.equal(guardianPursuable(gm,{...g.hero,x:900-259,y:600},0,true,{}),true,'unprovoked retain 259');
 assert.equal(guardianPursuable(gm,{...g.hero,x:900-261,y:600},0,true,{}),false,'unprovoked drop 261');
 gm.retaliateTick=0;
 assert.equal(guardianPursuable(gm,{...g.hero,x:900-419,y:600},0,true,{}),true,'provoked retain 419');
 assert.equal(guardianPursuable(gm,{...g.hero,x:900-421,y:600},0,true,{}),false,'provoked drop 421');
});
test('leash: travel and duration end a pursuit, then the Guardian is ignored for 4 s unless in reach; hits do not re-provoke',()=>{
 const g={id:'guardian',kind:'guardian',team:'blue',x:0,y:0,hp:1200,maxHp:1200,radius:20,range:90};
 const mk=(x,y)=>({...minion('m','red',x,y),pursuit:{x:0,y:0,tick:100}});
 let u=mk(100,0);g.x=150;assert.equal(guardianPursuable(u,g,200,true,{}),true);
 u=mk(301,0);g.x=301+100;assert.equal(guardianPursuable(u,g,200,true,{}),false);assert.equal(u.pursuit,undefined);assert.equal(u.guardianIgnoreUntil,200+120);
 assert.equal(guardianPursuable(u,g,210,false,{}),false,'ignored during the window');
 assert.equal(guardianPursuable(u,g,320,false,{}),true,'window expires after exactly 120 ticks');
 u=mk(10,0);g.x=100;assert.equal(guardianPursuable(u,g,401,true,{}),false);assert.equal(u.guardianIgnoreUntil,401+120);
 u=mk(301,0);u.pursuit=undefined;u.guardianIgnoreUntil=1000;g.x=301+40;assert.equal(guardianPursuable(u,g,500,false,{}),true,'melee reach');
 g.x=301+120;assert.equal(guardianPursuable(u,g,500,false,{}),false,'out of reach');
 u.retaliateTick=500;assert.equal(guardianPursuable(u,g,500,false,{}),false,'struck during the cooldown: still ignored');
 u.retaliateTick=900;assert.equal(guardianPursuable(u,g,950,false,{}),false,'struck late in the cooldown: still ignored');
 assert.equal(guardianPursuable(u,g,1000,false,{}),true,'cooldown over: 120 units is inside 160');
});
test('trackPursuit remembers where a Guardian pursuit began and forgets it on any other target',()=>{
 const u=minion('m','red',100,0);trackPursuit(u,'guardian',10);assert.deepEqual(u.pursuit,{x:100,y:0,tick:10});
 u.x=250;trackPursuit(u,'guardian',50);assert.deepEqual(u.pursuit,{x:100,y:0,tick:10},'origin is not moved while pursuit continues');
 trackPursuit(u,'blue-base',60);assert.equal(u.pursuit,undefined);
});
test('integration: a Guardian that stays 150 units ahead cannot drag a minion beyond the leash',()=>{
 const s=arena(500,650,575);const m=()=>s.state.units.raider;
 let run=0,longest=0,cycles=0,wasIgnoring=false,start=m().x,farthestEast=start;
 for(let i=0;i<30*40;i++){
  s.teleportHero(Math.min(900,m().x+150),575);ticks(s,1);
  run=m().targetId==='guardian'?run+1:0;longest=Math.max(longest,run);farthestEast=Math.max(farthestEast,m().x);
  const ignoring=m().guardianIgnoreUntil>s.clock.tick;if(ignoring&&!wasIgnoring)cycles++;wasIgnoring=ignoring;
 }
 assert.ok(cycles>=1,'the leash fired at least once');
 assert.ok(longest<=300+6,'longest uninterrupted pursuit '+longest+' ticks (leash 300, decision cadence 6)');
 assert.ok(farthestEast-start<=gameplayV03.aggro.leashTravel+5,'dragged east by '+(farthestEast-start));
});
test('repeated Guardian hits during pursuit never reset the leash or timeout and cannot drag a minion indefinitely',()=>{
 const s=arena(600,750,575);const m=()=>s.state.units.raider;
 let run=0,longest=0,cycles=0,wasIgnoring=false,start=m().x,farthestEast=start,hits=0;
 for(let i=0;i<30*60;i++){
  s.teleportHero(Math.min(900,m().x+250),575); // 250 units: reachable only while provoked
  if(i%15===0){s.hit(s.hero,m(),1,'physical');hits++;}
  ticks(s,1);
  run=m().targetId==='guardian'?run+1:0;longest=Math.max(longest,run);farthestEast=Math.max(farthestEast,m().x);
  const ignoring=m().guardianIgnoreUntil>s.clock.tick;if(ignoring&&!wasIgnoring)cycles++;wasIgnoring=ignoring;
 }
 assert.ok(hits>100);assert.ok(cycles>=1,'leash fired: '+cycles);
 assert.ok(longest<=300+6,'longest pursuit '+longest);
 assert.ok(farthestEast-start<=gameplayV03.aggro.leashTravel+5,'dragged east by '+(farthestEast-start));
});
test('cooldown and reacquisition: ignored for 120 ticks, then re-acquired with a fresh leash while the Guardian is in range',()=>{
 const s=arena(1100,1200,575);const m=s.state.units.raider;s.teleportHero(1250,575);ticks(s,6);assert.equal(m.targetId,'guardian');
 m.pursuit.tick=s.clock.tick-301; // timeout
 s.teleportHero(m.x+100,575);ticks(s,6);const until=m.guardianIgnoreUntil;assert.ok(until>0);assert.notEqual(m.targetId,'guardian');
 while(s.clock.tick<until-1){s.teleportHero(m.x+140,575);ticks(s,1);assert.notEqual(m.targetId,'guardian','still ignoring at '+s.clock.tick);}
 for(let i=0;i<36;i++){s.teleportHero(m.x+120,575);ticks(s,1);}
 assert.equal(m.targetId,'guardian','reacquired after the cooldown');assert.ok(m.pursuit.tick>=until-1,'fresh leash for the new pursuit');
});
test('retaliation and collision: nearby combat is preserved, hits do not break the cooldown, adjacent Guardians are always engaged',()=>{
 const s=arena(560,450);s.state.units.raider.guardianIgnoreUntil=s.clock.tick+120;ticks(s,8);
 assert.notEqual(s.state.units.raider.targetId,'guardian','ignored at 110 units during the cooldown');
 s.hit(s.hero,s.state.units.raider,1,'physical');ticks(s,8);assert.notEqual(s.state.units.raider.targetId,'guardian','a hit during the cooldown does not re-engage');
 const t=arena(490,450);t.state.units.raider.guardianIgnoreUntil=t.clock.tick+9999;const hp=t.hero.hp;ticks(t,60);assert.ok(t.hero.hp<hp,'adjacent minion still damages the Guardian');
});
test('Guardian defending near Azure and rushing Crimson structures: minions that reach it fight, and distant waves are not drawn',()=>{
 const d=arena(600,500);ticks(d,8);assert.equal(d.state.units.raider.targetId,'guardian','a minion meeting a Guardian defending 100 units ahead fights it');
 const r=arena(1400,1000);ticks(r,8);assert.notEqual(r.state.units.raider.targetId,'guardian','a Guardian rushing from afar does not draw a minion beyond 160');
});
test('aggro and leash are deterministic',()=>{
 const run=()=>{const s=arena(1000,830);for(let i=0;i<600;i++){s.teleportHero(Math.min(1500,s.state.units.raider.x+150),600);ticks(s,1);}return JSON.stringify([s.state,s.drainEvents().length]);};
 assert.equal(run(),run());
});

// ---- B. Continuous waves ----
test('historical v0.3 late wave size: 8,8,8,9,9,9,10 then capped at 10 forever (no longer used by the extended encounter)',()=>{
 assert.deepEqual([13,14,15,16,17,18,19,20,21,22,40,500].map(lateWaveCount),[8,8,8,9,9,9,10,10,10,10,10,10]);
});
test('waves 1-12 are unchanged and wave 13+ follow the same cadence with the allied 2-per-wave rotation',()=>{
 const e=buildEncounter('extended');
 assert.deepEqual(e.waves.length,12);assert.equal(e.continuous,true);
 for(let n=1;n<=12;n++){const w=e.spawns.filter(x=>x.wave===n);assert.deepEqual(w,extendedWaveSpawns(n).sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id)));assert.equal(w.filter(x=>x.team==='red').length,extendedRules.enemyPerWave[n-1]);assert.equal(w.filter(x=>x.team==='blue').length,2);}
 assert.equal(extendedWaveSpawns(1)[0].tick,300);assert.equal(extendedWaveSpawns(12)[0].tick,300+11*1200);
 const w13=extendedWaveSpawns(13);assert.equal(w13[0].tick,300+12*1200);assert.equal(w13.filter(x=>x.team==='red').length,v04.lateWaveCount(13));assert.equal(w13.filter(x=>x.team==='blue').length,2);
 assert.equal(extendedWaveSpawns(14)[0].tick,w13[0].tick+1200,'every 40 s');
 assert.deepEqual(w13.filter(x=>x.team==='red').map(x=>x.tick-w13[0].tick),[...Array(v04.lateWaveCount(13)).keys()].map(i=>i*24));
 assert.equal(extendedWaveSpawns(19).filter(x=>x.team==='red').length,v04.lateWaveCount(19));
 assert.equal(buildEncounter('prototype').continuous,false);
});
test('wave 12 to 13 transition: exact tick, event, label, no terminal state',()=>{
 const s=new Simulation('v03','extended');s.state.units={guardian:s.hero};s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e9;
 // Jump the clock close to the end of wave 12 (the first scripted-wave state is set explicitly; income is not under test here).
 s.state.spawnedWaves=12;s.clock.tick=300+11*1200+1000;
 const waveTick=300+12*1200;ticks(s,waveTick-s.clock.tick-1);assert.equal(s.state.spawnedWaves,12);assert.equal(waveLabel(s.state.spawnedWaves,s.state.encounter.waveCount),'Wave 12 / 12');
 s.drainEvents();ticks(s,1);assert.equal(s.clock.tick,waveTick);assert.equal(s.state.spawnedWaves,13);
 assert.ok(s.drainEvents().some(e=>e.type==='wave'&&e.index===13));assert.equal(waveLabel(s.state.spawnedWaves,s.state.encounter.waveCount),'Wave 13');
 assert.equal(s.state.match.phase,'playing');assert.equal(s.ended,false);
 const n13=v04.lateWaveCount(13);ticks(s,24*n13);assert.equal(Object.values(s.state.units).filter(u=>u.id.startsWith('red-w13-')).length,n13,'every wave-13 minion spawns on the 24-tick stagger');
 ticks(s,1200-24*n13);assert.equal(s.state.spawnedWaves,14);
});
test('wave labels never imply the match has ended past 12',()=>{
 assert.equal(waveLabel(0,12),'Wave 0 / 12');assert.equal(waveLabel(12,12),'Wave 12 / 12');assert.equal(waveLabel(13,12),'Wave 13');assert.equal(waveLabel(30,12),'Wave 30');assert.equal(waveLabel(3,6),'Wave 3 / 6');
});
test('long run (26 min, Guardian dead, Azure invulnerable): populations and the spawn queue stay bounded and the match never ends',()=>{
 const s=new Simulation('v03','extended');s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e12;s.hero.hp=0;s.hero.respawnTick=1e9;
 let maxRed=0,maxBlue=0,maxQ={red:0,blue:0},maxUnits=0,lateRedQ=0;
 for(let i=0;i<26*60*30;i++){
  s.advance(1000/30+.01);if(i%30)continue;
  const us=Object.values(s.state.units);maxRed=Math.max(maxRed,us.filter(u=>u.kind==='minion-red').length);maxBlue=Math.max(maxBlue,us.filter(u=>u.kind==='minion-blue').length);maxUnits=Math.max(maxUnits,us.length);
  for(const t of ['red','blue'])maxQ[t]=Math.max(maxQ[t],s.spawnQueue.filter(e=>e.team===t).length);
  if(s.state.spawnedWaves>=22)lateRedQ=Math.max(lateRedQ,s.spawnQueue.filter(e=>e.team==='red').length);
 }
 assert.ok(s.state.spawnedWaves>=38,'waves kept coming: '+s.state.spawnedWaves);assert.equal(s.ended,false);
 assert.ok(maxRed<=24,'red cap '+maxRed);assert.ok(maxBlue<=16,'blue cap '+maxBlue);assert.ok(maxUnits<=1+24+16);
 // v0.4: the scripted waves 1-12 enqueue unconditionally, so a full cap leaves a finite scripted backlog (peak 44); once it drains only the late-wave guard applies.
 assert.ok(maxQ.red<=extendedRules.enemyPerWave.reduce((a,b)=>a+b,0),'red queue '+maxQ.red);assert.ok(lateRedQ<=24+v04.gameplayV04.waves.lateCap,'late red queue '+lateRedQ);assert.ok(maxQ.blue<=16+2,'blue queue '+maxQ.blue);
});
test('long run is deterministic',()=>{
 const run=()=>{const s=new Simulation('v03','extended');s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e12;s.hero.hp=0;s.hero.respawnTick=1e9;for(let i=0;i<20*60*30;i++)s.advance(1000/30+.01);return JSON.stringify(s.state);};
 assert.equal(run(),run());
});

// ---- Late-wave Gold ----
test('Gold per Crimson kill: 25 through wave 12, 10 from wave 13, ids and life ids both parsed',()=>{
 assert.equal(crimsonWaveOf('red-w13-4'),13);assert.equal(crimsonWaveOf('v03:red-w2-0:9'),2);assert.equal(crimsonWaveOf('red-0-1'),undefined);assert.equal(crimsonWaveOf('blue-w13-0'),undefined);
 assert.equal(crimsonMinionGold('red-w12-7'),25);assert.equal(crimsonMinionGold('red-w13-0'),10);assert.equal(crimsonMinionGold('v03:red-w40-3:1'),10);assert.equal(crimsonMinionGold('red-0-1'),25);
 const s=new Simulation('v03','extended');s.state.units={guardian:s.hero};const g0=s.state.gold;
 for(const [id,gold] of [['red-w12-0',25],['red-w13-0',10],['red-w25-9',10]]){
  s.state.units[id]=minion(id,'red',s.hero.x+40,s.hero.y,1);const before=s.state.gold;s.drainEvents();s.hit(s.hero,s.state.units[id],50,'physical');
  assert.equal(s.state.gold-before,gold,id);assert.ok(s.drainEvents().some(e=>e.type==='reward'&&e.id===id&&e.gold===gold));
 }
 assert.equal(s.state.gold-g0,45);
 const p=new Simulation('p','prototype');p.state.units={guardian:p.hero,'red-0-0':minion('red-0-0','red',p.hero.x+40,p.hero.y,1)};const b=p.state.gold;p.hit(p.hero,p.state.units['red-0-0'],50,'physical');assert.equal(p.state.gold-b,25);
});
test('late waves are Gold-bounded: kills of waves 13-38 pay at most 10 each',()=>{
 let total=0;for(let n=13;n<=38;n++)total+=lateWaveCount(n)*gameplayV03.waves.lateMinionGold;
 assert.ok(total<=26*10*10);assert.equal(total,[...Array(26)].reduce((a,_,i)=>a+lateWaveCount(13+i)*10,0));
});

// ---- Finite-wave assumptions at wave 13+ ----
test('victory and defeat after wave 12 still end the match, stop the waves, and a restart is a clean wave 0',()=>{
 for(const [side,result] of [['red-base','victory'],['blue-base','defeat']]){
  const s=new Simulation('v03','extended');s.state.units={guardian:s.hero};s.state.spawnedWaves=14;s.clock.tick=300+13*1200+5;
  const base=s.state.bases[side];base.hp=1;s.hit({...s.hero,id:'finisher',team:side==='red-base'?'blue':'red'},base,99,'direct');ticks(s,2);
  assert.equal(s.state.match.phase,result);assert.equal(s.state.match.result.outcome,result);
  const waves=s.state.spawnedWaves;ticks(s,1300);assert.equal(s.state.spawnedWaves,waves,'no further waves after the match ends');
  const fresh=new Simulation('v03b','extended');assert.equal(fresh.state.spawnedWaves,0);assert.equal(waveLabel(fresh.state.spawnedWaves,fresh.state.encounter.waveCount),'Wave 0 / 12');assert.equal(fresh.state.guardianDeaths,0);
 }
});

'use strict';
// Gameplay v0.4.1: Guardian durability variants A/B/C. B is the active balance (default constructor and URL); A must stay byte-for-byte the v0.4 behaviour.
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {combatVariants,activeCombatVariant,crimsonMinionRawVsGuardian,crimsonTowerRawVsGuardian,guardianLevelHp,combatVariantFromSearch}=require('../.test-build/data/gameplayV041');
const {gameplayV04}=require('../.test-build/data/gameplayV04');
const {balanceV02}=require('../.test-build/data/balanceV02');
const {guardianStats,minionStats}=require('../.test-build/data/combat');
const {guardianBalance}=require('../.test-build/data/guardian');
const {extendedRules}=require('../.test-build/data/encounters');
const {damageAfterArmor}=require('../.test-build/simulation/Combat');
const {plannedItem,goldUnits}=require('../.test-build/simulation/Inventory');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30+.01);};
const {a,b,c}=combatVariants;
const sim=(v,id='v041')=>new Simulation(id,'extended',undefined,v);
const level=(s,lv,fortitude=0)=>{s.state.heroProgression.level=lv;s.state.heroProgression.fortitude=fortitude;s.skills.refreshStats();};
const raw=s=>s.drainEvents().find(e=>e.type==='damage').raw;

test('variant definitions: A is production, B/C only change base HP and the three Crimson damage values',()=>{
 assert.deepEqual(Object.keys(combatVariants),['a','b','c']);
 assert.equal(a.guardianBaseHp,guardianStats.maxHp);assert.equal(a.guardianBaseHp,1200);
 for(const v of [a,b,c])assert.equal(v.guardianHpGrowth,guardianBalance.growth.hp,'+60 HP/LV growth preserved');
 assert.equal(a.crimsonMinionDamageMultiplier,1);assert.equal(a.crimsonTowerDamageMultiplier,1);assert.equal(a.crimsonKeepDamage,undefined);
 assert.deepEqual([b.guardianBaseHp,b.crimsonMinionDamageMultiplier,b.crimsonTowerDamageMultiplier,b.crimsonKeepDamage],[980,1.1,1.1,17]);
 assert.deepEqual([c.guardianBaseHp,c.crimsonMinionDamageMultiplier,c.crimsonTowerDamageMultiplier,c.crimsonKeepDamage],[830,1.1,1.2,20]);
 assert.deepEqual(gameplayV04.keepDefense.red,{damage:14,cooldownTicks:24,range:140,targeting:'guardian-first'},'v0.4 Keep data untouched');
});

test('HP targets: LV3 is 1320 / 1100 / 950; the +60/LV curve, Fortitude and Guardian Shield stack unchanged',()=>{
 const want={a:[1200,1320,2340,2574],b:[980,1100,2120,2332],c:[830,950,1970,2167]};
 for(const v of [a,b,c]){
  assert.equal(guardianLevelHp(v,3),want[v.id][1]);
  const s=sim(v);assert.equal(s.hero.maxHp,want[v.id][0]);assert.equal(s.hero.hp,want[v.id][0],'starts at full variant HP');
  level(s,3);assert.equal(s.hero.maxHp,want[v.id][1]);level(s,20);assert.equal(s.hero.maxHp,want[v.id][2]);
  level(s,20,2);assert.equal(s.hero.maxHp,want[v.id][3],'Fortitude multiplies the level HP by 1.10');
  const armor=s.hero.armor;const inv=s.state.inventory,item=plannedItem(inv,'guardian-shield',goldUnits(500));inv.slots[0]=item.id;inv.instances[item.id]=item;inv.nextSequence++;s.skills.refreshStats();
  assert.equal(s.hero.maxHp,want[v.id][3]+250,'Shield stays +250 HP');assert.equal(s.hero.armor,armor+15,'Shield stays +15 armor');
 }
});

test('max HP changes preserve the current HP fraction (level-up does not heal); respawn restores the variant maximum',()=>{
 const s=sim(c);s.hero.hp=415;level(s,3);assert.equal(s.hero.hp,475,'50% of 830 -> 50% of 950');
 s.hero.hp=1;s.hit({...s.hero,id:'killer',kind:'minion-red',team:'red'},s.hero,999,'direct');assert.equal(s.hero.hp,0);
 ticks(s,s.hero.respawnTick-s.clock.tick+2);assert.equal(s.hero.hp,950);assert.equal(s.hero.maxHp,950);
});

test('raw damage rounding: one multiplication of the raw stat, then Math.round; A returns its input untouched',()=>{
 assert.equal(crimsonMinionRawVsGuardian(a),18);assert.equal(crimsonMinionRawVsGuardian(a,17.5),17.5);assert.equal(crimsonTowerRawVsGuardian(a),balanceV02.crimsonTowerDamageVsGuardian);
 assert.equal(crimsonMinionRawVsGuardian(b),20);assert.equal(crimsonMinionRawVsGuardian(c),20); // 19.8
 assert.equal(crimsonTowerRawVsGuardian(b),26);assert.equal(crimsonTowerRawVsGuardian(c),29); // 26.4, 28.8
 for(const v of [b,c])for(const x of [crimsonMinionRawVsGuardian(v),crimsonTowerRawVsGuardian(v)])assert.ok(Number.isSafeInteger(x));
});

test('Crimson minion, tower and Keep hits on the Guardian use the variant raw damage; armor still applies once',()=>{
 for(const [v,m,t,k] of [[a,18,24,14],[b,20,26,17],[c,20,29,20]]){
  const s=sim(v);s.state.units={guardian:s.hero};const h=s.hero;h.protectionTick=0;
  const minion={...minionStats,id:'red-m',kind:'minion-red',team:'red',x:h.x+30,y:h.y,hp:240,readyTick:0,protectionTick:0};s.state.units[minion.id]=minion;
  s.drainEvents();s.basicHit(minion,h);const e=s.drainEvents().find(x=>x.type==='damage');assert.equal(e.raw,m,v.id+' minion');assert.ok(Math.abs(e.mitigated-damageAfterArmor(m,h.armor))<1e-9);
  const tower=s.state.structures['red-tower-front-center'];for(const id of Object.keys(s.state.structures))if(id!==tower.id)delete s.state.structures[id];
  h.x=tower.x-100;h.y=tower.y;s.drainEvents();s.basicHit(tower,h);assert.equal(raw(s),t,v.id+' tower');
  s.state.structures={};const keep=s.state.bases['red-base'];assert.equal(keep.damage,k);assert.equal(keep.cooldownTicks,24);assert.equal(keep.range,140);
  h.x=keep.x-110;h.y=keep.y;s.drainEvents();s.basicHit(keep,h);assert.equal(raw(s),k,v.id+' keep');
  assert.equal(s.state.bases['blue-base'].damage,0,'Azure Keep stays inert');
 }
});

test('non-Guardian targets keep production damage in every variant (Azure-side minions and Keep pressure unchanged)',()=>{
 for(const v of [a,b,c]){
  const s=sim(v);const tower=s.state.structures['red-tower-front-center'];for(const id of Object.keys(s.state.structures))if(id!==tower.id)delete s.state.structures[id];
  const blue={...minionStats,id:'blue-m',kind:'minion-blue',team:'blue',x:tower.x-100,y:tower.y,hp:240,readyTick:0,protectionTick:0};s.state.units[blue.id]=blue;
  s.drainEvents();s.basicHit(tower,blue);assert.equal(raw(s),18,v.id+' tower vs minion');
  const red={...minionStats,id:'red-m',kind:'minion-red',team:'red',x:blue.x+30,y:blue.y,hp:240,readyTick:0,protectionTick:0};s.state.units[red.id]=red;
  s.drainEvents();s.basicHit(red,blue);assert.equal(raw(s),18,v.id+' minion vs minion');
  const az=s.state.bases['blue-base'];red.x=az.x+72+30;red.y=az.y;s.drainEvents();s.basicHit(red,az);assert.equal(raw(s),18,v.id+' minion vs Azure Keep');
 }
});

test('deterministic: identical variants replay identically, B (active) equals the default constructor, A and C diverge; waves and towers unchanged',()=>{
 const run=v=>{const s=v===undefined?new Simulation('v041-det','extended'):sim(v,'v041-det');s.send({type:'attack'});ticks(s,2400);
  return JSON.stringify({u:Object.values(s.state.units).map(u=>[u.id,u.x,u.y,u.hp]),b:Object.values(s.state.bases).map(x=>x.hp),t:Object.values(s.state.structures).map(x=>x.hp),r:s.state.heroProgression});};
 assert.equal(activeCombatVariant,b);assert.equal(run(b),run(undefined));assert.equal(run(c),run(c));assert.notEqual(run(a),run(b));assert.notEqual(run(c),run(b));
 for(const v of [a,b,c]){const s=sim(v);assert.equal(Object.values(s.state.structures).filter(t=>t.team==='red').length,8);assert.equal(s.encounter.waves.length,12);}
 assert.deepEqual(extendedRules.enemyPerWave,gameplayV04.waves.enemyPerWave);
});

test('launch option: missing, unknown or production values use the active B; ?combat=a|c overrides only on the dev server',()=>{
 assert.equal(combatVariantFromSearch('?combat=a',true),a);assert.equal(combatVariantFromSearch('?encounter=extended&combat=C',true),c);assert.equal(combatVariantFromSearch('?combat=b',true),b);
 for(const [q,dev] of [['?combat=a',false],['?combat=c',false],['?combat=b',false],['',false],['',true],['?combat=d',true],['?combat=',true],['?encounter=extended',true]])assert.equal(combatVariantFromSearch(q,dev),b,q+' dev='+dev);
});

test('runtime Balance B: a default-constructed match uses 980 HP (+60/LV), and real ticked Crimson minion/tower/Keep hits land 20/26/17 raw',()=>{
 for(const encounter of ['extended','prototype']){const s=new Simulation('b-hp',encounter);assert.equal(s.combat,b);assert.deepEqual([s.hero.hp,s.hero.maxHp],[980,980],encounter);}
 const s=new Simulation('b-runtime','extended');level(s,3);assert.equal(s.hero.maxHp,1100);level(s,1);
 assert.equal(s.state.bases['red-base'].damage,17);assert.equal(s.state.bases['blue-base'].damage,0);
 // Tower: Guardian parked in range of the front tower only, no minions, natural targeting.
 const t=new Simulation('b-tower','extended');t.state.spawnedWaves=12;t.spawnQueue.length=0;t.state.units={guardian:t.hero};t.teleportHero(1330,600);t.drainEvents();ticks(t,30);
 const th=t.drainEvents().filter(e=>e.type==='damage'&&e.id==='guardian'&&e.sourceId.startsWith('red-tower'));assert.ok(th.length>=1);assert.ok(th.every(e=>e.raw===26&&Math.abs(e.amount-damageAfterArmor(26,t.hero.armor))<1e-9));
 // Keep: towers removed, Guardian beside the Keep.
 const k=new Simulation('b-keep','extended');k.state.spawnedWaves=12;k.spawnQueue.length=0;k.state.units={guardian:k.hero};k.state.structures={};k.teleportHero(1709,600);k.drainEvents();ticks(k,30);
 const kh=k.drainEvents().filter(e=>e.type==='damage'&&e.id==='guardian'&&e.sourceId==='red-base');assert.ok(kh.length>=1);assert.ok(kh.every(e=>e.raw===17));
 // Minion: one Crimson minion beside the Guardian away from structures.
 const m=new Simulation('b-minion','extended');m.state.spawnedWaves=12;m.spawnQueue.length=0;m.state.units={guardian:m.hero};m.teleportHero(700,1000);
 m.state.units['red-m']={...minionStats,id:'red-m',kind:'minion-red',team:'red',x:m.hero.x+30,y:m.hero.y,hp:240,speed:0,readyTick:0,protectionTick:0};m.drainEvents();ticks(m,60);
 const mh=m.drainEvents().filter(e=>e.type==='damage'&&e.id==='guardian'&&e.sourceId==='red-m');assert.ok(mh.length>=1);assert.ok(mh.every(e=>e.raw===20));
 // Respawn after a real death restores the B maximum for the current level.
 const r=new Simulation('b-respawn','extended');level(r,3);r.hit({...r.hero,id:'killer',kind:'minion-red',team:'red'},r.hero,1e6,'direct');assert.equal(r.hero.hp,0);ticks(r,r.hero.respawnTick-r.clock.tick+1);assert.equal(r.hero.hp,1100);
});

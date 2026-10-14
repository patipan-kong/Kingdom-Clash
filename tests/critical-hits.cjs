'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {initialCriticalRandom,criticalRoll,equipmentCritBasisPoints}=require('../.test-build/simulation/CriticalHits');
const {initialInventory,plannedItem,goldUnits}=require('../.test-build/simulation/Inventory');
const {artifacts}=require('../.test-build/data/artifacts');
const {guardianRanks}=require('../.test-build/data/guardian');
const {minionStats}=require('../.test-build/data/combat');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function own(inv,itemId='ruby-gem'){const item=plannedItem(inv,itemId,goldUnits(itemId==='ruby-gem'?150:200));inv.slots[inv.slots.indexOf(null)]=item.id;inv.instances[item.id]=item;inv.nextSequence++;return item.id;}
function duel(seed=2000,gems=1){const s=new Simulation('crit-test','prototype',seed);s.state.units={guardian:s.hero};s.hero.x=820;s.hero.y=590;for(let i=0;i<gems;i++)own(s.state.inventory);const e={...minionStats,id:'crit-enemy',kind:'minion-red',team:'red',x:860,y:590,hp:10000,maxHp:10000,readyTick:999999,protectionTick:0,speed:0};s.state.units[e.id]=e;s.skills.refreshStats();return{s,e};}
test('uint32 LCG has an explicit seed, known sequence and reproducible rolls including seed zero',()=>{
 const r=initialCriticalRandom(0);assert.equal(criticalRoll(r),1013904223/4294967296);assert.equal(r.rolls,1);assert.deepEqual(r,{seed:0,state:1013904223,rolls:1});
 const a=initialCriticalRandom(2000),b=initialCriticalRandom(2000);for(let i=0;i<100;i++)assert.equal(criticalRoll(a),criticalRoll(b));assert.deepEqual(a,b);
 for(const seed of [-1,NaN,1.5,4294967296])assert.throws(()=>initialCriticalRandom(seed));
});
test('Ruby gives ten additive percentage points, duplicate stacking is exact, chance caps at 100%',()=>{
 const inv=initialInventory('chance');assert.equal(equipmentCritBasisPoints(inv),0);for(let i=1;i<=6;i++){own(inv);assert.equal(equipmentCritBasisPoints(inv),i*1000);}
 const fixture=structuredClone(artifacts);fixture.find(i=>i.id==='ruby-gem').modifiers[0].fraction=.25;assert.equal(equipmentCritBasisPoints(inv,fixture),10000); // Cap fixture, no alteration of original +10% catalog.
 const other=initialInventory('flame-chance');own(other,'flame-blade');assert.equal(equipmentCritBasisPoints(other),1000);
});
test('a confirmed Guardian strike rolls once, doubles raw physical damage before armor/shields',()=>{
 const {s,e}=duel();e.armor=100;e.shield={remaining:30,expiresTick:9999,zoneId:'fixture'};
 // Direct basic-resolution fixture keeps the shield intact for mitigation; normal expiry is independently covered.
 s.basicHit(s.hero,e);const damage=s.drainEvents().find(e=>e.type==='damage');assert.equal(damage.raw,160);assert.equal(damage.critical,true);assert.equal(damage.mitigated,80);assert.equal(damage.absorbed,30);assert.equal(damage.amount,50);assert.equal(e.hp,9950);assert.equal(s.state.criticalRandom.rolls,1);
});
test('fully shield-absorbed valid strike still consumes one roll and truthful HP loss is zero',()=>{
 const {s,e}=duel();e.shield={remaining:1000,expiresTick:9999,zoneId:'fixture'};s.basicHit(s.hero,e);const event=s.drainEvents().find(e=>e.type==='damage');assert.equal(event.amount,0);assert.equal(event.critical,true);assert.equal(e.hp,10000);assert.equal(s.state.criticalRandom.rolls,1);
});
test('zero crit consumes no RNG and preserves ordinary damage event shape',()=>{
 const {s,e}=duel(2000,0),before=structuredClone(s.state.criticalRandom);s.basicHit(s.hero,e);const damage=s.drainEvents()[0];assert.equal(damage.raw,80);assert.equal(damage.amount,80);assert.equal(Object.hasOwn(damage,'critical'),false);assert.deepEqual(s.state.criticalRandom,before);
});
test('noncritical eligible strike consumes one roll without adding a false crit indicator',()=>{
 const {s,e}=duel(0);s.basicHit(s.hero,e);const damage=s.drainEvents()[0];assert.equal(damage.raw,80);assert.equal(Object.hasOwn(damage,'critical'),false);assert.equal(s.state.criticalRandom.rolls,1);
});
test('invalid target, range, LOS, protection, dead source and ended match never consume rolls',()=>{
 for(const invalidate of [(s,e)=>e.hp=0,(s,e)=>e.team='blue',(s,e)=>e.x=1100,(s,e)=>e.protectionTick=10,(s,e)=>s.hero.hp=0,(s,e)=>s.state.match.result={outcome:'victory'},(s,e)=>s.state.structures.wall={...s.state.bases['blue-base'],id:'wall',kind:'wall',x:840,y:590,columns:1,rows:1}]){
  const {s,e}=duel(),rng=structuredClone(s.state.criticalRandom);invalidate(s,e);s.basicHit(s.hero,e);assert.deepEqual(s.state.criticalRandom,rng);assert.equal(s.drainEvents().length,0);
 }
});
test('windup, invalidated windup, pause cancellation and cast interruption consume no premature rolls',()=>{
 const {s,e}=duel();s.send({type:'attack'});ticks(s,1);assert.equal(s.state.criticalRandom.rolls,0);assert.ok(s.hero.strike);e.x=1100;ticks(s,10);assert.equal(s.state.criticalRandom.rolls,0);
 const a=duel().s;a.send({type:'attack'});ticks(a);a.setPaused(true);ticks(a,20);assert.equal(a.state.criticalRandom.rolls,0);assert.equal(a.hero.strike,undefined);
 const b=duel().s;b.send({type:'attack'});ticks(b);b.state.heroProgression.ranks.taunt=1;b.send({type:'cast',requestId:'interrupt-basic',skill:'taunt'});ticks(b);assert.equal(b.state.criticalRandom.rolls,0);assert.equal(b.hero.strike,undefined);
});
test('skills, ordinary hit calls and direct/status damage never roll or crit',()=>{
 const {s,e}=duel();s.state.heroProgression.ranks.bash=1;s.send({type:'cast',requestId:'bash',skill:'bash'});ticks(s,10);assert.equal(s.state.criticalRandom.rolls,0);const d=s.drainEvents().filter(e=>e.type==='damage');assert.equal(d.length,1);assert.equal(d[0].raw,guardianRanks.bash.damage[0]);assert.equal(Object.hasOwn(d[0],'critical'),false);
 s.hit(s.hero,e,25,'magic');s.hit(s.hero,e,25,'direct');assert.equal(s.state.criticalRandom.rolls,0);assert.ok(s.drainEvents().every(e=>!e.critical));
});
test('minion and tower basic attacks preserve raw damage and never consume Guardian RNG',()=>{
 const {s,e}=duel();for(const kind of ['minion-blue','tower']){const source={...s.hero,id:kind,kind,damage:18};s.basicHit(source,e);const d=s.drainEvents()[0];assert.equal(d.raw,18);assert.equal(Object.hasOwn(d,'critical'),false);}assert.equal(s.state.criticalRandom.rolls,0);
});
test('existing structural target eligibility is retained for critical Guardian basic attacks',()=>{
 const {s}=duel();const tower={...s.hero,id:'tower-fixture',kind:'tower',team:'red',x:860,y:590,hp:650,maxHp:650,armor:0};s.state.structures[tower.id]=tower;s.basicHit(s.hero,tower);assert.equal(s.drainEvents()[0].critical,true);assert.equal(tower.hp,554);
 const a=duel().s,base=a.state.bases['red-base'];a.hero.x=base.x-150;a.hero.y=base.y;a.basicHit(a.hero,base);assert.equal(a.drainEvents()[0].critical,true);assert.equal(base.hp,2904);
});
test('critical death/reward pipeline credits Guardian once with unchanged reward quantities',()=>{
 const {s,e}=duel();e.hp=100;s.send({type:'attack'});ticks(s,7);const events=s.drainEvents();assert.ok(events.some(e=>e.type==='damage'&&e.critical&&e.amount===100&&e.sourceId==='guardian'));assert.equal(s.state.gold,275);assert.equal(s.state.kills,1);assert.equal(events.find(e=>e.type==='xp').amount,60);assert.equal(events.filter(e=>e.type==='reward').length,1);assert.equal(events.find(e=>e.type==='reward').gold,25);assert.equal(s.state.criticalRandom.rolls,1);
});
test('critical strike command replay is identical at 30/60 FPS and the same explicit seed',()=>{
 const a=duel(2000),b=duel(2000);for(const {s} of [a,b])s.send({type:'attack'});for(let i=0;i<120;i++)a.s.advance(1000/30);for(let i=0;i<240;i++)b.s.advance(1000/60);assert.deepEqual(a.s.state,b.s.state);assert.deepEqual(a.s.drainEvents(),b.s.drainEvents());assert.ok(a.s.state.criticalRandom.rolls>1);
});
test('Ruby authoritative buy/sell retains original price, duplicates, paid basis and replay protection',()=>{
 const s=new Simulation('ruby','extended',2000);s.hero.x=450;s.hero.y=600;s.skills.refreshStats();const command={type:'buy-item',matchId:'ruby',heroId:'guardian',requestId:'buy',itemId:'ruby-gem'};s.send(command);s.send(command);ticks(s);assert.equal(s.state.gold,100);assert.equal(equipmentCritBasisPoints(s.state.inventory),1000);const id=s.state.inventory.slots[0];assert.equal(s.state.inventory.instances[id].paidGoldUnits,goldUnits(150));
 s.send({type:'sell-item',matchId:'ruby',heroId:'guardian',requestId:'sale',instanceId:id});ticks(s);assert.equal(s.state.gold,190);assert.equal(equipmentCritBasisPoints(s.state.inventory),0);assert.equal(s.state.criticalRandom.rolls,0);
});
test('RNG/inventory survive death and respawn, sale removes chance, Restart starts clean',()=>{
 const {s,e}=duel();s.basicHit(s.hero,e);const rng=structuredClone(s.state.criticalRandom),inv=structuredClone(s.state.inventory);s.hit(e,s.hero,99999,'direct');ticks(s,s.hero.respawnTick-s.clock.tick);assert.deepEqual(s.state.criticalRandom,rng);assert.deepEqual(s.state.inventory,inv);
 const fresh=new Simulation('fresh','prototype',2000);assert.equal(equipmentCritBasisPoints(fresh.state.inventory),0);assert.deepEqual(fresh.state.criticalRandom,initialCriticalRandom(2000));
});
test('Ruby sale during death retains zero HP, removes chance and leaves RNG state intact',()=>{
 const s=new Simulation('dead-ruby','extended',2000);s.hero.hp=0;s.hero.x=1500;s.hero.respawnTick=10000;const id=own(s.state.inventory);const before=structuredClone(s.state.criticalRandom);s.send({type:'sell-item',matchId:'dead-ruby',heroId:'guardian',requestId:'dead-sale',instanceId:id});ticks(s);assert.equal(s.hero.hp,0);assert.equal(s.state.gold,340);assert.equal(equipmentCritBasisPoints(s.state.inventory),0);assert.deepEqual(s.state.criticalRandom,before);
});
test('six distinct Ruby purchases stack to 60%, seventh fails and failed requests reserve no instance',()=>{
 const s=new Simulation('full-ruby','extended');s.hero.x=450;s.hero.y=600;for(let i=0;i<36;i++)s.economy.apply({type:'minion-reward',id:'fixture-'+i});for(let i=0;i<7;i++)s.send({type:'buy-item',matchId:'full-ruby',heroId:'guardian',requestId:'gem-'+i,itemId:'ruby-gem'});ticks(s);assert.equal(s.state.gold,250);assert.equal(equipmentCritBasisPoints(s.state.inventory),6000);assert.equal(s.state.inventory.nextSequence,7);assert.equal(s.drainEvents().filter(e=>e.type==='item-traded').length,6);
});
test('empty inventory basic-strike event stream matches explicit ordinary damage and consumes no RNG',()=>{
 const a=duel(0,0),b=duel(2000,0);for(const {s}of[a,b])s.send({type:'attack'});ticks(a.s,100);ticks(b.s,100);assert.deepEqual(a.s.drainEvents(),b.s.drainEvents());assert.equal(a.e.hp,b.e.hp);assert.equal(a.s.state.criticalRandom.rolls,0);assert.equal(b.s.state.criticalRandom.rolls,0);
});

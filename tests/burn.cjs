'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {burnRules}=require('../.test-build/simulation/BurnEffects');
const {artifact,artifactAvailability}=require('../.test-build/data/artifacts');
const {plannedItem,goldUnits}=require('../.test-build/simulation/Inventory');
const {minionStats}=require('../.test-build/data/combat');
const ticks=(s,n)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function fixture(){const s=new Simulation('burn-test','prototype',2000);s.state.units={guardian:s.hero};s.hero.x=820;s.hero.y=590;const target={...minionStats,id:'burn-target',kind:'minion-red',team:'red',x:860,y:590,hp:10000,maxHp:10000,armor:0,readyTick:999999,protectionTick:0,speed:0};s.state.units[target.id]=target;s.skills.refreshStats();return{s,target};}
// Controlled test-only application: real basic resolution, then exact positive HP loss.
// No command, artifact grant, player-facing capability or production proc is added.
function land(s,target,damage=burnRules.damage){const hp=target.hp;s.basicHit(s.hero,target);return s.burn.applyAfterBasicHit(s.hero,target,s.clock.tick,hp-target.hp,damage);}
function gem(s,itemId='ruby-gem'){const i=plannedItem(s.state.inventory,itemId,goldUnits(150));s.state.inventory.slots[0]=i.id;s.state.inventory.instances[i.id]=i;s.state.inventory.nextSequence++;s.skills.refreshStats();}
const magic=s=>s.drainEvents().filter(e=>e.type==='damage'&&e.damageType==='magic');
test('original Burn remains 5 DPS, 3 seconds, with no immediate tick and exact 30/60/90 damage',()=>{
 assert.deepEqual(burnRules,{damage:5,intervalTicks:30,durationTicks:90});assert.deepEqual(artifact('flame-blade').modifiers.find(m=>m.kind==='burn'),{kind:'burn',damagePerSecond:5,durationSeconds:3,refresh:true});
 const {s,target}=fixture();assert.equal(land(s,target),true);const hp=target.hp;assert.equal(magic(s).length,0);assert.deepEqual([s.state.burns[target.id].nextTick,s.state.burns[target.id].expiresTick],[30,90]);
 for(const at of [30,60,90]){ticks(s,29);assert.equal(magic(s).length,0);ticks(s,1);const events=magic(s);assert.equal(s.clock.tick,at);assert.equal(events.length,1);assert.deepEqual([events[0].raw,events[0].amount,events[0].sourceId],[5,5,'guardian']);}
 assert.equal(target.hp,hp-15);assert.deepEqual(s.state.burns,{});ticks(s,30);assert.equal(magic(s).length,0);
});
test('refresh extends expiry without postponing cadence or duplicating parallel instances',()=>{
 const {s,target}=fixture();land(s,target);s.drainEvents();const life=s.state.burns[target.id].targetLife;
 for(const interval of [10,10,9]){ticks(s,interval);assert.equal(land(s,target),true);assert.equal(s.state.burns[target.id].nextTick,30);assert.equal(Object.keys(s.state.burns).length,1);s.drainEvents();}
 assert.equal(s.state.burns[target.id].expiresTick,119);assert.equal(s.state.burns[target.id].targetLife,life);ticks(s,1);assert.equal(magic(s).length,1);assert.equal(s.state.burns[target.id].nextTick,60);ticks(s,30);assert.equal(magic(s).length,1);ticks(s,30);assert.equal(magic(s).length,1);ticks(s,29);assert.deepEqual(s.state.burns,{});assert.equal(magic(s).length,0);
});
test('rapid refresh cannot starve due ticks and strongest potency wins with stable equal-source attribution',()=>{
 const {s,target}=fixture();land(s,target,10);const source=s.state.burns[target.id].sourceLife;s.drainEvents();for(let i=1;i<=60;i++){ticks(s,1);land(s,target,5);}const events=magic(s);assert.equal(events.length,2);assert.ok(events.every(e=>e.raw===10));assert.equal(s.state.burns[target.id].sourceLife,source);assert.equal(s.state.burns[target.id].nextTick,90);assert.equal(s.state.burns[target.id].expiresTick,150);
 land(s,target,15);assert.equal(s.state.burns[target.id].damage,15);assert.equal(s.state.burns[target.id].nextTick,90);s.drainEvents();ticks(s,30);assert.equal(magic(s)[0].raw,15);
});
test('zero/absorbed, lethal, friendly, invalid, protected and non-Guardian applications are rejected',()=>{
 const a=fixture();a.target.shield={remaining:1000,expiresTick:9999,zoneId:'fixture'};assert.equal(land(a.s,a.target),false);assert.deepEqual(a.s.state.burns,{});
 const b=fixture();b.target.hp=1;assert.equal(land(b.s,b.target),false);assert.deepEqual(b.s.state.burns,{});
 for(const change of [(s,t)=>t.team='blue',(s,t)=>t.x=1100,(s,t)=>t.protectionTick=100,(s,t)=>s.hero.hp=0,(s,t)=>s.hero.kind='minion-blue']){const {s,target}=fixture();change(s,target);assert.equal(land(s,target),false);assert.deepEqual(s.state.burns,{});}
 for(const value of [0,-1,NaN,Infinity]){const {s,target}=fixture();assert.equal(s.burn.applyAfterBasicHit(s.hero,target,0,value),false);assert.equal(s.burn.applyAfterBasicHit(s.hero,target,0,1,value),false);}
});
test('structures and Keeps never receive initial Burn, even from positive valid basic damage',()=>{
 const {s}=fixture();const tower={...s.hero,id:'tower-fixture',kind:'tower',team:'red',x:860,y:590,hp:650,maxHp:650,armor:0};s.state.structures[tower.id]=tower;assert.equal(land(s,tower),false);assert.ok(tower.hp<650);
 const base=s.state.bases['red-base'];s.hero.x=base.x-150;s.hero.y=base.y;assert.equal(land(s,base),false);assert.ok(base.hp<3000);assert.deepEqual(s.state.burns,{});
});
test('Burn goes through magic armor mitigation and current shields; zero loss stays truthful',()=>{
 const {s,target}=fixture();target.armor=100;target.baseArmor=100;land(s,target);s.drainEvents();const hp=target.hp;ticks(s,30);let event=magic(s)[0];assert.deepEqual([event.raw,event.mitigated,event.amount],[5,2.5,2.5]);assert.equal(target.hp,hp-2.5);
 const id='shield-fixture';s.state.skills.zones.push({id,sourceId:s.hero.id,sourceLife:s.hero.lifeId,x:0,y:0,expiresTick:1000,armor:0,shield:100,granted:[]});target.shield={remaining:4,expiresTick:1000,zoneId:id};ticks(s,30);event=magic(s)[0];assert.deepEqual([event.amount,event.absorbed],[0,2.5]);ticks(s,30);event=magic(s)[0];assert.deepEqual([event.amount,event.absorbed],[1,1.5]);
});
test('Burn ticks never crit, draw RNG or recursively refresh the effect',()=>{
 const {s,target}=fixture();gem(s);land(s,target);assert.equal(s.state.criticalRandom.rolls,1);const rng=structuredClone(s.state.criticalRandom);s.drainEvents();ticks(s,90);const events=magic(s);assert.equal(events.length,3);assert.ok(events.every(e=>e.raw===5&&!Object.hasOwn(e,'critical')));assert.deepEqual(s.state.criticalRandom,rng);assert.deepEqual(s.state.burns,{});
});
test('Burn death preserves source, exact reward quantities and once-only death/reward',()=>{
 const {s,target}=fixture();target.hp=85;assert.equal(land(s,target),true);s.drainEvents();ticks(s,30);const events=s.drainEvents();assert.ok(events.some(e=>e.type==='damage'&&e.amount===5&&e.sourceId==='guardian'&&e.damageType==='magic'));assert.equal(events.find(e=>e.type==='death').sourceId,'guardian');assert.equal(events.find(e=>e.type==='xp').amount,60);assert.equal(events.find(e=>e.type==='reward').gold,15);assert.equal(s.state.gold,265);assert.equal(s.state.kills,1);assert.deepEqual(s.state.burns,{});ticks(s,100);assert.equal(s.drainEvents().filter(e=>e.type==='death'||e.type==='reward'||e.type==='xp').length,0);
});
test('landed source snapshot continues after source death and credits the original Guardian',()=>{
 const {s,target}=fixture();target.hp=85;land(s,target);const effect=structuredClone(s.state.burns[target.id]);s.hit(target,s.hero,99999,'direct');assert.equal(s.hero.hp,0);assert.ok(s.state.burns[target.id]);s.drainEvents();ticks(s,30);const events=s.drainEvents();assert.equal(s.hero.hp,0);assert.equal(events.find(e=>e.type==='death').sourceId,'guardian');assert.equal(events.find(e=>e.type==='xp').heroId,'guardian');assert.equal(s.state.gold,265);assert.equal(effect.sourceLife,effect.source.lifeId);
});
test('source revival/replacement does not rewrite landed provenance or raw potency',()=>{
 const {s,target}=fixture();land(s,target);const life=s.state.burns[target.id].sourceLife;s.rewards.revive(s.hero);s.hero.damage=999;assert.notEqual(s.hero.lifeId,life);ticks(s,30);assert.equal(magic(s).filter(e=>e.raw===5).length,1);assert.equal(s.state.burns[target.id].sourceLife,life);
});
test('target death, removal, respawn identity or same-ID replacement clears the old effect',()=>{
 for(const change of [(s,t)=>s.hit(s.hero,t,99999,'direct'),(s,t)=>delete s.state.units[t.id],(s,t)=>s.rewards.revive(t),(s,t)=>s.state.units[t.id]={...t,hp:10000},(s,t)=>t.team='blue']){const {s,target}=fixture();land(s,target);change(s,target);s.drainEvents();ticks(s,30);assert.equal(magic(s).length,0);assert.deepEqual(s.state.burns,{});}
});
test('pause and quarter-speed use the shared simulation clock with no wall-clock damage',()=>{
 const {s,target}=fixture();land(s,target);s.drainEvents();ticks(s,10);const effect=structuredClone(s.state.burns);s.setPaused(true);ticks(s,300);assert.equal(s.clock.tick,10);assert.deepEqual(s.state.burns,effect);assert.equal(magic(s).length,0);s.setPaused(false);s.setTimeScale(.25);ticks(s,80);assert.equal(s.clock.tick,30);assert.equal(magic(s).length,1);s.setTimeScale(0);ticks(s,100);assert.equal(s.clock.tick,30);s.setTimeScale(1);ticks(s,60);assert.equal(magic(s).length,2);assert.deepEqual(s.state.burns,{});
});
test('30/60 FPS replay produces identical Burn schedules, state, rewards and events',()=>{
 const a=fixture(),b=fixture();for(const {s,target}of[a,b])land(s,target);for(let i=0;i<120;i++)a.s.advance(1000/30);for(let i=0;i<240;i++)b.s.advance(1000/60);assert.deepEqual(a.s.state,b.s.state);assert.deepEqual(a.s.drainEvents(),b.s.drainEvents());
});
test('terminal states and Restart clear pending execution; fresh encounter starts empty',()=>{
 for(const base of ['red-base','blue-base']){const {s,target}=fixture();land(s,target);s.state.bases[base].hp=0;ticks(s,1);assert.ok(s.ended);assert.deepEqual(s.state.burns,{});s.drainEvents();ticks(s,100);assert.equal(magic(s).length,0);}
 const {s,target}=fixture();land(s,target);s.beginRestart();assert.deepEqual(s.state.burns,{});ticks(s,100);assert.equal(magic(s).length,0);for(const mode of ['prototype','extended'])assert.deepEqual(new Simulation('fresh',mode).state.burns,{});
});
test('simultaneous target burns resolve in stable target-ID order, not insertion order',()=>{
 const {s,target}=fixture(),second={...target,id:'a-target'};s.state.units[second.id]=second;land(s,target);land(s,second);s.drainEvents();ticks(s,30);assert.deepEqual(magic(s).map(e=>e.id),['a-target','burn-target']);
});
test('ordinary empty/Ruby gameplay has no Burn application or direct Burn command',()=>{
 for(const item of [undefined,'ruby-gem']){const {s,target}=fixture();if(item)gem(s,item);s.send({type:'attack'});ticks(s,120);assert.deepEqual(s.state.burns,{});assert.equal(magic(s).length,0);}
 const s=new Simulation();assert.equal(s.send({type:'burn',targetId:'guardian'}),false);assert.equal(artifactAvailability(artifact('flame-blade')).tradingEnabled,true);assert.equal(s.send({type:'fusion',requestId:'fixture'}),false);
});
test('effect processing is deduplicated and expired records cannot deal late damage',()=>{
 const {s,target}=fixture();land(s,target);s.drainEvents();ticks(s,30);assert.equal(magic(s).length,1);s.burn.process(30);assert.equal(magic(s).length,0);s.burn.process(100);assert.equal(magic(s).length,0);assert.deepEqual(s.state.burns,{});
});
test('equal/weaker sources refresh but cannot steal attribution; stronger source wins without delaying tick',()=>{
 const {s,target}=fixture();land(s,target,10);const oldLife=s.state.burns[target.id].sourceLife,other={...s.hero,id:'other-guardian',x:820,y:550,speed:0,readyTick:999999};s.state.units[other.id]=other;
 for(const damage of [5,10]){const hp=target.hp;s.basicHit(other,target);assert.equal(s.burn.applyAfterBasicHit(other,target,0,hp-target.hp,damage),true);assert.equal(s.state.burns[target.id].sourceId,'guardian');assert.equal(s.state.burns[target.id].sourceLife,oldLife);}
 const hp=target.hp;s.basicHit(other,target);s.burn.applyAfterBasicHit(other,target,0,hp-target.hp,15);assert.equal(s.state.burns[target.id].sourceId,other.id);assert.equal(s.state.burns[target.id].nextTick,30);s.drainEvents();ticks(s,30);const event=magic(s)[0];assert.equal(event.sourceId,other.id);assert.equal(event.raw,15);
});
test('landed effect continues after target leaves attack range/LOS without a new attack',()=>{
 const {s,target}=fixture();land(s,target);target.x=1200;s.drainEvents();ticks(s,30);assert.equal(magic(s)[0].amount,5);assert.equal(s.state.attacking,false);
});
test('non-active match cannot accept Burn and a later fresh application restarts an expired cadence',()=>{
 const {s,target}=fixture();s.setPaused(true);assert.equal(s.burn.applyAfterBasicHit(s.hero,target,0,1),false);s.setPaused(false);land(s,target);s.burn.process(100);assert.equal(s.burn.applyAfterBasicHit(s.hero,target,100,1),true);assert.equal(s.state.burns[target.id].nextTick,130);assert.equal(s.state.burns[target.id].expiresTick,190);
});

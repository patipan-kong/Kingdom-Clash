'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {equipmentArcaneStats,reducedCooldownTicks}=require('../.test-build/simulation/ArcaneEquipment');
const {initialInventory,plannedItem,goldUnits}=require('../.test-build/simulation/Inventory');
const {artifact,artifactAvailability}=require('../.test-build/data/artifacts');
const {guardianRanks}=require('../.test-build/data/guardian');
const {minionStats}=require('../.test-build/data/combat');
const {nextLevelXp}=require('../.test-build/data/progression');
const {applyStatus}=require('../.test-build/simulation/Statuses');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
// Controlled ownership fixture only; no production acquisition path for Core.
function own(inv,itemId='arcane-core'){const item=plannedItem(inv,itemId,goldUnits(artifact(itemId).priceGold));inv.slots[inv.slots.indexOf(null)]=item.id;inv.instances[item.id]=item;inv.nextSequence++;return item.id;}
function fixture(cores=1,level=6){const s=new Simulation('arcane-test');s.state.spawnedWaves=2;s.state.units={guardian:s.hero};Object.assign(s.hero,{x:750,y:575});if(level>1)s.progression.award('fixture',Array.from({length:level-1},(_,i)=>nextLevelXp(i+1)).reduce((a,b)=>a+b,0));for(let i=0;i<cores;i++)own(s.state.inventory);s.skills.refreshStats();s.drainEvents();return s;}
function enemy(s){const e={...minionStats,id:'enemy',kind:'minion-red',team:'red',x:790,y:575,hp:10000,maxHp:10000,armor:0,speed:0,damage:0,readyTick:999999,protectionTick:0};s.state.units[e.id]=e;return e;}
function learn(s,skill,rank=1){for(let i=0;i<rank;i++){s.send({type:'learn',skill,requestId:`learn-${skill}-${i}`});ticks(s);}s.drainEvents();}
function cast(s,skill,id='cast'){s.send({type:'cast',skill,requestId:id,...(skill==='charge'?{direction:{x:1,y:0}}:{})});ticks(s);}

test('pure arcane aggregation stacks six copies and caps only effective CDR at 40%',()=>{
 const inv=initialInventory('aggregate');assert.deepEqual(equipmentArcaneStats(inv),{magicPower:0,cdrBps:0,effectiveCdrBps:0});
 for(let i=1;i<=6;i++){own(inv);const before=structuredClone(inv),result=equipmentArcaneStats(inv);assert.deepEqual(result,{magicPower:i*30,cdrBps:i*1000,effectiveCdrBps:Math.min(4000,i*1000)});assert.ok(Object.isFrozen(result));assert.deepEqual(inv,before);}
 const other=initialInventory('other');for(const id of ['iron-sword','guardian-shield','ruby-gem','flame-blade','builders-crown','commander-banner'])own(other,id);assert.deepEqual(equipmentArcaneStats(other),{magicPower:0,cdrBps:0,effectiveCdrBps:0});
});
test('integer cooldown formula rounds upward once and respects minimum one tick',()=>{
 assert.equal(reducedCooldownTicks(285,1000),257);assert.equal(reducedCooldownTicks(300,4000),180);assert.equal(reducedCooldownTicks(1,4000),1);
 for(const [base,bps] of [[0,0],[1,-1],[300,4001],[1,1.5],[Infinity,0],[Number.MAX_SAFE_INTEGER,0]])assert.throws(()=>reducedCooldownTicks(base,bps));
});
for(const skill of ['bash','taunt','charge','zone'])for(const cores of [0,1,6])test(`${skill} accepted cast snapshots ${cores} Core cooldown without changing windup or lock`,()=>{
 const s=fixture(cores);enemy(s);learn(s,skill);const at=s.clock.tick+1;cast(s,skill);const duration=reducedCooldownTicks(guardianRanks[skill].cooldown[0],Math.min(4000,cores*1000));
 assert.equal(s.state.skills.ready[skill],at+duration);assert.equal(s.cooldownInterval(skill),duration);assert.equal(s.state.skills.cooldownIntervals[skill],duration);assert.equal(s.state.skills.cast.atTick,at+guardianRanks[skill].windup);assert.equal(s.state.skills.lockTick,at+9);assert.equal(s.remaining(skill),duration/30);
});
test('unlearned, invalid target, stun, shared lock, replay and cooldown rejections spend no interval',()=>{
 const s=fixture();cast(s,'bash','unlearned');assert.equal(s.cooldownInterval('bash'),300);assert.equal(s.state.skills.cooldownIntervals.bash,0);learn(s,'bash');cast(s,'bash','no-target');assert.equal(s.state.skills.ready.bash,0);const e=enemy(s);
 applyStatus(s.hero,{type:'stun',sourceId:e.id,sourceLife:'e',startTick:s.clock.tick,expiresTick:s.clock.tick+2,magnitude:1});cast(s,'bash','stunned');assert.equal(s.state.skills.cooldownIntervals.bash,0);ticks(s,2);cast(s,'bash','accepted');learn(s,'taunt');cast(s,'taunt','locked');assert.equal(s.state.skills.cooldownIntervals.taunt,0);
 const ready=s.state.skills.ready.bash,interval=s.cooldownInterval('bash');cast(s,'bash','accepted');ticks(s,10);cast(s,'bash','cooldown');assert.equal(s.state.skills.ready.bash,ready);assert.equal(s.cooldownInterval('bash'),interval);assert.equal(s.drainEvents().filter(e=>e.type==='cast-accepted').length,0);
});
test('same-tick rank allocation precedes cast even when cast was queued first; unsupported purchase does not affect it',()=>{
 const s=fixture(1,3);enemy(s);learn(s,'bash');s.send({type:'cast',skill:'bash',requestId:'a'});s.send({type:'learn',skill:'bash',requestId:'rank2'});s.send({type:'buy-item',matchId:'arcane-test',heroId:'guardian',requestId:'core-buy',itemId:'arcane-core'});const before=structuredClone(s.state.inventory),gold=s.state.gold,at=s.clock.tick+1;ticks(s);
 assert.equal(s.state.skills.cast.rank,2);assert.equal(s.cooldownInterval('bash'),257);assert.equal(s.state.skills.ready.bash,at+257);assert.deepEqual(s.state.inventory,before);assert.equal(s.state.gold,gold);assert.ok(s.drainEvents().some(e=>e.type==='rejected'&&e.requestId==='core-buy'));
});
test('equipment removal/addition and rank upgrades never rewrite accepted interval or deadline; next cast uses new data',()=>{
 const s=fixture(1,3);enemy(s);learn(s,'bash');cast(s,'bash');const ready=s.state.skills.ready.bash;const id=s.state.inventory.slots[0];s.state.inventory.slots[0]=null;delete s.state.inventory.instances[id];s.skills.refreshStats();s.send({type:'learn',skill:'bash',requestId:'rank2'});ticks(s,10);
 assert.equal(s.state.skills.ready.bash,ready);assert.equal(s.cooldownInterval('bash'),270);assert.equal(s.remaining('bash'),(ready-s.clock.tick)/30);assert.equal(s.remaining('bash')/(s.cooldownInterval('bash')/30),(ready-s.clock.tick)/270);
 ticks(s,ready-s.clock.tick);cast(s,'bash','next');assert.equal(s.cooldownInterval('bash'),285);const next=s.state.skills.ready.bash;own(s.state.inventory);ticks(s);assert.equal(s.state.skills.ready.bash,next);assert.equal(s.cooldownInterval('bash'),285);
});
test('same-tick supported sale and purchase commit before cast without adding a Core acquisition path',()=>{
 const s=fixture();s.hero.x=450;s.hero.y=600;const sword=own(s.state.inventory,'iron-sword');learn(s,'taunt');const at=s.clock.tick+1;
 s.send({type:'cast',skill:'taunt',requestId:'cast-before-trades'});
 s.send({type:'sell-item',matchId:'arcane-test',heroId:'guardian',requestId:'sell',instanceId:sword});
 s.send({type:'buy-item',matchId:'arcane-test',heroId:'guardian',requestId:'buy',itemId:'iron-sword'});ticks(s);
 const events=s.drainEvents();assert.deepEqual(events.filter(e=>e.type==='item-traded').map(e=>e.action),['sell','buy']);assert.equal(s.state.gold,170);assert.equal(s.state.inventory.instances[sword],undefined);assert.equal(s.state.skills.ready.taunt,at+324);assert.equal(s.cooldownInterval('taunt'),324);assert.equal(s.hero.damage,110);
});
test('terminal state freezes deadlines, rejects new casts and preserves accepted HUD interval',()=>{
 const s=fixture();learn(s,'zone');cast(s,'zone');const ready=s.state.skills.ready.zone;s.state.bases['red-base'].hp=0;ticks(s);const tick=s.clock.tick;assert.equal(s.ended,true);assert.equal(s.send({type:'cast',skill:'zone',requestId:'after-end'}),false);ticks(s,120);assert.equal(s.clock.tick,tick);assert.equal(s.state.skills.ready.zone,ready);assert.equal(s.cooldownInterval('zone'),1485);assert.equal(s.state.skills.cast,undefined);
});
test('interruption, death and respawn preserve interval and deadline; new match resets both',()=>{
 const s=fixture();const e=enemy(s);learn(s,'bash');cast(s,'bash');const ready=s.state.skills.ready.bash;applyStatus(s.hero,{type:'stun',sourceId:e.id,sourceLife:'e',startTick:s.clock.tick,expiresTick:s.clock.tick+3,magnitude:1});ticks(s);assert.equal(s.state.skills.cast,undefined);assert.equal(s.cooldownInterval('bash'),270);s.hit(e,s.hero,99999,'direct');const respawn=s.hero.respawnTick;ticks(s,respawn-s.clock.tick);assert.ok(s.hero.hp>0);assert.equal(s.state.skills.ready.bash,ready);assert.equal(s.cooldownInterval('bash'),270);assert.equal(equipmentArcaneStats(s.state.inventory).magicPower,30);
 s.beginRestart();const tick=s.clock.tick;ticks(s,30);assert.equal(s.clock.tick,tick);const fresh=new Simulation('fresh');assert.deepEqual(fresh.state.skills.cooldownIntervals,{bash:0,taunt:0,charge:0,zone:0});assert.equal(fresh.state.skills.ready.bash,0);assert.equal(fresh.cooldownInterval('bash'),300);assert.equal(equipmentArcaneStats(fresh.state.inventory).magicPower,0);
});
test('Pause, freeze and quarter timeScale use the shared clock without rewriting cooldown data',()=>{
 const s=fixture();enemy(s);learn(s,'bash');cast(s,'bash');const ready=s.state.skills.ready.bash,tick=s.clock.tick;s.setPaused(true);ticks(s,60);assert.equal(s.clock.tick,tick);s.setPaused(false);s.setTimeScale(.25);ticks(s,24);assert.equal(s.clock.tick,tick+6);assert.equal(s.remaining('bash'),(ready-tick-6)/30);s.setTimeScale(0);ticks(s,30);assert.equal(s.clock.tick,tick+6);assert.equal(s.cooldownInterval('bash'),270);s.setTimeScale(1);ticks(s,6);assert.equal(s.clock.tick,tick+12);
});
test('30/60 FPS replay produces identical state and events with CDR',()=>{
 function replay(fps){const s=fixture(6),e=enemy(s);learn(s,'bash');s.send({type:'cast',skill:'bash',requestId:'replay'});for(let i=0;i<fps*4;i++)s.advance(1000/fps);return{state:s.state,events:s.drainEvents(),tick:s.clock.tick,remaining:s.remaining('bash'),duration:s.cooldownInterval('bash'),enemy:e.hp};}
 assert.deepEqual(replay(30),replay(60));
});
test('Magic Power changes no rank damage, shield, utility, basic attack or other combat clocks',()=>{
 for(const skill of ['bash','charge','zone','taunt']){const a=fixture(0),b=fixture(6);enemy(a);enemy(b);learn(a,skill);learn(b,skill);cast(a,skill);cast(b,skill);ticks(a,12);ticks(b,12);
  assert.deepEqual(a.state.units,b.state.units);assert.deepEqual(a.state.skills.zones,b.state.skills.zones);assert.deepEqual(a.state.criticalRandom,b.state.criticalRandom);assert.deepEqual(a.state.burns,b.state.burns);assert.equal(b.hero.cooldownTicks,23);assert.equal(b.state.units.enemy.cooldownTicks,30);
 }
});
test('Core stays unavailable for buy, sale and Shop; metadata and supported artifact availability remain intact',()=>{
 const s=new Simulation('shop','extended');s.hero.x=450;s.hero.y=600;const core=artifact('arcane-core');assert.equal(core.priceGold,550);assert.deepEqual(core.modifiers,[{kind:'magic-power',amount:30},{kind:'cdr',fraction:.1}]);assert.equal(artifactAvailability(core).effectsReady,false);assert.equal(artifactAvailability(core).tradingEnabled,false);assert.equal(s.shopPurchaseQuote('arcane-core').available,false);
 const id=own(s.state.inventory);assert.equal(s.shopSaleQuote(id).available,false);const before=structuredClone(s.state.inventory),gold=s.state.gold;s.send({type:'sell-item',matchId:'shop',heroId:'guardian',requestId:'sell-core',instanceId:id});ticks(s);assert.deepEqual(s.state.inventory,before);assert.equal(s.state.gold,gold);assert.equal(artifactAvailability(artifact('commander-banner')).tradingEnabled,true);
});

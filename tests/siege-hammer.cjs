'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {equipmentBuildingMultiplier}=require('../.test-build/simulation/Inventory');
const {artifact,artifactAvailability}=require('../.test-build/data/artifacts');
const {minionStats}=require('../.test-build/data/combat');
const {ShopModel}=require('../.test-build/ui/shopModel');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function fixture(seed=2000){const s=new Simulation('hammer-test','extended',seed);s.state.units={guardian:s.hero};s.state.structures={};s.hero.x=450;s.hero.y=600;s.skills.refreshStats();for(let i=0;i<300;i++)s.economy.apply({type:'minion-reward',id:'fund-'+i});return s;}
const ids=s=>s.state.inventory.slots.filter(Boolean);
const command=(s,type,requestId,extra)=>({type,matchId:s.state.inventory.matchId,heroId:'guardian',requestId,...extra});
function trade(s,type,requestId,extra){assert.equal(s.send(command(s,type,requestId,extra)),true);ticks(s);return s.drainEvents();}
function buy(s,itemId='siege-hammer',requestId=itemId){trade(s,'buy-item',requestId,{itemId});return ids(s).at(-1);}
function enemy(s,kind='tower'){
 const t={...minionStats,id:'victim',kind,team:'red',x:s.hero.x+40,y:s.hero.y,hp:10000,maxHp:10000,armor:0,speed:0,protectionTick:0,readyTick:999999,windupTicks:0,progress:1,startTick:0,completeTick:0,col:10,row:12,constructionDamage:0};
 if(kind.startsWith('base')){t.id='red-base';t.columns=3;t.rows=3;s.state.bases[t.id]=t;}else if(['tower','wall'].includes(kind))s.state.structures[t.id]=t;else s.state.units[t.id]=t;return t;
}
function strike(s,t){const hp=t.hp;s.basicHit(s.hero,t);const e=s.drainEvents().find(e=>e.type==='damage');assert.equal(t.hp,hp-e.amount);return e;}
test('original550 Gold Hammer and330 resale add/remove20 ATK without changing other stats',()=>{
 const s=fixture(),gold=s.state.gold,stats=[s.hero.hp,s.hero.maxHp,s.hero.armor],id=buy(s);assert.equal(s.state.gold,gold-550);assert.equal(s.hero.damage,100);assert.deepEqual([s.hero.hp,s.hero.maxHp,s.hero.armor],stats);assert.equal(s.shopSaleQuote(id).refundGold,330);trade(s,'sell-item','sale',{instanceId:id});assert.equal(s.state.gold,gold-220);assert.equal(s.hero.damage,80);assert.equal(equipmentBuildingMultiplier(s.state.inventory),1);
 assert.deepEqual(artifact('siege-hammer').modifiers,[{kind:'attack',amount:20},{kind:'building-damage',fraction:.25}]);for(const id of ['arcane-core','commander-banner'])assert.equal(artifactAvailability(artifact(id)).tradingEnabled,false);
});
test('two Hammers add40 ATK but one1.25 multiplier; exact sales preserve/remove passive',()=>{
 const s=fixture(),a=buy(s,'siege-hammer','a'),b=buy(s,'siege-hammer','b'),t=enemy(s);assert.equal(s.hero.damage,120);assert.equal(equipmentBuildingMultiplier(s.state.inventory),1.25);assert.equal(strike(s,t).raw,150);
 trade(s,'sell-item','b-sale',{instanceId:b});assert.ok(s.state.inventory.instances[a]);assert.equal(strike(s,t).raw,125);trade(s,'sell-item','a-sale',{instanceId:a});assert.equal(strike(s,t).raw,80);
});
for(const kind of ['wall','tower','base-red'])test(`valid authoritative ${kind} receives structural raw125, units receive100`,()=>{
 const s=fixture();buy(s);const t=enemy(s,kind),hp=t.hp,e=strike(s,t);assert.equal(e.raw,125);assert.equal(e.damageType,'physical');assert.equal(e.sourceId,'guardian');assert.equal(t.hp,hp-125);assert.equal(e.critical,undefined);assert.equal(s.state.criticalRandom.rolls,0);
 const unitMatch=fixture();buy(unitMatch);const u=enemy(unitMatch,'minion-red');assert.equal(strike(unitMatch,u).raw,100);
});
test('structure appearance/kind alone never grants a bonus; target must be authoritative structure/base',()=>{
 const s=fixture();buy(s);const t=enemy(s,'minion-red');t.kind='tower';assert.equal(strike(s,t).raw,100);const stale={...t};s.state.structures[t.id]=t;assert.equal(strike(s,stale).raw,100);
});
test('range, LOS, protection, team and liveness eligibility are unchanged and failed hits draw no RNG',()=>{
 for(const mode of ['range','los','protected','friendly','dead-target','dead-source']){const s=fixture();buy(s);buy(s,'ruby-gem');const t=enemy(s);
  if(mode==='range')t.x=s.hero.x+91;if(mode==='los')s.state.structures.block={...t,id:'block',kind:'wall',x:s.hero.x+20};if(mode==='protected')t.protectionTick=s.clock.tick+2;if(mode==='friendly')t.team='blue';if(mode==='dead-target')t.hp=0;if(mode==='dead-source')s.hero.hp=0;
  const hp=t.hp;s.basicHit(s.hero,t);assert.equal(t.hp,hp,mode);assert.equal(s.drainEvents().filter(e=>e.type==='damage').length,0,mode);assert.equal(s.state.criticalRandom.rolls,0,mode);
 }
});
test('Hammer composes Crit before ordinary armor/shield mitigation with no extra rounding',()=>{
 const s=fixture();buy(s);buy(s,'ruby-gem');const t=enemy(s);t.armor=100;t.shield={remaining:30,expiresTick:99999,zoneId:'fixture'};const e=strike(s,t);assert.equal(e.raw,250);assert.equal(e.critical,true);assert.equal(e.mitigated,125);assert.equal(e.absorbed,30);assert.equal(e.amount,95);assert.equal(s.state.criticalRandom.rolls,1);
 const r=fixture();buy(r);const target=enemy(r);target.armor=37;assert.equal(strike(r,target).amount,125*100/137);
});
test('Flame/Ruby/Hammer add stats and Crit while structural hits never apply Burn',()=>{
 const s=fixture();buy(s);buy(s,'flame-blade');buy(s,'ruby-gem');assert.equal(s.hero.damage,135);const t=enemy(s),e=strike(s,t);assert.equal(e.raw,135*2*1.25);assert.equal(e.critical,true);assert.deepEqual(s.state.burns,{});
 const u=enemy(s,'minion-red');assert.equal(strike(s,u).raw,135);assert.equal(Object.keys(s.state.burns).length,1);s.drainEvents();ticks(s,30);const magic=s.drainEvents().find(e=>e.type==='damage'&&e.damageType==='magic');assert.equal(magic.raw,5);assert.equal(magic.critical,undefined);assert.equal(s.state.criticalRandom.rolls,2);
});
test('skills and direct/magic damage never receive Hammer bonus or Crit/Burn',()=>{
 const s=fixture();buy(s);buy(s,'ruby-gem');buy(s,'flame-blade');const u=enemy(s,'minion-red');s.state.heroProgression.ranks.bash=1;s.send({type:'cast',skill:'bash',targetId:u.id,requestId:'bash'});ticks(s,7);const e=s.drainEvents().find(e=>e.type==='damage'&&e.castId==='bash');assert.equal(e.raw,80);assert.equal(e.critical,undefined);assert.equal(s.state.criticalRandom.rolls,0);assert.deepEqual(s.state.burns,{});
 const t=enemy(s);assert.equal(s.skills.legalTarget(t),false);for(const type of ['direct','magic']){s.hit(s.hero,t,80,type);assert.equal(s.drainEvents().find(e=>e.type==='damage').raw,80);}assert.equal(s.state.criticalRandom.rolls,0);
});
test('allied minion and Tower basic damage remain equivalent with Hammer inventory',()=>{
 for(const kind of ['minion-blue','tower']){const values=[];for(const hammer of [false,true]){const s=fixture();if(hammer)buy(s);const t=enemy(s),source={...minionStats,id:'allied',kind,team:'blue',x:t.x-30,y:t.y,hp:500,armor:0,protectionTick:0,readyTick:0};s.state.units[source.id]=source;s.basicHit(source,t);const e=s.drainEvents().find(e=>e.type==='damage');values.push([e.raw,e.amount,e.critical,s.state.criticalRandom.rolls]);}assert.deepEqual(values[0],values[1]);assert.equal(values[0][0],18);}
});
test('structure death uses original source, XP80 once, no tower Gold; Keep keeps original terminal precedence',()=>{
 const s=fixture();buy(s);const t=enemy(s);t.hp=1;const gold=s.state.gold;s.basicHit(s.hero,t);let e=s.drainEvents();assert.equal(e.find(e=>e.type==='death').sourceId,'guardian');assert.equal(e.find(e=>e.type==='xp').amount,80);assert.equal(s.state.gold,gold);assert.equal(s.state.structures[t.id],undefined);s.basicHit(s.hero,t);assert.equal(s.drainEvents().filter(e=>e.type==='xp'||e.type==='death').length,0);
 const keep=enemy(s,'base-red');keep.hp=1;s.basicHit(s.hero,keep);e=s.drainEvents();assert.equal(e.filter(e=>e.type==='reward'||e.type==='xp').length,0);ticks(s);assert.equal(s.state.match.result.outcome,'victory');assert.deepEqual(s.state.burns,{});
});
test('minion deaths still pay60 XP/15 Gold once without structural amplification',()=>{
 const s=fixture();buy(s);const t=enemy(s,'minion-red');t.hp=99;const gold=s.state.gold;s.basicHit(s.hero,t);const e=s.drainEvents();assert.equal(e.find(e=>e.type==='damage').raw,100);assert.equal(e.find(e=>e.type==='xp').amount,60);assert.equal(s.state.gold,gold+15);s.basicHit(s.hero,t);assert.equal(s.drainEvents().filter(e=>e.type==='death'||e.type==='reward').length,0);
});
test('in-flight basic strikes use current equipment at resolution for buy and final sale',()=>{
 for(const action of ['buy','sell']){const s=fixture();let id;if(action==='sell')id=buy(s);const t=enemy(s);s.send({type:'attack'});s.send({type:'target',id:t.id});ticks(s);assert.ok(s.hero.strike);if(action==='buy')buy(s);else trade(s,'sell-item','sale',{instanceId:id});s.drainEvents();ticks(s,5);const e=s.drainEvents().find(e=>e.type==='damage'&&e.sourceId==='guardian');assert.equal(e.raw,action==='buy'?125:80);}
});
test('death/respawn retain Hammer; dead trade, Pause, terminal state and Restart follow existing lifecycle',()=>{
 const s=fixture(),id=buy(s);s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');const inv=structuredClone(s.state.inventory);assert.equal(equipmentBuildingMultiplier(s.state.inventory),1.25);ticks(s,s.hero.respawnTick-s.clock.tick);assert.deepEqual(s.state.inventory,inv);assert.equal(s.hero.damage,100);
 s.hero.hp=0;s.hero.respawnTick=s.clock.tick+1000;s.hero.x=1500;trade(s,'sell-item','dead-sale',{instanceId:id});assert.equal(s.hero.hp,0);assert.equal(equipmentBuildingMultiplier(s.state.inventory),1);s.beginRestart();const fresh=new Simulation('fresh','extended');assert.equal(fresh.hero.damage,80);assert.equal(equipmentBuildingMultiplier(fresh.state.inventory),1);assert.equal(fresh.state.criticalRandom.rolls,0);
 const paused=fixture();paused.send(command(paused,'buy-item','pending',{itemId:'siege-hammer'}));const gold=paused.state.gold;paused.setPaused(true);ticks(paused,30);assert.equal(paused.state.gold,gold);assert.deepEqual(ids(paused),[]);const ended=fixture();ended.state.bases['red-base'].hp=0;ticks(ended);assert.equal(ended.send(command(ended,'buy-item','late',{itemId:'siege-hammer'})),false);
});
test('Hammer affordability, range, capacity, pending and replay preserve atomic trading',()=>{
 const poor=new Simulation('poor','extended');poor.hero.x=450;poor.hero.y=600;assert.equal(poor.shopPurchaseQuote('siege-hammer').reason,'Not enough Gold');trade(poor,'buy-item','poor',{itemId:'siege-hammer'});assert.equal(poor.state.gold,250);assert.deepEqual(ids(poor),[]);
 const s=fixture(),m=new ShopModel(),c=m.request('hammer-test','buy','siege-hammer','Siege Hammer');s.send(c);assert.equal(m.request('hammer-test','buy','siege-hammer','Siege Hammer'),undefined);s.send(c);ticks(s);const e=s.drainEvents();for(const event of e)m.observe(event);assert.equal(ids(s).length,1);assert.equal(m.message,'Siege Hammer purchased.');assert.ok(e.some(e=>e.reason==='Duplicate trade request'));
 for(let i=1;i<6;i++)buy(s,'siege-hammer','fill-'+i);const before=structuredClone(s.state.inventory),gold=s.state.gold;assert.equal(s.shopPurchaseQuote('siege-hammer').reason,'Inventory full');trade(s,'buy-item','full',{itemId:'siege-hammer'});assert.deepEqual(s.state.inventory,before);assert.equal(s.state.gold,gold);s.hero.x=1500;assert.equal(s.shopPurchaseQuote('siege-hammer').reason,'Return to Azure Keep');
});
test('Hammer structural strikes and equipment replay identically at30/60 FPS',()=>{
 function run(fps){const s=fixture();buy(s);buy(s,'ruby-gem');const t=enemy(s);s.send({type:'target',id:t.id});s.send({type:'attack'});for(let i=0;i<fps*2;i++)s.advance(1000/fps);return{state:s.state,events:s.drainEvents()};}assert.deepEqual(run(30),run(60));
});

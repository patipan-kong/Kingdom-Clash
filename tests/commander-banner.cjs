'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {bannerMultiplier,bannerRules}=require('../.test-build/simulation/BannerAura');
const {minionStats}=require('../.test-build/data/combat');
const {artifact,artifactAvailability}=require('../.test-build/data/artifacts');
const {goldUnits,plannedItem}=require('../.test-build/simulation/Inventory');
const {ShopModel}=require('../.test-build/ui/shopModel');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function fixture(){const s=new Simulation('banner-test','extended',2000);s.state.units={guardian:s.hero};s.state.structures={};s.hero.x=450;s.hero.y=600;s.skills.refreshStats();for(let i=0;i<180;i++)s.economy.apply({type:'minion-reward',id:'fund-'+i});return s;}
const ids=s=>s.state.inventory.slots.filter(Boolean);
const command=(s,type,requestId,extra)=>({type,matchId:s.state.inventory.matchId,heroId:'guardian',requestId,...extra});
function trade(s,type,requestId,extra){assert.equal(s.send(command(s,type,requestId,extra)),true);ticks(s);return s.drainEvents();}
function buy(s,itemId='commander-banner',requestId=itemId){trade(s,'buy-item',requestId,{itemId});return ids(s).at(-1);}
function troops(s,distance=150){const ally={...minionStats,id:'ally',kind:'minion-blue',team:'blue',x:s.hero.x+distance,y:s.hero.y,hp:1000,maxHp:1000,armor:0,protectionTick:0,readyTick:999999,decisionTick:999999,targetSinceTick:0,speed:0},target={...ally,id:'target',kind:'minion-red',team:'red',x:ally.x+32,hp:10000,maxHp:10000,damage:0};s.state.units[ally.id]=ally;s.state.units[target.id]=target;ally.targetId=target.id;target.targetId=ally.id;return{ally,target};}
function strike(s,ally,target){const hp=target.hp;s.basicHit(ally,target);const e=s.drainEvents().find(e=>e.type==='damage'&&e.id===target.id&&e.sourceId===ally.id);assert.ok(e);assert.equal(target.hp,hp-e.amount);return e;}
test('original Banner600/15% metadata and600 purchase/360 standard resale, no Guardian stat changes',()=>{
 const s=fixture(),gold=s.state.gold,stats=[s.hero.hp,s.hero.maxHp,s.hero.damage,s.hero.armor],id=buy(s);assert.equal(s.state.gold,gold-600);assert.equal(s.shopSaleQuote(id).refundGold,360);assert.deepEqual([s.hero.hp,s.hero.maxHp,s.hero.damage,s.hero.armor],stats);trade(s,'sell-item','sale',{instanceId:id});assert.equal(s.state.gold,gold-240);assert.deepEqual(artifact('commander-banner').modifiers,[{kind:'troop-attack-aura',fraction:.15}]);assert.equal(artifactAvailability(artifact('arcane-core')).tradingEnabled,false);
});
test('paid-basis resale uses actual acquisition cost, not catalog price',()=>{
 const s=fixture(),i=plannedItem(s.state.inventory,'commander-banner',goldUnits(400));s.state.inventory.slots[0]=i.id;s.state.inventory.instances[i.id]=i;s.state.inventory.nextSequence++;const gold=s.state.gold;assert.equal(s.shopSaleQuote(i.id).refundGold,240);trade(s,'sell-item','sale',{instanceId:i.id});assert.equal(s.state.gold,gold+240);
});
test('one Banner multiplies18 by1.15 only at resolved strikes; base damage never compounds',()=>{
 const s=fixture(),{ally,target}=troops(s);assert.equal(strike(s,ally,target).raw,18);buy(s);for(let n=0;n<20;n++){const e=strike(s,ally,target);assert.equal(e.raw,18*1.15);assert.ok(Math.abs(e.raw-20.7)<1e-9);assert.equal(ally.damage,18);}ticks(s,60);assert.equal(ally.damage,18);
});
test('radius is inclusive240 world center distance with1e-8 tolerance, not recipient radii',()=>{
 assert.deepEqual(bannerRules,{radius:240,tolerance:1e-8});const s=fixture();buy(s);const {ally,target}=troops(s,240);for(const [distance,expected] of [[240,1.15],[240+1e-8,1.15],[240+1e-7,1],[241,1],[239.9,1.15]]){ally.x=s.hero.x+distance;target.x=ally.x+32;assert.equal(bannerMultiplier(s.state,ally),expected);assert.equal(strike(s,ally,target).raw,18*expected);}ally.radius=999;ally.x=s.hero.x+241;assert.equal(bannerMultiplier(s.state,ally),1);
});
test('registered living allied combat minions qualify by authoritative team, not kind color alone',()=>{
 const s=fixture();buy(s);const {ally}=troops(s);assert.equal(bannerMultiplier(s.state,ally),1.15);ally.team='red';assert.equal(bannerMultiplier(s.state,ally),1);s.hero.team='red';assert.equal(bannerMultiplier(s.state,ally),1.15);ally.kind='minion-red';assert.equal(bannerMultiplier(s.state,ally),1.15);ally.hp=0;assert.equal(bannerMultiplier(s.state,ally),1);
});
test('stale/unregistered minions and Guardian/Wall/Tower/Keep recipients are excluded',()=>{
 const s=fixture();buy(s);const {ally}=troops(s);assert.equal(bannerMultiplier(s.state,{...ally}),1);delete s.state.units[ally.id];assert.equal(bannerMultiplier(s.state,ally),1);s.state.units[ally.id]=ally;assert.equal(bannerMultiplier(s.state,s.hero),1);for(const kind of ['guardian','tower','wall','base-blue','base-red']){ally.kind=kind;assert.equal(bannerMultiplier(s.state,ally),1);}
});
test('invalid Guardian identity, inventory owner, life state and coordinates cannot grant aura',()=>{
 for(const change of [s=>s.hero.hp=0,s=>s.hero.hp=NaN,s=>s.hero.x=NaN,s=>s.hero.kind='minion-blue',s=>s.hero.id='stale',s=>s.state.inventory.ownerHeroId='other',s=>delete s.state.units.guardian]){const s=fixture();buy(s);const {ally}=troops(s);change(s);assert.equal(bannerMultiplier(s.state,ally),1);}
 const s=fixture();buy(s);const {ally}=troops(s);ally.x=Infinity;assert.equal(bannerMultiplier(s.state,ally),1);
});
test('aura crosses walls without LOS; the minion attack still requires its original LOS',()=>{
 const s=fixture();buy(s);const {ally,target}=troops(s);s.state.structures.wall={...ally,id:'wall',kind:'wall',x:525,y:600,progress:1,startTick:0,completeTick:0,col:10,row:12,constructionDamage:0};assert.equal(bannerMultiplier(s.state,ally),1.15);assert.equal(strike(s,ally,target).raw,18*1.15);
 s.state.structures.wall.x=ally.x+16;const hp=target.hp;s.basicHit(ally,target);assert.equal(target.hp,hp);assert.equal(s.drainEvents().filter(e=>e.type==='damage').length,0);
});
test('attack range, target protection, hostile team and liveness remain required',()=>{
 for(const mode of ['range','protection','team','dead']){const s=fixture();buy(s);const {ally,target}=troops(s);if(mode==='range')target.x=ally.x+49;if(mode==='protection')target.protectionTick=s.clock.tick+9;if(mode==='team')target.team='blue';if(mode==='dead')target.hp=0;const hp=target.hp;s.basicHit(ally,target);assert.equal(target.hp,hp);assert.equal(s.drainEvents().filter(e=>e.type==='damage').length,0);assert.equal(s.state.criticalRandom.rolls,0);}
});
test('duplicate Banners grant one factor; exact duplicate/final sales preserve/remove it',()=>{
 const s=fixture(),a=buy(s,'commander-banner','a'),b=buy(s,'commander-banner','b'),{ally,target}=troops(s);assert.equal(strike(s,ally,target).raw,18*1.15);trade(s,'sell-item','b-sale',{instanceId:b});assert.ok(s.state.inventory.instances[a]);assert.equal(strike(s,ally,target).raw,18*1.15);trade(s,'sell-item','a-sale',{instanceId:a});assert.equal(strike(s,ally,target).raw,18);
});
test('entering/leaving during windup uses current position when due strike resolves',()=>{
 for(const entering of [true,false]){const s=fixture();buy(s);const {ally,target}=troops(s,entering?241:239);ally.strike={targetId:target.id,atTick:s.clock.tick+9};ticks(s,4);ally.x=s.hero.x+(entering?239:241);target.x=ally.x+32;s.drainEvents();ticks(s,5);const e=s.drainEvents().find(e=>e.type==='damage'&&e.sourceId===ally.id);assert.equal(e.raw,entering?18*1.15:18);assert.equal(ally.damage,18);}
});
test('same-tick buy/final sale precedes a due minion strike',()=>{
 for(const purchase of [true,false]){const s=fixture();let id;if(!purchase)id=buy(s);const {ally,target}=troops(s);ally.strike={targetId:target.id,atTick:s.clock.tick+1};s.drainEvents();if(purchase)s.send(command(s,'buy-item','buy',{itemId:'commander-banner'}));else s.send(command(s,'sell-item','sell',{instanceId:id}));ticks(s);const e=s.drainEvents();assert.equal(e.find(e=>e.type==='damage'&&e.sourceId===ally.id).raw,purchase?18*1.15:18);assert.ok(e.find(e=>e.type==='item-traded'));}
});
test('Guardian death disables aura while inventory survives; respawn restores at new position',()=>{
 const s=fixture();buy(s);const {ally,target}=troops(s);s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');const inv=structuredClone(s.state.inventory);assert.equal(bannerMultiplier(s.state,ally),1);assert.equal(strike(s,ally,target).raw,18);ticks(s,s.hero.respawnTick-s.clock.tick);assert.deepEqual(s.state.inventory,inv);assert.equal(bannerMultiplier(s.state,ally),1.15);ally.x=s.hero.x+241;assert.equal(bannerMultiplier(s.state,ally),1);
});
test('Guardian death cancels existing windups; subsequent minion strikes use no aura',()=>{
 const s=fixture();buy(s);const {ally,target}=troops(s,40);delete s.state.units.ally;ally.id='z-ally';target.targetId=ally.id;s.state.units[ally.id]=ally;ally.strike={targetId:target.id,atTick:s.clock.tick+1};const killer={...target,id:'a-killer',x:s.hero.x,y:s.hero.y+40,damage:99999,targetId:'guardian',strike:{targetId:'guardian',atTick:s.clock.tick+1}};s.state.units[killer.id]=killer;s.drainEvents();ticks(s);const e=s.drainEvents();assert.equal(s.hero.hp,0);assert.ok(e.some(e=>e.type==='death'&&e.id==='guardian'));assert.equal(e.filter(e=>e.type==='damage'&&e.sourceId===ally.id).length,0);assert.equal(ally.strike,undefined);assert.equal(bannerMultiplier(s.state,ally),1);ally.windupTicks=0;ally.readyTick=0;ticks(s);assert.equal(s.drainEvents().find(e=>e.type==='damage'&&e.sourceId===ally.id).raw,18);
});
test('physical armor/shields preserve floating HP loss and fully absorbed hits',()=>{
 const s=fixture();buy(s);const {ally,target}=troops(s);target.armor=37;target.shield={remaining:5,expiresTick:99999,zoneId:'fixture'};let e=strike(s,ally,target);assert.equal(e.raw,18*1.15);assert.equal(e.mitigated,18*1.15*100/137);assert.equal(e.absorbed,5);assert.equal(e.amount,e.mitigated-5);target.shield.remaining=999;e=strike(s,ally,target);assert.equal(e.amount,0);assert.equal(ally.damage,18);
});
test('troop stays actual damage/death source; existing XP assist and once-only Gold remain',()=>{
 const s=fixture();buy(s);const {ally,target}=troops(s,150);target.hp=20;const gold=s.state.gold;s.basicHit(ally,target);const e=s.drainEvents();assert.equal(e.find(e=>e.type==='damage').sourceId,ally.id);assert.equal(e.find(e=>e.type==='death').sourceId,ally.id);assert.equal(e.find(e=>e.type==='xp').amount,60);assert.equal(s.state.gold,gold+25);s.basicHit(ally,target);assert.equal(s.drainEvents().filter(e=>e.type==='death'||e.type==='reward'||e.type==='xp').length,0);
});
test('no Guardian Crit, Flame Burn or Hammer structural bonus leaks into troop damage',()=>{
 const s=fixture();for(const id of ['commander-banner','ruby-gem','flame-blade','siege-hammer'])buy(s,id);const {ally,target}=troops(s);assert.equal(strike(s,ally,target).raw,18*1.15);const t={...target,id:'tower',kind:'tower',progress:1,startTick:0,completeTick:0,col:10,row:12,constructionDamage:0};s.state.structures[t.id]=t;assert.equal(strike(s,ally,t).raw,18*1.15);assert.equal(s.state.criticalRandom.rolls,0);assert.deepEqual(s.state.burns,{});assert.equal(ally.damage,18);
 s.hit(ally,target,18,'magic');assert.equal(s.drainEvents().find(e=>e.type==='damage').raw,18);s.hit(ally,target,18,'direct');assert.equal(s.drainEvents().find(e=>e.type==='damage').raw,18);
});
test('enemy minion, Guardian and allied Tower actual strikes do not gain troop multiplier',()=>{
 const s=fixture();buy(s);const {ally,target}=troops(s,40);target.damage=18;assert.equal(strike(s,target,ally).raw,18);assert.equal(strike(s,s.hero,target).raw,80);const tower={...ally,id:'blue-tower',kind:'tower',damage:18};s.state.structures[tower.id]={...tower,progress:1,startTick:0,completeTick:0,col:10,row:12,constructionDamage:0};assert.equal(strike(s,tower,target).raw,18);
});
test('Pause/zero scale freeze positions and ownership; results/Restart clear further effects',()=>{
 const s=fixture();buy(s);const {ally,target}=troops(s);ally.strike={targetId:target.id,atTick:s.clock.tick+9};for(const pause of [true,false]){if(pause)s.setPaused(true);else{s.setPaused(false);s.setTimeScale(0);}const before=structuredClone(s.state);ticks(s,30);assert.deepEqual(s.state,before);assert.equal(bannerMultiplier(s.state,ally),1.15);}s.setTimeScale(1);s.hero.hp=0;s.hero.respawnTick=s.clock.tick+1000;buy(s,'commander-banner','dead');assert.equal(bannerMultiplier(s.state,ally),1);s.state.bases['red-base'].hp=0;ticks(s);const hp=target.hp;s.basicHit(ally,target);assert.equal(target.hp,hp);assert.equal(bannerMultiplier(s.state,ally),1);s.beginRestart();const fresh=new Simulation('fresh','extended');assert.equal(ids(fresh).length,0);const pair=troops(fresh);assert.equal(bannerMultiplier(fresh.state,pair.ally),1);
});
test('Shop affordability/capacity/owner/session/replay and pending correlation remain authoritative',()=>{
 const poor=new Simulation('poor','extended');poor.hero.x=450;poor.hero.y=600;assert.equal(poor.shopPurchaseQuote('commander-banner').reason,'Not enough Gold');const s=fixture(),m=new ShopModel(),c=m.request('banner-test','buy','commander-banner','Commander Banner');assert.equal(m.request('banner-test','buy','commander-banner','Commander Banner'),undefined);s.send(c);s.send(c);ticks(s);const events=s.drainEvents();for(const e of events)m.observe(e);assert.equal(ids(s).length,1);assert.equal(m.message,'Commander Banner purchased.');assert.ok(events.some(e=>e.reason==='Duplicate trade request'));for(const [i,extra] of [{heroId:'other'},{matchId:'old'}].entries()){const before=structuredClone(s.state.inventory),gold=s.state.gold;assert.equal(s.trades.execute({...command(s,'buy-item','bad-'+i,{itemId:'commander-banner'}),...extra}),false);assert.deepEqual(s.state.inventory,before);assert.equal(s.state.gold,gold);}for(let i=1;i<6;i++)buy(s,'commander-banner','fill-'+i);const before=structuredClone(s.state.inventory),gold=s.state.gold;trade(s,'buy-item','full',{itemId:'commander-banner'});assert.deepEqual(s.state.inventory,before);assert.equal(s.state.gold,gold);s.hero.x=1500;assert.equal(s.shopPurchaseQuote('commander-banner').reason,'Return to Azure Keep');
});
test('Banner movement/strikes and equipment replay identically at30/60 FPS',()=>{
 function run(fps){const s=fixture();buy(s);const {ally}=troops(s);ally.readyTick=0;ally.speed=95;for(let i=0;i<fps*3;i++)s.advance(1000/fps);return{state:s.state,events:s.drainEvents()};}assert.deepEqual(run(30),run(60));
});

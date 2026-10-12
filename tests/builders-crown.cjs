'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {constructionCost,roundConstructionResources}=require('../.test-build/simulation/ConstructionCosts');
const {artifact,artifactAvailability}=require('../.test-build/data/artifacts');
const {buildings}=require('../.test-build/data/buildings');
const {RESOURCE_UNITS}=require('../.test-build/simulation/Economy');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function fixture(){const s=new Simulation('crown-test','extended');s.state.units={guardian:s.hero};s.hero.x=450;s.hero.y=600;s.skills.refreshStats();for(let i=0;i<100;i++)s.economy.apply({type:'minion-reward',id:'fund-'+i});return s;}
const crownIds=s=>s.state.inventory.slots.filter(id=>id&&s.state.inventory.instances[id].itemId==='builders-crown');
const buy=(s,requestId='buy')=>s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId,itemId:'builders-crown'});
const sale=(s,id,requestId='sell')=>s.send({type:'sell-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId,instanceId:id});
const place=(s,kind='wall',requestId='place',col=12,row=12)=>s.send({type:'place',kind,requestId,col,row});
function acquire(s,request='buy'){buy(s,request);ticks(s);s.drainEvents();return crownIds(s).at(-1);}
function assertCosts(s,wood=23){assert.deepEqual(constructionCost(s.state.inventory,'wall'),{wood,iron:0});assert.deepEqual(constructionCost(s.state.inventory,'tower'),{wood:wood===23?74:80,iron:10});}
test('original Crown price/passive remain unchanged; buy/sale charges450/refunds270 Gold only',()=>{
 const s=fixture(),gold=s.state.gold,wood=s.economy.woodUnits,iron=s.economy.ironUnits,base=structuredClone(buildings),stats=[s.hero.hp,s.hero.maxHp,s.hero.damage,s.hero.armor];assertCosts(s,25);const id=acquire(s);assert.equal(s.state.gold,gold-450);assert.equal(s.economy.woodUnits,wood+8);assert.equal(s.economy.ironUnits,iron+1);assertCosts(s);assert.deepEqual([s.hero.hp,s.hero.maxHp,s.hero.damage,s.hero.armor],stats);assert.equal(s.shopSaleQuote(id).refundGold,270);sale(s,id);ticks(s);assert.equal(s.state.gold,gold-180);assertCosts(s,25);assert.deepEqual(buildings,base);
 assert.deepEqual(artifact('builders-crown').modifiers,[{kind:'construction-discount',fraction:.08}]);assert.equal(artifact('builders-crown').uniquePassive,'builders-crown');for(const id of ['arcane-core','commander-banner'])assert.equal(artifactAvailability(artifact(id)).tradingEnabled,false);
});
test('round once per positive resource, preserve zero, allow pure future factor composition',()=>{
 assert.deepEqual(roundConstructionResources({wood:25,iron:0},[9200]),{wood:23,iron:0});assert.deepEqual(roundConstructionResources({wood:80,iron:10},[9200]),{wood:74,iron:10});
 // Explicit pure rounding fixture, not a live Engineer capability. Intermediate rounding would yield22.
 assert.deepEqual(roundConstructionResources({wood:25,iron:0},[9000,9200]),{wood:21,iron:0});
 for(const n of [-1,NaN,1.5])assert.throws(()=>roundConstructionResources({wood:n,iron:0},[9200]));assert.throws(()=>roundConstructionResources({wood:25,iron:0},[0]));assert.throws(()=>roundConstructionResources({wood:25,iron:0},[11000]));
});
test('multiple Crowns never stack; selling one retains discount and final sale restores costs',()=>{
 const s=fixture(),a=acquire(s,'one'),b=acquire(s,'two');assertCosts(s);sale(s,b,'sell-two');ticks(s);assert.deepEqual(crownIds(s),[a]);assertCosts(s);sale(s,a,'sell-one');ticks(s);assertCosts(s,25);
});
test('Crown changes neither artifact prices nor Flame recipe due-now cost',()=>{
 const s=fixture();acquire(s);for(const [id,price] of [['iron-sword',200],['ruby-gem',150],['guardian-shield',500],['flame-blade',650],['builders-crown',450]])assert.equal(s.shopPurchaseQuote(id).quote.goldDue,price);
});
test('ledger charges exact discounted resources and records paid costs, including zero Iron',()=>{
 for(const kind of ['wall','tower']){const s=fixture();acquire(s);const q=s.constructionQuote(kind),w=s.economy.woodUnits,i=s.economy.ironUnits,g=s.economy.goldUnits;place(s,kind);ticks(s);const b=s.state.structures['built-place'];assert.deepEqual(b.paidResources,{wood:q.wood,iron:q.iron});assert.equal(s.economy.woodUnits,w-q.wood*RESOURCE_UNITS+8);assert.equal(s.economy.ironUnits,i-q.iron*RESOURCE_UNITS+1);assert.equal(s.economy.goldUnits,g);assert.equal(s.drainEvents().filter(e=>e.type==='built').length,1);}
});
test('private resource ledger rejects unaffordable construction despite a forged public mirror',()=>{
 const s=fixture();acquire(s);for(let n=0;n<5;n++)assert.equal(s.economy.apply({type:'construction',id:'spend-'+n,kind:'wall'}),true);
 // Seven legitimate discounted debits bring private Wood below23.
 for(let n=5;n<7;n++)assert.equal(s.economy.apply({type:'construction',id:'spend-'+n,kind:'wall'}),true);
 const w=s.economy.woodUnits,i=s.economy.ironUnits;assert.equal(s.constructionQuote('wall').available,false);s.state.wood=9999;assert.match(s.placementReason('wall',12,12),/resources/);assert.equal(s.economy.apply({type:'construction',id:'poor',kind:'wall'}),false);assert.equal(s.economy.woodUnits,w);assert.equal(s.economy.ironUnits,i);
});
test('discounted thresholds23 Wood and74 Wood/10 Iron accept, below either cost rejects atomically',()=>{
 // Controlled ledger boundary fixture: seed exact private units without changing live income/base costs.
 for(const [kind,w,i,ok] of [['wall',23,0,true],['wall',22,0,false],['tower',74,10,true],['tower',73,10,false],['tower',74,9,false]]){
  const s=fixture();acquire(s);s.economy.balances={gold:s.economy.goldUnits,wood:w*RESOURCE_UNITS,iron:i*RESOURCE_UNITS};s.state.wood=w;s.state.iron=i;const before=structuredClone(s.state),balances={...s.economy.balances};assert.equal(s.constructionQuote(kind).available,ok);assert.equal(s.economy.apply({type:'construction',id:'boundary',kind}),ok);
  if(ok){assert.equal(s.state.wood,w-(kind==='wall'?23:74));assert.equal(s.state.iron,i-(kind==='wall'?0:10));}else{assert.deepEqual(s.state,before);assert.deepEqual(s.economy.balances,balances);}
 }
});
test('execution order recalculates after queued buy/sale; completed costs never reprice',()=>{
 for(const order of ['buy-first','place-first','sale-first','sale-last']){const s=fixture();let id;if(order.startsWith('sale'))id=acquire(s);const w=s.economy.woodUnits;
  if(order==='buy-first'){buy(s);place(s);}if(order==='place-first'){place(s);buy(s);}if(order==='sale-first'){sale(s,id);place(s);}if(order==='sale-last'){place(s);sale(s,id);}ticks(s);
  const expected=['buy-first','sale-last'].includes(order)?23:25,b=s.state.structures['built-place'];assert.equal(s.economy.woodUnits,w-expected*RESOURCE_UNITS+8);assert.equal(b.paidResources.wood,expected);ticks(s,61);assert.equal(b.paidResources.wood,expected);assert.equal(b.hp,400);
 }
});
test('queued final sale invalidates a previously affordable discounted placement',()=>{
 const s=fixture(),id=acquire(s);s.economy.balances.wood=23*RESOURCE_UNITS;s.state.wood=23;assert.equal(s.placementReason('wall',12,12),'');sale(s,id);place(s);ticks(s);assert.equal(s.state.structures['built-place'],undefined);assert.equal(s.economy.woodUnits,23*RESOURCE_UNITS+8);assert.ok(s.drainEvents().some(e=>e.type==='rejected'&&e.reason==='Not enough resources'));
});
test('duplicate, invalid and competing placements never double-spend or partially deduct',()=>{
 const s=fixture();acquire(s);const w=s.economy.woodUnits,i=s.economy.ironUnits;place(s);place(s);place(s,'wall','other');place(s,'tower','water',20,8);ticks(s);assert.equal(s.economy.woodUnits,w-23*RESOURCE_UNITS+8);assert.equal(s.economy.ironUnits,i+1);assert.equal(s.drainEvents().filter(e=>e.type==='built').length,1);
 const before={...s.economy.balances};assert.equal(s.economy.apply({type:'construction',id:'place',kind:'wall'}),false);assert.deepEqual(s.economy.balances,before);
});
test('death and respawn retain the passive; dead build and sale use the same inventory rule',()=>{
 const s=fixture(),id=acquire(s);s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');const inv=structuredClone(s.state.inventory);assertCosts(s);place(s);ticks(s);assert.equal(s.state.structures['built-place'].paidResources.wood,23);ticks(s,s.hero.respawnTick-s.clock.tick);assert.deepEqual(s.state.inventory,inv);assertCosts(s);s.hero.hp=0;s.hero.respawnTick=s.clock.tick+999;sale(s,id);ticks(s);assertCosts(s,25);assert.equal(s.hero.hp,0);
});
test('Pause/zero speed cancels pending construction; Restart resets Crown and base costs',()=>{
 for(const cancel of [s=>s.setPaused(true),s=>s.setTimeScale(0),s=>s.beginRestart()]){const s=fixture();acquire(s);place(s);const before={...s.economy.balances};cancel(s);ticks(s,60);assert.deepEqual(s.economy.balances,before);assert.equal(s.state.structures['built-place'],undefined);}
 const s=fixture();acquire(s);s.beginRestart();const fresh=new Simulation('fresh','extended');assertCosts(fresh,25);assert.deepEqual(fresh.state.inventory.slots,[null,null,null,null,null,null]);assert.deepEqual(fresh.constructionQuote('tower'),{wood:80,iron:10,available:true});
});
test('Crown trading and discounted construction replay identically at30/60 FPS',()=>{
 function run(fps){const s=fixture();buy(s);place(s,'tower','tower');place(s,'wall','wall',11,12);for(let n=0;n<fps*2;n++)s.advance(1000/fps);return{state:s.state,events:s.drainEvents()};}assert.deepEqual(run(30),run(60));
});

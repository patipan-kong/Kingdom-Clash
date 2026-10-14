'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {artifact,artifactAvailability}=require('../.test-build/data/artifacts');
const {plannedItem,goldUnits,initialInventory}=require('../.test-build/simulation/Inventory');
const {prepareArtifactPurchase,prepareArtifactSale,artifactAccessReason}=require('../.test-build/simulation/ArtifactTransactions');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function fixture(gold=250){const s=new Simulation('trade-test');s.hero.x=450;s.hero.y=600;s.skills.refreshStats();if(gold!==250){s.economy.balances={...s.economy.balances,gold:gold*120};s.state.gold=gold;}return s;} // Exact Gold fixture, independent of the per-kill reward.
const buy=(s,itemId='iron-sword',requestId='buy')=>({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId,itemId});
const sell=(s,instanceId,requestId='sell')=>({type:'sell-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId,instanceId});
const ids=s=>s.state.inventory.slots.filter(Boolean);
function execute(s,c){assert.equal(s.send(c),true);ticks(s);return s.drainEvents();}
const transactionState=s=>({inv:s.state.inventory,gold:s.economy.goldUnits,stats:[s.hero.hp,s.hero.maxHp,s.hero.damage,s.hero.armor]});
function rejected(s,c,pattern){s.skills.refreshStats();const before=structuredClone(transactionState(s));const events=execute(s,c);assert.ok(events.some(e=>e.type==='rejected'&&pattern.test(e.reason)),JSON.stringify(events));assert.deepEqual(transactionState(s),before);}
// Explicit fixture injection for unsupported components/basis validation; never a live command.
function own(inv,itemId,paid=artifact(itemId).priceGold){const item=plannedItem(inv,itemId,goldUnits(paid));inv.slots[inv.slots.indexOf(null)]=item.id;inv.instances[item.id]=item;inv.nextSequence++;return item.id;}
test('Sword purchase/sale charge and refund the authoritative Gold ledger with deterministic identity',()=>{
 const s=fixture(),events=execute(s,buy(s));assert.equal(s.state.gold,50);assert.equal(s.economy.goldUnits,goldUnits(50));assert.equal(s.hero.damage,95);
 const id=ids(s)[0];assert.equal(id,'trade-test:guardian:item:1');assert.equal(s.state.inventory.instances[id].paidGoldUnits,goldUnits(200));assert.equal(events.find(e=>e.type==='item-traded').goldDelta,-200);
 const sale=execute(s,sell(s,id));assert.equal(s.state.gold,170);assert.equal(s.hero.damage,80);assert.equal(ids(s).length,0);assert.equal(s.state.inventory.nextSequence,2);assert.equal(sale.find(e=>e.type==='item-traded').goldDelta,120);
 assert.equal(s.economy.apply({type:'minion-reward',id:'after-trade'}),true);assert.equal(s.state.gold,195);
});
test('Shield purchase/sale compose HP/armor and preserve exact half HP without healing',()=>{
 const s=fixture(505);s.hero.hp=600;execute(s,buy(s,'guardian-shield'));assert.equal(s.state.gold,5);assert.deepEqual([s.hero.hp,s.hero.maxHp,s.hero.armor],[725,1450,40]);
 execute(s,sell(s,ids(s)[0]));assert.deepEqual([s.state.gold,s.hero.hp,s.hero.maxHp,s.hero.armor],[305,600,1200,25]);
});
test('distinct queued duplicate ordinary purchases succeed and sale removes only the selected instance',()=>{
 const s=fixture(610);s.send(buy(s,'iron-sword','a'));s.send(buy(s,'iron-sword','b'));ticks(s);const [a,b]=ids(s);assert.equal(s.state.gold,210);assert.equal(s.hero.damage,110);assert.equal(ids(s).length,2);
 execute(s,sell(s,b));assert.deepEqual(ids(s),[a]);assert.equal(s.hero.damage,95);assert.equal(s.state.gold,330);
 execute(s,buy(s,'iron-sword','c'));assert.equal(ids(s)[1],'trade-test:guardian:item:3');
});
test('six slots reject a seventh atomically; selling frees the exact slot for the next purchase',()=>{
 const s=fixture(1510);for(let i=0;i<6;i++)s.send(buy(s,'iron-sword',`six-${i}`));ticks(s);assert.equal(ids(s).length,6);assert.equal(s.hero.damage,170);
 rejected(s,buy(s,'iron-sword','seventh'),/full/);const removed=ids(s)[2];execute(s,sell(s,removed));execute(s,buy(s,'iron-sword','replacement'));assert.equal(s.state.inventory.slots[2],'trade-test:guardian:item:7');
});
test('insufficient funds reject without reserving item sequence',()=>{
 const s=fixture();rejected(s,buy(s,'guardian-shield'),/Gold/);assert.equal(s.state.inventory.nextSequence,1);
});
test('competing purchases preserve arrival order and cannot overdraw',()=>{
 const s=fixture();s.send(buy(s,'iron-sword','z-first'));s.send(buy(s,'iron-sword','a-second'));ticks(s);const e=s.drainEvents();assert.equal(e.filter(e=>e.type==='item-traded').length,1);assert.equal(e.find(e=>e.type==='item-traded').requestId,'z-first');assert.equal(s.state.gold,50);assert.equal(s.state.inventory.nextSequence,2);
});
test('double tap, changed payload replay and cross buy/sale replay cannot transact twice',()=>{
 const s=fixture(610),c=buy(s,'iron-sword','same');s.send(c);s.send(c);ticks(s);assert.equal(s.state.gold,410);assert.equal(ids(s).length,1);
 rejected(s,{...c,itemId:'guardian-shield'},/Duplicate/);rejected(s,sell(s,ids(s)[0],'same'),/Duplicate/);
 execute(s,sell(s,ids(s)[0],'sale'));rejected(s,sell(s,'trade-test:guardian:item:1','sale'),/Duplicate/);
});
test('a rejected request stays rejected when its context later becomes valid',()=>{
 const s=fixture(610);s.hero.x=820;s.skills.refreshStats();rejected(s,buy(s,'iron-sword','attempt'),/Return/);s.hero.x=450;s.skills.refreshStats();rejected(s,buy(s,'iron-sword','attempt'),/Duplicate/);execute(s,buy(s,'iron-sword','fresh'));assert.equal(ids(s).length,1);
});
test('wrong match or Guardian owner cannot change state or poison a legitimate request',()=>{
 const s=fixture();rejected(s,{...buy(s),matchId:'old-match'},/Stale/);rejected(s,{...buy(s),heroId:'other'},/owner/);execute(s,buy(s));assert.equal(ids(s).length,1);
});
test('malformed commands and client supplied prices/effects/refunds cannot control transactions',()=>{
 const s=fixture(),before=structuredClone(s.state);for(const edit of [{matchId:''},{heroId:42},{requestId:null},{itemId:''}])assert.equal(s.send({...buy(s),...edit}),false);assert.deepEqual(s.state,before);
 execute(s,{...buy(s),priceGold:0,capacity:99,effects:{attack:999},paidGoldUnits:1});assert.equal(s.state.gold,50);assert.equal(s.hero.damage,95);
 execute(s,{...sell(s,ids(s)[0]),refund:99999});assert.equal(s.state.gold,170);
});
test('Sword/Shield/Ruby can trade; unfinished products and live Fusion reject',()=>{
 const s=fixture(1000);for(const id of ['arcane-core'])rejected(s,buy(s,id,id),/unavailable/);
 rejected(s,buy(s,'unknown','unknown'),/Unknown/);const core=own(s.state.inventory,'arcane-core');s.skills.refreshStats();rejected(s,sell(s,core),/unavailable/);assert.equal(s.send({...buy(s,'flame-blade'),type:'fusion'}),false);
});
test('range is measured to Azure footprint, inclusive at 240, and identical for buying/selling',()=>{
 const s=fixture();s.hero.x=642;s.skills.refreshStats();assert.equal(artifactAccessReason(s.state),undefined);execute(s,buy(s));const id=ids(s)[0];
 s.hero.x=642.01;s.skills.refreshStats();rejected(s,sell(s,id),/Return/);s.hero.x=642;execute(s,sell(s,id,'in-range'));assert.equal(ids(s).length,0);
});
test('living access uses LOS to closest footprint point and validates at execution',()=>{
 const s=fixture();s.hero.x=600;s.skills.refreshStats();s.state.structures.obstacle={...s.state.bases['blue-base'],id:'obstacle',kind:'wall',x:500,y:600,columns:1,rows:1};
 rejected(s,buy(s),/blocked/);delete s.state.structures.obstacle;
 const c=buy(s,'iron-sword','moved');s.send(c);s.hero.x=820;s.skills.refreshStats();ticks(s);assert.equal(ids(s).length,0);assert.equal(s.state.gold,250);
});
test('dead trading bypasses range/LOS and zero HP remains zero; movement/attack/cast stay unavailable',()=>{
 const s=fixture(505);s.hero.hp=0;s.hero.x=1500;s.hero.y=800;s.hero.respawnTick=100;s.skills.refreshStats();
 s.send(buy(s,'guardian-shield'));s.send({type:'move',x:1,y:0});s.send({type:'attack'});s.send({type:'cast',skill:'bash',requestId:'dead-cast'});ticks(s);
 assert.equal(s.hero.hp,0);assert.equal(s.hero.maxHp,1450);assert.equal(s.hero.x,1500);assert.equal(s.state.attacking,false);assert.equal(s.state.skills.cast,undefined);
 execute(s,sell(s,ids(s)[0]));assert.equal(s.hero.hp,0);assert.equal(s.hero.maxHp,1200);assert.equal(s.state.gold,305);
});
test('live acquired items and basis survive actual death/respawn and fill derived HP',()=>{
 const s=fixture(505);execute(s,buy(s,'guardian-shield'));const inv=structuredClone(s.state.inventory);
 s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');assert.equal(s.hero.hp,0);ticks(s,s.hero.respawnTick-s.clock.tick);assert.equal(s.hero.hp,1450);assert.deepEqual(s.state.inventory,inv);assert.equal(s.state.gold-5,25*s.state.kills,'death never spends Gold; the only change over the longer respawn is ordinary Crimson kill rewards');
});
test('Pause, zero timeScale, shutdown clearInput and Restart cancel unexecuted trades',()=>{
 for(const cancel of [s=>s.setPaused(true),s=>s.setTimeScale(0),s=>s.clearInput(),s=>s.beginRestart()]){
  const s=fixture();s.send(buy(s));cancel(s);ticks(s,2);assert.equal(ids(s).length,0);assert.equal(s.state.gold,250);s.setPaused(false);if(s.state.match.phase!=='restarting')s.setTimeScale(1);ticks(s);assert.equal(ids(s).length,0);
 }
 const s=fixture();s.setPaused(true);assert.equal(s.send(buy(s)),false);s.setPaused(false);execute(s,buy(s));assert.equal(ids(s).length,1);
});
test('Restart discards items and requests; prior-match commands cannot affect fresh encounter',()=>{
 const old=fixture();execute(old,buy(old));old.beginRestart();const fresh=new Simulation('fresh-match','extended');fresh.hero.x=450;fresh.skills.refreshStats();
 rejected(fresh,buy(old),/Stale/);execute(fresh,buy(fresh));assert.equal(ids(fresh).length,1);assert.equal(fresh.state.inventory.nextSequence,2);assert.equal(fresh.state.inventory.instances[ids(fresh)[0]].matchId,'fresh-match');
});
test('victory/defeat and non-playing phases reject sales/purchases without mutation',()=>{
 for(const base of ['blue-base','red-base']){const s=fixture();execute(s,buy(s));s.state.bases[base].hp=0;ticks(s);const before=structuredClone(s.state);assert.equal(s.send(sell(s,ids(s)[0])),false);assert.equal(s.send(buy(s,'iron-sword','late')),false);assert.deepEqual(s.state,before);}
 const s=fixture();s.state.match.phase='initializing';const before=structuredClone(s.state);assert.equal(s.trades.execute(buy(s)),false);assert.deepEqual(s.state,before);
});
test('sales validate exact ownership, missing/already-sold instance, paid basis and refund overflow',()=>{
 const s=fixture();rejected(s,sell(s,'other:item:1'),/owned/);execute(s,buy(s));const id=ids(s)[0];
 for(const paid of [0,1,-1,NaN,Number.MAX_SAFE_INTEGER]){const inv=structuredClone(s.state.inventory);inv.instances[id]={...inv.instances[id],paidGoldUnits:paid};assert.throws(()=>prepareArtifactSale(inv,id,s.economy.goldUnits));}
 const inv=structuredClone(s.state.inventory);assert.throws(()=>prepareArtifactSale(inv,id,Number.MAX_SAFE_INTEGER));
 execute(s,sell(s,id,'valid-sale'));rejected(s,sell(s,id,'again'),/owned/);
});
test('sale uses actual paid basis rather than catalog price and never rounds a fractional ledger refund',()=>{
 const s=fixture();const id=own(s.state.inventory,'iron-sword',100);s.skills.refreshStats();execute(s,sell(s,id));assert.equal(s.state.gold,310);
});
test('repeated Shield buy/sell cycles with fractional damage cannot generate free healing',()=>{
 const s=fixture(2500);s.hero.hp=333.33;let fraction=s.hero.hp/s.hero.maxHp;
 for(let i=0;i<8;i++){execute(s,buy(s,'guardian-shield',`buy-${i}`));assert.ok(s.hero.hp/s.hero.maxHp<=fraction+1e-9);fraction=s.hero.hp/s.hero.maxHp;execute(s,sell(s,ids(s)[0],`sell-${i}`));assert.ok(s.hero.hp/s.hero.maxHp<=fraction+1e-9);fraction=s.hero.hp/s.hero.maxHp;}
 assert.ok(s.hero.hp<=333.33);
});
test('each accepted transaction invokes the existing stat refresh exactly once; rejected ones never do',()=>{
 const s=fixture(),original=s.skills.refreshStats.bind(s.skills);let calls=0;s.skills.refreshStats=()=>{calls++;original();};
 assert.equal(s.trades.execute(buy(s)),true);assert.equal(calls,1);assert.equal(s.trades.execute(buy(s)),false);assert.equal(calls,1);assert.equal(s.trades.execute(sell(s,ids(s)[0])),true);assert.equal(calls,2);
});
test('generic Fusion plans preserve 650/450/300 pricing, paid basis and post-consumption six-slot capacity',()=>{
 const inv=initialInventory('fusion-fixture');assert.equal(-prepareArtifactPurchase(inv,'flame-blade',goldUnits(1000)).goldDeltaUnits,goldUnits(650));
 const sword=own(inv,'iron-sword');assert.equal(-prepareArtifactPurchase(inv,'flame-blade',goldUnits(1000),[sword]).goldDeltaUnits,goldUnits(450));const gem=own(inv,'ruby-gem');for(let i=0;i<4;i++)own(inv,'iron-sword');const before=structuredClone(inv);
 const both=prepareArtifactPurchase(inv,'flame-blade',goldUnits(1000),[sword,gem]);assert.equal(-both.goldDeltaUnits,goldUnits(300));assert.equal(both.inventoryAfter.slots.filter(Boolean).length,5);assert.equal(both.inventoryAfter.instances[both.instanceId].paidGoldUnits,goldUnits(650));
 const one=prepareArtifactPurchase(inv,'flame-blade',goldUnits(1000),[sword]);assert.equal(one.inventoryAfter.slots.filter(Boolean).length,6);
 assert.throws(()=>prepareArtifactPurchase(inv,'flame-blade',goldUnits(1000)),/full/);assert.throws(()=>prepareArtifactPurchase(inv,'flame-blade',goldUnits(1000),[sword,sword]));assert.deepEqual(inv,before);assert.equal(artifactAvailability(artifact('flame-blade')).tradingEnabled,true);
 assert.throws(()=>{both.inventoryAfter.slots[0]=null;},TypeError);
});
test('ledger commit rejects stale money/inventory snapshots and replays before any mutation',()=>{
 const s=fixture(610),plan=prepareArtifactPurchase(s.state.inventory,'iron-sword',s.economy.goldUnits);execute(s,buy(s));const before=structuredClone(s.state);assert.equal(s.economy.commitArtifactTransaction('stale',plan),false);assert.deepEqual(s.state,before);
 const current=prepareArtifactPurchase(s.state.inventory,'iron-sword',s.economy.goldUnits);assert.equal(s.economy.commitArtifactTransaction('trusted-model',current),true);const committed=structuredClone(s.state);assert.equal(s.economy.commitArtifactTransaction('trusted-model',current),false);assert.deepEqual(s.state,committed);
});
test('trading command streams replay identically across render partitions',()=>{
 const a=fixture(1000),b=fixture(1000);for(const s of [a,b]){s.send(buy(s,'iron-sword','a'));s.send(buy(s,'guardian-shield','b'));s.send(buy(s,'iron-sword','c'));}
 for(let i=0;i<30;i++)a.advance(1000/30);for(let i=0;i<60;i++)b.advance(1000/60);assert.deepEqual(a.state,b.state);assert.deepEqual(a.drainEvents(),b.drainEvents());
});
test('direct rejected transactions leave the complete authoritative state, stats and item sequence unchanged',()=>{
 const s=fixture();
 for(const command of [buy(s,'guardian-shield','poor'),buy(s,'arcane-core','disabled'),sell(s,'missing','absent'),{...buy(s,'iron-sword','wrong'),heroId:'other'},{...buy(s,'iron-sword','stale'),matchId:'old'}]){
  const before=structuredClone(s.state),gold=s.economy.goldUnits;assert.equal(s.trades.execute(command),false);assert.deepEqual(s.state,before);assert.equal(s.economy.goldUnits,gold);
 }
 const id=own(s.state.inventory,'iron-sword');s.state.inventory.instances[id]={...s.state.inventory.instances[id],paidGoldUnits:1};const before=structuredClone(s.state);assert.equal(s.trades.execute(sell(s,id,'bad-basis')),false);assert.deepEqual(s.state,before);
});
test('plans are detached and cannot freeze or alter mutable input snapshots',()=>{
 const inv=initialInventory('snapshot');const id=own(inv,'iron-sword');const mutable=structuredClone(inv),before=structuredClone(mutable);
 const plan=prepareArtifactPurchase(mutable,'iron-sword',goldUnits(1000));assert.deepEqual(mutable,before);assert.equal(Object.isFrozen(mutable.instances[id]),false);mutable.instances[id].paidGoldUnits=0;assert.equal(plan.inventoryAfter.instances[id].paidGoldUnits,goldUnits(200));
});
test('ledger rejection preserves funds/ownership on invalid capacity, ownership or amounts',()=>{
 const s=fixture(610),valid=prepareArtifactPurchase(s.state.inventory,'iron-sword',s.economy.goldUnits),before=structuredClone(s.state);
 for(const edit of [p=>p.goldAfterUnits=-1,p=>p.goldDeltaUnits=0,p=>p.inventoryAfter.slots.push(null),p=>p.inventoryAfter.ownerHeroId='other']){const plan=structuredClone(valid);edit(plan);assert.equal(s.economy.commitArtifactTransaction('invalid',plan),false);assert.deepEqual(s.state,before);}
 assert.equal(s.economy.commitArtifactTransaction('invalid',valid),true); // Failed validation never marks a commit as applied.
});
test('trade queue copies primitive identity fields and cannot be changed by the caller',()=>{
 const s=fixture(),c=buy(s);assert.equal(s.send(c),true);c.itemId='guardian-shield';c.requestId='changed';ticks(s);assert.equal(s.state.inventory.instances[ids(s)[0]].itemId,'iron-sword');assert.equal(s.state.gold,50);assert.equal(s.drainEvents().find(e=>e.type==='item-traded').requestId,'buy');
});

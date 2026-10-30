'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {ShopModel,shopLayout,shopRestrictionLabel,shopAccessGuidance}=require('../.test-build/ui/shopModel');
const {controlLayout}=require('../.test-build/ui/controlLayout');
function fixture(){const s=new Simulation('shop-session','extended');s.hero.x=450;s.hero.y=600;s.skills.refreshStats();return s;}
test('Shop restriction copy follows authoritative live quotes through range, funds, death and respawn',()=>{
 const s=fixture();for(let i=0;i<6;i++)s.economy.apply({type:'minion-reward',id:'funds-'+i}); // 400 Gold from the authoritative ledger
 assert.equal(s.state.gold,400);
 const label=()=>shopRestrictionLabel(s.shopPurchaseQuote('iron-sword').reason);
 assert.equal(label(),'Buy');s.hero.x=1500;assert.equal(label(),'Too Far');
 assert.equal(shopAccessGuidance(s.shopAccessReason()),'Move near Azure Keep to buy equipment');
 s.hero.hp=0;assert.equal(label(),'Buy');s.hero.hp=s.hero.maxHp;assert.equal(label(),'Too Far');
 s.hero.x=450;assert.equal(label(),'Buy');assert.equal(shopAccessGuidance(s.shopAccessReason()),undefined);
 assert.equal(shopRestrictionLabel(s.shopPurchaseQuote('guardian-shield').reason),'Need Gold');
 s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'copy-buy',itemId:'iron-sword'});s.advance(1000/30);
 assert.equal(label(),'Buy');s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'copy-buy-2',itemId:'iron-sword'});s.advance(1000/30);
 assert.equal(label(),'Need Gold');s.hero.x=1500;assert.equal(label(),'Too Far');
 assert.equal(shopRestrictionLabel('Selection stale · reselect'),'Need Items');
 assert.equal(shopRestrictionLabel('Inventory full'),'Full');assert.equal(shopRestrictionLabel('Paused'),'Paused');
});
test('Fusion missing ingredients remain authoritatively purchasable; capacity and selected instances stay live',()=>{
 const s=fixture();for(let i=0;i<60;i++)s.economy.apply({type:'minion-reward',id:'fusion-copy-'+i});
 assert.equal(s.shopPurchaseQuote('flame-blade').available,true);assert.equal(s.shopPurchaseQuote('flame-blade').quote.goldDue,650);
 for(let i=0;i<6;i++)s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'fill-copy-'+i,itemId:'iron-sword'});s.advance(1000/30);
 assert.equal(shopRestrictionLabel(s.shopPurchaseQuote('iron-sword').reason),'Full');
 const id=s.state.inventory.slots[0];assert.equal(s.shopPurchaseQuote('flame-blade',[id]).available,true);assert.equal(s.shopPurchaseQuote('flame-blade',[id]).quote.goldDue,450);
 s.send({type:'sell-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'sell-copy',instanceId:id});s.advance(1000/30);
 assert.throws(()=>s.shopPurchaseQuote('flame-blade',[id]),/Invalid consumed instance/);assert.equal(s.shopPurchaseQuote('iron-sword').available,true);
});
test('Shop browsing quotes use authoritative funds, capability, capacity and access without mutation',()=>{
 const s=fixture(),before=structuredClone(s.state);assert.equal(s.shopPurchaseQuote('iron-sword').available,true);assert.equal(s.shopPurchaseQuote('guardian-shield').reason,'Not enough Gold');assert.deepEqual(s.state,before);
 s.hero.x=820;assert.equal(s.shopPurchaseQuote('iron-sword').reason,'Return to Azure Keep');s.hero.hp=0;assert.equal(s.shopPurchaseQuote('iron-sword').available,true);s.setPaused(true);assert.equal(s.shopPurchaseQuote('iron-sword').reason,'Paused');
 const prototype=new Simulation();assert.equal(prototype.shopPurchaseQuote('iron-sword').available,false);
});
test('Shop pending blocks double tap and waits for matching authoritative acceptance',()=>{
 const s=fixture(),model=new ShopModel(),c=model.request('shop-session','buy','iron-sword','Iron Sword');assert.ok(c);assert.equal(model.request('shop-session','buy','iron-sword','Iron Sword'),undefined);assert.equal(model.message,'Waiting for transaction…');
 assert.equal(model.observe({type:'item-traded',action:'buy',requestId:'different',instanceId:'id',goldDelta:-200}),false);assert.ok(model.pending);s.send(c);s.advance(1000/30);for(const e of s.drainEvents())model.observe(e);assert.equal(model.message,'Iron Sword purchased.');assert.equal(model.pending,undefined);assert.equal(s.state.gold,50);
 const id=s.state.inventory.slots[0];assert.equal(s.shopSaleQuote(id).refundGold,120);model.selected=id;model.confirming=true;const sale=model.request('shop-session','sell',id,'Iron Sword');assert.equal(model.confirming,false);s.send(sale);s.advance(1000/30);for(const e of s.drainEvents())model.observe(e);assert.equal(model.message,'Iron Sword sold.');assert.equal(model.selected,undefined);assert.equal(s.state.gold,170);
});
test('Shop rejection is request-correlated and never reports success',()=>{
 const s=fixture(),model=new ShopModel(),c=model.request('shop-session','buy','guardian-shield','Guardian Shield');s.send(c);s.advance(1000/30);const events=s.drainEvents();assert.ok(events.some(e=>e.type==='rejected'&&e.requestId===c.requestId));for(const e of events)model.observe(e);assert.equal(model.message,'Not enough Gold');assert.equal(model.pending,undefined);assert.equal(s.state.gold,250);
});
test('cancel/reset drops UI pending but never reuses a request identity or processes stale feedback',()=>{
 const m=new ShopModel(),first=m.request('one','buy','iron-sword','Iron Sword');m.cancel();assert.equal(m.observe({type:'item-traded',action:'buy',requestId:first.requestId,instanceId:'x',goldDelta:-200}),false);m.reset();const next=m.request('one','buy','iron-sword','Iron Sword');assert.notEqual(first.requestId,next.requestId);
});
test('Shop geometry stays between thumb controls, below actual HUD and above 24px gesture reserve',()=>{
 for(const height of [390,540,370,520]){const scale=height/540,c=controlLayout(scale),top=Math.max(140,90+48/scale)+8/scale,f=shopLayout(scale,top,c.panelAnchorX);assert.ok(f.width*scale>=230);assert.ok(f.height*scale>=212);assert.equal(f.touch*scale,48);assert.ok(f.x*scale>c.joystick.x*scale+c.joystick.radius*scale);assert.ok(f.x+f.width<c.panelAnchorX-c.utilities[0].hitRadius);assert.ok(f.y>top);assert.ok((540-f.y-f.height)*scale>=24-1e-8);}
});

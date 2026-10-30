'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ShopModel}=require('../.test-build/ui/shopModel');
const {equipmentLayout}=require('../.test-build/ui/equipmentLayout');
const {controlLayout}=require('../.test-build/ui/controlLayout');
const {Simulation}=require('../.test-build/simulation/Simulation');
function fixture(){const s=new Simulation('equipment-ui','extended');s.hero.x=450;s.hero.y=600;s.skills.refreshStats();for(let i=0;i<120;i++)s.economy.apply({type:'minion-reward',id:'equipment-funds-'+i});return s;}
function buy(s,id,n){s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'fixture-'+n,itemId:id});s.advance(1000/30);}
test('Equipment targets stay >=48 CSS px at compact, standard, large and unequal-safe-area FIT scales',()=>{
 for(const h of [390,540,720,370,378,520,700]){
  const s=h/540,c=controlLayout(s),f=equipmentLayout(s,80/s,c.panelAnchorX);
  assert.ok(f.cellWidth*s>=48-1e-8);assert.ok(f.cellHeight*s>=48-1e-8);
  assert.ok(f.y*s>=80-1e-8);assert.ok((f.y+f.height)*s<=h-24+1e-8);
  assert.ok((f.x+f.width)*s<=(c.panelAnchorX-c.utilities[0].hitRadius)*s-5.9);
  assert.ok(f.detailWidth*s>=220);if(!f.compact)assert.equal(f.gridWidth*s,220);
 }
});
test('duplicate selection preserves exact slot/instance and cannot change while sale is pending',()=>{
 const s=fixture();buy(s,'iron-sword',1);buy(s,'iron-sword',2);const inv=s.state.inventory,m=new ShopModel();
 m.selectSlot(1,inv.slots);assert.equal(m.selected,inv.slots[1]);assert.notEqual(m.selected,inv.slots[0]);
 const cmd=m.request(inv.matchId,'sell',m.selected,'Iron Sword');assert.equal(cmd.instanceId,inv.slots[1]);
 m.selectSlot(0,inv.slots);assert.equal(m.selected,inv.slots[1]);assert.equal(m.selectedSlot,1);
 assert.equal(m.request(inv.matchId,'sell',inv.slots[0],'Iron Sword'),undefined);
 s.send(cmd);s.advance(1000/30);for(const e of s.drainEvents())m.observe(e);
 assert.ok(s.state.inventory.slots[0]);assert.equal(s.state.inventory.slots[1],null);assert.equal(m.selected,undefined);
});
test('empty slots have neutral identity; selecting another slot clears confirmation',()=>{
 const m=new ShopModel(),slots=['sword',null,null,null,null,null];m.selectSlot(0,slots);m.confirming=true;m.confirmedInstance='sword';
 m.selectSlot(3,slots);assert.equal(m.selected,undefined);assert.equal(m.selectedSlot,3);assert.equal(m.confirming,false);assert.equal(m.confirmedInstance,undefined);
});
test('a later purchase filling an inspected empty slot cannot inherit the neutral Empty selection',()=>{
 const s=fixture(),m=new ShopModel();m.selectSlot(0,s.state.inventory.slots);assert.equal(m.selectedSlot,0);assert.equal(m.selected,undefined);
 buy(s,'guardian-shield','fill-empty');m.reconcileSelection(s.state.inventory.slots,s.state.inventory.instances);
 assert.ok(s.state.inventory.slots[0]);assert.equal(m.selectedSlot,undefined);assert.equal(m.selected,undefined);assert.equal(m.confirming,false);
 m.selectSlot(0,s.state.inventory.slots);assert.equal(m.selected,s.state.inventory.slots[0]);assert.equal(s.shopSaleQuote(m.selected).refundGold,300);
});
test('replacing a selected instance cancels confirmation rather than retargeting the new same-type item',()=>{
 const m=new ShopModel(),slots=['copy-one','copy-two',null,null,null,null];m.selectSlot(0,slots);m.confirming=true;m.confirmedInstance='copy-one';
 slots[0]='replacement';m.reconcileSelection(slots,{'copy-one':{id:'copy-one'},replacement:{id:'replacement'},'copy-two':{id:'copy-two'}});
 assert.equal(m.selected,undefined);assert.equal(m.selectedSlot,undefined);assert.equal(m.confirming,false);assert.equal(m.confirmedInstance,undefined);assert.match(m.message,/Selection changed/);
});
test('fusion clears selected consumed component but leaves remaining duplicate available by exact slot',()=>{
 const s=fixture();buy(s,'iron-sword',1);buy(s,'iron-sword',2);buy(s,'ruby-gem',3);const inv=s.state.inventory,m=new ShopModel();m.selectSlot(1,inv.slots);
 const retained=inv.slots[0],consumed=inv.slots[1],gem=inv.slots[2];m.confirming=true;m.confirmedInstance=consumed;
 s.send({type:'fuse-item',matchId:inv.matchId,heroId:'guardian',requestId:'consume-selected',itemId:'flame-blade',componentIds:[consumed,gem]});s.advance(1000/30);
 m.reconcileSelection(s.state.inventory.slots,s.state.inventory.instances);assert.equal(m.selected,undefined);assert.equal(m.confirming,false);assert.equal(s.state.inventory.instances[consumed],undefined);assert.equal(s.state.inventory.slots[0],retained);
 m.selectSlot(0,s.state.inventory.slots);assert.equal(m.selected,retained);assert.equal(s.shopSaleQuote(retained).refundGold,120);
});
test('rejected exact-instance sale keeps item and quote, and ignores unrelated acknowledgments',()=>{
 const s=fixture();buy(s,'ruby-gem',1);const inv=s.state.inventory,id=inv.slots[0],m=new ShopModel();m.selectSlot(0,inv.slots);
 const cmd=m.request(inv.matchId,'sell',id,'Ruby Gem');s.hero.x=1500;s.send(cmd);s.advance(1000/30);
 assert.equal(m.observe({type:'item-traded',action:'sell',requestId:'other',instanceId:id,goldDelta:90}),false);
 for(const e of s.drainEvents())m.observe(e);assert.equal(m.selected,id);assert.equal(inv.slots[0],id);assert.equal(m.message,'Return to Azure Keep');assert.equal(m.pending,undefined);
 s.hero.hp=0;assert.equal(s.shopSaleQuote(id).available,true);assert.equal(s.shopSaleQuote(id).refundGold,90);
});

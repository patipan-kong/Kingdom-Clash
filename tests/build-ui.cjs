'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {BuildModel}=require('../.test-build/ui/buildModel');
const {buildLayout}=require('../.test-build/ui/buildLayout');
const {controlLayout}=require('../.test-build/ui/controlLayout');
const {Simulation}=require('../.test-build/simulation/Simulation');
function fixture(){return new Simulation('build-ui','extended');}
test('the compact tray is two rows of 100 CSS px that do not change size or place when a defense is selected, and Change clears selection without spending',()=>{
 const s=fixture(),m=new BuildModel(),c=controlLayout(390/540),expanded=buildLayout(390/540,84/(390/540),c.panelAnchorX,false),tray=buildLayout(390/540,84/(390/540),c.panelAnchorX,true);
 assert.equal(Math.round(tray.height*390/540),100);assert.deepEqual([tray.x,tray.y,tray.width,tray.height],[expanded.x,expanded.y,expanded.width,expanded.height],'selecting does not move or resize the tray');assert.equal(Math.round(tray.cardHeight*390/540),48);const wood=s.state.wood,iron=s.state.iron;m.choose('wall');assert.equal(m.back(),true);assert.equal(m.kind,undefined);assert.equal(m.collapsed,false);assert.equal(s.state.wood,wood);assert.equal(s.state.iron,iron);
 m.choose('tower');assert.ok(m.request(s,{kind:'tower',col:12,row:12},0));assert.equal(m.back(),false,'cannot discard an in-flight confirmation');
});
test('removed tower cell has no decorative placement restriction; real map obstacles remain',()=>{
 const s=fixture();assert.equal(s.placementReason('wall',12,10),'');assert.match(s.placementReason('wall',6,12),/Occupied static/);assert.equal(s.state.bases['blue-base'].hp,3000);
});
test('Build tray leaves control columns, HUD and gesture reserve clear at all landscape FIT sizes',()=>{
 for(const h of [390,540,720,370,515.25,695.25])for(const collapsed of [false,true]){
  const s=h/540,c=controlLayout(s),f=buildLayout(s,84/s,c.panelAnchorX,collapsed),w=(f.width*s-24)/2;
  assert.ok(w>=48);assert.ok(f.cardHeight*s>=48);assert.ok((f.width*s-16-80)>=48);
  assert.ok(f.y*s>=92);assert.ok((f.y+f.height)*s<=h-24+1e-8);
  assert.ok((f.x+f.width)*s<=c.panelAnchorX*s-30+1e-8);assert.ok(f.x*s>=c.joystick.x*s+c.joystick.radius*s+5.9);
 }
});
test('the tray has a bottom and a top position, both clear of the HUD, the control columns and the gesture reserve',()=>{
 for(const h of [360,390,540,720,1080]){
  const s=h/540,c=controlLayout(s),top=84/s;
  for(const position of ['bottom','top']){
   const f=buildLayout(s,top,c.panelAnchorX,false,position);
   assert.equal(f.position,position);assert.ok(Math.abs(f.height*s-100)<1e-6);assert.ok(f.y*s>=top*s+8-1e-8,'below the HUD plates');assert.ok((f.y+f.height)*s<=h-24+1e-8,'bottom reserve');
   assert.ok((f.x+f.width)*s<=c.panelAnchorX*s-30+1e-8);assert.ok(f.x*s>=c.joystick.x*s+c.joystick.radius*s+5.9);assert.ok(f.cardHeight*s>=47.99&&f.actionY>=f.y&&f.actionY+f.cardHeight<=f.y+f.height);
  }
  const b=buildLayout(s,top,c.panelAnchorX,false,'bottom'),t=buildLayout(s,top,c.panelAnchorX,false,'top');assert.ok(t.y<b.y);assert.equal(t.x,b.x);assert.equal(t.width,b.width);
 }
});
test('Build presentation refuses unselected/illegal confirmation and pending double submit',()=>{
 const m=new BuildModel(),s=fixture(),p={kind:'wall',col:12,row:12};assert.equal(m.request(s,p,0),undefined);m.choose('wall');assert.equal(m.collapsed,true);
 assert.equal(m.request(s,{...p,col:25},0),undefined);const id=m.request(s,p,0);assert.ok(id);assert.equal(m.request(s,p,1000),undefined);assert.equal(m.choose('tower'),false);assert.equal(s.state.wood,180);
});
test('Build success follows its exact authoritative structure, charges once and preserves construction timing',()=>{
 const m=new BuildModel(),s=fixture(),p={kind:'wall',col:12,row:12};m.choose('wall');const id=m.request(s,p,0);s.send({type:'place',requestId:id,...p});assert.equal(m.sync(s),false);assert.ok(m.pending);
 s.advance(1000/30);assert.equal(m.sync(s),true);assert.equal(m.pending,undefined);assert.equal(m.started,'built-'+id);const b=s.state.structures[m.started];assert.equal(b.paidResources.wood,25);assert.equal(b.completeTick-b.startTick,60);assert.equal(b.maxHp,400);assert.ok(b.progress<1);assert.equal(m.sync(s),false);
});
test('Build rejection observes failed own request without adopting another uncorrelated event',()=>{
 const m=new BuildModel(),s=fixture(),p={kind:'tower',col:12,row:12};m.choose('tower');const id=m.request(s,p,0);s.send({type:'place',requestId:id,...p});s.economy.balances.iron=0;s.state.iron=0;
 s.advance(1000/30);assert.equal(m.sync(s),false);assert.equal(m.message,'Construction rejected');assert.equal(m.pending,undefined);assert.equal(s.state.structures['built-'+id],undefined);assert.equal(s.economy.woodUnits,180*120+8);
});
test('matching built acknowledgment survives same-tick destruction and foreign events cannot resolve pending',()=>{
 const m=new BuildModel(),s=fixture();m.choose('wall');const id=m.request(s,{kind:'wall',col:12,row:12},0);
 assert.equal(m.observe({type:'built',id:'built-other',requestId:'other'}),false);assert.ok(m.pending);
 assert.equal(m.observe({type:'rejected',reason:'Unrelated rejection'}),false);assert.ok(m.pending);
 assert.equal(m.observe({type:'built',id:'built-'+id,requestId:id}),true);s.clock.tick++;assert.equal(m.sync(s),false);assert.equal(m.pending,undefined);assert.equal(m.started,'built-'+id);assert.match(m.message,/Construction started/);
});
test('dead Guardian Build and Crown quotes remain authoritative; reset clears intent without reusing IDs',()=>{
 const m=new BuildModel(),s=fixture();for(let i=0;i<10;i++)s.economy.apply({type:'minion-reward',id:'fund-'+i});s.hero.x=450;s.hero.y=600;s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'crown',itemId:'builders-crown'});s.advance(1000/30);assert.equal(s.constructionQuote('wall').wood,23);
 s.hero.hp=0;s.hero.respawnTick=s.clock.tick+1000;m.choose('wall');const p={kind:'wall',col:12,row:12},id=m.request(s,p,0);s.send({type:'place',requestId:id,...p});s.advance(1000/30);assert.equal(m.sync(s),true);assert.equal(s.state.structures['built-'+id].paidResources.wood,23);
 m.reset();assert.equal(m.kind,undefined);assert.equal(m.pending,undefined);m.choose('tower');const next=m.request(s,{kind:'tower',col:11,row:13},1000);assert.ok(next);assert.notEqual(next,id);
});

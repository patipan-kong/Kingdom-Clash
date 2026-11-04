const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {mercenary,mercenaries,reviveCost,REVIVE_TICKS}=require('../.test-build/data/mercenaries.js');
const {buildings}=require('../.test-build/data/buildings.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {calm,run,allies,strike}=require('./support/allyBot.cjs');
// Chapter 5 Phase 1B (docs/CHAPTER5_PHASE1B.md): the Tavern, hiring, hero cap, fall, manual Revive, Dismiss and a destroyed Tavern, through Simulation.send().
const ROSTER=['roland','borin','kael'];
const make=(cap=1)=>calm(new Simulation('tavern',{...campaign.setup(31),tavern:{cap,roster:ROSTER}}));
const fundTo=(sim,wood,iron,gold=2000)=>{sim.economy.balances={...sim.economy.balances,gold:gold*RESOURCE_UNITS,wood:wood*RESOURCE_UNITS,iron:iron*RESOURCE_UNITS};};
const units=sim=>({wood:sim.economy.woodUnits,iron:sim.economy.ironUnits,gold:sim.economy.goldUnits});
// What one tick of commands cost, in whole resources: the balance drop plus the tick's income (8/120 Wood, 1/120 Iron).
const spent=(sim,send)=>{const a=units(sim);send();const log=run(sim,1);const b=units(sim);return {wood:(a.wood+8-b.wood)/RESOURCE_UNITS,iron:(a.iron+1-b.iron)/RESOURCE_UNITS,gold:(a.gold-b.gold)/RESOURCE_UNITS,log};};
const rejected=log=>log.filter(e=>e.type==='rejected').map(e=>e.reason);
const cell=sim=>{const h=sim.hero;let best;const cols=Math.ceil(2400/48),rows=Math.ceil(1200/48);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){if(sim.placementReason('tavern',c,r))continue;const d=Math.hypot((c+.5)*48-h.x,(r+.5)*48-h.y);if(!best||d<best.d)best={c,r,d};}return best;};
let serial=0;
const build=sim=>{fundTo(sim,500,100);const p=cell(sim);assert.ok(p,'a free territory cell');const id=`b${++serial}`;sim.send({type:'place',requestId:id,kind:'tavern',col:p.c,row:p.r});run(sim,200);const t=sim.state.structures[`built-${id}`];assert.ok(t&&t.tavern&&t.progress>=1,'Tavern finished');return t;};
const hire=(sim,merc)=>spent(sim,()=>sim.send({type:'tavern',requestId:`h${++serial}`,action:'hire',merc}));
const kill=(sim,id)=>{const u=sim.state.units[id];u.hp=1;strike(sim,'red-base',id);};

test('Chapters 1-4 have no Tavern: no setup carries one, it cannot be built, and no order reaches a state',()=>{
 for(let n=1;n<=36;n++){let s;try{s=campaign.setup(n);}catch{continue;}assert.equal(s.tavern,undefined,`level ${n} has no tavern`);}
 const sim=calm(new Simulation('ch4',campaign.setup(31)));assert.equal(sim.state.tavern,undefined);
 fundTo(sim,500,100);const log=run(sim,2,t=>{if(t===0){sim.send({type:'place',requestId:'x',kind:'tavern',col:30,row:20});sim.send({type:'tavern',requestId:'y',action:'hire',merc:'roland'});}});
 assert.equal(sim.placementReason('tavern',30,20),'Tavern unavailable');
 assert.deepEqual(rejected(log).sort(),['No Tavern in this mission','Tavern unavailable']);assert.equal(allies(sim).length,0);assert.equal(Object.values(sim.state.structures).some(b=>b.tavern),false);
});

test('setup: a tavern needs a cap of 1 to 3 and distinct roster ids',()=>{
 for(const bad of [{cap:0,roster:ROSTER},{cap:4,roster:ROSTER},{cap:1,roster:[]},{cap:1,roster:['roland','roland']},{cap:1,roster:['nobody']}])assert.throws(()=>matchSetup('extended',{tavern:bad}),/Invalid Tavern/);
 assert.deepEqual(matchSetup('extended',{tavern:{cap:2,roster:['kael','roland']}}).tavern,{cap:2,roster:['kael','roland']});assert.equal(matchSetup('extended').tavern,undefined);
});

test('the Tavern builds through the ordinary Build command, is charged once, and only one stands at a time',()=>{
 const sim=make();fundTo(sim,500,100);const p=cell(sim),before=units(sim);
 const r=spent(sim,()=>sim.send({type:'place',requestId:'t1',kind:'tavern',col:p.c,row:p.r}));
 assert.deepEqual([r.wood,r.iron,r.gold],[buildings.tavern.wood,buildings.tavern.iron,0],'Wood and Iron only');
 const t=sim.state.structures['built-t1'];assert.ok(t.tavern&&t.kind==='wall'&&t.hp>0&&t.progress<1,'under construction');
 assert.equal(sim.tavernStanding(),false);assert.equal(rejected(spent(sim,()=>sim.send({type:'tavern',requestId:'early',action:'hire',merc:'roland'})).log)[0],'The Tavern is still being built');
 run(sim,200);assert.equal(sim.tavernStanding(),true);assert.equal(sim.placementReason('tavern',p.c+3,p.r),'Tavern already built');
 assert.equal(units(sim).gold,before.gold,'Guardian gold untouched by the building');
});

test('hiring: charges Gold once and no Wood or Iron; the hero appears beside the Tavern and takes Follow / Attack / Defend',()=>{
 const sim=make(),t=build(sim);fundTo(sim,500,100);const goldBefore=sim.state.gold;
 assert.deepEqual(mercenaries.map(m=>m.gold),[150,180,200]);
 const r=hire(sim,'borin'),m=mercenary('borin');
 assert.deepEqual([r.wood,r.iron,r.gold],[0,0,m.gold]);assert.equal(sim.state.gold,goldBefore-m.gold,'the Gold balance shown by the HUD');
 const [h]=allies(sim);assert.ok(h&&h.hp>0);assert.equal(h.ally.merc,'borin');assert.equal(h.ally.order.type,'follow');
 assert.ok(Math.hypot(h.x-t.x,h.y-t.y)<=2*48*Math.SQRT2+1,'beside the Tavern');
 assert.equal(h.maxHp,Math.round(833*1.4));assert.equal(sim.state.tavern.slots.length,1);assert.deepEqual(sim.state.tavern.slots[0],{merc:'borin',status:'alive',unitId:h.id});
 // all three Simple Commands, through the ordinary 'ally' command
 const foe=Object.values(sim.state.structures).find(s=>s.team==='red'&&s.kind==='tower'&&s.hp>0);
 for(const order of [{type:'attack',targetId:foe.id},{type:'defend',x:h.x+96,y:h.y},{type:'follow'}]){
  sim.send({type:'ally',requestId:`o${++serial}`,id:h.id,order});const log=run(sim,2);
  assert.ok(log.some(e=>e.type==='ally-order'&&e.order.type===order.type),`${order.type} accepted`);assert.equal(h.ally.order.type,order.type);assert.equal(h.ally.merc,'borin','an order keeps the mercenary');
 }
 // the order is not repeated by a duplicate request id
 const again=spent(sim,()=>{});assert.equal(again.wood,0);
});

test('hero cap: a full Tavern refuses another hire, an unaffordable hire costs nothing, and a mercenary is hired once',()=>{
 const sim=make(2);build(sim);fundTo(sim,500,100);
 hire(sim,'roland');const dup=hire(sim,'roland');assert.deepEqual(rejected(dup.log),['Already hired']);assert.equal(dup.gold,0);
 hire(sim,'kael');const full=hire(sim,'borin');assert.deepEqual(rejected(full.log),['Hero cap reached']);assert.deepEqual([full.wood,full.iron,full.gold],[0,0,0]);assert.equal(allies(sim).length,2);
 const poor=make();build(poor);fundTo(poor,500,100,149);const p=hire(poor,'roland');assert.deepEqual(rejected(p.log),['Not enough Gold']);assert.deepEqual([p.wood,p.iron,p.gold],[0,0,0]);assert.equal(allies(poor).length,0);
 const woodPoor=make();build(woodPoor);fundTo(woodPoor,0,0,150);assert.deepEqual(rejected(hire(woodPoor,'roland').log),[],'Gold alone is enough: no Wood or Iron is needed');assert.equal(allies(woodPoor).length,1);
 assert.deepEqual(rejected(hire(sim,'zorg').log),['Not for hire'],'a name off the roster');
 const narrow=calm(new Simulation('n',{...campaign.setup(31),tavern:{cap:3,roster:['roland']}}));build(narrow);fundTo(narrow,500,100);assert.deepEqual(rejected(hire(narrow,'kael').log),['Not for hire'],'only the match roster is on offer');
});

test('a fallen hero keeps its slot: no other hire fits, and the Tavern shows it dead',()=>{
 const sim=make(),t=build(sim);fundTo(sim,500,100);hire(sim,'roland');const [h]=allies(sim);
 const log=run(sim,1,()=>kill(sim,h.id));
 assert.ok(!sim.state.units[h.id],'the hero is gone from the field');assert.deepEqual(sim.state.tavern.slots,[{merc:'roland',status:'dead'}]);
 assert.ok(log.some(e=>e.type==='tavern'&&e.action==='fallen'&&e.slot===0));
 assert.deepEqual(rejected(hire(sim,'kael').log),['Hero cap reached']);assert.ok(sim.tavernStanding()&&t.hp>0);
});

test('manual Revive: 45% of the hire price in Gold, once, 30 seconds away, then back at full health on Follow in the same slot',()=>{
 const sim=make(2),t=build(sim);fundTo(sim,500,100);hire(sim,'borin');const [h]=allies(sim);kill(sim,h.id);run(sim,1);
 const cost=reviveCost(mercenary('borin'));assert.deepEqual(cost,{gold:Math.ceil(180*.45)});assert.equal(cost.gold,81);assert.equal(REVIVE_TICKS,900);
 const goldBefore=sim.state.gold;
 const r=spent(sim,()=>sim.send({type:'tavern',requestId:'rv1',action:'revive',slot:0}));
 assert.deepEqual([r.wood,r.iron,r.gold],[0,0,cost.gold]);const at=sim.clock.tick;assert.equal(sim.state.tavern.slots[0].status,'reviving');
 const twice=spent(sim,()=>{sim.send({type:'tavern',requestId:'rv2',action:'revive',slot:0});sim.send({type:'tavern',requestId:'rv1',action:'revive',slot:0});});
 assert.deepEqual(rejected(twice.log),['Already returning','Already returning']);assert.deepEqual([twice.wood,twice.iron,twice.gold],[0,0,0],'charged once');
 let back;run(sim,REVIVE_TICKS+10,()=>{if(!back&&sim.state.tavern.slots[0].status==='alive'){back=sim.clock.tick;}});
 assert.ok(back,'returned');assert.ok(Math.abs((back-at)-REVIVE_TICKS)<=3,`returned ${back-at} ticks after the order`);
 const s=sim.state.tavern.slots[0],u=sim.state.units[s.unitId];assert.ok(u&&u.hp===u.maxHp&&u.ally.slot===0&&u.ally.merc==='borin'&&u.ally.order.type==='follow');assert.equal(u.maxHp,Math.round(833*1.4));
 assert.equal(sim.state.gold,goldBefore-cost.gold);assert.equal(allies(sim).length,1);
 const alive=spent(sim,()=>sim.send({type:'tavern',requestId:'rv3',action:'revive',slot:0}));assert.deepEqual(rejected(alive.log),['That hero is not fallen']);
 assert.ok(t.hp>0);
});

test('Revive needs the money, and an unaffordable one changes nothing',()=>{
 const sim=make(),t=build(sim);fundTo(sim,500,100);hire(sim,'kael');kill(sim,allies(sim)[0].id);run(sim,1);fundTo(sim,500,100,10);
 const r=spent(sim,()=>sim.send({type:'tavern',requestId:'rvp',action:'revive',slot:0}));assert.deepEqual(rejected(r.log),['Not enough Gold']);assert.equal(sim.state.tavern.slots[0].status,'dead');assert.ok(t);
});

test('Dismiss releases the slot (alive, dead or returning) and a new hire fits; nothing is refunded',()=>{
 const sim=make();build(sim);fundTo(sim,900,100);hire(sim,'roland');const [h]=allies(sim);
 const d=spent(sim,()=>sim.send({type:'tavern',requestId:'d1',action:'dismiss',slot:0}));
 assert.ok(d.log.some(e=>e.type==='tavern'&&e.action==='dismiss'));assert.equal(sim.state.tavern.slots.length,0);assert.ok(!sim.state.units[h.id]);assert.deepEqual([d.wood,d.iron,d.gold],[0,0,0]);
 hire(sim,'borin');kill(sim,allies(sim)[0].id);run(sim,1);spent(sim,()=>sim.send({type:'tavern',requestId:'rv',action:'revive',slot:0}));assert.equal(sim.state.tavern.slots[0].status,'reviving');
 spent(sim,()=>sim.send({type:'tavern',requestId:'d2',action:'dismiss',slot:0}));assert.equal(sim.state.tavern.slots.length,0);
 run(sim,REVIVE_TICKS+5);assert.equal(allies(sim).length,0,'a dismissed returning hero does not come back');
 hire(sim,'kael');assert.equal(allies(sim).length,1);assert.deepEqual(rejected(spent(sim,()=>sim.send({type:'tavern',requestId:'d3',action:'dismiss',slot:5})).log),['No such hero']);
});

test('slots renumber after a Dismiss so every hero keeps a distinct Follow slot',()=>{
 const sim=make(3);build(sim);fundTo(sim,900,200);for(const m of ROSTER)hire(sim,m);
 spent(sim,()=>sim.send({type:'tavern',requestId:'dd',action:'dismiss',slot:0}));
 assert.deepEqual(sim.state.tavern.slots.map(s=>s.merc),['borin','kael']);assert.deepEqual(allies(sim).map(u=>[u.ally.merc,u.ally.slot]).sort(),[['borin',0],['kael',1]]);
});

test('a destroyed Tavern stops hiring and reviving; a revive in progress waits and resumes when a Tavern stands again',()=>{
 const sim=make(2),t=build(sim);fundTo(sim,900,200);hire(sim,'roland');hire(sim,'kael');
 kill(sim,allies(sim)[0].id);run(sim,1);spent(sim,()=>sim.send({type:'tavern',requestId:'r',action:'revive',slot:0}));run(sim,300);
 const left=sim.state.tavern.slots[0].remaining;assert.ok(left<=REVIVE_TICKS-299&&left>0);
 t.hp=1;strike(sim,'red-base',t.id);run(sim,1);assert.ok(!sim.state.structures[t.id],'the Tavern fell');assert.equal(sim.tavernStanding(),false);
 const r1=hire(sim,'borin'),r2=spent(sim,()=>sim.send({type:'tavern',requestId:'r9',action:'revive',slot:1}));
 assert.deepEqual(rejected(r1.log),['Build a Tavern first']);assert.deepEqual(rejected(r2.log),['Build a Tavern first']);assert.deepEqual([r1.gold,r1.wood,r2.gold,r2.iron],[0,0,0,0]);
 const waiting=sim.state.tavern.slots[0].remaining;run(sim,REVIVE_TICKS);assert.equal(sim.state.tavern.slots[0].remaining,waiting,'the revive waits with no Tavern');assert.equal(sim.state.tavern.slots[0].status,'reviving');
 assert.equal(sim.state.tavern.slots.length,2,'slots still occupied');
 assert.equal(sim.placementReason('tavern',20,20)==='Tavern already built',false,'a new Tavern may be built');
 build(sim);run(sim,waiting+5);assert.equal(sim.state.tavern.slots[0].status,'alive','resumed and completed');
 const dis=spent(sim,()=>sim.send({type:'tavern',requestId:'dz',action:'dismiss',slot:1}));assert.ok(dis.log.some(e=>e.action==='dismiss'));
});

test('orders to Tavern heroes still work while the Guardian is down, and the Tavern works then too',()=>{
 const sim=make(),t=build(sim);fundTo(sim,500,100);hire(sim,'roland');const [h]=allies(sim);
 sim.hero.hp=1;strike(sim,'red-base','guardian');run(sim,1);assert.ok(sim.hero.hp<=0);
 sim.send({type:'ally',requestId:'dead-o',id:h.id,order:{type:'defend',x:h.x+48,y:h.y}});const log=run(sim,2);
 assert.ok(log.some(e=>e.type==='ally-order'));assert.ok(t);
});

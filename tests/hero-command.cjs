const {test}=require('node:test'),assert=require('node:assert/strict');
const {heroCommand,heroIdle,targeting}=require('../.test-build/ui/heroCommand.js');
const {level,calm,run,ally,strike}=require('./support/allyBot.cjs');
// Chapter 5 Hero Command HUD (docs/CHAPTER5_HERO_HUD.md): the command state machine, and Simple Commands through Simulation.send({type:'ally'}).
const step=(s,...actions)=>actions.reduce((acc,a)=>{const r=heroCommand(acc.state,a);return {state:r.state,follow:r.follow??acc.follow};},{state:s});
test('portrait: selects a hero and opens the popover; the same portrait closes it; another portrait switches hero',()=>{
 assert.deepEqual(heroCommand(heroIdle,{type:'portrait',id:'a'}).state,{mode:'menu',selected:'a'});
 assert.deepEqual(step(heroIdle,{type:'portrait',id:'a'},{type:'portrait',id:'a'}).state,heroIdle);
 assert.deepEqual(step(heroIdle,{type:'portrait',id:'a'},{type:'portrait',id:'b'}).state,{mode:'menu',selected:'b'});
});
test('Follow executes immediately and returns to idle',()=>{
 const r=step(heroIdle,{type:'portrait',id:'a'},{type:'command',order:'follow'});
 assert.deepEqual(r.state,heroIdle);assert.equal(r.follow,'a');
});
test('Attack and Defend enter target mode; a successful pick exits; a refused tap stays with its reason',()=>{
 for(const order of ['attack','defend']){
  const t=step(heroIdle,{type:'portrait',id:'a'},{type:'command',order}).state;assert.deepEqual(t,{mode:order,selected:'a'});assert.ok(targeting(t));
  assert.deepEqual(step(t,{type:'refused',reason:'Tap an enemy or a structure'}).state,{mode:order,selected:'a',reason:'Tap an enemy or a structure'});
  assert.deepEqual(step(t,{type:'picked'}).state,heroIdle);
 }
});
test('cancel: the selected portrait while targeting, the cancel action, and a dead selected hero all return to idle',()=>{
 const t=step(heroIdle,{type:'portrait',id:'a'},{type:'command',order:'attack'}).state;
 assert.deepEqual(step(t,{type:'portrait',id:'a'}).state,heroIdle);
 assert.deepEqual(step(t,{type:'cancel'}).state,heroIdle);
 assert.deepEqual(step(t,{type:'roster',ids:['b']}).state,heroIdle);
 assert.deepEqual(step(t,{type:'roster',ids:['a','b']}).state,t,'a living selected hero keeps the mode');
 assert.deepEqual(step(t,{type:'portrait',id:'b'}).state,{mode:'menu',selected:'b'},'another portrait switches hero');
});
test('map taps close the popover but are left to the HUD in target mode; commands outside the popover do nothing',()=>{
 assert.deepEqual(step(heroIdle,{type:'portrait',id:'a'},{type:'map'}).state,heroIdle);
 const t=step(heroIdle,{type:'portrait',id:'a'},{type:'command',order:'defend'}).state;assert.deepEqual(step(t,{type:'map'}).state,t);
 assert.deepEqual(step(heroIdle,{type:'command',order:'attack'}).state,heroIdle);
 assert.deepEqual(step(t,{type:'command',order:'follow'}).state,t);
 assert.deepEqual(step(heroIdle,{type:'refused',reason:'x'},{type:'picked'}).state,heroIdle);
});

// The send() pathway.
const events=(sim,ticks=2)=>run(sim,ticks);
test("send({type:'ally'}): each Simple Command is applied at the next tick with an ally-order event",()=>{
 const sim=calm(level(34)),id=ally(sim,560,600);
 assert.equal(sim.send({type:'ally',requestId:'r1',id,order:{type:'attack',targetId:'c4-fwd-north'}}),true);
 let log=events(sim);assert.deepEqual(sim.state.units[id].ally.order,{type:'attack',targetId:'c4-fwd-north'});
 assert.ok(log.some(e=>e.type==='ally-order'&&e.id===id&&e.requestId==='r1'&&e.order.type==='attack'));
 sim.send({type:'ally',requestId:'r2',id,order:{type:'defend',x:610,y:590}});log=events(sim);
 const o=sim.state.units[id].ally.order;assert.equal(o.type,'defend');assert.ok((o.x/48)%1===.5&&(o.y/48)%1===.5,'snapped to a cell centre');
 sim.send({type:'ally',requestId:'r3',id,order:{type:'follow'}});events(sim);assert.deepEqual(sim.state.units[id].ally.order,{type:'follow'});
});
test('refused commands come back as rejected events with the reason the HUD shows, and change nothing',()=>{
 const sim=calm(level(32)),id=ally(sim,760,600);
 const cases=[['red-base','Shielded'],['blue-base','not an ally'],['nope','Tap an enemy']];
 for(const [k,[targetId,why]] of cases.entries()){sim.send({type:'ally',requestId:`x${k}`,id,order:{type:'attack',targetId}});const log=events(sim);
  const r=log.find(e=>e.type==='rejected'&&e.requestId===`x${k}`);assert.ok(r&&r.reason.includes(why),`${targetId}: ${r?.reason}`);}
 sim.send({type:'ally',requestId:'x9',id,order:{type:'defend',x:-50,y:600}});assert.ok(events(sim).some(e=>e.type==='rejected'&&e.reason==="Can't hold there"));
 sim.send({type:'ally',requestId:'x10',id:'blue-0',order:{type:'follow'}});assert.ok(events(sim).some(e=>e.type==='rejected'&&e.requestId==='x10'),'an ordinary minion is not an Allied Hero');
 assert.deepEqual(sim.state.units[id].ally.order,{type:'follow'});
});
test('allyOrderReason answers synchronously what the tick would refuse',()=>{
 const sim=calm(level(32)),id=ally(sim,760,600);
 assert.equal(sim.allyOrderReason(id,{type:'attack',targetId:'c4-camp-north'}),undefined);
 assert.match(sim.allyOrderReason(id,{type:'attack',targetId:'red-base'}),/Shielded/);
 assert.equal(sim.allyOrderReason('blue-h-99',{type:'follow'}),'That hero has fallen');
});
test('malformed ally commands are refused by send() itself',()=>{
 const sim=calm(level(34)),id=ally(sim,560,600);
 for(const bad of [{type:'ally',id,order:{type:'follow'}},{type:'ally',requestId:'a',id,order:{type:'charge'}},{type:'ally',requestId:'a',id,order:{type:'defend',x:NaN,y:1}},{type:'ally',requestId:'a',id,order:{type:'attack'}},{type:'ally',requestId:'a',order:{type:'follow'}}])
  assert.equal(sim.send(bad),false,JSON.stringify(bad));
});
test('heroes take orders while the Guardian is down; nothing is accepted while paused',()=>{
 const sim=calm(level(34)),id=ally(sim,560,600);
 strike(sim,'red-base','guardian');assert.ok(sim.hero.hp<=0);
 sim.send({type:'ally',requestId:'d1',id,order:{type:'attack',targetId:'c4-fwd-north'}});events(sim);
 assert.equal(sim.state.units[id].ally.order.type,'attack','accepted while the Guardian is dead');
 sim.setPaused(true);assert.equal(sim.send({type:'ally',requestId:'p1',id,order:{type:'follow'}}),false);
});

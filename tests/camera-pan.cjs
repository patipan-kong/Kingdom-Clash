'use strict';
// Camera behavior while the Guardian is dead (regression: the camera was tied to the corpse during the respawn countdown).
const test=require('node:test'),assert=require('node:assert/strict');
const {cameraAction,deadPan}=require('../.test-build/ui/cameraPan');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {projection}=require('../.test-build/world/layout');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
const bounds={width:2000,height:1200},view={width:960,height:540};
const base={dead:false,wasDead:false,moving:false,lookExpired:false};

test('alive: moving or an expired look-at follows the Guardian, otherwise the camera is untouched',()=>{
 assert.equal(cameraAction({...base,moving:true}),'follow');
 assert.equal(cameraAction({...base,lookExpired:true}),'follow');
 assert.equal(cameraAction(base),'none');
});
test('dead: input pans the camera; nothing ever re-follows or snaps back to the corpse, even after a minimap look-at expires',()=>{
 assert.equal(cameraAction({...base,dead:true,moving:true}),'pan');
 assert.equal(cameraAction({...base,dead:true}),'none');
 assert.equal(cameraAction({...base,dead:true,lookExpired:true}),'none');
 assert.equal(cameraAction({...base,dead:true,wasDead:true,moving:true}),'pan');
});
test('respawn: the first alive frame resumes the (smoothed) follow, once',()=>{
 assert.equal(cameraAction({...base,wasDead:true}),'follow');
 assert.equal(cameraAction({...base,wasDead:false}),'none');
});
test('dead pan moves at Guardian speed in view space, normalizes diagonals and ignores a stalled frame spike',()=>{
 const p=deadPan({x:500,y:300},{x:1,y:0},100,bounds,view);assert.ok(Math.abs(p.x-(500+28*projection.x))<1e-9);assert.equal(p.y,300);
 const d=deadPan({x:500,y:300},{x:1,y:1},100,bounds,view);assert.ok(Math.hypot((d.x-500)/projection.x,(d.y-300)/projection.y)<=28+1e-9);
 const spike=deadPan({x:500,y:300},{x:1,y:0},5000,bounds,view);assert.equal(spike.x,deadPan({x:500,y:300},{x:1,y:0},100,bounds,view).x);
 assert.deepEqual(deadPan({x:500,y:300},{x:0,y:0},33,bounds,view),{x:500,y:300});
});
test('dead pan respects the camera bounds on every edge',()=>{
 assert.deepEqual(deadPan({x:2,y:2},{x:-1,y:-1},100,bounds,view),{x:0,y:0});
 const e=deadPan({x:bounds.width-view.width-1,y:bounds.height-view.height-1},{x:1,y:1},100,bounds,view);
 assert.deepEqual(e,{x:bounds.width-view.width,y:bounds.height-view.height});
 assert.deepEqual(deadPan({x:0,y:0},{x:1,y:1},100,{width:500,height:300},view),{x:0,y:0},'view larger than the world cannot scroll');
});
test('a dead Guardian stays immobile and cannot attack or cast while the camera is free; respawn restores control',()=>{
 const s=new Simulation('cam','extended');s.state.units={guardian:s.hero};s.state.spawnedWaves=12;s.spawnQueue.length=0;
 ticks(s,70);s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');assert.equal(s.hero.hp,0);
 const at={x:s.hero.x,y:s.hero.y};
 s.state.units.dummy={id:'dummy',kind:'minion-red',team:'red',x:at.x+40,y:at.y,hp:240,maxHp:240,armor:0,radius:12,speed:0,damage:0,range:48,cooldownTicks:30,windupTicks:9,readyTick:0,protectionTick:0};
 for(let i=0;i<60;i++){s.send({type:'move',x:1,y:1});s.send({type:'attack'});ticks(s,1);}
 assert.deepEqual({x:s.hero.x,y:s.hero.y},at,'no movement while dead');assert.equal(s.state.units.dummy.hp,240,'no attack while dead');
 const before=s.state.gold;assert.equal(s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'cam-buy',itemId:'iron-sword'}),true);ticks(s,2);assert.ok(s.state.gold<before,'dead-state trading still works');
 ticks(s,s.hero.respawnTick-s.clock.tick+2);assert.equal(s.hero.hp,s.hero.maxHp);
 const x0=s.hero.x;s.send({type:'move',x:1,y:0});ticks(s,10);assert.ok(s.hero.x>x0,'movement restored after respawn');
});

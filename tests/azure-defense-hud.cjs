'use strict';
// Azure tower behaviour (diagnosis contract) and the always-visible Azure Keep HP plate state/layout.
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {minionStats}=require('../.test-build/data/combat');
const {entities}=require('../.test-build/world/layout');
const {azureKeepHudLayout,azureKeepHudState,azureKeepHudRules,azureKeepHudColors}=require('../.test-build/ui/azureKeepHud');
const {combatVariants}=require('../.test-build/data/gameplayV041');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30+.01);};
const probe=(id,team,x,y)=>({...minionStats,id,kind:'minion-'+team,team,x,y,hp:240,speed:0,damage:0,readyTick:1e9,protectionTick:0});
function builtTower(v){
 const s=new Simulation('azure-tower','extended',undefined,v);s.state.units={guardian:s.hero};s.hero.x=200;s.hero.y=1000;s.state.spawnedWaves=99;s.spawnQueue.length=0;
 s.state.wood=500;s.state.iron=100;s.economy.balances={...s.economy.balances,wood:500*120,iron:100*120};
 s.send({type:'place',kind:'tower',col:10,row:12,requestId:'p'});ticks(s,160);return {s,t:Object.values(s.state.structures).find(b=>b.team==='blue')};
}

test('player-built Azure towers shoot Crimson minions in range with the unchanged 18 damage / 24-tick cadence (A and B)',()=>{
 for(const v of [combatVariants.a,combatVariants.b]){
  const {s,t}=builtTower(v);assert.equal(t.progress,1);assert.deepEqual([t.damage,t.range,t.cooldownTicks],[18,240,24]);
  const red=probe('red-probe','red',t.x+150,t.y);s.state.units[red.id]=red;s.drainEvents();ticks(s,90);
  const hits=s.drainEvents().filter(e=>e.type==='damage'&&e.sourceId===t.id);
  assert.deepEqual(hits.map(e=>[e.id,e.raw]),[['red-probe',18],['red-probe',18],['red-probe',18],['red-probe',18]],v.id);assert.equal(red.hp,240-72);
 }
});

test('Azure towers never damage allies, ignore targets beyond range, and stop while under construction',()=>{
 const {s,t}=builtTower(combatVariants.a);
 const ally=probe('blue-ally','blue',t.x+40,t.y),far=probe('red-far','red',t.x+260,t.y);s.state.units[ally.id]=ally;s.state.units[far.id]=far;s.hero.x=t.x;s.hero.y=t.y+70;
 s.drainEvents();ticks(s,90);assert.equal(ally.hp,240);assert.equal(far.hp,240);assert.equal(s.drainEvents().filter(e=>e.sourceId===t.id).length,0);
 assert.equal(s.hero.hp,s.hero.maxHp,'the Guardian is never a target either');
 const u=new Simulation('azure-build','extended');u.state.units={guardian:u.hero};u.state.spawnedWaves=99;u.spawnQueue.length=0;u.state.wood=500;u.state.iron=100;u.economy.balances={...u.economy.balances,wood:500*120,iron:100*120};
 u.send({type:'place',kind:'tower',col:10,row:12,requestId:'p'});ticks(u,30);const pending=Object.values(u.state.structures).find(b=>b.team==='blue');assert.ok(pending.progress<1);
 const red=probe('red-probe','red',pending.x+150,pending.y);u.state.units[red.id]=red;ticks(u,30);assert.equal(red.hp,240,'an unfinished tower does not fire');
});

test('the removed decorative Azure tower is absent; legitimate map walls remain non-combat obstacles',()=>{
 const decor=entities.filter(e=>e.team==='blue'&&(e.kind==='tower'||e.kind==='wall')).map(e=>e.id);assert.deepEqual(decor,['wall-a','wall-b']);
 for(const id of ['extended','prototype']){const s=new Simulation('decor',id);assert.deepEqual(Object.values(s.state.structures).filter(b=>b.team==='blue'),[]);for(const d of decor)assert.equal(s.state.structures[d],undefined);}
 assert.equal(new Simulation('decor','extended').state.bases['blue-base'].damage,0,'Azure Keep stays inert');
});

test('Azure Keep HUD state: exact current/max text, clamped fraction, damaged below 50%, low below 30%, destroyed at 0',()=>{
 assert.deepEqual(azureKeepHudState(3000,3000),{fraction:1,level:'healthy',text:'3000 / 3000'});
 assert.equal(azureKeepHudState(1500,3000).level,'healthy');assert.equal(azureKeepHudState(1499.5,3000).level,'damaged');assert.equal(azureKeepHudState(1499.5,3000).text,'1500 / 3000');
 assert.equal(azureKeepHudState(900,3000).level,'damaged');assert.equal(azureKeepHudState(899.99,3000).level,'low');assert.equal(azureKeepHudState(899.99,3000).text,'900 / 3000');
 assert.deepEqual(azureKeepHudState(0,3000),{fraction:0,level:'destroyed',text:'0 / 3000'});assert.equal(azureKeepHudState(-5,3000).text,'0 / 3000');assert.equal(azureKeepHudState(3500,3000).fraction,1);
 assert.deepEqual([azureKeepHudRules.warnFraction,azureKeepHudRules.lowFraction],[.5,.3]);assert.equal(azureKeepHudColors.healthy.bar,0x70d7ff,'same blue as the world Keep bar');
});

test('Azure Keep HUD state follows the real simulation Keep with no healing between hits',()=>{
 const s=new Simulation('keep-hud','extended'),base=s.state.bases['blue-base'],src={...s.hero,id:'raider',kind:'minion-red',team:'red'};
 const seen=[];for(let i=0;i<4;i++){s.hit(src,base,700,'direct');ticks(s,30);seen.push(azureKeepHudState(base.hp,base.maxHp));}
 assert.deepEqual(seen.map(v=>v.text),['2300 / 3000','1600 / 3000','900 / 3000','200 / 3000']);assert.deepEqual(seen.map(v=>v.level),['healthy','healthy','damaged','low']);
 ticks(s,300);assert.equal(azureKeepHudState(base.hp,base.maxHp).text,'200 / 3000','no regeneration');
});

test('Azure Keep HUD layout: right-aligned under the minimap, CSS-constant size, clear of the 844×390 and 960×540 controls',()=>{
 const map={x:812,y:16,width:136,height:82};
 for(const [w,h] of [[960,540],[844,390],[1280,720],[667,375]]){
  const s=Math.min(w/960,h/540),k=azureKeepHudLayout(s,map);
  assert.ok(Math.abs(k.x+k.width-952)<1e-9,'right edge = minimap panel');assert.ok(k.y>=105,'below the minimap shadow');
  assert.ok(Math.abs(k.width*s-170)<1e-9&&Math.abs(k.height*s-30)<1e-9,'170×30 CSS px at every size');
  assert.ok(k.x>=0&&k.y+k.height<=540);assert.ok(k.bar.x>k.x&&k.bar.x+k.bar.width<k.x+k.width&&k.bar.y+k.bar.height<k.y+k.height);
 }
});

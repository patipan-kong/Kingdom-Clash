const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
// Chapter 3 Mission 3 gives the player an Azure Barracks; these tests are about the Crimson side, so they run the Frost Citadel match without it.
const noAzure=({azure:_azure,...setup})=>setup;
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {isSoldier,isBarracks,standoff,soldierAnchor,ANCHOR_GRID}=require('../.test-build/simulation/SoldierProto.js');
// Chapter 3 soldier AI prototype (src/simulation/SoldierProto.ts). Harness-only: nothing sets Simulation.soldierProto in a scene, level or debug launch.
const unit=(id,x,y)=>({id,kind:'minion-blue',team:'blue',x,y,hp:240,maxHp:240,range:48,radius:12,damage:18,armor:0,speed:95,cooldownTicks:30,windupTicks:9,readyTick:0,protectionTick:0});
const run=(sim,ticks)=>{for(let i=0;i<ticks&&!sim.ended;i++){sim.advance(1000/30+.01);sim.drainEvents();}};
const spawn=(sim,id,x,y)=>sim.spawnQueue.push({tick:1,team:'blue',id,x,y,wave:0});

test('the prototype is inert by default and only recognises blue-s- minions and Barracks ids',()=>{
 const sim=new Simulation('sp-inert',noAzure(campaign.setup(23)));
 assert.equal(sim.soldierProto,undefined);
 assert.ok(isSoldier(unit('blue-s-3',0,0)));assert.ok(!isSoldier(unit('blue-w1-0',0,0)));assert.ok(!isSoldier({...unit('blue-s-3',0,0),kind:'minion-red'}));
 assert.ok(isBarracks(sim.state.structures['red-barracks-north']));assert.ok(!isBarracks(sim.state.structures['red-gate']));
});

test('reach: a 48 px melee unit cannot touch a 2 x 2 Barracks from outside (stock); a soldier measures from the footprint edge',()=>{
 const sim=new Simulation('sp-reach',noAzure(campaign.setup(23))),st=combatStructures(sim.state),b=sim.state.structures['red-barracks-north'];
 for(const d of [60,72])assert.equal(canAttackOn(sim.geo,unit('blue-7',b.x,b.y+d),b,st),false,`stock, centre distance ${d}`);
 assert.equal(canAttackOn(sim.geo,unit('blue-s-7',b.x,b.y+60),b,st),true,'soldier at the footprint edge plus its radius');
 assert.equal(canAttackOn(sim.geo,unit('blue-s-7',b.x,b.y+110),b,st),false,'soldier too far');
 const p=standoff(unit('blue-s-7',b.x,b.y+200),b);assert.ok(Math.abs(p.y-(b.y+48+48*.6))<1e-9&&p.x===b.x,'stand-off lies inside reach on the near side');
});

test('advance: a soldier attacks a hostile Barracks that a stock blue minion ignores',()=>{
 const hpAfter=(id,proto)=>{const sim=new Simulation('sp-adv-'+id,noAzure(campaign.setup(23)));if(proto)sim.soldierProto=proto;spawn(sim,id,1448,240);run(sim,240);return sim.state.structures['red-barracks-north'].hp;};
 assert.equal(hpAfter('blue-x-0',undefined),2500,'stock blue minion leaves the Barracks alone');
 assert.ok(hpAfter('blue-s-0',{mode:'advance'})<2500,'advance soldier damages it');
});

test('anchored: a soldier walks to a throttled, grid-snapped anchor at the Guardian and holds there; it follows when the Guardian moves',()=>{
 const sim=new Simulation('sp-anchor',noAzure(campaign.setup(23)));sim.soldierProto={mode:'anchored'};
 spawn(sim,'blue-s-0',500,552);assert.ok(sim.teleportHero(700,600));run(sim,200);
 const u=()=>sim.state.units['blue-s-0'],h=sim.hero,d=()=>Math.hypot(u().x-h.x,u().y-h.y);
 assert.ok(d()<=120+ANCHOR_GRID,`holds near the Guardian (${d().toFixed(0)} px)`);
 const a=soldierAnchor(sim.state,sim.clock.tick);assert.ok(Math.hypot(a.x-h.x,a.y-h.y)<=ANCHOR_GRID,'the anchor sits at the Guardian');assert.equal(sim.geo.blocked(a.x,a.y,12,combatStructures(sim.state)),false,'on open ground');
 assert.ok(sim.teleportHero(900,700));run(sim,200);
 assert.ok(d()<=120+ANCHOR_GRID,`follows the Guardian (${d().toFixed(0)} px)`);
});

test('hybrid: a soldier advances, stands at the leash instead of pacing, returns past leash + 60 and resumes inside leash - 120 (no flip-flopping)',()=>{
 const {hybridStats,LEASH}=require('../.test-build/simulation/SoldierProto.js');
 hybridStats.toReturn=0;hybridStats.toAdvance=0;
 const sim=new Simulation('sp-hybrid',noAzure(campaign.setup(23)));sim.soldierProto={mode:'hybrid'};
 spawn(sim,'blue-s-0',500,552);assert.ok(sim.teleportHero(620,600));run(sim,5);
 const u=()=>sim.state.units['blue-s-0'],h=sim.hero,d=()=>Math.hypot(u().x-h.x,u().y-h.y);
 u().speed=120; // footman speed
 run(sim,200);
 assert.ok(d()<=LEASH+8&&d()>=LEASH-40,`stands at the tether (${d().toFixed(0)} px)`);
 run(sim,30);assert.ok(d()<=LEASH+8,'does not pace further out');assert.equal(hybridStats.toReturn,0,'no mode change while tethered');
 assert.ok(sim.teleportHero(500,600));run(sim,20);
 assert.equal(hybridStats.toReturn,1,'returns once past leash + 60');
 run(sim,80);
 assert.equal(hybridStats.toAdvance,1,'resumes once inside leash - 120');assert.ok(hybridStats.toReturn<=1,'one return, not a flip-flop');
});

test('human playtest entry: only dev + debug=1 + soldierTest=400|600 activates it, and it queues four soldiers once with the chosen leash',()=>{
 const {soldierTestFromSearch,applySoldierTest}=require('../.test-build/data/soldierTest.js');
 assert.equal(soldierTestFromSearch('?debug=1&chapter=3&mission=2&soldierTest=400',true),400);
 assert.equal(soldierTestFromSearch('?debug=1&soldierTest=600',true),600);
 for(const q of ['?debug=1&soldierTest=500','?soldierTest=400','?debug=1','']) assert.equal(soldierTestFromSearch(q,true),null,q);
 assert.equal(soldierTestFromSearch('?debug=1&soldierTest=400',false),null,'never in production');
 const sim=new Simulation('sp-entry',noAzure(campaign.setup(23)));globalThis.document={title:''};
 applySoldierTest(sim,400);
 assert.deepEqual(sim.soldierProto,{mode:'hybrid',leash:400});
 run(sim,40);
 const alive=()=>Object.keys(sim.state.units).filter(i=>i.startsWith('blue-s-')&&sim.state.units[i].hp>0);
 assert.equal(alive().length,4);for(const i of alive())assert.deepEqual([sim.state.units[i].maxHp,sim.state.units[i].armor,sim.state.units[i].damage,sim.state.units[i].speed],[320,10,20,120],'footman stats');
 run(sim,300);assert.ok(alive().length<=4,'no replacements');
});

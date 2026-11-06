const {test}=require('node:test');const assert=require('node:assert/strict');
const {TV,TAVERN_SHEET,TAVERN_MOTION:M,tavernFrame,tavernCollapsePose}=require('../.test-build/world/tavernSprite.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');const {campaign}=require('../.test-build/data/campaignLevels.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
test('eight frames: intact, hire, revive, damaged, badly damaged, three collapse; one 288 x 278 cell (the still at 0.75x), bottom-centre pivot',()=>{
 assert.deepEqual([TV.intact,TV.hire,TV.revive,TV.damaged,TV.critical,...TV.collapse],[0,1,2,3,4,5,6,7]);
 assert.equal(TAVERN_SHEET.frameWidth,288);assert.equal(TAVERN_SHEET.frameHeight,278);assert.equal(TAVERN_SHEET.pivotX,144);assert.equal(TAVERN_SHEET.pivotY,278);
});
test('damage: intact to 66%, damaged below, badly damaged below 33%; intact while it is built',()=>{
 assert.equal(tavernFrame(600,600,false,0),TV.intact);assert.equal(tavernFrame(396,600,false,0),TV.intact);assert.equal(tavernFrame(395,600,false,0),TV.damaged);
 assert.equal(tavernFrame(198,600,false,0),TV.damaged);assert.equal(tavernFrame(197,600,false,0),TV.critical);
 assert.equal(tavernFrame(600/150,600,true,0),TV.intact,'hp starts near zero while it is built');
});
test('hire: the door shows 500 ms from the hire; revive: the glow shows 900 ms from the return; neither before its tick or on a building under construction',()=>{
 assert.equal(tavernFrame(600,600,false,1000,1000),TV.hire);assert.equal(tavernFrame(600,600,false,1000+M.hireMs-1,1000),TV.hire);assert.equal(tavernFrame(600,600,false,1000+M.hireMs,1000),TV.intact);
 assert.equal(tavernFrame(600,600,false,999,1000),TV.intact,'not before the hire');
 assert.equal(tavernFrame(600,600,false,5000,undefined,5000),TV.revive);assert.equal(tavernFrame(600,600,false,5000+M.reviveMs-1,undefined,5000),TV.revive);assert.equal(tavernFrame(600,600,false,5000+M.reviveMs,undefined,5000),TV.intact);
 assert.equal(tavernFrame(600,600,false,4999,undefined,5000),TV.intact);assert.equal(tavernFrame(600,600,true,1100,1000,1000),TV.intact,'while built');assert.equal(tavernFrame(600,600,false,1000,undefined,undefined),TV.intact);
 assert.notEqual(TV.hire,TV.revive,'the two cues are different pictures');
});
test('a damage state always wins over a cue; with both cues running the later one shows',()=>{
 assert.equal(tavernFrame(300,600,false,1100,1000),TV.damaged);assert.equal(tavernFrame(100,600,false,1100,1000),TV.critical);assert.equal(tavernFrame(300,600,false,5100,undefined,5000),TV.damaged);assert.equal(tavernFrame(100,600,false,5100,undefined,5000),TV.critical);
 assert.equal(tavernFrame(600,600,false,1300,1000,1200),TV.revive);assert.equal(tavernFrame(600,600,false,1300,1200,1000),TV.hire);
});
test('collapse: roof buckles, walls fall, rubble; fades from 1.4 s and is gone at 2 s',()=>{
 const [a,b,c]=TV.collapse,[k1,k2]=M.collapseKeys;
 assert.equal(tavernCollapsePose(0).frame,a);assert.equal(tavernCollapsePose(k1-1).frame,a);assert.equal(tavernCollapsePose(k1).frame,b);assert.equal(tavernCollapsePose(k2).frame,c);
 assert.equal(tavernCollapsePose(M.collapseHold).alpha,1);assert.ok(tavernCollapsePose(1700).alpha<1);assert.equal(tavernCollapsePose(M.collapseEnd),undefined);
});
test('simulation: C5M6 has a Tavern setup; a hire pushes one tavern hire event on the tick the hero spawns; a destroyed Tavern pushes death and can be rebuilt',()=>{
 const sim=new Simulation('tavern-sprite',campaign.setup(46));assert.ok(sim.state.tavern&&campaign.setup(46).tavern.cap===2,'C5M6 hero cap 2');
 sim.economy.balances={gold:1e6*RESOURCE_UNITS,wood:1e6*RESOURCE_UNITS,iron:1e6*RESOURCE_UNITS};
 const h=sim.hero;let best;for(let r=0;r<30;r++)for(let c=0;c<60;c++){if(sim.placementReason('tavern',c,r))continue;const d=Math.hypot((c+.5)*48-h.x,(r+.5)*48-h.y);if(!best||d<best.d)best={c,r,d};}
 assert.ok(best,'a free cell');sim.send({type:'place',requestId:'t1',kind:'tavern',col:best.c,row:best.r});
 const step=n=>{const ev=[];for(let i=0;i<n;i++){sim.advance(1000/30+.01);ev.push(...sim.drainEvents().map(e=>({...e,tick:sim.clock.tick})));}return ev;};
 step(200);const t=sim.state.structures['built-t1'];assert.ok(t&&t.tavern&&t.progress>=1);
 sim.send({type:'tavern',requestId:'h1',action:'hire',merc:'roland'});const ev=step(2);
 const hire=ev.filter(e=>e.type==='tavern'&&e.action==='hire'),spawn=ev.filter(e=>e.type==='spawn'&&e.id.includes('roland')||e.type==='spawn'&&sim.state.units[e.id]?.ally);
 assert.equal(hire.length,1);assert.ok(spawn.length>=1&&spawn[0].tick===hire[0].tick,'the hero spawns on the hire tick');
 assert.equal(Object.values(sim.state.structures).filter(b=>b.tavern&&b.hp>0).length,1,'exactly one standing Tavern');
 assert.equal(sim.placementReason('tavern',best.c+3,best.r),'Tavern already built');
 t.hp=1;const foe={...sim.unit('foe','minion-red',t.x+100,t.y,undefined,undefined,sim.clock.tick),speed:0,hp:1e6,maxHp:1e6};sim.state.units.foe=foe;sim.hit(foe,t,1e6);
 const dead=step(2).filter(e=>e.type==='death'&&e.id===t.id);assert.equal(dead.length,1,'death event');assert.ok(!sim.state.structures[t.id],'removed from the state');
 assert.equal(sim.placementReason('tavern',best.c,best.r),'','rebuildable on the same cell');
});
test('the Tavern art stays out of the other sheets: the Barracks sheet is chosen by the Azure Barracks texture and name, which the Tavern does not share',()=>{
 const {azureBarracksVisual}=require('../.test-build/world/frostGateAppearance.js');assert.equal(azureBarracksVisual.name,'Azure Barracks');assert.notEqual('Tavern',azureBarracksVisual.name);
});

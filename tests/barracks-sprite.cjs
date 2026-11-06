const {test}=require('node:test');const assert=require('node:assert/strict');
const {BF,BARRACKS_SHEET,BARRACKS_MOTION:M,barracksFrame,barracksCollapsePose,recruiterOf}=require('../.test-build/world/barracksSprite.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');const {campaign}=require('../.test-build/data/campaignLevels.js');
const {azureBarracksVisual,barracksVisual}=require('../.test-build/world/frostGateAppearance.js');
const {TRAIN_TICKS,TRAIN_STAGGER}=require('../.test-build/simulation/AzureBarracks.js');
test('seven frames: intact, recruiting, damaged, badly damaged, three collapse; the still\'s own cell',()=>{
 assert.deepEqual([BF.intact,BF.recruit,BF.damaged,BF.critical,...BF.collapse],[0,1,2,3,4,5,6]);
 assert.equal(BARRACKS_SHEET.frameWidth,384);assert.equal(BARRACKS_SHEET.frameHeight,372);assert.equal(BARRACKS_SHEET.pivotX,192);assert.equal(BARRACKS_SHEET.pivotY,372);
});
test('damage: intact to 66%, damaged below, badly damaged below 33%; intact while it is built',()=>{
 assert.equal(barracksFrame(600,600,false,0),BF.intact);assert.equal(barracksFrame(396,600,false,0),BF.intact);assert.equal(barracksFrame(395,600,false,0),BF.damaged);
 assert.equal(barracksFrame(198,600,false,0),BF.damaged);assert.equal(barracksFrame(197,600,false,0),BF.critical);
 assert.equal(barracksFrame(600/150,600,true,0),BF.intact,'hp starts near zero while it is built');
});
test('recruiting: the doorway shows 500 ms from the spawn, only on an intact building; a damage state always wins',()=>{
 assert.equal(barracksFrame(600,600,false,1000,1000),BF.recruit);assert.equal(barracksFrame(600,600,false,1000+M.recruitMs-1,1000),BF.recruit);
 assert.equal(barracksFrame(600,600,false,1000+M.recruitMs,1000),BF.intact,'closed again');assert.equal(barracksFrame(600,600,false,999,1000),BF.intact,'not before the spawn');
 assert.equal(barracksFrame(600,600,false,1000,undefined),BF.intact);
 assert.equal(barracksFrame(300,600,false,1100,1000),BF.damaged);assert.equal(barracksFrame(100,600,false,1100,1000),BF.critical);assert.equal(barracksFrame(600,600,true,1100,1000),BF.intact,'while built');
});
test('collapse: roof buckles, walls fall, rubble; fades from 1.4 s and is gone at 2 s',()=>{
 const [a,b,c]=BF.collapse,[k1,k2]=M.collapseKeys;
 assert.equal(barracksCollapsePose(0).frame,a);assert.equal(barracksCollapsePose(k1-1).frame,a);assert.equal(barracksCollapsePose(k1).frame,b);assert.equal(barracksCollapsePose(k2).frame,c);
 assert.equal(barracksCollapsePose(M.collapseHold).alpha,1);assert.ok(barracksCollapsePose(1700).alpha<1);assert.equal(barracksCollapsePose(M.collapseEnd),undefined);
});
test('the recruiting Barracks is read from the soldier\'s id (blue-s-<barracks>-<slot>-<serial>), and only from it',()=>{
 assert.equal(recruiterOf('blue-s-built-ui-1-0-1'),'built-ui-1');assert.equal(recruiterOf('blue-s-azure-barracks-0-1-12'),'azure-barracks-0');
 for(const id of ['blue-1','red-3','blue-s-built-x','hero-roland','blue-s-1-2'])assert.equal(recruiterOf(id),undefined,id);
});
test('simulation: a Barracks\' soldiers spawn on the ticks the cue follows, with ids recruiterOf reads',()=>{
 const sim=new Simulation('barracks-sprite',campaign.setup(46));sim.economy.balances={gold:1e12,wood:1e12,iron:1e12};const pad=sim.azurePads[0];
 sim.send({type:'place',requestId:'ui-1',kind:'barracks',col:pad.col,row:pad.row});sim.advance(1000/30+.01);sim.drainEvents();
 const b=sim.state.structures['built-ui-1'];assert.ok(b&&b.azureBarracks);const spawns=[];
 for(let i=0;i<b.completeTick+TRAIN_TICKS+TRAIN_STAGGER+5&&spawns.length<2;i++){sim.advance(1000/30+.01);for(const e of sim.drainEvents())if(e.type==='spawn'&&recruiterOf(e.id)==='built-ui-1')spawns.push(sim.clock.tick);}
 assert.equal(spawns.length,2);assert.ok(spawns[0]>=b.completeTick+TRAIN_TICKS&&spawns[0]<=b.completeTick+TRAIN_TICKS+2,String(spawns[0]-b.completeTick));assert.ok(spawns[1]-spawns[0]<=TRAIN_STAGGER+2);
});
test('only the Azure Barracks art has a sheet: the Crimson Barracks keeps its still',()=>{
 assert.equal(azureBarracksVisual.texture,'barracks-azure');assert.notEqual(barracksVisual.texture,azureBarracksVisual.texture);
});

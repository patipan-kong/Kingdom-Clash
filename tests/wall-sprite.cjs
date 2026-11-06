const {test}=require('node:test');const assert=require('node:assert/strict');
const {WF,WALL_SHEET,WALL_MOTION:M,wallFrame,gatePasser,atGateRow,gateRowFrame,wallCollapsePose}=require('../.test-build/world/wallSprite.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');const {campaign}=require('../.test-build/data/campaignLevels.js');
const {isThroneGate,throneGateName}=require('../.test-build/world/cliffArt.js');
const {frostGateRowOffset}=require('../.test-build/world/frostGateAppearance.js');
test('seven frames, one each: intact, damaged, badly damaged, breaking, rubble, ajar, open',()=>{assert.deepEqual(Object.values(WF),[0,1,2,3,4,5,6]);assert.equal(WALL_SHEET.pivotY-WALL_SHEET.height,32);assert.equal(frostGateRowOffset,111);});
test('damage: intact to 66%, damaged below, badly damaged below 33%, both ways; intact while it is built',()=>{
 assert.equal(wallFrame(3000,3000,false),WF.intact);assert.equal(wallFrame(1980,3000,false),WF.intact);assert.equal(wallFrame(1979,3000,false),WF.damaged);
 assert.equal(wallFrame(990,3000,false),WF.damaged);assert.equal(wallFrame(989,3000,false),WF.critical);assert.equal(wallFrame(3000,3000,false),WF.intact,'restored');
 assert.equal(wallFrame(400/60,400,true),WF.intact,'construction hp starts near zero but shows intact');
});
test('a gate row opens ajar then open, stays open while a passer is there, closes 300 ms after the last one left',()=>{
 let row={};const at=(t,present)=>{const n=gateRowFrame(row,present,t,WF.damaged);row=n.row;return n.frame;};
 assert.equal(at(0,false),WF.damaged,'closed shows the damage state');
 assert.equal(at(1000,true),WF.ajar);assert.equal(at(1000+M.ajarMs-1,true),WF.ajar);assert.equal(at(1000+M.ajarMs,true),WF.open);assert.equal(at(3000,true),WF.open);
 assert.equal(at(3000+M.holdMs-1,false),WF.open,'held');assert.equal(at(3000+M.holdMs,false),WF.ajar,'closing');assert.equal(at(3000+M.holdMs+M.ajarMs,false),WF.damaged,'closed');
 assert.equal(at(5000,true),WF.ajar,'opens again from closed');assert.equal(at(5000+M.ajarMs,true),WF.open);
 at(5200,true);assert.equal(at(5200+M.holdMs+10,false),WF.ajar);assert.equal(at(5200+M.holdMs+20,true),WF.open,'a passer while it closes opens it again at once');
});
test('a row covers a passer from just in front of its base back to 80% of its height, within reach of the gate',()=>{
 const g={x:1416,columns:1},top=83.5*M.cover,p=(x,y)=>({x,y,radius:12});
 assert.ok(atGateRow(p(1416,600),g,605,top));assert.ok(atGateRow(p(1416,605+6),g,605,top),'just in front');assert.ok(!atGateRow(p(1416,605+7),g,605,top),'in front of it');
 assert.ok(atGateRow(p(1416,605-top),g,605,top));assert.ok(!atGateRow(p(1416,605-top-1),g,605,top),'behind its stakes');
 assert.ok(atGateRow(p(1416+24+12+M.reach-1,600),g,605,top),'arriving');assert.ok(!atGateRow(p(1416+24+12+M.reach,600),g,605,top),'too far');
});
test('only the units the simulation lets through a gate open it: in C5M6, Crimson only; never while a captured gate stands open',()=>{
 const sim=new Simulation('wall-sprite',campaign.setup(46)),gate=sim.state.structures['red-fortress-gate'];assert.ok(gate.gate);
 for(const team of ['red','blue'])assert.equal(gatePasser(gate,{team,hp:1}),!structuresFor(sim.state,team)['red-fortress-gate'],team);
 assert.equal(gatePasser(gate,{team:'red',hp:0}),false,'not the dead');
 assert.equal(gatePasser({...gate,open:true},{team:'red',hp:1}),false,'a captured gate keeps its translucent look');
 assert.equal(gatePasser({...gate,team:'blue'},{team:'blue',hp:1}),!!gatePasser({...gate,team:'blue'},{team:'blue',hp:1}),'a converted gate: Azure');
 assert.equal(gatePasser({team:'blue'},{team:'blue',hp:1}),false,'a Wooden Wall never opens');
});
test('collapse: rows break 80 ms apart from the north, then lie as rubble; every row fades from 1.4 s and is gone at 2 s',()=>{
 assert.equal(wallCollapsePose(0,0,WF.critical).frame,WF.breaking);assert.equal(wallCollapsePose(0,1,WF.critical).frame,WF.critical,'its last frame until its turn');
 assert.equal(wallCollapsePose(M.stagger,1,WF.critical).frame,WF.breaking);assert.equal(wallCollapsePose(2*M.stagger+M.breakMs,2,WF.critical).frame,WF.rubble);
 assert.equal(wallCollapsePose(M.collapseHold,2,0).alpha,1);assert.ok(wallCollapsePose(1700,2,0).alpha<1);assert.equal(wallCollapsePose(M.collapseEnd,0,0),undefined);assert.equal(wallCollapsePose(M.collapseEnd,2,0),undefined);
});
test('the Throne Gate is C5M6\'s gate only: the same id elsewhere keeps its name',()=>{
 assert.equal(throneGateName,'Throne Gate');assert.ok(isThroneGate('crimson-throne','red-fortress-gate'));
 for(const f of ['last-stronghold','broken-alliance','crimson-fortress'])assert.ok(!isThroneGate(f,'red-fortress-gate'),f);assert.ok(!isThroneGate('crimson-throne','c5-north-a'));
 assert.equal(new Simulation('wall-sprite-2',campaign.setup(46)).field.id,'crimson-throne');
});

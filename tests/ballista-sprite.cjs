const {test}=require('node:test');const assert=require('node:assert/strict');
const {BAF,BALLISTA_SHEET,BALLISTA_MOTION:M,ballistaBaseFrame,ballistaPose,ballistaFaceToward,ballistaCollapsePose}=require('../.test-build/world/ballistaSprite.js');
const {buildings}=require('../.test-build/data/buildings.js');
test('ten frames: the base\'s three states and three collapse frames, then the mechanism\'s four poses; one cell and one pivot for all',()=>{
 assert.deepEqual([BAF.intact,BAF.damaged,BAF.critical,...BAF.collapse,BAF.loaded,BAF.fired,BAF.recoil,BAF.reload],[0,1,2,3,4,5,6,7,8,9]);
 assert.equal(BALLISTA_SHEET.frameHeight,320);assert.equal(BALLISTA_SHEET.pivotY,320);assert.equal(BALLISTA_SHEET.idleHeight,320);assert.equal(BALLISTA_SHEET.hit.w*84/BALLISTA_SHEET.idleHeight,84,'the tap box is the old canvas 84 x 84 px');
});
test('base damage: intact to 66%, damaged below, badly damaged below 33%; intact while it is built',()=>{
 assert.equal(ballistaBaseFrame(520,520,false),BAF.intact);assert.equal(ballistaBaseFrame(343.5,520,false),BAF.intact);assert.equal(ballistaBaseFrame(343,520,false),BAF.damaged);
 assert.equal(ballistaBaseFrame(172,520,false),BAF.damaged);assert.equal(ballistaBaseFrame(171,520,false),BAF.critical);
 assert.equal(ballistaBaseFrame(520/150,520,true),BAF.intact,'hp starts near zero while it is built');
});
test('the shot sequence: loaded, then fired on the attack tick, recoil, reload, loaded again before the next shot',()=>{
 const cd=buildings.ballista.cooldownTicks*1000/30;assert.equal(cd,3000,'the 3 s cooldown is untouched');
 assert.equal(ballistaPose(5000,undefined,cd),BAF.loaded,'before the first shot');assert.equal(ballistaPose(999,1000,cd),BAF.loaded,'not before the shot');
 assert.equal(ballistaPose(1000,1000,cd),BAF.fired,'on the attack tick');assert.equal(ballistaPose(1000+M.firedMs-1,1000,cd),BAF.fired);
 assert.equal(ballistaPose(1000+M.firedMs,1000,cd),BAF.recoil);assert.equal(ballistaPose(1000+M.recoilMs-1,1000,cd),BAF.recoil);
 assert.equal(ballistaPose(1000+M.recoilMs,1000,cd),BAF.reload);assert.equal(ballistaPose(1000+cd*M.reloadShare-1,1000,cd),BAF.reload);
 assert.equal(ballistaPose(1000+cd*M.reloadShare,1000,cd),BAF.loaded,'the reload is done');assert.equal(ballistaPose(1000+cd-1,1000,cd),BAF.loaded,'loaded holds to the next shot');
 assert.ok(M.recoilMs<cd*M.reloadShare&&cd*M.reloadShare<cd,'fired, recoil and reload all fit inside the cooldown');
 assert.equal(ballistaPose(1000+cd,1000+cd,cd),BAF.fired,'the next shot starts the sequence again');
});
test('the structure is as the simulation reports it: a tower-kind, no windup, so the shot and the damage are one tick',()=>{
 assert.equal(buildings.ballista.damage,70);assert.equal(buildings.ballista.range,420);assert.equal(buildings.ballista.cooldownTicks,90);
});
test('facing: toward the target, a target almost straight above or below keeps the facing',()=>{
 assert.equal(ballistaFaceToward(1,-100),-1);assert.equal(ballistaFaceToward(-1,100),1);assert.equal(ballistaFaceToward(1,M.deadZone-1),1);assert.equal(ballistaFaceToward(-1,-(M.deadZone-1)),-1);
 assert.equal(ballistaFaceToward(-1,M.deadZone-1),-1);assert.equal(ballistaFaceToward(1,M.deadZone),1);assert.equal(ballistaFaceToward(1,-M.deadZone),-1);
});
test('collapse: breaking, falling, rubble; fades from 1.4 s and is gone at 2 s',()=>{
 const [a,b,c]=BAF.collapse,[k1,k2]=M.collapseKeys;
 assert.equal(ballistaCollapsePose(0).frame,a);assert.equal(ballistaCollapsePose(k1-1).frame,a);assert.equal(ballistaCollapsePose(k1).frame,b);assert.equal(ballistaCollapsePose(k2).frame,c);
 assert.equal(ballistaCollapsePose(M.collapseHold).alpha,1);assert.ok(ballistaCollapsePose(1700).alpha<1);assert.equal(ballistaCollapsePose(M.collapseEnd),undefined);
});

const {test}=require('node:test');const assert=require('node:assert/strict');
const {ELITE_SHEET,SOLDIER_SHEET,SOLDIER_MOTION,SF,soldierGeometry,soldierWalkFrame,soldierPose,soldierAttackFrame,corpsePose}=require('../.test-build/world/soldierSprite.js');
const {crimsonElite,minionStats,minionStatsOf}=require('../.test-build/data/combat.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');const {campaign}=require('../.test-build/data/campaignLevels.js');
test('the Elite sheet: 14 frames in the Soldier frame map, one 288 x 240 cell, feet pivot (164,214), the idle 150 cell px tall',()=>{
 assert.equal(ELITE_SHEET.key,'soldier-elite');assert.equal(ELITE_SHEET.frameWidth,288);assert.equal(ELITE_SHEET.frameHeight,240);assert.equal(ELITE_SHEET.pivotX,164);assert.equal(ELITE_SHEET.pivotY,214);assert.equal(ELITE_SHEET.idleHeight,150);
 assert.deepEqual([SF.idle,...SF.walk,...SF.attack,SF.hurt,...SF.death],[0,1,2,3,4,5,6,7,8,9,10,11,12,13],'the Elite uses the Soldier frame numbers');
 assert.ok(ELITE_SHEET.hit.x+ELITE_SHEET.hit.w<=ELITE_SHEET.frameWidth&&ELITE_SHEET.hit.y+ELITE_SHEET.hit.h<=ELITE_SHEET.pivotY+1,'the tap box is the idle body, inside the cell and on the feet');
});
test('geometry lookup: the Elite sheet has its own; every other soldier sheet keeps the Soldier geometry and stride',()=>{
 assert.equal(soldierGeometry('soldier-elite'),ELITE_SHEET);
 for(const key of ['soldier-azure','soldier-crimson','soldier-desert','soldier-shadowblade']){const g=soldierGeometry(key);
  assert.equal(g.frameWidth,SOLDIER_SHEET.frameWidth);assert.equal(g.pivotX,SOLDIER_SHEET.pivotX);assert.equal(g.pivotY,SOLDIER_SHEET.pivotY);assert.equal(g.idleHeight,SOLDIER_SHEET.idleHeight);assert.equal(g.feetX,SOLDIER_SHEET.feetX);assert.deepEqual(g.hit,SOLDIER_SHEET.hit);assert.equal(g.stride,SOLDIER_MOTION.stride);}
 assert.ok(ELITE_SHEET.stride>SOLDIER_MOTION.stride,'a longer stride for the bigger body');
});
test('walk frames: the default stride is the Soldier\'s, unchanged; the Elite\'s own stride spans the six frames over its own length',()=>{
 for(let d=0;d<200;d+=3.7)assert.equal(soldierWalkFrame(d),SF.walk[Math.floor(((d/SOLDIER_MOTION.stride)%1)*6)%6]);
 const L=ELITE_SHEET.stride,seen=[];for(let i=0;i<6;i++)seen.push(soldierWalkFrame((i+.5)*L/6,L));assert.deepEqual(seen,SF.walk);
 assert.equal(soldierWalkFrame(L,L),SF.walk[0],'a full stride is back to the first frame');assert.equal(soldierWalkFrame(-1,L),SF.walk[5],'negative travel wraps');
});
test('pose logic is the Soldier\'s: attack first (wind-up, drive, contact by the unit\'s own 300 ms windup), hurt, walk with the Elite stride, idle',()=>{
 const w=300,[a,b,c]=SF.attack;
 assert.equal(soldierAttackFrame(-1,w),undefined);assert.equal(soldierAttackFrame(0,w),a);assert.equal(soldierAttackFrame(149,w),a);assert.equal(soldierAttackFrame(150,w),b);assert.equal(soldierAttackFrame(299,w),b);assert.equal(soldierAttackFrame(300,w),c);assert.equal(soldierAttackFrame(300+SOLDIER_MOTION.contactMs-1,w),c);assert.equal(soldierAttackFrame(300+SOLDIER_MOTION.contactMs,w),undefined);
 const base={now:1000,travelled:0,movedAt:-1e9,attackWindup:w};
 assert.equal(soldierPose({...base,attackAt:900}),a);assert.equal(soldierPose({...base,attackAt:900,hurtAt:990}),a,'attack outranks hurt');assert.equal(soldierPose({...base,hurtAt:990}),SF.hurt);assert.equal(soldierPose(base),SF.idle);
 const walking={...base,movedAt:990,travelled:ELITE_SHEET.stride/2};assert.equal(soldierPose({...walking,stride:ELITE_SHEET.stride}),soldierWalkFrame(ELITE_SHEET.stride/2,ELITE_SHEET.stride));assert.equal(soldierPose(walking),soldierWalkFrame(ELITE_SHEET.stride/2));
});
test('death: the Soldier\'s three frames, gone by 1.3 s',()=>{
 assert.equal(corpsePose(0).frame,SF.death[0]);assert.equal(corpsePose(SOLDIER_MOTION.deathKeys[0]).frame,SF.death[1]);assert.equal(corpsePose(SOLDIER_MOTION.deathKeys[1]).frame,SF.death[2]);assert.equal(corpsePose(SOLDIER_MOTION.deathEnd),undefined);
});
test('the Elite is a Crimson soldier with 480 hit points and nothing else different: speed, damage, range, radius and windup are the soldier\'s (the picture changes no number)',()=>{
 const e=minionStatsOf('crimson-elite'),s=minionStats;assert.equal(e,crimsonElite.stats);assert.equal(e.maxHp,480);
 for(const k of ['armor','radius','speed','damage','range','cooldownTicks','windupTicks'])assert.equal(e[k],s[k],k);
});
test('simulation: the Last Stand of C5M6 sends three Crimson Elites when the Fortress Gate falls, once',()=>{
 const sim=new Simulation('elite-last-stand',campaign.setup(46)),gate=sim.state.structures['red-fortress-gate'];assert.ok(gate,'a Fortress Gate');
 const elites=()=>Object.values(sim.state.units).filter(u=>u.archetype==='crimson-elite'&&u.hp>0);assert.equal(elites().length,0);
 const seen=new Set();sim.hit(sim.hero,gate,1e9,'direct');for(let i=0;i<150;i++){sim.advance(1000/30+.01);sim.drainEvents();for(const u of elites())seen.add(u.id);}
 assert.equal(elites().length,3,'three Elites');assert.ok(elites().every(u=>u.maxHp===480&&u.speed===95&&u.damage===18&&u.windupTicks===9));
 for(let i=0;i<450;i++){sim.advance(1000/30+.01);sim.drainEvents();for(const u of Object.values(sim.state.units))if(u.archetype==='crimson-elite'&&u.id.startsWith('red-g'))seen.add(u.id);}
 assert.equal(seen.size,3,'the garrison comes once: the same three Elites and no more');
});

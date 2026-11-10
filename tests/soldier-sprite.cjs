const {test}=require('node:test');const assert=require('node:assert/strict');
const {SF,SOLDIER_SHEET,SOLDIER_MOTION:M,soldierAttackFrame,soldierWalkFrame,soldierPose,corpsePose,nextSoldierFacing,soldierFaceToward,walkPhase}=require('../.test-build/world/soldierSprite.js');
const {minionStats}=require('../.test-build/data/combat.js');
const base=(o={})=>({now:10000,travelled:0,movedAt:-1e9,attackWindup:300,...o});
test('every soldier frame index fits the sheet once',()=>{const all=[SF.idle,...SF.walk,...SF.attack,SF.hurt,...SF.death];assert.equal(new Set(all).size,all.length);assert.equal(all.length,SOLDIER_SHEET.frames);assert.ok(Math.max(...all)<SOLDIER_SHEET.frames);});
test('the contact frame shows exactly from the hit tick, for any windup (soldier 9 ticks, Shadowblade 6)',()=>{for(const w of [300,200,minionStats.windupTicks*1000/30]){assert.notEqual(soldierAttackFrame(w-1,w),SF.attack[2]);assert.equal(soldierAttackFrame(w,w),SF.attack[2]);assert.equal(soldierAttackFrame(0,w),SF.attack[0]);assert.equal(soldierAttackFrame(.5*w,w),SF.attack[1]);assert.equal(soldierAttackFrame(w+M.contactMs,w),undefined);}assert.equal(soldierAttackFrame(-1,300),undefined);});
test('the swing ends well before the next one (30-tick cooldown)',()=>{assert.equal(soldierAttackFrame(minionStats.cooldownTicks*1000/30,minionStats.windupTicks*1000/30),undefined);});
test('walk frames follow distance: one cycle per stride, every frame shown in order',()=>{const seen=[];for(let d=0;d<M.stride;d+=M.stride/60)seen.push(soldierWalkFrame(d));assert.deepEqual([...new Set(seen)],[...SF.walk]);assert.equal(soldierWalkFrame(0),soldierWalkFrame(M.stride));});
test('priority: attack over hurt over walk over idle',()=>{
 assert.equal(soldierPose(base({attackAt:9900,hurtAt:9990,movedAt:9990})),SF.attack[0]);
 assert.equal(soldierPose(base({hurtAt:9990,movedAt:9990})),SF.hurt);
 assert.equal(soldierPose(base({hurtAt:10000-M.hurtMs,movedAt:9990,travelled:0})),SF.walk[0]);
 assert.equal(soldierPose(base()),SF.idle);
 assert.equal(soldierPose(base({movedAt:10000-M.moveHold-1})),SF.idle);});
test('a body plays stagger, collapse and down, fades from the hold and is gone at 1.3 s',()=>{assert.equal(corpsePose(0).frame,SF.death[0]);assert.equal(corpsePose(M.deathKeys[0]).frame,SF.death[1]);assert.equal(corpsePose(M.deathKeys[1]).frame,SF.death[2]);assert.equal(corpsePose(M.deathHold).alpha,1);assert.ok(corpsePose(M.deathHold+200).alpha<1);assert.equal(corpsePose(M.deathEnd),undefined);assert.equal(M.deathEnd,1300);assert.equal(M.corpseCap,16);});
test('a body pushed past the cap fades out quickly',()=>{assert.equal(corpsePose(300,300).alpha,1);assert.ok(corpsePose(300+M.corpseQuickFade/2,300).alpha<.6);assert.equal(corpsePose(300+M.corpseQuickFade,300),undefined);});
test('facing: crowd nudges never turn a soldier, a walk back does, turns are paced',()=>{let f={facing:-1,drift:0};for(let i=0;i<5;i++)f=nextSoldierFacing(f.facing,f.drift,1,1000);assert.equal(f.facing,-1);f=nextSoldierFacing(-1,0,7,1000);assert.equal(f.facing,1);assert.equal(nextSoldierFacing(-1,0,50,M.turnHold-1).facing,-1);assert.equal(soldierFaceToward(-1,3),-1);assert.equal(soldierFaceToward(-1,30),1);});
test('walk phases differ between soldiers and stay inside one stride',()=>{const p=['red-1','red-2','red-3','blue-1','blue-2'].map(walkPhase);assert.ok(new Set(p).size>=4);for(const x of p)assert.ok(x>=0&&x<M.stride);assert.equal(walkPhase('red-1'),walkPhase('red-1'));});
test('facing with a target: a walk away turns the soldier only after pushDrift, a nudge never does, and the default limit is unchanged',()=>{
 const walk=(limit,steps,dx)=>{let f={facing:1,drift:0};for(let i=0;i<steps;i++)f=nextSoldierFacing(f.facing,f.drift,dx,1000,limit);return f.facing;};
 assert.ok(M.pushDrift>M.flipDrift);
 assert.equal(walk(M.pushDrift,2,-4),1,'8 px of push does not turn a soldier that has a target');
 assert.equal(walk(M.pushDrift,4,-4),-1,'a sustained walk away turns it');
 assert.equal(walk(undefined,2,-4),-1,'without a target the stock limit still applies');
});
test('authored facing: the Azure/Crimson family (and its Desert Raider and Shadowblade recolours) is drawn facing right; the Elite, Hero, Azure heroes and War Cart face left',()=>{
 const {authoredFacing,SOLDIER_SHEET:Q,ELITE_SHEET,HERO_SHEET,ROLAND_SHEET,BORIN_SHEET,KAEL_SHEET}=require('../.test-build/world/soldierSprite.js');
 for(const k of [Q.azure,Q.crimson,Q.desert,Q.shadowblade])assert.equal(authoredFacing(k),1,k);
 for(const k of [ELITE_SHEET.key,HERO_SHEET.key,ROLAND_SHEET.key,BORIN_SHEET.key,KAEL_SHEET.key,'warcart-crimson'])assert.equal(authoredFacing(k),-1,k);
});

test('on the right-facing soldier sheets only the swing frames take the opposite mirror; left-drawn sheets and the corpse frames are unchanged',()=>{
 const {soldierUnmirrored,authoredFacing,SF,SOLDIER_SHEET:Q,ELITE_SHEET}=require('../.test-build/world/soldierSprite.js');
 for(const k of [Q.azure,Q.crimson,Q.desert,Q.shadowblade]){
  for(const f of SF.attack){assert.equal(soldierUnmirrored(1,k,f),false);assert.equal(soldierUnmirrored(-1,k,f),true);}
  for(const f of [SF.idle,...SF.walk,SF.hurt,...SF.death]){assert.equal(soldierUnmirrored(1,k,f),true);assert.equal(soldierUnmirrored(-1,k,f),false);}
 }
 for(const k of [ELITE_SHEET.key,'warcart-crimson'])for(const f of [...SF.attack,SF.idle,...SF.death]){assert.equal(soldierUnmirrored(-1,k,f),true);assert.equal(soldierUnmirrored(1,k,f),false);}
})

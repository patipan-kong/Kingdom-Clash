const {test}=require('node:test');const assert=require('node:assert/strict');
const {CF,WARCART_SHEET,WARCART_MOTION:M,warCartAttackFrame,warCartRollFrame,warCartPose,warCartCorpsePose,warCartWreckAlpha}=require('../.test-build/world/warCartSprite.js');
const {warCart,minionStatsOf}=require('../.test-build/data/combat.js');
test('twelve frames: idle, four roll, three attack, two destroyed, wreck, repairing; one cell and one pivot for all',()=>{
 assert.deepEqual([CF.idle,...CF.roll,CF.windup,CF.contact,CF.recover,...CF.destroyed,CF.wreck,CF.repairing],[0,1,2,3,4,5,6,7,8,9,10,11]);
 assert.equal(WARCART_SHEET.frameWidth,296);assert.equal(WARCART_SHEET.frameHeight,173);
 assert.ok(WARCART_SHEET.pivotX>0&&WARCART_SHEET.pivotX<WARCART_SHEET.frameWidth&&WARCART_SHEET.pivotY<=WARCART_SHEET.frameHeight);
 const s=100.8/WARCART_SHEET.idleHeight;assert.ok(Math.abs(WARCART_SHEET.hit.w*s-100.8)<.5&&Math.abs(WARCART_SHEET.hit.h*s-100.8)<.5,'the tap box is the old 100.8 px picture rectangle');
 assert.ok(Math.abs(WARCART_SHEET.hit.x+WARCART_SHEET.hit.w/2-WARCART_SHEET.pivotX)<=1,'the tap box is centred on the pivot, so a mirrored cart keeps it');
});
test('the attack: windup the whole 400 ms, contact on the hit tick, then recover, then nothing',()=>{
 const w=warCart.stats.windupTicks*1000/30;assert.ok(Math.abs(w-400)<1e-9,'the simulation windup is untouched (12 ticks)');
 assert.equal(warCartAttackFrame(-1,w),undefined,'not before the attack event');
 assert.equal(warCartAttackFrame(0,w),CF.windup);assert.equal(warCartAttackFrame(w-1,w),CF.windup,'still drawn back one ms before the hit');
 assert.equal(warCartAttackFrame(w,w),CF.contact,'the thrust is on the hit tick');assert.equal(warCartAttackFrame(w+M.contactMs-1,w),CF.contact);
 assert.equal(warCartAttackFrame(w+M.contactMs,w),CF.recover);assert.equal(warCartAttackFrame(w+M.contactMs+M.recoverMs-1,w),CF.recover);
 assert.equal(warCartAttackFrame(w+M.contactMs+M.recoverMs,w),undefined);
 assert.ok(w+M.contactMs+M.recoverMs<warCart.stats.cooldownTicks*1000/30,'the clip fits inside the 2 s cooldown');
});
test('rolling follows distance; it stops when the cart stops',()=>{
 const f=d=>warCartRollFrame(d);assert.equal(f(0),CF.roll[0]);assert.equal(f(M.stride/4),CF.roll[1]);assert.equal(f(M.stride*.99),CF.roll[3]);assert.equal(f(M.stride),CF.roll[0]);assert.equal(f(-1),CF.roll[3],'a negative distance still wraps');
 const base={travelled:100,movedAt:1000,attackWindup:400};
 assert.ok(CF.roll.includes(warCartPose({...base,now:1000})),'rolling at the moment of the step');assert.ok(CF.roll.includes(warCartPose({...base,now:1000+M.moveHold})));
 assert.equal(warCartPose({...base,now:1000+M.moveHold+1}),CF.idle,'idle once it has not moved');
 assert.equal(warCartPose({...base,now:1050,attackAt:1000}),CF.windup,'an attack outranks rolling');
 assert.equal(warCartPose({...base,now:2000,attackAt:1000}),CF.idle,'a finished attack clip returns to idle');
});
test('destruction: breaking, then down; fades from 0.9 s and is gone at 1.5 s; the wreck fades in over it',()=>{
 assert.equal(warCartCorpsePose(0).frame,CF.destroyed[0]);assert.equal(warCartCorpsePose(M.deathKey-1).frame,CF.destroyed[0]);assert.equal(warCartCorpsePose(M.deathKey).frame,CF.destroyed[1]);
 assert.equal(warCartCorpsePose(M.deathHold).alpha,1);assert.ok(warCartCorpsePose(1200).alpha<1&&warCartCorpsePose(1200).alpha>0);assert.equal(warCartCorpsePose(M.deathEnd),undefined);
 assert.equal(warCartWreckAlpha(0),0);assert.equal(warCartWreckAlpha(M.wreckFrom+M.wreckFade),1);assert.equal(warCartWreckAlpha(1e9),1,'a start-as-wreck cart is fully there');assert.equal(warCartWreckAlpha(-1e9),0);
 assert.ok(M.wreckFrom+M.wreckFade<=M.deathEnd+M.wreckFade);
});
test('the cart is as the simulation reports it: nothing here changed the stats',()=>{
 const s=minionStatsOf('war-cart');assert.equal(s.maxHp,900);assert.equal(s.damage,90);assert.equal(s.range,48);assert.equal(s.cooldownTicks,60);assert.equal(s.windupTicks,12);assert.equal(s.speed,55);
});

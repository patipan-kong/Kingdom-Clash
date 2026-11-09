const {test}=require('node:test');const assert=require('node:assert/strict');
const {ROLAND_SHEET,HERO_SHEET,ELITE_SHEET,SOLDIER_SHEET,SOLDIER_MOTION,SF,soldierGeometry,soldierStride}=require('../.test-build/world/soldierSprite.js');
const {mercenaries,mercenaryStats,mercenaryTexture}=require('../.test-build/data/mercenaries.js');
const {allyKnight}=require('../.test-build/simulation/AllyProbe.js');
test('the Roland sheet: 14 frames in the Soldier frame map, one 288 x 224 cell, feet pivot (172,206), the idle 150 cell px tall (drawn 86.4 px at scale .576)',()=>{
 assert.equal(ROLAND_SHEET.key,'soldier-roland');assert.equal(ROLAND_SHEET.frameWidth,288);assert.equal(ROLAND_SHEET.frameHeight,224);assert.equal(ROLAND_SHEET.pivotX,172);assert.equal(ROLAND_SHEET.pivotY,206);assert.equal(ROLAND_SHEET.idleHeight,150);
 assert.ok(Math.abs(86.4/ROLAND_SHEET.idleHeight-.576)<1e-9,'an Allied Knight is 72 x 1.2 = 86.4 px tall, Roland\'s still was not width-capped');
 assert.deepEqual([SF.idle,...SF.walk,...SF.attack,SF.hurt,...SF.death],[0,1,2,3,4,5,6,7,8,9,10,11,12,13],'Roland uses the Soldier frame numbers');
 assert.ok(ROLAND_SHEET.hit.x+ROLAND_SHEET.hit.w<=ROLAND_SHEET.frameWidth&&ROLAND_SHEET.hit.y+ROLAND_SHEET.hit.h<=ROLAND_SHEET.pivotY,'the tap box is the idle body, inside the cell and on the feet');
});
test('geometry lookup: Roland has his own; the Hero, the Elite and the Soldier sheets are unchanged; a hero flinches at most once per 900 ms',()=>{
 assert.equal(soldierGeometry('soldier-roland'),ROLAND_SHEET);assert.equal(soldierGeometry('soldier-hero'),HERO_SHEET);assert.equal(soldierGeometry('soldier-elite'),ELITE_SHEET);
 assert.equal(soldierGeometry('soldier-azure').hurtGap,SOLDIER_MOTION.hurtGap);assert.equal(ROLAND_SHEET.hurtGap,900);assert.equal(soldierStride(ROLAND_SHEET,.576),ROLAND_SHEET.stride);
 assert.equal(soldierGeometry('soldier-azure').idleHeight,SOLDIER_SHEET.idleHeight);
});
test('Roland keeps his numbers: the Allied Knight\'s 833 HP, armor 20, 80 damage, windup 6, cooldown 23, speed 120, with the Balanced multipliers of 1; the picture changes none of them; Borin and Kael keep their stills',()=>{
 const m=mercenaries.find(x=>x.id==='roland');assert.deepEqual(mercenaryStats(m),{maxHp:833,damage:80});
 assert.equal(allyKnight.maxHp,833);assert.equal(allyKnight.armor,20);assert.equal(allyKnight.speed,120);assert.equal(allyKnight.windupTicks,6);assert.equal(allyKnight.cooldownTicks,23);
 assert.equal(mercenaryTexture('roland'),'hero-roland','the portrait / HUD texture key is the painted still');assert.equal(mercenaryTexture('borin'),'hero-borin');assert.equal(mercenaryTexture('kael'),'hero-kael');assert.equal(mercenaryTexture(undefined),'guardian');
});

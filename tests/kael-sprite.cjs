const {test}=require('node:test');const assert=require('node:assert/strict');
const {KAEL_SHEET,BORIN_SHEET,ROLAND_SHEET,HERO_SHEET,ELITE_SHEET,SOLDIER_SHEET,SF,soldierGeometry,soldierStride}=require('../.test-build/world/soldierSprite.js');
const {mercenaries,mercenaryStats,mercenaryTexture}=require('../.test-build/data/mercenaries.js');
test('the Kael sheet: 14 frames in the Soldier frame map, one 288 x 208 cell, feet pivot (150,190), drawn 74.2 px (idle 140 cell px at scale 86.4/idleHeight)',()=>{
 assert.equal(KAEL_SHEET.key,'soldier-kael');assert.equal(KAEL_SHEET.frameWidth,288);assert.equal(KAEL_SHEET.frameHeight,208);assert.equal(KAEL_SHEET.pivotX,150);assert.equal(KAEL_SHEET.pivotY,190);
 assert.ok(Math.abs(140*86.4/KAEL_SHEET.idleHeight-74.2)<.05,'Kael is drawn at his still\'s 74.2 px, not the Allied Knight\'s 86.4');
 assert.deepEqual([SF.idle,...SF.walk,...SF.attack,SF.hurt,...SF.death],[0,1,2,3,4,5,6,7,8,9,10,11,12,13]);
 assert.ok(KAEL_SHEET.hit.x+KAEL_SHEET.hit.w<=KAEL_SHEET.frameWidth&&KAEL_SHEET.hit.y+KAEL_SHEET.hit.h<=KAEL_SHEET.pivotY,'the tap box is the idle body, on the feet');
});
test('geometry lookup: Kael has his own; Borin, Roland, the Hero, the Elite and the Soldier sheets are unchanged; hurt at most once per 900 ms',()=>{
 assert.equal(soldierGeometry('soldier-kael'),KAEL_SHEET);assert.equal(soldierGeometry('soldier-roland'),ROLAND_SHEET);assert.equal(soldierGeometry('soldier-borin'),BORIN_SHEET);assert.equal(soldierGeometry('soldier-hero'),HERO_SHEET);assert.equal(soldierGeometry('soldier-elite'),ELITE_SHEET);
 assert.equal(KAEL_SHEET.hurtGap,900);assert.equal(soldierStride(KAEL_SHEET,86.4/KAEL_SHEET.idleHeight),KAEL_SHEET.stride);assert.equal(soldierGeometry('soldier-azure').idleHeight,SOLDIER_SHEET.idleHeight);
});
test('Kael keeps his numbers: the Berserker multipliers .8 x HP and 1.3 x damage; the picture changes none; the portrait key is still hero-kael',()=>{
 const m=mercenaries.find(x=>x.id==='kael');assert.deepEqual(mercenaryStats(m),{maxHp:666,damage:104});
 assert.equal(mercenaryTexture('kael'),'hero-kael');assert.equal(mercenaryTexture('roland'),'hero-roland');assert.equal(mercenaryTexture('kael'),'hero-kael');
});

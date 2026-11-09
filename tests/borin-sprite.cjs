const {test}=require('node:test');const assert=require('node:assert/strict');
const {BORIN_SHEET,ROLAND_SHEET,HERO_SHEET,ELITE_SHEET,SOLDIER_SHEET,SF,soldierGeometry,soldierStride}=require('../.test-build/world/soldierSprite.js');
const {mercenaries,mercenaryStats,mercenaryTexture}=require('../.test-build/data/mercenaries.js');
test('the Borin sheet: 14 frames in the Soldier frame map, one 280 x 216 cell, feet pivot (174,192), drawn 65.1 px (idle 120 cell px at scale 86.4/idleHeight)',()=>{
 assert.equal(BORIN_SHEET.key,'soldier-borin');assert.equal(BORIN_SHEET.frameWidth,280);assert.equal(BORIN_SHEET.frameHeight,216);assert.equal(BORIN_SHEET.pivotX,174);assert.equal(BORIN_SHEET.pivotY,192);
 assert.ok(Math.abs(120*86.4/BORIN_SHEET.idleHeight-65.1)<.05,'Borin is drawn at his still\'s 65.1 px, not the Allied Knight\'s 86.4');
 assert.deepEqual([SF.idle,...SF.walk,...SF.attack,SF.hurt,...SF.death],[0,1,2,3,4,5,6,7,8,9,10,11,12,13]);
 assert.ok(BORIN_SHEET.hit.x+BORIN_SHEET.hit.w<=BORIN_SHEET.frameWidth&&BORIN_SHEET.hit.y+BORIN_SHEET.hit.h<=BORIN_SHEET.pivotY,'the tap box is the idle body, on the feet');
});
test('geometry lookup: Borin has his own; Roland, the Hero, the Elite and the Soldier sheets are unchanged; hurt at most once per 900 ms',()=>{
 assert.equal(soldierGeometry('soldier-borin'),BORIN_SHEET);assert.equal(soldierGeometry('soldier-roland'),ROLAND_SHEET);assert.equal(soldierGeometry('soldier-hero'),HERO_SHEET);assert.equal(soldierGeometry('soldier-elite'),ELITE_SHEET);
 assert.equal(BORIN_SHEET.hurtGap,900);assert.equal(soldierStride(BORIN_SHEET,86.4/BORIN_SHEET.idleHeight),BORIN_SHEET.stride);assert.equal(soldierGeometry('soldier-azure').idleHeight,SOLDIER_SHEET.idleHeight);
});
test('Borin keeps his numbers: the Tank multipliers 1.4 x HP and .8 x damage; the picture changes none; the portrait key is still hero-borin',()=>{
 const m=mercenaries.find(x=>x.id==='borin');assert.deepEqual(mercenaryStats(m),{maxHp:1166,damage:64});
 assert.equal(mercenaryTexture('borin'),'hero-borin');assert.equal(mercenaryTexture('roland'),'hero-roland');assert.equal(mercenaryTexture('kael'),'hero-kael');
});

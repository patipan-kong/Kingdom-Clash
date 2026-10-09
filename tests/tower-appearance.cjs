const {test}=require('node:test');
const assert=require('node:assert/strict');
const {crimsonTowerPixels,towerTexture}=require('../.test-build/world/towerAppearance.js');
test('tower texture follows team alone, including constructed towers',()=>{
 assert.equal(towerTexture('blue'),'tower');assert.equal(towerTexture('red'),'tower-red');
});
test('Crimson cloth retains shading and alpha while neutral materials remain identical',()=>{
 const pixels=new Uint8ClampedArray([10,70,230,255,5,30,100,120,140,90,30,255,120,120,130,255,255,255,240,255,0,0,220,0]);
 const original=pixels.slice();crimsonTowerPixels(pixels);
 assert.ok(pixels[0]>pixels[1]&&pixels[0]>pixels[2]);
 assert.ok(pixels[4]>pixels[5]&&pixels[4]>pixels[6]);
 assert.ok(pixels[0]>pixels[4]);
 assert.equal(pixels[3],255);assert.equal(pixels[7],120);
 assert.deepEqual(pixels.slice(8),original.slice(8));
});

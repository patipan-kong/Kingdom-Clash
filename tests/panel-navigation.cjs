'use strict';
// Desktop UX D2.1: keyboard navigation geometry for the Skills, Build and Shop popups.
const test=require('node:test'),assert=require('node:assert/strict');
const {spatialNext,readingOrder,tabNext,nearestTo}=require('../.test-build/ui/panelNavigation');
const r=(x,y,width=40,height=40)=>({x,y,width,height});
// A Shop-like grid: two tabs and Close on top, a 4x2 tile grid, a Buy button under the grid on the right.
const shop=[r(0,0,60,40),r(70,0,120,40),r(260,0,40,40),...[0,1].flatMap(row=>[0,1,2,3].map(col=>r(col*70,60+row*70,60,60))),r(220,210,80,40)];
test('arrows follow the visual layout and stop at the edges',()=>{
 assert.equal(spatialNext(shop,3,'right'),4);assert.equal(spatialNext(shop,6,'right'),6,'no wrap past the last column');
 assert.equal(spatialNext(shop,3,'down'),7);assert.equal(spatialNext(shop,7,'up'),3);assert.equal(spatialNext(shop,3,'up'),0,'up from the first tile reaches the tab above it');
 assert.equal(spatialNext(shop,10,'down'),11,'down from the last tile reaches Buy');assert.equal(spatialNext(shop,11,'left'),9,'left from Buy (nothing on its row) returns to the nearest tile within 45°');
 assert.equal(spatialNext(shop,11,'right'),11,'nothing right of Buy');
 assert.equal(spatialNext(shop,1,'right'),2,'tabs to Close along the top row');
});
test('a control on the same row wins over a closer diagonal one',()=>{
 const rects=[r(0,0),r(200,0),r(60,50)];assert.equal(spatialNext(rects,0,'right'),1);
});
test('Tab walks rows top to bottom, left to right, and wraps both ways',()=>{
 assert.deepEqual(readingOrder(shop),[0,1,2,3,4,5,6,7,8,9,10,11]);
 assert.equal(tabNext(shop,2,1),3);assert.equal(tabNext(shop,11,1),0);assert.equal(tabNext(shop,0,-1),11);
 assert.deepEqual(readingOrder([r(100,2,40,40),r(0,0,40,44),r(50,80)]),[1,0,2],'slightly different heights still share a row');
});
test('focus lost to a content change goes to the nearest control; empty lists are safe',()=>{
 assert.equal(nearestTo(shop,r(150,140,60,60)),9);assert.equal(nearestTo([],r(0,0)),-1);
 assert.equal(spatialNext([],0,'left'),-1);assert.equal(tabNext([],0,1),-1);
});

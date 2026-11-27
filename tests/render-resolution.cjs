'use strict';
// Desktop UX D3-1: the opt-in rendering-resolution request (?res=) and the frame statistics shown on real hardware.
const test=require('node:test'),assert=require('node:assert/strict');
const {parseResolution,resolutionScale,frameStats,NATIVE_CAP}=require('../.test-build/ui/resolutionRequest');

test('?res is off unless given a supported value',()=>{
 for(const s of ['','?debug=1','?res=','?res=abc','?res=480','?res=4000','?res=-720'])assert.equal(parseResolution(s),undefined,s);
 assert.deepEqual(parseResolution('?res=540'),{mode:'fixed',height:540});
 assert.deepEqual(parseResolution('?level=3&res=1080'),{mode:'fixed',height:1080});
 assert.deepEqual(parseResolution('?res=NATIVE'),{mode:'native'});
});
test('fixed heights give an exact scale; 540 is today\'s rendering',()=>{
 assert.equal(resolutionScale(undefined,1080,2),1);
 assert.equal(resolutionScale({mode:'fixed',height:540},1080,1),1);
 assert.equal(resolutionScale({mode:'fixed',height:720},500,1),4/3);
 assert.equal(resolutionScale({mode:'fixed',height:1080},500,1),2);
 assert.equal(resolutionScale({mode:'fixed',height:1440},500,1),8/3);
});
test('native follows the canvas\' device pixels, never below 1 and never above the cap',()=>{
 assert.equal(resolutionScale({mode:'native'},1080,1),2);
 assert.ok(Math.abs(resolutionScale({mode:'native'},768,1.25)-960/540)<1e-9);
 assert.equal(resolutionScale({mode:'native'},400,1),1);
 assert.equal(resolutionScale({mode:'native'},1440,2),NATIVE_CAP);
});
test('frame statistics summarise rAF intervals',()=>{
 assert.deepEqual(frameStats([]),{fps:0,avg:0,p95:0,worst:0});
 const s=frameStats([...Array(19).fill(16),40]);
 assert.equal(Math.round(s.avg*10)/10,17.2);assert.equal(s.p95,40);assert.equal(s.worst,40);assert.equal(Math.round(s.fps),58);
});

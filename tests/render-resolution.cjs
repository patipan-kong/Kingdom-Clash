'use strict';
// Desktop UX D3: the desktop default resolution, the ?res= overrides, handheld exclusion and the frame statistics.
const test=require('node:test'),assert=require('node:assert/strict');
const {parseResolution,requestedResolution,resolutionScale,isHandheld,frameStats,DEFAULT_RESOLUTION,NATIVE_CAP}=require('../.test-build/ui/resolutionRequest');

test('only a supported ?res value is an override',()=>{
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
test('without an override desktop renders at native pixels, at most 1920x1080',()=>{
 for(const s of ['','?debug=1','?res=abc','?perf=1'])assert.equal(requestedResolution(s),DEFAULT_RESOLUTION,s);
 assert.deepEqual(requestedResolution('?res=native'),{mode:'native'});
 assert.equal(resolutionScale(DEFAULT_RESOLUTION,720,1),4/3);
 assert.equal(resolutionScale(DEFAULT_RESOLUTION,1080,1),2);
 assert.equal(resolutionScale(DEFAULT_RESOLUTION,1440,1),2); // 2560x1440 is capped at 1920x1080
 assert.equal(resolutionScale(DEFAULT_RESOLUTION,1080,2),2); // 4K is capped too
 assert.equal(resolutionScale(DEFAULT_RESOLUTION,393,1),1); // never below 960x540
 assert.equal(resolutionScale(requestedResolution('?res=native'),1440,1),1440/540);
});
test('phones and tablets are handheld even when they report a fine pointer; desktops are not',()=>{
 const win='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130',mac='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605';
 assert.equal(isHandheld(false,win,0),false);
 assert.equal(isHandheld(false,win,10),false); // touch laptop with a mouse
 assert.equal(isHandheld(false,mac,0),false);
 assert.equal(isHandheld(true,win,10),true);
 assert.equal(isHandheld(false,'Mozilla/5.0 (Linux; Android 14; SM-S928B) Chrome/130',5),true);
 assert.equal(isHandheld(false,'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',5),true);
 assert.equal(isHandheld(false,mac,5),true); // iPad asking for the desktop site
});
test('frame statistics summarise rAF intervals',()=>{
 assert.deepEqual(frameStats([]),{fps:0,avg:0,p95:0,worst:0});
 const s=frameStats([...Array(19).fill(16),40]);
 assert.equal(Math.round(s.avg*10)/10,17.2);assert.equal(s.p95,40);assert.equal(s.worst,40);assert.equal(Math.round(s.fps),58);
});

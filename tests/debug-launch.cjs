const {test}=require('node:test'),assert=require('node:assert/strict');
const {debugLevelFromSearch}=require('../.test-build/data/debugLaunch.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
// Development-only direct mission launch (?debug=1&level=N or &chapter=C&mission=M). Pure parsing and resolution; Battle.init skips the unlock check and the record for it.
const resolve=(q,dev=true)=>debugLevelFromSearch(q,dev,campaignChapters,id=>campaign.has(id));
test('chapter and mission resolve through the chapter slots to the global level id',()=>{
 assert.equal(resolve('?debug=1&chapter=3&mission=1'),'campaign-21');assert.equal(resolve('?debug=1&chapter=3&mission=2'),'campaign-22');assert.equal(resolve('?debug=1&level=22'),'campaign-22');assert.equal(resolve('?debug=1&chapter=2&mission=5'),'campaign-15');assert.equal(resolve('?debug=1&chapter=2&mission=6'),'campaign-16');
 assert.equal(resolve('?debug=1&chapter=1&mission=6'),'campaign-06');assert.equal(resolve('?mission=1&chapter=3&debug=1'),'campaign-21');
});
test('level resolves directly to its id',()=>{assert.equal(resolve('?debug=1&level=21'),'campaign-21');assert.equal(resolve('?debug=1&level=1'),'campaign-01');assert.equal(resolve('?debug=1&level=16'),'campaign-16');});
test('production, a missing debug=1 and every malformed or unregistered coordinate fall back to null without throwing',()=>{
 assert.equal(resolve('?debug=1&level=21',false),null,'production ignores it');
 for(const q of ['','?level=21','?debug=0&level=21','?debug=true&level=21','?debug=1','?debug=1&chapter=3','?debug=1&mission=1','?debug=1&chapter=3&mission=','?debug=1&chapter=x&mission=1',
  '?debug=1&chapter=3&mission=11','?debug=1&chapter=1&mission=7','?debug=1&chapter=1&mission=10','?debug=1&level=7','?debug=1&level=10','?debug=1&level=20','?debug=1&chapter=4&mission=1','?debug=1&chapter=0&mission=1','?debug=1&chapter=-1&mission=1','?debug=1&level=0','?debug=1&level=24','?debug=1&level=999','?debug=1&level=abc','?debug=1&level=2.5','?debug=1&level=%00',
  '?debug=1&chapter=3&mission=4','?debug=1&level=1e3','?debug=1&level=99999999'])assert.equal(resolve(q),null,q);
 assert.equal(resolve('?debug=1&level=21&level=3'),'campaign-21','the first value wins, like URLSearchParams.get');
});
test('a debug launch needs no stored progress, and resolving one leaves the save untouched',()=>{
 let raw=null,writes=0;const store=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;writes++;}}));store.refresh();
 const before=JSON.stringify(store.progress);assert.equal(store.isUnlocked(campaign.get('campaign-21')),false,'Level 21 is locked on a fresh save');
 assert.equal(resolve('?debug=1&level=21'),'campaign-21');assert.equal(writes,0);assert.equal(JSON.stringify(store.progress),before);assert.equal(raw,null);
});

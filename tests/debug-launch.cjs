const {test}=require('node:test'),assert=require('node:assert/strict');
const {debugLevelFromSearch}=require('../.test-build/data/debugLaunch.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {chapterDisplay,missionDisplay}=require('../.test-build/i18n/campaign.js');
// Development-only direct mission launch (?debug=1&level=N or &chapter=C&mission=M). Pure parsing and resolution; Battle.init skips the unlock check and the record for it.
const resolve=(q,dev=true)=>debugLevelFromSearch(q,dev,campaignChapters,id=>campaign.has(id));
test('chapter and mission resolve through the chapter slots to the global level id',()=>{
 assert.equal(resolve('?debug=1&chapter=3&mission=1'),'campaign-21');assert.equal(resolve('?debug=1&chapter=3&mission=2'),'campaign-22');assert.equal(resolve('?debug=1&chapter=3&mission=4'),'campaign-24');assert.equal(resolve('?debug=1&level=24'),'campaign-24');assert.equal(resolve('?debug=1&chapter=3&mission=5'),'campaign-25');assert.equal(resolve('?debug=1&level=25'),'campaign-25');assert.equal(resolve('?debug=1&chapter=3&mission=6'),'campaign-26');assert.equal(resolve('?debug=1&level=26'),'campaign-26');assert.equal(resolve('?debug=1&level=22'),'campaign-22');assert.equal(resolve('?debug=1&chapter=2&mission=5'),'campaign-15');assert.equal(resolve('?debug=1&chapter=2&mission=6'),'campaign-16');
 assert.equal(resolve('?debug=1&chapter=1&mission=6'),'campaign-06');assert.equal(resolve('?mission=1&chapter=3&debug=1'),'campaign-21');
});
test('level resolves directly to its id',()=>{assert.equal(resolve('?debug=1&level=21'),'campaign-21');assert.equal(resolve('?debug=1&level=1'),'campaign-01');assert.equal(resolve('?debug=1&level=16'),'campaign-16');});
test('Chapter 6 debug launch maps all six numbers and slots to the approved layouts and localized titles',()=>{
 const missions=[
  ['Into the Vale','serpent-vale-intro'],['Wolf Hollow','serpent-vale-sealed'],['The Low Gate','serpent-vale'],
  ['Ridgeback','ridgeback'],['Raze or Seize','raze-or-seize-v3'],['The Last Warlord','last-warlord-xl-fort'],
 ];
 const chapter6=campaignChapters.find(c=>c.id==='crimson-reckoning');
 for(const [i,[title,field]] of missions.entries()){
  const number=51+i,id=`campaign-${number}`,chapters=campaignChapters;
  for(const query of [`?debug=1&level=${number}`,`?debug=1&chapter=6&mission=${i+1}`]){
   assert.equal(resolve(query),id);
   assert.equal(resolve(query,false),null);
  }
  assert.equal(campaign.get(id).display.title,title);
  assert.equal(campaign.setup(id).battlefield.id,field);
 }
 const final=campaign.get('campaign-56');
 assert.deepEqual(['en','th','ja'].map(locale=>chapterDisplay(chapter6,locale).title),
  ['The Crimson Reckoning','ศึกชี้ชะตาคริมสัน','クリムゾンの決戦']);
 assert.deepEqual(['en','th','ja'].map(locale=>missionDisplay(final.id,final.display,locale).title),
  ['The Last Warlord','ขุนศึกคนสุดท้าย','最後のウォーロード']);
});
test('Chapter 4 Missions 1 to 6 resolve by level or by chapter and mission; Chapter 5 Missions 1 to 4 resolve and Missions 5 and 6 are unregistered',()=>{assert.equal(resolve('?debug=1&level=31'),'campaign-31');assert.equal(resolve('?debug=1&chapter=4&mission=1'),'campaign-31');assert.equal(resolve('?debug=1&level=32'),'campaign-32');assert.equal(resolve('?debug=1&chapter=4&mission=2'),'campaign-32');assert.equal(resolve('?debug=1&level=33'),'campaign-33');assert.equal(resolve('?debug=1&chapter=4&mission=3'),'campaign-33');assert.equal(resolve('?debug=1&level=34'),'campaign-34');assert.equal(resolve('?debug=1&chapter=4&mission=4'),'campaign-34');assert.equal(resolve('?debug=1&level=35'),'campaign-35');assert.equal(resolve('?debug=1&chapter=4&mission=5'),'campaign-35');assert.equal(resolve('?debug=1&level=36'),'campaign-36');assert.equal(resolve('?debug=1&chapter=4&mission=6'),'campaign-36');assert.equal(resolve('?debug=1&level=41'),'campaign-41');assert.equal(resolve('?debug=1&chapter=5&mission=1'),'campaign-41');assert.equal(resolve('?debug=1&level=42'),'campaign-42');assert.equal(resolve('?debug=1&chapter=5&mission=2'),'campaign-42');assert.equal(resolve('?debug=1&level=43'),'campaign-43');assert.equal(resolve('?debug=1&chapter=5&mission=3'),'campaign-43');assert.equal(resolve('?debug=1&level=44'),'campaign-44');assert.equal(resolve('?debug=1&chapter=5&mission=4'),'campaign-44');assert.equal(resolve('?debug=1&level=45'),'campaign-45');assert.equal(resolve('?debug=1&chapter=5&mission=5'),'campaign-45');assert.equal(resolve('?debug=1&level=46'),'campaign-46');assert.equal(resolve('?debug=1&chapter=5&mission=6'),'campaign-46');for(const q of ['?debug=1&chapter=5&mission=7','?debug=1&level=47'])assert.equal(resolve(q),null,q);});
test('production, a missing debug=1 and every malformed or unregistered coordinate fall back to null without throwing',()=>{
 assert.equal(resolve('?debug=1&level=21',false),null,'production ignores it');
 for(const q of ['','?level=21','?debug=0&level=21','?debug=true&level=21','?debug=1','?debug=1&chapter=3','?debug=1&mission=1','?debug=1&chapter=3&mission=','?debug=1&chapter=x&mission=1',
  '?debug=1&chapter=3&mission=11','?debug=1&chapter=1&mission=7','?debug=1&chapter=1&mission=10','?debug=1&level=7','?debug=1&level=10','?debug=1&level=20','?debug=1&chapter=0&mission=1','?debug=1&chapter=-1&mission=1','?debug=1&level=0','?debug=1&level=27','?debug=1&level=999','?debug=1&level=abc','?debug=1&level=2.5','?debug=1&level=%00',
  '?debug=1&chapter=3&mission=7','?debug=1&level=1e3','?debug=1&level=99999999'])assert.equal(resolve(q),null,q);
 assert.equal(resolve('?debug=1&level=21&level=3'),'campaign-21','the first value wins, like URLSearchParams.get');
});
test('a debug launch needs no stored progress, and resolving one leaves the save untouched',()=>{
 let raw=null,writes=0;const store=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;writes++;}}));store.refresh();
 const before=JSON.stringify(store.progress);assert.equal(store.isUnlocked(campaign.get('campaign-21')),false,'Level 21 is locked on a fresh save');
 assert.equal(resolve('?debug=1&level=21'),'campaign-21');assert.equal(writes,0);assert.equal(JSON.stringify(store.progress),before);assert.equal(raw,null);
});

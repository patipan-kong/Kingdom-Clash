const test=require('node:test');
const assert=require('node:assert/strict');
const {victoryTarget}=require('../.test-build/data/campaignNavigation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const levels=campaign.list();
const store=(ids,unlockAll=false)=>{const raw=JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))});const s=new ProgressStore(()=>({getItem:()=>raw,setItem:()=>{}}));s.refresh();s.unlockAll=unlockAll;return s;};
const target=(s,id)=>victoryTarget(levels,s.progress,id);
const chapter=n=>campaignChapters[n-1].slots.map(s=>s.levelId);
const all=[1,2,3,4,5,6].flatMap(chapter);
const upTo=id=>all.slice(0,all.indexOf(id)+1); // the save right after winning `id` for the first time

test('the campaign runs C1M1 to C5M6 through six released chapters',()=>{
 assert.equal(campaignChapters.length,6);assert.deepEqual(store([]).progress.sequence.map(l=>l.id),all);
});
test('Missions 1-5 of every chapter lead to the next mission of the same chapter',()=>{
 for(let c=1;c<=6;c++){const ids=chapter(c);for(let i=0;i<5;i++)
  assert.deepEqual(target(store(upTo(ids[i])),ids[i]),{kind:'next-mission',levelId:ids[i+1],chapterId:campaignChapters[c-1].id},`C${c}M${i+1}`);}
});
test('Mission 6 of Chapters 1-5 leads to Mission 1 of the next chapter (Next Chapter)',()=>{
 for(let c=1;c<=5;c++){const last=chapter(c)[5];
  assert.deepEqual(target(store(upTo(last)),last),{kind:'next-chapter',levelId:chapter(c+1)[0],chapterId:campaignChapters[c].id},`C${c}M6`);}
 assert.equal(target(store(upTo('campaign-06')),'campaign-06').levelId,'campaign-11','C1M6 -> C2M1');
});
test('C6M6 is the campaign finale: Campaign Complete, no next target',()=>{
 assert.deepEqual(target(store(all),'campaign-56'),{kind:'campaign-complete'});
});
test('replayed missions use the current progress, including across chapter boundaries',()=>{
 const s=store(upTo('campaign-23'));
 assert.equal(target(s,'campaign-02').levelId,'campaign-03');
 assert.deepEqual(target(s,'campaign-06'),{kind:'next-chapter',levelId:'campaign-11',chapterId:'burning-frontier'});
 assert.equal(target(s,'campaign-16').levelId,'campaign-21');
 assert.equal(target(s,'campaign-23').levelId,'campaign-24','the frontier mission leads to the newly unlocked one');
 assert.deepEqual(target(store(all),'campaign-41'),{kind:'next-mission',levelId:'campaign-42',chapterId:'rise-of-the-heroes'});
 assert.deepEqual(target(store(all),'campaign-56'),{kind:'campaign-complete'},'a finale replay is still Campaign Complete');
});
test('never a locked mission or chapter: a successor that is still locked gives no target',()=>{
 assert.equal(target(store([]),'campaign-01'),null,'nothing recorded (storage refused): Mission 2 stays locked');
 assert.equal(target(store(chapter(1).slice(0,5)),'campaign-06'),null,'C1M6 not recorded: Chapter 2 stays locked');
 assert.equal(target(store(all.slice(0,-1)),'campaign-56'),null,'C6M6 not recorded: not Campaign Complete');
 assert.equal(target(store([],true),'campaign-56'),null,'a ?unlock=all replay of the finale is not Campaign Complete');
 for(let n=0;n<=all.length;n++){const s=store(all.slice(0,n));
  for(const id of all){const t=target(s,id);if(t&&t.kind!=='campaign-complete')assert.ok(s.progress.isUnlocked(campaign.get(t.levelId)),`${id} with ${n} clears -> ${t.levelId} must be unlocked`);}}
});
test('unknown ids and Full Battle have no target',()=>{
 assert.equal(target(store(all),'nope'),null);assert.equal(target(store(all),'full-battle'),null);
});

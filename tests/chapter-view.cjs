const test=require('node:test');
const assert=require('node:assert/strict');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews,validateChapters}=require('../.test-build/data/chapterView.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {PROGRESS_KEY,progressOf,parseSave}=require('../.test-build/data/campaignProgress.js');
const {levelId}=require('../.test-build/data/campaign.js');
// Six-mission chapters: Chapter 1 is campaign-01 to campaign-06, Chapter 2 campaign-11 to campaign-16 (chapter blocks of ten).
const CH1=[1,2,3,4,5,6],CH2=[11,12,13,14,15,16],ids=numbers=>numbers.map(levelId);
const refs=n=>[...CH1.slice(0,n).map(i=>({id:levelId(i),number:i})),{id:'full-battle',number:0}];
function fixture(levels=campaign.list(),cleared=[]){
 let raw=JSON.stringify({version:1,levels:Object.fromEntries(ids(cleared).map(id=>[id,{clears:1}]))}),writes=0;
 const store=new ProgressStore(()=>({getItem:key=>{assert.equal(key,PROGRESS_KEY);return raw;},setItem:(_key,value)=>{writes++;raw=value;}}),()=>levels);store.refresh();
 return {store,view:()=>chapterViews(campaignChapters,levels,store.progress),raw:()=>raw,writes:()=>writes};
}
const progress=(levels,save)=>progressOf(campaignChapters,levels,save);
test('fresh store exposes one available chapter, six slots, and only real registered missions',()=>{
 const f=fixture(),views=f.view(),one=views[0];
 assert.equal(one.state,'available');assert.equal(one.completed,0);assert.equal(one.total,6);
 assert.equal(one.missions[0].state,'available');assert.equal(one.missions[1].state,'locked');
 assert.equal(one.released,6);assert.ok(one.missions.slice(1).every(m=>m.state==='locked'));
 const done=fixture(campaign.list(),CH1).view()[0];assert.equal(done.completed,6);assert.equal(done.complete,true);
 // Chapter 2 is released with six missions, locked until Chapter 1 Mission 6 is cleared; Chapter 3 stays coming soon with six slots, two registered.
 assert.deepEqual(views.slice(1).map(v=>[v.state,v.released,v.completed,v.total]),[['locked',6,0,6],['coming-soon',0,0,6]]);
 assert.equal(views[1].missions[0].state,'locked');assert.ok(views[1].missions.slice(1).every(m=>m.state==='locked'));
 assert.equal(f.writes(),0);
});
test('every chapter has six slots in its own block of ten; Chapter 3 has three registered missions and three unimplemented slots',()=>{
 assert.deepEqual(campaignChapters.map(c=>c.slots.map(s=>s.levelId)),[ids(CH1),ids(CH2),ids([21,22,23,24,25,26])]);
 assert.deepEqual(campaignChapters.map(c=>c.slots.map(s=>s.localNumber)),Array(3).fill([1,2,3,4,5,6]));
 assert.deepEqual(campaignChapters[2].slots.map(s=>campaign.has(s.levelId)),[true,true,true,false,false,false]);
 assert.deepEqual(campaignChapters.map(c=>c.slots.filter(s=>campaign.has(s.levelId)).length),[6,6,3]);
});
test('partial and all released completion use store semantics without declaring the chapter complete',()=>{
 const partial=fixture(refs(4),[1,2,3]),one=partial.view()[0];assert.equal(one.completed,3);assert.equal(one.missions[3].state,'available');
 const all=fixture(refs(4),[1,2,3,4]),before=all.raw(),v=all.view()[0];
 assert.equal(v.completed,4);assert.equal(v.released,4);assert.equal(v.complete,false);assert.equal(v.state,'available');
 assert.equal(all.raw(),before);assert.equal(all.writes(),0);assert.equal(all.store.progress.next,null);
});
test('Chapter 2 unlocks with Chapter 1 Mission 6 cleared and releases its six missions',()=>{
 const five=fixture(campaign.list(),[1,2,3,4,5]).view()[1];assert.equal(five.state,'locked');assert.equal(five.missions[0].state,'locked');
 const six=fixture(campaign.list(),CH1).view()[1];
 assert.equal(six.state,'available');assert.equal(six.missions[0].state,'available');assert.equal(six.released,6);assert.equal(six.completed,0);
 assert.deepEqual(six.missions.slice(1).map(m=>m.state),Array(5).fill('locked'),'Missions 2 to 6 wait for the mission before them');assert.equal(six.chapter.slots[5].levelId,'campaign-16');
 const seven=fixture(campaign.list(),[...CH1,11]).view()[1];assert.equal(seven.missions[0].state,'completed');assert.equal(seven.completed,1);assert.equal(seven.complete,false);
 const done=fixture(campaign.list(),[...CH1,...CH2]).view();assert.equal(done[1].complete,true);assert.equal(done[0].complete,true);
 assert.equal(done[2].state,'coming-soon','clearing Chapter 2 does not open Chapter 3');assert.ok(done[2].missions.every(m=>m.state==='pending'));
});
test('later content registration resolves Missions 5 and 6 without synthesizing missions or changing saves',()=>{
 const saved=fixture(refs(4),[1,2,3,4]).raw(),save=parseSave(saved).save;
 const levels=refs(6),view=chapterViews(campaignChapters,levels,progress(levels,save))[0];
 assert.equal(view.released,6);assert.equal(view.missions[4].state,'available');assert.equal(view.missions[5].state,'locked');
 const done=fixture(levels,CH1).view()[0];assert.equal(done.complete,true);assert.equal(done.completed,6);
 const gap=refs(6).filter(l=>l.number!==5),g=chapterViews(campaignChapters,gap,progress(gap,save))[0];
 assert.equal(g.missions[4].state,'pending');assert.equal(g.missions[5].state,'locked');
});
test('legacy Full Battle is never bound to a chapter or counted despite stale saves',()=>{
 const levels=refs(4),save={version:1,levels:{'campaign-20':{clears:8},'campaign-04':{clears:1}}}; // stale: campaign-20 is no slot at all now, and a clear out of order unlocks nothing
 const views=chapterViews(campaignChapters,levels,progress(levels,save));
 assert.equal(views[0].completed,0);assert.equal(views[1].missions[5].state,'pending');
 assert.equal(views[1].chapter.slots[5].levelId,'campaign-16','future story identity remains planned');
 assert.doesNotThrow(()=>validateChapters(campaignChapters,levels),'Chapter 2 is released and Full Battle occupies no slot');
 assert.equal(campaignChapters.flatMap(c=>c.slots).some(s=>s.levelId==='full-battle'),false);
});
test('validation rejects bad slot counts, local numbers, identities and references, and a story level without a slot',()=>{
 const bad=edit=>{const copy=structuredClone(campaignChapters);edit(copy);assert.throws(()=>validateChapters(copy,campaign.list()),/Invalid chapters/);};
 bad(c=>c[0].slots.pop());bad(c=>c[0].slots[1].localNumber=1);bad(c=>c[1].id=c[0].id);
 bad(c=>c[1].number=1);bad(c=>c[0].slots[0].levelId='unknown');bad(c=>c[0].slots[0].levelNumber=2);
 bad(c=>c[0].slots.push({localNumber:7,levelNumber:7,levelId:levelId(7)}));
 bad(c=>c[1].slots[0]={localNumber:1,levelNumber:7,levelId:levelId(7)});
 assert.throws(()=>validateChapters(campaignChapters,[{id:'campaign-01',number:2}]),/number mismatch/);
 assert.throws(()=>validateChapters(campaignChapters,[...campaign.list(),campaign.list()[0]]),/duplicate registered/);
 assert.throws(()=>validateChapters(campaignChapters,[...campaign.list(),{id:'campaign-07',number:7}]),/campaign-07 has no chapter slot/,'a seventh Chapter 1 level could never be played');
});
test('metadata is data driven and derivation does not mutate its inputs',()=>{
 const chapters=structuredClone(campaignChapters),levels=refs(4),save=parseSave(fixture(levels,[1,2]).raw()).save;
 const before=JSON.stringify({chapters,levels,save});chapterViews(chapters,levels,progress(levels,save));
 assert.equal(JSON.stringify({chapters,levels,save}),before);
 const fourth={...chapters[2],id:'fourth',number:4,slots:Array.from({length:6},(_,i)=>({localNumber:i+1,levelNumber:31+i,levelId:levelId(31+i)}))};
 assert.equal(chapterViews([...chapters,fourth],levels,progressOf([...chapters,fourth],levels,save)).length,4);
});
test('save parser, newer versions, memory fallback, replay and special recording remain compatible',()=>{
 const f=fixture(refs(4),[1,2]);f.store.recordVictory(refs(4)[0]);assert.equal(JSON.parse(f.raw()).levels['campaign-01'].clears,2);
 assert.equal(f.store.recordVictory({id:'full-battle',number:0}).recorded,false);
 assert.equal(f.view()[0].completed,2);
 const newer=new ProgressStore(()=>({getItem:()=>'{"version":2,"levels":{}}',setItem:()=>assert.fail('newer save overwritten')}),()=>refs(4));newer.refresh();
 assert.equal(chapterViews(campaignChapters,refs(4),newer.progress)[0].state,'available');assert.equal(newer.persistent,false);
 const memory=new ProgressStore(()=>null,()=>refs(4));memory.refresh();memory.recordVictory(refs(4)[0]);
 assert.equal(chapterViews(campaignChapters,refs(4),memory.progress)[0].completed,1);assert.equal(memory.persistent,false);
});

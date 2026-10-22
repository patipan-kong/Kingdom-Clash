const test=require('node:test');
const assert=require('node:assert/strict');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews,validateChapters}=require('../.test-build/data/chapterView.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {PROGRESS_KEY,progressOf,parseSave}=require('../.test-build/data/campaignProgress.js');
const {levelId}=require('../.test-build/data/campaign.js');
const refs=n=>[...Array.from({length:n},(_,i)=>({id:levelId(i+1),number:i+1})),{id:'full-battle',number:0}];
function fixture(levels=campaign.list(),clears=0){
 let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[levelId(i+1),{clears:1}]))}),writes=0;
 const store=new ProgressStore(()=>({getItem:key=>{assert.equal(key,PROGRESS_KEY);return raw;},setItem:(_key,value)=>{writes++;raw=value;}}),()=>levels);store.refresh();
 return {store,view:()=>chapterViews(campaignChapters,levels,store.progress),raw:()=>raw,writes:()=>writes};
}
test('fresh store exposes one available chapter, ten slots, and only real registered missions',()=>{
 const f=fixture(),views=f.view(),one=views[0];
 assert.equal(one.state,'available');assert.equal(one.completed,0);assert.equal(one.total,10);
 assert.equal(one.released,campaign.list().filter(l=>l.number>=1&&l.number<=10).length);
 assert.equal(one.missions[0].state,'available');assert.equal(one.missions[1].state,'locked');
 assert.equal(one.released,10);assert.ok(one.missions.slice(1).every(m=>m.state==='locked'));
 const done=fixture(campaign.list(),10).view()[0];assert.equal(done.completed,10);assert.equal(done.complete,true);
 // Chapter 2 is released with Levels 11 to 14 (S6, S8): locked until Level 10 is cleared; Chapter 3 stays coming soon.
 assert.deepEqual(views.slice(1).map(v=>[v.state,v.released,v.completed,v.total]),[['locked',4,0,10],['coming-soon',0,0,10]]);
 assert.equal(views[1].missions[0].state,'locked');assert.ok(views[1].missions.slice(1,4).every(m=>m.state==='locked')&&views[1].missions.slice(4).every(m=>m.state==='pending'));
 assert.equal(f.writes(),0);
});
test('partial and all released completion use store semantics without declaring the chapter complete',()=>{
 const partial=fixture(refs(8),3),one=partial.view()[0];assert.equal(one.completed,3);assert.equal(one.missions[3].state,'available');
 const all=fixture(refs(8),8),before=all.raw(),v=all.view()[0];
 assert.equal(v.completed,8);assert.equal(v.released,8);assert.equal(v.complete,false);assert.equal(v.state,'available');
 assert.equal(all.raw(),before);assert.equal(all.writes(),0);assert.equal(all.store.progress.next,null);
});
test('Chapter 2 unlocks with Level 10 cleared and releases Levels 11-14; slots 15-20 stay pending',()=>{
 const nine=fixture(campaign.list(),9).view()[1];assert.equal(nine.state,'locked');assert.equal(nine.missions[0].state,'locked');
 const ten=fixture(campaign.list(),10).view()[1];
 assert.equal(ten.state,'available');assert.equal(ten.missions[0].state,'available');assert.equal(ten.released,4);assert.equal(ten.completed,0);
 assert.deepEqual(ten.missions.slice(1,4).map(m=>m.state),['locked','locked','locked'],'Levels 12 to 14 wait for the level before them');assert.ok(ten.missions.slice(4).every(m=>m.state==='pending'),'Levels 15-20 are unregistered, so pending');assert.equal(ten.chapter.slots[9].levelId,'campaign-20');
 const eleven=fixture(campaign.list(),11).view()[1];assert.equal(eleven.missions[0].state,'completed');assert.equal(eleven.completed,1);assert.equal(eleven.complete,false);
 assert.equal(fixture(campaign.list(),10).view()[0].complete,true,'Chapter 1 is unchanged');
});
test('later content registration resolves 6–10 without synthesizing missions or changing saves',()=>{
 const saved=fixture(refs(8),8).raw(),save=parseSave(saved).save;
 const levels=refs(10),view=chapterViews(campaignChapters,levels,progressOf(levels,save))[0];
 assert.equal(view.released,10);assert.equal(view.missions[8].state,'available');assert.equal(view.missions[9].state,'locked');
 const done=fixture(levels,10).view()[0];assert.equal(done.complete,true);assert.equal(done.completed,10);
 const gap=refs(10).filter(l=>l.number!==9),g=chapterViews(campaignChapters,gap,progressOf(gap,save))[0];
 assert.equal(g.missions[8].state,'pending');assert.equal(g.missions[9].state,'locked');
});
test('legacy Full Battle is never bound to a chapter or counted despite stale saves',()=>{
 const levels=refs(8),save={version:1,levels:{'campaign-20':{clears:8},'campaign-08':{clears:1}}}; // stale: campaign-20 is the Chapter 2 finale again, and a clear out of order unlocks nothing
 const views=chapterViews(campaignChapters,levels,progressOf(levels,save));
 assert.equal(views[0].completed,0);assert.equal(views[1].missions[9].state,'pending');
 assert.equal(views[1].chapter.slots[9].levelId,'campaign-20','future story identity remains planned');
 assert.doesNotThrow(()=>validateChapters(campaignChapters,levels),'Chapter 2 is released and Full Battle no longer occupies its finale slot');
 assert.equal(campaignChapters.flatMap(c=>c.slots).some(s=>s.levelId==='full-battle'),false);
});
test('validation rejects bad slot counts, local numbers, identities and references',()=>{
 const bad=edit=>{const copy=structuredClone(campaignChapters);edit(copy);assert.throws(()=>validateChapters(copy,campaign.list()),/Invalid chapters/);};
 bad(c=>c[0].slots.pop());bad(c=>c[0].slots[1].localNumber=1);bad(c=>c[1].id=c[0].id);
 bad(c=>c[1].number=1);bad(c=>c[0].slots[0].levelId='unknown');bad(c=>c[0].slots[0].levelNumber=2);
 assert.throws(()=>validateChapters(campaignChapters,[{id:'campaign-01',number:2}]),/number mismatch/);
 assert.throws(()=>validateChapters(campaignChapters,[...campaign.list(),campaign.list()[0]]),/duplicate registered/);
});
test('metadata is data driven and derivation does not mutate its inputs',()=>{
 const chapters=structuredClone(campaignChapters),levels=refs(8),save=parseSave(fixture(levels,2).raw()).save;
 const before=JSON.stringify({chapters,levels,save});chapterViews(chapters,levels,progressOf(levels,save));
 assert.equal(JSON.stringify({chapters,levels,save}),before);
 const fourth={...chapters[2],id:'fourth',number:4,slots:Array.from({length:10},(_,i)=>({localNumber:i+1,levelNumber:31+i,levelId:levelId(31+i)}))};
 assert.equal(chapterViews([...chapters,fourth],levels,progressOf(levels,save)).length,4);
});
test('save parser, newer versions, memory fallback, replay and special recording remain compatible',()=>{
 const f=fixture(refs(8),2);f.store.recordVictory(refs(8)[0]);assert.equal(JSON.parse(f.raw()).levels['campaign-01'].clears,2);
 assert.equal(f.store.recordVictory({id:'full-battle',number:0}).recorded,false);
 assert.equal(f.view()[0].completed,2);
 const newer=new ProgressStore(()=>({getItem:()=>'{"version":2,"levels":{}}',setItem:()=>assert.fail('newer save overwritten')}),()=>refs(8));newer.refresh();
 assert.equal(chapterViews(campaignChapters,refs(8),newer.progress)[0].state,'available');assert.equal(newer.persistent,false);
 const memory=new ProgressStore(()=>null,()=>refs(8));memory.refresh();memory.recordVictory(refs(8)[0]);
 assert.equal(chapterViews(campaignChapters,refs(8),memory.progress)[0].completed,1);assert.equal(memory.persistent,false);
});

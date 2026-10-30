const test=require('node:test');
const assert=require('node:assert/strict');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {PROGRESS_KEY,parseSave,mergeSaves,sequenceOf,progressOf,recordClear,isSequential,specialLabel}=require('../.test-build/data/campaignProgress.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');

// A fake Storage that can fail on demand. Every write is counted so "no overwrite" can be asserted.
const fake=(initial)=>{const s={data:new Map(initial===undefined?[]:[[PROGRESS_KEY,initial]]),writes:0,failRead:false,failWrite:false,
 getItem(k){if(s.failRead)throw new Error('read denied');return s.data.has(k)?s.data.get(k):null;},
 setItem(k,v){if(s.failWrite)throw new Error('quota');s.writes++;s.data.set(k,String(v));}};return s;};
const store=(storage,levels,chapters)=>new ProgressStore(()=>storage,levels?()=>levels:undefined,chapters?()=>chapters:undefined);
const L=n=>campaign.byNumber(n),save=(...ids)=>JSON.stringify({version:1,levels:Object.fromEntries(ids.map(i=>[typeof i==='number'?`campaign-${String(i).padStart(2,'0')}`:i,{clears:1}]))});
const ids=list=>list.map(l=>l.id);
// Full Battle is the special mode 'full-battle'. Tests of the "latest registered level" use Chapter 1 alone (campaign-01 to campaign-06), the way it stood before Chapter 2.
// Six-mission chapters: Chapter 1 is Levels 1-6 and Chapter 2 Levels 11-16; the order comes from the chapter slots (sequenceOf), not from the numbers.
const FB=campaign.get('full-battle'),upTo6=campaign.list().filter(l=>l.chapter===1),CH1=[1,2,3,4,5,6],CH2=[11,12,13,14,15,16];

test('a fresh save unlocks Level 1 only and Continue starts at Level 1',()=>{
 const st=store(fake());st.refresh();
 assert.equal(st.status,'fresh');assert.equal(st.persistent,true);
 assert.equal(st.isUnlocked(L(1)),true);for(const n of [2,3,4,5,6,...CH2])assert.equal(st.isUnlocked(L(n)),false,`Level ${n} locked`);
 assert.equal(st.progress.next.id,'campaign-01');assert.equal(st.progress.completed.length,0);
});

test('the sequence is the released chapter slots in order: Chapters 1 and 2, six missions each; not Full Battle and not the coming-soon Chapter 3',()=>{
 const p=progressOf(campaignChapters,campaign.list(),parseSave(null).save);
 assert.deepEqual(ids(p.sequence),[...CH1,...CH2].map(n=>L(n).id));assert.equal(campaign.has('campaign-21'),true,'Level 21 is registered but its chapter is not released');
 assert.equal(isSequential(FB),false);assert.equal(isSequential(L(1)),true);assert.equal(isSequential({id:'campaign-20',number:20}),true,'campaign-20 is an ordinary story id again');
 assert.equal(specialLabel(FB),'FULL BATTLE · ALWAYS AVAILABLE');assert.equal(specialLabel(L(1)),null);
 assert.equal(specialLabel({id:'toString',number:1}),null,'prototype keys are not special');
});

test('Level 1 Victory unlocks Level 2 only, survives a reload, and Continue targets Level 2',()=>{
 const storage=fake(),st=store(storage);st.refresh();
 const r=st.recordVictory(L(1));
 assert.deepEqual([r.recorded,r.next.id,r.upToDate],[true,'campaign-02',false]);
 assert.deepEqual(JSON.parse(storage.data.get(PROGRESS_KEY)),{version:1,levels:{'campaign-01':{clears:1}}});
 const reloaded=store(storage);reloaded.refresh();
 assert.equal(reloaded.isCompleted(L(1)),true);assert.equal(reloaded.isUnlocked(L(2)),true);assert.equal(reloaded.isUnlocked(L(3)),false);
 assert.equal(reloaded.progress.next.id,'campaign-02');assert.equal(reloaded.status,'ok');
});

test('replaying a completed level counts a clear and never removes progress',()=>{
 const storage=fake(save(1,2)),st=store(storage);st.refresh();
 assert.equal(st.recordVictory(L(1)).recorded,true);
 const saved=JSON.parse(storage.data.get(PROGRESS_KEY));
 assert.deepEqual(saved.levels,{'campaign-01':{clears:2},'campaign-02':{clears:1}});
 assert.equal(st.isCompleted(L(2)),true);assert.equal(st.isUnlocked(L(3)),true);assert.equal(st.progress.next.id,'campaign-03');
});

test('a locked or special level cannot record a clear',()=>{
 const storage=fake(),st=store(storage);st.refresh();
 assert.equal(st.recordVictory(L(3)).recorded,false,'locked Level 3');
 assert.equal(st.recordVictory(FB).recorded,false,'Full Battle never counts');
 assert.equal(st.recordVictory({id:'campaign-99',number:99}).recorded,false,'unregistered');
 assert.equal(storage.writes,0);assert.equal(st.progress.completed.length,0);
});

test('malformed or incompatible saves recover to a safe playable state',()=>{
 for(const raw of ['','not json','{','null','[]','"x"','7','{}','{"version":"1","levels":{}}','{"version":0,"levels":{}}','{"version":-3}','{"version":1.5,"levels":{}}','{"version":1}','{"version":1,"levels":[]}','{"version":1,"levels":7}']){
  const p=parseSave(raw);assert.equal(p.status,'recovered',`recovered: ${raw}`);assert.deepEqual(p.save,{version:1,levels:{}});assert.equal(p.writable,true);
 }
 const st=store(fake('garbage'));st.refresh();assert.equal(st.status,'recovered');assert.equal(st.isUnlocked(L(1)),true);assert.equal(st.isUnlocked(L(2)),false);
 const entries=parseSave(JSON.stringify({version:1,levels:{'campaign-01':{clears:2},'campaign-02':{clears:0},'campaign-03':{clears:-1},'campaign-04':{clears:1.5},'campaign-05':{clears:'1'},'campaign-1':{clears:1},'level-2':{clears:1},'__proto__':{clears:1},'campaign-06':null,'campaign-07':{}}}));
 assert.equal(entries.status,'recovered');assert.deepEqual(entries.save.levels,{'campaign-01':{clears:2}},'only the valid entry is kept');
 assert.equal(parseSave(save(1,2)).status,'ok');
 assert.equal(parseSave(JSON.stringify({version:1,levels:{'campaign-01':{clears:1,future:'x'}}})).status,'ok','extra fields are tolerated');
});

test('a malformed save is overwritten by the next Victory',()=>{
 const storage=fake('{broken'),st=store(storage);st.refresh();st.recordVictory(L(1));
 assert.deepEqual(JSON.parse(storage.data.get(PROGRESS_KEY)),{version:1,levels:{'campaign-01':{clears:1}}});assert.equal(st.status,'ok');
});

test('a newer-version save is never overwritten; this session still progresses in memory',()=>{
 const future=JSON.stringify({version:2,levels:{'campaign-01':{clears:9}},stars:{}}),storage=fake(future),st=store(storage);st.refresh();
 assert.equal(st.status,'newer-version');assert.equal(st.persistent,false);assert.equal(st.isUnlocked(L(2)),false);
 assert.equal(st.recordVictory(L(1)).recorded,true);
 assert.equal(storage.writes,0);assert.equal(storage.data.get(PROGRESS_KEY),future,'stored value untouched');
 assert.equal(st.isUnlocked(L(2)),true,'session-only progress works');
 st.refresh();assert.equal(st.isUnlocked(L(2)),true,'a re-read does not lose it');
});

test('storage failures fall back to in-memory progress without throwing',()=>{
 const noStorage=new ProgressStore(()=>{throw new Error('SecurityError');});
 noStorage.refresh();assert.equal(noStorage.status,'unavailable');assert.equal(noStorage.persistent,false);assert.equal(noStorage.isUnlocked(L(1)),true);
 assert.equal(noStorage.recordVictory(L(1)).recorded,true);noStorage.refresh();assert.equal(noStorage.isUnlocked(L(2)),true,'session progress survives refresh');
 const nullStorage=new ProgressStore(()=>null);nullStorage.refresh();assert.equal(nullStorage.status,'unavailable');

 const unreadable=fake(save(1));unreadable.failRead=true;const a=store(unreadable);a.refresh();
 assert.equal(a.status,'unavailable');assert.equal(a.isUnlocked(L(2)),false,'an unreadable save is not assumed');
 assert.equal(a.recordVictory(L(1)).recorded,true);assert.equal(unreadable.writes,0,'never writes over what could not be read');

 const unwritable=fake(save(1)),b=store(unwritable);b.refresh();assert.equal(b.persistent,true);
 unwritable.failWrite=true;const r=b.recordVictory(L(2));
 assert.equal(r.recorded,true);assert.equal(b.persistent,false,'a failed write is reported');
 b.refresh();assert.equal(b.isCompleted(L(2)),true,'unsaved progress stays in memory');assert.equal(b.persistent,false,'and the warning persists');
 unwritable.failWrite=false;b.recordVictory(L(3));assert.equal(b.persistent,true);
 assert.deepEqual(Object.keys(JSON.parse(unwritable.data.get(PROGRESS_KEY)).levels).sort(),['campaign-01','campaign-02','campaign-03'],'recovered write includes the earlier unsaved clear');
});

test('out-of-order saved completions unlock nothing',()=>{
 const p=progressOf(campaignChapters,campaign.list(),parseSave(save(3,5)).save);
 assert.equal(p.completed.length,0);assert.equal(p.next.id,'campaign-01');assert.equal(p.isUnlocked(L(2)),false);assert.equal(p.isUnlocked(L(4)),false);assert.equal(p.isCompleted(L(3)),false);
 const gap=progressOf(campaignChapters,campaign.list(),parseSave(save(1,3)).save);
 assert.deepEqual(ids(gap.completed),['campaign-01']);assert.equal(gap.isUnlocked(L(2)),true);assert.equal(gap.isUnlocked(L(3)),false);assert.equal(gap.isUnlocked(L(4)),false);
});

test('unknown saved ids unlock nothing yet are preserved for later',()=>{
 const storage=fake(save(1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,'campaign-22','campaign-21')),st=store(storage);st.refresh();
 assert.equal(st.progress.next,null,'Levels 21 and 22 are in the unreleased Chapter 3');
 const eight=store(fake(save(1,'campaign-21')));eight.refresh();assert.equal(eight.progress.completed.length,1);
 const written=store(fake(save('campaign-21')));written.refresh();written.recordVictory(L(1));
 assert.ok('campaign-21' in JSON.parse(written.storage().data.get(PROGRESS_KEY)).levels,'unknown id kept on write');
});

test('completing the latest level is up to date and never unlocks or targets Full Battle',()=>{
 const storage=fake(save(1,2,3,4,5)),st=store(storage,upTo6.concat(FB));st.refresh();
 assert.equal(st.progress.next.id,'campaign-06');
 const r=st.recordVictory(L(6));
 assert.deepEqual([r.recorded,r.next,r.upToDate],[true,null,true]);
 assert.equal(st.progress.next,null);assert.equal(st.progress.completed.length,6);
 assert.equal(JSON.parse(storage.data.get(PROGRESS_KEY)).levels['full-battle'],undefined);
 assert.equal(st.recordVictory(FB).recorded,false);assert.equal(st.progress.completed.some(l=>l.id==='full-battle'),false);
 assert.equal(st.isUnlocked(FB),true,'Full Battle stays openable on its own terms');
 const fresh=store(fake());fresh.refresh();assert.equal(fresh.isUnlocked(FB),true,'and without clearing Chapter 1');
});

test('Chapter 2 Mission 1 unlocks from an existing Chapter 1 save, then Missions 2 to 6 follow one clear at a time; then the campaign is up to date',()=>{
 const storage=fake(save(...CH1)),st=store(storage);st.refresh();
 assert.equal(st.isUnlocked(L(11)),true);assert.equal(st.progress.next.id,'campaign-11');assert.equal(st.isCompleted(L(6)),true,'existing progress kept');
 assert.equal(st.isUnlocked(L(12)),false);assert.equal(st.recordVictory(L(12)).recorded,false,'Mission 2 cannot be cleared before Mission 1');
 let r=st.recordVictory(L(6));assert.deepEqual([r.recorded,r.firstClear,r.next.id],[true,false,'campaign-11'],'Chapter 1 Mission 6 leads on to Chapter 2 Mission 1');
 for(const [i,n] of CH2.entries()){
  if(i<5)assert.equal(st.recordVictory(L(CH2[i+1])).recorded,false,`${L(CH2[i+1]).id} cannot be cleared before ${L(n).id}`);
  r=st.recordVictory(L(n));assert.deepEqual([r.recorded,r.firstClear,r.next?.id??null,r.upToDate],[true,true,i<5?L(CH2[i+1]).id:null,i===5]);
 }
 assert.equal(st.progress.next,null,'Chapter 3 is not released, so nothing follows Chapter 2 Mission 6');
 assert.deepEqual(JSON.parse(storage.data.get(PROGRESS_KEY)).levels,Object.fromEntries([...CH1,...CH2].map(n=>[L(n).id,{clears:n===6?2:1}])),'schema unchanged: version 1, one entry per cleared mission');
});

test('a mission registered later in a released chapter unlocks from existing saves; a pending slot stops the sequence; an unreleased chapter never joins it',()=>{
 const without=id=>campaign.list().filter(l=>l.id!==id),all=[...CH1,...CH2];
 const five=store(fake(save(...CH1,11,12,13,14,15)),without('campaign-16'));five.refresh();
 assert.equal(five.progress.next,null,'Mission 6 not yet registered: up to date');
 const later=store(fake(save(...CH1,11,12,13,14,15)));later.refresh();
 assert.equal(later.isUnlocked(L(16)),true);assert.equal(later.progress.next.id,'campaign-16');assert.equal(later.isCompleted(L(14)),true,'existing progress kept');
 const gap=without('campaign-15'),g=store(fake(save(...all)),gap);g.refresh();
 assert.equal(g.isUnlocked(L(16)),false,'Mission 6 is behind the pending Mission 5');assert.equal(g.progress.next,null);assert.equal(g.recordVictory(L(16)).recorded,false);
 assert.deepEqual(ids(sequenceOf(campaignChapters,gap)),[...CH1,11,12,13,14].map(n=>L(n).id));
 // Releasing Chapter 3 (a test copy of the chapters) would add its registered missions, up to its first pending slot.
 const released=campaignChapters.map(c=>c.number===3?{...c,release:'available'}:c),r=store(fake(save(...all)),undefined,released);r.refresh();
 assert.equal(r.progress.next.id,'campaign-21');assert.deepEqual(ids(r.progress.sequence).slice(-7),['campaign-16','campaign-21','campaign-22','campaign-23','campaign-24','campaign-25','campaign-26']);
 const both=store(fake(save(...all,21,22)),undefined,released);both.refresh();assert.equal(both.progress.next.id,'campaign-23');
 const three=store(fake(save(...all,21,22,23)),undefined,released);three.refresh();assert.equal(three.progress.next.id,'campaign-24');
 const four=store(fake(save(...all,21,22,23,24)),undefined,released);four.refresh();assert.equal(four.progress.next.id,'campaign-25');
});

test('a second tab is merged: each write re-reads first and nothing earned is lost',()=>{
 const storage=fake(),a=store(storage),b=store(storage);a.refresh();b.refresh();
 a.recordVictory(L(1));b.recordVictory(L(1));
 assert.equal(JSON.parse(storage.data.get(PROGRESS_KEY)).levels['campaign-01'].clears,2,'each tab really cleared it once; the write re-reads first so neither clear is lost');
 b.recordVictory(L(2));a.refresh();assert.equal(a.isCompleted(L(2)),true,'tab A sees tab B');
 assert.deepEqual(mergeSaves({version:1,levels:{'campaign-01':{clears:3}}},{version:1,levels:{'campaign-01':{clears:2},'campaign-02':{clears:1}}}).levels,{'campaign-01':{clears:3},'campaign-02':{clears:1}});
});

test('recordClear and parsing never mutate their inputs',()=>{
 const base=parseSave(save(1)).save,snapshot=JSON.stringify(base),next=recordClear(base,'campaign-02');
 assert.equal(JSON.stringify(base),snapshot);assert.equal(next.levels['campaign-02'].clears,1);
});

test('registering progress code leaves campaign setups and Full Battle untouched',()=>{
 const l20=campaign.get('full-battle');assert.deepEqual(l20.match,{encounter:'extended'});assert.equal(l20.mission,null);
 assert.ok(!('track' in l20)&&!('sequential' in l20),'no metadata added to the level definition');
});

test('a Victory is classified as a first clear or a replay, for any level and even when the write fails',()=>{
 const mk=n=>({id:`campaign-${String(n).padStart(2,'0')}`,number:n});
 const storage=fake(),st=store(storage,upTo6);st.refresh();
 let r=st.recordVictory(L(1));assert.deepEqual([r.recorded,r.firstClear,r.next.id],[true,true,'campaign-02']);
 r=st.recordVictory(L(1));assert.deepEqual([r.recorded,r.firstClear],[true,false],'replay of Level 1');
 for(const n of [2,3,4,5])st.recordVictory(L(n));
 r=st.recordVictory(L(6));assert.deepEqual([r.firstClear,r.upToDate],[true,true],'first clear of the latest level is up to date');
 r=st.recordVictory(L(6));assert.deepEqual([r.firstClear,r.upToDate],[false,true],'replay of the latest level is a replay, not a first clear');
 assert.equal(JSON.parse(storage.data.get(PROGRESS_KEY)).levels['campaign-06'].clears,2);
 r=st.recordVictory(L(5));assert.deepEqual([r.recorded,r.firstClear,r.next.id],[true,false,'campaign-06'],'replaying Level 5 once Level 6 is done is a replay (next is only its successor)');
 // A later-registered level behaves the same way: no level number is special.
 const eleven=[...upTo6,mk(11)],g=store(fake(save(...CH1)),eleven);g.refresh();
 r=g.recordVictory(L(6));assert.deepEqual([r.firstClear,r.next.id],[false,'campaign-11'],'replaying Level 6 once Level 11 exists');
 r=g.recordVictory(mk(11));assert.deepEqual([r.firstClear,r.upToDate],[true,true]);r=g.recordVictory(mk(11));assert.equal(r.firstClear,false);
 // Session memory decides, not storage: a failed write must not make a first clear look like a replay.
 const broken=fake();broken.failWrite=true;const b=store(broken);b.refresh();
 r=b.recordVictory(L(1));assert.deepEqual([r.recorded,r.firstClear],[true,true]);assert.equal(b.persistent,false);
 r=b.recordVictory(L(1));assert.deepEqual([r.recorded,r.firstClear],[true,false],'the second clear in the same session is a replay');
 const gone=new ProgressStore(()=>{throw new Error('denied');});gone.refresh();
 assert.equal(gone.recordVictory(L(1)).firstClear,true);assert.equal(gone.recordVictory(L(1)).firstClear,false);
 // Refused Victories are never a first clear.
 assert.equal(st.recordVictory(FB).firstClear,false);assert.equal(store(fake()).recordVictory(L(3)).firstClear,false);
});

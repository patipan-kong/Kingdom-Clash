const {test}=require('node:test'),assert=require('node:assert/strict');
const {campaign,campaignLevels,legacyCampaignLevels,sixMissionSources}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {campaignSelection}=require('../.test-build/data/campaignSelection.js');
const {debugLevelFromSearch}=require('../.test-build/data/debugLaunch.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {PROGRESS_KEY,LEGACY_PROGRESS_KEY,migrateLegacySave,legacyPrefix}=require('../.test-build/data/campaignProgress.js');
const {levelId,missionLabel,missionOf,campaignRules}=require('../.test-build/data/campaign.js');
const legacy=require('./support/legacyCampaign.cjs').campaign;
// Six-mission redesign: six mission slots per chapter under chapter-block ids, progression from the released chapter slots, and a v2 save derived once from v1.
// B1 made each implemented mission an unchanged legacy level; B2A then redesigned Chapter 1 Missions 2-6 (tests/chapter1-redesign.cjs), so only the rest stay unchanged copies.
const CH1=[1,2,3,4,5,6].map(levelId),CH2=[11,12,13,14,15,16].map(levelId),CH3=[21,22,23,24,25,26].map(levelId);
// A fake Storage holding separate keys, counting writes per key.
const storage=(entries={})=>{const data=new Map(Object.entries(entries)),writes=[];let failWrite=false;
 return {data,writes,set failWrite(v){failWrite=v;},getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{if(failWrite)throw new Error('quota');writes.push(k);data.set(k,String(v));}};};
const v1=prefix=>JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:prefix},(_,i)=>[levelId(i+1),{clears:1}]))});
const v2=ids=>JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))});
const open=s=>{const st=new ProgressStore(()=>s);st.refresh();return st;};
const cleared=st=>st.progress.completed.map(l=>l.id);

test('Chapters 1 and 2 have six missions each, Chapter 3 six slots with only Missions 1 to 3 implemented',()=>{
 assert.equal(campaignRules.chapterMissions,6);assert.equal(campaignRules.chapterBlock,10);
 assert.deepEqual(campaignChapters.map(c=>c.slots.map(s=>s.levelId)),[CH1,CH2,CH3]);
 assert.deepEqual(campaign.list().map(l=>l.id),[...CH1,...CH2,'campaign-21','campaign-22','campaign-23','full-battle']);
 assert.deepEqual([1,2,3].map(c=>campaign.list().filter(l=>l.chapter===c).length),[6,6,3]);
 for(const id of CH3.slice(3))assert.equal(campaign.has(id),false,`${id} is a pending slot, not a placeholder mission`);
 for(const l of campaign.list().filter(l=>l.chapter))assert.equal(l.id,levelId(l.number));
 assert.deepEqual(campaignChapters.map(c=>c.release),['available','available','coming-soon']);
});

test('Chapter 1 Mission 1 and Chapter 3 reuse their legacy level unchanged (Chapter 2 is redesigned in tests/chapter2-redesign.cjs): the same match, mission, display text and MatchSetup; only id, number and chapter move',()=>{
 assert.deepEqual(Object.entries(sixMissionSources).map(([id,n])=>[id,n]),[
  ['campaign-01',1],['campaign-02',2],['campaign-03',8],['campaign-04',5],['campaign-05',9],['campaign-06',10],
  ['campaign-11',13],['campaign-12',14],['campaign-13',19],['campaign-14',18],['campaign-15',17],['campaign-16',20],['campaign-21',21],['campaign-23',22]]);
 for(const [id,n] of Object.entries(sixMissionSources).filter(([id])=>id==='campaign-01'||!CH1.includes(id)&&!CH2.includes(id))){
  const now=campaign.get(id),was=legacy.byNumber(n);
  assert.deepEqual([now.match,now.mission,now.display],[was.match,was.mission,was.display],`${id} is old Level ${n}`);
  assert.deepEqual(campaign.setup(id),legacy.setup(n),`${id} builds the same match as old Level ${n}`);
  assert.deepEqual([now.number,now.chapter],[Number(id.slice(9)),Math.ceil(Number(id.slice(9))/10)]);assert.ok(Object.isFrozen(now));
 }
 assert.deepEqual(campaign.get('full-battle'),legacy.get('full-battle'));
 assert.equal(legacyCampaignLevels.length,23,'the legacy source still holds Levels 1-22 and Full Battle');assert.equal(campaignLevels.length,16);
});

test('labels name Chapter N · Mission M, and the finale is Mission 6 of each chapter',()=>{
 assert.deepEqual([...CH1,...CH2,'campaign-21','campaign-22','campaign-23'].map(id=>missionLabel(campaign.get(id))),[
  ...[1,2,3,4,5,6].map(m=>`Chapter 1 · Mission ${m}`),...[1,2,3,4,5,6].map(m=>`Chapter 2 · Mission ${m}`),'Chapter 3 · Mission 1','Chapter 3 · Mission 2','Chapter 3 · Mission 3']);
 assert.equal(missionOf(16),6);assert.equal(missionOf(21),1);
 const all=open(storage({[PROGRESS_KEY]:v2([...CH1,...CH2])})).progress;
 for(const id of ['first-war','burning-frontier']){
  const v=campaignSelection(campaignChapters,campaign.list(),all,id);assert.equal(v.missions.length,6);
  assert.deepEqual(v.missions.map(m=>m.finale),[false,false,false,false,false,true]);assert.equal(v.missions[5].number,6);
 }
});

test('a fresh browser (no v1, no v2) starts at Chapter 1 Mission 1 and writes nothing until a Victory',()=>{
 const s=storage(),st=open(s);
 assert.equal(st.status,'fresh');assert.equal(st.progress.next.id,'campaign-01');assert.deepEqual(cleared(st),[]);assert.deepEqual(s.writes,[]);
 st.recordVictory(campaign.get('campaign-01'));assert.deepEqual(s.writes,[PROGRESS_KEY]);assert.equal(s.data.has(LEGACY_PROGRESS_KEY),false,'v1 is never written');
});

test('v1 derivation is conservative: each mission needs its old threshold in the cleared prefix (Chapter 1: 2, 3, 5, 8, 9, 10; Chapter 2: 11, 13, 14, 16, 19, 20)',()=>{
 const expected=prefix=>[[2,'campaign-01'],[3,'campaign-02'],[5,'campaign-03'],[8,'campaign-04'],[9,'campaign-05'],[10,'campaign-06'],
  [11,'campaign-11'],[13,'campaign-12'],[14,'campaign-13'],[16,'campaign-14'],[19,'campaign-15'],[20,'campaign-16']].filter(([t])=>prefix>=t).map(([,id])=>id);
 for(let prefix=0;prefix<=22;prefix++){
  const s=storage({[LEGACY_PROGRESS_KEY]:v1(prefix)}),st=open(s);
  assert.deepEqual(cleared(st),expected(prefix),`old prefix ${prefix}`);
  assert.equal(st.progress.next?.id??null,[...CH1,...CH2].find(id=>!expected(prefix).includes(id))??null,`Continue after old prefix ${prefix}`);
  assert.equal(s.data.get(LEGACY_PROGRESS_KEY),v1(prefix),'v1 is left exactly as it was');assert.ok(!s.writes.includes(LEGACY_PROGRESS_KEY));
 }
 // The named cases.
 assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:v1(1)}))),[],'partial Chapter 1, old Level 1 only: Mission 1 needs old Level 2 too');
 assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:v1(7)}))),CH1.slice(0,3),'partial Chapter 1, old Levels 1-7');
 assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:v1(10)}))),CH1,'completed Chapter 1');assert.equal(open(storage({[LEGACY_PROGRESS_KEY]:v1(10)})).progress.next.id,'campaign-11');
 assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:v1(15)}))),[...CH1,...CH2.slice(0,3)],'partial Chapter 2, old Levels 1-15');
 assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:v1(20)}))),[...CH1,...CH2],'completed Chapter 2');assert.equal(open(storage({[LEGACY_PROGRESS_KEY]:v1(20)})).progress.next,null);
});

test('v1 derivation never invents clears: gaps, stale and unknown entries count only the unbroken prefix from old Level 1',()=>{
 const raw=levels=>JSON.stringify({version:1,levels:Object.fromEntries(levels.map(id=>[id,{clears:3}]))});
 const gap=[1,2,3,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(levelId);
 assert.equal(legacyPrefix(JSON.parse(raw(gap))),3);assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:raw(gap)}))),CH1.slice(0,2),'old Level 4 missing: only Missions 1 and 2');
 assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:raw(['campaign-20'])}))),[],'a lone stale campaign-20 grants nothing');
 assert.deepEqual(cleared(open(storage({[LEGACY_PROGRESS_KEY]:raw(['campaign-21','campaign-22','full-battle'])}))),[]);
 assert.deepEqual(migrateLegacySave({version:1,levels:{}}),{version:1,levels:{}});
 for(const bad of ['garbage','{"version":9,"levels":{"campaign-01":{"clears":1}}}','null']){
  const s=storage({[LEGACY_PROGRESS_KEY]:bad}),st=open(s);assert.deepEqual(cleared(st),[]);assert.equal(st.progress.next.id,'campaign-01');assert.equal(s.data.get(LEGACY_PROGRESS_KEY),bad);
 }
 // Migrated clears count once: replaying a migrated mission is a replay, not a first clear.
 const st=open(storage({[LEGACY_PROGRESS_KEY]:v1(10)})),r=st.recordVictory(campaign.get('campaign-06'));assert.deepEqual([r.recorded,r.firstClear,r.next.id],[true,false,'campaign-11']);
});

test('the v2 save is derived from v1 once: written immediately, then v1 is never consulted again and stays untouched for a rollback',()=>{
 const s=storage({[LEGACY_PROGRESS_KEY]:v1(10)}),st=open(s);
 assert.deepEqual(s.writes,[PROGRESS_KEY],'one write, to v2');assert.deepEqual(Object.keys(JSON.parse(s.data.get(PROGRESS_KEY)).levels),CH1);
 assert.equal(st.status,'ok');assert.equal(st.persistent,true);
 s.data.set(LEGACY_PROGRESS_KEY,v1(20));const again=open(s);assert.deepEqual(cleared(again),CH1,'v2 exists: a later v1 change is ignored');assert.deepEqual(s.writes,[PROGRESS_KEY]);
 const both=storage({[LEGACY_PROGRESS_KEY]:v1(20),[PROGRESS_KEY]:v2(['campaign-01'])});assert.deepEqual(cleared(open(both)),['campaign-01'],'an existing v2 save wins over v1');assert.deepEqual(both.writes,[]);
 const nothing=storage({[LEGACY_PROGRESS_KEY]:v1(1)});open(nothing);assert.deepEqual(nothing.writes,[],'nothing to derive: nothing written');
 const failing=storage({[LEGACY_PROGRESS_KEY]:v1(10)});failing.failWrite=true;const f=open(failing);
 assert.deepEqual(cleared(f),CH1,'a failed migration write keeps the derived progress in memory');assert.equal(f.persistent,false);assert.equal(failing.data.has(PROGRESS_KEY),false);
});

test('Continue never enters the unreleased Chapter 3, and Chapter Select agrees with Continue on what is playable',()=>{
 const saves=[[],CH1.slice(0,3),CH1,[...CH1,...CH2.slice(0,4)],[...CH1,...CH2],[...CH1,...CH2,'campaign-21','campaign-22'],Array.from({length:30},(_,i)=>levelId(i+1))];
 for(const ids of saves){
  const st=open(storage({[PROGRESS_KEY]:v2(ids)})),p=st.progress,views=chapterViews(campaignChapters,campaign.list(),p);
  assert.notEqual(p.next?.id&&campaign.get(p.next.id).chapter,3,'Continue target');
  for(const id of ['campaign-21','campaign-22']){assert.equal(st.isUnlocked(campaign.get(id)),false);assert.equal(st.isCompleted(campaign.get(id)),false);}
  assert.equal(views[2].state,'coming-soon');assert.ok(views[2].missions.every(m=>m.state==='pending'));
  const playable=views.flatMap(v=>v.missions.filter(m=>m.state==='available'||m.state==='completed').map(m=>m.slot.levelId));
  assert.deepEqual(playable,p.sequence.filter(l=>st.isUnlocked(l)).map(l=>l.id),'Chapter Select shows exactly the missions Continue can reach');
  if(p.next)assert.ok(views.some(v=>v.missions.some(m=>m.slot.levelId===p.next.id&&m.state==='available')),'the Continue target is an available card');
 }
 const done=open(storage({[PROGRESS_KEY]:v2([...CH1,...CH2])}));
 assert.equal(done.progress.next,null,'a cleared Chapter 2 is up to date and does not unlock Chapter 3');
 assert.equal(done.recordVictory(campaign.get('campaign-21')).recorded,false);assert.equal(done.recordVictory(campaign.get('campaign-16')).upToDate,true);
});

test('dev debug launch still reaches Chapter 3 Missions 1 to 3 (and every registered mission); production does not',()=>{
 const resolve=(q,dev=true)=>debugLevelFromSearch(q,dev,campaignChapters,id=>campaign.has(id));
 assert.equal(resolve('?debug=1&chapter=3&mission=1'),'campaign-21');assert.equal(resolve('?debug=1&chapter=3&mission=2'),'campaign-22');assert.equal(resolve('?debug=1&level=22'),'campaign-22');
 assert.equal(resolve('?debug=1&chapter=3&mission=3'),'campaign-23');assert.equal(resolve('?debug=1&chapter=3&mission=4'),null,'Mission 4 is not implemented');assert.equal(resolve('?debug=1&chapter=3&mission=1',false),null);
 for(const c of [1,2])for(let m=1;m<=6;m++)assert.equal(resolve(`?debug=1&chapter=${c}&mission=${m}`),levelId((c-1)*10+m));
});

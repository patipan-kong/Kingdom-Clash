const {test}=require('node:test'),assert=require('node:assert/strict');
const {unlockOverrideFromSearch}=require('../.test-build/data/debugLaunch.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {campaignSelection}=require('../.test-build/data/campaignSelection.js');
const {campaignDestination,nextPlayableMission}=require('../.test-build/data/campaignNavigation.js');
const {PROGRESS_KEY}=require('../.test-build/data/campaignProgress.js');
// Dev/Preview-only ?unlock=all (main.ts): every chapter and mission becomes selectable for the page session. The real progress, its saves and its Continue never change.
const memory=(raw=null)=>{const s={raw,writes:0};s.storage=()=>({getItem:()=>s.raw,setItem:(_k,v)=>{s.raw=v;s.writes++;}});return s;};
const store=(raw,unlockAll)=>{const m=memory(raw),p=new ProgressStore(m.storage);p.unlockAll=unlockAll;p.refresh();return {m,p};};
const views=p=>chapterViews(campaignChapters,campaign.list(),p.progress);
const states=v=>Object.fromEntries(v.map(c=>[c.chapter.id,c.state]));

test('only ?unlock=all in a dev or Preview build turns the override on',()=>{
 assert.equal(unlockOverrideFromSearch('?unlock=all',true),true);assert.equal(unlockOverrideFromSearch('?debug=1&unlock=all',true),true);
 assert.equal(unlockOverrideFromSearch('?unlock=all',false),false,'a Production build ignores it');
 for(const q of ['','?unlock=1','?unlock=ALL','?unlock=true','?unlockall','?unlock=','?unlock=all1'])assert.equal(unlockOverrideFromSearch(q,true),false,q);
});
test('normal mode on a fresh save: only Chapter 1 is open, Chapter 4 waits behind Chapter 3',()=>{
 const {p}=store(null,false),v=views(p);
 assert.deepEqual(states(v),{'first-war':'available','burning-frontier':'locked','frozen-crown':'locked','conquered-lands':'locked'});
 assert.equal(p.isUnlocked(campaign.get('campaign-02')),false);assert.equal(p.isUnlocked(campaign.get('campaign-31')),false);assert.equal(campaignSelection(campaignChapters,campaign.list(),p.progress,'conquered-lands'),null);
 assert.equal(p.progress.unlockAll,undefined);
});
test('with the override every chapter, Chapter 4 included, and all 24 registered missions are selectable',()=>{
 const {p}=store(null,true),v=views(p);
 assert.deepEqual(states(v),{'first-war':'available','burning-frontier':'available','frozen-crown':'available','conquered-lands':'available'});
 for(const c of v)for(const m of c.missions)assert.equal(m.state,'available',m.slot.levelId);
 const c4=campaignSelection(campaignChapters,campaign.list(),p.progress,'conquered-lands');
 assert.deepEqual(c4.missions.map(m=>[m.id,m.selectable]),[31,32,33,34,35,36].map(n=>[`campaign-${n}`,true]));
 for(const l of campaign.list())assert.equal(p.isUnlocked(l),true,l.id);
});
test('the override leaves the real progress alone: same sequence, Continue target and stored save',()=>{
 const raw=JSON.stringify({version:1,levels:{'campaign-01':{clears:1},'campaign-02':{clears:2}}});
 const off=store(raw,false).p,{m,p}=store(raw,true);
 assert.deepEqual(p.progress.sequence.map(l=>l.id),off.progress.sequence.map(l=>l.id));assert.equal(p.progress.next.id,'campaign-03');assert.equal(p.progress.next.id,off.progress.next.id);
 assert.equal(p.progress.isUnlocked(campaign.get('campaign-04')),false,'the real progress still says locked');assert.equal(p.progress.isUnlocked(campaign.get('campaign-03')),true);
 assert.equal(m.writes,0);assert.equal(m.raw,raw);
 const c1=views(p).find(c=>c.chapter.id==='first-war');assert.deepEqual(c1.missions.map(x=>x.state),['completed','completed','available','available','available','available']);
});
test('a Victory on a mission opened only by the override is refused and writes nothing; a really unlocked one records as before',()=>{
 const {m,p}=store(null,true);
 for(const id of ['campaign-36','campaign-21','campaign-02'])assert.deepEqual(p.recordVictory(campaign.get(id)),{recorded:false,firstClear:false,next:null,upToDate:false},id);
 assert.equal(m.writes,0);assert.equal(m.raw,null);
 const r=p.recordVictory(campaign.get('campaign-01'));assert.equal(r.recorded,true);assert.equal(r.next.id,'campaign-02');
 assert.deepEqual(JSON.parse(m.raw),{version:1,levels:{'campaign-01':{clears:1}}});
 const reread=store(m.raw,false).p;assert.equal(reread.progress.next.id,'campaign-02','a normal session afterwards sees exactly one clear');
 assert.equal(reread.isUnlocked(campaign.get('campaign-31')),false);assert.equal(states(views(reread))['conquered-lands'],'locked');
});
test('navigation follows the override inside Chapter 4 and returns to the selected mission',()=>{
 const {p}=store(null,true);
 assert.equal(nextPlayableMission(campaign.list(),p.progress,'campaign-31').id,'campaign-32');assert.equal(nextPlayableMission(campaign.list(),p.progress,'campaign-35').id,'campaign-36');
 assert.equal(nextPlayableMission(campaign.list(),p.progress,'campaign-36'),null,'the finale has no next mission');
 assert.deepEqual(campaignDestination(campaign.list(),p.progress,'campaign-36'),{scene:'CampaignSelect',data:{chapterId:'conquered-lands',selectedLevelId:'campaign-36'}});
 const off=store(null,false).p;assert.equal(nextPlayableMission(campaign.list(),off.progress,'campaign-31'),null);
 assert.deepEqual(campaignDestination(campaign.list(),off.progress,'campaign-36'),{scene:'CampaignSelect',data:{chapterId:'first-war'}});
});
test('the override is never written: progress keys stay as they were after a session with it',()=>{
 const {m,p}=store(null,true);views(p);campaignSelection(campaignChapters,campaign.list(),p.progress,'conquered-lands');p.refresh();
 assert.equal(m.writes,0);assert.equal(PROGRESS_KEY,'kingdom-clash.campaign.v2');
});

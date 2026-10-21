const test=require('node:test');
const assert=require('node:assert/strict');
const {campaignDestination}=require('../.test-build/data/campaignNavigation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {campaignSelection}=require('../.test-build/data/campaignSelection.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const levels=campaign.list(),grid=id=>({scene:'CampaignSelect',data:{chapterId:'first-war',...(id?{selectedLevelId:id}:{})}});
function store(){let raw=null,writes=0;const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;writes++;}}));s.refresh();return{s,writes:()=>writes};}
test('direct Continue and normal entry resolve mission identity without prior scene state',()=>{
 const {s,writes}=store();assert.deepEqual(campaignDestination(levels,s.progress,'campaign-01'),grid('campaign-01'));
 assert.deepEqual(campaignDestination(levels,s.progress,'campaign-01',{scene:'CampaignSelect',data:{chapterId:'burning-frontier'}}),grid('campaign-01'));
 assert.equal(writes(),0);
});
test('victory return preserves replay selection and refreshes the independent next recommendation',()=>{
 const {s,writes}=store(),route=campaignDestination(levels,s.progress,'campaign-01');
 s.recordVictory(campaign.get('campaign-01'));s.refresh();
 const view=campaignSelection(campaignChapters,levels,s.progress,route.data.chapterId,route.data.selectedLevelId);
 assert.equal(view.selectedId,'campaign-01');assert.equal(view.missions[0].state,'completed');assert.equal(view.missions[1].recommended,true);
 assert.equal(writes(),1);assert.deepEqual(campaignDestination(levels,s.progress,s.progress.next.id),grid('campaign-02'));
});
test('defeat, retries and repeated navigation neither advance progress nor write saves',()=>{
 const {s,writes}=store();for(let i=0;i<20;i++){s.refresh();assert.deepEqual(campaignDestination(levels,s.progress,'campaign-01'),grid('campaign-01'));}
 assert.equal(s.progress.completed.length,0);assert.equal(writes(),0);
});
test('legacy Full Battle preserves a valid source, defaults to chapters and never completes story',()=>{
 const {s,writes}=store();
 assert.deepEqual(campaignDestination(levels,s.progress,'full-battle'),{scene:'ChapterSelect'});
 assert.deepEqual(campaignDestination(levels,s.progress,'full-battle',grid('campaign-01')),grid('campaign-01'));
 assert.deepEqual(campaignDestination(levels,s.progress,'full-battle',grid('campaign-05')),grid());
 assert.deepEqual(campaignDestination(levels,s.progress,'full-battle',{scene:'CampaignSelect',data:{chapterId:'burning-frontier'}}),{scene:'ChapterSelect'});
 assert.equal(s.recordVictory(campaign.get('full-battle')).recorded,false);assert.equal(writes(),0);
});
test('unknown, missing, locked and pending IDs have safe unselected fallback routes',()=>{
 const {s,writes}=store();for(const id of [undefined,'unknown','campaign-05','campaign-10'])assert.deepEqual(campaignDestination(levels,s.progress,id),grid());
 assert.equal(writes(),0);
});

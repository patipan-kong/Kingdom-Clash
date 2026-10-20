const test=require('node:test');
const assert=require('node:assert/strict');
const {campaignSelection}=require('../.test-build/data/campaignSelection.js');
const {campaignLayout,campaignCardVisible,campaignScroll}=require('../.test-build/ui/campaignLayout.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {progressOf}=require('../.test-build/data/campaignProgress.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {levelId}=require('../.test-build/data/campaign.js');
const save=n=>({version:1,levels:Object.fromEntries(Array.from({length:n},(_,i)=>[levelId(i+1),{clears:1}]))});
const view=(n=0,preferred,levels=campaign.list())=>campaignSelection(campaignChapters,levels,progressOf(levels,save(n)),'first-war',preferred);

test('fresh grid has ten truthful slots, a single recommendation and no Full Battle slot',()=>{
 const v=view();assert.equal(v.missions.length,10);assert.equal(v.selectedId,'campaign-01');
 assert.deepEqual(v.missions.filter(m=>m.recommended).map(m=>m.id),['campaign-01']);
 assert.equal(v.missions[0].title,campaign.get('campaign-01').display.title);
 assert.equal(v.missions[1].state,'locked');assert.equal(v.missions[1].selectable,false);
 assert.equal(v.missions.some(m=>m.id==='campaign-20'),false);
 for(const m of v.missions.slice(5)){assert.equal(m.state,'pending');assert.equal(m.selectable,false);}
 assert.equal(v.missions[9].finale,true);assert.equal(v.missions[9].title,'Chapter finale');
});
test('partial progress, replay preference and rejected locked/pending selection use existing authority',()=>{
 const v=view(2);assert.equal(v.selectedId,'campaign-03');assert.equal(v.missions[0].state,'completed');
 assert.equal(v.missions[0].selectable,true);assert.equal(v.missions[2].recommended,true);
 assert.equal(view(2,'campaign-01').selectedId,'campaign-01');
 for(const id of ['campaign-04','campaign-10','campaign-20','unknown'])assert.equal(view(2,id).selectedId,'campaign-03');
});
test('all released complete selects a replay and never recommends pending content',()=>{
 const v=view(5);assert.equal(v.selectedId,'campaign-05');assert.equal(v.chapter.complete,false);
 assert.equal(v.missions.filter(m=>m.recommended).length,0);assert.equal(v.missions.filter(m=>m.selectable).length,5);
});
test('future registration compatibility uses display references only, never creates playable definitions',()=>{
 // Pure view fixtures have no match, mission, balance or setup fields and never enter CampaignRegistry.
 const later=[...campaign.list(),...Array.from({length:5},(_,i)=>({id:levelId(i+6),number:i+6,display:{title:`Registered display ${i+6}`,description:'Registered content description'}}))];
 const v=view(8,undefined,later);assert.equal(v.selectedId,'campaign-09');assert.equal(v.missions[8].recommended,true);
 assert.equal(v.missions[9].state,'locked');assert.equal(v.missions[9].title,'Registered display 10');
 assert.equal(view(10,undefined,later).chapter.complete,true);
 const gap=later.filter(l=>l.number!==9),g=view(8,undefined,gap);assert.equal(g.missions[8].state,'pending');assert.equal(g.missions[9].selectable,false);
});
test('unknown and Coming Soon chapters cannot open, and view derivation never writes a save',()=>{
 const levels=campaign.list(),progress=progressOf(levels,save(0));
 for(const id of ['unknown','burning-frontier','frozen-crown'])assert.equal(campaignSelection(campaignChapters,levels,progress,id),null);
 const raw=JSON.stringify(save(2));let writes=0;const store=new ProgressStore(()=>({getItem:()=>raw,setItem:()=>writes++}));store.refresh();
 const before=JSON.stringify(campaignChapters);campaignSelection(campaignChapters,levels,store.progress,'first-war');
 assert.equal(writes,0);assert.equal(JSON.stringify(campaignChapters),before);
});
test('desktop grid shows all ten slots in five columns and two nonoverlapping rows',()=>{
 const l=campaignLayout(1);assert.equal(l.columns,5);assert.equal(l.minScroll,0);
 for(const r of l.slots){assert.ok(campaignCardVisible(r,0,l.clip));assert.ok(r.x>=0&&r.x+r.width<=960);}
 assert.equal(new Set(l.slots.map(r=>r.y)).size,2);
 l.slots.forEach((a,i)=>l.slots.slice(i+1).forEach(b=>assert.ok(a.x+a.width<=b.x+.01||b.x+b.width<=a.x+.01||a.y+a.height<=b.y||b.y+b.height<=a.y)));
 assert.ok(l.clip.bottom<l.detail.y);assert.ok(l.detail.y+l.detail.height<480);
});
test('small landscape scroll reaches every slot and rejects partially clipped hit targets',()=>{
 const l=campaignLayout(390/540);assert.equal(l.columns,3);assert.ok(l.minScroll<0);
 for(const r of l.slots){const scroll=campaignScroll(l.clip.top-r.y,l.minScroll);assert.ok(campaignCardVisible(r,scroll,l.clip));}
 assert.equal(campaignCardVisible(l.slots[0],-1,l.clip),false);
 assert.equal(campaignCardVisible(l.slots[3],0,l.clip),false);
 assert.equal(campaignScroll(100,l.minScroll),0);assert.equal(campaignScroll(-10000,l.minScroll),l.minScroll);
});

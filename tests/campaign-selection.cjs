const test=require('node:test');
const assert=require('node:assert/strict');
const {campaignSelection}=require('../.test-build/data/campaignSelection.js');
const {campaignLayout,campaignCardVisible,campaignScroll}=require('../.test-build/ui/campaignLayout.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {progressOf}=require('../.test-build/data/campaignProgress.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {levelId}=require('../.test-build/data/campaign.js');
// Six-mission chapters: Chapter 1 is campaign-01 to campaign-06, so save(n) clears its first n missions.
const save=n=>({version:1,levels:Object.fromEntries(Array.from({length:n},(_,i)=>[levelId(i+1),{clears:1}]))});
const view=(n=0,preferred,levels=campaign.list())=>campaignSelection(campaignChapters,levels,progressOf(campaignChapters,levels,save(n)),'first-war',preferred);

test('fresh grid has six truthful slots, a single recommendation and no Full Battle slot',()=>{
 const v=view();assert.equal(v.missions.length,6);assert.equal(v.selectedId,'campaign-01');
 assert.deepEqual(v.missions.filter(m=>m.recommended).map(m=>m.id),['campaign-01']);
 assert.equal(v.missions[0].title,campaign.get('campaign-01').display.title);
 assert.equal(v.missions[1].state,'locked');assert.equal(v.missions[1].selectable,false);
 assert.equal(v.missions.some(m=>m.id==='full-battle'),false);
 for(const m of v.missions.slice(1)){assert.equal(m.state,'locked');assert.equal(m.selectable,false);}
 assert.deepEqual(v.missions.map(m=>m.finale),[false,false,false,false,false,true],'Mission 6 is the finale');
 assert.equal(v.missions[5].title,campaign.get('campaign-06').display.title);
});
test('partial progress, replay preference and rejected locked/pending selection use existing authority',()=>{
 const v=view(2);assert.equal(v.selectedId,'campaign-03');assert.equal(v.missions[0].state,'completed');
 assert.equal(v.missions[0].selectable,true);assert.equal(v.missions[2].recommended,true);
 assert.equal(view(2,'campaign-01').selectedId,'campaign-01');
 for(const id of ['campaign-04','campaign-06','campaign-11','unknown'])assert.equal(view(2,id).selectedId,'campaign-03');
 assert.equal(v.missions[3].status,'LOCKED · CLEAR 03');
});
test('all released complete selects a replay and never recommends pending content',()=>{
 const v=view(6);assert.equal(v.selectedId,'campaign-06');assert.equal(v.chapter.complete,true);
 assert.equal(v.missions.filter(m=>m.recommended).length,0);assert.equal(v.missions.filter(m=>m.selectable).length,6);
});
test('future registration compatibility uses display references only, never creates playable definitions',()=>{
 // Pure view fixtures have no match, mission, balance or setup fields and never enter CampaignRegistry.
 const later=campaign.list().map(({id,number,display})=>({id,number,display:{title:display.title,description:display.description}}));
 const v=view(4,undefined,later);assert.equal(v.selectedId,'campaign-05');assert.equal(v.missions[4].recommended,true);
 assert.equal(v.missions[5].state,'locked');assert.equal(v.missions[5].title,campaign.get('campaign-06').display.title);
 assert.equal(view(6,undefined,later).chapter.complete,true);
 const gap=later.filter(l=>l.number!==5),g=view(4,undefined,gap);assert.equal(g.missions[4].state,'pending');assert.equal(g.missions[5].selectable,false);
});
test('unknown and Coming Soon chapters cannot open, and view derivation never writes a save',()=>{
 const levels=campaign.list(),progress=progressOf(campaignChapters,levels,save(0));
 for(const id of ['unknown','burning-frontier','frozen-crown'])assert.equal(campaignSelection(campaignChapters,levels,progress,id),null);
 const raw=JSON.stringify(save(2));let writes=0;const store=new ProgressStore(()=>({getItem:()=>raw,setItem:()=>writes++}));store.refresh();
 const before=JSON.stringify(campaignChapters);campaignSelection(campaignChapters,levels,store.progress,'first-war');
 assert.equal(writes,0);assert.equal(JSON.stringify(campaignChapters),before);
});
const grid=l=>{
 assert.equal(l.slots.length,6);assert.equal(l.columns,3);assert.equal(l.minScroll,0,'no scrolling');
 for(const r of l.slots){assert.ok(campaignCardVisible(r,0,l.clip),'every card fully visible at rest');assert.ok(r.x>=0&&r.x+r.width<=960);}
 assert.equal(new Set(l.slots.map(r=>r.y)).size,2,'two rows');
 l.slots.forEach((a,i)=>l.slots.slice(i+1).forEach(b=>assert.ok(a.x+a.width<=b.x+.01||b.x+b.width<=a.x+.01||a.y+a.height<=b.y||b.y+b.height<=a.y)));
 assert.ok(l.clip.bottom<=l.detail.y);assert.ok(l.detail.y+l.detail.height<480);
};
test('desktop grid shows all six slots in three columns and two nonoverlapping rows, without scrolling',()=>{
 const l=campaignLayout(1);grid(l);assert.equal(l.slots[0].height,110);
});
test('mobile landscape shows all six slots in three columns and two rows of 96 px cards, without scrolling',()=>{
 for(const k of [390/540,320/540,.85]){const l=campaignLayout(k);assert.equal(l.mobile,true);grid(l);assert.equal(l.slots[0].height,96);}
 const l=campaignLayout(390/540);assert.equal(l.slots[5].y+l.slots[5].height,l.clip.bottom,'the second row ends exactly at the clip');
});
test('a longer chapter still scrolls on a phone and rejects partially clipped hit targets',()=>{
 const l=campaignLayout(390/540,10);assert.equal(l.columns,3);assert.ok(l.minScroll<0);
 for(const r of l.slots){const scroll=campaignScroll(l.clip.top-r.y,l.minScroll);assert.ok(campaignCardVisible(r,scroll,l.clip));}
 assert.equal(campaignCardVisible(l.slots[0],-1,l.clip),false);
 assert.equal(campaignCardVisible(l.slots[3],0,l.clip),false);
 assert.equal(campaignScroll(100,l.minScroll),0);assert.equal(campaignScroll(-10000,l.minScroll),l.minScroll);
});

test('explicit partial registry retains truthful pending slots without duplicate or fake missions',()=>{
 const partial=campaign.list().filter(l=>l.number<=3||l.id==='full-battle'),v=view(3,undefined,partial);
 assert.equal(v.chapter.released,3);assert.equal(v.chapter.complete,false);assert.equal(v.selectedId,'campaign-03');
 assert.equal(v.missions.filter(m=>m.recommended).length,0);
 for(const m of v.missions.slice(3)){assert.equal(m.state,'pending');assert.equal(m.selectable,false);}
 assert.equal(v.missions[5].title,'Chapter finale');assert.equal(v.missions[5].finale,true);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const {nextPlayableMission}=require('../.test-build/data/campaignNavigation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const levels=campaign.list();
const store=ids=>{const raw=JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))});const s=new ProgressStore(()=>({getItem:()=>raw,setItem:()=>{}}));s.refresh();return s;};
const next=(s,id)=>nextPlayableMission(levels,s.progress,id)?.id??null;
const ch1=['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05','campaign-06'];

test('Next Mission follows the cleared mission within Chapter 1, Mission 1 through Mission 6',()=>{
 for(let i=0;i<5;i++)assert.equal(next(store(ch1.slice(0,i+1)),ch1[i]),ch1[i+1]);
});
test('a mission whose successor is still locked offers no Next Mission',()=>{
 assert.equal(next(store([]),'campaign-01'),null,'nothing recorded: Mission 2 is locked');
 assert.equal(next(store(ch1.slice(0,2)),'campaign-04'),null,'an unlocked-looking id cannot skip ahead');
});
test('the last mission of Chapter 1 never leads into Chapter 2 or any later chapter',()=>{
 assert.equal(next(store(ch1),'campaign-06'),null);
 assert.equal(next(store(['campaign-21','campaign-22']),'campaign-22'),null,'no Chapter 3 hop either');
});
test('unknown and special-mode ids offer nothing',()=>{
 assert.equal(next(store(ch1),'nope'),null);
});

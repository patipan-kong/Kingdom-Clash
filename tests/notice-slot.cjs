const {test}=require('node:test'),assert=require('node:assert/strict');
const {NoticeSlot}=require('../.test-build/ui/noticeSlot.js');
test('Defense preempts ordinary notices; rejected ordinary traffic is never queued',()=>{const p=new NoticeSlot();assert.equal(p.offer('wave',0,1,2500),true);assert.equal(p.offer('defense',1,2,2500),true);assert.equal(p.offer('construction',2,1,2500),false);assert.equal(p.offer('inspection',3,1,2500),false);assert.equal(p.active(2502),false);});
test('Direct rejection/cancellation beats confirmation and optional guidance',()=>{const p=new NoticeSlot();p.offer('rejected',0,2,2500);assert.equal(p.offer('guide',1,0,6500),false);assert.equal(p.offer('cast',2,1,2500),false);assert.equal(p.offer('cancelled',3,2,2500),true);});
test('Identical notices cannot extend expiry, including repeated rejection traffic',()=>{const p=new NoticeSlot();p.offer('rejected',0,2,2500);for(const now of [100,2000,2499,2500,3000,3499])assert.equal(p.offer('rejected',now,2,2500),false);assert.equal(p.active(2500),false);assert.equal(p.offer('rejected',3500,2,2500),true);});
test('Distinct notices work after expiry without replaying stale feedback',()=>{const p=new NoticeSlot();p.offer('defense',0,2,2500);p.offer('stale wave',1,1,2500);assert.equal(p.offer('current inspection',2500,1,2500),true);});
test('Lifecycle reset clears current and repeat memory for fresh input after Pause',()=>{const p=new NoticeSlot();p.offer('rejected',0,2,2500);p.reset();assert.equal(p.active(1),false);assert.equal(p.offer('rejected',1,2,2500),true);});
test('HP updates use notice identity without extending expiry or replay quiet interval',()=>{
 const p=new NoticeSlot();assert.equal(p.offer('Azure Keep under attack\n2800 HP',0,2,2500,'azure-defense'),true);
 assert.equal(p.update('azure-defense','Azure Keep under attack\n2700 HP',1000),true);assert.equal(p.active(2499),true);assert.equal(p.active(2500),false);
 assert.equal(p.update('azure-defense','2600 HP',2500),false);assert.equal(p.offer('different HP',2500,2,2500,'azure-defense'),false);
 assert.equal(p.clearIdentity('azure-defense'),true);assert.equal(p.isCurrent('azure-defense'),false);
});
test('defense identity cleanup cannot remove a replacing notice or queue rejected low-priority traffic',()=>{
 const p=new NoticeSlot();p.offer('defense',0,2,2500,'azure-defense');assert.equal(p.offer('wave',1,1,2500),false);
 assert.equal(p.offer('other important',2,2,2500),true);assert.equal(p.clearIdentity('azure-defense'),false);assert.equal(p.update('azure-defense','new HP',3),false);assert.equal(p.active(4),true);
});

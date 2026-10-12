const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DamageFeedback}=require('../.test-build/ui/damageFeedback.js');
function fixture(){
 const units={guardian:{id:'guardian',kind:'guardian',team:'blue',hp:1200},red:{id:'red',kind:'tower',team:'red',hp:650},blue:{id:'blue',kind:'tower',team:'blue',hp:650},minion:{id:'minion',kind:'minion-red',team:'red',hp:240},ally:{id:'ally',kind:'minion-blue',team:'blue',hp:240}};
 const policy=new DamageFeedback(),lookup=id=>units[id];return {units,policy,lookup,observe:(e,t=0)=>policy.observe(e,t,lookup)};
}
test('Only hostile tower attacks actually targeting Guardian create attribution',()=>{
 const f=fixture();for(const e of [{type:'attack',id:'red',targetId:'ally'},{type:'attack',id:'blue',targetId:'minion'},{type:'attack',id:'minion',targetId:'guardian'}]){assert.equal(f.observe(e).notice,false);assert.equal(f.policy.traces.length,0);}
 assert.equal(f.observe({type:'attack',id:'red',targetId:'guardian'}).notice,true);assert.equal(f.policy.traces[0].sourceId,'red');
});
test('Positive enemy or unattributed damage accents; absorption and friendly hits do not',()=>{
 const f=fixture();for(const [sourceId,amount] of [['red',0],['blue',10]])assert.equal(f.observe({type:'damage',id:'guardian',sourceId,amount}).impact,false);
 assert.equal(f.observe({type:'damage',id:'guardian',sourceId:'minion',amount:1}).impact,true);
 assert.equal(f.observe({type:'damage',id:'guardian',sourceId:'gone',amount:1},200).impact,true);assert.equal(f.policy.traces.length,0);
});
test('Hit accents coalesce for 150ms without extending a pulse on every hit',()=>{
 const f=fixture(),event={type:'damage',id:'guardian',sourceId:'red',amount:10};f.observe(event);assert.equal(f.observe(event,149).impact,false);assert.equal(f.policy.impactUntil,220);assert.equal(f.observe(event,150).impact,true);
});
test('Multiple towers share one episode, at most two traces and five-second notice throttle',()=>{
 const f=fixture();for(let i=0;i<4;i++)f.units['red'+i]={...f.units.red,id:'red'+i};
 for(let i=0;i<4;i++)assert.equal(f.observe({type:'attack',id:'red'+i,targetId:'guardian'},i*10).notice,i===0);
 assert.equal(f.policy.traces.length,2);
 assert.equal(f.observe({type:'attack',id:'red',targetId:'guardian'},3040).notice,false);
 assert.equal(f.observe({type:'attack',id:'red',targetId:'guardian'},5000).notice,false);
 assert.equal(f.observe({type:'attack',id:'red',targetId:'guardian'},8000).notice,true);
});
test('Traces expire at 200ms and clear when either participant disappears or dies',()=>{
 for(const condition of ['time','source','target','death']){const f=fixture();f.observe({type:'attack',id:'red',targetId:'guardian'});if(condition==='source')delete f.units.red;if(condition==='target')delete f.units.guardian;if(condition==='death')f.units.red.hp=0;f.policy.expire(condition==='time'?200:10,f.lookup);assert.equal(f.policy.traces.length,0);}
});
test('Missing attack source never guesses a tower; dead Guardian gets no stale feedback',()=>{
 const f=fixture();assert.equal(f.observe({type:'attack',id:'gone',targetId:'guardian'}).notice,false);f.units.guardian.hp=0;assert.equal(f.observe({type:'damage',id:'guardian',sourceId:'red',amount:10}).impact,false);
});
test('Lifecycle reset removes effects and allows fresh match episode',()=>{
 const f=fixture();f.observe({type:'attack',id:'red',targetId:'guardian'});f.observe({type:'damage',id:'guardian',sourceId:'red',amount:10});f.policy.clear();assert.equal(f.policy.traces.length,0);assert.equal(f.policy.impactUntil,0);assert.equal(f.observe({type:'attack',id:'red',targetId:'guardian'}).notice,true);
});
test('Transient lifecycle cleanup preserves episode throttles across quick Pause/resume',()=>{
 const f=fixture(),event={type:'attack',id:'red',targetId:'guardian'};assert.equal(f.observe(event).notice,true);f.policy.clear(false);assert.equal(f.policy.traces.length,0);assert.equal(f.observe(event,100).notice,false);assert.equal(f.observe(event,3200).notice,false);assert.equal(f.observe(event,6300).notice,true);
});

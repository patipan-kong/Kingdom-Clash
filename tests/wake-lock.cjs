const test=require('node:test');
const assert=require('node:assert/strict');
const {ScreenWakeLock,WAKE_RETRY_LIMIT}=require('../.test-build/ui/wakeLock.js');

// A fake navigator.wakeLock + document: requests resolve or reject when the test says so, the page can be hidden and shown.
function fakeEnv({supported=true,refuse=false,throws=false}={}){
 const listeners=new Set(),requests=[],sentinels=[];
 const doc={visibilityState:'visible',addEventListener:(t,f)=>{if(t==='visibilitychange')listeners.add(f);},removeEventListener:(t,f)=>{if(t==='visibilitychange')listeners.delete(f);}};
 const sentinel=()=>{const s={released:false,handlers:[],releaseCalls:0,addEventListener(t,f){if(t==='release')this.handlers.push(f);},release(){this.releaseCalls++;if(!this.released){this.released=true;this.handlers.forEach(f=>f());}return Promise.resolve();}};sentinels.push(s);return s;};
 const env={doc,wakeLock:supported?{request(type){
  assert.equal(type,'screen');if(throws)throw new Error('SecurityError');
  return new Promise((resolve,reject)=>requests.push({resolve:()=>resolve(sentinel()),reject:()=>reject(Object.assign(new Error('NotAllowedError'),{name:'NotAllowedError'}))}));
 }}:undefined};
 const settle=()=>new Promise(r=>setImmediate(r));
 const grant=async()=>{requests.shift().resolve();await settle();};
 const refuseNext=async()=>{requests.shift().reject();await settle();};
 const setVisible=v=>{doc.visibilityState=v?'visible':'hidden';listeners.forEach(f=>f());};
 // The browser releases a held lock itself when the page is hidden.
 const hide=()=>{sentinels.filter(s=>!s.released).forEach(s=>{s.released=true;s.handlers.forEach(f=>f());});setVisible(false);};
 return {env,requests,sentinels,listeners,grant,refuseNext,setVisible,hide,settle,refuse,throws};
}
const live=f=>f.sentinels.filter(s=>!s.released).length;

test('hold requests one screen lock; repeated holds while requesting or held make no duplicate request',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);
 w.hold();w.hold();assert.equal(f.requests.length,1);assert.equal(w.state,'requesting');
 await f.grant();assert.equal(w.state,'held');w.hold();w.retry();assert.equal(f.requests.length,0,'no second request while held');assert.equal(w.stats.requests,1);
});
test('letGo releases the held lock and stops listening for visibility',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);
 w.hold();await f.grant();assert.equal(f.listeners.size,1);
 w.letGo();assert.equal(live(f),0);assert.equal(f.sentinels[0].releaseCalls,1);assert.equal(f.listeners.size,0);assert.equal(w.state,'idle');
 w.letGo();assert.equal(f.sentinels[0].releaseCalls,1,'a second letGo releases nothing more');
});
test('letting go while the request is in flight releases the lock the moment it arrives (no leak)',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);
 w.hold();w.letGo();await f.grant();assert.equal(live(f),0);assert.equal(w.state,'idle');
});
test('hold, letGo, hold while one request is in flight keeps exactly one lock',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);
 w.hold();w.letGo();w.hold();assert.equal(f.requests.length,1,'the in-flight request is reused');
 await f.grant();assert.equal(live(f),1);assert.equal(w.state,'held');
});
test('hidden page: the lock is lost and not requested while hidden; visible again and still wanted: requested again',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);
 w.hold();await f.grant();f.hide();assert.equal(w.state,'idle');assert.equal(f.requests.length,0,'never requested while hidden');
 f.setVisible(true);assert.equal(f.requests.length,1);await f.grant();assert.equal(w.state,'held');assert.equal(live(f),1);
});
test('visible again after letting go (paused, ended, left) requests nothing',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);
 w.hold();await f.grant();f.hide();w.letGo();f.setVisible(true);assert.equal(f.requests.length,0);assert.equal(live(f),0);
});
test('hold while hidden waits for the page to be visible',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);f.setVisible(false);
 w.hold();assert.equal(f.requests.length,0);f.setVisible(true);assert.equal(f.requests.length,1);
});
test('unsupported browser: every call is a harmless no-op',()=>{
 const f=fakeEnv({supported:false}),w=new ScreenWakeLock(f.env);
 assert.equal(w.supported,false);assert.equal(w.state,'unsupported');
 assert.doesNotThrow(()=>{w.hold();w.retry();f.setVisible(false);f.setVisible(true);w.letGo();});
 const none=new ScreenWakeLock(null);assert.doesNotThrow(()=>{none.hold();none.retry();none.letGo();});assert.equal(none.state,'unsupported');
});
test('refused request: no unhandled rejection, no automatic retry loop; a user tap retries up to the limit',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);let unhandled=0;const on=()=>unhandled++;process.on('unhandledRejection',on);
 try{
  w.hold();await f.refuseNext();assert.equal(w.state,'failed');
  f.setVisible(false);f.setVisible(true);assert.equal(f.requests.length,0,'visibility alone does not hammer a refused request');
  for(let i=0;i<WAKE_RETRY_LIMIT;i++){w.retry();assert.equal(f.requests.length,1,`retry ${i+1} asks once`);await f.refuseNext();}
  w.retry();assert.equal(f.requests.length,0,'stops after the retry limit');
  w.letGo();w.hold();assert.equal(f.requests.length,1,'a new hold (next battle, resume) starts afresh');await f.grant();assert.equal(w.state,'held');
  await f.settle();assert.equal(unhandled,0);
 }finally{process.off('unhandledRejection',on);}
});
test('a request that throws synchronously is treated as refused',async()=>{
 const f=fakeEnv({throws:true}),w=new ScreenWakeLock(f.env);let unhandled=0;const on=()=>unhandled++;process.on('unhandledRejection',on);
 try{assert.doesNotThrow(()=>w.hold());await f.settle();assert.equal(w.state,'failed');assert.equal(w.stats.refused,1);await f.settle();assert.equal(unhandled,0);}
 finally{process.off('unhandledRejection',on);}
});
test('a lock the system drops while visible is asked for again on the next tap, not in a loop',async()=>{
 const f=fakeEnv(),w=new ScreenWakeLock(f.env);
 w.hold();await f.grant();f.sentinels[0].release();assert.equal(w.state,'idle');assert.equal(f.requests.length,0,'no request straight from the release event');
 w.retry();assert.equal(f.requests.length,1);await f.grant();assert.equal(w.state,'held');
});
test('the module-level controller is inert under node (no document)',()=>{
 const {screenWakeLock}=require('../.test-build/ui/wakeLock.js');
 assert.equal(screenWakeLock.state,'unsupported');assert.doesNotThrow(()=>{screenWakeLock.hold();screenWakeLock.letGo();});
});

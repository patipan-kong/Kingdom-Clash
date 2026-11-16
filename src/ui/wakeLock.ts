// Screen Wake Lock for active battles. With Auto Attack on, a player can go a long time without touching the screen and Android dims it;
// a held 'screen' lock stops that. Browser-only and best effort: an unsupported browser, a refused request or a lost lock never throws
// and never changes gameplay.
//
// The owner says what it wants (hold / let go); this class works out the requests. At most one request is in flight and at most one lock
// is held. The browser drops the lock when the page is hidden; it is asked for again when the page is visible and still wanted.

/** The parts of WakeLockSentinel this uses. */
export interface WakeSentinel{readonly released:boolean;release():Promise<void>;addEventListener(type:'release',listener:()=>void):void}
/** The parts of navigator.wakeLock and document this uses; injectable so the logic runs under node:test. */
export interface WakeEnv{
 readonly wakeLock?:{request(type:'screen'):Promise<WakeSentinel>};
 readonly doc:{readonly visibilityState:string;addEventListener(type:'visibilitychange',listener:()=>void):void;removeEventListener(type:'visibilitychange',listener:()=>void):void};
}
export type WakeLockState='unsupported'|'idle'|'requesting'|'held'|'failed';

/** A refused request is tried again on a later user tap, at most this many times per hold. */
export const WAKE_RETRY_LIMIT=3;

const browserEnv=():WakeEnv|null=>{
 if(typeof document==='undefined'||typeof navigator==='undefined')return null;
 const wakeLock=(navigator as Navigator&{wakeLock?:WakeEnv['wakeLock']}).wakeLock;
 return {wakeLock:wakeLock&&typeof wakeLock.request==='function'?wakeLock:undefined,doc:document};
};

export class ScreenWakeLock{
 private wanted=false;
 private sentinel:WakeSentinel|null=null;
 private pending=false;
 private failed=false;
 private retries=0;
 private listening=false;
 /** Requests made and locks released, for verification. */
 public readonly stats={requests:0,granted:0,refused:0,released:0};
 constructor(private readonly env:WakeEnv|null=browserEnv()){}

 get supported(){return !!this.env?.wakeLock;}
 get state():WakeLockState{return !this.supported?'unsupported':this.sentinel?'held':this.pending?'requesting':this.failed&&this.wanted?'failed':'idle';}

 /** Keep the screen awake from now on. Repeated calls are harmless. */
 hold(){
  if(!this.wanted){this.wanted=true;this.failed=false;this.retries=0;}
  this.listen(true);this.sync();
 }
 /** Let the screen dim again. Repeated calls are harmless. */
 letGo(){this.wanted=false;this.failed=false;this.listen(false);this.sync();}
 /** Call from a user gesture: a lock the system dropped is asked for again, and a request the browser refused (some need a gesture) is
  * tried once more, up to WAKE_RETRY_LIMIT times per hold. Does nothing while a lock is held or a request is in flight. */
 retry(){
  if(!this.wanted||this.sentinel&&!this.sentinel.released||this.pending)return;
  if(this.failed){if(this.retries>=WAKE_RETRY_LIMIT)return;this.retries++;this.failed=false;}
  this.sync();
 }

 private readonly onVisibility=()=>this.sync();
 private listen(on:boolean){
  if(!this.env||on===this.listening)return;this.listening=on;
  if(on)this.env.doc.addEventListener('visibilitychange',this.onVisibility);else this.env.doc.removeEventListener('visibilitychange',this.onVisibility);
 }
 private sync(){
  const api=this.env?.wakeLock;if(!api)return;
  if(!this.wanted){if(this.sentinel){const s=this.sentinel;this.sentinel=null;this.drop(s);}return;}
  if(this.sentinel?.released)this.sentinel=null; // lost without an event reaching us
  if(this.sentinel||this.pending||this.failed||this.env!.doc.visibilityState!=='visible')return;
  this.pending=true;this.stats.requests++;
  let request:Promise<WakeSentinel>;
  try{request=api.request('screen');}catch{request=Promise.reject(new Error('wake lock request threw'));}
  request.then(s=>{
   this.pending=false;this.stats.granted++;
   if(!this.wanted||this.sentinel){this.drop(s);return;} // let go (or already held) while the request was in flight
   this.sentinel=s;
   // Lost (page hidden, power saver): asked for again on visibilitychange or the next tap, never straight from here, so a system that keeps dropping it cannot loop.
   s.addEventListener('release',()=>{if(this.sentinel===s)this.sentinel=null;});
  },()=>{this.pending=false;this.stats.refused++;if(this.wanted)this.failed=true;});
 }
 private drop(s:WakeSentinel){
  if(s.released)return;this.stats.released++;
  try{s.release().catch(()=>{});}catch{/* already gone */}
 }
}

/** The one controller the game uses. */
export const screenWakeLock=new ScreenWakeLock();

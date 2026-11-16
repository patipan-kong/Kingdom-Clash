import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import assert from 'node:assert/strict';

// Screen Wake Lock in the real Battle lifecycle. navigator.wakeLock and page visibility are replaced by an init script so the test
// sees every request and release: held while the match runs, let go on pause / hide / Victory / Defeat / leaving, back on resume,
// replay and the next battle; unsupported and refusing browsers play normally with no errors or unhandled rejections.
const KEY='kingdom-clash.campaign.v2';
const server=await createServer({server:{host:'127.0.0.1',port:0}});
let browser;const errors=[];
const check=(ok,name,info)=>{assert.ok(ok,name+(info?` ${JSON.stringify(info)}`:''));console.log('PASS '+name);};
const save=n=>JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:n},(_,i)=>[`campaign-0${i+1}`,{clears:1}]))});
// mode: 'grant' | 'refuse' | 'unsupported'
const stub=mode=>{
 window.__wake={requests:0,granted:0,released:0,live:0,maxLive:0,sentinels:[],mode,rejections:0};
 window.addEventListener('unhandledrejection',()=>window.__wake.rejections++);
 let hidden=false;
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>hidden?'hidden':'visible'});
 const w=window.__wake;
 const drop=s=>{if(s.released)return;s.released=true;w.live--;w.released++;s.handlers.forEach(f=>f());};
 window.__setHidden=v=>{hidden=v;if(v)w.sentinels.forEach(drop);document.dispatchEvent(new Event('visibilitychange'));};
 const api={request(type){
  w.requests++;if(w.mode==='refuse')return Promise.reject(new DOMException('denied','NotAllowedError'));
  const s={type,released:false,handlers:[],addEventListener(t,f){if(t==='release')this.handlers.push(f);},release(){drop(this);return Promise.resolve();}};
  return Promise.resolve().then(()=>{w.granted++;w.live++;w.maxLive=Math.max(w.maxLive,w.live);w.sentinels.push(s);return s;});
 }};
 if(mode==='unsupported')Object.defineProperty(Navigator.prototype,'wakeLock',{configurable:true,get:()=>undefined});
 else Object.defineProperty(Navigator.prototype,'wakeLock',{configurable:true,get:()=>api});
};
try{
 await server.listen();const port=server.httpServer.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const boot=async(mode,viewport={width:844,height:390})=>{
  const ctx=await browser.newContext({viewport,hasTouch:true});await ctx.addInitScript(stub,mode);
  const page=await ctx.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',e=>errors.push(`${mode}: ${e.message}`));
  await page.goto(`http://127.0.0.1:${port}/`);await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));
  await page.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,save(2)]);
  return {ctx,page};
 };
 const helpers=page=>{
  const wake=()=>page.evaluate(()=>({...window.__wake,sentinels:undefined,state:window.kingdomGame.scene.getScene('Battle').wakeLockState}));
  const ready=()=>page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&!window.kingdomGame.scene.getScene('HUD').restarting);
  const start=async id=>{await page.evaluate(id=>window.kingdomGame.scene.getScene('MainMenu').scene.start('Battle',{mode:'campaign',levelId:id}),id);await ready();await settle();};
  const settle=()=>page.waitForTimeout(150);
  const hud=(fn,arg)=>page.evaluate(([fn,arg])=>{const h=window.kingdomGame.scene.getScene('HUD');return h[fn](arg);},[fn,arg]);
  const end=async o=>{await page.evaluate(o=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.finish(o,o==='victory'?'objectives-complete':'azure-keep-destroyed',s.clock.tick);},o);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await settle();};
  const tapBattlefield=async()=>{const r=await page.evaluate(()=>{const c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+c.width*.55,y:c.y+c.height*.45};});await page.touchscreen.tap(r.x,r.y);await settle();};
  return {wake,ready,start,settle,hud,end,tapBattlefield};
 };

 // ---- supported: full lifecycle
 {const {ctx,page}=await boot('grant'),{wake,start,settle,hud,end,ready}=helpers(page);let w;
  await start('campaign-01');w=await wake();
  check(w.requests===1&&w.live===1&&w.state==='held','battle start requests and holds one screen lock',w);
  await page.waitForTimeout(1500);w=await wake();check(w.requests===1&&w.live===1,'no duplicate requests while the battle runs',w);
  await hud('setPause',true);await settle();w=await wake();check(w.live===0&&w.state==='idle','pause releases the lock',w);
  await hud('setPause',false);await settle();w=await wake();check(w.live===1&&w.requests===2,'resume reacquires it',w);
  // Backgrounding: the browser drops the lock and the game pauses itself; coming back shows the pause menu, so the lock waits for Resume.
  await page.evaluate(()=>window.__setHidden(true));await settle();w=await wake();
  const paused=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').paused);
  check(w.live===0&&paused,'hidden page: lock lost and the battle pauses',{...w,paused});
  await page.evaluate(()=>window.__setHidden(false));await settle();w=await wake();check(w.live===0&&w.requests===2,'visible again on the pause menu: nothing requested yet',w);
  await hud('setPause',false);await settle();w=await wake();check(w.live===1&&w.requests===3,'resume after returning reacquires the lock',w);
  // Hidden while not paused (a browser that fires no blur and no pause): the controller itself reacquires on visible.
  await page.evaluate(()=>{window.kingdomGame.events.removeAllListeners('request-pause');});
  await page.evaluate(()=>window.__setHidden(true));await settle();await page.evaluate(()=>window.__setHidden(false));await settle();w=await wake();
  check(w.live===1&&w.requests===4,'returning to a battle that is still running reacquires the lock on visibilitychange',w);
  await end('victory');w=await wake();check(w.live===0&&w.state==='idle','Victory releases the lock',w);
  await page.evaluate(()=>window.__setHidden(true));await page.evaluate(()=>window.__setHidden(false));await settle();w=await wake();check(w.live===0,'visible again on the result screen requests nothing',w);
  await hud('restartMatch',true);await ready();await settle();w=await wake();check(w.live===1&&w.state==='held','Replay holds a fresh lock',w);
  await end('defeat');w=await wake();check(w.live===0,'Defeat releases the lock',w);
  await hud('restartMatch',true);await ready();await settle();await hud('leaveBattle','MainMenu');await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MainMenu'));await settle();w=await wake();
  check(w.live===0&&w.state==='idle','leaving the battle mid-match releases the lock',w);
  await start('campaign-02');w=await wake();check(w.live===1,'the next battle holds it again',w);
  check(w.maxLive===1,'never more than one lock held at a time',w);
  check(w.rejections===0,'no unhandled promise rejections',w);
  await ctx.close();}

 // ---- refused: plays normally, no rejection leaks, a tap retries (bounded)
 {const {ctx,page}=await boot('refuse'),{wake,start,tapBattlefield}=helpers(page);let w;
  await start('campaign-01');w=await wake();check(w.requests===1&&w.state==='failed'&&w.live===0,'a refused request leaves the battle running without a lock',w);
  for(let i=0;i<5;i++)await tapBattlefield();w=await wake();check(w.requests===4,'battlefield taps retry a refused lock at most 3 times',w);
  const playing=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.match.phase==='playing');
  check(playing&&w.rejections===0,'refused: match still playing, no unhandled rejections',{...w,playing});
  await ctx.close();}

 // ---- unsupported: no API at all
 {const {ctx,page}=await boot('unsupported'),{wake,start,end}=helpers(page);let w;
  await start('campaign-01');w=await wake();check(w.requests===0&&w.state==='unsupported','unsupported browser: no request, battle starts normally',w);
  await end('victory');w=await wake();check(w.rejections===0,'unsupported: Victory reached with no rejections',w);
  await ctx.close();}

 check(errors.length===0,'no page errors',errors);
}finally{await browser?.close();await server.close();}

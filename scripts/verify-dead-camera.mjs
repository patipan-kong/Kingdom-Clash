import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
// Camera control while the Guardian is dead: free pan on the stick input, no snap back, smooth resume after respawn, clean Restart.
// Synchronization is frame based: input is released before sampling and the camera is sampled only once its scroll is observably stable.
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{assert.ok(ok,name);console.log('PASS '+name);};
await page.goto((process.env.PROTOTYPE_URL||'http://127.0.0.1:5185/')+'?encounter=extended');
await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('Battle').damageArt);
// In-page helpers: frames(n), cam(), settle() = wait until the scroll is unchanged for 6 consecutive frames, hold(x,y,n) = stick for n frames then release and settle.
// They look the Battle scene up on every call, so they survive a scene restart.
await page.evaluate(()=>{
 const g=window.kingdomGame,B=()=>g.scene.getScene('Battle');
 const T=window.T={frames:n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);}),
  cam:()=>{const b=B(),c=b.cameras.main,s=b.simulation;return {x:c.scrollX,y:c.scrollY,hp:s.hero.hp,hx:s.hero.x,hy:s.hero.y,dead:s.hero.hp<=0,following:b.following,maxX:c.getBounds().width-c.width,maxY:c.getBounds().height-c.height};},
  async settle(){let last=T.cam(),still=0;for(let i=0;i<900&&still<6;i++){await T.frames(1);const c=T.cam();still=Math.abs(c.x-last.x)<.01&&Math.abs(c.y-last.y)<.01?still+1:0;last=c;}if(still<6)throw new Error('camera never settled');return last;},
  async hold(x,y,n){g.events.emit('stick',x,y);await T.frames(n);g.events.emit('stick',0,0);return T.settle();},
  kill(){const s=B().simulation;s.state.spawnedWaves=12;s.spawnQueue.length=0;s.state.units={guardian:s.hero};s.hit({...s.hero,id:'e',team:'red'},s.hero,99999,'direct');s.hero.respawnTick=s.clock.tick+1e7;},
  respawn(){const s=B().simulation;s.hero.respawnTick=s.clock.tick+1;}};
});
const cam=()=>page.evaluate(()=>T.cam());
await page.evaluate(()=>T.settle());
// Alive: stick moves the Guardian and the camera follows.
const a=await cam();await page.evaluate(()=>T.hold(1,0,40));const b=await cam();
check(b.hx>a.hx&&b.x>a.x,'alive: stick moves the Guardian and the camera follows');
// Death: the camera must be stable once the Guardian is dead (no follow still in flight).
await page.evaluate(()=>T.kill());const d0=await page.evaluate(()=>T.settle());
check(d0.dead,'Guardian is dead and the camera settles');
const d1=await page.evaluate(()=>T.hold(-1,0,60));
check(d1.x<d0.x-60,'dead: stick pans the camera (scrollX '+d0.x.toFixed(0)+' -> '+d1.x.toFixed(0)+')');
check(d1.hx===d0.hx&&d1.hy===d0.hy,'dead: the Guardian itself does not move');
const d2=await page.evaluate(async()=>{await T.frames(120);return T.cam();});
check(Math.abs(d2.x-d1.x)<.01&&Math.abs(d2.y-d1.y)<.01,'dead: after release the camera holds (no snap back to the corpse)');
await page.evaluate(()=>window.kingdomGame.events.emit('focus-map',1400,500));
const m=await page.evaluate(async()=>{await T.frames(1);const first=T.cam();await T.frames(150);return {first,later:T.cam()};});
check(Math.abs(m.later.x-m.first.x)<.01&&m.later.x>d2.x+100,'dead: minimap look-at works and is not undone when its look window expires');
const e=await page.evaluate(()=>T.hold(0,1,60));check(e.y>m.later.y,'dead: vertical pan works');
const edge=await page.evaluate(()=>T.hold(-1,-1,400));check(edge.x===0&&edge.y===0,'dead: pan clamps at the top-left bound ('+edge.x+','+edge.y+')');
const far=await page.evaluate(()=>T.hold(1,1,600));check(far.x<=far.maxX&&far.y<=far.maxY&&far.x>=0&&far.y>=0,'dead: pan stays inside the bounds on the far side');
await page.evaluate(()=>T.hold(-1,-1,400));
// Respawn from a far-away camera: eased, monotonic, in bounds, then normal control.
const r=await page.evaluate(async()=>{const start=T.cam();T.respawn();const s=[];for(let i=0;i<200;i++){await T.frames(1);s.push(T.cam());}const end=await T.settle();return {start,s,end};});
const dist=c=>Math.hypot(c.x-r.end.x,c.y-r.end.y),d=[r.start,...r.s].map(dist);
check(r.end.hp>0,'respawned at full health');
check(d[0]>100,'camera was far from the Guardian ('+d[0].toFixed(0)+' px)');
check(d.every((v,i)=>i===0||v<=d[i-1]+.01),'respawn: camera distance to the Guardian only decreases');
const k=d.findIndex((v,i)=>i>0&&v<d[i-1]-.01);check(k>0&&d[k-1]-d[k]<d[0]*.5,'respawn: the first moving frame covers a fraction of the gap, no teleport ('+(d[k-1]-d[k]).toFixed(0)+' of '+d[0].toFixed(0)+')');
check(d.at(-1)<1&&r.s.every(c=>c.x>=0&&c.y>=0&&c.x<=c.maxX&&c.y<=c.maxY),'respawn: camera moves toward the Guardian inside the bounds');
const g0=await cam();await page.evaluate(()=>T.hold(1,0,40));const g1=await cam();
check(g1.hx>g0.hx&&g1.x>g0.x,'after respawn: the Guardian moves again and the camera follows');
// Restart while dead and panned: no stale dead-camera mode.
await page.evaluate(()=>T.kill());await page.evaluate(()=>T.settle());await page.evaluate(()=>T.hold(1,1,200));
await page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle');b.simulation.beginRestart();g.events.emit('clear-controls');b.scene.restart();});
await page.waitForFunction(()=>{const b=window.kingdomGame.scene.getScene('Battle');return b.simulation&&b.simulation.hero.hp>0&&b.simulation.clock.tick<30&&b.visuals.get('guardian');});
const s0=await page.evaluate(()=>T.settle());
check(!s0.dead&&s0.following,'restart: alive Guardian and following camera (no dead mode survives)');
await page.evaluate(()=>T.hold(1,0,40));const s1=await cam();
check(s1.hx>s0.hx&&s1.x>=s0.x,'restart: Guardian moves and the camera follows');
check(errors.length===0,'no console or page errors '+errors.join('|'));
await browser.close();

// Chapter 4 M1 playtest diagnostic: a long real-time soak of Forest Edge in the browser. Keeps the Guardian and the Azure Keep alive so waves keep arriving, and samples every 15 s:
// FPS, living and stored units, Battle/HUD display-list sizes, visuals, tweens, textures and the JS heap, so growth over minutes 5-7 shows up as a trend.
// SOAK_SECONDS (default 480), FOREST_URL (default http://127.0.0.1:5271/), EXE=<chromium path>. Software rendering: read the trend, not the absolute FPS.
import {chromium} from '@playwright/test';
const base=process.env.FOREST_URL||'http://127.0.0.1:5271/',seconds=Number(process.env.SOAK_SECONDS||480);
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1','--enable-precise-memory-info']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true});
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.goto(`${base}?debug=1&level=31`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.hero.hp=s.hero.maxHp=1e7;s.state.bases['blue-base'].invulnerable=true;s.teleportHero(450,600);s.send({type:'attack'});window.__peak=0;
 const h=window.kingdomGame.scene.getScene('HUD');window.__frames=0;window.kingdomGame.events.on('postrender',()=>{window.__frames++;});});
const sample=()=>page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD'),s=b.simulation,u=Object.values(s.state.units);
 return {t:Math.round(s.clock.tick/30),fps:Math.round(g.loop.actualFps),alive:u.filter(x=>x.hp>0).length,stored:u.length,battle:b.children.length,hud:h.children.length,visuals:b.visuals?.size??-1,tweens:b.tweens.getTweens().length,textures:g.textures.getTextureKeys().length,heapMB:Math.round((performance.memory?.usedJSHeapSize??0)/1048576),perf:h.perf?.text??''};});
console.log('t(s) fps alive stored battle hud visuals tweens textures heapMB | overlay');
for(let i=0;i<=seconds/15;i++){const r=await sample();console.log([r.t,r.fps,r.alive,r.stored,r.battle,r.hud,r.visuals,r.tweens,r.textures,r.heapMB].map(v=>String(v).padStart(5)).join(' '),'|',r.perf);await page.waitForTimeout(15000);}
await page.screenshot({path:process.env.SOAK_SHOT||'soak.png'});await browser.close();

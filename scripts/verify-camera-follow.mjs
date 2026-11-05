// Camera follow and gate bar regression (Chapter 5 M5/M6 playtest bugs), 780x360 CSS, DPR 3.
// 1. On a fresh page, with no Build mode and no Tavern, the camera follows the live Guardian sprite and scrolls as he walks back to the Azure Keep.
// 2. A faction gate's HP bar never sits under the top HUD: with the Guardian low beside the gate it rests just below it.
// Needs a dev server: CAMERA_URL=http://127.0.0.1:5371/ (the dev-only ?debug=1&level=N opens the mission).
import {chromium} from '@playwright/test';
const base=process.env.CAMERA_URL||'http://127.0.0.1:5371/';
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(level){
 const ctx=await browser.newContext({viewport:{width:780,height:360},deviceScaleFactor:3,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}?debug=1&level=${level}`);
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:30000});
 await page.evaluate(()=>{const G=window.kingdomGame;window.G=G;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;S.encounter={...S.encounter,waves:[],continuous:false};S.hero.hp=S.hero.maxHp=1e6;});
 return {ctx,page,errors};
}
const cam=page=>page.evaluate(()=>{const c=B.cameras.main,v=B.visuals.get('guardian'),g=S.state.units.guardian;return {follow:c._follow===v&&v.active,scroll:Math.round(c.scrollX),guardian:Math.round(g.x),screenX:Math.round(v.x-c.scrollX)};});
for(const level of [31,45,46]){
 const {ctx,page,errors}=await open(level);
 await page.waitForTimeout(1500);
 const start=await cam(page);check(start.follow,`level ${level}: the camera follows the live Guardian sprite from the start (no Build, no Tavern)`,start);
 await page.evaluate(()=>{B.setHeroPosition(900,600);});await page.waitForTimeout(1200);
 const a=await cam(page);
 for(let i=0;i<6;i++){await page.evaluate(()=>{G.events.emit('stick',-1,0);S.send({type:'move',x:-1,y:0});});await page.waitForTimeout(500);}
 await page.evaluate(()=>S.send({type:'move',x:0,y:0}));await page.waitForTimeout(800);
 const b=await cam(page);check(b.guardian<a.guardian-100&&b.scroll<a.scroll-100,`level ${level}: walking back toward the Azure Keep scrolls the camera with him`,{from:a,to:b});
 check(b.screenX>=0&&b.screenX<=960*.7,`level ${level}: he stays on screen, left of the skill buttons`,b.screenX);
 check(!errors.length,`level ${level}: no page errors`,errors.slice(0,2));await ctx.close();
}
for(const level of [45,46]){
 const {ctx,page}=await open(level);
 await page.evaluate(()=>{for(const id of ['c5-sally-north','c5-sally-south','c5-gate-north','c5-gate-south'])S.state.structures[id].hp=0;});
 for(const y of [680,760,840]){
  const ok=await page.evaluate(y=>{if(!B.setHeroPosition(1300,y))return false;B.followHero();return true;},y);if(!ok)continue;await page.waitForTimeout(900);
  const r=await page.evaluate(()=>{const c=B.cameras.main,k=B.keepHealth.get('red-fortress-gate'),b=B.hpBars.get('red-fortress-gate').bar.getBounds();return {depth:k?.container.depth,top:Math.round(b.y-c.scrollY),clear:B.hudClearance,visible:k?.container.visible};});
  check(r.depth===2700&&r.top>=r.clear-1,`level ${level}: with the Guardian at y ${y} the gate bar is below the top HUD`,r);
 }
 await ctx.close();
}
// 3. The Ballista card: the ruin stays clear of the Build panel from any approach, and leaving Build glides the camera back instead of cutting.
for(const level of [45,46]){
 const {ctx,page}=await open(level);
 await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:900*120,iron:200*120};S.state.posts.find(p=>p.id==='north').owner='azure';for(const id of ['c5-north-a','c5-north-b'])S.state.structures[id].hp=0;});
 const toPage=(x,y)=>page.evaluate(([x,y])=>{const c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {x:c.x+x*k,y:c.y+y*k};},[x,y]);
 const frames=n=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
 const tap=async(x,y)=>{const p=await toPage(x,y);await page.touchscreen.tap(p.x,p.y);await frames(4);};
 const centre=expr=>page.evaluate(e=>{const b=eval(e).getBounds();return {x:b.centerX,y:b.centerY};},expr);
 for(const [hx,hy] of [[1000,250],[1176,264],[1300,264],[1176,400]]){
  if(!(await page.evaluate(([x,y])=>{if(!B.setHeroPosition(x,y))return false;B.followHero();return true;},[hx,hy])))continue;await page.waitForTimeout(1000);
  const u=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tap(u.x,u.y);
  const c=await centre('H.buildPanel.hits[6]');await tap(c.x,c.y);await page.waitForTimeout(600);
  const r=await page.evaluate(()=>{const c=B.cameras.main,y=5.5*48*.72-c.scrollY,h=H.buildPanel.bounds,top=y-17,bottom=y+17;return {cell:[Math.round(top),Math.round(bottom)],panel:[Math.round(h.y),Math.round(h.y+h.height)],room:Math.round(top>h.y+h.height?top-(h.y+h.height):h.y-bottom)};});
  check(r.room>=20,`level ${level}: with the Guardian at ${hx},${hy} the Ballista ruin has room above or below the Build panel`,r);
  await page.evaluate(()=>{window.rec=[];B.events.on('prerender',()=>{const c=B.cameras.main;window.rec.push([c.scrollX,c.scrollY]);});H.closeUtility();});await page.waitForTimeout(4500);
  const jump=await page.evaluate(()=>{let m=0;for(let i=1;i<window.rec.length;i++)m=Math.max(m,Math.abs(window.rec[i][0]-window.rec[i-1][0]),Math.abs(window.rec[i][1]-window.rec[i-1][1]));return Math.round(m);});
  check(jump<40,`level ${level}: leaving Build glides the camera back to the Guardian (largest one-frame move ${jump}px)`,jump);
 }
 await ctx.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

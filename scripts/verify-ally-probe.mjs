// Chapter 5 Phase 0 (docs/CHAPTER5_ALLY_PROBE.md): the dev-only ?allyTest launch in the browser. Needs a dev server: ALLY_URL=http://127.0.0.1:5371/
// Opens each scene, lets it play in real time with the Guardian idle, reads the debug HUD's FPS line every 5 s and checks that the Knights, the cart and the Ballista exist and that the page logs no error.
// Headless Chrome renders with SwiftShader (software), so its FPS is a floor, not a phone figure: the Galaxy S24 run is the real measurement. Stills go to ALLY_EVIDENCE (default the OS temp dir).
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.ALLY_URL||'http://127.0.0.1:5371/',dir=process.env.ALLY_EVIDENCE||`${tmpdir()}/ally-probe`,seconds=Number(process.env.ALLY_SECONDS||45);
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
for(const [level,mode] of [[31,'1'],[34,'stress'],[36,'stress']]){
 const ctx=await browser.newContext({viewport:{width:960,height:540},hasTouch:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=${level}&allyTest=${mode}`);
 await page.waitForFunction(()=>window.kingdomGame&&window.kingdomGame.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:30000});
 const state=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,u=Object.values(s.state.units);return {title:document.title,tick:s.clock.tick,allies:u.filter(x=>x.ally&&x.hp>0).map(x=>`${x.id}:${x.ally.order.type}`),cart:!!s.state.units['blue-c-probe'],ballista:!!s.state.structures['probe-ballista'],units:u.filter(x=>x.hp>0).length,hud:window.kingdomGame.scene.getScene('HUD').perf?.text??''};});
 const first=await state();
 check(first.title===`ALLY TEST ${mode}`&&first.allies.length===3,`L${level} ${mode}: three Knights on the field`,first.allies);
 if(mode==='stress')check(first.cart&&first.ballista,`L${level} stress: War Cart and Ballista present`);
 const samples=[];for(let t=5;t<=seconds;t+=5){await page.waitForTimeout(5000);const s=await state();samples.push({t,tick:s.tick,units:s.units,allies:s.allies.length,hud:s.hud});}
 await page.screenshot({path:`${dir}/ally-${level}-${mode}.png`});
 console.log(`L${level} ${mode} samples ${JSON.stringify(samples)}`);
 check(samples.at(-1).tick>first.tick+30*(seconds-10)*0.5,`L${level} ${mode}: the match advanced in real time`,{from:first.tick,to:samples.at(-1).tick});
 check(!errors.length,`L${level} ${mode}: no page errors`,errors.slice(0,3));
 await ctx.close();
}
// The Galaxy S24 comparison pair at its fullscreen landscape viewport (780x360 CSS, DPR 3): both must show the debug performance line (FPS, frame time, living units) inside the canvas.
for(const q of ['level=36','level=36&allyTest=stress']){
 const ctx=await browser.newContext({viewport:{width:780,height:360},deviceScaleFactor:3,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}?debug=1&${q}`);
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.waitForTimeout(2500);
 const p=await page.evaluate(()=>{const t=window.kingdomGame.scene.getScene('HUD').perf,c=window.kingdomGame.canvas.getBoundingClientRect(),b=t?.getBounds(),k=c.height/540;return {text:t?.text??'',visible:!!t?.visible,box:b&&{x:c.x+b.x*k,y:c.y+b.y*k,right:c.x+b.right*k,bottom:c.y+b.bottom*k},canvas:{x:c.x,y:c.y,right:c.right,bottom:c.bottom}};});
 const inside=p.box&&p.box.x>=p.canvas.x-1&&p.box.right<=p.canvas.right+1&&p.box.y>=p.canvas.y-1&&p.box.bottom<=p.canvas.bottom+1;
 check(p.visible&&/\d+ FPS · [\d.]+ ms \(max \d+\) · \d+ units/.test(p.text)&&inside,`S24 780x360 ?debug=1&${q}: FPS, frame time and units shown on screen`,p.text);
 check(!errors.length,`S24 780x360 ?debug=1&${q}: no page errors`,errors.slice(0,3));
 await page.screenshot({path:`${dir}/s24-${q.replace(/[=&]/g,'-')}.png`});await ctx.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS',`(stills in ${dir})`);process.exit(failed?1:0);

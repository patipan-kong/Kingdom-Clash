// Desktop UX D3 (docs/DESKTOP_UX_D3.md): the desktop default rendering resolution and its ?res= overrides in the browser.
// Needs a server: DESKTOP_URL=http://127.0.0.1:5721/ node scripts/verify-render-resolution.mjs (levels through ?debug=1&level=N, so a dev
// server or a VITE_PLAYTEST build). Checks that only the backing store changes: logical canvas, CSS size, cameras and pointer coordinates
// match the original rendering (?res=540); Text gets resolution k; handhelds keep 960x540. Stills go to DESKTOP_EVIDENCE (default docs/screenshots/desktop-d3-1).
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.DESKTOP_URL||'http://127.0.0.1:5721/',dir=process.env.DESKTOP_EVIDENCE||'docs/screenshots/desktop-d3';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;const results=[],perf=[];
const check=(ok,name,detail)=>{if(!ok)failed++;results.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok||detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(w,h,query,{touch=false,level=3,dpr=1,userAgent}={}){
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:dpr,...(userAgent?{userAgent}:{}),...(touch?{hasTouch:true,isMobile:true}:{})}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=${level}${query?'&'+query:''}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:90000});
 await page.evaluate(()=>{const fps=document.querySelector('#debug-fps,[data-debug-fps]');if(fps)fps.style.display='none';});
 await page.waitForTimeout(1200);
 return {ctx,page,errors};
}
// Everything a mode could change: backing store, the logical canvas Phaser sees, CSS box, cameras and one HUD label's resolution.
const probe=page=>page.evaluate(()=>{
 const g=window.kingdomGame,c=g.canvas,real=d=>Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,d).get.call(c),r=c.getBoundingClientRect();
 const B=g.scene.getScene('Battle'),H=g.scene.getScene('HUD'),cam=s=>{const m=s.cameras.main;return {x:m.x,y:m.y,w:m.width,h:m.height,zoom:m.zoom}};
 const label=H.children.list.find(o=>o.type==='Text'&&o.visible);
 return {backing:[real('width'),real('height')],logical:[c.width,c.height],game:[g.scale.width,g.scale.height],css:[Math.round(r.width),Math.round(r.height)],
  battleCam:cam(B),hudCam:cam(H),textResolution:label?.style.resolution,glBuffer:[g.renderer.gl.drawingBufferWidth,g.renderer.gl.drawingBufferHeight],rendererSize:[g.renderer.width,g.renderer.height],
  stats:document.getElementById('render-stats')?.textContent??null};
});
// A real mouse move to the same CSS point must give the same logical pointer in every mode.
async function pointerAt(page,fx,fy){
 const r=await page.evaluate(()=>{const b=window.kingdomGame.canvas.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};});
 const x=r.x+r.w*fx,y=r.y+r.h*fy;await page.mouse.move(x,y);await page.waitForTimeout(80);
 return page.evaluate(({x,y,r})=>{const p=window.kingdomGame.input.activePointer,B=window.kingdomGame.scene.getScene('Battle'),wp=B.cameras.main.getWorldPoint(p.x,p.y);
  return {pointer:[+p.x.toFixed(2),+p.y.toFixed(2)],expected:[+((x-r.x)*960/r.w).toFixed(2),+((y-r.y)*540/r.h).toFixed(2)],world:[+wp.x.toFixed(1),+wp.y.toFixed(1)]};},{x,y,r});
}
const frameTimes=page=>page.evaluate(()=>new Promise(done=>{const t=[];let last=0;const f=n=>{if(last)t.push(n-last);last=n;if(t.length<90)requestAnimationFrame(f);else{t.sort((a,b)=>a-b);done({avg:+(t.reduce((a,b)=>a+b,0)/t.length).toFixed(1),p95:+t[Math.floor(t.length*.95)].toFixed(1)});}};requestAnimationFrame(f);}));
const freeze=page=>page.evaluate(()=>{const B=window.kingdomGame.scene.getScene('Battle');B.frozen=true;B.simulation.setPaused(true);B.tweens.timeScale=0;});

const sizes=[[1280,720],[1366,768],[1920,1080],[2560,1440]];
const modes=[['original','res=540'],['default',''],['720','res=720'],['1080','res=1080'],['native','res=native']];
for(const [w,h] of sizes){
 let baseline;
 for(const [name,query] of modes){
  const {ctx,page,errors}=await open(w,h,query),s=await probe(page),label=`${w}x${h} ${name}`;
  const cssH=s.css[1],k=name==='original'?1:name==='default'?Math.min(2,cssH/540):name==='native'?Math.min(3,cssH/540):Number(name)/540;
  const kk=Math.max(1,k);
  check(s.logical.join()==='960,540'&&s.game.join()==='960,540'&&s.rendererSize.join()==='960,540',`${label}: Phaser still sees 960x540`,s);
  check(Math.abs(s.backing[0]-Math.round(960*kk))<=1&&Math.abs(s.backing[1]-Math.round(540*kk))<=1,`${label}: backing ${Math.round(960*kk)}x${Math.round(540*kk)}`,s.backing);
  check(Math.abs(s.glBuffer[0]-960)<1&&Math.abs(s.glBuffer[1]-540)<1,`${label}: GL reports the logical buffer to Phaser`,s.glBuffer);
  check((s.textResolution??1)>=kk-.01,`${label}: HUD text at resolution ≥ ${kk}`,s.textResolution);
  check(name==='default'?s.stats===null:typeof s.stats==='string'&&s.stats.includes('fps'),`${label}: stats readout ${name==='default'?'absent in normal play':'shown'}`,s.stats);
  const pts=[];for(const [fx,fy] of [[.1,.12],[.5,.5],[.83,.9],[.97,.04]])pts.push(await pointerAt(page,fx,fy));
  const px=960/s.css[0]+.05; // the browser delivers whole CSS pixels
  check(pts.every(p=>Math.abs(p.pointer[0]-p.expected[0])<px&&Math.abs(p.pointer[1]-p.expected[1])<px),`${label}: mouse maps to the same logical pointer`,pts);
  if(!baseline)baseline={s,pts};
  else{
   check(JSON.stringify(s.css)===JSON.stringify(baseline.s.css),`${label}: same CSS size as the original`,[s.css,baseline.s.css]);
   check(JSON.stringify(s.battleCam)===JSON.stringify(baseline.s.battleCam)&&JSON.stringify(s.hudCam)===JSON.stringify(baseline.s.hudCam),`${label}: cameras unchanged (size, zoom 1)`,[s.battleCam,s.hudCam]);
   check(pts.every((p,i)=>p.pointer.join()===baseline.pts[i].pointer.join()),`${label}: identical pointer values to the original`,pts.map(p=>p.pointer));
  }
  check(errors.length===0,`${label}: no page errors`,errors);
  // Matched stills: the same frozen frame, full and close-ups of the skill corner and the top plates.
  if((w===1920||w===2560||w===1366)&&['original','default'].includes(name)){
   await freeze(page);await page.evaluate(()=>{const e=document.getElementById('render-stats');if(e)e.style.display='none';});await page.waitForTimeout(250);
   const tag=`${w}x${h}-${name}`;await page.screenshot({path:`${dir}/${tag}.png`});
   await page.screenshot({path:`${dir}/${tag}-hud.png`,clip:{x:w*.6,y:h*.68,width:w*.4,height:h*.32}});
   await page.screenshot({path:`${dir}/${tag}-top.png`,clip:{x:0,y:0,width:w*.45,height:h*.16}});
   await page.evaluate(()=>{const e=document.getElementById('render-stats');if(e)e.style.display='block';});
   await page.evaluate(()=>{const B=window.kingdomGame.scene.getScene('Battle');B.frozen=false;B.simulation.setPaused(false);B.tweens.timeScale=1;});
  }
  perf.push({size:`${w}x${h}`,mode:name,backing:s.backing.join('x'),...await frameTimes(page)});
  await ctx.close();
 }
}
// Main menu text at 1920x1080 (menus use the same canvas), original and default.
for(const [name,query] of [['original','res=540'],['default','']]){
 const ctx=await browser.newContext({viewport:{width:1920,height:1080}}),page=await ctx.newPage();
 await page.goto(`${base}${query?'?'+query:''}`);await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'),null,{timeout:90000});await page.waitForTimeout(1500);
 await page.evaluate(()=>{const e=document.getElementById('render-stats');if(e)e.style.display='none';});
 await page.screenshot({path:`${dir}/menu-1920x1080-${name}.png`});await ctx.close();
}
// High-density desktop: the default stops at 1920x1080 however many device pixels the screen has.
{const {ctx,page,errors}=await open(1920,1080,'',{dpr:2}),s=await probe(page);
 check(s.backing.join()==='1920,1080'&&s.logical.join()==='960,540',`1920x1080 @2x default: capped at 1920x1080`,s.backing);
 check(errors.length===0,'@2x: no page errors',errors);await ctx.close();}
// ?perf=1 shows the readout on the default rendering; F8 hides and shows it.
{const {ctx,page}=await open(1920,1080,'perf=1'),text=()=>page.evaluate(()=>{const e=document.getElementById('render-stats');return e&&{display:e.style.display||'block',text:e.textContent};});
 const a=await text();check(a?.text.includes('default (native'),'?perf=1: readout names the default mode',a);
 await page.keyboard.press('F8');await page.waitForTimeout(200);const b=await text();await page.keyboard.press('F8');await page.waitForTimeout(200);const c=await text();
 check(b?.display==='none'&&c?.display==='block','F8 hides and shows the readout',{b:b?.display,c:c?.display});await ctx.close();}
// Phones and tablets keep 960x540: touch (with or without ?res) and an Android or iPad device that reports a fine pointer.
for(const [name,w,h,query,options] of [
 ['phone 844x390',844,390,'',{touch:true,dpr:3}],['phone 844x390 with ?res=1080',844,390,'res=1080',{touch:true,dpr:3}],['tablet 1180x820',1180,820,'',{touch:true,dpr:2}],
 ['Android with a fine pointer',1280,800,'',{userAgent:'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',dpr:2}]]){
 const {ctx,page,errors}=await open(w,h,query,options),s=await probe(page);
 check(s.backing.join()==='960,540'&&s.logical.join()==='960,540',`${name}: backing stays 960x540`,s.backing);
 check(errors.length===0,`${name}: no page errors`,errors);await ctx.close();}
await writeFile(`${dir}/report.json`,JSON.stringify({passed:results.length-failed,failed,results,perf},null,1));
console.log(JSON.stringify(perf));
console.log(`${results.length-failed}/${results.length} passed`);
await browser.close();process.exit(failed?1:0);

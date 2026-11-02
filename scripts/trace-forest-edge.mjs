// Chapter 4 M1 performance diagnostic: a Chrome Performance trace of a busy Forest Edge battle in HEADED Chrome with the machine's real GPU (no swiftshader).
// Reports the WebGL renderer, FPS, main-thread time by category (scripting, GC, rendering, painting, idle) and the GPU-process busy share, and writes trace-forest-edge.json
// (open it in chrome://tracing or DevTools > Performance > Load profile). TRACE_BUILD seconds of build-up (default 120), TRACE_SECONDS traced (default 15), TRACE_CROWD (clone living Crimson units up to this many, to reach a worst-case crowd the simulation does not build with an idle Guardian), FOREST_URL, EXE.
import {chromium} from '@playwright/test';import fs from 'node:fs';
const base=process.env.FOREST_URL||'http://127.0.0.1:5271/',build=Number(process.env.TRACE_BUILD||120),secs=Number(process.env.TRACE_SECONDS||15);
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:false,args:['--enable-precise-memory-info','--disable-frame-rate-limit-not']});
const page=await browser.newPage({viewport:{width:960,height:540}});page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.goto(`${base}?debug=1&level=${process.env.TRACE_LEVEL||31}`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
console.log('renderer:',await page.evaluate(()=>{const g=window.kingdomGame.renderer.gl,e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'?';}),'| rAF rate:',await page.evaluate(()=>new Promise(r=>{let n=0,t=performance.now();const f=now=>{n++;if(now-t>2000)r(Math.round(n/2)+' Hz (idle page)');else requestAnimationFrame(f);};requestAnimationFrame(f);})));
const crowd=Number(process.env.TRACE_CROWD||0),at=(process.env.TRACE_AT||'820,600').split(',').map(Number); // TRACE_LEVEL (default 31); TRACE_AT=x,y centres the crowd (Cliff Pass: 1296,600, the neck)

await page.evaluate(({crowd,at})=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e7;s.state.bases['blue-base'].invulnerable=true;s.teleportHero(700,600);s.send({type:'attack'});
  if(crowd){const src=Object.values(s.state.units).filter(u=>u.hp>0&&u.team==='red'&&u.id!=='guardian');for(let i=0;src.length&&Object.values(s.state.units).filter(u=>u.hp>0).length<crowd;i++)s.state.units['crowd-'+i]={...src[i%src.length],id:'crowd-'+i,x:at[0]-260+((i*97)%520),y:at[1]-60+((i*53)%120)};}
 window.__fr=[];let l=performance.now();const f=n=>{window.__fr.push(n-l);l=n;requestAnimationFrame(f);};requestAnimationFrame(f);},{crowd,at});
const stat=()=>page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('Battle').simulation,f=window.__fr.splice(0).slice(1);f.sort((a,b)=>a-b);const m=f.reduce((a,b)=>a+b,0)/Math.max(1,f.length);
 return {t:Math.round(s.clock.tick/30),alive:Object.values(s.state.units).filter(x=>x.hp>0).length,fps:+(1000/m).toFixed(1),avgMs:+m.toFixed(1),p95:+f[Math.floor(f.length*.95)]?.toFixed(1),worst:+(f[f.length-1]??0).toFixed(0),over50:f.filter(x=>x>50).length,heapMB:Math.round((performance.memory?.usedJSHeapSize??0)/1048576)};});
for(let i=0;i<build/10;i++){await page.waitForTimeout(10000);console.log(JSON.stringify(await stat()));}
await stat();await browser.startTracing(page,{path:'trace-forest-edge.json',categories:['devtools.timeline','v8.execute','disabled-by-default-devtools.timeline','v8','blink','gpu','cc','toplevel','disabled-by-default-v8.gc']});
await page.waitForTimeout(secs*1000);await browser.stopTracing();console.log('traced window',JSON.stringify(await stat()));
const ev=JSON.parse(fs.readFileSync('trace-forest-edge.json','utf8')).traceEvents,meta=ev.filter(e=>e.ph==='M'&&e.name==='thread_name'),name=new Map(meta.map(e=>[`${e.pid}:${e.tid}`,e.args.name]));
const busy=new Map(),cat=new Map();let t0=Infinity,t1=0;
for(const e of ev){if(e.ph!=='X'||!e.dur)continue;const th=name.get(`${e.pid}:${e.tid}`)||'?';if(e.name==='RunTask'){busy.set(th,(busy.get(th)||0)+e.dur);t0=Math.min(t0,e.ts);t1=Math.max(t1,e.ts+e.dur);}
 if(th==='CrRendererMain'){const k=['FunctionCall','EvaluateScript','v8.callFunction','TimerFire','FireAnimationFrame','RunMicrotasks'].includes(e.name)?'scripting':/GC|MajorGC|MinorGC|BlinkGC/.test(e.name)?'gc':/Layout|UpdateLayoutTree|PrePaint|Paint|Layerize|Commit|HitTest/.test(e.name)?'render/paint':null;if(k)cat.set(k+':'+e.name,(cat.get(k+':'+e.name)||0)+e.dur);}}
const span=(t1-t0)/1000;console.log('span ms',span.toFixed(0));
console.log('busy by thread (% of span):',[...busy].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k} ${(v/10/span).toFixed(0)}%`).join(' | '));
console.log('CrRendererMain top events:');for(const [k,v] of [...cat].sort((a,b)=>b[1]-a[1]).slice(0,12))console.log(`  ${(v/1000).toFixed(0).padStart(6)} ms  ${k}`);
await browser.close();

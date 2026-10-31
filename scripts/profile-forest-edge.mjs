// Chapter 4 M1 playtest diagnostic: where does a busy frame go? Plays Forest Edge in the browser with an unkillable, idle Guardian so Crimson units pile up (a worst-case crowd), then takes a Chrome CPU profile
// and prints the heaviest functions by self time next to FPS and live unit counts. PROFILE_SECONDS (default 150) is the build-up, PROFILE_WINDOW (default 12) the profiled window.
import {chromium} from '@playwright/test';
const base=process.env.FOREST_URL||'http://127.0.0.1:5271/',build=Number(process.env.PROFILE_SECONDS||150),win=Number(process.env.PROFILE_WINDOW||12),level=process.env.PROFILE_LEVEL||'31';
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true});
await page.goto(`${base}?debug=1&level=${level}`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e7;s.state.bases['blue-base'].invulnerable=true;s.teleportHero(700,600);});
const stat=()=>page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),s=b.simulation,u=Object.values(s.state.units).filter(x=>x.hp>0);return {t:Math.round(s.clock.tick/30),fps:Math.round(g.loop.actualFps),alive:u.length,red:u.filter(x=>x.team==='red').length,battle:b.children.length};});
for(let i=0;i<build/15;i++){await page.waitForTimeout(15000);console.log(JSON.stringify(await stat()));}
const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');await page.waitForTimeout(win*1000);const {profile}=await cdp.send('Profiler.stop');
const self=new Map(),byId=new Map(profile.nodes.map(n=>[n.id,n]));const dt=profile.timeDeltas;let total=0;
profile.samples.forEach((id,i)=>{const n=byId.get(id),k=`${n.callFrame.functionName||'(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber}`;self.set(k,(self.get(k)||0)+dt[i]);total+=dt[i];});
console.log('profiled',(total/1000).toFixed(0),'ms; final',JSON.stringify(await stat()));
for(const [k,v] of [...self].sort((a,b)=>b[1]-a[1]).slice(0,22))console.log(`${(100*v/total).toFixed(1).padStart(5)}%  ${(v/1000).toFixed(0).padStart(6)}ms  ${k}`);
await browser.close();

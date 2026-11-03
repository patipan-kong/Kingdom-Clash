// ?unlock=all in the browser: the dev/Preview-only selection override (src/data/debugLaunch.ts unlockOverrideFromSearch, main.ts).
// Three builds, each on a fresh save: the dev server, a Preview build (VITE_PLAYTEST=1) and a Production build. Every step taps the real menus:
// Main Menu -> Campaign -> chapter card -> mission card -> Briefing -> Start. With the override (dev and Preview) all four chapters and all 24
// missions are selectable and Chapter 4 M6 launches without recording anything; without it, and in Production even with it, Chapter 4 stays
// Coming Soon and only Mission 1 is open. Builds go to UNLOCK_BUILD_ROOT (default test-results/unlock-override).
import {chromium} from '@playwright/test';
import {createServer,preview} from 'vite';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
const root=resolve(process.env.UNLOCK_BUILD_ROOT||'test-results/unlock-override');
let failed=0;const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
// Each build runs in its own process with a clean environment: the dev server above sets NODE_ENV=development in this process, and a build that inherits it compiles DEV to true.
async function bundle(name,playtest){
 const env={...process.env};delete env.VITE_PLAYTEST;delete env.NODE_ENV;if(playtest)env.VITE_PLAYTEST='1';
 const r=spawnSync(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'build','--outDir',`${root}/${name}`,'--emptyOutDir','--logLevel','error'],{env,stdio:'inherit'});
 if(r.status!==0)throw new Error(`${name} build failed`);
 const s=await preview({root:resolve('.'),logLevel:'error',build:{outDir:`${root}/${name}`},preview:{host:'127.0.0.1',port:0,strictPort:false}});
 return {url:`http://127.0.0.1:${s.httpServer.address().port}/`,close:()=>s.close()};
}
async function session(base,query){
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const active=name=>page.waitForFunction(name=>window.kingdomGame?.scene.isActive(name),name);
 const frames=async()=>{const n=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(n=>window.kingdomGame.loop.frame>n+2,n);};
 const tap=async(scene,property,key)=>{
  const pt=await page.evaluate(({scene,property,key})=>{const g=window.kingdomGame,o=key?g.scene.getScene(scene)[property].get(key):g.scene.getScene(scene)[property],b=o.getBounds(),r=g.canvas.getBoundingClientRect();return {x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{scene,property,key});
  await page.mouse.click(pt.x,pt.y);await frames();
 };
 await page.goto(base+query);await active('MainMenu');await page.evaluate(()=>localStorage.clear());await page.reload();await active('MainMenu');
 const saved=()=>page.evaluate(()=>Object.keys(localStorage).sort());
 await tap('MainMenu','campaignButton');await active('ChapterSelect');
 const chapters=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');return {states:Object.fromEntries(s.views.map(v=>[v.chapter.id,v.state])),open:[...s.chapterButtons.keys()]};});
 return {page,errors,active,tap,frames,saved,chapters};
}
// Opens a chapter by its card (scrolling the row to it first) and returns which mission cards take a tap.
async function missions(s,chapterId){
 await s.page.evaluate(id=>{const c=window.kingdomGame.scene.getScene('ChapterSelect'),i=c.views.findIndex(v=>v.chapter.id===id);c.setScroll?.(-(c.row?.slots[i]?.x??0)+60);},chapterId);await s.frames();
 await s.tap('ChapterSelect','chapterButtons',chapterId);await s.active('CampaignSelect');
 return s.page.evaluate(()=>{const c=window.kingdomGame.scene.getScene('CampaignSelect');return {chapter:c.chapterId,open:[...c.levelButtons.keys()],locked:[...c.lockedCards.keys()],pending:[...c.pendingCards.keys()]};});
}
const all=['first-war','burning-frontier','frozen-crown','conquered-lands'],c4=[31,32,33,34,35,36].map(n=>`campaign-${n}`);
async function overridden(label,base){
 const s=await session(base,'?unlock=all');
 check(s.chapters.open.length===4&&all.every(id=>s.chapters.open.includes(id)),`${label}: ?unlock=all opens all four chapter cards`,s.chapters);
 for(const [id,first] of [['first-war',1],['burning-frontier',11],['frozen-crown',21]]){
  const m=await missions(s,id),want=[0,1,2,3,4,5].map(i=>`campaign-${String(first+i).padStart(2,'0')}`);
  check(want.every(x=>m.open.includes(x))&&!m.locked.length,`${label}: every ${id} mission is selectable`,m);
  await s.tap('CampaignSelect','backButton');await s.active('ChapterSelect');
 }
 const m=await missions(s,'conquered-lands');
 check(m.chapter==='conquered-lands'&&c4.every(x=>m.open.includes(x))&&!m.locked.length&&!m.pending.length,`${label}: all six Chapter 4 missions are selectable`,m);
 // Chapter 4 opens on the Conquest Map: a marker tap selects, then BRIEFING opens (two steps).
 await s.tap('CampaignSelect','levelButtons','campaign-36');await s.page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').conquestMap.briefingButton.emit('pointerup'));await s.active('MissionBriefing');
 await s.tap('MissionBriefing','startButton');await s.active('Battle');await s.page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 const battle=await s.page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return {level:b.campaignLevel?.id,field:b.simulation?.field.id,records:b.recordsProgress};});
 check(battle.level==='campaign-36'&&battle.field==='crimson-fortress'&&battle.records===false,`${label}: Chapter 4 M6 launches from its card and will record nothing`,battle);
 // The match is won outright: the override-only Victory must leave both the campaign and the achievement saves untouched.
 await s.page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),sim=b.simulation;sim.hit(sim.hero,sim.state.bases['red-base'],1e9,'direct');});
 await s.page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.ended);await s.frames();
 const after=await s.page.evaluate(()=>({outcome:window.kingdomGame.scene.getScene('Battle').simulation.outcome?.outcome,campaign:localStorage.getItem('kingdom-clash.campaign.v2'),achievements:localStorage.getItem('kingdom-clash.achievements.v1')}));
 check(after.outcome==='victory'&&after.campaign===null&&after.achievements===null,`${label}: an override-only Victory writes neither progress nor achievements`,after);
 check(!s.errors.length,`${label}: no page errors with the override`,s.errors);await s.page.close();
 // A reload without the query is a normal session again: nothing was kept.
 const n=await session(base,'');
 check(n.chapters.states['conquered-lands']==='coming-soon'&&n.chapters.open.join()==='first-war',`${label}: the override does not persist into the next visit`,n.chapters);await n.page.close();
}
async function normal(label,base,query){
 const s=await session(base,query);
 check(s.chapters.states['conquered-lands']==='coming-soon'&&s.chapters.open.join()==='first-war',`${label}: Chapter 4 stays Coming Soon and only Chapter 1 opens`,s.chapters);
 const m=await missions(s,'first-war');
 check(m.open.join()==='campaign-01'&&m.locked.length===5,`${label}: only Mission 1 is selectable on a fresh save`,m);
 check(!s.errors.length,`${label}: no page errors`,s.errors);await s.page.close();
}
const servers=[];
try{
 const dev=await createServer({root:resolve('.'),logLevel:'error',server:{host:'127.0.0.1',port:0,strictPort:false}});await dev.listen();servers.push({close:()=>dev.close()});
 const devUrl=`http://127.0.0.1:${dev.httpServer.address().port}/`;
 await overridden('dev',devUrl);await normal('dev without the query',devUrl,'');
 const pre=await bundle('preview',true);servers.push(pre);
 await overridden('Preview build',pre.url);await normal('Preview build without the query',pre.url,'');
 const prod=await bundle('production',false);servers.push(prod);
 await normal('Production build with ?unlock=all',prod.url,'?unlock=all');await normal('Production build',prod.url,'');
 const gate=dir=>{const f=readdirSync(`${root}/${dir}/assets`).find(n=>/^index-.*\.js$/.test(n));return /unlockAll=\w+\(location\.search,(!0|!1)\)/.exec(readFileSync(`${root}/${dir}/assets/${f}`,'utf8'))?.[1];};
 check(gate('preview')==='!0'&&gate('production')==='!1','the gate compiles to true in the Preview bundle and to false in the Production bundle',{preview:gate('preview'),production:gate('production')});
}catch(e){failed++;console.log('FAIL',e.stack||e);}
finally{await browser.close();for(const s of servers)await s.close();}
console.log(failed?`${failed} check(s) failed`:'all checks passed');process.exit(failed?1:0);

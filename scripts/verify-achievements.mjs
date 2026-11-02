// Achievement V1 in the browser (docs/ACHIEVEMENTS_V1.md). Needs a dev server: ACH_URL=http://127.0.0.1:5301/
// Checks the Achievement screen (real, empty because Chapter 4 is not released; dev-only fixture previews, desktop and phone), the Main Menu entry and Back, that a preview never writes storage,
// and the Battle integration: a debug launch records nothing, a legitimate run (simulated by enabling progress recording on the debug match) records the achievement from a real Ballista repair and victory.
// Stills go to ACH_EVIDENCE (default docs/screenshots/achievements). EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.ACH_URL||'http://127.0.0.1:5301/',dir=process.env.ACH_EVIDENCE||'docs/screenshots/achievements',KEY='kingdom-clash.achievements.v1',CAMPAIGN='kingdom-clash.campaign.v2';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(url,viewport,sceneKey){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);
 await page.waitForFunction(k=>window.kingdomGame&&window.kingdomGame.scene.isActive(k)&&window.visualReady!==undefined,sceneKey,{timeout:20000});
 await page.waitForTimeout(500);
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
const scene=(page,key)=>page.evaluate(k=>{const s=window.kingdomGame.scene.getScene(k);return {cards:s.list?.cards.map(c=>({id:c.def.id,unlocked:c.unlocked,replay:c.replay,at:c.unlockedAt??null,best:c.bestTicks??null}))??null,counter:s.counter?.text??null,empty:s.emptyState?.text??null,warning:s.warning?.text??null,replays:s.replayButtons?[...s.replayButtons.keys()]:null};},key);
const store=(page,key)=>page.evaluate(k=>localStorage.getItem(k),key);
// Tap a game object's centre on the real canvas.
async function tap(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame),c=window.kingdomGame.canvas.getBoundingClientRect(),s=c.width/960;return {x:c.x+o.x*s,y:c.y+o.y*s};},get);await page.mouse.click(pt.x,pt.y);}
const active=page=>page.evaluate(()=>window.kingdomGame.scene.getScenes(true).map(s=>s.scene.key));
try{
 // ---- the real screen: nothing is visible because Chapter 4 is not released ----
 {const {page,errors}=await open(base,{width:960,height:540},'MainMenu');
  await shot(page,'01-main-menu');
  await tap(page,'g=>g.scene.getScene("MainMenu").achievementsButton');await page.waitForFunction(()=>window.kingdomGame.scene.isActive('Achievements'),null,{timeout:5000});await page.waitForTimeout(400);
  const s=await scene(page,'Achievements');await shot(page,'02-real-empty');
  check(s.cards.length===0&&s.counter===null&&/No achievements/.test(s.empty),'the real screen is the friendly empty state with no counter',s);
  check(await store(page,KEY)===null,'opening the screen writes nothing');
  await tap(page,'g=>g.scene.getScene("Achievements").backButton');await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MainMenu'),null,{timeout:5000});
  check(true,'Back returns to the Main Menu',await active(page));
  check(errors.length===0,'no page errors on the menu round trip',errors);await page.close();}
 // ---- dev-only fixture previews: never read or write real storage ----
 for(const mode of ['mixed','locked','unlocked','empty']){
  const {page,errors}=await open(`${base}?achievementsPreview=${mode}`,{width:960,height:540},'Achievements');
  const s=await scene(page,'Achievements');await shot(page,`03-preview-${mode}`);
  const expect={mixed:[3,'1 / 3  unlocked'],locked:[2,'0 / 2  unlocked'],unlocked:[1,'1 / 1  unlocked'],empty:[0,null]}[mode];
  check(s.cards.length===expect[0]&&s.counter===expect[1],`preview ${mode}: ${expect[0]} cards, counter ${expect[1]}`,{n:s.cards.length,counter:s.counter});
  check(s.replays.length===0,`preview ${mode}: no Replay button`);
  check(await store(page,KEY)===null&&await store(page,CAMPAIGN)===null,`preview ${mode} wrote nothing to storage`);
  check(errors.length===0,`preview ${mode}: no page errors`,errors);await page.close();}
 {const {page}=await open(`${base}?achievementsPreview=bogus`,{width:960,height:540},'MainMenu');
  check((await active(page)).includes('MainMenu'),'an unknown preview value opens the normal menu');await page.close();}
 {const {page,errors}=await open(`${base}?achievementsPreview=mixed`,{width:844,height:390},'Achievements');await shot(page,'04-preview-mixed-phone');
  const fits=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Achievements'),b=s.cards.getBounds();return {top:Math.round(b.y),bottom:Math.round(b.bottom),minScroll:s.minScroll};});
  check(fits.bottom<=540+40,'the phone view lays the cards out inside the canvas or scrolls them',fits);check(errors.length===0,'no page errors on the phone view',errors);await page.close();}
 // ---- Battle integration ----
 const win=async(page)=>page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.hit(s.hero,s.state.bases['red-base'],1e9,'direct');});
 const prep=page=>page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,st=s.state;for(const id of ['blue-0','blue-1','blue-2']){const u=st.units[id];if(u){u.x=700;u.y=300;}}
  for(const id of ['red-hero','c4-camp-north','c4-camp-south'])s.hit(s.hero,st.units[id]??st.structures[id],1e7,'direct');s.teleportHero(1080,624);s.hero.hp=s.hero.maxHp=1e6;st.bases['blue-base'].hp=st.bases['blue-base'].maxHp=1e8;
  for(let i=0;i<125;i++)s.advance(1000/30+.01);s.economy.balances.wood=300*120;s.economy.balances.iron=60*120;});
 const repair=async(page,repairIt)=>{const r=await repair0(page,repairIt);await page.waitForTimeout(400);return {...r,flag:await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').ballistaRepaired)};};
 const repair0=(page,repairIt)=>page.evaluate(repairIt=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;if(repairIt){s.send({type:'place',requestId:'bal',kind:'ballista',col:21,row:9});for(let i=0;i<30*7;i++){s.hero.hp=s.hero.maxHp=1e6;s.advance(1000/30+.01);}}
  return {owner:s.state.post.owner,ballista:Object.values(s.state.structures).filter(x=>x.ballista&&x.hp>=x.maxHp).length,flag:b.ballistaRepaired};},repairIt);
 // a debug launch of Cliff Pass: repair and win, nothing is recorded
 {const {page,errors}=await open(`${base}?debug=1&level=32`,{width:960,height:540},'Battle');await prep(page);const r=await repair(page,true);await win(page);await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;for(let i=0;i<3;i++)s.advance(1000/30+.01);});await page.waitForTimeout(300);
  const out=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.outcome);
  check(r.owner==='azure'&&r.ballista===1&&r.flag===true,'the debug run really repaired the Ballista (flag set from the construction event)',r);
  check(out?.outcome==='victory','the debug run was won',out);
  check(await store(page,KEY)===null,'a debug victory records no achievement and no best time');check(errors.length===0,'no page errors in the debug run',errors);await page.close();}
 // a legitimate run is simulated by switching progress recording on for the same match; the unlock gate of the campaign is not changed
 for(const [label,repairIt,end] of [['repair + victory',true,'victory'],['victory without a repair',false,'victory'],['repair + defeat',true,'defeat']]){
  const {page,errors}=await open(`${base}?debug=1&level=32`,{width:960,height:540},'Battle');await prep(page);await page.evaluate(()=>{window.kingdomGame.scene.getScene('Battle').recordsProgress=true;});
  const r=await repair(page,repairIt);
  if(end==='victory')await win(page);else await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.state.bases['blue-base'].maxHp=s.state.bases['blue-base'].hp=1;s.hit(s.state.bases['red-base'],s.state.bases['blue-base'],1e9,'direct');});
  await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;for(let i=0;i<3;i++)s.advance(1000/30+.01);});await page.waitForTimeout(300);
  const raw=await store(page,KEY),save=raw&&JSON.parse(raw),outcome=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.outcome);
  check(outcome?.outcome===end,`${label}: the match ended in ${end}`,outcome);
  if(label==='repair + victory'){check(save?.unlocked?.['ballista-recovered']>0&&save.bestTimes['campaign-32']===outcome.tick,'the achievement and the simulation tick are saved',save);await shot(page,'05-after-victory');}
  if(label==='victory without a repair')check(save&&Object.keys(save.unlocked).length===0&&save.bestTimes['campaign-32']===outcome.tick,'a win without a repair saves the best time and no achievement',save);
  if(label==='repair + defeat')check(raw===null,'a defeat saves nothing',raw);
  check(errors.length===0,`${label}: no page errors`,errors);await page.close();}
 // the saved achievement shows on the real screen only when the mission is accessible (it is not, so the screen stays empty)
 {const ctx=await browser.newContext({viewport:{width:960,height:540}});const page=await ctx.newPage();await page.addInitScript(([k,v])=>{if(!localStorage.getItem(k))localStorage.setItem(k,v);},[KEY,JSON.stringify({version:1,unlocked:{'ballista-recovered':1762084800000},bestTimes:{'campaign-32':8100}})]);
  await page.goto(`${base}`);await page.waitForFunction(()=>window.kingdomGame&&window.kingdomGame.scene.isActive('MainMenu'),null,{timeout:20000});await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').scene.start('Achievements'));await page.waitForTimeout(600);
  const s=await scene(page,'Achievements');check(s.cards.length===0&&s.counter===null,'a saved Ballista achievement stays hidden while Chapter 4 is not accessible (no retroactive reveal)',s);await ctx.close();}
}finally{await browser.close();}
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);

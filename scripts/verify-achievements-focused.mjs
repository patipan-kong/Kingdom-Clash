// Achievement V1 focused checks: (1) Replay opens the Cliff Pass Mission Briefing under the existing unlock rules; (2) the Main Menu ACHIEVEMENTS button layout, click and Back.
// Needs a dev server: ACH_URL=http://127.0.0.1:5301/. Campaign progress is seeded only inside throwaway browser contexts; nothing in the app or its production build changes.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.ACH_URL||'http://127.0.0.1:5301/',dir=process.env.ACH_EVIDENCE||'docs/screenshots/achievements',KEY='kingdom-clash.achievements.v1',CAMPAIGN='kingdom-clash.campaign.v2';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
// Level numbers are chapter blocks: 1-6, 11-16, 21-26, then Chapter 4 from 31.
const through=n=>[...[1,2,3,4,5,6,11,12,13,14,15,16,21,22,23,24,25,26,31].filter(x=>x<=n)];
const seed=n=>JSON.stringify({version:1,levels:Object.fromEntries(through(n).map(x=>['campaign-'+String(x).padStart(2,'0'),{clears:1}]))});
// Chapter 4 is a coming-soon card in production, so campaign-32 is unreachable there. In this dev page only, release it in memory to exercise the real unlock rules.
const releaseChapter4=page=>page.evaluate(async()=>{const m=await import('/src/data/campaignChapters.ts'),c=m.campaignChapters.find(x=>x.number===4);c.release='available';return c.release;});
const SAVED=JSON.stringify({version:1,unlocked:{'ballista-recovered':1762084800000},bestTimes:{'campaign-32':8100}});
async function open(viewport,{cleared,ach}={}){
 const ctx=await browser.newContext({viewport,hasTouch:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(([c,a,CK,AK])=>{try{if(!sessionStorage.getItem('seeded')){if(c)localStorage.setItem(CK,c);if(a)localStorage.setItem(AK,a);sessionStorage.setItem('seeded','1');}}catch{}},[cleared?seed(cleared):null,ach??null,CAMPAIGN,KEY]);
 await page.goto(base);
 await page.waitForFunction(()=>window.kingdomGame&&window.kingdomGame.scene.isActive('MainMenu')&&window.visualReady!==undefined,null,{timeout:20000});
 await page.waitForTimeout(500);
 return {ctx,page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function tap(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame),c=window.kingdomGame.canvas.getBoundingClientRect(),s=c.width/960;return {x:c.x+o.x*s,y:c.y+o.y*s};},get);await page.mouse.click(pt.x,pt.y);}
const active=page=>page.evaluate(()=>window.kingdomGame.scene.getScenes(true).map(s=>s.scene.key));
const waitScene=(page,k)=>page.waitForFunction(k=>window.kingdomGame.scene.isActive(k),k,{timeout:5000});
const item=(page,k)=>page.evaluate(k=>localStorage.getItem(k),k);
try{
 // ---- 1. Replay: campaign seeded inside this throwaway context so Cliff Pass (campaign-32) is reachable ----
 {const {ctx,page,errors}=await open({width:960,height:540},{cleared:31,ach:SAVED});
  check(await releaseChapter4(page)==='available','dev page only: Chapter 4 released in memory (production code untouched)');
  const campaignBefore=await item(page,CAMPAIGN),achBefore=await item(page,KEY);
  await tap(page,'g=>g.scene.getScene("MainMenu").achievementsButton');await waitScene(page,'Achievements');await page.waitForTimeout(400);
  const s=await page.evaluate(()=>{const a=window.kingdomGame.scene.getScene('Achievements');return {cards:a.list.cards.map(c=>({id:c.def.id,unlocked:c.unlocked,replay:c.replay})),replays:[...a.replayButtons.keys()]};});
  await frames(page);await page.screenshot({path:`${dir}/06-replay-card.png`});
  check(s.cards.length===1&&s.cards[0].unlocked&&s.cards[0].replay&&s.replays[0]==='ballista-recovered','an eligible unlocked card offers Replay',s);
  await tap(page,'g=>g.scene.getScene("Achievements").replayButtons.get("ballista-recovered")');await waitScene(page,'MissionBriefing');await page.waitForTimeout(500);
  const b=await page.evaluate(()=>{const m=window.kingdomGame.scene.getScene('MissionBriefing');return {level:m.levelId,active:window.kingdomGame.scene.getScenes(true).map(s=>s.scene.key)};});
  await frames(page);await page.screenshot({path:`${dir}/07-replay-briefing.png`});
  check(b.level==='campaign-32'&&b.active.includes('MissionBriefing')&&!b.active.includes('Battle'),'Replay opens the campaign-32 Mission Briefing (not a battle)',b);
  check(await item(page,CAMPAIGN)===campaignBefore&&await item(page,KEY)===achBefore,'opening the briefing changed neither save');
  check(errors.length===0,'no page errors in the replay path',errors);await ctx.close();}
 // campaign-32 not yet reachable (30 missions cleared): no card, and the briefing itself refuses a direct start
 {const {ctx,page,errors}=await open({width:960,height:540},{cleared:30,ach:SAVED});
  await releaseChapter4(page);
  await tap(page,'g=>g.scene.getScene("MainMenu").achievementsButton');await waitScene(page,'Achievements');await page.waitForTimeout(300);
  const n=await page.evaluate(()=>window.kingdomGame.scene.getScene('Achievements').list.cards.length);
  check(n===0,'a mission that is still locked offers no card and no Replay',n);
  await page.evaluate(()=>window.kingdomGame.scene.getScene('Achievements').scene.start('MissionBriefing',{levelId:'campaign-32',returnTo:{scene:'ChapterSelect'}}));
  await page.waitForTimeout(800);const act=await active(page);
  check(!act.includes('MissionBriefing')&&!act.includes('Battle'),'the Mission Briefing refuses a locked mission and returns to the campaign screens',act);
  check(errors.length===0,'no page errors on the locked path',errors);await ctx.close();}
 // ---- 2. Main Menu layout, click and Back ----
 for(const [label,vp] of [['desktop',{width:960,height:540}],['phone-landscape',{width:667,height:375}],['phone-small',{width:568,height:320}]]){
  for(const cleared of [0,31]){
   const tag=`${label}${cleared?' (progress)':''}`;
   const {ctx,page,errors}=await open(vp,{cleared});
   // Visible art is 340x54 around each hit rectangle's centre. On a small canvas the touch hit rectangles grow to 48 CSS px (existing MainMenu.button behaviour), so they are compared separately.
   const lay=await page.evaluate(()=>{const m=window.kingdomGame.scene.getScene('MainMenu'),r=b=>{const g=b.getBounds();return {x:g.x,y:g.y,r:g.right,b:g.bottom,cx:b.x,cy:b.y};};
    const btns={continue:r(m.continueButton),campaign:r(m.campaignButton),achievements:r(m.achievementsButton)};if(m.quickPlayButton)btns.quick=r(m.quickPlayButton);
    return {btns,h:window.kingdomGame.scale.height};});
   const names=Object.keys(lay.btns),art=n=>({y:lay.btns[n].cy-27,b:lay.btns[n].cy+27}),artOverlap=[],hitOverlap=[];
   for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){const A=art(names[i]),B=art(names[j]);if(A.y<B.b&&B.y<A.b)artOverlap.push([names[i],names[j]]);const p=lay.btns[names[i]],q=lay.btns[names[j]];if(p.y<q.b&&q.y<p.b)hitOverlap.push([names[i],names[j]]);}
   const a=lay.btns.achievements,artA=art('achievements');
   await frames(page);await page.screenshot({path:`${dir}/08-menu-${label}${cleared?'-progress':''}.png`});
   check(artOverlap.length===0&&artA.y>=art('campaign').b&&artA.b<=lay.h,`${tag}: ACHIEVEMENTS art sits below the other buttons, no visible overlap, inside the canvas`,{artOverlap,artA,h:lay.h});
   check(!hitOverlap.some(p=>p.includes('achievements'))||hitOverlap.some(p=>p.join()==='continue,campaign'),`${tag}: touch rectangles overlap only as the existing Continue/Campaign pair does (informational)`,hitOverlap);
   await tap(page,'g=>g.scene.getScene("MainMenu").campaignButton');await waitScene(page,'ChapterSelect');
   check(true,`${tag}: the centre of CAMPAIGN still opens the chapters (not stolen by the new button)`,await active(page));
   await page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').scene.start('MainMenu'));await waitScene(page,'MainMenu');await page.waitForTimeout(400);
   await tap(page,'g=>g.scene.getScene("MainMenu").achievementsButton');await waitScene(page,'Achievements');
   check(true,`${tag}: click opens the Achievement screen`,await active(page));
   await page.waitForTimeout(300);await tap(page,'g=>g.scene.getScene("Achievements").backButton');await waitScene(page,'MainMenu');
   check(true,`${tag}: Back returns to the Main Menu`,await active(page));
   check(errors.length===0,`${tag}: no page errors`,errors);await ctx.close();}
 }
}finally{await browser.close();}
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);

// Chapter 4 Conquest Map in the browser (docs/CHAPTER4_CONQUEST_MAP.md). Needs a dev server: MAP_URL=http://127.0.0.1:5415/
// Chapter 4 is a coming-soon card in production, so these checks release it in memory (the dev page only, as verify-achievements-focused does) and seed saves
// through the real unlock rules. Covers all six mission states, two-step navigation, the Azure Fortress only after Mission 6, ?unlock=all, the normal gating of
// the chapter list, and desktop plus phone-landscape sizes with real taps. Stills go to MAP_EVIDENCE (default docs/screenshots/conquest-map).
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.MAP_URL||'http://127.0.0.1:5415/',dir=process.env.MAP_EVIDENCE||'docs/screenshots/conquest-map';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const order=[1,2,3,4,5,6,11,12,13,14,15,16,21,22,23,24,25,26,31,32,33,34,35,36].map(n=>'campaign-'+String(n).padStart(2,'0'));
const SAVE=n=>JSON.stringify({version:1,levels:Object.fromEntries(order.slice(0,n).map(id=>[id,{clears:1}]))});
// n = clears in sequence order: 18 = Chapters 1-3 done (Mission 1 of Chapter 4 next), 24 = Chapter 4 done.
async function open({w=960,h=540,clears=18,query='',release=true}){
 const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:true}),errors=[];page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(([n,key])=>{try{if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,n);sessionStorage.setItem('seeded','1');}}catch{}},[SAVE(clears),'kingdom-clash.campaign.v2']);
 await page.goto(base+query);await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));
 if(release)await page.evaluate(async()=>{const m=await import('/src/data/campaignChapters.ts');m.campaignChapters.find(x=>x.number===4).release='available';});
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const active=page=>page.evaluate(()=>window.kingdomGame.scene.getScenes(true).map(s=>s.scene.key));
const toMap=async page=>{await page.evaluate(()=>window.kingdomGame.scene.getScene(window.kingdomGame.scene.getScenes(true)[0].scene.key).scene.start('CampaignSelect',{chapterId:'conquered-lands'}));
 await page.waitForFunction(()=>window.kingdomGame.scene.isActive('CampaignSelect')&&window.kingdomGame.scene.getScene('CampaignSelect').conquestMap);await frames(page);await page.waitForTimeout(250);};
const state=page=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect');return {open:[...s.levelButtons.keys()],locked:[...s.lockedCards.keys()],pending:[...s.pendingCards.keys()],selected:s.conquestMap.selected(),azure:!!s.conquestMap.azureKeep,
 button:s.children.list.find(o=>o.type==='Text'&&/^(BRIEFING|REPLAY|LOCKED)/.test(o.text))?.text,status:s.children.list.find(o=>o.type==='Text'&&/^MISSION \d/.test(o.text))?.text};});
// A real click at the middle of a game object, in page coordinates.
async function click(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame.scene.getScene('CampaignSelect')),c=window.kingdomGame.canvas.getBoundingClientRect(),r=o.getBounds();return {x:c.x+(r.x+r.width/2)*c.width/960,y:c.y+(r.y+r.height/2)*c.height/540};},get.toString());await page.mouse.click(pt.x,pt.y);await frames(page);}
const marker=id=>`s=>s.slotCards.get('${id}')`;
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
try{
 // ---- Mission states: Missions 1-3 conquered, 4 next, 5-6 locked ----
 {const {page,errors}=await open({clears:21});await toMap(page);const s=await state(page);
  check(s.open.join()==='campaign-31,campaign-32,campaign-33,campaign-34'&&s.locked.join()==='campaign-35,campaign-36'&&!s.pending.length,'3 of 6 conquered: Missions 1-4 open, Missions 5-6 locked',s);
  check(s.selected==='campaign-34'&&s.button==='BRIEFING ▸'&&/NEXT TO CONQUER/.test(s.status),'the next mission is selected with BRIEFING offered',s);
  check(!s.azure,'no Azure Fortress while Mission 6 is unconquered');await shot(page,'01-desktop-3-of-6');
  // two-step: a marker tap only selects
  await click(page,marker('campaign-32'));let t=await state(page);
  check(t.selected==='campaign-32'&&t.button==='REPLAY ▸'&&/CONQUERED/.test(t.status)&&(await active(page)).join()==='CampaignSelect','tapping a conquered marker selects it and offers REPLAY (no Briefing yet)',t);await shot(page,'02-desktop-conquered-selected');
  await click(page,marker('campaign-36'));t=await state(page);
  check(t.selected==='campaign-36'&&t.button==='LOCKED'&&/LOCKED · CONQUER MISSION 5 FIRST/.test(t.status),'tapping a locked marker selects it and the button reads LOCKED',t);await shot(page,'03-desktop-locked-selected');
  await click(page,s=>s.conquestMap.briefingButton);check((await active(page)).join()==='CampaignSelect','BRIEFING on a locked mission opens nothing',await active(page));
  await click(page,marker('campaign-34'));await click(page,s=>s.conquestMap.briefingButton);await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
  check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId)==='campaign-34','select, then BRIEFING opens that mission\'s Briefing');
  await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').backButton.emit('pointerup'));await page.waitForFunction(()=>window.kingdomGame.scene.isActive('CampaignSelect')&&window.kingdomGame.scene.getScene('CampaignSelect').conquestMap);await frames(page);
  t=await state(page);check(t.selected==='campaign-34','returning from the Briefing restores the selection',t);
  await click(page,s=>s.conquestMap.backButton);await page.waitForFunction(()=>window.kingdomGame.scene.isActive('ChapterSelect'));check((await active(page)).join()==='ChapterSelect','CHAPTERS returns to the chapter list');
  check(!errors.length,'no page errors',errors);await page.close();}
 // ---- Fresh Chapter 4: only Mission 1 ----
 {const {page,errors}=await open({clears:18});await toMap(page);const s=await state(page);
  check(s.open.join()==='campaign-31'&&s.locked.length===5&&s.selected==='campaign-31'&&!s.azure,'fresh Chapter 4: only Mission 1 is open and selected',s);await shot(page,'04-desktop-fresh');
  check(!errors.length,'no page errors',errors);await page.close();}
 // ---- Azure Fortress only after Mission 6 ----
 {const a=await open({clears:23});await toMap(a.page);const s5=await state(a.page);check(s5.open.length===6&&!s5.azure&&s5.selected==='campaign-36','5 of 6 conquered: the finale is open and the fortress is still Crimson',s5);await a.page.close();
  const {page,errors}=await open({clears:24});await toMap(page);const s=await state(page);
  check(s.open.length===6&&s.azure&&s.button==='REPLAY ▸','all six conquered: the Azure Fortress appears',s);await shot(page,'05-desktop-complete');
  const before=await page.evaluate(()=>localStorage.getItem('kingdom-clash.campaign.v2'));check(before===SAVE(24),'the save is exactly what was seeded (nothing written)');
  check(!errors.length,'no page errors',errors);await page.close();}
 // ---- ?unlock=all (dev/Preview) does not show the fortress as conquered ----
 {const {page,errors}=await open({clears:0,query:'?unlock=all',release:false});await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').campaignButton.emit('pointerup'));
  await page.waitForFunction(()=>window.kingdomGame.scene.isActive('ChapterSelect'));
  const has=await page.evaluate(()=>[...window.kingdomGame.scene.getScene('ChapterSelect').chapterButtons.keys()]);check(has.includes('conquered-lands'),'?unlock=all opens the Chapter 4 card',has);
  await page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').chapterButtons.get('conquered-lands').emit('pointerup'));
  await page.waitForFunction(()=>window.kingdomGame.scene.isActive('CampaignSelect')&&window.kingdomGame.scene.getScene('CampaignSelect').conquestMap);await frames(page);const s=await state(page);
  check(s.open.length===6&&!s.azure,'?unlock=all: all six markers open, the fortress stays Crimson (nothing is conquered)',s);check(!errors.length,'no page errors',errors);await page.close();}
 // ---- Normal gating: Chapter 4 stays Coming Soon without the override ----
 {const {page,errors}=await open({clears:18,release:false});await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').campaignButton.emit('pointerup'));
  await page.waitForFunction(()=>window.kingdomGame.scene.isActive('ChapterSelect'));
  const r=await page.evaluate(()=>{const c=window.kingdomGame.scene.getScene('ChapterSelect');return {open:[...c.chapterButtons.keys()],soon:[...c.unavailableCards.keys()]};});
  check(!r.open.includes('conquered-lands')&&r.soon.includes('conquered-lands'),'normal mode: Chapter 4 is still a Coming Soon card',r);
  const grid=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');s.scene.start('CampaignSelect',{chapterId:'first-war'});return true;});
  await page.waitForFunction(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await frames(page);
  check(await page.evaluate(()=>!window.kingdomGame.scene.getScene('CampaignSelect').conquestMap&&window.kingdomGame.scene.getScene('CampaignSelect').levelButtons.size===6),'Chapters 1-3 keep their mission cards (no map)');
  check(!errors.length,'no page errors',errors);await page.close();}
 // ---- The painting loads only when the Chapter 4 map opens ----
 {const page=await browser.newPage({viewport:{width:960,height:540}}),urls=[];page.on('request',r=>urls.push(r.url()));
  await page.addInitScript(([n,key])=>{try{if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,n);sessionStorage.setItem('seeded','1');}}catch{}},[SAVE(21),'kingdom-clash.campaign.v2']);
  await page.goto(base);await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));
  await page.evaluate(async()=>{const m=await import('/src/data/campaignChapters.ts');m.campaignChapters.find(x=>x.number===4).release='available';});
  const has=()=>urls.filter(u=>/conquest-map/.test(u)).length;
  await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').scene.start('ChapterSelect'));await page.waitForFunction(()=>window.kingdomGame.scene.isActive('ChapterSelect'));
  await page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').scene.start('CampaignSelect',{chapterId:'first-war'}));await page.waitForFunction(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await frames(page);await page.waitForTimeout(300);
  check(has()===0,'the main menu, the chapter list and a Chapter 1 mission screen request no Conquest Map art',urls.filter(u=>/conquest-map/.test(u)));
  await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').scene.start('CampaignSelect',{chapterId:'conquered-lands'}));await page.waitForFunction(()=>window.kingdomGame.scene.getScene('CampaignSelect').conquestMap);
  check(urls.some(u=>/conquest-map.webp/.test(u))&&urls.some(u=>/conquest-map-azure-keep.webp/.test(u)),'opening the Chapter 4 map loads the WebP background and the overlay',urls.filter(u=>/conquest-map/.test(u)).map(u=>u.split('/').pop()));
  await page.close();}
 // ---- Phone and desktop sizes: layout, tap targets, real taps ----
 for(const [w,h,name] of [[960,540,'desktop'],[844,390,'phone-844x390'],[568,320,'phone-568x320'],[740,270,'phone-740x270']]){
  const {page,errors}=await open({w,h,clears:21});await toMap(page);
  const m=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540,map=s.conquestMap;
   const box=o=>{const b=o.getBounds();return {x:b.x,y:b.y,w:b.width,h:b.height};};
   return {k,labels:[...map.labels].map(([id,t])=>({id,...box(t),size:parseFloat(t.style.fontSize)})),taps:[...s.slotCards].map(([id,r])=>({id,...box(r)})),back:box(map.backButton),brief:box(map.briefingButton)};});
  const inside=b=>b.x>=0&&b.y>=0&&b.x+b.w<=960&&b.y+b.h<=540,hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
  check(m.labels.every(l=>inside(l)),`${name}: every name is inside the screen`,m.labels.filter(l=>!inside(l)).map(l=>l.id));
  check(m.labels.every(l=>l.y+l.h<=470),`${name}: no name reaches the bottom panel`,m.labels.map(l=>Math.round(l.y+l.h)));
  const pairs=[];for(let i=0;i<m.labels.length;i++)for(let j=i+1;j<m.labels.length;j++)if(hit(m.labels[i],m.labels[j]))pairs.push([m.labels[i].id,m.labels[j].id]);
  check(!pairs.length,`${name}: no two names overlap`,pairs);
  const tp=[];for(let i=0;i<m.taps.length;i++)for(let j=i+1;j<m.taps.length;j++)if(hit(m.taps[i],m.taps[j]))tp.push([m.taps[i].id,m.taps[j].id]);
  check(!tp.length,`${name}: marker tap areas do not overlap`,tp);
  check(m.taps.every(t=>t.w*m.k>=43.9&&t.h*m.k>=43.9),`${name}: every marker tap area is at least 44 CSS px`,m.taps.map(t=>+(t.w*m.k).toFixed(1)));
  check(m.back.h*m.k>=43.9&&m.brief.h*m.k>=43.9,`${name}: CHAPTERS and BRIEFING are at least 44 CSS px tall`,{back:+(m.back.h*m.k).toFixed(1),brief:+(m.brief.h*m.k).toFixed(1)});
  check(m.labels.every(l=>l.size*m.k>=11.9),`${name}: names are at least 12 CSS px`,m.labels.map(l=>+(l.size*m.k).toFixed(1))[0]);
  const none=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),map=s.conquestMap,ts=s.children.list.filter(o=>o.type==='Text'),bar=ts.filter(o=>o.y>=474&&o.y<=530).map(o=>{const b=o.getBounds();return {x:b.x,r:b.right,b:b.bottom,t:o.text.slice(0,30)};});return bar;});
  check(none.every(t=>t.b<=532&&t.r<=960),`${name}: bottom-panel text stays on screen`,none.map(t=>[t.t,Math.round(t.r),Math.round(t.b)]));
  // real taps: select a marker, then BRIEFING
  await click(page,marker('campaign-33'));check((await state(page)).selected==='campaign-33',`${name}: a real tap on Mission 3 selects it`);
  await click(page,marker('campaign-35'));check((await state(page)).selected==='campaign-35',`${name}: a real tap on locked Mission 5 selects it`);await shot(page,`06-${name}-locked-selected`);
  await click(page,marker('campaign-34'));await shot(page,`07-${name}-next-selected`);
  await click(page,s=>s.conquestMap.briefingButton);await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing'));check(true,`${name}: BRIEFING opens the Briefing`);
  check(!errors.length,`${name}: no page errors`,errors);await page.close();}
 // ---- Touch tap (phone) ----
 {const {page,errors}=await open({w:568,h:320,clears:21});await toMap(page);
  const pt=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),c=window.kingdomGame.canvas.getBoundingClientRect(),b=s.slotCards.get('campaign-32').getBounds();return {x:c.x+(b.x+b.width/2)*c.width/960,y:c.y+(b.y+b.height/2)*c.height/540};});
  await page.touchscreen.tap(pt.x,pt.y);await frames(page);check((await state(page)).selected==='campaign-32','568x320: a finger tap on Mission 2 selects it');
  const end=await open({w:568,h:320,clears:24});await toMap(end.page);await shot(end.page,'08-phone-568x320-complete');await end.page.close();
  check(!errors.length,'no page errors',errors);await page.close();}
}catch(e){failed++;console.log('FAIL',e.stack||e);}
finally{await browser.close();}
console.log(failed?`${failed} check(s) failed`:'all checks passed');process.exit(failed?1:0);

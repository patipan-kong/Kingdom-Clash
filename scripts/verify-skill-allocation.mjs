// Focused Slice 1 checks. XP/terminal fixtures are supplemental, not normal match evidence.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {clickGame,clickSkillControl} from './browser-coordinates.mjs';
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5184/?encounter=extended';
const root=process.env.EVIDENCE_ROOT||'test-results/phase2d-a1-polish';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
const checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
function check(ok,name){checks.push({name,passed:!!ok});assert.ok(ok,name);console.log(`PASS ${name}`);}
async function painted(){const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>f+2,f);}
async function snap(){return page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),s=b.simulation,h=g.scene.getScene('HUD');return {p:s.state.heroProgression,tick:s.clock.tick,timeScale:s.clock.timeScale,paused:s.clock.paused,hero:{x:s.hero.x,y:s.hero.y},menu:h.skillPanel.visible,entry:h.skillOpenLabel.text,xp:h.xpText.text,status:h.skillStatus.text,heading:h.skillHeading.text,buttons:h.skillButtons.map(v=>({skill:v.skill,label:[v.title.text,v.effect.text,v.label.text,v.action.text,v.cost.text].join(" "),enabled:v.hit.input.enabled})),controls:h.abilities.map(v=>({id:v.id,x:v.x,y:v.y,r:v.radius})),requests:window.learnRequests||0,listeners:g.events.listenerCount('skill-menu')};});}
const row=(s,k)=>s.buttons.find(b=>b.skill===k);
async function open(){await clickSkillControl(page,'open');await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').skillPanel.visible);await painted();}
async function close(){await clickSkillControl(page,'close');await page.waitForFunction(()=>!window.kingdomGame.scene.getScene('HUD').skillPanel.visible);await painted();}
async function learn(k){const before=await snap(),rank=k==='fortitude'?before.p.fortitude:before.p.ranks[k];await clickSkillControl(page,k);await page.waitForFunction(({k,rank})=>{const p=window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression;return (k==='fortitude'?p.fortitude:p.ranks[k])===rank+1;},{k,rank});await painted();}
async function level(n){await page.evaluate(n=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,p=s.state.heroProgression,total=k=>Array.from({length:k-1},(_,i)=>80+25*i).reduce((a,b)=>a+b,0);s.progression.award(`allocation-fixture-lv${n}`,total(n)-total(p.level)-p.xp);},n);await page.waitForFunction(n=>window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression.level===n,n);await painted();}
try{
 await page.goto(url);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD').skillOpenLabel);await painted();
 const initial=await snap();check(initial.p.level===1&&initial.p.skillPoints===1&&initial.entry==='Upgrade skills · 1'&&initial.xp==='XP 0 / 80','LV1 explicitly exposes the initial point without SP shorthand');
 const entryGeometry=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),r=h.skillOpen.getBounds(),scale=window.kingdomGame.canvas.getBoundingClientRect().height/540;return {w:r.width*scale,h:r.height*scale,bottom:r.bottom,top:r.top};});
 check(entryGeometry.w>=48&&entryGeometry.h>=48&&entryGeometry.bottom<=144,'Visible upgrade action meets mobile touch size and stays within Keep HP clearance');
 await clickGame(page,166,44);await painted();check(!(await snap()).menu,'The former invisible HP/XP allocation hotspot no longer opens skills');
 await open();let s=await snap();check(s.status.includes('Spend your point')&&s.heading.includes('1 skill point'),'Initial allocation explains the available point');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').skillPanel.list.some(v=>v.text?.includes('Combat continues'))),'Allocation explicitly says combat continues');
 check(row(s,'bash').label.includes('Shield Bash')&&row(s,'bash').label.includes('Stun one nearby enemy')&&row(s,'bash').label.includes('Rank 0/5')&&row(s,'bash').label.includes('Available LV1')&&row(s,'bash').label.includes('LEARN 1 point'),'Skill cards explain full name, effect, current rank, requirement and Learn');
 check(!row(s,'zone').enabled&&row(s,'zone').label.includes('Locked')&&row(s,'zone').label.includes('Available LV6'),'Ultimate is visibly locked until LV6');
 check(!row(s,'fortitude').enabled&&row(s,'fortitude').label.includes('Fortitude · Passive')&&row(s,'fortitude').label.includes('LV18 / LV20')&&row(s,'fortitude').label.includes('health and armor'),'Fortitude allocation is discoverable as a passive gated at LV18');
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,send=s.send;window.learnRequests=0;s.send=function(c){if(c.type==='learn')window.learnRequests++;return send.call(this,c);};});
 const titlePoint=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('HUD').skillButtons[0];return {x:b.title.x,y:b.title.y+10};});
 await clickGame(page,titlePoint.x,titlePoint.y);await painted();check((await snap()).requests===0,'Descriptive card area is not clickable; only the separate action spends points');
 await clickSkillControl(page,'zone');await clickSkillControl(page,'fortitude');await painted();check((await snap()).requests===0&&(await snap()).p.skillPoints===1,'Disabled actions do not submit requests or spend a point');
 const before=await snap();await page.keyboard.down('d');await page.waitForTimeout(350);await page.keyboard.up('d');s=await snap();check(s.tick>before.tick&&s.timeScale===1&&!s.paused&&s.hero.x===before.hero.x&&s.hero.y===before.hero.y,'Combat clock continues at normal speed while allocation clears and blocks hero input');
 await learn('bash');s=await snap();check(s.p.skillPoints===0&&s.entry==='Upgrade skills · 0'&&s.status.includes('Shield Bash rank 1 learned'),'Actual initial-point learning synchronizes rank, count and full-name feedback');
 check(!row(s,'bash').enabled&&row(s,'bash').label.includes('Next LV3')&&row(s,'bash').label.includes('Locked'),'Learned rank shows its next level gate');
 check(!row(s,'taunt').enabled&&row(s,'taunt').label.includes('No points'),'Eligible unlearned skill clearly distinguishes No points from Locked');
 const submitted=s.requests;await clickSkillControl(page,'taunt');await painted();check((await snap()).requests===submitted,'No-points UI does not send upgrade commands');
 await close();s=await snap();check(!s.menu&&s.timeScale===1&&!s.paused&&JSON.stringify(s.controls)===JSON.stringify(initial.controls),'Close restores combat access without moving buttons or changing time policy');
 await page.keyboard.down('d');await page.waitForTimeout(150);await page.keyboard.up('d');check((await snap()).hero.x>before.hero.x,'Movement works again after closing allocation');
 await level(2);await open();s=await snap();check(s.p.skillPoints===1&&row(s,'bash').label.includes('Locked')&&row(s,'taunt').enabled,'LV2 adds one point while retaining the LV3 next-rank gate');
 await level(3);s=await snap();check(row(s,'bash').enabled&&row(s,'bash').label.includes('UPGRADE 1 point'),'LV3 opens the learned skill Upgrade action');
 await learn('bash');check((await snap()).p.ranks.bash===2&&(await snap()).p.skillPoints===1,'Upgrade spends exactly one point and advances one rank');
 await level(6);s=await snap();check(row(s,'zone').enabled&&row(s,'zone').label.includes('LEARN 1 point'),'LV6 unlocks ultimate learning');
 await learn('zone');s=await snap();check(s.p.ranks.zone===1&&row(s,'zone').label.includes('Next LV11')&&!row(s,'zone').enabled,'Ultimate rank1 retains the LV11 next gate');
 await level(9);await learn('bash');await learn('bash');await learn('bash');s=await snap();check(s.p.ranks.bash===5&&!row(s,'bash').enabled&&row(s,'bash').label.includes('Max rank'),'Maximum rank is explicit and cannot be upgraded');
 const count=s.requests;await clickSkillControl(page,'bash');await painted();check((await snap()).requests===count,'Max-rank UI does not submit commands');
 await level(18);await learn('fortitude');s=await snap();check(s.p.fortitude===1&&!row(s,'fortitude').enabled&&row(s,'fortitude').label.includes('Next LV20'),'Fortitude rank1 learns at LV18 and exposes the LV20 gate');
 await level(20);await learn('fortitude');s=await snap();check(s.p.fortitude===2&&row(s,'fortitude').label.includes('Max rank')&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').hero.maxHp===2574),'Fortitude rank2 learns at LV20 with the existing HP formula');
 // Authoritative validation still rejects a command bypassing the presentation.
 await page.evaluate(()=>{window.allocationEvents=[];window.kingdomGame.events.on('simulation-event',e=>window.allocationEvents.push(e));window.kingdomGame.scene.getScene('Battle').simulation.send({type:'learn',requestId:'allocation-bypass-max',skill:'bash'});});
 await page.waitForFunction(()=>window.allocationEvents.some(e=>e.type==='rejected'&&e.reason==='Maximum skill rank'));check(true,'Authoritative simulation rejects a bypassed unavailable allocation');
 await close();
 for(const size of [{width:960,height:540},{width:844,height:390}]){
  await page.setViewportSize(size);await painted();await open();
  const geometry=await page.evaluate(()=>{
   const h=window.kingdomGame.scene.getScene('HUD'),scale=window.kingdomGame.canvas.getBoundingClientRect().height/540,f=h.skillFrame;
   const inside=(a,b)=>a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom;
   const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const items=h.skillButtons.map(b=>({card:b.card.getBounds(),hit:b.hit.getBounds(),text:[b.title,b.effect,b.label].map(t=>t.getBounds()),action:b.action.getBounds(),cost:b.cost.getBounds()}));
   const icons=h.skillPanel.list.filter(v=>v.type==='Image'&&v.texture.key.startsWith('ability-'));
   return {targets:[...items.map(v=>v.hit),h.skillClose.getBounds()].every(r=>r.width*scale>=48&&r.height*scale>=48),labels:items.every(v=>v.text.every((t,i)=>inside(t,v.card)&&!overlap(t,v.hit)&&v.text.slice(i+1).every(other=>!overlap(t,other)))&&inside(v.action,v.hit)),rows:items.every((a,i)=>items.slice(i+1).every(b=>!overlap(a.card,b.card))),bounds:f.x>=0&&f.y>=0&&f.x+f.width<=960&&(540-f.y-f.height)*scale>=24,noninteractive:h.skillButtons.every(b=>!b.card.input),icons:icons.length===4&&icons.every(icon=>items.every(item=>item.text.every(t=>!overlap(icon.getBounds(),t))))};
  });
  check(geometry.targets&&geometry.labels&&geometry.rows&&geometry.bounds,`${size.width}×${size.height}: targets, separated labels, card bounds and bottom gesture clearance`);
  check(geometry.noninteractive&&geometry.icons,`${size.width}×${size.height}: four original skill icons and non-interactive descriptive cards`);await close();
  for(const [id,x] of [['blue-base',0],['red-base',960]]){
   await page.evaluate(x=>{const b=window.kingdomGame.scene.getScene('Battle');b.cameras.main.stopFollow().setScroll(x,197);},x);await painted();
   const bar=await page.evaluate(id=>new Promise(resolve=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),c=b.cameras.main,r=b.hpBars.get(id).bar.getBounds(),h=b.keepHealth.get(id);g.renderer.snapshotPixel(Math.round(r.centerX-c.scrollX),Math.round(r.centerY-c.scrollY),p=>resolve({visible:h.container.visible,y:r.top-c.scrollY,r:p.red,g:p.green,b:p.blue,depth:h.container.depth}));}),id);
   const rgb=id==='blue-base'?[112,215,255]:[255,121,118];check(bar.visible&&bar.depth===2700&&bar.y>=144&&[bar.r,bar.g,bar.b].every((v,i)=>Math.abs(v-rgb[i])<=2),`${size.width}×${size.height}: ${id} actual HP fill remains visible above world objects`);
  }
 }
 // End through the existing damage path, then use the actual result Restart control.
 const listeners=(await snap()).listeners;
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');window.previousAllocationSimulation=b.simulation;b.simulation.hit(b.hero,b.simulation.state.bases['red-base'],99999,'direct');});
 await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await clickGame(page,480,350);
 await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation!==window.previousAllocationSimulation&&window.kingdomGame.scene.getScene('HUD').skillOpenLabel);await painted();s=await snap();
 check(s.p.level===1&&s.p.skillPoints===1&&s.p.fortitude===0&&Object.values(s.p.ranks).every(r=>r===0)&&!s.menu&&s.entry==='Upgrade skills · 1'&&s.listeners===listeners,'Actual UI Restart restores initial point, clean allocation state and stable listeners');
 await open();s=await snap();check(row(s,'bash').enabled&&!row(s,'fortitude').enabled&&s.status.includes('Spend your point'),'Restart leaves allocation discoverable and its actions freshly gated');
 check(errors.length===0,'No console, page or asset errors');
 // Finalization can verify without regenerating the manually approved screenshot.
 if(process.env.CAPTURE_SCREENSHOT!=='0'){
  await mkdir('docs/phase2d-a1',{recursive:true});await page.screenshot({path:'docs/phase2d-a1/skill-allocation-polished-844x390.png'});
 }
}catch(e){errors.push(e.stack||String(e));console.error(e);}
finally{await browser.close();await writeFile(`${root}/verification.json`,JSON.stringify({url,checks,errors,fixtures:'Levels use the existing Progression.award kernel; terminal fixture uses existing damage, then real UI Restart. No claim of normal extended-match XP.',screenshot:'docs/phase2d-a1/skill-allocation-polished-844x390.png'},null,2));}
if(errors.length)process.exitCode=1;

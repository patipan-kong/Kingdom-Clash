// Visible real-time Level 1 playthrough. All writes go through browser pointer/keyboard input.
// Simulation is read only: no hit(), advance(), send(), fixture, clock or state mutation.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.CAMPAIGN_EVIDENCE_ROOT||'test-results/s3-polish/playthrough';await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:960,height:540},recordVideo:{dir:root,size:{width:960,height:540}}});
const page=await context.newPage(),errors=[],samples=[],inputCounts={moves:0,attacks:0};page.on('pageerror',e=>errors.push(e.message));
const tap=async(scene,property,key)=>{const pt=await page.evaluate(({scene,property,key})=>{const g=window.kingdomGame,s=g.scene.getScene(scene),o=key===undefined?s[property]:s[property].get(key),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{scene,property,key});await page.mouse.click(pt.x,pt.y);};
let held=new Set(),lastProgress=-1,result;
try{
 await page.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5210/');await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));
 await tap('MainMenu','campaignButton');await page.waitForFunction(()=>window.kingdomGame.scene.isActive('CampaignSelect'));
 await tap('CampaignSelect','levelButtons','campaign-01');await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing'));await page.screenshot({path:root+'/briefing.png'});await page.waitForTimeout(1500);
 await tap('MissionBriefing','startButton');await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD').missionView);
 const initial=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return{hp:s.hero.hp,gold:s.state.gold,wood:s.state.wood,iron:s.state.iron,match:s.state.inventory.matchId};});
 const started=Date.now();
 while(Date.now()-started<300000){
  const s=await page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),s=b.simulation,h=g.scene.getScene('HUD'),hero=s.hero,foe=Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0&&Math.hypot(u.x-330,u.y-600)<420).sort((a,b)=>Math.hypot(a.x-hero.x,a.y-hero.y)-Math.hypot(b.x-hero.x,b.y-hero.y))[0],goal=foe??{x:540,y:600},a=h.abilities.find(a=>a.id==='attack'),r=g.canvas.getBoundingClientRect();return{ended:s.ended,paused:s.clock.paused,tick:s.clock.tick,hp:hero.hp,x:hero.x,y:hero.y,dx:goal.x-hero.x,dy:goal.y-hero.y,d:Math.hypot(goal.x-hero.x,goal.y-hero.y),stop:foe?65:20,progress:h.missionView.rows[0].progress,waves:s.state.spawnedWaves,keep:s.state.bases['blue-base'].hp,attack:{x:r.x+a.x*r.width/960,y:r.y+a.y*r.height/540}};});
  if(s.progress!==lastProgress){lastProgress=s.progress;samples.push(s);console.log('LIVE '+JSON.stringify(s));await page.screenshot({path:`${root}/wave-${s.progress}.png`});}
  if(s.ended)break;
  assert.equal(s.paused,false,'Visible playthrough must keep running');
  const next=new Set();if(s.hp>0&&s.d>s.stop){if(Math.abs(s.dx)>10)next.add(s.dx>0?'d':'a');if(Math.abs(s.dy)>10)next.add(s.dy>0?'s':'w');}
  for(const k of held)if(!next.has(k))await page.keyboard.up(k);for(const k of next)if(!held.has(k)){await page.keyboard.down(k);inputCounts.moves++;}held=next;
  if(s.hp>0){await page.mouse.click(s.attack.x,s.attack.y);inputCounts.attacks++;}
  await page.waitForTimeout(150);
 }
 for(const k of held)await page.keyboard.up(k);held.clear();
 await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible,{},{timeout:10000});
 result=await page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD');return{title:h.resultTitle.text,progress:h.missionView.rows[0].progress,result:b.simulation.state.match.result,listeners:{cast:g.events.listenerCount('cast'),simulation:g.events.listenerCount('simulation-event')}};});
 assert.equal(result.title,'VICTORY');assert.equal(result.progress,5);await page.screenshot({path:root+'/victory.png'});
 await tap('HUD','restartHit');await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.matchId==='match-2');
 const retry=await page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('Battle').simulation,h=g.scene.getScene('HUD');return{progress:h.missionView.rows[0].progress,hp:s.hero.hp,gold:s.state.gold,wood:s.state.wood,iron:s.state.iron,waves:s.state.spawnedWaves,tick:s.clock.tick,ended:s.ended,results:h.results.visible,listeners:{cast:g.events.listenerCount('cast'),simulation:g.events.listenerCount('simulation-event')}};});
 assert.equal(retry.progress,0);assert.equal(retry.waves,0);assert.equal(retry.hp,initial.hp);assert.equal(retry.ended,false);assert.equal(retry.results,false);assert.deepEqual(retry.listeners,result.listeners);assert.equal(retry.wood,initial.wood);assert.equal(retry.iron,initial.iron);assert.equal(retry.gold,initial.gold);
 await page.screenshot({path:root+'/retry-fresh.png'});await writeFile(root+'/report.json',JSON.stringify({passed:true,method:'Visible Chrome, real-time keyboard WASD and pointer Attack; Simulation read only',initial,result,retry,samples,inputCounts,errors},null,2));console.log('PASS real-control Level 1 victory → Retry '+JSON.stringify({result,retry,inputCounts}));
}catch(e){errors.push(e.stack||String(e));await page.screenshot({path:root+'/stopped.png'}).catch(()=>{});await writeFile(root+'/report.json',JSON.stringify({passed:false,result,samples,inputCounts,errors},null,2));console.error(e);process.exitCode=1;}
finally{for(const k of held)await page.keyboard.up(k).catch(()=>{});await context.close();await browser.close();}

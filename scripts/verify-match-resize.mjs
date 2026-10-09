import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {clickGame} from './browser-coordinates.mjs';
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5180/',root=process.env.EVIDENCE_ROOT||'test-results/phase2a-finalize/browser',variant=process.env.VERIFICATION_VARIANT||'development';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(url);await page.waitForFunction(()=>window.visualReady&&!!window.kingdomGame.scene.getScene('HUD').restartHit);
 const listeners=await page.evaluate(()=>window.kingdomGame.events.listenerCount('cast'));
 for(let i=0;i<6;i++){
  // Supplemental terminal fixture isolates resize/input; verify:match provides normal outcomes.
  await page.evaluate(i=>{const b=window.kingdomGame.scene.getScene('Battle');window.priorMatch=b.simulation;b.simulation.state.bases[i%2?'red-base':'blue-base'].hp=0;},i);
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);
  await page.setViewportSize({width:844,height:390});await page.setViewportSize({width:960,height:540});
  await clickGame(page,480,350);
  await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('Battle').simulation!==window.priorMatch&&!!window.kingdomGame.scene.getScene('HUD').restartHit&&window.kingdomGame.scene.isActive('HUD'));
  const fresh=await page.evaluate(n=>{const g=window.kingdomGame,s=g.scene.getScene('Battle').simulation,h=g.scene.getScene('HUD');return s.state.match.phase==='playing'&&!h.results.visible&&g.events.listenerCount('cast')===n&&Math.abs(g.input.activePointer.x-480)<2&&Math.abs(g.input.activePointer.y-350)<2;},listeners);
  checks.push({name:`Immediate mobile/desktop resize and UI Restart ${i+1}`,passed:fresh});if(!fresh)throw new Error(checks.at(-1).name);
 }
}catch(e){errors.push(e.stack||String(e));}finally{await browser.close();await writeFile(`${root}/match-resize-${variant}.json`,JSON.stringify({url,checks,errors},null,2));}
console.log(JSON.stringify({url,checks:checks.length,errors},null,2));if(errors.length)process.exitCode=1;

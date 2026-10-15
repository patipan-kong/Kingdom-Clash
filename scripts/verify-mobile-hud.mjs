import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {clickGame,clickSkillControl} from './browser-coordinates.mjs';
const root='test-results/phase2d-a3/layout',url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5185/?encounter=extended';await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});const checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
function check(ok,name){checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);}
async function painted(){const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>f+2,f);}
async function hit(selector,index=0){const q=await page.evaluate(({selector,index})=>{const h=window.kingdomGame.scene.getScene('HUD'),o=selector==='build'?h.utilities[0]:selector==='closeBuild'?h.buildHits[3]:h.buildHits[index],r=(o.hit??o).getBounds();return {x:r.centerX,y:r.centerY};},{selector,index});await clickGame(page,q.x,q.y);await painted();}
async function size(width,height,safe=false){await page.setViewportSize({width,height});await page.evaluate(safe=>{const e=document.getElementById('game');for(const [k,v] of Object.entries({left:32,right:12,top:8,bottom:12})){if(safe)e.style.setProperty('--safe-'+k,v+'px');else e.style.removeProperty('--safe-'+k);}},safe);await page.waitForTimeout(150);await painted();}
try{
 await page.goto(url);await page.waitForFunction(()=>window.visualReady);await painted();
 for(const v of [[844,390,false],[960,540,false],[844,390,true],[960,540,true]]){
  await size(...v);
  await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');h.showCombatNotice('Tap to cast \u00b7 Drag to aim',6000);});await painted();
  const g=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=window.kingdomGame.scene.getScene('Battle'),rect=window.kingdomGame.canvas.getBoundingClientRect(),parent=document.getElementById('game').getBoundingClientRect(),s=rect.height/540;
   const overlap=(a,b)=>a.left<b.right-.01&&a.right>b.left+.01&&a.top<b.bottom-.01&&a.bottom>b.top+.01;
   const active=[h.joystickHit,...h.abilities.map(a=>a.hit),h.utilities[0].hit,h.pauseButton.hit,h.heroHit,h.skillOpen];
   const bounds=active.map(a=>a.getBounds()),names=[...h.abilities.slice(0,4).map(a=>a.nameLabel),...h.utilities.map(a=>a.label),h.attackLabel];
   const top=[h.hpText,h.levelText,h.xpText,h.objectiveText,h.waveText,h.goldText,h.woodText,h.ironText],notice=h.combatNotice.getBounds();
   return {touch:bounds.every(r=>r.width*s>=48-.01&&r.height*s>=48-.01)&&bounds.every((a,i)=>bounds.slice(i+1).every(b=>!overlap(a,b))),
    reserve:[...bounds.filter((_,i)=>i<7),...names.map(n=>n.getBounds())].every(r=>(540-r.bottom)*s>=24-.1),
    names:names.every(n=>n.style.backgroundColor==='#122d35ee'&&!n.input)&&names.every((a,i)=>names.slice(i+1).every(n=>!overlap(a.getBounds(),n.getBounds())))&&names.every(n=>bounds.every(r=>!overlap(n.getBounds(),r))),
    header:h.objectiveText.text==='Destroy Crimson Keep'&&parseFloat(h.hpText.style.fontSize)*s>=13.9&&parseFloat(h.levelText.style.fontSize)*s>=13.9&&parseFloat(h.xpText.style.fontSize)*s>=11.9&&top.every((a,i)=>top.slice(i+1).every(n=>!overlap(a.getBounds(),n.getBounds()))),
    feedback:notice.top>=h.topHudBottom&&bounds.every(r=>!overlap(notice,r))&&names.every(n=>!overlap(notice,n.getBounds())),
    safe:rect.left>=parent.left-.1&&rect.right<=parent.right+.1&&rect.top>=parent.top-.1&&rect.bottom<=parent.bottom+.1,
    clearance:Math.abs(h.topHudBottom-b.hudClearance)<.01&&h.topHudBottom>Math.max(...h.topPanels.map(p=>p.bottom),h.skillOpen.getBounds().bottom),
    unavailable:!h.utilities[1].unavailable&&h.utilities[1].hit.input.enabled&&h.utilities[1].label.text==='Shop'&&h.utilities[2].unavailable&&!h.utilities[2].hit.input.enabled&&h.utilities[2].label.text.includes('Soon'),
    geometry:{bounds,names:names.map(n=>({text:n.text,r:n.getBounds()})),top:top.map(t=>({text:t.text,r:t.getBounds()})),notice}};});
  const label=v[0]+'x'+v[1]+(v[2]?' unequal safe areas':'');if(!Object.entries(g).filter(([k])=>k!=='geometry').every(([,v])=>v))console.log(JSON.stringify(g));
  check(g.touch&&g.reserve&&g.names,label+': separate 48px targets, readable captions and 24px gesture reserve');check(g.header&&g.feedback,label+': survival hierarchy, permanent objective and unobstructed feedback');check(g.safe&&g.clearance&&g.unavailable,label+': safe-area FIT, actual Keep clearance, available Shop and unavailable Army');
  const ring=await page.evaluate(()=>new Promise(resolve=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),c=g.scene.getScene('HUD').controls.cancel;b.drawAim('charge',{x:c.x,y:c.y},true,{x:c.x+100,y:c.y});g.renderer.snapshotPixel(Math.round(c.x+c.radius),Math.round(c.y),p=>resolve({r:p.red,g:p.green,b:p.blue,fixed:b.cancelAim.scrollFactorX===0&&b.cancelAim.scrollFactorY===0}));}));
  check(ring.fixed&&ring.r>ring.g+30&&ring.r>ring.b+40,label+': rendered cancel ring uses the shared fixed viewport target');await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').drawAim('charge'));
  // World-space Keep health follows camera movement and remains above nearby world art.
  for(const [id,x] of [['blue-base',0],['red-base',960]]){
   await page.evaluate(x=>{const b=window.kingdomGame.scene.getScene('Battle');b.cameras.main.stopFollow().setScroll(x,197);},x);await painted();
   const bar=await page.evaluate(id=>new Promise(resolve=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),c=b.cameras.main,r=b.hpBars.get(id).bar.getBounds(),h=b.keepHealth.get(id);g.renderer.snapshotPixel(Math.round(r.centerX-c.scrollX),Math.round(r.centerY-c.scrollY),p=>resolve({visible:h.container.visible,y:r.top-c.scrollY,clearance:g.scene.getScene('HUD').topHudBottom,r:p.red,g:p.green,b:p.blue,depth:h.container.depth}));}),id);
   const rgb=id==='blue-base'?[112,215,255]:[255,121,118];check(bar.visible&&bar.depth===2700&&bar.y>=bar.clearance&&[bar.r,bar.g,bar.b].every((c,i)=>Math.abs(c-rgb[i])<=2),label+': '+id+' actual HP pixels visible after camera movement');
  }
  await clickSkillControl(page,'open');await painted();check(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),s=window.kingdomGame.canvas.getBoundingClientRect().height/540;return h.skillPanel.visible&&(540-(h.skillFrame.y+h.skillFrame.height+h.skillPanel.y))*s>=24-.01&&h.skillClose.getBounds().height*s>=47.9&&h.skillButtons.length===5;}),label+': Skills allocation fits above gesture area');await clickSkillControl(page,'close');await painted();
 }
 await size(844,390);await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.cameras.main.stopFollow().setScroll(0,197);});await painted();await hit('build');
 check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD');return b.buildingMode&&b.simulation.clock.timeScale===.25&&h.utilityPanel.visible;}),'Build retains actual mode and 0.25 simulation speed');
 await hit('action',0);
 // Present a valid authoritative wall placement through the actual world tap flow.
 const cell=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return {x:648-b.cameras.main.scrollX,y:600*.72-b.cameras.main.scrollY};});await clickGame(page,cell.x,cell.y);await painted();
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').placement?.kind==='wall'),'Actual world tap selects the construction cell');await hit('action',2);
 await page.waitForFunction(()=>Object.values(window.kingdomGame.scene.getScene('Battle').simulation.state.structures).some(s=>s.id.startsWith('built-')));check(await page.evaluate(()=>Object.values(window.kingdomGame.scene.getScene('Battle').simulation.state.structures).some(s=>s.kind==='wall'&&s.col===13&&s.row===12)),'Build confirmation reaches unchanged authoritative placement validation');
 await hit('action',3);check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return !b.buildingMode&&!b.placement&&b.simulation.clock.timeScale===1;}),'Build cancellation restores normal speed and clears placement');
 // Two review images, captured only after all geometry and regression checks pass.
 for(const v of [[844,390],[960,540]]){await size(...v);await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.cameras.main.stopFollow().setScroll(360,197);if(!b.simulation.state.heroProgression.ranks.charge){b.simulation.progression.award('a3-review',185);b.simulation.send({type:'learn',skill:'charge',requestId:'a3-review-learn'});}});await painted();await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.simulation.state.skills.ready.charge=b.simulation.clock.tick+90;window.kingdomGame.scene.getScene('HUD').showCombatNotice('No target in reach',6000);});await painted();await mkdir('docs/phase2d-a3',{recursive:true});if(process.env.CAPTURE_SCREENSHOT!=='0')await page.screenshot({path:'docs/phase2d-a3/hud-'+v[0]+'x'+v[1]+'.png'});}
 check(errors.length===0,'No browser console or page errors');
}catch(e){errors.push(e.stack||String(e));console.error(e);}finally{await browser.close();await writeFile(root+'/verification.json',JSON.stringify({checks,errors,fixtures:'Supplemental progression and cooldown setup for screenshots; actual placement, controls, camera and pixel checks.'},null,2));}if(errors.length)process.exitCode=1;

import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {clickSkillControl} from './browser-coordinates.mjs';
const root='test-results/phase2d-a3/top-polish';await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
function check(ok,name){checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);}
async function painted(){const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>f+2,frame);}
async function size(width,height,safe=false){await page.setViewportSize({width,height});await page.evaluate(safe=>{const e=document.getElementById('game');for(const [k,v] of Object.entries({left:32,right:12,top:8,bottom:12})){if(safe)e.style.setProperty('--safe-'+k,v+'px');else e.style.removeProperty('--safe-'+k);}},safe);await page.waitForTimeout(150);await painted();}
try{
 await page.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5185/?encounter=extended');await page.waitForFunction(()=>window.visualReady);await painted();
 for(const v of [[844,390,false],[960,540,false],[844,390,true],[960,540,true]]){
  await size(...v);const label=v[0]+'x'+v[1]+(v[2]?' safe areas':'');
  const geometry=await page.evaluate(()=>{
   const h=window.kingdomGame.scene.getScene('HUD'),b=window.kingdomGame.scene.getScene('Battle'),s=window.kingdomGame.canvas.getBoundingClientRect().height/540;
   const overlap=(a,b)=>a.left<b.right-.01&&a.right>b.left+.01&&a.top<b.bottom-.01&&a.bottom>b.top+.01;
   const hero=h.topPanels[0],match=h.topPanels[1],upgrade=h.skillOpen.getBounds();
   const text=[h.hpText,h.levelText,h.xpText,h.objectiveText,h.baseText,h.waveText,h.goldText,h.woodText,h.ironText];
   const samples=[];const p=b.simulation.state.heroProgression,original={level:p.level,xp:p.xp,hp:b.simulation.hero.hp,maxHp:b.simulation.hero.maxHp};
   for(const [level,xp,hp,maxHp] of [[1,0,1200,1200],[19,529,2462,2462],[19,529,0,2462],[20,0,2640,2640]]){
    Object.assign(p,{level,xp});Object.assign(b.simulation.hero,{hp,maxHp});h.observeSimulation();
    samples.push({level,values:text.map(t=>({text:t.text,r:t.getBounds()})),readable:text.every((a,i)=>text.slice(i+1).every(t=>!overlap(a.getBounds(),t.getBounds())))&&[h.hpText,h.xpText,h.levelText].every(t=>{const r=t.getBounds();return r.left>=hero.left&&r.right<=hero.right&&r.bottom<=hero.bottom;})});
   }
   Object.assign(p,{level:original.level,xp:original.xp});Object.assign(b.simulation.hero,{hp:original.hp,maxHp:original.maxHp});h.observeSimulation();
   const pause=h.pauseButton.hit.getBounds(),map={left:808,right:952,top:12,bottom:102};
   const canvas=window.kingdomGame.canvas.getBoundingClientRect(),parent=document.getElementById('game').getBoundingClientRect();
   return {samples,readable:samples.every(s=>s.readable)&&parseFloat(h.hpText.style.fontSize)*s>=14&&parseFloat(h.xpText.style.fontSize)*s>=12&&h.objectiveText.text==='Destroy Crimson Keep',
    touch:upgrade.height*s>=48&&upgrade.height*s<49&&upgrade.top>hero.bottom&&!overlap(upgrade,pause)&&!overlap(upgrade,map)&&!overlap(match,pause)&&!overlap(match,map),
    compact:hero.height===70&&match.height===128&&h.topHudBottom*s<((Math.max(118+Math.max(68,Math.ceil(48/s)),172)+8/s)*s)-18,
    safe:canvas.left>=parent.left-.1&&canvas.right<=parent.right+.1&&canvas.top>=parent.top-.1&&canvas.bottom<=parent.bottom+.1,
    clearance:Math.abs(b.hudClearance-h.topHudBottom)<.01&&Math.abs(h.topHudBottom-(Math.max(hero.bottom,match.bottom,upgrade.bottom,map.bottom,pause.bottom)+8/s))<.01,
    footprintCss:h.topHudBottom*s,upgradeCss:upgrade.height*s};
  });
  if(!geometry.readable||!geometry.touch||!geometry.compact||!geometry.safe||!geometry.clearance)console.log(JSON.stringify(geometry));
  check(geometry.readable,label+': HP, XP, level and objective readable through LV20 and respawn');
  check(geometry.touch&&geometry.compact&&geometry.safe&&geometry.clearance,label+': compact panels, 48px upgrade, Pause/map clearance and final dynamic bounds');
  await clickSkillControl(page,'open');await painted();check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').skillPanel.visible),label+': compact Upgrade Skills action opens approved allocation');await clickSkillControl(page,'close');await painted();
  for(const [id,x] of [['blue-base',0],['red-base',960]]){
   await page.evaluate(x=>window.kingdomGame.scene.getScene('Battle').cameras.main.stopFollow().setScroll(x,197),x);await painted();
   const pixel=await page.evaluate(id=>new Promise(resolve=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),c=b.cameras.main,bar=b.hpBars.get(id).bar.getBounds(),health=b.keepHealth.get(id);g.renderer.snapshotPixel(Math.round(bar.centerX-c.scrollX),Math.round(bar.centerY-c.scrollY),p=>resolve({visible:health.container.visible,y:bar.top-c.scrollY,clearance:g.scene.getScene('HUD').topHudBottom,rgb:[p.red,p.green,p.blue],depth:health.container.depth}));}),id);
   const expected=id==='blue-base'?[112,215,255]:[255,121,118];check(pixel.visible&&pixel.depth===2700&&pixel.y>=pixel.clearance&&pixel.rgb.every((n,i)=>Math.abs(n-expected[i])<=2),label+': '+id+' HP rendered clear of final HUD after camera movement');
  }
  await page.evaluate(()=>{const g=window.kingdomGame;g.events.emit('simulation-event',{type:'wave',index:1});g.events.emit('cast-feedback','No legal target in range / line of sight');});await painted();
  const notices=await page.evaluate(()=>new Promise(resolve=>{
   const g=window.kingdomGame,h=g.scene.getScene('HUD'),s=g.canvas.getBoundingClientRect().height/540,toast=h.toast.getBounds(),cast=h.combatNotice.getBounds();
   const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const controls=[h.skillOpen,h.pauseButton.hit,h.joystickHit,...h.abilities.map(a=>a.hit),...h.utilities.map(a=>a.hit)],captions=[h.attackLabel,...h.abilities.slice(0,4).map(a=>a.nameLabel),...h.utilities.map(a=>a.label)];
   const clear=[toast,cast].every(r=>r.top>=h.topHudBottom&&r.left>=0&&r.right<=960&&(540-r.bottom)*s>=24&&[...controls,...captions].every(o=>!overlap(r,o.getBounds())))&&!overlap(toast,cast);
   g.renderer.snapshotPixel(Math.round(toast.left+3),Math.round(toast.centerY),p=>resolve({clear,visible:h.toast.visible&&h.combatNotice.visible,rendered:p.blue>p.red&&p.green>p.red,text:h.toast.text,cast:h.combatNotice.text,toast,castBounds:cast}));
  }));
  if(!notices.clear||!notices.visible||!notices.rendered)console.log(JSON.stringify(notices)); check(notices.clear&&notices.visible&&notices.rendered&&notices.text==='Enemy wave 1'&&notices.cast==='No target in reach',label+': actual notification and cast feedback render outside controls and top HUD');
  Object.assign(checks.at(-1),{geometry,notices});
 }
 await size(844,390);await page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle');b.cameras.main.stopFollow().setScroll(960,197);g.events.emit('simulation-event',{type:'wave',index:1});g.events.emit('cast-feedback','No legal target in range / line of sight');});await painted();
 check(errors.length===0,'No browser console or page errors');
 if(process.env.CAPTURE_SCREENSHOT!=='0')await page.screenshot({path:'docs/phase2d-a3/hud-844x390.png'});
}catch(e){errors.push(e.stack||String(e));console.error(e);}finally{await browser.close();await writeFile(root+'/verification.json',JSON.stringify({checks,errors,fixtures:'Larger HP/XP values temporarily assigned for layout only; actual Upgrade taps, event listeners and renderer pixel checks. One final 844x390 image.'},null,2));}
if(errors.length)process.exitCode=1;

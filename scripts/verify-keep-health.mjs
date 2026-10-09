import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='docs/phase2c/keep-health-hotfix',checks=[],errors=[],evidence=[];
await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);};
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5182/';
async function load(){await page.goto(`${url}?encounter=extended`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.setPaused(true));}
async function pan(x,y){await page.evaluate(([x,y])=>{const b=window.kingdomGame.scene.getScene('Battle');b.cameras.main.stopFollow().setScroll(x,y);},[x,y]);await page.waitForTimeout(80);}
async function state(id){return page.evaluate(id=>{
 const g=window.kingdomGame,b=g.scene.getScene('Battle'),camera=b.cameras.main,v=b.visuals.get(id),info=b.keepHealth.get(id),bar=b.hpBars.get(id),bounds=bar.bar.getBounds();
 const keep=b.simulation.state.bases[id];
 return {id,hp:keep.hp,maxHp:keep.maxHp,team:keep.team,x:keep.x,y:keep.y,worldX:bounds.x,worldY:bounds.y,screenX:bounds.x-camera.scrollX,screenY:bounds.y-camera.scrollY,width:bounds.width,height:bounds.height,depth:info.container.depth,visible:info.container.visible,scrollX:camera.scrollX,scrollY:camera.scrollY,spriteX:v.x,spriteY:v.y,overlayX:info.container.x,markerScreenY:info.container.y-info.height-15-camera.scrollY,sceneOrder:g.scene.getScenes(true).map(s=>s.scene.key),parent:bar.bar.parentContainer===info.container};
},id);}
async function pixel(id){return page.evaluate(id=>new Promise(resolve=>{
 const g=window.kingdomGame,b=g.scene.getScene('Battle'),c=b.cameras.main,r=b.hpBars.get(id).bar.getBounds();
 g.renderer.snapshotPixel(Math.round(r.centerX-c.scrollX),Math.round(r.centerY-c.scrollY),p=>resolve({r:p.red,g:p.green,b:p.blue}));
}),id);}
function correct(p,team){const expected=team==='blue'?[112,215,255]:[255,121,118];return [p.r,p.g,p.b].every((v,i)=>Math.abs(v-expected[i])<=2);}
try{
 await load();
 for(const viewport of [{width:960,height:540},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(100);
  for(const [id,x] of [['blue-base',0],['red-base',960]]){
   for(const y of [0,197,254,289]){
    await pan(x,y);const r=await state(id),p=await pixel(id);evidence.push({viewport,...r,pixel:p});
    check(r.visible&&r.parent&&r.overlayX===r.spriteX&&r.markerScreenY>=144-.01&&r.screenY+r.height<540,`${viewport.width}×${viewport.height} ${id} pan ${y}: attached bar clears HUD and viewport`);
    check(correct(p,r.team),`${viewport.width}×${viewport.height} ${id} pan ${y}: actual rendered fill is unobscured`);
   }
  }
 }
 // Real attack commands: damage and effects use the original simulation and renderer.
 const combat=await page.evaluate(()=>{
  const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;
  const placed=b.setHeroPosition(1512,600);s.setPaused(false);s.send({type:'target',id:'red-base'});s.send({type:'attack'});
  for(let i=0;i<330;i++)s.advance(1000/30+.01);s.setPaused(true);
  return {placed,hp:s.state.bases['red-base'].hp,minions:Object.values(s.state.units).filter(u=>u.kind.startsWith('minion')).length,towers:Object.values(s.state.structures).length};
 });
 await page.waitForTimeout(80);await pan(960,197);
 const damaged=await state('red-base');
 check(combat.placed&&combat.hp<3000&&combat.hp>0&&combat.minions>0&&combat.towers===7&&Math.abs(damaged.width-94*combat.hp/3000)<.01,'Real combat updates Keep bar proportion with nearby original towers and wave minions');
 // Supplemental overlap fixture uses existing minion art and effect depth, without moving structures.
 await page.evaluate(()=>{
  const b=window.kingdomGame.scene.getScene('Battle'),r=b.hpBars.get('red-base').bar.getBounds();
  window.occluders=[b.add.image(r.centerX,r.centerY,'minion-red').setDepth(800).setDisplaySize(80,80),b.add.graphics().setDepth(2600).fillStyle(0xffffff).fillRect(r.x-20,r.y-20,140,50)];
 });
 check(correct(await pixel('red-base'),'red'),'Keep bar renders above overlapping minion art and combat effect depth');
 await page.evaluate(()=>{window.occluders.forEach(o=>o.destroy());const b=window.kingdomGame.scene.getScene('Battle');b.followHero();});
 await page.waitForTimeout(400);
 const followed=await state('red-base');check(followed.markerScreenY>=144-.01&&followed.overlayX===followed.spriteX&&correct(await pixel('red-base'),'red'),'Interpolated camera follow preserves Keep attachment and HUD clearance');
 // When a Keep is off screen, its bar must not become a detached fixed indicator.
 await pan(0,197);check(!(await state('red-base')).visible,'Offscreen Crimson Keep has no detached health indicator');
 await pan(960,197);check(!(await state('blue-base')).visible,'Offscreen Azure Keep has no detached health indicator');
 // Verify the fixed HUD still renders on top even under a supplemental overlap fixture.
 const hud=await page.evaluate(()=>new Promise(resolve=>window.kingdomGame.renderer.snapshotPixel(350,30,p=>resolve({r:p.red,g:p.green,b:p.blue}))));
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');window.hudProbe=b.add.rectangle(b.cameras.main.scrollX+350,b.cameras.main.scrollY+30,8,8,0xff00ff).setDepth(2700);});
 const hudWithProbe=await page.evaluate(()=>new Promise(resolve=>window.kingdomGame.renderer.snapshotPixel(350,30,p=>resolve({r:p.red,g:p.green,b:p.blue}))));
 // Existing panels are 93% opaque: the probe may contribute at most 7%.
 check(['r','g','b'].every(c=>Math.abs(hud[c]-hudWithProbe[c])<=20),'Fixed combat HUD renders above the Keep information layer');await page.evaluate(()=>window.hudProbe.destroy());
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');window.keepPriorSimulation=b.simulation;b.scene.restart();});
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation!==window.keepPriorSimulation&&window.kingdomGame.scene.getScene('Battle').keepHealth.size===2);
 await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.setPaused(true));await pan(960,197);
 const reset=await state('red-base');check(reset.hp===3000&&reset.width===94&&correct(await pixel('red-base'),'red'),'Restart rebuilds exactly two overlays with authoritative full health');
 check(errors.length===0,'No browser or console errors');
 // Only screenshot: Crimson Keep with its nearby Archer Towers at 844×390.
 await page.screenshot({path:`${root}/crimson-keep-844x390.png`});
 await writeFile(`${root}/verification.json`,JSON.stringify({url,checks,errors,combat,evidence},null,2));
 console.log(JSON.stringify({checks:checks.length,errors,combat},null,2));
}finally{await browser.close();}

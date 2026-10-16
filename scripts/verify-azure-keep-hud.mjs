// Integration check (Gameplay v0.4.1 + UI v0.4.2): the always-visible Azure Keep HP plate against the redesigned Shop, Equipment,
// Build and Skills panels, the fixed HUD controls and notices, safe-area insets, Guardian death, distant camera, pause and results.
// Also confirms the browser match runs the active Balance B. Usage: npm run dev -- --port 5196, then node scripts/verify-azure-keep-hud.mjs
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.KEEP_HUD_EVIDENCE_ROOT||'docs/integration-v041-v042';await mkdir(root,{recursive:true});
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5196/';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),checks=[],errors=[],warnings=[],measurements=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
async function ready(){await page.waitForFunction(()=>window.visualReady&&window.kingdomGame?.scene.getScene('HUD')?.skills);await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect(),b=g.scale.canvasBounds;return Math.abs(r.x-b.x)<1&&Math.abs(r.width-b.width)<1;});await frames(3);}
async function frames(n=2){const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([f,n])=>window.kingdomGame.loop.frame>=f+n,[f,n]);}
async function viewport(width,height,safe){await page.setViewportSize({width,height});await page.evaluate(safe=>{const p=document.getElementById('game');for(const [k,v] of Object.entries({left:32,right:12,top:8,bottom:12}))safe?p.style.setProperty('--safe-'+k,v+'px'):p.style.removeProperty('--safe-'+k);},safe);await page.waitForTimeout(200);await ready();}
async function tap(kind,id){const pt=await page.evaluate(({kind,id})=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),o=kind==='utility'?h.utilities.find(u=>u.id===id).hit:kind==='build'?h.buildHits[id]:kind==='shop'?h.shop.buttons.get(id)?.hit:kind==='skill'?h.skillOpen:kind==='skillClose'?h.skillClose:h.restartHit;if(!o?.visible)throw Error('hidden '+kind+'/'+id);const b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{kind,id});await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(90);await frames(2);}
// The plate (logical rect) against every visible HUD control, plate, notice and open panel; also its CSS size, safe-area containment and authoritative text.
async function geometry(label,extra={}){
 const m=await page.evaluate(()=>{
  const g=window.kingdomGame,h=g.scene.getScene('HUD'),b=g.scene.getScene('Battle'),s=g.canvas.getBoundingClientRect().height/540,c=g.canvas.getBoundingClientRect(),k=h.keepLayout,keep=b.simulation.state.bases['blue-base'];
  const plate={left:k.x,right:k.x+k.width,top:k.y,bottom:k.y+k.height},overlap=(a,q)=>a.left<q.right-.5&&a.right>q.left+.5&&a.top<q.bottom-.5&&a.bottom>q.top+.5;
  const rect=o=>{const r=o.getBounds();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};},box=f=>({left:f.x,right:f.x+f.width,top:f.y,bottom:f.y+f.height});
  const circle=(x,y,r)=>({left:x-r,right:x+r,top:y-r,bottom:y+r}),mf=h.mapFrame;
  const others={
   ...Object.fromEntries(h.abilities.map(a=>['ability:'+a.id,circle(a.x,a.y,a.hitRadius)])),
   ...Object.fromEntries(h.utilities.map(u=>['utility:'+u.id,circle(u.x,u.y,u.hitRadius)])),
   pause:circle(h.pauseButton.x,h.pauseButton.y,h.pauseButton.hitRadius),skillOpen:rect(h.skillOpen),joystick:rect(h.joystickHit),
   minimap:{left:mf.x-4,right:mf.x+mf.width+4,top:mf.y-4,bottom:mf.y+mf.height+4},matchPlate:{left:h.topPanels[0].x,right:h.topPanels[0].right,top:h.topPanels[0].y,bottom:h.topPanels[0].bottom},
  };
  for(const [n,o] of [['combatNotice',h.combatNotice],['toast',h.toast],['inspector',h.inspector]])if(o.visible&&o.text)others[n]=rect(o);
  if(h.shop.visible)others.shopPanel=box(h.shop.bounds);if(h.skillPanel.visible)others.skillsPanel=box(h.skills.bounds);if(h.utilityPanel.visible&&h.utilityMode==='Build')others.buildPanel=box(h.buildPanel.bounds);
  const hits=Object.entries(others).filter(([,o])=>overlap(plate,o)).map(([n])=>n);
  // The moved tap inspector must also stay clear of every control and panel.
  const inspectorHits=others.inspector?Object.entries(others).filter(([n,o])=>n!=='inspector'&&overlap(others.inspector,o)).map(([n])=>n):[];
  const parent=document.getElementById('game').getBoundingClientRect(),css={left:c.x+plate.left*s,right:c.x+plate.right*s,top:c.y+plate.top*s,bottom:c.y+plate.bottom*s};
  const visible=h.keepPlate.visible&&h.keepHpText.visible&&h.keepBar.visible&&h.keepLabel.visible&&h.keepPlate.alpha>0;
  // Display-list order: a later child of the same scene draws above. Pause overlay and results must draw over the plate.
  const order=o=>h.children.list.indexOf(o),aboveOrDepth=o=>o.depth>h.keepPlate.depth||order(o)>order(h.keepPlate);
  return{scale:s,plateCss:{x:+css.left.toFixed(1),y:+css.top.toFixed(1),width:+(css.right-css.left).toFixed(1),height:+(css.bottom-css.top).toFixed(1)},
   inSafeArea:css.left>=parent.left-.5&&css.right<=parent.right+.5&&css.top>=parent.top-.5&&css.bottom<=parent.bottom+.5,inCanvas:plate.left>=0&&plate.right<=960&&plate.top>=0&&plate.bottom<=540,
   hits,inspectorHits,checked:Object.keys(others),visible,text:h.keepHpText.text,expected:`${Math.ceil(Math.max(0,keep.hp))} / ${keep.maxHp}`,level:h.keepLevel,overlaysAbove:aboveOrDepth(h.overlay)&&aboveOrDepth(h.results),
   camera:{x:Math.round(b.cameras.main.scrollX),y:Math.round(b.cameras.main.scrollY)},heroHp:b.simulation.hero.hp};
 });
 measurements.push({label,...m,...extra});
 check(m.visible&&m.text===m.expected&&m.inCanvas&&m.inSafeArea&&m.hits.length===0&&m.inspectorHits.length===0&&Math.abs(m.plateCss.width-170)<1&&Math.abs(m.plateCss.height-30)<1&&m.overlaysAbove,
  `${label}: plate visible, authoritative ${m.text}, 170x30 CSS, inside safe area, clear of [${m.checked.join(',')}]${m.hits.length?' HITS '+m.hits.join(','):''}${m.inspectorHits.length?' INSPECTOR HITS '+m.inspectorHits.join(','):''}`);
 return m;
}
async function capture(name){if(process.env.CAPTURE_SCREENSHOT!=='0')await page.screenshot({path:`${root}/${name}.png`});}
const closePanels=()=>page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');if(h.shop.visible)h.shop.buttons.get('close')&&h.shop.hide?.();});
try{
 // Balance B is what the normal URL runs.
 await page.goto(base);await ready();
 const bal=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return{id:s.combat.id,encounter:s.state.encounter.id,hp:s.hero.hp,maxHp:s.hero.maxHp,keep:s.state.bases['red-base'].damage,azureKeep:s.state.bases['blue-base'].damage};});
 check(bal.id==='b'&&bal.encounter==='extended'&&bal.hp===980&&bal.maxHp===980&&bal.keep===17&&bal.azureKeep===0,'normal URL runs Balance B: '+JSON.stringify(bal));
 check(!warnings.some(w=>w.includes('dev override')),'normal URL logs no variant override');
 const overridePage=await browser.newPage();const ow=[];overridePage.on('console',m=>ow.push(m.text()));await overridePage.goto(base+'?combat=a');await overridePage.waitForFunction(()=>window.visualReady&&window.kingdomGame?.scene.getScene('Battle')?.simulation);
 const ov=await overridePage.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.combat.id);check(ov==='a'&&ow.some(t=>t.includes('dev override')&&t.includes('A: v0.4 baseline')),'dev-only ?combat=a override is explicit (console warning)');await overridePage.close();
 for(const [width,height,safe] of [[844,390,false],[960,540,false],[1280,720,false],[844,390,true],[960,540,true]]){
  await viewport(width,height,safe);const tag=`${width}x${height}${safe?' unequal-safe':''}`,file=`${width}x${height}${safe?'-safe':''}`;
  await page.goto(base);await ready();await page.evaluate(safe=>{const p=document.getElementById('game');for(const [k,v] of Object.entries({left:32,right:12,top:8,bottom:12}))safe?p.style.setProperty('--safe-'+k,v+'px'):p.style.removeProperty('--safe-'+k);},safe);await page.waitForTimeout(150);await ready();
  await geometry(tag+' idle near Keep');if(!safe||width===844)await capture(`keep-hud-idle-${file}`);
  // Inspector text (tap a structure) shares the area under the minimap.
  await page.evaluate(()=>window.kingdomGame.events.emit('inspect',{id:'red-base',name:'Crimson Keep',hp:'3000 / 3000',footprint:{columns:3,rows:3}}));await frames(3);await geometry(tag+' inspector open');
  if(width===960&&!safe)await capture('keep-hud-inspector-960x540');
  // Shop grid, Equipment, Build expanded and collapsed, Skills.
  await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').setHeroPosition(450,600));await tap('utility','shop');await geometry(tag+' Shop grid');if(!safe)await capture(`keep-hud-shop-${file}`);
  await tap('shop','equipment');await geometry(tag+' Equipment');await tap('utility','shop');
  await tap('utility','build');await geometry(tag+' Build expanded');if(!safe&&width!==1280)await capture(`keep-hud-build-${file}`);
  await tap('build',1);await geometry(tag+' Build collapsed (tower selected)');await tap('utility','build');
  await tap('skill');await geometry(tag+' Skills');if(!safe)await capture(`keep-hud-skills-${file}`);await tap('skillClose');
  // Guardian dead, camera on the Crimson side, Keep low: plate stays authoritative.
  await page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('Battle').simulation;s.hit({...s.hero,id:'probe-raider',kind:'minion-red',team:'red'},s.state.bases['blue-base'],2280,'direct');s.hit({...s.hero,id:'probe-killer',kind:'minion-red',team:'red'},s.hero,1e6,'direct');g.events.emit('focus-map',2900,600);});
  await frames(4);const dead=await geometry(tag+' Guardian dead, camera far, Keep low');check(dead.heroHp===0&&dead.level==='low'&&dead.camera.x>=900,'dead/far/low state reached '+JSON.stringify({hp:dead.heroHp,level:dead.level,camera:dead.camera}));
  if(!safe||width===844)await capture(`keep-hud-dead-far-low-${file}`);
 }
 // No fake healing: during live waves the displayed value never rises and always equals the simulation.
 await viewport(844,390,false);await page.goto(base);await ready();
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=0;s.hero.respawnTick=1e9;for(let i=0;i<2100;i++)s.advance(1000/30+.01);s.setTimeScale(2);});
 const samples=[];for(let i=0;i<60;i++){await frames(2);samples.push(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=window.kingdomGame.scene.getScene('Battle').simulation.state.bases['blue-base'];return{shown:+h.keepHpText.text.split(' / ')[0],actual:Math.ceil(b.hp)};}));}
 const drops=samples.filter((x,i)=>i&&x.shown<samples[i-1].shown).length;check(drops>0&&samples.every((x,i)=>x.shown===x.actual&&(i===0||x.shown<=samples[i-1].shown)),'unopposed waves: displayed Keep HP equals the simulation every sample and never rises ('+samples[0].shown+' -> '+samples.at(-1).shown+', '+drops+' drops)');
 // Pause and results draw above the plate.
 await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.setTimeScale(1));await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(true));await frames(3);await geometry('844x390 paused');await capture('keep-hud-paused-844x390');await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(false));
 await page.evaluate(()=>{window.kingdomGame.scene.getScene('Battle').simulation.state.bases['blue-base'].hp=0;});await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.ended);await frames(4);
 const end=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return{results:h.results.visible,text:h.keepHpText.text,level:h.keepLevel};});check(end.results&&end.text.startsWith('0 / ')&&end.level==='destroyed','Defeat results shown; plate reads 0 and destroyed '+JSON.stringify(end));await capture('keep-hud-defeat-844x390');
 await tap('restart');await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.matchId==='match-2');await frames(4);
 const again=await geometry('844x390 after restart');check(again.text==='3000 / 3000'&&again.level==='healthy','restart resets plate to full');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return s.combat.id==='b'&&s.hero.maxHp===980;}),'restarted match keeps Balance B');
 check(errors.length===0,'no browser errors '+JSON.stringify(errors));
}catch(e){errors.push(e.stack||String(e));console.error(e);await page.screenshot({path:`${root}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await writeFile(`${root}/keep-hud-verification.json`,JSON.stringify({url:base,checks,errors,measurements},null,1));}
console.log(`${checks.filter(c=>c.passed).length}/${checks.length} Azure Keep HUD integration checks passed`);

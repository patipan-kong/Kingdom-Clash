import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const phase=process.env.PAUSE_PHASE||'after',root=`docs/ui-polish-slice7/${phase}`;
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5207/?encounter=extended';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const checks=[],errors=[],measurements=[],semantics=[];
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
let page;
async function frames(){const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(frame=>window.kingdomGame.loop.frame>frame+2,frame);}
async function point(target){return page.evaluate(target=>{
 const g=window.kingdomGame,h=g.scene.getScene('HUD');
 const hit=target==='pause'?h.pauseButton.hit:target==='resume'?h.overlay.list.find(o=>o.input&&o.width<960):target==='attack'?h.abilities.find(a=>a.id==='attack').hit:target==='taunt'?h.abilities.find(a=>a.id==='taunt').hit:target==='build'?h.utilities[0].hit:h.buildHits[3];
 const b=hit.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};
 },target);}
async function press(target,mode){const p=await point(target);if(mode==='touch')await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await frames();}
async function state(){return page.evaluate(()=>{
 const g=window.kingdomGame,h=g.scene.getScene('HUD'),b=g.scene.getScene('Battle'),s=b.simulation;
 return{paused:h.paused,clockPaused:s.clock.paused,overlay:h.overlay.visible,tick:s.clock.tick,wave:h.waveText.text,timer:h.timerText.text,cooldown:s.remaining('taunt'),ready:s.state.skills.ready.taunt,hero:{x:s.hero.x,y:s.hero.y},casts:b.castCount,commands:s.commands.length,gameState:JSON.stringify(s.state),disabled:h.abilities.every(a=>a.disabled)&&h.utilities.every(u=>u.disabled),build:h.utilityPanel.visible&&h.utilityMode==='Build',scale:s.clock.timeScale};
 });}
async function geometry(tag){const m=await page.evaluate(()=>{
 const g=window.kingdomGame,h=g.scene.getScene('HUD'),r=g.canvas.getBoundingClientRect(),s=r.height/540,parent=document.getElementById('game').getBoundingClientRect(),f=h.pauseFrame;
 const hit=h.overlay.list.find(o=>o.input&&o.width<960),b=hit.getBounds(),texts=h.overlay.list.filter(o=>o.type==='Text'),overlap=(a,b)=>a.left<b.right-.2&&a.right>b.left+.2&&a.top<b.bottom-.2&&a.bottom>b.top+.2;
 return{panel:f?{width:f.width*s,height:f.height*s}:null,target:{width:b.width*s,height:b.height*s},inside:!f||f.x>=0&&f.y>=0&&f.x+f.width<=960&&f.y+f.height<=540,centered:!f||Math.abs(r.x+(f.x+f.width/2)*s-(parent.left+parent.width/2))<1&&Math.abs(r.y+(f.y+f.height/2)*s-(parent.top+parent.height/2))<1,textFits:!f||texts.every(t=>{const b=t.getBounds();return b.left>=f.x&&b.right<=f.x+f.width&&b.top>=f.y&&b.bottom<=f.y+f.height;}),textSeparate:texts.every((t,i)=>texts.slice(i+1).every(u=>!overlap(t.getBounds(),u.getBounds()))),fontCss:texts.map(t=>parseFloat(t.style.fontSize)*s),copy:texts.map(t=>t.text),interactive:h.overlay.list.filter(o=>o.input).length,decorative:h.overlay.list.filter(o=>o.type==='Graphics').every(o=>!o.input)};
 });measurements.push({tag,...m});
 if(phase==='after')check(m.inside&&m.centered&&m.textFits&&m.textSeparate&&m.target.height>=47.9&&m.target.width>=47.9&&Math.min(...m.fontCss)>=13.9&&m.interactive===2&&m.decorative&&m.copy.join('|')==='GAME PAUSED|Battle is on hold|RESUME BATTLE',tag+' centered compact panel, readable copy, 48px target and noninteractive decoration');
}
try{
 for(const [width,height,safe] of [[960,540,false],[844,390,false],[740,370,false],[844,390,true],[740,370,true]])for(const mode of ['mouse','touch']){
  const tag=`${width}x${height}${safe?'-safe':''}-${mode}`;page=await browser.newPage({viewport:{width,height},hasTouch:true});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame?.scene.getScene('HUD')?.overlay);
  await page.evaluate(safe=>{if(safe)for(const [key,value] of Object.entries({left:32,right:12,top:8,bottom:12}))document.getElementById('game').style.setProperty('--safe-'+key,value+'px');},safe);await page.waitForTimeout(200);await frames();
  // Supplemental legal progression fixture; start the cooldown with the real ability input.
  await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.progression.award('pause-input',245);s.send({type:'learn',skill:'taunt',requestId:'pause-learn'});});
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression.ranks.taunt===1);await frames();await press('taunt',mode);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.remaining('taunt')>0);
  check((await state()).cooldown>0,tag+' real learned ability starts authoritative cooldown');
  await press('pause',mode);const paused=await state();check(paused.paused&&paused.clockPaused&&paused.overlay&&paused.disabled,tag+' Pause control opens overlay and freezes simulation');
  await geometry(tag);if(mode==='touch')await page.screenshot({path:`${root}/pause-${width}x${height}${safe?'-safe':''}.png`});
  await page.waitForTimeout(300);const held=await state();
  check(held.tick===paused.tick&&held.gameState===paused.gameState&&held.wave===paused.wave&&held.timer===paused.timer,tag+' full simulation state and wave timer stay frozen');
  check(held.cooldown===paused.cooldown&&held.ready===paused.ready,tag+' active cooldown and deadline stay frozen');
  await page.keyboard.down('d');await press('attack',mode);await page.waitForTimeout(180);await page.keyboard.up('d');
  const joystick=await page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),r=g.canvas.getBoundingClientRect(),b=h.joystickHit.getBounds();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};});
  if(mode==='touch'){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...joystick,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:joystick.x+25,y:joystick.y,id:1}]});await page.waitForTimeout(100);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else{await page.mouse.move(joystick.x,joystick.y);await page.mouse.down();await page.mouse.move(joystick.x+25,joystick.y);await page.waitForTimeout(100);await page.mouse.up();}
  const blocked=await state();check(blocked.gameState===paused.gameState&&blocked.casts===paused.casts&&blocked.commands===paused.commands,tag+' keyboard, joystick and combat input cannot mutate paused state');
  await press('resume',mode);const resumed=await state();check(!resumed.paused&&!resumed.clockPaused&&!resumed.overlay&&resumed.scale===1,tag+' Resume dismisses overlay at normal speed');
  await page.waitForTimeout(220);const running=await state();check(running.tick>resumed.tick&&running.cooldown<paused.cooldown&&running.ready===paused.ready,tag+' timer and cooldown continue with the original deadline');
  await page.keyboard.down('d');await page.waitForTimeout(220);await page.keyboard.up('d');check((await state()).hero.x>running.hero.x,tag+' movement works after Resume');
  for(let cycle=0;cycle<3;cycle++){await press('pause',mode);check((await state()).paused,tag+' repeat '+cycle+' pauses');await press('resume',mode);check(!(await state()).paused&&!(await state()).overlay,tag+' repeat '+cycle+' resumes');}
  await page.keyboard.press('Space');await frames();check((await state()).paused,tag+' existing Space shortcut pauses');await page.keyboard.press('Space');await frames();check(!(await state()).paused,tag+' existing Space shortcut resumes');
  await press('build',mode);check((await state()).build,tag+' dismissed overlay leaves no invisible input blocker');await press('cancel',mode);check(!(await state()).build,tag+' underlying Cancel remains usable');
  semantics.push({tag,freeze:true,cooldown:true,inputBlocked:true,resume:true,cycles:3,space:true,cleanup:true});await page.close();
 }
 check(errors.length===0,'no browser JavaScript, asset or console errors');
 if(phase==='after'){const before=JSON.parse(await readFile('docs/ui-polish-slice7/before/verification.json','utf8'));check(JSON.stringify(before.semantics)===JSON.stringify(semantics),'all pause/resume semantic outcomes equal the pre-polish baseline');}
}catch(e){errors.push(e.stack||String(e));console.error(e);process.exitCode=1;await page?.screenshot({path:`${root}/failure.png`}).catch(()=>{});}
finally{await browser.close();await writeFile(`${root}/verification.json`,JSON.stringify({checks,errors,measurements,semantics,fixtures:'Actual mouse/touch Pause, Resume, ability, joystick and Build inputs; legal progression award/learn fixture to start a real Taunt cooldown; state equality while paused. No simulation source edits.'},null,2));}
console.log(`${checks.filter(c=>c.passed).length}/${checks.length} Pause checks passed (${phase})`);

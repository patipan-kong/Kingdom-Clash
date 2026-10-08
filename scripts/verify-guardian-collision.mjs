import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const variant=process.env.VERIFICATION_VARIANT||'development',before=process.env.CAPTURE_BEFORE==='1';
const dir=`docs/screenshots/guardian-collision/${variant}`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true}),errors=[],checks=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
function check(ok,name){checks.push({name,passed:!!ok});if(!ok)throw new Error(name);}
try{
 await page.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5180/');
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 await page.waitForFunction(()=>!!window.kingdomGame.scene.getScene('Battle').simulation.state.units['red-0-0']);
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,red=s.state.units['red-0-0'],blue=s.state.units['blue-0'];s.state.units={guardian:s.hero,[red.id]:red,[blue.id]:blue};s.state.spawnedWaves=2;b.setHeroPosition(740,600);Object.assign(blue,{x:800,y:600,speed:0,damage:0});Object.assign(red,{x:840,y:600,speed:0,damage:0});b.cameras.main.stopFollow().centerOn(820,432);b.following=false;window.samples=[];window.events=[];window.kingdomGame.events.on('simulation-event',e=>window.events.push(e));window.kingdomGame.events.on('poststep',()=>{const units=Object.values(s.state.units);window.samples.push({tick:s.clock.tick,hero:{x:s.hero.x,y:s.hero.y},distances:units.filter(u=>u!==s.hero).map(u=>({id:u.id,d:Math.hypot(u.x-s.hero.x,u.y-s.hero.y),minimum:u.radius+s.hero.radius})),render:units.every(u=>{const v=b.visuals.get(u.id);return v&&Math.abs(v.x-u.x)<1e-6&&Math.abs(v.y-u.y*.72)<1e-6;})});});});
 const box=await page.locator('canvas').boundingBox();const pointer=(x,y)=>({x:box.x+x*box.width/960,y:box.y+y*box.height/540});
 const start=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick);
 const p=pointer(104,447);await page.mouse.move(p.x,p.y);await page.mouse.down();const right=pointer(151,447);await page.mouse.move(right.x,right.y);
 if(before){await page.waitForFunction(()=>window.samples.some(s=>s.distances.some(d=>d.d<8)));await page.mouse.up();await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.setPaused(true));await page.waitForTimeout(100);await page.screenshot({path:`${dir}/before-overlap.png`});evidence.samples=await page.evaluate(()=>window.samples);}
 else{
  await page.waitForFunction(t=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>=t+30,start);await page.mouse.up();
  evidence.front=await page.evaluate(()=>({samples:window.samples,hero:window.kingdomGame.scene.getScene('Battle').simulation.hero,events:window.events}));
  check(evidence.front.samples.every(s=>s.distances.every(d=>d.d>=d.minimum-1e-6)),'Actual joystick cannot drive Guardian through allied/enemy ground footprints');
  check(evidence.front.hero.x>755,'Joystick responds while gently displacing allied contact');
  check(evidence.front.events.some(e=>e.type==='damage'&&e.sourceId.startsWith('red-'))&&evidence.front.events.some(e=>e.type==='damage'&&e.sourceId.startsWith('blue-')),'Collision verified during actual ongoing faction combat');
  await page.screenshot({path:`${dir}/after-contact.png`});
  const t=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick);await page.mouse.move(p.x,p.y);await page.mouse.down();const diagonal=pointer(140,411);await page.mouse.move(diagonal.x,diagonal.y);await page.waitForFunction(t=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>=t+18,t);await page.mouse.up();
  evidence.escape=await page.evaluate(()=>({hero:window.kingdomGame.scene.getScene('Battle').simulation.hero,samples:window.samples}));
  check(evidence.escape.hero.x>800&&evidence.escape.hero.y<560,'Diagonal joystick slides naturally around group without permanent lock');
  check(evidence.escape.samples.every(s=>s.distances.every(d=>d.d>=d.minimum-1e-6))&&evidence.escape.samples.every(s=>s.render),'All sampled world footprints remain separated and projected sprites match authoritative positions');
  await page.screenshot({path:`${dir}/after-around-group.png`});
  await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;const red=s.state.units['red-0-0'];s.state.units={guardian:s.hero,[red.id]:red};s.teleportHero(740,600);s.state.move={x:0,y:0};Object.assign(red,{x:900,y:600,speed:95,damage:18,hp:240,targetId:undefined,strike:undefined,decisionTick:0,readyTick:0});window.samples=[];window.events=[];});
  await page.waitForFunction(()=>window.events.some(e=>e.type==='damage'&&e.id==='guardian'));
  evidence.approach=await page.evaluate(()=>({samples:window.samples,events:window.events,hero:window.kingdomGame.scene.getScene('Battle').simulation.hero}));
  check(evidence.approach.samples.every(s=>s.hero.x===740&&s.hero.y===600&&s.distances.every(d=>d.d>=d.minimum-1e-6)),'Approaching enemy stops at melee reach without overlapping or pushing stationary Guardian');
  const attack=await page.evaluate(()=>{const a=window.kingdomGame.scene.getScene('HUD').abilities[4];return {x:a.x,y:a.y};});const hit=pointer(attack.x,attack.y);await page.mouse.click(hit.x,hit.y);
  await page.waitForFunction(()=>window.events.some(e=>e.type==='damage'&&e.sourceId==='guardian'));
  check(await page.evaluate(()=>window.events.some(e=>e.type==='damage'&&e.sourceId==='guardian'&&e.amount===80)),'Actual Attack button retains authoritative 80-damage melee combat');
  await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,r=s.state.units['red-0-0'];s.state.attacking=false;s.hero.strike=undefined;Object.assign(r,{x:800,y:600,speed:0,damage:0,hp:240,strike:undefined});window.samples=[];});
  const enemyTick=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(right.x,right.y);await page.waitForFunction(t=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>=t+20,enemyTick);await page.mouse.up();
  evidence.enemyContact=await page.evaluate(()=>window.samples);
  check(evidence.enemyContact.every(s=>s.distances.every(d=>d.d>=d.minimum-1e-6))&&evidence.enemyContact.at(-1).hero.x>760,'Joystick contact with enemy preserves separate ground footprints');
  await page.screenshot({path:`${dir}/after-enemy-contact.png`});
 }
 check(errors.length===0,'No browser runtime errors');
}catch(e){errors.push(e.stack||String(e));}finally{await browser.close();await writeFile(`docs/guardian-collision-${before?'before':variant}.json`,JSON.stringify({checks,errors,evidence},null,2));}
console.log(JSON.stringify({variant,before,checks,errors},null,2));if(errors.length)process.exitCode=1;

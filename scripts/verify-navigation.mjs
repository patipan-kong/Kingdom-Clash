import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5180/';
const variant=process.env.VERIFICATION_VARIANT||'development';
const dir=`${process.env.EVIDENCE_ROOT||'docs'}/screenshots/phase1c/${variant}`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true});
const checks=[],errors=[],lifecycle=[],evidence={};let closing=false;
browser.on('disconnected',()=>lifecycle.push({type:'disconnected',expected:closing,time:Date.now()}));
page.on('close',()=>lifecycle.push({type:'page-close',expected:closing,time:Date.now()}));
page.on('crash',()=>errors.push('Renderer crashed'));
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
function check(ok,name){checks.push({name,passed:!!ok});if(!ok)throw new Error(name);}
async function ready(){await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));}
async function record(){await page.evaluate(()=>{window.hudSamples=[];if(window.hudListener)window.kingdomGame.events.off('poststep',window.hudListener);window.hudListener=()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,h=window.kingdomGame.scene.getScene('HUD');window.hudSamples.push({tick:s.clock.tick,wood:s.state.wood,match:h.goldText.text===String(Math.floor(s.state.gold))&&h.woodText.text===String(Math.floor(s.state.wood))&&h.ironText.text===String(Math.floor(s.state.iron))});};window.kingdomGame.events.on('poststep',window.hudListener);window.combat=[];if(window.combatListener)window.kingdomGame.events.off('simulation-event',window.combatListener);window.combatListener=e=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;window.combat.push({...e,tick:s.clock.tick,hp:(s.state.units[e.id]??s.state.structures[e.id])?.hp});};window.kingdomGame.events.on('simulation-event',window.combatListener);});}
async function click(x,y){const r=await page.locator('canvas').boundingBox();await page.mouse.click(r.x+x/960*r.width,r.y+y/540*r.height);}
async function cell(col,row){const p=await page.evaluate(([c,r])=>{const b=window.kingdomGame.scene.getScene('Battle');return {x:(c+.5)*48-b.cameras.main.scrollX,y:(r+.5)*48*.72-b.cameras.main.scrollY};},[col,row]);await click(p.x,p.y);}
async function restart(){await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');window.previousSimulation=b.simulation;b.scene.restart();});await page.waitForFunction(()=>{const b=window.kingdomGame.scene.getScene('Battle');return window.visualReady&&b.simulation!==window.previousSimulation&&!!b.simulation.state.units['red-0-0']&&window.kingdomGame.scene.isActive('HUD');});}
try {
 await page.goto(url);await ready();await record();
 const initial=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return Object.values(s.state.units).filter(u=>u.kind==='minion-blue').map(u=>({id:u.id,x:u.x,hp:u.hp}));});
 check(initial.length===3,'Three approved allied minions are authoritative at startup');
 await page.waitForFunction(()=>window.combat.some(e=>e.type==='damage'&&e.sourceId.startsWith('blue-')&&e.id.startsWith('red-'))&&window.combat.some(e=>e.type==='damage'&&e.sourceId.startsWith('red-')&&e.id.startsWith('blue-')),null,{timeout:15000});
 evidence.normal=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,h=window.kingdomGame.scene.getScene('HUD');return {tick:s.clock.tick,attacking:s.state.attacking,units:Object.values(s.state.units),events:window.combat,allies:Object.values(s.state.units).filter(u=>u.kind==='minion-blue').map(u=>({id:u.id,x:u.x,hp:u.hp,sprite:b.visuals.has(u.id),bar:b.hpBars.has(u.id),map:h.unitDots.has(u.id)}))};});
 check(!evidence.normal.attacking&&evidence.normal.allies.some(u=>u.x>initial.find(v=>v.id===u.id).x+30),'Normal allies advance and fight with no player attack input');
 check(evidence.normal.allies.every(u=>u.sprite&&u.bar&&u.map),'Allied sprites, HP bars and minimap follow authoritative state');
 check(evidence.normal.events.some(e=>e.type==='damage'&&e.id.startsWith('blue-')&&e.hp<240),'Enemy damage visibly lowers authoritative allied HP');
 await page.waitForFunction(()=>window.hudSamples.length>=60);evidence.hud=await page.evaluate(()=>window.hudSamples);check(evidence.hud.every(s=>s.match)&&new Set(evidence.hud.map(s=>Math.floor(s.wood))).size>=2,'Post-step HUD observes exact authoritative resources across income boundaries');await page.screenshot({path:`${dir}/allied-combat-960x540.png`});
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await page.screenshot({path:`${dir}/allied-combat-844x390.png`});
 await page.setViewportSize({width:960,height:540});
 await click(770,46);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.paused);const paused=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return {tick:s.clock.tick,state:JSON.stringify(s.state),stats:JSON.stringify(s.navigation.stats)};});await page.waitForTimeout(250);
 check(await page.evaluate(v=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return s.clock.paused&&s.clock.tick===v.tick&&JSON.stringify(s.state)===v.state&&JSON.stringify(s.navigation.stats)===v.stats;},paused),'Pause freezes allied AI, navigation, HP and economy');
 await click(480,300);await page.waitForFunction(t=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>t,paused.tick);
 await page.waitForFunction(()=>window.combat.some(e=>e.type==='death'&&e.id.startsWith('blue-'))&&window.combat.some(e=>e.type==='death'&&e.id.startsWith('red-')),null,{timeout:40000});
 await page.waitForTimeout(100);
 evidence.deaths=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD');return window.combat.filter(e=>e.type==='death').map(e=>({event:e,state:!!b.simulation.state.units[e.id],sprite:b.visuals.has(e.id),hpBar:b.hpBars.has(e.id),minimap:h.unitDots.has(e.id),rewards:window.combat.filter(v=>v.type==='reward'&&v.id===e.id).length}));});
 check(evidence.deaths.every(d=>!d.state&&!d.sprite&&!d.hpBar&&!d.minimap&&d.rewards===(d.event.id.startsWith('red-')?1:0)),'Both faction deaths clean state/render/minimap with exact faction rewards');

 await restart();await record();
 // Controlled positioning only: subsequent construction, movement and damage run in the real renderer/clock.
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,e=s.state.units['red-0-0'];s.state.units={guardian:s.hero,[e.id]:e};s.state.spawnedWaves=2;b.setHeroPosition(450,600);e.x=820;e.y=600;e.targetId=undefined;e.strike=undefined;e.decisionTick=0;b.cameras.main.stopFollow().centerOn(450,432);b.following=false;});
 await page.waitForTimeout(100);evidence.beforeRoute=await page.evaluate(()=>{const n=window.kingdomGame.scene.getScene('Battle').simulation.navigation;return {version:n.version,route:n.routeFor('red-0-0')};});
 const build=await page.evaluate(()=>{const u=window.kingdomGame.scene.getScene('HUD').utilities[0];return {x:u.x,y:u.y};});
 await click(build.x,build.y);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').buildingMode);await click(352,371);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').buildKind==='wall');await cell(12,12);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').placement?.col===12&&window.kingdomGame.scene.getScene('Battle').placement?.row===12);await click(432,470);
 await page.waitForFunction(()=>!!window.kingdomGame.scene.getScene('Battle').simulation.state.structures['built-ui-1']);await click(552,470);
 await page.waitForFunction(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,e=s.state.units['red-0-0'];return Math.abs(e.y-600)>25;},null,{timeout:10000});
 await page.screenshot({path:`${dir}/wall-reroute-960x540.png`});
 await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.units['red-0-0'].x<560,null,{timeout:10000});
 // Routing can finish before construction on faster hosts; full HP is valid only after completion.
 await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.structures['built-ui-1'].progress===1,null,{timeout:10000});
 evidence.reroute=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return {tick:s.clock.tick,unit:s.state.units['red-0-0'],wall:s.state.structures['built-ui-1'],version:s.navigation.version,route:s.navigation.routeFor('red-0-0'),events:window.combat};});
 check(evidence.reroute.version>evidence.beforeRoute.version&&evidence.reroute.wall.hp===400&&evidence.reroute.unit.x<560,'Actual UI construction invalidates route; raider walks around full-HP Wall');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const blurTick=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick);await page.waitForTimeout(200);
 check(await page.evaluate(t=>{const b=window.kingdomGame.scene.getScene('Battle');return b.simulation.clock.paused&&b.simulation.clock.tick===t&&!b.buildingMode&&!b.simulation.state.attacking;},blurTick),'Background interruption freezes AI and clears controls/build placement');
 await click(480,300);

 await restart();await record();
 // Structures start through validated construction commands inside blue territory.
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,e=s.state.units['red-0-0'];s.state.units={guardian:s.hero,[e.id]:e};s.state.spawnedWaves=2;b.setHeroPosition(450,600);e.x=820;e.y=600;e.damage=80; // Fixture speeds the demonstration; headless checks use default 18 damage.
  s.send({type:'place',requestId:'seal-a',kind:'wall',col:12,row:12});s.send({type:'place',requestId:'seal-b',kind:'wall',col:12,row:11});});
 // This player-buildable barrier is surrounded with hostile fixture walls across the map to remove
 // alternate routes. All Wall HP/construction/death rules still use the authoritative systems.
 await page.waitForFunction(()=>Object.keys(window.kingdomGame.scene.getScene('Battle').simulation.state.structures).length===2);
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,template=s.state.structures['built-seal-a'];s.hero.hp=0;for(let row=0;row<24;row++){if(row===11||row===12)continue;const id=`seal-${row}`;s.state.structures[id]={...template,id,col:12,row,x:600,y:(row+.5)*48,hp:400,maxHp:400,progress:1,startTick:-60,completeTick:0};}const e=s.state.units['red-0-0'];e.targetId=undefined;e.strike=undefined;e.decisionTick=0;});
 await page.waitForFunction(()=>window.combat.some(e=>e.type==='damage'&&e.id.startsWith('built-seal-')),null,{timeout:12000});
 await page.screenshot({path:`${dir}/wall-breaching-960x540.png`});
 await page.waitForFunction(()=>window.combat.some(e=>e.type==='death'&&e.id.startsWith('built-seal-'))&&window.kingdomGame.scene.getScene('Battle').simulation.state.units['red-0-0'].x<550,null,{timeout:40000});
 await page.waitForTimeout(100);
 evidence.breach=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,h=window.kingdomGame.scene.getScene('HUD'),deaths=window.combat.filter(e=>e.type==='death'&&e.id.startsWith('built-seal-'));return {tick:s.clock.tick,unit:s.state.units['red-0-0'],events:window.combat,gold:s.state.gold,version:s.navigation.version,deaths:deaths.map(e=>({id:e.id,state:!!s.state.structures[e.id],sprite:b.visuals.has(e.id),bar:b.hpBars.has(e.id),map:h.unitDots.has(e.id)})),stats:s.navigation.stats};});
 check(evidence.breach.tick<360&&evidence.breach.unit.x<550&&evidence.breach.deaths.length===1&&evidence.breach.deaths.every(d=>!d.state&&!d.sprite&&!d.bar&&!d.map)&&evidence.breach.gold===250,'Sealed route breaches one enemy Wall, removes collision/render state and resumes with no reward');
 await page.screenshot({path:`${dir}/breach-resumed-960x540.png`});
 evidence.determinism=await page.evaluate(()=>{const C=window.kingdomGame.scene.getScene('Battle').simulation.constructor,a=new C(),b=new C();for(const s of [a,b])s.send({type:'place',requestId:'det',kind:'wall',col:12,row:12});for(let i=0;i<480;i++)a.advance(1000/30);for(let i=0;i<960;i++)b.advance(1000/60);return {equal:JSON.stringify(a.state)===JSON.stringify(b.state)&&JSON.stringify(a.drainEvents())===JSON.stringify(b.drainEvents())&&JSON.stringify(a.navigation.stats)===JSON.stringify(b.navigation.stats),stats:a.navigation.stats};});
 check(evidence.determinism.equal&&evidence.determinism.stats.maxPlansPerTick<=2&&evidence.determinism.stats.maxExpandedPerPlan<=960,'Browser-loaded simulation is deterministic with bounded navigation work');
 const listeners=await page.evaluate(()=>window.kingdomGame.events.listenerCount('cast'));
 await restart();await restart();
 check(await page.evaluate(n=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,h=window.kingdomGame.scene.getScene('HUD');return window.kingdomGame.events.listenerCount('cast')===n&&Object.keys(s.state.structures).length===0&&Object.values(s.state.units).filter(u=>u.kind==='minion-blue').length===3&&h.abilities.length===5&&s.state.gold===250&&s.navigation.stats.plans<20;},listeners),'Two scene restarts reset routes, allied units, economy and listeners');
 check(errors.length===0,'No missing assets, page or console errors');
} catch(e){errors.push(e.stack||String(e));try{evidence.failure=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD');return {tick:s.clock.tick,state:s.state,stats:s.navigation.stats,build:b.buildingMode,placement:b.placement,kind:h.buildKind,reason:h.buildReason.text};});await page.screenshot({path:`${dir}/failure.png`});}catch{}try{evidence.serverStatus=(await fetch(url)).status;}catch(e){evidence.serverError=e.message;}}
finally {closing=true;await browser.close();await writeFile(`${process.env.EVIDENCE_ROOT||'docs'}/phase1c-verification-${variant}.json`,JSON.stringify({url,passed:errors.length===0,checks,errors,lifecycle,evidence},null,2));}
console.log(JSON.stringify({url,checks:checks.length,passed:errors.length===0,errors},null,2));if(errors.length)process.exitCode=1;

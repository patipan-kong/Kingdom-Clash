// Chapter 4 M1/M2 objective and notice check in the browser. Needs a dev server: HINT_URL=http://127.0.0.1:5281/ (levels open through ?debug=1&level=31|32).
// Walks uncaptured -> captured -> lost -> recaptured and reads the objective plate; strikes the shielded Keep to read the Shielded notice and its 8 s cooldown; reads the capture notice (the Ballista hint only in M2).
// Stills go to HINT_EVIDENCE (default docs/screenshots/objective-hints). EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.HINT_URL||'http://127.0.0.1:5281/',dir=process.env.HINT_EVIDENCE||'docs/screenshots/objective-hints';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(level,viewport){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=${level}`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 await page.waitForFunction(()=>{const r=window.kingdomGame.canvas.getBoundingClientRect();return Math.abs(r.width/r.height-960/540)<.2;});
 // Record every general notice the HUD is asked to show.
 await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');h.told=[];const t=h.tell.bind(h);h.tell=(m,...a)=>{h.told.push(m);return t(m,...a);};});
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
const step=(page,ticks)=>page.evaluate(ticks=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,end=s.clock.tick+ticks;while(s.clock.tick<end&&!s.ended)s.advance(1000/30+.01);for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);b.syncUnits();},ticks);
const objective=async page=>{await frames(page);return page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').waveText.text);};
const told=page=>page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').told.slice());
const clearTold=page=>page.evaluate(()=>{window.kingdomGame.scene.getScene('HUD').told.length=0;});
const strike=page=>page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.hit(s.hero,s.state.bases['red-base'],10,'physical');for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);});
const takeCamp=page=>page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,st=s.state,c=s.setup.post;for(const id of ['blue-0','blue-1','blue-2']){const u=st.units[id];if(u){u.x=700;u.y=300;}}for(const id of ['red-hero',...c.holders])s.hit(s.hero,st.units[id]??st.structures[id],1e7,'direct');s.teleportHero(c.flag.x,c.flag.y+72);});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

for(const [level,label,camp,hint] of [[31,'M1','Forest Camp',false],[32,'M2','Cliff Camp',true]]){
 for(const [viewport,vname] of [[{width:960,height:540},'desktop'],[{width:844,height:390},'phone']]){
  const {page,errors}=await open(level,viewport),tag=`${label} ${vname}`,pre=`${label.toLowerCase()}-${vname}`;
  await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e6;s.state.bases['blue-base'].invulnerable=true;window.kingdomGame.scene.pause('Battle');});
  await step(page,2);
  check((await objective(page)).trim()===`Capture the ${camp}`,`${tag}: uncaptured objective`,await objective(page));
  await shot(page,`${pre}-1-uncaptured`);
  // Shield feedback: two strikes a second apart give one notice; after 8 s a third gives another.
  await clearTold(page);await strike(page);await step(page,30);await strike(page);await frames(page);
  let t=await told(page);
  check(t.length===1&&t[0]===`Keep Shielded! Capture the ${camp} first`,`${tag}: shield notice once for repeated hits`,t);
  await shot(page,`${pre}-2-shielded`);
  await page.waitForFunction(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.elapsed>=h.shieldAlertAt;},null,{timeout:60000});await strike(page);await frames(page);t=await told(page);
  check(t.length===2&&t[1]===t[0],`${tag}: shield notice returns after the cooldown`,t.length);
  // Capture.
  await clearTold(page);await takeCamp(page);await step(page,130);
  check((await objective(page)).trim()==='Destroy the Crimson Keep',`${tag}: captured objective`,await objective(page));
  t=await told(page);
  const first=t.find(m=>/captured|Captured/.test(m));
  check(hint?t.filter(m=>m==='Camp Captured! Repair the Ballista to support your assault').length===1:(!t.some(m=>/Ballista/.test(m))&&/captured/.test(first??'')),`${tag}: capture notice${hint?' carries the Ballista hint once':' has no Ballista hint'}`,t);
  await shot(page,`${pre}-3-captured`);
  // A strike on the unshielded Keep gives no shield notice.
  await clearTold(page);await strike(page);await frames(page);check(!(await told(page)).some(m=>/Shielded/.test(m)),`${tag}: no shield notice once the camp is Azure`);
  // Lost: the Banner falls.
  await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;delete s.state.structures['c4-banner'];});
  await step(page,2);
  check((await objective(page)).trim()===`Recapture the ${camp}`,`${tag}: lost objective`,await objective(page));
  await shot(page,`${pre}-4-lost`);
  // Recaptured: the second capture is not "first", so no second Ballista hint.
  await clearTold(page);await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,c=s.setup.post;s.teleportHero(c.flag.x,c.flag.y+72);});await step(page,140);
  check((await objective(page)).trim()==='Destroy the Crimson Keep',`${tag}: recaptured objective`,await objective(page));
  check(!(await told(page)).some(m=>/Ballista/.test(m)),`${tag}: no Ballista hint on recapture`,await told(page));
  check(errors.length===0,`${tag}: no page errors`,errors);
  await page.close();
 }
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

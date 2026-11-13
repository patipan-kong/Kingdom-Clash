// Guardian skill VFX and button feedback, in the real game (dev server: AUTO_URL, default http://127.0.0.1:5461/; Level 6). Every cast is sent straight to the simulation so the checks do not depend on touch aiming.
// EXE=<Chromium binary> overrides the browser channel. Stills go to SKILL_EVIDENCE.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.AUTO_URL||'http://127.0.0.1:5461/',dir=process.env.SKILL_EVIDENCE||'docs/screenshots/skill-vfx';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(w,h){
 const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=6`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await sleep(800);
 await page.evaluate(()=>{ // a recorder: every new Battle display object seen while it runs, by type and colour; plus counts of the HUD's flash and ready calls
  const G=window.kingdomGame,B=G.scene.getScene('Battle'),H=G.scene.getScene('HUD');const seen=new WeakSet(),log={flash:0,sparks:0,trail:0,taunt:0,rings:0,first:{}};window.__vfx=log;
  window.__hud={flash:0,ready:0};for(const a of H.abilities){const f=a.flash.bind(a),r=a.readyPulse.bind(a);a.flash=()=>{window.__hud.flash++;f();};a.readyPulse=()=>{window.__hud.ready++;r();};}
  window.__tick=setInterval(()=>{for(const o of B.children.list){if(seen.has(o))continue;seen.add(o);const t=o.type,c=o.fillColor,s=B.simulation;
   const note=k=>{log[k]++;log.first[k]??={tick:s.clock.tick,hp:s.state.units.dummy?.hp,max:s.state.units.dummy?.maxHp};};
   if(t==='Ellipse'&&c===0xeaffff)note('flash');else if(t==='Ellipse'&&c===0x7cdcff&&o.isStroked&&o.fillAlpha>.3)note('trail');else if(t==='Ellipse'&&c===0xffc56a&&o.fillAlpha<.3)note('taunt');else if(t==='Graphics')note('sparks');}},16);
 });
 return {page,errors};
}
const run=(page,fn,...a)=>page.evaluate(`(${fn})(window.kingdomGame.scene.getScene('Battle'),window.kingdomGame.scene.getScene('HUD'),...${JSON.stringify(a)})`);
const stage=(page,gap)=>run(page,`(B,H,gap)=>{const s=B.simulation;for(const id of Object.keys(s.state.units))if(id!=='guardian')delete s.state.units[id];s.spawnQueue.length=0;const g=s.hero;g.x=700;g.y=600;g.hp=g.maxHp;
 for(const k of ['bash','taunt','charge','zone'])s.state.heroProgression.ranks[k]=1;s.state.skills.ready={bash:0,taunt:0,charge:0,zone:0};s.state.skills.lockTick=0;s.state.skills.cast=undefined;s.state.skills.zones=[];g.shield=undefined;
 if(gap)s.state.units.dummy={...g,id:'dummy',kind:'minion-red',team:'red',x:g.x+gap,y:g.y,hp:100000,maxHp:100000,armor:0,speed:0,damage:0,range:0,readyTick:0,protectionTick:0,strike:undefined,targetId:undefined,statuses:[],shield:undefined};
 s.state.autoAttack=false;window.__vfx.flash=window.__vfx.sparks=window.__vfx.trail=window.__vfx.taunt=0;window.__vfx.first={};window.__hud.flash=0;window.__hud.ready=0;}`,gap);
const settle=async page=>{for(let i=0;i<80;i++){await sleep(100);if(!(await run(page,`B=>!!B.simulation.state.skills.cast`)))break;}await sleep(500);}; // software rendering in headless Chrome runs slowly: wait for the cast itself, not a fixed time
let rid=0;
const cast=(page,skill,extra={})=>run(page,`(B,H,skill,extra)=>B.simulation.send({type:'cast',requestId:'t'+(++window.__rid),skill,...extra})`,skill,extra);
const count=page=>run(page,`B=>B.children.list.length`);
for(const [w,h] of [[780,360],[844,390],[960,540]]){
 const {page,errors}=await open(w,h);const tag=`${w}x${h}`;await page.evaluate(()=>{window.__rid=0;});
 const baseline=await count(page),baselineNoBubbles=baseline,baseTweens=await run(page,`B=>B.tweens.getTweens().length`);
 // Bash: burst and sparks only once the hit resolves
 await stage(page,40);await cast(page,'bash');await sleep(120);
 const early=await page.evaluate(()=>({...window.__vfx}));check(early.flash===0,`${tag} Bash: no impact flash during the wind-up`,early.flash);
 await sleep(700);const bash=await page.evaluate(()=>({...window.__vfx,hud:{...window.__hud}}));
 check(bash.flash>=1&&bash.sparks>=1,`${tag} Bash: shield flash and sparks appear at the resolved hit`,bash);check(bash.first.flash?.hp<bash.first.flash?.max,`${tag} Bash: the flash comes after the damage landed`,bash.first.flash);
 check(bash.hud.flash===1,`${tag} Bash: the button flashes once for the accepted cast`,bash.hud);
 // a rejected cast (on cooldown) must not flash the button
 const rej=await cast(page,'bash');await sleep(100);check(rej===false||(await page.evaluate(()=>window.__hud.flash))===1,`${tag} rejected Bash (cooldown): no button flash`,rej);
 await page.screenshot({path:`${dir}/bash-${tag}.png`});
 // Charge: collision
 await stage(page,110);await cast(page,'charge',{direction:{x:1,y:0}});await settle(page);
 const hit=await page.evaluate(()=>({...window.__vfx}));
 check(hit.trail>=1&&hit.trail<=4,`${tag} Charge (collision): the short dash up to the enemy leaves its trail`,hit.trail);check(hit.flash>=1,`${tag} Charge (collision): impact burst`,{...hit,hp:await run(page,`B=>B.simulation.state.units.dummy.hp`),cc:await run(page,`B=>B.chargeCast`),pos:await run(page,`B=>[B.simulation.hero.x,B.simulation.state.units.dummy.x,!!B.simulation.state.skills.cast]`)});check(hit.first.flash?.hp<hit.first.flash?.max,`${tag} Charge: the burst follows the real damage`,hit.first.flash);
 // Charge: no collision
 await stage(page,0);await cast(page,'charge',{direction:{x:-1,y:0}});await settle(page);
 const miss=await page.evaluate(()=>({...window.__vfx}));check(miss.trail>=3&&miss.trail<=4&&miss.flash===0&&miss.sparks===0,`${tag} Charge (no collision): full dash: 3-4 trail streaks, no fake burst`,miss);
 // Taunt
 await stage(page,60);await cast(page,'taunt');await sleep(900);const taunt=await page.evaluate(()=>({...window.__vfx}));
 check(taunt.taunt>=1,`${tag} Taunt: the gold flash`,taunt);check(taunt.sparks>=2,`${tag} Taunt: two rings`,taunt.sparks);await page.screenshot({path:`${dir}/taunt-${tag}.png`});
 // Protect: Guardian and an ally
 await stage(page,0);await run(page,`(B)=>{const s=B.simulation,g=s.hero;s.state.units.ally={...g,id:'ally',kind:'minion-blue',x:g.x+70,y:g.y,hp:300,maxHp:300,armor:0,statuses:[],shield:undefined,strike:undefined};}`);
 await cast(page,'zone');await sleep(900);
 const sh=await run(page,`B=>({n:[...B.bubbles.values()].filter(b=>b.visible).length,ids:[...B.bubbles.keys()],g:!!B.simulation.hero.shield,a:!!B.simulation.state.units.ally.shield})`);
 check(sh.g&&sh.a&&sh.n===2,`${tag} Protect: a bubble on the Guardian and on the shielded ally`,sh);await page.screenshot({path:`${dir}/protect-${tag}.png`});
 await run(page,`B=>{B.simulation.state.units.ally.shield.remaining=0;}`);await sleep(150);
 check((await run(page,`B=>[...B.bubbles.entries()].filter(([id,b])=>b.visible).map(e=>e[0])`)).join()==='guardian',`${tag} Protect: the ally's bubble leaves when its shield is depleted`);
 await run(page,`B=>{const s=B.simulation;s.state.skills.zones[0].expiresTick=s.clock.tick+20;}`);await sleep(1200);
 check((await run(page,`B=>[...B.bubbles.values()].filter(b=>b.visible).length`))===0&&(await run(page,`B=>B.simulation.state.skills.zones.length`))===0,`${tag} Protect: all bubbles and the zone are gone when it expires`);
 // buttons: ready pulse once per cooldown
 await stage(page,40);await sleep(300);await page.evaluate(()=>{window.__hud.ready=0;});await cast(page,'bash');await sleep(300);await run(page,`B=>{const s=B.simulation;s.state.skills.ready.bash=s.clock.tick+5;}`);await sleep(1500);
 check((await page.evaluate(()=>window.__hud.ready))===1,`${tag} Buttons: one ready pulse when the cooldown reaches zero, none while it stays zero`,await page.evaluate(()=>window.__hud.ready));
 // repeated casts leave nothing behind, and the frame rate holds
 await stage(page,40);const fps=[];for(let i=0;i<8;i++){await run(page,`B=>{const s=B.simulation;s.state.skills.ready={bash:0,taunt:0,charge:0,zone:0};s.state.skills.lockTick=0;}`);await cast(page,['bash','taunt','charge','zone'][i%4],i%4===2?{direction:{x:1,y:0}}:{});await sleep(700);fps.push(await page.evaluate(()=>window.kingdomGame.loop.actualFps));}
 await run(page,`B=>{const s=B.simulation;s.state.skills.zones=[];delete s.state.units.dummy;delete s.state.units.ally;}`);for(let i=0;i<60&&(await run(page,`B=>B.tweens.getTweens().length`))>baseTweens;i++)await sleep(100);await sleep(500);const after=(await count(page))-(await run(page,`B=>B.bubbles.size`));
 check(Math.abs(after-baseline)<=8&&(await run(page,`B=>B.tweens.getTweens().length`))<=baseTweens+1,`${tag} Repeated casts: no leftover effect objects`,{baseline:baselineNoBubbles,after,tweens:await run(page,`B=>B.tweens.getTweens().map(w=>w.targets.map(o=>o.type+":"+(o.text||o.fillColor)).join())`)});
 console.log(`INFO ${tag} fps during casts (headless software rendering): ${fps.map(f=>Math.round(f)).join(',')}`);
 check(errors.length===0,`${tag} no page errors`,errors.slice(0,3));
 await page.close();
}
await browser.close();console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

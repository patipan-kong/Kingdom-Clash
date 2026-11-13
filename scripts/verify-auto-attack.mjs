// Auto Attack + the simplified Guardian controls, in the real game on phone-landscape canvases (Galaxy S24 is 780x360 CSS px).
// Needs a dev server: AUTO_URL=http://127.0.0.1:5461/ (the mission opens through the dev-only ?debug=1&level=N; Level 6 has the Shop). Stills go to AUTO_EVIDENCE.
// EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.AUTO_URL||'http://127.0.0.1:5461/',dir=process.env.AUTO_EVIDENCE||'docs/screenshots/auto-attack',level=process.env.AUTO_LEVEL||'6';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(w,h){
 const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=${level}`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.waitForTimeout(800);
 return {page,errors};
}
const sim=(page,fn,...a)=>page.evaluate(`(${fn})(window.kingdomGame.scene.getScene('Battle').simulation,window.kingdomGame.scene.getScene('HUD'),...${JSON.stringify(a)})`);
// Park the Guardian and put one harmless, very sturdy Crimson minion 'gap' px away; returns its id. Nothing else can change its HP.
const stage=(page,gap)=>sim(page,`(s,h,gap)=>{for(const id of Object.keys(s.state.units))if(id!=='guardian')delete s.state.units[id];s.spawnQueue.length=0;const g=s.hero;g.x=700;g.y=600;g.hp=g.maxHp;
 s.state.units.dummy={...g,id:'dummy',kind:'minion-red',team:'red',x:g.x+gap,y:g.y,hp:100000,maxHp:100000,armor:0,speed:0,damage:0,range:0,readyTick:0,protectionTick:0,strike:undefined,targetId:undefined};return 'dummy';}`,gap);
const hp=page=>sim(page,`s=>s.state.units.dummy.hp`);
const heroAt=page=>sim(page,`s=>({x:s.hero.x,y:s.hero.y,auto:s.state.autoAttack,tick:s.clock.tick})`);
async function sustained(page,what){const a=await hp(page);await page.waitForTimeout(3500);const b=await hp(page);check(b<a,`${what}: the Guardian keeps swinging by himself`,{before:a,after:b});}

for(const [w,h] of [[780,360],[844,390],[960,540]]){
 const {page,errors}=await open(w,h);const tag=`${w}x${h}`;
 const m=await page.evaluate(()=>{const H=window.kingdomGame.scene.getScene('HUD'),c=window.kingdomGame.canvas.getBoundingClientRect(),s=c.height/540,ctl=H.controls;
  const label=H.autoLabel,b=label.getBounds();
  return {canvas:{w:c.width,h:c.height,x:c.x,y:c.y},ids:H.abilities.map(a=>a.id),label:{text:label.text,x:b.x*s,y:b.y*s,w:b.width*s,h:b.height*s,visible:label.visible,interactive:!!label.input},
   abilities:H.abilities.map(a=>({id:a.id,x:a.x*s,y:a.y*s,r:a.hitRadius*s})),joy:{x:ctl.joystick.x*s,y:ctl.joystick.y*s,r:ctl.joystick.radius*s},utilities:ctl.utilities.map(u=>({id:u.id,x:u.x*s,y:u.y*s,r:u.hitRadius*s})),
   texts:H.children.list.filter(o=>o.type==='Text'&&/^attack/i.test(o.text||'')).map(o=>o.text)};});
 check(m.ids.join()==='bash,taunt,charge,zone',`${tag}: the Guardian controls are the four skills, no Attack disc`,m.ids);
 check(m.texts.length===0,`${tag}: no 'Attack' label remains`,m.texts);
 check(m.label.text==='AUTO ATK'&&m.label.visible&&!m.label.interactive,`${tag}: a non-interactive AUTO ATK status`,m.label);
 const inside=m.label.x>=0&&m.label.y>=0&&m.label.x+m.label.w<=m.canvas.w&&m.label.y+m.label.h<=m.canvas.h;check(inside,`${tag}: the status label is inside the canvas`);
 const overlap=m.abilities.filter(a=>{const cx=Math.max(m.label.x,Math.min(a.x,m.label.x+m.label.w)),cy=Math.max(m.label.y,Math.min(a.y,m.label.y+m.label.h));return Math.hypot(a.x-cx,a.y-cy)<a.r;});
 check(overlap.length===0,`${tag}: the status label does not cover any skill button`,overlap);
 check(m.abilities.every(a=>a.x-a.r>=0&&a.x+a.r<=m.canvas.w&&a.y-a.r>=0&&a.y+a.r<=m.canvas.h),`${tag}: every skill button fits on screen`);
 check(m.abilities.every(a=>a.r*2>=44),`${tag}: skill touch targets are at least 44 CSS px`,m.abilities.map(a=>Math.round(a.r*2)));
 check(m.abilities.every(a=>Math.hypot(a.x-m.joy.x,a.y-m.joy.y)>a.r+m.joy.r)&&m.utilities.every(u=>Math.hypot(u.x-m.joy.x,u.y-m.joy.y)>u.r+m.joy.r*0.5),`${tag}: nothing overlaps the joystick`);
 await page.screenshot({path:`${dir}/hud-${tag}.png`});

 // Behaviour in the real scene. Nothing is pressed.
 await stage(page,40);check((await heroAt(page)).auto===true,`${tag}: Auto Attack is on at mission start`);
 await sustained(page,`${tag} idle, nothing pressed`);
 const p0=await heroAt(page);await stage(page,300);await page.waitForTimeout(3000);const p1=await heroAt(page);check(Math.abs(p1.x-700)<1&&Math.abs(p1.y-600)<1,`${tag}: no chase of an enemy 300 px away`,p1);check((await hp(page))===100000,`${tag}: and no swing at it`);
 // Menus: the fight must go on under Shop, Skills and Build.
 for(const [name,openJs,closeJs] of [['Shop',`(s,h)=>h.openShop()`,`(s,h)=>h.openShop()`],['Skills',`(s,h)=>h.openSkills()`,`(s,h)=>h.closeSkills()`],['Build',`(s,h)=>h.showUtility('Build')`,`(s,h)=>h.showUtility('Build')`]]){
  await stage(page,40);await sim(page,openJs);await page.waitForTimeout(400);
  const open=await sim(page,`(s,h)=>({shop:h.shop.visible,skills:h.skillPanel.visible,build:h.utilityPanel.visible,scale:s.clock.timeScale})`);
  check(name==='Shop'?open.shop:name==='Skills'?open.skills:open.build,`${tag}: ${name} is open`,open);
  const a=await hp(page);await page.waitForTimeout(8000);const b=await hp(page);check(b<a,`${tag}: Auto Attack keeps hitting while ${name} is open (time runs at ${open.scale}x)`,{before:a,after:b});
  await page.screenshot({path:`${dir}/${name.toLowerCase()}-${tag}.png`});
  await sim(page,closeJs);await page.waitForTimeout(400);await sustained(page,`${tag}: after ${name} closes`);
 }
 check(errors.length===0,`${tag}: no page errors`,errors.slice(0,3));
 await page.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

// Chapter 5 Phase 1A (docs/CHAPTER5_HERO_HUD.md): the Hero Command HUD in the browser with real touch taps at the Galaxy S24's landscape viewport (780x360 CSS, DPR 3), plus a 780x250 smoke run.
// Needs a dev server: HERO_URL=http://127.0.0.1:5371/ (levels open through the dev-only ?debug=1&level=N; Allied Heroes through ?allyTest=1). Stills go to HERO_EVIDENCE (default the OS temp dir).
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.HERO_URL||'http://127.0.0.1:5371/',dir=process.env.HERO_EVIDENCE||`${tmpdir()}/hero-hud`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(w,h,query){
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:w===780&&h===360?3:2,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&${query}`);
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:30000});
 await page.waitForTimeout(800);
 await page.evaluate(()=>{const G=window.kingdomGame;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;window.S.hero.hp=window.S.hero.maxHp=1e6;});
 return {ctx,page,errors};
}
// Each still as PNG (full quality) and JPEG (for sharing).
const shot=async(page,name)=>{await page.screenshot({path:`${dir}/${name}.png`});await page.screenshot({path:`${dir}/${name}.jpg`,type:"jpeg",quality:82});};
const frames=(page,n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
// Logical HUD px -> page CSS px.
const toPage=(page,x,y)=>page.evaluate(([x,y])=>{const c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {x:c.x+x*k,y:c.y+y*k};},[x,y]);
const tapLogical=async(page,x,y)=>{const p=await toPage(page,x,y);await page.touchscreen.tap(p.x,p.y);await frames(page,4);};
const hero=page=>page.evaluate(()=>({mode:H.heroState.mode,selected:H.heroState.selected??null,reason:H.heroReason?.text??null}));
const order=(page,id)=>page.evaluate(id=>JSON.parse(JSON.stringify(S.state.units[id]?.ally?.order??null)),id);
const slot=(page,i)=>page.evaluate(i=>{const b=H.heroBar.bounds[i];return b&&{x:b.centerX,y:b.centerY};},i);
const command=(page,k)=>page.evaluate(k=>{const q=H.heroBar.geometry.popover;return {x:q.x+k*(q.button.width+q.button.gap)+q.button.width/2,y:q.y+q.height/2};},k);
const chip=page=>page.evaluate(()=>{const p=H.heroBar.geometry.prompt;return {x:p.x+p.width-p.cancel,y:p.y+p.height/2};});
// A battlefield point (logical) inside the play area that picks nothing in Attack mode, and (for Defend) is open ground for the hero.
const emptyGround=(page,forDefend)=>page.evaluate(forDefend=>{const m=H.controls,top=H.guardianLayout.match.y+H.guardianLayout.match.height+40,id=H.heroState.selected??Object.keys(S.state.units).find(i=>i.startsWith('blue-h-'));
 for(let y=top;y<m.safe.bottom-120;y+=16)for(let x=m.safe.left+20;x<m.safe.right-20;x+=16){if(B.heroPick('attack',x,y).targetId)continue;if(forDefend){const p=B.heroPick('defend',x,y).point;if(S.allyOrderReason(id,{type:'defend',...p}))continue;}return {x,y};}return null;},forDefend);
// The drawn centre of an entity, in logical screen px.
const entityAt=(page,id)=>page.evaluate(id=>{const v=B.visuals.get(id),c=B.cameras.main;if(!v)return null;const b=v.getBounds();return {x:b.centerX-c.scrollX,y:b.centerY-c.scrollY};},id);
const select=async(page,i)=>{const p=await slot(page,i);await tapLogical(page,p.x,p.y);};
const choose=async(page,k)=>{const p=await command(page,k);await tapLogical(page,p.x,p.y);};
const tick=page=>page.evaluate(()=>S.clock.tick);
const waitTicks=async(page,n)=>{const t=await tick(page);await page.waitForFunction(([t,n])=>S.clock.tick>=t+n,[t,n],{timeout:10000});};

// 1. No Allied Heroes: Chapters 1-4 show no hero bar.
for(const q of ['level=1','level=34','level=36']){const {ctx,page,errors}=await open(780,360,q);await frames(page,6);
 const v=await page.evaluate(()=>({visible:H.heroBar.container.visible,heroes:Object.values(S.state.units).filter(u=>u.ally).length}));
 check(!v.visible&&v.heroes===0,`?debug=1&${q} (no Allied Heroes): no hero bar`,v);check(!errors.length,`?debug=1&${q}: no page errors`,errors.slice(0,3));await ctx.close();}

// 2. The full flow at the S24 fullscreen viewport.
{
 const {ctx,page,errors}=await open(780,360,'level=34&allyTest=1');
 // A scene with the Forward Gatehouse towers on screen: the Guardian in front of the gate, Crimson waves held back.
 await page.evaluate(()=>{S.encounter={...S.encounter,waves:[],continuous:false};B.setHeroPosition(930,560);B.syncUnits();});await waitTicks(page,20);
 const v=await page.evaluate(()=>({visible:H.heroBar.container.visible,slots:H.heroBar.bounds.length,orders:Object.values(S.state.units).filter(u=>u.ally).map(u=>u.ally.order.type)}));
 check(v.visible&&v.slots===3,'allyTest=1: the hero bar shows three portraits',v);
 const L=await page.evaluate(()=>{const s=H.heroBar.geometry.slots,b=H.heroBar.bounds;return s.map((p,i)=>Math.hypot(p.x-b[i].centerX,p.y-b[i].centerY));});
 check(L.every(d=>d<1),'portraits sit where heroBarLayout puts them',L);
 await shot(page,`780x360-1-bar`);
 const ids=await page.evaluate(()=>H.heroBar.slots.map(s=>s.id));

 await select(page,1);let s=await hero(page);check(s.mode==='menu'&&s.selected===ids[1],'tap portrait 2: popover open, hero 2 selected',s);
 await shot(page,`780x360-2-selected`);
 await choose(page,0);s=await hero(page);await waitTicks(page,3);let o=await order(page,ids[1]);check(s.mode==='idle'&&o?.type==='follow','Follow executes at once and closes the popover',{s,o});

 await select(page,1);await choose(page,1);s=await hero(page);check(s.mode==='attack','Attack: target mode',s);
 const g=await emptyGround(page,false);await tapLogical(page,g.x,g.y);s=await hero(page);check(s.mode==='attack'&&!!s.reason,'Attack: a tap on empty ground stays in target mode and says why',s);
 await shot(page,`780x360-3-attack-reason`);
 const barracks=await entityAt(page,'azure-barracks-0');
 if(barracks&&barracks.x>200&&barracks.y>150){await tapLogical(page,barracks.x,barracks.y);s=await hero(page);check(s.mode==='attack'&&/ally|enemy/i.test(s.reason??''),'Attack: a tap on an Azure building stays in target mode',s);}
 const before=await page.evaluate(()=>S.state.selectedTarget??null),tower=await entityAt(page,'c4-fwd-north');
 check(!!tower&&tower.x>0&&tower.x<960&&tower.y>0&&tower.y<540,'the Forward Gatehouse tower is on screen',tower);
 await shot(page,`780x360-4-attack-mode`);
 await tapLogical(page,tower.x,tower.y);s=await hero(page);await waitTicks(page,3);o=await order(page,ids[1]);
 const after=await page.evaluate(()=>S.state.selectedTarget??null);
 check(s.mode==='idle'&&o?.type==='attack'&&o.targetId==='c4-fwd-north','Attack: a tap on the tower orders the attack and exits target mode',{s,o});
 check(before===after,"the Guardian's own target is unchanged by the hero's pick",{before,after});

 await select(page,2);await choose(page,2);s=await hero(page);check(s.mode==='defend','Defend: target mode',s);
 await shot(page,`780x360-5-defend-mode`);
 const d=await emptyGround(page,true),dw=await page.evaluate(([x,y])=>B.heroPick('defend',x,y).point,[d.x,d.y]);await tapLogical(page,d.x,d.y);s=await hero(page);await waitTicks(page,3);o=await order(page,ids[2]);
 check(s.mode==='idle'&&o?.type==='defend'&&Math.hypot(o.x-dw.x,o.y-dw.y)<=48,'Defend: a tap on open ground orders the hold (snapped to a cell centre) and exits',{s,o,tapped:dw});
 await shot(page,`780x360-6-after-defend`);

 // Cancels: the chip, the selected portrait, Build, a skill button, Pause.
 const keep=await order(page,ids[0]);
 await select(page,0);await choose(page,1);const c=await chip(page);await tapLogical(page,c.x,c.y);s=await hero(page);check(s.mode==='idle'&&JSON.stringify(await order(page,ids[0]))===JSON.stringify(keep),'Cancel chip: leaves target mode, order unchanged',s);
 await select(page,0);await choose(page,1);await select(page,0);s=await hero(page);check(s.mode==='idle','The selected portrait is the cancel while targeting',s);
 await select(page,0);await choose(page,2);const build=await page.evaluate(()=>{const u=H.controls.utilities.find(u=>u.id==='build');return {x:u.x,y:u.y};});await tapLogical(page,build.x,build.y);
 s=await hero(page);const buildOpen=await page.evaluate(()=>H.utilityPanel.visible&&H.utilityMode==='Build');check(s.mode==='idle'&&buildOpen,'Opening Build cancels hero command mode',{s,buildOpen});
 await select(page,0);s=await hero(page);check(s.mode==='idle','While Build is open the portraits ignore taps',s);
 await tapLogical(page,build.x,build.y);
 await select(page,0);await choose(page,1);const atk=await page.evaluate(()=>{const a=H.controls.abilities.find(a=>a.id==='attack');return {x:a.x,y:a.y};});await tapLogical(page,atk.x,atk.y);s=await hero(page);check(s.mode==='idle','A skill / Attack button press cancels target mode',s);
 await select(page,0);await choose(page,1);const pause=await page.evaluate(()=>({x:H.pauseButton.hit.x,y:H.pauseButton.hit.y}));await tapLogical(page,pause.x,pause.y);s=await hero(page);check(s.mode==='idle','Pause cancels target mode',s);
 await page.evaluate(()=>H.setPause(false));await frames(page,4);

 // The joystick moves the Guardian in target mode, and target mode survives it.
 await select(page,0);await choose(page,1);
 const j=await page.evaluate(()=>H.controls.joystick),from=await page.evaluate(()=>({x:S.hero.x,y:S.hero.y}));
 const jp=await toPage(page,j.x,j.y),jr=await toPage(page,j.x-j.travel,j.y); /* west: the open road (east is the Forward Gatehouse) */await page.mouse.move(jp.x,jp.y);await page.mouse.down();await page.mouse.move(jr.x,jr.y,{steps:4});await page.waitForTimeout(700);
 const moved=await page.evaluate(f=>Math.hypot(S.hero.x-f.x,S.hero.y-f.y),from);s=await hero(page);await page.mouse.up();await frames(page,3);
 check(moved>40&&s.mode==='attack','The joystick still moves the Guardian while a hero is in target mode',{moved:Math.round(moved),mode:s.mode});
 // A drag on the map pans the camera in target mode; leaving the mode returns it to the Guardian.
 const g2=await emptyGround(page,false),scroll0=await page.evaluate(()=>B.cameras.main.scrollX),a0=await toPage(page,g2.x,g2.y),a1=await toPage(page,g2.x-120,g2.y);
 await page.mouse.move(a0.x,a0.y);await page.mouse.down();await page.mouse.move(a1.x,a1.y,{steps:6});await page.mouse.up();await frames(page,4);
 const pan=await page.evaluate(s0=>({dx:B.cameras.main.scrollX-s0,following:B.following}),scroll0);s=await hero(page);
 check(Math.abs(pan.dx)>40&&s.mode==='attack','A drag on the map pans the camera and keeps target mode',{pan,mode:s.mode});
 const c2=await chip(page);await tapLogical(page,c2.x,c2.y);await frames(page,4);const back=await page.evaluate(()=>B.following);check(back,'Leaving target mode returns the camera to the Guardian',{following:back});

 // While the Guardian is down the heroes still take orders.
 await page.evaluate(()=>{S.hero.hp=S.hero.maxHp=1200;S.hit(S.state.bases['red-base'],S.hero,1e7,'direct');});await frames(page,3);
 await select(page,1);await choose(page,0);await waitTicks(page,3);o=await order(page,ids[1]);check(o?.type==='follow','Follow is accepted while the Guardian is down',o);
 check(!errors.length,'780x360: no page errors',errors.slice(0,3));
 await ctx.close();
}

// 3. The short layout (780x250, browser bars): the bar fits and one Defend round works.
{
 const {ctx,page,errors}=await open(780,250,'level=34&allyTest=1');
 await page.evaluate(()=>{S.encounter={...S.encounter,waves:[],continuous:false};});await waitTicks(page,20);
 const ids=await page.evaluate(()=>H.heroBar.slots.map(s=>s.id));
 await shot(page,`780x250-1-bar`);
 await select(page,2);await shot(page,`780x250-2-selected`);await choose(page,2);
 const d=await emptyGround(page,true);let s=await hero(page);check(s.mode==='defend'&&!!d,'780x250: Defend target mode, open ground found',{s,d});
 if(d){await tapLogical(page,d.x,d.y);await waitTicks(page,3);s=await hero(page);const o=await order(page,ids[2]);check(s.mode==='idle'&&o?.type==='defend','780x250: Defend ordered by a tap',{s,o});}
 await select(page,1);await choose(page,1);await shot(page,`780x250-3-attack-mode`);
 check(!errors.length,'780x250: no page errors',errors.slice(0,3));await ctx.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS',`(stills in ${dir})`);process.exit(failed?1:0);

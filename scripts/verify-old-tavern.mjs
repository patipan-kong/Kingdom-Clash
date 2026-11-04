// Chapter 5 M1 "The Old Tavern" (docs/CHAPTER5_M1.md): the mission in the browser with real touch taps at the Galaxy S24's landscape viewport (780x360 CSS, DPR 3).
// Needs a dev server: OLD_TAVERN_URL=http://127.0.0.1:5371/ (the dev-only ?debug=1&level=41 opens the mission). Stills go to OLD_TAVERN_EVIDENCE (default the OS temp dir).
// Gold is topped up through the economy when a step needs more than the mission's 50 (the bot tests cover the real income); capture is made by removing the watchtowers, the rest is real play.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.OLD_TAVERN_URL||'http://127.0.0.1:5371/',dir=process.env.OLD_TAVERN_EVIDENCE||`${tmpdir()}/old-tavern`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(w,h,query){
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:w===780&&h===360?3:2,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&${query}`);
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:30000});
 await page.evaluate(()=>{const G=window.kingdomGame;window.G=G;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;});
 return {ctx,page,errors};
}
const shot=async(page,name)=>{await page.screenshot({path:`${dir}/${name}.png`});await page.waitForTimeout(300);};
const frames=(page,n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const toPage=(page,x,y)=>page.evaluate(([x,y])=>{const c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {x:c.x+x*k,y:c.y+y*k};},[x,y]);
const tapLogical=async(page,x,y)=>{const p=await toPage(page,x,y);await page.touchscreen.tap(p.x,p.y);await frames(page,5);};
const tick=page=>page.evaluate(()=>S.clock.tick);
const waitTicks=async(page,n)=>{const t=await tick(page);await page.waitForFunction(([t,n])=>S.clock.tick>=t+n,[t,n],{timeout:90000});};
const centre=(page,expr)=>page.evaluate(e=>{const b=eval(e).getBounds();return {x:b.centerX,y:b.centerY};},expr);
const res=page=>page.evaluate(()=>({wood:S.economy.woodUnits/120,iron:S.economy.ironUnits/120,gold:S.state.gold}));
const texts=page=>page.evaluate(()=>H.children.list.flatMap(function f(o){return o.list?o.list.flatMap(f):[o];}).filter(o=>typeof o.text==='string'&&o.visible).map(o=>o.text));
const screenOf=(page,id)=>page.evaluate(id=>{const v=B.visuals.get(id),c=B.cameras.main,b=v.getBounds();return {x:b.centerX-c.scrollX,y:b.centerY-c.scrollY};},id);

// 1. Mission start: the objective, the one Tavern notice, the economy, the Build tray.
{
 const {ctx,page,errors}=await open(780,360,'level=41');
 const r0=await res(page);check(r0.gold===50&&r0.wood>=140&&r0.wood<145&&r0.iron>=15&&r0.iron<16,'the mission starts with 50 Gold, 140 Wood, 15 Iron',r0);
 await page.waitForFunction(()=>H.toast?.visible&&/Tavern/.test(H.toast.text),null,{timeout:15000}).catch(()=>{});
 const tx=await texts(page);check(tx.some(t=>/Capture the Old Outpost/.test(t)),'the objective plate reads "Capture the Old Outpost"',tx.filter(t=>/Outpost|Keep/.test(t)));
 check(tx.some(t=>/Build a Tavern to hire a hero/.test(t)),'one short notice introduces the Tavern',tx.filter(t=>/Tavern/.test(t)));
 await shot(page,'780x360-1-start');
 const u=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tapLogical(page,u.x,u.y);
 const cards=await page.evaluate(()=>({tavern:H.buildPanel.hits[7].visible,barracks:H.buildPanel.hits[5]?.visible,labels:H.buildPanel.labels.filter(l=>l.visible).map(l=>l.text)}));
 check(cards.tavern&&cards.labels.some(l=>/Tavern/.test(l))&&!cards.barracks&&!cards.labels.some(l=>/Barracks/.test(l)),'Build shows the Tower, Wall and Tavern cards and no Barracks card',cards);
 await shot(page,'780x360-2-build-tray');
 check(!errors.length,'no page errors at mission start',errors.slice(0,3));await ctx.close();
}

// 2. The Tavern, the hire, the Hero Commands, the split and the capture.
{
 const {ctx,page,errors}=await open(780,360,'level=41');
 await page.evaluate(()=>{S.hero.hp=S.hero.maxHp=1e6;S.encounter={...S.encounter,waves:[],continuous:false};B.setHeroPosition(560,600);B.syncUnits();});await waitTicks(page,10);
 const u=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tapLogical(page,u.x,u.y);
 const card=await centre(page,'H.buildPanel.hits[7]');await tapLogical(page,card.x,card.y);
 const cell=await page.evaluate(()=>{const cam=B.cameras.main,pb=H.buildPanel.bounds;for(let y=150;y<320;y+=12)for(let x=220;x<720;x+=12){if(x>pb.x-10&&x<pb.x+pb.width+10&&y>pb.y-10&&y<pb.y+pb.height+10)continue;const wx=(x+cam.scrollX),wy=(y+cam.scrollY)/.72,col=Math.floor(wx/48),row=Math.floor(wy/48);if(!S.placementReason('tavern',col,row))return {x,y,col,row};}return null;});
 check(!!cell,'a free home cell is on screen for the Tavern',cell);await tapLogical(page,cell.x,cell.y);
 const confirm=await centre(page,'H.buildPanel.hits[2]');const before=await res(page);await tapLogical(page,confirm.x,confirm.y);
 await waitTicks(page,3);const after=await res(page);
 check(Math.abs((before.wood-after.wood)-100)<2&&Math.abs((before.iron-after.iron)-10)<1,'the Tavern costs 100 Wood and 10 Iron',{before,after});
 const cancel=await centre(page,'H.buildPanel.hits[3]');await tapLogical(page,cancel.x,cancel.y);
 await waitTicks(page,160);
 const tavernId=await page.evaluate(()=>Object.values(S.state.structures).find(b=>b.tavern&&b.progress>=1)?.id);check(!!tavernId,'the Tavern is finished after about 5 seconds',tavernId);
 await shot(page,'780x360-3-tavern-built');
 // Hire: Gold is topped up (the mission starts with 50).
 await page.evaluate(()=>{S.economy.balances={...S.economy.balances,gold:400*120};});
 const pos=await screenOf(page,tavernId);await tapLogical(page,pos.x,pos.y);
 check(await page.evaluate(()=>H.tavern.visible),'tapping the Tavern opens its panel');await shot(page,'780x360-4-panel');
 const g0=(await res(page)).gold;const row0=await centre(page,'H.tavern.rows[0].hitPrimary');await tapLogical(page,row0.x,row0.y);await waitTicks(page,4);
 const g1=(await res(page)).gold,w1=await res(page);
 check(g0-g1===150&&await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally).length)===1,'Roland is hired for 150 Gold',{g0,g1});
 const row1=await centre(page,'H.tavern.rows[1].hitPrimary');await tapLogical(page,row1.x,row1.y);await waitTicks(page,3);
 check(await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally).length)===1&&/cap/i.test(await page.evaluate(()=>H.tavern.status.text)),'the cap is one: a second hire is refused with a reason',await page.evaluate(()=>H.tavern.status.text));
 const closeAt=await centre(page,'H.tavern.closeHit');await tapLogical(page,closeAt.x,closeAt.y);
 check(await page.evaluate(()=>H.heroBar.container.visible),'the Hero Bar shows the hired hero');
 // Commands on the new map: go to the Outpost and order Attack on a watchtower through the Hero Bar.
 await page.evaluate(()=>{B.setHeroPosition(1000,600);B.syncUnits();const id=Object.values(S.state.units).find(u=>u.ally).id;const u=S.state.units[id];u.x=1040;u.y=560;u.hp=u.maxHp=1e6;});await waitTicks(page,20);
 const slot=await page.evaluate(()=>{const b=H.heroBar.bounds[0];return {x:b.centerX,y:b.centerY};});await tapLogical(page,slot.x,slot.y);
 const q=await page.evaluate(()=>H.heroBar.geometry.popover),cmd=k=>({x:q.x+k*(q.button.width+q.button.gap)+q.button.width/2,y:q.y+q.height/2});
 await tapLogical(page,cmd(1).x,cmd(1).y);
 check(await page.evaluate(()=>H.heroState.mode)==='attack','Attack opens its target mode on this map');
 const tower=await screenOf(page,'c5-outpost-south');await tapLogical(page,tower.x,tower.y);
 const ord=await page.evaluate(()=>Object.values(S.state.units).find(u=>u.ally).ally.order);
 check(ord.type==='attack'&&ord.targetId==='c5-outpost-south','tapping the south watchtower sends the Hero at it',ord);
 await waitTicks(page,40);await shot(page,'780x360-5-split');
 // The Guardian takes the north tower; both watchtowers fall; the Banner rises.
 await page.evaluate(()=>{for(const id of ['c5-outpost-north','c5-outpost-south'])S.state.structures[id].hp=0;S.hero.hp=S.hero.maxHp=1e6;B.setHeroPosition(1224,672);B.syncUnits();});
 await waitTicks(page,60);const raising=await page.evaluate(()=>S.state.post.bannerId);check(!!raising,'the Banner rises with a Guardian in the ring',raising);await shot(page,'780x360-6-raising');
 await waitTicks(page,130);
 const camp=await page.evaluate(()=>({owner:S.state.post.owner,shield:!!S.state.bases['red-base'].invulnerable,elites:Object.values(S.state.units).filter(u=>/^red-ca-/.test(u.id)).length}));
 check(camp.owner==='azure'&&!camp.shield&&camp.elites===2,'the camp is Azure, the Keep unshielded and two Elites come',camp);
 // No forward pad: capturing the camp adds no Barracks card and no pad.
 const noPad=await page.evaluate(()=>({pads:S.azurePads.length,card:!!H.buildPanel.hits[5]?.visible,reason:S.placementReason('barracks',24,13)}));
 check(noPad.pads===0&&!noPad.card&&noPad.reason==='Not an Azure Barracks pad','the captured Outpost opens no Barracks pad',noPad);
 check(!errors.length,'no page errors in the mission flow',errors.slice(0,3));await ctx.close();
}

// 3. Chapter 5 is Coming Soon on the chapter select (opened from the menu; the list scrolls, so drag it to the last chapters).
{
 const ctx=await browser.newContext({viewport:{width:780,height:360},deviceScaleFactor:3,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}?debug=1`);await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'),null,{timeout:30000});await page.waitForTimeout(1500);
 await page.evaluate(()=>window.kingdomGame.scene.start('ChapterSelect'));await page.waitForTimeout(1500);
 const view=await page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').children.list.flatMap(function f(o){return o.list?o.list.flatMap(f):[o];}).filter(o=>typeof o.text==='string').map(o=>o.text));
 check(view.some(t=>/Rise of the Heroes/i.test(t))&&view.some(t=>/coming soon/i.test(t)),'the chapter select lists Chapter 5 as Coming Soon',view.filter(t=>/Rise|soon/i.test(t)));
 check(!errors.length,'no page errors on the chapter select',errors.slice(0,3));await ctx.close();
}

// 4. 780x250 smoke.
{
 const {ctx,page,errors}=await open(780,250,'level=41');await page.waitForTimeout(800);await shot(page,'780x250-start');
 check(!errors.length,'780x250: no page errors',errors.slice(0,3));await ctx.close();
}
await browser.close();
console.log(failed?`FAILED ${failed}`:'ALL PASS');process.exit(failed?1:0);

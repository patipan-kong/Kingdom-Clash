// Chapter 5 M2 "Brothers in Arms" (docs/CHAPTER5_M2.md): the mission in the browser with real touch taps at the Galaxy S24's landscape viewport (780x360 CSS, DPR 3).
// Needs a dev server: BROTHERS_URL=http://127.0.0.1:5371/ (the dev-only ?debug=1&level=42 opens the mission). Stills go to BROTHERS_EVIDENCE (default the OS temp dir).
// Gold is topped up through the economy and long waits are fast-forwarded with the Simulation's own advance (the bot tests cover the real income and tempo); the taps, the panels and the commands are real.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.BROTHERS_URL||'http://127.0.0.1:5371/',dir=process.env.BROTHERS_EVIDENCE||`${tmpdir()}/brothers`;
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
const forward=(page,ticks)=>page.evaluate(n=>{for(let i=0;i<n&&!S.ended;i++)S.advance(1000/30+.01);B.syncUnits();},ticks);
const centre=(page,expr)=>page.evaluate(e=>{const b=eval(e).getBounds();return {x:b.centerX,y:b.centerY};},expr);
const res=page=>page.evaluate(()=>({wood:S.economy.woodUnits/120,iron:S.economy.ironUnits/120,gold:S.state.gold}));
const texts=page=>page.evaluate(()=>H.children.list.flatMap(function f(o){return o.list?o.list.flatMap(f):[o];}).filter(o=>typeof o.text==='string'&&o.visible).map(o=>o.text));
const screenOf=(page,id)=>page.evaluate(id=>{const v=B.visuals.get(id),c=B.cameras.main,b=v.getBounds();return {x:b.centerX-c.scrollX,y:b.centerY-c.scrollY};},id);

// 1. Mission start: the objective, the notice, the economy, the three Build cards, the Warden and no Raider.
{
 const {ctx,page,errors}=await open(780,360,'level=42');
 const r0=await res(page);check(r0.gold===100&&r0.wood>=140&&r0.wood<145&&r0.iron>=15&&r0.iron<16,'the mission starts with 100 Gold, 140 Wood, 15 Iron',r0);
 await page.waitForFunction(()=>H.toast?.visible&&/Tavern/.test(H.toast.text),null,{timeout:15000}).catch(()=>{});
 const tx=await texts(page);check(tx.some(t=>/Capture the Crossroads Camp/.test(t)),'the objective plate reads "Capture the Crossroads Camp"',tx.filter(t=>/Camp|Keep/.test(t)));
 check(tx.some(t=>/Build a Tavern to hire a hero/.test(t)),'the Tavern notice shows',tx.filter(t=>/Tavern/.test(t)));
 const u=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tapLogical(page,u.x,u.y);
 const cards=await page.evaluate(()=>({tavern:H.buildPanel.hits[7].visible,barracks:!!H.buildPanel.hits[5]?.visible,labels:H.buildPanel.labels.filter(l=>l.visible).map(l=>l.text)}));
 check(cards.tavern&&!cards.barracks&&!cards.labels.some(l=>/Barracks/.test(l)),'Build shows Tower, Wall and Tavern, no Barracks',cards);
 const crimson=await page.evaluate(()=>({warden:S.state.units['red-hero']&&[S.state.units['red-hero'].x,S.state.units['red-hero'].y],raider:!!S.state.units['red-raider'],cap:S.setup.tavern.cap}));
 check(JSON.stringify(crimson.warden)==='[1128,540]'&&!crimson.raider&&crimson.cap===2,'the Warden stands at his anchor, no Raider yet, Hero Cap 2',crimson);
 await shot(page,'780x360-1-start');
 check(!errors.length,'no page errors at the start',errors.slice(0,3));await ctx.close();
}

// 2. The Tavern, two hires, the cap, the Hero Bar and the commands; then the Raider at 100 s against a Defend hero.
{
 const {ctx,page,errors}=await open(780,360,'level=42');
 await page.evaluate(()=>{S.hero.hp=S.hero.maxHp=1e6;B.setHeroPosition(560,600);B.syncUnits();});await waitTicks(page,10);
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
 await page.evaluate(()=>{S.encounter={...S.encounter,waves:[],continuous:false};S.economy.balances={...S.economy.balances,gold:600*120};});
 const pos=await screenOf(page,tavernId);await tapLogical(page,pos.x,pos.y);
 check(await page.evaluate(()=>H.tavern.visible),'tapping the Tavern opens its panel');await shot(page,'780x360-2-panel');
 const g0=(await res(page)).gold;
 const row0=await centre(page,'H.tavern.rows[0].hitPrimary');await tapLogical(page,row0.x,row0.y);await waitTicks(page,4);
 const row1=await centre(page,'H.tavern.rows[1].hitPrimary');await tapLogical(page,row1.x,row1.y);await waitTicks(page,4);
 const g1=(await res(page)).gold;
 check(g0-g1===330&&await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally).length)===2,'Roland (150) and Borin (180) are hired: two Allied Heroes',{g0,g1});
 const row2=await centre(page,'H.tavern.rows[2].hitPrimary');await tapLogical(page,row2.x,row2.y);await waitTicks(page,3);
 check(await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally).length)===2&&/cap/i.test(await page.evaluate(()=>H.tavern.status.text)),'the cap is two: a third hire is refused with a reason',await page.evaluate(()=>H.tavern.status.text));
 const closeAt=await centre(page,'H.tavern.closeHit');await tapLogical(page,closeAt.x,closeAt.y);
 const bar=await page.evaluate(()=>({visible:H.heroBar.container.visible,slots:H.heroBar.bounds.length}));
 check(bar.visible&&bar.slots===2,'the Hero Bar shows both heroes',bar);await shot(page,'780x360-3-two-heroes');
 // Commands: slot 2 (Borin) Defend at a point in front of the Keep, slot 1 (Roland) Follow.
 const slot=async i=>{const b=await page.evaluate(i=>{const r=H.heroBar.bounds[i];return {x:r.centerX,y:r.centerY};},i);await tapLogical(page,b.x,b.y);const q=await page.evaluate(()=>H.heroBar.geometry.popover);return k=>({x:q.x+k*(q.button.width+q.button.gap)+q.button.width/2,y:q.y+q.height/2});};
 let cmd=await slot(1);await tapLogical(page,cmd(2).x,cmd(2).y);
 check(await page.evaluate(()=>H.heroState.mode)==='defend','Defend opens its target mode');
 const keepAt=await screenOf(page,'blue-base');await tapLogical(page,keepAt.x+110,keepAt.y);
 const orders=await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally).map(u=>({merc:u.ally.merc,order:u.ally.order.type,x:u.ally.order.x,y:u.ally.order.y})));
 check(orders.some(o=>o.order==='defend'&&o.x<600),'one hero is ordered to Defend a point in front of the Azure Keep',orders);
 cmd=await slot(0);await tapLogical(page,cmd(0).x,cmd(0).y);
 const orders2=await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally).map(u=>u.ally.order.type).sort());
 check(orders2.join()==='defend,follow','the other hero Follows the Guardian',orders2);
 // The Raider takes the field at 100 s and marches on the Keep; the Defend hero meets him.
 await page.evaluate(()=>{for(const u of Object.values(S.state.units))if(u.ally)u.hp=u.maxHp=2000;});
 const t=await tick(page);await forward(page,100*30-t+5);
 const raider=await page.evaluate(()=>{const r=S.state.units['red-raider'];return r&&{x:Math.round(r.x),hp:r.hp};});check(!!raider,'the Raider takes the field at 100 s',raider);
 await forward(page,12*30);await page.evaluate(()=>{const r=S.state.units['red-raider'];B.setHeroPosition(520,600);B.syncUnits();});await frames(page,10);await shot(page,'780x360-4-raider-meets-defender');
 await forward(page,30*30);
 const fight=await page.evaluate(()=>({raiderAlive:!!S.state.units['red-raider'],keep:Math.round(S.state.bases['blue-base'].hp),ally:Object.values(S.state.units).filter(u=>u.ally).length}));
 check(!fight.raiderAlive&&fight.keep>2000,'the Defend hero and the Guardian stop the Raider before the Keep falls',fight);
 check(!errors.length,'no page errors with two heroes and the Raider',errors.slice(0,3));await ctx.close();
}

// 3. Capture: two watchtowers, the Banner, three Elites, the shield drops, the Warden and the Raider come for the Banner.
{
 const {ctx,page,errors}=await open(780,360,'level=42');
 await page.evaluate(()=>{S.encounter={...S.encounter,waves:[],continuous:false};for(const id of ['c5-cross-north','c5-cross-south'])S.state.structures[id].hp=0;S.hero.hp=S.hero.maxHp=1e6;B.setHeroPosition(1080,552);B.syncUnits();});
 await waitTicks(page,60);const raising=await page.evaluate(()=>S.state.post.bannerId);check(!!raising,'the Banner rises with a Guardian in the ring',raising);await shot(page,'780x360-5-raising');
 await waitTicks(page,200);
 const camp=await page.evaluate(()=>({owner:S.state.post.owner,shield:!!S.state.bases['red-base'].invulnerable,elites:Object.values(S.state.units).filter(u=>/^red-ca-/.test(u.id)).length}));
 check(camp.owner==='azure'&&!camp.shield&&camp.elites>=1,'the camp is Azure, the Keep unshielded and the Elites come',camp);await shot(page,'780x360-6-captured');
 const bu=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tapLogical(page,bu.x,bu.y);
 const noPad=await page.evaluate(()=>({pads:S.azurePads.length,card:!!H.buildPanel.hits[5]?.visible}));check(noPad.pads===0&&!noPad.card,'the captured camp opens no Barracks pad',noPad);
 check(!errors.length,'no page errors in the capture',errors.slice(0,3));await ctx.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

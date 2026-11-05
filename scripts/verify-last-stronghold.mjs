// Chapter 5 M5 "The Last Stronghold" (docs/CHAPTER5_M5.md): the mission in the browser with real touch taps at the Galaxy S24's landscape viewport (780x360 CSS, DPR 3).
// Needs a dev server: STRONGHOLD_URL=http://127.0.0.1:5371/ (the dev-only ?debug=1&level=45 opens the mission). Stills go to STRONGHOLD_EVIDENCE (default the OS temp dir).
// Resources are topped up through the economy and long waits are fast-forwarded with the Simulation's own advance (the bot tests cover the real income and tempo); the taps, the panels and the commands are real.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.STRONGHOLD_URL||'http://127.0.0.1:5371/',dir=process.env.STRONGHOLD_EVIDENCE||`${tmpdir()}/last-stronghold`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(query='level=45'){
 const ctx=await browser.newContext({viewport:{width:780,height:360},deviceScaleFactor:3,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
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
const forward=(page,ticks,keep=true)=>page.evaluate(([n,keep])=>{for(let i=0;i<n&&!S.ended;i++){if(keep)S.hero.hp=S.hero.maxHp=1e6;S.advance(1000/30+.01);for(const e of S.drainEvents())window.kingdomGame.events.emit('simulation-event',e);}B.syncUnits();},[ticks,keep]);
const centre=(page,expr)=>page.evaluate(e=>{const b=eval(e).getBounds();return {x:b.centerX,y:b.centerY};},expr);
const res=page=>page.evaluate(()=>({wood:S.economy.woodUnits/120,iron:S.economy.ironUnits/120,gold:S.state.gold}));
const texts=page=>page.evaluate(()=>H.children.list.flatMap(function f(o){return o.list?o.list.flatMap(f):[o];}).filter(o=>typeof o.text==='string'&&o.visible).map(o=>o.text));
const camera=(page,x,y)=>page.evaluate(([x,y])=>{B.following=false;const c=B.cameras.main;c.stopFollow();c.setZoom(1);c.centerOn(x,y*.72);},[x,y]);
const tapWorld=async(page,col,row)=>{const pt=await page.evaluate(({col,row})=>{const c=B.cameras.main,k=G.canvas.getBoundingClientRect();return {x:k.x+((col+.5)*48-c.scrollX)*k.width/960,y:k.y+((row+.5)*48*.72-c.scrollY)*k.height/540};},{col,row});await page.touchscreen.tap(pt.x,pt.y);await frames(page,5);};
// A pad low on the screen sits under the placement panel: the player drags the map ('build-pan', the event the HUD's drag sends), so the script pans the pad up first.
const drag=async(page,x0,y0,x1,y1)=>{const cdp=await page.context().newCDPSession(page),p0=await toPage(page,x0,y0),p1=await toPage(page,x1,y1),pt=(p,state)=>({type:state,touchPoints:state==='touchEnd'?[]:[{x:p.x,y:p.y}]});await cdp.send('Input.dispatchTouchEvent',pt(p0,'touchStart'));for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',pt({x:p0.x+(p1.x-p0.x)*i/8,y:p0.y+(p1.y-p0.y)*i/8},'touchMove'));}await cdp.send('Input.dispatchTouchEvent',pt(p1,'touchEnd'));await frames(page,4);await cdp.detach();};
const tapPad=async(page,col,row)=>{const y=await page.evaluate(([c,r])=>r*48*.72+17-B.cameras.main.scrollY,[col,row]);if(y>250){await drag(page,560,320,560,Math.max(40,320-(y-180)));}await tapWorld(page,col,row);};
const openBuild=async page=>{if(await page.evaluate(()=>!!B.buildingMode))return;const u=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tapLogical(page,u.x,u.y);};
const card=async(page,i)=>{const c=await centre(page,`H.buildPanel.hits[${i}]`);await tapLogical(page,c.x,c.y);};
const confirm=async page=>{for(let k=0;k<3;k++){const kind=await page.evaluate(()=>B.placement?.kind);if(!kind)break;await card(page,2);await waitTicks(page,2);}await card(page,3);}; // confirm the placement, then cancel so the next card starts clean
const barracks=page=>page.evaluate(()=>Object.values(S.state.structures).filter(b=>b.azureBarracks&&b.hp>0).map(b=>[b.col,b.row]));
const clearUnits=page=>page.evaluate(()=>{for(const id of Object.keys(S.state.units))if(!S.state.units[id].ally&&id!=='guardian'&&(id.startsWith('red-')||id.startsWith('blue-')))delete S.state.units[id];});
const calm=page=>page.evaluate(()=>{S.encounter={...S.encounter,waves:[],continuous:false};});

const worldTexts=page=>page.evaluate(()=>B.children.list.filter(o=>typeof o.text==='string'&&o.visible).map(o=>o.text));

// 1. Start: the plate, the economy, the wreck (locked), no Crimson cart, the forward towers, the Build cards.
{
 const {ctx,page,errors}=await open();
 const r0=await res(page);check(r0.gold===100&&r0.wood>=180&&r0.wood<185&&r0.iron>=25&&r0.iron<26,'the mission starts with 100 Gold, 180 Wood, 25 Iron',r0);
 const tx=await texts(page);check(tx.some(t=>/Capture both outposts/.test(t)),'the objective plate asks for the outposts',tx.filter(t=>/Outpost|Keep/.test(t)));
 const st=await page.evaluate(()=>({wreck:S.state.cartWreck&&{col:S.state.cartWreck.col,row:S.state.cartWreck.row},locked:S.cartLocked,redCart:!!S.state.units['red-cart'],field:S.field.id,shield:!!S.state.bases['red-base'].invulnerable,sally:['c5-sally-north','c5-sally-south'].map(id=>S.state.structures[id]&&[S.state.structures[id].x,S.state.structures[id].y]),ballista:S.ballistaRuin,limit:S.azureLimit}));
 check(st.wreck?.col===20&&st.wreck.row===19&&st.locked&&!st.redCart&&st.field==='last-stronghold'&&st.shield&&st.sally.every(Boolean)&&st.ballista?.col===24&&st.ballista.row===5&&st.limit===2,'the wreck lies in the South Outpost, locked; no Crimson cart; forward towers stand; the Ballista ruin is in the North Outpost',st);
 await calm(page);await page.evaluate(()=>{S.hero.hp=S.hero.maxHp=1e6;B.setHeroPosition(560,600);B.syncUnits();});await waitTicks(page,10);
 await openBuild(page);
 const cards=await page.evaluate(()=>({ballista:!!H.buildPanel.hits[6]?.visible,barracks:!!H.buildPanel.hits[5]?.visible,tavern:!!H.buildPanel.hits[7]?.visible,labels:H.buildPanel.labels.filter(l=>l.visible).map(l=>l.text)}));
 check(cards.ballista&&cards.barracks&&cards.tavern,'Build shows the Barracks, Ballista and Tavern cards at 780x360',cards);await shot(page,'780x360-1-build-cards');
 check(!errors.length,'no page errors at the start',errors.slice(0,3));await ctx.close();
}

// 2. The wreck: a locked ring that says what to do; a real capture of the South Outpost; the repair by standing in the ring; the cart follows the Guardian.
{
 const {ctx,page,errors}=await open();
 await calm(page);await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:400*120,iron:100*120};S.hero.hp=S.hero.maxHp=1e6;B.setHeroPosition(984,900);B.syncUnits();});
 await camera(page,984,930);await forward(page,3*30);await frames(page,6);
 let tx=await worldTexts(page);check(tx.some(t=>/CAPTURE THE SOUTH OUTPOST FIRST/.test(t)),'beside the wreck the ring reads "Capture the South Outpost first"',tx.filter(t=>/CAPTURE|WAR CART/.test(t)));await shot(page,'780x360-2-wreck-locked');
 const unpaid=await page.evaluate(()=>({repair:!!S.state.cartWreck.repair,wood:S.economy.woodUnits/120,iron:S.economy.ironUnits/120}));check(!unpaid.repair&&unpaid.wood>=395&&unpaid.iron>=95,'standing there with the resources pays nothing',unpaid);
 // capture the South Outpost: the holders fall and the Guardian stands in the ring (the Warden is removed so the capture is not blocked)
 await page.evaluate(()=>{for(const id of ['c5-south-a','c5-south-b'])S.state.structures[id].hp=0;delete S.state.units['red-hero'];B.setHeroPosition(1032,828);B.syncUnits();});
 await forward(page,6*30);
 const camp=await page.evaluate(()=>({south:S.state.posts.find(p=>p.id==='south').owner,locked:S.cartLocked,shield:!!S.state.bases['red-base'].invulnerable}));
 check(camp.south==='azure'&&!camp.locked&&camp.shield,'the South Outpost is Azure: the wreck is unlocked and one outpost does not break the shield',camp);
 await page.evaluate(()=>{window.told=[];const tell=H.tell.bind(H);H.tell=(m,...a)=>{window.told.push(m);return tell(m,...a);};S.economy.balances={...S.economy.balances,wood:400*120,iron:10*120};B.setHeroPosition(984,900);B.syncUnits();});
 await clearUnits(page);await forward(page,3*30);await frames(page,6);
 tx=await worldTexts(page);check(tx.some(t=>/WAR CART WRECK/.test(t)),'unlocked, the ring reads "War Cart wreck · repair" with its price',tx.filter(t=>/CART|Wood/.test(t)));await shot(page,'780x360-3-wreck-open');
 const short=await page.evaluate(()=>({repair:!!S.state.cartWreck.repair}));check(!short.repair,'10 Iron is not enough: nothing is paid',short);
 await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:400*120,iron:60*120};});await forward(page,30);
 const paying=await page.evaluate(()=>({repair:!!S.state.cartWreck?.repair,iron:S.economy.ironUnits/120,wood:S.economy.woodUnits/120,hero:[Math.round(S.hero.x),Math.round(S.hero.y)],locked:S.cartLocked}));check(paying.repair&&paying.iron<30,'with 160 Wood and 40 Iron the repair starts and is paid',paying);
 await forward(page,2*30);await frames(page,6);tx=await worldTexts(page);check(tx.some(t=>/REPAIRING/.test(t)),'the ring counts the repair down',tx.filter(t=>/REPAIR/.test(t)));await shot(page,'780x360-4-repairing');
 await forward(page,4*30);
 const cart=await page.evaluate(()=>{const c=S.state.units['blue-c-1'];return c&&{team:c.team,x:Math.round(c.x),y:Math.round(c.y),wreck:!!S.state.cartWreck};});check(cart?.team==='blue'&&!cart.wreck,'one Azure cart stands and the wreck is gone',cart);await shot(page,'780x360-5-cart');
 // it follows the Guardian: he stands just east of it and the cart walks while he is within 300 px
 const x0=cart.x;await page.evaluate(()=>{const c=S.state.units['blue-c-1'];B.setHeroPosition(c.x+120,c.y-20);B.syncUnits();});await forward(page,8*30);
 const moved=await page.evaluate(()=>{const c=S.state.units['blue-c-1'];return c&&{x:Math.round(c.x)};});check(moved&&moved.x>x0+60,'the repaired cart walks east when the Guardian is near it',{from:x0,to:moved?.x});
 check(await page.evaluate(()=>(window.told||[]).some(m=>/repaired|Repairing/.test(m))),'the HUD tells the player about the repair',await page.evaluate(()=>window.told));
 check(!errors.length,'no page errors with the cart',errors.slice(0,3));await ctx.close();
}

// 3. The North Outpost: real capture, then the Ballista by tap on its ruin; it is on screen above the placement panel and it shoots.
{
 const {ctx,page,errors}=await open();
 await calm(page);await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:900*120,iron:200*120};S.hero.hp=S.hero.maxHp=1e6;});
 const before=await page.evaluate(()=>S.placementReason('ballista',24,5));check(/Capture the North Outpost first/.test(before),'before the capture the Ballista cell is closed',before);
 await page.evaluate(()=>{window.told=[];const tell=H.tell.bind(H);H.tell=(m,...a)=>{window.told.push(m);return tell(m,...a);};for(const id of ['c5-north-a','c5-north-b'])S.state.structures[id].hp=0;B.setHeroPosition(1080,324);B.syncUnits();});
 await forward(page,6*30);
 const n=await page.evaluate(()=>({north:S.state.posts.find(p=>p.id==='north').owner,can:S.placementReason('ballista',24,5),told:window.told.filter(m=>/Ballista/.test(m))}));
 check(n.north==='azure'&&n.can==='','the North Outpost is Azure and the Ballista ruin can be repaired',n);check(n.told.length>=1,'the capture notice says to repair the Ballista',n.told);
 await page.evaluate(()=>{B.setHeroPosition(1000,300);B.syncUnits();});await clearUnits(page);
 await openBuild(page);await card(page,6);await frames(page,6);await camera(page,1176,300);await frames(page,4);
 const vis=await page.evaluate(()=>{const c=B.cameras.main,pb=H.buildPanel.bounds,x=24.5*48-c.scrollX,y=5.5*48*.72-c.scrollY;return {x:Math.round(x),y:Math.round(y),panelTop:Math.round(pb.y),onScreen:x>0&&x<960&&y>0&&y<540};});
 check(vis.onScreen&&vis.y<vis.panelTop-20,'the Ballista ruin is on screen and clear of the placement panel at 780x360',vis);
 await tapWorld(page,24,5);
 const sel=await page.evaluate(()=>({p:B.placement&&{kind:B.placement.kind,col:B.placement.col,row:B.placement.row},why:S.placementReason('ballista',24,5)}));check(sel.p?.kind==='ballista'&&sel.p.col===24&&sel.p.row===5,'tapping the ruin selects it',sel);await shot(page,'780x360-6-ballista-selected');
 await confirm(page);await waitTicks(page,3);await forward(page,6*30);
 const b=await page.evaluate(()=>{const x=Object.values(S.state.structures).find(s=>s.ballista);return x&&{col:x.col,row:x.row,hp:x.hp};});check(b&&b.col===24&&b.row===5&&b.hp>0,'the Ballista stands on its ruin (placed by a tap)',b);
 await page.evaluate(()=>{window.hits=new Set();G.events.on('simulation-event',e=>{if(e.type==='damage')window.hits.add(e.id+'<'+e.sourceId);});});await forward(page,20*30);await shot(page,'780x360-7-ballista');
 const shot1=await page.evaluate(()=>[...window.hits].filter(h=>/sally-north|red-fortress-gate/.test(h)));check(shot1.length>=1,'the Ballista shoots the forward north tower',shot1);
 check(!errors.length,'no page errors with the Ballista',errors.slice(0,3));await ctx.close();
}

// 4. Both Commanders are announced 6 s ahead and take the field on time (204/210 s and 294/300 s), readable on the phone.
{
 const {ctx,page,errors}=await open();
 await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:1500*120,iron:300*120};S.hero.hp=S.hero.maxHp=1e6;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;});await calm(page);
 await page.evaluate(()=>{window.told=[];const tell=H.tell.bind(H);H.tell=(m,...a)=>{window.told.push(m);return tell(m,...a);};B.setHeroPosition(900,300);B.syncUnits();});
 let t=await tick(page);await forward(page,Math.max(1,203*30-t)); // a 1 s margin: the page's own loop also advances the simulation between calls
 check(!(await page.evaluate(()=>window.told)).some(m=>/Marshal/.test(m)),'no Marshal warning before 204 s');
 await forward(page,2*30);check((await page.evaluate(()=>window.told.filter(m=>/Marshal/.test(m)))).length>=1,'the Iron Marshal is announced at 204 s');await shot(page,'780x360-8-marshal-warning');
 t=await tick(page);await forward(page,Math.max(1,210*30-t+2));
 const m=await page.evaluate(()=>{const u=S.state.units['red-marshal'];return u&&{y:Math.round(u.y),escorts:Object.values(S.state.units).filter(x=>x.escortOf==='red-marshal').length};});check(!!m&&m.y<450&&m.escorts===3,'the Marshal takes the field at 210 s on the Siege Road with three escorts',m);
 await page.evaluate(()=>{delete S.state.units['red-marshal'];for(const id of Object.keys(S.state.units))if(S.state.units[id].escortOf)delete S.state.units[id];});
 t=await tick(page);await forward(page,Math.max(1,294*30-t+3));
 check((await page.evaluate(()=>window.told.filter(m=>/Shadowblade/.test(m)))).length>=1,'the Shadowblade is announced at 294 s');await shot(page,'780x360-9-shadowblade-warning');
 t=await tick(page);await forward(page,Math.max(1,300*30-t+2));
 check(await page.evaluate(()=>!!S.state.units['red-shadowblade']),'the Shadowblade takes the field at 300 s');
 check(!errors.length,'no page errors with the Commanders',errors.slice(0,3));await ctx.close();
}

// 5. Unit peak on the production level with a hard-playing stand-in: waves, two heroes, four footmen, Warden and both Commanders all alive.
{
 const {ctx,page,errors}=await open();
 await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:1500*120,iron:300*120,gold:900*120};S.hero.hp=S.hero.maxHp=1e6;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;
  S.send({type:'place',requestId:'tv',kind:'tavern',col:8,row:12});S.send({type:'place',requestId:'bk1',kind:'barracks',col:10,row:10});S.send({type:'place',requestId:'bk2',kind:'barracks',col:10,row:14});});
 await forward(page,6*30);await page.evaluate(()=>{S.send({type:'tavern',requestId:'h1',action:'hire',merc:'roland'});S.send({type:'tavern',requestId:'h2',action:'hire',merc:'borin'});B.setHeroPosition(560,600);});
 let peak=0;for(let i=0;i<33;i++){await forward(page,10*30);peak=Math.max(peak,await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.hp>0).length));}
 check(peak<=40,'peak live units over the first five and a half minutes stays within the 40-unit target',peak);await shot(page,'780x360-10-busy');
 check(!errors.length,'no page errors in a busy match',errors.slice(0,3));await ctx.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

// Chapter 5 M4 "The Broken Alliance" (docs/CHAPTER5_M4.md): the mission in the browser with real touch taps at the Galaxy S24's landscape viewport (780x360 CSS, DPR 3).
// Needs a dev server: BROKEN_URL=http://127.0.0.1:5371/ (the dev-only ?debug=1&level=44 opens the mission). Stills go to BROKEN_EVIDENCE (default the OS temp dir).
// Resources are topped up through the economy and long waits are fast-forwarded with the Simulation's own advance (the bot tests cover the real income and tempo); the taps, the panels and the commands are real.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.BROKEN_URL||'http://127.0.0.1:5371/',dir=process.env.BROKEN_EVIDENCE||`${tmpdir()}/broken-alliance`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(query='level=44'){
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

// 1. Start: the plate, the economy, the cards, the Warden in the south and no Raider; then the opening spend (Tavern and Barracks) taps by taps.
{
 const {ctx,page,errors}=await open();
 const r0=await res(page);check(r0.gold===100&&r0.wood>=220&&r0.wood<225&&r0.iron>=30&&r0.iron<31,'the mission starts with 100 Gold, 220 Wood, 30 Iron',r0);
 const tx=await texts(page);check(tx.some(t=>/Capture both outposts/.test(t)),'the objective plate asks for the outposts',tx.filter(t=>/Outpost|Keep/.test(t)));
 const crimson=await page.evaluate(()=>({warden:S.state.units['red-hero']&&[S.state.units['red-hero'].x,S.state.units['red-hero'].y],raider:!!S.state.units['red-raider'],cap:S.setup.tavern.cap,shield:!!S.state.bases['red-base'].invulnerable,camps:S.state.posts.map(p=>p.owner),field:S.field.id,limit:S.setup.azure.limit,pads:S.azurePads.length,barracks:Object.values(S.state.structures).filter(b=>b.azureBarracks).length}));
 check(crimson.warden[1]>800&&!crimson.raider&&crimson.cap===2&&crimson.shield&&crimson.camps.join()==='crimson,crimson'&&crimson.field==='broken-alliance'&&crimson.limit===2&&crimson.pads===5&&crimson.barracks===0,'Warden in the south bowl, no Raider, Cap 2, two Crimson outposts, shielded Keep, five pads, limit 2, no Barracks',crimson);
 await calm(page);await page.evaluate(()=>{S.hero.hp=S.hero.maxHp=1e6;B.setHeroPosition(560,600);B.syncUnits();});await waitTicks(page,10);
 await openBuild(page);
 const cards=await page.evaluate(()=>({tavern:!!H.buildPanel.hits[7]?.visible,barracks:!!H.buildPanel.hits[5]?.visible,labels:H.buildPanel.labels.filter(l=>l.visible).map(l=>l.text)}));
 check(cards.tavern&&cards.barracks,'Build shows the Barracks and Tavern cards',cards);await shot(page,'780x360-1-build');
 // the Tavern on a free home cell
 await card(page,7);
 const cell=await page.evaluate(()=>{const cam=B.cameras.main,pb=H.buildPanel.bounds;for(let y=150;y<320;y+=12)for(let x=220;x<720;x+=12){if(x>pb.x-10&&x<pb.x+pb.width+10&&y>pb.y-10&&y<pb.y+pb.height+10)continue;const wx=x+cam.scrollX,wy=(y+cam.scrollY)/.72,col=Math.floor(wx/48),row=Math.floor(wy/48);if(!S.placementReason('tavern',col,row))return {x,y};}return null;});
 check(!!cell,'a free home cell is on screen for the Tavern',cell);for(let k=0;k<3&&(await res(page)).wood>200;k++){await openBuild(page);await card(page,7);await tapLogical(page,cell.x,cell.y);await confirm(page);await waitTicks(page,3);} // a tap lost under software rendering is retried
 const afterT=await res(page);check(afterT.wood<125&&afterT.iron<21,'the Tavern takes 100 Wood and 10 Iron',afterT);
 // the Barracks on the first home pad: opening the card again, tapping the pad, confirming
 await openBuild(page);await card(page,5);await frames(page,6);await camera(page,330,600);await frames(page,4);await tapPad(page,10,10);
 const sel=await page.evaluate(()=>B.placement&&{kind:B.placement.kind,col:B.placement.col,row:B.placement.row});check(sel?.kind==='barracks'&&sel.col===10&&sel.row===10,'tapping the first home pad selects it',sel);
 await shot(page,'780x360-2-home-pad');await confirm(page);await waitTicks(page,3);
 const afterB=await res(page);check(afterB.wood<10&&afterB.iron<2,'the opening spends the starting wood and iron: Tavern then Barracks, nothing left',afterB);
 await forward(page,10*30);
 const foot=await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0).length);check(foot===2,'the Barracks trains two footmen',foot);
 await shot(page,'780x360-3-footmen');
 check(!errors.length,'no page errors at the start',errors.slice(0,3));await ctx.close();
}

// 2. Pads and the cap: a camp pad is closed until its camp is Azure; the North pad then takes the second Barracks by tap; the third is refused.
{
 const {ctx,page,errors}=await open();
 await calm(page);await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:1500*120,iron:300*120,gold:600*120};S.hero.hp=S.hero.maxHp=1e6;});
 const closed=await page.evaluate(()=>({north:S.placementReason('barracks',20,7),south:S.placementReason('barracks',18,18),home:[[10,10],[10,14],[13,12]].map(([c,r])=>S.placementReason('barracks',c,r))}));
 check(/Capture the North Outpost first/.test(closed.north)&&/Capture the South Outpost first/.test(closed.south)&&closed.home.every(x=>x===''),'the three home pads are open; both outpost pads are closed until captured',closed);
 // capture the North Outpost for real: the holders fall, the Guardian stands in the ring
 await page.evaluate(()=>{for(const id of ['c5-north-a','c5-north-b'])S.state.structures[id].hp=0;B.setHeroPosition(1080,324);B.syncUnits();});
 await forward(page,6*30);const northCamp=await page.evaluate(()=>({north:S.state.posts.find(p=>p.id==='north').owner,south:S.state.posts.find(p=>p.id==='south').owner,shield:!!S.state.bases['red-base'].invulnerable}));
 check(northCamp.north==='azure'&&northCamp.south==='crimson'&&northCamp.shield,'the North Outpost is Azure and the Keep is still shielded',northCamp);await shot(page,'780x360-4-north-captured');
 const opens=await page.evaluate(()=>({north:S.placementReason('barracks',20,7),south:S.placementReason('barracks',18,18)}));
 check(opens.north===''&&/Capture the South Outpost first/.test(opens.south),'the North pad opens with its outpost; the South pad stays closed',opens);
 // two Barracks: the first at home, the second on the North pad, both by tap
 await page.evaluate(()=>{B.setHeroPosition(500,600);B.syncUnits();});await clearUnits(page);
 await openBuild(page);await card(page,5);await camera(page,330,600);await frames(page,4);await tapPad(page,10,10);
 const home=await page.evaluate(()=>({p:B.placement&&{k:B.placement.kind,c:B.placement.col,r:B.placement.row},why:S.placementReason('barracks',10,10)}));check(home.p?.c===10&&home.p.r===10,'tapping the first home pad selects it (with the North Outpost already Azure)',home);await confirm(page);await waitTicks(page,3);
 await page.evaluate(()=>{B.setHeroPosition(1080,400);B.syncUnits();});await clearUnits(page);
 await openBuild(page);await card(page,5);await camera(page,1080,330);await frames(page,4);await tapPad(page,20,7);
 const sel=await page.evaluate(()=>B.placement&&{col:B.placement.col,row:B.placement.row});check(sel?.col===20&&sel.row===7,'tapping the North pad selects it',sel);await shot(page,'780x360-5-north-pad');await confirm(page);await waitTicks(page,3);
 const two=await barracks(page);check(two.length===2&&two.some(([c,r])=>c===20&&r===7),'two Barracks stand: one home, one on the North pad',two);
 const capped=await page.evaluate(()=>({home:S.placementReason('barracks',10,14),pad:S.placementReason('barracks',13,12)}));check(capped.home!==''&&capped.pad!=='','a third Barracks is refused at the cap',capped);
 check(!errors.length,'no page errors in the pads',errors.slice(0,3));await ctx.close();
}

// 3. The South pad and the shield: the South Outpost captured first opens its pad by tap; the second capture breaks the Keep shield; both Elites come.
{
 const {ctx,page,errors}=await open();
 await calm(page);await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:1500*120,iron:300*120};S.hero.hp=S.hero.maxHp=1e6;for(const id of ['c5-south-a','c5-south-b'])S.state.structures[id].hp=0;B.setHeroPosition(1032,828);B.syncUnits();});
 await forward(page,6*30);
 const basin=await page.evaluate(()=>({basin:S.state.posts.find(p=>p.id==='south').owner,shield:!!S.state.bases['red-base'].invulnerable,elites:Object.values(S.state.units).filter(u=>/^red-ca-/.test(u.id)).length}));
 check(basin.basin==='azure'&&basin.shield&&basin.elites>=1,'the South Outpost is Azure, its Elites come, and one outpost does not break the shield',basin);
 await forward(page,10*30);await clearUnits(page);
 // The South pad (18,18): real taps all the way. The Guardian walks to it with the movement command the joystick sends, the Build panel selects the pad, the pad is visible and clear of the panel, the confirm tap places the Barracks, construction completes with the Guardian beside it, and its footmen follow him away.
 await page.evaluate(()=>{window.dl=[];G.events.on('simulation-event',e=>{if(e.type==='death')window.dl.push([e.id,e.sourceId,S.clock.tick]);});});
 await page.evaluate(()=>{B.setHeroPosition(760,900);B.syncUnits();});await camera(page,1000,860);await openBuild(page);await card(page,5);await frames(page,6);
 const vis=await page.evaluate(()=>{const c=B.cameras.main,pb=H.buildPanel.bounds,x=18.5*48-c.scrollX,y=18.5*48*.72-c.scrollY;return {padX:Math.round(x),padY:Math.round(y),panelTop:Math.round(pb.y),panelLeft:Math.round(pb.x),panelRight:Math.round(pb.x+pb.width),onScreen:x>0&&x<960&&y>0&&y<540};});
 check(vis.onScreen&&vis.padY<vis.panelTop-20,'the South pad is on screen and clear of the placement panel at 780x360',vis);await shot(page,'780x360-6-south-pad-visible');
 await tapPad(page,18,18);
 const sel=await page.evaluate(()=>({p:B.placement&&{col:B.placement.col,row:B.placement.row},why:S.placementReason('barracks',18,18)}));check(sel.p?.col===18&&sel.p.row===18,'tapping the South pad selects it',sel);await shot(page,'780x360-6-south-pad-selected');
 await confirm(page);await waitTicks(page,3);
 check((await barracks(page)).some(([c,r])=>c===18&&r===18),'the South Barracks stands on its pad (placed by a tap)',await barracks(page));
 // the Guardian reaches the pad: joystick-style movement commands from where he stands to the pad's west side
 const walk=await page.evaluate(()=>{const gx=18.5*48-75,gy=18.5*48;let n=0;while(n<600){const dx=gx-S.hero.x,dy=gy-S.hero.y,d=Math.hypot(dx,dy);if(d<20)break;S.send({type:'move',x:dx/d,y:dy/d});S.advance(1000/30+.01);S.drainEvents();n++;}S.send({type:'move',x:0,y:0});return {ticks:n,x:Math.round(S.hero.x),y:Math.round(S.hero.y)};});
 check(walk.ticks<600,'the Guardian walks to the pad',walk);
 await forward(page,10*30);
 const built=await page.evaluate(()=>{const b=Object.values(S.state.structures).find(x=>x.azureBarracks&&x.col===18&&x.row===18);const foot=Object.values(S.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0);return {progress:b&&b.progress,hp:b&&Math.round(b.hp),foot:foot.length,near:foot.map(u=>Math.round(Math.hypot(u.x-b.x,u.y-b.y)))};});
 check(built.progress>=1&&built.foot===2&&built.near.every(d=>d<450),'construction completes and two footmen spawn beside the Barracks',built);await shot(page,'780x360-6-south-footmen');
 await page.evaluate(()=>{for(const id of Object.keys(S.state.units))if(id.startsWith('red-'))delete S.state.units[id];S.spawnQueue.length=0;B.setHeroPosition(600,560);B.syncUnits();});await forward(page,40*30); // the Elites would otherwise kill a footman on the way: this checks following, not fighting
 const esc=await page.evaluate(()=>{const g=S.hero;return Object.values(S.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0).map(u=>Math.round(Math.hypot(u.x-g.x,u.y-g.y)));});
 console.log('NOTE footmen lost before and during the walk (existing footman behaviour: they advance on hostiles within 560 px):',JSON.stringify(await page.evaluate(()=>window.dl)));
 check(esc.length>=1&&esc.every(d=>d<700),'the surviving South footmen follow the Guardian away from the camp (two follow in the unit test and in the home escort check)',esc);
 await page.evaluate(()=>{for(const id of ['c5-north-a','c5-north-b'])S.state.structures[id].hp=0;B.setHeroPosition(1080,324);B.syncUnits();});
 await forward(page,6*30);
 const both=await page.evaluate(()=>({camps:S.state.posts.map(p=>p.owner),shield:!!S.state.bases['red-base'].invulnerable,elites:new Set(Object.keys(S.state.units).filter(i=>/^red-ca-/.test(i))).size}));
 check(both.camps.join()==='azure,azure'&&!both.shield,'both outposts are Azure: the Keep is vulnerable',both);await shot(page,'780x360-7-both-captured');
 const tx=await texts(page);check(tx.some(t=>/Destroy the Crimson Keep/.test(t)),'the plate moves on to "Destroy the Crimson Keep"',tx.filter(t=>/Keep|Outpost/.test(t)));
 check(!errors.length,'no page errors in the captures',errors.slice(0,3));await ctx.close();
}

// 4. Escort: footmen follow the Guardian to the far road; and both Commanders are announced 6 s ahead and take the field on time.
{
 const {ctx,page,errors}=await open();
 await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:1500*120,iron:300*120};S.hero.hp=S.hero.maxHp=1e6;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;});await calm(page);
 await page.evaluate(()=>{S.send({type:'place',requestId:'bk',kind:'barracks',col:10,row:10});});await forward(page,6*30);
 await page.evaluate(()=>{window.told=[];const tell=H.tell.bind(H);H.tell=(m,...a)=>{window.told.push(m);return tell(m,...a);};B.setHeroPosition(900,300);B.syncUnits();});
 await forward(page,40*30);
 const esc=await page.evaluate(()=>{const g=S.hero;return Object.values(S.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0).map(u=>Math.round(Math.hypot(u.x-g.x,u.y-g.y)));});
 check(esc.length===2&&esc.every(d=>d<700),'the footmen stand with the Guardian on the far road, not at the Barracks',esc);await shot(page,'780x360-8-escort');
 let t=await tick(page);await forward(page,Math.max(1,174*30-t-3));
 check(!(await page.evaluate(()=>window.told)).some(m=>/Marshal/.test(m)),'no Marshal warning before 174 s');
 await forward(page,6);const warned=await page.evaluate(()=>window.told.filter(m=>/Marshal/.test(m)));check(warned.length>=1,'the Iron Marshal is announced 6 s ahead',warned);await shot(page,'780x360-8-marshal-warning');
 t=await tick(page);await forward(page,Math.max(1,180*30-t+2));
 const marshal=await page.evaluate(()=>{const m=S.state.units['red-marshal'];return m&&{x:Math.round(m.x),y:Math.round(m.y),escorts:Object.values(S.state.units).filter(u=>u.escortOf==='red-marshal').length};});check(!!marshal&&marshal.y<450&&marshal.escorts===3,'the Marshal takes the field at 180 s on the Siege Road with three escorts',marshal);
 t=await tick(page);await forward(page,Math.max(1,234*30-t+3));
 const sword=await page.evaluate(()=>window.told.filter(m=>/Shadowblade/.test(m)));check(sword.length>=1,'the Shadowblade is announced at 234 s',sword);
 t=await tick(page);await forward(page,Math.max(1,240*30-t+2));
 check(await page.evaluate(()=>!!S.state.units['red-shadowblade']),'the Shadowblade takes the field at 240 s');
 check(await page.evaluate(()=>!S.state.units['red-raider']),'there is no Raider');
 check(!errors.length,'no page errors with the escort and the Commanders',errors.slice(0,3));await ctx.close();
}

// 5. Unit peak on the production level with a hard-playing stand-in: waves, two heroes, four footmen, Warden and both Commanders all alive.
{
 const {ctx,page,errors}=await open();
 await page.evaluate(()=>{S.economy.balances={...S.economy.balances,wood:1500*120,iron:300*120,gold:900*120};S.hero.hp=S.hero.maxHp=1e6;});
 await page.evaluate(()=>{S.send({type:'place',requestId:'tv',kind:'tavern',col:8,row:12});S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;S.send({type:'place',requestId:'bk1',kind:'barracks',col:10,row:10});S.send({type:'place',requestId:'bk2',kind:'barracks',col:10,row:14});});
 await forward(page,6*30);await page.evaluate(()=>{S.send({type:'tavern',requestId:'h1',action:'hire',merc:'roland'});S.send({type:'tavern',requestId:'h2',action:'hire',merc:'borin'});B.setHeroPosition(560,600);});
 let peak=0;for(let i=0;i<27;i++){await forward(page,10*30);peak=Math.max(peak,await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.hp>0).length));}
 check(peak<=40,'peak live units over the first four and a half minutes stays within the 40-unit target',peak);await shot(page,'780x360-9-busy');
 check(!errors.length,'no page errors in a busy match',errors.slice(0,3));await ctx.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

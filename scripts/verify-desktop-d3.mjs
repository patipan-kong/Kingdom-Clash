// Desktop UX D3 final (docs/DESKTOP_UX_D3.md): resizing and fullscreen, mouse targeting, placement, skills, hero commands, Tavern hiring,
// entity-heavy missions and touch controls under the default rendering. Needs a dev server (?tavernTest/?allyTest are dev-only):
// DESKTOP_URL=http://127.0.0.1:5721/ node scripts/verify-desktop-d3.mjs. ONLY=resize,hero runs some sections.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.DESKTOP_URL||'http://127.0.0.1:5721/',dir=process.env.DESKTOP_EVIDENCE||'docs/screenshots/desktop-d3';
await mkdir(dir,{recursive:true});
const only=process.env.ONLY?.split(','),want=n=>!only||only.includes(n);
const args=['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'];
const browser=await chromium.launch({channel:'chrome',headless:true,args});
let failed=0,total=0;const results=[],perf=[];
const check=(ok,name,detail)=>{total++;if(!ok)failed++;results.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok||detail===undefined?'':' '+JSON.stringify(detail)}`);};
const ready=async page=>{
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:90000});
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{const G=window.kingdomGame;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;window.S.hero.hp=window.S.hero.maxHp=1e6;window.H.perf?.setVisible(false);});
};
async function open(query,{w=1920,h=1080,locale='en',touch=false,dpr=1,from=browser,context}={}){
 const ctx=await from.newContext(context??{viewport:{width:w,height:h},deviceScaleFactor:dpr,...(touch?{hasTouch:true,isMobile:true}:{})}),page=await ctx.newPage(),errors=[];page.setDefaultNavigationTimeout(120000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(l=>localStorage.setItem('kingdom-clash.locale.v1',l),locale);
 await page.goto(`${base}${query}`);
 if(query.includes('debug=1'))await ready(page);else await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'),null,{timeout:90000});
 return {ctx,page,errors};
}
const frames=(page,n=4)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const rich=page=>page.evaluate(()=>{for(const [k,v] of Object.entries({gold:50000,wood:5000,iron:1000}))S.economy.balances[k]=v*120;});
const ticks=async(page,n=4)=>{const t=await page.evaluate(n=>S.clock.tick+n,n);await page.waitForFunction(t=>S.clock.tick>=t,t,{timeout:60000,polling:'raf'});await frames(page,2);};
/** A real mouse click at logical (960×540) coordinates. */
const toClient=(page,x,y)=>page.evaluate(([x,y])=>{const c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {x:c.x+x*k,y:c.y+y*k};},[x,y]);
const clickAt=async(page,x,y)=>{const p=await toClient(page,x,y);await page.mouse.click(p.x,p.y);await frames(page);};
const clickOn=async(page,expr)=>{const b=await page.evaluate(expr=>{const r=eval(expr).getBounds();return {x:r.centerX,y:r.centerY};},expr);await clickAt(page,b.x,b.y);};
/** Backing size, wanted k and every on-screen label below it, across all scenes. */
const sharpness=page=>page.evaluate(()=>{
 const g=window.kingdomGame,c=g.canvas,get=d=>Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,d).get.call(c),css=c.getBoundingClientRect(),k=Math.max(1,Math.min(2,css.height*devicePixelRatio/540));
 let count=0,low=[];
 const walk=list=>{for(const o of list){if(o.type==='Text'){count++;if(o.style.resolution<k-.001)low.push([o.text.slice(0,20),o.style.resolution]);}else if(Array.isArray(o.list))walk(o.list);}};
 for(const s of g.scene.scenes)walk(s.children.list);
 return {backing:[get('width'),get('height')],want:[Math.round(960*k),Math.round(540*k)],k:+k.toFixed(3),count,low:low.length,examples:low.slice(0,4),inner:[innerWidth,innerHeight]};
});
const sharp=s=>Math.abs(s.backing[0]-s.want[0])<=1&&Math.abs(s.backing[1]-s.want[1])<=1&&s.count>0&&s.low===0;
/** HUD label boxes, for comparing a resized window with a fresh load of the same size. */
const boxes=page=>page.evaluate(()=>{const out=[];const walk=list=>{for(const o of list){if(o.type==='Text'){if(o.visible&&!/\d+ ?fps|^\d+:\d+/i.test(o.text))out.push([o.text,Math.round(o.x),Math.round(o.y),Math.round(o.width),Math.round(o.height)]);}else if(Array.isArray(o.list))walk(o.list);}};walk(H.children.list);return out;});
const pauseSim=page=>page.evaluate(()=>{B.frozen=true;S.setPaused(true);B.tweens.timeScale=0;});
const resumeSim=page=>page.evaluate(()=>{B.frozen=false;S.setPaused(false);B.tweens.timeScale=1;});

if(want('resize'))for(const locale of ['en','th','ja']){
 const L=`${locale} resize`,{ctx,page,errors}=await open('?debug=1&level=3',{w:960,h:600,locale});
 let s=await sharpness(page);check(sharp(s)&&s.k===1,`${L}: small window starts at 960x540`,s);
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(1500);s=await sharpness(page);
 check(sharp(s)&&s.k===2,`${L}: enlarged to 1920x1080, backing and every label follow`,s);
 await page.screenshot({path:`${dir}/${locale}-resized-960-to-1920.png`});
 const resized=await boxes(page);await page.evaluate(()=>window.kingdomGame.loop.sleep()); // one software-rendered game at a time
 const fresh=await open('?debug=1&level=3',{locale});await fresh.page.waitForTimeout(500);const reference=await boxes(fresh.page);await fresh.page.screenshot({path:`${dir}/${locale}-fresh-1920.png`});await fresh.ctx.close();await page.evaluate(()=>window.kingdomGame.loop.wake());
 const key=b=>b.map(x=>x.join('|')).sort(),a=key(resized),b=key(reference),diff=[...a.filter(x=>!b.includes(x)),...b.filter(x=>!a.includes(x))];
 check(diff.length<=2,`${L}: label layout matches a fresh load of that size (${a.length} labels)`,diff.slice(0,6));
 await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(1200);s=await sharpness(page);check(sharp(s),`${L}: shrunk to 1366x768`,s);
 await page.setViewportSize({width:2560,height:1440});await page.waitForTimeout(1500);s=await sharpness(page);check(sharp(s)&&s.backing.join()==='1920,1080',`${L}: 2560x1440 stays capped at 1920x1080`,s);
 for(const key of ['KeyK','KeyB','KeyT']){await page.keyboard.press(key);await frames(page,4);s=await sharpness(page);check(sharp(s),`${L}: popup ${key} after resizing is sharp`,s);await page.keyboard.press(key);await frames(page,3);}
 // Menus: enlarge while on the main menu.
 await page.evaluate(()=>window.kingdomGame.loop.sleep());const menu=await open('',{w:960,h:600,locale});await menu.page.waitForTimeout(1000);await menu.page.setViewportSize({width:1920,height:1080});await menu.page.waitForTimeout(1500);
 s=await sharpness(menu.page);check(sharp(s),`${L}: main menu enlarged is sharp`,s);await menu.page.screenshot({path:`${dir}/${locale}-menu-resized.png`});
 check(!errors.length&&!menu.errors.length,`${L}: no page errors`,[...errors,...menu.errors]);await menu.ctx.close();await ctx.close();
}

if(want('fullscreen')){
 // A real window (no viewport emulation) so the browser's own fullscreen changes the page size.
 const win=await chromium.launch({channel:'chrome',headless:true,args:[...args,'--window-size=1100,720','--screen-info={1920x1080}']});
 const {ctx,page,errors}=await open('?debug=1&level=3',{from:win,context:{viewport:null}});const L='fullscreen';
 const before=await sharpness(page);
 for(let round=1;round<=2;round++){
  // The game's own control: Pause, then Fullscreen (offered on debug and touch launches).
  await page.keyboard.press('Space');await frames(page,4);await clickOn(page,"H.pauseButtons.find(b=>b.id==='fullscreen').hit");await page.waitForTimeout(1500);
  const inside=await page.evaluate(()=>!!document.fullscreenElement);const full=await sharpness(page);
  check(inside&&sharp(full),`${L} ${round}: entering keeps backing and labels sharp`,{inside,full,before});
   await clickOn(page,"H.pauseButtons.find(b=>b.id==='fullscreen').hit");await page.waitForTimeout(1500);
  const out=await page.evaluate(()=>!document.fullscreenElement),after=await sharpness(page);
  check(out&&sharp(after),`${L} ${round}: leaving restores a matching backing`,{out,after});
  await page.keyboard.press('Space');await frames(page,4);
 }
 // The browser's own window fullscreen (what F11 does): headless Chrome only grows the page this way.
 const cdp=await ctx.newCDPSession(page),{windowId}=await cdp.send('Browser.getWindowForTarget');
 const state=async windowState=>{await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState}});await page.waitForTimeout(1500);return sharpness(page);};
 const small=await sharpness(page),big=await state('fullscreen');check(sharp(big)&&big.inner[0]>small.inner[0]&&big.k>small.k,`${L}: window fullscreen enlarges the page; backing and every label follow`,{small,big});
 const back=await state('normal');check(sharp(back),`${L}: leaving window fullscreen restores a matching backing`,back);
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();await win.close();
}

if(want('mouse'))for(const [name,query] of [['default',''],['original','&res=540']]){
 const {ctx,page,errors}=await open(`?debug=1&level=3${query}`,{w:1100,h:700});const L=`mouse after resize (${name})`;
 await page.setViewportSize({width:1920,height:1080});await page.waitForTimeout(1200);await rich(page);
 // Target a Crimson tower by clicking its art.
 const target=await page.evaluate(()=>{const t=Object.values(S.state.structures).filter(s=>s.team==='red'&&s.kind==='tower'&&s.hp>0).sort((a,b)=>b.y-a.y)[0]; /* the front-most tower: nothing is drawn over it */ window.kingdomGame.events.emit('focus-map',t.x,t.y);return t.id;});await page.waitForTimeout(700);
 const at=await page.evaluate(async id=>{const {projection}=await import('/src/world/layout.ts');const u=S.state.structures[id],cam=B.cameras.main;return {x:u.x-cam.scrollX,y:u.y*projection.y-cam.scrollY-20};},target);
 await clickAt(page,at.x,at.y);await ticks(page,3);
 const picked=await page.evaluate(()=>S.state.selectedTarget);check(picked===target,`${L}: clicking a Crimson tower targets it`,{picked,target,at});
 // Skill button by mouse.
 await page.evaluate(()=>S.progression.award('d3',80+105));await page.evaluate(()=>S.send({type:'learn',requestId:'d3-taunt',skill:'taunt'}));await ticks(page,4);
 const b=await page.evaluate(()=>{const a=H.abilities.find(a=>a.id==='taunt');return {x:a.x,y:a.y,casts:a.casts};});await clickAt(page,b.x,b.y);await ticks(page,4);
 const cast=await page.evaluate(()=>({casts:H.abilities.find(a=>a.id==='taunt').casts,ready:S.state.skills.ready.taunt??0}));check(cast.casts===b.casts+1&&cast.ready>0,`${L}: one click on the Taunt button casts it once`,{before:b.casts,cast});
 // Tower placement with the mouse: the structure lands on the clicked cell.
 await page.evaluate(()=>{const k=S.state.bases['blue-base'];window.kingdomGame.events.emit('focus-map',k.x+250,k.y);});await page.waitForTimeout(700);
 await page.keyboard.press('KeyB');await frames(page,4);await clickOn(page,'H.buildPanel.hits[1]');
 const cell=await page.evaluate(async()=>{const {GRID,projection}=await import('/src/world/layout.ts');const cam=B.cameras.main,box=H.buildPanel.bounds;
  for(let row=0;row<S.geo.size.height/GRID;row++)for(let col=0;col<S.geo.size.width/GRID;col++){const x=col*GRID+GRID/2-cam.scrollX,y=(row*GRID+GRID/2)*projection.y-cam.scrollY;
   if(x>150&&x<800&&y>130&&y<400&&!(x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height)&&S.placementReason('tower',col,row)==='')return {x,y,col,row};}});
 await clickAt(page,cell.x,cell.y);await frames(page,6);await clickOn(page,'H.buildPanel.hits[2]');await ticks(page,6);
 const built=await page.evaluate(()=>Object.values(S.state.structures).filter(s=>s.id.startsWith('built-')).map(s=>[s.col,s.row]));
 check(built.length===1&&built[0][0]===cell.col&&built[0][1]===cell.row,`${L}: the Tower is built on the clicked cell`,{built,cell});
 await page.screenshot({path:`${dir}/mouse-placement-1920.png`});
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}

if(want('hero')){
 // Tavern: build it, hire from its panel, command the hired hero from the hero bar, all by mouse.
 const {ctx,page,errors}=await open('?debug=1&level=25&tavernTest=3');const L='hero';await rich(page);await frames(page,4);
 await page.keyboard.press('KeyB');await frames(page,4);await clickOn(page,'H.buildPanel.hits[7]');
 const cell=await page.evaluate(async()=>{const {GRID,projection}=await import('/src/world/layout.ts');const cam=B.cameras.main,box=H.buildPanel.bounds;
  for(let row=0;row<S.geo.size.height/GRID;row++)for(let col=0;col<S.geo.size.width/GRID;col++){const x=col*GRID+GRID/2-cam.scrollX,y=(row*GRID+GRID/2)*projection.y-cam.scrollY;
   if(x>150&&x<800&&y>150&&y<400&&!(x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height)&&S.placementReason('tavern',col,row)==='')return {x,y};}});
 await clickAt(page,cell.x,cell.y);await frames(page,6);await clickOn(page,'H.buildPanel.hits[2]');await ticks(page,6);await page.keyboard.press('Escape');await frames(page,4);
 // Let construction finish.
 await page.evaluate(()=>{for(let i=0;i<600&&!Object.values(S.state.structures).some(s=>s.tavern&&s.team==='blue'&&s.progress>=1);i++)S.advance(100);});await frames(page,8);
 await page.evaluate(()=>window.kingdomGame.events.emit('tavern-open'));
 const opened=await page.evaluate(()=>H.tavern.visible);await frames(page,6);
 const allies=()=>page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally).length);
 const n0=await allies();await clickOn(page,'H.tavern.rows[0].hitPrimary');await ticks(page,6);const n1=await allies();
 check(opened&&n1===n0+1,`${L}: one click in the Tavern panel hires one hero`,{opened,n0,n1});
 await page.screenshot({path:`${dir}/hero-tavern.png`});
 await page.keyboard.press('Escape');await frames(page,6);
 if(await page.evaluate(()=>H.paused)){await page.keyboard.press('Space');await frames(page,4);}
 if(await page.evaluate(()=>H.tavern.visible)){await page.evaluate(()=>H.closeTavern());await frames(page,4);}
 await clickOn(page,'H.heroBar.slots[0].hit');await frames(page,4);
 let mode=await page.evaluate(()=>H.heroState.mode);check(mode==='menu',`${L}: clicking the portrait opens the command menu`,mode);
 const defend=await page.evaluate(()=>{const i=2;return H.heroBar.buttons.length>i?i:H.heroBar.buttons.length-1;});
 await clickOn(page,`H.heroBar.buttons[${defend}].hit`);await frames(page,4);mode=await page.evaluate(()=>H.heroState.mode);
 check(mode==='defend'||mode==='attack',`${L}: clicking a command arms targeting`,mode);
 if(mode==='defend'){let order,reasons=[];
  for(const [dx,dy] of [[150,0],[200,60],[220,-60],[300,0],[120,110]]){
   const p=await page.evaluate(async([dx,dy])=>{const {projection}=await import('/src/world/layout.ts');const h=S.hero,cam=B.cameras.main;return {x:h.x+dx-cam.scrollX,y:(h.y+dy)*projection.y-cam.scrollY};},[dx,dy]);
   await clickAt(page,p.x,p.y);await ticks(page,4);mode=await page.evaluate(()=>H.heroState.mode);if(mode==='idle')break;reasons.push([p,await page.evaluate(()=>H.heroReason?.text??null)]);}
  order=await page.evaluate(()=>Object.values(S.state.units).find(u=>u.ally)?.ally?.order);
  check(mode==='idle'&&order?.type==='defend',`${L}: a map click on open ground gives the Defend order`,{mode,order,reasons});}
 await page.screenshot({path:`${dir}/hero-bar.png`});
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}

if(want('heavy'))for(const level of [35,36])for(const [name,query] of [['original','&res=540'],['default','&perf=1']]){
 const L=`level ${level} ${name}`,{ctx,page,errors}=await open(`?debug=1&level=${level}${query}`);
 // Two and a half minutes of match time with the Guardian and both Keeps unkillable, so the field fills up.
 await page.evaluate(()=>{window.keep=()=>{for(const b of Object.values(S.state.bases)){b.hp=b.maxHp=1e7;}S.hero.hp=S.hero.maxHp;};});
 for(let i=0;i<15;i++){await page.evaluate(()=>{keep();for(let j=0;j<100&&!S.ended;j++)S.advance(100);});await frames(page,1);}
 await page.evaluate(()=>{keep();const e=document.getElementById('render-stats');if(e)e.style.display='none';});await page.waitForTimeout(1500);
 const r=await page.evaluate(()=>new Promise(done=>{const t=[];let last=0;const f=n=>{keep();if(last)t.push(n-last);last=n;if(t.length<60)requestAnimationFrame(f);else{t.sort((a,b)=>a-b);done({avg:+(t.reduce((a,b)=>a+b,0)/t.length).toFixed(0),p95:+t[57].toFixed(0),units:Object.values(S.state.units).filter(u=>u.hp>0).length,structures:Object.values(S.state.structures).filter(s=>s.hp>0).length,ended:S.ended,seconds:Math.round(S.clock.seconds)});}};requestAnimationFrame(f);}));
 perf.push({level,mode:name,...r});
 check(!r.ended&&r.units>5,`${L}: runs with ${r.units} living units at ${r.seconds}s`,r);
 await page.screenshot({path:`${dir}/level${level}-${name}.png`});
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}

if(want('touch')){
 const {ctx,page,errors}=await open('?debug=1&level=3',{w:844,h:390,touch:true,dpr:3});const L='touch';
 const s=await page.evaluate(()=>{const c=window.kingdomGame.canvas;return [Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width').get.call(c),Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'height').get.call(c),!!document.getElementById('render-stats')];});
 check(s[0]===960&&s[1]===540&&!s[2],`${L}: 960x540 backing, no readout`,s);
 const tap=async(x,y)=>{const p=await toClient(page,x,y);await page.touchscreen.tap(p.x,p.y);await frames(page,4);};
 // Joystick drag moves the Guardian.
 const cdp=await ctx.newCDPSession(page),from=await toClient(page,110,420),send=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
 const x0=await page.evaluate(()=>S.hero.x);await send('touchStart',from.x,from.y);for(let i=1;i<=4;i++){await send('touchMove',from.x+i*15,from.y);await frames(page,2);}await ticks(page,20);await send('touchEnd');
 const x1=await page.evaluate(()=>S.hero.x);check(x1>x0+10,`${L}: joystick drag moves the Guardian`,[x0,x1]);
 await rich(page);
 await page.evaluate(()=>S.progression.award('d3t',80+105));await page.evaluate(()=>S.send({type:'learn',requestId:'d3-touch-bash',skill:'bash'}));await ticks(page,4);
 const b=await page.evaluate(()=>{const a=H.abilities.find(a=>a.id==='bash');return {x:a.x,y:a.y,casts:a.casts};});await tap(b.x,b.y);await ticks(page,4);
 check((await page.evaluate(()=>H.abilities.find(a=>a.id==='bash').casts))===b.casts+1,`${L}: a tap casts Bash once`);
 await page.evaluate(()=>H.showUtility('Build'));await frames(page,6);
 const card=await page.evaluate(()=>{const r=H.buildPanel.hits[0].getBounds();return {x:r.centerX,y:r.centerY};});await tap(card.x,card.y);
 check((await page.evaluate(()=>H.buildPanel.model.kind))==='wall',`${L}: a tap selects a Build card`);
 await page.screenshot({path:`${dir}/touch-844x390.png`});
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}
await writeFile(`${dir}/report-d3-final.json`,JSON.stringify({failed,results,perf},null,1));
if(perf.length)console.log(JSON.stringify(perf));
console.log(`${total-failed}/${total} passed`);
await browser.close();process.exit(failed?1:0);

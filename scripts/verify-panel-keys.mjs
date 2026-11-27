// Desktop UX D2.1 (docs/DESKTOP_UX_D2.md): keyboard navigation inside the Skills, Build and Shop popups, in the browser.
// Needs a dev server: DESKTOP_URL=http://127.0.0.1:5711/ node scripts/verify-panel-keys.mjs (levels through the dev-only ?debug=1&level=N).
// Stills go to DESKTOP_EVIDENCE (default docs/screenshots/desktop-d2-1).
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.DESKTOP_URL||'http://127.0.0.1:5711/',dir=process.env.DESKTOP_EVIDENCE||'docs/screenshots/desktop-d2-1';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;const results=[];
const check=(ok,name,detail)=>{if(!ok)failed++;results.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok||detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(w,h,query,{locale='en',touch=false}={}){
 const ctx=await browser.newContext({viewport:{width:w,height:h},...(touch?{hasTouch:true,isMobile:true}:{})}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(l=>localStorage.setItem('kingdom-clash.locale.v1',l),locale);
 await page.goto(`${base}?debug=1&${query}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:90000});
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{const G=window.kingdomGame;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;window.S.hero.hp=window.S.hero.maxHp=1e6;window.H.perf?.setVisible(false);});
 return {ctx,page,errors};
}
// Resources live in the economy in 1/120 units (RESOURCE_UNITS); GameState mirrors them each tick.
const setResources=(page,r)=>page.evaluate(r=>{for(const [k,v] of Object.entries(r))S.economy.balances[k]=v*120;},r);
const frames=(page,n=4)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const key=async(page,code,n=1)=>{for(let i=0;i<n;i++){await page.keyboard.press(code);await frames(page,3);}};
// Which control has focus: a Shop button id, a Build hit index, or a Skills row skill / Close / ‹ / ›.
const focus=page=>page.evaluate(()=>{
 const f=H.panelFocus.focused;if(!f)return {name:null,ring:H.panelFocus.ring?.visible};
 const shop=[...H.shop.buttons.entries()].find(([,b])=>b.hit===f)?.[0];
 const build=H.buildPanel.hits.indexOf(f);
 const row=H.skills.rows.find(r=>r.hit===f)?.skill;
 const skills=f===H.skills.closeHit?'close':f===H.skills.previous?'previous':f===H.skills.next?'next':row;
 return {name:shop?`shop:${shop}`:build>=0?`build:${build}`:skills?`skills:${skills}`:'?',enabled:!!f.input?.enabled,ring:H.panelFocus.ring.visible};
});
const state=page=>page.evaluate(()=>({skills:H.skillPanel.visible,build:H.utilityPanel.visible&&H.utilityMode==='Build',shop:H.shop.visible,paused:H.paused,
 ranks:{...S.state.heroProgression.ranks},points:S.state.heroProgression.skillPoints,gold:Math.floor(S.state.gold),items:S.state.inventory.slots.filter(Boolean).length,
 kind:H.buildPanel.model.kind,structures:Object.keys(S.state.structures).filter(id=>id.startsWith('built-')).length,hero:{x:S.hero.x,y:S.hero.y}}));

// 1. Skills: K opens with focus on a learnable skill; Enter learns it once even when held; arrows move between skills; K closes.
{
 const {ctx,page,errors}=await open(1280,720,'level=3');const L='skills';
 await page.evaluate(()=>S.progression.award('d21',80+105));await frames(page);
 await key(page,'KeyK');let f=await focus(page),s=await state(page);
 check(s.skills&&f.name?.startsWith('skills:')&&f.name!=='skills:close'&&f.enabled&&f.ring,`${L}: K opens Skills with a learnable skill focused and outlined`,f);
 const first=f.name.slice(7),before=s.ranks[first]??0;
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await page.waitForTimeout(300);s=await state(page);
 check(s.ranks[first]===before+1&&s.points===2,`${L}: Enter learns ${first} once, even held (auto-repeat ignored)`,{ranks:s.ranks,points:s.points});
 await key(page,'ArrowRight');f=await focus(page);const second=f.name;
 check(second!==`skills:${first}`&&second.startsWith('skills:'),`${L}: arrow moves to another control`,f);
 const moved=await focus(page);await key(page,'Enter');await page.waitForTimeout(300);s=await state(page);
 check(moved.enabled?s.points===1:s.points===2,`${L}: Enter on the next control acts only when it is enabled`,{moved,points:s.points});
 // Spend every point: focus stays on the (now unavailable) skill rather than jumping to Close, and Enter does nothing.
 await page.evaluate(()=>{for(const skill of ['taunt','bash','charge','fortitude'])S.send({type:'learn',requestId:'d21-spend-'+skill+Math.random(),skill});});await page.waitForTimeout(400);
 s=await state(page);f=await focus(page);await key(page,'Enter');const after=await state(page);
 check(s.points===0&&f.name!=='skills:close'&&after.skills&&JSON.stringify(after.ranks)===JSON.stringify(s.ranks),`${L}: with no points left, focus stays put and Enter changes nothing`,{f,points:s.points});
 await key(page,'Tab');const t1=await focus(page);await key(page,'Tab');const t2=await focus(page);await page.keyboard.press('Shift+Tab');await frames(page);const t3=await focus(page);
 check(t1.name!==t2.name&&t3.name===t1.name,`${L}: Tab and Shift+Tab step forward and back`,{t1,t2,t3});
 await page.screenshot({path:`${dir}/en-1280x720-skills.png`});
 const hero=s.hero;await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');s=await state(page);
 check(s.skills&&Math.abs(s.hero.x-hero.x)<1&&Math.abs(s.hero.y-hero.y)<1,`${L}: WASD in the popup never moves the Guardian`,{before:hero,after:s.hero});
 await key(page,'Digit3');s=await state(page);check(s.skills&&!(await page.evaluate(()=>S.state.skills.cast)),`${L}: skill keys do nothing behind the popup`);
 await key(page,'KeyK');s=await state(page);f=await focus(page);check(!s.skills&&!f.name&&!f.ring,`${L}: K closes Skills and clears the focus`,{s,f});
 await key(page,'KeyK');await key(page,'Escape');s=await state(page);check(!s.skills&&!s.paused,`${L}: Esc closes Skills (no pause)`,s);
 const x0=(await state(page)).hero.x;await page.keyboard.down('KeyD');await page.waitForTimeout(600);await page.keyboard.up('KeyD');
 check((await state(page)).hero.x>x0+10,`${L}: back in play, D moves the Guardian again`);
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}
// 2. Build: B opens on the Wall card; arrows move; Enter selects; the mouse places; Enter on Confirm builds. Unaffordable: selectable, but Confirm stays disabled.
{
 const {ctx,page,errors}=await open(1280,720,'level=3');const L='build';
 await key(page,'KeyB');let f=await focus(page),s=await state(page);check(s.build&&f.name==='build:0'&&f.ring,`${L}: B opens Build with the Wall card focused`,f);
 await key(page,'ArrowRight');f=await focus(page);check(f.name==='build:1',`${L}: Right moves to the Tower card`,f);
 await page.screenshot({path:`${dir}/en-1280x720-build.png`});
 await key(page,'Enter');s=await state(page);f=await focus(page);
 check(s.kind==='tower'&&f.name&&f.name!=='build:1',`${L}: Enter selects the Tower; focus moves to a control of the collapsed panel`,{kind:s.kind,f});
 // Existing mouse placement on a valid cell in view.
 const cell=await page.evaluate(async()=>{const {GRID,projection}=await import('/src/world/layout.ts');const cam=B.cameras.main,c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540,box=H.buildPanel.bounds;
  for(let row=0;row<S.geo.size.height/GRID;row++)for(let col=0;col<S.geo.size.width/GRID;col++){const x=col*GRID+GRID/2-cam.scrollX,y=(row*GRID+GRID/2)*projection.y-cam.scrollY;
   if(x>120&&x<840&&y>120&&y<420&&!(x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height)&&S.placementReason('tower',col,row)==='')return {x:c.x+x*k,y:c.y+y*k};}});
 await page.mouse.click(cell.x,cell.y);await frames(page,6);
 const confirm=await page.evaluate(()=>H.buildPanel.hits[2].input.enabled);
 for(let i=0;i<4&&(await focus(page)).name!=='build:2';i++)await key(page,'ArrowRight');
 f=await focus(page);await key(page,'Enter');await page.waitForTimeout(500);s=await state(page);
 check(confirm&&f.name==='build:2'&&s.structures===1,`${L}: mouse placement, then Confirm by keyboard builds the Tower`,{confirm,f,structures:s.structures});
 await key(page,'Escape');s=await state(page);check(!s.build,`${L}: Esc closes Build`,s);
 // A cell that would take a Wall (found while the Wood is there: placementReason includes the cost), then the Wood is gone.
 await setResources(page,{wood:500,iron:50});await frames(page,4);await key(page,'KeyB');
 const cell2=await page.evaluate(async()=>{const {GRID,projection}=await import('/src/world/layout.ts');const cam=B.cameras.main,c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540,box=H.buildPanel.bounds;
  for(let row=0;row<S.geo.size.height/GRID;row++)for(let col=0;col<S.geo.size.width/GRID;col++){const x=col*GRID+GRID/2-cam.scrollX,y=(row*GRID+GRID/2)*projection.y-cam.scrollY;
   if(x>120&&x<840&&y>120&&y<420&&!(x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height)&&S.placementReason('wall',col,row)==='')return {x:c.x+x*k,y:c.y+y*k};}});
 await setResources(page,{wood:0,iron:0});await frames(page,4);
 await key(page,'Enter');s=await state(page);
 check(s.kind==='wall'&&(await page.evaluate(()=>!S.constructionQuote('wall').available)),`${L}: an unaffordable Wall can still be chosen (the panel shows the shortage)`,{kind:s.kind});
 await page.mouse.click(cell2.x,cell2.y);await frames(page,6);
 for(let i=0;i<4&&(await focus(page)).name!=='build:2';i++)await key(page,'ArrowRight');
 const atConfirm=await focus(page);await key(page,'Enter');await page.waitForTimeout(500);s=await state(page);
 const status=await page.evaluate(()=>H.buildPanel.status.text);
 check(atConfirm.name==='build:2'&&!atConfirm.enabled&&s.structures===1,`${L}: without the Wood, Confirm is shut: Enter on it builds nothing`,{atConfirm,structures:s.structures,status});
 await page.screenshot({path:`${dir}/en-1280x720-build-unaffordable.png`});
 await key(page,'KeyB');s=await state(page);check(!s.build,`${L}: B closes Build`,s);
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}
// 3. Shop: T opens on the selected item; arrows pick an item; Enter shows it; Tab reaches Buy; Enter buys once even held; no Gold: Buy stays shut.
{
 const {ctx,page,errors}=await open(1280,720,'level=3');const L='shop';
 await setResources(page,{gold:5000});await frames(page,4);
 await key(page,'KeyT');let f=await focus(page),s=await state(page);const product=await page.evaluate(()=>H.shop.model.product);
 check(s.shop&&f.name===`shop:item-${product}`&&f.ring,`${L}: T opens the Shop with the selected item focused`,{f,product});
 await key(page,'ArrowRight');f=await focus(page);await key(page,'Enter');const picked=await page.evaluate(()=>H.shop.model.product);
 check(f.name===`shop:item-${picked}`&&picked!==product,`${L}: Right then Enter selects the next item`,{f,picked});
 await page.waitForTimeout(350); // the Shop's own double-tap guard after a selection
 for(let i=0;i<20&&(await focus(page)).name!==`shop:${picked}`;i++)await key(page,'Tab');
 // Away from the Azure Keep this mission's Shop does not trade: Buy is shut and Enter on it does nothing.
 f=await focus(page);const away=await page.evaluate(()=>S.shopAccessReason());await key(page,'Enter');await page.waitForTimeout(300);
 check(f.name===`shop:${picked}`&&!f.enabled&&away==='Return to Azure Keep'&&(await state(page)).items===0,`${L}: away from the Keep, Enter on Buy buys nothing`,{f,away});
 // At the Keep (nearest open ground to it), the same Buy opens.
 await page.evaluate(()=>{const k=S.state.bases['blue-base'];for(const [dx,dy] of [[90,0],[110,40],[110,-40],[140,0],[70,70],[70,-70]])if(B.setHeroPosition(k.x+dx,k.y+dy))break;});await frames(page,8);
 f=await focus(page);const g0=(await state(page)).gold,n0=(await state(page)).items;
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');await page.waitForTimeout(500);s=await state(page);
 check(f.name===`shop:${picked}`&&s.items===n0+1&&s.gold<g0,`${L}: Tab reaches Buy; Enter buys exactly one, even held`,{f,items:[n0,s.items],gold:[g0,s.gold]});
 await page.screenshot({path:`${dir}/en-1280x720-shop.png`});
 await setResources(page,{gold:0});await frames(page,4);
 f=await focus(page);await key(page,'Enter');await page.waitForTimeout(300);const s2=await state(page);
 check(f.name===`shop:${picked}`&&!f.enabled&&s2.items===s.items,`${L}: with no Gold, Buy keeps focus but buys nothing`,{f,items:s2.items});
 // Mixed: a mouse press on another tile moves the keyboard focus there.
 const tile=await page.evaluate(()=>{const id=[...H.shop.buttons.keys()].filter(k=>k.startsWith('item-'))[0],b=H.shop.buttons.get(id).hit.getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {id,x:c.x+b.centerX*k,y:c.y+b.centerY*k};});
 await page.mouse.click(tile.x,tile.y);await frames(page,4);f=await focus(page);
 check(f.name===`shop:${tile.id}`,`${L}: a mouse click moves the keyboard focus to that tile`,{f,tile:tile.id});
 await key(page,'KeyT');s=await state(page);check(!s.shop,`${L}: T closes the Shop`,s);
 // Repeated opening and switching.
 for(const k of ['KeyT','KeyB','KeyK','KeyT','KeyT','KeyB','KeyB','KeyK','KeyK'])await key(page,k);s=await state(page);f=await focus(page);
 check(!s.shop&&!s.build&&!s.skills&&!f.name&&!f.ring,`${L}: repeated opening, switching and closing ends with nothing open and no stray focus`,{s,f});
 await key(page,'KeyT');await key(page,'Space');f=await focus(page);check(!f.ring,`${L}: the outline hides while paused`,f);await key(page,'Space');
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}
// 4. Touch mode: no focus, no outline; the popups behave as before.
{
 const {ctx,page,errors}=await open(844,390,'level=3',{touch:true});
 await page.evaluate(()=>H.openSkills());await frames(page,4);const f=await focus(page);
 check(!f.name&&!f.ring,'touch: no keyboard focus or outline on the touch HUD',f);
 check(!errors.length,'touch: no page errors',errors);await ctx.close();
}
// 5. Locales and sizes: each popup with its focus outline, EN / TH / JA.
for(const [locale,w,h] of [['en',1920,1080],['th',960,540],['ja',1366,768],['th',1280,720],['ja',960,540]]){
 const {ctx,page,errors}=await open(w,h,'level=3',{locale});const L=`${locale} ${w}x${h}`;
 await page.evaluate(()=>S.progression.award('d21-l',80+105));await setResources(page,{gold:600});
 for(const [k,name] of [['KeyK','skills'],['KeyB','build'],['KeyT','shop']]){
  await key(page,k);await key(page,'ArrowRight');const f=await focus(page);
  check(f.name?.startsWith(name)&&f.ring,`${L}: ${name} focus outlined after a move`,f);
  await page.screenshot({path:`${dir}/${locale}-${w}x${h}-${name}.png`});await key(page,k);
 }
 check(!errors.length,`${L}: no page errors`,errors);await ctx.close();
}
await writeFile(`${dir}/report.json`,JSON.stringify({failed,results},null,1));
console.log(failed?`${failed} check(s) FAILED`:'All popup keyboard checks passed');
await browser.close();process.exit(failed?1:0);

// Desktop UX D3 (docs/DESKTOP_UX_D3.md): one Enter press or one mouse click acts exactly once in the Shop and Build popups.
// Needs a dev server: DESKTOP_URL=http://127.0.0.1:5721/ node scripts/verify-single-press.mjs. Effects are judged by simulation ticks, not
// wall-clock waits: a slow (software-rendered) frame delays the tick that applies a command, which is lateness, not a lost press.
import {chromium} from '@playwright/test';
const base=process.env.DESKTOP_URL||'http://127.0.0.1:5721/';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0,total=0;
const check=(ok,name,detail)=>{total++;if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${ok||detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(){
 const ctx=await browser.newContext({viewport:{width:1280,height:720}}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=3${process.env.DESKTOP_QUERY?`&${process.env.DESKTOP_QUERY}`:''}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:90000});
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{const G=window.kingdomGame;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;window.S.hero.hp=window.S.hero.maxHp=1e6;window.H.perf?.setVisible(false);});
 return {ctx,page,errors};
}
const frames=(page,n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const rich=page=>page.evaluate(()=>{for(const [k,v] of Object.entries({gold:50000,wood:5000,iron:1000}))S.economy.balances[k]=v*120;});
const tick=page=>page.evaluate(()=>S.clock.tick);
const ticks=(page,t)=>page.waitForFunction(t=>S.clock.tick>=t,t,{timeout:60000,polling:'raf'});
const click=async(page,expr)=>{
 const p=await page.evaluate(expr=>{const b=eval(expr).getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {x:c.x+b.centerX*k,y:c.y+b.centerY*k};},expr);
 await page.mouse.click(p.x,p.y);await frames(page);
};
const centre=(page,expr)=>page.evaluate(expr=>{const b=eval(expr).getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {x:c.x+b.centerX*k,y:c.y+b.centerY*k};},expr);
const focusOn=async(page,expr)=>{for(let i=0;i<30;i++){if(await page.evaluate(expr=>H.panelFocus.focused===eval(expr),expr))return true;await page.keyboard.press('Tab');await frames(page);}return false;};
/** One input, then the count right after the command's tick and again later: both must be exactly +1. */
async function once(page,name,count,act){
 const before=await page.evaluate(count),t=await tick(page);await act();
 await ticks(page,t+3);await frames(page);const soon=await page.evaluate(count);
 await ticks(page,t+14);const later=await page.evaluate(count);
 check(soon===before+1&&later===before+1,name,{before,soon,later});
 await page.waitForTimeout(400); // past the popups' own 350 ms same-intent guard
}
const items=()=>S.state.inventory.slots.filter(Boolean).length,built=()=>Object.keys(S.state.structures).filter(id=>id.startsWith('built-')).length;

// Shop: six purchases (an inventory's worth), alternating one Enter and one click.
{
 const {ctx,page,errors}=await open();await rich(page);
 await page.evaluate(()=>{const k=S.state.bases['blue-base'];for(const [dx,dy] of [[90,0],[110,40],[110,-40],[140,0],[70,70],[70,-70]])if(B.setHeroPosition(k.x+dx,k.y+dy))break;});await frames(page,8);
 await page.keyboard.press('KeyT');await frames(page,4);
 const products=await page.evaluate(()=>[...H.shop.buttons.keys()].filter(k=>k.startsWith('item-')&&k!=='item-flame-blade').map(k=>k.slice(5)));
 for(let i=0;i<6;i++){
  const id=products[i%products.length],buy=`H.shop.buttons.get('${id}').hit`,keyboard=i%2===0;
  await click(page,`H.shop.buttons.get('item-${id}').hit`);await page.waitForTimeout(400);
  if(keyboard){await focusOn(page,buy);await once(page,`shop purchase ${i+1} (${id}): one Enter buys exactly one`,items,()=>page.keyboard.press('Enter'));}
  else await once(page,`shop purchase ${i+1} (${id}): one click buys exactly one`,items,async()=>{const p=await centre(page,buy);await page.mouse.click(p.x,p.y);});
 }
 check(!errors.length,'shop: no page errors',errors);await ctx.close();
}
// Build: six Walls, alternating one Enter and one click on Confirm.
const freeCell=page=>page.evaluate(async()=>{const {GRID,projection}=await import('/src/world/layout.ts');const cam=B.cameras.main,c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540,box=H.buildPanel.bounds;
 for(let row=0;row<S.geo.size.height/GRID;row++)for(let col=0;col<S.geo.size.width/GRID;col++){const x=col*GRID+GRID/2-cam.scrollX,y=(row*GRID+GRID/2)*projection.y-cam.scrollY;
  if(x>120&&x<840&&y>120&&y<420&&!(x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height)&&S.placementReason('wall',col,row)==='')return {x:c.x+x*k,y:c.y+y*k};}});
{
 const {ctx,page,errors}=await open();await rich(page);await frames(page,4);
 for(let i=0;i<6;i++){
  const keyboard=i%2===0;
  await page.keyboard.press('KeyB');await frames(page,4);await click(page,'H.buildPanel.hits[0]');
  const cell=await freeCell(page);await page.mouse.click(cell.x,cell.y);await frames(page,4);
  if(keyboard){await focusOn(page,'H.buildPanel.hits[2]');await once(page,`build ${i+1}: one Enter on Confirm builds exactly one Wall`,built,()=>page.keyboard.press('Enter'));}
  else await once(page,`build ${i+1}: one click on Confirm builds exactly one Wall`,built,async()=>{const p=await centre(page,'H.buildPanel.hits[2]');await page.mouse.click(p.x,p.y);});
  await page.keyboard.press('Escape');await frames(page,4);
 }
 check(!errors.length,'build: no page errors',errors);await ctx.close();
}
// A press dragged off one control and released on another must not swallow the next Enter on the first.
const dragOff=async(page,from,to)=>{const a=await centre(page,from),b=await centre(page,to);await page.mouse.move(a.x,a.y);await page.mouse.down();await frames(page);await page.mouse.move(b.x,b.y);await frames(page);await page.mouse.up();await frames(page,4);};
{
 const {ctx,page,errors}=await open();await rich(page);await frames(page,4);
 await page.keyboard.press('KeyB');await frames(page,4);
 await dragOff(page,'H.buildPanel.hits[0]','H.buildPanel.hits[1]');
 const untouched=await page.evaluate(()=>H.buildPanel.model.kind??null);await focusOn(page,'H.buildPanel.hits[0]');await page.keyboard.press('Enter');await frames(page,4);
 const kind=await page.evaluate(()=>H.buildPanel.model.kind??null);
 check(untouched===null&&kind==='wall','build: after a drag-off, one Enter still selects the card',{untouched,kind});
 await page.keyboard.press('Escape');await frames(page,4);
 await page.evaluate(()=>{const k=S.state.bases['blue-base'];for(const [dx,dy] of [[90,0],[110,40],[110,-40],[140,0],[70,70],[70,-70]])if(B.setHeroPosition(k.x+dx,k.y+dy))break;});await frames(page,8);
 await page.keyboard.press('KeyT');await frames(page,4);
 const id=await page.evaluate(()=>H.shop.model.product),buy=`H.shop.buttons.get('${id}').hit`,other=await page.evaluate(id=>[...H.shop.buttons.keys()].find(k=>k.startsWith('item-')&&k!=='item-'+id),id);
 await page.waitForTimeout(400);const n=await page.evaluate(items);await dragOff(page,buy,`H.shop.buttons.get('${other}').hit`);
 check((await page.evaluate(items))===n,'shop: a drag-off from Buy buys nothing');
 await focusOn(page,buy);await once(page,'shop: after a drag-off, one Enter on Buy buys exactly one',items,()=>page.keyboard.press('Enter'));
 await page.keyboard.press('KeyT');await frames(page,4);
 await page.evaluate(()=>S.progression.award('single-press',80+105));await page.keyboard.press('KeyK');await frames(page,4);
 const skill=await page.evaluate(()=>H.skills.rows.find(r=>r.hit.input?.enabled).skill),row=`H.skills.rows.find(r=>r.skill==='${skill}').hit`;
 await dragOff(page,row,'H.skills.closeHit');
 await focusOn(page,row);await once(page,`skills: after a drag-off, one Enter learns ${skill} once`,new Function(`return S.state.heroProgression.ranks['${skill}']??0`),()=>page.keyboard.press('Enter'));
 check(!errors.length,'drag-off: no page errors',errors);await ctx.close();
}
console.log(`${total-failed}/${total} passed`);
await browser.close();process.exit(failed?1:0);

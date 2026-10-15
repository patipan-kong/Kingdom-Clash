import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.EQUIPMENT_EVIDENCE_ROOT||'docs/ui-v042-equipment-slice2';await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[],checks=[],measurements=[];
page.on('pageerror',e=>errors.push(e.message));
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5198/?encounter=extended';
function check(ok,name){checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);}
const state=()=>page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),s=g.scene.getScene('Battle').simulation,m=h.shop.model;return{visible:h.shop.visible,view:m.view,selected:m.selected,selectedSlot:m.selectedSlot,confirming:m.confirming,confirmedInstance:m.confirmedInstance,pending:m.pending,message:m.message,product:m.product,gold:s.state.gold,slots:[...s.state.inventory.slots],instances:structuredClone(s.state.inventory.instances),timeScale:s.clock.timeScale,paused:s.clock.paused,matchId:s.state.inventory.matchId};});
async function press(id,wait=75,kind='shop'){
 const pt=await page.evaluate(({id,kind})=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),o=kind==='utility'?h.utilities.find(u=>u.id===id).hit:kind==='restart'?h.restartHit:h.shop.buttons.get(id).hit;if(!o.visible)throw Error('Hidden control '+id);const b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{id,kind});
 await page.touchscreen.tap(pt.x,pt.y);if(wait)await page.waitForTimeout(wait);
}
async function ready(){await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD').shop);await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect();return Math.abs(r.width-g.scale.canvasBounds.width)<1;});}
async function settled(){await page.waitForFunction(()=>!window.kingdomGame.scene.getScene('HUD').shop.model.pending);await page.waitForTimeout(50);}
async function fresh(ids=[]){
 await page.goto(url);await ready();
 await page.evaluate(ids=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;b.setHeroPosition(450,600);for(let i=0;i<220;i++)s.economy.apply({type:'minion-reward',id:'equipment-fixture-funds-'+i});ids.forEach((id,i)=>s.send(id==='flame-blade'?{type:'fuse-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'fixture-'+i,itemId:id,componentIds:[]}:{type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'fixture-'+i,itemId:id}));},ids);
 await page.waitForFunction(n=>window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.slots.filter(Boolean).length===n,ids.length);
 await press('shop',80,'utility');await press('equipment');
}
async function viewport(width,height,safe=false){await page.setViewportSize({width,height});await page.evaluate(safe=>{const e=document.getElementById('game');for(const [k,v] of Object.entries({left:32,right:12,top:8,bottom:12}))if(safe)e.style.setProperty('--safe-'+k,v+'px');else e.style.removeProperty('--safe-'+k);},safe);await page.waitForTimeout(180);}
async function geometry(label){
 const r=await page.evaluate(()=>{
  const g=window.kingdomGame,h=g.scene.getScene('HUD'),shop=h.shop,f=shop.bounds,canvas=g.canvas.getBoundingClientRect(),scale=canvas.height/540;
  const buttons=[...shop.buttons.entries()].filter(([,b])=>b.hit.visible),texts=shop.container.list.filter(o=>o.type==='Text'&&o.visible&&o.text),overlap=(a,b)=>a.left<b.right-.2&&a.right>b.left+.2&&a.top<b.bottom-.2&&a.bottom>b.top+.2;
  const badText=texts.filter(t=>{const r=t.getBounds();return r.left<f.x-.5||r.right>f.x+f.width+.5||r.top<f.y-.5||r.bottom>f.y+f.height+.5;}).map(t=>t.text);
  const textOverlap=texts.flatMap((t,i)=>texts.slice(i+1).filter(u=>overlap(t.getBounds(),u.getBounds())).map(u=>[t.text,u.text]));
  const ownsSlotText=(t,id,b)=>{const i=Math.max(shop.slotNames.indexOf(t),shop.slotNumbers.indexOf(t)),r=t.getBounds(),q=b.hit.getBounds();return i>=0&&id==='slot-'+i&&r.left>=q.left-.5&&r.right<=q.right+.5&&r.top>=q.top-.5&&r.bottom<=q.bottom+.5;};
  const actionOverlap=texts.filter(t=>!buttons.some(([,b])=>b.label===t)&&buttons.some(([id,b])=>overlap(t.getBounds(),b.hit.getBounds())&&!ownsSlotText(t,id,b))).map(t=>t.text);
  const slots=buttons.filter(([id])=>id.startsWith('slot-'));
  const sell=shop.buttons.get('sell').hit,compact=canvas.width<880||canvas.height<480,saleAction=!sell.visible||compact||sell.width*scale>=140&&sell.width*scale<=180&&Math.abs((f.x+f.width-sell.getBounds().right)*scale-(shop.model.confirming?88:8))<.5;
  return{canvas:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height},panel:{x:f.x*scale,y:f.y*scale,width:f.width*scale,height:f.height*scale},six:slots.length===6,saleAction,touch:buttons.every(([,b])=>b.hit.width*scale>=47.9&&b.hit.height*scale>=47.9),separate:buttons.every(([,b],i)=>buttons.slice(i+1).every(([,c])=>!overlap(b.hit.getBounds(),c.hit.getBounds()))),hud:f.y>=h.topHudBottom,reserve:(540-f.y-f.height)*scale>=23.9,minFont:Math.min(...texts.map(t=>parseFloat(t.style.fontSize)*scale)),badText,textOverlap,actionOverlap,icons:shop.equipmentIcons.filter(i=>i?.visible).map(i=>({slot:i.getData('slotIndex'),instance:i.getData('instanceId'),item:i.getData('itemId'),painted:i.getData('finalArt')}))};
 });
 measurements.push({label,...r});check(r.six&&r.saleAction&&r.touch&&r.separate&&r.hud&&r.reserve&&r.minFont>=11.9&&!r.badText.length&&!r.textOverlap.length&&!r.actionOverlap.length,label+' geometry '+JSON.stringify(r));
}
async function capture(name){if(process.env.CAPTURE_SCREENSHOT!=='0')await page.screenshot({path:`${root}/${name}.png`});}
try{
 await fresh();check((await state()).timeScale===.25,'Equipment retains quarter-speed combat');await geometry('844 empty');await capture('empty-844x390');
 for(let i=0;i<6;i++){await press('slot-'+i);check(await page.evaluate(i=>{const shop=window.kingdomGame.scene.getScene('HUD').shop;return shop.model.selectedSlot===i&&!shop.model.selected&&shop.title.text===`Slot ${i+1} · Empty`&&!shop.buttons.get('sell').hit.visible;},i),'empty slot '+(i+1)+' has neutral state and no Sell');}
 await press('slot-0');await press('shop');await press('item-iron-sword');await press('iron-sword');await settled();await press('back');await press('equipment');
 check(await page.evaluate(()=>{const shop=window.kingdomGame.scene.getScene('HUD').shop,inv=window.kingdomGame.scene.getScene('Battle').simulation.state.inventory;return !!inv.slots[0]&&!shop.model.selected&&shop.model.selectedSlot===undefined&&shop.title.text==='Auto-equipped'&&!shop.buttons.get('sell').hit.visible&&shop.equipmentIcons[0].getData('instanceId')===inv.slots[0];}),'purchase filling inspected empty slot clears stale Empty selection without auto-selecting new instance');
 await fresh(['guardian-shield']);await press('slot-0');check(await page.evaluate(()=>{const shop=window.kingdomGame.scene.getScene('HUD').shop;return shop.title.text==='Guardian Shield'&&shop.detail.text.includes('HP +250')&&shop.detail.text.includes('Armor +15')&&shop.buttons.get('sell').label.text==='Sell · 300 Gold';}),'occupied detail shows actual full effects and authoritative refund');await geometry('844 occupied');await capture('occupied-844x390');
 await viewport(960,540);await geometry('960 occupied');await capture('occupied-960x540');await capture('selected-details-and-sell');
 const full=['iron-sword','iron-sword','ruby-gem','ruby-gem','guardian-shield','commander-banner'];await fresh(full);await geometry('960 six occupied');await capture('full-six-slots-960x540');
 for(const [width,height,safe] of [[844,390,false],[960,540,false],[1280,720,false],[844,390,true],[960,540,true],[1280,720,true]]){
  await viewport(width,height,safe);
  for(let i=0;i<6;i++){
   await press('slot-'+i);const st=await state();check(st.selected===st.slots[i]&&st.selectedSlot===i,'exact slot '+(i+1)+' selected at '+width+(safe?' safe':''));await geometry(`${width}x${height}${safe?' safe':''} slot ${i+1}`);
  }
 }
 await viewport(960,540);await press('slot-1');await capture('duplicate-item-instances');let st=await state(),target=st.slots[1],retained=st.slots[0],before=st.gold;
 await press('sell');check((await state()).confirmedInstance===target&&(await state()).confirming&&(await state()).slots[1]===target,'confirmation belongs to exact second Sword without optimistic removal');await geometry('sale confirmation');await capture('sale-confirmation');
 await press('cancel');check(!(await state()).confirming&&(await state()).gold===before&&(await state()).slots[1]===target,'cancel keeps exact item and Gold');
 await press('sell');await press('slot-0');check(!(await state()).confirming&&(await state()).selected===retained,'changing slots cancels previous confirmation');
 await press('slot-1');await press('sell');await page.evaluate(()=>window.kingdomGame.loop.sleep());await press('sell',0);await press('sell',0);
 check(await page.evaluate(target=>{const h=window.kingdomGame.scene.getScene('HUD'),s=window.kingdomGame.scene.getScene('Battle').simulation;return h.shop.model.pending?.action==='sell'&&h.shop.model.selected===target&&s.state.inventory.slots[1]===target&&s.commands.filter(c=>c.type==='sell-item'&&c.instanceId===target).length===1&&![...h.shop.buttons].some(([id,b])=>id.startsWith('slot-')&&b.hit.input.enabled);},target),'pending double tap queues exactly one sale; locks selected instance and keeps inventory');
 await page.evaluate(()=>window.kingdomGame.loop.wake());await settled();st=await state();check(st.slots[1]===null&&st.slots[0]===retained&&st.gold===before+120&&!st.selected,'acknowledged sale removes only second Sword and refunds 120');await press('slot-1');check(!(await state()).selected,'sold slot is neutral despite remaining duplicate');
 // Force access to change after confirmation but before execution, exercising real rejection.
 await press('slot-0');await press('sell');before=(await state()).gold;await page.evaluate(()=>window.kingdomGame.loop.sleep());await press('sell',0);await page.evaluate(()=>{window.kingdomGame.scene.getScene('Battle').simulation.hero.x=1500;window.kingdomGame.loop.wake();});await settled();st=await state();
 check(st.slots[0]===retained&&st.selected===retained&&st.gold===before&&st.message==='Return to Azure Keep','rejected sale retains exact item and Gold without false success');
 check(await page.evaluate(()=>{const shop=window.kingdomGame.scene.getScene('HUD').shop;return !shop.buttons.get('sell').hit.input.enabled&&shop.status.text==='Move near Azure Keep';}),'rejected sale displays authoritative restriction');
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=0;s.hero.respawnTick=s.clock.tick+10000;});await page.waitForTimeout(80);await press('sell');await press('sell');await settled();st=await state();check(st.slots[0]===null&&st.gold===before+120,'dead distant Guardian sale is still permitted');
 // External authoritative mutation: selected component is consumed by Fusion while Equipment is open.
 await fresh(['iron-sword','iron-sword','ruby-gem']);await press('slot-1');await press('sell');st=await state();target=st.slots[1];retained=st.slots[0];
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.send({type:'fuse-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'external-selected-fusion',itemId:'flame-blade',componentIds:[s.state.inventory.slots[1],s.state.inventory.slots[2]]});});
 await page.waitForFunction(id=>!window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.instances[id],target);await page.waitForTimeout(60);st=await state();check(!st.selected&&!st.confirming&&st.slots[0]===retained&&!st.instances[target],'Fusion clears stale selected/confirmed component and preserves duplicate');await geometry('Fusion consumes selected component');
 await press('slot-0');await press('sell');
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.send({type:'sell-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'external-sell-selection',instanceId:s.state.inventory.slots[0]});s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'external-replacement',itemId:'iron-sword'});});
 await page.waitForFunction(old=>window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.slots[0]!==old,retained);await page.waitForTimeout(80);st=await state();check(!st.selected&&!st.confirming&&st.slots[0]!==retained,'same-type replacement in same slot cannot inherit stale sale confirmation');
 // All seven full item details, including longest passive copy, at compact/safe sizes.
 for(const id of ['iron-sword','guardian-shield','ruby-gem','flame-blade','builders-crown','siege-hammer','commander-banner']){
  await fresh([id]);for(const safe of [false,true]){await viewport(844,390,safe);await press('slot-0');await geometry('compact '+id+(safe?' safe':''));}
 }
 await viewport(960,540);await fresh(['siege-hammer']);await press('slot-0');const selected=(await state()).selected;
 await press('shop');await press('item-ruby-gem');await press('equipment');check((await state()).selected===selected,'Equipment selection survives tab round trip');await capture('navigation-equipment');await press('shop');check((await state()).product==='ruby-gem','Shop previous product retained on return');await capture('navigation-shop');await press('equipment');
 const combat=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return{x:s.hero.x,y:s.hero.y,tick:s.clock.tick};});await page.keyboard.down('d');await page.evaluate(()=>window.kingdomGame.events.emit('cast','attack'));await page.waitForTimeout(450);await page.keyboard.up('d');
 check(await page.evaluate(before=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return s.hero.x===before.x&&s.hero.y===before.y&&!s.state.attacking&&s.clock.tick>before.tick&&s.clock.timeScale===.25;},combat),'Equipment suppresses Guardian movement/casts while combat continues');
 await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(true));check((await state()).paused&&!(await state()).visible,'Pause closes Equipment and freezes');await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(false));await press('shop',75,'utility');await press('equipment');
 await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.bases['red-base'].hp=0);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.ended);check(!(await state()).visible,'results close Equipment');await press('',80,'restart');await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.matchId==='match-2');await press('shop',80,'utility');await press('equipment');st=await state();check(!st.selected&&!st.confirming&&!st.pending&&st.slots.every(i=>i===null)&&st.gold===250,'restart clears selection, confirmation, pending and inventory');
 await press('close');check(!(await state()).visible&&(await state()).timeScale===1,'Close restores combat speed');await press('shop',80,'utility');await press('equipment');check((await state()).visible,'one Equipment activation after restart and cleanup');check(errors.length===0,'no browser JavaScript errors');
}catch(e){errors.push(e.stack||String(e));console.error(e);await page.screenshot({path:`${root}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();await writeFile(`${root}/verification.json`,JSON.stringify({checks,errors,measurements,fixtures:'Real touchscreen UI. Disposable validated position, reward-ledger funding, authoritative buy/fuse/sell commands, loop sleep for pending/rejection, external transaction mutations for stale selection, controlled death/result for lifecycle. No gameplay code edits.'},null,2));}
console.log(`${checks.filter(c=>c.passed).length}/${checks.length} Equipment checks passed`);

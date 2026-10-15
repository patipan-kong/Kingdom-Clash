import {clickGame} from './browser-coordinates.mjs';
const ordinary=new Set(['iron-sword','guardian-shield','ruby-gem','builders-crown','siege-hammer','commander-banner']);
export async function shopPainted(page){const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>f+2,frame);}
async function raw(page,id,frames=true){const p=await page.evaluate(id=>{const b=window.kingdomGame.scene.getScene('HUD').shop.buttons.get(id);if(!b?.hit.visible)throw Error('Hidden Shop control '+id);const r=b.hit.getBounds();return{x:r.centerX,y:r.centerY};},id);await clickGame(page,p.x,p.y);if(frames)await shopPainted(page);}
export async function shopGrid(page){
 let view=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').shop.model.view);
 if(view==='components'){await raw(page,'shop');view='fusion';}
 if(view==='equipment')await raw(page,'shop');else if(view!=='shop')await raw(page,'back');
}
export async function inspectShopItem(page,id){await shopGrid(page);await raw(page,'item-'+id);}
export async function openShopRecipe(page){await inspectShopItem(page,'flame-blade');if(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').shop.model.view==='shop'))await raw(page,'recipe');}
export async function shopButton(page,id,frames=true){
 if(id==='flame-blade'){await openShopRecipe(page);return;}
 let view=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').shop.model.view);
 if(id==='shop'&&(view==='detail'||view==='fusion')){await raw(page,'back',frames);return;}
 if(id==='equipment'&&(view==='detail'||view==='fusion'))await shopGrid(page);
 if(ordinary.has(id)){
  const visible=await page.evaluate(id=>window.kingdomGame.scene.getScene('HUD').shop.buttons.get(id).hit.visible,id);
  if(!visible){if(!frames)throw Error('Prepare selected item before freezing frames');await inspectShopItem(page,id);}
  // Fixture funding updates the ledger before the next HUD render enables Buy.
  // Wait for that real control state; never retry or bypass a disabled purchase.
  if(frames)await page.waitForFunction(id=>window.kingdomGame.scene.getScene('HUD').shop.buttons.get(id).hit.input.enabled,id);
  // These calls are intentional repeat purchases, unlike the frames=false rapid-tap checks.
  if(frames){const remaining=await page.evaluate(id=>{const t=window.kingdomGame.scene.getScene('HUD').shop.lastTrade;return t?.key===`buy:${id}`?Math.max(0,370-(performance.now()-t.at)):0;},id);if(remaining)await page.waitForTimeout(remaining);}
 }
 await raw(page,id,frames);
}
export async function shopGeometry(page){return page.evaluate(()=>{
 const g=window.kingdomGame,h=g.scene.getScene('HUD'),f=h.shop.bounds,s=g.canvas.getBoundingClientRect().height/540,buttons=[...h.shop.buttons.values()].filter(b=>b.hit.visible),texts=h.shop.container.list.filter(t=>t.type==='Text'&&t.visible&&t.text),overlap=(a,b)=>a.left<b.right-.1&&a.right>b.left+.1&&a.top<b.bottom-.1&&a.bottom>b.top+.1;
 return{touch:buttons.every(b=>b.hit.getBounds().width*s>=47.9&&b.hit.getBounds().height*s>=47.9),separate:buttons.every((b,i)=>buttons.slice(i+1).every(c=>!overlap(b.hit.getBounds(),c.hit.getBounds()))),bounds:f.y>=h.topHudBottom&&(540-f.y-f.height)*s>=23.9,text:texts.every(t=>{const r=t.getBounds();return r.left>=f.x-.5&&r.right<=f.x+f.width+.5&&r.bottom<=f.y+f.height+.5;}),clear:texts.every((t,i)=>texts.slice(i+1).every(u=>!overlap(t.getBounds(),u.getBounds())))};
});}

// Wait for FIT and Phaser's pointer transform to observe the same parent size.
export async function clickGame(page,x,y){
 await page.waitForFunction(()=>{
  const g=window.kingdomGame;if(!g?.scale)return false;
  const parent=document.getElementById('game').getBoundingClientRect(),rect=g.canvas.getBoundingClientRect(),bounds=g.scale.canvasBounds;
  const scale=Math.min(parent.width/960,parent.height/540);
  return Math.abs(rect.width-960*scale)<1&&Math.abs(rect.height-540*scale)<1&&
   Math.abs(rect.x-bounds.x)<1&&Math.abs(rect.y-bounds.y)<1&&Math.abs(rect.width-bounds.width)<1&&Math.abs(rect.height-bounds.height)<1;
 });
 const r=await page.locator('canvas').boundingBox();await page.mouse.click(r.x+x*r.width/960,r.y+y*r.height/540);
}

// Skill allocation controls are presentation-owned; do not couple checks to old hotspots.
export async function clickSkillControl(page,control){
 const p=await page.evaluate(control=>{
  const hud=window.kingdomGame.scene.getScene('HUD');
  const hit=control==='open'?hud.skillOpen:control==='close'?hud.skillClose:hud.skillButtons.find(b=>b.skill===control).hit;
  return {x:hit.x,y:hit.y};
 },control);
 await clickGame(page,p.x,p.y);
}

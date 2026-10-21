// Wait for FIT and Phaser's pointer transform to observe the same parent size.
export async function clickGame(page,x,y){
 await page.waitForFunction(()=>{
  const g=window.kingdomGame;if(!g?.scale)return false;
  const parent=document.getElementById('game').getBoundingClientRect(),rect=g.canvas.getBoundingClientRect(),bounds=g.scale.canvasBounds;
  const scale=Math.min(parent.width/g.scale.width,parent.height/g.scale.height);
  return Math.abs(rect.width-g.scale.width*scale)<1&&Math.abs(rect.height-g.scale.height*scale)<1&&
   Math.abs(rect.x-bounds.x)<1&&Math.abs(rect.y-bounds.y)<1&&Math.abs(rect.width-bounds.width)<1&&Math.abs(rect.height-bounds.height)<1;
 });
 const p=await page.evaluate(({x,y})=>window.kingdomViewport.transform().logicalToCss({x,y}),{x,y});await page.mouse.click(p.x,p.y);
}

// Skill allocation controls are presentation-owned; do not couple checks to old hotspots.
export async function focusSkillControl(page,control){
 let moved=false;
 if(control!=='open'&&control!=='close')for(let i=0;i<5;i++){
  const next=await page.evaluate(control=>{const h=window.kingdomGame.scene.getScene('HUD');if(!h.skills?.compact||h.skills.rows[h.skills.model.selected].skill===control)return;const b=h.skills.next.getBounds();return{x:b.centerX,y:b.centerY,selected:h.skills.model.selected};},control);
  if(!next)break;await clickGame(page,next.x,next.y);await page.waitForFunction(selected=>window.kingdomGame.scene.getScene('HUD').skills.model.selected!==selected,next.selected);moved=true;
 }
 if(moved){const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(frame=>window.kingdomGame.loop.frame>frame,frame);}
}
export async function clickSkillControl(page,control){
 await focusSkillControl(page,control);
 // Compact focus re-renders the panel; wait for two painted frames so the tap hits the refreshed row.
 {const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>=f+2,f);}
 const p=await page.evaluate(control=>{
  const hud=window.kingdomGame.scene.getScene('HUD');
  const hit=control==='open'?hud.skillOpen:control==='close'?hud.skillClose:hud.skillButtons.find(b=>b.skill===control).hit;
  const bounds=hit.getBounds();return {x:bounds.centerX,y:bounds.centerY};
 },control);
 await clickGame(page,p.x,p.y);
}

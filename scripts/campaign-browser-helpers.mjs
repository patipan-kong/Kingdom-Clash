import assert from 'node:assert/strict';

export async function campaignFrames(page,n=3){const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([frame,n])=>window.kingdomGame.loop.frame>=frame+n,[frame,n]);}
export async function clickCampaignControl(page,property,key){
 const point=await page.evaluate(({property,key})=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect'),o=key===undefined?s[property]:s[property].get(key),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{property,key});
 await page.mouse.click(point.x,point.y);await campaignFrames(page);
}
export async function revealCampaignSlot(page,id,map='levelButtons'){
 for(let i=0;i<18;i++){
  const b=await page.evaluate(({id,map})=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect'),hit=s[map].get(id);if(!hit)throw new Error(`No ${map} target ${id}`);const b=hit.getBounds(),r=g.canvas.getBoundingClientRect();return{visible:b.top>=s.clip.top&&b.bottom<=s.clip.bottom,dy:b.bottom>s.clip.bottom?90:-90,x:r.x+480*r.width/960,y:r.y+(s.clip.top+s.clip.bottom)/2*r.height/540};},{id,map});
  if(b.visible)return;await page.mouse.move(b.x,b.y);await page.mouse.wheel(0,b.dy);await campaignFrames(page);
 }
 throw new Error('Cannot reveal campaign slot '+id);
}
/** Exercise deliberate tile selection then Briefing; special mode retains its separate entry. */
export async function openCampaignBriefing(page,id){
 if(id==='campaign-20')await clickCampaignControl(page,'fullBattleButton');
 else{
  await revealCampaignSlot(page,id);await clickCampaignControl(page,'levelButtons',id);
  assert.equal(await page.evaluate(id=>window.kingdomGame.scene.isActive('CampaignSelect')&&window.kingdomGame.scene.getScene('CampaignSelect').selectedLevelId===id,id),true,'Selection must stay on the grid');
  await clickCampaignControl(page,'briefingButton');
 }
 await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
}

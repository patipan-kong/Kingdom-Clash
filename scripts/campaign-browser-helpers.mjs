import assert from 'node:assert/strict';

export async function campaignFrames(page,n=3){const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([frame,n])=>window.kingdomGame.loop.frame>=frame+n,[frame,n]);}
export async function clickCampaignControl(page,property,key,input='mouse'){
 const point=await page.evaluate(({property,key})=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect'),o=key===undefined?s[property]:s[property].get(key),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{property,key});
 if(input==='touch')await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
 await campaignFrames(page);
}
/** Scroll through real wheel input, measured in logical scene coordinates (CampaignSelect applies dy * .5). */
export async function scrollCampaignTo(page,destination){
 for(let i=0;i<8;i++){
  const b=await page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect'),r=g.canvas.getBoundingClientRect();return{scroll:s.scroll,min:s.minScroll,x:r.x+480*r.width/960,y:r.y+(s.clip.top+s.clip.bottom)/2*r.height/540};});
  const requested=destination==='start'?0:destination==='end'?b.min:destination;
  assert.ok(Number.isFinite(requested),'Campaign scroll target must be finite');
  const target=Math.max(b.min,Math.min(0,requested));
  const delta=b.scroll-target,edge=target===0||target===b.min;
  if(delta===0||!edge&&Math.abs(delta)<.01)return;
  // A fractional drag can leave a tile just outside the strict input mask. Reach the exact
  // clamped edge instead of treating a tiny offset as zero; subpixel wheel deltas may be dropped.
  const dy=Math.abs(delta*2)<1?Math.sign(delta):delta*2;
  await page.mouse.move(b.x,b.y);await page.mouse.wheel(0,dy);await campaignFrames(page);
 }
 throw new Error('Campaign wheel input did not reach '+destination);
}
export async function revealCampaignSlot(page,id,map='levelButtons'){
 for(let i=0;i<4;i++){
  const b=await page.evaluate(({id,map})=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),hit=s[map].get(id);if(!hit)throw new Error(`No ${map} target ${id}`);const b=hit.getBounds();return{visible:b.top>=s.clip.top&&b.bottom<=s.clip.bottom&&(!hit.input||hit.input.enabled),target:s.scroll+(b.top<=s.clip.top?s.clip.top-b.top+1:s.clip.bottom-b.bottom-1)};},{id,map});
  if(b.visible)return;await scrollCampaignTo(page,b.target);
 }
 throw new Error('Cannot reveal campaign slot '+id);
}
/** Exercise deliberate tile selection then Briefing; special mode retains its separate entry. */
export async function openCampaignBriefing(page,id,input='mouse'){
 if(id==='full-battle')await clickCampaignControl(page,'fullBattleButton',undefined,input);
 else{
  await revealCampaignSlot(page,id);await clickCampaignControl(page,'levelButtons',id,input);
  assert.equal(await page.evaluate(id=>window.kingdomGame.scene.isActive('CampaignSelect')&&window.kingdomGame.scene.getScene('CampaignSelect').selectedLevelId===id,id),true,'Selection must stay on the grid');
  await clickCampaignControl(page,'briefingButton',undefined,input);
 }
 await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
}

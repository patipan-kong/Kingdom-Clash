const {test}=require('node:test'),assert=require('node:assert/strict');
const {tavernLayout,TAVERN_ROWS}=require('../.test-build/ui/tavernLayout.js');
// Chapter 5 Phase 1B (docs/CHAPTER5_PHASE1B.md): the Tavern panel fits the screen with usable touch targets at desktop and phone landscape sizes. Sizes in CSS px.
const viewports=[[960,540],[832,291],[780,360],[780,250],[740,270]];
const fit=([w,h])=>Math.min(w/960,h/540);
test('the panel lies inside the screen at every viewport, with the rows and the status line inside the panel',()=>{
 for(const vp of viewports){const s=fit(vp),L=tavernLayout(s,TAVERN_ROWS),css=n=>n*s,name=vp.join('x');
  assert.ok(css(L.x)>=0&&css(L.x+L.width)<=vp[0]+.01,`${name}: horizontal`);assert.ok(css(L.y)>=0&&css(L.y+L.height)<=vp[1]+.01,`${name}: vertical (${css(L.y).toFixed(0)}..${css(L.y+L.height).toFixed(0)} of ${vp[1]})`);
  for(const r of L.rows){assert.ok(r.x>=L.x&&r.x+r.width<=L.x+L.width&&r.y>=L.y&&r.y+r.height<=L.y+L.height,`${name}: row inside`);}
  assert.ok(L.status.y<=L.y+L.height&&L.status.y>L.rows.at(-1).y+L.rows.at(-1).height,`${name}: status below the rows`);}
});
test('every button is a touch target (40 CSS px tall on a short screen, 48 otherwise; 44 for Close) and none overlap',()=>{
 for(const vp of viewports){const s=fit(vp),L=tavernLayout(s,TAVERN_ROWS),name=vp.join('x'),want=L.short?40:48;
  assert.ok(Math.abs(L.close.size*s-44)<.01,`${name}: close`);
  for(const r of L.rows){for(const b of [r.primary,r.dismiss])assert.ok(b.height*s>=want-.01&&b.width*s>=70,`${name}: button ${(b.width*s).toFixed(0)}x${(b.height*s).toFixed(0)}`);
   assert.ok(r.dismiss.x-(r.primary.x+r.primary.width)>=5.9/s,`${name}: gap between the buttons`);assert.ok(r.info.width*s>=110,`${name}: room for the name (${(r.info.width*s).toFixed(0)} px)`);}
  L.rows.slice(1).forEach((r,i)=>assert.ok(r.y>=L.rows[i].y+L.rows[i].height,`${name}: rows do not overlap`));
  const c=L.close;assert.ok(c.x-c.size/2>=L.x&&c.x+c.size/2<=L.x+L.width&&c.y+c.size/2<=L.rows[0].y+1e-6+c.size,`${name}: close inside the header`);
  assert.ok(L.resources.x<c.x-c.size/2,`${name}: stock text left of Close`);}
});
test('fewer rows make a shorter panel, and a row count outside 1..3 is clamped',()=>{
 const s=.667;assert.ok(tavernLayout(s,1).height<tavernLayout(s,3).height);assert.equal(tavernLayout(s,9).rows.length,3);assert.equal(tavernLayout(s,0).rows.length,1);
});

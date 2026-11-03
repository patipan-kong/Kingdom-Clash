const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../.test-build/ui/conquestMap.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
// Chapter 4 Conquest Map: the pure layout (data, roads, dashes, tap areas, label boxes, styles). The scene itself is covered by scripts/verify-conquest-map.mjs.
const chapter=campaignChapters.find(c=>c.id===M.CONQUEST_CHAPTER);
const W=960,H=540,PANEL_TOP=470,HEADER_BOTTOM=60;

test('the map is for Chapter 4 and has one stop per chapter slot, inside the background',()=>{
 assert.equal(M.CONQUEST_CHAPTER,'conquered-lands');assert.ok(chapter);
 assert.deepEqual(M.conquestStops.map(s=>s.slot),chapter.slots.map(s=>s.localNumber));
 for(const s of M.conquestStops){assert.ok(s.x>0&&s.x<M.CONQUEST_ART.width&&s.y>0&&s.y<M.CONQUEST_ART.height,`stop ${s.slot}`);}
 assert.equal(M.conquestRoads.length,5);
 M.conquestRoads.forEach((r,i)=>{const a=M.conquestStops[i],b=M.conquestStops[i+1];assert.deepEqual(r[0],[a.x,a.y],`road ${i} starts at stop ${a.slot}`);assert.deepEqual(r.at(-1),[b.x,b.y],`road ${i} ends at stop ${b.slot}`);});
});
test('the Azure Fortress overlay lies inside the background and over the Crimson Fortress stop',()=>{
 const o=M.CONQUEST_ART.overlay;assert.ok(o.x>=0&&o.y>=0&&o.x+o.w<=M.CONQUEST_ART.width&&o.y+o.h<=M.CONQUEST_ART.height);
 const f=M.conquestStops[5];assert.ok(f.x>=o.x&&f.x<=o.x+o.w&&f.y>=o.y&&f.y<=o.y+o.h,'the finale marker sits on the overlay');
 for(const s of M.conquestStops.slice(0,5))assert.ok(!(s.x>=o.x&&s.x<=o.x+o.w&&s.y>=o.y&&s.y<=o.y+o.h),`stop ${s.slot} is outside the overlay`);
});
test('smoothRoad keeps both ends and stays in the frame',()=>{
 for(const r of M.conquestRoads){const line=M.smoothRoad(r),a=M.toGame(r[0]),b=M.toGame(r.at(-1));
  assert.equal(line.length,(r.length-1)*12+1);assert.ok(Math.hypot(line[0][0]-a[0],line[0][1]-a[1])<1e-9&&Math.hypot(line.at(-1)[0]-b[0],line.at(-1)[1]-b[1])<1e-9);
  for(const [x,y] of line)assert.ok(x>=0&&x<=W&&y>=0&&y<=H);}
});
test('dashSegments covers the expected share of the length and starts with a dash',()=>{
 const line=[[0,0],[100,0]];const d=M.dashSegments(line,7,5);
 const near=(p,q)=>Math.abs(p[0]-q[0])<1e-6&&Math.abs(p[1]-q[1])<1e-6;assert.ok(near(d[0][0],[0,0])&&near(d[0][1],[7,0]));assert.ok(near(d[1][0],[12,0])&&near(d[1][1],[19,0]));
 const total=d.reduce((n,[a,b])=>n+Math.hypot(b[0]-a[0],b[1]-a[1]),0);assert.ok(Math.abs(total-(100*7/12))<7,'about 7/12 of the length is drawn');
 assert.deepEqual(M.dashSegments([[0,0]],7,5),[]);
 const bent=M.dashSegments([[0,0],[10,0],[10,10]],4,4);assert.ok(bent.every(([a,b])=>Math.hypot(b[0]-a[0],b[1]-a[1])<=4+1e-9),'a dash that bends round a corner is split there, and no piece exceeds the dash length');
});
test('tap areas are at least 44 CSS px and never overlap at any supported phone scale',()=>{
 for(const k of [.59,.72,.88,1,1.4]){
  const side=M.tapSide(k);assert.ok(side*k>=44-1e-9,`k=${k}`);
  const boxes=M.conquestStops.map(s=>{const [x,y]=M.toGame([s.x,s.y]),t=M.tapSide(k,s.slot===6);return {x:x-t/2,y:y-t/2,w:t,h:t};});
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!M.overlaps(boxes[i],boxes[j]),`k=${k}: stops ${i+1} and ${j+1}`);
 }
});
test('estimated name boxes stay inside the screen, clear of the header and bottom panel, and apart, at 12 CSS px on the smallest phone',()=>{
 const names=['Forest Edge','Cliff Pass','River & Island','Fortress Approach','Canyon Basin','Crimson Fortress'],k=.59,fs=Math.max(13,12/k);
 const boxes=M.conquestStops.map((s,i)=>M.labelBox(s,names[i].length*fs*.62,fs,s.slot===6));
 boxes.forEach((b,i)=>{assert.ok(b.x>=0&&b.x+b.w<=W,`name ${i+1} horizontally`);assert.ok(b.y>=HEADER_BOTTOM&&b.y+b.h<=PANEL_TOP,`name ${i+1} vertically`);});
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!M.overlaps(boxes[i],boxes[j]),`names ${i+1} and ${j+1}`);
});
test('marker and road styles follow the selection model',()=>{
 assert.equal(M.markerStyle({state:'completed',recommended:false}),'done');
 assert.equal(M.markerStyle({state:'available',recommended:true}),'next');
 assert.equal(M.markerStyle({state:'available',recommended:false}),'open','any other open mission, e.g. every one with ?unlock=all');
 assert.equal(M.markerStyle({state:'locked',recommended:false}),'locked');assert.equal(M.markerStyle({state:'pending',recommended:false}),'locked');
 assert.equal(M.roadStyle({state:'completed'}),'done');assert.equal(M.roadStyle({state:'available'}),'next');assert.equal(M.roadStyle({state:'locked'}),'locked');
});

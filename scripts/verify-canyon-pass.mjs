// Chapter 2 S2b: Canyon Pass rendering in the browser. Needs a dev server (CANYON_URL); BASELINE_URL (a dev server of the pre-S2b build)
// adds the Meadow before/after pixel comparison, PRODUCTION_URL (vite preview of a production build) the dev-override checks.
// Stills are deterministic: the Battle and HUD scenes are paused, the simulation is advanced by hand to an exact tick, sprites synced
// and the camera placed, so two builds render the same frame.
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dev=process.env.CANYON_URL||'http://127.0.0.1:5241/',baseline=process.env.BASELINE_URL,production=process.env.PRODUCTION_URL;
const dir=`${process.env.EVIDENCE_ROOT||'docs'}/screenshots/canyon-pass/${process.env.VERIFICATION_VARIANT||'development'}`;
const frameSeconds=Number(process.env.FRAME_SECONDS||20),scenarioTicks=Number(process.env.SCENARIO_TICKS||7200);
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const checks=[],evidence={},shots=[];
function check(ok,name,detail){checks.push({name,passed:!!ok,...(detail===undefined?{}:{detail})});console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);}
const url=(base,query)=>`${base}${base.includes('?')?'&':'?'}${query}`;
const DESKTOP={width:960,height:540},MOBILE={width:844,height:390};
async function open(address,viewport=DESKTOP,ready=true){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[],warnings=[];
 // A TileSprite renders its source through displayTexture; its own texture is a generated canvas.
 await page.addInitScript(()=>{window.textureKeys=scene=>scene.children.list.map(o=>o.displayTexture?.key??o.texture?.key).filter(Boolean);});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
 await page.goto(address);
 if(ready)await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 return {page,errors,warnings};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
// Pause both scenes, step the simulation to exactly `tick`, sync sprites, minimap and camera.
async function still(page,{tick,center,zoom=1,building=false}){
 const info=await page.evaluate(({tick,center,zoom,building})=>{
  const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD'),s=b.simulation;
  g.scene.pause('Battle');g.scene.pause('HUD');
  while(s.clock.tick<tick)s.advance(1000/30/4);
  s.drainEvents();b.syncUnits();
  const c=b.cameras.main,p=center??{x:s.hero.x,y:s.hero.y};b.following=false;c.stopFollow();c.setZoom(zoom);c.centerOn(Math.round(p.x),Math.round(p.y*.72));
  if(building){b.buildingMode=true;b.grid.setVisible(true);b.drawGrid();}
  h.update(0,0);
  return {tick:s.clock.tick,field:s.field.id,rendered:b.renderedFieldId};
 },{tick,center,zoom,building});
 await frames(page);return info;
}
async function shot(page,name,clip){const path=`${dir}/${name}.png`;await page.screenshot({path,...(clip?{clip}:{})});shots.push(path);return path;}
const minimapClip={x:806,y:10,width:148,height:94};
// Decoding and comparing PNGs happens in a blank page's canvas.
const analysis=await browser.newPage();
const dataUrl=async file=>`data:image/png;base64,${(await readFile(file)).toString('base64')}`;
async function compare(a,b,out){
 const r=await analysis.evaluate(async([a,b])=>{
  const load=src=>new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=src;});
  const [ia,ib]=await Promise.all([load(a),load(b)]);if(ia.width!==ib.width||ia.height!==ib.height)return {sizeMismatch:true};
  const px=i=>{const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,i.width,i.height);};
  const da=px(ia),db=px(ib),c=document.createElement('canvas');c.width=ia.width;c.height=ia.height;const x=c.getContext('2d'),d=x.createImageData(ia.width,ia.height);
  let differing=0;for(let i=0;i<da.data.length;i+=4){const same=da.data[i]===db.data[i]&&da.data[i+1]===db.data[i+1]&&da.data[i+2]===db.data[i+2]&&da.data[i+3]===db.data[i+3];if(!same)differing++;
   d.data[i]=same?da.data[i]*.3:255;d.data[i+1]=same?da.data[i+1]*.3:0;d.data[i+2]=same?da.data[i+2]*.3:0;d.data[i+3]=255;}
  x.putImageData(d,0,0);return {differing,total:da.data.length/4,diff:differing?c.toDataURL('image/png'):undefined};
 },[await dataUrl(a),await dataUrl(b)]);
 if(r.diff&&out){await writeFile(out,Buffer.from(r.diff.split(',')[1],'base64'));shots.push(out);}
 return {differing:r.differing,total:r.total,sizeMismatch:r.sizeMismatch};
}
async function colours(file,points){
 return analysis.evaluate(async([src,points])=>{
  const i=await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=src;});const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);
  return points.map(([px,py])=>Array.from(x.getImageData(px,py,1,1).data.slice(0,3)));
 },[await dataUrl(file),points]);
}
const near=(rgb,hex,tol=24)=>Math.max(Math.abs(rgb[0]-(hex>>16&255)),Math.abs(rgb[1]-(hex>>8&255)),Math.abs(rgb[2]-(hex&255)))<=tol;
const TICK=600;
const meadowViews=[['spawn',undefined,1],['bridge',{x:960,y:575},1]];

// 1. Meadow before/after: the same paused frame from the pre-S2b build and from S2b must match pixel for pixel.
async function meadowStills(base,label,viewport=DESKTOP){
 const out={};
 for(const [view,center,zoom] of meadowViews){
  const {page,errors}=await open(url(base,'encounter=extended'),viewport);await still(page,{tick:TICK,center,zoom});
  out[view]=await shot(page,`meadow-${label}-${view}-${viewport.width}x${viewport.height}`);
  if(viewport===DESKTOP&&view==='spawn')out.minimap=await shot(page,`meadow-${label}-minimap`,minimapClip);
  check(!errors.length,`Meadow ${label} ${view} renders without page errors`,errors.length?errors:undefined);await page.close();
 }
 return out;
}
const after=await meadowStills(dev,'s2b'),again=await meadowStills(dev,'s2b-repeat');
for(const view of [...meadowViews.map(v=>v[0]),'minimap']){const r=await compare(after[view],again[view]);check(r.differing===0,`Screenshot environment is deterministic (S2b Meadow ${view} captured twice)`,r);}
evidence.meadowDiff={};
if(baseline){
 const before=await meadowStills(baseline,'1b35ef6');
 for(const view of [...meadowViews.map(v=>v[0]),'minimap']){const r=await compare(before[view],after[view],`${dir}/meadow-diff-${view}.png`);evidence.meadowDiff[view]=r;check(r.differing===0,`Meadow ${view} is pixel-identical to 1b35ef6`,r);}
 const beforeMobile=await meadowStills(baseline,'1b35ef6',MOBILE),afterMobile=await meadowStills(dev,'s2b',MOBILE);
 const r=await compare(beforeMobile.spawn,afterMobile.spawn,`${dir}/meadow-diff-spawn-mobile.png`);evidence.meadowDiff.mobileSpawn=r;check(r.differing===0,'Meadow mobile landscape spawn is pixel-identical to 1b35ef6',r);
}else console.log('SKIP Meadow before/after: BASELINE_URL not set');

// 2. Canyon stills, the active-field render and the minimap.
const canyonUrl=url(dev,'battlefield=canyon-pass&encounter=extended');
{
 const {page,errors,warnings}=await open(canyonUrl);
 const info=await still(page,{tick:TICK});
 check(info.field==='canyon-pass'&&info.rendered==='canyon-pass','Dev ?battlefield=canyon-pass opens Canyon and Battle draws Canyon art',info);
 check(warnings.some(w=>w.includes('dev override: battlefield canyon-pass')),'Dev override announces itself in the console');
 const scene=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),keys=window.textureKeys(b);
  return {water:keys.includes('water'),bridge:keys.includes('bridge'),grass:keys.includes('grass'),walls:['wall-a','wall-b'].filter(id=>b.visuals.has(id)),props:keys.filter(k=>k.startsWith('canyon-')).length,scenery:b.simulation.field.scenery.length};});
 check(!scene.water&&!scene.bridge,'Canyon draws no water and no bridge',scene);
 check(!scene.walls.length,'Canyon draws no ghost pre-placed walls',scene.walls);
 check(scene.props===scene.scenery,'Every Canyon scenery prop is drawn with Canyon art',scene);
 await shot(page,'canyon-spawn');await shot(page,'canyon-minimap',minimapClip);
 for(const [name,center,zoom] of [['canyon-pass',{x:960,y:600},1],['canyon-north-lane',{x:960,y:528},2],['canyon-south-lane',{x:960,y:672},2],['canyon-west-mouth',{x:820,y:600},2],['canyon-east-mouth',{x:1100,y:600},2]]){await still(page,{tick:TICK,center,zoom});await shot(page,name);}
 await still(page,{tick:TICK,center:{x:500,y:600},building:true});await shot(page,'canyon-building-grid');
 const ghost=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return b.simulation.field.entities.some(e=>e.kind==='wall');});
 check(!ghost,'Building grid outlines come from the Canyon field (no walls to outline)');
 // Minimap pixels: each barrier's centre is rock, each lane's centre is not (frame 812,16 136x82 for the 1920x1152 world).
 const mm=(x,y)=>[Math.round(812+x/1920*136),Math.round(16+y/1152*82)];
 const full=await shot(page,'canyon-minimap-full-frame');
 const [north,south,spire,laneN,laneS,river]=await colours(full,[mm(960,200),mm(960,950),mm(960,600),mm(1060,528),mm(1060,672),mm(960,300)]);
 check(near(north,0x7b4a2e)&&near(south,0x7b4a2e)&&near(spire,0x7b4a2e,40),'Minimap draws the north cliff, south cliff and spire as rock',{north,south,spire});
 check(!near(laneN,0x7b4a2e,40)&&!near(laneS,0x7b4a2e,40),'Minimap shows both lanes open',{laneN,laneS});
 check(!near(river,0x3ba0ab,30),'Minimap shows no river',{river});
 // Restart keeps the field and rebuilds its art.
 await page.evaluate(()=>{const g=window.kingdomGame;g.scene.resume('Battle');g.scene.resume('HUD');const b=g.scene.getScene('Battle');b.scene.restart(b.launch);});
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick<60);
 const restarted=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return {field:b.simulation.field.id,rendered:b.renderedFieldId,water:window.textureKeys(b).includes('water')};});
 check(restarted.field==='canyon-pass'&&restarted.rendered==='canyon-pass'&&!restarted.water,'Restart rebuilds Canyon art for the new match',restarted);
 check(!errors.length,'Canyon renders without page errors',errors.length?errors:undefined);await page.close();
 const mobile=await open(canyonUrl,MOBILE);await still(mobile.page,{tick:TICK});await shot(mobile.page,'canyon-spawn-844x390');check(!mobile.errors.length,'Canyon mobile landscape renders without page errors');await mobile.page.close();
}

// 3. Full Battle and campaign Level 1 stay on Meadow, even with the dev query present.
{
 const {page,errors}=await open(url(dev,'quickplay=1'));
 const quick=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),k=window.textureKeys(b);return {field:b.simulation.field.id,rendered:b.renderedFieldId,walls:b.visuals.has('wall-a')&&b.visuals.has('wall-b'),water:k.includes('water'),bridge:k.includes('bridge')};});
 check(quick.field==='meadow'&&quick.rendered==='meadow'&&quick.walls&&quick.water&&quick.bridge,'Full Battle launches on Meadow with its river, bridge and walls',quick);
 await still(page,{tick:TICK});await shot(page,'full-battle-meadow');check(!errors.length,'Full Battle renders without page errors');await page.close();
 const c=await open(url(dev,'battlefield=canyon-pass&encounter=extended'));
 await c.page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.scene.restart({mode:'campaign',levelId:'campaign-01'});});
 await c.page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').campaignLevel?.id==='campaign-01');
 const level=await c.page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return {field:b.simulation.field.id,rendered:b.renderedFieldId};});
 check(level.field==='meadow'&&level.rendered==='meadow','Campaign Level 1 launches on Meadow even when the dev query names Canyon',level);
 await still(c.page,{tick:TICK});await shot(c.page,'campaign-level-01-meadow');check(!c.errors.length,'Campaign Level 1 renders without page errors');await c.page.close();
}

// 4. Production build ignores the override.
if(production){
 const p=await open(url(production,'battlefield=canyon-pass&encounter=extended'));
 const r=await p.page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return {field:b.simulation.field.id,rendered:b.renderedFieldId,water:window.textureKeys(b).includes('water')};});
 check(r.field==='meadow'&&r.rendered==='meadow'&&r.water,'Production build ignores ?battlefield=canyon-pass and draws Meadow',r);
 check(!p.warnings.some(w=>w.includes('dev override')),'Production logs no dev override warning',p.warnings.filter(w=>w.includes('override')));
 await still(p.page,{tick:TICK});await shot(p.page,'production-battlefield-query-meadow');check(!p.errors.length,'Production page has no errors',p.errors.length?p.errors:undefined);await p.page.close();
 const m=await open(url(production,'battlefield=canyon-pass'),DESKTOP,false);
 await m.page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));await m.page.waitForTimeout(1500);
 const menu=await m.page.evaluate(()=>({menu:window.kingdomGame.scene.isActive('MainMenu'),battle:window.kingdomGame.scene.isActive('Battle')}));
 check(menu.menu&&!menu.battle,'Production ?battlefield=canyon-pass alone does not launch a battle',menu);await shot(m.page,'production-battlefield-query-menu');await m.page.close();
}else console.log('SKIP production override: PRODUCTION_URL not set');

// 5. Live play: every rendered unit sits at its projected simulation position and outside every barrier, frame by frame.
{
 const {page,errors}=await open(canyonUrl);
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;while(s.clock.tick<1750)s.advance(1000/30);s.drainEvents();});
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;window.live={frames:0,units:0,offset:[],inside:[]};
  b.events.on('postupdate',()=>{window.live.frames++;for(const u of Object.values(s.state.units)){if(u.hp<=0)continue;window.live.units++;const v=b.visuals.get(u.id);
   if(!v||Math.abs(v.x-u.x)>1e-6||Math.abs(v.y-u.y*.72)>1e-6)window.live.offset.push(u.id);
   if(s.geo.blocked(u.x,u.y,0)||s.field.barriers.some(z=>u.x>z.x0-u.radius+1e-6&&u.x<z.x1+u.radius-1e-6&&u.y>z.y0-u.radius+1e-6&&u.y<z.y1+u.radius-1e-6))window.live.inside.push(u.id);}});});
 await page.waitForTimeout(10000);const live=await page.evaluate(()=>({...window.live,offset:window.live.offset.slice(0,5),inside:window.live.inside.slice(0,5),tick:window.kingdomGame.scene.getScene('Battle').simulation.clock.tick}));
 evidence.live=live;
 check(live.frames>100&&!live.offset.length,'Every live unit sprite sits at worldToView of its simulation position (10 s)',{frames:live.frames,unitSamples:live.units,offset:live.offset});
 check(!live.inside.length,'No live unit is inside a cliff or the spire (10 s)',live.inside);
 check(!errors.length,'Live play has no page errors');await page.close();
}

// 6. Guardian body-blocking and minion movement, stepped deterministically; screenshots every 15 ticks while the first wave passes.
const SCENARIOS=[['free-run',{x:400,y:300}],['hold-north-lane',{x:960,y:528}],['hold-south-lane',{x:960,y:672}],['hold-west-mouth',{x:840,y:600}],['hold-east-mouth',{x:1060,y:600}]];
evidence.scenarios={};
for(const [name,hold] of SCENARIOS){
 const {page,errors}=await open(canyonUrl);
 const ok=await page.evaluate(hold=>{
  const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD'),s=b.simulation;g.scene.pause('Battle');g.scene.pause('HUD');
  if(s.geo.blocked(hold.x,hold.y,s.hero.radius))return false;
  // teleportHero checks static geometry only, so the hold starts once no unit stands on the point (Canyon's blue-1 opens 20 px away).
  const clear=()=>Object.values(s.state.units).every(u=>u.id===s.hero.id||u.hp<=0||Math.hypot(u.x-hold.x,u.y-hold.y)>=u.radius+s.hero.radius);
  while(!clear()&&s.clock.tick<300)s.advance(1000/30);
  const st=window.st={holdFromTick:s.clock.tick,lanes:{north:0,south:0},exits:0,maxStall:0,stall:{},prev:{},overlaps:0,inside:0,ticks:0};
  const step=s.step.bind(s);
  s.step=()=>{s.hero.x=hold.x;s.hero.y=hold.y;s.hero.hp=s.hero.maxHp;step();st.ticks++;
   for(const u of Object.values(s.state.units)){
    if(u.hp<=0)continue;
    if(s.field.barriers.some(z=>u.x>z.x0-u.radius+1e-6&&u.x<z.x1+u.radius-1e-6&&u.y>z.y0-u.radius+1e-6&&u.y<z.y1+u.radius-1e-6))st.inside++;
    if(u.id===s.hero.id||!u.kind.startsWith('minion'))continue;
    if(Math.hypot(u.x-s.hero.x,u.y-s.hero.y)<u.radius+s.hero.radius-1e-6)st.overlaps++;
    const p=st.prev[u.id];
    if(p){if(u.team==='red'&&p.x>960&&u.x<=960)st.lanes[u.y<600?'north':'south']++;if(u.team==='red'&&p.x>800&&u.x<=800)st.exits++;
     st.stall[u.id]=!u.targetId&&p.x===u.x&&p.y===u.y?(st.stall[u.id]??0)+1:0;st.maxStall=Math.max(st.maxStall,st.stall[u.id]);}
    st.prev[u.id]={x:u.x,y:u.y};
   }
  };
  window.stepTo=(tick,center)=>{while(s.clock.tick<tick&&!s.ended)s.advance(1000/30/4);s.drainEvents();b.syncUnits();const c=b.cameras.main;b.following=false;c.stopFollow();c.setZoom(1);c.centerOn(center.x,center.y*.72);h.update(0,0);
   const off=Object.values(s.state.units).filter(u=>u.hp>0&&(Math.abs(b.visuals.get(u.id).x-u.x)>1e-6||Math.abs(b.visuals.get(u.id).y-u.y*.72)>1e-6)).length;return {tick:s.clock.tick,off,ended:s.ended};};
  window.firstRedAt=x=>{while(!s.ended&&s.clock.tick<6000&&!Object.values(s.state.units).some(u=>u.team==='red'&&u.hp>0&&u.kind.startsWith('minion')&&u.x<x))s.advance(1000/30);return s.clock.tick;};
  b.setHeroPosition(hold.x,hold.y);return true;
 },hold);
 check(ok,`${name}: the Guardian's hold point (${hold.x},${hold.y}) is open`);if(!ok){await page.close();continue;}
 const start=await page.evaluate(()=>window.firstRedAt(1180));let off=0;
 for(let i=0;i<12;i++){const r=await page.evaluate(([t,c])=>window.stepTo(t,c),[start+i*15,{x:960,y:600}]);off+=r.off;await frames(page);await shot(page,`blocking-${name}-${String(i).padStart(2,'0')}-t${r.tick}`);}
 const end=await page.evaluate(t=>window.stepTo(t,{x:960,y:600}),scenarioTicks);
 const st=await page.evaluate(()=>{const {prev,stall,...rest}=window.st;return rest;});
 evidence.scenarios[name]={hold,firstRedAtX1180:start,endTick:end.tick,ended:end.ended,...st};
 check(st.maxStall<=30,`${name}: no living targetless minion stands still for more than 30 ticks`,{maxStall:st.maxStall});
 check(!st.overlaps,`${name}: minion and Guardian footprints stay separated`,{overlaps:st.overlaps});
 check(!st.inside,`${name}: no unit enters a cliff or the spire`,{inside:st.inside});
 check(!off,`${name}: sprites match simulation positions in every captured frame`,{off});
 if(name==='free-run')check(st.lanes.north>0&&st.lanes.south>0,'free-run: Crimson minions cross through both lanes',st.lanes);
 if(name==='hold-south-lane')check(st.lanes.north>0,'hold-south-lane: the wave still crosses by the north lane',st.lanes);
 check(!errors.length,`${name}: no page errors`);await page.close();
}

// 7. Joystick: the Guardian stops at each cliff and the spire, its footprint never inside, and slides along the edge.
{
 const {page,errors}=await open(canyonUrl);
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;window.heroInside=0;
  const step=s.step.bind(s);s.step=()=>{step();const h=s.hero;if(s.field.barriers.some(z=>h.x>z.x0-h.radius+1e-6&&h.x<z.x1+h.radius-1e-6&&h.y>z.y0-h.radius+1e-6&&h.y<z.y1+h.radius-1e-6))window.heroInside++;};});
 const box=await page.locator('canvas').boundingBox(),pointer=(x,y)=>({x:box.x+x*box.width/960,y:box.y+y*box.height/540});
 const centre=await page.evaluate(()=>{const j=window.kingdomGame.scene.getScene('HUD').joystickArt;return [j.x,j.y];});
 // Hold the stick until done(start, now) or the Guardian has not moved for 300 ms (it stopped at an edge), at most 5 s; frame rate varies.
 const hero=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return {x:s.hero.x,y:s.hero.y};});
 const drag=async([dx,dy],done=()=>false)=>{const a=pointer(...centre),t=pointer(centre[0]+dx,centre[1]+dy);const start=await hero();await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(t.x,t.y,{steps:4});
  let h=start,still=0;for(let ms=0;ms<5000&&still<300;ms+=50){await page.waitForTimeout(50);const n=await hero();still=n.x===h.x&&n.y===h.y?still+50:0;h=n;if(done(start,h))break;}
  await page.mouse.up();await page.waitForTimeout(150);return h;};
 const moved=(start,h)=>Math.hypot(h.x-start.x,h.y-start.y)>=30;
 const place=(x,y)=>page.evaluate(([x,y])=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.state.units={[s.hero.id]:s.hero};return b.setHeroPosition(x,y);},[x,y]);
 // Offsets from the joystick centre, in game pixels. A stop is short of the inflated edge by less than one tick of Guardian travel (a move that would cross it is rejected whole), capped at the 8 px visual tolerance, and never past it.
 const UP=[0,-47],DOWN=[0,47],RIGHT=[47,0],UP_RIGHT=[33,-33],DOWN_RIGHT=[33,33];
 const step=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('Battle').simulation.hero;return Math.min(8,h.speed/30);}),j={centre,step};
 check(await place(960,540),'Joystick: Guardian placed in the north lane');j.north=await drag(UP);await shot(page,'joystick-north-cliff');j.northSlide=await drag(UP_RIGHT,moved);
 check(j.north.y>=500&&j.north.y-500<=step&&Math.abs(j.north.x-960)<.5,'Joystick: Guardian stops at the north cliff edge (y 480 + radius 20)',j.north);
 check(j.northSlide.x>j.north.x+20&&j.northSlide.x<1100&&j.northSlide.y>=500&&j.northSlide.y-500<=step,'Joystick: Guardian slides east along the north cliff',j.northSlide);
 check(await place(960,672),'Joystick: Guardian placed in the south lane');j.south=await drag(DOWN);await shot(page,'joystick-south-cliff');j.southSlide=await drag(DOWN_RIGHT,moved);
 check(j.south.y<=700&&700-j.south.y<=step&&Math.abs(j.south.x-960)<.5,'Joystick: Guardian stops at the south cliff edge (y 720 - radius 20)',j.south);
 check(j.southSlide.x>j.south.x+20&&j.southSlide.x<1100&&j.southSlide.y<=700&&700-j.southSlide.y<=step,'Joystick: Guardian slides east along the south cliff',j.southSlide);
 check(await place(860,600),'Joystick: Guardian placed at the west mouth');j.spire=await drag(RIGHT);await shot(page,'joystick-spire');j.spireSlide=await drag(UP_RIGHT,moved);
 check(j.spire.x<=900&&900-j.spire.x<=step&&Math.abs(j.spire.y-600)<.5,'Joystick: Guardian stops at the spire (x 920 - radius 20)',j.spire);
 check(j.spireSlide.y<j.spire.y-10,'Joystick: Guardian slides north along the spire',j.spireSlide);
 const inside=await page.evaluate(()=>window.heroInside);check(!inside,'Joystick: the Guardian footprint never enters a barrier',{inside});
 evidence.joystick=j;check(!errors.length,'Joystick run has no page errors');await page.close();
}

// 8. Frame times (report only): the same 20 s of play on Meadow and Canyon, from tick 1750.
evidence.frames={};
for(const [field,address] of [['meadow',url(dev,'encounter=extended')],['canyon-pass',canyonUrl]]){
 const {page}=await open(address);
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;while(s.clock.tick<1750)s.advance(1000/30);s.drainEvents();});
 const d=await page.evaluate(ms=>new Promise(res=>{const out=[];let last=performance.now();const end=last+ms;const f=t=>{out.push(t-last);last=t;if(t<end)requestAnimationFrame(f);else res(out);};requestAnimationFrame(f);}),frameSeconds*1000);
 d.sort((a,b)=>a-b);const q=p=>+d[Math.min(d.length-1,Math.floor(p*d.length))].toFixed(2);
 evidence.frames[field]={frames:d.length,mean:+(d.reduce((a,b)=>a+b,0)/d.length).toFixed(2),median:q(.5),p95:q(.95),max:+d[d.length-1].toFixed(2)};await page.close();
}
evidence.frames.p95Ratio=+(evidence.frames['canyon-pass'].p95/evidence.frames.meadow.p95).toFixed(3);
console.log('Frame times (ms):',JSON.stringify(evidence.frames));
if(evidence.frames.p95Ratio>1.25)console.log(`FLAG Canyon p95 frame time is ${evidence.frames.p95Ratio}x Meadow (report only)`);

await writeFile(`${dir}/verification.json`,JSON.stringify({checks,evidence,screenshots:shots},null,1));
await browser.close();
const failed=checks.filter(c=>!c.passed);
console.log(`${checks.length-failed.length}/${checks.length} checks passed; ${shots.length} images in ${dir}`);
if(failed.length)process.exit(1);

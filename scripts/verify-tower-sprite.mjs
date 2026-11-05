// Tower V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs a dev server: SPRITE_URL=http://127.0.0.1:5421/
// Checks the Azure sheet and its Crimson recolour (Crimson, Siege and Azure towers; the Ballista keeps its still), the size, HP bar and tap / pick areas
// against the old still, the archer's release on the update each tower's damage applies (Azure and Crimson) and the nock / draw / aim through the
// cooldown, facing the target, the watch pose without one, the damage states and repair, construction (intact building, no archer until it can fire),
// the collapse and cleanup of destroyed c5-, built- and red- towers, pause, and no page errors. Writes review screenshots to TOWER_SHOTS (optional).
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5421/',shots=process.env.TOWER_SHOTS;
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const ctx=await browser.newContext({viewport:{width:960,height:540}}),page=await ctx.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`${base}?debug=1&level=46`);
await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:30000});
await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.H=window.kingdomGame.scene.getScene('HUD');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
 // Every update: each tower's building and archer frame, archer visibility and facing, the collapses, and the simulation events that update drained.
 window.log=[];const u=B.sys.sceneUpdate;B.sys.sceneUpdate=function(t,d){u.call(this,t,d);const s={};for(const [id,a] of B.towers)s[id]={b:a.bodyFrame,a:a.archerFrame,v:a.archer.visible,face:a.facing};log.push({tick:S.clock.tick,ms:B.simMs(),s,c:B.collapses.map(c=>({f:c.frame,al:c.art.alpha,x:c.art.x,y:c.art.y})),events:B.lastEvents??[]});B.lastEvents=[];if(log.length>6000)log.splice(0,2000);};
 const drain=S.drainEvents.bind(S);S.drainEvents=()=>{const e=drain();B.lastEvents=e.map(x=>({type:x.type,id:x.id,sourceId:x.sourceId,targetId:x.targetId,amount:x.amount}));return e;};
 // Only the hero and the test units on the field; the hero far from every tower.
 window.clearField=()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.hero.x=300;S.hero.y=600;};
 window.dummy=(id,kind,x,y)=>{const u={...S.unit(id,kind,x,y,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e6,maxHp:1e6};S.state.units[id]=u;return u;};
 // An open spot with a clear shot 130 px to its right (the C5M6 terrain blocks some lines of sight).
 window.spot=(y0=300)=>{const st=S.state.structures;for(let y=y0;y<1000;y+=24)for(let x=500;x<1100;x+=24)if(!S.geo.blocked(x,y,30,st)&&!S.geo.blocked(x+130,y+40,14,st)&&!S.geo.blocked(x-140,y+40,14,st)&&S.geo.lineOfSight({x,y},{x:x+130,y:y+40},st)&&S.geo.lineOfSight({x,y},{x:x-140,y:y+40},st)&&Object.values(st).every(b=>Math.hypot(b.x-x,b.y-y)>300))return {x,y};};
 window.tower=(id,team,x,y,o={})=>{const t={...structuredClone(S.state.structures['c5-north-a']),id,team,x,y,col:Math.floor(x/48),row:Math.floor(y/48),readyTick:0,strike:undefined,targetId:undefined,statuses:[],...o};S.state.structures[id]=t;return t;};
});
const T=await page.evaluate(async()=>{const m=await import('/src/world/towerSprite.ts');return {TF:m.TF,TA:m.TA,M:m.TOWER_MOTION};});
const {TF,TA,M}=T,pose=f=>(f-TF.archer.right)%5,side=f=>f>=TF.archer.left?-1:1;

// 1. The sheets, which towers use them, size, HP bar, tap box and Hero pick area against the old still (origin/main C5M6: bounds [-41,-156.6,82.2,169.72], bar [-27,-149.6,54]).
{
 const r=await page.evaluate(async()=>{clearField();tower('built-az','blue',840,600);tower('red-siege-t','red',840,840);tower('built-bal','blue',700,840,{ballista:true});await frames(8);
  const n=k=>B.textures.exists(k)?B.textures.get(k).frameTotal-1:0,t=B.towers.get('c5-north-a'),v=B.visuals.get('c5-north-a'),b=B.pickBounds('c5-north-a',v),bar=B.hpBars.get('c5-north-a').bar;
  const crimson=[...B.towers].filter(([id])=>id.startsWith('c5-')).map(([,a])=>a.body.texture.key);
  return {sheets:[n('tower-azure'),n('tower-crimson')],crimson,az:B.towers.get('built-az')?.body.texture.key,siege:[B.towers.get('red-siege-t')?.body.texture.key,B.visuals.get('red-siege-t').list.some(c=>c.text==='SIEGE TOWER')],ballista:[B.towers.has('built-bal'),B.visuals.get('built-bal').list.find(c=>c.type==='Image')?.texture.key],
   h:+(t.body.scaleY*384).toFixed(2),hit:[t.body.input.hitArea.x,t.body.input.hitArea.y,t.body.input.hitArea.width,t.body.input.hitArea.height],archerTap:!!t.archer.input,pick:[b.x-v.x,b.y-v.y,b.width,b.height].map(n=>+n.toFixed(2)),bar:[bar.x,bar.y,bar.width],order:v.list.indexOf(t.archer)-v.list.indexOf(t.body)};});
 check(r.sheets[0]===16&&r.sheets[1]===16,'Azure sheet and its Crimson recolour hold 16 frames',r.sheets);
 check(r.crimson.length===8&&r.crimson.every(k=>k==='tower-crimson'),'the 8 C5M6 Crimson towers draw the Crimson sheet',r.crimson);
 check(r.az==='tower-azure','an Azure tower draws the Azure sheet',r.az);
 check(r.siege[0]==='tower-crimson'&&r.siege[1],'a Siege Tower draws the Crimson sheet and keeps its label',r.siege);
 check(!r.ballista[0]&&!r.ballista[1].startsWith('tower'),'the Ballista keeps its own still',r.ballista);
 check(Math.abs(r.h-141.6)<.01,'the building is drawn 141.6 px tall, the old still height',r.h);
 check(JSON.stringify(r.hit)==='[56,16,188,384]'&&!r.archerTap&&r.order===1,'fixed tap box: the still\'s rectangle; the archer above the building, not tappable',r);
 check(JSON.stringify(r.pick)==='[-41,-156.6,82.2,169.72]','Hero target picking sees exactly the old still area',r.pick);
 check(JSON.stringify(r.bar)==='[-27,-149.6,54]','the HP bar is where it was',r.bar);
 await page.evaluate(()=>{for(const id of ['built-az','red-siege-t','built-bal'])delete S.state.structures[id];});
}
// 2. Firing: a Crimson tower (c5-north-a) and an Azure one each shoot a target dummy for 6 s; every damage the tower deals lands on the update its archer
// shows the release, every shot after the first starts from the aim, and between shots the archer nocks, draws and aims in that order.
{
 const r=await page.evaluate(async()=>{clearField();await frames(20);const c=S.state.structures['c5-north-a'];dummy('blue-d1','minion-blue',c.x+120,c.y+40);
  const p=spot();tower('built-az2','blue',p.x,p.y);dummy('red-d1','minion-red',p.x+130,p.y+40);
  const start=log.length;await frames(360);const L=log.slice(start),out={};
  for(const id of ['c5-north-a','built-az2']){const hits=[],pre=[],seq=[];
   for(let i=1;i<L.length;i++){if(L[i].events.some(e=>e.type==='damage'&&e.sourceId===id)){hits.push(L[i].s[id]?.a);pre.push(L[i-1].s[id]?.a);}const a=L[i].s[id]?.a;if(a!==undefined&&a!==seq.at(-1))seq.push(a);}
   out[id]={hits,pre,seq};}
  return out;});
 for(const id of ['c5-north-a','built-az2']){const x=r[id];
  check(x.hits.length>=6&&x.hits.every(f=>pose(f)===TA.release),`${id}: every shot's damage lands on the release frame`,x.hits.map(pose));
  check(x.pre.slice(1).every(f=>pose(f)===TA.aim),`${id}: every shot after the first starts from the aim`,x.pre.map(pose));
  const s=x.seq.map(pose),cyc=s.slice(s.indexOf(TA.release));let ok=true;for(let i=0;i+1<cyc.length;i++){const a=cyc[i],b=cyc[i+1];if(!((a===TA.release&&b===TA.nock)||(a===TA.nock&&b===TA.draw)||(a===TA.draw&&b===TA.aim)||(a===TA.aim&&b===TA.release)))ok=false;}
  check(ok&&cyc.length>=12,`${id}: release, nock, draw, aim, in order every shot`,s.slice(0,12));
 }
}
// 3. Facing: the target moved to the tower's left turns the archer to the left-facing set, back to the right turns it back; the watch pose without a target.
{
 const r=await page.evaluate(async(M)=>{const c=S.state.structures['c5-north-a'],d=S.state.units['blue-d1'],t=B.towers.get('c5-north-a');d.x=c.x-140;await frames(80);const left=[t.facing,t.archerFrame];
  d.x=c.x+140;await frames(80);const right=[t.facing,t.archerFrame];d.x=c.x+3;await frames(80);const straight=t.facing;
  delete S.state.units['blue-d1'];delete S.state.units['red-d1'];await frames(Math.ceil(M.watchAfter/16)+30);return {left,right,straight,watch:t.archerFrame,azWatch:B.towers.get('built-az2').archerFrame};},M);
 check(r.left[0]===-1&&side(r.left[1])===-1,'a target on the left turns the archer left (the left-facing set)',r.left);
 check(r.right[0]===1&&side(r.right[1])===1,'a target on the right turns him back',r.right);
 check(r.straight===1,'a target almost straight below keeps the facing',r.straight);
 check(pose(r.watch)===TA.watch&&pose(r.azWatch)===TA.watch,'no target for 1.5 s: the archer lowers his bow (watch)',[pose(r.watch),pose(r.azWatch)]);
}
// 4. Damage states from hp, and repair back.
{
 const r=await page.evaluate(async()=>{const c=S.state.structures['c5-north-a'],t=B.towers.get('c5-north-a'),out=[];for(const k of [.9,.67,.65,.34,.32,.1,.5,1]){c.hp=c.maxHp*k;await frames(2);out.push([k,t.bodyFrame]);}return out;});
 const want={.9:TF.intact,.67:TF.intact,.65:TF.damaged,.34:TF.damaged,.32:TF.critical,.1:TF.critical,.5:TF.damaged,1:TF.intact};
 check(r.every(([k,f])=>want[k]===f),'building: intact, damaged below 66%, badly damaged below 33%, and back on repair',r);
}
// 5. Construction: a tower being built shows the intact building (its hp climbs from near zero) at today's alpha, no archer; the archer appears when it can fire.
{
 const r=await page.evaluate(async()=>{const k=S.clock.tick,p=spot(600),t0=tower('built-con','blue',p.x,p.y,{startTick:k,completeTick:k+75,progress:1/75,hp:650/75,constructionDamage:0});dummy('red-d2','minion-red',p.x+130,p.y+40);
  const during=[];for(let i=0;i<10;i++){await frames(10);const a=B.towers.get('built-con'),s=S.state.structures['built-con'];if(S.clock.tick<s.completeTick)during.push({b:a.bodyFrame,v:a.archer.visible,alpha:+B.visuals.get('built-con').alpha.toFixed(2),hp:Math.round(s.hp)});}
  await frames(60);const a=B.towers.get('built-con');return {during,after:{v:a.archer.visible,b:a.bodyFrame,alpha:B.visuals.get('built-con').alpha}};});
 check(r.during.length>=5&&r.during.every(d=>d.b===TF.intact&&!d.v),'under construction: the intact building, no archer (even at low hp)',r.during);
 check(r.during.every((d,i)=>d.alpha<1&&(i===0||d.alpha>=r.during[i-1].alpha)),'the construction fade-in is today\'s (alpha = progress)',r.during.map(d=>d.alpha));
 check(r.after.v&&r.after.alpha===1,'the archer appears once the tower is complete',r.after);
}
// 6. Destruction: c5-, built- and red- towers collapse where they stood (3 frames), fade, and are gone by 2 s; the live visual and archer go at once.
{
 const r=await page.evaluate(async()=>{tower('red-tower-x','red',1000,300);await frames(6);const ids=['c5-south-b','built-con','red-tower-x'],at={};
  for(const id of ids){const v=B.visuals.get(id);at[id]={x:v.x,y:v.y+4};}
  const start=log.length;for(const id of ids){const s=S.state.structures[id];S.hit(s.team==='blue'?S.state.structures['c5-north-a']:S.hero,s,1e6,'direct');} // a hit from an enemy: the simulation's own damage and death path
  await frames(4);const gone=ids.map(id=>[B.visuals.has(id),B.towers.has(id)]);await frames(150);const L=log.slice(start);
  const seq=[];for(const e of L){const f=e.c.map(c=>c.f).join(',');if(f&&f!==seq.at(-1))seq.push(f);}
  const first=L.find(e=>e.c.length===3),death=L.find(e=>e.events.some(x=>x.type==='death')),end=L.findIndex((e,i)=>i>0&&e.c.length===0&&L[i-1].c.length>0);
  return {gone,seq,pos:first?.c.map(c=>[c.x,c.y]),at,deathMs:death?.ms,endMs:end>0?L[end].ms:undefined,lastAlpha:L.filter(e=>e.c.length).at(-1)?.c[0].al,left:B.collapses.length};});
 check(r.gone.every(([v,t])=>!v&&!t),'the destroyed towers\' live visuals are removed (c5- included)',r.gone);
 check(JSON.stringify(r.seq.slice(0,3))===JSON.stringify(['3,3,3','4,4,4','5,5,5']),'each collapses: breaking, falling, rubble',r.seq);
 const at=Object.values(r.at);check(r.pos&&r.pos.every(([x,y],i)=>Math.abs(x-at[i].x)<.5&&Math.abs(y-at[i].y)<.5),'each collapses where it stood',{pos:r.pos,at:r.at});
 check(r.left===0&&r.endMs-r.deathMs<=M.collapseEnd+50&&r.endMs-r.deathMs>=M.collapseHold&&r.lastAlpha<1,'the rubble fades and is gone by 2 s',{ms:r.endMs-r.deathMs,lastAlpha:r.lastAlpha});
}
// 7. Taps: on the building (and where the archer stands) inspect the tower; just outside the still's rectangle does not.
{
 const r=await page.evaluate(async()=>{const c=S.state.structures['c5-north-b'],cam=B.cameras.main;cam.stopFollow();const v=B.visuals.get('c5-north-b');cam.centerOn(v.x,v.y-70);await frames(4);const rect=B.game.canvas.getBoundingClientRect(),k=rect.height/540;
  return {k,left:rect.left,top:rect.top,sx:cam.scrollX,sy:cam.scrollY,vx:v.x,vy:v.y};});
 const at=async(dx,dy)=>{await page.evaluate(()=>{B.inspectedTower=undefined;});await page.mouse.click(r.left+(r.vx+dx-r.sx)*r.k,r.top+(r.vy+dy-r.sy)*r.k);await page.evaluate(()=>frames(2));return page.evaluate(()=>B.inspectedTower?.id);};
 const body=await at(0,-40),archer=await at(-6,-92),outside=await at(48,-40);
 check(body==='c5-north-b'&&archer==='c5-north-b','a tap on the building, or on the archer, inspects the tower',{body,archer});
 check(outside===undefined,'a tap just outside the still\'s rectangle does not',outside);
 if(shots){await page.evaluate(()=>{const v=B.visuals.get('c5-north-a');B.cameras.main.centerOn(v.x,v.y-60);});await page.evaluate(()=>frames(4));writeFileSync(`${shots}/towers.png`,await page.screenshot());}
 await page.evaluate(()=>B.followHero());
}
// 8. Pause freezes the archer mid-cycle.
{
 const r=await page.evaluate(async()=>{const c=S.state.structures['c5-north-a'],t=B.towers.get('c5-north-a');dummy('blue-d3','minion-blue',c.x+120,c.y+40);
  for(let i=0;i<200&&!(t.shotAt!==undefined&&B.simMs()-t.shotAt<200);i++)await frames(1);H.setPause(true);await frames(3);const a=[t.archerFrame,t.shotAt];await frames(60);const b=[t.archerFrame,t.shotAt];H.setPause(false);await frames(5);delete S.state.units['blue-d3'];return {a,b};});
 check(JSON.stringify(r.a)===JSON.stringify(r.b)&&pose(r.a[0])!==TA.watch,'pause freezes the archer mid-shot',r);
}
check(errors.length===0,'no page errors',errors.slice(0,5));
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

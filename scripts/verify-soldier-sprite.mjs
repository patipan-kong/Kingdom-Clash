// Soldier V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs a dev server: SPRITE_URL=http://127.0.0.1:5411/
// Checks the Azure and Crimson sheets and the Desert Raider / Shadowblade sheets made from the Crimson one, the size and feet placement against the old still,
// walk frames and facing from movement, crowd nudges never flipping a soldier, the feet staying put on a turn (rendered pixels), the attack contact frame on
// the update the simulation applies each soldier's hit (Azure, Crimson and a 6-tick Shadowblade), hurt, the fallen body (frames, fade, 1.3 s, the cap of 16),
// pause, the HP bar never moving with the art, the fixed tap box and Hero target-pick area, a 30-soldier melee, and no page errors. Writes review screenshots to SOLDIER_SHOTS (optional).
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5411/',shots=process.env.SOLDIER_SHOTS;
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const ctx=await browser.newContext({viewport:{width:960,height:540},hasTouch:true}),page=await ctx.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`${base}?debug=1&level=46`);
await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:30000});
await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.H=window.kingdomGame.scene.getScene('HUD');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
 // Every update: each soldier's frame and facing, and the simulation events that update drained.
 window.log=[];const u=B.sys.sceneUpdate;B.sys.sceneUpdate=function(t,d){u.call(this,t,d);const s={};for(const [id,a] of B.soldiers)s[id]={f:a.frame,face:a.facing};log.push({tick:S.clock.tick,s,events:B.lastEvents??[]});B.lastEvents=[];if(log.length>4000)log.splice(0,1000);};
 const drain=S.drainEvents.bind(S);S.drainEvents=()=>{const e=drain();B.lastEvents=e.map(x=>({type:x.type,id:x.id,sourceId:x.sourceId,amount:x.amount}));return e;};
 window.clearField=()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.hero.x=600;S.hero.y=600;};
 window.spot=()=>{const st=S.state.structures,open=(x,y)=>{for(let d=-300;d<=300;d+=8)for(const e of [-60,0,60])if(S.geo.blocked(x+d,y+e,14,st))return false;return true;};for(let y=300;y<1000;y+=24)for(let x=500;x<1500;x+=24)if(open(x,y))return {x,y};};
 window.soldier=(id,kind,x,y,o={})=>{const u={...S.unit(id,kind,x,y,o.archetype,undefined,S.clock.tick),...o};delete u.archetype;if(o.archetype)u.archetype=o.archetype;S.state.units[id]=u;return u;};
});
const SF=await page.evaluate(async()=>(await import('/src/world/soldierSprite.ts')).SF);
const M=await page.evaluate(async()=>(await import('/src/world/soldierSprite.ts')).SOLDIER_MOTION);

// 1. The sheets; the size and feet against the old still.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();soldier('blue-t1','minion-blue',p.x,p.y,{speed:0,damage:0});soldier('red-t1','minion-red',p.x+200,p.y,{speed:0,damage:0});await frames(10);
  const t=k=>B.textures.exists(k)?B.textures.get(k).frameTotal-1:0,a=B.soldiers.get('blue-t1').art,b=B.soldiers.get('red-t1').art;
  return {sheets:{azure:t('soldier-azure'),crimson:t('soldier-crimson'),desert:t('soldier-desert'),shadow:t('soldier-shadowblade')},keys:[a.texture.key,b.texture.key],h:+(a.scaleY*120).toFixed(2),x:+a.x.toFixed(2),feet:+(13.5*a.scaleY).toFixed(2),f:[a.frame.name,b.frame.name],hit:a.input?.hitArea&&[a.input.hitArea.x,a.input.hitArea.y,a.input.hitArea.width,a.input.hitArea.height],pick:(()=>{const v=B.visuals.get('red-t1'),r=B.pickBounds('red-t1',v);return [r.x-v.x,r.y-v.y,r.width,r.height].map(n=>+n.toFixed(1));})()};});
 check(Object.values(r.sheets).every(n=>n===14),'Azure, Crimson, Desert Raider and Shadowblade sheets each hold 14 frames',r.sheets);
 check(r.keys[0]==='soldier-azure'&&r.keys[1]==='soldier-crimson','Azure soldiers draw the Azure sheet, Crimson the recolour',r.keys);
 check(Math.abs(r.h-57.6)<.1,'idle drawn 57.6 px tall, the old still height',r.h);
 check(Math.abs(r.x-r.feet)<.01,'feet placed where the still\'s feet stood (13.5 cell px right of centre)',r);
 check(r.f.every(f=>+f===SF.idle),'standing still shows idle',r.f);
 check(JSON.stringify(r.hit)===JSON.stringify([42,53,123,119]),'fixed tap box: the idle body',r.hit);
 // origin/main: a Crimson soldier's drawn bounds are [-30.5,-72.6,58.4,81.2] (x, y from the unit, width, height); target picking must use the same area
 check(Math.abs(r.pick[0]+30.5)<=1&&Math.abs(r.pick[1]+72.6)<=1&&Math.abs(r.pick[2]-58.4)<=3&&Math.abs(r.pick[3]-81.2)<=1,'Hero target picking sees the old still area, not the padded frame',r.pick);
}
// 2. Walk and facing from movement (moved by hand, 3 px a frame, its simulation target masked: a soldier with a target faces it); the HP bar stays put.
{
 const r=await page.evaluate(async()=>{delete S.state.units['red-t1'];const u=S.state.units['blue-t1'];Object.defineProperty(u,'targetId',{configurable:true,get:()=>undefined,set:()=>{}});await frames(3);const bar=B.hpBars.get('blue-t1').bar,b0=[bar.x,bar.y];const run=async(dx,n)=>{const out=[];for(let i=0;i<n;i++){u.x+=dx;await frames(1);const s=B.soldiers.get('blue-t1');out.push({f:s.frame,sx:Math.sign(s.art.scaleX)});}await frames(12);return out;};
  const right=await run(3,60),left=await run(-3,60);delete u.targetId;return {right,left,idle:B.soldiers.get('blue-t1').frame,bar:[b0,[bar.x,bar.y]]};});
 const wr=new Set(r.right.slice(6).map(x=>x.f)),wl=new Set(r.left.slice(6).map(x=>x.f));
 check(SF.walk.every(f=>wr.has(f))&&[...wr].every(f=>SF.walk.includes(f)),'walking right cycles all six walk frames',[...wr]);
 check(r.right.slice(6).every(x=>x.sx===-1),'walking right mirrors the art (authored facing left)');
 check(r.left.slice(10).every(x=>x.sx===1)&&SF.walk.every(f=>wl.has(f)),'walking left shows the authored facing and the walk',[...wl]);
 check(r.idle===SF.idle,'stopping returns to idle',r.idle);
 check(r.bar[0][0]===r.bar[1][0]&&r.bar[0][1]===r.bar[1][1],'the HP bar never moves with the art',r.bar);
}
// 3. Crowd nudges (target masked): 1.5 px back and forth for 2 s never turn a soldier.
{
 const r=await page.evaluate(async()=>{const u=S.state.units['blue-t1'],s=B.soldiers.get('blue-t1');Object.defineProperty(u,'targetId',{configurable:true,get:()=>undefined,set:()=>{}});await frames(20);const f0=s.facing;let turns=0,last=f0;for(let i=0;i<120;i++){u.x+=i%2?1.5:-1.5;u.y+=i%3?1:-1;await frames(1);if(s.facing!==last){turns++;last=s.facing;}}delete u.targetId;return {turns,f0};});
 check(r.turns===0,'crowd nudges never flip a soldier',r);
}
// 4. A turn mirrors about the feet pivot, measured on rendered pixels: the art alone, idle, each facing; the mirror axis of the lowest rows must sit on the
// pivot (the validator puts the idle's feet midpoint 0.5 cell px from it, so the feet stay within 1 px on a turn).
{
 const r=await page.evaluate(async()=>{const v=B.visuals.get('blue-t1'),s=B.soldiers.get('blue-t1'),a=s.art,cam=B.cameras.main;const adv=S.advance;S.advance=()=>{};cam.stopFollow();await frames(3);
  const shot=()=>new Promise(res=>{const x=v.x-cam.scrollX,y=v.y-cam.scrollY;B.game.renderer.snapshotArea(Math.round(x-60),Math.round(y-80),120,90,img=>{const c=document.createElement('canvas');c.width=120;c.height=90;const g=c.getContext('2d');g.drawImage(img,0,0);res(g.getImageData(0,0,120,90).data);});});
  const hold=B.animateSoldier;B.animateSoldier=()=>{};
  const feet=async sx=>{a.scaleX=Math.abs(a.scaleX)*sx;a.setFrame(0);a.setVisible(true);await frames(2);const on=await shot();a.setVisible(false);await frames(2);const off=await shot();a.setVisible(true);
   const d=i=>Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>40;let low=-1;for(let y=89;y>=0&&low<0;y--)for(let x=0;x<120;x++)if(d((y*120+x)*4)){low=y;break;}
   const cols=[];for(let x=0;x<120;x++)for(let y=low;y>=low-12;y--)if(d((y*120+x)*4)){cols.push(x);break;}return {low,mid:(Math.min(...cols)+Math.max(...cols))/2};};
  const l=await feet(1),rr=await feet(-1);B.animateSoldier=hold;S.advance=adv;B.followHero();return {l,r:rr,pivot:60+a.x};});
 check(Math.abs((r.l.mid+r.r.mid)/2-r.pivot)<=1&&Math.abs(r.l.low-r.r.low)<=1,'a turn mirrors about the feet pivot (within 1 px, rendered)',r);
}
// 5. Attack contact on the hit: Azure vs Crimson, and a Shadowblade (6-tick windup), fighting for 6 s; every soldier hit lands on its contact frame.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();
  soldier('blue-a','minion-blue',p.x,p.y,{speed:0,hp:9000,maxHp:9000});soldier('red-a','minion-red',p.x+30,p.y,{speed:0,hp:9000,maxHp:9000});
  soldier('blue-b','minion-blue',p.x,p.y+90,{speed:0,hp:9000,maxHp:9000});const sb=soldier('red-sb','minion-red',p.x-30,p.y+90,{speed:0,hp:9000,maxHp:9000,windupTicks:6,cooldownTicks:21,commander:{role:'shadowblade',lane:'north',structureBonus:1,keepBonus:.5}});
  const start=log.length;await frames(360);const L=log.slice(start),hits=[],before=[];
  for(let i=1;i<L.length;i++)for(const e of L[i].events)if(e.type==='damage'&&B.soldiers.has(e.sourceId)||e.type==='damage'&&L[i].s[e.sourceId]){const id=e.sourceId;hits.push({id,f:L[i].s[id]?.f});before.push(L[i-1].s[id]?.f);}
  const keys={};for(const id of ['blue-a','red-a','blue-b','red-sb'])keys[id]=B.soldiers.get(id)?.art.texture.key;
  return {hits,before,keys,windup:sb.windupTicks};});
 const by=id=>r.hits.filter(h=>h.id===id);
 check(r.keys['red-sb']==='soldier-shadowblade','the Shadowblade draws its recolour of the Crimson sheet',r.keys);
 for(const id of ['blue-a','red-a','blue-b','red-sb'])check(by(id).length>=3&&by(id).every(h=>h.f===SF.attack[2]),`${id}: every hit lands on the contact frame`,by(id).map(h=>h.f));
 check(r.before.every(f=>f!==SF.attack[2]),'the update before each hit is not yet contact',r.before);
}
// 6. Hurt flinch from damage while not attacking.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('red-h','minion-red',p.x,p.y,{speed:0,hp:900,maxHp:900,damage:0});await frames(5);S.hit(S.hero,u,10,'physical');await frames(2);const a=B.soldiers.get('red-h').frame;await frames(20);return {a,b:B.soldiers.get('red-h').frame};});
 check(r.a===SF.hurt&&r.b===SF.idle,'damage shows the flinch, then idle',r);
}
// 7. The fallen body: stagger, collapse, down, fade, gone by 1.5 s; never more than 16 at once.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('red-d','minion-red',p.x,p.y,{speed:0,damage:0});await frames(5);const v=B.visuals.get('red-d'),at={x:v.x+B.soldiers.get('red-d').art.x,y:v.y};
  S.hit(S.hero,u,99999,'direct');const seen=[];const t0=performance.now();let pos;while(performance.now()-t0<1600){await frames(1);const c=B.corpses[0];if(c){seen.push({f:c.frame,a:+c.art.alpha.toFixed(2),t:Math.round(performance.now()-t0)});pos??={x:c.art.x,y:c.art.y};}}
  const gone=B.corpses.length,visual=B.visuals.has('red-d');
  for(let i=0;i<22;i++)soldier('red-m'+i,'minion-red',p.x-200+i*20,p.y+(i%2)*40,{speed:0,damage:0});await frames(5);for(let i=0;i<22;i++)S.hit(S.hero,S.state.units['red-m'+i],99999,'direct');await frames(3);
  const live=B.corpses.filter(c=>c.fadeFrom===undefined).length,all=B.corpses.length;await frames(30);const after=B.corpses.length;await frames(90);
  return {frames:[...new Set(seen.map(s=>s.f))],first:seen[0],last:seen.at(-1),pos,at,gone,visual,live,all,after,end:B.corpses.length};});
 check(JSON.stringify(r.frames)===JSON.stringify(SF.death),'the body plays stagger, collapse, down',r.frames);
 check(r.pos&&Math.abs(r.pos.x-r.at.x)<.5&&Math.abs(r.pos.y-r.at.y-4)<.5,'the body falls where the soldier stood',{pos:r.pos,at:r.at});
 check(r.last.a<1&&r.gone===0&&!r.visual,'it fades and is gone within 1.5 s; the live visual is removed at death',r);
 check(r.live<=M.corpseCap&&r.after<=M.corpseCap,'never more than 16 bodies on the ground (the oldest fade fast)',{live:r.live,all:r.all,after:r.after});
}
// 8. Pause freezes the walk frame.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('blue-p','minion-blue',p.x,p.y,{speed:0,damage:0});for(let i=0;i<20;i++){u.x+=3;await frames(1);}H.setPause(true);await frames(3);const a=B.soldiers.get('blue-p').frame;for(let i=0;i<20;i++){await frames(1);}const b=B.soldiers.get('blue-p').frame;H.setPause(false);await frames(5);return {a,b};});
 check(r.a===r.b,'pause freezes the frame',r);
}
// 9. A 30-soldier melee (15 a side) for 8 s: no facing flicker, every frame from the sheet, and a screenshot for review.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();S.hero.x=p.x;S.hero.y=p.y+260;B.followHero();for(let i=0;i<15;i++){soldier('blue-c'+i,'minion-blue',p.x-160-(i%5)*26,p.y-60+Math.floor(i/5)*48,{hp:1500,maxHp:1500});soldier('red-c'+i,'minion-red',p.x+160+(i%5)*26,p.y-60+Math.floor(i/5)*48,{hp:1500,maxHp:1500});}
  const start=log.length;const cam=B.cameras.main;cam.stopFollow();cam.centerOn(p.x,p.y*0.72);await frames(240);const L=log.slice(start);const turns={};for(let i=1;i<L.length;i++)for(const [id,s] of Object.entries(L[i].s)){const q=L[i-1].s[id];if(q&&q.face!==s.face)turns[id]=(turns[id]??0)+1;}
  const seconds=L.length/60,max=Math.max(0,...Object.values(turns));return {n:Object.keys(L.at(-1).s).length,max,perSecond:+(max/seconds).toFixed(2),attacks:L.flatMap(x=>x.events).filter(e=>e.type==='attack').length};});
 check(r.n>=20&&r.attacks>20,'a 30-soldier melee runs with 20+ animated soldiers fighting',r);
 check(r.perSecond<1,'no facing flicker in the crowd (under one turn a second per soldier)',r);
 if(shots){const buf=await page.screenshot();writeFileSync(`${shots}/melee.png`,buf);}
 await page.evaluate(()=>B.followHero());
}
check(errors.length===0,'no page errors',errors.slice(0,5));
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

// Crimson Elite Soldier V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs two dev servers:
//   SPRITE_URL=http://127.0.0.1:5431/ (this build)  REF_URL=http://127.0.0.1:5441/ (the baseline, 84cf12e, where the Elite is the still)  ELITE_SHOTS=<dir> (review screenshots, optional)
// Checks the sheet (14 frames, the Soldier / Desert Raider / Shadowblade sheets unchanged), the Elite's drawn size (72 px), feet, tap box and target-pick area and its HP bar
// against the baseline, the walk (six frames, the 80 px stride, facing from movement), the spear thrust (wind-up, drive, contact in order, contact on the simulation hit tick),
// the Elite's own stats unchanged against the baseline, hurt, the fallen body (stagger, collapse, down; gone by 1.3 s; the cap of 16), pause, the real Last Stand (the gate falls: three Elites)
// and the real counterattack (an outpost captured: two Elites each), a melee with 7 Elites, the other Elite levels (26, 36, 44, 45) loading and drawing the Elite from the sheet, and no page errors.
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5441/',shots=process.env.ELITE_SHOTS;
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const errors=[];
async function open(url,level){
 const ctx=await browser.newContext({viewport:{width:960,height:540},hasTouch:true}),page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(`${level}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`${level}: ${m.text()}`);});
 await page.goto(`${url}?debug=1&level=${level}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:45000});
 await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.H=window.kingdomGame.scene.getScene('HUD');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
  window.log=[];const u=B.sys.sceneUpdate;B.sys.sceneUpdate=function(t,d){u.call(this,t,d);const s={};for(const [id,a] of B.soldiers||[])s[id]={f:a.frame,face:a.facing};log.push({tick:S.clock.tick,s,events:B.lastEvents??[]});B.lastEvents=[];if(log.length>4000)log.splice(0,1000);};
  const drain=S.drainEvents.bind(S);S.drainEvents=()=>{const e=drain();B.lastEvents=e.map(x=>({type:x.type,id:x.id,sourceId:x.sourceId,amount:x.amount}));return e;};
  window.clearField=()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.hero.x=600;S.hero.y=600;S.hero.hp=S.hero.maxHp=1e7;};
  window.spot=()=>{const st=S.state.structures,open=(x,y)=>{for(let d=-300;d<=300;d+=8)for(const e of [-60,0,60])if(S.geo.blocked(x+d,y+e,14,st))return false;return true;};for(let y=300;y<1000;y+=24)for(let x=500;x<1500;x+=24)if(open(x,y))return {x,y};};
  window.soldier=(id,kind,x,y,o={})=>{const u={...S.unit(id,kind,x,y,o.archetype,undefined,S.clock.tick),...o};delete u.archetype;if(o.archetype)u.archetype=o.archetype;S.state.units[id]=u;return u;};});
 return {page,ctx};
}
const {page}=await open(base,46);
const mod=await page.evaluate(async()=>{const m=await import('/src/world/soldierSprite.ts'),c=await import('/src/data/combat.ts');return {SF:m.SF,M:m.SOLDIER_MOTION,E:m.ELITE_SHEET,elite:c.crimsonElite.stats};});
const {SF,M,E}=mod;
const ELITE={archetype:'crimson-elite'};
// The Elite's own numbers, as the simulation sets them, from both builds.
const statsOf=()=>({hp:0,...(()=>{const u=S.unit('probe','minion-red',700,700,'crimson-elite',undefined,S.clock.tick);return {maxHp:u.maxHp,hp:u.hp,speed:u.speed,damage:u.damage,range:u.range,armor:u.armor,radius:u.radius,windupTicks:u.windupTicks,cooldownTicks:u.cooldownTicks,archetype:u.archetype};})()});
const measure=async(pg)=>pg.evaluate(async()=>{clearField();const p=spot();const u=soldier('red-e1','minion-red',p.x,p.y,{archetype:'crimson-elite',speed:0,damage:0});soldier('red-t1','minion-red',p.x+200,p.y,{speed:0,damage:0});await frames(10);
 const v=B.visuals.get('red-e1'),hp=B.hpBars.get('red-e1'),bar=hp&&{x:hp.bar.x,y:hp.bar.y,w:hp.bar.width??hp.bar.displayWidth},r=B.pickBounds('red-e1',v);
 const t=k=>B.textures.exists(k)?B.textures.get(k).frameTotal-1:0;
 const im=v.list.find(c=>c.type==='Image');return {h:+(im.texture.key==='soldier-elite'?im.scaleY*150:im.displayHeight).toFixed(2),name:u.name??null,bar,pick:[r.x-v.x,r.y-v.y,r.width,r.height].map(n=>+n.toFixed(1)),ring:v.list.filter(c=>c.type==='Ellipse').length,sheets:{azure:t('soldier-azure'),crimson:t('soldier-crimson'),desert:t('soldier-desert'),shadow:t('soldier-shadowblade'),elite:t('soldier-elite')}};});
const mine=await measure(page);
// The baseline: the same measurements on 84cf12e.
const {page:refPage}=await open(ref,46);
const refStats=await refPage.evaluate(`(${statsOf.toString()})()`),myStats=await page.evaluate(`(${statsOf.toString()})()`);
const theirs=await measure(refPage),theirsH=theirs.h;
// 1. The sheets and the Elite's size, feet and tap box.
{
 const r=await page.evaluate(async(E)=>{const a=B.soldiers.get('red-e1').art,c=B.soldiers.get('red-t1').art;return {key:a.texture.key,f:a.frame.name,h:+(a.scaleY*E.idleHeight).toFixed(2),x:+a.x.toFixed(3),feet:+(E.feetX*a.scaleY).toFixed(3),hit:a.input?.hitArea&&[a.input.hitArea.x,a.input.hitArea.y,a.input.hitArea.width,a.input.hitArea.height],plain:c.texture.key,plainH:+(c.scaleY*120).toFixed(2),origin:[+a.originX.toFixed(4),+a.originY.toFixed(4)]};},E);
 check(mine.sheets.elite===14&&mine.sheets.azure===14&&mine.sheets.crimson===14&&mine.sheets.desert===14&&mine.sheets.shadow===14,'the Elite sheet holds 14 frames; the Azure, Crimson, Desert Raider and Shadowblade sheets still do',mine.sheets);
 check(r.key==='soldier-elite'&&+r.f===SF.idle,'the Elite draws its own sheet, idle',r);
 check(Math.abs(r.h-86.4)<.1&&Math.abs(r.h-theirsH)<.1,'idle drawn 86.4 px tall (1.5x a Soldier at 57.6, as the still was)',r.h);
 check(Math.abs(r.x-r.feet)<.01,'feet placed where the still\'s feet stood',r);
 check(JSON.stringify(r.hit)===JSON.stringify([E.hit.x,E.hit.y,E.hit.w,E.hit.h]),'fixed tap box: the idle body',r.hit);
 check(r.plain==='soldier-crimson'&&Math.abs(r.plainH-57.6)<.1,'an ordinary Crimson soldier still draws the Crimson sheet at 57.6 px',{plain:r.plain,h:r.plainH});
}
// 2. Against the baseline: the Elite's stats, HP bar and target-pick area.
{
 check(JSON.stringify(refStats)===JSON.stringify(myStats)&&myStats.maxHp===mod.elite.maxHp&&myStats.speed===mod.elite.speed&&myStats.damage===mod.elite.damage&&myStats.windupTicks===mod.elite.windupTicks,'the Elite hit points, speed, damage, range, armor, radius and timing are exactly the baseline ones',myStats);
 check(mine.name===theirs.name&&JSON.stringify(mine.bar)===JSON.stringify(theirs.bar),'the Elite HP bar is where the baseline put it',{mine:mine.bar,theirs:theirs.bar});
 check(Math.abs(mine.pick[0]-theirs.pick[0])<=3&&Math.abs(mine.pick[1]-theirs.pick[1])<=3&&Math.abs(mine.pick[2]-theirs.pick[2])<=4&&Math.abs(mine.pick[3]-theirs.pick[3])<=3,'Hero target picking sees the same area as the old still',{mine:mine.pick,theirs:theirs.pick});
}
await refPage.context().close();
// 3. Walk and facing from movement (target masked, moved by hand): six walk frames, the 80 px stride, mirrored toward the right.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();const u=soldier('red-w','minion-red',p.x,p.y,{archetype:'crimson-elite',speed:0,damage:0});Object.defineProperty(u,'targetId',{configurable:true,get:()=>undefined,set:()=>{}});await frames(5);
  const run=async(dx,n)=>{const out=[];for(let i=0;i<n;i++){u.x+=dx;await frames(1);const s=B.soldiers.get('red-w');out.push({f:s.frame,sx:Math.sign(s.art.scaleX)});}await frames(12);return out;};
  const right=await run(3,80),left=await run(-3,80);return {right,left,idle:B.soldiers.get('red-w').frame};});
 const wr=r.right.slice(6).map(x=>x.f),wl=new Set(r.left.slice(10).map(x=>x.f));let changes=0;for(let i=1;i<wr.length;i++)if(wr[i]!==wr[i-1])changes++;
 check(SF.walk.every(f=>wr.includes(f))&&wr.every(f=>SF.walk.includes(f)),'walking cycles all six walk frames (and no others)',[...new Set(wr)]);
 const expected=74*3/E.stride*6; // 74 steps of 3 px after the first six
 check(Math.abs(changes-expected)<=2,`the walk cycle is one stride per ${E.stride} px (about ${expected.toFixed(1)} frame changes over 222 px)`,{changes});
 check(r.right.slice(6).every(x=>x.sx===-1)&&r.left.slice(10).every(x=>x.sx===1)&&SF.walk.every(f=>wl.has(f)),'authored facing left; mirrored when walking right');
 check(r.idle===SF.idle,'stopping returns to idle',r.idle);
}
// 4. The spear thrust against an Azure soldier: wind-up, drive, contact in order; every hit lands on the contact frame.
{
 const r=await page.evaluate(async(SF)=>{clearField();const p=spot();soldier('blue-a','minion-blue',p.x,p.y,{speed:0,damage:0,hp:99999,maxHp:99999});const el=soldier('red-a','minion-red',p.x+40,p.y,{archetype:'crimson-elite',speed:0,hp:9000,maxHp:9000});
  const start=log.length;await frames(300);const L=log.slice(start),hits=[],seqs=[];
  for(let i=1;i<L.length;i++)for(const e of L[i].events)if(e.type==='damage'&&e.sourceId==='red-a'){hits.push({f:L[i].s['red-a']?.f,before:L[i-1].s['red-a']?.f,amount:e.amount});const seq=[];for(let j=i;j>=Math.max(1,i-60);j--){const f=L[j].s['red-a']?.f;if(f!==undefined&&seq[0]!==f)seq.unshift(f);if(f===SF.idle)break;}seqs.push(seq);}
  return {hits,seqs,windup:el.windupTicks};},SF);
 check(r.hits.length>=3&&r.hits.every(h=>h.f===SF.attack[2]),'every Elite hit lands on the contact frame',r.hits.map(h=>h.f));
 check(r.hits.every(h=>h.before!==SF.attack[2]),'the update before each hit is not yet contact',r.hits.map(h=>h.before));
 check(r.seqs.every(s=>{const a=s.filter(f=>SF.attack.includes(f));return a.join()===SF.attack.join();}),'each thrust plays wind-up, drive, contact in that order',r.seqs.slice(0,3));
 check(r.hits.every(h=>h.amount===r.hits[0].amount)&&r.windup===9,'the hit and its 9-tick windup are the simulation\'s, not the picture\'s',{windup:r.windup,amount:r.hits[0]?.amount});
}
// 5. Hurt.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('red-h','minion-red',p.x,p.y,{archetype:'crimson-elite',speed:0,hp:480,maxHp:480,damage:0});await frames(5);S.hit(S.hero,u,10,'physical');await frames(2);const a=B.soldiers.get('red-h').frame;await frames(20);return {a,b:B.soldiers.get('red-h').frame};});
 check(r.a===SF.hurt&&r.b===SF.idle,'damage shows the flinch, then idle',r);
}
// 6. The fallen body: stagger, collapse, down; fades and is gone within 1.5 s; the cap of 16 holds for Elites too.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('red-d','minion-red',p.x,p.y,{archetype:'crimson-elite',speed:0,damage:0});await frames(5);const v=B.visuals.get('red-d'),at={x:v.x+B.soldiers.get('red-d').art.x,y:v.y},scale=B.soldiers.get('red-d').art.scaleY;
  S.hit(S.hero,u,99999,'direct');const seen=[];const t0=performance.now();let pos;while(performance.now()-t0<1600){await frames(1);const c=B.corpses[0];if(c){seen.push({f:c.frame,a:+c.art.alpha.toFixed(2),key:c.art.texture.key,sc:c.art.scaleY,t:Math.round(performance.now()-t0)});pos??={x:c.art.x,y:c.art.y};}}
  const gone=B.corpses.length,visual=B.visuals.has('red-d');
  for(let i=0;i<22;i++)soldier('red-m'+i,'minion-red',p.x-200+i*20,p.y+(i%2)*40,{archetype:'crimson-elite',speed:0,damage:0});await frames(5);for(let i=0;i<22;i++)S.hit(S.hero,S.state.units['red-m'+i],99999,'direct');await frames(3);
  const live=B.corpses.filter(c=>c.fadeFrom===undefined).length,all=B.corpses.length;await frames(30);const after=B.corpses.length;await frames(90);
  return {frames:[...new Set(seen.map(s=>s.f))],key:seen[0]?.key,sc:seen[0]?.sc,scale,first:seen[0],last:seen.at(-1),pos,at,gone,visual,live,all,after,end:B.corpses.length};});
 check(JSON.stringify(r.frames)===JSON.stringify(SF.death)&&r.key==='soldier-elite'&&Math.abs(r.sc-r.scale)<1e-6,'the body plays stagger, collapse, down from the Elite sheet at the Elite\'s size',{frames:r.frames,key:r.key});
 check(r.pos&&Math.abs(r.pos.x-r.at.x)<.5&&Math.abs(r.pos.y-r.at.y-4)<.5,'the body falls where the Elite stood',{pos:r.pos,at:r.at});
 check(r.last.a<1&&r.gone===0&&!r.visual,'it fades and is gone within 1.5 s; the live visual is removed at death',r);
 check(r.live<=M.corpseCap&&r.after<=M.corpseCap&&r.end===0,'never more than 16 bodies on the ground; all gone afterwards',{live:r.live,all:r.all,after:r.after,end:r.end});
}
// 7. Pause freezes the walk frame.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('red-p','minion-red',p.x,p.y,{archetype:'crimson-elite',speed:0,damage:0});for(let i=0;i<20;i++){u.x+=3;await frames(1);}H.setPause(true);await frames(3);const a=B.soldiers.get('red-p').frame;for(let i=0;i<20;i++)await frames(1);const b=B.soldiers.get('red-p').frame;H.setPause(false);await frames(5);return {a,b};});
 check(r.a===r.b,'pause freezes the frame',r);
}
const shot=async(name,x,y,zoom=1.7)=>{if(!shots)return;await page.evaluate(({x,y,zoom})=>{const c=B.cameras.main;c.stopFollow();c.setZoom(zoom);c.centerOn(x,y);H?.scene.setVisible(false);},{x,y,zoom});await page.evaluate(()=>frames(4));writeFileSync(`${shots}/${name}.png`,await page.screenshot());await page.evaluate(()=>{H?.scene.setVisible(true);});};
// 8. The real counterattack: capturing an outpost for the first time sends two Elites from its road (the simulation's own capture code; the Banner is stood in).
{
 await page.evaluate(()=>{clearField();});
 const r=await page.evaluate(async()=>{const wall=Object.values(S.state.structures).find(b=>b.kind==='wall'),p=S.postStates[0],flag=S.camps?.[0]?.flag??{x:1080,y:264};
  const n0=Object.values(S.state.units).filter(u=>u.archetype==='crimson-elite'&&u.id.startsWith('red-ca')).length;
  S.state.structures['bx']={...wall,id:'bx',banner:true,team:'blue',x:flag.x,y:flag.y,hp:1e9,maxHp:1e9,completeTick:0};p.bannerId='bx';
  await frames(200);const es=Object.values(S.state.units).filter(u=>u.archetype==='crimson-elite'&&u.id.startsWith('red-ca'));
  return {tick:S.clock.tick,paused:B.scene.isPaused(),ts:B.time?.timeScale,bx:!!S.state.structures.bx,bid:p.bannerId,wallId:wall?.id,n0,n:es.length,ids:es.map(u=>u.id),keys:es.map(u=>B.soldiers.get(u.id)?.art.texture.key),owner:p.owner,pos:es.map(u=>[Math.round(u.x),Math.round(u.y)]),mx:es[0]&&es.reduce((a,u)=>a+u.x,0)/es.length,my:es[0]&&es.reduce((a,u)=>a+u.y,0)/es.length};});
 check(r.n0===0&&r.owner==='azure'&&r.n===2&&r.keys.every(k=>k==='soldier-elite'),'capturing the North Outpost sends two Elites, each drawn from the Elite sheet',r);
 if(r.n)await shot('counterattack',r.mx,r.my,1.5);
}
// 9. The real Last Stand: the Fortress Gate falls, and the garrison marches out: three Elites, all from the Elite sheet.
{
 await page.evaluate(()=>{clearField();S.encounter={...S.encounter,waves:[],continuous:false};});
 const before=await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.archetype==='crimson-elite').length);
 await page.evaluate(()=>{const g=S.state.structures['red-fortress-gate'];S.hit(S.hero,g,1e9,'direct');});
 await page.evaluate(()=>frames(150));
 const r=await page.evaluate(()=>{const es=Object.values(S.state.units).filter(u=>u.archetype==='crimson-elite'&&u.hp>0);return {n:es.length,ids:es.map(u=>u.id),keys:es.map(u=>B.soldiers.get(u.id)?.art.texture.key),pos:es.map(u=>[Math.round(u.x),Math.round(u.y)]),mx:es[0]&&es.reduce((a,u)=>a+u.x,0)/es.length,my:es[0]&&es.reduce((a,u)=>a+u.y,0)/es.length};});
 check(before===0&&r.n===3&&r.keys.every(k=>k==='soldier-elite'),'the Last Stand sends three Elites, each drawn from the Elite sheet',r);
 if(r.n)await shot('last-stand',r.mx,r.my,1.5);
}
// 10. A melee: 7 Elites against 7 Azure soldiers for 6 s; no facing flicker; the screenshot for review.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();S.hero.x=p.x;S.hero.y=p.y+260;for(let i=0;i<7;i++){soldier('blue-c'+i,'minion-blue',p.x-120-(i%3)*26,p.y-60+Math.floor(i/3)*48,{hp:2500,maxHp:2500});soldier('red-c'+i,'minion-red',p.x+120+(i%3)*26,p.y-60+Math.floor(i/3)*48,{archetype:'crimson-elite',hp:2500,maxHp:2500});}
  log.length=0;const start=0;const cam=B.cameras.main;cam.stopFollow();cam.setZoom(1.6);cam.centerOn(p.x,p.y-20);await frames(240);const L=log.slice(start);const turns={};for(let i=1;i<L.length;i++)for(const [id,s] of Object.entries(L[i].s)){const q=L[i-1].s[id];if(q&&q.face!==s.face)turns[id]=(turns[id]??0)+1;}
  const frs=new Set();for(const x of L)for(const [id,s] of Object.entries(x.s))if(id.startsWith('red-c'))frs.add(s.f);
  return {n:Object.keys(L.at(-1).s).length,max:Math.max(0,...Object.values(turns)),perSecond:+(Math.max(0,...Object.values(turns))/(L.length/60)).toFixed(2),attacks:L.flatMap(x=>x.events).filter(e=>e.type==='attack'&&e.id.startsWith('red-c')).length,frames:[...frs].sort((a,b)=>a-b)};});
 check(r.n>=14&&r.attacks>10,'a 14-unit melee runs with the Elites thrusting',r);
 check(r.perSecond<1,'no facing flicker (under one turn a second per unit)',r);
 if(shots){await page.evaluate(()=>H?.scene.setVisible(false));writeFileSync(`${shots}/melee.png`,await page.screenshot());await page.evaluate(()=>H?.scene.setVisible(true));}
}
// 11. The other levels that field Elites load, draw them from the sheet, and run without errors.
for(const level of [26,36,44,45]){
 const {page:p2,ctx}=await open(base,level);
 const r=await p2.evaluate(async()=>{clearField();const p=spot()??{x:S.hero.x+150,y:S.hero.y};soldier('red-e','minion-red',p.x,p.y,{archetype:'crimson-elite',speed:0,damage:0});await frames(8);return {key:B.soldiers.get('red-e')?.art.texture.key,exists:B.textures.exists('soldier-elite'),level:B.campaignLevel?.id};});
 check(r.key==='soldier-elite'&&r.exists,`level ${level} (${r.level}): an Elite draws from the Elite sheet`,r);
 await ctx.close();
}
check(errors.length===0,'no page errors',errors.slice(0,5));
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

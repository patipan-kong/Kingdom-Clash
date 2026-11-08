// Crimson Hero V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs two dev servers:
//   SPRITE_URL=http://127.0.0.1:5431/ (this build)  REF_URL=http://127.0.0.1:5441/ (the baseline, 387228b, where every Crimson Hero-class unit is the still)  HERO_SHOTS=<dir> (optional)
// Checks the sheet (14 frames; the Soldier, Elite and other sheets unchanged), the drawn size of the Crimson Lord / Defender Hero and of the Iron Marshal against the baseline, their stats against the
// baseline, HP bar and target-pick area, the walk (six frames, a stride that follows the drawn size), the axe chop (wind-up, drive, contact in order; contact on the simulation hit tick for the 6-tick Lord
// and the 8-tick Marshal), the flinch capped at one per 900 ms (the Soldier's 350 ms unchanged), the fallen body (frames, 1.3 s), pause, the real Lord (released when the Throne Gate falls, killed, returned 45 s
// later) and the real Marshal (warning then release at 240 s), the other levels that field a Crimson Hero-class unit, and no page errors.
import {chromium} from '@playwright/test';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5441/';
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
  const drain=S.drainEvents.bind(S);S.drainEvents=()=>{const e=drain();B.lastEvents=e.map(x=>({type:x.type,change:x.change,id:x.id,sourceId:x.sourceId,amount:x.amount}));return e;};
  window.clearField=()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.hero.x=600;S.hero.y=600;S.hero.hp=S.hero.maxHp=1e7;};
  window.spot=()=>{const st=S.state.structures,open=(x,y)=>{for(let d=-300;d<=300;d+=8)for(const e of [-60,0,60])if(S.geo.blocked(x+d,y+e,14,st))return false;return true;};for(let y=300;y<1000;y+=24)for(let x=500;x<1500;x+=24)if(open(x,y))return {x,y};};
  window.soldier=(id,kind,x,y,o={})=>{const u={...S.unit(id,kind,x,y,o.archetype,undefined,S.clock.tick),...o};delete u.archetype;if(o.archetype)u.archetype=o.archetype;S.state.units[id]=u;return u;};
  window.MARSHAL={windupTicks:8,cooldownTicks:29,range:54,commander:{role:'marshal',lane:'north',structureBonus:1.5,keepBonus:1.5}};});
 return {page,ctx};
}
const {page}=await open(base,46);
const mod=await page.evaluate(async()=>{const m=await import('/src/world/soldierSprite.ts'),c=await import('/src/data/combat.ts');return {SF:m.SOLDIER_MOTION&&m.SF,M:m.SOLDIER_MOTION,H:m.HERO_SHEET,hero:c.crimsonHero.stats};});
const {SF,M,H:HS}=mod;
const HERO={archetype:'crimson-hero'};
// What the picture changes nothing about: the Hero's own numbers as the simulation sets them.
const statsOf=()=>{const u=S.unit('probe','minion-red',700,700,'crimson-hero',undefined,S.clock.tick);return {maxHp:u.maxHp,hp:u.hp,speed:u.speed,damage:u.damage,range:u.range,armor:u.armor,radius:u.radius,windupTicks:u.windupTicks,cooldownTicks:u.cooldownTicks,archetype:u.archetype};};
const measure=async(pg)=>pg.evaluate(async()=>{clearField();const p=spot();soldier('red-h1','minion-red',p.x,p.y,{archetype:'crimson-hero',speed:0,damage:0});soldier('red-m1','minion-red',p.x+250,p.y,{archetype:'crimson-hero',speed:0,damage:0,...MARSHAL});soldier('red-s1','minion-red',p.x+500,p.y,{speed:0,damage:0});soldier('red-e1','minion-red',p.x+500,p.y+120,{archetype:'crimson-elite',speed:0,damage:0});await frames(10);
 const one=id=>{const v=B.visuals.get(id),hp=B.hpBars.get(id),bar=hp&&{x:hp.bar.x,y:hp.bar.y,w:hp.bar.width??hp.bar.displayWidth},r=B.pickBounds(id,v),im=v.list.find(c=>c.type==='Image');
  return {key:im.texture.key,h:+(im.texture.key==='soldier-hero'?im.scaleY*215:im.displayHeight).toFixed(2),bar,pick:[r.x-v.x,r.y-v.y,r.width,r.height].map(n=>+n.toFixed(1)),name:B.unitVisual(S.state.units[id])?.name,ax:+im.x.toFixed(2),ay:+im.y.toFixed(2),ox:+im.originX.toFixed(4)};};
 const t=k=>B.textures.exists(k)?B.textures.get(k).frameTotal-1:0;
 return {hero:one('red-h1'),marshal:one('red-m1'),soldier:one('red-s1'),elite:one('red-e1'),sheets:{azure:t('soldier-azure'),crimson:t('soldier-crimson'),elite:t('soldier-elite'),hero:t('soldier-hero')}};});
const mine=await measure(page);
const {page:refPage}=await open(ref,46);
const theirs=await measure(refPage);
const refStats=await refPage.evaluate(`(${statsOf.toString()})()`),myStats=await page.evaluate(`(${statsOf.toString()})()`);
// 1. Sheets, drawn sizes, feet and tap box.
{
 check(Object.values(mine.sheets).every(n=>n===14),'the Hero sheet holds 14 frames; the Azure, Crimson and Elite sheets still do',mine.sheets);
 check(mine.hero.key==='soldier-hero'&&mine.marshal.key==='soldier-hero','the Lord / Defender Hero and the Iron Marshal both draw the one Hero sheet',{hero:mine.hero.key,marshal:mine.marshal.key});
 check(mine.soldier.key==='soldier-crimson'&&mine.elite.key==='soldier-elite','an ordinary Crimson soldier and an Elite keep their own sheets',{soldier:mine.soldier.key,elite:mine.elite.key});
 check(Math.abs(mine.hero.h-theirs.hero.h)<.2&&Math.abs(mine.marshal.h-theirs.marshal.h)<.2,'the Lord and the Marshal are drawn at the baseline sizes',{lord:[mine.hero.h,theirs.hero.h],marshal:[mine.marshal.h,theirs.marshal.h]});
 check(Math.abs(mine.marshal.h/mine.hero.h-2.3/1.9)<.01,'the Marshal is the same sheet 2.3/1.9 times larger',mine.marshal.h/mine.hero.h);
 const hit=await page.evaluate(()=>{const a=B.soldiers.get('red-h1').art;return a.input?.hitArea&&[a.input.hitArea.x,a.input.hitArea.y,a.input.hitArea.width,a.input.hitArea.height];});
 check(JSON.stringify(hit)===JSON.stringify([HS.hit.x,HS.hit.y,HS.hit.w,HS.hit.h]),'fixed tap box: the idle body',hit);
}
// 2. Against the baseline: stats, HP bar, name and target-pick area, for the Lord and the Marshal.
{
 check(JSON.stringify(refStats)===JSON.stringify(myStats)&&myStats.maxHp===833&&myStats.damage===80&&myStats.windupTicks===6&&myStats.cooldownTicks===23,'the Hero hit points, speed, damage, range, armor, radius and timing are exactly the baseline ones',myStats);
 for(const k of ['hero','marshal']){
  check(JSON.stringify(mine[k].bar)===JSON.stringify(theirs[k].bar)&&mine[k].name===theirs[k].name,`${k}: the HP bar and name are where the baseline put them`,{mine:mine[k].bar,theirs:theirs[k].bar,name:mine[k].name});
  const a=mine[k].pick,b=theirs[k].pick;
  check(Math.abs(a[0]-b[0])<=4&&Math.abs(a[1]-b[1])<=4&&Math.abs(a[2]-b[2])<=8&&Math.abs(a[3]-b[3])<=4,`${k}: Hero target picking sees the same area as the old still`,{mine:a,theirs:b});
 }
}
await refPage.context().close();
// 3. Walk and facing from movement (target masked): six frames; the stride follows the drawn size.
{
 const run=async(id,extra)=>page.evaluate(async({id,extra})=>{clearField();const p=spot();const u=soldier(id,'minion-red',p.x,p.y,{archetype:'crimson-hero',speed:0,damage:0,...extra});Object.defineProperty(u,'targetId',{configurable:true,get:()=>undefined,set:()=>{}});await frames(5);
  const go=async(dx,n)=>{const out=[];for(let i=0;i<n;i++){u.x+=dx;await frames(1);const s=B.soldiers.get(id);out.push({f:s.frame,sx:Math.sign(s.art.scaleX)});}await frames(12);return out;};
  const right=await go(3,80),left=await go(-3,80);return {right,left,idle:B.soldiers.get(id).frame,scale:B.soldiers.get(id).art.scaleY};},{id,extra});
 for(const [id,extra,label] of [['red-w1',{},'the Lord'],['red-w2',{windupTicks:8,commander:{role:'marshal',lane:'north',structureBonus:1.5,keepBonus:1.5}},'the Marshal']]){
  const r=await run(id,extra);const wr=r.right.slice(6).map(x=>x.f);let changes=0;for(let i=1;i<wr.length;i++)if(wr[i]!==wr[i-1])changes++;
  const sc=id==='red-w1'?mine.hero.h/215:mine.marshal.h/215,stride=HS.strideCells*sc,expected=74*3/stride*6;
  check(SF.walk.every(f=>wr.includes(f))&&wr.every(f=>SF.walk.includes(f)),`${label}: walking cycles all six walk frames`,[...new Set(wr)]);
  check(Math.abs(changes-expected)<=2,`${label}: one cycle per ${stride.toFixed(0)} px (about ${expected.toFixed(1)} frame changes over 222 px)`,{changes});
  check(r.right.slice(6).every(x=>x.sx===-1)&&r.left.slice(10).every(x=>x.sx===1)&&r.idle===SF.idle,`${label}: authored facing left, mirrored when walking right, idle on stopping`);
 }
}
// 4. The axe chop against an Azure soldier: wind-up, drive, contact in order; every hit lands on the contact frame, for the 6-tick Lord and the 8-tick Marshal.
{
 for(const [id,extra,label,wind] of [['red-a1',{},'the Lord',6],['red-a2',{windupTicks:8,cooldownTicks:29,range:54,commander:{role:'marshal',lane:'north',structureBonus:1.5,keepBonus:1.5}},'the Marshal',8]]){
  const r=await page.evaluate(async({id,extra,SF})=>{clearField();S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e12;
   // a Crimson Hero fights only the Azure Keep (the Marshal the nearest Azure tower first): stand it at its target
   const st=Object.values(S.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower'&&b.hp>0),keep=S.state.bases['blue-base'],tgt=extra.commander&&st[0]?st[0]:keep;for(const b of st)b.hp=b.maxHp=1e12;
   const el=soldier(id,'minion-red',tgt.x+(tgt===keep?150:90),tgt.y,{archetype:'crimson-hero',hp:9e6,maxHp:9e6,...extra});
   const start=log.length;await frames(420);const L=log.slice(start),hits=[],seqs=[];
   for(let i=1;i<L.length;i++)for(const e of L[i].events)if(e.type==='damage'&&e.sourceId===id){hits.push({f:L[i].s[id]?.f,before:L[i-1].s[id]?.f,amount:e.amount});const seq=[];for(let j=i;j>=Math.max(1,i-60);j--){const f=L[j].s[id]?.f;if(f!==undefined&&seq[0]!==f)seq.unshift(f);if(f===SF.idle)break;}seqs.push(seq);}
   return {hits,seqs,windup:el.windupTicks,target:tgt.id};},{id,extra,SF});
  check(r.hits.length>=3&&r.hits.every(h=>h.f===SF.attack[2]),`${label}: every hit lands on the contact frame`,r.hits.map(h=>h.f));
  check(r.hits.every(h=>h.before!==SF.attack[2]),`${label}: the update before each hit is not yet contact`,r.hits.map(h=>h.before));
  check(r.seqs.every(s=>s.filter(f=>SF.attack.includes(f)).join()===SF.attack.join()),`${label}: each chop plays wind-up, drive, contact in that order`,r.seqs.slice(0,3));
  check(r.windup===wind&&r.hits.every(h=>h.amount===r.hits[0].amount),`${label}: the ${wind}-tick windup and the hit are the simulation's, not the picture's`,{windup:r.windup,amount:r.hits[0]?.amount});
 }
}
// 5. The flinch: at most one per 900 ms for a Hero; a Soldier's 350 ms is unchanged.
{
 const r=await page.evaluate(async(SF)=>{clearField();const p=spot(),h=soldier('red-f1','minion-red',p.x,p.y,{archetype:'crimson-hero',speed:0,hp:9e6,maxHp:9e6,damage:0}),s=soldier('red-f2','minion-red',p.x+150,p.y,{speed:0,hp:9e6,maxHp:9e6,damage:0});await frames(5);
  const count=async(id)=>{let n=0,prev=-1;const t0=performance.now();let i=0;while(performance.now()-t0<3600){if(i++%6===0)S.hit(S.hero,S.state.units[id],10,'physical');await frames(1);const f=B.soldiers.get(id).frame;if(f===SF.hurt&&prev!==SF.hurt)n++;prev=f;}return n;};
  const hero=await count('red-f1'),soldier2=await count('red-f2');await frames(20);return {hero,soldier2,back:B.soldiers.get('red-f1').frame};},SF);
 check(r.hero>=3&&r.hero<=5,'a Hero hit every 100 ms for 3.6 s flinches about once per 900 ms (3 to 5 times)',r.hero);
 check(r.soldier2>=7,'an ordinary soldier hit the same way still flinches at the 350 ms gap',r.soldier2);
 check(r.back===SF.idle,'the flinch ends in idle',r.back);
}
// 6. The fallen body: stagger, collapse, down from the Hero sheet at the Hero size; gone within 1.5 s.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('red-d','minion-red',p.x,p.y,{archetype:'crimson-hero',speed:0,damage:0});await frames(5);const v=B.visuals.get('red-d'),at={x:v.x+B.soldiers.get('red-d').art.x,y:v.y},scale=B.soldiers.get('red-d').art.scaleY;
  S.hit(S.hero,u,99999,'direct');const seen=[];const t0=performance.now();let pos;while(performance.now()-t0<1600){await frames(1);const c=B.corpses[0];if(c){seen.push({f:c.frame,a:+c.art.alpha.toFixed(2),key:c.art.texture.key,sc:c.art.scaleY,t:Math.round(performance.now()-t0)});pos??={x:c.art.x,y:c.art.y};}}
  return {frames:[...new Set(seen.map(s=>s.f))],key:seen[0]?.key,sc:seen[0]?.sc,scale,last:seen.at(-1),pos,at,gone:B.corpses.length,visual:B.visuals.has('red-d')};});
 const SFd=SF.death;
 check(JSON.stringify(r.frames)===JSON.stringify(SFd)&&r.key==='soldier-hero'&&Math.abs(r.sc-r.scale)<1e-6,'the body plays stagger, collapse, down from the Hero sheet at the Hero size',{frames:r.frames,key:r.key});
 check(r.pos&&Math.abs(r.pos.x-r.at.x)<.5&&Math.abs(r.pos.y-r.at.y-4)<.5,'the body falls where the Hero stood',{pos:r.pos,at:r.at});
 check(r.last.a<1&&r.gone===0&&!r.visual,'it fades and is gone within 1.5 s (the 1.3 s lifecycle); the live visual is removed at death',{last:r.last,gone:r.gone});
}
// 7. Pause freezes the walk frame.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=soldier('red-p','minion-red',p.x,p.y,{archetype:'crimson-hero',speed:0,damage:0});for(let i=0;i<20;i++){u.x+=3;await frames(1);}H.setPause(true);await frames(3);const a=B.soldiers.get('red-p').frame;for(let i=0;i<20;i++)await frames(1);const b=B.soldiers.get('red-p').frame;H.setPause(false);await frames(5);return {a,b};});
 check(r.a===r.b,'pause freezes the frame',r);
}
// 8. The real Lord and the real Marshal in C5M6: released when the Throne Gate falls; killed; back 45 s later; the Marshal warned then released at 240 s.
{
 await page.evaluate(()=>{clearField();S.encounter={...S.encounter,waves:[],continuous:false};S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e9;});
 const before=await page.evaluate(()=>Object.values(S.state.units).filter(u=>u.archetype==='crimson-hero').length);
 await page.evaluate(()=>{S.hit(S.hero,S.state.structures['red-fortress-gate'],1e9,'direct');});
 await page.evaluate(()=>frames(120));
 const a=await page.evaluate(()=>{const u=S.state.units['red-hero'];return {exists:!!u,hp:u?.hp,key:B.soldiers.get('red-hero')?.art.texture.key,name:u&&B.unitVisual(u)?.name,x:u&&Math.round(u.x),y:u&&Math.round(u.y)};});
 check(before===0&&a.exists&&a.key==='soldier-hero'&&a.name==='Defender Hero','the Throne Gate falls and the Crimson Lord is released, drawn from the Hero sheet',a);
 await page.evaluate(()=>{const u=S.state.units['red-hero'];S.hit(S.hero,u,1e9,'direct');window.deadAt=S.clock.tick;});
 const d=await page.evaluate(async()=>{const seen=new Set();const t0=performance.now();while(performance.now()-t0<1600){await frames(1);for(const c of B.corpses)seen.add(c.frame+'@'+c.art.texture.key);}return {seen:[...seen],visual:B.visuals.has('red-hero'),exists:!!S.state.units['red-hero']};});
 check(!d.exists&&!d.visual&&d.seen.includes('11@soldier-hero')&&d.seen.includes('13@soldier-hero'),'the Lord falls: his body plays the death frames from the Hero sheet',d);
 // 45 s later (1350 ticks) he is back
 const r=await page.evaluate(async()=>{for(let i=0;i<1400;i++){S.advance(1000/30+.01);S.drainEvents();}await frames(12);const u=S.state.units['red-hero'];return {ticks:S.clock.tick-window.deadAt,exists:!!u&&u.hp>0,key:B.soldiers.get('red-hero')?.art.texture.key,frame:B.soldiers.get('red-hero')?.frame};});
 check(r.exists&&r.key==='soldier-hero','45 s later the Lord returns, drawn from the Hero sheet again',r);
 const m=await page.evaluate(async()=>{const ev={};const drain=S.drainEvents.bind(S);S.drainEvents=()=>{const e=drain();for(const x of e)if(x.type==='commander')ev[x.change]=(ev[x.change]||0)+1;return e;};
  while(S.clock.tick<7400){S.advance(1000/30+.01);S.drainEvents();S.hero.hp=S.hero.maxHp=1e8;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e9;}
  await frames(15);const u=S.state.units['red-marshal'],v=u&&B.visuals.get('red-marshal'),im=v?.list.find(c=>c.type==='Image');
  return {ev,exists:!!u,name:u&&B.unitVisual(u)?.name,key:B.soldiers.get('red-marshal')?.art.texture.key,h:im&&+(im.scaleY*215).toFixed(2),tick:S.clock.tick,hp:u?.hp,maxHp:u?.maxHp,windup:u?.windupTicks};});
 check(m.exists&&m.ev.warning>=1&&m.ev.released>=1&&m.key==='soldier-hero'&&m.name==='Iron Marshal'&&Math.abs(m.h-mine.marshal.h)<.2,'the Iron Marshal is warned of and released at 240 s, drawn from the Hero sheet at his larger size',m);
}
// 9. The other levels that field a Crimson Hero-class unit: loaded, drawn from the Hero sheet, no errors.
for(const level of [26,34,35,42,43,44,45]){
 const {page:p2,ctx}=await open(base,level);
 const r=await p2.evaluate(async()=>{await frames(20);const real=Object.values(S.state.units).filter(u=>u.archetype==='crimson-hero').map(u=>({id:u.id,key:B.soldiers.get(u.id)?.art.texture.key,name:B.unitVisual(u)?.name}));clearField();const p=spot()??{x:S.hero.x+150,y:S.hero.y};soldier('red-x','minion-red',p.x,p.y,{archetype:'crimson-hero',speed:0,damage:0});await frames(8);return {level:B.campaignLevel?.id,real,key:B.soldiers.get('red-x')?.art.texture.key,name:B.unitVisual(S.state.units['red-x'])?.name};});
 check(r.key==='soldier-hero'&&r.real.every(x=>x.key==='soldier-hero'),`level ${level} (${r.level}): a Crimson Hero-class unit draws from the Hero sheet${r.real.length?` (${r.real.map(x=>x.name).join(', ')} already in the match)`:''}`,r);
 await ctx.close();
}
check(errors.length===0,'no page errors',errors.slice(0,5));
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

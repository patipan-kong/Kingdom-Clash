// Borin (Azure Hero #11) sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs two dev servers:
//   SPRITE_URL=http://127.0.0.1:5431/ (this build)  REF_URL=http://127.0.0.1:5441/ (the baseline, 619ac48, where Borin is the painted still)
// Checks the sheet (14 frames; the other soldier sheets unchanged), Borin's drawn size, HP bar, name, target-pick area and tap box against the baseline, his stats, that Roland, Kael and the
// mercenary-less Allied Knight keep their stills, the walk (six frames, facing), the hammer smash (wind-up, drive, contact in order; every hit on the contact frame for the 6-tick windup), the flinch
// capped at one per 900 ms, the fallen body (frames, 1.3 s), pause, a tap selecting him, and the real Tavern flow (hire, death, revive) in C5M6, no page errors.
import {chromium} from '@playwright/test';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5441/';
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const errors=[];
async function open(url,level=46){
 const ctx=await browser.newContext({viewport:{width:960,height:540},hasTouch:true}),page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(`${level}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`${level}: ${m.text()}`);});
 await page.goto(`${url}?debug=1&level=${level}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:45000});
 await page.evaluate(async()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.H=window.kingdomGame.scene.getScene('HUD');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
  window.MERC=await import('/src/data/mercenaries.ts');
  window.log=[];const u=B.sys.sceneUpdate;B.sys.sceneUpdate=function(t,d){u.call(this,t,d);const s={};for(const [id,a] of B.soldiers||[])s[id]={f:a.frame,face:a.facing};log.push({tick:S.clock.tick,s,events:B.lastEvents??[]});B.lastEvents=[];if(log.length>4000)log.splice(0,1000);};
  const drain=S.drainEvents.bind(S);S.drainEvents=()=>{const e=drain();B.lastEvents=e.map(x=>({type:x.type,change:x.change,id:x.id,sourceId:x.sourceId,amount:x.amount}));return e;};
  window.clearField=()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.hero.hp=S.hero.maxHp=1e7;};
  window.spot=()=>{const st=S.state.structures,open=(x,y)=>{for(let d=-300;d<=300;d+=8)for(const e of [-60,0,60])if(S.geo.blocked(x+d,y+e,14,st))return false;return true;};for(let y=300;y<1000;y+=24)for(let x=500;x<1500;x+=24)if(open(x,y))return {x,y};};
  window.soldier=(id,kind,x,y,o={})=>{const u={...S.unit(id,kind,x,y,o.archetype,undefined,S.clock.tick),...o};delete u.archetype;if(o.archetype)u.archetype=o.archetype;S.state.units[id]=u;return u;};
  // An Allied Hero as the Tavern makes one (the mercenary's own stats and id), placed where asked.
  window.ally=(merc,x,y,o={})=>{const m=MERC.mercenary(merc),id=S.spawnAlly(x,y,{...(m?MERC.mercenaryStats(m):{}),...o});const u=S.state.units[id];if(m)u.ally.merc=m.id;return u;};
  window.tav=()=>Object.values(S.state.structures).find(b=>b.tavern);
  window.step=n=>{for(let i=0;i<n;i++){S.advance(1000/30+.01);B.syncUnits();for(const e of S.drainEvents()){B.observeTavern?.(e);B.observeSoldier?.(e);}}};
  window.kill=id=>{const t=tav()??{x:S.hero.x,y:S.hero.y};const foe={...S.unit('foe','minion-red',t.x+300,t.y+300,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e6,maxHp:1e6};S.state.units.foe=foe;S.hit(foe,S.state.units[id],1e6);delete S.state.units.foe;};});
 return {page,ctx};
}
const {page}=await open(base);
const mod=await page.evaluate(async()=>{const m=await import('/src/world/soldierSprite.ts'),c=await import('/src/data/combat.ts');return {SF:m.SF,M:m.SOLDIER_MOTION,R:m.BORIN_SHEET,knight:c.crimsonHero.stats};});
const {SF,R}=mod;
const statsOf=()=>{const u=ally('borin',700,700);const o={maxHp:u.maxHp,hp:u.hp,speed:u.speed,damage:u.damage,range:u.range,armor:u.armor,radius:u.radius,windupTicks:u.windupTicks,cooldownTicks:u.cooldownTicks};delete S.state.units[u.id];return o;};
// spot(): a cell with open ground; place the Guardian beside it so the allies are inside the Guardian's follow range.
const measure=async(pg)=>pg.evaluate(async()=>{clearField();const p=spot();S.hero.x=p.x-80;S.hero.y=p.y;
 const a=ally('borin',p.x,p.y,{speed:0,damage:0}),b=ally('roland',p.x+150,p.y,{speed:0,damage:0}),k=ally('kael',p.x+300,p.y,{speed:0,damage:0}),g=ally(undefined,p.x+450,p.y,{speed:0,damage:0}),s=soldier('red-s1','minion-blue',p.x,p.y+150,{speed:0,damage:0});await frames(12);
 const one=u=>{const id=u.id,v=B.visuals.get(id),hp=B.hpBars.get(id),r=B.pickBounds(id,v),im=v.list.find(c=>c.type==='Image'),lab=v.list.find(c=>c.type==='Text'&&/\S/.test(c.text));
  return {key:im.texture.key,h:+(im.texture.key==='soldier-borin'?im.scaleY*120:im.displayHeight).toFixed(2),w:+im.displayWidth.toFixed(2),bar:hp&&{x:hp.bar.x,y:hp.bar.y,w:hp.bar.width??hp.bar.displayWidth},pick:[r.x-v.x,r.y-v.y,r.width,r.height].map(n=>+n.toFixed(1)),name:B.unitVisual(S.state.units[id])?.name,label:lab?.text,depth:v.depth-v.y,ax:+im.x.toFixed(2),ay:+im.y.toFixed(2)};};
 const t=k=>B.textures.exists(k)?B.textures.get(k).frameTotal-1:0;
 return {borin:one(a),roland:one(b),kael:one(k),plain:one(g),soldier:one(s),sheets:{azure:t('soldier-azure'),crimson:t('soldier-crimson'),elite:t('soldier-elite'),hero:t('soldier-hero'),borin:t('soldier-borin'),roland:t('soldier-roland')}};});
const mine=await measure(page);
const {page:refPage}=await open(ref);
const theirs=await measure(refPage);
const refStats=await refPage.evaluate(`(${statsOf.toString()})()`),myStats=await page.evaluate(`(${statsOf.toString()})()`);
// 1. Sheet, drawn size, tap box.
{
 check(Object.values(mine.sheets).every(n=>n===14),'the Borin sheet holds 14 frames; the Azure, Crimson, Elite and Hero sheets still do',mine.sheets);
 check(mine.borin.key==='soldier-borin','Borin draws the Borin sheet',mine.borin.key);
 check(mine.roland.key==='soldier-roland'&&mine.kael.key==='hero-kael'&&mine.plain.key==='guardian'&&mine.soldier.key==='soldier-azure','Roland keeps his sheet; Kael and the mercenary-less Allied Knight keep their stills; an Azure soldier its own sheet',{roland:mine.roland.key,kael:mine.kael.key,plain:mine.plain.key,soldier:mine.soldier.key});
 check(Math.abs(mine.borin.h-65.1)<.2&&Math.abs(mine.borin.h-theirs.borin.h)<.2,'Borin is drawn at the baseline height, 65.1 px',{mine:mine.borin.h,theirs:theirs.borin.h});
 const hit=await page.evaluate(()=>{const id=Object.keys(S.state.units).find(i=>S.state.units[i].ally?.merc==='borin'),a=B.soldiers.get(id).art;return a.input?.hitArea&&[a.input.hitArea.x,a.input.hitArea.y,a.input.hitArea.width,a.input.hitArea.height];});
 check(JSON.stringify(hit)===JSON.stringify([R.hit.x,R.hit.y,R.hit.w,R.hit.h]),'fixed tap box: the idle body',hit);
}
// 2. Against the baseline: stats, HP bar, name and target-pick area, the feet where the still stood.
{
 check(JSON.stringify(refStats)===JSON.stringify(myStats)&&myStats.maxHp===1166&&myStats.damage===64&&myStats.windupTicks===6&&myStats.cooldownTicks===23&&myStats.speed===120,'Borin hit points, speed, damage, range, armor, radius and timing are exactly the baseline ones',myStats);
 check(JSON.stringify(mine.borin.bar)===JSON.stringify(theirs.borin.bar)&&mine.borin.name===theirs.borin.name&&mine.borin.label===theirs.borin.label&&mine.borin.depth===theirs.borin.depth,'the HP bar, name, label and depth are where the baseline put them',{mine:mine.borin.bar,theirs:theirs.borin.bar,name:mine.borin.name});
 const a=mine.borin.pick,b=theirs.borin.pick;
 check(Math.abs(a[0]-b[0])<=5&&Math.abs(a[1]-b[1])<=4&&Math.abs(a[2]-b[2])<=8&&Math.abs(a[3]-b[3])<=4,'target picking sees the same area as the old still',{mine:a,theirs:b});
 for(const k of ['kael','plain']){check(JSON.stringify(mine[k].bar)===JSON.stringify(theirs[k].bar)&&Math.abs(mine[k].h-theirs[k].h)<.05&&mine[k].key===theirs[k].key,`${k} is untouched: the same still at the same size`,{mine:mine[k].h,theirs:theirs[k].h});}
}
await refPage.context().close();
// 3. Walk and facing: six frames, a cycle per stride, mirrored toward the travel direction (the target masked).
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();S.hero.x=p.x;S.hero.y=p.y-100;const u=ally('borin',p.x,p.y,{speed:0,damage:0});const id=u.id;Object.defineProperty(u,'targetId',{configurable:true,get:()=>undefined,set:()=>{}});await frames(5);
  const go=async(dx,n)=>{const out=[];for(let i=0;i<n;i++){u.x+=dx;await frames(1);const s=B.soldiers.get(id);out.push({f:s.frame,sx:Math.sign(s.art.scaleX)});}await frames(12);return out;};
  const right=await go(3,80),left=await go(-3,80);return {right,left,idle:B.soldiers.get(id).frame,scale:B.soldiers.get(id).art.scaleY};});
 const wr=r.right.slice(6).map(x=>x.f);let changes=0;for(let i=1;i<wr.length;i++)if(wr[i]!==wr[i-1])changes++;
 const expected=R.stride/R.stride*0+222/R.stride*6;
 check(SF.walk.every(f=>wr.includes(f))&&wr.every(f=>SF.walk.includes(f)),'walking cycles all six walk frames',[...new Set(wr)]);
 check(Math.abs(changes-expected)<=2,`one cycle per ${R.stride} px (about ${expected.toFixed(1)} frame changes over 222 px)`,{changes});
 check(r.right.slice(6).every(x=>x.sx===-1)&&r.left.slice(10).every(x=>x.sx===1)&&r.idle===SF.idle,'authored facing left, mirrored when walking right, idle on stopping');
}
// 4. The slash against a Crimson dummy: wind-up, drive, contact in order; every hit on the contact frame.
{
 const r=await page.evaluate(async(SF)=>{clearField();const p=spot();S.hero.x=p.x-60;S.hero.y=p.y;S.encounter={...S.encounter,waves:[],continuous:false};
  const foe=soldier('red-t','minion-red',p.x+60,p.y,{speed:0,damage:0,hp:9e6,maxHp:9e6}),u=ally('borin',p.x,p.y,{hp:9e6,maxHp:9e6}),id=u.id;
  const start=log.length;await frames(420);const L=log.slice(start),hits=[],seqs=[];
  for(let i=1;i<L.length;i++)for(const e of L[i].events)if(e.type==='damage'&&e.sourceId===id){hits.push({f:L[i].s[id]?.f,before:L[i-1].s[id]?.f,amount:e.amount});const seq=[];for(let j=i;j>=Math.max(1,i-60);j--){const f=L[j].s[id]?.f;if(f!==undefined&&seq[0]!==f)seq.unshift(f);if(f===SF.idle)break;}seqs.push(seq);}
  return {hits,seqs,windup:u.windupTicks,hp:foe.hp};},SF);
 check(r.hits.length>=3&&r.hits.every(h=>h.f===SF.attack[2]),'every hit lands on the contact frame',r.hits.map(h=>h.f));
 check(r.hits.every(h=>h.before!==SF.attack[2]),'the update before each hit is not yet contact',r.hits.map(h=>h.before));
 const order=s=>{const q=s.filter(f=>SF.attack.includes(f));return q.every((f,i)=>i===0||f>q[i-1])&&q.at(-1)===SF.attack[2];};const full=r.seqs.filter(s=>s.filter(f=>SF.attack.includes(f)).join()===SF.attack.join()).length; // a render frame can miss the 100 ms wind-up on a loaded machine, so the sampled order must only never go backwards and most slashes show all three
 check(r.seqs.every(order)&&full>=Math.ceil(r.seqs.length*.6),'each smash plays wind-up, drive, contact in that order (sampled per render frame)',{full,of:r.seqs.length,sample:r.seqs.slice(0,3)});
 check(r.windup===6&&r.hits.every(h=>h.amount===r.hits[0].amount),'the 6-tick (200 ms) windup and the hit are the simulation\'s, not the picture\'s',{windup:r.windup,amount:r.hits[0]?.amount});
}
// 5. The flinch: at most one per 900 ms.
{
 const r=await page.evaluate(async(SF)=>{clearField();const p=spot();S.hero.x=p.x;S.hero.y=p.y-90;const u=ally('borin',p.x,p.y,{speed:0,hp:9e6,maxHp:9e6,damage:0}),foe=soldier('red-f','minion-red',p.x+400,p.y+400,{speed:0,damage:0,hp:9e6,maxHp:9e6});await frames(5);
  let n=0,prev=-1;const t0=performance.now();let i=0;while(performance.now()-t0<3600){if(i++%6===0)S.hit(foe,u,10,'physical');await frames(1);const f=B.soldiers.get(u.id).frame;if(f===SF.hurt&&prev!==SF.hurt)n++;prev=f;}
  await frames(20);return {n,back:B.soldiers.get(u.id).frame};},SF);
 check(r.n>=3&&r.n<=5,'hit every 100 ms for 3.6 s he flinches about once per 900 ms (3 to 5 times)',r.n);
 check(r.back===SF.idle,'the flinch ends in idle',r.back);
}
// 6. The fallen body: stagger, collapse, down from the Borin sheet at his size; gone within 1.5 s; the slot is dead.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();S.hero.x=p.x;S.hero.y=p.y-90;const u=ally('borin',p.x,p.y,{speed:0,damage:0}),id=u.id;await frames(5);const v=B.visuals.get(id),at={x:v.x+B.soldiers.get(id).art.x,y:v.y},scale=B.soldiers.get(id).art.scaleY;
  kill(id);const seen=[];const t0=performance.now();let pos;while(performance.now()-t0<1600){await frames(1);const c=B.corpses[0];if(c){seen.push({f:c.frame,a:+c.art.alpha.toFixed(2),key:c.art.texture.key,sc:c.art.scaleY});pos??={x:c.art.x,y:c.art.y};}}
  return {frames:[...new Set(seen.map(s=>s.f))],key:seen[0]?.key,sc:seen[0]?.sc,scale,last:seen.at(-1),pos,at,gone:B.corpses.length,visual:B.visuals.has(id)};});
 check(JSON.stringify(r.frames)===JSON.stringify(SF.death)&&r.key==='soldier-borin'&&Math.abs(r.sc-r.scale)<1e-6,'the body plays stagger, collapse, down from the Borin sheet at his size',{frames:r.frames,key:r.key});
 check(r.pos&&Math.abs(r.pos.x-r.at.x)<.5&&Math.abs(r.pos.y-r.at.y-4)<.5,'the body falls where he stood',{pos:r.pos,at:r.at});
 check(r.last.a<1&&r.gone===0&&!r.visual,'it fades and is gone within 1.5 s (the 1.3 s lifecycle); the live visual is removed at death',{last:r.last,gone:r.gone});
}
// 7. Pause freezes the walk frame.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot(),u=ally('borin',p.x,p.y,{speed:0,damage:0});S.hero.x=p.x;S.hero.y=p.y-90;for(let i=0;i<20;i++){u.x+=3;await frames(1);}H.setPause(true);await frames(3);const a=B.soldiers.get(u.id).frame;for(let i=0;i<20;i++)await frames(1);const b=B.soldiers.get(u.id).frame;H.setPause(false);await frames(5);return {a,b};});
 check(r.a===r.b,'pause freezes the frame',r);
}
// 8. A tap selects him, as the still did.
{
 const r=await page.evaluate(async()=>{clearField();const p=spot();S.hero.x=p.x;S.hero.y=p.y-90;const u=ally('borin',p.x,p.y,{speed:0,damage:0});await frames(5);let got;B.game.events.once('hero-select-unit',id=>{got=id;});B.soldiers.get(u.id).art.emit('pointerdown',{},0,0,{stopPropagation(){}});return {got,id:u.id};});
 check(r.got===r.id,'a tap on Borin selects him (hero-select-unit)',r);
}
// 9. The real Tavern flow in C5M6, in both builds: build, hire Borin, kill him, revive 30 s later. Same ticks as the baseline; drawn from the sheet in this build.
{
 const flow=()=>{clearField();S.encounter={...S.encounter,waves:[],continuous:false};S.economy.balances={gold:1e12,wood:1e12,iron:1e12};
  const imgKey=id=>B.visuals.get(id)?.list.find(o=>o.type==='Image'&&o.texture)?.texture.key;
  const h=S.hero;h.x=600;h.y=600;let best;for(let r=0;r<30;r++)for(let c=0;c<60;c++){if(S.placementReason('tavern',c,r))continue;const d=Math.hypot((c+.5)*48-h.x,(r+.5)*48-h.y);if(!best||d<best.d)best={c,r,d};}
  S.send({type:'place',requestId:'t1',kind:'tavern',col:best.c,row:best.r});step(1);for(let i=0;i<400;i++)step(1);
  const find=()=>Object.keys(S.state.units).find(i=>S.state.units[i].ally?.merc==='borin');
  S.send({type:'tavern',requestId:'h1',action:'hire',merc:'borin'});step(2);const id=find(),hired0={tick:S.clock.tick,x:S.state.units[id].x,y:S.state.units[id].y};
  return {id,hired0,imgKey:imgKey(id)};};
 const rest=async()=>{await frames(10);};
 const run=p=>p.evaluate(async(flowSrc)=>{B.scene.pause();const flow=eval(flowSrc),T0=S.clock.tick;const a=flow();a.hired0.tick-=T0;await frames(10);const id=a.id,keyHired=B.visuals.get(id)?.list.find(o=>o.type==='Image'&&o.texture)?.texture.key;
  kill(id);step(2);await frames(30);const dead={slot:S.state.tavern.slots[0].status,visual:B.visuals.has(id),exists:!!S.state.units[id]};
  S.send({type:'tavern',requestId:'r1',action:'revive',slot:0});const t0=S.clock.tick;let back;for(let i=0;i<1100;i++){step(1);back=Object.keys(S.state.units).find(i2=>S.state.units[i2].ally?.merc==='borin');if(back)break;}await frames(12);
  const u=back&&S.state.units[back];return {hired0:a.hired0,keyHired,dead,ticks:S.clock.tick-t0,back:{key:back&&B.visuals.get(back)?.list.find(o=>o.type==='Image'&&o.texture)?.texture.key,sheetFrame:back&&B.soldiers.get(back)?.frame,hp:u?.hp,maxHp:u?.maxHp,x:u&&+u.x.toFixed(1),y:u&&+u.y.toFixed(1)}};},flow.toString());
 const {page:rp}=await open(ref),{page:mp}=await open(base);const m=await run(mp),r0=await run(rp);await rp.context().close();await mp.context().close();
 check(m.keyHired==='soldier-borin'&&r0.keyHired==='hero-borin','hired from the Tavern he is drawn from the Borin sheet (the baseline: the still)',{mine:m.keyHired,ref:r0.keyHired});
 check(Math.abs(m.hired0.tick-r0.hired0.tick)<=1&&m.hired0.x===r0.hired0.x&&m.hired0.y===r0.hired0.y,'the hire tick (within the clock accumulator one tick) and the spawn cell match the baseline',{mine:m.hired0,ref:r0.hired0});
 check(m.dead.slot==='dead'&&!m.dead.visual&&!m.dead.exists&&JSON.stringify(m.dead)===JSON.stringify(r0.dead),'he falls: the slot is dead and the visual is gone, as in the baseline',m.dead);
 check(m.back.key==='soldier-borin'&&m.back.sheetFrame===SF.idle&&m.back.hp===m.back.maxHp&&Math.abs(m.ticks-r0.ticks)<=1&&m.back.x===r0.back.x&&m.back.y===r0.back.y,'revived at the same tick and cell as the baseline (the Tavern timing, '+m.ticks+' ticks) he returns drawn from the sheet at full health',{mine:m,ref:r0.back});
}
// 10. Levels with a Tavern: loaded, no errors.
for(const level of [41,42,43,44,45]){
 const {page:p2,ctx}=await open(base,level);
 const r=await p2.evaluate(async()=>{await frames(20);clearField();const p=spot()??{x:S.hero.x+150,y:S.hero.y};S.hero.x=p.x;S.hero.y=p.y-90;const u=ally('borin',p.x,p.y,{speed:0,damage:0});await frames(8);return {level:B.campaignLevel?.id,key:B.soldiers.get(u.id)?.art.texture.key,tavern:!!S.state.tavern};});
 check(r.key==='soldier-borin',`level ${level} (${r.level}): an Allied Borin draws from the sheet${r.tavern?' (Tavern level)':''}`,r);
 await ctx.close();
}
check(errors.length===0,'no page errors',errors.slice(0,5));
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

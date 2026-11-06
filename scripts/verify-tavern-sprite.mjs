// Tavern V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs this build's dev server and a reference build without the Tavern
// animation (the War Cart build, 4b54860): SPRITE_URL=http://127.0.0.1:5431/ REF_URL=http://127.0.0.1:5441/
// The Tavern is built through the real place command and the simulation is stepped one tick at a time in the game's own order (advance, sync, events).
// Checks the sheet, which entity uses it, the HP bar / label / tap box / pick bounds against the reference, construction (intact frame + the existing fade), the hire door
// (500 ms from the hire tick), the revive glow (900 ms from the returned tick, nothing at the revive start), that hire / revive / spawn / return ticks and cells are
// identical to the reference, damage states (and that they win over a cue), pause, destruction (3-step collapse, gone by 2 s), Hero persistence, a revive that waits for a
// rebuilt Tavern and resumes, the Barracks still using its own sheet, a smoke on C5M5 and C5M1, and no page errors. Writes review screenshots to TAVERN_SHOTS (optional).
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5441/',shots=process.env.TAVERN_SHOTS;
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const errors=[];
const open=async(url,level=46)=>{const page=await (await browser.newContext({viewport:{width:960,height:540}})).newPage();
 if(url===base){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
 await page.goto(`${url}?debug=1&level=${level}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:30000});
 await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
  S.hero.hp=S.hero.maxHp=1e7;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;S.encounter={...S.encounter,waves:[],continuous:false};B.game.events.on('inspect',e=>{B.inspected=e;});window.taps=0;B.game.events.on('tavern-open',()=>{window.taps++;});
  for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.economy.balances={gold:1e12,wood:1e12,iron:1e12};
  window.log=[];window.step=n=>{for(let i=0;i<n;i++){S.advance(1000/30+.01);B.syncUnits();for(const e of S.drainEvents()){if(e.type==='tavern'||e.type==='death')log.push({tick:S.clock.tick,ms:B.simMs(),...e});B.observeTavern?.(e);}}};
  window.tav=()=>Object.values(S.state.structures).find(b=>b.tavern);window.tid=()=>tav()?.id;
  window.fr=id=>B.taverns?.get(id)?.art.frame.name;window.key=id=>(B.taverns?.get(id)?.art??B.visuals.get(id)?.list.find(o=>o.type==='Image'&&o.texture&&o.texture.key!=='__DEFAULT'))?.texture.key;
  window.build=rid=>{const h=S.hero;let best;for(let r=0;r<30;r++)for(let c=0;c<60;c++){if(S.placementReason('tavern',c,r))continue;const d=Math.hypot((c+.5)*48-h.x,(r+.5)*48-h.y);if(!best||d<best.d)best={c,r,d};}
   S.send({type:'place',requestId:rid,kind:'tavern',col:best.c,row:best.r});step(1);return `built-${rid}`;};
  window.box=id=>{const v=B.visuals.get(id),b=B.pickBounds(id,v),bar=B.hpBars.get(id).bar,label=v.list.find(o=>o.type==='Text'&&/TAVERN/.test(o.text)),art=v.list.find(o=>o.type==='Image');
   return {bounds:[b.x-v.x,b.y-v.y,b.width,b.height].map(n=>+n.toFixed(2)),bar:[bar.x,bar.y,bar.width].map(n=>+n.toFixed(2)),label:label?.text,labelAt:label&&[label.x,label.y],art:[art.x,art.y,+art.displayWidth.toFixed(2),+art.displayHeight.toFixed(2)],tap:art.input&&[art.input.hitArea.x*art.scaleX,art.input.hitArea.y*art.scaleY,+(art.input.hitArea.width*art.scaleX).toFixed(2),+(art.input.hitArea.height*art.scaleY).toFixed(2)].map(n=>+(+n).toFixed(1)),depth:v.depth-v.y};};
  window.heroUnits=()=>Object.values(S.state.units).filter(u=>u.ally).map(u=>({id:u.id,x:+u.x.toFixed(1),y:+u.y.toFixed(1),hp:u.hp}));
  window.kill=id=>{const t=tav()??{x:S.hero.x,y:S.hero.y};const foe={...S.unit('foe','minion-red',t.x+300,t.y+300,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e6,maxHp:1e6};S.state.units.foe=foe;S.hit(foe,S.state.units[id],1e6);delete S.state.units.foe;};
  B.scene.pause();});
 return page;};
const page=await open(base),refPage=await open(ref);
const M=await page.evaluate(async()=>{const m=await import('/src/world/tavernSprite.ts');return {TV:m.TV,M:m.TAVERN_MOTION,S:m.TAVERN_SHEET};});
const snap=async(p,name)=>{if(!shots)return;await p.evaluate(()=>frames(3));writeFileSync(`${shots}/${name}.png`,await p.screenshot());};
const camera=(p,id,dy=-60,z=1.6)=>p.evaluate(([id,dy,z])=>{const c=B.cameras.main;c.stopFollow();c.setZoom(z);const v=B.visuals.get(id);c.centerOn(v.x,v.y+dy);},[id,dy,z]);
const TICK=1000/30;
// the sheet
const sheet=await page.evaluate(({k})=>{const t=B.textures.get(k),n=t.getFrameNames().filter(x=>x!=='__BASE');return {n:n.length,src:n.map(x=>[t.get(x).realWidth,t.get(x).realHeight]).every(([w,h])=>w===288&&h===278),still:B.textures.exists('tavern')};},{k:M.S.key});
check(sheet.n===8&&sheet.src&&sheet.still,'the sheet has 8 frames, each with the 288 x 278 cell; the still stays loaded for the placement preview',sheet);
// build the Tavern through the real command in both builds
const ids=[];for(const p of [page,refPage])ids.push(await p.evaluate(()=>build('t1')));
const id=ids[0];
const built=await page.evaluate(id=>({t:S.state.structures[id],k:key(id),f:fr(id),mapped:B.taverns.has(id)}),id);
check(built.t?.tavern&&built.k==='tavern-sheet'&&built.mapped,'the Tavern is drawn from the animated sheet',[built.k,built.mapped]);
check((await refPage.evaluate(id=>key(id),id))==='tavern','the reference build draws the still');
// construction: intact frame, the existing fade
const con=await page.evaluate(()=>{const out=[];for(let i=0;i<7;i++){step(20);const s=S.state.structures['built-t1'],v=B.visuals.get('built-t1');out.push({done:S.clock.tick>=s.completeTick,frame:fr('built-t1'),alpha:+v.alpha.toFixed(3),progress:+s.progress.toFixed(3)});}return out;});
check(con.filter(r=>!r.done).length>=2&&con.filter(r=>!r.done).every(r=>r.frame==='0'&&Math.abs(r.alpha-r.progress)<.02),'while built: the intact frame, alpha follows the build progress (the existing fade)',con.filter(r=>!r.done).slice(0,3));
await refPage.evaluate(()=>step(200));await page.evaluate(()=>step(60));
check(await page.evaluate(()=>S.state.structures['built-t1'].progress>=1&&fr('built-t1')==='0'),'finished: the intact frame');
// HP bar, label, tap box, pick bounds: identical to the reference
const boxes=await Promise.all([page.evaluate(id=>box(id),id),refPage.evaluate(id=>box(id),id)]);
const near=(a,b)=>Array.isArray(a)?a.length===b.length&&a.every((x,i)=>near(x,b[i])):typeof a==='number'?Math.abs(a-b)<=.15:a===b; // the cell is 278 px tall (the still 371 x .75 = 278.25): the displayed width differs by 0.08 px
check(Object.keys(boxes[0]).every(k=>near(boxes[0][k],boxes[1][k])),'HP bar, label, art size, tap rectangle (displayed), pick bounds and depth match the reference build (within 0.15 px)',{mine:boxes[0],ref:boxes[1]});
check(boxes[0].label==='TAVERN'&&JSON.stringify(boxes[0].bar)===JSON.stringify(boxes[1].bar)&&JSON.stringify(boxes[0].labelAt)===JSON.stringify(boxes[1].labelAt),'label TAVERN and the HP bar are exactly the reference one',boxes[0]);
const tap=async(p,id)=>{await p.evaluate(()=>{B.scene.resume();});const n=await p.evaluate(id=>{const v=B.visuals.get(id),art=v.list.find(o=>o.type==='Image');window.taps=0;art.emit('pointerdown',{},0,0,{stopPropagation(){}});return window.taps;},id);await p.evaluate(()=>{B.scene.pause();S.clock.timeScale=1;S.clock.paused=false;});return n;}; // the tap path leaves the clock slowed or paused (the existing panel behaviour): the harness steps at full speed
check(await tap(page,id)===1&&await tap(refPage,id)===1,'a tap on the Tavern opens its panel (tavern-open), as before');
// hire: the door from the hire tick for 500 ms; the hero spawns on the same tick, in the same cell, as in the reference
const hireRun=p=>p.evaluate(()=>{log.length=0;S.send({type:'tavern',requestId:'h1',action:'hire',merc:'roland'});const ser=[];for(let i=0;i<40;i++){step(1);ser.push({tick:S.clock.tick,ms:B.simMs(),f:fr('built-t1')??null});}return {ser,log:[...log],heroes:heroUnits()};});
const mh=await hireRun(page),rh=await hireRun(refPage);
const hev=mh.log.find(e=>e.type==='tavern'&&e.action==='hire'),rhev=rh.log.find(e=>e.type==='tavern'&&e.action==='hire');
check(hev&&rhev&&hev.tick===rhev.tick&&JSON.stringify(mh.heroes)===JSON.stringify(rh.heroes)&&mh.heroes.length===1,'hire: the hero appears on the same tick and in the same cell as in the reference build',{mine:mh.heroes,ref:rh.heroes,tick:[hev?.tick,rhev?.tick]});
const doorBad=mh.ser.filter(r=>r.f!==(r.tick>=hev.tick&&r.ms-hev.ms<M.M.hireMs?'1':'0'));
check(doorBad.length===0&&mh.ser.filter(r=>r.f==='1').length===15,'hire: the door frame shows from the hire tick for exactly 500 ms (15 ticks), then intact',{open:mh.ser.filter(r=>r.f==='1').length,bad:doorBad.slice(0,3)});
await camera(page,id);await page.evaluate(()=>{step(0);});
// re-open the door for a screenshot, then the revive: kill the hero, revive it, nothing at the revive start, the glow on returned
await page.evaluate(()=>step(30));
const hero=(await page.evaluate(()=>heroUnits()))[0];
const rev=p=>p.evaluate(hid=>{log.length=0;kill(hid);step(2);S.send({type:'tavern',requestId:'r1',action:'revive',slot:0});const ser=[];let start=null;for(let i=0;i<960;i++){step(1);if(start===null&&log.some(e=>e.action==='revive'))start=S.clock.tick;ser.push({tick:S.clock.tick,ms:B.simMs(),f:fr('built-t1')??null});}return {ser,log:[...log],heroes:heroUnits(),start};},hero.id);
const mr=await rev(page),rr=await rev(refPage);
const rv=mr.log.find(e=>e.action==='revive'),ret=mr.log.find(e=>e.action==='returned'),rret=rr.log.find(e=>e.action==='returned'),fell=mr.log.find(e=>e.action==='fallen');
const rrv=rr.log.find(e=>e.action==='revive'),rfell=rr.log.find(e=>e.action==='fallen');
check(fell&&rv&&ret&&rret&&ret.tick-rv.tick===rret.tick-rrv.tick&&rv.tick-fell.tick===rrv.tick-rfell.tick&&ret.tick-rv.tick===900,'revive: fallen, revive and returned events at the same relative ticks as the reference build (returned exactly 900 ticks after the revive)',{fell:fell?.tick,revive:rv?.tick,returned:ret?.tick,ref:[rfell?.tick,rrv?.tick,rret?.tick]});
check(JSON.stringify(mr.heroes)===JSON.stringify(rr.heroes)&&mr.heroes.length===1,'the returned hero stands in the same cell as in the reference build',{mine:mr.heroes,ref:rr.heroes});
const before=mr.ser.filter(r=>r.tick<ret.tick),after=mr.ser.filter(r=>r.tick>=ret.tick);
check(before.every(r=>r.f==='0'||(r.tick-rv.tick<0)),'revive: the Tavern shows nothing while the 30 s revive runs, including its start',[...new Set(before.map(r=>r.f))]);
const glowBad=after.filter(r=>r.f!==(r.ms-ret.ms<M.M.reviveMs?'2':'0'));
check(glowBad.length===0&&after.filter(r=>r.f==='2').length===27,'revive: the bell and glow show from the returned tick for exactly 900 ms (27 ticks), then intact',{glow:after.filter(r=>r.f==='2').length,bad:glowBad.slice(0,3)});
check(!mr.ser.some(r=>r.f==='1')&&!mh.ser.some(r=>r.f==='2'),'the two cues never mix: hire shows only the door, revive only the glow');
await page.evaluate(()=>{step(40);});
// damage states and that they win over a cue; pause holds the cue
const dmg=await page.evaluate(()=>{const s=S.state.structures['built-t1'],o=[],at=h=>{s.hp=s.maxHp*h;step(1);o.push([h,fr('built-t1')]);};
 at(1);at(.67);at(.65);at(.34);at(.32);at(.05);
 s.hp=s.maxHp*.5;B.observeTavern({type:'tavern',action:'hire',slot:0,merc:'roland',requestId:'x'});o.push(['door while damaged',fr('built-t1')]);B.observeTavern({type:'tavern',action:'returned',slot:0,merc:'roland'});o.push(['glow while damaged',fr('built-t1')]);
 s.hp=s.maxHp;step(1);o.push(['restored, glow still within 900 ms',fr('built-t1')]);step(28);o.push(['after 900 ms',fr('built-t1')]);return {o};});
const D=Object.fromEntries(dmg.o.map(([k,v])=>[String(k),v]));
check(D['1']==='0'&&D['0.67']==='0'&&D['0.65']==='3'&&D['0.34']==='3'&&D['0.32']==='4'&&D['0.05']==='4','damaged below 66%, badly damaged below 33%, intact above',dmg.o.slice(0,6));
check(D['door while damaged']==='3'&&D['glow while damaged']==='3','a damage state wins over the hire door and the revive glow',[D['door while damaged'],D['glow while damaged']]);
check(D['restored, glow still within 900 ms']==='2'&&D['after 900 ms']==='0','restored: the later cue (the glow) shows within its 900 ms, then intact',[D['restored, glow still within 900 ms'],D['after 900 ms']]);
const pz=await page.evaluate(async()=>{B.observeTavern({type:'tavern',action:'hire',slot:0,merc:'roland',requestId:'y'});const f0=fr('built-t1');B.scene.resume();B.scene.pause();await new Promise(r=>setTimeout(r,900));return [f0,fr('built-t1')];});
check(pz[0]==='1'&&pz[1]==='1','paused: the open door holds (the cue runs on simulation time)',pz);
// screenshots of the states (review)
if(shots){await camera(page,id,-50,2.2);for(const [name,f] of [['intact',null],['hire','hire'],['revive','returned'],['damaged',.5],['badly-damaged',.2]]){await page.evaluate(([f])=>{const s=S.state.structures['built-t1'];s.hp=s.maxHp;step(40);if(f==='hire')B.observeTavern({type:'tavern',action:'hire',slot:0,merc:'roland',requestId:'z'});else if(f==='returned')B.observeTavern({type:'tavern',action:'returned',slot:0,merc:'roland'});else if(typeof f==='number'){s.hp=s.maxHp*f;step(1);}},[f]);await snap(page,`tavern-${name}`);}await page.evaluate(()=>{S.state.structures['built-t1'].hp=S.state.structures['built-t1'].maxHp;step(40);});}
// destruction while a revive is running: Hero persistence, collapse, revive waits, rebuild, resume
const pre=await page.evaluate(()=>{const hs=heroUnits();return {hs,slot:JSON.stringify(S.state.tavern.slots)};});
const col=await page.evaluate(()=>{const hid=heroUnits()[0].id;log.length=0;kill(hid);step(2);S.send({type:'tavern',requestId:'r2',action:'revive',slot:0});step(5);const rem0=S.state.tavern.slots[0].remaining;
 const t=S.state.structures['built-t1'],t0=B.simMs();const foe={...S.unit('foe','minion-red',t.x+200,t.y+60,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e6,maxHp:1e6};S.state.units.foe=foe;S.hit(foe,t,1e6);const o=[];let guard=0;
 while(guard++<120){step(1);const tt=B.simMs()-t0,c=B.collapses.filter(x=>x.pose);o.push({t:Math.round(tt),n:c.length,frame:c[0]?.art.frame.name,alpha:c[0]?+c[0].art.alpha.toFixed(2):null,live:B.taverns.has('built-t1'),vis:B.visuals.has('built-t1')});if(tt>2200)break;}
 delete S.state.units.foe;return {o,rem0,gone:!S.state.structures['built-t1'],death:log.some(e=>e.type==='death'&&e.id==='built-t1')};});
const at=ms=>col.o.find(r=>r.t>=ms);
check(col.gone&&col.death&&!col.o[0].live,'destroyed: the Tavern is removed from the simulation and the live sprite map',[col.gone,col.o[0]]);
check(col.o[0].n===1&&col.o[0].frame==='5'&&at(200).frame==='6'&&at(420).frame==='7','collapse in three steps: roof buckles (5), walls fall (6), rubble (7)',[col.o[0],at(200),at(420)]);
check(at(1300).alpha===1&&at(1700).alpha<1&&col.o.find(r=>r.t>=2000&&r.n===0)!==undefined&&col.o.filter(r=>r.t<2000).every(r=>r.n===1),'the rubble holds, fades from 1.4 s, and is cleaned up by 2 s',[at(1300),at(1700),col.o.find(r=>r.n===0&&r.t>1500)]);
await camera(page,'blue-base',-20,.6);
const wait=await page.evaluate(()=>{const a=S.state.tavern.slots[0].remaining;step(60);const b=S.state.tavern.slots[0].remaining;return {a,b,status:S.state.tavern.slots[0].status,heroes:heroUnits()};});
check(wait.a===wait.b&&wait.status==='reviving','no Tavern standing: the revive in progress waits (no countdown), the slot is kept',wait);
const other=await page.evaluate(()=>{S.send({type:'tavern',requestId:'h9',action:'hire',merc:'borin'});step(2);return {slots:S.state.tavern.slots.map(s=>s.status),rej:log.filter(e=>e.type==='rejected'||e.action==='rejected').map(e=>e.reason)};});
await page.evaluate(()=>{log.length=0;});
const rebuilt=await page.evaluate(()=>{const id=build('t2');step(200);const t=S.state.structures[id];const o={id,progress:t?.progress,frame:fr(id),key:key(id),mapped:B.taverns.has(id),rem:S.state.tavern.slots[0].remaining};return o;});
check(rebuilt.progress>=1&&rebuilt.key==='tavern-sheet'&&rebuilt.mapped&&rebuilt.frame==='0','a new Tavern can be built on the ruin and is drawn from the sheet',rebuilt);
const resume=await page.evaluate(()=>{const id=Object.values(S.state.structures).find(b=>b.tavern)?.id,a=S.state.tavern.slots[0].remaining;step(30);const b=S.state.tavern.slots[0].remaining;const ser=[];let ret=null;for(let i=0;i<920&&ret===null;i++){step(1);ser.push(fr(id));if(S.state.tavern.slots[0].status==='alive')ret=S.clock.tick;}const f=fr(id);return {a,b,returned:ret,heroes:heroUnits(),slot:S.state.tavern.slots[0].status,frameAtReturn:f};});
check(resume.b<resume.a&&resume.returned!==null&&resume.slot==='alive'&&resume.heroes.length>=1,'with the new Tavern standing the revive resumes and the Hero returns',resume);
check(resume.frameAtReturn==='2','the new Tavern shows the revive glow when the Hero returns',resume.frameAtReturn);
await camera(page,await page.evaluate(()=>tid()),-60);await snap(page,'tavern-rebuilt');
// Hero persistence: a living Hero stays alive, in its slot, when the Tavern falls
const pers=await page.evaluate(()=>{const id=tid(),t=S.state.structures[id],before=heroUnits().map(h=>h.id);const foe={...S.unit('foe2','minion-red',t.x+200,t.y+60,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e6,maxHp:1e6};S.state.units.foe2=foe;S.hit(foe,t,1e6);delete S.state.units.foe2;step(90);return {before,after:heroUnits().map(h=>h.id),slot:S.state.tavern.slots[0].status,gone:!S.state.structures[id]};});
check(pers.gone&&pers.before.length===1&&JSON.stringify(pers.before)===JSON.stringify(pers.after)&&pers.slot==='alive','Hero persistence: the living Hero is untouched and keeps its slot when the Tavern is destroyed',pers);
// the Barracks keeps its own sheet; the Tavern does not use it
const bar=await page.evaluate(()=>{const p=S.azurePads[0];S.send({type:'place',requestId:'bb',kind:'barracks',col:p.col,row:p.row});step(1);const id='built-bb',key0=B.barracks.get(id)?.art.texture.key;return {key:key0,tavernMapped:B.taverns.has(id)};});
check(bar.key==='barracks-sheet'&&!bar.tavernMapped,'the Azure Barracks still uses the Barracks sheet, not the Tavern sheet',bar);
check(errors.length===0,'no page errors (C5M6)',errors.slice(0,3));
// smoke: another Tavern mission and the Tavern on C5M5 and C5M1 (same code path)
for(const lv of [45,41]){const q=await open(base,lv);const r=await q.evaluate(()=>{const id=build('s1');step(200);return {k:key(id),f:fr(id),name:B.visuals.get(id).list.find(o=>o.type==='Text'&&/TAVERN/.test(o.text))?.text,ok:!!S.placementReason};});check(r.k==='tavern-sheet'&&r.f==='0'&&r.name==='TAVERN',`C5M${lv-40} smoke: the Tavern builds and draws from the sheet`,r);await q.close();}
check(errors.length===0,'no page errors (smoke)',errors.slice(0,3));
console.log(failed?`FAILED ${failed}`:'ALL PASS');await browser.close();process.exit(failed?1:0);

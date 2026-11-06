// War Cart V1.0 sprite animation in the browser: Chapter 5 Mission 6 (?debug=1&level=46, the cart is a locked wreck from tick 0 until the South Outpost is Azure), the
// Chapter 4 Mission 4 cart (level 34, a Crimson cart that spawns, fights, dies and leaves a wreck), and a smoke test in Chapter 5 Mission 5 (level 45). Needs this build's dev
// server and a reference build without the cart animation (the Ballista commit): SPRITE_URL=http://127.0.0.1:5431/ REF_URL=http://127.0.0.1:5441/
// The simulation is stepped one tick at a time in the game's own order (advance, sync, events). Checks the sheets, the wreck and its repair states, the locked wreck, the HP bar /
// label / tap box against the reference, rolling (distance driven, stops when the cart stops, the Guardian-distance stop), facing, the attack (windup, contact on the hit tick,
// recover; hit ticks and gate hp identical to the reference), destruction (Crimson: body, then wreck; Azure: no wreck), pause, restart, the Ballista unchanged and no page errors.
// Writes review screenshots to WARCART_SHOTS (optional).
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5441/',shots=process.env.WARCART_SHOTS;
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const errors=[];
const open=async(url,level=46)=>{const page=await (await browser.newContext({viewport:{width:960,height:540}})).newPage();
 if(url===base){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
 await page.goto(`${url}?debug=1&level=${level}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:30000});
 await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
  S.hero.hp=S.hero.maxHp=1e7;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;S.encounter={...S.encounter,waves:[],continuous:false};
  S.economy.balances={gold:1e12,wood:1e12,iron:1e12};window.rec=null;window.hits=[];window.sites=[];
  window.step=n=>{for(let i=0;i<n;i++){S.advance(1000/30+.01);B.syncUnits();for(const e of S.drainEvents()){if(e.type==='attack'&&(e.id==='blue-c-1'||e.id==='red-cart'))hits.push({kind:'attack',tick:S.clock.tick,id:e.id,target:e.targetId});if(e.type==='site')sites.push({tick:S.clock.tick,ms:B.simMs(),change:e.change,id:e.id});B.observeSoldier?.(e);}
   if(rec){const a=B.soldiers?.get(rec.id),u=S.state.units[rec.id],g=S.state.structures[rec.gate]??S.state.bases[rec.gate];rec.out.push({tick:S.clock.tick,ms:B.simMs(),frame:a?.art.frame.name,sx:a?+a.art.scaleX.toFixed(3):undefined,x:u&&+u.x.toFixed(2),y:u&&+u.y.toFixed(2),gate:g&&+g.hp.toFixed(1),n:B.corpses?.filter(c=>c.cart).length});}}};
  window.cartFrame=id=>B.soldiers?.get(id)?.art.frame.name;
  window.box=id=>{const v=B.visuals.get(id),b=B.pickBounds(id,v),bar=B.hpBars.get(id).bar,label=v.list.find(o=>o.type==='Text'&&/WAR CART/.test(o.text)),art=v.list.find(o=>o.type==='Image'),hit=art.input?.hitArea;
   return {bounds:[b.x-v.x,b.y-v.y,b.width,b.height].map(n=>+n.toFixed(1)),bar:[bar.x,bar.y,bar.width].map(n=>+n.toFixed(2)),label:label?.text,labelAt:label&&[label.x,label.y],depth:+(v.depth-v.y).toFixed(2),hitW:+((hit&&hit.width>0&&B.soldiers?.get(id)?.cart?hit.width*art.scaleY:art.displayWidth).toFixed(1)),hitH:+((hit&&hit.height>0&&B.soldiers?.get(id)?.cart?hit.height*art.scaleY:art.displayHeight).toFixed(1)),key:art.texture.key,displayH:+art.displayHeight.toFixed(1)};};
  B.scene.pause();});
 return page;};
const clean=p=>p.evaluate(()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];});
const snap=async(p,name)=>{if(!shots)return;await p.evaluate(()=>{B.followHero?.();return frames(4);});writeFileSync(`${shots}/${name}.png`,await p.screenshot());};
const page=await open(base),refPage=await open(ref);
const M=await page.evaluate(async()=>{const m=await import('/src/world/warCartSprite.ts');return {CF:m.CF,M:m.WARCART_MOTION,S:m.WARCART_SHEET};});
// the sheets
const sheets=await page.evaluate(({c,a})=>{const f=k=>{const t=B.textures.get(k),n=t.getFrameNames().filter(x=>x!=='__BASE');return {n:n.length,cell:n.map(x=>[t.get(x).realWidth,t.get(x).realHeight]).every(([w,h])=>w===296&&h===173)};};return {crimson:f(c),azure:f(a)};},{c:M.S.crimson,a:M.S.azure});
check(sheets.crimson.n===12&&sheets.azure.n===10&&sheets.crimson.cell&&sheets.azure.cell,'the Crimson sheet has 12 frames and the Azure sheet the 10 it needs, each in one 296 x 173 cell',sheets);
// ---- Chapter 5 Mission 6: the wreck from tick 0, locked
await clean(page);await clean(refPage);
const wreck=await page.evaluate(()=>{const w=S.state.cartWreck,a=B.cartWreckArt;step(2);return {w:!!w,locked:S.cartLocked,art:!!a?.scene,frame:B.cartWreckArt?.frame.name,key:B.cartWreckArt?.texture.key,alpha:B.cartWreckArt?.alpha,at:B.cartWreckArt&&[+B.cartWreckArt.x.toFixed(1),+B.cartWreckArt.y.toFixed(1)],site:w&&[S.state.cartWreck.x,S.state.cartWreck.y],h:+(B.cartWreckArt?.displayHeight??0).toFixed(1)};});
const refWreck=await refPage.evaluate(()=>({w:!!S.state.cartWreck,locked:S.cartLocked,art:!!B.cartWreckArt}));
check(wreck.w&&wreck.locked&&wreck.art&&wreck.frame==='10'&&wreck.key===M.S.crimson&&wreck.alpha===1&&refWreck.w&&refWreck.locked&&!refWreck.art,'Chapter 5 Mission 6: the cart is a locked wreck from tick 0 and the wreck picture (frame 10) shows on its site at full alpha; the reference has only the ring',{wreck,refWreck});
const lockedTry=await page.evaluate(()=>{S.hero.x=S.state.cartWreck.x;S.hero.y=S.state.cartWreck.y;step(60);return {repair:!!S.state.cartWreck?.repair,frame:B.cartWreckArt?.frame.name,locked:S.cartLocked};});
check(!lockedTry.repair&&lockedTry.frame==='10'&&lockedTry.locked,'standing in the ring with the money does not repair a locked wreck, and the picture stays the wreck',lockedTry);
await snap(page,'wreck');
// repair once the South Outpost is Azure
const rep=await page.evaluate(()=>{const i=S.camps.findIndex(c=>c.id==='south');S.postStates[i].owner='azure';step(2);const out={started:!!S.state.cartWreck?.repair,frames:[]};for(let k=0;k<4;k++){step(30);out.frames.push(B.cartWreckArt?.frame.name);}return out;});
check(rep.started&&rep.frames.every(f=>f==='11'),'repairing: the wreck picture switches to the repairing frame (11) for the whole repair',rep);
await snap(page,'repairing');
const done=await page.evaluate(()=>{step(60);const c=S.state.units['blue-c-1'],e=B.soldiers.get('blue-c-1');return {cart:!!c,wreckGone:!S.state.cartWreck&&!B.cartWreckArt,entry:!!e?.cart,key:e?.art.texture.key,frame:e?.art.frame.name,sites:sites.map(s=>s.change)};});
check(done.cart&&done.wreckGone&&done.entry&&done.key===M.S.azure&&['0','1','2','3','4'].includes(done.frame)&&done.sites.includes('repaired'),'repaired: the wreck picture is gone and one Azure cart stands in the Azure sheet',done);
await snap(page,'azure-idle');
// the same repair in the reference
await refPage.evaluate(()=>{S.hero.x=S.state.cartWreck.x;S.hero.y=S.state.cartWreck.y;const i=S.camps.findIndex(c=>c.id==='south');S.postStates[i].owner='azure';step(200);});
// HP bar, label, depth, tap box and pick area: identical to the reference
const boxes=await Promise.all([page.evaluate(()=>box('blue-c-1')),refPage.evaluate(()=>box('blue-c-1'))]);
check(JSON.stringify(boxes[0].bar)===JSON.stringify(boxes[1].bar)&&boxes[0].label==='WAR CART'&&boxes[0].label===boxes[1].label&&JSON.stringify(boxes[0].labelAt)===JSON.stringify(boxes[1].labelAt)&&boxes[0].depth===boxes[1].depth,'HP bar, label and depth are identical to the reference',[boxes[0].bar,boxes[1].bar,boxes[0].label,boxes[0].labelAt,boxes[0].depth,boxes[1].depth]);
check(Math.abs(boxes[0].hitW-boxes[1].hitW)<=.6&&Math.abs(boxes[0].hitH-boxes[1].hitH)<=.6&&boxes[1].hitW>90,'the tap box is the old picture rectangle (about 100.8 x 100.8 px)',[boxes[0].hitW,boxes[0].hitH,boxes[1].hitW,boxes[1].hitH]);
check(boxes[1].key==='azure-ballista'&&boxes[0].key===M.S.azure,'the reference drew the Ballista canvas; this build draws the Azure cart sheet',[boxes[1].key,boxes[0].key]);
// rolling: the Guardian far away, the cart stays and is idle; near, it rolls toward the gate with the wheel frames driven by the distance, and stops idle
const rollFn=()=>{const c=S.state.units['blue-c-1'],g=S.state.structures['red-fortress-gate'];S.hero.x=c.x+900;S.hero.y=c.y;const far0={x:c.x,y:c.y};step(40);const far={moved:Math.hypot(c.x-far0.x,c.y-far0.y),frame:cartFrame('blue-c-1')};
 S.hero.x=c.x+60;S.hero.y=c.y;rec={id:'blue-c-1',gate:'red-fortress-gate',out:[]};step(75);const near=rec.out.slice();rec=null;
 S.hero.x=c.x+900;step(8);const stopMoved=Math.hypot(c.x-near.at(-1).x,c.y-near.at(-1).y);step(5);const stopped={frame:cartFrame('blue-c-1'),sx:B.soldiers.get('blue-c-1')?.art.scaleX};
 return {far,near,stopped,stopMoved,gate:[g.x,g.y],cart:[c.x,c.y]};};
const roll=await page.evaluate(rollFn);await refPage.evaluate(rollFn); // the same walk in the reference, so the two carts have the same history
const rolling=roll.near.filter(r=>['1','2','3','4'].includes(r.frame));
const dist=roll.near.map((r,i,a)=>i?Math.hypot(r.x-a[i-1].x,r.y-a[i-1].y):0);
check(roll.far.moved<1e-6&&roll.far.frame==='0','the Guardian beyond 300 px: the cart does not move and shows idle',roll.far);
check(rolling.length>=roll.near.length*.8&&new Set(rolling.map(r=>r.frame)).size===4&&dist.reduce((a,b)=>a+b,0)>20,'with the Guardian near: it moves and shows the four wheel frames, driven by its travel',{ticks:roll.near.length,rolling:rolling.length,travelled:+dist.reduce((a,b)=>a+b,0).toFixed(1),frames:[...new Set(roll.near.map(r=>r.frame))]});
// the frame is a function of the distance rolled: one wheel cycle per stride
check(roll.stopped.frame==='0'&&roll.stopMoved<3,'it stops when the cart stops: idle within about 90 ms of the last step',{stopped:roll.stopped,stopMoved:+roll.stopMoved.toFixed(2)});
check(roll.near.every(r=>r.sx!==undefined)&&roll.near.map(r=>Math.sign(r.sx)).every((s,i,a)=>s===a[0]),'facing holds steady while it rolls the same way (no flicker)',roll.near.slice(0,3));
await snap(page,'rolling');
// attack: next to the gate on its left and on its right; windup, contact on the hit tick, recover; hits identical to the reference
const sideRight=1,sideLeft=-1;
const att=[];for(const side of [sideRight,sideLeft]){const mine=await page.evaluate(({side})=>{const c=S.state.units['blue-c-1'],g=S.state.structures['red-fortress-gate'];S.hero.x=g.x+side*300;S.hero.y=g.y;c.x=g.x+side*((g.radius??24)+38);c.y=g.y;c.strike=undefined;c.readyTick=S.clock.tick;const t0=S.clock.tick;rec={id:'blue-c-1',gate:'red-fortress-gate',out:[]};hits.length=0;step(150);const out=rec.out;rec=null;return {out,t0,hits:hits.slice()};},{side});
 const rf=await refPage.evaluate(({side})=>{const c=S.state.units['blue-c-1'],g=S.state.structures['red-fortress-gate'];S.hero.x=g.x+side*300;S.hero.y=g.y;c.x=g.x+side*((g.radius??24)+38);c.y=g.y;c.strike=undefined;c.readyTick=S.clock.tick;const t0=S.clock.tick;rec={id:'blue-c-1',gate:'red-fortress-gate',out:[]};hits.length=0;step(150);const out=rec.out;rec=null;return {out,t0,hits:hits.slice()};},{side});att.push({side,mine,rf});}
for(const {side,mine,rf} of att){
 const label=side>0?'gate on the cart\'s left (cart to its right)':'gate on the cart\'s right (cart to its left)';
 const drops=mine.out.map((r,i,a)=>i&&r.gate<a[i-1].gate?i:-1).filter(i=>i>0);
 const hitTick=drops.length?mine.out[drops[0]].tick:undefined,refDrops=rf.out.map((r,i,a)=>i&&r.gate<a[i-1].gate?r.tick:-1).filter(t=>t>0);
 check(mine.hits.length>=2&&JSON.stringify(mine.hits.map(h=>h.tick-mine.t0))===JSON.stringify(rf.hits.map(h=>h.tick-rf.t0))&&JSON.stringify(mine.out.map(r=>r.gate))===JSON.stringify(rf.out.map(r=>r.gate)),`${label}: attack ticks and the gate's hp after every tick are identical to the reference`,{mine:mine.hits.map(h=>h.tick-mine.t0).slice(0,4),ref:rf.hits.map(h=>h.tick-rf.t0).slice(0,4),hit:hitTick-mine.t0,refHit:refDrops[0]-rf.t0});
 const first=mine.hits[0].tick,r=t=>mine.out.find(o=>o.tick===t);
 check(hitTick===first+12&&r(first)?.frame!=='6'&&r(hitTick-1)?.frame==='5'&&r(hitTick)?.frame==='6','the hit lands 12 ticks after the attack event; the ram is drawn back (5) up to the tick before and thrust (6) exactly on the hit tick',{first,hitTick,before:r(hitTick-1)?.frame,at:r(hitTick)?.frame});
 const after=mine.out.filter(o=>o.tick>hitTick&&o.tick<=hitTick+12).map(o=>o.frame);
 check(after.includes('6')&&after.includes('7')&&after.indexOf('7')>after.lastIndexOf('6')&&after.at(-1)==='0','contact (6) is held about 110 ms, then recover (7), then idle before the 2 s cooldown ends',after);
 const w=mine.out.filter(o=>o.tick>first&&o.tick<hitTick).every(o=>o.frame==='5');
 check(w,'the windup frame is shown from the tick after the attack event (the event is read just after the sync) to the tick before the hit');
 const sxs=new Set(mine.out.slice(3,60).map(o=>Math.sign(o.sx)));
 const wantSx=side>0?1:-1; // the cart is to the gate's right (side 1): the gate is on its left, which is the authored facing (scaleX > 0); a cart to the gate's left faces right (scaleX < 0)
 check(sxs.size===1&&Math.sign([...sxs][0])===wantSx,`facing toward the gate: ${side>0?'left (authored)':'right (mirrored about the pivot)'}`,{side,sx:[...sxs]});
 if(side>0)await snap(page,'attack-ready');
}
// poses for the review shots: one tick per pose on the right side
if(shots){for(const [name,f] of [['windup','5'],['contact','6'],['recover','7']]){await page.evaluate(({f})=>{const c=S.state.units['blue-c-1'],g=S.state.structures['red-fortress-gate'];S.hero.x=g.x+300;S.hero.y=g.y;c.x=g.x+(g.radius??24)+38;c.y=g.y;c.strike=undefined;c.readyTick=S.clock.tick;for(let i=0;i<120&&cartFrame('blue-c-1')!==f;i++)step(1);},{f});await snap(page,'cart-'+name);}}
// pause: nothing advances while the scene is paused
const pau=await page.evaluate(async()=>{const c=S.state.units['blue-c-1'],g=S.state.structures['red-fortress-gate'];S.hero.x=g.x+300;S.hero.y=g.y;c.x=g.x+62;c.y=g.y;c.strike=undefined;c.readyTick=S.clock.tick;for(let i=0;i<120&&cartFrame('blue-c-1')!=='5';i++)step(1);const f0=cartFrame('blue-c-1'),ms0=B.simMs();await frames(30);return {f0,f1:cartFrame('blue-c-1'),same:B.simMs()===ms0};});
check(pau.f0==='5'&&pau.f1==='5'&&pau.same,'pause: the frame and the clock hold still while the scene is paused',pau);
// the Azure cart dies: its body breaks, fades, and there is no wreck
const azdie=await page.evaluate(()=>{const c=S.state.units['blue-c-1'],g=S.state.structures['red-fortress-gate'];hits.length=0;sites.length=0;S.hit(g,c,1e6);rec=null;const out=[];for(let i=0;i<75;i++){step(1);const bodies=B.corpses.filter(x=>x.cart);out.push({ms:B.simMs(),n:bodies.length,frame:bodies[0]?.art.frame.name,alpha:bodies[0]?+bodies[0].art.alpha.toFixed(2):undefined,key:bodies[0]?.art.texture.key});}
 return {out,wreck:!!S.state.cartWreck,art:!!B.cartWreckArt,gone:!S.state.units['blue-c-1']&&!B.soldiers.has('blue-c-1')&&!B.visuals.has('blue-c-1'),sites:sites.map(s=>s.change)};});
check(azdie.gone&&!azdie.wreck&&!azdie.art&&!azdie.sites.includes('wreck'),'an Azure cart that dies leaves no wreck: the unit, its visual and its sprite entry are gone and no wreck picture appears',{gone:azdie.gone,wreck:azdie.wreck,art:azdie.art,sites:azdie.sites});
const t0=azdie.out[0].ms,ad=ms=>azdie.out.find(r=>r.ms-t0>=ms);
check(azdie.out[0].frame==='8'&&ad(260)?.frame==='9'&&azdie.out[0].key===M.S.azure&&ad(1600)?.n===0,'its Azure body breaks (frame 8), is down (9 from 200 ms), and is gone by 1.5 s',[azdie.out[0].frame,ad(260)?.frame,ad(1600)?.n]);
// restart: nothing of the old state survives
const rs=await page.evaluate(async()=>{B.scene.restart();await new Promise(r=>setTimeout(r,3000));const b=window.kingdomGame.scene.getScene('Battle');return {corpses:b.corpses.length,wreck:!!b.cartWreckArt,carts:[...b.soldiers.values()].filter(s=>s.cart).length,at:b.cartWreckAt};});
check(rs.corpses===0&&rs.carts===0&&rs.at<-1e8,'a restart clears the cart sprite state (bodies, entries, wreck timing)',rs);
// ---- the Ballista is unchanged: same texture and sheet as before
const bl=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;const r=s.camps[0].ballista;s.postStates[0].owner='azure';for(const k of Object.keys(s.state.structures)){const x=s.state.structures[k];if(x.team==='red'&&x.kind==='tower')delete s.state.structures[k];}s.economy.balances={gold:1e12,wood:1e12,iron:1e12};s.send({type:'place',requestId:'bl',kind:'ballista',col:r.col,row:r.row});s.advance(1000/30+.01);b.syncUnits();return {sheet:b.ballistas.get('built-bl')?.base.texture.key,cart:b.soldiers.get('built-bl')?.cart};});
check(bl.sheet==='ballista-sheet'&&!bl.cart,'the Ballista is still drawn from its own sheet, not the cart code',bl);
// ---- Chapter 4 Mission 4: a Crimson cart spawns, rolls, is destroyed, leaves a wreck on a site; repaired once into an Azure cart
const p34=await open(base,34);
const c4=await p34.evaluate(()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id&&id!=='red-cart')delete S.state.units[id];let t=0;while(!S.state.units['red-cart']&&t<1500){S.advance(1000/30+.01);S.drainEvents();t++;}B.syncUnits();const e=B.soldiers.get('red-cart'),u=S.state.units['red-cart'];return {tick:S.clock.tick,cart:!!u,entry:!!e?.cart,key:e?.art.texture.key,team:u?.team,archetype:u?.archetype,label:B.visuals.get('red-cart')?.list.find(o=>o.type==='Text'&&/WAR CART/.test(o.text))?.text,sites:S.setup.cart.sites.length};});
check(c4.cart&&c4.entry&&c4.key===M.S.crimson&&c4.team==='red'&&c4.archetype==='war-cart'&&c4.label==='WAR CART','Chapter 4 Mission 4: the Crimson cart spawns, drawn from the Crimson sheet and labelled WAR CART',c4);
const cr=await p34.evaluate(()=>{const u=S.state.units['red-cart'];S.hero.hp=S.hero.maxHp=1e7;S.hero.x=u.x+400;S.hero.y=u.y;for(const k of Object.keys(S.state.units))if(k!==S.hero.id&&k!=='red-cart')delete S.state.units[k];rec={id:'red-cart',gate:'red-base',out:[]};step(90);const roll=rec.out.map(r=>r.frame);rec=null;
 const here={x:u.x,y:u.y};sites.length=0;S.hit(S.hero,u,1e6);const out=[];for(let i=0;i<75;i++){step(1);const b=B.corpses.find(x=>x.cart),w=B.cartWreckArt;out.push({ms:B.simMs(),body:b&&b.art.frame.name,bodyAlpha:b&&+b.art.alpha.toFixed(2),bodyAt:b&&[+b.art.x.toFixed(0),+b.art.y.toFixed(0)],wreck:w&&w.frame.name,wreckAlpha:w&&+w.alpha.toFixed(2),wreckAt:w&&[+w.x.toFixed(0),+w.y.toFixed(0)]});}
 return {roll:[...new Set(roll)],out,wreck:S.state.cartWreck&&[S.state.cartWreck.x,S.state.cartWreck.y],died:here,site:sites.find(s=>s.change==='wreck')};});
check(cr.roll.some(f=>['1','2','3','4'].includes(f)),'the Crimson cart rolls on its own (wheel frames shown while it advances)',cr.roll);
const o0=cr.out[0],cp=ms=>cr.out.find(r=>r.ms-o0.ms>=ms);
check(!!cr.site&&o0.body==='8'&&cp(260)?.body==='9'&&o0.wreckAlpha===0&&cp(1500)?.wreckAlpha===1&&cp(1500)?.wreck==='10','Crimson death: the body breaks at the spot it fell (8, then 9), the existing wreck site is made, and the wreck picture fades in there to full alpha',{o0,at260:cp(260),at1500:cp(1500),site:cr.site});
await snap(p34,'destroyed');
const ring=await p34.evaluate(()=>{const w=S.state.cartWreck;S.hero.x=w.x;S.hero.y=w.y;S.economy.balances={gold:1e12,wood:1e12,iron:1e12};step(3);const rp=B.cartWreckArt.frame.name;step(160);return {repairing:rp,cart:!!S.state.units['blue-c-1'],entry:B.soldiers.get('blue-c-1')?.art.texture.key,art:!!B.cartWreckArt,wreck:!!S.state.cartWreck};});
check(ring.repairing==='11'&&ring.cart&&ring.entry===M.S.azure&&!ring.art&&!ring.wreck,'repairing the Crimson wreck shows the repairing frame, then one Azure cart replaces it',ring);
await p34.close();
// ---- smoke: Chapter 5 Mission 5
const p45=await open(base,45);
const sm=await p45.evaluate(()=>{step(3);return {art:!!B.cartWreckArt?.scene,frame:B.cartWreckArt?.frame.name,alpha:B.cartWreckArt?.alpha,locked:S.cartLocked};});
check(sm.art&&sm.frame==='10'&&sm.alpha===1&&sm.locked,'Chapter 5 Mission 5: the start wreck is drawn, locked',sm);await p45.close();
check(errors.length===0,'no page errors or console errors in this build',errors.slice(0,5));
console.log(failed?`${failed} FAILED`:'ALL PASS');await browser.close();process.exit(failed?1:0);

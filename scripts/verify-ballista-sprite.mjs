// Ballista V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46), with smoke tests in C4M2 (level 32) and C5M5 (level 45). Needs this build's dev
// server and a reference build without the Ballista animation (the Barracks commit): SPRITE_URL=http://127.0.0.1:5431/ REF_URL=http://127.0.0.1:5441/
// The North Outpost is made Azure, the Ballista is repaired on its ruin through the real placement command, and the simulation is stepped one tick at a time in the game's
// own order (advance, sync, events). Checks the sheet, the HP bar / label / tap box / pick area against the reference, construction (intact base + the existing fade), every
// shot (fired on the attack tick, recoil, reload, loaded before the next shot; attack ticks and target hp identical to the reference), facing (mechanism mirrored, base
// never), the damage thresholds, destruction (3-step collapse gone by 2 s), the ruin and a repair after it, pause and restart, the War Cart staying off the Ballista sheet, and no page errors.
// Writes review screenshots to BALLISTA_SHOTS (optional).
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5441/',shots=process.env.BALLISTA_SHOTS;
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const errors=[];
const open=async(url,level=46)=>{const page=await (await browser.newContext({viewport:{width:960,height:540}})).newPage();
 if(url===base){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
 await page.goto(`${url}?debug=1&level=${level}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:30000});
 await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
  S.hero.hp=S.hero.maxHp=1e7;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;S.encounter={...S.encounter,waves:[],continuous:false};B.game.events.on('inspect',e=>{B.inspected=e;});
  for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.hero.x=300;S.hero.y=1000;S.economy.balances={gold:1e12,wood:1e12,iron:1e12};
  window.att=[];window.step=n=>{for(let i=0;i<n;i++){S.advance(1000/30+.01);B.syncUnits();for(const e of S.drainEvents()){if(e.type==='attack'&&e.id==='built-bl'){const t=S.state.units[e.targetId]??S.state.structures[e.targetId];att.push({tick:S.clock.tick,ms:B.simMs(),target:e.targetId,hp:t?.hp});}B.observeBallista?.(e);}}};
  window.mf=()=>B.ballistas?.get('built-bl')?.mech.frame.name;window.bf=()=>B.ballistas?.get('built-bl')?.base.frame.name;
  window.dummy=(id,dx,dy=0)=>{const b=S.state.structures['built-bl'],u={...S.unit(id,'minion-red',b.x+dx,b.y+dy,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e7,maxHp:1e7};S.state.units[id]=u;return u;};
  window.camp=()=>{S.postStates[0].owner='azure';for(const k of Object.keys(S.state.structures)){const s=S.state.structures[k];if(s.team==='red'&&s.kind==='tower')delete S.state.structures[k];}return S.camps[0].ballista;}; // the hostile towers go, so the fresh Ballista (hp climbing from near zero) is not shot while it is built
  window.build=()=>{const r=camp();S.send({type:'place',requestId:'bl',kind:'ballista',col:r.col,row:r.row});step(1);return S.state.structures['built-bl']?.id;};
  window.box=id=>{const v=B.visuals.get(id),b=B.pickBounds(id,v),bar=B.hpBars.get(id).bar,label=v.list.find(o=>o.type==='Text'&&/BALLISTA/.test(o.text)),art=v.list.find(o=>o.type==='Image');
   return {bounds:[b.x-v.x,b.y-v.y,b.width,b.height].map(n=>+n.toFixed(1)),bar:[bar.x,bar.y,bar.width].map(n=>+n.toFixed(2)),label:label?.text,labelAt:label&&[label.x,label.y],art:[+art.x.toFixed(2),+art.y.toFixed(2),+art.displayWidth.toFixed(1),+art.displayHeight.toFixed(1)],hitW:art.input&&+(art.input.hitArea.width*art.scaleX).toFixed(1),hitH:art.input&&+(art.input.hitArea.height*art.scaleY).toFixed(1),depth:v.depth,children:v.list.length};};
  B.scene.pause();});
 return page;};
const page=await open(base),refPage=await open(ref);
const M=await page.evaluate(async()=>{const m=await import('/src/world/ballistaSprite.ts');return {BAF:m.BAF,M:m.BALLISTA_MOTION,S:m.BALLISTA_SHEET};});
const snap=async(p,name)=>{if(!shots)return;await p.evaluate(()=>frames(3));writeFileSync(`${shots}/${name}.png`,await p.screenshot());};
// the sheet
const sheet=await page.evaluate(({k})=>{const t=B.textures.get(k),n=t.getFrameNames().filter(x=>x!=='__BASE');return {n:n.length,src:n.map(x=>[t.get(x).realWidth,t.get(x).realHeight]).every(([w,h])=>w===336&&h===320)};},{k:M.S.key});
check(sheet.n===10&&sheet.src,'the sheet has 10 frames, each in one 336 x 320 cell',sheet);
// build in both
const idMine=await page.evaluate(()=>build()),idRef=await refPage.evaluate(()=>build());
check(idMine==='built-bl'&&idRef==='built-bl','the Ballista is repaired on the North Outpost ruin through the real placement command, in both builds',[idMine,idRef]);
const built=await page.evaluate(()=>{const a=B.ballistas.get('built-bl'),s=S.state.structures['built-bl'];return {kind:s.kind,ballista:!!s.ballista,base:a.base.texture.key,mech:a.mech.texture.key,bf:bf(),mf:mf(),towers:B.towers.has('built-bl'),mechInteractive:!!a.mech.input,scale:a.base.scaleY,mscale:a.mech.scaleX};});
check(built.kind==='tower'&&built.ballista&&built.base==='ballista-sheet'&&built.mech==='ballista-sheet'&&!built.towers&&!built.mechInteractive,'it is drawn from the Ballista sheet (base + mechanism, the mechanism not tappable), not by the Tower code',built);
const refKey=await refPage.evaluate(()=>B.visuals.get('built-bl').list.find(o=>o.type==='Image').texture.key);check(refKey==='azure-ballista','the reference build draws the old canvas',refKey);
// construction: the intact base, the loaded mechanism, the existing fade
const con=await page.evaluate(()=>{const out=[];for(let i=0;i<7;i++){step(20);const s=S.state.structures['built-bl'],v=B.visuals.get('built-bl');out.push({tick:S.clock.tick,done:S.clock.tick>=s.completeTick,bf:bf(),mf:mf(),alpha:+v.alpha.toFixed(3),progress:+s.progress.toFixed(3)});}return out;});
check(con.filter(r=>!r.done).length>=3&&con.filter(r=>!r.done).every(r=>r.bf==='0'&&r.mf==='6'&&Math.abs(r.alpha-r.progress)<.02),'while built: intact base, loaded mechanism, alpha follows the build progress (the existing fade)',con.filter(r=>!r.done).slice(0,3));
await refPage.evaluate(()=>step(140));
// HP bar, label, tap box, pick area: identical to the reference
const boxes=await Promise.all([page.evaluate(()=>box('built-bl')),refPage.evaluate(()=>box('built-bl'))]);
check(JSON.stringify(boxes[0].bar)===JSON.stringify(boxes[1].bar)&&boxes[0].label===boxes[1].label&&JSON.stringify(boxes[0].labelAt)===JSON.stringify(boxes[1].labelAt)&&boxes[0].depth===boxes[1].depth,'HP bar, label and depth are identical to the reference',[boxes[0].bar,boxes[0].label,boxes[0].labelAt,boxes[0].depth]);
check(Math.abs(boxes[0].hitW-boxes[1].hitW)<=.5&&Math.abs(boxes[0].hitH-boxes[1].hitH)<=.5,'the tap box is the old 84 x 84 px',[boxes[0].hitW,boxes[0].hitH,boxes[1].hitW,boxes[1].hitH]);
check(boxes[0].bounds.every((v,i)=>Math.abs(v-boxes[1].bounds[i])<=2.5),'the pick area (bounds with label and bar) is the reference\'s, within 2.5 px',[boxes[0].bounds,boxes[1].bounds]);
check(Math.abs(boxes[0].art[3]-boxes[1].art[3])<=1&&boxes[0].art[0]===boxes[1].art[0]&&boxes[0].art[1]===boxes[1].art[1],'drawn at the old height (84 x 1.2 px) and the same anchor',[boxes[0].art,boxes[1].art]);
// shots: the same dummy in both builds; attack ticks, targets and hp identical; the pose follows each shot
const mk=async p=>p.evaluate(()=>{dummy('east',200);window.att.length=0;const ser=[];for(let i=0;i<330;i++){step(1);ser.push({tick:S.clock.tick,ms:B.simMs(),mf:mf(),bf:bf()});}return {ser,att:[...att],hp:S.state.units.east.hp};});
const mine=await mk(page),theirs=await mk(refPage);
check(mine.att.length>=3&&mine.att.length===theirs.att.length&&mine.att.every((a,i)=>a.tick===theirs.att[i].tick&&a.hp===theirs.att[i].hp),'every shot is on the same tick, at the same target, with the same hp as in the reference build',{mine:mine.att.slice(0,4),ref:theirs.att.slice(0,2)});
check(mine.hp===theirs.hp&&mine.hp<1e7,'the damage dealt is identical (70 per shot)',[mine.hp,theirs.hp]);
check(mine.att.slice(1).every((a,i)=>a.ms-mine.att[i].ms===3000||Math.abs(a.ms-mine.att[i].ms-3000)<40),'shots are 3 s apart (cooldown untouched)',mine.att.map(a=>a.ms));
const cd=3000,want=(ms,shot)=>{const t=ms-shot;return t<0||t>=cd*M.M.reloadShare?'6':t<M.M.firedMs?'7':t<M.M.recoilMs?'8':'9';};
const bad=[];for(const r of mine.ser){const shots_=mine.att.map(a=>a.tick*1000/30).filter(m=>m<=r.ms+.001);const last=shots_.length?shots_[shots_.length-1]:undefined;const w=last===undefined?'6':want(r.ms,last);if(r.mf!==w)bad.push([r.tick,r.mf,w]);}
check(bad.length===0,'the mechanism is fired on the attack tick, then recoil, reload, and loaded again before the next shot, on every tick',bad.slice(0,5));
const first=mine.ser.find(r=>r.tick===mine.att[0].tick);check(first?.mf==='7','the fired pose is on screen on the very tick of the attack and the damage',first);
check(mine.ser.every(r=>r.bf==='0'),'the base stays intact while it is undamaged',[...new Set(mine.ser.map(r=>r.bf))]);
await snap(page,'loaded');
// facing
const fac=await page.evaluate(()=>{const a=B.ballistas.get('built-bl');const east=a.mech.scaleX>0;delete S.state.units.east;dummy('west',-200);let seen=null;for(let i=0;i<200&&!seen;i++){step(1);if(att.length&&att[att.length-1].target==='west'){seen=true;}}step(2);return {east,west:a.mech.scaleX<0,base:a.base.scaleX>0,target:att[att.length-1]?.target,facing:a.facing};});
check(fac.east&&fac.west&&fac.base&&fac.target==='west','the mechanism faces the east target, then mirrors toward a west target; the base is never flipped',fac);
await snap(page,'mirrored');
// damage thresholds (a target stays in range so it keeps firing)
const dmg=await page.evaluate(()=>{const s=S.state.structures['built-bl'],out={};for(const [k,f] of [['full',1],['edge',.66],['below',.65],['low',.34],['crit',.32],['critical',.1]]){s.hp=s.maxHp*f;step(1);out[k]=bf();}s.hp=s.maxHp;step(1);out.back=bf();s.hp=s.maxHp*.6;step(1);out.mechDamaged=mf();return out;});
check(dmg.full==='0'&&dmg.edge==='0'&&dmg.below==='1'&&dmg.low==='1'&&dmg.crit==='2'&&dmg.critical==='2'&&dmg.back==='0'&&['6','7','8','9'].includes(dmg.mechDamaged),'damage thresholds: intact to 66%, damaged below, badly damaged below 33%, back to intact at full hp; it still fires',dmg);
await page.evaluate(()=>{S.state.structures['built-bl'].hp=S.state.structures['built-bl'].maxHp*.6;step(1);});await snap(page,'damaged');
await page.evaluate(()=>{S.state.structures['built-bl'].hp=S.state.structures['built-bl'].maxHp*.3;step(1);});await snap(page,'badly');
await page.evaluate(()=>{S.state.structures['built-bl'].hp=S.state.structures['built-bl'].maxHp;step(1);});
// pause: the frame holds while paused, and the sequence resumes from the simulation clock
const pz=await page.evaluate(async()=>{while(mf()!=='8')step(1);B.scene.pause();const f0=mf(),m0=B.simMs();await new Promise(r=>setTimeout(r,500));const f1=mf(),m1=B.simMs();return {f0,f1,same:m0===m1};});
check(pz.f0==='8'&&pz.f1==='8'&&pz.same,'paused during the recoil: the frame and the simulation clock hold',pz);
// destruction: a 3-step collapse, gone by 2 s, no mechanism left, the ruin free for a repair
const col=await page.evaluate(()=>{const s=S.state.structures['built-bl'],foe=S.state.units.west;foe.damage=0;S.hit(foe,s,1e7,'direct');window.T0=null;const out=[];let n0=B.collapses.length;for(let i=0;i<90;i++){step(1);if(T0===null&&B.collapses.length>n0)T0=B.simMs();if(T0!==null){const c=B.collapses[B.collapses.length-1];out.push({ms:Math.round(B.simMs()-T0),frame:c?.art.frame.name,alpha:c?+c.art.alpha.toFixed(2):null,live:B.collapses.length});}}return {out,gone:!S.state.structures['built-bl'],map:B.ballistas.has('built-bl'),vis:B.visuals.has('built-bl')};});
check(col.gone&&!col.map&&!col.vis&&col.out.length>10,'destroyed: the structure, its visual and its sprite entries are gone, and a collapse image replaces it',{gone:col.gone,map:col.map,vis:col.vis});
const at=ms=>col.out.find(r=>r.ms>=ms);
check(at(0)?.frame==='3'&&at(200)?.frame==='4'&&at(450)?.frame==='5','collapse: breaking (frame 3), falling (frame 4 from 150 ms), rubble (frame 5 from 400 ms)',[at(0),at(200),at(450)]);
const end=col.out;
check(end.filter(r=>r.ms>=1500&&r.ms<1900).some(r=>r.alpha<1)&&end.find(r=>r.ms>=2050)?.live===0&&end.filter(r=>r.ms<1400).every(r=>r.alpha===1),'it fades from 1.4 s and is cleaned up by 2 s (no collapse images left)',end.filter(r=>r.ms>=1380).filter((_,i)=>i%6===0));
const again=await page.evaluate(()=>{const r=S.camps[0].ballista;const reason=S.placementReason('ballista',r.col,r.row);S.send({type:'place',requestId:'bl2',kind:'ballista',col:r.col,row:r.row});step(1);const id='built-bl2',ok=!!S.state.structures[id]&&B.ballistas.has(id);for(let i=0;i<200;i++)step(1);const a=B.ballistas.get(id),v=B.visuals.get(id);return {reason,ok,bf:a?.base.frame.name,mf:a?.mech.frame.name,alpha:v&&+v.alpha.toFixed(2)};});
check(again.reason===''&&again.ok&&again.bf==='0'&&again.alpha===1,'the ruin accepts a new repair after the collapse, and the new Ballista is drawn whole',again);
await snap(page,'repaired');
// the War Cart keeps the old canvas texture
const cart=await Promise.all([page,refPage].map(p=>p.evaluate(()=>{const B2=window.kingdomGame.scene.getScene('Battle'),S2=B2.simulation;const u=S2.unit('cart1','minion-red',900,600,'war-cart',undefined,S2.clock.tick);S2.state.units.cart1=u;B2.syncUnits();const v=B2.visuals.get('cart1');const img=v?.list.find(o=>o.type==='Image');return {key:img?.texture.key,label:v?.list.find(o=>o.type==='Text')?.text,h:img&&+img.displayHeight.toFixed(1),sheet:!!B2.ballistas?.has('cart1')};})));
check(cart[0].key!=='ballista-sheet'&&cart[0].label===cart[1].label&&!cart[0].sheet,'the War Cart is not drawn from the Ballista sheet (its own sheet since War Cart V1.0; the reference build still has the old canvas), same label',cart);
// restart: nothing of the old sprites survives
const rs=await page.evaluate(async()=>{B.scene.restart();await new Promise(r=>setTimeout(r,3000));const b=window.kingdomGame.scene.getScene('Battle');return {size:b.ballistas.size,gone:b.ballistasGone.size,collapses:b.collapses.length};});
check(rs.size===0&&rs.gone===0&&rs.collapses===0,'a restart clears the Ballista sprite state',rs);
// smoke: C4M2 (32) and C5M5 (45)
for(const lvl of [32,45]){
 const p=await open(base,lvl);const r=await p.evaluate(()=>{const c=camp();S.send({type:'place',requestId:'bl',kind:'ballista',col:c.col,row:c.row});step(1);if(!S.state.structures['built-bl'])return {built:false,reason:S.placementReason('ballista',c.col,c.row)};for(let i=0;i<190;i++)step(1);dummy('d1',150);let fired=false;for(let i=0;i<150;i++){step(1);if(mf()==='7')fired=true;}return {built:true,fired,base:B.ballistas.get('built-bl').base.texture.key,att:att.length};});
 check(r.built&&r.fired&&r.base==='ballista-sheet'&&r.att>=1,`level ${lvl}: the Ballista is built, drawn from the sheet and fires with the fired pose`,r);await p.close();}
check(errors.length===0,'no page errors or console errors in this build',errors.slice(0,5));
console.log(failed?`${failed} FAILED`:'ALL PASS');await browser.close();process.exit(failed?1:0);

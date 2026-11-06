// Barracks V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs this build's dev server and a reference build without the Barracks
// animation (the Tower build): SPRITE_URL=http://127.0.0.1:5431/ REF_URL=http://127.0.0.1:5421/
// Two Azure Barracks are built through the real placement command and the simulation is stepped one tick at a time in the game's own order (advance, sync, events).
// Checks the sheet and which Barracks use it, the HP bar / label / tap box / pick area against the reference, construction (intact frame + the existing fade), each
// recruit's door cue (500 ms from the spawn tick, per Barracks, independent of the other), spawn ticks and cells identical to the reference, damage states (and that they win
// over the door), destruction (3-step collapse, gone by 2 s, no more soldiers), pause, a converted Elite Barracks (C4M4 level 34) and the Crimson Barracks (level 33)
// keeping its still, and no page errors. Writes review screenshots to BARRACKS_SHOTS (optional).
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5421/',shots=process.env.BARRACKS_SHOTS;
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
  window.rec=[];window.step=n=>{for(let i=0;i<n;i++){S.advance(1000/30+.01);B.syncUnits();for(const e of S.drainEvents()){if(e.type==='spawn')rec.push({tick:S.clock.tick,ms:B.simMs(),id:e.id});B.observeBarracks?.(e);}}};
  window.pad=i=>S.azurePads[i];window.place=(rid,i)=>{const p=pad(i);S.send({type:'place',requestId:rid,kind:'barracks',col:p.col,row:p.row});step(1);return `built-${rid}`;};
  window.fr=id=>B.barracks?.get(id)?.art.frame.name;window.key=id=>(B.barracks?.get(id)?.art??B.visuals.get(id)?.list.find(o=>o.type==='Image'&&o.texture&&o.texture.key!=='__DEFAULT'))?.texture.key;
  window.box=id=>{const v=B.visuals.get(id),b=B.pickBounds(id,v),bar=B.hpBars.get(id).bar,label=v.list.find(o=>o.type==='Text'&&/BARRACKS/.test(o.text)),art=v.list.find(o=>o.type==='Image');
   return {bounds:[b.x-v.x,b.y-v.y,b.width,b.height].map(n=>+n.toFixed(2)),bar:[bar.x,bar.y,bar.width].map(n=>+n.toFixed(2)),label:label?.text,labelAt:label&&[label.x,label.y],labelW:label&&+label.width.toFixed(2),art:[art.x,art.y,+art.displayWidth.toFixed(2),+art.displayHeight.toFixed(2)],hit:art.input&&[art.input.hitArea.x,art.input.hitArea.y,art.input.hitArea.width,art.input.hitArea.height]};};
  B.scene.pause();});
 return page;};
const page=await open(base),refPage=await open(ref);
const M=await page.evaluate(async()=>{const m=await import('/src/world/barracksSprite.ts');return {BF:m.BF,M:m.BARRACKS_MOTION,S:m.BARRACKS_SHEET};});
const snap=async(p,name)=>{if(!shots)return;await p.evaluate(()=>frames(3));writeFileSync(`${shots}/${name}.png`,await p.screenshot());};
const camera=(p,id,dy=-60)=>p.evaluate(([id,dy])=>{const c=B.cameras.main;c.stopFollow();c.setZoom(1.6);const v=B.visuals.get(id);c.centerOn(v.x,v.y+dy);},[id,dy]);
// the sheet
const sheet=await page.evaluate(({k})=>{const t=B.textures.get(k),n=t.getFrameNames().filter(x=>x!=='__BASE');return {n:n.length,src:n.map(x=>[t.get(x).realWidth,t.get(x).realHeight]).every(([w,h])=>w===384&&h===372)};},{k:M.S.azure});
check(sheet.n===7&&sheet.src,'the sheet has 7 frames, each with the still\'s own 384 x 372 cell',sheet);
// build two Barracks, the second 20 ticks after the first, on the same pads in both builds
const ids=[];for(const p of [page,refPage]){const a=await p.evaluate(()=>place('b1',0));await p.evaluate(()=>step(20));const b=await p.evaluate(()=>place('b2',1));ids.push(a,b);}
const [id1,id2]=ids.slice(0,2);
const built=await page.evaluate(([a,b])=>({a:S.state.structures[a],b:S.state.structures[b],ka:key(a),kb:key(b),fa:fr(a),fb:fr(b),maps:[B.barracks.has(a),B.barracks.has(b)]}),[id1,id2]);
check(built.a?.azureBarracks&&built.b?.azureBarracks&&built.a.completeTick<built.b.completeTick,'two Azure Barracks stand, built 20 ticks apart',[built.a?.completeTick,built.b?.completeTick]);
check(built.ka==='barracks-sheet'&&built.kb==='barracks-sheet'&&built.maps.every(Boolean),'both are drawn from the animated sheet',[built.ka,built.kb]);
const refKey=await refPage.evaluate(id=>key(id),id1);check(refKey==='barracks-azure','the reference build draws the still',refKey);
// construction: intact frame, the existing fade (alpha = progress)
const con=await page.evaluate(()=>{const out=[];for(let i=0;i<6;i++){step(20);const s=S.state.structures['built-b1'],v=B.visuals.get('built-b1');out.push({tick:S.clock.tick,done:S.clock.tick>=s.completeTick,frame:fr('built-b1'),alpha:+v.alpha.toFixed(3),progress:+s.progress.toFixed(3)});}return out;});
check(con.filter(r=>!r.done).every(r=>r.frame==='0'&&Math.abs(r.alpha-r.progress)<.02),'while built: the intact frame, alpha follows the build progress (the existing fade)',con.filter(r=>!r.done).slice(0,3));
await refPage.evaluate(()=>step(120));
// run to the first spawns, recording; compare with the reference tick for tick
const run=async p=>p.evaluate(()=>{const ser=[];for(let i=0;i<260;i++){step(1);ser.push({tick:S.clock.tick,ms:B.simMs(),f1:fr('built-b1')??null,f2:fr('built-b2')??null,alpha1:B.visuals.get('built-b1').alpha});}return {ser,rec:[...rec],soldiers:Object.values(S.state.units).filter(u=>u.id.startsWith('blue-s-')).map(u=>[u.id,Math.round(u.x),Math.round(u.y)]).sort()};});
const mine=await run(page),theirs=await run(refPage);
check(mine.rec.length>=4&&mine.rec.length===theirs.rec.length&&mine.rec.every((r,i)=>r.id===theirs.rec[i].id&&r.tick===theirs.rec[i].tick),'every soldier spawns on the same tick, with the same id, as in the reference build',mine.rec.map(r=>`${r.id}@${r.tick}`));
check(JSON.stringify(mine.soldiers)===JSON.stringify(theirs.soldiers),'and in the same cells',mine.soldiers);
const spawns=id=>mine.rec.filter(r=>r.id.startsWith(`blue-s-${id}-`)).map(r=>r.ms);
const expect=(id,ms)=>spawns(id).some(s=>ms>=s&&ms-s<M.M.recruitMs)?'1':'0';
const bad=[];for(const r of mine.ser){for(const [k,id] of [['f1','built-b1'],['f2','built-b2']]){if(r[k]!==null&&r[k]!==expect(id,r.ms))bad.push([r.tick,k,r[k],expect(id,r.ms)]);}}
check(bad.length===0,'each Barracks shows the doorway frame exactly from each of its own soldier spawns for 500 ms, and the intact frame otherwise',bad.slice(0,4));
const win=(id)=>mine.ser.filter(r=>r[id==='built-b1'?'f1':'f2']==='1').length;
check(win('built-b1')>=15&&win('built-b2')>=15,'both Barracks opened their doorway (>= 15 ticks each)',[win('built-b1'),win('built-b2')]);
const only=mine.ser.some(r=>r.f1==='1'&&r.f2==='0')&&mine.ser.some(r=>r.f2==='1'&&r.f1==='0');check(only,'they operate independently: each opens while the other is closed');
// HP bar, label, tap box, pick area: identical to the reference
const boxes=await Promise.all([page.evaluate(id=>box(id),id1),refPage.evaluate(id=>box(id),id1)]);
const sameBox=(a,b)=>JSON.stringify({...a,labelW:undefined})===JSON.stringify({...b,labelW:undefined});
check(sameBox(boxes[0],boxes[1]),'HP bar, label, art box, tap rectangle and pick bounds match the reference build',{mine:boxes[0],ref:boxes[1]});
check(boxes[0].label==='AZURE BARRACKS','the label is unchanged',boxes[0].label);
// tap selects it, as before
const tap=async(p,id)=>{await p.evaluate(()=>{B.scene.resume();});await p.evaluate(id=>{const v=B.visuals.get(id),art=v.list.find(o=>o.type==='Image');B.inspected=undefined;art.emit('pointerdown',{},0,0,{stopPropagation(){}});},id);await p.evaluate(()=>B.scene.pause());return p.evaluate(()=>B.inspected?.name);};
check(await tap(page,id1)==='Azure Barracks'&&await tap(refPage,id1)==='Azure Barracks','a tap inspects the Azure Barracks, as before');
// damage states, and that they win over the door
const dmg=await page.evaluate(()=>{const s=S.state.structures['built-b1'],o=[],at=h=>{s.hp=s.maxHp*h;step(1);o.push([h,fr('built-b1')]);};
 at(1);at(.67);at(.65);at(.34);at(.32);at(.05);
 s.hp=s.maxHp*.5;B.observeBarracks({type:'spawn',id:'blue-s-built-b1-0-99'});o.push(['door while damaged',fr('built-b1')]);s.hp=s.maxHp;step(1);o.push(['restored, door still within 500 ms',fr('built-b1')]);
 step(16);o.push(['after 500 ms',fr('built-b1')]);return {o,w:B.hpBars.get('built-b1')};});
const D=Object.fromEntries(dmg.o.map(([k,v])=>[String(k),v]));
check(D['1']==='0'&&D['0.67']==='0'&&D['0.65']==='2'&&D['0.34']==='2'&&D['0.32']==='3'&&D['0.05']==='3','damaged below 66%, badly damaged below 33%, intact above',dmg.o.slice(0,6));
check(D['door while damaged']==='2','a damage state wins over the recruiting door',D['door while damaged']);
check(D['restored, door still within 500 ms']==='1'&&D['after 500 ms']==='0','restored: the door cue shows again within its 500 ms, then intact',[D['restored, door still within 500 ms'],D['after 500 ms']]);
// pause: a paused scene does not advance the cue
const pz=await page.evaluate(async()=>{B.observeBarracks({type:'spawn',id:'blue-s-built-b2-0-98'});const f0=fr('built-b2');B.scene.resume();B.scene.pause();await new Promise(r=>setTimeout(r,900));return [f0,fr('built-b2')];});
check(pz[0]==='1'&&pz[1]==='1','paused: the open doorway holds (the cue runs on simulation time)',pz);
await camera(page,id1);await page.evaluate(()=>{S.state.structures['built-b1'].hp=S.state.structures['built-b1'].maxHp;});await snap(page,'two-barracks');
// destruction of Barracks 1: 3-step collapse, gone by 2 s, its slots dropped for good
const col=await page.evaluate(({id})=>{const b=S.state.structures[id],t0=B.simMs(),owned0=S.azureBarracks.owned(id);const foe={...S.unit('foe','minion-red',b.x+200,b.y+60,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e6,maxHp:1e6};S.state.units.foe=foe;S.hit(foe,b,1e7,'direct');const o=[];let guard=0,ci=0;
 while(guard++<120){step(1);const t=B.simMs()-t0,c=B.collapses.filter(x=>x.pose);o.push({t:Math.round(t),n:c.length,frame:c[0]?.art.frame.name,alpha:c[0]?+c[0].art.alpha.toFixed(2):null,live:B.barracks.has(id),vis:B.visuals.has(id)});if(t>2200)break;}
 return {o,owned0,after:S.azureBarracks.owned(id),gone:!S.state.structures[id]};},{id:id1});
const at=ms=>col.o.find(r=>r.t>=ms);
check(col.gone&&!col.o[0].live,'destroyed: the Barracks is removed from the simulation and the live sprite map',[col.gone,col.o[0]]);
check(col.o[0].n===1&&col.o[0].frame==='4'&&at(200).frame==='5'&&col.o.some(r=>r.frame==='4')&&at(420).frame==='6','collapse in three steps: roof buckles (4), walls fall (5), rubble (6)',[col.o[0],at(200),at(420)]);
check(at(1300).alpha===1&&at(1700).alpha<1&&col.o.find(r=>r.t>=2000&&r.n===0)!==undefined&&col.o.filter(r=>r.t<2000).every(r=>r.n===1),'the rubble holds, fades from 1.4 s, and is cleaned up by 2 s',[at(1300),at(1700),col.o.find(r=>r.n===0&&r.t>1500)]);
await camera(page,id2);await snap(page,'one-left');
const after=await page.evaluate(()=>{step(500);return {b2:!!S.state.structures['built-b2'],soldiers:Object.values(S.state.units).filter(u=>u.id.startsWith('blue-s-built-b1-')&&u.hp>0).length,newB1:rec.filter(r=>r.id.startsWith('blue-s-built-b1-')&&r.tick>S.clock.tick-400).length};});
check(after.b2&&after.newB1===0,'the destroyed Barracks trains no more soldiers; the other one stands',after);
// Crimson Barracks keeps its still (level 33, river-island) and a converted Elite Barracks uses the sheet (level 34, fortress-approach)
await page.close();await refPage.close();const cr=await open(base,33),crRef=await open(ref,33);
const crim=p=>p.evaluate(()=>{const id=Object.keys(S.state.structures).find(i=>i.startsWith('red-barracks'));return {id,key:key(id),name:B.visuals.get(id).list.find(o=>o.type==='Text'&&/BARRACKS/.test(o.text))?.text,mapped:!!B.barracks?.has(id),box:box(id)};});
const c1=await crim(cr),c2=await crim(crRef);
check(c1.key==='barracks-crimson'&&!c1.mapped&&c1.name==='CRIMSON BARRACKS'&&JSON.stringify(c1.box)===JSON.stringify(c2.box)&&c2.key==='barracks-crimson','the Crimson Barracks keeps its still, label, HP bar and tap box, as in the reference',{mine:c1,ref:c2.key});
await camera(cr,c1.id,-50);await snap(cr,'crimson-unchanged');await cr.close();await crRef.close();
const el=await open(base,34);
const e1=await el.evaluate(()=>{const id='red-barracks-elite',b=S.state.structures[id];const before=key(id);
 b.team='blue';b.azureBarracks=true;b.eliteBarracks=true;b.completeTick=S.clock.tick;step(2); // the simulation's own conversion (Simulation.convert): the visual key changes and the entity is drawn anew
 const id2=id;return {before,after:key(id2),mapped:B.barracks.has(id2),frame:fr(id2),name:B.visuals.get(id2).list.find(o=>o.type==='Text'&&/BARRACKS/.test(o.text))?.text};});
check(e1.before==='barracks-crimson'&&e1.after==='barracks-sheet'&&e1.mapped&&e1.frame==='0'&&e1.name==='AZURE BARRACKS','a converted Elite Barracks is drawn from the Azure sheet (C4M4)',e1);
await el.evaluate(()=>{const id='red-barracks-elite';B.observeBarracks({type:'spawn',id:`blue-s-${id}-0-77`});});
check((await el.evaluate(()=>fr('red-barracks-elite')))==='1','the converted Elite Barracks shows the doorway cue too');
await camera(el,'red-barracks-elite',-60);await snap(el,'elite-converted');
check(errors.length===0,'no page errors',errors.slice(0,3));
console.log(failed?`FAILED ${failed}`:'ALL PASS');await browser.close();process.exit(failed?1:0);

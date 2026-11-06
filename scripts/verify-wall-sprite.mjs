// Wall V1.0 sprite animation in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs this build's dev server and a reference build without the
// wall animation (the Tower build): SPRITE_URL=http://127.0.0.1:5431/ REF_URL=http://127.0.0.1:5421/
// Checks the wood / ice / ironwood sheets and which walls use them (the Throne Gate in 3 rows, a built Wooden Wall, a Frost Gate; the Barracks, Tavern and
// Banner keep their stills), the HP bar, label, tap box and Hero pick area against the reference, the intact gate's look against the reference, the row
// depths, the damage states and their restore, per-row opening for Crimson passers only (not the Guardian, Azure soldiers or the War Cart), closing 300 ms
// after the last one leaves, live waves passing, pause, construction, the staggered collapse and cleanup by 2 s, the Last Stand Elites and the Crimson Lord
// after the gate falls, the Throne Gate name, and no page errors. Writes review screenshots to WALL_SHOTS (optional).
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5431/',ref=process.env.REF_URL||'http://127.0.0.1:5421/',shots=process.env.WALL_SHOTS;
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const errors=[];
const open=async url=>{const page=await (await browser.newContext({viewport:{width:960,height:540}})).newPage();
 if(url===base){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
 await page.goto(`${url}?debug=1&level=46`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:30000});
 await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.H=window.kingdomGame.scene.getScene('HUD');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
  S.hero.hp=S.hero.maxHp=1e7;S.state.bases['blue-base'].hp=S.state.bases['blue-base'].maxHp=1e7;S.encounter={...S.encounter,waves:[],continuous:false};B.game.events.on('inspect',e=>{B.inspected=e;});
  window.clearField=()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];S.hero.x=300;S.hero.y=1000;};
  window.dummy=(id,kind,x,y,o={})=>{const u={...S.unit(id,kind,x,y,undefined,undefined,S.clock.tick),speed:0,damage:0,hp:1e6,maxHp:1e6,...o};S.state.units[id]=u;return u;};
  // a built Azure Wooden Wall (Simulation.place's fields), complete unless told otherwise; and a Crimson Frost Gate (a red wall that is no faction gate or Barracks)
  window.wall=(id,x,y,o={})=>{const g=S.state.structures['red-fortress-gate'],t={...structuredClone(g),id,team:'blue',x,y,col:Math.floor(x/48),row:Math.floor(y/48),maxHp:400,hp:400,...o};delete t.gate;delete t.columns;delete t.rows;Object.assign(t,o);S.state.structures[id]=t;return t;};
  window.gateBox=()=>{const v=B.visuals.get('red-fortress-gate'),b=B.pickBounds('red-fortress-gate',v),bar=B.hpBars.get('red-fortress-gate').bar,h=B.keepHealth.get('red-fortress-gate');
   const label=v.list.find(o=>o.type==='Text'&&/GATE/.test(o.text));return {labelW:label&&+label.width.toFixed(2),bounds:[b.x-v.x,b.y-v.y,b.width,b.height].map(n=>+n.toFixed(2)),bar:[bar.x,bar.y,bar.width].map(n=>+n.toFixed(2)),high:!!h,label:label?.text,labelAt:label&&[label.x,label.y]};};
 });
 return page;};
const page=await open(base),refPage=await open(ref);
const W=await page.evaluate(async()=>{const m=await import('/src/world/wallSprite.ts');return {WF:m.WF,M:m.WALL_MOTION,S:m.WALL_SHEET};});
const {WF,M}=W;

// 1. Sheets and which walls use them.
{
 const r=await page.evaluate(async()=>{clearField();wall('built-w1',900,600);wall('red-gate-probe',900,840,{team:'red'});await frames(8);
  const n=k=>B.textures.exists(k)?B.textures.get(k).frameTotal-1:0,w=id=>{const a=B.walls.get(id);return a&&{key:a.rows[0].texture.key,rows:a.rows.length,still:a.still.visible};};
  const others=Object.values(S.state.structures).filter(b=>b.kind==='wall'&&(b.azureBarracks||b.tavern||b.banner)).map(b=>b.id);
  const g=B.walls.get('red-fortress-gate');
  return {sheets:[n('wall-wood'),n('wall-ice'),n('wall-ironwood')],gate:w('red-fortress-gate'),built:w('built-w1'),frost:w('red-gate-probe'),frostName:B.unitVisual(S.state.structures['red-gate-probe']).name,others:others.filter(id=>B.walls.has(id)),
   size:g&&[g.rows[0].scaleY.toFixed(4),B.visuals.get('red-fortress-gate').list.find(o=>o.type==='Image'&&o.texture.key==='cliff-gate')?.scaleY.toFixed(4)]};});
 check(JSON.stringify(r.sheets)==='[7,7,7]','three segment sheets of 7 frames: wood, and its ice and ironwood recolours',r.sheets);
 check(r.gate?.key==='wall-ironwood'&&r.gate.rows===3&&r.gate.still===false,'the Throne Gate: 3 ironwood segments, the old still hidden in its container',r.gate);
 check(r.size&&r.size[0]===r.size[1],'segments at the still\'s exact scale',r.size);
 check(r.built?.key==='wall-wood'&&r.built.rows===1,'a built Wooden Wall: 1 wood segment',r.built);
 check(r.frost?.key==='wall-ice'&&r.frost.rows===2&&r.frostName==='Frost Gate','a Frost Gate (red wall, not a faction gate): 2 ice segments, still named Frost Gate',{...r.frost,name:r.frostName});
 check(r.others.length===0,'Barracks, Tavern and Banner are not animated walls',r.others);
 await page.evaluate(()=>{delete S.state.structures['built-w1'];delete S.state.structures['red-gate-probe'];});
}
// 2. HP bar, label, Hero pick area and the intact look against the reference build; the name.
{
 const setup=async p=>p.evaluate(async()=>{clearField();const c=B.cameras.main;c.stopFollow();const v=B.visuals.get('red-fortress-gate');c.centerOn(v.x,v.y-50);await frames(12);return gateBox();});
 const a=await setup(page),b=await setup(refPage);
 // the label is the container's widest child, so the bounds grow by exactly the longer name, and by nothing else
 check(a.bounds[1]===b.bounds[1]&&a.bounds[3]===b.bounds[3]&&Math.abs((a.bounds[2]-b.bounds[2])-(a.labelW-b.labelW))<.01&&Math.abs(a.bounds[0]+a.bounds[2]/2-(b.bounds[0]+b.bounds[2]/2))<.01,'gate Hero pick bounds as the reference, wider only by the longer label',{now:a.bounds,ref:b.bounds,labelW:[a.labelW,b.labelW]});
 check(JSON.stringify(a.bar)===JSON.stringify(b.bar)&&a.high&&b.high,'gate HP bar identical (its high-depth bar)',{now:a.bar,ref:b.bar});
 check(a.label==='THRONE GATE'&&b.label==='CLIFF GATE'&&JSON.stringify(a.labelAt)===JSON.stringify(b.labelAt),'world label: THRONE GATE (was CLIFF GATE), same place',{now:a.label,ref:b.label});
 const crop=async p=>p.evaluate(()=>{const v=B.visuals.get('red-fortress-gate'),c=B.cameras.main;return {x:v.x-c.scrollX-40,y:v.y-c.scrollY-140,width:80,height:150};});
 const box=await crop(page),pa=await page.screenshot({clip:box}),pb=await refPage.screenshot({clip:await crop(refPage)});
 const diff=await page.evaluate(async([a,b])=>{const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/png;base64,'+s;});const [x,y]=await Promise.all([load(a),load(b)]);
  const c=document.createElement('canvas');c.width=x.width;c.height=x.height;const g=c.getContext('2d');g.drawImage(x,0,0);const A=g.getImageData(0,0,c.width,c.height).data;g.clearRect(0,0,c.width,c.height);g.drawImage(y,0,0);const Bd=g.getImageData(0,0,c.width,c.height).data;
  let s=0,big=0;for(let i=0;i<A.length;i+=4){const d=(Math.abs(A[i]-Bd[i])+Math.abs(A[i+1]-Bd[i+1])+Math.abs(A[i+2]-Bd[i+2]))/3;s+=d;if(d>40)big++;}return {mean:+(s/(A.length/4)).toFixed(2),big,px:A.length/4};},[pa.toString('base64'),pb.toString('base64')]);
 check(diff.mean<2&&diff.big/diff.px<.01,'intact Throne Gate looks as on the reference build (screen crop)',diff);
 if(shots){writeFileSync(`${shots}/gate-now.png`,pa);writeFileSync(`${shots}/gate-ref.png`,pb);}
 // a tap on the gate inspects it as the Throne Gate; the inspector keeps that name
 const r=await page.evaluate(async()=>{const v=B.visuals.get('red-fortress-gate'),cam=B.cameras.main,rect=B.game.canvas.getBoundingClientRect(),k=rect.height/540;return {k,left:rect.left,top:rect.top,sx:cam.scrollX,sy:cam.scrollY,vx:v.x,vy:v.y};});
 const at=async(dx,dy)=>{await page.evaluate(()=>{B.inspected=undefined;});await page.mouse.click(r.left+(r.vx+dx-r.sx)*r.k,r.top+(r.vy+dy-r.sy)*r.k);await page.evaluate(()=>frames(3));return page.evaluate(()=>B.inspected?.name);};
 const top=await at(0,-110),mid=await at(-10,-50),insp=await page.evaluate(async()=>{await frames(40);return H.inspector?.text;}),outside=await at(-33,-60);
 check(top==='Throne Gate'&&mid==='Throne Gate','a tap on the gate (top or middle) inspects the Throne Gate',{top,mid});
 check(outside===undefined,'a tap just outside the still\'s rectangle does not',outside);
 check(/^Throne Gate\n/.test(insp??''),'the inspect panel names the Throne Gate',insp);
}
// 3. Row depths: each row at its base, the front row at the container's depth, the back row above the terrain wall north of the gate; a Crimson unit
// standing between two rows draws between them.
{
 const r=await page.evaluate(async()=>{clearField();const g=S.state.structures['red-fortress-gate'],w=B.walls.get('red-fortress-gate'),v=B.visuals.get('red-fortress-gate');
  dummy('red-mid','minion-red',g.x,g.y-20);await frames(4);const d=B.visuals.get('red-mid').depth;const out={rows:w.rows.map(r=>+r.depth.toFixed(2)),container:v.depth,unit:d,terrain:(g.y-g.rows*24)*0.72};delete S.state.units['red-mid'];return out;});
 check(r.rows[0]<r.rows[1]&&r.rows[1]<r.rows[2]&&r.rows[2]===r.container,'rows depth-sorted north to south, the front row at the container\'s depth',r);
 check(r.rows[0]>r.terrain,'the back row draws over the terrain wall it closes',r);
 check(r.unit>r.rows[1]&&r.unit<r.rows[2],'a unit between two rows draws between them',r);
}
// 4. Damage states on every row, and their restore (the C4M4 conversion path).
{
 const r=await page.evaluate(async()=>{clearField();const g=S.state.structures['red-fortress-gate'],w=B.walls.get('red-fortress-gate'),out=[];
  for(let i=0;i<200&&w.frames.join('')!=='000';i++)await frames(1); // a row still open from the last check closes first
  for(const f of [1,.67,.65,.34,.32,.65,1]){g.hp=g.maxHp*f;await frames(3);out.push(w.frames.join(''));}g.hp=g.maxHp;await frames(2);return out;});
 check(JSON.stringify(r)===JSON.stringify(['000','000','111','111','222','111','000']),'damaged below 66%, badly damaged below 33% on all rows, and back on repair',r);
}
// 5. Opening: a Crimson unit at a row opens it (ajar, then open); it closes holdMs after the unit leaves (ajar, then closed); two units open two rows;
// the Guardian, an Azure soldier and the War Cart never open it; pause freezes it.
{
 const r=await page.evaluate(async([WF,M])=>{clearField();const g=S.state.structures['red-fortress-gate'],w=B.walls.get('red-fortress-gate');const rec=[];
  const watch=async n=>{for(let i=0;i<n;i++){await frames(1);rec.push({ms:B.simMs(),f:w.frames.join('')});}};
  const v=B.visuals.get('red-fortress-gate'),base=w.rows.map(r=>g.y+(r.y-v.y)/0.72); // each row's base in world y
  dummy('red-a','minion-red',g.x+30,base[2]-20);await watch(25);delete S.state.units['red-a'];const left=B.simMs();await watch(45);
  const single=rec.slice();rec.length=0;
  dummy('red-b','minion-red',g.x+50,base[0]-30);dummy('red-c','minion-red',g.x+30,base[2]-20);await watch(20);const two=w.frames.join('');delete S.state.units['red-b'];delete S.state.units['red-c'];await watch(45);
  rec.length=0;S.hero.x=g.x-34;S.hero.y=g.y-30;dummy('blue-s','minion-blue',g.x-36,g.y+10);dummy('blue-c-1','minion-blue',g.x-40,g.y+40,{cart:{follow:300,order:['red-fortress-gate']}});await watch(30);
  const azure=[...new Set(rec.map(x=>x.f))];for(const id of ['blue-s','blue-c-1'])delete S.state.units[id];S.hero.x=300;S.hero.y=1000;
  // pause: open, the unit leaves, pause at once; nothing changes while paused
  dummy('red-d','minion-red',g.x+30,base[2]-20);await watch(15);delete S.state.units['red-d'];H.setPause(true);await frames(3);const p0=[w.frames.join(''),B.simMs()];await frames(60);const p1=[w.frames.join(''),B.simMs()];H.setPause(false);await watch(45);
  return {single,left,two,azure,p0,p1,end:w.frames.join('')};},[WF,M]);
 const s=r.single,first=s.findIndex(x=>x.f!=='000'),open=s.findIndex(x=>x.f==='006'),after=s.filter(x=>x.ms>=r.left),closingAt=after.find(x=>x.f==='005'),closedAt=after.find(x=>x.f==='000');
 const dt=Math.max(...s.slice(1).map((x,i)=>x.ms-s[i].ms));
 check(first>=0&&s[first].f==='005'&&open>first&&s[open].ms-s[first].ms>=M.ajarMs-dt&&s[open].ms-s[first].ms<=M.ajarMs+dt,'a Crimson unit opens the rows that cover it: ajar, then open after ~100 ms',{first:s[first]?.f,ajarMs:open>first?Math.round(s[open].ms-s[first].ms):null,frameMs:Math.round(dt)});
 check(closingAt&&closedAt&&closingAt.ms-r.left>=M.holdMs-dt&&closingAt.ms-r.left<=M.holdMs+dt&&closedAt.ms-r.left<=M.holdMs+M.ajarMs+dt,'it closes 300 ms after the unit leaves (ajar, then closed)',{ajar:closingAt&&Math.round(closingAt.ms-r.left),closed:closedAt&&Math.round(closedAt.ms-r.left)});
 check(r.two==='606','two Crimson units at the north and south rows open those two rows only',r.two);
 check(JSON.stringify(r.azure)==='["000"]','the Guardian, an Azure soldier and the War Cart at the gate never open it',r.azure);
 check(r.p0[0]===r.p1[0]&&r.p0[1]===r.p1[1]&&r.p0[0]!=='000'&&r.end==='000','pause freezes the opening; it closes after resume',{p0:r.p0,p1:r.p1,end:r.end});
}
// 6. Live waves: real Crimson minions walking through the gate open the rows they cross, and every row is closed again once they have passed.
{
 const r=await page.evaluate(async()=>{clearField();const g=S.state.structures['red-fortress-gate'],w=B.walls.get('red-fortress-gate');
  const near=()=>Object.values(S.state.units).filter(u=>u.team==='red'&&u.hp>0&&Math.abs(u.x-g.x)<120&&Math.abs(u.y-g.y)<130).length;
  // run the simulation fast until a wave reaches the gate, then watch it pass at game speed
  S.encounter=S.setup.encounter;B.scene.pause();for(let i=0;i<3000&&near()===0;i++){S.advance(1000/30);S.drainEvents();}B.scene.resume();
  const seen=new Set();let opened=0,maxRows=0;for(let i=0;i<900;i++){await frames(1);const f=w.frames.join('');seen.add(f);const n=[...f].filter(c=>c!=='0').length;maxRows=Math.max(maxRows,n);if(n)opened++;if(i>60&&near()===0&&f==='000')break;}
  S.encounter={...S.encounter,waves:[],continuous:false};clearField();return {seen:[...seen],opened,maxRows,end:w.frames.join(''),near:near()};});
 check(r.opened>0&&r.seen.some(f=>f.includes('6')),'a live wave walking through opens the gate rows it crosses',r);
 check(r.end==='000','every row is closed again once the wave has passed',r);
}
// 7. Construction: a built wall shows the intact segment with the container's fade-in while it is built.
{
 const r=await page.evaluate(async()=>{clearField();const t=S.clock.tick;wall('built-con',900,600,{startTick:t,completeTick:t+60,progress:1/60,hp:400/60,constructionDamage:0});const out=[];
  for(let i=0;i<30;i++){await frames(2);const w=B.walls.get('built-con'),v=B.visuals.get('built-con'),b=S.state.structures['built-con'];if(w)out.push([w.frames[0],+w.rows[0].alpha.toFixed(2),+v.alpha.toFixed(2),+(b.hp/b.maxHp).toFixed(2)]);}delete S.state.structures['built-con'];return out;});
 check(r.length&&r.every(x=>x[0]===WF.intact&&x[1]===x[2]),'while built: intact segment, faded with the container',r.slice(0,3));
 check(r.some(x=>x[3]<.33)&&r.at(-1)[1]>r[0][1],'its hp starts low (it would read as badly damaged) and the fade rises',{first:r[0],last:r.at(-1)});
}
// 8. The gate falls: rows break from the north, 80 ms apart, lie as rubble, and are gone by 2 s with nothing left; the Last Stand Elites and the Crimson
// Lord come; the toast names the Throne Gate. A built wall collapses too.
{
 const r=await page.evaluate(async()=>{clearField();const g=S.state.structures['red-fortress-gate'],w=B.walls.get('red-fortress-gate'),at=w.rows.map(r=>[r.x,r.y,r.depth]);const toasts=[];
  const tell=H.tell.bind(H);H.tell=(m,...a)=>{toasts.push(m);return tell(m,...a);};
  wall('built-w2',900,600);await frames(4);
  S.hit(S.hero,g,1e6,'direct');S.hit(S.state.structures['c5-north-a'],S.state.structures['built-w2'],1e6,'direct');
  const seq=[];let deathMs;for(let i=0;i<400;i++){await frames(1);const c=B.wallCollapses;if(deathMs===undefined&&c.length)deathMs=B.simMs();if(deathMs!==undefined)seq.push({ms:B.simMs()-deathMs,f:c.map(x=>x.frame+':'+x.index),pos:c.map(x=>[x.art.x,x.art.y,x.art.depth]),al:c.map(x=>+x.art.alpha.toFixed(2))});if(deathMs!==undefined&&!c.length)break;}
  await frames(30);for(let i=0;i<120&&!S.state.units['red-hero'];i++)await frames(2);
  const left=B.children.list.filter(o=>o.type==='Image'&&o.texture?.key?.startsWith('wall-')).length;
  return {at,seq,gone:!B.visuals.has('red-fortress-gate')&&!B.walls.has('red-fortress-gate')&&!B.walls.has('built-w2'),left,lord:!!S.state.units['red-hero'],elites:Object.values(S.state.units).filter(u=>u.archetype==='crimson-elite'&&u.hp>0).length,toasts};});
 const s=r.seq,first=s[0],gate=x=>x.f.slice(0,3);
 check(first&&first.f.length===4,'the gate collapses in its 3 rows and the built wall in its 1',first);
 const breakAt=i=>s.find(x=>x.f[i]===`${WF.breaking}:${i}`)?.ms,rubAt=i=>s.find(x=>x.f[i]===`${WF.rubble}:${i}`)?.ms,b=[0,1,2].map(breakAt),u=[0,1,2].map(rubAt);
 const fdt=Math.max(...s.slice(1).map((x,i)=>x.ms-s[i].ms));
 check(b.every(x=>x!==undefined)&&b[0]===0&&b[0]<=b[1]&&b[1]<=b[2]&&Math.abs(b[2]-b[0]-2*M.stagger)<=fdt,'rows break from the north (the first on the death update), 80 ms apart: the last 160 ms after the first, within one frame',{breakMs:b.map(Math.round),frameMs:Math.round(fdt)});
 check(u.every((x,i)=>x!==undefined&&x-b[i]>=M.breakMs-fdt&&x-b[i]<=M.breakMs+fdt),'each row breaks, then lies as rubble',u.map(Math.round));
 check(first&&first.pos.slice(0,3).every((p,i)=>Math.abs(p[0]-r.at[i][0])<.5&&Math.abs(p[1]-r.at[i][1])<.5&&p[2]===r.at[i][2]),'each row collapses where it stood, at its depth',{pos:first?.pos,at:r.at});
 const end=s.at(-1).ms;check(s.at(-1).f.length===0&&end<=M.collapseEnd+60&&s.some(x=>x.al.some(a=>a<1&&a>0)),'the rubble fades and is gone by 2 s',{endMs:Math.round(end)});
 check(r.gone&&r.left===0,'nothing is left: no visual, no segment, no rubble image',{gone:r.gone,left:r.left});
 check(r.lord&&r.elites===3,'the fallen Throne Gate still releases the Crimson Lord and the 3 Last Stand Elites',{lord:r.lord,elites:r.elites});
 check(r.toasts.some(t=>/^The Throne Gate has fallen/.test(t)),'the toast names the Throne Gate',r.toasts);
}
check(errors.length===0,'no page errors',errors.slice(0,5));
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

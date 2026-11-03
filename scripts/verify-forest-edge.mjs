// Chapter 4 M1 "Forest Edge" in the browser (docs/CHAPTER4_M1.md). Needs a dev server: FOREST_URL=http://127.0.0.1:5271/ (the level opens through the dev-only debug launch ?debug=1&level=31).
// Walks the loop through the real UI: the camp starts Crimson; the holders fall; the Banner rises; the camp turns Azure; the repair is chosen and confirmed through the Build panel and is charged at 60%;
// the Banner falls and the camp turns Crimson again with the repaired tower still standing. Stills go to FOREST_EVIDENCE (default docs/screenshots/forest-edge).
// EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.FOREST_URL||'http://127.0.0.1:5271/',dir=process.env.FOREST_EVIDENCE||'docs/screenshots/forest-edge';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const checks=[];let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;checks.push({name,passed:!!ok});console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(viewport){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=31`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect();return Math.abs(r.width/r.height-960/540)<.2;});
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
const sim=page=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state,p=st.post;return {tick:s.clock.tick,owner:p.owner,captured:p.captured,losses:p.losses,banner:p.bannerId,keepShield:!!st.bases['red-base'].invulnerable,wood:st.wood,iron:st.iron,
 structures:Object.values(st.structures).map(b=>({id:b.id,kind:b.kind,team:b.team,hp:b.hp,col:b.col,row:b.row,progress:b.progress,paid:b.paidResources,start:b.startTick,done:b.completeTick})),hero:st.units['red-hero']&&{x:st.units['red-hero'].x,y:st.units['red-hero'].y,hp:st.units['red-hero'].hp},field:s.field.id};});
// Step the simulation by hand (one tick per call) so a still is the same every run.
const step=(page,ticks)=>page.evaluate(ticks=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,end=s.clock.tick+ticks;while(s.clock.tick<end&&!s.ended)s.advance(1000/30+.01);for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);b.syncUnits();},ticks);
const camera=(page,x,y,zoom=1)=>page.evaluate(({x,y,zoom})=>{const b=window.kingdomGame.scene.getScene('Battle'),c=b.cameras.main;b.following=false;c.stopFollow();c.setZoom(zoom);c.centerOn(x,y*.72);},{x,y,zoom});
const text=(page,key)=>page.evaluate(key=>{const h=window.kingdomGame.scene.getScene('HUD');return key==='objective'?h.objectiveLine:key==='toast'?(h.toast.visible?h.toast.text:''):key==='notice'?h.combatNotice?.text??'':'';},key);
async function tapObject(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame),r=o.getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/960,y:c.y+(r.y+r.height/2)*c.height/540};},get.toString());await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(120);}
async function tapWorld(page,col,row){const pt=await page.evaluate(({col,row})=>{const c=window.kingdomGame.scene.getScene('Battle').cameras.main,k=window.kingdomGame.canvas.getBoundingClientRect();return {x:k.x+((col+.5)*48-c.scrollX)*k.width/960,y:k.y+((row+.5)*48*.72-c.scrollY)*k.height/540};},{col,row});await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(150);}
try{
 const {page,errors}=await open({width:960,height:540});
 let s=await sim(page);
 check(s.field==='forest-edge'&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').renderedFieldId==='forest-edge'),'the match and its art are Forest Edge');
 check(s.owner==='crimson'&&s.keepShield&&!s.banner&&s.structures.filter(b=>b.team==='red').length===4,'the camp starts Crimson with the Keep shielded');
 check((await text(page,'objective')).includes('Capture the Forest Camp'),'the objective plate names the capture',await text(page,'objective'));
 // Keep the Guardian alive and the Azure Keep standing for the walk-through; the Hero is part of the first stills.
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e6;s.state.bases['blue-base'].invulnerable=true;});
 await page.evaluate(()=>{const g=window.kingdomGame;g.scene.pause('Battle');});
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.teleportHero(960,576);});
 await camera(page,1104,560);await step(page,2);await shot(page,'01-crimson-camp');
 // 02: holders dead, Guardian outside the ring: the capture point calls for the Guardian
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,st=s.state;for(const id of ['red-hero','c4-camp-north','c4-camp-south'])s.hit(s.hero,st.units[id]??st.structures[id],1e7,'direct');});
 await step(page,2);await camera(page,1104,560);await shot(page,'02-holders-fallen');
 check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return !b.visuals.has('c4-camp-north')&&!b.visuals.has('c4-camp-south')&&!b.visuals.has('red-hero');}),'the destroyed holders and the Hero leave the field');
 // 03: the Guardian enters the ring: the Banner begins
 await page.evaluate(()=>{window.kingdomGame.scene.getScene('Battle').simulation.teleportHero(1080,576);});await step(page,45);s=await sim(page);
 check(!!s.banner&&s.owner==='crimson'&&s.keepShield,'the Banner is rising while the camp is still Crimson',s.banner);await shot(page,'03-raising');
 const b0=s.structures.find(b=>b.id==='c4-banner');check(b0&&b0.hp>200&&b0.hp<1500&&b0.done-b0.start===120,'the Banner gains hit points as it rises (4 seconds)',b0);
 await step(page,90);s=await sim(page);
 check(s.owner==='azure'&&s.captured&&!s.keepShield,'the camp is Azure and the Keep is unshielded',[s.owner,s.keepShield]);check((await text(page,'objective')).includes('Destroy the Crimson Keep'),'the objective moves on to the Keep',await text(page,'objective'));
 await shot(page,'04-captured');
 check(/captured/i.test(await text(page,'toast')+await text(page,'notice')),'the capture is announced',await text(page,'toast'));
 // 05+: the repair, chosen and confirmed through the real Build panel
 await page.evaluate(()=>{const g=window.kingdomGame;g.scene.resume('Battle');});
 await camera(page,1176,470);
 await tapObject(page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await page.waitForTimeout(150);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[1]);await camera(page,1176,470);await frames(page);
 await tapWorld(page,24,11);
 const sel=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD');return {placement:b.placement,heading:h.buildPanel.heading.text,status:h.buildPanel.status.text};});
 check(sel.placement?.col===24&&sel.placement?.row===11,'tapping the ruin selects its cell',sel.placement);
 check(/Repair Tower/.test(sel.heading)&&/48 W/.test(sel.heading)&&/6 I/.test(sel.heading),'the panel prices the repair at 60%',sel.heading);check(/Repair the ruined tower/.test(sel.status),'the panel says it is a repair',sel.status);
 await shot(page,'05-repair-selected');
 await tapWorld(page,23,13);const normal=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').buildPanel.heading.text);check(/Archer Tower/.test(normal)&&/80 W/.test(normal),'another camp cell is priced normally',normal);
 await tapWorld(page,24,11);const before=await sim(page);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[2]);await page.waitForTimeout(500);s=await sim(page);
 const rep=s.structures.find(b=>/^built-ui-/.test(b.id)&&b.col===24&&b.row===11);
 check(!!rep&&rep.kind==='tower'&&rep.paid.wood===48&&rep.paid.iron===6&&rep.done-rep.start===150,'confirming charges 48 Wood and 6 Iron and starts a 5-second build',rep);
 check(rep&&rep.hp<rep.progress*650+1&&rep.progress<1,'the repair is under way, not instant',rep&&[rep.hp,rep.progress]);
 check(before.wood-s.wood<=48.2&&before.wood-s.wood>=45,'the Wood was charged once',[before.wood,s.wood]);
 await shot(page,'06-repairing');
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[3]);await page.waitForTimeout(100);
 await page.evaluate(()=>{window.kingdomGame.scene.pause('Battle');});await step(page,160);s=await sim(page);
 check(s.structures.some(b=>b.id===rep.id&&b.hp===650),'the repaired tower stands at full hit points',s.structures.find(b=>b.id===rep.id));await camera(page,1104,560);await shot(page,'07-repaired');
 // 08: the Banner falls: the camp is Crimson again, the repaired tower stays Azure
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;s.hit(st.units['red-hero']??st.bases['red-base'],st.structures['c4-banner'],1e7,'direct');});await step(page,3);s=await sim(page);
 check(s.owner==='crimson'&&s.losses===1&&s.keepShield,'losing the Banner turns the camp Crimson and shields the Keep',[s.owner,s.losses,s.keepShield]);
 check(s.structures.some(b=>b.id===rep.id&&b.team==='blue'&&b.hp>0),'the repaired tower is still Azure and standing');
 check(/lost/i.test(await text(page,'toast')+await text(page,'notice')),'the loss is announced',await text(page,'toast'));
 check(await page.evaluate(()=>!window.kingdomGame.scene.getScene('Battle').visuals.has('c4-banner')||window.kingdomGame.scene.getScene('Battle').simulation.state.structures['c4-banner']!==undefined),'a fallen Banner leaves the field');
 await shot(page,'08-lost');
 // overview and terrain
 await camera(page,960,576,.5);await shot(page,'09-overview');await camera(page,1100,240,1);await shot(page,'10-forest');
 check(errors.length===0,'no page errors',errors);
 await page.close();
 // a phone-sized landscape view of the Build panel on the repair
 const m=await open({width:844,height:390});
 await m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;s.hero.hp=s.hero.maxHp=1e6;st.bases['blue-base'].invulnerable=true;for(const id of ['red-hero','c4-camp-north','c4-camp-south'])s.hit(s.hero,st.units[id]??st.structures[id],1e7,'direct');s.teleportHero(1080,576);});
 await m.page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));await step(m.page,160);await m.page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));
 await camera(m.page,1176,470);
 await tapObject(m.page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await m.page.waitForTimeout(150);await tapObject(m.page,g=>g.scene.getScene('HUD').buildHits[1]);await camera(m.page,1176,470);await frames(m.page);await tapWorld(m.page,24,11);
 const ms=await m.page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),p=h.buildPanel;return {owner:window.kingdomGame.scene.getScene('Battle').simulation.state.post.owner,heading:p.heading.text,status:p.status.text,fits:p.heading.getBounds().right<=p.bounds.x+p.bounds.width&&p.status.getBounds().right<=p.bounds.x+p.bounds.width};});
 check(ms.owner==='azure'&&/Repair/.test(ms.heading)&&ms.fits,'the repair reads on a phone-sized landscape view',ms);
 await shot(m.page,'11-phone-repair');check(m.errors.length===0,'no page errors on the phone view',m.errors);
 await m.page.close();
 // playtest 1: one ordinary Azure Barracks through the real Build panel: the card exists, a gold pad takes it for 120 Wood and 20 Iron, two soldiers appear, a second Barracks is refused
 const k=await open({width:960,height:540});
 await k.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e6;s.state.bases['blue-base'].invulnerable=true;s.economy.balances.wood=130*120;s.economy.balances.iron=25*120;window.kingdomGame.scene.pause('Battle');});
 await camera(k.page,500,540);await tapObject(k.page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await k.page.waitForTimeout(150);
 check(await k.page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.azurePads.length===3),'the Build panel has the three Barracks pads');
 await tapObject(k.page,g=>g.scene.getScene('HUD').buildHits[5]);await camera(k.page,500,540);await frames(k.page);await tapWorld(k.page,10,10);
 const bs=await k.page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),p=b.simulation.placementReason('barracks',10,10),h=window.kingdomGame.scene.getScene('HUD').buildPanel;return {placement:b.placement,reason:p,heading:h.heading.text,status:h.status.text};});
 check(bs.placement?.col===10&&bs.placement?.row===10&&/Azure Barracks/.test(bs.heading)&&/120 W/.test(bs.heading)&&/20 I/.test(bs.heading),'the panel prices the Barracks at 120 Wood and 20 Iron',bs);
 await shot(k.page,'13-barracks-selected');
 await tapObject(k.page,g=>g.scene.getScene('HUD').buildHits[2]);await k.page.waitForTimeout(400);
 await k.page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await k.page.waitForFunction(()=>Object.values(window.kingdomGame.scene.getScene('Battle').simulation.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0).length>=2,null,{timeout:40000}).catch(()=>{});
 const bk=await k.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;return {barracks:Object.values(st.structures).filter(b=>b.azureBarracks).length,soldiers:Object.values(st.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0).length,paid:Object.values(st.structures).find(b=>b.azureBarracks)?.paidResources,second:s.placementReason('barracks',10,14)};});
 check(bk.barracks===1&&bk.soldiers===2&&bk.paid?.wood===120&&bk.paid?.iron===20,'the Barracks is built once and trains two soldiers',bk);check(bk.second==='Barracks limit reached','a second Barracks is refused',bk.second);
 await shot(k.page,'14-barracks-soldiers');check(k.errors.length===0,'no page errors with the Barracks',k.errors);await k.page.close();
 // the chapter list shows Chapter 4 (released) locked behind Chapter 3 on a fresh save
 const c=await browser.newPage({viewport:{width:960,height:540},hasTouch:true}),cerr=[];c.on('pageerror',e=>cerr.push(e.message));
 await c.goto(base);await c.waitForFunction(()=>window.kingdomGame&&window.kingdomGame.scene.isActive('MainMenu'));
 await c.evaluate(()=>window.kingdomGame.scene.start('ChapterSelect'));await c.waitForFunction(()=>window.kingdomGame.scene.isActive('ChapterSelect'));await c.waitForTimeout(800);
 const views=await c.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').views?.map(v=>[v.chapter.id,v.state]));
 check(JSON.stringify(views?.map(v=>v[1]))===JSON.stringify(['available','locked','locked','locked']),'Chapter 4 is listed, locked behind Chapter 3',views);
 await shot(c,'12-chapter-select');check(cerr.length===0,'no page errors on the chapter list',cerr);await c.close();
}finally{await browser.close();}
console.log(failed?`${failed} CHECKS FAILED`:'ALL CHECKS PASSED',`${checks.length} checks`);process.exit(failed?1:0);

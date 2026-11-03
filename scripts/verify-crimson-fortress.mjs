// Chapter 4 M6 "Crimson Fortress" in the browser (docs/CHAPTER4_M6.md). Needs a dev server: FORTRESS_URL=http://127.0.0.1:5361/ (the level opens through the dev-only debug launch ?debug=1&level=36).
// Walks the mission through the real scene: the fortress map and its art, two Crimson outposts and an open Keep, the South Outpost captured and its ruined Barracks repaired through the Build panel,
// the Iron Marshal's and the Shadowblade's announced attacks down their own roads, a fallen Commander's return time, the Last Stand, and a phone-sized landscape view.
// Stills go to FORTRESS_EVIDENCE (default docs/screenshots/crimson-fortress). EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.FORTRESS_URL||'http://127.0.0.1:5361/',dir=process.env.FORTRESS_EVIDENCE||'docs/screenshots/crimson-fortress';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(viewport,query='level=36'){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&${query}`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect();return Math.abs(r.width/r.height-960/540)<.2;});
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
const sim=page=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;return {tick:s.clock.tick,camps:st.posts.map(p=>[p.id,p.owner]),keepShield:!!st.bases['red-base'].invulnerable,
 structures:Object.values(st.structures).map(b=>({id:b.id,kind:b.kind,team:b.team,hp:b.hp,col:b.col,row:b.row,azureBarracks:!!b.azureBarracks})),field:s.field.id,
 commanders:['red-marshal','red-shadowblade'].map(id=>st.units[id]).filter(u=>u?.hp>0).map(u=>({id:u.id,x:Math.round(u.x),y:Math.round(u.y),lane:u.commander.lane,target:u.targetId})),
 escorts:Object.values(st.units).filter(u=>u.escortOf&&u.hp>0).length,elites:Object.keys(st.units).filter(id=>/^red-g\d/.test(id)).length,wood:Math.floor(s.economy.woodUnits/120),iron:Math.floor(s.economy.ironUnits/120)};});
// Step the simulation by hand (one tick per call) so a still is the same every run; events go to the HUD as the real loop sends them. Ordinary waves are cleared so the Commanders' roads stay readable.
const step=(page,ticks,clear=true)=>page.evaluate(({ticks,clear})=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,end=s.clock.tick+ticks,trail=window.trail??=[];while(s.clock.tick<end&&!s.ended){s.hero.hp=s.hero.maxHp=1e6;
  if(clear)for(const [id,u] of Object.entries(s.state.units))if(/^(red-w|blue-w|blue-\d)/.test(id))delete s.state.units[id];
  s.advance(1000/30+.01);for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);
  for(const id of ['red-marshal','red-shadowblade']){const u=s.state.units[id];if(u)trail.push({id,x:u.x,y:u.y});}}
 b.syncUnits?.();},{ticks,clear});
const camera=(page,x,y,zoom=1)=>page.evaluate(({x,y,zoom})=>{const b=window.kingdomGame.scene.getScene('Battle'),c=b.cameras.main;b.following=false;c.stopFollow();c.setZoom(zoom);c.centerOn(x,y*.72);},{x,y,zoom});
const toast=page=>page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.toast.visible?h.toast.text:'';});
async function tapObject(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame),r=o.getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/960,y:c.y+(r.y+r.height/2)*c.height/540};},get.toString());await page.touchscreen.tap(pt.x,pt.y);}
async function tapWorld(page,col,row){const pt=await page.evaluate(({col,row})=>{const c=window.kingdomGame.scene.getScene('Battle').cameras.main,k=window.kingdomGame.canvas.getBoundingClientRect(),z=c.zoom,v={x:(col+.5)*48,y:(row+.5)*48*.72};return {x:k.x+((v.x-c.worldView.x)*z)*k.width/960,y:k.y+((v.y-c.worldView.y)*z)*k.height/540};},{col,row});await page.touchscreen.tap(pt.x,pt.y);}
// Capture an outpost through the simulation: its holders die, the Guardian stands beside the flag, and the real update raises the Banner.
const capture=(page,holders,flag)=>page.evaluate(({holders,flag})=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;for(const id of holders){const t=st.structures[id];if(t)s.hit(s.hero,t,1e7,'direct');}s.teleportHero(flag[0],flag[1]+(flag[1]<600?60:-60));},{holders,flag});
const labels=page=>page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').postTexts.filter(t=>t.visible).map(t=>t.text));
const nameplate=(page,id)=>page.evaluate(id=>{const v=window.kingdomGame.scene.getScene('Battle').visuals.get(id);if(!v)return null;const img=v.list.find(o=>o.type==='Image'),txt=v.list.find(o=>o.type==='Text'&&/[A-Z]{4}/.test(o.text));return {texture:img?.texture.key,height:Math.round(img?.displayHeight??0),label:txt?.text};},id);
try{
 const {page,errors}=await open({width:960,height:540});
 await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),tell=h.tell.bind(h);window.told=[];h.tell=(m,...a)=>{window.told.push(m);return tell(m,...a);};});
 let s=await sim(page);
 check(s.field==='crimson-fortress'&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').renderedFieldId==='crimson-fortress'),'the match and its art are Crimson Fortress');
 check(JSON.stringify(s.camps)===JSON.stringify([['north','crimson'],['south','crimson']])&&!s.keepShield,'two Crimson outposts and no Keep shield',s.camps);
 check(s.structures.filter(b=>b.team==='red'&&b.kind==='tower').length===6&&s.structures.some(b=>b.id==='red-fortress-gate')&&s.structures.filter(b=>b.azureBarracks).length===1,'six Crimson towers, the Fortress Gate and one Azure Barracks');
 const plateText=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.objectiveShown??h.objectiveLine??'';});
 check(/Crimson Keep/.test(plateText),'the objective is the Crimson Keep',plateText);
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e8;window.kingdomGame.scene.pause('Battle');s.teleportHero(600,600);});
 await camera(page,960,576,.5);await step(page,2);await shot(page,'01-overview');
 let l=await labels(page);check(l.includes('NORTH OUTPOST · CRIMSON')&&l.includes('SOUTH OUTPOST · CRIMSON')&&l.includes('RUINED BARRACKS'),'each outpost is labelled and the ruined Barracks is marked',l);
 // the South Outpost: the notice offers the ruined Barracks, which repairs at 48 Wood and 8 Iron through the Build panel
 await capture(page,['c6-south-a','c6-south-b'],[1032,888]);await step(page,125);s=await sim(page);
 check(s.camps[1][1]==='azure','the South Outpost is Azure');
 check((await page.evaluate(()=>window.told)).some(m=>m.startsWith('South Outpost captured · build here and repair the ruined Barracks')),'the capture notice offers the ruined Barracks',await page.evaluate(()=>window.told.slice(-3)));
 l=await labels(page);check(l.includes('REPAIR BARRACKS · 48W 8I · 5s'),'the ruin offers its repair price',l);
 await camera(page,1008,888,1.2);await step(page,1);await shot(page,'02-south-outpost-captured');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.placementReason('tower',19,19))==='Ruined Barracks: repair it with a Barracks','a tower cannot take the ruined Barracks cell');
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.economy.balances.wood=200*120;s.economy.balances.iron=40*120;s.teleportHero(860,900);window.kingdomGame.scene.resume('Battle');});
 await camera(page,960,900,1);
 await tapObject(page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await page.waitForTimeout(150);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[5]);await page.waitForTimeout(300);await frames(page);await tapWorld(page,19,19);await page.waitForTimeout(150);
 const sel=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').placement);
 const heading=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').buildPanel?.heading?.text??'');
 check(sel?.kind==='barracks'&&sel.col===19&&sel.row===19,'tapping the ruin selects it for a Barracks',sel);
 check(/Repair Barracks/.test(heading)&&/48/.test(heading)&&/8/.test(heading),'the Build panel names the repair and its price',heading);
 await shot(page,'03-ruin-selected');
 const before=await sim(page);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[2]);await page.waitForTimeout(400);
 await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));s=await sim(page);
 check(s.structures.some(b=>b.azureBarracks&&b.col===19&&b.row===19),'confirming repairs the Barracks on the ruin',s.structures.filter(b=>b.azureBarracks));
 check(before.wood-s.wood>=47&&before.wood-s.wood<=49&&before.iron-s.iron===8,'the repair charged 48 Wood and 8 Iron',{wood:before.wood-s.wood,iron:before.iron-s.iron});
 await tapObject(page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await page.waitForTimeout(150);
 await step(page,160);await camera(page,960,900,1.2);await shot(page,'04-ruin-repaired');
 // the Iron Marshal (warned at 84 s, out at 90 s on the Siege Road with three escorts), then the Shadowblade (warned at 129 s) on the other road
 await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.teleportHero(450,600));
 let t=(await sim(page)).tick;await step(page,84*30-t+2);
 check((await page.evaluate(()=>window.told)).some(m=>m.startsWith('Iron Marshal marches down the Siege Road')),'the Marshal\'s attack is announced with his road',await page.evaluate(()=>window.told.slice(-2)));
 await step(page,6*30+5);s=await sim(page);const m=s.commanders.find(c=>c.id==='red-marshal');
 check(m&&m.lane==='north'&&Math.hypot(m.x-1320,m.y-264)<40&&s.escorts===3,'the Marshal takes the field at the Siege Road spawn with three escorts',{m,escorts:s.escorts});
 const mp=await nameplate(page,'red-marshal');check(mp?.texture==='crimson-warlord'&&mp.label==='IRON MARSHAL','the Marshal is the large armoured sprite with his name',mp);
 await camera(page,1250,280,1.4);await shot(page,'05-marshal-out');
 t=(await sim(page)).tick;await step(page,129*30-t+2);
 const sbTold=(await page.evaluate(()=>window.told)).find(m=>m.startsWith('Shadowblade strikes'));
 check(/Shadowblade strikes from the Shadow Trail · it hunts your (South Outpost )?Barracks/.test(sbTold??''),'the Shadowblade\'s attack is announced with its road and target',sbTold);
 await step(page,6*30+5);s=await sim(page);const sb=s.commanders.find(c=>c.id==='red-shadowblade');
 check(sb&&sb.lane==='south'&&Math.hypot(sb.x-1320,sb.y-936)<60,'the Shadowblade takes the field on the Shadow Trail',sb);
 const sp=await nameplate(page,'red-shadowblade');check(sp?.texture==='minion-red-shadowblade'&&sp.label==='SHADOWBLADE'&&sp.height<mp.height*.7,'the Shadowblade is a lean violet figure, far smaller than the Marshal',{sp,mp});
 await camera(page,1250,900,1.4);await shot(page,'06-shadowblade-out');
 await step(page,8*30);await camera(page,960,576,.5);await shot(page,'07-two-roads');
 const trail=await page.evaluate(()=>window.trail);
 const roadOf=p=>p.x>=816&&p.x<=1232?(p.y<432?'N':p.y>768?'S':'?'):'';
 check(trail.filter(p=>p.id==='red-marshal').every(p=>roadOf(p)!=='S')&&trail.filter(p=>p.id==='red-shadowblade').every(p=>roadOf(p)!=='N'),'each Commander keeps to its own road',{marshal:[...new Set(trail.filter(p=>p.id==='red-marshal').map(roadOf))],shadow:[...new Set(trail.filter(p=>p.id==='red-shadowblade').map(roadOf))]});
 // a fallen Commander says when it returns
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,u=s.state.units['red-shadowblade'];if(u)s.hit(s.hero,u,1e7,'direct');});await step(page,2);
 const down=(await page.evaluate(()=>window.told)).find(m=>m.startsWith('Shadowblade falls'));
 check(/^Shadowblade falls · returns in 4[56]s\. Strike now!$/.test(down??''),'the fall and the return time are announced',down);
 // the Last Stand: four Elites when the Fortress Gate falls, once
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hit(s.hero,s.state.structures['red-fortress-gate'],1e7,'direct');});await step(page,4*30);s=await sim(page);
 check(s.elites===4,'the Fortress Gate\'s fall releases the Last Stand',s.elites);
 await camera(page,1560,600,1.1);await shot(page,'08-last-stand');
 check(errors.length===0,'no page errors',errors);
 await page.close();
 // the chapter/mission coordinates reach the same level, and a phone-sized landscape view keeps the notices readable
 const p=await open({width:844,height:390},'chapter=4&mission=6');
 check((await sim(p.page)).field==='crimson-fortress','?debug=1&chapter=4&mission=6 opens Crimson Fortress');
 await p.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;s.hero.hp=s.hero.maxHp=1e6;st.bases['blue-base'].hp=st.bases['blue-base'].maxHp=1e8;window.kingdomGame.scene.pause('Battle');});
 await capture(p.page,['c6-south-a','c6-south-b'],[1032,888]);await step(p.page,125);
 const pt=await p.page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=h.toast.getBounds();return {toast:h.toast.visible?h.toast.text:'',inside:b.x>=0&&b.right<=960&&b.y>=0&&b.bottom<=540};});
 check(/South Outpost captured/.test(pt.toast)&&pt.inside,'the capture notice fits the phone-sized view',pt);
 await camera(p.page,1008,888,1);await shot(p.page,'09-phone-captured');
 const pm=await p.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.commanderPlan.get('red-marshal').warn=s.clock.tick;});void pm;
 await step(p.page,8);const pw=await p.page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=h.toast.getBounds();return {toast:h.toast.visible?h.toast.text:'',inside:b.x>=0&&b.right<=960&&b.y>=0&&b.bottom<=540};});
 check(/Iron Marshal marches/.test(pw.toast)&&pw.inside,'the Commander warning fits the phone-sized view',pw);
 await shot(p.page,'10-phone-warning');
 check(p.errors.length===0,'no page errors on the phone view',p.errors);
 await p.page.close();
}finally{await browser.close();}
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);

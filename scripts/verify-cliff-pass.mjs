// Chapter 4 M2 "Cliff Pass" in the browser (docs/CHAPTER4_M2.md). Needs a dev server: CLIFF_URL=http://127.0.0.1:5281/ (the level opens through the dev-only debug launch ?debug=1&level=32).
// Walks the loop through the real UI: the cliff map and the faction gate, the camp captured, the Ballista ruin repaired through the Build panel (84 Wood, 18 Iron, 5 s), the repaired Ballista standing,
// a Crimson unit crossing the standing gate, and a phone-sized landscape view of the four-card Build panel. Stills go to CLIFF_EVIDENCE (default docs/screenshots/cliff-pass).
// EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.CLIFF_URL||'http://127.0.0.1:5281/',dir=process.env.CLIFF_EVIDENCE||'docs/screenshots/cliff-pass';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(viewport){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=32`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect();return Math.abs(r.width/r.height-960/540)<.2;});
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
const sim=page=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state,p=st.post;return {tick:s.clock.tick,owner:p.owner,captured:p.captured,banner:p.bannerId,keepShield:!!st.bases['red-base'].invulnerable,wood:st.wood,iron:st.iron,
 structures:Object.values(st.structures).map(b=>({id:b.id,kind:b.kind,team:b.team,hp:b.hp,maxHp:b.maxHp,col:b.col,row:b.row,progress:b.progress,paid:b.paidResources,start:b.startTick,done:b.completeTick,ballista:!!b.ballista,gate:!!b.gate,range:b.range,damage:b.damage})),field:s.field.id};});
// Step the simulation by hand (one tick per call) so a still is the same every run.
const step=(page,ticks)=>page.evaluate(ticks=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,end=s.clock.tick+ticks;while(s.clock.tick<end&&!s.ended)s.advance(1000/30+.01);for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);b.syncUnits();},ticks);
const camera=(page,x,y,zoom=1)=>page.evaluate(({x,y,zoom})=>{const b=window.kingdomGame.scene.getScene('Battle'),c=b.cameras.main;b.following=false;c.stopFollow();c.setZoom(zoom);c.centerOn(x,y*.72);},{x,y,zoom});
const text=(page,key)=>page.evaluate(key=>{const h=window.kingdomGame.scene.getScene('HUD');return key==='objective'?h.objectiveLine:key==='toast'?(h.toast.visible?h.toast.text:''):'';},key);
async function tapObject(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame),r=o.getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/960,y:c.y+(r.y+r.height/2)*c.height/540};},get.toString());await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(80);}
async function tapWorld(page,col,row){const pt=await page.evaluate(({col,row})=>{const c=window.kingdomGame.scene.getScene('Battle').cameras.main,k=window.kingdomGame.canvas.getBoundingClientRect();return {x:k.x+((col+.5)*48-c.scrollX)*k.width/960,y:k.y+((row+.5)*48*.72-c.scrollY)*k.height/540};},{col,row});await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(80);}
const capture=page=>page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,st=s.state;for(const id of ['blue-0','blue-1','blue-2']){const u=st.units[id];if(u){u.x=700;u.y=300;}}for(const id of ['red-hero','c4-camp-north','c4-camp-south'])s.hit(s.hero,st.units[id]??st.structures[id],1e7,'direct');s.teleportHero(1080,624);});
try{
 const {page,errors}=await open({width:960,height:540});
 let s=await sim(page);
 check(s.field==='cliff-pass'&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').renderedFieldId==='cliff-pass'),'the match and its art are Cliff Pass');
 check(s.owner==='crimson'&&s.keepShield&&s.structures.filter(b=>b.team==='red'&&!b.gate).length===4&&s.structures.some(b=>b.gate&&b.hp===3000),'the camp starts Crimson, the Keep shielded, four towers and a 3,000 HP gate stand');
 check((await text(page,'objective')).includes('Capture the Cliff Camp'),'the objective plate names the capture',await text(page,'objective'));
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e6;s.state.bases['blue-base'].invulnerable=true;window.kingdomGame.scene.pause('Battle');s.teleportHero(960,600);});
 // 01 the whole pass, 02 the gate and the neck, 03 the camp and the ruin while Crimson holds it
 await camera(page,960,576,.5);await step(page,2);await shot(page,'01-overview');
 const vis=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');const g=b.visuals.get('red-gate');return {gate:!!g,textures:g?g.list.filter(o=>o.type==='Image').map(o=>o.texture.key):[]};});
 check(vis.gate&&vis.textures.includes('cliff-gate'),'the gate is drawn with its own cliff-gate art',vis);
 await camera(page,1272,600,1.3);await shot(page,'02-gate-and-neck');
 await camera(page,1056,500,1.2);await shot(page,'03-camp-and-ruin-crimson');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').postTexts[4]?.text==='RUINED BALLISTA'),'the Ballista ruin is labelled while the camp is Crimson');
 // capture through the simulation, then the Banner
 await capture(page);await step(page,125);s=await sim(page);
 check(s.owner==='azure'&&s.captured&&!s.keepShield,'the camp is Azure and the Keep unshielded',[s.owner,s.keepShield]);check((await text(page,'toast')).includes('Repair the Ballista'),'the capture suggests repairing the Ballista',await text(page,'toast'));
 await camera(page,1056,500,1.2);await step(page,1);await shot(page,'04-captured-ruin-lit');
 check(await page.evaluate(()=>/^REPAIR BALLISTA · 84W 18I · 5s$/.test(window.kingdomGame.scene.getScene('Battle').postTexts[4]?.text)),'the ruin shows the repair price',await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').postTexts[4]?.text));
 // the Build panel: the Ballista card and the repair
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.economy.balances.wood=200*120;s.economy.balances.iron=40*120;s.teleportHero(1120,640);for(const id of Object.keys(s.state.units))if(id.startsWith('red-')||id.startsWith('blue-'))delete s.state.units[id];window.kingdomGame.scene.resume('Battle');});
 await camera(page,1056,500,1.2);
 await tapObject(page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await page.waitForTimeout(150);
 const cards=await page.evaluate(()=>{const p=window.kingdomGame.scene.getScene('HUD').buildPanel;return p.labels.slice(0,4).map(l=>l.visible?l.text.replace('\n',' | '):'');});
 check(cards.length===4&&/Ballista \| 84W 18I/.test(cards[3])&&/Barracks/.test(cards[2]),'the Build panel has a Ballista card at the repair price next to the Barracks card',cards);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[6]);await page.waitForTimeout(300);await frames(page);await tapWorld(page,21,9);
 const sel=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD');return {placement:b.placement,heading:h.buildPanel.heading.text,status:h.buildPanel.status.text};});
 check(sel.placement?.kind==='ballista'&&sel.placement.col===21&&sel.placement.row===9,'tapping the gold ruin selects it',sel.placement);
 check(/Repair Ballista/.test(sel.heading)&&/84 W/.test(sel.heading)&&/18 I/.test(sel.heading),'the panel prices the repair at 60%',sel.heading);check(/Repair the ruined Ballista/.test(sel.status),'the panel says it is a repair',sel.status);
 await shot(page,'05-repair-selected');
 await tapWorld(page,24,14);const bad=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').buildPanel.status.text);check(/Not a Ballista ruin/.test(bad),'any other cell is refused',bad);
 await tapWorld(page,21,9);const before=await sim(page);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[2]);await page.waitForTimeout(500);s=await sim(page);
 const rep=s.structures.find(b=>/^built-ui-/.test(b.id)&&b.ballista);
 check(!!rep&&rep.kind==='tower'&&rep.paid.wood===84&&rep.paid.iron===18&&rep.done-rep.start===150&&rep.col===21&&rep.row===9,'confirming charges 84 Wood and 18 Iron and starts a 5-second build',rep);
 check(rep&&rep.progress<1&&rep.hp<rep.maxHp,'the repair is under way, not instant');check(before.wood-s.wood<=84.2&&before.wood-s.wood>=81,'the Wood was charged once',[before.wood,s.wood]);
 await shot(page,'06-repairing');
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[3]);await page.waitForTimeout(100);
 await page.evaluate(()=>{window.kingdomGame.scene.pause('Battle');});await step(page,160);s=await sim(page);
 const done=s.structures.find(b=>b.id===rep.id);check(done&&done.hp===520&&done.damage===70&&done.range===420,'the repaired Ballista stands: 520 HP, 70 damage, 420 range',done);
 check(await page.evaluate(id=>{const v=window.kingdomGame.scene.getScene('Battle').visuals.get(id);return !!v&&v.list.some(o=>o.type==='Image'&&(o.texture.key==='ballista-sheet'||o.texture.key==='azure-ballista'));},rep.id),'it is drawn with the Ballista art (the animated sheet, or the old canvas on a build without it)');
 await camera(page,1056,520,1.4);await shot(page,'07-repaired-ballista');
 // a Crimson unit from the courtyard crosses the standing faction gate in the real scene
 const cross=await page.evaluate(async()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,st=s.state;st.bases['blue-base'].hp=st.bases['blue-base'].maxHp=1e8;s.teleportHero(300,300);for(const id of Object.keys(st.units))if(id!=='guardian')delete st.units[id];
  const m=st.structures['red-gate'],src={id:'probe-x',kind:'minion-red',team:'red',x:1500,y:600,radius:14,speed:95,hp:1e6,maxHp:1e6,armor:0,damage:18,range:48,cooldownTicks:24,windupTicks:0,readyTick:0,protectionTick:0};st.units['probe-x']=src;
  for(let i=0;i<30*14;i++){s.advance(1000/30+.01);s.drainEvents();}b.syncUnits();return {x:Math.round(src.x),gate:m.hp};});
 check(cross.x<1250&&cross.gate>=3000-4*70,'a Crimson unit crossed the standing gate into the hollow (only the Ballista scratched it)',cross);
 await camera(page,1100,600,.9);await shot(page,'08-crimson-crossing');
 check(errors.length===0,'no page errors',errors);
 await page.close();
 // a phone-sized landscape view of the four-card Build panel on the ruin
 const m=await open({width:844,height:390});
 await m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;s.hero.hp=s.hero.maxHp=1e6;st.bases['blue-base'].invulnerable=true;});
 await capture(m.page);await m.page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));await step(m.page,125);
 await m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.economy.balances.wood=200*120;s.economy.balances.iron=40*120;for(const id of Object.keys(s.state.units))if(id.startsWith('red-')||id.startsWith('blue-'))delete s.state.units[id];window.kingdomGame.scene.resume('Battle');});
 await camera(m.page,1056,500);
 await tapObject(m.page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await m.page.waitForTimeout(150);await tapObject(m.page,g=>g.scene.getScene('HUD').buildHits[6]);await m.page.waitForTimeout(300);await frames(m.page);await tapWorld(m.page,21,9);
 const ms=await m.page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),p=h.buildPanel;return {owner:window.kingdomGame.scene.getScene('Battle').simulation.state.post.owner,heading:p.heading.text,status:p.status.text,fits:p.heading.getBounds().right<=p.bounds.x+p.bounds.width&&p.status.getBounds().right<=p.bounds.x+p.bounds.width};});
 check(ms.owner==='azure'&&/Repair Ballista/.test(ms.heading)&&ms.fits,'the Ballista repair reads on a phone-sized landscape view',ms);
 await shot(m.page,'09-phone-repair');
 await m.page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').buildPanel.hide?.());
 check(m.errors.length===0,'no page errors on the phone view',m.errors);
 await m.page.close();
}finally{await browser.close();}
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);

// Chapter 4 M5 "Canyon Basin" in the browser (docs/CHAPTER4_M5.md). Needs a dev server: BASIN_URL=http://127.0.0.1:5351/ (the level opens through the dev-only debug launch ?debug=1&level=35).
// Walks the loop through the real scene: the basin map and its art, two Crimson camps and the shielded Keep, the Basin Camp captured (the shield holds), the Raider's release, the Rim Camp captured (the shield falls),
// the Basin pad and ruin opening, a lost Banner restoring the shield, and a phone-sized landscape view. Stills go to BASIN_EVIDENCE (default docs/screenshots/canyon-basin).
// EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.BASIN_URL||'http://127.0.0.1:5351/',dir=process.env.BASIN_EVIDENCE||'docs/screenshots/canyon-basin';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(viewport,query='level=35'){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&${query}`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect();return Math.abs(r.width/r.height-960/540)<.2;});
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
const sim=page=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;return {tick:s.clock.tick,camps:st.posts.map(p=>[p.id,p.owner]),keepShield:!!st.bases['red-base'].invulnerable,
 structures:Object.values(st.structures).map(b=>({id:b.id,kind:b.kind,team:b.team,hp:b.hp,col:b.col,row:b.row,azureBarracks:!!b.azureBarracks,banner:!!b.banner})),heroes:['red-hero','red-raider'].filter(id=>st.units[id]?.hp>0),field:s.field.id};});
// Step the simulation by hand (one tick per call) so a still is the same every run; events go to the HUD as the real loop sends them.
const step=(page,ticks)=>page.evaluate(ticks=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,end=s.clock.tick+ticks;while(s.clock.tick<end&&!s.ended){s.hero.hp=s.hero.maxHp=1e6;s.advance(1000/30+.01);for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);}b.syncUnits();},ticks);
const camera=(page,x,y,zoom=1)=>page.evaluate(({x,y,zoom})=>{const b=window.kingdomGame.scene.getScene('Battle'),c=b.cameras.main;b.following=false;c.stopFollow();c.setZoom(zoom);c.centerOn(x,y*.72);},{x,y,zoom});
const text=(page,key)=>page.evaluate(key=>{const h=window.kingdomGame.scene.getScene('HUD');return key==='objective'?h.objectiveLine:key==='toast'?(h.toast.visible?h.toast.text:''):'';},key);
async function tapObject(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame),r=o.getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/960,y:c.y+(r.y+r.height/2)*c.height/540};},get.toString());await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(80);}
async function tapWorld(page,col,row){const pt=await page.evaluate(({col,row})=>{const c=window.kingdomGame.scene.getScene('Battle').cameras.main,k=window.kingdomGame.canvas.getBoundingClientRect();return {x:k.x+((col+.5)*48-c.scrollX)*k.width/960,y:k.y+((row+.5)*48*.72-c.scrollY)*k.height/540};},{col,row});await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(80);}
// Capture a camp through the simulation: its holders (and the Heroes) die, the Guardian stands beside the flag, and the real update raises the Banner.
const capture=(page,holders,flag)=>page.evaluate(({holders,flag})=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,st=s.state;for(const id of ['blue-0','blue-1','blue-2']){const u=st.units[id];if(u){u.x=500;u.y=300;}}
 for(const id of ['red-hero','red-raider',...holders]){const t=st.units[id]??st.structures[id];if(t)s.hit(s.hero,t,1e7,'direct');}s.teleportHero(flag[0],flag[1]+(flag[1]<600?60:-60));},{holders,flag});
const plate=async page=>(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');h.showObjective?.('');return h.objectiveShown??'';}));
const mapColors=async page=>{await frames(page);return page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').mapPosts.map(m=>m.fillColor.toString(16)));};
const BASIN=['c4-basin-north','c4-basin-south'],RIM=['c4-rim-north','c4-rim-south'];
try{
 const {page,errors}=await open({width:960,height:540});
 let s=await sim(page);
 check(s.field==='canyon-basin'&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').renderedFieldId==='canyon-basin'),'the match and its art are Canyon Basin');
 check(JSON.stringify(s.camps)===JSON.stringify([['rim','crimson'],['basin','crimson']])&&s.keepShield&&s.structures.filter(b=>b.team==='red'&&b.kind==='tower').length===6&&s.heroes.join()==='red-hero','two Crimson camps, the Keep shielded, six towers, the Defender on the field and no Raider yet',s);
 check((await plate(page)).includes('Capture both camps'),'the objective plate asks for both camps',await plate(page));
 check((await mapColors(page)).join()==='ff7878,ff7878','both camps are red on the minimap',await mapColors(page));
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e6;s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e8;window.kingdomGame.scene.pause('Battle');s.teleportHero(700,600);});
 await camera(page,960,576,.5);await step(page,2);await shot(page,'01-overview');
 const labels=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').postTexts.filter(t=>t.visible).map(t=>t.text));
 check(labels.includes('RIM CAMP · CRIMSON')&&labels.includes('BASIN CAMP · CRIMSON'),'each camp carries its own ring label',labels);
 await camera(page,1200,312,1.2);await shot(page,'02-rim-camp-crimson');
 await camera(page,1080,888,1.2);await shot(page,'03-basin-camp-crimson');
 // the Basin Camp first: the shield holds and the objective moves to the Rim Camp
 await capture(page,BASIN,[1080,888]);await step(page,125);s=await sim(page);
 check(JSON.stringify(s.camps)===JSON.stringify([['rim','crimson'],['basin','azure']])&&s.keepShield,'the Basin Camp is Azure and the Keep is still shielded',s.camps);
 check((await text(page,'toast')).includes("Basin Camp captured · take the Rim Camp to break the Keep's shield"),'the capture notice names the camp still to take',await text(page,'toast'));
 check((await plate(page)).includes('Capture the Rim Camp'),'the plate moves to the Rim Camp',await plate(page));
 check((await mapColors(page)).join()==='ff7878,70d7ff','the Basin Camp turns blue on the minimap',await mapColors(page));
 const ruin=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').postTexts.filter(t=>t.visible).map(t=>t.text));
 check(ruin.some(t=>/^REPAIR TOWER · 48W 6I · 5s$/.test(t))&&ruin.includes('BASIN CAMP · AZURE'),'the Basin ruin offers the repair at 60%',ruin);
 await camera(page,1080,888,1.2);await step(page,1);await shot(page,'04-basin-captured');
 // the Raider rides out at 75 s (every notice is recorded: a stepped run jumps past the toast timers, so a lower-priority notice may never be drawn)
 await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),tell=h.tell.bind(h);window.told=[];h.tell=(m,...a)=>{window.told.push(m);return tell(m,...a);};});
 const at=(await sim(page)).tick;await step(page,Math.max(1,75*30-at+2));s=await sim(page);
 check(s.heroes.includes('red-raider'),'the Raider is out at 75 s',s.heroes);
 const told=await page.evaluate(()=>window.told);check(told.some(m=>m.startsWith('The Raider Hero rides out')),'his release is announced',told);
 await camera(page,1512,888,1.2);await shot(page,'05-raider-out');
 // the Basin pad: the Build panel selects and places a Barracks there
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.economy.balances.wood=600*120;s.economy.balances.iron=120*120;s.teleportHero(1000,936);for(const id of Object.keys(s.state.units))if(id.startsWith('red-')||id.startsWith('blue-'))delete s.state.units[id];window.kingdomGame.scene.resume('Battle');});
 await camera(page,1040,936,1);
 await tapObject(page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await page.waitForTimeout(150);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[5]);await page.waitForTimeout(300);await frames(page);await tapWorld(page,21,20);
 const sel=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').placement);
 check(sel?.kind==='barracks'&&sel.col===21&&sel.row===20,'tapping the Basin pad selects it',sel);
 await shot(page,'06-basin-pad-selected');
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[2]);await page.waitForTimeout(500);s=await sim(page);
 check(s.structures.some(b=>b.azureBarracks&&b.col===21&&b.row===20),'confirming places the Basin Barracks',s.structures.filter(b=>b.azureBarracks));
 await tapObject(page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await page.waitForTimeout(150);
 check(!(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').buildingMode)),'the Build panel closes');
 await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));
 // the Rim Camp: the shield falls
 await capture(page,RIM,[1176,312]);await step(page,125);s=await sim(page);
 check(JSON.stringify(s.camps)===JSON.stringify([['rim','azure'],['basin','azure']])&&!s.keepShield,'both camps Azure: the Keep is unshielded',s);
 check((await text(page,'toast')).includes("Rim Camp captured · the Keep's shield is down"),'the second capture says the shield is down',await text(page,'toast'));
 check((await plate(page)).includes('Destroy the Crimson Keep'),'the plate moves to the Keep',await plate(page));
 await camera(page,1300,400,.8);await step(page,1);await shot(page,'07-rim-captured');
 // a lost Banner: the shield returns and the plate asks for the camp back
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hit(s.state.bases['red-base'],s.state.structures['c4-banner-basin'],1e7,'direct');});await step(page,2);s=await sim(page);
 check(s.keepShield&&s.camps[1][1]==='crimson','losing the Basin Banner shields the Keep again',s.camps);
 check((await text(page,'toast')).includes('Basin Camp lost · the Banner has fallen · the Keep is shielded again'),'the loss is announced',await text(page,'toast'));
 check((await plate(page)).includes('Recapture the Basin Camp'),'the plate asks for the Basin Camp back',await plate(page));
 await camera(page,960,600,.5);await step(page,1);await shot(page,'08-basin-lost');
 check(errors.length===0,'no page errors',errors);
 await page.close();
 // the chapter/mission coordinates reach the same level, and a phone-sized landscape view keeps the notices readable
 const m=await open({width:844,height:390},'chapter=4&mission=5');
 check((await sim(m.page)).field==='canyon-basin','?debug=1&chapter=4&mission=5 opens Canyon Basin');
 await m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;s.hero.hp=s.hero.maxHp=1e6;st.bases['blue-base'].hp=st.bases['blue-base'].maxHp=1e8;window.kingdomGame.scene.pause('Battle');});
 await capture(m.page,BASIN,[1080,888]);await step(m.page,125);
 const mt=await m.page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=h.toast.getBounds();return {toast:h.toast.visible?h.toast.text:'',inside:b.x>=0&&b.right<=960&&b.y>=0&&b.bottom<=540};});
 check(/Basin Camp captured/.test(mt.toast)&&mt.inside,'the capture notice fits the phone-sized view',mt);
 await camera(m.page,1080,888,1);await shot(m.page,'09-phone-captured');
 check(m.errors.length===0,'no page errors on the phone view',m.errors);
 await m.page.close();
}finally{await browser.close();}
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);

// Chapter 4 M3 "River & Island" in the browser (docs/CHAPTER4_M3.md). Needs a dev server: RIVER_URL=http://127.0.0.1:5281/ (the level opens through the dev-only debug launch ?debug=1&level=33).
// Walks the loop through the real scene: the river map and its art, the three Crimson groups, the camp captured with its first-capture notice, the island Barracks pad opening, a wave crossing the South Bridge in the real update loop,
// the Barracks destroyed and the waves stopping, and a phone-sized landscape view. Stills go to RIVER_EVIDENCE (default docs/screenshots/river-island).
// EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.RIVER_URL||'http://127.0.0.1:5281/',dir=process.env.RIVER_EVIDENCE||'docs/screenshots/river-island';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(viewport){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=33`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect();return Math.abs(r.width/r.height-960/540)<.2;});
 return {page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
const sim=page=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state,p=st.post;return {tick:s.clock.tick,owner:p.owner,captured:p.captured,keepShield:!!st.bases['red-base'].invulnerable,wood:st.wood,iron:st.iron,waves:st.spawnedWaves,
 structures:Object.values(st.structures).map(b=>({id:b.id,kind:b.kind,team:b.team,hp:b.hp,maxHp:b.maxHp,col:b.col,row:b.row,gate:!!b.gate,azureBarracks:!!b.azureBarracks})),
 red:Object.values(st.units).filter(u=>u.team==='red'&&u.hp>0).map(u=>({id:u.id,x:Math.round(u.x),y:Math.round(u.y)})),field:s.field.id};});
// Step the simulation by hand (one tick per call) so a still is the same every run.
const step=(page,ticks)=>page.evaluate(ticks=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,end=s.clock.tick+ticks;while(s.clock.tick<end&&!s.ended){s.hero.hp=s.hero.maxHp=1e6;s.advance(1000/30+.01);}for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);b.syncUnits();},ticks);
const camera=(page,x,y,zoom=1)=>page.evaluate(({x,y,zoom})=>{const b=window.kingdomGame.scene.getScene('Battle'),c=b.cameras.main;b.following=false;c.stopFollow();c.setZoom(zoom);c.centerOn(x,y*.72);},{x,y,zoom});
const text=(page,key)=>page.evaluate(key=>{const h=window.kingdomGame.scene.getScene('HUD');return key==='objective'?h.objectiveLine:key==='toast'?(h.toast.visible?h.toast.text:''):'';},key);
async function tapObject(page,get){const pt=await page.evaluate(get=>{const o=eval(`(${get})`)(window.kingdomGame),r=o.getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/960,y:c.y+(r.y+r.height/2)*c.height/540};},get.toString());await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(80);}
async function tapWorld(page,col,row){const pt=await page.evaluate(({col,row})=>{const c=window.kingdomGame.scene.getScene('Battle').cameras.main,k=window.kingdomGame.canvas.getBoundingClientRect();return {x:k.x+((col+.5)*48-c.scrollX)*k.width/960,y:k.y+((row+.5)*48*.72-c.scrollY)*k.height/540};},{col,row});await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(80);}
const capture=page=>page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,st=s.state;for(const id of ['blue-0','blue-1','blue-2']){const u=st.units[id];if(u){u.x=700;u.y=300;}}for(const id of ['red-hero','c4-isle-north','c4-isle-south'])s.hit(s.hero,st.units[id]??st.structures[id],1e7,'direct');s.teleportHero(1040,648);});
try{
 const {page,errors}=await open({width:960,height:540});
 let s=await sim(page);
 check(s.field==='river-island'&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').renderedFieldId==='river-island'),'the match and its art are River & Island');
 check(s.owner==='crimson'&&s.keepShield&&s.structures.filter(b=>b.team==='red'&&b.kind==='tower').length===4&&s.structures.some(b=>b.id==='red-gate'&&b.hp===3000&&!b.gate)&&s.structures.some(b=>b.id==='red-barracks-south'&&b.hp===2000),'the camp starts Crimson, the Keep shielded, four towers, a 3,000 HP Gatehouse and a 2,000 HP Barracks stand',s.structures.map(b=>b.id));
 check((await text(page,'objective')).includes('Capture the Island Camp'),'the objective plate names the capture',await text(page,'objective'));
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e6;s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e8;window.kingdomGame.scene.pause('Battle');s.teleportHero(700,600);});
 await camera(page,960,576,.5);await step(page,2);await shot(page,'01-overview');
 const vis=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),g=b.visuals.get('red-gate'),k=b.visuals.get('red-barracks-south');return {gate:g?g.list.filter(o=>o.type==='Image').map(o=>o.texture.key):[],gateLabel:g?g.list.filter(o=>o.type==='Text').map(o=>o.text):[],barracks:!!k};});
 check(vis.gate.includes('cliff-gate')&&vis.gateLabel.includes('GATEHOUSE')&&vis.barracks,'the Gatehouse is drawn with the gate art and labelled, and the Crimson Barracks stands',vis);
 await camera(page,1128,600,1.3);await shot(page,'02-gatehouse');
 await camera(page,960,576,1.2);await shot(page,'03-island-camp-crimson');
 await camera(page,1250,984,.9);await shot(page,'04-south-bridge-barracks');
 // a wave in the real update loop: stepped tick by tick, a Crimson unit is seen on the bridge and none in the neck
 const seen=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,bridge=new Set(),neck=new Set();for(let i=0;i<300+30*20;i++){s.hero.hp=s.hero.maxHp=1e6;s.advance(1000/30+.01);for(const u of Object.values(s.state.units))if(u.team==='red'&&u.hp>0&&u.id!=='red-hero'){if(u.y>900&&u.x>800&&u.x<1210)bridge.add(u.id);if(u.x>1104&&u.x<1200&&u.y>528&&u.y<672)neck.add(u.id);}if(i===300+30*8)break;}for(const e of s.drainEvents())window.kingdomGame.events.emit('simulation-event',e);b.syncUnits();return {bridge:bridge.size,neck:neck.size};});
 check(seen.bridge>=1&&seen.neck===0,'a wave crosses the South Bridge and nobody enters the Gatehouse neck',seen);s=await sim(page);
 await camera(page,1000,984,.9);await shot(page,'05-wave-on-bridge');
 // capture through the simulation: the first-capture notice, the objective, the island pad
 await capture(page);await step(page,125);s=await sim(page);
 check(s.owner==='azure'&&s.captured&&!s.keepShield,'the camp is Azure and the Keep unshielded',[s.owner,s.keepShield]);
 check((await text(page,'toast')).includes('Island Camp captured! Break the Gatehouse or cross the South Bridge'),'the capture shows the approved notice',await text(page,'toast'));
 check((await text(page,'objective')).includes('Destroy the Crimson Keep'),'the objective moves to the Keep',await text(page,'objective'));
 await camera(page,984,576,1.2);await step(page,1);await shot(page,'06-captured');
 // the island Barracks pad opens with the camp; place a Barracks on it through the Build panel
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.economy.balances.wood=300*120;s.economy.balances.iron=60*120;s.teleportHero(1010,560);for(const id of Object.keys(s.state.units))if(id.startsWith('red-')||id.startsWith('blue-'))delete s.state.units[id];window.kingdomGame.scene.resume('Battle');});
 await camera(page,984,520,1.2);
 await tapObject(page,g=>g.scene.getScene('HUD').utilities.find(u=>u.id==='build').hit);await page.waitForTimeout(150);
 const cards=await page.evaluate(()=>{const p=window.kingdomGame.scene.getScene('HUD').buildPanel;return p.labels.slice(0,3).map(l=>l.visible?l.text.replace('\n',' | '):'');});
 check(cards.length===3&&/Barracks/.test(cards[2]),'the Build panel has the three cards (no Ballista card)',cards);
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[5]);await page.waitForTimeout(300);await frames(page);await tapWorld(page,20,10);
 const sel=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD');return {placement:b.placement,status:h.buildPanel.status.text};});
 check(sel.placement?.kind==='barracks'&&sel.placement.col===20&&sel.placement.row===10,'tapping the island pad selects it',sel.placement);
 await shot(page,'07-island-pad-selected');
 await tapObject(page,g=>g.scene.getScene('HUD').buildHits[2]);await page.waitForTimeout(500);s=await sim(page);
 check(s.structures.some(b=>b.azureBarracks&&b.col===20&&b.row===10),'confirming places the island Barracks',s.structures.filter(b=>b.azureBarracks));
 // Barracks destroyed: no new Crimson unit spawns afterwards
 await page.evaluate(()=>{window.kingdomGame.scene.pause('Battle');const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,k=s.state.structures['red-barracks-south'];s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e8;s.hit(s.hero,k,1e7,'direct');});
 await step(page,3);await step(page,30*10);const ids=new Set((await sim(page)).red.map(u=>u.id));await step(page,30*80);s=await sim(page);
 check(s.red.every(u=>ids.has(u.id)||u.id==='red-hero'),'no Crimson unit spawned after the Barracks fell',{waves:s.waves,new:s.red.filter(u=>!ids.has(u.id)).map(u=>u.id)});
 await camera(page,1250,984,.9);await shot(page,'08-barracks-destroyed');
 check(errors.length===0,'no page errors',errors);
 await page.close();
 // a phone-sized landscape view: the plate and the notice stay readable
 const m=await open({width:844,height:390});
 await m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.state;s.hero.hp=s.hero.maxHp=1e6;st.bases['blue-base'].hp=st.bases['blue-base'].maxHp=1e8;});
 await capture(m.page);await m.page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));await step(m.page,125);
 const mt=await m.page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),k=window.kingdomGame.canvas.getBoundingClientRect(),b=h.toast.getBounds();return {toast:h.toast.visible?h.toast.text:'',inside:b.x>=0&&b.right<=960&&b.y>=0&&b.bottom<=540};});
 check(/Island Camp captured/.test(mt.toast)&&mt.inside,'the first-capture notice fits the phone-sized view',mt);
 await camera(m.page,984,576,1);await shot(m.page,'09-phone-captured');
 check(m.errors.length===0,'no page errors on the phone view',m.errors);
 await m.page.close();
}finally{await browser.close();}
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);

// Chapter 4 M4 "Fortress Approach" in the browser (docs/CHAPTER4_M4.md). Needs a dev server: FA_URL=http://127.0.0.1:5311/ (the level opens through ?debug=1&level=34).
// Drives the real Battle scene (setHeroPosition, send, simulation.advance) and checks what the player sees: the cart, its wreck and ring, the Gatehouse capture and repair rings, the open and converted gates, the Elite Barracks, notices, and both alternate wins.
// Stills go to FA_EVIDENCE (default docs/screenshots/fortress-approach). EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.FA_URL||'http://127.0.0.1:5311/',dir=process.env.FA_EVIDENCE||'docs/screenshots/fortress-approach';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(viewport={width:960,height:540}){
 const ctx=await browser.newContext({viewport,hasTouch:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=34`);
 await page.waitForFunction(()=>window.kingdomGame&&window.kingdomGame.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:30000});
 await page.waitForTimeout(800);
 return {ctx,page,errors};
}
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const shot=async(page,name)=>{await frames(page);await page.screenshot({path:`${dir}/${name}.png`});};
// All helpers run inside the page against the live Battle scene.
const run=(page,fn,arg)=>page.evaluate(`(${fn.toString()})(${JSON.stringify(arg??null)})`);
const setup=page=>run(page,()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;window.B=b;window.S=s;window.adv=n=>{for(let i=0;i<n;i++)s.advance(1000/30+.01);b.syncUnits();};
 window.strong=()=>{s.hero.hp=s.hero.maxHp=1e6;};window.fund=()=>{s.economy.balances={...s.economy.balances,wood:2000*120,iron:500*120};};
 window.strike=(src,id)=>{const a=s.state.units[src]??s.state.structures[src]??s.state.bases[src],t=s.state.units[id]??s.state.structures[id]??s.state.bases[id];if(t){t.protectionTick=0;s.hit(a,t,1e9,'direct');}};
 window.at=(x,y)=>{const ok=b.setHeroPosition(x,y);window.strong();return ok;};
 window.clearRed=()=>{for(const id of Object.keys(s.state.units))if(s.state.units[id].team==='red'&&id!=='red-hero')delete s.state.units[id];}; // the checks below look at one mechanic at a time, not at a wave's crowd
 window.notices=()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.noticeText?.text??null;};
 strong();s.state.bases['blue-base'].hp=s.state.bases['blue-base'].maxHp=1e9; // a large Keep, never invulnerable: the fast-forwarded waves must not end the match under the harness
 return s.state.match.phase;});
try{
 {
 const {ctx,page,errors}=await open();await setup(page);
 const info=await run(page,()=>({id:S.setup.encounterId,field:S.field.id,gates:Object.keys(S.state.structures).filter(i=>S.state.structures[i].gate),guard:S.state.guard,hero:{x:S.state.units['red-hero'].x,y:S.state.units['red-hero'].y},captures:S.state.captures,towers:Object.values(S.state.structures).filter(s=>s.kind==='tower').length}));
 check(info.field==='fortress-approach'&&info.gates.length===2&&info.towers===6&&info.guard?.raid===false,'the level opens: fortress map, two gates, six towers, a Warden Hero at his post',info);
 await run(page,()=>{B.followHero();});await shot(page,'01-open');
 // ---- the cart arrives, attacks structures only, dies, and leaves one wreck ----
 await run(page,()=>adv(950));
 const cart=await run(page,()=>({alive:!!S.state.units['red-cart'],x:S.state.units['red-cart']?.x,name:B.visuals.get('red-cart')?.list?.some?.(o=>o.text==='WAR CART')}));
 check(cart.alive,'the Crimson War Cart spawns once the opening seconds have passed',cart);
 await run(page,()=>{adv(300);});
 const target=await run(page,()=>{const c=S.state.units['red-cart'];return {targetId:c?.targetId,x:Math.round(c?.x??0)};});
 check(!!target.targetId&&!/^(guardian|blue-\d|blue-s)/.test(target.targetId),'the cart targets a structure, never a unit',target);
 await run(page,()=>{const c=S.state.units['red-cart'];at(c.x-120,c.y);B.followHero();});await shot(page,'02-cart-approaching');
 await run(page,()=>{strike('guardian','red-cart');adv(3);at(S.state.cartWreck.x+250,S.state.cartWreck.y);B.followHero();});
 const wreck=await run(page,()=>({wreck:S.state.cartWreck,hud:notices()}));
 check(!!wreck.wreck&&[14,17,19].includes(wreck.wreck.col),'its wreck stands on one authored site',wreck.wreck);
 await shot(page,'03-wreck');
 // ---- repair: needs the Guardian in the ring and the price ----
 const rep=await run(page,()=>{const w=S.state.cartWreck;S.economy.balances={...S.economy.balances,wood:0,iron:0};at(w.x+30,w.y);adv(95);const short=!w.repair;fund();adv(5);const started=!!w.repair;adv(160);
  const carts=Object.values(S.state.units).filter(u=>u.cart&&u.team==='blue');return {short,started,carts:carts.length,wreckLeft:!!S.state.cartWreck,cart:carts[0]&&{x:carts[0].x,y:carts[0].y,hp:carts[0].hp}};});
 check(rep.short&&rep.started&&rep.carts===1&&!rep.wreckLeft,'repair waits for resources, then yields exactly one Azure cart and the wreck is gone',rep);
 await shot(page,'04-azure-cart');
 // ---- follow: stops when the Guardian leaves, resumes when he returns ----
 const fol=await run(page,()=>{clearRed();const c=Object.values(S.state.units).find(u=>u.cart&&u.team==='blue');c.x=640;c.y=600;at(c.x-60,c.y);adv(60);const moved=c.x>641;at(c.x-600,c.y-100);adv(2);const x0=c.x;adv(120);const stopped=c.x===x0;at(c.x-80,c.y);adv(60);return {moved,stopped,resumed:c.x>x0};});
 check(fol.moved&&fol.stopped&&fol.resumed,'the Azure cart walks with the Guardian, stops when he is away and resumes when he is back',fol);
 // ---- Forward Gatehouse: towers first, then capture, repair, conversion ----
 await run(page,()=>{const c=Object.values(S.state.units).find(u=>u.cart&&u.team==='blue');delete S.state.units[c.id];});
 await run(page,()=>{at(960,600);B.followHero();adv(5);});await shot(page,'05-forward-gate-ring-blocked');
 const blocked=await run(page,()=>{adv(200);return S.state.captures['red-forward-gate'].stage;});
 check(blocked==='crimson','a gate whose towers still stand cannot be captured',blocked);
 const cap=await run(page,()=>{for(const id of ['c4-fwd-north','c4-fwd-south'])strike('guardian',id);at(960,600);adv(60);const mid=S.state.captures['red-forward-gate'].progress;adv(70);const g=S.state.structures['red-forward-gate'];return {stage:S.state.captures['red-forward-gate'].stage,mid,open:!!g.open,team:g.team,raid:S.state.guard.raid};});
 check(cap.stage==='captured'&&cap.open&&cap.mid>0&&cap.raid===true,'with the towers dead and the Guardian in the ring the gate is captured; it stands open and the Hero starts to raid',cap);
 await shot(page,'06-forward-gate-captured-open');
 const conv=await run(page,()=>{fund();at(960,600);adv(5);adv(150);const g=S.state.structures['red-forward-gate'];return {stage:S.state.captures['red-forward-gate'].stage,team:g.team,open:!!g.open,hp:g.hp===g.maxHp};});
 check(conv.stage==='azure'&&conv.team==='blue'&&!conv.open&&conv.hp,'repair converts it to Azure at full hit points',conv);
 await shot(page,'07-forward-gate-azure');
 const walk=await run(page,()=>{clearRed();at(960,600);S.send({type:'move',x:1,y:0});adv(150);S.send({type:'move',x:0,y:0});return {x:Math.round(S.hero.x)};});
 check(walk.x>1100,'the Guardian walks through the gate he owns',walk);
 // destroyed converted gate: a breach, never reverts, Azure still reaches the Main Gatehouse
 const lost=await run(page,()=>{strike('red-base','red-forward-gate');adv(3);const gone=!S.state.structures['red-forward-gate'];adv(600);return {gone,stage:S.state.captures['red-forward-gate'].stage,still:!S.state.structures['red-forward-gate']};});
 check(lost.gone&&lost.stage==='lost'&&lost.still,'a destroyed converted gate leaves a breach that does not revert',lost);
 await run(page,()=>{at(1280,600);B.followHero();adv(3);});await shot(page,'08-corridor-after-breach');
 // ---- Elite Barracks: production, capture, repair ----
 const prod=await run(page,()=>{adv(1500);return {elites:Object.keys(S.state.units).filter(i=>i.startsWith('red-eb-')).length};});
 check(prod.elites>0,'the Crimson Elite Barracks trains Elite Soldiers while it is Crimson\'s',prod);
 await run(page,()=>{at(1100,1008);B.followHero();adv(3);});await shot(page,'09-elite-barracks-ring');
 const eb=await run(page,()=>{for(const id of ['c4-elite-west','c4-elite-east',...Object.keys(S.state.units).filter(i=>i.startsWith('red-eb-'))])strike('guardian',id);adv(2);const moved=at(1104,1008);adv(130);const b=S.state.structures['red-barracks-elite'];const st1=S.state.captures['red-barracks-elite'].stage;const before=Object.keys(S.state.units).filter(i=>i.startsWith('red-eb-')).length;adv(1000);const after=Object.keys(S.state.units).filter(i=>i.startsWith('red-eb-')).length;
  fund();at(1104,1008);adv(5);adv(150);return {moved,st1,team:b.team,noMore:after<=before,stage:S.state.captures['red-barracks-elite'].stage,azure:!!b.azureBarracks,elite:!!b.eliteBarracks,limitFree:S.placementReason('barracks',10,14)!=='Barracks limit reached'};});
 check(eb.st1==='captured'&&eb.team==='blue'&&eb.noMore&&eb.stage==='azure'&&eb.azure&&eb.elite&&eb.limitFree,'capture stops the Elites, repair makes an Azure Elite Barracks that is outside the Barracks limit',eb);
 await run(page,()=>{adv(500);});await shot(page,'10-azure-elite-barracks');
 const soldiers=await run(page,()=>Object.values(S.state.units).filter(u=>u.id.startsWith('blue-s-red-barracks-elite')).map(u=>({hp:u.maxHp})));
 check(soldiers.length>0&&soldiers.every(s=>s.hp===480),'the Elite Barracks trains Azure Elite soldiers',soldiers);
 check(errors.length===0,'no page errors in the capture / repair run',errors);
 const storage=await page.evaluate(()=>[localStorage.getItem('kingdom-clash.achievements.v1'),localStorage.getItem('kingdom-clash.campaign.v2')]);
 check(storage[0]===null&&storage[1]===null,'a debug run writes neither achievements nor campaign progress',storage);
 await ctx.close();}
 // ---- alternate win: no cart, no Elite Barracks, no capture ----
 {const {ctx,page,errors}=await open();await setup(page);
  const win=await run(page,()=>{for(const id of ['c4-fwd-north','c4-fwd-south','c4-main-north','c4-main-south','red-forward-gate','red-main-gate'])strike('guardian',id);adv(3);strike('guardian','red-base');adv(4);return {outcome:S.outcome?.outcome,wreck:!!S.state.cartWreck,eb:S.state.captures['red-barracks-elite'].stage};});
  check(win.outcome==='victory'&&win.eb==='crimson','the mission is won without the War Cart and without the Elite Barracks',win);
  await page.waitForTimeout(500);await shot(page,'11-victory-no-extras');
  check(errors.length===0,'no page errors in the alternate-win run',errors);await ctx.close();}
 // ---- phone landscape: the wreck and capture rings render on a small canvas ----
 {const {ctx,page,errors}=await open({width:667,height:375});await setup(page);
  await run(page,()=>{adv(950);strike('guardian','red-cart');adv(3);at(S.state.cartWreck.x+120,S.state.cartWreck.y);B.followHero();adv(3);});await shot(page,'12-phone-wreck');
  const t=await run(page,()=>B.postTexts.filter(x=>x.visible).map(x=>x.text));
  check(t.some(x=>/WAR CART WRECK/.test(x)),'the wreck ring and label are drawn on a small canvas',t);
  const far=await run(page,()=>{at(300,300);adv(3);return B.postTexts.filter(x=>x.visible).map(x=>x.text);});
  check(far.length===0,'the wreck label is hidden when the Guardian is far away',far);
  check(errors.length===0,'no page errors on the phone view',errors);await ctx.close();}
 // ---- the lower route is marked from the opening ----
 {const {ctx,page,errors}=await open();await setup(page);
  const m=await run(page,()=>{adv(3);return B.postTexts.filter(x=>x.visible).map(x=>x.text);});
  check(m.some(x=>/ELITE BARRACKS/.test(x)),'the lower-route marker is visible at the opening',m);await shot(page,'14-lower-route-opening');
  const m2=await run(page,()=>{at(900,820);B.followHero();adv(3);return B.postTexts.filter(x=>x.visible).map(x=>x.text);});await shot(page,'15-lower-route-near');
  check(m2.some(x=>/ELITE BARRACKS/.test(x)),'the marker stays while the Guardian approaches the lane',m2);
  const m3=await run(page,()=>{at(420,300);adv(3);return B.postTexts.filter(x=>x.visible).map(x=>x.text);});
  check(!m3.some(x=>/ELITE BARRACKS/.test(x)),'no marker when the Guardian is far',m3);
  const m4=await run(page,()=>{strike('guardian','red-barracks-elite');adv(3);at(900,820);adv(3);return B.postTexts.filter(x=>x.visible).map(x=>x.text);});
  check(!m4.some(x=>/ELITE BARRACKS/.test(x)),'the marker goes once the Elite Barracks is destroyed',m4);
  check(errors.length===0,'no page errors in the lower-route check',errors);await ctx.close();}
 // ---- site labels show only near the Guardian, one line each ----
 {const {ctx,page,errors}=await open();await setup(page);
  const n=await run(page,()=>{const ok=at(420,420);adv(3);const a=B.postTexts.filter(x=>x.visible).map(x=>x.text);const ok2=at(900,600);adv(3);const b=B.postTexts.filter(x=>x.visible).map(x=>x.text);return {ok,ok2,a,b};});
  check(n.ok&&n.a.length===0,'no site label while far from every capture',n);
  check(n.ok2&&n.b.length>0&&n.b.every(x=>!x.includes(String.fromCharCode(10))&&!/GATEHOUSE/.test(x)),'near the Forward Gatehouse: one-line labels, no repeated gate name',n);
  await shot(page,'13-near-forward-gate');check(errors.length===0,'no page errors in the label check',errors);await ctx.close();}
}finally{await browser.close();}
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);

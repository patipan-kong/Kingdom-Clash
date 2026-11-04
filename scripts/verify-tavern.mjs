// Chapter 5 Phase 1B (docs/CHAPTER5_PHASE1B.md): the Tavern in the browser with real touch taps at the Galaxy S24's landscape viewport (780x360 CSS, DPR 3), plus a 780x250 smoke run.
// Needs a dev server: TAVERN_URL=http://127.0.0.1:5371/ (the dev-only ?debug=1&level=N&tavernTest=1|2|3 gives a Tavern, the whole roster and 1000 Gold / 500 Wood / 100 Iron). Stills go to TAVERN_EVIDENCE (default the OS temp dir).
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.TAVERN_URL||'http://127.0.0.1:5371/',dir=process.env.TAVERN_EVIDENCE||`${tmpdir()}/tavern`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(w,h,query){
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:w===780&&h===360?3:2,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&${query}`);
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing',null,{timeout:30000});
 await page.waitForTimeout(800);
 await page.evaluate(()=>{const G=window.kingdomGame;window.B=G.scene.getScene('Battle');window.H=G.scene.getScene('HUD');window.S=window.B.simulation;window.S.hero.hp=window.S.hero.maxHp=1e6;window.S.encounter={...window.S.encounter,waves:[],continuous:false};});
 return {ctx,page,errors};
}
const shot=async(page,name)=>{await page.screenshot({path:`${dir}/${name}.png`});await page.screenshot({path:`${dir}/${name}.jpg`,type:'jpeg',quality:82});await page.waitForTimeout(300);};
const frames=(page,n=3)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>++k>=n?r():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const toPage=(page,x,y)=>page.evaluate(([x,y])=>{const c=window.kingdomGame.canvas.getBoundingClientRect(),k=c.height/540;return {x:c.x+x*k,y:c.y+y*k};},[x,y]);
const tapLogical=async(page,x,y)=>{const p=await toPage(page,x,y);await page.touchscreen.tap(p.x,p.y);await frames(page,5);};
const tick=page=>page.evaluate(()=>S.clock.tick);
const waitTicks=async(page,n)=>{const t=await tick(page);await page.waitForFunction(([t,n])=>S.clock.tick>=t+n,[t,n],{timeout:60000});};
const centre=(page,expr)=>page.evaluate(e=>{const b=eval(e).getBounds();return {x:b.centerX,y:b.centerY};},expr);
const res=page=>page.evaluate(()=>({wood:S.economy.woodUnits/120,iron:S.economy.ironUnits/120,gold:S.state.gold}));
const slots=page=>page.evaluate(()=>JSON.parse(JSON.stringify(S.state.tavern?.slots??null)));
const allyIds=page=>page.evaluate(()=>Object.values(S.state.units).filter(u=>u.ally&&u.hp>0).map(u=>u.id));
const rowButton=(page,i,which)=>centre(page,`H.tavern.rows[${i}].${which==='dismiss'?'hitDismiss':'hitPrimary'}`);
const note=page=>page.evaluate(()=>H.tavern.status.text);

// 1. Chapters 1-4 have no Tavern: no card in Build, no state, no panel.
for(const q of ['level=1','level=11','level=21','level=26','level=31','level=34','level=36']){
 const {ctx,page,errors}=await open(780,360,q);await frames(page,6);
 const u=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tapLogical(page,u.x,u.y);
 const v=await page.evaluate(()=>({tavernState:S.state.tavern??null,setup:S.setup.tavern??null,card:H.buildPanel.hits[7].visible,cards:H.buildPanel.labels.filter(l=>l.visible).length,place:S.placementReason('tavern',20,20)}));
 check(v.tavernState===null&&v.setup===null&&!v.card&&v.place==='Tavern unavailable',`?debug=1&${q}: no Tavern state, no Build card, placement refused`,v);
 const army=await page.evaluate(()=>({ids:H.utilities.map(u=>u.id),texts:H.children.list.flatMap(function f(o){return o.list?o.list.flatMap(f):[o];}).filter(o=>typeof o.text==='string'&&/army/i.test(o.text)).map(o=>o.text),key:window.kingdomGame.textures.exists('hud-army')}));
 check(!army.ids.includes('army')&&army.texts.length===0&&!army.key,`?debug=1&${q}: no Army button, no Army text, no hud-army texture`,army);
 check(!errors.length,`?debug=1&${q}: no page errors`,errors.slice(0,3));await ctx.close();
}

// 2. The full flow at the S24 fullscreen viewport (cap 1, as in M1).
{
 const {ctx,page,errors}=await open(780,360,'level=34&tavernTest=1');
 await page.evaluate(()=>{B.setHeroPosition(900,560);B.syncUnits();});await waitTicks(page,10);
 const r0=await res(page);check(r0.wood>=500&&r0.iron>=100&&r0.gold===1000,'the Tavern test starts with 1000 Gold / 500 Wood / 100 Iron',r0);
 // Build > Tavern card > a cell > Confirm
 const u=await page.evaluate(()=>H.controls.utilities.find(x=>x.id==='build'));await tapLogical(page,u.x,u.y);
 const cards=await page.evaluate(()=>({tavern:H.buildPanel.hits[7].visible,label:H.buildPanel.labels[4].text,n:H.buildPanel.labels.filter(l=>l.visible).length}));
 check(cards.tavern&&/Tavern/.test(cards.label),'Build shows a Tavern card with its price',cards);await shot(page,'780x360-1-build-card');
 const card=await centre(page,'H.buildPanel.hits[7]');await tapLogical(page,card.x,card.y);
 const cell=await page.evaluate(()=>{const cam=B.cameras.main,pb=H.buildPanel.bounds;for(let y=150;y<320;y+=12)for(let x=220;x<720;x+=12){if(x>pb.x-10&&x<pb.x+pb.width+10&&y>pb.y-10&&y<pb.y+pb.height+10)continue;const wx=(x+cam.scrollX),wy=(y+cam.scrollY)/.72,col=Math.floor(wx/48),row=Math.floor(wy/48);if(!S.placementReason('tavern',col,row))return {x,y,col,row};}return null;});
 check(!!cell,'a free cell is on screen',cell);await tapLogical(page,cell.x,cell.y);
 const sel=await page.evaluate(()=>({kind:H.buildPanel.model.kind,placement:B.placement&&{...B.placement},status:H.buildPanel.status.text}));
 check(sel.kind==='tavern'&&sel.placement?.kind==='tavern','the cell is selected for the Tavern',sel);// (a screenshot between two taps swallows the next touch in this harness, so the stills come after the taps)
 const before=await res(page);const confirm=await centre(page,'H.buildPanel.hits[2]');await tapLogical(page,confirm.x,confirm.y);
 await waitTicks(page,3);const t=await page.evaluate(()=>Object.values(S.state.structures).find(b=>b.tavern)?.id);
 check(!!t,'Confirm builds a Tavern structure');
 const after=await res(page);check(Math.abs((before.wood-after.wood)-100)<2&&Math.abs((before.iron-after.iron)-10)<1&&after.gold===before.gold,'the Tavern cost 100 Wood and 10 Iron and no Gold (minus a little income)',{before,after});
 await shot(page,'780x360-2-confirmed');const cancel=await centre(page,'H.buildPanel.hits[3]');await tapLogical(page,cancel.x,cancel.y);
 const early=await page.evaluate(()=>({ready:S.tavernStanding(),reason:S.tavernReason({action:'hire',merc:'roland'})}));check(!early.ready&&early.reason==='The Tavern is still being built','hiring is refused while it is being built',early);
 await waitTicks(page,170);
 check(await page.evaluate(()=>S.tavernStanding()),'the Tavern finishes');await frames(page,6);await shot(page,'780x360-3-tavern-built');

 // Tap the Tavern: the panel opens.
 await page.evaluate(()=>{B.setHeroPosition(B.simulation.state.structures[Object.values(S.state.structures).find(b=>b.tavern).id].x-140,Object.values(S.state.structures).find(b=>b.tavern).y+20);B.syncUnits();});await waitTicks(page,5);
 const pos=await page.evaluate(id=>{const v=B.visuals.get(id),c=B.cameras.main,b=v.getBounds();return {x:b.centerX-c.scrollX,y:b.centerY-c.scrollY};},t);await tapLogical(page,pos.x,pos.y);
 check(await page.evaluate(()=>H.tavern.visible),'tapping the Tavern opens its panel');await shot(page,'780x360-4-panel');
 const geo=await page.evaluate(()=>{const g=H.tavern.geometry,s=g.scale;return {top:g.y*s,bottom:(g.y+g.height)*s,left:g.x*s,right:(g.x+g.width)*s,vh:window.innerHeight,vw:window.innerWidth};});
 // Hire Roland.
 const w0=await res(page);let b=await rowButton(page,0,'primary');await tapLogical(page,b.x,b.y);await waitTicks(page,4);
 const w1=await res(page),sl=await slots(page),ids=await allyIds(page);
 check(sl?.length===1&&sl[0].merc==='roland'&&sl[0].status==='alive'&&ids.length===1,'Hire Roland: one hero appears and takes the slot',{sl,ids});
 check(w0.gold-w1.gold===150&&w1.wood>=w0.wood&&w1.iron>=w0.iron,'Hire Roland charged 150 Gold once and no Wood or Iron',{w0,w1});
 await shot(page,'780x360-5-hired');
 // The cap: another hire is refused with a reason and costs nothing.
 b=await rowButton(page,2,'primary');const w2=await res(page);await tapLogical(page,b.x,b.y);await waitTicks(page,3);const w3=await res(page);
 check((await slots(page)).length===1&&w2.gold===w3.gold&&Math.abs(w2.wood-w3.wood)<2&&/cap/i.test(await note(page)),'a second hire at cap 1 is refused: "Hero cap reached", nothing charged',{note:await note(page)});await shot(page,'780x360-6-cap');
 // Close; the Hero Command HUD shows the hero and takes all three commands.
 const closeAt=await centre(page,'H.tavern.closeHit');await tapLogical(page,closeAt.x,closeAt.y);
 check(!(await page.evaluate(()=>H.tavern.visible))&&(await page.evaluate(()=>H.heroBar.container.visible)),'Close hides the panel; the hero bar shows the hired hero');
 const hid=ids[0];
 const orderOf=()=>page.evaluate(id=>S.state.units[id]?.ally?.order.type,hid);
 const portrait=await page.evaluate(()=>{const b=H.heroBar.bounds[0];return {x:b.centerX,y:b.centerY};});
 await tapLogical(page,portrait.x,portrait.y);const q=await page.evaluate(()=>H.heroBar.geometry.popover);const cmd=k=>({x:q.x+k*(q.button.width+q.button.gap)+q.button.width/2,y:q.y+q.height/2});
 await tapLogical(page,cmd(2).x,cmd(2).y);
 const pt=await page.evaluate(()=>{const id=H.heroState.selected;for(let y=160;y<320;y+=16)for(let x=240;x<700;x+=16){const p=B.heroPick('defend',x,y).point;if(p&&!S.allyOrderReason(id,{type:'defend',...p}))return {x,y};}return null;});
 await tapLogical(page,pt.x,pt.y);await waitTicks(page,3);check(await orderOf()==='defend','the hired hero takes Defend through the hero bar',await orderOf());
 await tapLogical(page,portrait.x,portrait.y);await tapLogical(page,cmd(1).x,cmd(1).y);
 const foe=await page.evaluate(()=>{for(let y=150;y<330;y+=10)for(let x=200;x<740;x+=10){const p=B.heroPick('attack',x,y);if(p.targetId&&!S.allyOrderReason(H.heroState.selected,{type:'attack',targetId:p.targetId}))return {x,y,id:p.targetId};}return null;});
 if(foe){await tapLogical(page,foe.x,foe.y);await waitTicks(page,3);check(await orderOf()==='attack','the hired hero takes Attack',await orderOf());}else check(false,'a valid Attack target on screen');
 await tapLogical(page,portrait.x,portrait.y);await tapLogical(page,cmd(0).x,cmd(0).y);await waitTicks(page,3);check(await orderOf()==='follow','the hired hero takes Follow',await orderOf());

 // The hero falls: its slot stays occupied and the Tavern offers Revive.
 await page.evaluate(id=>{const u=S.state.units[id];u.hp=1;const t=Object.values(S.state.structures).find(s=>s.team==='red'&&s.hp>0)??S.state.bases['red-base'];t.protectionTick=0;S.hit(t,u,1e6,'direct');},hid);await waitTicks(page,4);
 let sl2=await slots(page);check(sl2?.[0]?.status==='dead'&&!(await page.evaluate(()=>H.heroBar.container.visible)),'the fallen hero leaves the hero bar but keeps its slot',sl2);
 await page.evaluate(()=>{B.setHeroPosition(Object.values(S.state.structures).find(b=>b.tavern).x-140,Object.values(S.state.structures).find(b=>b.tavern).y+20);B.syncUnits();});await waitTicks(page,5);
 const pos2=await page.evaluate(id=>{const v=B.visuals.get(id),c=B.cameras.main,b=v.getBounds();return {x:b.centerX-c.scrollX,y:b.centerY-c.scrollY};},t);await tapLogical(page,pos2.x,pos2.y);
 const bh=await rowButton(page,1,'primary');const w4=await res(page);await tapLogical(page,bh.x,bh.y);await waitTicks(page,3);
 check((await slots(page)).length===1&&/cap/i.test(await note(page)),'with a fallen hero in the slot a different hire is still refused (cap)',{note:await note(page)});
 await shot(page,'780x360-7-fallen');
 b=await rowButton(page,0,'primary');const w5=await res(page);await tapLogical(page,b.x,b.y);await waitTicks(page,3);const w6=await res(page);
 sl2=await slots(page);check(sl2[0].status==='reviving'&&w5.gold-w6.gold===68&&w6.wood>=w5.wood&&w6.iron>=w5.iron,'Revive charged 68 Gold once (45% of 150) and no Wood or Iron; the hero is returning',{sl2,w5,w6});
 const left=sl2[0].remaining;check(left>=895&&left<=900,'the revive timer starts at about 30 s (900 ticks)',left);
 await shot(page,'780x360-8-reviving');
 // Tapping Revive again charges nothing.
 await tapLogical(page,b.x,b.y);const w7=await res(page);check(w7.gold===w6.gold,'a second tap does not charge again');
 // Dismiss needs a second tap.
 const d=await rowButton(page,0,'dismiss');await tapLogical(page,d.x,d.y);check((await slots(page)).length===1,'the first Dismiss tap only arms it ("Sure?")');await shot(page,'780x360-9-dismiss-armed');
 await tapLogical(page,d.x,d.y);await waitTicks(page,3);check((await slots(page)).length===0,'the second Dismiss tap releases the slot');
 // Hire again into the freed slot, let it fall, revive, fast-forward 30 s.
 b=await rowButton(page,2,'primary');await tapLogical(page,b.x,b.y);await waitTicks(page,3);
 const kid=(await allyIds(page))[0];check(!!kid&&(await slots(page))[0].merc==='kael','the freed slot takes a new hire (Kael)');
 await page.evaluate(id=>{const u=S.state.units[id];u.hp=1;const t=S.state.bases['red-base'];t.protectionTick=0;S.hit(t,u,1e6,'direct');},kid);await waitTicks(page,3);
 b=await rowButton(page,2,'primary');await tapLogical(page,b.x,b.y);await waitTicks(page,2);
 const x2=await centre(page,'H.tavern.closeHit');await tapLogical(page,x2.x,x2.y);await page.evaluate(()=>{for(let i=0;i<905;i++)S.advance(1000/30);}); // panel closed: real time, 30 s of ticksawait waitTicks(page,5);
 const back=await slots(page);check(back[0].status==='alive'&&(await allyIds(page)).length===1,'after 30 s the revived hero is back',back);
 // The Tavern falls: hiring and reviving are refused.
 await page.evaluate(()=>{const t=Object.values(S.state.structures).find(b=>b.tavern),r=S.state.bases['red-base'];r.protectionTick=0;S.hit(r,t,1e6,'direct');});await waitTicks(page,3);
 const gone=await page.evaluate(()=>({standing:S.tavernStanding(),hire:S.tavernReason({action:'hire',merc:'roland'}),revive:S.tavernReason({action:'revive',slot:0})}));
 check(!gone.standing&&gone.hire==='Build a Tavern first'&&gone.revive==='Build a Tavern first','a destroyed Tavern refuses hiring and reviving',gone);
 check(!errors.length,'no page errors in the S24 flow',errors.slice(0,3));await ctx.close();
}

// 3. 780x250 smoke: the panel fits and works.
{
 const {ctx,page,errors}=await open(780,250,'level=34&tavernTest=1');
 await page.evaluate(()=>{const id='smoke';const p=(()=>{for(let r=0;r<40;r++)for(let c=0;c<60;c++)if(!S.placementReason('tavern',c,r)&&Math.hypot((c+.5)*48-S.hero.x,(r+.5)*48-S.hero.y)<260)return {c,r};})();S.send({type:'place',requestId:id,kind:'tavern',col:p.c,row:p.r});});
 await waitTicks(page,200);await page.evaluate(()=>H.openTavern());await frames(page,6);
 const fit=await page.evaluate(()=>{const g=H.tavern.geometry,s=g.scale;return {top:g.y*s,bottom:(g.y+g.height)*s,vh:window.innerHeight};});
 check(fit.top>=0&&fit.bottom<=fit.vh,'780x250: the Tavern panel fits the screen',fit);await shot(page,'780x250-panel');
 const b=await rowButton(page,1,'primary');await tapLogical(page,b.x,b.y);await waitTicks(page,3);check((await slots(page))?.[0]?.merc==='borin','780x250: Hire Borin by touch');
 check(!errors.length,'780x250: no page errors',errors.slice(0,3));await ctx.close();
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);

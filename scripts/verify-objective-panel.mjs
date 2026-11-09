import {chromium} from '@playwright/test';
// Objective panel + result-button input. Needs a dev server: PROTOTYPE_URL (default http://127.0.0.1:5441) with ?debug=1&level=N.
// Sections: 1) all 30 missions x 3 canvases (panel geometry/text), 2) Build single-toggle by touch on the panel missions,
// 3) result-button press/release (mouse + touch), restart and Next Mission, 4) C3M1 phase transition.
const URL=process.env.PROTOTYPE_URL||'http://127.0.0.1:5441',SIZES=[[780,360],[844,390],[960,540]];
const br=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let pass=0,fail=0;const check=(ok,name,detail)=>{if(ok){pass++;}else{fail++;console.log('FAIL',name,detail===undefined?'':JSON.stringify(detail));}};
const boot=async(vw,vh,n,touch=true,seed=false)=>{const ctx=await br.newContext({viewport:{width:vw,height:vh},hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),page=await ctx.newPage();page.errors=[];
 if(seed)await page.addInitScript(()=>{try{if(!sessionStorage.getItem('seeded')){localStorage.setItem('kingdom-clash.campaign.v2',JSON.stringify({version:1,levels:{'campaign-01':{clears:1},'campaign-02':{clears:1}}}));sessionStorage.setItem('seeded','1');}}catch{}});page.on('pageerror',e=>page.errors.push(e.message));
 await page.goto(`${URL}/?debug=1&level=${n}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').simulation?.clock.tick>5&&window.kingdomGame.scene.getScene('HUD')?.missionPanel,null,{timeout:40000});await page.waitForTimeout(500);
 await page.evaluate(()=>{window.H=kingdomGame.scene.getScene('HUD');window.B=kingdomGame.scene.getScene('Battle');window.toPage=(x,y)=>{const r=kingdomGame.canvas.getBoundingClientRect();return {x:r.left+x/960*r.width,y:r.top+y/540*r.height};};});return {ctx,page};};
const geometry=()=>{const rect=(o,r)=>({x:o.x-r,y:o.y-r,width:2*r,height:2*r}),hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
 const mb=H.missionBounds,L=B.campaignLevel,shown=H.missionPanel.visible&&mb.width>0;
 const parts=shown?[H.missionHeading,H.missionPhase,...H.missionRows,H.missionKeep].filter(o=>o.visible&&o.text!=='').map(o=>({text:o.text.slice(0,30),b:o.getBounds()})):[];
 const outside=parts.filter(p=>p.b.x<mb.x-.5||p.b.right>mb.x+mb.width+.5||p.b.y<mb.y-.5||p.b.bottom>mb.y+mb.height+.5).map(p=>p.text);
 const ctrls=[...H.controls.utilities.map(u=>({id:u.id,...rect(u,u.hitRadius)})),...H.controls.abilities.map(a=>({id:a.id,...rect(a,a.hitRadius)})),{id:'joystick',...rect(H.controls.joystick,H.controls.joystick.radius)}];
 return {id:L?.id,shown,compact:H.compactObjective,collapsed:H.missionCollapsed,b:{x:Math.round(mb.x),y:Math.round(mb.y),w:Math.round(mb.width),h:Math.round(mb.height)},headingLines:H.missionHeading.getWrappedText().length,outside,
  covers:shown?ctrls.filter(c=>hit(mb,c)).map(c=>c.id):[],inCanvas:!shown||mb.x>=0&&mb.y>=0&&mb.x+mb.width<=960&&mb.y+mb.height<=540};};
// ---- 1. all 30 missions x 3 sizes
const ids=await(async()=>{const {page,ctx}=await boot(960,540,1);const r=await page.evaluate(async()=>{const m=await import('/src/data/campaignLevels.ts');return m.campaign.list().filter(l=>/^campaign-\d+$/.test(l.id)).map(l=>({id:l.id,n:l.number}));});await ctx.close();return r;})();
check(ids.length===30,'30 campaign missions',ids.length);
const panelMissions=[];
for(const l of ids)for(const [vw,vh] of SIZES){const {page,ctx}=await boot(vw,vh,l.n);const g=await page.evaluate(geometry);const tag=`${l.id} ${vw}x${vh}`;
 if(g.shown){if(!panelMissions.includes(l.n))panelMissions.push(l.n);
  check(g.headingLines===1,tag+' heading on one line',g);check(!g.outside.length,tag+' every text inside the panel',g);check(!g.covers.length,tag+' panel clear of Build/Shop/skills/joystick',g);check(g.inCanvas,tag+' panel inside the canvas',g);}
 else check(g.compact,tag+' plate mission shows no floating panel',g);
 check(!page.errors.length,tag+' no page errors',page.errors);await ctx.close();}
console.log('panel missions:',panelMissions.join(','));check(JSON.stringify(panelMissions.sort((a,b)=>a-b))==='[2,21]','only C1M2 and C3M1 use the floating panel',panelMissions);
// ---- 2. Build single toggle by touch, panel vs Build panel, on the panel missions
for(const n of panelMissions)for(const [vw,vh] of SIZES){const {page,ctx}=await boot(vw,vh,n);const tag=`level ${n} ${vw}x${vh}`;
 const b=await page.evaluate(()=>{const u=H.controls.utilities.find(u=>u.id==='build');return toPage(u.x,u.y);});
 await page.touchscreen.tap(b.x,b.y);await page.waitForTimeout(400);
 const open=await page.evaluate(()=>({open:H.utilityPanel.visible&&H.utilityMode==='Build',bounds:H.buildPanel.bounds}));
 check(open.open,tag+' one tap opens Build',open);
 const g=await page.evaluate(geometry);const ov=g.shown&&g.b.x<open.bounds.x+open.bounds.width&&open.bounds.x<g.b.x+g.b.w&&g.b.y<open.bounds.y+open.bounds.height&&open.bounds.y<g.b.y+g.b.h;
 check(!ov,tag+' mission panel does not overlap the open Build panel',{g,build:open.bounds});check(!g.shown||g.headingLines===1&&!g.outside.length&&!g.covers.length,tag+' panel layout holds with Build open (or steps aside)',g);
 await page.touchscreen.tap(b.x,b.y);await page.waitForTimeout(400);
 check(!(await page.evaluate(()=>H.utilityPanel.visible)),tag+' second tap closes Build (single toggle)');
 const g2=await page.evaluate(geometry);check(g2.shown&&g2.headingLines===1&&!g2.outside.length&&!g2.covers.length,tag+' panel is back and clean after Build closes',g2);
 await ctx.close();}
// ---- 3. result buttons
const finish=async(page,how)=>{await page.evaluate(how=>{if(how==='defeat')B.simulation.state.bases['blue-base'].hp=0;else{const m=B.simulation.mission;m.counts.set('towers',2);m.counts.set('waves',6);}},how);await page.waitForFunction(()=>H.results.visible,null,{timeout:15000});await page.waitForTimeout(300);};
const center=(page,name)=>page.evaluate(n=>{const b=H[n].getBounds();return toPage(b.centerX,b.centerY);},name);
const restarted=(page)=>page.evaluate(()=>!H.results.visible&&B.simulation.clock.tick<60);
const gameplayPoints=()=>({battlefield:toPage(560,100),joystick:toPage(H.controls.joystick.x,H.controls.joystick.y),attack:toPage(H.controls.abilities.find(a=>a.id==='attack').x,H.controls.abilities.find(a=>a.id==='attack').y)});
for(const [mode,touch,vw,vh] of [['mouse',false,960,540],['touch',true,844,390]]){
 for(const origin of ['battlefield','joystick','attack']){const {page,ctx}=await boot(vw,vh,2,touch);const pts=await page.evaluate(gameplayPoints),from=pts[origin],tag=`${mode} press on ${origin}`;
  const cdp=touch?await ctx.newCDPSession(page):null;
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x,y:from.y,id:1}]});else{await page.mouse.move(from.x,from.y);await page.mouse.down();}
  await finish(page,'defeat');const to=await center(page,'restartHit');
  if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to.x,y:to.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await page.mouse.move(to.x,to.y);await page.mouse.up();}
  await page.waitForTimeout(500);check(!(await restarted(page)),tag+', released over Retry: nothing happens',await page.evaluate(()=>({tick:B.simulation.clock.tick,results:H.results.visible})));
  check(await page.evaluate(()=>H.results.visible&&!H.resultPress.armed),tag+': overlay still up, nothing armed');
  // a proper press+release on the same button works
  if(touch)await page.touchscreen.tap(to.x,to.y);else await page.mouse.click(to.x,to.y);await page.waitForTimeout(700);
  check(await restarted(page),tag+' then a real tap on Retry restarts the mission',await page.evaluate(()=>({tick:B.simulation.clock.tick,results:H.results.visible})));
  check(await page.evaluate(()=>!H.resultPress.armed&&!H.restarting),tag+' after restart nothing is armed and the HUD accepts input');
  await ctx.close();}
 // press on the button, release elsewhere: no action; a cancel while armed: no action
 {const {page,ctx}=await boot(vw,vh,2,touch);await finish(page,'defeat');const to=await center(page,'restartHit');
  await page.mouse.move(to.x,to.y);await page.mouse.down();await page.mouse.move(to.x,to.y+120);await page.mouse.up();await page.waitForTimeout(400);
  check(!(await restarted(page))&&await page.evaluate(()=>!H.resultPress.armed),mode+' press on Retry, release outside: no action, disarmed');
  await page.mouse.move(to.x,to.y);await page.mouse.down();await page.evaluate(()=>kingdomGame.canvas.dispatchEvent(new Event('touchcancel')));await page.mouse.up();await page.waitForTimeout(400);
  check(!(await restarted(page)),mode+' press on Retry, cancel, release: no action');
  await ctx.close();}
}
// Next Mission (victory on C1M2): wrong origin does nothing; a real tap goes to the next mission; Chapter/Missions buttons likewise gated
{const {page,ctx}=await boot(844,390,2,true,true);const cdp=await ctx.newCDPSession(page);const from=await page.evaluate(()=>toPage(560,100));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x,y:from.y,id:1}]});await finish(page,'victory');
 const info=await page.evaluate(()=>({next:H.nextHit.visible,resultNext:H.resultNext}));check(info.next&&info.resultNext==='campaign-03','C1M2 victory shows Next Mission to campaign-03',info);
 const to=await center(page,'nextHit');await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to.x,y:to.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(600);
 check(await page.evaluate(()=>B.campaignLevel.id==='campaign-02'&&H.results.visible),'press began on the battlefield, released on Next Mission: stays on C1M2');
 await page.touchscreen.tap(to.x,to.y);await page.waitForFunction(()=>B.campaignLevel?.id==='campaign-03'&&B.simulation.clock.tick>3,null,{timeout:20000}).catch(()=>{});
 const after=await page.evaluate(()=>({id:B.campaignLevel?.id,results:H.results.visible,armed:H.resultPress.armed}));check(after.id==='campaign-03'&&!after.results&&!after.armed,'a real tap on Next Mission starts campaign-03 with a clean HUD',after);
 const g=await page.evaluate(()=>({compact:H.compactObjective}));check(page.errors.length===0,'no page errors through Next Mission',page.errors);void g;await ctx.close();}
// ---- 4. C3M1 phase transition
for(const [vw,vh] of SIZES){const {page,ctx}=await boot(vw,vh,21);const tag=`C3M1 ${vw}x${vh}`;
 const before=await page.evaluate(()=>({rows:H.missionView.rows.map(r=>r.state),heading:H.missionHeading.text}));
 await page.evaluate(()=>{const m=B.simulation.mission;m.counts.set('towers',2);m.counts.set('waves',4);});await page.waitForTimeout(900);
 const after=await page.evaluate(geometry),view=await page.evaluate(()=>({rows:H.missionView.rows.map(r=>r.state),phase:H.missionView.activePhase,heading:H.missionHeading.text}));
 check(before.rows.join()==='active,active,locked','before: phase "hold" active, "storm" locked',before);check(view.rows.join()==='complete,complete,active'&&view.phase==='storm','after the counters finish: hold complete, storm active',view);
 check(after.headingLines===1&&!after.outside.length&&!after.covers.length&&after.inCanvas&&after.shown,tag+' panel still clean after the phase change',after);await ctx.close();}
console.log(`\n${pass} passed, ${fail} failed`);await br.close();process.exit(fail?1:0);

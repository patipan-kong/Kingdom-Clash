import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='test-results/m1e-results';await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:936,height:432},hasTouch:true,isMobile:true});
const page=await context.newPage(),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
const frames=async()=>{const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>f+5,frame);};
await page.addInitScript(()=>localStorage.setItem('kingdom-clash.campaign.v1',JSON.stringify({version:1,levels:Object.fromEntries([1,2,3,4,5].map(n=>['campaign-0'+n,{clears:1}]))})));
async function launch(campaign=true){
 await page.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5189/');await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));
 await page.evaluate(campaign=>{const g=window.kingdomGame;g.scene.stop('MainMenu');g.scene.start('Battle',campaign?{mode:'campaign',levelId:'campaign-05',returnTo:{scene:'CampaignSelect',data:{chapterId:'first-war',selectedLevelId:'campaign-05'}}}:{mode:'quick',encounter:'prototype'});},campaign);
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.results&&window.kingdomGame.scene.getScene('Battle').simulation);
}
async function finish(victory,campaign=true){await page.evaluate(({victory,campaign})=>{
 const s=window.kingdomGame.scene.getScene('Battle').simulation;
 if(campaign&&victory){for(const id of ['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'])s.hit(s.hero,s.state.structures[id],1e9,'direct');}
 else{const target=s.state.bases[victory?'red-base':'blue-base'];s.hit({...s.hero,id:'result-test',team:victory?'blue':'red',kind:victory?'minion-blue':'minion-red'},target,1e9,'direct');}
 for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);
 },{victory,campaign});await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD')?.results?.visible);await frames();}
async function tap(property){const p=await page.evaluate(property=>{const h=window.kingdomGame.scene.getScene('HUD'),b=h[property].getBounds();return window.kingdomViewport.transform().logicalToCss({x:b.centerX,y:b.centerY});},property);await page.touchscreen.tap(p.x,p.y);await frames();}
async function geometry(name,campaign=true){const m=await page.evaluate(campaign=>{
 const h=window.kingdomGame.scene.getScene('HUD'),ui=h.mobileResults,k=window.kingdomViewport.transform().scale,canvas=window.kingdomGame.canvas.getBoundingClientRect(),f=h.campaignResultBounds;
 const hits=campaign?[h.restartHit,h.levelSelectHit,h.mainMenuHit]:[h.restartHit];
 return {frameInside:f.x>=0&&f.y>=0&&f.x+f.width<=window.kingdomGame.scale.width+.1&&f.y+f.height<=540+.1,
 targets:hits.map(o=>{const b=o.getBounds(),label=o.getData('label').getBounds();return {width:b.width*k,height:b.height*k,inside:b.left>=f.x&&b.right<=f.x+f.width+.1&&b.top>=f.y&&b.bottom<=f.y+f.height+.1,labelFits:label.left>=b.left&&label.right<=b.right&&label.top>=b.top&&label.bottom<=b.bottom};}),
 title:ui.container.list.filter(o=>o.type==='Text').map(o=>({text:o.text,b:o.getBounds()})),
 fullscreenHidden:document.getElementById('fullscreen-toggle').hidden&&document.getElementById('fullscreen-status').hidden,
 safe:canvas.x>=0&&canvas.right<=innerWidth+.1&&canvas.y>=0&&canvas.bottom<=innerHeight+.1,
 scrolls:ui.scrolls.map(s=>({height:s.hit.height*k,max:s.max*k})),ended:window.kingdomGame.scene.getScene('Battle').simulation.ended};
 },campaign);check(name+' bounded frame, legible action labels, 48px targets and no fullscreen overlay',m.frameInside&&m.targets.every(t=>t.width>=48&&t.height>=47.9&&t.inside&&t.labelFits)&&m.fullscreenHidden&&m.safe&&m.ended);return m;}
try{
 await launch();await finish(true);await geometry('936x432 Victory');check('Campaign result uses real objective outcome',await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.resultTitle.text==='VICTORY'&&h.campaignResultProgress.text.includes('3/3 complete')&&h.resultDetail.text.includes('All mission objectives completed');}));await page.screenshot({path:root+'/victory-936x432.png'});
 await tap('restartHit');check('Retry starts fresh campaign with hidden results',await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=window.kingdomGame.scene.getScene('Battle');return !h.results.visible&&!b.simulation.ended&&b.simulation.state.structures['red-tower-front-north'].hp>0;}));
 await finish(false);await geometry('936x432 Defeat');check('Defeat preserves actual failure outcome',await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').resultTitle.text==='DEFEAT'));await page.screenshot({path:root+'/defeat-936x432.png'});
 const listeners=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').input.listenerCount('pointermove'));
 await page.setViewportSize({width:568,height:320});await page.evaluate(()=>{for(const [k,v] of Object.entries({left:32,right:12,top:8,bottom:12}))document.getElementById('game').style.setProperty('--safe-'+k,v+'px');});await frames();await geometry('568x320 asymmetric safe-area Defeat');
 check('Result resize does not accumulate drag listeners',await page.evaluate(n=>window.kingdomGame.scene.getScene('HUD').input.listenerCount('pointermove')===n,listeners));await page.screenshot({path:root+'/defeat-568x320-safe.png'});
 // Synthetic long presentation text exercises internal overflow only; it is never saved or used for victory evaluation.
 await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');h.campaignResultProgress.setText(Array.from({length:12},()=>h.campaignResultProgress.text).join('\n'));h.layoutMobileResults();});
 const point=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),s=h.mobileResults.scrolls[1],b=s.hit.getBounds();return {...window.kingdomViewport.transform().logicalToCss({x:b.centerX,y:b.centerY}),max:s.max};});
 await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,400);await frames();check('Long objective details scroll internally without moving result actions',point.max>0&&await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').mobileResults.scrolls[1].offset()>0));
 const touchPoint=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('HUD').mobileResults.scrolls[1],b=s.hit.getBounds();return {...window.kingdomViewport.transform().logicalToCss({x:b.centerX,y:b.centerY}),before:s.offset()};});
 const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchPoint.x,y:touchPoint.y,id:4}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchPoint.x,y:touchPoint.y+30,id:4}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frames();check('Objective details respond to touch drag',await page.evaluate(before=>window.kingdomGame.scene.getScene('HUD').mobileResults.scrolls[1].offset()<before,touchPoint.before));await cdp.detach();
 await tap('levelSelectHit');check('Level Select uses original return route',await page.evaluate(()=>window.kingdomGame.scene.isActive('CampaignSelect')&&!window.kingdomGame.scene.isActive('Battle')));
 await launch();await finish(false);await tap('mainMenuHit');check('Main Menu uses original result action',await page.evaluate(()=>window.kingdomGame.scene.isActive('MainMenu')));
 await launch(false);await finish(false,false);await geometry('Quick-play result',false);check('Quick-play retains its Restart Match action',await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.restartHit.visible&&h.restartHit.getData('label').text==='RESTART MATCH'&&!h.levelSelectHit.visible&&!h.mainMenuHit.visible;}));await tap('restartHit');check('Quick-play restart resets match',await page.evaluate(()=>!window.kingdomGame.scene.getScene('Battle').simulation.ended));
 await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(true));check('Ordinary Pause fullscreen controls return after Retry',await page.evaluate(()=>!document.getElementById('fullscreen-toggle').hidden));
 const desktop=await browser.newContext({viewport:{width:960,height:540}}),dp=await desktop.newPage();await dp.addInitScript(()=>localStorage.setItem('kingdom-clash.campaign.v1',JSON.stringify({version:1,levels:Object.fromEntries([1,2,3,4,5].map(n=>['campaign-0'+n,{clears:1}]))})));await dp.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5189/');await dp.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));await dp.evaluate(()=>{const g=window.kingdomGame;g.scene.stop('MainMenu');g.scene.start('Battle',{mode:'campaign',levelId:'campaign-05'});});await dp.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD')?.results);await dp.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hit({...s.hero,id:'desktop-fixture',team:'red',kind:'minion-red'},s.state.bases['blue-base'],1e9,'direct');for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);});await dp.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);check('Desktop retains existing result presentation and actions',await dp.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return !h.mobileResults&&h.resultTitle.visible&&h.campaignResultProgress.visible&&[h.restartHit,h.levelSelectHit,h.mainMenuHit].every(o=>o.visible)&&h.campaignResultBounds.width===680;}));await desktop.close();
 check('No browser runtime errors',errors.length===0);
}catch(e){errors.push(e.stack);console.error(e);}finally{await browser.close();await writeFile(root+'/verification.json',JSON.stringify({checks,errors,physicalDevice:false},null,2));}if(errors.length)process.exitCode=1;

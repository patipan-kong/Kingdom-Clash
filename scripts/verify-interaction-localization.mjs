import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer,preview} from 'vite';
import {campaignFrames,clickCampaignControl} from './campaign-browser-helpers.mjs';

const source=await createServer({server:{host:'127.0.0.1',port:0,ws:false}});
let server,browser;
try{
 const {translate}=await source.ssrLoadModule('/src/i18n/index.ts');
 const {interactionMessages}=await source.ssrLoadModule('/src/i18n/interactionMessages.ts');
 const {campaign}=await source.ssrLoadModule('/src/data/campaignLevels.ts');
 const {RESOURCE_UNITS}=await source.ssrLoadModule('/src/data/resources.ts');
 const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
 for(const [key,[en,th,ja]] of Object.entries(interactionMessages)){
  assert.ok(en&&th&&ja,key);
  assert.deepEqual(tokens(th),tokens(en),key+' TH');
  assert.deepEqual(tokens(ja),tokens(en),key+' JA');
 }
 const firstChapter5=campaign.get('campaign-41');
 const prior=campaign.list().filter(level=>level.number<45&&level.id.startsWith('campaign-'));
 const save=JSON.stringify({version:1,levels:Object.fromEntries(prior.map(level=>[level.id,{clears:1}]))});
 server=await preview({preview:{host:'127.0.0.1',port:0}});
 const url='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});

 for(const locale of ['en','th','ja'])for(const [width,height] of [[960,540],[780,360],[568,260]]){
  const tag=`${locale} ${width}×${height}`,input=height===540?'mouse':'touch';
  if(process.env.PHASE4_CASE&&!tag.startsWith(process.env.PHASE4_CASE))continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:input==='touch'});
  const tr=(key,params)=>translate(key,locale,params),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.addInitScript(({locale,save})=>{
   localStorage.setItem('kingdom-clash.locale.v1',locale);
   localStorage.setItem('kingdom-clash.campaign.v2',save);
  },{locale,save});
  const openBattle=async levelId=>{
   await page.goto(url);
   await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));
   await page.evaluate(levelId=>window.kingdomGame.scene.getScene('MainMenu').scene.start('MissionBriefing',{levelId}),levelId);
   await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
   await clickCampaignControl(page,'startButton',undefined,input,'MissionBriefing');
   await page.waitForFunction(()=>window.kingdomGame.scene.isActive('HUD'));
   await page.evaluate(()=>{window.H=window.kingdomGame.scene.getScene('HUD');window.B=window.kingdomGame.scene.getScene('Battle');window.S=B.simulation;});
  };
  await openBattle(firstChapter5.id);
  await page.evaluate(units=>{
   if(!S.setup.shop||!S.setup.tavern)throw Error('Expected live Chapter 5 equipment and Tavern');
   S.encounter={...S.encounter,waves:[],continuous:false};
   window.gold=value=>{S.economy.balances.gold=value*units;S.state.gold=value;};
   S.hero.hp=S.hero.maxHp;
  },RESOURCE_UNITS);
  const read=expression=>page.evaluate(expression);
  const wait=async(expression,value)=>{
   try{await page.waitForFunction(([expression,value])=>eval(expression)===value,[expression,value]);}
   catch(error){throw new Error(`${tag} ${expression}: expected ${value}, got ${await read(expression)}`,{cause:error});}
  };
  const at=async ({x,y})=>{
   const point=await page.evaluate(({x,y})=>{const c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+x*c.width/960,y:c.y+y*c.height/540};},{x,y});
   if(input==='touch')await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
   await campaignFrames(page,2);
  };
  const tap=async expression=>at(await read(`(()=>{const o=${expression};if(!o.visible)throw Error('Invisible control: '+${JSON.stringify(expression)});const b=o.getBounds();return {x:b.centerX,y:b.centerY};})()`));
  const panelLayout=async (expression,label)=>{
   const issues=await page.evaluate(expression=>{
    const p=eval(expression),f=p.bounds,slack=1.5,scale=window.kingdomGame.canvas.getBoundingClientRect().height/540;
    const inside=(r,b)=>r.left>=b.left-slack&&r.right<=b.right+slack&&r.top>=b.top-slack&&r.bottom<=b.bottom+slack;
    const frame={left:f.x,top:f.y,right:f.x+f.width,bottom:f.y+f.height};
    const hits=p.container.list.filter(o=>o.visible&&o.input?.enabled&&o!==p.blocker);
    const labels=p.container.list.filter(o=>o.visible&&o.type==='Text'&&o.text);
    const pairs=p.buttons instanceof Map?[...p.buttons.values()].map(b=>[b.hit,b.label]):p.controls?.map(b=>[b.hit,b.label])??p.actionLabels?.map((o,i)=>[p.hits[i],o])??p.rows?.flatMap(r=>[[r.hitPrimary,r.primary],[r.hitDismiss,r.dismiss]])??[];
    const issues=[];
    if(!inside(frame,{left:0,top:0,right:960,bottom:540}))issues.push(['outside canvas',f]);
    for(const o of labels){
     const b=o.getBounds();
     if(!inside(b,frame))issues.push(['outside panel',o.text,b,frame]);
     if(parseFloat(o.style.fontSize)*scale<7.9)issues.push(['too small',o.text,parseFloat(o.style.fontSize)*scale]);
     if(!o.style.fontFamily.includes(document.documentElement.lang==='th'?'Noto Sans Thai':document.documentElement.lang==='ja'?'Noto Sans JP':'Arial'))issues.push(['wrong font',o.text]);
    }
    for(const hit of hits){const b=hit.getBounds();if(!inside(b,frame)||Math.min(b.width,b.height)*scale<39.9)issues.push(['touch target',b]);}
    for(const [hit,label] of pairs)if(hit.visible&&label.visible&&label.text&&!inside(label.getBounds(),hit.getBounds()))issues.push(['button label',label.text,label.getBounds(),hit.getBounds()]);
    for(const [i,a] of labels.entries())for(const b of labels.slice(i+1)){
     const r=a.getBounds(),s=b.getBounds();
     if(Math.min(r.right,s.right)-Math.max(r.left,s.left)>2&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>2)issues.push(['text overlap',a.text,b.text,r,s]);
    }
    return issues;
   },expression);
   assert.deepEqual(issues,[],`${tag} ${label} ${JSON.stringify(issues)}`);
  };

  await tap('H.skillOpen');
  assert.ok(await read('H.skillPanel.visible'));
  assert.equal(await read('H.skills.rows[0].effect.text'),tr('skillBashEffect'));
  await panelLayout('H.skills','Skills');
  // The simulation can reject a valid button press if available points change before the queued command runs.
  await page.evaluate(()=>{
   const send=S.send;
   S.send=function(command){if(command.type==='learn'){S.state.heroProgression.skillPoints=0;S.send=send;}return send.call(S,command);};
  });
  await tap('H.skills.rows[0].hit');
  await wait('H.skills.status.text',locale==='en'?'No Skill Points':tr('skillNoPoints'));
  assert.equal(await read('S.state.heroProgression.ranks.bash'),0);
  await page.evaluate(()=>{S.state.heroProgression.skillPoints=1;});
  await page.waitForFunction(()=>performance.now()-H.skills.model.last.at>=350);
  await wait('H.skills.rows[0].hit.input.enabled',true);
  await tap('H.skills.rows[0].hit');
  await wait('S.state.heroProgression.ranks.bash',1);
  assert.equal(await read('S.state.heroProgression.skillPoints'),0);
  await wait('H.skills.status.text',tr('skillLearned',{skill:tr('battleBashFull'),rank:1}));
  if(await read('H.skills.compact')){
   for(const index of [1,2,3,4]){
    await tap('H.skills.next');await wait('H.skills.model.selected',index);
    await panelLayout('H.skills','Skills page '+index);
   }
   await tap('H.skills.previous');await wait('H.skills.model.selected',3);
  }
  await tap('H.skills.closeHit');await wait('H.skillPanel.visible',false);

  await page.evaluate(()=>{const keep=S.state.bases['blue-base'];B.setHeroPosition(keep.x+120,keep.y);B.syncUnits();});
  await tap("H.utilities.find(u=>u.id==='shop').hit");await wait('H.shop.visible',true);
  assert.equal(await read('H.shop.names[0].text'),tr('itemSword'));
  await panelLayout('H.shop','Shop catalog');
  if(await read('H.shop.compact'))await tap("H.shop.buttons.get('item-iron-sword').hit");
  await panelLayout('H.shop','Shop item details');
  assert.ok((await read("H.shop.buttons.get('iron-sword').label.text")).includes(tr('shopNeedGold')));
  assert.equal(await read("H.shop.buttons.get('iron-sword').hit.input.enabled"),false);
  await tap("H.shop.buttons.get('iron-sword').hit");
  assert.equal(await read('S.state.inventory.slots.filter(Boolean).length'),0);
  await page.evaluate(()=>gold(500));
  await wait("H.shop.buttons.get('iron-sword').hit.input.enabled",true);
  await page.waitForFunction(()=>H.time.now>=H.shop.purchaseAfter);
  await tap("H.shop.buttons.get('iron-sword').hit");
  await wait('S.state.gold',300);
  await wait('H.shop.model.message',tr('shopPurchased',{item:tr('itemIronSword')}));
  assert.equal(await read('S.state.inventory.instances[S.state.inventory.slots[0]].itemId'),'iron-sword');
  if(await read('H.shop.compact'))await tap("H.shop.buttons.get('back').hit");
  await tap("H.shop.buttons.get('equipment').hit");
  await tap("H.shop.buttons.get('slot-0').hit");
  await panelLayout('H.shop','Equipment');
  await tap("H.shop.buttons.get('sell').hit");
  await panelLayout('H.shop','Equipment confirmation');
  await tap("H.shop.buttons.get('cancel').hit");
  assert.equal(await read('S.state.gold'),300);
  await tap("H.shop.buttons.get('shop').hit");
  await tap("H.shop.buttons.get('item-flame-blade').hit");
  if(!await read('H.shop.compact'))await tap("H.shop.buttons.get('recipe').hit");
  await panelLayout('H.shop','Fusion');
  await tap("H.shop.buttons.get('component-iron-sword').hit");
  await panelLayout('H.shop','Fusion component picker');
  await tap("H.shop.buttons.get('slot-0').hit");
  assert.equal(await read("H.shop.model.components['iron-sword']===S.state.inventory.slots[0]"),true);
  await tap("H.shop.buttons.get('close').hit");await wait('H.shop.visible',false);

  await tap("H.utilities.find(u=>u.id==='build').hit");
  await panelLayout('H.buildPanel','Build catalog');
  assert.equal(await read('H.buildPanel.purposes[4].text'),tr('buildHires'));
  await tap('H.buildPanel.hits[7]');
  await panelLayout('H.buildPanel','Build placement');
  const cell=await page.evaluate(()=>{
   const c=B.cameras.main;
   const blockers=[H.buildPanel.blocker,H.joystickHit,H.skillOpen,H.pauseButton.hit,...H.abilities.map(a=>a.hit),...H.utilities.map(u=>u.hit)].map(o=>o.getBounds());
   for(let row=7;row<17;row++)for(let col=2;col<15;col++){
    const x=(col+.5)*48-c.scrollX,y=(row+.5)*48*.72-c.scrollY;
    if(x>70&&x<875&&y>H.topHudBottom+36&&y<470&&!blockers.some(b=>b.contains(x,y))&&!S.placementReason('tavern',col,row))return {x,y};
   }
   throw Error('No visible valid Tavern cell');
  });
  await at(cell);await wait('H.buildPanel.status.text',tr('buildValid'));
  await tap('H.buildPanel.hits[2]');
  await page.waitForFunction(()=>Object.values(S.state.structures).some(s=>s.tavern));
  assert.deepEqual(await read('Object.values(S.state.structures).find(s=>s.tavern).paidResources'),{wood:100,iron:10});
  await at(cell);await wait('H.buildPanel.status.text',tr('battleTavernBuilt'));
  assert.equal(await read('H.buildPanel.hits[2].input.enabled'),false);
  await tap('H.buildPanel.hits[3]');await wait('H.buildPanel.container.visible',false);
  await page.evaluate(()=>{for(let i=0;i<12&&!S.tavernStanding();i++)S.advance(500);});
  await page.waitForFunction(()=>S.tavernStanding());
  const tavern=()=>page.evaluate(()=>{
   const u=Object.values(S.state.structures).find(s=>s.tavern),c=B.cameras.main;
   const art=B.visuals.get(u.id).list.find(o=>o.input?.enabled);
   const x=u.x-c.scrollX,y=u.y*.72-c.scrollY;
   // The short HUD and nearby art can cover different parts of the Tavern as the camera settles.
   for(const dy of [-18,-6,-30,-42,-54,-66,-78])for(const dx of [0,-16,16,-32,32]){
    const p={x:x+dx,y:y+dy};
    if(p.x<0||p.x>=960||p.y<0||p.y>=540||H.input.hitTestPointer(p).length)continue;
    const hits=B.input.hitTestPointer(p);
    if(B.input.sortGameObjects(hits,p)[0]===art)return {x:p.x,y:p.y};
   }
   throw Error(`No unobstructed Tavern hit near ${x},${y}`);
  });
  await at(await tavern());await wait('H.tavern.visible',true);
  await panelLayout('H.tavern','Tavern');
  assert.equal(await read('H.tavern.rows[0].name.text'),tr('tavernRoland'));
  await page.evaluate(()=>gold(0));
  await tap('H.tavern.rows[0].hitPrimary');await wait('H.tavern.status.text',tr('battleGoldShort'));
  assert.equal(await read('S.state.tavern.slots.length'),0);
  await page.evaluate(()=>gold(300));
  await tap('H.tavern.rows[0].hitPrimary');await wait('S.state.tavern.slots[0]?.merc','roland');
  assert.equal(await read('S.state.gold'),150);
  await tap('H.tavern.closeHit');await wait('H.tavern.visible',false);

  await tap('H.heroBar.slots[0].hit');
  assert.deepEqual(await read('H.heroBar.buttons.map(b=>b.label.text)'),['heroFollow','heroAttack','heroDefend'].map(key=>tr(key)));
  const commandFit=await read(`H.heroBar.buttons.every(b=>{const r=b.hit.getBounds(),l=b.label.getBounds(),scale=H.heroBar.geometry.scale;return r.width*scale>=47.9&&r.height*scale>=47.9&&l.left>=r.left&&l.right<=r.right&&l.bottom<=r.bottom;})`);
  assert.ok(commandFit,tag+' command labels and touch targets');
  await tap('H.heroBar.buttons[1].hit');await wait('H.heroState.mode','attack');
  const point=await page.evaluate(()=>{
   for(let y=H.topHudBottom+20;y<325;y+=16)for(let x=260;x<690;x+=16)if(!B.heroPick('attack',x,y).targetId&&!H.heroBar.prompt.chip.getBounds().contains(x,y))return {x,y};
   throw Error('No empty screen point');
  });
  await at(point);await wait('H.heroBar.prompt.text.text',tr('heroAttackTarget'));
  assert.ok(await read(`(()=>{const {prompt:p,scale}=H.heroBar.geometry,o=H.heroBar.prompt.text,t=o.getBounds();return parseFloat(o.style.fontSize)*scale>=9.5&&t.top>=p.y&&t.bottom<=p.y+p.height&&t.right<=H.heroBar.prompt.chip.getBounds().left;})()`),tag+' reject fits target prompt');
  await tap('H.heroBar.prompt.chip');await wait('H.heroState.mode','idle');
  await tap('H.heroBar.slots[0].hit');await tap('H.heroBar.buttons[2].hit');await wait('H.heroState.mode','defend');
  const pointToHold=await page.evaluate(()=>{
   for(let y=H.topHudBottom+20;y<325;y+=16)for(let x=260;x<690;x+=16){
    const p=B.heroPick('defend',x,y).point;
    if(!H.heroBar.prompt.chip.getBounds().contains(x,y)&&!S.allyOrderReason(H.heroState.selected,{type:'defend',...p}))return {x,y};
   }
   throw Error('No valid screen point to defend');
  });
  const order='S.state.units[S.state.tavern.slots[0].unitId].ally.order.type';
  await at(pointToHold);await wait(order,'defend');
  await page.evaluate(()=>B.game.events.emit('focus-map',1100,600));
  await campaignFrames(page);
  await tap('H.heroBar.slots[0].hit');await tap('H.heroBar.buttons[1].hit');await wait('H.heroState.mode','attack');
  const target=await page.evaluate(()=>{
   for(let y=H.topHudBottom+12;y<410;y+=12)for(let x=145;x<800;x+=12){
    const targetId=B.heroPick('attack',x,y).targetId;
    if(targetId&&!S.allyOrderReason(H.heroState.selected,{type:'attack',targetId})&&!H.input.hitTestPointer({x,y}).length)return {x,y,targetId};
   }
   throw Error('No visible enemy to attack');
  });
  await at(target);await wait(order,'attack');
  assert.equal(await read('S.state.units[S.state.tavern.slots[0].unitId].ally.order.targetId'),target.targetId);
  await tap('H.heroBar.slots[0].hit');await tap('H.heroBar.buttons[0].hit');await wait(order,'follow');

  await page.evaluate(()=>B.followHero());await campaignFrames(page);
  await page.evaluate(()=>{const hero=S.state.units[S.state.tavern.slots[0].unitId];S.hit(S.state.bases['red-base'],hero,1e6,'direct');});
  await wait('S.state.tavern.slots[0].status','dead');
  await at(await tavern());await wait('H.tavern.visible',true);
  assert.ok((await read('H.tavern.rows[0].primary.text')).startsWith(tr('tavernRevive')));
  await tap('H.tavern.rows[0].hitPrimary');await wait('S.state.tavern.slots[0].status','reviving');
  assert.equal(await read('S.state.gold'),82);
  await panelLayout('H.tavern','Tavern revive');
  await tap('H.tavern.rows[0].hitDismiss');await wait('H.tavern.rows[0].dismiss.text',tr('tavernSure'));
  await panelLayout('H.tavern','Tavern dismiss');
  await tap('H.tavern.rows[0].hitDismiss');await wait('S.state.tavern.slots.length',0);
  assert.equal(await read('S.state.gold'),82);
  await tap('H.tavern.closeHit');await wait('H.tavern.visible',false);
  if(width===568){
   await openBattle('campaign-45');
   await tap("H.utilities.find(u=>u.id==='build').hit");
   await panelLayout('H.buildPanel','Five-card Build tray');
   const cards=await read('H.buildPanel.hits.filter(h=>h.visible).map(h=>h.width*H.buildPanel.scale)');
   assert.equal(cards.length,6);
   assert.ok(cards.every(width=>width>=43.9),tag+' five construction cards and Cancel fit at touch size');
   await tap('H.buildPanel.hits[6]');await wait('H.buildPanel.model.kind','ballista');
   assert.ok((await read('H.buildPanel.heading.text')).startsWith(tr('buildRepairBallista')));
   await panelLayout('H.buildPanel','Ballista repair tray');
   await tap('H.buildPanel.hits[3]');await wait('H.buildPanel.container.visible',false);
  }
  assert.deepEqual(errors,[]);
  await page.close();
  console.log(`PASS ${tag} — Skills, Shop, Build, Tavern and Hero Bar labels, bounds, inputs and gameplay state`);
 }
 console.log(`PASS ${Object.keys(interactionMessages).length} complete EN/TH/JA rows and named placeholder parity`);
}finally{
 await browser?.close();
 await new Promise(resolve=>server?server.httpServer.close(resolve):resolve());
 await source.close();
}

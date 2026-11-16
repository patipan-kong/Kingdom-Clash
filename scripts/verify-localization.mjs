import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer,preview} from 'vite';
import {campaignFrames,clickCampaignControl,openCampaignBriefing} from './campaign-browser-helpers.mjs';

const production=process.argv.includes('production');
const server=production?await preview({preview:{host:'127.0.0.1',port:0}}):
 await createServer({server:{host:'127.0.0.1',port:0}});
const progressKey='kingdom-clash.campaign.v2';
const sample={
 en:{menu:'Defend the Azure Realm',chapter:'The First War',mission:'Hold the Ford',start:'START BATTLE'},
 th:{menu:'ปกป้องอาณาจักรอาซูร์',chapter:'ศึกแรก',mission:'ป้องกันท่าข้าม',start:'เริ่มการรบ',font:'Noto Sans Thai'},
 ja:{menu:'アズール王国を守れ',chapter:'最初の戦い',mission:'渡河地点を守れ',start:'戦闘開始',font:'Noto Sans JP'},
};
let browser;
try{
 if(!production)await server.listen();
 const url=`http://127.0.0.1:${server.httpServer.address().port}/`;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 for(const viewport of [{width:960,height:540},{width:780,height:360}]){
  const mobile=viewport.height<400,input=mobile?'touch':'mouse';
  const page=await browser.newPage({viewport,hasTouch:mobile});
  page.setDefaultTimeout(20000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.stack));
  await page.goto(url);
  const active=scene=>page.waitForFunction(scene=>window.kingdomGame?.scene.isActive(scene),scene);
  const click=(scene,control,key)=>clickCampaignControl(page,control,key,input,scene);
  const label=async(scene,expected,container,hit)=>{
   const metrics=await page.evaluate(({scene,expected,container,hit})=>{
    const s=window.kingdomGame.scene.getScene(scene);
    const objects=container?s[container].list:s.children.list;
    const text=objects.find(object=>object.type==='Text'&&object.text===expected);
    if(!text)return null;
    const b=text.getBounds(),target=hit?s[hit].getBounds():null;
    const canvas=text.canvas,rgba=text.context.getImageData(0,0,canvas.width,canvas.height).data;
    return {font:text.style.fontFamily,width:b.width,pixel:rgba.some((channel,i)=>i%4===3&&channel>0),
     fits:b.left>=0&&b.right<=960&&b.top>=0&&b.bottom<=540&&(!target||
      b.left>=target.left&&b.right<=target.right&&b.top>=target.top&&b.bottom<=target.bottom)};
   },{scene,expected,container,hit});
   assert.ok(metrics?.pixel&&metrics.fits,`${scene}: ${expected} is drawn within bounds: ${JSON.stringify(metrics)}`);
   return metrics;
  };
  await active('MainMenu');
  if(!production&&!mobile){
   const fallback=await page.evaluate(async()=>{
    const {translate}=await import('/src/i18n/index.ts');
    const {messages}=await import('/src/i18n/messages.ts');
    const ja=messages.chapter[2];
    try{delete messages.chapter[2];return translate('chapter','ja',{chapter:4});}
    finally{messages.chapter[2]=ja;}
   });
   assert.equal(fallback,'CHAPTER 4');
  }
  await page.evaluate(()=>{window.originalGame=window.kingdomGame;});
  const switchTo=async locale=>{
   await click('MainMenu','languageButtons',locale);
   await page.waitForFunction(({locale,menu})=>document.documentElement.lang===locale&&
    window.kingdomGame.scene.getScene('MainMenu').children.list.some(o=>o.text===menu),{locale,menu:sample[locale].menu});
   assert.equal(await page.evaluate(()=>window.kingdomGame===window.originalGame),true);
  };
  const route=async(locale,launch=false)=>{
   const {menu,chapter,mission,start,font}=sample[locale];
   const metrics=await label('MainMenu',menu);
   if(font){
    assert.ok(metrics.font.includes(font));
    const loaded=await page.evaluate(font=>Array.from(document.fonts).some(f=>f.family.replaceAll('"','')===font&&f.status==='loaded'),font);
    assert.equal(loaded,true,`${font} loaded before layout`);
   }
   await click('MainMenu','campaignButton');await active('ChapterSelect');
   await label('ChapterSelect',chapter,'cards');
   await click('ChapterSelect','chapterButtons','first-war');await active('CampaignSelect');
   await label('CampaignSelect',chapter);
   await label('CampaignSelect',mission,'cards');
   await openCampaignBriefing(page,'campaign-01',input);
   await label('MissionBriefing',mission,'content');
   await label('MissionBriefing',start,undefined,'startButton');
   if(launch){
    await click('MissionBriefing','startButton');await active('Battle');
    await page.waitForFunction(()=>window.visualReady);
    const battle=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').launch);
    assert.deepEqual(battle,{mode:'campaign',levelId:'campaign-01',returnTo:{scene:'CampaignSelect',data:{chapterId:'first-war',selectedLevelId:'campaign-01'}}});
   }else{
    await click('MissionBriefing','backButton');await active('CampaignSelect');
    await click('CampaignSelect','backButton');await active('ChapterSelect');
    await click('ChapterSelect','backButton');await active('MainMenu');
   }
  };
  await route('en');
  await switchTo('th');await route('th');
  await page.reload();await active('MainMenu');await campaignFrames(page);
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'th');
  await label('MainMenu',sample.th.menu);
  await page.evaluate(()=>{window.originalGame=window.kingdomGame;});
  await switchTo('ja');await route('ja',true);
  const saved=JSON.stringify({version:1,levels:{'campaign-01':{clears:2}}});
  await page.evaluate(([key,saved])=>localStorage.setItem(key,saved),[progressKey,saved]);
  await page.reload();await active('MainMenu');await campaignFrames(page);
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'ja');
  await page.evaluate(()=>{window.originalGame=window.kingdomGame;});
  await switchTo('en');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),progressKey),saved);
  assert.equal(await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').continueState),'continue');
  assert.match(await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').missionSubtitle.text),/Fortify the Crossing/);
  assert.deepEqual(errors,[]);
  await page.close();
  console.log(`PASS ${production?'production':'development'} ${viewport.width}×${viewport.height}: locales, fonts, layout, C1M1 launch, progress`);
 }
}finally{
 await browser?.close();
 if(production)await new Promise(resolve=>server.httpServer.close(resolve));
 else await server.close();
}

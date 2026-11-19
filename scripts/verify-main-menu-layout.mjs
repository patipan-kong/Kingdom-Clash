import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5371/';
const evidence=process.env.MENU_LAYOUT_EVIDENCE;
if(evidence)await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
const desktop=[[1920,1080],[2560,1600],[2560,1080],[900,700],[360,300]];
const mobile=[[780,360],[780,250]];
const failures=[];

async function verify(page,width,height,locale,mode){
 await page.waitForFunction(([w,h])=>{
  const game=window.kingdomGame,rect=game?.canvas.getBoundingClientRect();
  return game?.scene.isActive('MainMenu')&&Math.abs(rect.height-Math.min(h,w*540/960))<=1;
 },[width,height]);
 const frame=await page.evaluate(()=>window.kingdomGame.loop.frame);
 await page.waitForFunction(f=>window.kingdomGame.loop.frame>=f+4,frame);
 const issues=await page.evaluate(locale=>{
  const game=window.kingdomGame,s=game.scene.getScene('MainMenu'),f=s.menuFrame,errors=[];
  const inside=(a,b)=>a.left>=b.left-.5&&a.right<=b.right+.5&&a.top>=b.top-.5&&a.bottom<=b.bottom+.5;
  const overlap=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  const bounds={left:f.x,right:f.x+f.width,top:f.y,bottom:f.y+f.height};
  const canvas={left:0,right:960,top:0,bottom:540};
  const hits=[s.continueButton,s.campaignButton,s.achievementsButton,s.creditsButton,...s.languageButtons.values()];
  const texts=s.children.list.filter(o=>o.type==='Text'&&o.visible&&o.text);
  if(document.documentElement.lang!==locale)errors.push('locale did not load');
  if(!inside(bounds,canvas))errors.push('panel outside canvas');
  const scale=Math.max(.38,game.canvas.getBoundingClientRect().height/540);
  if(Math.abs(s.continueButton.height-(scale<.9?Math.max(42,38/scale):54))>1)errors.push('primary button uses stale viewport sizing');
  for(const [i,hit] of hits.entries()){
   const b=hit.getBounds(),label=texts.find(t=>Math.abs(t.y-hit.y)<.5&&Math.abs(t.x-hit.x)<hit.width/2);
   if(!inside(b,bounds)||hits.slice(i+1).some(other=>overlap(b,other.getBounds())))errors.push('button collision or clipping');
   if(!label||!inside(label.getBounds(),b))errors.push(`label outside own button: ${label?.text??i}`);
  }
  for(const [i,text] of texts.entries()){
   const b=text.getBounds();
   if(!inside(b,bounds)||texts.slice(i+1).some(other=>overlap(b,other.getBounds())))errors.push(`text collision or clipping: ${text.text}`);
   if(hits.some(hit=>overlap(b,hit.getBounds())&&!inside(b,hit.getBounds())))errors.push(`text collides with a button: ${text.text}`);
  }
  if(s.missionSubtitle.getWrappedText().length!==1)errors.push('mission summary wraps');
  return errors;
 },locale);
 const tag=`${locale} ${width}x${height} ${mode}`;
 console.log(`${issues.length?'FAIL':'PASS'} ${tag}${issues.length?' '+issues.join('; '):''}`);
 if(issues.length)failures.push(tag);
 if(evidence&&mode==='boot')await page.screenshot({path:`${evidence}/${locale}-${width}x${height}.png`});
}

try{
 for(const locale of ['en','th','ja'])for(const touch of [false,true]){
  const sizes=touch?mobile:desktop,[width,height]=sizes[0];
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?3:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(locale=>localStorage.setItem('kingdom-clash.locale.v1',locale),locale);
  await page.goto(url);
  for(const [index,[w,h]] of sizes.entries()){
   // Exercise a live resize as well as a fresh boot at each canvas size.
   if(index>0){await page.setViewportSize({width:w,height:h});await verify(page,w,h,locale,'resize');await page.reload();}
   await verify(page,w,h,locale,'boot');
  }
  assert.deepEqual(errors,[]);
  await context.close();
 }
}finally{await browser.close();}
assert.deepEqual(failures,[]);

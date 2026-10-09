import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='docs/phase2c/tower-hotfix',checks=[],errors=[];
await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);};
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5182/';
async function load(encounter){await page.goto(`${url}?encounter=${encounter}`);await page.waitForFunction(()=>window.visualReady);}
async function appearance(){return page.evaluate(()=>{
 const b=window.kingdomGame.scene.getScene('Battle');
 const art=id=>b.visuals.get(id).list.find(o=>o.type==='Image');
 return {staticBlue:art('tower').texture.key,red:Object.values(b.simulation.state.structures).filter(t=>t.team==='red').map(t=>({id:t.id,texture:art(t.id).texture.key,team:t.team,range:t.range,damage:t.damage})),zoom:b.cameras.main.zoom};
});}
try{
 await load('extended');
 const before=await appearance();
 check(before.staticBlue==='tower'&&before.red.length===7&&before.red.every(t=>t.texture==='tower-red'),'Pre-built Azure and all seven Crimson towers use team textures');
 check(before.zoom===1&&before.red.every(t=>t.range===240&&t.damage===18),'Normal gameplay zoom and tower combat stats retained');
 const built=await page.evaluate(()=>{
  const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;
  let cell;for(let col=5;col<15&&!cell;col++)for(let row=8;row<16&&!cell;row++)if(!s.placementReason('tower',col,row))cell={col,row};
  s.send({type:'place',requestId:'appearance-check',kind:'tower',...cell});
  for(let i=0;i<152;i++)s.advance(1000/30+.01);s.setPaused(true);b.syncUnits();
  const t=Object.values(s.state.structures).find(t=>t.team==='blue');
  const art=b.visuals.get(t.id).list.find(o=>o.type==='Image');
  return {team:t.team,progress:t.progress,texture:art.texture.key};
 });
 check(built.team==='blue'&&built.progress===1&&built.texture==='tower','New tower built through place command keeps Azure identity through completion');
 const pixels=await page.evaluate(()=>{
  const b=window.kingdomGame.scene.getScene('Battle'),source=b.textures.get('tower').getSourceImage(),red=b.textures.get('tower-red').getSourceImage();
  const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);
  const original=ctx.getImageData(0,0,c.width,c.height),a=original.data,r=red.getContext('2d').getImageData(0,0,c.width,c.height).data;
  // Canvas stores premultiplied alpha; use the same roundtrip for neutral pixels.
  ctx.putImageData(original,0,0);const control=ctx.getImageData(0,0,c.width,c.height).data;
  let colored=0,neutral=0,alpha=true,crimson=true;
  for(let i=0;i<a.length;i+=4){alpha&&=a[i+3]===r[i+3];if(a[i+3]&&a[i+2]>a[i]+20&&a[i+2]>a[i+1]+15){colored++;crimson&&=r[i]>r[i+1]&&r[i]>r[i+2];}else if(control[i]!==r[i]||control[i+1]!==r[i+1]||control[i+2]!==r[i+2])neutral++;}
  return {colored,neutral,alpha,crimson,width:c.width,height:c.height,redWidth:red.width,redHeight:red.height};
 });
 check(pixels.colored>1000&&pixels.neutral===0&&pixels.alpha&&pixels.crimson&&pixels.width===pixels.redWidth&&pixels.height===pixels.redHeight,'Real sprite blue pixels become red; neutral materials, alpha and dimensions identical');
 const outside=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.buildingMode=true;b.cameras.main.stopFollow().setScroll(560,150);return Object.values(b.simulation.state.structures).filter(t=>t.team==='red').every(t=>Math.hypot(t.x-b.hero.x,t.y-b.hero.y)>t.range);});
 check(outside,'Crimson appearance visible while Guardian is outside every enemy tower range');
 await page.waitForTimeout(150);
 // The only screenshot: both factions in the same extended match at normal zoom.
 await page.screenshot({path:`${root}/comparison-844x390.png`});
 const target=await page.evaluate(()=>{
  const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.setPaused(false);
  const ok=b.setHeroPosition(1340,504);for(let i=0;i<3;i++)s.advance(1000/30+.01);s.setPaused(true);
  const attacks=s.drainEvents().filter(e=>e.type==='attack'&&s.state.structures[e.id]?.team==='red');
  return {ok,attacks:attacks.map(e=>({team:s.state.structures[e.id].team,targetTeam:s.state.units[e.targetId]?.team??s.state.structures[e.targetId]?.team??s.state.bases[e.targetId]?.team})),heroHp:s.hero.hp};
 });
 check(target.ok&&target.attacks.length>0&&target.attacks.every(a=>a.team==='red'&&a.targetTeam==='blue'),'Crimson towers still target and attack Azure units through unchanged combat engine');
 const fixture=await page.evaluate(()=>{
  const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,original=Object.values(s.state.structures).find(t=>t.team==='blue');
  // Supplemental renderer fixture: opposing ownership at identical coordinates, neutral id.
  const t={...original,id:'ownership-fixture',team:'red'};s.state.structures[t.id]=t;b.syncUnits();
  const art=b.visuals.get(t.id).list.find(o=>o.type==='Image');return art.texture.key;
 });
 check(fixture==='tower-red','Newly added red tower uses ownership even at an Azure tower position with a neutral id');
 await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').scene.restart());
 await page.waitForFunction(()=>window.visualReady&&Object.keys(window.kingdomGame.scene.getScene('Battle').simulation.state.structures).length===7);
 const restarted=await appearance();check(restarted.staticBlue==='tower'&&restarted.red.every(t=>t.texture==='tower-red'),'Restart retains correct faction textures');
 await load('prototype');const prototype=await appearance();check(prototype.staticBlue==='tower'&&prototype.red.length===0,'Switching to prototype retains Azure tower appearance');
 await load('extended');const extended=await appearance();check(extended.red.length===7&&extended.red.every(t=>t.texture==='tower-red'),'Switching back to extended restores Crimson tower appearance');
 check(errors.length===0,'No browser runtime or console errors');
 await writeFile(`${root}/verification.json`,JSON.stringify({url,checks,errors,pixels,built,target},null,2));
 console.log(JSON.stringify({checks:checks.length,errors},null,2));
}finally{await browser.close();}

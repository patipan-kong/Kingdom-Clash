import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// S3.3: effective CSS-pixel text sizes, clipping, overlap and touch targets of the Campaign menus (Main Menu, Campaign Select, Mission
// Briefing) at desktop 960x540 and mobile landscape 844x390. Sizes are measured from the live Phaser Text objects times the canvas scale,
// not from bounding boxes. MIN_BODY_CSS is the readability target for body text on mobile landscape.
const root=process.env.READABILITY_EVIDENCE_ROOT||'test-results/menu-readability';await mkdir(root,{recursive:true});
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5210/';
const MIN_BODY=+(process.env.MIN_BODY_CSS||12),MIN_LABEL=+(process.env.MIN_LABEL_CSS||11),enforce=process.env.READABILITY_ENFORCE!=='0';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true});const checks=[],errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});if(enforce)assert.ok(ok,name);console.log((ok?'PASS ':'FAIL ')+name);};
const frames=async(n=4)=>{const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([f,n])=>window.kingdomGame.loop.frame>=f+n,[f,n]);};
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:20000});
async function tap(sceneName,prop,key){const pt=await page.evaluate(({sceneName,prop,key})=>{const g=window.kingdomGame,s=g.scene.getScene(sceneName),o=key===undefined?s[prop]:s[prop].get(key),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{sceneName,prop,key});await page.touchscreen.tap(pt.x,pt.y);await frames();}
const measure=name=>page.evaluate(name=>{
 const g=window.kingdomGame,s=g.scene.getScene(name),r=g.canvas.getBoundingClientRect(),k=r.height/540,ov=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
 const texts=s.children.list.filter(o=>o.type==='Text'&&o.visible&&o.text),rows=texts.map(t=>({text:t.text.slice(0,28),css:+(parseFloat(t.style.fontSize)*k).toFixed(1),bold:t.style.fontStyle==='bold',b:t.getBounds()}));
 const hits=s.children.list.filter(o=>o.type==='Rectangle'&&o.input).map(o=>{const b=o.getBounds();return{w:+(b.width*k).toFixed(1),h:+(b.height*k).toFixed(1),b};});
 const inside=b=>b.left>=-.5&&b.top>=-.5&&b.right<=960.5&&b.bottom<=540.5;
 return{scale:+k.toFixed(3),canvas:{w:+r.width.toFixed(1),h:+r.height.toFixed(1)},
  sizes:rows.map(({text,css,bold})=>({text,css,bold})),
  minCss:Math.min(...rows.map(t=>t.css)),
  clipped:rows.filter(t=>!inside(t.b)).map(t=>t.text),
  overlaps:rows.flatMap((a,i)=>rows.slice(i+1).filter(b=>ov(a.b,b.b)).map(b=>a.text+' x '+b.text)),
  hits:hits.map(({w,h})=>({w,h})),hitOverlap:hits.some((a,i)=>hits.slice(i+1).some(b=>ov(a.b,b.b))),
  hitInside:hits.every(h=>inside(h.b)),
  textOverHit:rows.filter(t=>hits.some(h=>ov(t.b,h.b)&&!(t.b.left>=h.b.left-1&&t.b.right<=h.b.right+1&&t.b.top>=h.b.top-1&&t.b.bottom<=h.b.bottom+1))).map(t=>t.text),
  lowest:Math.max(...rows.map(t=>t.b.bottom)),backTop:s.backButton?s.backButton.getBounds().top:null,cardBottoms:s.cards?s.cards.list.filter(o=>o.type==='Text').map(o=>o.getBounds().bottom):null};},name);
async function run(tag,viewport){
 await page.setViewportSize(viewport);await page.goto(base);await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu'));await frames(6);
 await page.screenshot({path:`${root}/main-menu-${tag}.png`});const main=await measure('MainMenu');
 await tap('MainMenu','campaignButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await frames(6);
 await page.screenshot({path:`${root}/campaign-select-${tag}.png`});const select=await measure('CampaignSelect');
 const out={main,select};
 for(const [id,n] of [['campaign-01','briefing-1'],['campaign-05','briefing-5'],['campaign-20','briefing-20']]){
  await tap('CampaignSelect','levelButtons',id);await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));await frames(6);
  await page.screenshot({path:`${root}/${n}-${tag}.png`});out[n]=await measure('MissionBriefing');
  await tap('MissionBriefing','backButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await frames(4);
 }
 evidence[tag]=out;
 for(const [n,m] of Object.entries(out)){
  const body=m.sizes.filter(t=>!t.bold||t.css>=MIN_LABEL).length;
  check(m.clipped.length===0&&m.overlaps.length===0&&m.textOverHit.length===0,`${tag}: ${n} has no clipped, overlapping or button-colliding text`+(m.overlaps.length?' ['+m.overlaps.join('; ')+']':'')+(m.textOverHit.length?' ['+m.textOverHit.join('; ')+']':''));
  check(m.hitInside&&!m.hitOverlap&&m.hits.every(h=>h.h>=44&&h.w>=44),`${tag}: ${n} touch targets are inside the canvas, separate and >= 44 CSS px`);
  check(m.minCss>=(tag==='mobile'?MIN_LABEL:9.5),`${tag}: ${n} smallest text is ${m.minCss} CSS px (>= ${tag==='mobile'?MIN_LABEL:9.5})`);
  if(tag==='mobile'){const bodyMin=Math.min(...m.sizes.filter(t=>!t.bold&&!/^(CHAPTER|INTRODUCTORY|STANDARD|FULL)/.test(t.text)).map(t=>t.css),99);check(bodyMin>=MIN_BODY,`${tag}: ${n} body text is at least ${MIN_BODY} CSS px (smallest ${bodyMin})`);}
  if(n==='select'&&m.backTop!==null)check(Math.max(...m.cardBottoms)<=m.backTop+.5,`${tag}: Level Select cards end above the Back button`);
 }
}
try{
 await run('desktop',{width:960,height:540});
 await run('mobile',{width:844,height:390});
 await run('mobile-small',{width:740,height:360});
 check(errors.length===0,'No browser page, console or HTTP errors');
}catch(e){errors.push(e.stack||String(e));}
const report={checks,passed:checks.filter(c=>c.passed).length,total:checks.length,errors,evidence};await writeFile(`${root}/report.json`,JSON.stringify(report,null,2));await browser.close();
console.log(JSON.stringify({passed:report.passed,total:report.total,errors,evidenceRoot:root},null,2));if(errors.length||report.passed!==report.total)process.exit(1);

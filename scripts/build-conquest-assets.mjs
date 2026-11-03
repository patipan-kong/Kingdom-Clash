// Chapter 4 Conquest Map art: node scripts/build-conquest-assets.mjs <source.png>
// Writes public/assets/conquest-map.webp (the painted background, 1672x941) and public/assets/conquest-map-azure-keep.webp
// (a small overlay: the Crimson Fortress hue-shifted to Azure, feathered into the scene, drawn only once Mission 6 is conquered).
// The overlay covers OVERLAY in background pixels; src/ui/conquestMap.ts holds the same rectangle. Encoding runs in Chrome's canvas, so there is no new dependency.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const source=process.argv[2];if(!source){console.error('usage: node scripts/build-conquest-assets.mjs <source.png>');process.exit(1);}
const OVERLAY={x:1290,y:0,w:382,h:380};
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
const png=(await readFile(source)).toString('base64');
const out=await page.evaluate(async({png,OVERLAY})=>{
 const img=await new Promise((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=bad;i.src='data:image/png;base64,'+png;});
 const blob=c=>new Promise(r=>c.toBlob(r,'image/webp',c.__q));
 const b64=async c=>{const b=await blob(c),buf=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<buf.length;i+=0x8000)s+=String.fromCharCode(...buf.subarray(i,i+0x8000));return btoa(s);};
 const bg=document.createElement('canvas');bg.width=img.width;bg.height=img.height;bg.getContext('2d').drawImage(img,0,0);bg.__q=.8;
 const {x,y,w,h}=OVERLAY,ov=document.createElement('canvas');ov.width=w;ov.height=h;const o=ov.getContext('2d');
 o.filter='hue-rotate(205deg) saturate(.95) brightness(1.05)';o.drawImage(img,x,y,w,h,0,0,w,h);o.filter='none';
 o.globalCompositeOperation='destination-in';const g=o.createRadialGradient(215,150,60,215,150,205);g.addColorStop(0,'#000');g.addColorStop(.62,'#000');g.addColorStop(1,'rgba(0,0,0,0)');o.fillStyle=g;o.fillRect(0,0,w,h);ov.__q=.85;
 return {size:[img.width,img.height],bg:await b64(bg),overlay:await b64(ov)};
},{png,OVERLAY});
await writeFile('public/assets/conquest-map.webp',Buffer.from(out.bg,'base64'));
await writeFile('public/assets/conquest-map-azure-keep.webp',Buffer.from(out.overlay,'base64'));
console.log('source',out.size.join('x'),'background',Buffer.from(out.bg,'base64').length,'bytes, overlay',Buffer.from(out.overlay,'base64').length,'bytes');
await browser.close();

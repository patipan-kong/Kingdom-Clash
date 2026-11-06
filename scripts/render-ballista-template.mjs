// Renders the current (canvas-drawn) Azure Ballista from its own drawing code at 8x onto a 1024x1024 transparent canvas: the Codex template for art/ballista-anim.
// Usage: node scripts/render-ballista-template.mjs <dev server url> <out png>
import {chromium} from 'file:///G:/work/ark/arkhero-tower/node_modules/@playwright/test/index.mjs';
import {writeFileSync} from 'node:fs';
const [url,out]=process.argv.slice(2);
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();
await p.goto(url);
const data=await p.evaluate(async()=>{
 const m=await import('/src/world/cliffArt.ts');
 const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d');
 x.translate(128+ (768-96*8)/2 ,196);x.scale(8,8); // the 96x96 canvas at 8x (768 px) centred; its content spans y 1..90
 m.drawBallistaTexture({context:x,refresh(){}});
 return c.toDataURL('image/png');
});
writeFileSync(out,Buffer.from(data.split(',')[1],'base64'));await b.close();console.log('ok');

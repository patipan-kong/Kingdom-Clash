'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {shopGridLayout}=require('../.test-build/ui/shopGridLayout');
const {shopItems,shopItemEffects}=require('../.test-build/ui/shopItems');
const {ShopModel}=require('../.test-build/ui/shopModel');
const {controlLayout}=require('../.test-build/ui/controlLayout');
const {artifactTrading,artifact}=require('../.test-build/data/artifacts');
test('all mapped painted PNGs have valid 256px RGBA headers and matching provenance hashes',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const metadata=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/assets/item-art-metadata.json'),'utf8'));
 assert.deepEqual(metadata.map(i=>i.id),shopItems.map(i=>i.id));
 for(const item of shopItems){
  const file=path.join(__dirname,'../public/assets',item.file),png=fs.readFileSync(file),m=metadata.find(m=>m.id===item.id);
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),256);assert.equal(png[25],6);
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'),m.sha256);assert.ok(fs.existsSync(path.join(__dirname,'..',m.source)));
 }
});
test('grid maps precisely the seven live IDs, distinct painted textures, emergency fallbacks and full effects',()=>{
 assert.deepEqual(shopItems.map(i=>i.id),['iron-sword','guardian-shield','ruby-gem','flame-blade','builders-crown','siege-hammer','commander-banner']);
 assert.deepEqual([...shopItems.map(i=>i.id)].sort(),[...artifactTrading.itemIds].sort());
 assert.equal(new Set(shopItems.map(i=>i.icon)).size,7);
 assert.equal(new Set(shopItems.map(i=>i.texture)).size,7);
 for(const i of shopItems)assert.equal(i.file,`${i.texture}.png`);
 for(const i of shopItems){assert.ok(artifact(i.id));assert.ok(shopItemEffects(i.id).length);}
 assert.deepEqual(shopItemEffects('guardian-shield'),['HP +250','Armor +15']);
 assert.ok(shopItemEffects('flame-blade').includes('Burn 5/s for 3s · refreshes'));
 assert.ok(shopItemEffects('commander-banner').includes('Range 240 · living Guardian'));
 assert.ok(shopItemEffects('builders-crown').includes('Does not stack'));
});
test('FIT layout caps CSS dimensions, keeps all 4x2 tile targets >=48px and avoids control columns',()=>{
 for(const height of [390,540,720,370,378]){
  const s=height/540,c=controlLayout(s),f=shopGridLayout(s,Math.max(72/s,105)+8/s,c.utilities[0].x);
  const css={x:f.x*s,y:f.y*s,w:f.width*s,h:f.height*s};
  assert.ok(css.x>=c.joystick.x*s+c.joystick.radius*s+5.9);
  assert.ok((c.utilities[0].x-c.utilities[0].hitRadius)*s-css.x-css.w>=5.9);
  assert.ok(css.y>=72);assert.ok(css.y+css.h<=height-24+1e-8);
  assert.ok((css.w-16-24)/4>=48);assert.ok(Math.abs(f.touch*s-48)<1e-8);
  if(height===390){assert.equal(f.compact,true);assert.equal(css.w,272);assert.ok(Math.abs(css.h-248)<1e-8);}
  if(height===540||height===720){assert.equal(f.compact,false);assert.equal(css.w,480);assert.equal(css.h,328);}
 }
});
test('catalog item selection cannot change exact owned-instance or component identity and reset clears intent',()=>{
 const m=new ShopModel();m.selected='owned-shield';m.components={'iron-sword':'sword-copy-2','ruby-gem':'gem-copy-4'};
 m.product='flame-blade';m.view='detail';assert.equal(m.selected,'owned-shield');assert.deepEqual(m.componentIds,['sword-copy-2','gem-copy-4']);
 const cmd=m.request('match','fusion','flame-blade','Flame Blade');assert.deepEqual(cmd.componentIds,['sword-copy-2','gem-copy-4']);
 m.product='siege-hammer';assert.deepEqual(cmd.componentIds,['sword-copy-2','gem-copy-4']);assert.equal(m.request('match','buy','iron-sword','Sword'),undefined);
 m.reset();assert.equal(m.product,'iron-sword');assert.equal(m.view,'shop');assert.deepEqual(m.componentIds,[]);assert.equal(m.selected,undefined);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const {battlefield,meadow,canyonPass,oasis}=require('../.test-build/world/battlefield.js');
const {battlefieldArt,battlefieldArtRegistry,dryFoliagePixels,propArt,visibleRect}=require('../.test-build/world/battlefieldArt.js');
// Chapter 2 S2b: the art registry (D7) says how each battlefield looks; geometry stays in world/battlefield. Battle and the HUD minimap
// draw the active match's field through it.

const battleSource=readFileSync(path.join(__dirname,'..','src','scenes','Battle.ts'),'utf8');
const preloaded=JSON.parse(/for\(const key of (\[[^\]]*\])\)this\.load\.image/.exec(battleSource)[1].replace(/'/g,'"'));

test('every registered battlefield has art, and art names only registered battlefields',()=>{
 const ids=Object.keys(battlefieldArtRegistry);
 assert.deepEqual(ids.sort(),['broken-wall','canyon-pass','frost-citadel','meadow','oasis']);
 for(const id of ids){assert.equal(battlefield(id).id,id);assert.equal(battlefieldArt(id),battlefieldArtRegistry[id]);}
 // No fallback to Meadow's river for an unknown field.
 for(const id of ['no-such-field','toString','__proto__',''])assert.throws(()=>battlefieldArt(id),/No art for battlefield/);
});

test('every scenery kind on every battlefield is drawn from a texture Battle preloads',()=>{
 for(const id of Object.keys(battlefieldArtRegistry)){
  const art=battlefieldArt(id),field=battlefield(id);
  for(const key of art.textures)assert.ok(preloaded.includes(key),`${id} paints with ${key}, which Battle preloads`);
  for(const kind of new Set(field.scenery.map(p=>p.kind))){
   const look=propArt(art,kind);
   assert.ok(preloaded.includes(look.source??look.texture),`${id} ${kind} comes from a preloaded texture`);
   assert.ok(art.textures.includes(look.source??look.texture),`${id} lists the ${kind} texture`);
   // A baked texture gets its own key, so it never replaces the Meadow texture of the same kind.
   if(look.source)assert.ok(!preloaded.includes(look.texture)&&look.texture!==look.source);
  }
 }
 assert.throws(()=>propArt(battlefieldArt('meadow'),'cactus'),/No art for scenery kind cactus/);
});

test('Meadow art reproduces the Chapter 1 drawing',()=>{
 const art=battlefieldArt('meadow');
 assert.equal(art.terrain,'meadow');assert.equal(art.road,undefined);
 for(const kind of ['trees','rocks','bush'])assert.deepEqual(propArt(art,kind),{texture:kind,shadow:{color:0x163e2c,alpha:.22}},`${kind}: own texture, untinted, original shadow`);
 // The minimap's Chapter 1 colours: ground, lane, river, tree and other props.
 assert.deepEqual(art.minimap,{ground:0x50815a,road:0xc8b97e,barrier:0x3ba0ab,tree:0x234c3b,prop:0x9ba980});
 assert.ok(['grass','path','water','bridge'].every(k=>art.textures.includes(k)));
});

test('Canyon art draws no water or bridge, and its road runs through the pass mouths',()=>{
 const art=battlefieldArt('canyon-pass');
 assert.equal(art.terrain,'canyon');
 for(const key of ['water','bridge'])assert.ok(!art.textures.includes(key));
 for(const look of Object.values(art.props))assert.ok(!['water','bridge'].includes(look.source??look.texture));
 // The painted road stays inside the open band at both mouths (y 480-720), so it never runs into a cliff.
 assert.ok(art.road.top>=480&&art.road.bottom<=720&&art.road.top<art.road.bottom);
 assert.notDeepEqual(art.minimap.barrier,battlefieldArt('meadow').minimap.barrier,'cliffs are not drawn in river colour');
});

test('Oasis art reuses Meadow textures only (grass, sand road, water, trees, rocks), tints but never bakes, and has no bridge',()=>{
 const art=battlefieldArt('oasis');
 assert.equal(art.terrain,'oasis');assert.ok(!art.textures.includes('bridge'));
 assert.deepEqual([...art.textures].sort(),['bush','grass','path','rocks','trees','water']);
 for(const kind of ['trees','rocks','bush']){const look=propArt(art,kind);assert.equal(look.texture,kind,`${kind} uses the Meadow texture`);assert.equal(look.source,undefined,'nothing is baked');assert.ok(look.tint!==undefined);}
 assert.ok(art.road.top>=505-1&&art.road.bottom<=695+1&&art.road.top<art.road.bottom);
 assert.notDeepEqual(art.minimap,battlefieldArt('meadow').minimap);assert.notDeepEqual(art.minimap,battlefieldArt('canyon-pass').minimap);
});

test('painters fill each barrier exactly on its rectangle, clipped to the world',()=>{
 assert.deepEqual(oasis.barriers.map(visibleRect),[{x:920,y:420,width:160,height:360},{x:880,y:520,width:240,height:160}]);
 assert.deepEqual(canyonPass.barriers.map(visibleRect),[
  {x:800,y:0,width:320,height:480}, // north cliff: its lower edge is the north lane's wall
  {x:800,y:720,width:320,height:432}, // south cliff: its upper edge is the south lane's wall
  {x:920,y:576,width:80,height:48}, // spire
 ]);
 assert.deepEqual(meadow.barriers.map(visibleRect),[{x:880,y:0,width:160,height:535},{x:880,y:615,width:160,height:537}]);
 assert.deepEqual(visibleRect({x0:-Infinity,y0:-5,x1:-1,y1:5,reason:'test'}),{x:0,y:0,width:0,height:5});
});

test('dryFoliagePixels recolours green foliage only, keeping alpha',()=>{
 const px=new Uint8ClampedArray([
  60,150,60,255, // leaf
  130,90,50,255, // trunk
  120,120,118,255, // stone
  60,150,60,0, // transparent
  240,220,150,200, // flower
 ]);
 const before=[...px];dryFoliagePixels(px);
 const leaf=[...px.slice(0,4)];assert.ok(leaf[0]>leaf[1]&&leaf[1]>leaf[2],'the leaf turns ochre');assert.equal(leaf[3],255);
 assert.deepEqual([...px.slice(4)],before.slice(4),'trunk, stone, transparent pixels and flowers are untouched');
});

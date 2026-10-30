import type {Barrier,BattlefieldId} from './battlefield';
import {WORLD} from './layout';
// Chapter 2 S2b: how each battlefield looks, kept apart from its geometry (world/battlefield) so art can never change collision.
// Battle and the HUD minimap pick their drawing by the active match's field id; the simulation never reads this module.
// Meadow's entry reproduces the Chapter 1 drawing exactly: its props use their own kind as texture, untinted, with the original shadow.
// A prop with a source is drawn from a texture Battle bakes once from that loaded source with dryFoliagePixels.
export interface PropArt {readonly texture:string;readonly source?:string;readonly tint?:number;readonly shadow:{readonly color:number;readonly alpha:number}}
export interface MinimapArt {readonly ground:number;readonly road:number;readonly barrier:number;readonly tree:number;readonly prop:number}
export interface BattlefieldArt {
 readonly terrain:'meadow'|'canyon'|'oasis'|'frozen'; // the Battle terrain painter (frozen is the canyon painter with `tone` and `ground`)
 readonly textures:readonly string[]; // every texture the painter and the props draw with; Battle preloads them all
 readonly props:Readonly<Record<string,PropArt>>; // by SceneryProp.kind
 readonly minimap:MinimapArt; // barrier is the river on Meadow, cliff rock on Canyon
 readonly tone?:(color:number)=>number; // Chapter 3 C3-1: maps every colour the canyon painter uses (identity when absent), so one painter serves a second palette
 readonly ground?:number; // Chapter 3 C3-1: fills the ground and the road band with flat colours instead of tiling the sand texture (snow)
 readonly road?:{readonly top:number;readonly bottom:number}; // the painted road band of Canyon and Oasis (world y); Meadow's road is layout terrain
}
const meadowShadow={color:0x163e2c,alpha:.22};
const meadow:BattlefieldArt={
 terrain:'meadow',
 textures:['grass','path','water','bridge','trees','rocks','bush'],
 props:{trees:{texture:'trees',shadow:meadowShadow},rocks:{texture:'rocks',shadow:meadowShadow},bush:{texture:'bush',shadow:meadowShadow}},
 minimap:{ground:0x50815a,road:0xc8b97e,barrier:0x3ba0ab,tree:0x234c3b,prop:0x9ba980},
};
// Canyon Pass: a sandstone desert painted from the existing textures (sand ground, props with dried foliage) plus procedural cliffs and
// spire drawn from the battlefield's own barrier rectangles. No water and no bridge.
const canyonShadow={color:0x5a3218,alpha:.24};
const canyon:BattlefieldArt={
 terrain:'canyon',
 textures:['path','trees','rocks','bush'],
 props:{
  trees:{texture:'canyon-trees',source:'trees',shadow:canyonShadow},
  rocks:{texture:'canyon-rocks',source:'rocks',tint:0xf6c49a,shadow:canyonShadow},
  bush:{texture:'canyon-bush',source:'bush',shadow:canyonShadow},
 },
 minimap:{ground:0xb08a5a,road:0xd8bf8a,barrier:0x7b4a2e,tree:0x6b5a2c,prop:0xc79a6c},
 road:{top:500,bottom:700}, // the Keeps' row, through the pass mouths (y 480-720)
};
// Sunwell Oasis (S5): Meadow's grass, sand road and water, and the Meadow trees and rocks, only warmed with tints. The pond is the water texture masked to
// the battlefield's own barrier rectangles. No new texture is loaded and none is baked.
const oasisShadow={color:0x1f4a35,alpha:.22};
const oasis:BattlefieldArt={
 terrain:'oasis',
 textures:['grass','path','water','trees','rocks','bush'],
 props:{
  trees:{texture:'trees',tint:0xdcf0a6,shadow:oasisShadow},
  rocks:{texture:'rocks',tint:0xf0dcb8,shadow:oasisShadow},
  bush:{texture:'bush',tint:0xe6efb0,shadow:oasisShadow},
 },
 minimap:{ground:0x7f9a5a,road:0xd8c48a,barrier:0x2f9fb0,tree:0x2f5f33,prop:0xb9a37a},
 road:{top:505,bottom:695}, // the Keeps' row, west and east of the pond
};
// Frost Citadel (Chapter 3 C3-1): Canyon Pass's cliffs and spire painted by the same painter through frostTone (brown rock becomes blue-grey ice rock), over flat snow with a pale packed-snow road.
// Meadow's trees, rocks and bushes are only tinted cool; no texture is loaded or baked.
const frozenShadow={color:0x2a4560,alpha:.22};
const frozen:BattlefieldArt={
 terrain:'frozen',
 textures:['trees','rocks','bush'],
 tone:frostTone,
 ground:0xe6eff5,
 props:{
  trees:{texture:'trees',tint:0xb4d4e4,shadow:frozenShadow},
  rocks:{texture:'rocks',tint:0xd2e0ee,shadow:frozenShadow},
  bush:{texture:'bush',tint:0xcfe4ec,shadow:frozenShadow},
 },
 minimap:{ground:0xdbe8f0,road:0xb7cadb,barrier:0x5f7d98,tree:0x2f566b,prop:0x9fb4c6},
 road:{top:500,bottom:700},
};
// Maps a colour to a blue-grey of the same lightness: dark stays slate, light becomes ice. Used for every colour the canyon painter draws on the Frost Citadel.
export function frostTone(color:number):number{
 const l=(.3*(color>>16&255)+.59*(color>>8&255)+.11*(color&255))/255;
 return Math.round(66+l*172)<<16|Math.round(98+l*152)<<8|Math.round(128+l*122);
}
// Keyed by every registered battlefield id: a battlefield added without art fails the typecheck.
export const battlefieldArtRegistry={meadow,'canyon-pass':canyon,oasis,'frost-citadel':frozen,'broken-wall':frozen,'twin-walls':frozen} as const satisfies Readonly<Record<BattlefieldId,BattlefieldArt>>;
// No fallback: drawing Meadow's river over another battlefield's geometry would show walls where there are none.
export function battlefieldArt(id:string):BattlefieldArt{
 if(!Object.hasOwn(battlefieldArtRegistry,id))throw new Error(`No art for battlefield ${id}`);
 return battlefieldArtRegistry[id as BattlefieldId];
}
// Canyon foliage: green pixels become dry olive and ochre, keeping their shading and alpha; trunks, stone and flowers are untouched.
export function dryFoliagePixels(pixels:Uint8ClampedArray):void{
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  if(pixels[i+3]&&g>r+10&&g>b+10){const l=.3*r+.59*g+.11*b;pixels[i]=l*1.18+22;pixels[i+1]=l*.98+8;pixels[i+2]=l*.5;}
 }
}
// The part of a barrier inside the world, in world px: what the painters fill. Barriers may be open-ended (±Infinity).
export function visibleRect(b:Barrier){
 const x0=Math.max(0,b.x0),y0=Math.max(0,b.y0),x1=Math.min(WORLD.width,b.x1),y1=Math.min(WORLD.height,b.y1);
 return {x:x0,y:y0,width:Math.max(0,x1-x0),height:Math.max(0,y1-y0)};
}
export function propArt(art:BattlefieldArt,kind:string):PropArt{
 if(!Object.hasOwn(art.props,kind))throw new Error(`No art for scenery kind ${kind}`);
 return art.props[kind];
}

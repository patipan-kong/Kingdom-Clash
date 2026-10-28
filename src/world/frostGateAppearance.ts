import {GRID,projection} from './layout';
// Chapter 3 C3-1: the Crimson Frost Gate is a red wall (Simulation.gate) drawn from the shared wooden wall art, recoloured ice blue and stacked two rows high.
// Presentation only: collision, sight and hit points come from the structure. Real gate artwork replaces this later.
export const frostGateTexture='frost-gate';
// The wall sprite is 176 x 192 and is drawn at 60 / 192 of its size (Battle.makeEntity: height 50 x 1.2). One grid row of depth on screen is GRID * projection.y px,
// so the second row's base sits this many texture pixels below the first.
export const frostGateRowOffset=Math.round(GRID*projection.y*192/60);
// The entity template Battle draws a gate with: a 1 x 2 cell footprint, 79 high so the stacked texture keeps the wall's scale.
export const frostGateVisual={name:'Frost Gate',texture:frostGateTexture,width:47,height:79} as const;
// Chapter 3 C3-2: a Crimson Barracks is also a red wall (Simulation.gate), drawn with the Crimson Keep sprite at about two thirds of its size (a 2 x 2 footprint against the Keep's 3 x 3). Its ids all start red-barracks.
export const barracksVisual={name:'Crimson Barracks',texture:'base-red',width:107,height:110} as const;
export const isBarracks=(u:{id:string;kind:string;team:string})=>u.kind==='wall'&&u.team==='red'&&u.id.startsWith('red-barracks');
// Any other red wall is a Frost Gate: no earlier level has a Crimson wall, and Crimson never builds.
export const isFrostGate=(u:{id:string;kind:string;team:string})=>u.kind==='wall'&&u.team==='red'&&!isBarracks(u);
// Wood and iron become pale blue ice, keeping the sprite's shading and alpha.
export function frostGatePixels(pixels:Uint8ClampedArray):void{
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  const l=.3*pixels[i]+.59*pixels[i+1]+.11*pixels[i+2];
  pixels[i]=Math.min(255,l*.6+95);pixels[i+1]=Math.min(255,l*.72+125);pixels[i+2]=Math.min(255,l*.7+165);
 }
}

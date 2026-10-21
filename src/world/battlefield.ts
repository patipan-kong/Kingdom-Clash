import {entities,GRID,scenery,terrain,WORLD,type VisualEntity} from './layout';
// Chapter 2 S1: the static geometry of one match, as data. A Simulation holds its own Battlefield (MatchSetup.battlefield) and passes it,
// through its Geometry, to every consumer; nothing in the simulation reads a global active battlefield.
// Rendering (scenes, minimap) still draws world/layout directly; it becomes battlefield-aware in S2b.
export interface Point {readonly x:number;readonly y:number}
// Impassable axis-aligned rectangle, inflated by a unit's radius exactly as the Meadow river is. Edges may lie beyond the world
// (±Infinity included) so a barrier that touches the map border behaves like the original open-ended river rule.
export interface Barrier {readonly x0:number;readonly y0:number;readonly x1:number;readonly y1:number;readonly reason:string}
export interface SceneryCircle {readonly x:number;readonly y:number;readonly radius:number}
// kind and height are presentation only (sprite and its drawn height); the simulation reads the circle.
export interface SceneryProp extends SceneryCircle {readonly kind:string;readonly height:number}
export interface Battlefield {
 readonly id:string;
 readonly barriers:readonly Barrier[];
 readonly scenery:readonly SceneryProp[]; // collision and placement use x, y and radius only
 readonly entities:readonly VisualEntity[]; // Keeps, pre-placed walls and opening units; only footprinted entries block
 readonly territory:{readonly x:number;readonly y:number;readonly radius:number}; // player construction area
 readonly reserved:readonly Point[]; // cells kept clear of construction (respawn/shop approach), half-extent one GRID
 readonly respawn:readonly Point[]; // Guardian respawn candidates, first open point wins
 readonly objectives:{readonly blue:Point;readonly red:Point}; // route fallback when a team's enemy Keep is gone
}
const finite=(...v:number[])=>v.every(Number.isFinite);
export function validateBattlefield(f:Battlefield):Battlefield{
 const fail=(why:string)=>{throw new Error(`Invalid battlefield ${String(f?.id)}: ${why}`);};
 if(!f||typeof f.id!=='string'||!f.id)fail('missing id');
 for(const b of f.barriers)if([b.x0,b.y0,b.x1,b.y1].some(Number.isNaN)||!(b.x0<b.x1&&b.y0<b.y1)||!b.reason)fail('barrier');
 for(const p of f.scenery)if(!finite(p.x,p.y,p.radius)||p.radius<=0)fail('scenery');
 for(const id of ['blue-base','red-base'])if(f.entities.filter(e=>e.id===id).length!==1)fail(`needs exactly one ${id}`);
 if(!finite(f.territory.x,f.territory.y,f.territory.radius)||f.territory.radius<=0)fail('territory');
 if(!f.respawn.length)fail('no respawn point');
 for(const p of [...f.reserved,...f.respawn,f.objectives.blue,f.objectives.red])if(!finite(p.x,p.y)||p.x<0||p.y<0||p.x>WORLD.width||p.y>WORLD.height)fail('point outside the world');
 return f;
}
// Meadow: the Chapter 1 map, value for value. The river with its bridge gap is two open-ended barriers; scenery and entities are the
// world/layout arrays themselves, so the Meadow battlefield and the rendered map can never drift apart.
export const meadow:Battlefield=validateBattlefield(Object.freeze({
 id:'meadow',
 barriers:Object.freeze([
  Object.freeze({x0:terrain.riverLeft,y0:-Infinity,x1:terrain.riverRight,y1:terrain.bridgeTop,reason:'Water overlaps cell'}),
  Object.freeze({x0:terrain.riverLeft,y0:terrain.bridgeBottom,x1:terrain.riverRight,y1:Infinity,reason:'Water overlaps cell'}),
 ]),
 scenery,entities,
 territory:Object.freeze({x:330,y:600,radius:8*GRID}),
 reserved:Object.freeze([Object.freeze({x:450,y:600})]),
 respawn:Object.freeze([{x:450,y:600},...Array.from({length:6},(_,i)=>[552,600,648].map(y=>({x:450+i*48,y}))).flat()].map(p=>Object.freeze(p))),
 objectives:Object.freeze({blue:Object.freeze({x:1490,y:600}),red:Object.freeze({x:450,y:600})}),
}));
// Canyon Pass (Chapter 2 S2a): the river becomes a canyon. North and south cliffs leave a pass 320 px long (x 800-1120, y 480-720), split by
// a central spire into a north lane (y 480-576) and a south lane (y 624-720), each 96 px wide with two navigable grid rows. Everything the
// encounters place in Meadow coordinates (Guardian spawn, wave slots, Crimson tower slots, prototype waves) stays open, as do Meadow's
// Keeps, build territory (which ends at x 714, short of the cliffs), reserved cell, respawn points and route objectives.
// Scenery is Meadow's minus the props that overlap a cliff; there are no pre-placed walls, and the Azure Vanguard the spire would cover
// opens at (1040,600).
// The scenery and entities arrays stay unfrozen, like Meadow's layout arrays: Geometry.blocked scans them with Array.some on every
// collision check, and V8 runs that about 2.5x slower over a frozen array (S2a measurement). Their entries are frozen.
const canyonBarriers:readonly Barrier[]=Object.freeze([
 Object.freeze({x0:800,y0:-Infinity,x1:1120,y1:480,reason:'Cliff overlaps cell'}),
 Object.freeze({x0:800,y0:720,x1:1120,y1:Infinity,reason:'Cliff overlaps cell'}),
 Object.freeze({x0:920,y0:576,x1:1000,y1:624,reason:'Cliff overlaps cell'}),
]);
const overlapsBarrier=(p:SceneryCircle)=>canyonBarriers.some(b=>p.x>b.x0-p.radius&&p.x<b.x1+p.radius&&p.y>b.y0-p.radius&&p.y<b.y1+p.radius);
export const canyonPass:Battlefield=validateBattlefield(Object.freeze({
 id:'canyon-pass',
 barriers:canyonBarriers,
 scenery:scenery.filter(p=>!overlapsBarrier(p)),
 entities:entities.filter(e=>e.kind!=='wall').map(e=>Object.freeze(e.id==='blue-1'?{...e,x:1040,y:600}:{...e})),
 territory:meadow.territory,reserved:meadow.reserved,respawn:meadow.respawn,objectives:meadow.objectives,
}));
// Registered battlefields. Tests may build their own Battlefield objects without registering them.
const registry={meadow,'canyon-pass':canyonPass} as const;
export type BattlefieldId=keyof typeof registry;
export function battlefield(id:BattlefieldId):Battlefield{
 if(!Object.hasOwn(registry,id))throw new Error(`Unknown battlefield ${String(id)}`);
 return registry[id];
}

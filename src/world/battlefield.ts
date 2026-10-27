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
 readonly outposts?:readonly {readonly x:number;readonly y:number;readonly radius:number}[]; // Chapter 2 S5: extra build circles beside the territory (Oasis shore outposts); absent = none
 readonly flankVia?:{readonly north?:Point;readonly south?:Point}; // Chapter 2 S7: open waypoints on the north and south bank that a flanking wave routes through; absent = the battlefield cannot be flanked
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
 for(const o of f.outposts??[])if(!finite(o.x,o.y,o.radius)||o.radius<=0)fail('outpost');
 for(const p of [f.flankVia?.north,f.flankVia?.south])if(p&&(!finite(p.x,p.y)||p.x<0||p.y<0||p.x>WORLD.width||p.y>WORLD.height))fail('flank waypoint');
 if(!f.respawn.length)fail('no respawn point');
 for(const p of [...f.reserved,...f.respawn,f.objectives.blue,f.objectives.red])if(!finite(p.x,p.y)||p.x<0||p.y<0||p.x>WORLD.width||p.y>WORLD.height)fail('point outside the world');
 return f;
}
// Where the player may build: inside the Keep-centred territory or inside any outpost circle. Meadow and Canyon have no outposts.
export const inTerritory=(f:Battlefield,x:number,y:number)=>Math.hypot(x-f.territory.x,y-f.territory.y)<=f.territory.radius||(f.outposts?.some(o=>Math.hypot(x-o.x,y-o.y)<=o.radius)??false);
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
// Sunwell Oasis (Chapter 2 S5): the river and the canyon become a plus-shaped pond in the middle of the map. Two water barriers (a vertical bar
// x 920-1080, y 420-780 and a horizontal bar x 880-1120, y 520-680) leave a wide north bank and a wide south bank, each roughly 400 px across, so
// movement is far more open than on Canyon's 96 px lanes. Nothing is pre-placed: there is no choke and no scripted route; the banks are chosen by the
// shortest path alone. Water blocks movement, tower fire and every line of sight, like Meadow's river.
// Everything the encounters place in Meadow coordinates stays open. The pond lies east of the Guardian spawn (820,590), so Meadow's three opening Azure
// Vanguards, which stood where the pond is, move to the west shore. Two build outposts on the shore (radius 96 around (760,330) and (760,870)) let a tower
// reach a bank; the Keep-centred territory is Meadow's. Scenery is Meadow's, and none of it lies under the pond. As on Canyon the scenery and entities
// arrays stay unfrozen (Geometry.blocked scans them on every collision check), with frozen entries.
const oasisBarriers:readonly Barrier[]=Object.freeze([
 Object.freeze({x0:920,y0:420,x1:1080,y1:780,reason:'Water overlaps cell'}),
 Object.freeze({x0:880,y0:520,x1:1120,y1:680,reason:'Water overlaps cell'}),
]);
const oasisShoreUnits:Readonly<Record<string,Point>>=Object.freeze({'blue-0':{x:870,y:470},'blue-1':{x:870,y:730},'blue-2':{x:860,y:600}});
export const oasis:Battlefield=validateBattlefield(Object.freeze({
 id:'oasis',
 barriers:oasisBarriers,
 scenery:scenery.filter(p=>!oasisBarriers.some(b=>p.x>b.x0-p.radius&&p.x<b.x1+p.radius&&p.y>b.y0-p.radius&&p.y<b.y1+p.radius)),
 entities:entities.filter(e=>e.kind!=='wall').map(e=>Object.freeze(Object.hasOwn(oasisShoreUnits,e.id)?{...e,...oasisShoreUnits[e.id]}:{...e})),
 territory:meadow.territory,
 outposts:Object.freeze([Object.freeze({x:760,y:330,radius:96}),Object.freeze({x:760,y:870,radius:96})]),
 // Flank waypoints: cell centres on each bank beside the pond (x 984-1080 is the pond's width), mirrored about the Keep row.
 flankVia:Object.freeze({north:Object.freeze({x:1032,y:312}),south:Object.freeze({x:1032,y:888})}),
 reserved:meadow.reserved,respawn:meadow.respawn,objectives:meadow.objectives,
}));
// Registered battlefields. Tests may build their own Battlefield objects without registering them.
const registry={meadow,'canyon-pass':canyonPass,oasis} as const;
export type BattlefieldId=keyof typeof registry;
export function battlefield(id:BattlefieldId):Battlefield{
 if(!Object.hasOwn(registry,id))throw new Error(`Unknown battlefield ${String(id)}`);
 return registry[id];
}

import {entities,GRID,scenery,terrain,WORLD,type VisualEntity} from './layout';
// Chapter 2 S1: the static geometry of one match, as data. A Simulation holds its own Battlefield (MatchSetup.battlefield) and passes it,
// through its Geometry, to every consumer; nothing in the simulation reads a global active battlefield.
// Rendering (scenes, minimap) still draws world/layout directly; it becomes battlefield-aware in S2b.
export interface Point {readonly x:number;readonly y:number}
// Impassable axis-aligned rectangle, inflated by a unit's radius exactly as the Meadow river is. Edges may lie beyond the world
// (±Infinity included) so a barrier that touches the map border behaves like the original open-ended river rule.
export interface Barrier {readonly x0:number;readonly y0:number;readonly x1:number;readonly y1:number;readonly reason:string;readonly look?:'wall'} // look is presentation only: 'wall' draws a built fortress wall instead of rock (Chapter 3 C3-1)
export interface SceneryCircle {readonly x:number;readonly y:number;readonly radius:number}
// kind and height are presentation only (sprite and its drawn height); the simulation reads the circle.
export interface SceneryProp extends SceneryCircle {readonly kind:string;readonly height:number}
// Chapter 3 C3-1: a gate site. The footprint is in grid cells centred on (x,y), exactly like a wall or tower; the level that uses the site names it and sets its hit points.
export interface BattlefieldGate {readonly id:string;readonly x:number;readonly y:number;readonly columns:number;readonly rows:number}
// Chapter 3 C3-1: a Crimson tower position of this battlefield alone, named by a level's `defenders` next to extendedRules.towers (which no battlefield changes). A 1 x 1 cell tower centred on (x,y).
// Chapter 3 C3-2: a Crimson Barracks site. A footprinted red structure exactly like a gate site; the level that uses it names it, sets its hit points and says which of its Crimson spawn slots it owns.
export interface BattlefieldBarracks {readonly id:string;readonly x:number;readonly y:number;readonly columns:number;readonly rows:number}
// Chapter 3 M5: a Deep Snow zone. An axis-aligned rectangle (cell edges, inclusive of its low edge) that slows the movement of every unit whose centre stands inside it, of either team, by `slow` (0-.5). Movement only; the zone is not terrain and blocks nothing.
export interface SlowZone {readonly x0:number;readonly y0:number;readonly x1:number;readonly y1:number;readonly slow:number}
export interface BattlefieldTower {readonly id:string;readonly x:number;readonly y:number}
export interface Battlefield {
 readonly id:string;
 readonly barriers:readonly Barrier[];
 readonly scenery:readonly SceneryProp[]; // collision and placement use x, y and radius only
 readonly entities:readonly VisualEntity[]; // Keeps, pre-placed walls and opening units; only footprinted entries block
 readonly territory:{readonly x:number;readonly y:number;readonly radius:number}; // player construction area
 readonly outposts?:readonly {readonly x:number;readonly y:number;readonly radius:number}[]; // Chapter 2 S5: extra build circles beside the territory (Oasis shore outposts); absent = none
 readonly flankVia?:{readonly north?:Point;readonly south?:Point}; // Chapter 2 S7: open waypoints on the north and south bank that a flanking wave routes through; absent = the battlefield cannot be flanked
 readonly gates?:readonly BattlefieldGate[]; // Chapter 3 C3-1: sites where a level may place a Crimson Frost Gate (footprint only; hit points belong to the level); absent = none
 readonly barracks?:readonly BattlefieldBarracks[]; // Chapter 3 C3-2: sites where a level may place a destructible Crimson Barracks; absent = none
 readonly towers?:readonly BattlefieldTower[]; // Chapter 3 C3-1: extra Crimson tower positions (the Frost Citadel's bastions); none may overlap a barrier, or it could never see out; absent = none
 readonly slowZones?:readonly SlowZone[]; // Chapter 3 M5: Deep Snow; absent = none
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
 for(const [i,g] of (f.gates??[]).entries())if(!g.id||!finite(g.x,g.y)||g.x<0||g.y<0||g.x>WORLD.width||g.y>WORLD.height||!(Number.isSafeInteger(g.columns)&&g.columns>=1&&Number.isSafeInteger(g.rows)&&g.rows>=1)||(f.gates??[]).some((o,j)=>j<i&&o.id===g.id))fail('gate');
 for(const [i,g] of (f.barracks??[]).entries())if(!g.id||!finite(g.x,g.y)||g.x<0||g.y<0||g.x>WORLD.width||g.y>WORLD.height||!(Number.isSafeInteger(g.columns)&&g.columns>=1&&Number.isSafeInteger(g.rows)&&g.rows>=1)||(f.barracks??[]).some((o,j)=>j<i&&o.id===g.id)||(f.gates??[]).some(o=>o.id===g.id))fail('barracks');
 // A tower inside a barrier has its own centre blocked, so its line of sight fails at the first sample and it never fires; flush against a barrier is fine.
 for(const [i,t] of (f.towers??[]).entries())if(!t.id||!finite(t.x,t.y)||t.x<0||t.y<0||t.x>WORLD.width||t.y>WORLD.height||(f.towers??[]).some((o,j)=>j<i&&o.id===t.id)||f.barriers.some(b=>t.x+GRID/2>b.x0&&t.x-GRID/2<b.x1&&t.y+GRID/2>b.y0&&t.y-GRID/2<b.y1))fail('tower');
 for(const z of f.slowZones??[])if(!finite(z.x0,z.y0,z.x1,z.y1,z.slow)||!(z.x0<z.x1&&z.y0<z.y1)||!(z.slow>0&&z.slow<=.5))fail('slow zone');
 if(!f.respawn.length)fail('no respawn point');
 for(const p of [...f.reserved,...f.respawn,f.objectives.blue,f.objectives.red])if(!finite(p.x,p.y)||p.x<0||p.y<0||p.x>WORLD.width||p.y>WORLD.height)fail('point outside the world');
 return f;
}
// The strongest zone slow at a unit's position (0 = none). Statuses and zones do not stack: movement uses whichever slows more (Statuses.slowFactor takes the same cap).
export const zoneSlow=(f:Battlefield,p:Point)=>!f.slowZones?0:Math.max(0,...f.slowZones.filter(z=>p.x>=z.x0&&p.x<z.x1&&p.y>=z.y0&&p.y<z.y1).map(z=>z.slow));
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
// Frost Citadel (Chapter 3 C3-1): Canyon Pass's cliffs, spire, territory and routes exactly on the Azure side, under snow (world/battlefieldArt), and on the Crimson side a walled fortress around the Crimson Keep.
// Four wall barriers enclose the courtyard x 1440-1920, y 384-816; the east side is the world edge. The only way in is the Frost Gate site, a 1 x 2 cell block (x 1392-1440, y 552-648) that fills the 96 px
// opening in the west wall exactly, so while it stands nothing crosses and nothing sees in, and once it falls the opening is one grid row wide (y 600) for a minion and open to the Guardian.
// Two bastions stand outside the west wall, flush against its face (x 1344-1392): from either one the Guardian's siege spot at the gate (x 1326-1372, about 145 px away) is in range and in sight,
// while the wall hides the courtyard from them. Scenery inside the fortress or touching its walls is dropped. The Crimson wave spawn slots belong to the level (a Frost Citadel level names slots
// outside the fortress); Canyon's Azure Vanguards stay where Canyon has them. Scenery and entities are fresh, unfrozen arrays with frozen entries, as on Canyon.
const citadelWalls:readonly Barrier[]=Object.freeze([
 {x0:1392,y0:336,x1:1440,y1:552},{x0:1392,y0:648,x1:1440,y1:864},{x0:1440,y0:336,x1:1920,y1:384},{x0:1440,y0:816,x1:1920,y1:864},
].map(w=>Object.freeze({...w,reason:'Fortress wall overlaps cell',look:'wall' as const})));
const inCitadel=(p:SceneryCircle)=>p.x>1392-p.radius&&p.y>336-p.radius&&p.y<864+p.radius;
export const frostCitadel:Battlefield=validateBattlefield(Object.freeze({
 id:'frost-citadel',
 barriers:Object.freeze([...canyonBarriers,...citadelWalls]),
 scenery:canyonPass.scenery.filter(p=>!inCitadel(p)),
 entities:canyonPass.entities.map(e=>Object.freeze({...e})),
 gates:Object.freeze([Object.freeze({id:'red-gate',x:1416,y:600,columns:1,rows:2})]),
 barracks:Object.freeze([['red-barracks-north',1536,240],['red-barracks-south',1536,960],['red-barracks-court',1824,432]].map(([id,x,y])=>Object.freeze({id:id as string,x:x as number,y:y as number,columns:2,rows:2}))),
 towers:Object.freeze([['red-bastion-north',1368,456],['red-bastion-south',1368,744],['red-forward-north',1176,312],['red-forward-south',1176,888],['red-inner-north',1464,456],['red-inner-south',1464,744],['red-guard-north',1608,312],['red-guard-south',1608,888]].map(([id,x,y])=>Object.freeze({id:id as string,x:x as number,y:y as number}))),
 territory:meadow.territory,reserved:meadow.reserved,respawn:meadow.respawn,objectives:meadow.objectives,
}));
// Broken Wall (Chapter 3 M3): Canyon Pass's Azure side exactly (cliffs, spire, territory, routes) and, on the Crimson side, a ruined wall line at x 1392-1440 instead of a fortress. Three wall pieces
// (y 288-432, 528-672, 768-912) leave two 96 px breaches (y 432-528 and 672-768) and open ground above y 288 and below y 912, so there are four ways through and no single choke. Three Siege Towers stand in
// front of the line (Crimson towers of this battlefield alone, named by the level's defenders): north (1344,312), centre (1296,600) and south (1344,888), 288 px apart, so each covers its own approach and only the
// edge of its neighbour's. The Crimson Keep stays behind the wall at x 1610. Scenery touching the wall line or a tower is dropped. Scenery and entities are fresh, unfrozen arrays with frozen entries, as on Canyon.
const brokenWalls:readonly Barrier[]=Object.freeze([[288,432],[528,672],[768,912]].map(([y0,y1])=>Object.freeze({x0:1392,y0,x1:1440,y1,reason:'Broken wall overlaps cell',look:'wall' as const})));
const siegeTowers=[['red-siege-north',1344,312],['red-siege-centre',1296,600],['red-siege-south',1344,888],['red-guard-north',1488,168],['red-guard-south',1488,1032]] as const;
// M2 (The Broken Wall): three Crimson Barracks, each 2 x 2 cells. The north and south wings stand in the open ground above and below the wall line (x 1488-1584), each with a Guard Tower at its outer corner; the third stands behind the Keep (x 1728-1824).
const wallBarracks=[['red-barracks-north',1536,240],['red-barracks-south',1536,960],['red-barracks-keep',1776,600]].map(([id,x,y])=>({id:id as string,x:x as number,y:y as number,columns:2,rows:2}));
const inBrokenWall=(p:SceneryCircle)=>brokenWalls.some(b=>p.x>b.x0-p.radius&&p.x<b.x1+p.radius&&p.y>b.y0-p.radius&&p.y<b.y1+p.radius)||siegeTowers.some(([,x,y])=>Math.abs(p.x-x)<p.radius+GRID&&Math.abs(p.y-y)<p.radius+GRID)||wallBarracks.some(b=>Math.abs(p.x-b.x)<p.radius+GRID*(b.columns/2+.5)&&Math.abs(p.y-b.y)<p.radius+GRID*(b.rows/2+.5));
export const brokenWall:Battlefield=validateBattlefield(Object.freeze({
 id:'broken-wall',
 barriers:Object.freeze([...canyonBarriers,...brokenWalls]),
 scenery:canyonPass.scenery.filter(p=>!inBrokenWall(p)),
 entities:canyonPass.entities.map(e=>Object.freeze({...e})),
 towers:Object.freeze(siegeTowers.map(([id,x,y])=>Object.freeze({id,x,y}))),
 barracks:Object.freeze(wallBarracks.map(b=>Object.freeze({...b}))),
 territory:meadow.territory,reserved:meadow.reserved,respawn:meadow.respawn,objectives:meadow.objectives,
}));
// Twin Walls (Chapter 3 M4A): a two-ring siege (docs/CHAPTER3_M4A.md, layout probe v1 with the north gap mirrored south). Canyon's cliffs end at x 1040 instead of 1120 so three bands fit east of them:
// the outside strip (x 1040-1248), the outer wall (x 1248-1296) and the ring between the walls (x 1296-1440), then the Frost Citadel courtyard with its west wall moved 48 px east (x 1440-1488). The Keep stays at x 1610.
// The outer wall runs y 192-1008 with the Outer Gate site (1272,600) filling its 96 px opening, so the direct road is the gate and the alternate roads are the gaps at both ends (y 0-192 north, y 1008-1152 south).
// The Inner Gate site (1464,600) is the only way into the courtyard. Each gate is covered by two bastions flush on the wall face in front of it (existing line of sight; nothing fires over a wall).
// Each gap has a Strip Tower outside the wall and a Gap Tower inside it; the North and South Barracks stand inside the ring next to their gap; the Court Barracks stands inside the courtyard.
// Scenery east of the cliffs is dropped. Scenery and entities are fresh, unfrozen arrays with frozen entries, as on Canyon.
const twinCliffs:readonly Barrier[]=Object.freeze([
 Object.freeze({x0:800,y0:-Infinity,x1:1040,y1:480,reason:'Cliff overlaps cell'}),
 Object.freeze({x0:800,y0:720,x1:1040,y1:Infinity,reason:'Cliff overlaps cell'}),
 Object.freeze({x0:920,y0:576,x1:1000,y1:624,reason:'Cliff overlaps cell'}),
]);
const twinRings:readonly Barrier[]=Object.freeze([
 {x0:1248,y0:192,x1:1296,y1:552},{x0:1248,y0:648,x1:1296,y1:1008},
 {x0:1440,y0:336,x1:1488,y1:552},{x0:1440,y0:648,x1:1488,y1:864},{x0:1488,y0:336,x1:1920,y1:384},{x0:1488,y0:816,x1:1920,y1:864},
].map(w=>Object.freeze({...w,reason:'Fortress wall overlaps cell',look:'wall' as const})));
export const twinWalls:Battlefield=validateBattlefield(Object.freeze({
 id:'twin-walls',
 barriers:Object.freeze([...twinCliffs,...twinRings]),
 scenery:canyonPass.scenery.filter(p=>p.x<1040-p.radius&&!twinCliffs.some(b=>p.x>b.x0-p.radius&&p.x<b.x1+p.radius&&p.y>b.y0-p.radius&&p.y<b.y1+p.radius)),
 entities:canyonPass.entities.map(e=>Object.freeze({...e})),
 gates:Object.freeze([['red-gate-outer',1272,600],['red-gate-inner',1464,600]].map(([id,x,y])=>Object.freeze({id:id as string,x:x as number,y:y as number,columns:1,rows:2}))),
 barracks:Object.freeze([['red-barracks-north',1488,168],['red-barracks-south',1488,1032],['red-barracks-court',1824,432]].map(([id,x,y])=>Object.freeze({id:id as string,x:x as number,y:y as number,columns:2,rows:2}))),
 towers:Object.freeze([['red-outer-north',1224,504],['red-outer-south',1224,696],['red-strip-north',1224,312],['red-strip-south',1224,888],['red-gap-north',1320,264],['red-gap-south',1320,936],['red-court-north',1416,456],['red-court-south',1416,744]].map(([id,x,y])=>Object.freeze({id:id as string,x:x as number,y:y as number}))),
 territory:meadow.territory,reserved:meadow.reserved,respawn:meadow.respawn,objectives:meadow.objectives,
}));
// The Fallen Outposts (Chapter 3 M5, docs/CHAPTER3_M5.md): one fortress wall (x 1392-1440) with two ways through. The Main Gate site (1416,600) fills the middle opening. The north opening (y 120-216) is plugged by Barracks B, behind a Deep Snow
// pocket: a north rampart (x 1152-1392, y 288-336) walls it off from the strip, leaving the entrance west of x 1152. Barracks A stands inside the pocket without blocking it. The south rampart (y 816-864) walls off an empty dead end.
// Two Choke Towers on the north rampart's north face see Barracks B's siege spot; two bastions flush on the wall's west face see the gate's; two inner towers on its east face see the breach. Canyon's cliffs end at x 1040 as on Twin Walls.
// The snow zone spans x 1040-1392, y 0-480: the pocket and the strip in front of its entrance.
const fallenWalls:readonly Barrier[]=Object.freeze([
 {x0:1392,y0:0,x1:1440,y1:120},{x0:1392,y0:216,x1:1440,y1:552},{x0:1392,y0:648,x1:1440,y1:1152},{x0:1152,y0:288,x1:1392,y1:336},{x0:1152,y0:816,x1:1392,y1:864},
].map(w=>Object.freeze({...w,reason:'Fortress wall overlaps cell',look:'wall' as const})));
export const fallenOutposts:Battlefield=validateBattlefield(Object.freeze({
 id:'fallen-outposts',
 barriers:Object.freeze([...twinCliffs,...fallenWalls]),
 scenery:canyonPass.scenery.filter(p=>p.x<1040-p.radius&&!twinCliffs.some(b=>p.x>b.x0-p.radius&&p.x<b.x1+p.radius&&p.y>b.y0-p.radius&&p.y<b.y1+p.radius)),
 entities:canyonPass.entities.map(e=>Object.freeze({...e})),
 gates:Object.freeze([Object.freeze({id:'red-gate-main',x:1416,y:600,columns:1,rows:2})]),
 barracks:Object.freeze([['red-barracks-outpost',1200,144],['red-barracks-plug',1416,168],['red-barracks-keep',1728,456]].map(([id,x,y])=>Object.freeze({id:id as string,x:x as number,y:y as number,columns:2,rows:2}))),
 towers:Object.freeze([['red-bastion-north',1368,504],['red-bastion-south',1368,696],['red-choke-east',1320,264],['red-choke-west',1224,264],['red-inner-north',1464,456],['red-inner-south',1464,744]].map(([id,x,y])=>Object.freeze({id:id as string,x:x as number,y:y as number}))),
 slowZones:Object.freeze([Object.freeze({x0:1040,y0:0,x1:1392,y1:480,slow:.5})]),
 territory:meadow.territory,reserved:meadow.reserved,respawn:meadow.respawn,objectives:meadow.objectives,
}));
// Registered battlefields. Tests may build their own Battlefield objects without registering them.
const registry={meadow,'canyon-pass':canyonPass,oasis,'frost-citadel':frostCitadel,'broken-wall':brokenWall,'twin-walls':twinWalls,'fallen-outposts':fallenOutposts} as const;
export type BattlefieldId=keyof typeof registry;
export function battlefield(id:BattlefieldId):Battlefield{
 if(!Object.hasOwn(registry,id))throw new Error(`Unknown battlefield ${String(id)}`);
 return registry[id];
}

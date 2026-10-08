export const GRID = 48;
export const WORLD = { width: 40 * GRID, height: 24 * GRID };
// Presentation projection only. No sprite dimensions enter occupancy calculations.
export const projection = { x: 1, y: 0.72 };
export const VIEW_WORLD = { width: WORLD.width * projection.x, height: WORLD.height * projection.y };
export const terrain = { riverLeft: 880, riverRight: 1040, laneTop: 485, laneBottom: 665, bridgeTop: 535, bridgeBottom: 615 };
export const scenery = [
 ...[120,350,610,810,1140,1380,1640,1840].flatMap((x,i)=>[
  {kind:'trees',x,y:160+(i%3)*44,height:190+(i%2)*32,radius:44},
  {kind:'trees',x:x+40,y:1020-(i%3)*26,height:196,radius:44}]),
 ...[[530,365],[790,340],[1120,355],[1440,365],[570,835],[1090,850],[1490,835]].map(([x,y])=>({kind:'rocks',x,y,height:55,radius:24})),
 ...[[220,390],[675,400],[1190,430],[1580,410],[400,810],[1240,800],[1700,810]].map(([x,y])=>({kind:'bush',x,y,height:44,radius:18})),
];
export function worldToView(x: number, y: number) { return { x: x * projection.x, y: y * projection.y }; }
export function viewToWorld(x: number, y: number) { return { x: x / projection.x, y: y / projection.y }; }
export interface VisualEntity { id: string; kind: 'base-blue'|'base-red'|'tower'|'wall'|'guardian'|'minion-blue'|'minion-red'; x: number; y: number; width: number; height: number; team: 'blue'|'red'; name: string; hp: string; footprint: { columns: number; rows: number } | { radius: number }; }
export const entities: VisualEntity[] = [
 {id:'blue-base',kind:'base-blue',x:330,y:600,width:160,height:164,team:'blue',name:'Azure Keep',hp:'3,000 / 3,000',footprint:{columns:3,rows:3}},
 {id:'red-base',kind:'base-red',x:1610,y:600,width:160,height:164,team:'red',name:'Crimson Keep',hp:'3,000 / 3,000',footprint:{columns:3,rows:3}},
 {id:'tower',kind:'tower',x:620,y:495,width:76,height:118,team:'blue',name:'Archer Tower',hp:'650 / 650',footprint:{columns:1,rows:1}},
 {id:'wall-a',kind:'wall',x:720,y:690,width:47,height:50,team:'blue',name:'Wooden Wall',hp:'400 / 400',footprint:{columns:1,rows:1}},
 {id:'wall-b',kind:'wall',x:768,y:690,width:47,height:50,team:'blue',name:'Wooden Wall',hp:'400 / 400',footprint:{columns:1,rows:1}},
 {id:'guardian',kind:'guardian',x:820,y:590,width:69,height:88,team:'blue',name:'Guardian',hp:'1,200 / 1,200',footprint:{radius:20}},
 ...[[940,560],[1010,598],[1100,560]].map(([x,y],i)=>({id:`blue-${i}`,kind:'minion-blue' as const,x,y,width:38,height:48,team:'blue' as const,name:'Azure Vanguard',hp:'240 / 240',footprint:{radius:12}})),
 ...[[1200,565],[1290,625],[1360,550]].map(([x,y],i)=>({id:`red-${i}`,kind:'minion-red' as const,x,y,width:38,height:48,team:'red' as const,name:'Crimson Raider',hp:'240 / 240',footprint:{radius:12}})),
];
export function blocked(x:number,y:number) {
 const r=20;
 if(x<r||x>WORLD.width-r||y<r||y>WORLD.height-r) return true;
 if(x>terrain.riverLeft-r&&x<terrain.riverRight+r&&(y<terrain.bridgeTop+r||y>terrain.bridgeBottom-r))return true;
 if(scenery.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+r))return true;
 return entities.some(e=> 'columns' in e.footprint && Math.abs(x-e.x)<e.footprint.columns*GRID/2+20 && Math.abs(y-e.y)<e.footprint.rows*GRID/2+20);
}

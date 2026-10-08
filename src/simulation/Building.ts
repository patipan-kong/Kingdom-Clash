import {buildings,type BuildingKind} from '../data/buildings';
import type {GameState} from './GameState';
import {entities,GRID,WORLD,scenery,terrain} from '../world/layout';
import {waves} from '../data/combat';
export function placementReason(s:GameState,kind:BuildingKind,col:number,row:number){
 if(!Object.hasOwn(buildings,kind)||!Number.isInteger(col)||!Number.isInteger(row))return 'Invalid command';
 const x=(col+.5)*GRID,y=(row+.5)*GRID;
 if(col<0||row<0||x>=WORLD.width||y>=WORLD.height)return 'Outside map';
 if(Math.hypot(x-330,y-600)>8*GRID)return 'Outside controlled territory';
 if(Object.values(s.structures).some(b=>Math.abs(b.x-x)<GRID&&Math.abs(b.y-y)<GRID))return 'Occupied structure cell';
 if(Object.values(s.units).some(u=>u.hp>0&&Math.abs(u.x-x)<24+u.radius&&Math.abs(u.y-y)<24+u.radius))return 'Occupied by unit';
 // Reserve respawn/shop approach and wave spawn cells, including radius margins.
 if(Math.abs(x-450)<24+24&&Math.abs(y-600)<24+24||waves.some(w=>[...w.positions,...w.alliedPositions].some(([a,b])=>Math.abs(a-x)<36&&Math.abs(b-y)<36)))return 'Reserved spawn area';
 const left=x-GRID/2,right=x+GRID/2,top=y-GRID/2,bottom=y+GRID/2;
 if(right>terrain.riverLeft&&left<terrain.riverRight&&(top<terrain.bridgeTop||bottom>terrain.bridgeBottom))return 'Water overlaps cell';
 if(scenery.some(p=>Math.hypot(p.x-Math.max(left,Math.min(right,p.x)),p.y-Math.max(top,Math.min(bottom,p.y)))<p.radius))return 'Scenery overlaps cell';
 if(entities.some(e=>'columns' in e.footprint&&Math.abs(x-e.x)<(e.footprint.columns+1)*GRID/2&&Math.abs(y-e.y)<(e.footprint.rows+1)*GRID/2))return 'Occupied static structure';
 if(kind==='tower'&&Object.values(s.structures).filter(b=>b.kind==='tower').length>=30)return 'Tower limit reached';
 const cost=buildings[kind];if(s.wood<cost.wood||s.iron<cost.iron)return 'Not enough resources';
 return '';
}

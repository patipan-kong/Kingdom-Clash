import {buildings,type BuildingKind} from '../data/buildings';
import type {GameState} from './GameState';
import {GRID,WORLD} from '../world/layout';
import {inTerritory,type Battlefield} from '../world/battlefield';
import {constructionCost,type ConstructionResources} from './ConstructionCosts';
// Chapter 2 S1: territory, reserved cells, barriers, scenery and static footprints come from the match's Battlefield.
export function placementReason(field:Battlefield,s:GameState,kind:BuildingKind,col:number,row:number,resources:ConstructionResources=s){
 if(!Object.hasOwn(buildings,kind)||!Number.isInteger(col)||!Number.isInteger(row))return 'Invalid command';
 const x=(col+.5)*GRID,y=(row+.5)*GRID;
 if(col<0||row<0||x>=WORLD.width||y>=WORLD.height)return 'Outside map';
 if(!inTerritory(field,x,y))return 'Outside controlled territory';
 if(Object.values(s.structures).some(b=>Math.abs(b.x-x)<GRID&&Math.abs(b.y-y)<GRID))return 'Occupied structure cell';
 if(Object.values(s.units).some(u=>u.hp>0&&Math.abs(u.x-x)<24+u.radius&&Math.abs(u.y-y)<24+u.radius))return 'Occupied by unit';
 // Reserve respawn/shop approach and wave spawn cells, including radius margins.
 if(field.reserved.some(p=>Math.abs(x-p.x)<24+24&&Math.abs(y-p.y)<24+24)||s.encounter.reserved.some(([a,b])=>Math.abs(a-x)<36&&Math.abs(b-y)<36))return 'Reserved spawn area';
 const left=x-GRID/2,right=x+GRID/2,top=y-GRID/2,bottom=y+GRID/2;
 const barrier=field.barriers.find(b=>right>b.x0&&left<b.x1&&bottom>b.y0&&top<b.y1);if(barrier)return barrier.reason;
 if(field.scenery.some(p=>Math.hypot(p.x-Math.max(left,Math.min(right,p.x)),p.y-Math.max(top,Math.min(bottom,p.y)))<p.radius))return 'Scenery overlaps cell';
 if(field.entities.some(e=>'columns' in e.footprint&&Math.abs(x-e.x)<(e.footprint.columns+1)*GRID/2&&Math.abs(y-e.y)<(e.footprint.rows+1)*GRID/2))return 'Occupied static structure';
 if(kind==='tower'&&Object.values(s.structures).filter(b=>b.kind==='tower'&&b.team!=='red').length>=30)return 'Tower limit reached';
 const cost=constructionCost(s.inventory,kind);if(resources.wood<cost.wood||resources.iron<cost.iron)return 'Not enough resources';
 return '';
}

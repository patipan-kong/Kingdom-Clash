import type {Structure} from './GameState';
import {entities,GRID,scenery,terrain,WORLD} from '../world/layout';
export function blocked(x:number,y:number,r:number,structures:Record<string,Structure>={}){
 if(x<r||x>WORLD.width-r||y<r||y>WORLD.height-r)return true;
 if(x>terrain.riverLeft-r&&x<terrain.riverRight+r&&(y<terrain.bridgeTop+r||y>terrain.bridgeBottom-r))return true;
 if(scenery.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+r))return true;
 if(Object.values(structures).some(b=>b.hp>0&&Math.abs(x-b.x)<GRID/2+r&&Math.abs(y-b.y)<GRID/2+r))return true;
 return entities.some(e=>'columns' in e.footprint&&Math.abs(x-e.x)<e.footprint.columns*GRID/2+r&&Math.abs(y-e.y)<e.footprint.rows*GRID/2+r);
}
export function lineOfSight(a:{x:number;y:number},b:{x:number;y:number},structures:Record<string,Structure>={}){
 const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);
 for(let i=0;i<=n;i++){const t=n?i/n:0;if(blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,0,structures))return false;}
 return true;
}
export function move(u:{x:number;y:number;radius:number},dx:number,dy:number,structures:Record<string,Structure>={}){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
 for(let i=0;i<n;i++){if(!blocked(u.x+dx/n,u.y,u.radius,structures))u.x+=dx/n;if(!blocked(u.x,u.y+dy/n,u.radius,structures))u.y+=dy/n;}
}

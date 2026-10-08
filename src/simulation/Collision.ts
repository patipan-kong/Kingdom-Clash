import type {Structure,Unit} from './GameState';
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

// Only Guardian contacts need hard movement clipping. Minion crowds retain their
// existing soft separation/lane steering. These circles are simulation footprints.
export function moveUnit(u:Unit,dx:number,dy:number,units:Unit[],structures:Record<string,Structure>){
 const contacts=units.filter(v=>v!==u&&v.hp>0&&(u.kind==='guardian'||v.kind==='guardian')).sort((a,b)=>a.id.localeCompare(b.id));
 if(!contacts.length){move(u,dx,dy,structures);return;}
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
 for(let step=0;step<steps;step++){
  const start={x:u.x,y:u.y};let x=start.x,y=start.y,vx=dx/steps,vy=dy/steps;
  // Sweep to first circle contact, then slide the remaining input along its tangent.
  for(let iteration=0;iteration<4;iteration++){
   let time=1,hit:Unit|undefined;
   for(const v of contacts){
    const ax=x-v.x,ay=y-v.y,r=u.radius+v.radius,c=ax*ax+ay*ay-r*r,b=ax*vx+ay*vy,a=vx*vx+vy*vy;
    if(a<1e-12||b>=0)continue;
    const discriminant=b*b-a*c;if(discriminant<0)continue;
    const t=c<=1e-8?0:Math.max(0,(-b-Math.sqrt(discriminant))/a);
    if(t<time){time=t;hit=v;}
   }
   x+=vx*time;y+=vy*time;if(!hit)break;
   vx*=1-time;vy*=1-time;
   const length=Math.hypot(x-hit.x,y-hit.y),nx=length?(x-hit.x)/length:0,ny=length?(y-hit.y)/length:1,inward=Math.min(0,vx*nx+vy*ny);
   vx-=nx*inward;vy-=ny*inward;
  }
  // Terrain sliding may change the swept endpoint; accept only safe contacts.
  const safe=()=>contacts.every(v=>Math.hypot(u.x-v.x,u.y-v.y)+1e-7>=Math.min(u.radius+v.radius,Math.hypot(start.x-v.x,start.y-v.y)));
  move(u,x-start.x,y-start.y,structures);
  if(!safe()){
   u.x=start.x;u.y=start.y;move(u,x-start.x,0,structures);
   if(!safe()){u.x=start.x;u.y=start.y;move(u,0,y-start.y,structures);if(!safe()){u.x=start.x;u.y=start.y;}}
  }
 }
}

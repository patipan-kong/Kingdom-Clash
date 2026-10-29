import type {Structure,Unit} from './GameState';
import {GRID,WORLD} from '../world/layout';
import {meadow,type Battlefield} from '../world/battlefield';
type Point={x:number;y:number};
// Chapter 2 S1: collision, line of sight and movement against one match's Battlefield. A Simulation builds one Geometry and hands it
// to every consumer; the checks are the pre-S1 Meadow rules with the river generalised to barrier rectangles.
export class Geometry {
 constructor(readonly field:Battlefield){}
 blocked(x:number,y:number,r:number,structures:Record<string,Structure>={}){
  if(x<r||x>WORLD.width-r||y<r||y>WORLD.height-r)return true;
  for(const b of this.field.barriers)if(x>b.x0-r&&x<b.x1+r&&y>b.y0-r&&y<b.y1+r)return true;
  // Hot path (Navigation edges, line of sight, steering): plain loops, no per-call arrays or closures. A circle further than its reach on either axis cannot satisfy hypot < reach, so the hypot is skipped for it; the result is unchanged.
  for(const p of this.field.scenery){const reach=p.radius+r,dx=x-p.x;if(dx>=reach||-dx>=reach)continue;const dy=y-p.y;if(dy>=reach||-dy>=reach)continue;if(Math.hypot(dx,dy)<reach)return true;}
  for(const id in structures){const b=structures[id];if(b.hp>0&&Math.abs(x-b.x)<(b.columns??1)*GRID/2+r&&Math.abs(y-b.y)<(b.rows??1)*GRID/2+r)return true;}
  for(const e of this.field.entities)if('columns' in e.footprint&&Math.abs(x-e.x)<e.footprint.columns*GRID/2+r&&Math.abs(y-e.y)<e.footprint.rows*GRID/2+r)return true;
  return false;
 }
 lineOfSight(a:Point,b:Point,structures:Record<string,Structure>={}){
  const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);
  for(let i=0;i<=n;i++){const t=n?i/n:0;if(this.blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,0,structures))return false;}
  return true;
 }
 // Used for both graph edges and steering: a grid route never replaces collision.
 clearSegment(a:Point,b:Point,radius:number,structures:Record<string,Structure>={}){
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
  for(let i=0;i<=n;i++)if(this.blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,radius,structures))return false;
  return true;
 }
 move(u:{x:number;y:number;radius:number},dx:number,dy:number,structures:Record<string,Structure>={}){
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
  for(let i=0;i<n;i++){if(!this.blocked(u.x+dx/n,u.y,u.radius,structures))u.x+=dx/n;if(!this.blocked(u.x,u.y+dy/n,u.radius,structures))u.y+=dy/n;}
 }
 // Only Guardian contacts need hard movement clipping. Minion crowds retain their
 // existing soft separation/lane steering. These circles are simulation footprints.
 moveUnit(u:Unit,dx:number,dy:number,units:Unit[],structures:Record<string,Structure>){
  const contacts=units.filter(v=>v!==u&&v.hp>0&&(u.kind==='guardian'||v.kind==='guardian')).sort((a,b)=>a.id.localeCompare(b.id));
  if(!contacts.length){this.move(u,dx,dy,structures);return;}
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
   this.move(u,x-start.x,y-start.y,structures);
   if(!safe()){
    u.x=start.x;u.y=start.y;this.move(u,x-start.x,0,structures);
    if(!safe()){u.x=start.x;u.y=start.y;this.move(u,0,y-start.y,structures);if(!safe()){u.x=start.x;u.y=start.y;}}
   }
  }
 }
}
// MEADOW-COMPAT: the pre-S1 module functions, bound to Meadow, for existing tests, scripts and the UI. Simulation code never calls them;
// tests/battlefield-threading.cjs enforces that.
export const meadowGeometry=new Geometry(meadow); // MEADOW-COMPAT
export const blocked=(x:number,y:number,r:number,structures:Record<string,Structure>={})=>meadowGeometry.blocked(x,y,r,structures); // MEADOW-COMPAT
export const lineOfSight=(a:Point,b:Point,structures:Record<string,Structure>={})=>meadowGeometry.lineOfSight(a,b,structures); // MEADOW-COMPAT
export const move=(u:{x:number;y:number;radius:number},dx:number,dy:number,structures:Record<string,Structure>={})=>meadowGeometry.move(u,dx,dy,structures); // MEADOW-COMPAT
export const moveUnit=(u:Unit,dx:number,dy:number,units:Unit[],structures:Record<string,Structure>)=>meadowGeometry.moveUnit(u,dx,dy,units,structures); // MEADOW-COMPAT

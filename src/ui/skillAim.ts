// Guardian V1.0 MOBA-style skill aiming, presentation only: a drag from a skill button becomes the cast command the simulation already accepts (Bash: targetId,
// Charge: direction and distance). Pure; Battle supplies the hero, the candidates and the legality check, the HUD supplies the pointer. Drag vectors are canvas
// px (960x540) and undo the ground projection, so a drag up-screen aims up the battlefield.
import {bashCone} from '../data/guardian';
export const AIM={
 full:72, // CSS px of drag for the full Charge distance (the thumb travels this far, whatever the screen size)
 cone:bashCone.half, // Bash picks within 60 degrees either side of the drag direction (the same cone the simulation hits)
} as const;
type Point={x:number;y:number};
// The world direction of a drag (unit length), or undefined for no drag.
export function aimDirection(start:Point,p:Point,projectionY:number):Point|undefined{
 const x=p.x-start.x,y=(p.y-start.y)/projectionY,n=Math.hypot(x,y);
 return n>1e-6?{x:x/n,y:y/n}:undefined;
}
// Charge: the direction of the drag; the distance grows with the drag up to the rank's maximum at AIM.full CSS px. scale: CSS px per canvas px.
export function chargeAim(start:Point,p:Point,projectionY:number,scale:number,max:number){
 const direction=aimDirection(start,p,projectionY);if(!direction)return undefined;
 const drag=Math.hypot(p.x-start.x,p.y-start.y)*scale;
 return {direction,distance:Math.max(1,Math.min(1,drag/AIM.full)*max)};
}
// Bash: the legal target best lined up with the drag (smallest angle inside the cone; the nearer on a tie), or undefined.
export function bashAim<T extends Point&{id:string}>(hero:Point,direction:Point,candidates:readonly T[]):T|undefined{
 let best:T|undefined,bestAngle=Infinity,bestDistance=Infinity;
 for(const u of candidates){
  const x=u.x-hero.x,y=u.y-hero.y,d=Math.hypot(x,y),angle=d<1e-6?0:Math.acos(Math.max(-1,Math.min(1,(x*direction.x+y*direction.y)/d)));
  if(angle>AIM.cone+1e-9)continue;
  if(angle<bestAngle-1e-6||Math.abs(angle-bestAngle)<=1e-6&&(d<bestDistance||d===bestDistance&&best!==undefined&&u.id<best.id)){best=u;bestAngle=angle;bestDistance=d;}
 }
 return best;
}
// The pointer is over the cancel target.
export const inCancel=(p:Point,cancel:{x:number;y:number;radius:number})=>Math.hypot(p.x-cancel.x,p.y-cancel.y)<=cancel.radius;

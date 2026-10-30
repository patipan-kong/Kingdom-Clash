import {guardianStats} from '../data/combat';
import {projection} from '../world/layout';
// Camera rules while the Guardian is dead. The camera normally follows the Guardian and the Guardian's own movement is what pans it;
// a dead Guardian cannot move, so the move input drives the camera directly until the Guardian respawns.
export type CameraAction='pan'|'follow'|'none';
export function cameraAction(s:{dead:boolean;wasDead:boolean;moving:boolean;lookExpired:boolean}):CameraAction{
 if(s.dead)return s.moving?'pan':'none'; // never re-follow (or snap back to) the corpse
 if(s.wasDead||s.moving||s.lookExpired)return 'follow'; // respawned: resume the smoothed follow from wherever the camera is
 return 'none';
}
// Free-look scroll at Guardian speed, clamped to the world exactly like the camera bounds.
export function deadPan(scroll:{x:number;y:number},input:{x:number;y:number},deltaMs:number,bounds:{x?:number;y?:number;width:number;height:number},view:{width:number;height:number}){
 const len=Math.hypot(input.x,input.y),k=len>1?1/len:1,step=guardianStats.speed*Math.min(deltaMs,100)/1000;
 const clamp=(v:number,min:number,max:number)=>Math.min(Math.max(min,max),Math.max(min,v)),x0=bounds.x??0,y0=bounds.y??0;
 return {x:clamp(scroll.x+input.x*k*step*projection.x,x0,x0+bounds.width-view.width),y:clamp(scroll.y+input.y*k*step*projection.y,y0,y0+bounds.height-view.height)};
}

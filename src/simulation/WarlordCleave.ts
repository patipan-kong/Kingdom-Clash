import {HZ} from './Clock';

export const warlordCleave={
 damage:180, range:120, halfAngle:Math.PI/3, triggerRange:90, maxTargets:6,
 windupTicks:HZ, cooldownTicks:8*HZ, recoveryTicks:.8*HZ,
} as const;

export interface CleaveCast {
 readonly x:number;readonly y:number;readonly angle:number;
 readonly startTick:number;readonly targetId:string;
}

export function inCleaveCone(cast:CleaveCast,point:{x:number;y:number}){
 const dx=point.x-cast.x,dy=point.y-cast.y,radius=Math.hypot(dx,dy);
 return radius<=warlordCleave.range+1e-8&&
  dx*Math.cos(cast.angle)+dy*Math.sin(cast.angle)>=radius*Math.cos(warlordCleave.halfAngle)-1e-8;
}

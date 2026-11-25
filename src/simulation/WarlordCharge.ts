import {HZ} from './Clock';
import type {Unit} from './GameState';

export const warlordCharge={
 damage:150,range:360,speed:600,windupTicks:1.2*HZ,stunTicks:Math.round(.75*HZ),
 cooldownTicks:16*HZ,firstDelayTicks:10*HZ,abilityGapTicks:HZ,
} as const;

export interface WarlordChargeCast {
 readonly x:number;readonly y:number;readonly dx:number;readonly dy:number;
 readonly radius:number;readonly distance:number;readonly startTick:number;readonly targetId:string;
 travelled:number;
}

// The moving boss owns his full footprint. Unit targets use the existing arena-centre rule.
export function insideChargeLeash(boss:Unit,x:number,y:number){
 const {anchor,radius}=boss.localGuard!;
 return Math.hypot(x-anchor.x,y-anchor.y)<=radius-boss.radius+1e-8;
}

export function overlapsChargePath(cast:WarlordChargeCast,unit:Unit){
 const dx=unit.x-cast.x,dy=unit.y-cast.y;
 const along=Math.max(0,Math.min(cast.distance,dx*cast.dx+dy*cast.dy));
 return Math.hypot(dx-along*cast.dx,dy-along*cast.dy)<cast.radius+unit.radius;
}

import type {Unit} from './GameState';
import type {Point} from '../world/battlefield';
// Chapter 2 S7: flank lifecycle for units a wave tagged at spawn (SpawnEntry.lane). Pure rules; Movement applies them.
//  - Assigned at spawn with startTick = the spawn tick. The waypoint is the battlefield's flankVia for the unit's lane, read when needed.
//  - While assigned and not suspended, the unit routes to the waypoint with the normal Navigation search; combat rules are untouched.
//  - Suspended (normal routing for that tick, assignment kept) while it holds a non-Keep target within engage px, so a Guardian, tower, wall or
//    ally close to it is answered by the existing rules. A target in attack range is attacked before any routing, as always.
//  - Released for good (unit.flank cleared) when: it is within reach px of the waypoint (reached); it is west of the waypoint by reach px and
//    within corridor px of its y (passed, so a crowd that slides round the waypoint still ends); timeout ticks passed since spawn; the battlefield
//    has no waypoint for the lane; or Navigation finds no route to it (Movement releases at once and routes normally that tick).
export const FLANK={reach:48,corridor:200,engage:160,timeout:600} as const;
export type FlankEnd='reached'|'passed'|'timeout'|'no-waypoint';
export function flankEnd(unit:Unit,via:Point|undefined,tick:number):FlankEnd|undefined{
 const f=unit.flank;if(!f)return undefined;
 if(!via)return 'no-waypoint';
 if(tick-f.startTick>=FLANK.timeout)return 'timeout';
 if(Math.hypot(unit.x-via.x,unit.y-via.y)<=FLANK.reach)return 'reached';
 if(unit.x<=via.x-FLANK.reach&&Math.abs(unit.y-via.y)<=FLANK.corridor)return 'passed';
 return undefined;
}
export const flankSuspended=(unit:Unit,target:{x:number;y:number;kind:string}|undefined)=>!!target&&!target.kind.startsWith('base')&&Math.hypot(unit.x-target.x,unit.y-target.y)<=FLANK.engage;

import {gameplayV03} from '../data/gameplayV03';
import {canAttackOn} from './Combat';
import {meadowGeometry,type Geometry} from './Collision';
import type {Structure,Unit} from './GameState';

const aggro=gameplayV03.aggro;
// Crimson minion pursuit of the Guardian (Gameplay v0.3). Pure of randomness; mutates only the minion's own pursuit memory.
// - Acquisition: the Guardian is considered only within aggro.acquireRange, or retaliateRange for retaliateTicks after it struck this minion (kept within retainRange / retaliateRetainRange).
// - Leash: a pursuit ends after leashTravel of movement or leashTicks; the Guardian is then ignored for ignoreTicks.
// - While ignoring, the minion still fights a Guardian in attack reach; hits neither shorten the cooldown nor reset the leash.
export function guardianPursuableOn(geo:Geometry,unit:Unit,guardian:Unit,tick:number,pursuing:boolean,structures:Record<string,Structure>):boolean{
 const provoked=unit.retaliateTick!==undefined&&tick-unit.retaliateTick<=aggro.retaliateTicks;
 const range=pursuing?(provoked?aggro.retaliateRetainRange:aggro.retainRange):(provoked?aggro.retaliateRange:aggro.acquireRange);
 if(Math.hypot(unit.x-guardian.x,unit.y-guardian.y)>range)return false;
 const p=unit.pursuit;
 if(pursuing&&p&&(Math.hypot(unit.x-p.x,unit.y-p.y)>aggro.leashTravel||tick-p.tick>aggro.leashTicks)){unit.pursuit=undefined;unit.guardianIgnoreUntil=tick+aggro.ignoreTicks;}
 if(tick>=(unit.guardianIgnoreUntil??0))return true;
 return canAttackOn(geo,unit,guardian,structures);
}
export const guardianPursuable=(unit:Unit,guardian:Unit,tick:number,pursuing:boolean,structures:Record<string,Structure>)=>guardianPursuableOn(meadowGeometry,unit,guardian,tick,pursuing,structures); // MEADOW-COMPAT
// Called once a minion has chosen its target: remember where a Guardian pursuit began, forget it otherwise.
export function trackPursuit(unit:Unit,targetKind:string|undefined,tick:number){
 if(targetKind==='guardian'){unit.pursuit??={x:unit.x,y:unit.y,tick};}else unit.pursuit=undefined;
}

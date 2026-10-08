import {HZ} from './Clock';
import {move} from './Collision';
import {canAttack} from './Combat';
import type {GameState} from './GameState';

// Movement finishes for every unit before this tick's attacks resolve.
export function updateMovement(state:GameState){
 const hero=state.units.guardian;
 if(hero.hp>0)move(hero,state.move.x*hero.speed/HZ,state.move.y*hero.speed/HZ);
 for(const unit of Object.values(state.units)){
  if(unit.team!=='red'||unit.hp<=0)continue;
  unit.targetId=hero.hp>0&&Math.hypot(unit.x-hero.x,unit.y-hero.y)<=560?hero.id:undefined;
  const target=unit.targetId?hero:undefined;
  if(target&&canAttack(unit,target))continue;
  let x=target?.x??820,y=target?.y??575;
  // Static crossing waypoint only. Dynamic obstacle routing is deferred.
  if((unit.x>1040&&x<1040)||(unit.x<880&&x>880)){
   y=575;if(Math.abs(unit.y-y)>8)x=unit.x;
  }
  const dx=x-unit.x,dy=y-unit.y,length=Math.hypot(dx,dy);
  if(length>1)move(unit,dx/length*unit.speed/HZ,dy/length*unit.speed/HZ);
 }
}

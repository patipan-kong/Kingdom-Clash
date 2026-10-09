import type {Unit,Structure} from './GameState';
import {lineOfSight} from './Collision';
export function damageAfterArmor(damage:number,armor:number,type:'physical'|'magic'|'direct'='physical'){return type==='direct'?damage:damage*100/(100+Math.max(0,armor));}
export function canAttack(a:Unit,b:Unit,structures:Record<string,Structure>={}){
 const hit=b.kind.startsWith('base')?{x:Math.max(b.x-(b.columns??3)*24,Math.min(b.x+(b.columns??3)*24,a.x)),y:Math.max(b.y-(b.rows??3)*24,Math.min(b.y+(b.rows??3)*24,a.y))}:b;
 return a.hp>0&&b.hp>0&&a.team!==b.team&&Math.hypot(a.x-hit.x,a.y-hit.y)<=a.range+1e-8&&lineOfSight(a,hit,Object.fromEntries(Object.entries(structures).filter(([id])=>id!==a.id&&id!==b.id)));
}

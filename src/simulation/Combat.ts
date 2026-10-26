import type {Unit,Structure} from './GameState';
import {meadowGeometry,type Geometry} from './Collision';
export function damageAfterArmor(damage:number,armor:number,type:'physical'|'magic'|'direct'='physical'){return type==='direct'?damage:damage*100/(100+Math.max(0,armor));}
// Nearest point of a Keep's footprint to p (its edge, or p itself when inside).
const footprintPoint=(b:Unit,p:{x:number;y:number})=>({x:Math.max(b.x-(b.columns??3)*24,Math.min(b.x+(b.columns??3)*24,p.x)),y:Math.max(b.y-(b.rows??3)*24,Math.min(b.y+(b.rows??3)*24,p.y))});
export function canAttackOn(geo:Geometry,a:Unit,b:Unit,structures:Record<string,Structure>={}){
 const hit=b.kind.startsWith('base')?footprintPoint(b,a):b;
 // Gameplay v0.4: an attacking Keep shoots from its own footprint edge, the reverse of an attacker's segment onto it.
 const from=a.kind.startsWith('base')?footprintPoint(a,hit):a;
 return !b.invulnerable&&a.hp>0&&b.hp>0&&a.team!==b.team&&Math.hypot(from.x-hit.x,from.y-hit.y)<=a.range+1e-8&&geo.lineOfSight(from,hit,Object.fromEntries(Object.entries(structures).filter(([id])=>id!==a.id&&id!==b.id)));
}
export const canAttack=(a:Unit,b:Unit,structures:Record<string,Structure>={})=>canAttackOn(meadowGeometry,a,b,structures); // MEADOW-COMPAT

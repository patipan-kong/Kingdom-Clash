import type {Unit,Structure} from './GameState';
import {lineOfSight} from './Collision';
export function damageAfterArmor(damage:number,armor:number,type:'physical'|'magic'|'direct'='physical'){return type==='direct'?damage:damage*100/(100+Math.max(0,armor));}
export function canAttack(a:Unit,b:Unit,structures:Record<string,Structure>={}){return a.hp>0&&b.hp>0&&a.team!==b.team&&Math.hypot(a.x-b.x,a.y-b.y)<=a.range&&lineOfSight(a,b,Object.fromEntries(Object.entries(structures).filter(([id])=>id!==a.id&&id!==b.id)));}

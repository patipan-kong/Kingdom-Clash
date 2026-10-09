import {entities} from '../world/layout';
import type {Structure} from '../simulation/GameState';
// Inherited approved base display: specs define objectives, but no numeric base HP.
export const baseHp=3000;
export const matchRules={simultaneousResult:'defeat' as const,unitCap:40};
export function initialBases():Record<string,Structure>{
 return Object.fromEntries(entities.filter(e=>e.kind.startsWith('base')).map(e=>[e.id,{
  id:e.id,kind:e.kind as 'base-blue'|'base-red',team:e.team,x:e.x,y:e.y,columns:3,rows:3,
  hp:baseHp,maxHp:baseHp,armor:0,radius:72,speed:0,damage:0,range:0,cooldownTicks:0,windupTicks:0,readyTick:0,protectionTick:0,
  col:Math.floor(e.x/48),row:Math.floor(e.y/48),startTick:0,completeTick:0,progress:1,constructionDamage:0,
 }]));
}

import type {Unit,Status} from './GameState';
export const stunned=(u:Unit,tick:number)=>!!u.statuses?.some(s=>s.type==='stun'&&s.startTick<=tick&&s.expiresTick>tick);
export const slowFactor=(u:Unit,tick:number)=>1-Math.min(.5,Math.max(0,...(u.statuses??[]).filter(s=>s.type==='slow'&&s.startTick<=tick&&s.expiresTick>tick).map(s=>s.magnitude)));
export function applyStatus(u:Unit,s:Status){
 const old=u.statuses?.find(v=>v.type===s.type);
 if(old){old.expiresTick=Math.max(old.expiresTick,s.expiresTick);if(s.type==='slow')old.magnitude=Math.max(old.magnitude,s.magnitude);else if(s.type==='taunt'&&(s.startTick>old.startTick||(s.startTick===old.startTick&&s.sourceId<old.sourceId))){Object.assign(old,s,{expiresTick:old.expiresTick});}}
 else (u.statuses??=[]).push({...s});
 if(s.type==='stun')u.strike=undefined;
 if(s.type==='taunt'){const sourceId=(old??s).sourceId;if(u.strike?.targetId!==sourceId)u.strike=undefined;u.targetId=sourceId;}
}

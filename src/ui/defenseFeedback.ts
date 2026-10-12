import {alliedBaseThreatened,threatRules} from '../data/encounters';
import type {GameEvent,GameState} from '../simulation/GameState';

export const defenseFeedbackTiming={accent:650,notice:2500,repeat:8000} as const;
export function azureThreatStatus(state:GameState,tick:number){
 if(!alliedBaseThreatened(state,tick))return '';
 const hit=state.encounter.alliedBaseHitTick;
 return hit!==undefined&&tick-hit<=threatRules.recentTicks?'Azure Keep under attack':'Enemies near Azure Keep';
}
// Episodes use the unchanged threat predicate. Only actual positive damage can alert.
export class DefenseFeedback {
 private alerted=false;
 private lastAlert=-Infinity;
 accentUntil=0;
 sync(state:GameState,tick:number){if(!alliedBaseThreatened(state,tick)){this.alerted=false;this.accentUntil=0;}}
 clear(resetEpisode=false){this.accentUntil=0;if(resetEpisode){this.alerted=false;this.lastAlert=-Infinity;}}
 observe(event:GameEvent,state:GameState,tick:number,now:number){
  this.sync(state,tick);
  if(event.type!=='damage'||event.id!=='blue-base'||event.amount<=0||state.bases['blue-base'].hp<=0||state.match.result||this.alerted)return false;
  this.alerted=true;
  if(now-this.lastAlert<defenseFeedbackTiming.repeat)return false;
  this.lastAlert=now;this.accentUntil=now+defenseFeedbackTiming.accent;return true;
 }
}

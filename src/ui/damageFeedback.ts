import type {GameEvent, Unit} from '../simulation/GameState';

export const damageFeedbackTiming={trace:200,impact:220,coalesce:150,episode:3000,notice:5000,inspection:4000} as const;
type Lookup=(id:string)=>Unit|undefined;
// Presentation time only. Never sends commands or infers ownership from positions.
export class DamageFeedback {
 traces:Array<{sourceId:string;targetId:string;until:number}>=[];
 impactUntil=0;
 private lastImpact=-Infinity;
 private lastTower=-Infinity;
 private lastNotice=-Infinity;
 clear(resetEpisode=true){this.traces=[];this.impactUntil=0;this.lastImpact=-Infinity;if(resetEpisode){this.lastTower=-Infinity;this.lastNotice=-Infinity;}}
 expire(now:number,lookup:Lookup){this.traces=this.traces.filter(t=>t.until>now&&(lookup(t.sourceId)?.hp??0)>0&&(lookup(t.targetId)?.hp??0)>0);}
 observe(event:GameEvent,now:number,lookup:Lookup){
  let notice=false,impact=false;
  const hero=lookup('guardian');
  if(!hero||hero.hp<=0)return {notice,impact};
  if(event.type==='attack'&&event.targetId===hero.id){
   const source=lookup(event.id);
   if(source?.kind==='tower'&&source.team!==hero.team){
    const newEpisode=now-this.lastTower>=damageFeedbackTiming.episode;
    this.lastTower=now;
    notice=newEpisode&&now-this.lastNotice>=damageFeedbackTiming.notice;
    if(notice)this.lastNotice=now;
    this.traces=this.traces.filter(t=>t.sourceId!==source.id);
    this.traces.push({sourceId:source.id,targetId:hero.id,until:now+damageFeedbackTiming.trace});
    this.traces=this.traces.slice(-2);
   }
  }
  if(event.type==='damage'&&event.id===hero.id&&event.amount>0){
   const source=lookup(event.sourceId);
   // Missing source: a generic hit, never a guessed tower or faction identity.
   if((!source||source.team!==hero.team)&&now-this.lastImpact>=damageFeedbackTiming.coalesce){
    this.lastImpact=now;this.impactUntil=now+damageFeedbackTiming.impact;impact=true;
   }
  }
  return {notice,impact};
 }
}

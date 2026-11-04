import type {GameEvent,GameState} from '../simulation/GameState';
import type {AudioManager,MusicState} from './AudioManager';
export class BattleAudio {
 private now=0;private evaluated=-Infinity;private changed=-Infinity;
 private combat:number[]=[];private keepHits:number[]=[];private battleUntil=-Infinity;private criticalUntil=-Infinity;private low=false;private ended=false;
 state:MusicState='exploration';
 constructor(readonly manager:AudioManager){}
 observe(e:GameEvent,s:GameState){
  if(this.ended)return;
  if(e.type==='match-end'){this.ended=true;this.state=e.outcome;this.manager.setState(e.outcome);return;}
  if(e.type==='damage'&&e.amount>0){
   if(e.id==='blue-base'){
    this.keepHits=this.keepHits.filter(t=>this.now-t<=3000);this.keepHits.push(this.now);this.keepHits=this.keepHits.slice(-2);
    if(this.keepHits.length>=2)this.criticalUntil=this.now+10000;
    if(s.bases['blue-base']?.hp>0&&!s.match.result)this.manager.playSfx('sfx-keep-warning',this.now,8000);
   }
   const target=s.units[e.id]??s.structures[e.id]??s.bases[e.id],source=s.units[e.sourceId]??s.structures[e.sourceId]??s.bases[e.sourceId],red=s.bases['red-base'];
   const near=(u:typeof target)=>!!u&&!!red&&Math.hypot(u.x-red.x,u.y-red.y)<=420;
   if(e.id==='guardian'||e.sourceId==='guardian'||near(target)||near(source)){
    this.combat=this.combat.filter(t=>this.now-t<=2000);this.combat.push(this.now);this.combat=this.combat.slice(-2);if(this.combat.length>=2)this.battleUntil=this.now+8000;
   }
   if(e.sourceId==='guardian'&&e.damageType==='physical'&&!e.castId)this.manager.playSfx('sfx-guardian-impact',this.now,150);
  }
  if(e.type==='construction-complete'){const b=s.structures[e.id];if(b?.team==='blue'&&!b.banner)this.manager.playSfx('sfx-build-complete',this.now,300);}
  if(e.type==='post'&&e.change==='captured')this.manager.playSfx('sfx-banner-captured',this.now,500);
 }
 update(delta:number,s:GameState){
  if(this.ended)return;this.now+=Math.min(delta,100);if(this.now-this.evaluated<250)return;this.evaluated=this.now;
  const base=s.bases['blue-base'];if(base&&base.hp>0){const ratio=base.hp/base.maxHp;if(ratio<=0.3)this.low=true;else if(ratio>0.4)this.low=false;}
  const next:MusicState=this.low||this.now<this.criticalUntil?'critical':this.now<this.battleUntil?'battle':'exploration';
  if(next!==this.state&&(next==='critical'||this.now-this.changed>=6000)){this.state=next;this.changed=this.now;this.manager.setState(next);}
 }
}

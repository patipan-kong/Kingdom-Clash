import type {Unit,Structure,GameEvent} from './GameState';
import {enemyXp} from '../data/progression';
import {guardianBalance} from '../data/guardian';
import {lineOfSight} from './Collision';
import {Progression} from './Progression';
export interface XPRecipient {unit:Unit;progression:Progression}
export function shareXP(amount:number,ids:string[]){
 if(!Number.isSafeInteger(amount)||amount<=0)return [];
 const sorted=[...new Set(ids)].sort();return sorted.map((id,i)=>({id,amount:Math.floor(amount/sorted.length)+(i<amount%sorted.length?1:0)}));
}
export class XPRewards {
 private sequence=0;private lives=new WeakMap<Unit,string>();
 private rewarded=new Set<string>();private damage=new Map<string,Map<string,number>>();
 constructor(private matchId:string){}
 life(u:Unit){let life=this.lives.get(u);if(!life){life=`${this.matchId}:${u.id}:${++this.sequence}`;this.lives.set(u,life);u.lifeId=life;}return life;}
 revive(u:Unit){this.lives.delete(u);return this.life(u);}
 record(hero:Unit,target:Unit,amount:number,tick:number){
  if(amount<=0||!Number.isFinite(amount)||hero.kind!=='guardian'||hero.team===target.team)return;
  const life=this.life(target),m=this.damage.get(life)??new Map<string,number>();m.set(hero.id,tick);this.damage.set(life,m);
 }
 expire(tick:number){for(const [life,m] of this.damage){for(const [id,t] of m)if(tick-t>guardianBalance.participationTicks)m.delete(id);if(!m.size)this.damage.delete(life);}}
 award(target:Unit,tick:number,heroes:XPRecipient[],structures:Record<string,Structure>,ended=false):GameEvent[]{
  const life=this.life(target),key=`${life}:combat-death`,history=this.damage.get(life);this.damage.delete(life);
  if(ended||target.hp>0||this.rewarded.has(key))return [];this.rewarded.add(key);
  const amount=target.kind==='tower'&&(target as Structure).progress!==1?0:enemyXp[target.kind];
  if(amount===undefined||!Number.isSafeInteger(amount)||amount<=0)return [];
  const eligible=heroes.filter(({unit:h})=>{
   if(h.team===target.team)return false;
   const t=history?.get(h.id),participated=t!==undefined&&tick>=t&&tick-t<=guardianBalance.participationTicks;
   const p=target.kind==='tower'?{x:Math.max(target.x-24,Math.min(target.x+24,h.x)),y:Math.max(target.y-24,Math.min(target.y+24,h.y))}:target;
   const near=h.hp>0&&Math.hypot(h.x-p.x,h.y-p.y)<=guardianBalance.assistRadius&&lineOfSight(h,p,Object.fromEntries(Object.entries(structures).filter(([id])=>id!==target.id)));
   return participated||near;
  });
  return shareXP(amount,eligible.map(h=>h.unit.id)).flatMap(share=>eligible.find(h=>h.unit.id===share.id)!.progression.award(key,share.amount).map(e=>({...e,heroId:share.id})));
 }
}

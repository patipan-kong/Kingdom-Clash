import {guardianBalance,guardianRanks,validateGuardianBalance} from '../data/guardian';
import {guardianStats} from '../data/combat';
import type {GuardianSkill} from '../data/progression';
import type {Cast,Command,GameEvent,GameState,Unit} from './GameState';
import {combatStructures} from './GameState';
import {blocked,lineOfSight} from './Collision';
import {applyStatus,stunned} from './Statuses';
type CastCommand=Extract<Command,{type:'cast'}>;
type Impact=(source:Unit,target:Unit,amount:number,type:'physical'|'magic'|'direct',castId?:string)=>void;
export const initialSkills=()=>({ready:{bash:0,taunt:0,charge:0,zone:0},lockTick:0,zones:[] as GameState['skills']['zones']});
// Straight sweep: terrain wins ties; unit contact is continuous, never sprite-based.
export function chargeContact(u:Unit,dx:number,dy:number,state:GameState){
 const structures=combatStructures(state),n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));let terrainT=1,terrain=false;
 for(let i=1;i<=n;i++)if(blocked(u.x+dx*i/n,u.y+dy*i/n,u.radius,structures)){
  let lo=(i-1)/n,hi=i/n;for(let k=0;k<20;k++){const t=(lo+hi)/2;if(blocked(u.x+dx*t,u.y+dy*t,u.radius,structures))hi=t;else lo=t;}terrainT=lo;terrain=true;break;
 }
 let t=terrainT,hit:Unit|undefined;const a=dx*dx+dy*dy;
 for(const v of Object.values(state.units).filter(v=>v!==u&&v.hp>0).sort((a,b)=>a.id.localeCompare(b.id))){
  const x=u.x-v.x,y=u.y-v.y,r=u.radius+v.radius,c=x*x+y*y-r*r,b=x*dx+y*dy,disc=b*b-a*c;
  if(a===0||b>=0||disc<0)continue;const entry=c<=1e-8?0:(-b-Math.sqrt(disc))/a;
  if(entry>=0&&entry<=1&&(entry<t-1e-9||(!terrain&&!hit&&Math.abs(entry-t)<1e-9))){t=entry;hit=v;}
 }
 return {fraction:t,hit,blocked:terrain||!!hit};
}
export class GuardianSkills {
 private requests=new Set<string>();
 constructor(private state:GameState,private impact:Impact,private emit:(e:GameEvent)=>void,private life:(u:Unit)=>string){validateGuardianBalance();}
 get hero(){return this.state.units.guardian;}
 legalTarget(u:Unit|undefined,range=90){return !!u&&u.hp>0&&u.team!==this.hero.team&&(u.kind==='guardian'||u.kind.startsWith('minion'))&&Math.hypot(u.x-this.hero.x,u.y-this.hero.y)<=range+1e-8&&lineOfSight(this.hero,u,combatStructures(this.state));}
 nearest(){return Object.values(this.state.units).filter(u=>this.legalTarget(u)).sort((a,b)=>Math.hypot(a.x-this.hero.x,a.y-this.hero.y)-Math.hypot(b.x-this.hero.x,b.y-this.hero.y)||a.id.localeCompare(b.id))[0];}
 accept(c:CastCommand,tick:number){
  const h=this.hero,s=this.state.skills,rank=this.state.heroProgression.ranks[c.skill],rules=guardianRanks[c.skill];
  const reject=(reason:string)=>{this.emit({type:'rejected',reason});return false;};
  if(this.requests.has(c.requestId))return reject('Duplicate cast request');this.requests.add(c.requestId);
  if(h.hp<=0||this.state.match.result)return reject('Cannot cast now');
  if(!rank)return reject('Learn this skill first');
  if(stunned(h,tick))return reject('Stunned');
  if(s.cast||tick<s.lockTick)return reject('Casting');
  if(tick<s.ready[c.skill])return reject('Skill on cooldown');
  const cast:Cast={skill:c.skill,rank,requestId:c.requestId,atTick:tick+rules.windup};
  if(c.skill==='bash'){
   const target=c.targetId?this.state.units[c.targetId]:(this.legalTarget(this.state.units[this.state.selectedTarget??''])?this.state.units[this.state.selectedTarget!]:this.nearest());
   if(!this.legalTarget(target))return reject('No legal target in range / line of sight');
   cast.targetId=target!.id;cast.targetLife=this.life(target!);
  }
  if(c.skill==='charge'){
   const direction=c.direction,len=direction?Math.hypot(direction.x,direction.y):0;
   if(!direction||!Number.isFinite(len)||len<=1e-8)return reject('Aim Charge first');
   const distance=Math.min(guardianRanks.charge.distance[rank-1],c.distance??guardianRanks.charge.distance[rank-1]);
   if(!Number.isFinite(distance)||distance<=0)return reject('Invalid Charge distance');
   cast.direction={x:direction.x/len,y:direction.y/len};cast.distance=distance;cast.remaining=distance;
   if(chargeContact(h,cast.direction.x*Math.min(20,distance),cast.direction.y*Math.min(20,distance),this.state).fraction<1e-6)return reject('Charge path blocked');
  }
  s.cast=cast;s.ready[c.skill]=tick+rules.cooldown[rank-1];s.lockTick=tick+guardianBalance.castLockTicks;
  h.strike=undefined;h.protectionTick=0;this.emit({type:'cast-accepted',skill:c.skill,requestId:c.requestId});return true;
 }
 interrupt(){const c=this.state.skills.cast;if(c)this.emit({type:'cast-interrupted',skill:c.skill,requestId:c.requestId});this.state.skills.cast=undefined;}
 clear(){this.interrupt();this.state.skills.zones=[];for(const u of Object.values(this.state.units)){u.statuses=[];u.shield=undefined;}this.refreshStats();}
 expire(tick:number){
  const s=this.state;
  s.skills.zones=s.skills.zones.filter(z=>z.expiresTick>tick&&s.units[z.sourceId]?.hp>0&&this.life(s.units[z.sourceId])===z.sourceLife);
  for(const u of Object.values(s.units)){
   const wasTaunted=u.statuses?.some(v=>v.type==='taunt');
   u.statuses=(u.statuses??[]).filter(status=>{
    if(u.hp<=0||status.expiresTick<=tick)return false;
    if(status.type!=='taunt')return true;
    const source=s.units[status.sourceId];
    if(!source||source.hp<=0||source.protectionTick>tick||this.life(source)!==status.sourceLife||Math.hypot(source.x-u.x,source.y-u.y)>192)return false;
    if(lineOfSight(u,source,combatStructures(s)))status.lostLosTick=undefined;else status.lostLosTick??=tick;
    return status.lostLosTick===undefined||tick-status.lostLosTick<=6;
   });
   if(wasTaunted&&!u.statuses.some(v=>v.type==='taunt')){u.targetId=undefined;u.decisionTick=0;}
   if(u.shield&&(u.hp<=0||u.shield.expiresTick<=tick||!s.skills.zones.some(z=>z.id===u.shield!.zoneId)))u.shield=undefined;
  }
  if(stunned(this.hero,tick))this.interrupt();this.refreshStats();
 }
 refreshStats(){
  const s=this.state,h=this.hero,p=s.heroProgression,level=p.level-1;
  const maxHp=(guardianStats.maxHp+guardianBalance.growth.hp*level)*(1+guardianBalance.fortitude.hpFraction*p.fortitude);
  if(h.maxHp!==maxHp){h.hp=h.hp<=0?0:Math.floor((h.hp/h.maxHp*maxHp+1e-8)*100)/100;h.maxHp=maxHp;}
  h.damage=guardianStats.damage+guardianBalance.growth.attack*level;
  const structures=combatStructures(s),base=s.bases['blue-base'];let passive=0;
  if(h.hp>0&&base?.hp>0){const x=Math.max(base.x-72,Math.min(base.x+72,h.x)),y=Math.max(base.y-72,Math.min(base.y+72,h.y));if(Math.hypot(h.x-x,h.y-y)<=guardianBalance.passive.radius&&lineOfSight(h,{x,y},Object.fromEntries(Object.entries(structures).filter(([id])=>id!==base.id))))passive=guardianBalance.passive.armor;}
  for(const u of Object.values(s.units)){
   const aura=u.hp>0&&u.team===h.team&&(u.kind==='guardian'||u.kind.startsWith('minion'))?Math.max(0,...s.skills.zones.filter(z=>Math.hypot(u.x-z.x,u.y-z.y)<=guardianRanks.zone.radius&&lineOfSight(u,z,structures)).map(z=>z.armor)):0;
   if(u===h)u.armor=guardianStats.armor+guardianBalance.growth.armor*level+guardianBalance.fortitude.armor*p.fortitude+passive+aura;
   else {u.baseArmor??=u.armor;u.armor=u.baseArmor+aura;}
  }
 }
 locksMovement(tick:number){return stunned(this.hero,tick)||this.state.skills.cast?.skill==='charge';}
 dash(tick:number){
  const c=this.state.skills.cast;if(!c||c.skill!=='charge'||tick<c.atTick||this.hero.hp<=0)return;
  const step=Math.min(guardianBalance.chargeSpeed/30,c.remaining!),d=c.direction!,contact=chargeContact(this.hero,d.x*step,d.y*step,this.state);
  this.hero.x+=d.x*step*contact.fraction;this.hero.y+=d.y*step*contact.fraction;c.remaining!-=step*contact.fraction;
  if(contact.hit&&contact.hit.team!==this.hero.team&&(contact.hit.kind==='guardian'||contact.hit.kind.startsWith('minion'))&&lineOfSight(this.hero,contact.hit,combatStructures(this.state))){
   this.impact(this.hero,contact.hit,guardianRanks.charge.damage[c.rank-1],'physical',c.requestId);
   if(contact.hit.hp>0&&contact.hit.protectionTick<=tick)this.status(contact.hit,'slow',tick,guardianRanks.charge.duration[c.rank-1],guardianRanks.charge.slow[c.rank-1]);
  }
  if(contact.blocked||c.remaining!<=1e-6){this.state.skills.cast=undefined;this.emit({type:'cast-effect',skill:c.skill,requestId:c.requestId});}
 }
 resolve(tick:number){
  const c=this.state.skills.cast,h=this.hero;if(!c||c.skill==='charge'||tick<c.atTick||h.hp<=0)return;
  this.state.skills.cast=undefined;const index=c.rank-1;
  if(c.skill==='bash'){
   const target=this.state.units[c.targetId!];if(this.legalTarget(target)&&this.life(target)===c.targetLife){this.impact(h,target,guardianRanks.bash.damage[index],'physical',c.requestId);if(target.hp>0&&target.protectionTick<=tick)this.status(target,'stun',tick,guardianRanks.bash.duration[index],1);}
  }
  if(c.skill==='taunt')for(const u of Object.values(this.state.units).sort((a,b)=>a.id.localeCompare(b.id)))if(this.legalTarget(u,guardianRanks.taunt.radius)&&u.protectionTick<=tick)this.status(u,'taunt',tick,guardianRanks.taunt.duration[index],1);
  if(c.skill==='zone'){
   const z={id:`${this.life(h)}:${c.requestId}`,sourceId:h.id,sourceLife:this.life(h),x:h.x,y:h.y,expiresTick:tick+guardianRanks.zone.duration[index],armor:guardianRanks.zone.armor[index],shield:guardianRanks.zone.shield[index],granted:[] as string[]};this.state.skills.zones.push(z);
   for(const u of Object.values(this.state.units).sort((a,b)=>a.id.localeCompare(b.id)))if(u.hp>0&&u.team===h.team&&(u.kind==='guardian'||u.kind.startsWith('minion'))&&Math.hypot(u.x-z.x,u.y-z.y)<=guardianRanks.zone.radius&&lineOfSight(u,z,combatStructures(this.state))){
    const amount=Math.min(z.shield,u.maxHp*guardianBalance.shieldCap);z.granted.push(this.life(u));
    u.shield={remaining:Math.max(u.shield?.remaining??0,amount),expiresTick:Math.max(u.shield?.expiresTick??0,z.expiresTick),zoneId:z.id};this.emit({type:'shield',id:u.id,amount,zoneId:z.id});
   }
  }
  this.refreshStats();this.emit({type:'cast-effect',skill:c.skill,requestId:c.requestId});
 }
 private status(u:Unit,type:'stun'|'slow'|'taunt',tick:number,duration:number,magnitude:number){applyStatus(u,{type,sourceId:this.hero.id,sourceLife:this.life(this.hero),startTick:tick,expiresTick:tick+duration,magnitude});this.emit({type:'status',id:u.id,status:type,expiresTick:tick+duration});}
}

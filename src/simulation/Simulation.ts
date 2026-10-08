import {Clock,HZ} from './Clock';
import type {Command,GameEvent,GameState,Unit} from './GameState';
import {guardianStats,minionStats,previewSeconds,waves} from '../data/combat';
import {blocked} from './Collision';
import {updateMovement} from './Movement';
import {canAttack,damageAfterArmor} from './Combat';
export class Simulation {
 readonly clock=new Clock();
 readonly state:GameState={units:{},move:{x:0,y:0},attacking:false,gold:250,kills:0,spawnedWaves:0,previewReady:{}};
 private commands:Command[]=[]; private events:GameEvent[]=[];
 constructor(){this.state.units.guardian=this.unit('guardian','guardian',820,590);}
 private unit(id:string,kind:Unit['kind'],x:number,y:number):Unit{
  const stats=kind==='guardian'?guardianStats:minionStats;
  return {id,kind,team:kind==='guardian'?'blue':'red',x,y,...stats,hp:stats.maxHp,readyTick:0,protectionTick:0};
 }
 get hero(){return this.state.units.guardian;}
 send(c:Command){
  if(this.clock.paused||this.clock.timeScale===0){this.events.push({type:'rejected',reason:'Paused'});return false;}
  if(!c||!['move','attack','target','preview'].includes(c.type)||(c.type==='move'&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)))||(c.type==='target'&&(!this.state.units[c.id]||this.state.units[c.id].team==='blue'))||(c.type==='preview'&&!Object.hasOwn(previewSeconds,c.key))){this.events.push({type:'rejected',reason:'Invalid command'});return false;}
  if(c.type==='move')this.commands=this.commands.filter(v=>v.type!=='move');
  if(this.commands.length>=128)return false;
  this.commands.push({...c});return true;
 }
 clearInput(resetClock=true){this.commands=[];this.state.move={x:0,y:0};this.state.attacking=false;this.state.selectedTarget=undefined;for(const u of Object.values(this.state.units)){u.strike=undefined;u.targetId=undefined;}if(resetClock)this.clock.reset();}
 setPaused(v:boolean){this.clock.paused=v;this.clearInput();}
 setTimeScale(v:number){if(!Number.isFinite(v)||v<0||v>2)throw new Error('Invalid timeScale');this.clock.timeScale=v;this.clock.reset();if(v===0)this.clearInput();}
 advance(delta:number){this.clock.advance(delta,()=>this.step());}
 drainEvents(){const result=this.events;this.events=[];return result;}
 remaining(key:string){return Math.max(0,((key==='attack'?this.hero.readyTick:this.state.previewReady[key]||0)-this.clock.tick)/HZ);}
 teleportHero(x:number,y:number){if(!Number.isFinite(x)||!Number.isFinite(y)||blocked(x,y,this.hero.radius))return false;this.hero.x=x;this.hero.y=y;this.hero.strike=undefined;return true;}
 private step(){
  const tick=this.clock.tick,s=this.state,h=this.hero;
  for(const c of this.commands){
   if(h.hp<=0)continue;
   if(c.type==='move'){const n=Math.max(1,Math.hypot(c.x,c.y));s.move={x:c.x/n,y:c.y/n};}
   if(c.type==='attack')s.attacking=true;
   if(c.type==='target')s.selectedTarget=c.id;
   if(c.type==='preview'&&this.remaining(c.key)===0){s.previewReady[c.key]=tick+Math.ceil(previewSeconds[c.key]*HZ);this.events.push({type:'preview',key:c.key});}
  }
  this.commands=[];
  if(h.hp<=0&&h.respawnTick!==undefined&&tick>=h.respawnTick){h.x=450;h.y=600;h.hp=h.maxHp;h.respawnTick=undefined;h.protectionTick=tick+60;h.readyTick=tick;this.events.push({type:'respawn',id:h.id});}
  updateMovement(s);
  for(const u of Object.values(s.units)){
   if(u.hp<=0)continue;
   if(u.team==='blue'){
    const candidates=Object.values(s.units).filter(t=>canAttack(u,t)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id));
    u.targetId=s.attacking?(candidates.find(t=>t.id===s.selectedTarget)??candidates[0])?.id:undefined;
   }
   if(u.strike){const target=s.units[u.strike.targetId];if(!target||!canAttack(u,target))u.strike=undefined;else if(tick>=u.strike.atTick){u.strike=undefined;if(target.protectionTick<=tick)this.hit(u,target);}}
   const target=u.targetId?s.units[u.targetId]:undefined;
   if(!u.strike&&target&&canAttack(u,target)&&tick>=u.readyTick){u.readyTick=tick+u.cooldownTicks;u.strike={targetId:target.id,atTick:tick+u.windupTicks};u.protectionTick=0;this.events.push({type:'attack',id:u.id,targetId:target.id});}
  }
  waves.forEach((w,index)=>{if(tick>=w.tick&&s.spawnedWaves===index){w.positions.forEach(([x,y],i)=>{const id=`red-${index}-${i}`;s.units[id]=this.unit(id,'minion-red',x,y);this.events.push({type:'spawn',id});});s.spawnedWaves++;this.events.push({type:'wave',index:index+1});}});
 }
 private hit(source:Unit,target:Unit){
  if(target.hp<=0)return;
  const amount=Math.min(target.hp,damageAfterArmor(source.damage,target.armor));target.hp=Math.max(0,target.hp-amount);this.events.push({type:'damage',id:target.id,sourceId:source.id,amount});
  if(target.hp>0)return;
  target.strike=undefined;target.targetId=undefined;this.events.push({type:'death',id:target.id,sourceId:source.id});
  for(const u of Object.values(this.state.units)){if(u.targetId===target.id)u.targetId=undefined;if(u.strike?.targetId===target.id)u.strike=undefined;}
  if(target.kind==='guardian'){this.clearInput(false);target.respawnTick=this.clock.tick+150;}
  else {delete this.state.units[target.id];this.state.kills++;this.state.gold+=15;this.events.push({type:'reward',id:target.id,gold:15});}
 }
}

import {mercenary,mercenaryTexture,reviveCost} from '../data/mercenaries';
import {HZ} from '../simulation/Clock';
import type {GameState,Unit} from '../simulation/GameState';
import type {Simulation} from '../simulation/Simulation';
import type {HeroOrderType} from './heroCommand';

export type HeroBarHero={id:string;texture?:string}&(
 {status:'alive';hp:number;maxHp:number;order:HeroOrderType}
 |{status:'dead'}
 |{status:'reviving';seconds:number});

const recruitId=(merc:string)=>`recruit:${merc}`;
const livingPortrait=(u:Unit):HeroBarHero=>({id:u.id,status:'alive',hp:u.hp,maxHp:u.maxHp,order:u.ally!.order.type,texture:mercenaryTexture(u.ally!.merc)});

export function heroBarRoster(state:GameState):HeroBarHero[]{
 const slots=state.tavern?.slots??[];
 const heroes:HeroBarHero[]=[];
 for(const slot of slots){
  const u=slot.unitId?state.units[slot.unitId]:undefined;
  if(slot.status==='alive'){
   if(u?.ally&&u.hp>0)heroes.push(livingPortrait(u));
  }else{
   const portrait={id:recruitId(slot.merc),texture:mercenaryTexture(slot.merc)};
   heroes.push(slot.status==='dead'?{...portrait,status:'dead'}:{...portrait,status:'reviving',seconds:Math.ceil((slot.remaining??0)/HZ)});
  }
 }
 // Dev scenarios can spawn allies independently of a Tavern roster.
 const guests=Object.values(state.units).filter(u=>u.ally&&u.hp>0&&!slots.some(s=>s.unitId===u.id));
 guests.sort((a,b)=>a.ally!.slot-b.ally!.slot||a.id.localeCompare(b.id));
 return heroes.concat(guests.map(livingPortrait));
}

export function heroBarRevive(sim:Simulation,id:string|undefined){
 const slots=sim.state.tavern?.slots;
 const slot=slots?.findIndex(s=>recruitId(s.merc)===id&&s.status==='dead')??-1;
 if(slot<0||!slots)return undefined;
 const merc=mercenary(slots[slot].merc);
 if(!merc)return undefined;
 const command={action:'revive' as const,slot};
 return {command,gold:reviveCost(merc).gold,reason:sim.tavernReason(command)};
}

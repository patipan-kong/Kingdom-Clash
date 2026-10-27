import {artifact,artifactAvailability,artifactTrading,immutable} from '../data/artifacts';
import {RESOURCE_UNITS} from '../data/resources';
import {GRID} from '../world/layout';
import {combatStructures,type GameEvent,type GameState,type TradeCommand} from './GameState';
import {meadowGeometry,type Geometry} from './Collision';
import {quoteArtifact} from './ArtifactQuotes';
import {equipmentStats,validateInventory,type Inventory} from './Inventory';
import type {Economy} from './Economy';

export interface InventoryTransactionPlan {
 readonly inventoryBefore:string;readonly goldBeforeUnits:number;readonly goldAfterUnits:number;
 readonly inventoryAfter:Inventory;readonly instanceId:string;readonly goldDeltaUnits:number;
}
const snapshot=(inv:Inventory)=>({...inv,slots:[...inv.slots] as Inventory['slots'],instances:Object.fromEntries(Object.entries(inv.instances).map(([id,item])=>[id,{...item}]))});
// Generic pure buy/Fusion preparation. Never enables unsupported products or commits them.
export function prepareArtifactPurchase(inv:Inventory,itemId:string,balanceUnits:number,components:readonly string[]=[]):InventoryTransactionPlan {
 const quote=quoteArtifact(inv,itemId,balanceUnits,components);
 if(!quote.hasCapacity)throw new Error('Inventory full');if(!quote.affordable)throw new Error('Not enough Gold');
 const next=snapshot(inv);
 for(const id of quote.consumedInstanceIds){next.slots[next.slots.indexOf(id)]=null;delete next.instances[id];}
 next.slots[quote.outputSlot!]=quote.output.id;next.instances[quote.output.id]=quote.output;next.nextSequence=quote.nextSequence;
 validateInventory(next);equipmentStats(next);
 return immutable({inventoryBefore:JSON.stringify(inv),goldBeforeUnits:balanceUnits,goldAfterUnits:quote.goldAfterUnits!,inventoryAfter:next,instanceId:quote.output.id,goldDeltaUnits:-quote.goldDueUnits});
}
export function prepareArtifactSale(inv:Inventory,instanceId:string,balanceUnits:number):InventoryTransactionPlan {
 validateInventory(inv);if(!Object.hasOwn(inv.instances,instanceId))throw new Error('Item not owned');
 const item=inv.instances[instanceId];
 if(!artifactAvailability(artifact(item.itemId)).tradingEnabled)throw new Error('Artifact unavailable');
 const refundUnits=item.paidGoldUnits/artifactTrading.refundDenominator*artifactTrading.refundNumerator;
 if(item.paidGoldUnits<=0||item.paidGoldUnits%artifactTrading.refundDenominator!==0||!Number.isSafeInteger(refundUnits)||refundUnits<=0||!Number.isSafeInteger(balanceUnits)||balanceUnits<0||!Number.isSafeInteger(balanceUnits+refundUnits))throw new Error('Invalid paid basis or refund');
 const next=snapshot(inv);next.slots[next.slots.indexOf(instanceId)]=null;delete next.instances[instanceId];equipmentStats(next);
 return immutable({inventoryBefore:JSON.stringify(inv),goldBeforeUnits:balanceUnits,goldAfterUnits:balanceUnits+refundUnits,inventoryAfter:next,instanceId,goldDeltaUnits:refundUnits});
}
export function artifactAccessReasonOn(geo:Geometry,state:GameState):string|undefined {
 const hero=state.units.guardian,base=state.bases['blue-base'];
 if(state.match.phase!=='playing'||state.match.result||!base||base.hp<=0||state.bases['red-base']?.hp<=0)return 'Match not active';
 if(hero.hp<=0)return;
 if(base.team!==hero.team)return 'Allied Keep unavailable';
 const halfW=(base.columns??3)*GRID/2,halfH=(base.rows??3)*GRID/2;
 const closest={x:Math.max(base.x-halfW,Math.min(base.x+halfW,hero.x)),y:Math.max(base.y-halfH,Math.min(base.y+halfH,hero.y))};
 if(!Number.isFinite(hero.x)||!Number.isFinite(hero.y)||Math.hypot(hero.x-closest.x,hero.y-closest.y)>artifactTrading.livingRange+1e-8)return 'Return to Azure Keep';
 if(!geo.lineOfSight(hero,closest,Object.fromEntries(Object.entries(combatStructures(state)).filter(([id])=>id!==base.id))))return 'Shop path blocked';
}
export const artifactAccessReason=(state:GameState)=>artifactAccessReasonOn(meadowGeometry,state); // MEADOW-COMPAT
export const validTradeCommand=(c:TradeCommand)=>!!c&&['buy-item','sell-item','fuse-item'].includes(c.type)&&typeof c.matchId==='string'&&!!c.matchId&&c.matchId.length<=200&&typeof c.heroId==='string'&&!!c.heroId&&c.heroId.length<=100&&typeof c.requestId==='string'&&!!c.requestId&&c.requestId.length<=100&&(c.type==='sell-item'?typeof c.instanceId==='string'&&!!c.instanceId&&c.instanceId.length<=500:typeof c.itemId==='string'&&!!c.itemId&&c.itemId.length<=100)&&(c.type!=='fuse-item'||Array.isArray(c.componentIds)&&c.componentIds.length<=6&&c.componentIds.every(id=>typeof id==='string'&&!!id&&id.length<=500));
export class ArtifactTransactions {
 private requests=new Set<string>();
 constructor(private geo:Geometry,private state:GameState,private economy:Economy,private matchId:string,private refresh:()=>void,private emit:(event:GameEvent)=>void){}
 execute(command:TradeCommand){
  const reject=(reason:string)=>{this.emit({type:'rejected',reason,requestId:command?.requestId});return false;};
  if(!validTradeCommand(command))return reject('Invalid trade command');
  if(command.matchId!==this.matchId||this.state.inventory.matchId!==this.matchId)return reject('Stale match');
  if(command.heroId!==this.state.units.guardian.id||command.heroId!==this.state.inventory.ownerHeroId)return reject('Wrong item owner');
  // Shared buy/sale namespace, including rejected attempts; never replay a stale intent.
  if(this.requests.has(command.requestId))return reject('Duplicate trade request');this.requests.add(command.requestId);
  const access=artifactAccessReasonOn(this.geo,this.state);if(access)return reject(access);
  let plan:InventoryTransactionPlan;
  try{
   if(command.type!=='sell-item'){
    const item=artifact(command.itemId);
    if(!artifactAvailability(item).tradingEnabled)return reject('Artifact unavailable');
    if(command.type==='fuse-item'&&(item.id!=='flame-blade'||!item.recipe))return reject('Recipe unavailable');
   }
   plan=command.type==='sell-item'?prepareArtifactSale(this.state.inventory,command.instanceId,this.economy.goldUnits):prepareArtifactPurchase(this.state.inventory,command.itemId,this.economy.goldUnits,command.type==='fuse-item'?command.componentIds:[]);
  }catch(error){return reject(error instanceof Error?error.message:'Invalid artifact transaction');}
  const key=JSON.stringify([this.matchId,command.heroId,command.requestId]);
  if(!this.economy.commitArtifactTransaction(key,plan))return reject('Stale or invalid transaction');
  this.refresh();this.emit({type:'item-traded',action:command.type==='buy-item'?'buy':command.type==='fuse-item'?'fusion':'sell',requestId:command.requestId,instanceId:plan.instanceId,goldDelta:plan.goldDeltaUnits/RESOURCE_UNITS});return true;
 }
}

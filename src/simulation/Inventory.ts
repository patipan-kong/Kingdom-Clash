import {artifact,artifacts,immutable,type ArtifactDefinition} from '../data/artifacts';
import {RESOURCE_UNITS} from '../data/resources';
export const INVENTORY_CAPACITY=6;
export type InventorySlots=[string|null,string|null,string|null,string|null,string|null,string|null];
export interface ItemInstance {
 readonly id:string;readonly itemId:string;readonly ownerHeroId:string;readonly matchId:string;
 readonly sequence:number;readonly paidGoldUnits:number;
}
export interface Inventory {
 matchId:string;ownerHeroId:string;nextSequence:number;slots:InventorySlots;instances:Record<string,ItemInstance>;
}
export function initialInventory(matchId:string,ownerHeroId='guardian'):Inventory {
 if(typeof matchId!=='string'||!matchId||typeof ownerHeroId!=='string'||!ownerHeroId)throw new Error('Inventory requires match and hero identities');
 return {matchId,ownerHeroId,nextSequence:1,slots:[null,null,null,null,null,null],instances:{}};
}
export function itemInstanceId(matchId:string,ownerHeroId:string,sequence:number){
 if(typeof matchId!=='string'||!matchId||typeof ownerHeroId!=='string'||!ownerHeroId||!Number.isSafeInteger(sequence)||sequence<1)throw new Error('Invalid instance identity');
 return `${encodeURIComponent(matchId)}:${encodeURIComponent(ownerHeroId)}:item:${sequence}`;
}
export function validateInventory(inv:Inventory,catalog:readonly ArtifactDefinition[]=artifacts){
 itemInstanceId(inv.matchId,inv.ownerHeroId,inv.nextSequence);
 if(inv.slots.length!==INVENTORY_CAPACITY)throw new Error('Inventory must have six slots');
 const seen=new Set<string>();
 for(const id of inv.slots){
  if(id===null)continue;
  if(typeof id!=='string'||seen.has(id)||!Object.hasOwn(inv.instances,id))throw new Error('Invalid inventory slot');seen.add(id);
  const item=inv.instances[id];artifact(item.itemId,catalog);
  if(item.id!==id||item.ownerHeroId!==inv.ownerHeroId||item.matchId!==inv.matchId||item.sequence>=inv.nextSequence||itemInstanceId(item.matchId,item.ownerHeroId,item.sequence)!==id||!Number.isSafeInteger(item.paidGoldUnits)||item.paidGoldUnits<0)throw new Error('Invalid item ownership or paid basis');
 }
 if(Object.keys(inv.instances).length!==seen.size)throw new Error('Unequipped or orphan item instance');
}
// Only supported flat modifiers are aggregated. Other effects never enter combat here.
export function equipmentStats(inv:Inventory,catalog:readonly ArtifactDefinition[]=artifacts){
 validateInventory(inv,catalog);const stats={hp:0,attack:0,armor:0};
 for(const id of inv.slots)if(id!==null)for(const m of artifact(inv.instances[id].itemId,catalog).modifiers){
  if(m.kind==='hp'||m.kind==='attack'||m.kind==='armor')stats[m.kind]+=m.amount;
 }
 if(Object.values(stats).some(n=>!Number.isSafeInteger(n)))throw new Error('Equipment stat overflow');
 return immutable(stats);
}
// A proposed output, not an acquisition command. Reading it does not advance the sequence.
export function plannedItem(inv:Inventory,itemId:string,paidGoldUnits:number,catalog:readonly ArtifactDefinition[]=artifacts):ItemInstance {
 validateInventory(inv,catalog);artifact(itemId,catalog);
 if(!Number.isSafeInteger(inv.nextSequence+1)||!Number.isSafeInteger(paidGoldUnits)||paidGoldUnits<0)throw new Error('Invalid planned item');
 return immutable({id:itemInstanceId(inv.matchId,inv.ownerHeroId,inv.nextSequence),itemId,ownerHeroId:inv.ownerHeroId,matchId:inv.matchId,sequence:inv.nextSequence,paidGoldUnits});
}
export const goldUnits=(gold:number)=>{
 const units=gold*RESOURCE_UNITS;if(!Number.isSafeInteger(units)||units<0)throw new Error('Invalid Gold amount');return units;
};

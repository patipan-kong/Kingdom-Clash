import {artifact,artifacts,artifactAvailability,artifactTrading,immutable,validateArtifactCatalog,type ArtifactDefinition} from '../data/artifacts';
import {INVENTORY_CAPACITY,goldUnits,plannedItem,validateInventory,type Inventory,type ItemInstance} from './Inventory';
import {RESOURCE_UNITS} from './Economy';
export interface ArtifactQuote {
 readonly itemId:string;readonly kind:'purchase'|'fusion';
 readonly consumedInstanceIds:readonly string[];
 readonly missingComponents:readonly {readonly itemId:string;readonly count:number;readonly goldUnits:number}[];
 readonly feeGoldUnits:number;readonly goldDueUnits:number;readonly goldDue:number;
 readonly goldBeforeUnits:number;readonly goldAfterUnits:number|null;
 readonly occupiedBefore:number;readonly occupiedAfter:number;readonly hasCapacity:boolean;readonly affordable:boolean;
 readonly outputSlot:number|null;readonly output:ItemInstance;
 readonly nextSequence:number;readonly effectsReady:boolean;readonly unsupportedEffects:readonly string[];
 readonly tradingEnabled:boolean;
}
// Explicit instance selection prevents guessing which duplicate to consume. Missing ingredients
// are priced virtually, never inserted into temporary slots. No mutation, payment or execution API.
export function quoteArtifact(inv:Inventory,itemId:string,balanceGoldUnits:number,consume:readonly string[]=[],catalog:readonly ArtifactDefinition[]=artifacts):ArtifactQuote {
 validateArtifactCatalog(catalog);validateInventory(inv,catalog);
 if(!Number.isSafeInteger(balanceGoldUnits)||balanceGoldUnits<0)throw new Error('Invalid Gold ledger snapshot');
 const item=artifact(itemId,catalog),selected=new Set<string>(),counts=new Map<string,number>();let paidBasis=0;
 for(const id of consume){
  if(selected.has(id)||!Object.hasOwn(inv.instances,id))throw new Error('Invalid consumed instance');selected.add(id);
  const component=inv.instances[id],required=item.recipe?.components.find(c=>c.itemId===component.itemId);
  if(component.paidGoldUnits<=0||component.paidGoldUnits%artifactTrading.refundDenominator!==0)throw new Error('Invalid component paid basis');
  const count=(counts.get(component.itemId)??0)+1;
  if(!required||count>required.count)throw new Error('Instance is not a required component');
  counts.set(component.itemId,count);paidBasis+=component.paidGoldUnits;
 }
 const missingComponents=item.recipe?.components.flatMap(c=>{
  const count=c.count-(counts.get(c.itemId)??0);return count?[{itemId:c.itemId,count,goldUnits:goldUnits(artifact(c.itemId,catalog).priceGold)*count}]:[];
 })??[];
 const feeGoldUnits=goldUnits(item.recipe?.feeGold??0);
 const goldDueUnits=item.recipe?feeGoldUnits+missingComponents.reduce((n,c)=>n+c.goldUnits,0):goldUnits(item.priceGold);
 const totalPaid=paidBasis+goldDueUnits;
 if(!Number.isSafeInteger(goldDueUnits)||!Number.isSafeInteger(totalPaid))throw new Error('Quote overflow');
 const occupiedBefore=inv.slots.filter(id=>id!==null).length,occupiedAfter=occupiedBefore-selected.size+1;
 const hasCapacity=occupiedAfter<=INVENTORY_CAPACITY,affordable=balanceGoldUnits>=goldDueUnits;
 const outputSlot=hasCapacity?inv.slots.findIndex(id=>id===null||selected.has(id)):null;
 return immutable({itemId,kind:item.recipe?'fusion':'purchase',consumedInstanceIds:[...consume],missingComponents,feeGoldUnits,goldDueUnits,goldDue:goldDueUnits/RESOURCE_UNITS,goldBeforeUnits:balanceGoldUnits,goldAfterUnits:affordable?balanceGoldUnits-goldDueUnits:null,occupiedBefore,occupiedAfter,hasCapacity,affordable,outputSlot,output:plannedItem(inv,itemId,totalPaid,catalog),nextSequence:inv.nextSequence+1,...artifactAvailability(item)});
}

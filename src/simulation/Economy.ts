import {crimsonMinionGold} from '../data/gameplayV03';
import {buildings,type BuildingKind} from '../data/buildings';
import type {GameState} from './GameState';
import {RESOURCE_UNITS} from '../data/resources';
import {validateInventory,equipmentStats} from './Inventory';
import type {InventoryTransactionPlan} from './ArtifactTransactions';
import {constructionCost} from './ConstructionCosts';
import {immutable} from '../data/artifacts';
export {RESOURCE_UNITS} from '../data/resources';
// Only validated simulation-owned commands may transact. One unit = 1/120 resource.
export type ResourceCommand={type:'income';tick:number}|{type:'construction';id:string;kind:BuildingKind}|{type:'minion-reward';id:string};
export class Economy {
 private balances={gold:250*RESOURCE_UNITS,wood:180*RESOURCE_UNITS,iron:30*RESOURCE_UNITS};
 private applied=new Set<string>();
 private lastIncomeTick=0;
 constructor(private state:GameState){}
 // Primitive read-only snapshot for pure planners.
 get goldUnits(){return this.balances.gold;}
 get woodUnits(){return this.balances.wood;}
 get ironUnits(){return this.balances.iron;}
 constructionQuote(kind:BuildingKind){const cost=constructionCost(this.state.inventory,kind);return immutable({...cost,available:this.balances.wood>=cost.wood*RESOURCE_UNITS&&this.balances.iron>=cost.iron*RESOURCE_UNITS});}
 // Trusted simulation planner only: validate before publishing money + ownership.
 commitArtifactTransaction(id:string,plan:InventoryTransactionPlan){
  const key=`artifact:${id}`;
  if(this.state.match.phase!=='playing'||this.state.match.result||!id||this.applied.has(key)||plan.goldBeforeUnits!==this.balances.gold||plan.inventoryBefore!==JSON.stringify(this.state.inventory)||!Number.isSafeInteger(plan.goldAfterUnits)||plan.goldAfterUnits<0||!Number.isSafeInteger(plan.goldDeltaUnits)||plan.goldAfterUnits-plan.goldBeforeUnits!==plan.goldDeltaUnits)return false;
  try{validateInventory(plan.inventoryAfter);equipmentStats(plan.inventoryAfter);}catch{return false;}
  if(plan.inventoryAfter.ownerHeroId!==this.state.inventory.ownerHeroId||plan.inventoryAfter.matchId!==this.state.inventory.matchId)return false;
  const inventory={...plan.inventoryAfter,slots:[...plan.inventoryAfter.slots] as GameState['inventory']['slots'],instances:{...plan.inventoryAfter.instances}};
  this.balances={...this.balances,gold:plan.goldAfterUnits};this.state.inventory=inventory;this.state.gold=plan.goldAfterUnits/RESOURCE_UNITS;this.applied.add(key);return true;
 }
 apply(command:ResourceCommand){
  let gold=0,wood=0,iron=0,key='';
  if(command.type==='income'){
   if(command.tick!==this.lastIncomeTick+1)return false;
   wood=8;iron=1;
  }else{
   if(!command.id)return false;
   key=`${command.type}:${command.id}`;if(this.applied.has(key))return false;
   if(command.type==='construction'){
    if(!Object.hasOwn(buildings,command.kind))return false;
    const cost=constructionCost(this.state.inventory,command.kind);
    wood=-cost.wood*RESOURCE_UNITS;iron=-cost.iron*RESOURCE_UNITS;
   }else if(command.type==='minion-reward')gold=crimsonMinionGold(command.id)*RESOURCE_UNITS;
   else return false;
  }
  const next={gold:this.balances.gold+gold,wood:this.balances.wood+wood,iron:this.balances.iron+iron};
  if(Object.values(next).some(v=>v<0||!Number.isSafeInteger(v)))return false;
  this.balances=next;
  if(command.type==='income')this.lastIncomeTick=command.tick;else this.applied.add(key);
  Object.assign(this.state,{gold:next.gold/RESOURCE_UNITS,wood:next.wood/RESOURCE_UNITS,iron:next.iron/RESOURCE_UNITS});return true;
 }
}

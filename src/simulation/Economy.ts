import {buildings,type BuildingKind} from '../data/buildings';
import type {GameState} from './GameState';
import {RESOURCE_UNITS} from '../data/resources';
export {RESOURCE_UNITS} from '../data/resources';
// Only validated simulation-owned commands may transact. One unit = 1/120 resource.
export type ResourceCommand={type:'income';tick:number}|{type:'construction';id:string;kind:BuildingKind}|{type:'minion-reward';id:string};
export class Economy {
 private balances={gold:250*RESOURCE_UNITS,wood:180*RESOURCE_UNITS,iron:30*RESOURCE_UNITS};
 private applied=new Set<string>();
 private lastIncomeTick=0;
 constructor(private state:GameState){}
 // Primitive read-only snapshot for pure planners; no item spending API in Phase 3A.
 get goldUnits(){return this.balances.gold;}
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
    wood=-buildings[command.kind].wood*RESOURCE_UNITS;iron=-buildings[command.kind].iron*RESOURCE_UNITS;
   }else if(command.type==='minion-reward')gold=15*RESOURCE_UNITS;
   else return false;
  }
  const next={gold:this.balances.gold+gold,wood:this.balances.wood+wood,iron:this.balances.iron+iron};
  if(Object.values(next).some(v=>v<0||!Number.isSafeInteger(v)))return false;
  this.balances=next;
  if(command.type==='income')this.lastIncomeTick=command.tick;else this.applied.add(key);
  Object.assign(this.state,{gold:next.gold/RESOURCE_UNITS,wood:next.wood/RESOURCE_UNITS,iron:next.iron/RESOURCE_UNITS});return true;
 }
}

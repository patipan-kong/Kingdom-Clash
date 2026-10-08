import {buildings,type BuildingKind} from '../data/buildings';
import type {GameState} from './GameState';
// Only validated simulation-owned commands may transact. One unit = 1/120 resource.
export type ResourceCommand={type:'income';tick:number}|{type:'construction';id:string;kind:BuildingKind}|{type:'minion-reward';id:string};
export class Economy {
 private balances={gold:250*120,wood:180*120,iron:30*120};
 private applied=new Set<string>();
 private lastIncomeTick=0;
 constructor(private state:GameState){}
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
    wood=-buildings[command.kind].wood*120;iron=-buildings[command.kind].iron*120;
   }else if(command.type==='minion-reward')gold=15*120;
   else return false;
  }
  const next={gold:this.balances.gold+gold,wood:this.balances.wood+wood,iron:this.balances.iron+iron};
  if(Object.values(next).some(v=>v<0||!Number.isSafeInteger(v)))return false;
  this.balances=next;
  if(command.type==='income')this.lastIncomeTick=command.tick;else this.applied.add(key);
  Object.assign(this.state,{gold:next.gold/120,wood:next.wood/120,iron:next.iron/120});return true;
 }
}

import type {GameState,Unit} from './GameState';
import {combatStructures} from './GameState';
import type {Geometry} from './Collision';
// Chapter 3 Azure Barracks V1. A Barracks is a player-built blue wall-kind structure flagged azureBarracks. Each owns two soldier slots; an empty slot is refilled for free after a delay.
// Soldiers are spawned directly beside their Barracks (never through the spawn queue), so a blocked site cannot stall any other spawn. A destroyed Barracks drops its slots for good.
export const BARRACKS_MAX=3,SLOTS=2,TRAIN_TICKS=90,TRAIN_STAGGER=30,REPLACE_TICKS=450; // 3 s to the first soldier, 1 s more to the second; 15 s after a death
export const FOOTMAN={maxHp:320,hp:320,armor:10,damage:20,speed:120} as const; // provisional, tuned in M3 balance
interface Slot{id?:string;readyTick:number;serial:number}
const RING=[[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[0,2],[2,0],[-2,0],[0,-2],[2,1],[-2,1],[1,2],[-1,2]] as const;
export class AzureBarracks{
 private slots=new Map<string,Slot[]>();
 constructor(private state:GameState,private geo:Geometry,private blueCap:()=>number,private spawn:(id:string,x:number,y:number)=>void){}
 /** Living soldiers a Barracks owns; used by tests and the debug scenario. */
 owned(id:string){return (this.slots.get(id)??[]).filter(s=>s.id&&this.state.units[s.id]?.hp>0).length;}
 get barracks(){return Object.values(this.state.structures).filter(b=>b.azureBarracks&&b.hp>0);}
 update(tick:number){
  for(const id of [...this.slots.keys()]){const b=this.state.structures[id];if(!(b?.hp>0))this.slots.delete(id);}
  for(const b of this.barracks){
   if(tick<b.completeTick)continue;
   let slots=this.slots.get(b.id);
   if(!slots){slots=Array.from({length:SLOTS},(_,i)=>({readyTick:b.completeTick+TRAIN_TICKS+i*TRAIN_STAGGER,serial:0}));this.slots.set(b.id,slots);}
   for(const [i,s] of slots.entries()){
    if(s.id&&!(this.state.units[s.id]?.hp>0)){s.id=undefined;s.readyTick=tick+REPLACE_TICKS;}
    if(s.id||tick<s.readyTick)continue;
    if(Object.values(this.state.units).filter(u=>u.kind==='minion-blue'&&u.hp>0).length>=this.blueCap())continue;
    const at=this.freeCell(b);if(!at)continue;
    s.serial++;s.id=`blue-s-${b.id}-${i}-${s.serial}`;this.spawn(s.id,at.x,at.y);
   }
  }
 }
 // The nearest open cell around the Barracks, in a fixed order so the result is deterministic.
 private freeCell(b:Unit){
  const structures=combatStructures(this.state),units=Object.values(this.state.units).filter(u=>u.hp>0);
  for(const [dx,dy] of RING){const x=b.x+dx*48,y=b.y+dy*48;if(!this.geo.blocked(x,y,12,structures)&&units.every(u=>Math.hypot(u.x-x,u.y-y)>=24))return {x,y};}
  return undefined;
 }
}

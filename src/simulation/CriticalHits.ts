import {artifact,artifacts,type ArtifactDefinition} from '../data/artifacts';
import {validateInventory,type Inventory} from './Inventory';
export const defaultCritSeed=0x4b434c48;
export interface CriticalRandom {seed:number;state:number;rolls:number}
export function initialCriticalRandom(seed=defaultCritSeed):CriticalRandom {
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Invalid critical seed');
 return {seed,state:seed,rolls:0};
}
// Fixed uint32 LCG, one draw per eligible resolved strike. Zero is a valid seed.
export function criticalRoll(random:CriticalRandom){
 random.state=(Math.imul(random.state,1664525)+1013904223)>>>0;random.rolls++;return random.state/0x100000000;
}
export function equipmentCritBasisPoints(inv:Inventory,catalog:readonly ArtifactDefinition[]=artifacts){
 validateInventory(inv,catalog);let points=0;
 for(const id of inv.slots)if(id!==null&&['ruby-gem','flame-blade'].includes(inv.instances[id].itemId))for(const m of artifact(inv.instances[id].itemId,catalog).modifiers)if(m.kind==='crit')points+=Math.round(m.fraction*10000);
 return Math.min(10000,points);
}

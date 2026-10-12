import {artifact,artifacts,immutable,type ArtifactDefinition} from '../data/artifacts';
import {validateInventory,type Inventory} from './Inventory';
export const arcaneRules=immutable({cdrCapBps:4000});
// Read-only derived equipment data; Magic Power has no Guardian effect consumer.
export function equipmentArcaneStats(inv:Inventory,catalog:readonly ArtifactDefinition[]=artifacts){
 validateInventory(inv,catalog);let magicPower=0,cdrBps=0;
 for(const id of inv.slots)if(id!==null)for(const m of artifact(inv.instances[id].itemId,catalog).modifiers){
  if(m.kind==='magic-power')magicPower+=m.amount;
  if(m.kind==='cdr')cdrBps+=Math.round(m.fraction*10000);
 }
 if(!Number.isSafeInteger(magicPower)||!Number.isSafeInteger(cdrBps)||magicPower<0||cdrBps<0)throw new Error('Invalid arcane equipment totals');
 return immutable({magicPower,cdrBps,effectiveCdrBps:Math.min(arcaneRules.cdrCapBps,cdrBps)});
}
export function reducedCooldownTicks(baseRankTicks:number,effectiveCdrBps:number){
 if(!Number.isSafeInteger(baseRankTicks)||baseRankTicks<1||!Number.isSafeInteger(effectiveCdrBps)||effectiveCdrBps<0||effectiveCdrBps>arcaneRules.cdrCapBps||!Number.isSafeInteger(baseRankTicks*10000))throw new Error('Invalid cooldown inputs');
 return Math.max(1,Math.ceil(baseRankTicks*(10000-effectiveCdrBps)/10000));
}

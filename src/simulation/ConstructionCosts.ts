import {artifact,immutable} from '../data/artifacts';
import {buildings,type BuildingKind} from '../data/buildings';
import {validateInventory,type Inventory} from './Inventory';
export interface ConstructionResources {wood:number;iron:number}
// Multiplicative basis-point factors compose before a single upward rounding.
// No Engineer factor is supplied by live code in C1.
export function roundConstructionResources(base:ConstructionResources,factors:readonly number[]=[]):Readonly<ConstructionResources>{
 let numerator=1,denominator=1;
 for(const factor of factors){if(!Number.isSafeInteger(factor)||factor<=0||factor>10000)throw new Error('Invalid construction factor');numerator*=factor;denominator*=10000;}
 if(!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator))throw new Error('Construction factor overflow');
 const cost=(value:number)=>{if(!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(value*numerator))throw new Error('Invalid construction cost');return value===0?0:Math.ceil(value*numerator/denominator);};
 return immutable({wood:cost(base.wood),iron:cost(base.iron)});
}
export function constructionCost(inv:Inventory,kind:BuildingKind){
 if(!Object.hasOwn(buildings,kind))throw new Error('Invalid building kind');validateInventory(inv);
 const crown=inv.slots.some(id=>id!==null&&inv.instances[id].itemId==='builders-crown');
 const modifier=artifact('builders-crown').modifiers.find(m=>m.kind==='construction-discount');
 if(!modifier||modifier.kind!=='construction-discount')throw new Error('Missing Crown modifier');
 return roundConstructionResources(buildings[kind],crown?[Math.round((1-modifier.fraction)*10000)]:[]);
}

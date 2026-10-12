import {RESOURCE_UNITS} from './resources';
// Original catalog: docs/03_ECONOMY_ARTIFACTS.md. Unsupported effects are metadata only.
export type ArtifactModifier=
 | {kind:'attack'|'hp'|'armor'|'magic-power';amount:number}
 | {kind:'crit'|'cdr'|'construction-discount'|'troop-attack-aura'|'building-damage';fraction:number}
 | {kind:'burn';damagePerSecond:number;durationSeconds:number;refresh:true};
export interface ArtifactDefinition {
 readonly id:string; readonly name:string; readonly priceGold:number;
 readonly modifiers:readonly ArtifactModifier[];
 readonly recipe?:{readonly components:readonly {readonly itemId:string;readonly count:number}[];readonly feeGold:number};
 readonly uniquePassive?:string;
}
export function immutable<T>(value:T):T {
 if(value&&typeof value==='object'){for(const child of Object.values(value))immutable(child);Object.freeze(value);}return value;
}
export const artifacts:readonly ArtifactDefinition[]=immutable([
 {id:'iron-sword',name:'Iron Sword',priceGold:200,modifiers:[{kind:'attack',amount:15}]},
 {id:'ruby-gem',name:'Ruby Gem',priceGold:150,modifiers:[{kind:'crit',fraction:.1}]},
 {id:'flame-blade',name:'Flame Blade',priceGold:650,modifiers:[{kind:'attack',amount:35},{kind:'crit',fraction:.1},{kind:'burn',damagePerSecond:5,durationSeconds:3,refresh:true}],recipe:{components:[{itemId:'iron-sword',count:1},{itemId:'ruby-gem',count:1}],feeGold:300}},
 {id:'guardian-shield',name:'Guardian Shield',priceGold:500,modifiers:[{kind:'hp',amount:250},{kind:'armor',amount:15}]},
 {id:'arcane-core',name:'Arcane Core',priceGold:550,modifiers:[{kind:'magic-power',amount:30},{kind:'cdr',fraction:.1}]},
 {id:'builders-crown',name:"Builder's Crown",priceGold:450,modifiers:[{kind:'construction-discount',fraction:.08}],uniquePassive:'builders-crown'},
 {id:'commander-banner',name:'Commander Banner',priceGold:600,modifiers:[{kind:'troop-attack-aura',fraction:.15}]},
 {id:'siege-hammer',name:'Siege Hammer',priceGold:550,modifiers:[{kind:'attack',amount:20},{kind:'building-damage',fraction:.25}]},
]);
export const unsupportedEffects=(item:ArtifactDefinition)=>item.modifiers.filter(m=>!['attack','hp','armor','crit','burn','construction-discount','building-damage'].includes(m.kind)).map(m=>m.kind);
// Provisional access range, independent of item prices and combat balance.
export const artifactTrading=immutable({livingRange:240,itemIds:['iron-sword','guardian-shield','ruby-gem','flame-blade','builders-crown','siege-hammer'] as readonly string[],refundNumerator:3,refundDenominator:5});
export const artifactAvailability=(item:ArtifactDefinition)=>immutable({effectsReady:unsupportedEffects(item).length===0,unsupportedEffects:unsupportedEffects(item),tradingEnabled:artifactTrading.itemIds.includes(item.id)&&unsupportedEffects(item).length===0});
export function artifact(id:string,catalog=artifacts):ArtifactDefinition {
 const item=catalog.find(item=>item.id===id);if(!item)throw new Error(`Unknown artifact: ${id}`);return item;
}
export function validateArtifactCatalog(catalog:readonly ArtifactDefinition[]=artifacts){
 const ids=new Set<string>(),money=(n:number)=>Number.isSafeInteger(n)&&n>0&&Number.isSafeInteger(n*RESOURCE_UNITS);
 for(const item of catalog){
  if(typeof item.id!=='string'||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(item.id)||ids.has(item.id))throw new Error('Invalid or duplicate artifact ID');ids.add(item.id);
  if(typeof item.name!=='string'||!item.name.trim()||!money(item.priceGold)||!Array.isArray(item.modifiers)||!item.modifiers.length)throw new Error('Invalid artifact definition');
  const kinds=new Set<string>();
  for(const m of item.modifiers){
   if(kinds.has(m.kind))throw new Error('Duplicate modifier');kinds.add(m.kind);
   if(['attack','hp','armor','magic-power'].includes(m.kind)){
    if(!('amount' in m)||!Number.isSafeInteger(m.amount)||m.amount<=0)throw new Error('Invalid flat modifier');
   }else if(['crit','cdr','construction-discount','troop-attack-aura','building-damage'].includes(m.kind)){
    if(!('fraction' in m)||!Number.isFinite(m.fraction)||m.fraction<=0||m.fraction>1)throw new Error('Invalid fractional modifier');
   }else if(m.kind==='burn'){
    if(!Number.isFinite(m.damagePerSecond)||m.damagePerSecond<=0||!Number.isFinite(m.durationSeconds)||m.durationSeconds<=0||m.refresh!==true)throw new Error('Invalid Burn modifier');
   }else throw new Error('Unknown modifier');
  }
  if(item.uniquePassive!==undefined&&(typeof item.uniquePassive!=='string'||!item.uniquePassive.trim()))throw new Error('Invalid unique passive');
 }
 const visiting=new Set<string>(),done=new Set<string>();
 const visit=(id:string)=>{
  if(visiting.has(id))throw new Error('Cyclic artifact recipe');if(done.has(id))return;
  visiting.add(id);const item=artifact(id,catalog),recipe=item.recipe;
  if(recipe){
   if(!money(recipe.feeGold)||!Array.isArray(recipe.components)||!recipe.components.length)throw new Error('Invalid recipe');
   let price=recipe.feeGold;const refs=new Set<string>();
   for(const c of recipe.components){
    if(refs.has(c.itemId)||!Number.isSafeInteger(c.count)||c.count<=0)throw new Error('Invalid recipe component');refs.add(c.itemId);
    const component=artifact(c.itemId,catalog);visit(c.itemId);price+=component.priceGold*c.count;
   }
   if(!money(price)||price!==item.priceGold)throw new Error('Recipe total differs from catalog price');
  }
  visiting.delete(id);done.add(id);
 };
 for(const id of ids)visit(id);
}

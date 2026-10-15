import {artifact} from '../data/artifacts';
// Explicit live item-ID -> generated painted texture; icon remains a missing-file fallback.
export const shopItems=[
 {id:'iron-sword',short:'Sword',icon:'sword',texture:'item-iron-sword',file:'item-iron-sword.png'},
 {id:'guardian-shield',short:'Shield',icon:'shield',texture:'item-guardian-shield',file:'item-guardian-shield.png'},
 {id:'ruby-gem',short:'Ruby',icon:'ruby',texture:'item-ruby-gem',file:'item-ruby-gem.png'},
 {id:'flame-blade',short:'Flame',icon:'flame',texture:'item-flame-blade',file:'item-flame-blade.png'},
 {id:'builders-crown',short:'Crown',icon:'crown',texture:'item-builders-crown',file:'item-builders-crown.png'},
 {id:'siege-hammer',short:'Hammer',icon:'hammer',texture:'item-siege-hammer',file:'item-siege-hammer.png'},
 {id:'commander-banner',short:'Banner',icon:'banner',texture:'item-commander-banner',file:'item-commander-banner.png'},
] as const;
export type ShopItemId=typeof shopItems[number]['id'];
export function shopItemEffects(id:string){
 const effects=artifact(id).modifiers.map(m=>{
  switch(m.kind){
   case 'attack':return `ATK +${m.amount}`;
   case 'hp':return `HP +${m.amount}`;
   case 'armor':return `Armor +${m.amount}`;
   case 'crit':return `Crit chance +${Math.round(m.fraction*100)}%`;
   case 'construction-discount':return `Construction cost −${Math.round(m.fraction*100)}%`;
   case 'building-damage':return `Building damage +${Math.round(m.fraction*100)}%`;
   case 'troop-attack-aura':return `Allied troops ATK +${Math.round(m.fraction*100)}%`;
   case 'burn':return `Burn ${m.damagePerSecond}/s for ${m.durationSeconds}s · refreshes`;
   default:return '';
  }
 }).filter(Boolean);
 if(id==='builders-crown')effects.push('Does not stack');
 if(id==='commander-banner')effects.push('Range 240 · living Guardian','Does not stack');
 return effects;
}

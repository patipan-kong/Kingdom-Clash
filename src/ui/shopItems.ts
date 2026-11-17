import {artifact} from '../data/artifacts';
import {t} from '../i18n';
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
   case 'attack':return t('itemAtk',{amount:m.amount});
   case 'hp':return t('itemHp',{amount:m.amount});
   case 'armor':return t('itemArmor',{amount:m.amount});
   case 'crit':return t('itemCrit',{percent:Math.round(m.fraction*100)});
   case 'construction-discount':return t('itemBuildDiscount',{percent:Math.round(m.fraction*100)});
   case 'building-damage':return t('itemBuildingDamage',{percent:Math.round(m.fraction*100)});
   case 'troop-attack-aura':return t('itemTroopAttack',{percent:Math.round(m.fraction*100)});
   case 'burn':return t('itemBurn',{damage:m.damagePerSecond,seconds:m.durationSeconds});
   default:return '';
  }
 }).filter(Boolean);
 if(id==='builders-crown')effects.push(t('itemNoStack'));
 if(id==='commander-banner')effects.push(t('itemBannerRange',{range:240}),t('itemNoStack'));
 return effects;
}

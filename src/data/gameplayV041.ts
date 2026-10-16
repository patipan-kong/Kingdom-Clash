import {balanceV02} from './balanceV02';
import {guardianBalance} from './guardian';
import {guardianStats,minionStats} from './combat';
// Gameplay v0.4.1 combat-durability variants (docs/GAMEPLAY_V0_4_1.md). Variant B, chosen after human playtesting, is the active balance for
// every Simulation and the normal playtest URL. A (the v0.4 baseline) and C (hard) remain for comparison: the balance harness passes them
// explicitly, and the dev server accepts ?combat=a|c with a console warning (docs/GAMEPLAY_V041_UI_V042_INTEGRATION.md).
// Guardian max HP = (guardianBaseHp + guardianHpGrowth*(LV-1)) * (1 + 5% per Fortitude rank) + item HP. The proposed "1,320 HP" is the LV3 value
// under A (1200 + 2*60); B and C lower the base so LV3 lands on 1,100 / 950 while keeping the +60/LV growth.
// Damage multipliers apply to Crimson attacks on the Guardian only (as balanceV02.crimsonTowerDamageVsGuardian already does); minion, tower
// and Keep damage against every other target is unchanged except the Keep, whose single damage stat is replaced. Raw damage stays integer.
export type CombatVariantId='a'|'b'|'c';
export interface CombatVariant {
 id:string;label:string;
 guardianBaseHp:number;guardianHpGrowth:number;
 crimsonMinionDamageMultiplier:number; // vs the Guardian, applied once to the minion's raw damage stat, then rounded.
 crimsonTowerDamageMultiplier:number; // vs the Guardian, applied once to balanceV02.crimsonTowerDamageVsGuardian, then rounded.
 crimsonKeepDamage?:number; // replaces gameplayV04.keepDefense.red.damage when set; cooldown, range and targeting are unchanged.
}
export const combatVariants:Record<CombatVariantId,CombatVariant>={
 a:{id:'a',label:'A: v0.4 baseline',guardianBaseHp:guardianStats.maxHp,guardianHpGrowth:guardianBalance.growth.hp,crimsonMinionDamageMultiplier:1,crimsonTowerDamageMultiplier:1},
 b:{id:'b',label:'B: moderate',guardianBaseHp:980,guardianHpGrowth:guardianBalance.growth.hp,crimsonMinionDamageMultiplier:1.1,crimsonTowerDamageMultiplier:1.1,crimsonKeepDamage:17},
 c:{id:'c',label:'C: hard',guardianBaseHp:830,guardianHpGrowth:guardianBalance.growth.hp,crimsonMinionDamageMultiplier:1.1,crimsonTowerDamageMultiplier:1.2,crimsonKeepDamage:20},
};
const scaled=(raw:number,multiplier:number)=>multiplier===1?raw:Math.round(raw*multiplier);
// Raw (pre-armor) damage of a Crimson basic attack on the Guardian. A multiplier of 1 returns the input untouched.
export const crimsonMinionRawVsGuardian=(v:CombatVariant,raw=minionStats.damage)=>scaled(raw,v.crimsonMinionDamageMultiplier);
export const crimsonTowerRawVsGuardian=(v:CombatVariant)=>scaled(balanceV02.crimsonTowerDamageVsGuardian,v.crimsonTowerDamageMultiplier);
// Uncapped Guardian max HP before Fortitude and items.
export const guardianLevelHp=(v:CombatVariant,level:number)=>v.guardianBaseHp+v.guardianHpGrowth*(level-1);
// The active balance. Simulation defaults to it; only an explicit constructor argument or the dev-only option below selects another variant.
export const activeCombatVariantId:CombatVariantId='b';
export const activeCombatVariant=combatVariants[activeCombatVariantId];
const isVariantId=(v:string|null):v is CombatVariantId=>v==='a'||v==='b'||v==='c';
// Development-only launch option: ?combat=a|b|c on the Vite dev server. Production builds and missing or unknown values use the active variant.
export const combatVariantFromSearch=(search:string,dev:boolean):CombatVariant=>{const v=new URLSearchParams(search).get('combat')?.toLowerCase()??null;return combatVariants[dev&&isVariantId(v)?v:activeCombatVariantId];};

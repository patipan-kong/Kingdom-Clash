import {allyKnight} from '../simulation/AllyProbe';
// Chapter 5 Phase 1B: the mercenaries a Tavern can hire. A mercenary is the Allied Hero (AllyProbe.ts allyKnight) with its own price and two stat multipliers; all share one AI and the three Simple Commands.
// Hiring and Revive are paid in Gold only (Tavern construction stays Wood + Iron). Gold comes from Crimson kills (25 each, 10 from wave 13), starts at 250 and buys shop items (150 to 650), so a hero costs about what the first shop item does. Provisional numbers, to be tuned in the M1 playtest. M1 uses this fixed list as is; a later mission picks its roster from it (MatchTavern.roster is a list of ids, so M2's random draw is only a different list).
export interface Mercenary{readonly id:string;readonly name:string;readonly role:string;readonly gold:number;readonly hp:number;readonly damage:number}
export const mercenaries:readonly Mercenary[]=[
 {id:'roland',name:'Roland',role:'Balanced',gold:150,hp:1,damage:1},
 {id:'borin',name:'Borin',role:'Tank',gold:180,hp:1.4,damage:.8},
 {id:'kael',name:'Kael',role:'Berserker',gold:200,hp:.8,damage:1.3},
];
export const mercenary=(id:string)=>mercenaries.find(m=>m.id===id);
// Manual Revive: a share of the hiring price, paid once when ordered, and the time the hero is away.
/** Chapter 5 art: the painted sprite of a hired hero (public/assets/hero-<id>.png); an Allied Hero without a mercenary identity (the Phase 0 probe) keeps the Guardian sprite. */
export const mercenaryTexture=(id?:string):string=>mercenaries.some(m=>m.id===id)?`hero-${id}`:'guardian';
export const REVIVE_FRACTION=.45,REVIVE_TICKS=900; // 30 s at 30 Hz
export const reviveCost=(m:Mercenary)=>({gold:Math.ceil(m.gold*REVIVE_FRACTION)});
export const mercenaryStats=(m:Mercenary)=>({maxHp:Math.round(allyKnight.maxHp*m.hp),damage:Math.round(allyKnight.damage*m.damage)});

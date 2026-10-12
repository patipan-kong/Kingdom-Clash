import {artifact,immutable} from '../data/artifacts';
import type {GameState,Unit} from './GameState';
import {validateInventory} from './Inventory';
// Approved C3 policy; radius/LOS/mask are not original catalog values.
export const bannerRules=immutable({radius:240,tolerance:1e-8});
export function bannerMultiplier(state:GameState,source:Unit){
 const guardian=state.units.guardian,inv=state.inventory;
 if(state.match.result||['initializing','victory','defeat','restarting'].includes(state.match.phase)||!guardian||state.units[guardian.id]!==guardian||guardian.kind!=='guardian'||!Number.isFinite(guardian.hp)||guardian.hp<=0||inv.ownerHeroId!==guardian.id||state.units[source.id]!==source||!['minion-blue','minion-red'].includes(source.kind)||!Number.isFinite(source.hp)||source.hp<=0||source.team!==guardian.team)return 1;
 if(![guardian.x,guardian.y,source.x,source.y].every(Number.isFinite)||Math.hypot(source.x-guardian.x,source.y-guardian.y)>bannerRules.radius+bannerRules.tolerance)return 1;
 validateInventory(inv);
 if(!inv.slots.some(id=>id!==null&&inv.instances[id].itemId==='commander-banner'))return 1;
 const modifier=artifact('commander-banner').modifiers.find(m=>m.kind==='troop-attack-aura');
 if(!modifier||modifier.kind!=='troop-attack-aura')throw new Error('Missing Banner modifier');
 return 1+modifier.fraction;
}

import type {HeroProgression} from './Progression';
import type {GuardianSkill,GuardianUpgrade} from '../data/progression';
import type {Inventory} from './Inventory';
import type {CriticalRandom} from './CriticalHits';
import type {BurnEffect} from './BurnEffects';
import type {MinionArchetype} from '../data/combat';
export interface Status {type:'stun'|'slow'|'taunt';sourceId:string;sourceLife:string;startTick:number;expiresTick:number;magnitude:number;lostLosTick?:number}
export interface Shield {remaining:number;expiresTick:number;zoneId:string}
export interface Cast {skill:GuardianSkill;requestId:string;rank:number;atTick:number;targetId?:string;targetLife?:string;direction?:{x:number;y:number};distance?:number;remaining?:number}
export interface GuardianZone {id:string;sourceId:string;sourceLife:string;x:number;y:number;expiresTick:number;armor:number;shield:number;granted:string[]}
export interface Unit {
 id:string; kind:'guardian'|'minion-red'|'minion-blue'|'wall'|'tower'|'base-blue'|'base-red'; team:'blue'|'red'; x:number; y:number;
 columns?:number; rows?:number;
 hp:number; maxHp:number; armor:number; radius:number; speed:number; damage:number; range:number;
 cooldownTicks:number; windupTicks:number; readyTick:number; protectionTick:number;
 targetId?:string; strike?:{targetId:string;atTick:number}; respawnTick?:number;
 decisionTick?:number; targetSinceTick?:number; breachId?:string;
 // Gameplay v0.3 Crimson minion aggro: pursuit leash and retaliation memory (minions only).
 pursuit?:{x:number;y:number;tick:number}; guardianIgnoreUntil?:number; retaliateTick?:number;
 lifeId?:string;statuses?:Status[];shield?:Shield;baseArmor?:number;
 // Chapter 2 S3: red minion archetype; omitted entirely for Crimson so Chapter 1 state is unchanged.
 archetype?:MinionArchetype;
 // Chapter 2 S7: set at spawn only on units a wave flank tagged; cleared when the flank ends (src/simulation/Flank.ts). Omitted otherwise, so existing state is unchanged.
 // timeout (Chapter 4 M6): a Commander's own flank timeout in ticks; absent = FLANK.timeout.
 flank?:{lane:'north'|'south';startTick:number;commit?:true;timeout?:number};
 // Chapter 4 M6: set only on a Crimson Commander (archetype crimson-hero) and on the escort soldiers that march with one (escortOf = the Commander's id). Omitted otherwise.
 commander?:{role:'marshal'|'shadowblade';lane:'north'|'south';structureBonus:number;keepBonus:number;targetId?:string};
 escortOf?:string;
 // Chapter 2 S9D: set only on a Crimson Keep a level protects (MatchSetup.crimsonKeepInvulnerable); nothing can target or damage it.
 invulnerable?:true;
 // Chapter 3 Azure Barracks V1: set only on a player-built Barracks (kind 'wall'); it owns two soldier slots (src/simulation/AzureBarracks.ts).
 azureBarracks?:true;
 // Chapter 4 M1: set only on the Azure Banner a captured post is raised with (kind 'wall'); Crimson minions treat it as a target.
 banner?:true;
 // Chapter 4 M2: a Crimson gate whose level marks it as a faction gate (MatchGate.faction): solid for Azure, transparent for Crimson (structuresFor).
 gate?:true;
 // Chapter 4 M2: a tower-kind structure repaired on a post's Ballista ruin (fixed location, tower targeting and line of sight).
 ballista?:true;
 // Chapter 4 M4: a siege cart (Movement targets structures only). follow: it walks only while the Guardian is within that many px; order: hostile structure ids it attacks first, in order (then the enemy Keep).
 cart?:{follow?:number;order?:readonly string[]};
 // Chapter 4 M4: a captured gate stands open to both teams until it is repaired (structuresFor).
 open?:true;
 // Chapter 4 M4: a repaired Crimson Barracks that trains Elite soldiers (with azureBarracks; not counted against the Azure Barracks limit).
 eliteBarracks?:true;
 // PROTOTYPE Chapter 5 Phase 0: set only on an Allied Hero (src/simulation/AllyProbe.ts). slot: its place beside the Guardian on Follow; hold: where it waits while the Guardian is dead; moving: Follow hysteresis.
 // Chapter 5 Phase 1B: set only on the Tavern a player builds (kind 'wall'); it hires and revives Allied Heroes (src/simulation/Tavern.ts).
 tavern?:true;
 ally?:{order:AllyOrder;slot:number;merc?:string;hold?:{x:number;y:number};moving?:true;goal?:{x:number;y:number};watch?:{id:string;x:number;y:number;tick:number};ignore?:Record<string,number>}; // goal: the point it walks to this tick (none while it fights or stands), read by the probe harness; watch/ignore: the stall breaker (AllyProbe.allyPlan)
}
export type AllyOrder={type:'follow'}|{type:'attack';targetId:string}|{type:'defend';x:number;y:number};
export interface Structure extends Unit {paidResources?:{wood:number;iron:number};col:number;row:number;startTick:number;completeTick:number;progress:number;constructionDamage:number;}
// Chapter 4 M1: the Forest Camp. Mutable ownership plus the geometry Movement needs; absent outside Chapter 4, so every earlier state is unchanged.
// owner flips to 'azure' when the Banner finishes and back to 'crimson' when it dies (nothing else changes hands: repaired structures stay).
// Chapter 4 M5: with several camps (MatchSetup.posts) each has its id, and only the Defender's camp has an anchor and a guard radius.
export interface PostState {id?:string;owner:'crimson'|'azure';captured:boolean;losses:number;counterDone:boolean;bannerId?:string;flag:{x:number;y:number};anchor?:{x:number;y:number};guard?:number;circle:{x:number;y:number;radius:number};ruin:{col:number;row:number}}
// Chapter 4 M4: the War Cart's wreck (one at a time, on an authored site), the capture state of each capturable structure, and the Crimson Hero's guard post. Absent outside M4.
export interface CartWreck {x:number;y:number;col:number;row:number;repair?:{complete:number}}
export interface CaptureState {stage:'crimson'|'captured'|'azure'|'lost';progress:number;repairDone?:number}
export interface GuardState {anchor:{x:number;y:number};radius:number;raid:boolean}
// Chapter 5 Phase 1B: one place of the Tavern's hero cap. A fallen hero keeps its slot (status 'dead') until it is revived ('reviving' for 30 s, then 'alive' again) or dismissed. remaining: ticks left, counted only while a Tavern stands.
export interface TavernSlot{merc:string;status:'alive'|'dead'|'reviving';unitId?:string;remaining?:number}
export interface GameState {
 tavern?:{slots:TavernSlot[]}; // Chapter 5 Phase 1B: present only in a match whose setup has a Tavern
 post?:PostState;
 posts?:PostState[]; // Chapter 4 M5: every camp of a several-camp match, in MatchSetup.posts order; `post` is then the first of them (the same object)
 cartWreck?:CartWreck;captures?:Record<string,CaptureState>;guard?:GuardState;
 heroProgression:HeroProgression;
 inventory:Inventory;
 criticalRandom:CriticalRandom;
 burns:Record<string,BurnEffect>;
 skills:{ready:Record<GuardianSkill,number>;cooldownIntervals:Record<GuardianSkill,number>;lockTick:number;cast?:Cast;zones:GuardianZone[]};
 bases:Record<string,Structure>; match:{phase:'initializing'|'playing'|'paused'|'victory'|'defeat'|'restarting';result?:{outcome:'victory'|'defeat';tick:number;kills:number;gold:number;alliedHp:number;enemyHp:number}};
 structures:Record<string,Structure>; wood:number; iron:number;
 units:Record<string,Unit>; move:{x:number;y:number}; attacking:boolean; selectedTarget?:string;
 encounter:{id:'prototype'|'extended';waveCount:number;reserved:number[][];alliedBaseHitTick?:number};
 gold:number; kills:number; spawnedWaves:number; guardianDeaths:number; previewReady:Record<string,number>;
}
export type TradeCommand={type:'buy-item';matchId:string;heroId:string;requestId:string;itemId:string}|{type:'fuse-item';matchId:string;heroId:string;requestId:string;itemId:string;componentIds:readonly string[]}|{type:'sell-item';matchId:string;heroId:string;requestId:string;instanceId:string};
export type Command=TradeCommand|{type:'cast';requestId:string;skill:GuardianSkill;targetId?:string;direction?:{x:number;y:number};distance?:number}|{type:'learn';requestId:string;skill:GuardianUpgrade}|{type:'place';requestId:string;kind:'wall'|'tower'|'barracks'|'ballista'|'tavern';col:number;row:number}|{type:'move';x:number;y:number}|{type:'attack'}|{type:'target';id:string}|{type:'preview';key:string}|{type:'ally';requestId:string;id:string;order:AllyOrder}|{type:'tavern';requestId:string;action:'hire'|'revive'|'dismiss';merc?:string;slot?:number};
export type GameEvent={type:'item-traded';action:'buy'|'sell'|'fusion';requestId:string;instanceId:string;goldDelta:number}|{type:'cast-accepted'|'cast-effect'|'cast-interrupted';skill:GuardianSkill;requestId:string;hits?:string[];primaryId?:string;axis?:{x:number;y:number}}|{type:'status';id:string;status:Status['type'];expiresTick:number}|{type:'shield';id:string;amount:number;zoneId:string}|{type:'xp';sourceId:string;amount:number;heroId?:string}|{type:'level-up';level:number;heroId?:string}|{type:'skill-upgraded';skill:GuardianUpgrade;rank:number}|{type:'match-end';outcome:'victory'|'defeat';tick:number}|{type:'built';id:string;requestId:string}|{type:'construction-complete';id:string}|{type:'rejected';reason:string;requestId?:string}|{type:'spawn'|'respawn';id:string}|{type:'attack';id:string;targetId:string}|{type:'damage';id:string;sourceId:string;amount:number;raw?:number;mitigated?:number;absorbed?:number;damageType?:'physical'|'magic'|'direct';castId?:string;critical?:true}|{type:'death';id:string;sourceId:string}|{type:'reward';id:string;gold:number}|{type:'wave';index:number;flank?:{lane:'north'|'south';units:'raiders'|'all'}}|{type:'preview';key:string}|{type:'post';change:'raising'|'captured'|'lost'|'failed'|'repairing'|'shielded';first?:true;camp?:string}|{type:'site';change:'wreck'|'repairing'|'repaired'|'captured'|'converted'|'lost'|'short'|'raid';id:string}|{type:'commander';id:string;change:'warning'|'released'|'down';lane:'north'|'south';targetId?:string;releaseTick?:number}|{type:'tavern';action:'hire'|'revive'|'dismiss'|'fallen'|'returned';slot:number;merc:string;requestId?:string}|{type:'ally-order';id:string;order:AllyOrder;requestId:string}; // commander: Chapter 4 M6 (warning = the attack is announced, releaseTick = when the Commander takes the field); ally-order: Chapter 5, an Allied Hero took a Simple Command (the 'ally' command)
export const combatStructures=(s:GameState)=>({...s.structures,...s.bases});
// The structures a unit of this team collides with, paths around and sees through: Crimson ignores faction gates.
// A faction gate is transparent to the team that owns it, and to everyone while captured and open (Chapter 4 M2/M4); every other structure is solid for both.
export const structuresFor=(s:GameState,team:'blue'|'red')=>{const all=combatStructures(s);const out:Record<string,Structure>={};for(const id in all)if(!(all[id].gate&&(all[id].team===team||all[id].open)))out[id]=all[id];return out;};

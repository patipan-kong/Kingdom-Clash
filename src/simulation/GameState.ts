import type {HeroProgression} from './Progression';
import type {GuardianSkill,GuardianUpgrade} from '../data/progression';
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
 lifeId?:string;statuses?:Status[];shield?:Shield;baseArmor?:number;
}
export interface Structure extends Unit {col:number;row:number;startTick:number;completeTick:number;progress:number;constructionDamage:number;}
export interface GameState {
 heroProgression:HeroProgression;
 skills:{ready:Record<GuardianSkill,number>;lockTick:number;cast?:Cast;zones:GuardianZone[]};
 bases:Record<string,Structure>; match:{phase:'initializing'|'playing'|'paused'|'victory'|'defeat'|'restarting';result?:{outcome:'victory'|'defeat';tick:number;kills:number;gold:number;alliedHp:number;enemyHp:number}};
 structures:Record<string,Structure>; wood:number; iron:number;
 units:Record<string,Unit>; move:{x:number;y:number}; attacking:boolean; selectedTarget?:string;
 gold:number; kills:number; spawnedWaves:number; previewReady:Record<string,number>;
}
export type Command={type:'cast';requestId:string;skill:GuardianSkill;targetId?:string;direction?:{x:number;y:number};distance?:number}|{type:'learn';requestId:string;skill:GuardianUpgrade}|{type:'place';requestId:string;kind:'wall'|'tower';col:number;row:number}|{type:'move';x:number;y:number}|{type:'attack'}|{type:'target';id:string}|{type:'preview';key:string};
export type GameEvent={type:'cast-accepted'|'cast-effect'|'cast-interrupted';skill:GuardianSkill;requestId:string}|{type:'status';id:string;status:Status['type'];expiresTick:number}|{type:'shield';id:string;amount:number;zoneId:string}|{type:'xp';sourceId:string;amount:number;heroId?:string}|{type:'level-up';level:number;heroId?:string}|{type:'skill-upgraded';skill:GuardianUpgrade;rank:number}|{type:'match-end';outcome:'victory'|'defeat';tick:number}|{type:'built';id:string;requestId:string}|{type:'construction-complete';id:string}|{type:'rejected';reason:string}|{type:'spawn'|'respawn';id:string}|{type:'attack';id:string;targetId:string}|{type:'damage';id:string;sourceId:string;amount:number;raw?:number;mitigated?:number;absorbed?:number;damageType?:'physical'|'magic'|'direct';castId?:string}|{type:'death';id:string;sourceId:string}|{type:'reward';id:string;gold:number}|{type:'wave';index:number}|{type:'preview';key:string};
export const combatStructures=(s:GameState)=>({...s.structures,...s.bases});

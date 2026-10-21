import {balanceV02} from './balanceV02';
import {gameplayV03} from './gameplayV03';
import {desertRaider,type MinionArchetype} from './combat';
export type GuardianSkill='bash'|'taunt'|'charge'|'zone';
export type GuardianUpgrade=GuardianSkill|'fortitude';
export const progressionRules={maxLevel:20,initialPoints:1};
export const skillRules={
 bash:{key:'Q',name:'Shield Bash',maxRank:5},
 taunt:{key:'W',name:'Taunt',maxRank:5},
 charge:{key:'E',name:'Charge',maxRank:5},
 zone:{key:'R',name:'Guardian Zone',maxRank:3}
} as const;
export const upgradeRules={...skillRules,fortitude:{key:'F',name:'Fortitude',maxRank:2}} as const;
export const nextLevelXp=(level:number)=>level>=progressionRules.maxLevel?0:80+25*(level-1);
export const skillLevel=(skill:GuardianUpgrade,rank:number)=>skill==='fortitude'?[18,20][rank-1]:skill==='zone'?[6,11,16][rank-1]:2*rank-1;
// Approved Option A reward profiles. Unsupported future rosters remain absent.
export const enemyXp:Partial<Record<string,number>>={'minion-red':60,'minion-blue':60,tower:balanceV02.crimsonTowerXp,wall:0,'base-red':0,'base-blue':0};
// Chapter 2 S3: XP of a killed unit; a red minion's archetype overrides the kind's value.
export const enemyXpOf=(u:{kind:string;archetype?:MinionArchetype}):number|undefined=>u.kind==='minion-red'&&u.archetype==='desert-raider'?desertRaider.xp:enemyXp[u.kind];
export const assistanceRadius=240;
export const respawnTicks=(level:number,priorDeaths=0)=>{const r=gameplayV03.respawn;return Math.round(Math.min(r.capSeconds,r.baseSeconds+r.perLevelSeconds*(level-1)+r.perPriorDeathSeconds*priorDeaths)*30);};

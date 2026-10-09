export type GuardianSkill='bash'|'taunt'|'charge'|'zone';
export const progressionRules={maxLevel:20,initialPoints:1};
export const skillRules={
 bash:{key:'Q',name:'Shield Bash',maxRank:5},
 taunt:{key:'W',name:'Taunt',maxRank:5},
 charge:{key:'E',name:'Charge',maxRank:5},
 zone:{key:'R',name:'Guardian Zone',maxRank:3}
} as const;
export const nextLevelXp=(level:number)=>level>=progressionRules.maxLevel?0:80+25*(level-1);
export const skillLevel=(skill:GuardianSkill,rank:number)=>skill==='zone'?[6,11,16][rank-1]:2*rank-1;
// The original specifications omit XP amounts, assistance radius and stat/skill effects.
// Undefined means unavailable; never infer XP from Gold or prototype visual cooldowns.
export const enemyXp:Partial<Record<string,number>>={};
export const assistanceRadius:number|undefined=undefined;
export const respawnTicks=(level:number)=>Math.min(25*30,5*30+24*(level-1));

// Approved Option A: docs/GUARDIAN_BALANCE_V0_1.md (implementation/playtesting).
export const guardianBalance={version:'0.1',status:'approved-for-playtesting',option:'A',tickRate:30,
 growth:{hp:60,attack:3,armor:1},participationTicks:300,assistRadius:240,castLockTicks:9,
 passive:{radius:240,armor:5},fortitude:{levels:[18,20],hpFraction:.05,armor:3},
 chargeSpeed:600,shieldCap:.30} as const;
export const guardianRanks={
 bash:{damage:[80,95,110,125,140],cooldown:[300,285,270,255,240],duration:[15,18,21,24,27],windup:6,range:90,radius:0},
 taunt:{damage:[0,0,0,0,0],cooldown:[360,345,330,315,300],duration:[30,33,36,39,42],windup:6,range:0,radius:144},
 charge:{damage:[40,50,60,70,80],cooldown:[420,405,390,375,360],duration:[24,24,24,24,24],windup:6,range:0,radius:0,distance:[144,168,192,216,240],slow:[.20,.25,.30,.35,.40]},
 zone:{damage:[0,0,0],cooldown:[1650,1500,1350],duration:[120,135,150],windup:9,range:0,radius:192,shield:[120,180,240],armor:[10,15,20]}
} as const;
export function validateGuardianBalance(){for(const [key,r] of Object.entries(guardianRanks)){
 const n=key==='zone'?3:5;
 for(const values of [r.damage,r.cooldown,r.duration])if(values.length!==n||values.some(v=>!Number.isSafeInteger(v)||v<0))throw new Error(`Invalid Guardian rank data: ${key}`);
 if(r.cooldown.some(v=>v<=0)||r.duration.some(v=>v<=0))throw new Error(`Invalid Guardian timing: ${key}`);
}}

// Approved Option A: docs/GUARDIAN_BALANCE_V0_1.md (implementation/playtesting).
export const guardianBalance={version:'0.1',status:'approved-for-playtesting',option:'A',tickRate:30,
 growth:{hp:60,attack:3,armor:1},participationTicks:300,assistRadius:240,castLockTicks:9,bashLockTicks:6,
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
// Shield Bash cone: a 120 degree sector (60 either side of the axis) out to the Bash range, at most 5 foes. One rule for the simulation and the aim preview.
export const bashCone={range:90,half:Math.PI/3,maxTargets:5,secondaryDamage:.6} as const;
type P={x:number;y:number};
export const bashAngle=(from:P,axis:P,to:P)=>{const x=to.x-from.x,y=to.y-from.y,d=Math.hypot(x,y);return d<1e-6?0:Math.acos(Math.max(-1,Math.min(1,(x*axis.x+y*axis.y)/d)));};
export const inBashCone=(from:P,axis:P,to:P)=>Math.hypot(to.x-from.x,to.y-from.y)<=bashCone.range+1e-8&&bashAngle(from,axis,to)<=bashCone.half+1e-9;
// The foes a Bash reaches: the primary first (if it is among the candidates), then the nearest in the cone (id breaks ties), at most maxTargets. candidates: foes already legal (alive, enemy, in range, line of sight).
export function bashVictims<T extends P&{id:string}>(from:P,axis:P,candidates:readonly T[],primaryId?:string):T[]{
 const inside=candidates.filter(u=>inBashCone(from,axis,u)),primary=inside.find(u=>u.id===primaryId);
 const rest=inside.filter(u=>u!==primary).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y)||a.id.localeCompare(b.id));
 return (primary?[primary,...rest]:rest).slice(0,bashCone.maxTargets);
}

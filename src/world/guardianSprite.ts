// Guardian V1.0 sprite animation: the frame to show, as a pure function of presentation ms (Battle.elapsed, which stops on pause) and of what the simulation
// already reports (attack / cast / damage / death / respawn events and the hero's state). Render-only: nothing here feeds back into the simulation.
// The sheet: art/guardian-anim (frames authored facing left, transparent at source), packed by scripts/pack-guardian-sheet.py into a trimmed atlas whose
// frames "0".."28" share one 400x364 source cell, so the feet pivot is the same point in every frame.
// idleHeight: the idle silhouette's height in the cell (the game draws it 105.6 px tall, as the still was); feetX: the feet's x in the entity, where the still's
// feet stood (57.5% across a centred 120 px image); hit: the tap box in cell px, the idle body.
export const GUARDIAN_SHEET={key:'guardian-sheet',file:'guardian-sheet',frameWidth:400,frameHeight:364,pivotX:256,pivotY:334,idleHeight:210,frames:29,feetX:9,hit:{x:126,y:128,w:226,h:204}} as const;
// Frame indices in the sheet (row-major).
export const GF={idle:0,walk:[1,2,3,4,5,6],attack:[7,8,9,10],bash:[11,12,13,14],charge:[15,16,17],taunt:[18,19,20],protect:[21,22,23],hurt:24,death:[25,26,27],rise:28} as const;
export const GUARDIAN_MOTION={
 stride:120, // world px travelled per walk cycle (six frames)
 moveHold:90, // still walking this many ms after the last movement (the simulation moves at 30 Hz, the screen at 60)
 flipDrift:4,turnHold:120, // px of travel against the facing before a turn; the least ms between two walking turns
 hurtMs:140,dashMs:70, // hurt flinch; one Charge stride frame
 deathHold:1600,deathFade:500,riseMs:320, // the fallen Guardian stays this long, then fades; the respawn rise
} as const;
export type Facing=1|-1; // -1: the authored left-facing pose; 1: mirrored about the feet pivot
export type GuardianSkill='bash'|'taunt'|'charge'|'zone';
export interface GuardianPoseInput{
 now:number;
 travelled:number;movedAt:number; // world px walked so far; ms of the last movement
 attackAt?:number;attackWindup:number; // ms of the last basic-attack start (the simulation's attack event) and its windup in ms
 cast?:{skill:GuardianSkill;at:number;windup:number}; // the last accepted cast
 dashing:boolean; // the simulation's Charge is moving the Guardian now
 hurtAt?:number;stunned:boolean;
 deadAt?:number;respawnAt?:number; // ms of the death and of the last respawn
}
type Key=readonly [frame:number,until:number];
const play=(keys:readonly Key[],t:number)=>{for(const [f,until] of keys)if(t<until)return f;return undefined;};
// Each action clip lands its contact frame exactly when the windup ends (the tick the simulation applies the hit or the effect).
export function attackFrame(t:number,w:number){const [a,b,c,d]=GF.attack;return play([[a,.35*w],[b,.7*w],[c,w],[d,w+110],[c,w+200]],t);}
export function castFrame(skill:GuardianSkill,t:number,w:number){
 if(skill==='bash'){const [a,b,c,d]=GF.bash;return play([[a,.3*w],[b,.65*w],[c,w],[d,w+130],[c,w+220]],t);}
 if(skill==='taunt'){const [a,b,c]=GF.taunt;return play([[a,.5*w],[b,w],[c,w+250],[b,w+330]],t);}
 if(skill==='zone'){const [a,b,c]=GF.protect;return play([[a,.4*w],[b,w],[c,w+300],[b,w+380]],t);}
 return t<w?GF.charge[0]:undefined; // Charge: the brace during the windup; the dash itself follows the simulation (GuardianPoseInput.dashing)
}
export const walkFrame=(travelled:number)=>GF.walk[Math.floor(((travelled/GUARDIAN_MOTION.stride)%1+1)%1*GF.walk.length)%GF.walk.length];
// The frame and the art alpha. Priority: death, respawn rise, Charge dash, cast, basic attack, stun or hurt, walk, idle.
export function guardianPose(s:GuardianPoseInput):{frame:number;alpha:number}{
 const M=GUARDIAN_MOTION,now=s.now;
 if(s.deadAt!==undefined){const t=now-s.deadAt,[a,b,c]=GF.death;return {frame:play([[a,130],[b,300]],t)??c,alpha:t<M.deathHold?1:Math.max(0,1-(t-M.deathHold)/M.deathFade)};}
 if(s.respawnAt!==undefined&&now-s.respawnAt<M.riseMs){const t=now-s.respawnAt;return {frame:t<M.riseMs*.45?GF.death[0]:GF.rise,alpha:Math.min(1,t/(M.riseMs*.8))};}
 if(s.dashing)return {frame:GF.charge[1+Math.floor(now/M.dashMs)%2],alpha:1};
 if(s.cast){const f=castFrame(s.cast.skill,now-s.cast.at,s.cast.windup);if(f!==undefined)return {frame:f,alpha:1};}
 if(s.attackAt!==undefined){const f=attackFrame(now-s.attackAt,s.attackWindup);if(f!==undefined)return {frame:f,alpha:1};}
 if(s.stunned||s.hurtAt!==undefined&&now-s.hurtAt<M.hurtMs)return {frame:GF.hurt,alpha:1};
 if(now-s.movedAt<=M.moveHold)return {frame:walkFrame(s.travelled),alpha:1};
 return {frame:GF.idle,alpha:1};
}
// Walking facing: turn only after a few px against the facing, and at most once per turnHold, so a nudge from a crowd does not flip him.
export function nextFacing(facing:Facing,drift:number,dx:number,sinceTurn:number):{facing:Facing;drift:number}{
 if(dx*facing>0||sinceTurn<GUARDIAN_MOTION.turnHold)return {facing,drift:dx*facing>0?0:drift};
 drift+=Math.abs(dx);return drift>GUARDIAN_MOTION.flipDrift?{facing:facing===1?-1:1,drift:0}:{facing,drift};
}
// Facing toward a point (a target, an aim or a Charge direction); a point almost straight above or below keeps the facing.
export const faceToward=(facing:Facing,dx:number):Facing=>Math.abs(dx)<4?facing:dx>0?1:-1;

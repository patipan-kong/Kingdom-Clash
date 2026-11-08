// Soldier V1.0 sprite animation (Azure Vanguard and Crimson Raider): the frame to show, as a pure function of simulation ms and of what the simulation already
// reports (attack / damage / death events and the unit's state). Render-only: nothing here feeds back into the simulation.
// One master: art/soldier-anim (the Azure Vanguard, authored facing left, transparent at source), packed by scripts/pack-soldier-sheets.py into two trimmed
// atlases, Azure and its cloth-only Crimson recolour, whose frames "0".."13" share one 208x192 source cell, so the feet pivot is the same point in every frame.
// idleHeight: the idle silhouette's height in the cell (drawn at the entity's height, 57.6 px for a soldier, as the still was); feetX: the feet's x right of
// the entity's centre in cell px (where the still's feet stood); hit: the tap box in cell px, the idle body.
// desert / shadowblade: the Desert Raider's and the Shadowblade's sheets, made at load from the Crimson sheet by their existing recolours (unchanged).
export const SOLDIER_SHEET={azure:'soldier-azure',crimson:'soldier-crimson',desert:'soldier-desert',shadowblade:'soldier-shadowblade',frameWidth:208,frameHeight:192,pivotX:116,pivotY:172,idleHeight:120,frames:14,feetX:13.5,hit:{x:42,y:53,w:123,h:119}} as const;
// Frame indices in the sheets.
export const SF={idle:0,walk:[1,2,3,4,5,6],attack:[7,8,9],hurt:10,death:[11,12,13]} as const;
export const SOLDIER_MOTION={
 stride:64, // world px travelled per walk cycle (six frames)
 moveHold:90, // still walking this many ms after the last movement (the simulation moves at 30 Hz, the screen at 60)
 flipDrift:6,turnHold:200, // px of travel against the facing before a turn; the least ms between two walking turns (crowd pushes never flip a soldier)
 contactMs:130, // the contact frame's hold after the hit tick
 hurtMs:120,hurtGap:350, // the flinch, and the least ms between two flinches
 deathKeys:[120,260],deathHold:900,deathEnd:1300, // stagger, collapse, then down; fades from deathHold and is gone at deathEnd
 corpseCap:16,corpseQuickFade:150, // the most bodies on the ground; past it the oldest fades this fast
} as const;
// Crimson Elite Soldier V1.0: the Elite's own sheet (art/elite-anim, authored facing left like the Soldier's), the same 14 frames (SF) and the same pose logic; only its geometry differs: the cell, the pivot (feet), the idle
// silhouette's height in the cell (spear tip to soles), the idle body as the tap box, and a longer stride (an 86.4 px body against 57.6). soldierGeometry(key) is the one lookup the scene uses.
export interface SoldierGeometry{readonly frameWidth:number;readonly frameHeight:number;readonly pivotX:number;readonly pivotY:number;readonly idleHeight:number;readonly feetX:number;readonly hit:{readonly x:number;readonly y:number;readonly w:number;readonly h:number};readonly stride:number}
export const ELITE_SHEET={key:'soldier-elite',frameWidth:288,frameHeight:240,pivotX:164,pivotY:214,idleHeight:150,feetX:-6.5,hit:{x:121,y:65,w:105,h:149},stride:76} as const;
export const soldierGeometry=(key:string):SoldierGeometry=>key===ELITE_SHEET.key?ELITE_SHEET:{...SOLDIER_SHEET,stride:SOLDIER_MOTION.stride};
export type Facing=1|-1; // -1: the authored left-facing pose; 1: mirrored about the feet pivot
export interface SoldierPoseInput{
 now:number;
 travelled:number;movedAt:number; // world px walked so far; ms of the last movement
 attackAt?:number;attackWindup:number; // ms the unit's windup started (the hit tick minus its windupTicks) and that windup in ms
 hurtAt?:number;
 stride?:number; // world px per walk cycle when it is not the Soldier's
}
type Key=readonly [frame:number,until:number];
const play=(keys:readonly Key[],t:number)=>{for(const [f,until] of keys)if(t<until)return f;return undefined;};
// The wind-up fills the first half of the unit's own windup, the swing the second; the contact frame shows from the hit tick.
export function soldierAttackFrame(t:number,w:number){if(t<0)return undefined;const [a,b,c]=SF.attack;return play([[a,.5*w],[b,w],[c,w+SOLDIER_MOTION.contactMs]],t);}
export const soldierWalkFrame=(travelled:number,stride:number=SOLDIER_MOTION.stride)=>SF.walk[Math.floor(((travelled/stride)%1+1)%1*SF.walk.length)%SF.walk.length];
// Priority: attack, hurt, walk, idle (death is a separate body, corpsePose).
export function soldierPose(s:SoldierPoseInput):number{
 const M=SOLDIER_MOTION,now=s.now;
 if(s.attackAt!==undefined){const f=soldierAttackFrame(now-s.attackAt,s.attackWindup);if(f!==undefined)return f;}
 if(s.hurtAt!==undefined&&now-s.hurtAt<M.hurtMs)return SF.hurt;
 if(now-s.movedAt<=M.moveHold)return soldierWalkFrame(s.travelled,s.stride);
 return SF.idle;
}
// A fallen soldier's body: the frame and alpha t ms after death, undefined once it is gone. fadeFrom (ms after death) starts an early quick fade.
export function corpsePose(t:number,fadeFrom?:number):{frame:number;alpha:number}|undefined{
 const M=SOLDIER_MOTION,[a,b,c]=SF.death,[k1,k2]=M.deathKeys;
 const fade=fadeFrom!==undefined&&fadeFrom<M.deathHold?Math.max(0,1-(t-fadeFrom)/M.corpseQuickFade):Math.min(1,Math.max(0,1-(t-M.deathHold)/(M.deathEnd-M.deathHold)));
 if(t>=M.deathEnd||fade<=0)return undefined;
 return {frame:t<k1?a:t<k2?b:c,alpha:fade};
}
// Walking facing: turn only after a few px against the facing, and at most once per turnHold.
export function nextSoldierFacing(facing:Facing,drift:number,dx:number,sinceTurn:number):{facing:Facing;drift:number}{
 if(dx*facing>0||sinceTurn<SOLDIER_MOTION.turnHold)return {facing,drift:dx*facing>0?0:drift};
 drift+=Math.abs(dx);return drift>SOLDIER_MOTION.flipDrift?{facing:facing===1?-1:1,drift:0}:{facing,drift};
}
// Facing toward a target; one almost straight above or below keeps the facing.
export const soldierFaceToward=(facing:Facing,dx:number):Facing=>Math.abs(dx)<4?facing:dx>0?1:-1;
// A walk phase from the id, so a squad that moves off together does not step in lockstep.
export const walkPhase=(id:string)=>{let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return h%SOLDIER_MOTION.stride;};

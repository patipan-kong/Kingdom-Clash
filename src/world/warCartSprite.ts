// War Cart V1.0 sprite animation (the Crimson cart and, recoloured, the repaired Azure cart): the frame to show, as a pure function of simulation ms and of what the
// simulation already reports (the attack event and its strike, the unit's travel, death, the wreck site). Render-only: nothing here feeds back into the simulation.
// One master: art/warcart-anim (the Crimson cart, authored facing left, transparent at source), packed by scripts/pack-warcart-sheet.py into two trimmed atlases,
// Crimson (frames "0".."11") and its cloth-only Azure recolour (frames "0".."9": the wreck and the repairing frame are only ever seen Crimson), whose frames share
// one 296x173 source cell, so the pivot (the middle of the wheelbase, on the ground line) is the same point in every frame.
// idleHeight: the idle silhouette's height in the cell times 1.2 (a unit is drawn at 1.2 x its entity height, so the cart stands 84 px high, as the old picture did);
// hit: the tap box in cell px, the old picture's rectangle (100.8 x 100.8 px on screen), which does not change with the pose or the facing.
export const WARCART_SHEET={crimson:'warcart-crimson',azure:'warcart-azure',frameWidth:296,frameHeight:173,pivotX:217,pivotY:166,idleHeight:193,hit:{x:120,y:-27,w:193,h:193}} as const;
// Frame indices in the sheets.
export const CF={idle:0,roll:[1,2,3,4],windup:5,contact:6,recover:7,destroyed:[8,9],wreck:10,repairing:11} as const;
export const WARCART_MOTION={
 stride:32, // world px travelled per wheel cycle (four frames)
 moveHold:90, // still rolling this many ms after the last movement (the simulation moves at 30 Hz, the screen at 60)
 contactMs:110,recoverMs:150, // the ram's thrust is held this long from the hit tick, then it returns
 flipDrift:6,turnHold:300, // as the soldiers, a little slower: a cart is heavy
 deathKey:200,deathHold:900,deathEnd:1500, // breaking, then down; fades from deathHold and is gone at deathEnd
 wreckFrom:700,wreckFade:600, // a new wreck fades in at its site from this long after the death (as the body fades out)
} as const;
export type CartFacing=1|-1; // -1: the authored left-facing pose; 1: mirrored about the pivot
export interface WarCartPoseInput{
 now:number;
 travelled:number;movedAt:number; // world px rolled so far; ms of the last movement
 attackAt?:number;attackWindup:number; // ms the unit's windup started (the hit tick minus its windupTicks) and that windup in ms
}
// The ram is drawn back through the whole windup, thrust forward on the hit tick, then returns: windup, contact, recover.
export function warCartAttackFrame(t:number,w:number):number|undefined{
 if(t<0)return undefined;const M=WARCART_MOTION;
 return t<w?CF.windup:t<w+M.contactMs?CF.contact:t<w+M.contactMs+M.recoverMs?CF.recover:undefined;
}
export const warCartRollFrame=(travelled:number)=>CF.roll[Math.floor(((travelled/WARCART_MOTION.stride)%1+1)%1*CF.roll.length)%CF.roll.length];
// Priority: attack, roll, idle (destruction is a separate body, warCartCorpsePose).
export function warCartPose(s:WarCartPoseInput):number{
 if(s.attackAt!==undefined){const f=warCartAttackFrame(s.now-s.attackAt,s.attackWindup);if(f!==undefined)return f;}
 if(s.now-s.movedAt<=WARCART_MOTION.moveHold)return warCartRollFrame(s.travelled);
 return CF.idle;
}
// A destroyed cart's body: the frame and alpha t ms after death, undefined once it is gone.
export function warCartCorpsePose(t:number):{frame:number;alpha:number}|undefined{
 const M=WARCART_MOTION;if(t>=M.deathEnd)return undefined;
 return {frame:t<M.deathKey?CF.destroyed[0]:CF.destroyed[1],alpha:Math.min(1,Math.max(0,1-(t-M.deathHold)/(M.deathEnd-M.deathHold)))};
}
// The wreck's alpha t ms after the wreck appeared in the simulation (a start-as-wreck cart passes a large t).
export const warCartWreckAlpha=(t:number)=>Math.min(1,Math.max(0,(t-WARCART_MOTION.wreckFrom)/WARCART_MOTION.wreckFade));

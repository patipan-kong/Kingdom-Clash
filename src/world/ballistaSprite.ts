// Ballista V1.0 sprite animation (the repaired Azure Ballista): the frames to show, as pure functions of simulation ms and of what the simulation already reports
// (attack / death events, hp, construction). Render-only: nothing here feeds back into the simulation.
// One master (art/ballista-anim, the Ballista repainted in the Tower's style) split into two layers that share one 336 x 320 cell and one pivot, packed by
// scripts/pack-ballista-sheet.py into one trimmed atlas: the stationary base (footing and post, one frame per damage state, then the collapse) and, above it, the
// firing mechanism (stock, bow arms, string, bolt, pennant) in four poses. The mechanism is drawn facing right and mirrored about the post for a target on the left;
// the base is never flipped. The War Cart keeps the old canvas texture (its own slice); the old canvas is also the placeholder where the sheet is missing.
// idleHeight: the cell's height, drawn at the visual's height (84 px) as the old 96 px canvas was; hit: the tap box in cell px, the old 96 px canvas's rectangle (84 x 84 px drawn) centred on the post.
export const BALLISTA_SHEET={key:'ballista-sheet',frameWidth:336,frameHeight:320,pivotX:156,pivotY:320,idleHeight:320,hit:{x:-4,y:0,w:320,h:320}} as const;
// Frame indices: the base's three damage states and three collapse frames, then the mechanism's four poses.
export const BAF={intact:0,damaged:1,critical:2,collapse:[3,4,5],loaded:6,fired:7,recoil:8,reload:9} as const;
export const BALLISTA_MOTION={
 firedMs:140,recoilMs:420, // after a shot: the fired pose from the attack's own tick, then the recoil, then the reload
 reloadShare:.6, // the reload ends (the bolt is seated) at this share of the cooldown; loaded holds from there to the next shot
 deadZone:8,turnHold:300, // a target this close to straight above or below keeps the facing; the least ms between two turns that are not a shot
 damaged:.66,critical:.33, // hp/maxHp below which the base shows its damage
 collapseKeys:[150,400],collapseHold:1400,collapseEnd:2000, // breaking, falling, then rubble; fades from collapseHold and is gone at collapseEnd
} as const;
export type BallistaFacing=1|-1; // 1: the painted, right-facing mechanism; -1: the same frame mirrored about the post
// The base's frame. While a Ballista is built its hp only climbs from near zero, so it shows the intact base (and the existing fade).
export function ballistaBaseFrame(hp:number,maxHp:number,building:boolean):number{
 if(building)return BAF.intact;const r=hp/maxHp;return r<BALLISTA_MOTION.critical?BAF.critical:r<BALLISTA_MOTION.damaged?BAF.damaged:BAF.intact;
}
// The mechanism's pose: the shot sequence from the last attack (fired, recoil, reload), loaded before the first shot and from the end of the reload until the next one.
// cooldownMs is the structure's own cooldown, so the reload always ends before the next shot can come.
export function ballistaPose(now:number,shotAt:number|undefined,cooldownMs:number):number{
 const M=BALLISTA_MOTION,t=shotAt===undefined?Infinity:now-shotAt;
 if(t<0||t>=cooldownMs*M.reloadShare)return BAF.loaded;
 return t<M.firedMs?BAF.fired:t<M.recoilMs?BAF.recoil:BAF.reload;
}
// Facing toward a target; one almost straight above or below keeps the facing.
export const ballistaFaceToward=(facing:BallistaFacing,dx:number):BallistaFacing=>Math.abs(dx)<BALLISTA_MOTION.deadZone?facing:dx>0?1:-1;
// A destroyed Ballista's collapse: the frame and alpha t ms after its death, undefined once it is gone.
export function ballistaCollapsePose(t:number):{frame:number;alpha:number}|undefined{
 const M=BALLISTA_MOTION,[a,b,c]=BAF.collapse,[k1,k2]=M.collapseKeys;if(t>=M.collapseEnd)return undefined;
 return {frame:t<k1?a:t<k2?b:c,alpha:Math.min(1,Math.max(0,1-(t-M.collapseHold)/(M.collapseEnd-M.collapseHold)))};
}

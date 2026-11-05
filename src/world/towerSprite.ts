// Tower V1.0 sprite animation (the Archer Tower, Crimson Tower and Siege Tower): the frames to show, as pure functions of simulation ms and of what the
// simulation already reports (attack / death events, hp, construction). Render-only: nothing here feeds back into the simulation.
// Two layers from one master (art/tower-anim, the Azure tower, transparent at source), packed by scripts/pack-tower-sheet.py into one trimmed atlas whose
// frames all share one source cell, so every frame is drawn at the same point: a still building (one frame per damage state, then the collapse) and, above
// it, the archer in its platform. The archer has a right- and a left-facing set, each already cut at the front railing, so a turn never mirrors the building.
// The Crimson sheet is made at load from the Azure one by the existing crimsonTowerPixels.
// idleHeight: the intact tower's height in the cell (drawn at the tower's height, 141.6 px, as the still was); hit: the tap box in cell px, the still's rectangle.
export const TOWER_SHEET={azure:'tower-azure',crimson:'tower-crimson',frameWidth:300,frameHeight:420,pivotX:150,pivotY:400,idleHeight:384,hit:{x:56,y:16,w:188,h:384}} as const;
// Frame indices in the sheet: the building states, then the archer's five poses facing right, then the same five facing left.
export const TF={intact:0,damaged:1,critical:2,collapse:[3,4,5],archer:{right:6,left:11}} as const;
export const TA={watch:0,aim:1,release:2,nock:3,draw:4} as const;
export const TOWER_MOTION={
 releaseMs:110,nockMs:330,drawMs:600, // after a shot: the release (shown from the shot's tick), the nock, the draw, then the aim, held until the next shot (>= 800 ms)
 watchAfter:1500, // the bow is lowered this long after the last shot or target
 deadZone:8,turnHold:300, // a target this close to straight below keeps the facing; the least ms between two turns that are not a shot
 damaged:.66,critical:.33, // hp/maxHp below which the building shows its damage
 collapseKeys:[150,400],collapseHold:1400,collapseEnd:2000, // lean, fall, then rubble; fades from collapseHold and is gone at collapseEnd
} as const;
export type Facing=1|-1; // 1: the authored right-facing archer; -1: the left-facing set
// The building's frame. While a tower is built its hp only climbs from near zero, so it shows the intact building.
export function towerBodyFrame(hp:number,maxHp:number,building:boolean):number{
 if(building)return TF.intact;const r=hp/maxHp;return r<TOWER_MOTION.critical?TF.critical:r<TOWER_MOTION.damaged?TF.damaged:TF.intact;
}
// The archer's pose: the shot sequence from the last attack, then the aim while a target was seen lately, else the watch.
export function towerArcherPose(now:number,shotAt:number|undefined,targetAt:number):number{
 const M=TOWER_MOTION,t=shotAt===undefined?Infinity:now-shotAt;
 if(t>=0&&t<M.releaseMs)return TA.release;if(t>=0&&t<M.nockMs)return TA.nock;if(t>=0&&t<M.drawMs)return TA.draw;
 return now-Math.max(targetAt,shotAt??-Infinity)<M.watchAfter?TA.aim:TA.watch;
}
export const towerArcherFrame=(pose:number,facing:Facing)=>(facing===1?TF.archer.right:TF.archer.left)+pose;
// Facing toward a target; one almost straight above or below keeps the facing.
export const towerFaceToward=(facing:Facing,dx:number):Facing=>Math.abs(dx)<TOWER_MOTION.deadZone?facing:dx>0?1:-1;
// A destroyed tower's collapse: the frame and alpha t ms after its death, undefined once it is gone.
export function collapsePose(t:number):{frame:number;alpha:number}|undefined{
 const M=TOWER_MOTION,[a,b,c]=TF.collapse,[k1,k2]=M.collapseKeys;if(t>=M.collapseEnd)return undefined;
 return {frame:t<k1?a:t<k2?b:c,alpha:Math.min(1,Math.max(0,1-(t-M.collapseHold)/(M.collapseEnd-M.collapseHold)))};
}

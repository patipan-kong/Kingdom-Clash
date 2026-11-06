// Tavern V1.0 sprite animation (the Azure Tavern): the frame to show, as pure functions of simulation ms and of what the simulation already reports (the Tavern's hire and
// returned events, death, hp, construction). Render-only: nothing here feeds back into the simulation.
// One master (art/tavern-anim, the Tavern still), packed by scripts/pack-tavern-sheet.py into one trimmed atlas whose frames all share one 288 x 278 cell (the still at 0.75x)
// and its bottom-centre pivot, so every frame is drawn exactly where the still was. A Tavern is a wall-kind structure with 600 hp; there is only ever one.
// idleHeight: the intact building's height in the cell (drawn at the entity's height, as the still was); the tap box is the still's rectangle.
export const TAVERN_SHEET={key:'tavern-sheet',frameWidth:288,frameHeight:278,pivotX:144,pivotY:278,idleHeight:278} as const;
// Frame indices: intact (the still), the hire door, the revive bell and glow, the two damage states, then the collapse (roof buckles, walls fall, rubble).
export const TV={intact:0,hire:1,revive:2,damaged:3,critical:4,collapse:[5,6,7]} as const;
export const TAVERN_MOTION={
 hireMs:500, // the door shows open this long from the tick a hero is hired (the tavern hire event; the hero spawns on the same tick)
 reviveMs:900, // the bell and golden glow show this long from the tick a fallen hero returns (tavern returned), not when its revive starts
 damaged:.66,critical:.33, // hp/maxHp below which the building shows its damage
 collapseKeys:[150,400],collapseHold:1400,collapseEnd:2000, // roof buckles, walls fall, then rubble; fades from collapseHold and is gone at collapseEnd
} as const;
// The building's frame. While a Tavern is built its hp only climbs from near zero, so it shows the intact building (and the existing fade). A damage state always wins over a
// cue; the hire door and the revive glow show only on an intact building, each from its own tick for its own length, the later one first if both are running.
export function tavernFrame(hp:number,maxHp:number,building:boolean,now:number,hireAt?:number,returnAt?:number):number{
 if(building)return TV.intact;const r=hp/maxHp,M=TAVERN_MOTION;if(r<M.critical)return TV.critical;if(r<M.damaged)return TV.damaged;
 const hire=hireAt!==undefined&&now>=hireAt&&now-hireAt<M.hireMs,rev=returnAt!==undefined&&now>=returnAt&&now-returnAt<M.reviveMs;
 return hire&&rev?(returnAt!>=hireAt!?TV.revive:TV.hire):rev?TV.revive:hire?TV.hire:TV.intact;
}
// A destroyed Tavern's collapse: the frame and alpha t ms after its death, undefined once it is gone.
export function tavernCollapsePose(t:number):{frame:number;alpha:number}|undefined{
 const M=TAVERN_MOTION,[a,b,c]=TV.collapse,[k1,k2]=M.collapseKeys;if(t>=M.collapseEnd)return undefined;
 return {frame:t<k1?a:t<k2?b:c,alpha:Math.min(1,Math.max(0,1-(t-M.collapseHold)/(M.collapseEnd-M.collapseHold)))};
}

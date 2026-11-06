// Barracks V1.0 sprite animation (the Azure Barracks, which a repaired Elite Barracks also uses): the frame to show, as pure functions of simulation ms and of what the
// simulation already reports (spawn / death events, hp, construction). Render-only: nothing here feeds back into the simulation.
// One master (art/barracks-anim, the Azure Barracks still), packed by scripts/pack-barracks-sheet.py into one trimmed atlas whose frames all share the still's own
// 384 x 372 cell and its bottom-centre pivot, so every frame is drawn exactly where the still was. The Crimson Barracks keeps its still.
// idleHeight: the intact building's height in the cell (drawn at the entity's height, as the still was); the tap box is the still's rectangle.
export const BARRACKS_SHEET={azure:'barracks-sheet',frameWidth:384,frameHeight:372,pivotX:192,pivotY:372,idleHeight:372} as const;
// Frame indices: intact (the still), the recruiting door, the two damage states, then the collapse (roof buckles, walls fall, rubble).
export const BF={intact:0,recruit:1,damaged:2,critical:3,collapse:[4,5,6]} as const;
export const BARRACKS_MOTION={
 recruitMs:500, // the doorway shows open this long from the tick a soldier of this Barracks spawns (the next spawn time is private to the simulation, so the cue follows the spawn)
 damaged:.66,critical:.33, // hp/maxHp below which the building shows its damage
 collapseKeys:[150,400],collapseHold:1400,collapseEnd:2000, // roof buckles, walls fall, then rubble; fades from collapseHold and is gone at collapseEnd
} as const;
// The Barracks that trained a soldier: AzureBarracks names its soldiers blue-s-<barracks id>-<slot>-<serial>. Anything else (waves, allies, the Tavern's heroes) is not a recruit.
export const recruiterOf=(soldierId:string):string|undefined=>/^blue-s-(.+)-\d+-\d+$/.exec(soldierId)?.[1];
// The building's frame. While a Barracks is built its hp only climbs from near zero, so it shows the intact building (and the existing fade). A damage state always wins over
// the recruiting door; the door shows only on an intact building, from recruitAt (simulation ms) for recruitMs.
export function barracksFrame(hp:number,maxHp:number,building:boolean,now:number,recruitAt?:number):number{
 if(building)return BF.intact;const r=hp/maxHp;if(r<BARRACKS_MOTION.critical)return BF.critical;if(r<BARRACKS_MOTION.damaged)return BF.damaged;
 return recruitAt!==undefined&&now>=recruitAt&&now-recruitAt<BARRACKS_MOTION.recruitMs?BF.recruit:BF.intact;
}
// A destroyed Barracks' collapse: the frame and alpha t ms after its death, undefined once it is gone.
export function barracksCollapsePose(t:number):{frame:number;alpha:number}|undefined{
 const M=BARRACKS_MOTION,[a,b,c]=BF.collapse,[k1,k2]=M.collapseKeys;if(t>=M.collapseEnd)return undefined;
 return {frame:t<k1?a:t<k2?b:c,alpha:Math.min(1,Math.max(0,1-(t-M.collapseHold)/(M.collapseEnd-M.collapseHold)))};
}

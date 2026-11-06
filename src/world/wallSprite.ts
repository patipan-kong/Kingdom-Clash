// Wall V1.0 sprite animation (the Wooden Wall, the Frost Gate, the Cliff Gate, the Gatehouses and the Fortress / Throne Gate): the frames to show, as pure
// functions of simulation ms and of what the simulation already holds (hp, construction, which team a faction gate lets through, death events).
// Render-only: nothing here feeds back into the simulation.
// One master (art/wall-anim, one wooden wall segment, transparent at source), packed by scripts/pack-wall-sheet.py into one trimmed atlas whose frames all
// share one source cell: frame 0 is wall.png itself, so an intact wall is the still's own pixels. The ice and ironwood sheets are made at load from it by the
// stills' frostGatePixels and cliffGatePixels, and a gate is drawn as one segment per row of the old stacked texture, each depth-sorted at its own base.
// pivotY: the wall's base in the cell (wall.png's bottom row); height: wall.png's height in the cell.
export const WALL_SHEET={wood:'wall-wood',ice:'wall-ice',ironwood:'wall-ironwood',frameWidth:256,frameHeight:232,pivotX:128,pivotY:224,height:192} as const;
export const WF={intact:0,damaged:1,critical:2,breaking:3,rubble:4,ajar:5,open:6} as const;
export const WALL_MOTION={
 damaged:.66,critical:.33, // hp/maxHp below which a segment shows its damage
 ajarMs:100,holdMs:300, // a gate row is ajar this long while it opens and while it closes; it starts closing this long after the last passer left
 reach:36, // how far ahead of the gate (world px, beyond its side and the passer's radius) a passer opens it
 cover:.8, // the share of a row's height (from its base) that covers a unit behind it; the tips above are sparse
 stagger:80, // a gate's rows break this far apart, north to south
 breakMs:180,collapseHold:1400,collapseEnd:2000, // a row breaks, then lies as rubble; every row fades from collapseHold and is gone at collapseEnd after the death
} as const;
// A segment's frame for its structure's hp. While a wall is built its hp only climbs from near zero, so it shows the intact wall.
export function wallFrame(hp:number,maxHp:number,building:boolean):number{
 if(building)return WF.intact;const r=hp/maxHp;return r<WALL_MOTION.critical?WF.critical:r<WALL_MOTION.damaged?WF.damaged:WF.intact;
}
// The units a faction gate lets through: the simulation's own rule (structuresFor: a gate is transparent to the team that owns it, and to everyone while it
// stands open). A gate that stands open keeps today's look instead (translucent), so it never animates.
export const gatePasser=(gate:{gate?:true;team:string;open?:true},unit:{team:string;hp:number})=>!!gate.gate&&!gate.open&&unit.hp>0&&unit.team===gate.team;
// Whether a passer at (x,y) with this radius is at a gate row: within reach of the gate's side, and standing where the row's stakes cover it on screen, from
// just in front of the row's base line back to the stakes' height. baseY: the row's base in world y; top: the stakes' height in world px.
export function atGateRow(p:{x:number;y:number;radius:number},gate:{x:number;columns?:number},baseY:number,top:number):boolean{
 return Math.abs(p.x-gate.x)<(gate.columns??1)*24+p.radius+WALL_MOTION.reach&&p.y<=baseY+p.radius*.5&&p.y>=baseY-top;
}
// A gate row's opening: closed until a passer is at it, ajar while it opens, open while any passer is there, held open holdMs after the last one left, ajar
// while it closes. A passer arriving while it closes opens it again from where it is.
export type GateRow={openAt?:number;seenAt?:number};
export function gateRowFrame(row:GateRow,present:boolean,now:number,closed:number):{row:GateRow;frame:number}{
 const M=WALL_MOTION;
 if(present){const closing=row.seenAt!==undefined&&now-row.seenAt>=M.holdMs,openAt=row.openAt===undefined?now:closing?now-M.ajarMs:row.openAt;return {row:{openAt,seenAt:now},frame:now-openAt<M.ajarMs?WF.ajar:WF.open};}
 if(row.seenAt===undefined)return {row:{},frame:closed};
 const t=now-row.seenAt;if(t<M.holdMs)return {row,frame:WF.open};if(t<M.holdMs+M.ajarMs)return {row,frame:WF.ajar};return {row:{},frame:closed};
}
// A destroyed wall's row index (0 = north) t ms after its death: the frame (its last frame until its turn to break) and alpha, undefined once it is gone.
export function wallCollapsePose(t:number,index:number,last:number):{frame:number;alpha:number}|undefined{
 const M=WALL_MOTION;if(t>=M.collapseEnd)return undefined;const s=t-index*M.stagger;
 return {frame:s<0?last:s<M.breakMs?WF.breaking:WF.rubble,alpha:Math.min(1,Math.max(0,1-(t-M.collapseHold)/(M.collapseEnd-M.collapseHold)))};
}

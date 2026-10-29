import type {CampaignFrame} from './campaignLayout';

/** Chapter Select is one horizontal row of poster cards (logical 960×540): three fit at rest, more scroll sideways. */
export interface ChapterClip {left:number;right:number;top:number;bottom:number}
export const CHAPTER_CARD={width:280,height:336,gap:20,left:40,top:84};

export function chapterRowLayout(count:number){
 const {width,height,gap,left,top}=CHAPTER_CARD;
 const slots:CampaignFrame[]=Array.from({length:count},(_,i)=>({x:left+i*(width+gap),y:top,width,height}));
 const right=left+count*(width+gap)-gap;
 // The clip sits inside the 20 px gap so the previous card's edge never shows at the end of the row. The last card may scroll to the same margin the first card rests at; three cards need no scroll.
 return {slots,clip:{left:30,right:930,top:70,bottom:430} satisfies ChapterClip,minScroll:Math.min(0,960-left-right)};
}
export function chapterScroll(value:number,min:number){return Math.max(min,Math.min(0,value))+0;}
/** Scroll that brings a chapter to the left margin; clamped, so a chapter among the first three stays at rest. */
export function chapterScrollTo(index:number,min:number){return chapterScroll(-Math.max(0,index)*(CHAPTER_CARD.width+CHAPTER_CARD.gap),min);}
export function chapterCardVisible(frame:CampaignFrame,scroll:number,clip:ChapterClip){return frame.x+scroll>=clip.left&&frame.x+frame.width+scroll<=clip.right;}

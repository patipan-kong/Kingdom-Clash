export interface CampaignFrame {x:number;y:number;width:number;height:number}
export interface CampaignClip {top:number;bottom:number}

/** Logical 960×540 geometry; typography follows the scene's CSS-aware menuScale. */
/** A six-mission chapter is a 3 × 2 grid of 150 px cards that fits the clip without scrolling: 2 × 150 + 12 = 312 on every screen. A longer chapter adds rows and scrolls. */
export function campaignLayout(scale:number,count=6){
 const mobile=scale<.9,columns=3,gap=12,left=32,width=896,cardWidth=(width-(columns-1)*gap)/columns,cardHeight=150;
 const clip={top:108,bottom:108+2*cardHeight+gap};
 const slots=Array.from({length:count},(_,i)=>({x:left+(i%columns)*(cardWidth+gap),y:clip.top+Math.floor(i/columns)*(cardHeight+gap),width:cardWidth,height:cardHeight}));
 const bottom=slots.length?slots[slots.length-1].y+cardHeight:clip.top;
 return {mobile,columns,slots,clip,minScroll:Math.min(0,clip.bottom-bottom)};
}
export function campaignCardVisible(frame:CampaignFrame,scroll:number,clip:CampaignClip){return frame.y+scroll>=clip.top&&frame.y+frame.height+scroll<=clip.bottom;}
export function campaignScroll(value:number,min:number){return Math.max(min,Math.min(0,value));}

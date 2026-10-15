import {shopGridLayout} from './shopGridLayout';
/** CSS-sized Equipment shares Shop's control-column clearance and capped width. */
export function equipmentLayout(scale:number,topHudBottom:number,utilityX:number){
 const f=shopGridLayout(scale,topHudBottom,utilityX),s=f.scale;
 const y=f.compact?topHudBottom:f.y;
 const height=f.compact?Math.min(300/s,540-24/s-y):f.height;
 const gridWidth=f.compact?f.width-16/s:220/s,gap=(f.compact?2:8)/s;
 return {...f,y,height,gridWidth,gap,cellWidth:(gridWidth-2*gap)/3,cellHeight:(f.compact?48:76)/s,bodyTop:(f.compact?54:64)/s,detailWidth:f.compact?gridWidth:f.width-16/s-gridWidth-8/s};
}

/** CSS-pixel layout inside the existing FIT menu canvas. No campaign state. */
export function chapterMobileLayout(width:number,height:number,warning=false){
 const margin=12,gap=12,columns=2;
 const footerY=height-56-(warning?18:0),top=height<300?48:56;
 const inner=width-margin*2,backWidth=(inner-8)*.4;
 return{margin,gap,columns,cardWidth:(inner-gap*(columns-1))/columns,clip:{top,bottom:footerY-8},
  back:{x:margin,y:footerY,width:backWidth,height:48},fullBattle:{x:margin+backWidth+8,y:footerY,width:inner-backWidth-8,height:48}};
}

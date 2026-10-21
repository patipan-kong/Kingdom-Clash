/** CSS pixels inside the already safe-area-inset gameplay canvas. */
export function mobileResultLayout(width:number,height:number,actions:number){
 const w=Math.min(800,width-24),h=Math.min(360,height-24),x=(width-w)/2,y=(height-h)/2;
 const padding=16,gap=20,inner=w-padding*2,summaryWidth=Math.floor((inner-gap)*.43);
 const bodyY=y+88,footerY=y+h-64,bodyHeight=footerY-bodyY-12;
 const actionGap=12,actionWidth=(inner-actionGap*(actions-1))/actions;
 return {frame:{x,y,width:w,height:h},title:{x:width/2,y:y+18},subtitle:{x:width/2,y:y+53,width:inner},
  summary:{x:x+padding,y:bodyY,width:summaryWidth,height:bodyHeight},
  objectives:{x:x+padding+summaryWidth+gap,y:bodyY,width:inner-summaryWidth-gap,height:bodyHeight},
  buttons:Array.from({length:actions},(_,i)=>({x:x+padding+i*(actionWidth+actionGap),y:footerY,width:actionWidth,height:48}))};
}

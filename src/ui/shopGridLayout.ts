/** CSS-sized Shop in the existing 960x540 FIT canvas. top is actual HUD clearance. */
export function shopGridLayout(scale:number,topHudBottom:number,utilityX:number){
 const s=Math.max(.1,scale),canvasWidth=960*s,canvasHeight=540*s;
 const compact=canvasWidth<880||canvasHeight<480;
 const x=124,right=utilityX*s-30,width=Math.min(compact?272:480,right-x);
 const height=Math.min(compact?248:328,canvasHeight-24-(topHudBottom*s+8));
 const y=Math.max(topHudBottom*s+8,Math.min(compact?118:156,canvasHeight-24-height));
 return {x:x/s,y:y/s,width:width/s,height:height/s,scale:s,touch:48/s,compact};
}

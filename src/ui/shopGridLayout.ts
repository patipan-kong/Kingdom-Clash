import {panelSpan,shortCanvas} from './panelSpan';
/** CSS-sized Shop in the existing 960x540 FIT canvas. top is actual HUD clearance. */
export function shopGridLayout(scale:number,topHudBottom:number,utilityX:number){
 const s=Math.max(.1,scale),canvasWidth=960*s,canvasHeight=540*s;
 const compact=canvasWidth<880||canvasHeight<480;
 const x=124,right=utilityX*s-30,width=compact?panelSpan(s,utilityX,272,x):Math.min(480,right-x);
 const short=shortCanvas(s),height=short?Math.min(248,canvasHeight-16):Math.min(compact?248:328,canvasHeight-24-(topHudBottom*s+8));
 const y=short?8:Math.max(topHudBottom*s+8,Math.min(compact?118:156,canvasHeight-24-height));
 return {x:x/s,y:y/s,width:width/s,height:height/s,scale:s,touch:48/s,compact};
}

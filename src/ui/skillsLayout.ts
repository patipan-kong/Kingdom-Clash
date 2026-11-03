import {panelSpan,shortCanvas} from './panelSpan';
/** CSS pixel sizing within the existing logical 960×540 FIT canvas. */
export function skillsLayout(scale:number,top:number,utilityX:number){
 const s=Math.max(.1,scale),compact=960*s<880||540*s<480;
 const short=shortCanvas(s),width=panelSpan(s,utilityX,compact?272:550),height=short?Math.min(232,540*s-16):compact?232:360;
 return{x:124/s,y:(short?8:top*s+8)/s,width:width/s,height:height/s,compact,scale:s};
}

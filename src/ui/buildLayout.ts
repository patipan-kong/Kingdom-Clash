import {panelSpan} from './panelSpan';
/** CSS-sized construction tray: two rows (what is being built and how it is going, then the buttons), the same size before and after a selection.
 * It sits at the bottom, between the joystick and the right-hand controls, or at the top under the HUD plates; BuildPanel picks one when it opens and keeps it. */
export type BuildPosition='bottom'|'top';
export function buildLayout(scale:number,top:number,utilityX:number,_collapsed:boolean,position:BuildPosition='bottom',cards=2){
 const s=Math.max(.1,scale),compact=960*s<880||540*s<480;
 const x=124/s,base=compact?panelSpan(s,utilityX,272):Math.min(320,utilityX*s-30-124);
 // The late Campaign tray can show five choices. Keep each target 44 CSS px when the canvas has room.
 const minWidth=cards>2?16+48+cards*(44+4):0,width=Math.max(base,Math.min(minWidth,960*s-132))/s;
 const height=100/s,y=position==='top'?Math.max(top+8/s,0):540-24/s-height;
 return{x,y,width,height,compact,scale:s,position,cardHeight:48/s,cardY:y+44/s,statusY:y+26/s,actionY:y+44/s,infoY:y+8/s};
}

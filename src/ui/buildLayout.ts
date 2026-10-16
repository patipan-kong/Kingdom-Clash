/** CSS-sized construction tray; selection shortens it to expose battlefield cells. */
export function buildLayout(scale:number,top:number,utilityX:number,collapsed:boolean){
 const s=Math.max(.1,scale),compact=960*s<880||540*s<480;
 const x=124/s,width=Math.min(collapsed||compact?272:360,utilityX*s-30-124)/s;
 const height=(collapsed?120:232)/s,y=collapsed?540-24/s-height:Math.max(top+8/s,Math.min(118/s,540-24/s-height));
 return{x,y,width,height,compact,scale:s,cardHeight:(collapsed?48:96)/s,cardY:y+32/s,statusY:y+(collapsed?44:136)/s,actionY:y+height-56/s};
}

/** Chapter 5 Phase 1B Tavern panel (docs/CHAPTER5_PHASE1B.md): a centred modal in the HUD's logical 960x540 space; sizes are CSS pixels (scale = CSS px per logical px).
 * One row per mercenary on offer (name, role and stats on the left; a primary button, Hire / Revive / the time left, and a Dismiss button on the right), a status line, and a close button in the header.
 * Every button is as tall as its row (40 CSS px on a short phone landscape, 48 otherwise). */
export const TAVERN_ROWS=3;
export type TavernLayout=ReturnType<typeof tavernLayout>;
export function tavernLayout(scale:number,rows:number){
 const s=Math.max(.1,scale),p=(v:number)=>v/s,short=540*s<360,n=Math.max(1,Math.min(TAVERN_ROWS,rows));
 const pad=p(10),gap=p(4),head=p(34),foot=p(26),rowHeight=p(short?40:48);
 const width=p(Math.min(520,960*s-32)),height=pad*2+head+n*rowHeight+(n-1)*gap+foot;
 const x=(960-width)/2,y=Math.max(p(4),(540-height)/2);
 const primary={width:p(short?132:150)},dismiss={width:p(short?76:84)},inner=width-2*pad;
 const list=Array.from({length:n},(_,i)=>{
  const ry=y+pad+head+i*(rowHeight+gap),dx=x+width-pad-dismiss.width,px=dx-p(6)-primary.width;
  return {x:x+pad,y:ry,width:inner,height:rowHeight,info:{x:x+pad+p(8),width:px-(x+pad+p(8))-p(6)},primary:{x:px,y:ry,width:primary.width,height:rowHeight},dismiss:{x:dx,y:ry,width:dismiss.width,height:rowHeight}};
 });
 const size=p(44);
 return {x,y,width,height,scale:s,short,pad,head,font:{title:p(short?15:17),name:p(short?14:15),info:p(short?11:12),button:p(short?12:13),status:p(short?12:13)},
  title:{x:x+pad,y:y+pad+head/2},resources:{x:x+width-pad-size-p(6),y:y+pad+head/2},close:{x:x+width-pad-size/2,y:y+pad+head/2,size},
  rows:list,status:{x:x+pad,y:y+height-pad-foot/2,width:inner}};
}

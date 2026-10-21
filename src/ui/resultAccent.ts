import Phaser from 'phaser';
import {FANTASY} from './fantasyTheme';
// Restrained Victory/Defeat dressing drawn with plain Graphics: corner brackets, a coloured rule under the frame's top edge, a small
// shield emblem either side of the title and thin dividers. Gold for Victory, muted red for Defeat. No animation, no new artwork.
export type Frame={x:number;y:number;width:number;height:number};
export const resultTone=(victory:boolean)=>victory?{main:FANTASY.goldBright,dim:FANTASY.gold,text:'#ffe4a0',emblem:0xffe4a0}:{main:0xc9615a,dim:0x8c3f39,text:'#ffaea4',emblem:0xd98a82};
function shield(g:Phaser.GameObjects.Graphics,cx:number,cy:number,r:number,victory:boolean){
 const t=resultTone(victory);
 g.fillStyle(0x0a1b2b,.95).fillCircle(cx,cy,r*1.28);g.lineStyle(Math.max(1,r*.12),t.main,.9).strokeCircle(cx,cy,r*1.28);
 g.fillStyle(t.dim,.9).fillPoints([{x:cx-r*.8,y:cy-r*.75},{x:cx+r*.8,y:cy-r*.75},{x:cx+r*.8,y:cy+r*.1},{x:cx,y:cy+r*.95},{x:cx-r*.8,y:cy+r*.1}],true);
 if(victory){const pts:{x:number;y:number}[]=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,k=i%2?r*.2:r*.5;pts.push({x:cx+Math.cos(a)*k,y:cy-r*.08+Math.sin(a)*k});}g.fillStyle(0xfff3d3,1).fillPoints(pts,true);}
 else{const k=r*.3,y=cy-r*.1;g.lineStyle(Math.max(1.5,r*.16),0xfff3d3,.95).lineBetween(cx-k,y-k,cx+k,y+k).lineBetween(cx-k,y+k,cx+k,y-k);}
}
export function drawResultAccent(g:Phaser.GameObjects.Graphics,f:Frame,victory:boolean,title:{y:number;halfWidth:number},scale:number){
 const p=(n:number)=>n/Math.max(.1,scale),t=resultTone(victory),inset=p(10),len=p(22);
 g.clear();
 g.fillGradientStyle(t.dim,t.main,t.main,t.dim,.85).fillRect(f.x+p(26),f.y+p(4),f.width-p(52),p(3));
 g.lineStyle(p(2),t.main,.85);
 for(const [sx,sy] of [[0,0],[1,0],[0,1],[1,1]]){
  const x=f.x+(sx?f.width-inset:inset),y=f.y+(sy?f.height-inset:inset),dx=sx?-len:len,dy=sy?-len:len;
  g.lineBetween(x,y,x+dx,y).lineBetween(x,y,x,y+dy);g.fillStyle(t.main,.9).fillCircle(x,y,p(2.2));
 }
 const r=p(13),gap=p(30);shield(g,f.x+f.width/2-title.halfWidth-gap,title.y,r,victory);shield(g,f.x+f.width/2+title.halfWidth+gap,title.y,r,victory);
}
export function drawResultRule(g:Phaser.GameObjects.Graphics,x:number,y:number,width:number,victory:boolean,scale:number){
 const p=(n:number)=>n/Math.max(.1,scale),t=resultTone(victory);
 g.lineStyle(p(1),0x6d8a99,.35).lineBetween(x,y,x+width,y);g.lineStyle(p(1),t.main,.5).lineBetween(x+width*.3,y+p(1),x+width*.7,y+p(1));g.fillStyle(t.main,.85).fillRect(x+width/2-p(3),y-p(2.5),p(6),p(6));
}

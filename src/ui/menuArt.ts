import type Phaser from 'phaser';
import type {Frame} from './fantasyTheme';

export const MENU_TITLE_FONT='Georgia, "Times New Roman", serif';
const crestKey='item-guardian-shield';
export function preloadMenuArt(scene:Phaser.Scene){
 if(!scene.textures.exists(crestKey))scene.load.image(crestKey,import.meta.env.BASE_URL+'assets/item-guardian-shield.png');
}
export function createMenuCrest(scene:Phaser.Scene){return scene.add.image(0,0,crestKey).setName('menu-azure-crest');}
export function placeMenuCrest(image:Phaser.GameObjects.Image,f:Frame,scale:number){
 const short=f.y*scale<20,height=(short?20:28)/scale;
 image.setScale(height/image.height).setPosition(f.x+f.width/2,f.y+(short?3:0)/scale);
}
export function finishMenuTitle(text:Phaser.GameObjects.Text,scale:number){
 text.setFontFamily(MENU_TITLE_FONT).setResolution(Math.min(3,Math.max(1,devicePixelRatio||1)))
  .setStroke('#24190c',1/scale).setShadow(0,2/scale,'#01070d',3/scale,true,true);
 const fill=text.context.createLinearGradient(0,0,0,text.canvas.height);
 fill.addColorStop(0,'#fff7d0');fill.addColorStop(.45,'#ffe29a');fill.addColorStop(.58,'#e8b951');fill.addColorStop(1,'#b57726');
 text.setFill(fill);return text;
}

type Point={x:number;y:number};
const polygon=(g:Phaser.GameObjects.Graphics,points:Point[],color:number,alpha=1)=>g.fillStyle(color,alpha).fillPoints(points,true);
const shape=(x:number,y:number,w:number,h:number,c:number)=>[{x:x+c,y},{x:x+w-c,y},{x:x+w,y:y+c},{x:x+w,y:y+h-c},{x:x+w-c,y:y+h},{x:x+c,y:y+h},{x,y:y+h-c},{x,y:y+c}];
const mix=(a:number,b:number,t:number)=>{
 const channel=(shift:number)=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t);
 return (channel(16)<<16)|(channel(8)<<8)|channel(0);
};
/** Solid horizontal bands avoid the triangular sheen of Graphics gradients on rounded paths. Static drawing only. */
function gradient(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,cut:number,colors:number[]){
 const bands=48;
 for(let i=0;i<bands;i++){
  const top=h*i/bands,bottom=h*(i+1)/bands,t=i/(bands-1)*(colors.length-1),k=Math.min(colors.length-2,Math.floor(t));
  const inset=Math.max(0,cut-top,cut-(h-bottom));
  g.fillStyle(mix(colors[k],colors[k+1],t-k),1).fillRect(x+inset,y+top,w-inset*2,bottom-top+.15);
 }
}

/** Menu-local treatment: shared theme helpers and other screens are deliberately untouched. */
export function drawOrnateMenuPanel(g:Phaser.GameObjects.Graphics,f:Frame,scale:number){
 const p=(n:number)=>n/scale,{x,y,width:w,height:h}=f,c=p(10);g.clear();
 polygon(g,shape(x+p(2),y+p(6),w,h,c),0x00060c,.7);
 gradient(g,x,y,w,h,c,[0x10364e,0x0a293d,0x061a2a,0x04121e]);
 // A quiet painted-looking horizon: layered ridges, mist and a distant Azure watchtower.
 const ridge=(coords:number[],base:number,color:number,alpha:number)=>polygon(g,[{x:x+p(7),y:y+h*base},...Array.from({length:coords.length/2},(_,i)=>({x:x+w*coords[i*2],y:y+h*coords[i*2+1]})),{x:x+w-p(7),y:y+h*base}],color,alpha);
 ridge([.012,.32,.07,.22,.105,.14,.17,.3,.23,.21,.33,.36,.45,.27,.55,.39,.67,.23,.76,.31,.83,.16,.9,.26,.988,.12],.985,0x245e77,.18);
 ridge([.012,.42,.065,.35,.12,.48,.19,.32,.28,.45,.38,.36,.49,.51,.61,.38,.71,.45,.8,.29,.87,.37,.94,.23,.988,.33],.985,0x082437,.5);
 // Fade the foothills into the lower panel instead of ending them at a hard horizontal edge.
 for(let i=0;i<32;i++){const t=i/31;g.fillStyle(0x04121e,t*.86).fillRect(x+p(7),y+h*(.38+i*.6/32),w-p(14),h*.6/32+.15);}
 g.fillStyle(0x8eafbd,.035).fillEllipse(x+w*.37,y+h*.4,w*.61,p(18));
 const towerX=x+w*.895,towerY=y+h*.28,towerW=p(10);
 g.fillStyle(0x041725,.7).fillRect(towerX,towerY,towerW,h*.23).fillTriangle(towerX-p(2),towerY,towerX+towerW/2,towerY-p(10),towerX+towerW+p(2),towerY);
 g.fillStyle(0x041725,.7).fillRect(towerX-p(9),towerY+p(15),p(8),h*.18).fillRect(towerX+towerW+p(1),towerY+p(10),p(7),h*.2);
 g.fillStyle(0x8db6c9,.05);for(let i=0;i<12;i++)g.fillCircle(x+w*(.07+i*.077),y+h*(.1+(i%3)*.027),p(.6));
 // Metal rim: dark seat, warm gold bevel, cold-blue inner lip and a restrained edge light.
 g.lineStyle(p(5),0x281e11,1).strokePoints(shape(x,y,w,h,c),true);
 g.lineStyle(p(3),0xb7842e,1).strokePoints(shape(x,y,w,h,c),true);
 g.lineStyle(p(1),0xffe9a5,.95).strokePoints(shape(x+p(1),y+p(1),w-p(2),h-p(2),c),true);
 g.lineStyle(p(1),0x34596b,.9).strokePoints(shape(x+p(5),y+p(5),w-p(10),h-p(10),c-p(2)),true);
 g.lineStyle(p(1),0x040c12,.9).strokePoints(shape(x+p(7),y+p(7),w-p(14),h-p(14),c-p(2)),true);
 g.lineStyle(p(1.5),0xf6d87f,.8).lineBetween(x+p(30),y,w+x-p(30),y).lineBetween(x+p(30),y+h,w+x-p(30),y+h);
 for(const sx of [-1,1])for(const sy of [-1,1]){
  const cx=sx===1?x:x+w,cy=sy===1?y:y+h;
  const pts=(a:number[])=>Array.from({length:a.length/2},(_,i)=>({x:cx+sx*p(a[i*2]),y:cy+sy*p(a[i*2+1])}));
  const ornament=pts([0,25,0,10,10,0,32,0,26,5,14,5,5,14,5,25]);
  polygon(g,ornament,0xbd842d);g.lineStyle(p(1),0xffdf87,1).strokePoints(ornament,true);
  polygon(g,pts([1,19,2,10,10,2,23,2,12,7,7,12]),0xffdf7f,.75);
  g.lineStyle(p(.8),0x734413,1).strokePoints(pts([3,24,6,13,14,6,27,3]),false);
 }
 // Crest backing and laurel branches; the heraldic shield is an existing Azure item texture.
 const cx=x+w/2,short=y*scale<20,cy=y+p(short?3:0),leafScale=short?.75:1;
 g.fillStyle(0x061a2b,1).fillEllipse(cx,cy,p(82*leafScale),p(20*leafScale));
 for(const side of [-1,1]){
  g.lineStyle(p(.9),0xc99c45,.9).lineBetween(cx+side*p(12*leafScale),cy+p(5*leafScale),cx+side*p(46*leafScale),cy-p(3*leafScale));
  for(let i=0;i<5;i++){
   const lx=cx+side*p((18+i*6)*leafScale),ly=cy+p((3-i*1.5)*leafScale);
   polygon(g,[{x:lx,y:ly},{x:lx-side*p(4*leafScale),y:ly-p(7*leafScale)},{x:lx+side*p(1*leafScale),y:ly-p(5*leafScale)},{x:lx+side*p(3*leafScale),y:ly-p(1*leafScale)}],i%2?0xb7842e:0xeac76b);
  }
 }
 drawMenuRule(g,cx-p(38),y+h,p(76),scale);
}

export function drawMenuRule(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,scale:number){
 const p=(n:number)=>n/scale,cx=x+w/2;
 for(let i=0;i<6;i++){
  const a=.18+i*.1,segment=(w/2-p(8))/6;
  g.lineStyle(p(.8),0xd7ae57,a).lineBetween(x+i*segment,y,x+(i+1)*segment,y).lineBetween(x+w-i*segment,y,x+w-(i+1)*segment,y);
 }
 const d=p(3);polygon(g,[{x:cx,y:y-d},{x:cx+d,y},{x:cx,y:y+d},{x:cx-d,y}],0xffe2a0);
 g.lineStyle(p(.7),0x946023,1).strokePoints([{x:cx,y:y-d},{x:cx+d,y},{x:cx,y:y+d},{x:cx-d,y}],true);
}

export function drawOrnateMenuButton(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,scale:number,primary:boolean,pressed=false){
 const p=(n:number)=>n/scale,c=p(primary?10:7),down=pressed?p(1.5):0;g.clear();y+=down;h-=down;
 polygon(g,shape(x,y+p(3),w,h,c),0x00060d,.75);
 if(primary){g.lineStyle(p(6),0xf4b72f,.07).strokePoints(shape(x,y,w,h,c),true);g.lineStyle(p(3),0xffd86c,.15).strokePoints(shape(x,y,w,h,c),true);}
 gradient(g,x,y,w,h,c,primary?(pressed?[0xe9b147,0xd8951f,0xb97814]:[0xffeeb0,0xffd45c,0xf5b322,0xe99e14,0xffd264]):(pressed?[0x184258,0x092338,0x061623]:[0x2b6079,0x16435c,0x0b2d44,0x061b2b]));
 g.lineStyle(p(primary?2:1.25),primary?0xb5761b:0xb79b5d,1).strokePoints(shape(x,y,w,h,c),true);
 g.lineStyle(p(1),primary?0xfff1b9:0x8caeb9,primary?.95:.65).strokePoints(shape(x+p(2.5),y+p(2.5),w-p(5),h-p(5),Math.max(p(3),c-p(2))),true);
 g.lineStyle(p(primary?1.4:1),primary?0xfff9d8:0x90b8c8,primary?.9:.45).lineBetween(x+c+p(4),y+p(3),x+w-c-p(4),y+p(3));
 g.lineStyle(p(1),primary?0x8f5714:0x020d18,.8).lineBetween(x+c,y+h-p(3),x+w-c,y+h-p(3));
 if(primary)for(const side of [-1,1]){const sx=side<0?x:x+w;g.lineStyle(p(1),0xffefb0,.75).lineBetween(sx-p(3),y+h/2,sx+p(3),y+h/2);}
}

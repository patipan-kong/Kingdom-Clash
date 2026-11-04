import type Phaser from 'phaser';
export type MenuIcon='campaign'|'achievements'|'start'|'resume'|'levelSelect'|'restart'|'fullscreen'|'audio'|'mainMenu';
/** Lightweight decorative menu marks. No input or asset loading. */
export function drawMenuIcon(g:Phaser.GameObjects.Graphics,icon:MenuIcon,x:number,y:number,size:number,color:number){
 g.clear();g.setPosition(x,y);const u=size/20;
 g.lineStyle(1.8*u,color,1);g.fillStyle(color,1);
 const line=(a:number,b:number,c:number,d:number)=>g.lineBetween(a*u,b*u,c*u,d*u);
 const rect=(a:number,b:number,w:number,h:number)=>g.strokeRect(a*u,b*u,w*u,h*u);
 switch(icon){
 case 'start':line(-8,-8,8,8);line(8,-8,-8,8);line(-9,3,-3,9);line(3,9,9,3);line(-8,-8,-3,-7);line(8,-8,3,-7);break;
 case 'resume':g.fillTriangle(-5*u,-8*u,-5*u,8*u,8*u,0);break;
 case 'campaign':rect(-7,-7,14,14);line(-3,-7,-3,7);line(3,-7,3,7);line(-7,-9,-7,9);line(7,-9,7,9);break;
 case 'achievements':g.strokePoints([{x:-6*u,y:-8*u},{x:6*u,y:-8*u},{x:5*u,y:1*u},{x:0,y:5*u},{x:-5*u,y:1*u}],true);line(-6,-5,-9,-5);line(-9,-5,-8,0);line(-8,0,-5,2);line(6,-5,9,-5);line(9,-5,8,0);line(8,0,5,2);line(0,5,0,9);line(-5,9,5,9);break;
 case 'levelSelect':line(-6,-9,-6,9);g.fillPoints([{x:-5*u,y:-8*u},{x:8*u,y:-6*u},{x:5*u,y:0},{x:-5*u,y:-1*u}],true);break;
 case 'restart':g.beginPath().arc(0,0,7*u,-Math.PI*.35,Math.PI*1.25).strokePath();line(-5,-5,-9,-5);line(-9,-5,-9,-1);break;
 case 'fullscreen':for(const sx of [-1,1])for(const sy of [-1,1]){line(sx*8,sy*3,sx*8,sy*8);line(sx*8,sy*8,sx*3,sy*8);}break;
 case 'audio':g.fillPoints([{x:-9*u,y:-3*u},{x:-5*u,y:-3*u},{x:1*u,y:-8*u},{x:1*u,y:8*u},{x:-5*u,y:3*u},{x:-9*u,y:3*u}],true);line(5,-4,7,-1);line(7,-1,7,1);line(7,1,5,4);line(8,-7,10,-3);line(10,-3,10,3);line(10,3,8,7);break;
 case 'mainMenu':g.fillTriangle(-10*u,-1*u,0,-9*u,10*u,-1*u);rect(-6,-1,12,10);line(0,3,0,9);break;
 }
}

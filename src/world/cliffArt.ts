// Chapter 4 M2: the presentation of the Cliff Pass's two new pieces, drawn without new image files.
// Presentation only: collision, sight and hit points come from the structures (Simulation.gate, the Ballista placement); nothing here feeds back into the simulation.
import {GRID,projection} from './layout';

// The faction gate (a red wall of 1 column x 3 rows, MatchGate.faction) reuses the shared wooden wall art stacked three rows high and recoloured to dark ironwood, like the Frost Gate's two rows (frostGateAppearance.ts).
export const cliffGateTexture='cliff-gate';
export const cliffGateRows=3;
// The wall sprite is 176 x 192 and is drawn at 60 / 192 of its size; one grid row of depth on screen is GRID * projection.y px, so each further row's base sits this many texture pixels lower.
export const cliffGateRowOffset=Math.round(GRID*projection.y*192/60);
// 1 x 3 footprint, 108 high so the stacked texture keeps the wall's scale (the Frost Gate's 79 is two rows).
export const cliffGateVisual={name:'Cliff Gate',texture:cliffGateTexture,width:47,height:108} as const;
export const isFactionGate=(u:{gate?:true})=>!!u.gate;
// Chapter 5 M6: the Crimson Throne's gate (the shared Fortress Gate id) is the Throne Gate in the world label, the inspector and the toast, as in its mission text.
export const throneGateName='Throne Gate';
export const isThroneGate=(field:string,id:string|undefined)=>field==='crimson-throne'&&id==='red-fortress-gate';
// Wood and iron become dark red-brown ironwood, keeping the sprite's shading and alpha.
export function cliffGatePixels(pixels:Uint8ClampedArray):void{
 for(let i=0;i<pixels.length;i+=4){
  if(!pixels[i+3])continue;
  const l=.3*pixels[i]+.59*pixels[i+1]+.11*pixels[i+2];
  pixels[i]=Math.min(255,l*.85+42);pixels[i+1]=Math.min(255,l*.5+22);pixels[i+2]=Math.min(255,l*.45+24);
 }
}

// The Azure Ballista: a stone footing, a wooden stock with two bow arms and a drawn string, a loaded bolt and a blue pennant, on a canvas texture Battle bakes once per game.
export const ballistaTexture='azure-ballista';
export const ballistaVisual={name:'Ballista',texture:ballistaTexture,width:80,height:84} as const;
export function drawBallistaTexture(texture:Phaser.Textures.CanvasTexture){
 const c=texture.context;
 c.fillStyle='rgba(20,53,43,.32)';c.beginPath();c.ellipse(48,88,38,9,0,0,Math.PI*2);c.fill();
 c.fillStyle='#7d878a';c.beginPath();c.ellipse(46,82,34,11,0,0,Math.PI*2);c.fill();c.fillStyle='#a3adb0';c.beginPath();c.ellipse(46,78,28,8,0,0,Math.PI*2);c.fill();
 c.fillStyle='#5a4230';c.fillRect(40,52,12,28);c.fillStyle='#7a5a40';c.fillRect(40,52,4,28);
 c.fillStyle='#6b4f36';c.fillRect(14,44,64,10);c.fillStyle='#8a6a4a';c.fillRect(14,44,64,3);
 c.strokeStyle='#3d2a1a';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(46,48);c.quadraticCurveTo(10,40,6,12);c.moveTo(46,48);c.quadraticCurveTo(82,40,86,12);c.stroke();
 c.strokeStyle='#8a6a4a';c.lineWidth=3;c.beginPath();c.moveTo(46,48);c.quadraticCurveTo(10,40,6,12);c.moveTo(46,48);c.quadraticCurveTo(82,40,86,12);c.stroke();
 c.strokeStyle='#e9eef0';c.lineWidth=1.5;c.beginPath();c.moveTo(6,12);c.lineTo(46,34);c.lineTo(86,12);c.stroke();
 c.strokeStyle='#4a3626';c.lineWidth=3;c.beginPath();c.moveTo(46,34);c.lineTo(46,2);c.stroke();
 c.fillStyle='#d9dee0';c.beginPath();c.moveTo(46,1);c.lineTo(42,10);c.lineTo(50,10);c.closePath();c.fill();
 c.fillStyle='#2e8fd1';c.beginPath();c.moveTo(78,44);c.lineTo(94,40);c.lineTo(88,48);c.lineTo(94,56);c.lineTo(78,52);c.closePath();c.fill();
 c.fillStyle='#f3d27a';c.beginPath();c.arc(46,56,3,0,Math.PI*2);c.fill();
 texture.refresh();
}
// The Ballista's ruin on the cliff shelf: a stone footing, a broken stock and a splintered bow arm, drawn on a Graphics at the cell's view position (r = centre of the cell, as Battle.drawPost draws the tower ruin).
export function drawBallistaRuin(g:Phaser.GameObjects.Graphics,x:number,y:number){
 g.fillStyle(0x3a3f3c,.55).fillEllipse(x,y+6,58,20);
 g.fillStyle(0x8c9496).fillEllipse(x,y+3,46,14);g.fillStyle(0xa8b0b2).fillEllipse(x,y,36,9);
 for(const [dx,dy,w,h,shade] of [[-18,6,12,7,0x6c7476],[16,5,14,8,0x7a8284],[22,-1,8,6,0x6c7476]] as const)g.fillStyle(shade).fillEllipse(x+dx,y+dy,w,h);
 g.fillStyle(0x6b5a46).fillRect(x-14,y-8,22,5).fillRect(x-3,y-16,5,12);
 g.lineStyle(4,0x6b4f36).lineBetween(x+6,y-8,x+24,y-22).lineBetween(x-12,y-8,x-24,y-14);
 g.lineStyle(1,0xcfd6d8,.7).lineBetween(x+24,y-22,x+18,y-12);
}

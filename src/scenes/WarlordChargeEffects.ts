import type Phaser from 'phaser';
import type {GameEvent} from '../simulation/GameState';
import {warlordCharge,type WarlordChargeCast} from '../simulation/WarlordCharge';
import {projection} from '../world/layout';

type ChargeEnd=Extract<GameEvent,{type:'warlord-charge-end'}>;
const fadeMs=360,py=projection.y;

function capsule(g:Phaser.GameObjects.Graphics,cast:Readonly<WarlordChargeCast>,distance:number,radius:number){
 const {dx,dy}=cast;
 g.beginPath().moveTo(-dy*radius,dx*radius*py);
 for(let i=0;i<=12;i++){
  const a=Math.PI/2-i*Math.PI/12,along=distance+Math.cos(a)*radius,side=Math.sin(a)*radius;
  g.lineTo(dx*along-dy*side,(dy*along+dx*side)*py);
 }
 for(let i=0;i<=12;i++){
  const a=-Math.PI/2-i*Math.PI/12,along=Math.cos(a)*radius,side=Math.sin(a)*radius;
  g.lineTo(dx*along-dy*side,(dy*along+dx*side)*py);
 }
 g.closePath();
}

export class WarlordChargeEffects {
 private readonly warning:Phaser.GameObjects.Graphics;
 private readonly trail:Phaser.GameObjects.Graphics;
 private end?:ChargeEnd;
 private endedAt=0;
 private warningTick=-1;

 constructor(scene:Phaser.Scene){
  this.warning=scene.add.graphics().setName('warlord-charge-telegraph').setDepth(4).setVisible(false);
  this.trail=scene.add.graphics().setName('warlord-charge-trail').setDepth(2498).setVisible(false);
 }
 clear(){
  this.end=undefined;
  this.warningTick=-1;
  this.warning.clear().setVisible(false);
  this.trail.clear().setVisible(false);
 }
 landed(end:ChargeEnd,now:number){this.end=end;this.endedAt=now;}

 draw(cast:WarlordChargeCast|undefined,tick:number,now:number){
  if(cast&&cast.travelled===0)this.drawWarning(cast,tick);
  else if(this.warning.visible)this.warning.clear().setVisible(false);
  if(cast?.travelled){this.drawTrail(cast,cast.travelled,1);return;}
  const end=this.end,age=(now-this.endedAt)/fadeMs;
  if(end&&age<1){
   this.drawTrail(end.cast,end.cast.travelled,(1-age)**1.35);
   if(end.hit)this.drawImpact(end.cast,end.hit,age);
  }else if(this.trail.visible){this.end=undefined;this.trail.clear().setVisible(false);}
 }

 private drawWarning(cast:WarlordChargeCast,tick:number){
  const g=this.warning;
  if(g.visible&&this.warningTick===tick)return;
  this.warningTick=tick;
  const {x,y,distance,radius,dx,dy}=cast,progress=Math.min(1,(tick-cast.startTick)/warlordCharge.windupTicks);
  g.clear().setPosition(x,y*py).setVisible(true).lineStyle(7,0x411328,.95);
  capsule(g,cast,distance,radius);
  g.fillStyle(0xb31438,.32+.29*progress).fillPath().strokePath();
  g.lineStyle(3,0xffe4aa,.98);
  capsule(g,cast,distance,radius);
  g.strokePath();
  capsule(g,cast,distance*progress,radius);
  g.fillStyle(0xff4a48,.12+.24*progress).fillPath();
  g.lineStyle(3,0xffb66e,.64+.32*progress);
  for(let along=38;along<=distance;along+=43){
   const tx=dx*along,ty=dy*along,bx=tx-dx*16,by=ty-dy*16;
   g.lineBetween(bx-dy*9,(by+dx*9)*py,tx,ty*py).lineBetween(tx,ty*py,bx+dy*9,(by-dx*9)*py);
  }
 }

 private drawTrail(cast:Readonly<WarlordChargeCast>,distance:number,alpha:number){
  const {x,y,dx,dy}=cast,g=this.trail;
  g.clear().setPosition(x,y*py).setVisible(true);
  if(distance<=0)return;
  const tail=Math.max(0,distance-156);
  const width=cast.radius*.95,headX=dx*distance,headY=dy*distance;
  g.fillStyle(0xca1540,.66*alpha).fillTriangle(dx*tail,dy*tail*py,
   headX-dy*width,(headY+dx*width)*py,headX+dy*width,(headY-dx*width)*py);
  g.fillStyle(0xff583b,.63*alpha).fillTriangle(dx*(tail+distance)*.5,dy*(tail+distance)*.5*py,
   headX-dy*width*.45,(headY+dx*width*.45)*py,headX+dy*width*.45,(headY-dx*width*.45)*py);
  for(let i=0;i<6;i++){
   const r=tail+(distance-tail)*(i+1)/7;
   const side=(i%2===0?1:-1)*(11+i%3*5);
   const px=dx*r-dy*side,pY=(dy*r+dx*side)*py;
   g.fillStyle(0xcb9565,.25*alpha).fillEllipse(px,pY,22-i,11-i*.8);
   g.lineStyle(i%2===0?3:2,i%2===0?0xffc364:0xff6650,.8*alpha)
    .lineBetween(px-dx*15,pY-dy*15*py,px,pY);
  }
  for(let i=-1;i<=1;i++){
   const from=tail+(distance-tail)*Math.abs(i)*.27,side=i*width*.6;
   g.lineStyle(i===0?3:2,i===0?0xffda96:0xff8152,.94*alpha)
    .lineBetween(dx*from-dy*side*.3,(dy*from+dx*side*.3)*py,headX-dy*side,(headY+dx*side)*py);
  }
 }

 private drawImpact(cast:ChargeEnd['cast'],hit:NonNullable<ChargeEnd['hit']>,age:number){
  const g=this.trail,x=hit.x-cast.x,y=(hit.y-cast.y)*py;
  const alpha=(1-age)**1.6,r=22+48*age;
  g.fillStyle(0xff6a36,.25*alpha).fillEllipse(x,y,r*1.7,r*1.15);
  g.lineStyle(7,0xed1845,.75*alpha).strokeEllipse(x,y,r*2,r*2*py);
  g.lineStyle(3,0xffdea1,alpha).strokeEllipse(x,y,r*2,r*2*py);
  for(let i=0;i<10;i++){
   const a=i*Math.PI/5+.17,dx=Math.cos(a),dy=Math.sin(a)*py;
   const near=10+age*(17+i%3*5),far=near+14+(i%3)*7;
   g.lineStyle(i%3===0?4:2,i%2===0?0xfff1be:0xff7640,alpha)
    .lineBetween(x+dx*near,y-11+dy*near,x+dx*far,y-11+dy*far);
  }
 }
}

import type Phaser from 'phaser';
import type {GameEvent} from '../simulation/GameState';
import {warlordCleave,type CleaveCast} from '../simulation/WarlordCleave';
import {projection,worldToView} from '../world/layout';

type Impact=Extract<GameEvent,{type:'cleave-impact'}>;
const impactMs=380,arcSteps=24;

function arc(g:Phaser.GameObjects.Graphics,start:number,end:number,radius:number){
 for(let i=0;i<=arcSteps;i++){
  const angle=start+(end-start)*i/arcSteps;
  g.lineTo(Math.cos(angle)*radius*projection.x,Math.sin(angle)*radius*projection.y);
 }
}
function sector(g:Phaser.GameObjects.Graphics,start:number,end:number,radius:number){
 g.beginPath().moveTo(0,0);
 arc(g,start,end,radius);
 g.closePath();
}
function strokeArc(g:Phaser.GameObjects.Graphics,start:number,end:number,radius:number,width:number,color:number,alpha:number){
 g.lineStyle(width,color,alpha).beginPath();
 arc(g,start,end,radius);
 g.strokePath();
}

export class WarlordCleaveEffects {
 private readonly warning:Phaser.GameObjects.Graphics;
 private readonly slash:Phaser.GameObjects.Graphics;
 private impact?:Impact;
 private impactAt=0;
 private warningTick=-1;

 constructor(scene:Phaser.Scene){
  this.warning=scene.add.graphics().setName('warlord-cleave-telegraph').setDepth(4).setVisible(false);
  this.slash=scene.add.graphics().setName('warlord-cleave-impact').setDepth(2498).setVisible(false);
 }
 clear(){
  this.impact=undefined;
  this.warningTick=-1;
  this.warning.clear().setVisible(false);
  this.slash.clear().setVisible(false);
 }
 landed(impact:Impact,now:number){this.impact=impact;this.impactAt=now;}

 draw(cast:CleaveCast|undefined,tick:number,now:number){
  if(cast)this.drawWarning(cast,tick);
  else if(this.warning.visible)this.warning.clear().setVisible(false);
  if(!this.impact)return;
  const age=(now-this.impactAt)/impactMs;
  if(age>=1){this.impact=undefined;this.slash.clear().setVisible(false);return;}
  this.drawImpact(this.impact,age);
 }

 private drawWarning(cast:CleaveCast,tick:number){
  const g=this.warning;
  if(g.visible&&this.warningTick===tick)return;
  this.warningTick=tick;
  const {range,halfAngle,windupTicks}=warlordCleave;
  const progress=Math.min(1,(tick-cast.startTick)/windupTicks);
  const start=cast.angle-halfAngle,end=cast.angle+halfAngle;
  g.clear().setPosition(cast.x*projection.x,cast.y*projection.y).setVisible(true);
  g.lineStyle(7,0x501326,.9);
  sector(g,start,end,range);
  g.fillStyle(0xb61035,.3+.24*progress).fillPath().strokePath();
  g.lineStyle(3.5,0xffdfae,1);
  sector(g,start,end,range);
  g.strokePath();
  if(progress>0){
   sector(g,start,end,range*progress);
   g.fillStyle(0xf42f4b,.12+.22*progress).fillPath();
   strokeArc(g,start,end,range*progress,2,0xff9b78,.36+.58*progress);
  }
 }

 private drawImpact({cast,hits}:Impact,age:number){
  const g=this.slash,p=worldToView(cast.x,cast.y);
  const {range,halfAngle}=warlordCleave;
  const fade=(1-age)**1.6;
  const start=cast.angle-halfAngle,end=cast.angle+halfAngle;
  const sweepEnd=start+(end-start)*Math.min(1,.48+age*5.8);
  const radius=range*(.88+.09*Math.min(1,age*3));
  g.clear().setPosition(p.x,p.y).setVisible(true);
  // A tapered blade with a hot leading edge, entirely inside the warning's reach.
  g.beginPath();
  arc(g,start,sweepEnd,radius);
  for(let i=arcSteps;i>=0;i--){
   const t=i/arcSteps,angle=start+(sweepEnd-start)*t,r=radius-(5+22*Math.sin(Math.PI*t));
   g.lineTo(Math.cos(angle)*r*projection.x,Math.sin(angle)*r*projection.y);
  }
  g.closePath().fillStyle(0xd62644,.9*fade).fillPath();
  strokeArc(g,start,sweepEnd,radius,12,0xd91f40,.62*fade);
  strokeArc(g,start,sweepEnd,radius,6,0xff6c43,fade);
  strokeArc(g,start,sweepEnd,radius,2.5,0xffedba,fade);
  strokeArc(g,start+.12,sweepEnd-.06,radius-14,2,0xffa458,.82*fade);
  for(let i=0;i<10;i++){
   const angle=start+(end-start)*(i+.5)/10;
   if(angle>sweepEnd)break;
   const r=range*(.53+.035*(i%6)+.24*age),tail=r-7-(i%3)*4;
   const dx=Math.cos(angle)*projection.x,dy=Math.sin(angle)*projection.y;
   g.fillStyle(0xc89665,.28*fade).fillEllipse(dx*(r-9),dy*(r-9),10+12*age,5+6*age);
   g.lineStyle(i%3===0?3:2,i%2===0?0xffc378:0xff6744,.9*fade).lineBetween(dx*tail,dy*tail,dx*r,dy*r);
  }
  for(const hit of hits){
   const x=(hit.x-cast.x)*projection.x,y=(hit.y-cast.y)*projection.y-14;
   const size=7+14*age;
   g.lineStyle(2,0xffa163,fade).lineBetween(x-size,y+2,x+size,y-4);
   g.lineStyle(1.5,0xffe4ad,.92*fade).lineBetween(x+2,y+4,x+size*.5,y-size);
  }
 }
}

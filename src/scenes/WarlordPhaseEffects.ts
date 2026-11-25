import type Phaser from 'phaser';
import type {GameEvent,Unit} from '../simulation/GameState';
import {projection} from '../world/layout';

type PhaseEvent=Extract<GameEvent,{type:'warlord-phase'}>;
const burstMs=520;
export class WarlordPhaseEffects {
 private readonly aura:Phaser.GameObjects.Graphics;
 private readonly burst:Phaser.GameObjects.Graphics;
 private transition?:{event:PhaseEvent;at:number};

 constructor(scene:Phaser.Scene){
  this.aura=scene.add.graphics().setName('warlord-phase-aura').setVisible(false);
  this.burst=scene.add.graphics().setName('warlord-phase-burst').setDepth(2496).setVisible(false);
 }
 clear(){
  this.transition=undefined;
  this.aura.clear().setVisible(false);
  this.burst.clear().setVisible(false);
 }
 change(event:PhaseEvent,now:number){if(event.stage!=='iron')this.transition={event,at:now};}

 draw(boss:Unit|undefined,now:number){
  if(!boss)return;
  const iron=boss.warlordStage==='iron',fury=boss.warlordStage==='fury';
  const g=this.aura,py=projection.y;
  if(iron||fury){
   const pulse=(1+Math.sin(now/180))/2;
   g.clear().setVisible(true).setDepth(iron?2495:5).setPosition(boss.x,boss.y*py);
   if(iron){
    g.fillStyle(0xa85c30,.11+.045*pulse).fillEllipse(0,-54,146,151);
    g.lineStyle(7,0x8e412e,.30+.20*pulse).strokeEllipse(0,-54,146,151);
    g.lineStyle(2.25,0xffd795,.72+.25*pulse).strokeEllipse(0,-54,146,151);
    g.lineStyle(1.4,0xfac577,.48).strokeEllipse(0,0,116,116*py);
   }else{
    g.fillStyle(0xbe193a,.14+.08*pulse).fillEllipse(0,0,126,126*py);
    g.lineStyle(3,0xf65334,.40+.24*pulse).strokeEllipse(0,0,124,124*py);
   }
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4+now*.0022,r=iron?67:61+i%3*4;
    const x=Math.cos(a)*r,y=Math.sin(a)*r*(iron?1:py)-(iron?54:8+i%3*4);
    g.fillStyle(i%3?0xffa16a:0xffe0a4,.55+.4*pulse).fillCircle(x,y,1.8+i%3*.45);
   }
  }else if(g.visible)g.clear().setVisible(false);

  const burst=this.transition,b=this.burst;
  if(!burst)return;
  const age=(now-burst.at)/burstMs;
  if(age>=1){this.transition=undefined;b.clear().setVisible(false);return;}
  const amber=burst.event.stage==='exposed',fade=(1-age)**1.7,r=55+108*age,y=amber?-34:0;
  b.clear().setVisible(true).setPosition(burst.event.x,burst.event.y*py);
  b.lineStyle(8,amber?0xdd883f:0xdc2251,.54*fade).strokeEllipse(0,y,r*2,r*2*py);
  b.lineStyle(2.5,amber?0xffe7a7:0xff9264,fade).strokeEllipse(0,y,r*2,r*2*py);
  for(let i=0;i<10;i++){
   const a=i*Math.PI/5+.19,dx=Math.cos(a),dy=Math.sin(a)*py;
   b.lineStyle(2.5,amber?0xffd28e:0xff8660,fade).lineBetween(dx*(r-18),y+dy*(r-18),dx*r,y+dy*r);
  }
 }
}

import type Phaser from 'phaser';
import {localeFont,t} from '../i18n';
import type {Unit} from '../simulation/GameState';
import {warlordPhases} from '../simulation/WarlordPhases';

export class WarlordHud {
 private readonly panel:Phaser.GameObjects.Container;
 private readonly plate:Phaser.GameObjects.Graphics;
 private readonly label:Phaser.GameObjects.Text;
 private readonly hp:Phaser.GameObjects.Text;
 private readonly status:Phaser.GameObjects.Text;
 private previous='';
 private pixel=1;
 private width=236;
 private height=0;

 constructor(scene:Phaser.Scene){
  const style={fontFamily:localeFont('Arial, sans-serif'),fontSize:'12px',fontStyle:'bold',color:'#fff5e4'};
  this.plate=scene.add.graphics();
  this.label=scene.add.text(0,0,t('battleCrimsonWarlord'),style);
  this.hp=scene.add.text(0,0,'',style).setOrigin(1,0);
  this.status=scene.add.text(0,0,'',style).setColor('#ffda9c');
  this.panel=scene.add.container(0,0,[this.plate,this.label,this.hp,this.status]).setName('warlord-health-panel').setDepth(25).setVisible(false);
 }
 layout(x:number,y:number,width:number,scale:number){
  this.pixel=1/scale;
  this.width=Math.min(width,260*this.pixel);
  this.panel.setPosition(x+(width-this.width)/2,y+5*this.pixel);
  const p=this.pixel;
  this.label.setPosition(8*p,4*p).setFontSize(12*p);
  this.hp.setPosition(this.width-8*p,4*p).setFontSize(12*p);
  this.status.setPosition(8*p,27*p).setFontSize(11*p);
  this.previous='';
 }
 get bounds(){
  return this.panel.visible?{x:this.panel.x,y:this.panel.y,width:this.width,height:this.height}:undefined;
 }
 draw(boss:Unit|undefined,banners:number,hidden:boolean){
  this.panel.setVisible(!!boss&&!boss.invulnerable&&!hidden);
  if(!boss||!this.panel.visible)return;
  const hp=Math.ceil(boss.hp),iron=boss.warlordStage==='iron',fury=boss.warlordStage==='fury';
  const value=`${hp}:${boss.warlordStage}:${banners}`;
  if(value===this.previous)return;
  this.previous=value;
  const p=this.pixel,width=this.width,barWidth=width-16*p,g=this.plate;
  const fill=iron?0xeab65a:fury?0xff5768:0xda3950;
  const height=this.height=(iron||fury?43:30)*p;
  this.hp.setText(`${hp} / ${boss.maxHp}`);
  this.status.setText(iron?t('battleWarBannersProgress',{count:warlordPhases.banners.length-banners}):fury?t('battleWarlordFury'):'');
  g.clear().fillStyle(0x251720,.94).fillRoundedRect(0,0,width,height,6*p);
  g.lineStyle(p,fill,.9).strokeRoundedRect(0,0,width,height,6*p);
  g.fillStyle(0x4e2a35,1).fillRect(8*p,20*p,barWidth,5*p);
  g.fillStyle(fill,1).fillRect(8*p,20*p,barWidth*boss.hp/boss.maxHp,5*p);
  for(const hp of [warlordPhases.ironHp,warlordPhases.furyHp]){
   const x=8*p+barWidth*hp/boss.maxHp;
   g.lineStyle(1.5*p,0xffebbf,1).lineBetween(x,18*p,x,27*p);
  }
 }
}

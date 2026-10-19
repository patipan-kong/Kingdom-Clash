import Phaser from 'phaser';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import type {BattleLaunch} from '../data/campaignUi';
import {encounterFromUrl} from './Battle';

const directLaunch=()=>{const q=new URLSearchParams(location.search);return q.has('encounter')||q.get('quickplay')==='1'||import.meta.env.DEV&&q.get('campaignFixture')==='staged';};

export class MainMenu extends Phaser.Scene{
 public campaignButton!:Phaser.GameObjects.Rectangle;
 public quickPlayButton!:Phaser.GameObjects.Rectangle;
 constructor(){super('MainMenu');}
 preload(){preloadMenuBackdrop(this);}
 create(){
  if(directLaunch()){const fixture=import.meta.env.DEV&&new URLSearchParams(location.search).get('campaignFixture')==='staged';this.scene.start('Battle',fixture?{mode:'campaign',levelId:'campaign-01'} satisfies BattleLaunch:{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch);return;}
  drawMenuBackdrop(this);const m=menuScale(this);restartOnBreakpoint(this,m.mobile);
  const art=this.add.graphics();drawFantasyPanel(art,{x:210,y:70,width:540,height:400},1);
  this.add.text(480,128,'KINGDOM CLASH',{fontFamily:UI_FONT,fontSize:'42px',fontStyle:'bold',color:FANTASY_TEXT.gold,stroke:'#06191e',strokeThickness:6}).setOrigin(.5);
  this.add.text(480,182,'Defend the Azure Realm',{fontFamily:UI_FONT,fontSize:`${m.font(18,13)}px`,color:FANTASY_TEXT.muted}).setOrigin(.5);
  this.campaignButton=this.button(480,270,'CAMPAIGN',()=>this.scene.start('CampaignSelect'));
  this.quickPlayButton=this.button(480,350,'FULL BATTLE / QUICK PLAY',()=>this.scene.start('Battle',{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch));
  this.add.text(480,424,'Campaign missions  ·  Original Full Battle',{fontFamily:UI_FONT,fontSize:`${m.font(12,12)}px`,color:FANTASY_TEXT.muted}).setOrigin(.5);
  window.visualReady=false;
 }
 private button(x:number,y:number,label:string,action:()=>void){
  const art=this.add.graphics();drawFantasyButton(art,x-170,y-27,340,54,1,'primary');
  const scale=this.game.canvas.getBoundingClientRect().height/540,hit=this.add.rectangle(x,y,340,Math.max(54,48/scale),0,0).setInteractive({useHandCursor:true}).on('pointerup',action);
  this.add.text(x,y,label,{fontFamily:UI_FONT,fontSize:'17px',fontStyle:'bold',color:FANTASY_TEXT.ink}).setOrigin(.5);return hit;
 }
}

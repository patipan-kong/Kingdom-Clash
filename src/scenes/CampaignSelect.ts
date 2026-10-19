import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

export class CampaignSelect extends Phaser.Scene{
 public levelButtons=new Map<string,Phaser.GameObjects.Rectangle>();
 public backButton!:Phaser.GameObjects.Rectangle;
 public cards!:Phaser.GameObjects.Container;
 private scroll=0;private minScroll=0;
 private drag?:{pointerId:number;y:number;scroll:number};
 constructor(){super('CampaignSelect');}
 preload(){preloadMenuBackdrop(this);}
 create(){
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font,mobile=m.mobile;restartOnBreakpoint(this,mobile);
  this.levelButtons=new Map();this.scroll=0;this.drag=undefined;
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,wrap?:number)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...(wrap?{wordWrap:{width:wrap}}:{})});
  text(480,mobile?28:36,'CAMPAIGN',30,FANTASY_TEXT.gold,true).setOrigin(.5);
  text(480,mobile?58:66,'Choose a mission to review its briefing',f(13,12),FANTASY_TEXT.muted).setOrigin(.5);
  // Mobile landscape: wider, slightly taller cards so the larger text fits; three cards still end above the Back button.
  const cardX=mobile?50:146,cardW=mobile?860:668,cardH=mobile?122:112,step=mobile?130:126,btnW=mobile?136:112,btnH=mobile?40:38;
  this.cards=this.add.container();let y=mobile?84:96;
  for(const level of campaign.list()){
   const art=this.add.graphics();drawFantasyPanel(art,{x:cardX,y,width:cardW,height:cardH},1);this.cards.add(art);
   const left=cardX+24,right=cardX+cardW-(mobile?24:32),btnCx=cardX+cardW-(mobile?24:26)-btnW/2;
   const chapter=text(left,y+(mobile?12:15),`CHAPTER ${level.chapter}  ·  LEVEL ${level.number}`,f(11,11),FANTASY_TEXT.gold,true);
   const title=text(left,y+(mobile?32:35),level.display.title,mobile?24:20,FANTASY_TEXT.primary,true);
   const description=text(left,y+(mobile?66:64),level.display.description,f(12,12),FANTASY_TEXT.muted,false,mobile?cardW-btnW-72:470);
   const difficulty=text(right,y+(mobile?12:17),level.display.difficulty.toUpperCase(),f(10,11),FANTASY_TEXT.muted).setOrigin(1,0);
   const cy=mobile?y+cardH/2+16:y+76,buttonArt=this.add.graphics();drawFantasyButton(buttonArt,btnCx-btnW/2,cy-btnH/2,btnW,btnH,1,'primary');
   const hit=this.add.rectangle(btnCx,cy,btnW,Math.max(btnH,48/m.k),0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.scene.start('MissionBriefing',{levelId:level.id}));
   const label=text(btnCx,cy,'BRIEFING',f(12,12),FANTASY_TEXT.ink,true).setOrigin(.5);
   this.cards.add([chapter,title,description,difficulty,buttonArt,hit,label]);this.levelButtons.set(level.id,hit);y+=step;
  }
  this.minScroll=Math.min(0,450-y);this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>{this.scroll=Phaser.Math.Clamp(this.scroll-dy*.5,this.minScroll,0);this.cards.y=this.scroll;});
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(pointer.y<474)this.drag={pointerId:pointer.id,y:pointer.y,scroll:this.scroll};});
  this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{if(!this.drag||this.drag.pointerId!==pointer.id||!pointer.isDown)return;this.scroll=Phaser.Math.Clamp(this.drag.scroll+pointer.y-this.drag.y,this.minScroll,0);this.cards.y=this.scroll;});
  this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(this.drag?.pointerId===pointer.id)this.drag=undefined;});
  const backW=mobile?236:176,backArt=this.add.graphics();drawFantasyButton(backArt,24,486,backW,38,1,'secondary');this.backButton=this.add.rectangle(24+backW/2,Math.min(505,540-Math.max(38,48/m.k)/2),backW,Math.max(38,48/m.k),0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.scene.start('MainMenu'));
  text(24+backW/2,505,'BACK TO MAIN MENU',f(11,11),FANTASY_TEXT.primary,true).setOrigin(.5);
 }
}

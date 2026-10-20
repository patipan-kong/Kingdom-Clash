import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {campaignChapters} from '../data/campaignChapters';
import {chapterViews,type ChapterViewModel} from '../data/chapterView';
import {campaignProgress} from '../data/campaignProgressStore';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

export class ChapterSelect extends Phaser.Scene {
 public chapterButtons=new Map<string,Phaser.GameObjects.Rectangle>();
 public unavailableCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public backButton!:Phaser.GameObjects.Rectangle;
 public fullBattleButton!:Phaser.GameObjects.Rectangle;
 public views:readonly ChapterViewModel[]=[];
 public warning?:Phaser.GameObjects.Text;
 private cards!:Phaser.GameObjects.Container;
 private clip={top:94,bottom:454};
 private scroll=0;private minScroll=0;private moved=0;
 private drag?:{id:number;y:number;scroll:number};
 private bar!:Phaser.GameObjects.Graphics;
 constructor(){super('ChapterSelect');}
 preload(){preloadMenuBackdrop(this);}
 create(){
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font;restartOnBreakpoint(this,m.mobile);
  campaignProgress.refresh();this.views=chapterViews(campaignChapters,campaign.list(),campaignProgress.progress);
  this.chapterButtons=new Map();this.unavailableCards=new Map();this.warning=undefined;
  this.scroll=0;this.moved=0;this.drag=undefined;
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,width?:number)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...width?{wordWrap:{width}}:{}});
  text(480,28,'CHAPTERS OF THE AZURE REALM',28,FANTASY_TEXT.gold,true).setOrigin(.5);
  text(480,65,'Choose a chapter · Ten story missions in every chapter',f(13,12),FANTASY_TEXT.muted).setOrigin(.5);
  this.cards=this.add.container();const columns=m.mobile?2:3,w=m.mobile?432:282,gap=22,left=(960-(columns*w+(columns-1)*gap))/2;
  const height=340,step=height+18;
  this.views.forEach((view,index)=>{
   const x=left+(index%columns)*(w+gap),y=100+Math.floor(index/columns)*step,open=view.state==='available';
   const art=this.add.graphics();drawFantasyPanel(art,{x,y,width:w,height},1);this.cards.add(art);
   // Selection-only art: existing textures, tinted previews; never changes battlefield assets or rules.
   const tint=view.chapter.artwork==='frontier'?0xd9b57b:view.chapter.artwork==='frozen'?0xb6dce9:0xb3d98b;
   const ground=this.add.tileSprite(x+w/2,y+58,w-16,100,'grass').setTileScale(.35).setTint(tint);
   const trees=this.add.image(x+45,y+100,'trees').setOrigin(.5,1).setDisplaySize(75,94).setTint(tint);
   const keep=this.add.image(x+w-65,y+100,'base-blue').setOrigin(.5,1).setDisplaySize(83,88).setTint(tint);
   const shade=this.add.rectangle(x+w/2,y+58,w-16,100,0x091725,open?.12:.4);
   this.cards.add([ground,trees,keep,shade]);
   const add=(t:Phaser.GameObjects.Text)=>{this.cards.add(t);return t;};
   add(text(x+18,y+120,`CHAPTER ${view.chapter.number}`,f(11,11),FANTASY_TEXT.gold,true));
   add(text(x+18,y+142,view.chapter.title,m.mobile?f(23,18):20,FANTASY_TEXT.primary,true,w-36));
   add(text(x+18,y+179,view.chapter.narrative,f(12,12),FANTASY_TEXT.muted,false,w-36));
   const status=view.state==='coming-soon'?'COMING SOON':view.state==='locked'?'LOCKED':'AVAILABLE';
   add(text(x+18,y+246,`${status}  ·  ${view.completed}/${view.total} COMPLETE`,f(11,11),FANTASY_TEXT.gold,true));
   add(text(x+18,y+267,view.state==='coming-soon'?'Missions not released':`${view.released} released · ${view.total-view.released} pending`,f(11,11),FANTASY_TEXT.muted));
   const buttonArt=this.add.graphics(),bw=w-36,by=y+305;drawFantasyButton(buttonArt,x+18,by-20,bw,40,1,open?'primary':'disabled');this.cards.add(buttonArt);
   const hit=this.add.rectangle(x+w/2,by,bw,Math.max(44,48/m.k),0,0);
   if(open){hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10)this.scene.start('CampaignSelect');});this.chapterButtons.set(view.chapter.id,hit);}
   else this.unavailableCards.set(view.chapter.id,hit);
   this.cards.add(hit);add(text(x+w/2,by,open?'SELECT CHAPTER':status,f(12,12),open?FANTASY_TEXT.ink:FANTASY_TEXT.muted,true).setOrigin(.5));
  });
  this.minScroll=Math.min(0,this.clip.bottom-(100+Math.ceil(this.views.length/columns)*step-18));
  const mask=this.make.graphics({x:0,y:0},false);mask.fillStyle(0xffffff).fillRect(0,this.clip.top,960,this.clip.bottom-this.clip.top);this.cards.setMask(mask.createGeometryMask());
  this.bar=this.add.graphics();this.setScroll(0);
  const wheel=(_p:unknown,_o:unknown,_dx:number,dy:number)=>this.setScroll(this.scroll-dy*.5);
  const down=(p:Phaser.Input.Pointer)=>{this.moved=0;if(p.y>=this.clip.top&&p.y<this.clip.bottom)this.drag={id:p.id,y:p.y,scroll:this.scroll};};
  const move=(p:Phaser.Input.Pointer)=>{if(!this.drag||p.id!==this.drag.id||!p.isDown)return;this.moved=Math.max(this.moved,Math.abs(p.y-this.drag.y));this.setScroll(this.drag.scroll+p.y-this.drag.y);};
  const up=()=>{this.drag=undefined;};
  this.input.on('wheel',wheel).on('pointerdown',down).on('pointermove',move).on('pointerup',up);
  this.events.once('shutdown',()=>{this.input.off('wheel',wheel).off('pointerdown',down).off('pointermove',move).off('pointerup',up);this.drag=undefined;mask.destroy();});
  const button=(x:number,width:number,label:string,action:()=>void)=>{
   const art=this.add.graphics();drawFantasyButton(art,x,475,width,40,1,'secondary');
   const hit=this.add.rectangle(x+width/2,495,width,Math.max(44,48/m.k),0,0).setInteractive({useHandCursor:true}).on('pointerup',action);
   text(x+width/2,495,label,f(12,12),FANTASY_TEXT.primary,true).setOrigin(.5);return hit;
  };
  this.backButton=button(28,210,'BACK TO MAIN MENU',()=>this.scene.start('MainMenu'));
  // Preserve the legacy special mission's briefing and campaign launch contract for this slice.
  this.fullBattleButton=button(550,382,'FULL BATTLE · ALWAYS AVAILABLE',()=>this.scene.start('MissionBriefing',{levelId:'campaign-20'}));
  if(!campaignProgress.persistent)this.warning=text(480,531,"Progress can't be saved in this browser.",f(11,11),'#f0b36b',true).setOrigin(.5,1);
 }
 private setScroll(value:number){
  this.scroll=Phaser.Math.Clamp(value,this.minScroll,0);this.cards.y=this.scroll;
  for(const hit of this.chapterButtons.values()){const b=hit.getBounds();if(hit.input)hit.input.enabled=b.top>=this.clip.top&&b.bottom<=this.clip.bottom;}
  this.bar.clear();if(this.minScroll>=0)return;
  const height=this.clip.bottom-this.clip.top,thumb=height*height/(height-this.minScroll),y=this.clip.top+(height-thumb)*this.scroll/this.minScroll;
  this.bar.fillStyle(0xf2cf8b,.18).fillRoundedRect(948,this.clip.top,4,height,2);this.bar.fillStyle(0xf2cf8b,.7).fillRoundedRect(948,y,4,thumb,2);
 }
}

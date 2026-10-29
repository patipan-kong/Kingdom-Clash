import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {campaignChapters} from '../data/campaignChapters';
import {chapterViews,type ChapterViewModel} from '../data/chapterView';
import {campaignProgress} from '../data/campaignProgressStore';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {chapterArtFrame,preloadChapterArt} from '../ui/chapterArt';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {chapterRowLayout,chapterCardVisible,chapterScroll,chapterScrollTo} from '../ui/chapterLayout';
import {drawCheck,drawFantasyButton,drawFantasyPanel,drawLock,drawPips,FANTASY,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

export class ChapterSelect extends Phaser.Scene {
 /** Interactive poster cards: the whole card is the target. Locked and Coming Soon cards get no input. */
 public chapterButtons=new Map<string,Phaser.GameObjects.Rectangle>();
 public unavailableCards=new Map<string,Phaser.GameObjects.Rectangle>();
 public backButton!:Phaser.GameObjects.Rectangle;
 public fullBattleButton!:Phaser.GameObjects.Rectangle;
 public views:readonly ChapterViewModel[]=[];
 public warning?:Phaser.GameObjects.Text;
 public cards!:Phaser.GameObjects.Container;
 private row=chapterRowLayout(0);
 private clip=this.row.clip;
 private scroll=0;private minScroll=0;private moved=0;
 private drag?:{id:number;x:number;scroll:number};
 private bar!:Phaser.GameObjects.Graphics;
 constructor(){super('ChapterSelect');}
 preload(){preloadMenuBackdrop(this);preloadChapterArt(this,['kingdom','frontier','frozen']);}
 create(){
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font;restartOnBreakpoint(this,m.mobile);
  campaignProgress.refresh();this.views=chapterViews(campaignChapters,campaign.list(),campaignProgress.progress);
  this.chapterButtons=new Map();this.unavailableCards=new Map();this.warning=undefined;
  this.scroll=0;this.moved=0;this.drag=undefined;
  this.row=chapterRowLayout(this.views.length);this.clip=this.row.clip;this.minScroll=this.row.minScroll;
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,width?:number)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...width?{wordWrap:{width}}:{}});
  text(480,34,'CAMPAIGN',28,FANTASY_TEXT.gold,true).setOrigin(.5);
  this.cards=this.add.container();
  // The chapter holding the next mission; with nothing left to play there is none and the row rests at the start.
  const current=this.views.findIndex(v=>v.state==='available'&&!v.complete);
  this.views.forEach((view,index)=>{
   const {x,y,width:w,height:h}=this.row.slots[index],open=view.state==='available',isCurrent=index===current;
   const add=<T extends Phaser.GameObjects.GameObject>(o:T):T=>{this.cards.add(o);return o;};
   drawFantasyPanel(add(this.add.graphics()),{x,y,width:w,height:h},1);
   // The chapter painting fills the card (cover-fit, never stretched). Without its texture the old tinted battlefield stand-in is drawn instead.
   const paint=chapterArtFrame(this,view.chapter.artwork,w-12,h-12);
   if(paint)add(this.add.image(x+w/2,y+h/2,paint.key,paint.frame).setDisplaySize(w-12,h-12));
   else{
    const tint=view.chapter.artwork==='frontier'?0xd9b57b:view.chapter.artwork==='frozen'?0xb6dce9:0xb3d98b;
    add(this.add.tileSprite(x+w/2,y+h/2,w-12,h-12,'grass').setTileScale(.5).setTint(tint));
    add(this.add.image(x+66,y+190,'trees').setOrigin(.5,1).setDisplaySize(118,140).setTint(tint));
    add(this.add.image(x+w-60,y+176,'trees').setOrigin(.5,1).setDisplaySize(84,100).setTint(tint));
    add(this.add.image(x+w/2+8,y+196,'base-blue').setOrigin(.5,1).setDisplaySize(130,150).setTint(tint));
   }
   if(!open)add(this.add.rectangle(x+w/2,y+h/2,w-12,h-12,0x091725,view.state==='coming-soon'?.65:.55));
   add(this.add.graphics()).fillGradientStyle(0x061522,0x061522,0x061522,0x061522,0,0,.94,.94).fillRect(x+6,y+h*.42,w-12,h*.58-6);
   const frame=add(this.add.graphics());
   if(isCurrent)frame.lineStyle(6,FANTASY.gold,.28).strokeRoundedRect(x-2,y-2,w+4,h+4,13);
   frame.lineStyle(isCurrent?3:2,isCurrent?FANTASY.goldBright:FANTASY.bronze,open?.95:.6).strokeRoundedRect(x,y,w,h,11);
   // Text is stacked upward from one state row, so a title that wraps on a phone grows into the artwork instead of into the row.
   const rowY=y+h-28,pad=x+18;
   const label=(tx:number,ty:number,value:string,size:number,color:string,bold:boolean,oy:number,width?:number)=>add(text(tx,ty,value,size,color,bold,width).setOrigin(0,oy));
   const prev=this.views[index-1];
   if(view.state==='coming-soon')label(pad,rowY,'COMING SOON',f(12,12),FANTASY_TEXT.muted,true,.5);
   else if(view.state==='locked'){drawLock(frame,pad+8,rowY,15,0xb9c7d0,.9);label(pad+24,rowY,prev?`Complete Chapter ${prev.chapter.number}`:'Locked',f(12,12),FANTASY_TEXT.muted,true,.5,w-36-24);}
   else if(view.complete){drawCheck(frame,pad+8,rowY,14,0x8cebd1);label(pad+24,rowY,'Complete',f(12,12),'#8cebd1',true,.5);}
   else{const pips=drawPips(frame,pad,rowY-6,view.total,view.completed,12,5);label(pad+pips+10,rowY,`${view.completed}/${view.total}`,f(12,12),FANTASY_TEXT.gold,true,.5);}
   const title=label(pad,rowY-17,view.chapter.title,f(20,14),open?FANTASY_TEXT.primary:FANTASY_TEXT.muted,true,1,w-36);
   label(pad,title.y-title.displayHeight-3,`CHAPTER ${view.chapter.number}`,f(12,12),FANTASY_TEXT.gold,true,1);
   const hit=add(this.add.rectangle(x+w/2,y+h/2,w,h,0,0));
   if(open){hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10)this.scene.start('CampaignSelect',{chapterId:view.chapter.id});});this.chapterButtons.set(view.chapter.id,hit);}
   else this.unavailableCards.set(view.chapter.id,hit);
  });
  const mask=this.make.graphics({x:0,y:0},false);mask.fillStyle(0xffffff).fillRect(this.clip.left,this.clip.top,this.clip.right-this.clip.left,this.clip.bottom-this.clip.top);this.cards.setMask(mask.createGeometryMask());
  this.bar=this.add.graphics();this.setScroll(chapterScrollTo(current,this.minScroll));
  const wheel=(_p:unknown,_o:unknown,dx:number,dy:number)=>this.setScroll(this.scroll-(Math.abs(dx)>Math.abs(dy)?dx:dy)*.5);
  const down=(p:Phaser.Input.Pointer)=>{this.moved=0;if(p.y>=this.clip.top&&p.y<this.clip.bottom)this.drag={id:p.id,x:p.x,scroll:this.scroll};};
  const move=(p:Phaser.Input.Pointer)=>{if(!this.drag||p.id!==this.drag.id||!p.isDown)return;this.moved=Math.max(this.moved,Math.abs(p.x-this.drag.x));this.setScroll(this.drag.scroll+p.x-this.drag.x);};
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
  this.fullBattleButton=button(772,160,'FULL BATTLE',()=>this.scene.start('MissionBriefing',{levelId:'full-battle'}));
  if(!campaignProgress.persistent)this.warning=text(480,531,"Progress can't be saved in this browser.",f(11,11),'#f0b36b',true).setOrigin(.5,1);
 }
 private setScroll(value:number){
  this.scroll=chapterScroll(value,this.minScroll);this.cards.x=this.scroll;
  this.views.forEach((view,i)=>{const hit=this.chapterButtons.get(view.chapter.id);if(hit?.input)hit.input.enabled=chapterCardVisible(this.row.slots[i],this.scroll,this.clip);});
  this.bar.clear();if(this.minScroll>=0)return;
  const width=this.clip.right-this.clip.left,thumb=width*width/(width-this.minScroll),x=this.clip.left+(width-thumb)*this.scroll/this.minScroll;
  this.bar.fillStyle(0xf2cf8b,.18).fillRoundedRect(this.clip.left,438,width,4,2);this.bar.fillStyle(0xf2cf8b,.7).fillRoundedRect(x,438,thumb,4,2);
 }
}

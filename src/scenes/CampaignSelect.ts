import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {campaignProgress} from '../data/campaignProgressStore';
import {specialLabel} from '../data/campaignProgress';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

export class CampaignSelect extends Phaser.Scene{
 public levelButtons=new Map<string,Phaser.GameObjects.Rectangle>(); // open levels only: interactive Briefing buttons
 public lockedCards=new Map<string,Phaser.GameObjects.Rectangle>(); // locked levels: inert placeholders with no input
 public backButton!:Phaser.GameObjects.Rectangle;
 public cards!:Phaser.GameObjects.Container;
 private scroll=0;private minScroll=0;
 private drag?:{pointerId:number;y:number;scroll:number};
 // The card list scrolls inside a clipped window between the header and the Back button. A card button only takes input while it is
 // fully inside that window, so a clipped card never intercepts a tap; a tap that ends a drag is not a selection.
 public warning?:Phaser.GameObjects.Text;
 private clip={top:80,bottom:474};private moved=0;
 private hits:Phaser.GameObjects.Rectangle[]=[];private bar?:Phaser.GameObjects.Graphics;private barX=0;
 constructor(){super('CampaignSelect');}
 preload(){preloadMenuBackdrop(this);}
 create(){
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font,mobile=m.mobile;restartOnBreakpoint(this,mobile);
  // The window ends 4 px above the Back button's touch area, which grows on small screens.
  const backHit=Math.max(38,48/m.k),backCy=Math.min(505,540-backHit/2);this.clip={top:80,bottom:Math.min(474,Math.floor(backCy-backHit/2-4))};
  campaignProgress.refresh();const progress=campaignProgress.progress;
  this.levelButtons=new Map();this.lockedCards=new Map();this.warning=undefined;this.hits=[];this.scroll=0;this.moved=0;this.drag=undefined;
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,wrap?:number)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...(wrap?{wordWrap:{width:wrap}}:{})});
  text(480,mobile?28:36,'CAMPAIGN',30,FANTASY_TEXT.gold,true).setOrigin(.5);
  text(480,mobile?58:66,'Choose a mission to review its briefing',f(13,12),FANTASY_TEXT.muted).setOrigin(.5);
  // Mobile landscape: wider, slightly taller cards so the larger text fits; three cards still end above the Back button.
  const cardX=mobile?50:146,cardW=mobile?860:668,cardH=mobile?122:112,step=mobile?130:126,btnW=mobile?136:112,btnH=mobile?40:38;
  this.cards=this.add.container();let y=mobile?84:96;
  for(const level of campaign.list()){
   // Completed / open / locked come from the shared progression model; a special level (Full Battle) is always open and never completed.
   const special=specialLabel(level),open=campaignProgress.isUnlocked(level),done=!special&&progress.isCompleted(level),dim=open?1:.45;
   const art=this.add.graphics().setAlpha(dim);drawFantasyPanel(art,{x:cardX,y,width:cardW,height:cardH},1);this.cards.add(art);
   const left=cardX+24,right=cardX+cardW-(mobile?24:32),btnCx=cardX+cardW-(mobile?24:26)-btnW/2;
   const chapter=text(left,y+(mobile?12:15),`CHAPTER ${level.chapter}  ·  LEVEL ${level.number}`,f(11,11),FANTASY_TEXT.gold,true).setAlpha(dim);
   const tagText=special??(done?'✓ COMPLETED':open?'':progress.sequence.some(l=>l.id===level.id)?`LOCKED — complete Level ${level.number-1}`:'LOCKED');
   const tag=tagText?text(left+chapter.width+16,y+(mobile?12:15),tagText,f(11,11),done?'#8cebd1':special?FANTASY_TEXT.gold:'#f0b36b',true):null;
   const title=text(left,y+(mobile?32:35),level.display.title,mobile?24:20,FANTASY_TEXT.primary,true).setAlpha(dim);
   const description=text(left,y+(mobile?66:64),level.display.description,f(12,12),FANTASY_TEXT.muted,false,mobile?cardW-btnW-72:470).setAlpha(dim);
   const difficulty=text(right,y+(mobile?12:17),level.display.difficulty.toUpperCase(),f(10,11),FANTASY_TEXT.muted).setOrigin(1,0).setAlpha(dim);
   const cy=mobile?y+cardH/2+16:y+76,buttonArt=this.add.graphics().setAlpha(dim);drawFantasyButton(buttonArt,btnCx-btnW/2,cy-btnH/2,btnW,btnH,1,open?'primary':'secondary');
   // A locked card gets a rectangle with no input at all, and never joins this.hits, so scrolling (setScroll) cannot enable it.
   const hit=this.add.rectangle(btnCx,cy,btnW,Math.max(btnH,48/m.k),0,0);
   if(open){hit.setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10)this.scene.start('MissionBriefing',{levelId:level.id});});this.hits.push(hit);this.levelButtons.set(level.id,hit);}
   else this.lockedCards.set(level.id,hit);
   const label=text(btnCx,cy,open?'BRIEFING':'LOCKED',f(12,12),open?FANTASY_TEXT.ink:FANTASY_TEXT.muted,true).setOrigin(.5);
   this.cards.add([chapter,title,description,difficulty,buttonArt,hit,label]);if(tag)this.cards.add(tag);y+=step;
  }
  this.minScroll=Math.min(0,this.clip.bottom-24-y);
  const clipArt=this.make.graphics({x:0,y:0},false);clipArt.fillStyle(0xffffff,1).fillRect(0,this.clip.top,960,this.clip.bottom-this.clip.top);this.cards.setMask(clipArt.createGeometryMask());
  this.barX=cardX+cardW+(mobile?16:14);this.bar=this.add.graphics();this.setScroll(0);
  this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>this.setScroll(this.scroll-dy*.5));
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{this.moved=0;if(pointer.y>=this.clip.top&&pointer.y<this.clip.bottom)this.drag={pointerId:pointer.id,y:pointer.y,scroll:this.scroll};});
  this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{if(!this.drag||this.drag.pointerId!==pointer.id||!pointer.isDown)return;this.moved=Math.max(this.moved,Math.abs(pointer.y-this.drag.y));this.setScroll(this.drag.scroll+pointer.y-this.drag.y);});
  this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{if(this.drag?.pointerId===pointer.id)this.drag=undefined;});
  const backW=mobile?236:176,backArt=this.add.graphics();drawFantasyButton(backArt,24,486,backW,38,1,'secondary');this.backButton=this.add.rectangle(24+backW/2,backCy,backW,backHit,0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.scene.start('MainMenu'));
  text(24+backW/2,505,'BACK TO MAIN MENU',f(11,11),FANTASY_TEXT.primary,true).setOrigin(.5);
  // Non-blocking: progress is still kept for this session, it just will not survive a reload.
  if(!campaignProgress.persistent)this.warning=text(24+backW+16,backCy,"Progress can't be saved in this browser.",f(11,11),'#f0b36b',true).setOrigin(0,.5);
 }
 // Scrolls the card list, then re-evaluates which card buttons are fully visible (and so may take input) and redraws the scroll bar.
 private setScroll(value:number){
  this.scroll=Phaser.Math.Clamp(value,this.minScroll,0);this.cards.y=this.scroll;
  for(const hit of this.hits){const b=hit.getBounds();if(hit.input)hit.input.enabled=b.top>=this.clip.top&&b.bottom<=this.clip.bottom;}
  const bar=this.bar;if(!bar)return;bar.clear();if(this.minScroll>=0)return;
  const track=this.clip.bottom-this.clip.top-16,shown=track*(this.clip.bottom-this.clip.top)/(this.clip.bottom-this.clip.top-this.minScroll),at=this.clip.top+8+(track-shown)*(this.scroll/this.minScroll);
  bar.fillStyle(0xf2cf8b,.18).fillRoundedRect(this.barX,this.clip.top+8,4,track,2);bar.fillStyle(0xf2cf8b,.7).fillRoundedRect(this.barX,at,4,shown,2);
 }
}

import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {campaignProgress} from '../data/campaignProgressStore';
import {achievements} from '../data/achievementStore';
import {achievementList,previewList,previewModes,type AchievementCard,type AchievementList,type PreviewMode} from '../data/achievementView';
import {formatTicks} from '../data/achievements';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawCheck,drawFantasyButton,drawFantasyPanel,drawLock,FANTASY,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

export interface AchievementsLaunch{preview?:PreviewMode}
const dateOf=(ms:number)=>new Date(ms).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});

// Achievement V1 screen: one card per visible achievement (data: achievementView.ts). Unlocked cards carry the date and best time; locked ones are grey; Replay goes through the Mission Briefing, which enforces the unlock rules itself.
// With a preview (dev builds only, ?achievementsPreview=...) the cards come from fixtures and nothing is read from or written to the real save.
export class Achievements extends Phaser.Scene{
 public backButton!:Phaser.GameObjects.Rectangle;
 public replayButtons=new Map<string,Phaser.GameObjects.Rectangle>();
 public list:AchievementList={cards:[],unlockedCount:0,total:0,showCounter:false};
 public counter?:Phaser.GameObjects.Text;public emptyState?:Phaser.GameObjects.Text;public warning?:Phaser.GameObjects.Text;
 private preview?:PreviewMode;
 private scroll=0;private minScroll=0;private cards!:Phaser.GameObjects.Container;
 constructor(){super('Achievements');}
 preload(){preloadMenuBackdrop(this);}
 init(data?:AchievementsLaunch){this.preview=import.meta.env.DEV&&data?.preview&&previewModes.includes(data.preview)?data.preview:undefined;}
 create(){
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font;restartOnBreakpoint(this,m.mobile);
  this.replayButtons=new Map();this.counter=undefined;this.emptyState=undefined;this.warning=undefined;this.scroll=0;
  if(this.preview)this.list=previewList(this.preview);
  else{campaignProgress.refresh();achievements.refresh();this.list=achievementList(achievements.save,campaign.list(),campaignProgress.progress);}
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,width?:number)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...(width?{wordWrap:{width}}:{})});
  text(480,m.mobile?22:34,'ACHIEVEMENTS',28,FANTASY_TEXT.gold,true).setOrigin(.5);
  text(480,m.mobile?46:64,this.preview?`PREVIEW (${this.preview}) · fixture data, nothing is saved`:'Your campaign progress & rewards',f(13,12),this.preview?FANTASY_TEXT.warning:FANTASY_TEXT.muted).setOrigin(.5);
  if(this.list.showCounter)this.counter=text(480,m.mobile?66:90,`${this.list.unlockedCount} / ${this.list.total}  unlocked`,f(16,13),FANTASY_TEXT.primary,true).setOrigin(.5);
  const top=m.mobile?84:114,bottom=m.mobile?466:462,x=m.mobile?60:130,w=m.mobile?840:700,h=m.mobile?92:100,gap=12;
  this.cards=this.add.container(0,0);
  if(!this.list.cards.length){
   drawFantasyPanel(this.add.graphics(),{x,y:top+20,width:w,height:140},1);
   this.emptyState=text(480,top+90,'No achievements to show yet.\nReach a mission that has one and it will appear here.',f(16,13),FANTASY_TEXT.muted,false,w-60).setOrigin(.5).setAlign('center');
  }else this.list.cards.forEach((card,i)=>this.drawCard(card,x,top+i*(h+gap),w,h,m));
  // More cards than fit: drag or wheel scrolls the container inside the list area.
  const content=this.list.cards.length*(h+gap)-gap;this.minScroll=Math.min(0,(bottom-top)-content);
  if(this.minScroll<0){
   this.cards.setMask(this.add.graphics().fillRect(0,top,960,bottom-top).createGeometryMask().setInvertAlpha(false));
   this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>this.scrollTo(this.scroll-dy));
   this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.isDown&&Math.abs(p.y-p.prevPosition.y)>0)this.scrollTo(this.scroll+(p.y-p.prevPosition.y)/m.k);});
  }
  if(!achievements.persistent&&!this.preview)this.warning=text(480,m.mobile?476:484,"Progress can't be saved in this browser.",f(11,11),'#f0b36b',true).setOrigin(.5);
  const by=m.mobile?500:508,bw=m.mobile?220:240,art=this.add.graphics();drawFantasyButton(art,480-bw/2,by-22,bw,44,1,'secondary');
  this.add.text(480,by,'BACK',{fontFamily:UI_FONT,fontSize:'17px',fontStyle:'bold',color:FANTASY_TEXT.primary}).setOrigin(.5);
  this.backButton=this.add.rectangle(480,by,bw,Math.max(44,48/m.k),0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.scene.start('MainMenu'));
  window.visualReady=true;
 }
 private scrollTo(y:number){this.scroll=Math.max(this.minScroll,Math.min(0,y));this.cards.setY(this.scroll);}
 private drawCard(card:AchievementCard,x:number,y:number,w:number,h:number,m:ReturnType<typeof menuScale>){
  const f=m.font,add=<T extends Phaser.GameObjects.GameObject>(o:T):T=>{this.cards.add(o);return o;};
  const g=add(this.add.graphics());drawFantasyPanel(g,{x,y,width:w,height:h},1);
  const done=card.unlocked,ink=done?FANTASY_TEXT.primary:'#8c99a1',sub=done?FANTASY_TEXT.muted:'#738089';
  if(!done)add(this.add.rectangle(x+w/2,y+h/2,w-8,h-8,0x1b232a,.55));
  // badge
  const cx=x+44,cy=y+h/2;g.fillStyle(done?0x3a5c2e:0x2a3238,1).fillCircle(cx,cy,26).lineStyle(2,done?FANTASY.goldBright:0x5b666d,1).strokeCircle(cx,cy,26);
  if(done)drawCheck(g,cx,cy,22,FANTASY.goldBright);else drawLock(g,cx,cy,22,0x8c99a1);
  const tx=x+86,rw=card.replay?190:0,tw=w-86-rw-20;
  add(this.add.text(tx,y+12,card.def.title,{fontFamily:UI_FONT,fontSize:`${f(18,14)}px`,fontStyle:'bold',color:done?FANTASY_TEXT.gold:ink}));
  add(this.add.text(tx,y+36,card.def.description,{fontFamily:UI_FONT,fontSize:`${f(13,12)}px`,color:sub,wordWrap:{width:tw}}));
  const status=done?`Unlocked ${dateOf(card.unlockedAt!)}${card.bestTicks?`  ·  Best time ${formatTicks(card.bestTicks)}`:''}`:'Locked';
  add(this.add.text(tx,y+h-26,`Reward: ${card.def.reward}   ·   ${status}`,{fontFamily:UI_FONT,fontSize:`${f(12,11)}px`,color:done?'#9fd48a':'#738089',wordWrap:{width:tw}}));
  if(card.replay){
   const bx=x+w-rw-10,bwid=rw-10,bh=40,by=y+h/2-bh/2,btn=add(this.add.graphics());drawFantasyButton(btn,bx,by,bwid,bh,1,'primary');
   add(this.add.text(bx+bwid/2,by+bh/2,done?'REPLAY':'PLAY',{fontFamily:UI_FONT,fontSize:'16px',fontStyle:'bold',color:FANTASY_TEXT.ink}).setOrigin(.5));
   const hit=add(this.add.rectangle(bx+bwid/2,by+bh/2,bwid,Math.max(bh,44/m.k),0,0).setInteractive({useHandCursor:true}));
   hit.on('pointerup',(p:Phaser.Input.Pointer)=>{if(Math.abs(p.upY-p.downY)>8)return;this.scene.start('MissionBriefing',{levelId:card.def.levelId,returnTo:{scene:'ChapterSelect'}});});
   this.replayButtons.set(card.def.id,hit);
  }
 }
}

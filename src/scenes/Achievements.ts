import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {campaignProgress} from '../data/campaignProgressStore';
import {achievements} from '../data/achievementStore';
import {achievementList,previewList,previewModes,type AchievementCard,type AchievementList,type PreviewMode} from '../data/achievementView';
import {formatTicks} from '../data/achievements';
import {currentLocale,localeFont,t} from '../i18n';
import {achievementDisplay} from '../i18n/achievement';
import {localizedWrap,wrapLocalizedText} from '../i18n/textLayout';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawCheck,drawFantasyButton,drawFantasyPanel,drawLock,FANTASY,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

export interface AchievementsLaunch{preview?:PreviewMode}
const dateOf=(ms:number)=>new Date(ms).toLocaleDateString({en:'en-GB',th:'th-TH',ja:'ja-JP'}[currentLocale()],{day:'numeric',month:'short',year:'numeric',calendar:'gregory'});

// Achievement V1 screen: one card per visible achievement (data: achievementView.ts). Unlocked cards carry the date and best time; locked ones are grey; Replay goes through the Mission Briefing, which enforces the unlock rules itself.
// With a preview (dev builds only, ?achievementsPreview=...) the cards come from fixtures and nothing is read from or written to the real save.
export class Achievements extends Phaser.Scene{
 public backButton!:Phaser.GameObjects.Rectangle;
 public replayButtons=new Map<string,Phaser.GameObjects.Rectangle>();
 public list:AchievementList={cards:[],unlockedCount:0,total:0,showCounter:false};
 public counter?:Phaser.GameObjects.Text;public emptyState?:Phaser.GameObjects.Text;public warning?:Phaser.GameObjects.Text;
 private preview?:PreviewMode;
 private scroll=0;private minScroll=0;private cards!:Phaser.GameObjects.Container;
 private listTop=0;private listBottom=540;
 constructor(){super('Achievements');}
 preload(){preloadMenuBackdrop(this);}
 init(data?:AchievementsLaunch){this.preview=import.meta.env.DEV&&data?.preview&&previewModes.includes(data.preview)?data.preview:undefined;}
 create(){
  drawMenuBackdrop(this);const m=menuScale(this),f=m.font;restartOnBreakpoint(this,m.mobile);
  this.replayButtons=new Map();this.counter=undefined;this.emptyState=undefined;this.warning=undefined;this.scroll=0;
  if(this.preview)this.list=previewList(this.preview);
  else{campaignProgress.refresh();achievements.refresh();this.list=achievementList(achievements.save,campaign.list(),campaignProgress.progress);}
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,width?:number)=>this.add.text(x,y,value,{fontFamily:localeFont(UI_FONT),fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...(width?{wordWrap:localizedWrap(width)}:{})});
  const title=text(480,12,t('achievements'),f(28,18),FANTASY_TEXT.gold,true).setOrigin(.5,0);
  const subtitle=text(480,title.getBottomCenter().y+3,this.preview?`PREVIEW (${this.preview}) · fixture data, nothing is saved`:t('achievementSubtitle'),f(13,12),this.preview?FANTASY_TEXT.warning:FANTASY_TEXT.muted).setOrigin(.5,0);
  if(this.list.showCounter)this.counter=text(480,subtitle.getBottomCenter().y+4,t('achievementCount',{count:this.list.unlockedCount,total:this.list.total}),f(16,13),FANTASY_TEXT.primary,true).setOrigin(.5,0);
  const backHeight=Math.max(44,48/m.k),by=530-backHeight/2,bw=m.mobile?220:240;
  const hasWarning=!achievements.persistent&&!this.preview;
  const top=(this.counter??subtitle).getBottomCenter().y+8,bottom=by-backHeight/2-(hasWarning?f(29,19):8);
  this.listTop=top;this.listBottom=bottom;
  const x=m.mobile?40:130,w=960-2*x,gap=12;
  const art=this.add.graphics();
  this.cards=this.add.container(0,0);
  if(!this.list.cards.length){
   drawFantasyPanel(this.add.graphics(),{x,y:top+20,width:w,height:140},1);
   this.emptyState=text(480,top+90,t('achievementEmpty'),f(16,13),FANTASY_TEXT.muted,false,w-60).setOrigin(.5).setAlign('center');
  }
  let content=0;
  for(const card of this.list.cards)content+=this.drawCard(card,x,top+content,w,m)+gap;
  // More cards than fit: drag or wheel scrolls the container inside the list area.
  this.minScroll=Math.min(0,(bottom-top)-Math.max(0,content-gap));
  if(this.minScroll<0){
   const maskArt=this.make.graphics({},false).fillRect(0,top,960,bottom-top),mask=maskArt.createGeometryMask();
   this.cards.setMask(mask);
   this.events.once('shutdown',()=>{this.cards.clearMask();mask.destroy();maskArt.destroy();});
   this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>this.scrollTo(this.scroll-dy));
   this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.isDown&&Math.abs(p.y-p.prevPosition.y)>0)this.scrollTo(this.scroll+(p.y-p.prevPosition.y)/m.k);});
  }
  if(hasWarning)this.warning=text(480,bottom+3,t('saveWarning'),f(11,11),'#f0b36b',true).setOrigin(.5,0);
  drawFantasyButton(art,480-bw/2,by-backHeight/2,bw,backHeight,m.k,'secondary');
  text(480,by,t('back'),f(17,14),FANTASY_TEXT.primary,true).setOrigin(.5);
  this.backButton=this.add.rectangle(480,by,bw,backHeight,0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.scene.start('MainMenu'));
  window.visualReady=true;
 }
 private scrollTo(y:number){this.scroll=Math.max(this.minScroll,Math.min(0,y));this.cards.setY(this.scroll);}
 private drawCard(card:AchievementCard,x:number,y:number,w:number,m:ReturnType<typeof menuScale>){
  const f=m.font,add=<T extends Phaser.GameObjects.GameObject>(o:T):T=>{this.cards.add(o);return o;};
  const g=add(this.add.graphics()),dim=add(this.add.graphics());
  const done=card.unlocked,ink=done?FANTASY_TEXT.primary:'#8c99a1',sub=done?FANTASY_TEXT.muted:'#738089';
  const tx=x+86,rw=card.replay?190:0,tw=w-86-rw-20,c=achievementDisplay(card.def);
  const line=(value:string,yy:number,size:number,color:string,bold=false)=>add(this.add.text(tx,yy,value,{fontFamily:localeFont(UI_FONT),fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color}));
  const title=wrapLocalizedText(line(c.title,y+9,f(18,14),done?FANTASY_TEXT.gold:ink,true),tw);
  const description=wrapLocalizedText(line(c.description,title.getBottomCenter().y+2,f(13,12),sub),tw);
  const status=done?t('achievementUnlockedDate',{date:dateOf(card.unlockedAt!)}):t('achievementLocked');
  const details=[t('achievementReward',{reward:c.reward}),status].join(' · ');
  const best=card.bestTicks&&done?t('achievementBestTime',{time:formatTicks(card.bestTicks)}):'';
  const footer=line(best?`${details} · ${best}`:details,description.getBottomCenter().y+4,f(12,11),done?'#9fd48a':'#738089');
  if(best&&footer.width>tw)footer.setText(`${details}\n${best}`);
  wrapLocalizedText(footer,tw);
  const h=Math.max(100,48/m.k+12,footer.getBottomCenter().y-y+10);
  drawFantasyPanel(g,{x,y,width:w,height:h},1);
  if(!done)dim.fillStyle(0x1b232a,.55).fillRect(x+4,y+4,w-8,h-8);
  // badge
  const cx=x+44,cy=y+h/2;g.fillStyle(done?0x3a5c2e:0x2a3238,1).fillCircle(cx,cy,26).lineStyle(2,done?FANTASY.goldBright:0x5b666d,1).strokeCircle(cx,cy,26);
  if(done)drawCheck(g,cx,cy,22,FANTASY.goldBright);else drawLock(g,cx,cy,22,0x8c99a1);
  if(card.replay){
   const bx=x+w-rw-10,bwid=rw-10,bh=Math.max(40,44/m.k),by=y+h/2-bh/2,btn=add(this.add.graphics());drawFantasyButton(btn,bx,by,bwid,bh,m.k,'primary');
   add(this.add.text(bx+bwid/2,by+bh/2,t(done?'replay':'play'),{fontFamily:localeFont(UI_FONT),fontSize:`${f(16,14)}px`,fontStyle:'bold',color:FANTASY_TEXT.ink}).setOrigin(.5));
   const hit=add(this.add.rectangle(bx+bwid/2,by+bh/2,bwid,Math.max(bh,44/m.k),0,0).setInteractive({useHandCursor:true}));
   hit.on('pointerup',(p:Phaser.Input.Pointer)=>{if(Math.abs(p.upY-p.downY)>8||p.y<this.listTop||p.y>this.listBottom)return;this.scene.start('MissionBriefing',{levelId:card.def.levelId,returnTo:{scene:'ChapterSelect'}});});
   this.replayButtons.set(card.def.id,hit);
  }
  return h;
 }
}

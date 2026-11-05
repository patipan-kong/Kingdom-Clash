import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import {missionOf,type LevelDefinition} from '../data/campaign';
import type {BattleLaunch} from '../data/campaignUi';
import {campaignDestination,type CampaignDestination,type MissionNavigation} from '../data/campaignNavigation';
import {campaignProgress} from '../data/campaignProgressStore';
import {isSequential,specialModeHeading} from '../data/campaignProgress';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {enterFullscreenOnTouch} from '../ui/fullscreen';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawFantasyButton,drawFantasyPanel,FANTASY,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

const objectives=(level:LevelDefinition)=>level.mission?level.mission.phases.flatMap(p=>p.objectives.map(o=>o.display?.label??o.type)):['Destroy the Crimson Keep'];
const defeat=(level:LevelDefinition)=>{const f=level.mission?.failure?.azureKeepHpBelow;if(f===undefined)return 'Azure Keep destroyed.';const pct=Math.round(f*100);return `Azure Keep HP falls below ${pct}% (exactly ${pct}% is safe).`;};

export class MissionBriefing extends Phaser.Scene{
 public levelId='';public startButton!:Phaser.GameObjects.Rectangle;public backButton!:Phaser.GameObjects.Rectangle;
 private content!:Phaser.GameObjects.Container;
 private clip!:{left:number;right:number;top:number;bottom:number};
 private footerFrame!:{x:number;y:number;width:number;height:number};
 private scrollBar!:Phaser.GameObjects.Graphics;
 private scroll=0;private minScroll=0;private moved=0;
 private returnTo:CampaignDestination={scene:'ChapterSelect'};
 constructor(){super('MissionBriefing');}
 preload(){preloadMenuBackdrop(this);}
 init(data?:MissionNavigation){this.levelId=data?.levelId??'';this.returnTo=data?.returnTo??{scene:'ChapterSelect'};}
 create(){
  // Locked or unknown levels cannot be opened by scene navigation either: back to the list, before anything is drawn.
  campaignProgress.refresh();
  this.returnTo=campaignDestination(campaign.list(),campaignProgress.progress,this.levelId,this.returnTo);
  if(!campaign.has(this.levelId)||!campaignProgress.isUnlocked(campaign.get(this.levelId))){this.goBack();return;}
  const level=campaign.get(this.levelId);drawMenuBackdrop(this);const m=menuScale(this),f=m.font,mobile=m.mobile;restartOnBreakpoint(this,mobile);
  // Mobile landscape: a wider panel and larger text (>= 12 CSS px for body copy) laid out by flow instead of fixed offsets.
  const panel={x:mobile?32:108,y:mobile?12:32,width:mobile?896:744,height:mobile?516:476},left=panel.x+(mobile?28:32),wrap=panel.width-(mobile?56:64);
  const art=this.add.graphics();drawFantasyPanel(art,panel,1);
  const text=(x:number,y:number,value:string,size:number,color:string,bold=false,width?:number,spacing=0)=>this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,fontStyle:bold?'bold':'normal',color,...(width?{wordWrap:{width}}:{}),...(spacing?{lineSpacing:spacing}:{})});
  const hitHeight=Math.max(44,48/m.k),bw=mobile?270:258,sw=mobile?250:220;
  const by=Math.min(panel.y+panel.height-(mobile?52:66),panel.y+panel.height-6-hitHeight/2-22);
  const footerTop=by+22-hitHeight/2-8;
  // Keep readable text sizes. Long content scrolls inside a mask above the fixed footer.
  const chapter=text(left,0,isSequential(level)?`CHAPTER ${level.chapter}  ·  MISSION ${missionOf(level.number)}`:specialModeHeading,f(12,11),FANTASY_TEXT.gold,true);
  const title=text(left,0,level.display.title,30,FANTASY_TEXT.primary,true);
  const brief=text(left,0,level.display.briefing,f(14,13),FANTASY_TEXT.muted,false,wrap,mobile?3:4);
  const head=text(left,0,'PRIMARY OBJECTIVES',f(12,11),FANTASY_TEXT.gold,true);
  const rows=objectives(level).map(line=>text(left+12,0,`◆  ${line}`,f(16,14),FANTASY_TEXT.primary,true,wrap-12));
  // No Victory Requirement block: a mission is won when every objective is done, which the objective list already says.
  const dh=text(left,0,'DEFEAT CONDITION',f(11,11),'#ffaea4',true),dt=text(left,0,defeat(level),f(13,12),FANTASY_TEXT.primary,true,wrap);
  const tip=level.display.strategy?text(left,0,`TIP  ${level.display.strategy}`,f(12,12),FANTASY_TEXT.muted,false,wrap,mobile?2:3):null;
  const attach=mobile?4:5,rowGap=mobile?5:6,titleGap=mobile?4:6;
  const stack=(parts:Phaser.GameObjects.Text[],gap:number)=>parts.reduce((n,t)=>n+t.height,0)+gap*(parts.length-1);
  const sections=[
   {height:chapter.height+titleGap+title.height,place:(y:number)=>{chapter.setY(y);title.setY(y+chapter.height+titleGap);}},
   {height:brief.height,place:(y:number)=>{brief.setY(y);}},
   {height:head.height+attach+stack(rows,rowGap),place:(y:number)=>{head.setY(y);let r=y+head.height+attach;for(const row of rows){row.setY(r);r+=row.height+rowGap;}}},
   {height:dh.height+attach+dt.height,place:(y:number)=>{dh.setY(y);dt.setY(y+dh.height+attach);}},
   ...(tip?[{height:tip.height,place:(y:number)=>{tip.setY(y);}}]:[]),
  ];
  const top=panel.y+(mobile?16:28);
  this.clip={left:panel.x+12,right:panel.x+panel.width-12,top,bottom:Math.max(top+1,footerTop-8)};
  const room=this.clip.bottom-top,used=sections.reduce((n,sec)=>n+sec.height,0);
  const gap=Math.max(3,Math.min(32,(room-used)/(sections.length-1)));
  let y=top;const rules=this.add.graphics().lineStyle(1,FANTASY.bronze,.5);
  sections.forEach((sec,i)=>{
   // A hairline only before the objectives and before the tip.
   if(i===2||(tip&&i===4)){const ry=Math.round(y-gap/2);rules.lineBetween(left,ry,left+wrap,ry);}
   sec.place(y);y+=sec.height+gap;
  });
  this.content=this.add.container();this.content.add([chapter,title,brief,head,...rows,dh,dt,...(tip?[tip]:[]),rules]);
  this.scroll=0;this.moved=0;this.minScroll=Math.min(0,this.clip.bottom-(y-gap));
  const maskArt=this.make.graphics({x:0,y:0},false);maskArt.fillStyle(0xffffff).fillRect(this.clip.left,this.clip.top,this.clip.right-this.clip.left,this.clip.bottom-this.clip.top);
  const mask=maskArt.createGeometryMask();this.content.setMask(mask);
  this.scrollBar=this.add.graphics();this.setScroll(0);
  const inside=(p:Phaser.Input.Pointer)=>p.x>=this.clip.left&&p.x<=this.clip.right&&p.y>=this.clip.top&&p.y<=this.clip.bottom;
  let drag:{id:number;y:number;scroll:number}|undefined;
  const down=(p:Phaser.Input.Pointer)=>{this.moved=0;drag=inside(p)?{id:p.id,y:p.y,scroll:this.scroll}:undefined;};
  const move=(p:Phaser.Input.Pointer)=>{if(!drag||p.id!==drag.id||!p.isDown)return;this.moved=Math.max(this.moved,Math.abs(p.y-drag.y));this.setScroll(drag.scroll+p.y-drag.y);};
  const up=()=>{drag=undefined;};
  const wheel=(p:Phaser.Input.Pointer,_objects:unknown,_dx:number,dy:number)=>{if(inside(p))this.setScroll(this.scroll-dy/m.k);};
  this.input.on('pointerdown',down).on('pointermove',move).on('pointerup',up).on('gameout',up).on('wheel',wheel);
  this.events.once('shutdown',()=>{this.input.off('pointerdown',down).off('pointermove',move).off('pointerup',up).off('gameout',up).off('wheel',wheel);drag=undefined;mask.destroy();maskArt.destroy();});
  this.footerFrame={x:panel.x+6,y:footerTop,width:panel.width-12,height:panel.y+panel.height-6-footerTop};
  const footer=this.add.graphics();footer.fillStyle(0x071a28,1).fillRect(this.footerFrame.x,this.footerFrame.y,this.footerFrame.width,this.footerFrame.height);
  footer.lineStyle(1,FANTASY.bronze,.7).lineBetween(left,footerTop,panel.x+panel.width-(mobile?28:32),footerTop);
  const startArt=this.add.graphics();drawFantasyButton(startArt,panel.x+panel.width-(mobile?28:32)-bw,by,bw,44,1,'primary');
  const startX=panel.x+panel.width-(mobile?28:32)-bw/2;
  this.startButton=this.add.rectangle(startX,by+22,bw,hitHeight,0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved>10)return;enterFullscreenOnTouch();this.scene.start('Battle',{mode:'campaign',levelId:level.id,returnTo:this.returnTo} satisfies BattleLaunch);});
  text(startX,by+22,'START BATTLE',f(14,13),FANTASY_TEXT.ink,true).setOrigin(.5);
  const backArt=this.add.graphics();drawFantasyButton(backArt,left,by,sw,44,1,'secondary');
  this.backButton=this.add.rectangle(left+sw/2,by+22,sw,hitHeight,0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>{if(this.moved<=10)this.goBack();});
  text(left+sw/2,by+22,this.returnTo.scene==='ChapterSelect'?'BACK TO CHAPTERS':'BACK TO MISSIONS',f(12,12),FANTASY_TEXT.primary,true).setOrigin(.5);
 }
 private setScroll(value:number){
  this.scroll=Math.max(this.minScroll,Math.min(0,value));this.content.y=this.scroll;this.scrollBar.clear();
  if(this.minScroll>=0)return;
  const h=this.clip.bottom-this.clip.top,thumb=Math.max(24,h*h/(h-this.minScroll)),y=this.clip.top+(h-thumb)*this.scroll/this.minScroll;
  this.scrollBar.fillStyle(FANTASY.gold,.12).fillRoundedRect(this.clip.right-4,this.clip.top,3,h,1.5);
  this.scrollBar.fillStyle(FANTASY.gold,.75).fillRoundedRect(this.clip.right-4,y,3,thumb,1.5);
 }
 private goBack(){const route=this.returnTo;this.scene.start(route.scene,route.scene==='CampaignSelect'?route.data:undefined);}
}

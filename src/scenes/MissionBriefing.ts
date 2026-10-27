import Phaser from 'phaser';
import {campaign} from '../data/campaignLevels';
import type {LevelDefinition} from '../data/campaign';
import type {BattleLaunch} from '../data/campaignUi';
import {campaignDestination,type CampaignDestination,type MissionNavigation} from '../data/campaignNavigation';
import {campaignProgress} from '../data/campaignProgressStore';
import {isSequential,specialModeHeading} from '../data/campaignProgress';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';

const objectives=(level:LevelDefinition)=>level.mission?level.mission.phases.flatMap(p=>p.objectives.map(o=>o.display?.label??o.type)):['Destroy the Crimson Keep'];
const defeat=(level:LevelDefinition)=>{const f=level.mission?.failure?.azureKeepHpBelow;if(f===undefined)return 'Azure Keep destroyed.';const pct=Math.round(f*100);return `Azure Keep HP falls below ${pct}% (exactly ${pct}% is safe).`;};

export class MissionBriefing extends Phaser.Scene{
 public levelId='';public startButton!:Phaser.GameObjects.Rectangle;public backButton!:Phaser.GameObjects.Rectangle;
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
  const bottom=(t:Phaser.GameObjects.Text)=>t.y+t.height;
  const chapter=text(left,panel.y+(mobile?16:28),isSequential(level)?`CHAPTER ${level.chapter}  ·  LEVEL ${level.number}`:specialModeHeading,f(12,11),FANTASY_TEXT.gold,true);
  const title=text(left,bottom(chapter)+(mobile?4:8),level.display.title,30,FANTASY_TEXT.primary,true);
  const brief=text(left,mobile?bottom(title)+8:126,level.display.briefing,f(14,13),FANTASY_TEXT.muted,false,wrap,mobile?3:4);
  let y=mobile?bottom(brief)+12:198;
  const head=text(left,y,'PRIMARY OBJECTIVES',f(12,11),FANTASY_TEXT.gold,true);y=bottom(head)+(mobile?5:8);
  for(const line of objectives(level)){const row=text(left+12,y,`◆  ${line}`,f(16,14),FANTASY_TEXT.primary,true);y=bottom(row)+(mobile?5:6);}
  y+=mobile?4:6;
  const vh=text(left,y,'VICTORY REQUIREMENT',f(11,11),'#8cebd1',true),vt=text(left,bottom(vh)+(mobile?2:5),level.mission?'Complete all primary objectives.':'Destroy the Crimson Keep.',f(13,12),FANTASY_TEXT.primary);y=bottom(vt)+(mobile?8:14);
  const dh=text(left,y,'DEFEAT CONDITION',f(11,11),'#ffaea4',true),dt=text(left,bottom(dh)+(mobile?2:5),defeat(level),f(13,12),FANTASY_TEXT.primary,true);y=bottom(dt)+(mobile?10:14);
  if(level.display.strategy)text(left,y,`TIP  ${level.display.strategy}`,f(12,12),FANTASY_TEXT.muted,false,wrap,mobile?2:3);
  const hitHeight=Math.max(44,48/m.k),by=panel.y+panel.height-(mobile?52:66),bw=mobile?270:258,sw=mobile?250:220;
  const startArt=this.add.graphics();drawFantasyButton(startArt,panel.x+panel.width-(mobile?28:32)-bw,by,bw,44,1,'primary');
  const startX=panel.x+panel.width-(mobile?28:32)-bw/2;
  this.startButton=this.add.rectangle(startX,by+22,bw,hitHeight,0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.scene.start('Battle',{mode:'campaign',levelId:level.id,returnTo:this.returnTo} satisfies BattleLaunch));
  text(startX,by+22,'START BATTLE',f(14,13),FANTASY_TEXT.ink,true).setOrigin(.5);
  const backArt=this.add.graphics();drawFantasyButton(backArt,left,by,sw,44,1,'secondary');
  this.backButton=this.add.rectangle(left+sw/2,by+22,sw,hitHeight,0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>this.goBack());
  text(left+sw/2,by+22,this.returnTo.scene==='ChapterSelect'?'BACK TO CHAPTERS':'BACK TO LEVEL SELECT',f(12,12),FANTASY_TEXT.primary,true).setOrigin(.5);
 }
 private goBack(){const route=this.returnTo;this.scene.start(route.scene,route.scene==='CampaignSelect'?route.data:undefined);}
}

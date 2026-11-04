import {createMenuCrest,drawMenuRule,drawOrnateMenuButton,drawOrnateMenuPanel,finishMenuTitle,placeMenuCrest,preloadMenuArt,MENU_TITLE_FONT} from '../ui/menuArt';
import {drawMenuIcon,type MenuIcon} from '../ui/menuIcon';
import Phaser from 'phaser';
import {FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import type {BattleLaunch} from '../data/campaignUi';
import {encounterFromUrl} from './Battle';
import {campaign} from '../data/campaignLevels';
import {campaignProgress} from '../data/campaignProgressStore';
import {campaignChapters} from '../data/campaignChapters';
import {enterFullscreenOnTouch} from '../ui/fullscreen';
import {debugLevelFromSearch} from '../data/debugLaunch';
import {missionLabel} from '../data/campaign';
import {previewModes,type PreviewMode} from '../data/achievementView';

// Development only: ?debug=1&level=N or &chapter=C&mission=M opens that mission's battle directly, outside the unlock and progress rules (Battle.init).
const debugLevel=()=>debugLevelFromSearch(location.search,import.meta.env.DEV||import.meta.env.VITE_PLAYTEST==='1',campaignChapters,id=>campaign.has(id));
// Full Battle / Quick Play are hidden from the menu until they are polished; the mode, its scene and the ?quickplay / ?encounter links are untouched.
const SHOW_LEGACY_MODES=false;
// Development only: ?achievementsPreview=mixed|locked|unlocked|empty opens the Achievement screen on fixture cards (never read from or written to the real save).
const achievementsPreview=()=>{const v=new URLSearchParams(location.search).get('achievementsPreview');return import.meta.env.DEV&&previewModes.includes(v as PreviewMode)?v as PreviewMode:null;};
const directLaunch=()=>{const q=new URLSearchParams(location.search);return q.has('encounter')||q.get('quickplay')==='1'||import.meta.env.DEV&&(q.get('campaignFixture')==='staged'||q.has('battlefield'));};

export class MainMenu extends Phaser.Scene{
 public continueButton!:Phaser.GameObjects.Rectangle;
 public continueState:'start'|'continue'|'up-to-date'='start';
 public campaignButton!:Phaser.GameObjects.Rectangle;
 public achievementsButton!:Phaser.GameObjects.Rectangle;
 public menuFrame!: {x:number;y:number;width:number;height:number};
 public missionSubtitle!:Phaser.GameObjects.Text;
 public quickPlayButton!:Phaser.GameObjects.Rectangle;
 constructor(){super('MainMenu');}
 preload(){preloadMenuBackdrop(this);preloadMenuArt(this);}
 create(){
  const debugId=debugLevel();
  const preview=achievementsPreview();
  if(preview){this.scene.start('Achievements',{preview});return;}
  if(debugId){this.scene.start('Battle',{mode:'campaign',levelId:debugId,debug:true} satisfies BattleLaunch);return;}
  if(directLaunch()){const fixture=import.meta.env.DEV&&new URLSearchParams(location.search).get('campaignFixture')==='staged';this.scene.start('Battle',fixture?{mode:'campaign',levelId:'campaign-01'} satisfies BattleLaunch:{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch);return;}
  drawMenuBackdrop(this);const m=menuScale(this);restartOnBreakpoint(this,m.mobile);
  const p=(n:number)=>n/m.k,width=Math.min(960-p(24),Math.max(620,p(416))),height=Math.min(540-p(16),Math.max(330,p(236)));
  const f=this.menuFrame={x:480-width/2,y:270-height/2,width,height};
  const art=this.add.graphics();drawOrnateMenuPanel(art,f,m.k);placeMenuCrest(createMenuCrest(this),f,m.k);
  const title=this.add.text(480,f.y+height*.13,'KINGDOM CLASH',{fontFamily:UI_FONT,fontSize:m.font(42,25)+'px',fontStyle:'bold',color:FANTASY_TEXT.gold,stroke:'#06191e',strokeThickness:4}).setOrigin(.5);finishMenuTitle(title,m.k);
  this.add.text(480,f.y+height*.26,'Defend the Azure Realm',{fontFamily:UI_FONT,fontSize:m.font(18,13)+'px',color:FANTASY_TEXT.muted}).setOrigin(.5);
  const rule=this.add.graphics();drawMenuRule(rule,f.x+p(36),f.y+height*.33,width-p(72),m.k);
  // Start / Continue / Up to date all come from the shared progression model. Continue opens a Mission Briefing, never a battle.
  campaignProgress.refresh();const progress=campaignProgress.progress,next=progress.next,done=progress.completed.length;
  this.continueState=next?(done?'continue':'start'):'up-to-date';
  const sub=next?`${missionLabel(next)} — ${campaign.get(next.id).display.title}`:done>1?`${done} missions complete`:done===1?'1 mission complete':'No campaign missions available';
  const inner=width-p(32),primaryWidth=Math.min(inner,p(360)),buttonHeight=Math.max(54,p(48)),gap=p(16),secondaryWidth=(inner-gap)/2;
  this.continueButton=this.button(480,f.y+height*.48,primaryWidth,buttonHeight,{continue:'CONTINUE CAMPAIGN',start:'START CAMPAIGN','up-to-date':'CAMPAIGN UP TO DATE'}[this.continueState],()=>this.scene.start(next?'MissionBriefing':'CampaignSelect',next?{levelId:next.id}:undefined),'start',true);
  this.missionSubtitle=this.add.text(480,f.y+height*.67,sub,{fontFamily:UI_FONT,fontSize:m.font(14,12)+'px',color:FANTASY_TEXT.primary,align:'center',wordWrap:{width:primaryWidth}}).setOrigin(.5);
  this.campaignButton=this.button(480-(secondaryWidth+gap)/2,f.y+height*.84,secondaryWidth,buttonHeight,'CAMPAIGN',()=>this.scene.start('ChapterSelect'),'campaign');
  this.achievementsButton=this.button(480+(secondaryWidth+gap)/2,f.y+height*.84,secondaryWidth,buttonHeight,'ACHIEVEMENTS',()=>this.scene.start('Achievements'),'achievements');
  if(SHOW_LEGACY_MODES){
  this.quickPlayButton=this.button(480,470,340,54,'FULL BATTLE / QUICK PLAY',()=>this.scene.start('Battle',{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch),'start');
  this.add.text(480,520,'Campaign missions  ·  Original Full Battle',{fontFamily:UI_FONT,fontSize:`${m.font(12,12)}px`,color:FANTASY_TEXT.muted}).setOrigin(.5);
  }
  window.visualReady=false;
 }
 private button(x:number,y:number,width:number,height:number,label:string,action:()=>void,icon:MenuIcon,primary=false){
  const m=menuScale(this),p=(n:number)=>n/m.k,art=this.add.graphics(),mark=this.add.graphics();
  const draw=(pressed=false)=>drawOrnateMenuButton(art,x-width/2,y-height/2,width,height,m.k,primary,pressed);draw();
  const hit=this.add.rectangle(x,y,width,height,0,0).setInteractive({useHandCursor:true});
  hit.on('pointerdown',()=>draw(true)).on('pointerout',()=>draw()).on('pointerup',()=>{draw();enterFullscreenOnTouch();action();});
  const text=this.add.text(x+p(13),y,label,{fontFamily:primary?MENU_TITLE_FONT:UI_FONT,fontSize:m.font(primary?19:17,primary?16:14)+'px',fontStyle:'bold',color:primary?'#251a0c':FANTASY_TEXT.primary}).setOrigin(.5).setResolution(Math.min(3,devicePixelRatio||1));
  const groupWidth=text.width+p(26);drawMenuIcon(mark,icon,x-groupWidth/2+p(9),y,p(18),primary?0x102536:0xffe4a0);
  return hit;
 }
}

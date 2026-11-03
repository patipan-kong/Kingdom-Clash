import Phaser from 'phaser';
import {drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';
import {menuScale,restartOnBreakpoint} from '../ui/menuScale';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import type {BattleLaunch} from '../data/campaignUi';
import {encounterFromUrl} from './Battle';
import {campaign} from '../data/campaignLevels';
import {campaignProgress} from '../data/campaignProgressStore';
import {campaignChapters} from '../data/campaignChapters';
import {enterFullscreenOnTouch} from '../ui/fullscreen';
import {debugLevelFromSearch} from '../data/debugLaunch';
import {missionLabel,missionOf} from '../data/campaign';
import {previewModes,type PreviewMode} from '../data/achievementView';

// Development only: ?debug=1&level=N or &chapter=C&mission=M opens that mission's battle directly, outside the unlock and progress rules (Battle.init).
const debugLevel=()=>debugLevelFromSearch(location.search,import.meta.env.DEV,campaignChapters,id=>campaign.has(id));
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
 public quickPlayButton!:Phaser.GameObjects.Rectangle;
 constructor(){super('MainMenu');}
 preload(){preloadMenuBackdrop(this);}
 create(){
  const debugId=debugLevel();
  const preview=achievementsPreview();
  if(preview){this.scene.start('Achievements',{preview});return;}
  if(debugId){this.scene.start('Battle',{mode:'campaign',levelId:debugId,debug:true} satisfies BattleLaunch);return;}
  if(directLaunch()){const fixture=import.meta.env.DEV&&new URLSearchParams(location.search).get('campaignFixture')==='staged';this.scene.start('Battle',fixture?{mode:'campaign',levelId:'campaign-01'} satisfies BattleLaunch:{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch);return;}
  drawMenuBackdrop(this);const m=menuScale(this);restartOnBreakpoint(this,m.mobile);
  const art=this.add.graphics();drawFantasyPanel(art,{x:210,y:70,width:540,height:SHOW_LEGACY_MODES?460:380},1);
  this.add.text(480,128,'KINGDOM CLASH',{fontFamily:UI_FONT,fontSize:'42px',fontStyle:'bold',color:FANTASY_TEXT.gold,stroke:'#06191e',strokeThickness:6}).setOrigin(.5);
  this.add.text(480,182,'Defend the Azure Realm',{fontFamily:UI_FONT,fontSize:`${m.font(18,13)}px`,color:FANTASY_TEXT.muted}).setOrigin(.5);
  // Start / Continue / Up to date all come from the shared progression model. Continue opens a Mission Briefing, never a battle.
  campaignProgress.refresh();const progress=campaignProgress.progress,next=progress.next,done=progress.completed.length;
  this.continueState=next?(done?'continue':'start'):'up-to-date';
  const sub=next?`${missionLabel(next)} — ${campaign.get(next.id).display.title}`:done>1?`${done} missions complete`:done===1?'1 mission complete':'No campaign missions available';
  this.continueButton=this.button(480,246,{continue:'CONTINUE CAMPAIGN',start:'START CAMPAIGN','up-to-date':'CAMPAIGN UP TO DATE'}[this.continueState],()=>this.scene.start(next?'MissionBriefing':'CampaignSelect',next?{levelId:next.id}:undefined),sub,m.font(12,12),next?`Ch ${campaign.get(next.id).chapter} · M${missionOf(next.number)} — ${campaign.get(next.id).display.title}`:undefined);
  this.campaignButton=this.button(480,322,'CAMPAIGN',()=>this.scene.start('ChapterSelect'));
  this.achievementsButton=this.button(480,398,'ACHIEVEMENTS',()=>this.scene.start('Achievements'));
  if(SHOW_LEGACY_MODES){
  this.quickPlayButton=this.button(480,470,'FULL BATTLE / QUICK PLAY',()=>this.scene.start('Battle',{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch));
  this.add.text(480,520,'Campaign missions  ·  Original Full Battle',{fontFamily:UI_FONT,fontSize:`${m.font(12,12)}px`,color:FANTASY_TEXT.muted}).setOrigin(.5);
  }
  window.visualReady=false;
 }
 private button(x:number,y:number,label:string,action:()=>void,subtext?:string,subSize=12,compact?:string){
  const art=this.add.graphics();drawFantasyButton(art,x-170,y-27,340,54,1,'primary');
  const scale=this.game.canvas.getBoundingClientRect().height/540,hit=this.add.rectangle(x,y,340,Math.max(54,48/scale),0,0).setInteractive({useHandCursor:true}).on('pointerup',()=>{enterFullscreenOnTouch();action();});
  this.add.text(x,subtext?y-9:y,label,{fontFamily:UI_FONT,fontSize:'17px',fontStyle:'bold',color:FANTASY_TEXT.ink}).setOrigin(.5);
  // A long mission title would run past the button on a phone, so the compact form replaces the full one only when it does not fit.
  if(subtext){const t=this.add.text(x,y+12,subtext,{fontFamily:UI_FONT,fontSize:`${subSize}px`,fontStyle:'bold',color:FANTASY_TEXT.ink}).setOrigin(.5);if(compact&&t.width>320)t.setText(compact);}
  return hit;
 }
}

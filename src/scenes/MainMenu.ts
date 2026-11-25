import {createMenuCrest,drawMenuRule,drawOrnateMenuButton,drawOrnateMenuPanel,finishMenuTitle,placeMenuCrest,preloadMenuArt,MENU_TITLE_FONT} from '../ui/menuArt';
import {drawMenuIcon,type MenuIcon} from '../ui/menuIcon';
import Phaser from 'phaser';
import {FANTASY,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';
import {menuScale} from '../ui/menuScale';
import {drawMenuBackdrop,preloadMenuBackdrop} from '../ui/menuBackdrop';
import type {BattleLaunch} from '../data/campaignUi';
import {encounterFromUrl} from './Battle';
import {campaign} from '../data/campaignLevels';
import {campaignProgress} from '../data/campaignProgressStore';
import {campaignChapters} from '../data/campaignChapters';
import {enterFullscreenOnTouch} from '../ui/fullscreen';
import {debugLevelFromSearch} from '../data/debugLaunch';
import {chapterOf,missionOf} from '../data/campaign';
import {previewModes,type PreviewMode} from '../data/achievementView';
import {SHOW_LEGACY_MODES} from '../ui/menuModes';
import {currentLocale,localeFont,locales,selectLocale,t,type Locale} from '../i18n';
import {missionDisplay} from '../i18n/campaign';
import {localizedWrap} from '../i18n/textLayout';
import {version} from '../../package.json';

// Development only: ?debug=1&level=N or &chapter=C&mission=M opens that mission's battle directly, outside the unlock and progress rules (Battle.init).
const debugLevel=()=>debugLevelFromSearch(location.search,import.meta.env.DEV||import.meta.env.VITE_PLAYTEST==='1',
 campaignChapters,id=>campaign.has(id));
// Development only: ?achievementsPreview=mixed|locked|unlocked|empty opens the Achievement screen on fixture cards (never read from or written to the real save).
const achievementsPreview=()=>{const v=new URLSearchParams(location.search).get('achievementsPreview');return import.meta.env.DEV&&previewModes.includes(v as PreviewMode)?v as PreviewMode:null;};
const directLaunch=()=>{const q=new URLSearchParams(location.search);return q.has('encounter')||q.get('quickplay')==='1'||import.meta.env.DEV&&(q.get('campaignFixture')==='staged'||q.has('battlefield'));};
const MIN_MENU_SCALE=.38; // Below this, scale the whole layout down together so the fixed CSS-pixel padding cannot consume a row.
const fitLabel=(text:Phaser.GameObjects.Text,width:number,height=Infinity)=>
 text.setScale(Math.min(1,width/text.width,height/text.height));

export class MainMenu extends Phaser.Scene{
 public continueButton!:Phaser.GameObjects.Rectangle;
 public continueState:'start'|'continue'|'up-to-date'='start';
 public campaignButton!:Phaser.GameObjects.Rectangle;
 public creditsButton!:Phaser.GameObjects.Rectangle;
 public achievementsButton!:Phaser.GameObjects.Rectangle;
 public menuFrame!: {x:number;y:number;width:number;height:number};
 public missionSubtitle!:Phaser.GameObjects.Text;
 public quickPlayButton!:Phaser.GameObjects.Rectangle;
 public languageButtons=new Map<Locale,Phaser.GameObjects.Rectangle>();
 constructor(){super('MainMenu');}
 preload(){preloadMenuBackdrop(this);preloadMenuArt(this);}
 create(data?:{credits?:boolean}){
  const debugId=debugLevel();
  const preview=achievementsPreview();
  if(preview){this.scene.start('Achievements',{preview});return;}
  if(debugId){this.scene.start('Battle',{mode:'campaign',levelId:debugId,debug:true} satisfies BattleLaunch);return;}
  if(directLaunch()){const fixture=import.meta.env.DEV&&new URLSearchParams(location.search).get('campaignFixture')==='staged';this.scene.start('Battle',fixture?{mode:'campaign',levelId:'campaign-01'} satisfies BattleLaunch:{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch);return;}
  drawMenuBackdrop(this);const m=menuScale(this,MIN_MENU_SCALE);
  // Layout reads the fitted canvas size, including resizes within either layout.
  let restarting=false;
  const onResize=()=>{
   const next=menuScale(this,MIN_MENU_SCALE);
   if(restarting||!this.scene.isActive()||(next.mobile===m.mobile&&Math.abs(next.k-m.k)*540<1))return;
   restarting=true;this.scene.restart(data);
  };
  this.scale.on('resize',onResize);this.events.once('shutdown',()=>this.scale.off('resize',onResize));
  if(data?.credits){this.showCredits(m);return;}
  // Keep desktop widths in the same logical units as the fonts, with CSS-pixel floors on smaller canvases.
  const p=(n:number)=>n/Math.min(1,m.k),width=Math.min(960-p(24),Math.max(620,p(416))),height=m.mobile?540-p(16):402; // the language selector lives inside the panel, so mobile uses the full height
  const L=m.mobile?{primary:.385,mission:.535,secondary:.69,rule:.8,language:.905}:{primary:.41,mission:.57,secondary:.73,rule:.845,language:.925}; // vertical stops inside the panel
  const f=this.menuFrame={x:480-width/2,y:270-height/2,width,height};
  const art=this.add.graphics();drawOrnateMenuPanel(art,f,m.k);placeMenuCrest(createMenuCrest(this),f,m.k);
  const title=this.add.text(480,f.y+height*.12,'KINGDOM CLASH',{fontFamily:UI_FONT,fontSize:m.font(42,25)+'px',fontStyle:'bold',color:FANTASY_TEXT.gold,stroke:'#06191e',strokeThickness:4}).setOrigin(.5);finishMenuTitle(title,m.k);
  const subtitle=this.add.text(480,f.y+height*.23,`${t('subtitle')} · V${version.replace(/\.0$/,'')}`,{fontFamily:localeFont(UI_FONT),fontSize:m.font(18,13)+'px',color:FANTASY_TEXT.muted}).setOrigin(.5);
  fitLabel(title,width-p(48),2*(subtitle.y-title.y-p(4))-subtitle.height);
  const rule=this.add.graphics();drawMenuRule(rule,f.x+p(36),f.y+height*.295,width-p(72),m.k);
  // Start / Continue / Up to date all come from the shared progression model. Continue opens a Mission Briefing, never a battle.
  campaignProgress.refresh();const progress=campaignProgress.progress,next=progress.next,done=progress.completed.length;
  this.continueState=next?(done?'continue':'start'):'up-to-date';
  const sub=next?t('missionSummary',{chapter:chapterOf(next.number),mission:missionOf(next.number),title:missionDisplay(next.id,campaign.get(next.id).display).title}):
   done>1?t('completedMissions',{count:done}):done===1?t('oneComplete'):t('noMissions');
  const inner=width-p(32),primaryWidth=Math.min(inner,p(360)),buttonHeight=m.mobile?Math.max(42,p(38)):54;
  this.continueButton=this.button(480,f.y+height*L.primary,primaryWidth,buttonHeight,t(this.continueState==='up-to-date'?'upToDate':this.continueState),()=>this.scene.start(next?'MissionBriefing':'CampaignSelect',next?{levelId:next.id}:undefined),'resume',true);
  this.missionSubtitle=fitLabel(this.add.text(480,f.y+height*L.mission,sub,{fontFamily:localeFont(UI_FONT),fontSize:m.font(14,12)+'px',color:FANTASY_TEXT.primary}).setOrigin(.5),inner);
  const secondaryY=f.y+height*L.secondary, gap=p(8),creditsWidth=p(72);
  const secondaryWidth=Math.min(p(180),(inner-creditsWidth-2*gap)/2),left=480-secondaryWidth-gap-creditsWidth/2;
  this.campaignButton=this.button(left+secondaryWidth/2,secondaryY,secondaryWidth,buttonHeight,t('campaign'),()=>this.scene.start('ChapterSelect'),'campaign');
  this.achievementsButton=this.button(left+1.5*secondaryWidth+gap,secondaryY,secondaryWidth,buttonHeight,t('achievements'),()=>this.scene.start('Achievements'),'achievements');
  const creditsX=left+2*secondaryWidth+2*gap+creditsWidth/2;
  this.creditsButton=this.add.rectangle(creditsX,secondaryY,creditsWidth,buttonHeight,0,0).setInteractive({useHandCursor:true});
  this.creditsButton.on('pointerup',()=>this.scene.restart({credits:true}));
  fitLabel(this.add.text(creditsX,secondaryY,t('credits'),{fontFamily:localeFont(UI_FONT),fontSize:m.font(15,13)+'px',color:FANTASY_TEXT.muted}).setOrigin(.5),creditsWidth-p(12),buttonHeight-p(8));
  this.languageButtons.clear();
  const languageY=f.y+height*L.language,languageHeight=m.mobile?p(32):40;
  drawMenuRule(rule,f.x+p(36),f.y+height*L.rule,width-p(72),m.k); // gold divider above the in-panel language selector
  locales.forEach((language,index)=>{
   const x=480+p((index-1)*62),chosen=language===currentLocale();
   const button=this.add.rectangle(x,languageY,p(54),languageHeight,chosen?FANTASY.gold:FANTASY.navy,1).setStrokeStyle(chosen?2:1,chosen?FANTASY.goldBright:FANTASY.steel);
   this.add.text(x,languageY,language.toUpperCase(),{fontFamily:UI_FONT,fontSize:p(14)+'px',fontStyle:'bold',color:chosen?FANTASY_TEXT.ink:FANTASY_TEXT.muted}).setOrigin(.5);
   this.languageButtons.set(language,button);
   if(!chosen)button.setInteractive({useHandCursor:true}).on('pointerup',async()=>{
    this.input.enabled=false;
    try{await selectLocale(language);}
    finally{this.input.enabled=true;}
    if(this.scene.isActive())this.scene.restart();
   });
  });
  if(SHOW_LEGACY_MODES){
  this.quickPlayButton=this.button(480,470,340,54,'FULL BATTLE / QUICK PLAY',()=>this.scene.start('Battle',{mode:'quick',encounter:encounterFromUrl()} satisfies BattleLaunch),'start');
  this.add.text(480,520,'Campaign missions  ·  Original Full Battle',{fontFamily:UI_FONT,fontSize:`${m.font(12,12)}px`,color:FANTASY_TEXT.muted}).setOrigin(.5);
  }
  window.visualReady=false;
 }
 private showCredits(m:ReturnType<typeof menuScale>){
  const frame={x:100,y:20,width:760,height:500};
  drawOrnateMenuPanel(this.add.graphics(),frame,m.k);
  placeMenuCrest(createMenuCrest(this),frame,m.k);
  const line=(y:number,label:string,size:number,color:string)=>this.add.text(480,y,label,{
   fontFamily:localeFont(UI_FONT),fontSize:size+'px',color,align:'center',wordWrap:localizedWrap(700),
  }).setOrigin(.5).setResolution(Math.min(3,devicePixelRatio||1));
  finishMenuTitle(line(75,currentLocale()==='en'?'CREDITS':t('credits'),m.font(38,25),FANTASY_TEXT.gold),m.k,localeFont(MENU_TITLE_FONT));
  line(122,t('audioCredit'),m.font(18,13),FANTASY_TEXT.muted);
  // Source titles, uploader names and file hashes: docs/audio-foundation/AUDIO_LICENSES.md.
  const credits=(['musicCredit','impactCredit','warningCredit','buildCredit','bannerCredit'] as const).map(key=>t(key));
  credits.forEach((credit,index)=>line(179+index*46,credit,m.font(21,14),FANTASY_TEXT.primary));
  this.creditsButton=this.button(480,451,Math.min(360,196/m.k),Math.max(54,48/m.k),t('back'),()=>this.scene.restart({credits:false}),'campaign');
 }
 private button(x:number,y:number,width:number,height:number,label:string,action:()=>void,icon:MenuIcon,primary=false){
  const m=menuScale(this,MIN_MENU_SCALE),p=(n:number)=>n/Math.min(1,m.k),art=this.add.graphics(),mark=this.add.graphics();
  const draw=(pressed=false)=>drawOrnateMenuButton(art,x-width/2,y-height/2,width,height,m.k,primary,pressed);draw();
  const hit=this.add.rectangle(x,y,width,height,0,0).setInteractive({useHandCursor:true});
  hit.on('pointerdown',()=>draw(true)).on('pointerout',()=>draw()).on('pointerup',()=>{draw();enterFullscreenOnTouch();action();});
  const text=fitLabel(this.add.text(x+p(13),y,label,{fontFamily:localeFont(primary?MENU_TITLE_FONT:UI_FONT),fontSize:m.font(primary?19:17,primary?16:14)+'px',fontStyle:'bold',color:primary?'#251a0c':FANTASY_TEXT.primary}).setOrigin(.5).setResolution(Math.min(3,devicePixelRatio||1)),width-p(46),height-p(8));
  const groupWidth=text.displayWidth+p(26);drawMenuIcon(mark,icon,x-groupWidth/2+p(9),y,p(18),primary?0x102536:0xffe4a0);
  return hit;
 }
}

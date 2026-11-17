import {createMenuCrest,drawMenuRule,drawOrnateMenuButton,drawOrnateMenuPanel,finishMenuTitle,placeMenuCrest,MENU_TITLE_FONT} from '../ui/menuArt';
import {drawMenuIcon,type MenuIcon} from '../ui/menuIcon';
import {AudioSettingsPanel} from '../ui/AudioSettingsPanel';
import {shortCanvas,wrapWidth} from '../ui/panelSpan';
import type {BuildingKind} from '../data/buildings';
import {drawResultAccent,drawResultRule,resultTone} from '../ui/resultAccent';
import {currentLocale,localeFont,t} from '../i18n';
import {battleMissionHeading,battleName,battleOutcome,battleRejection,castRejection,guidanceLabels,skillLabels} from '../i18n/battle';
import {missionDisplay,objectiveLabel} from '../i18n/campaign';
import {fitLocalizedLine,localizedWrap,wrapLocalizedText} from '../i18n/textLayout';
import Phaser from 'phaser';
import { terrain, WORLD, type VisualEntity } from '../world/layout';
import {battlefieldArt,visibleRect} from '../world/battlefieldArt';
import { Battle } from './Battle';
import { AbilityButton } from '../ui/AbilityButton';
import { UtilityButton } from '../ui/UtilityButton';
import {ShopPanel} from '../ui/ShopPanel';
import {TavernPanel} from '../ui/TavernPanel';
import {mercenary,mercenaryTexture} from '../data/mercenaries';
import {BuildPanel} from '../ui/BuildPanel';
import {SkillsPanel} from '../ui/SkillsPanel';
import {compactControlFrame,drawDivider,drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';
import {preloadShopItemIcons} from '../ui/ShopItemIcon';
import {guardianRanks} from '../data/guardian';
import {stunned} from '../simulation/Statuses';
import {canRequestGuardianRespawn,requestGuardianRespawn} from '../simulation/Simulation';
import {interstitialFrequency} from '../data/interstitialFrequency';
import { guardianStats, raiderId } from '../data/combat';
import type {AllyOrder,GameEvent} from '../simulation/GameState';
import {fullscreenControlOffered,isFullscreen,toggleFullscreen} from '../ui/fullscreen';
import { controlLayout } from '../ui/controlLayout';
import {topHudLayout} from '../ui/topHudLayout';
import {damageFeedbackTiming} from '../ui/damageFeedback';
import {DefenseFeedback,azureThreatStatus,defenseFeedbackTiming} from '../ui/defenseFeedback';
import {NoticeSlot} from '../ui/noticeSlot';
import {PressArm} from '../ui/pressArm';
import {azureKeepHudColors,azureKeepHudLayout,azureKeepHudState} from '../ui/azureKeepHud';
import {ContextGuidance,guidanceRules,type GuidanceKey} from '../ui/contextGuidance';
import {nextLevelXp,upgradeRules,type GuardianUpgrade,type GuardianSkill} from '../data/progression';
import {missionPanelView,type MissionPanelView} from '../data/campaignUi';
import {isSequential} from '../data/campaignProgress';
import {chapterOf,missionOf} from '../data/campaign';
import {campaign} from '../data/campaignLevels';
import {victoryTarget,type MissionNavigation,type VictoryTarget} from '../data/campaignNavigation';
import {campaignProgress} from '../data/campaignProgressStore';
import {isBarracks} from '../world/frostGateAppearance';
import {isThroneGate,throneGateName} from '../world/cliffArt';
import {HeroBar,type HeroBarHero} from '../ui/HeroBar';
import {HERO_SLOTS,heroBarLayout} from '../ui/heroBarLayout';
import {heroCommand,heroIdle,targeting,type HeroCommandAction,type HeroCommandState} from '../ui/heroCommand';
const INK=0x122d35,GOLD=0xdcbf7a,WHITE='#fff3d3',MUTED='#b5d0ce';
const TOWER_DANGER_NOTICE='tower-danger';
export class HUD extends Phaser.Scene {
 public paused=false;
 public audioSettings!:AudioSettingsPanel;
 public shop!:ShopPanel;
 public buildPanel!:BuildPanel;
 private utilityPreview!:Phaser.GameObjects.Container;
 public abilities:AbilityButton[]=[];
 public utilities:UtilityButton[]=[];
 /** The pause control inside the objective plate's top-right corner: the elapsed time and a pause mark are one tappable target. */
 public pauseButton!:{hit:Phaser.GameObjects.Rectangle;x:number;y:number;hitRadius:number};
 private pauseIcon!:Phaser.GameObjects.Graphics;private pausePressed=false;private pauseMark={x:0,y:0,scale:1,hx:0,hy:0,hw:0,hh:0};
 public mapHero!:Phaser.GameObjects.Arc;private mapPosts:Phaser.GameObjects.Arc[]=[]; // Chapter 4 M1: each camp's ownership ring on the minimap
 public mapViewport!:Phaser.GameObjects.Graphics;
 private perf?:Phaser.GameObjects.Text;private perfAt=0;private perfMax=0;private perfSum=0;private perfN=0;
 public mapFrame={x:812,y:16,width:136,height:82};
 private topPanels:Phaser.Geom.Rectangle[]=[];
 public topHudBottom=0;
 public shopHudBottom=0;
 private guardianPlate!:Phaser.GameObjects.Graphics;
 private guardianPortrait!:Phaser.GameObjects.Image;
 private guardianRim!:Phaser.GameObjects.Arc;
 private hpTrack!:Phaser.GameObjects.Rectangle;
 private xpTrack!:Phaser.GameObjects.Rectangle;
 private guardianLayout!:ReturnType<typeof topHudLayout>;
 private joystickArt!:Phaser.GameObjects.Container;
 private joystickHit!:Phaser.GameObjects.Arc;
 private waveText!:Phaser.GameObjects.Text;
 private timerText!:Phaser.GameObjects.Text;
 private matchPlate!:Phaser.GameObjects.Graphics;
 // Always-visible Azure Keep HP plate under the minimap (src/ui/azureKeepHud.ts).
 private keepPlate!:Phaser.GameObjects.Graphics;private keepLabel!:Phaser.GameObjects.Text;private keepHpText!:Phaser.GameObjects.Text;private keepTrack!:Phaser.GameObjects.Rectangle;private keepBar!:Phaser.GameObjects.Rectangle;
 public keepLayout=azureKeepHudLayout(1,{x:812,y:16,width:136,height:82});public keepLevel='healthy';
 private resourceArt:Phaser.GameObjects.Image[]=[];
 private heroHit!:Phaser.GameObjects.Arc;
 private hpBar!:Phaser.GameObjects.Rectangle;
 private hpText!:Phaser.GameObjects.Text;
 private respawnNow?:{hit:Phaser.GameObjects.Rectangle;label:Phaser.GameObjects.Text};
 private woodText!:Phaser.GameObjects.Text;
 private ironText!:Phaser.GameObjects.Text;
 private buildControls!:Phaser.GameObjects.Container;
 private buildReason!:Phaser.GameObjects.Text;
 private buildLabels:Phaser.GameObjects.Text[]=[];
 private buildKind?:BuildingKind;
 private buildHits:Phaser.GameObjects.Rectangle[]=[];
 private footprintButton!:Phaser.GameObjects.Text;
 private panPointer?:{id:number;x:number;y:number};
 private goldText!:Phaser.GameObjects.Text;
 private selectedId?:string;
 private unitDots=new Map<string,Phaser.GameObjects.Arc>();
 private cleanup:Array<()=>void>=[];
 private toast!:Phaser.GameObjects.Text;
 private toastUntil=0;
 private combatNotice!:Phaser.GameObjects.Text;
 private combatNoticeUntil=0;
 private combatNoticePriority=0;
 private impactUntil=0;private keepAlertAt=0;private shieldAlertAt=0;
 private defenseFeedback=new DefenseFeedback();
 private generalSlot=new NoticeSlot();
 private combatSlot=new NoticeSlot();
 // Chapter 5 Hero Command HUD (docs/CHAPTER5_HERO_HUD.md): the bar, its command state, the map pointer that may become a target tap or a camera drag, and a refused tap's reason.
 private tavern!:TavernPanel; // Chapter 5 Phase 1B: the Tavern panel, opened by a tap on the Tavern
 private heroBar!:HeroBar;public heroState:HeroCommandState=heroIdle;private heroRequest=0;
 private heroPointer?:{id:number;x:number;y:number;sx:number;sy:number;moved:boolean};private heroReason?:{text:string;until:number};
 private azureAccent!:Phaser.GameObjects.Graphics;
 private contextualGuidance=new ContextGuidance();
 private teaching?:GuidanceKey;
 private teachingBlockedUntil=0;
 private guidancePending=false;
 private guidanceShown=false;
 private elapsed=0;
 private overlay!:Phaser.GameObjects.Container;
 private pauseCrest!:Phaser.GameObjects.Image;
 private pauseArt!:Phaser.GameObjects.Graphics;private pauseResumeArt!:Phaser.GameObjects.Graphics;
 private pauseTitle!:Phaser.GameObjects.Text;private pauseSub!:Phaser.GameObjects.Text;private pauseLabel!:Phaser.GameObjects.Text;
 private pauseResume!:Phaser.GameObjects.Rectangle;
 public pauseButtons:Array<{id:string;art:Phaser.GameObjects.Graphics;icon:Phaser.GameObjects.Graphics;hit:Phaser.GameObjects.Rectangle;label:Phaser.GameObjects.Text}>=[];
 private pauseNotice!:Phaser.GameObjects.Text;
 private resultAccent!:Phaser.GameObjects.Graphics;private resultCaptions:Phaser.GameObjects.Text[]=[];private resultRules!:Phaser.GameObjects.Graphics;private resultVictory=false;
 private pauseFrame={x:330,y:178,width:300,height:184};
 private knob!:Phaser.GameObjects.Arc;
 private stickPointer:number|null=null;
 private utilityPanel!:Phaser.GameObjects.Container;
 private utilityTitle!:Phaser.GameObjects.Text;
 private utilityDetail!:Phaser.GameObjects.Text;
 private utilityMode='';
 private gridShown=false;
 private inspector!:Phaser.GameObjects.Text;
 private objectiveText!:Phaser.GameObjects.Text;
 public missionPanel!:Phaser.GameObjects.Container;
 public missionHeading!:Phaser.GameObjects.Text;
 public missionPhase!:Phaser.GameObjects.Text;
 public missionRows:Phaser.GameObjects.Text[]=[];
 public missionProgressTrack!:Phaser.GameObjects.Rectangle;
 public missionProgressBar!:Phaser.GameObjects.Rectangle;
 public missionKeep!:Phaser.GameObjects.Text;
 public missionView?:MissionPanelView;
 private missionArt!:Phaser.GameObjects.Graphics;
 private lastMissionTick=-Infinity;private missionSignature='';
 private missionPopupSignature='';public missionCollapsed=false;
 private results!:Phaser.GameObjects.Container;
 private resultTitle!:Phaser.GameObjects.Text;
 private resultDetail!:Phaser.GameObjects.Text;
 private resultRule!:Phaser.GameObjects.Text;
 private campaignResultArt!:Phaser.GameObjects.Graphics;
 private campaignResultLevel!:Phaser.GameObjects.Text;
 private campaignResultStats!:Phaser.GameObjects.Text;
 private campaignResultProgress!:Phaser.GameObjects.Text;
 private campaignResultButtons:Phaser.GameObjects.Graphics[]=[];
 public missionBounds={x:0,y:0,width:0,height:0};
 /** A mission with exactly one objective (or the legacy Keep outcome) shows it in the top-centre plate and hides the floating panel. */
 public compactObjective=false;
 private objectiveLine='';private objectiveSuffix='';private objectiveShown='';private wrapObjective=false;private keepMinimum:number|null=null;
 public campaignResultBounds={x:0,y:0,width:0,height:0};
 private resultPress=new PressArm<object>();
 private restartHit?:Phaser.GameObjects.Rectangle;
 public levelSelectHit?:Phaser.GameObjects.Rectangle;
 public nextHit?:Phaser.GameObjects.Rectangle;
 public chapterHit?:Phaser.GameObjects.Rectangle;
 /** After a won story mission: where the primary button leads (resultNext = its mission id), or resultFinal = Chapter Select / Campaign Complete. */
 private resultTarget:VictoryTarget|null=null;private resultNext:string|null=null;private resultFinal=false;
 private interstitialOpen=false;
 public mainMenuHit?:Phaser.GameObjects.Rectangle;
 private restarting=false;
 private levelText!:Phaser.GameObjects.Text;
 private xpText!:Phaser.GameObjects.Text;
 private xpBar!:Phaser.GameObjects.Rectangle;
 private skillPanel!:Phaser.GameObjects.Container;
 private skillFrame={x:92,y:100,width:776,height:406};
 private skillHeading!:Phaser.GameObjects.Text;
 private skillStatus!:Phaser.GameObjects.Text;
 private skillProgress!:Phaser.GameObjects.Text;
 private skillButtons:Array<{skill:GuardianUpgrade;card:Phaser.GameObjects.Graphics;hit:Phaser.GameObjects.Rectangle;title:Phaser.GameObjects.Text;effect:Phaser.GameObjects.Text;label:Phaser.GameObjects.Text;action:Phaser.GameObjects.Text;cost:Phaser.GameObjects.Text}>=[];
 private skillClose!:Phaser.GameObjects.Rectangle;
 private skillOpen!:Phaser.GameObjects.Rectangle;
 private skillOpenLabel!:Phaser.GameObjects.Text;
 private skillEntryCaption!:Phaser.GameObjects.Text;
 public skills!:SkillsPanel;
 public controls!:ReturnType<typeof controlLayout>;
 constructor(){super('HUD');}
 preload(){for(const key of ['bash','taunt','charge','zone'])this.load.image(`ability-${key}`,`${import.meta.env.BASE_URL}assets/ability-${key}.png`);for(const key of ['gold','wood','iron','build','shop'])this.load.image(`hud-${key}`,`${import.meta.env.BASE_URL}assets/hud-${key}.png`);preloadShopItemIcons(this);}
 private text(x:number,y:number,value:string,size=12,color=WHITE,bold=false){return this.add.text(x,y,value,{fontFamily:localeFont('Arial, sans-serif'),fontSize:`${size}px`,color,fontStyle:bold?'bold':'normal'});}
 private panel(x:number,y:number,w:number,h:number){const g=this.add.graphics();g.fillStyle(0x06191e,.24).fillRoundedRect(x+1,y+3,w,h,16);g.fillStyle(INK,.93).fillRoundedRect(x,y,w,h,16);g.lineStyle(1,GOLD,.6).strokeRoundedRect(x,y,w,h,16);return g;}
 create(){
  this.resultPress.clear();this.restartHit=undefined;this.levelSelectHit=undefined;this.mainMenuHit=undefined;this.nextHit=undefined;this.chapterHit=undefined;this.resultTarget=null;this.resultNext=null;this.resultFinal=false;this.restarting=false;this.missionRows=[];this.missionView=undefined;this.lastMissionTick=-Infinity;this.missionSignature='';this.missionPopupSignature='';this.missionCollapsed=false;
  this.topPanels=[];this.resourceArt=[];this.skillButtons=[];this.guidancePending=false;this.guidanceShown=false;this.combatNoticeUntil=0;this.combatNoticePriority=0;this.impactUntil=0;this.keepAlertAt=0;this.shieldAlertAt=0;
  this.defenseFeedback.clear(true);this.generalSlot.reset();this.combatSlot.reset();
  this.contextualGuidance.reset();this.teaching=undefined;this.teachingBlockedUntil=0;
  this.stickPointer=null;this.selectedId=undefined;this.paused=false;this.abilities=[];this.utilities=[];this.unitDots.clear();this.buildHits=[];this.buildLabels=[];this.buildKind=undefined;this.utilityMode="";this.elapsed=0;this.gridShown=false;
  this.minimap();
  this.keepPlate=this.add.graphics();this.keepLabel=this.text(0,0,t('battleAzureUpper'),11,'#a5edff',true);this.keepHpText=this.text(0,0,'',12,WHITE,true).setOrigin(1,0);
  this.keepTrack=this.add.rectangle(0,0,1,5,0x071f26).setOrigin(0,.5);this.keepBar=this.add.rectangle(0,0,1,5,0x70d7ff).setOrigin(0,.5);
  this.guardianPlate=this.add.graphics();this.guardianRim=this.add.circle(32,40,18,0x24516a).setStrokeStyle(1,GOLD);this.guardianPortrait=this.add.image(32,58,'guardian').setOrigin(.5,1);
  this.heroHit=this.add.circle(32,40,24,0,0).setInteractive({hitArea:new Phaser.Geom.Circle(24,24,24),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.game.events.emit('reset-view');});
  this.levelText=this.text(60,12,t('battleLevel',{level:1}),14,'#f4d58e',true);
  this.hpText=this.text(60,28,'',14,WHITE,true);this.hpTrack=this.add.rectangle(60,49,112,8,0x071f26).setOrigin(0,.5);this.hpBar=this.add.rectangle(60,49,112,8,0x68d8ad).setOrigin(0,.5);
  this.xpTrack=this.add.rectangle(84,61,88,3,0x395d6e).setOrigin(0,.5);this.xpBar=this.add.rectangle(84,61,0,3,0x9dd5ff).setOrigin(0,.5);this.xpText=this.text(60,54,'XP',12,MUTED);
  this.skillOpen=this.add.rectangle(208,40,48,48,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.openSkills();});
  this.skillOpenLabel=this.text(208,22,'+1',18,WHITE,true).setOrigin(.5,0);
  this.skillEntryCaption=this.text(208,44,t('battleSkills'),12,WHITE,true).setOrigin(.5,0);
  const battle=this.scene.get('Battle') as Battle;
  if(import.meta.env.DEV){
   const sim=battle.simulation;
   const hit=this.add.rectangle(0,0,132,44,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).setVisible(false);
   const label=this.text(0,0,t('battleRespawnNow'),12,WHITE,true).setOrigin(.5).setVisible(false);
   hit.input!.enabled=false;
   hit.on('pointerdown',(_p:unknown,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{
    e.stopPropagation();
    if(battle.simulation===sim&&this.heroInteractive()&&!this.utilityPanel.visible)requestGuardianRespawn(sim);
   });
   this.respawnNow={hit,label};
  }
  this.matchPlate=this.add.graphics();this.objectiveTitle=battle.campaignLevel?missionDisplay(battle.campaignLevel.id,battle.campaignLevel.display).title:t('battleQuickGoal');this.objectiveText=this.text(320,20,this.objectiveTitle,14,WHITE,true);
  this.waveText=this.text(320,34,'',12,MUTED);this.timerText=this.text(552,34,'',12,MUTED).setOrigin(1,0);
  this.azureAccent=this.add.graphics();
  [['gold','250'],['wood','180'],['iron','30']].forEach(([icon,value],i)=>{
   const art=this.add.image(332+i*110,61,`hud-${icon}`);this.resourceArt.push(art);
   const text=this.text(351+i*110,54,value,12,icon==='gold'?WHITE:MUTED);if(icon==='gold')this.goldText=text;if(icon==='wood')this.woodText=text;if(icon==='iron')this.ironText=text;
  });
  this.pauseIcon=this.add.graphics();
  const pauseHit=this.add.rectangle(0,0,64,44,0,0).setInteractive({useHandCursor:true});this.pauseButton={hit:pauseHit,x:0,y:0,hitRadius:22};
  pauseHit.on('pointerdown',(_p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.pausePressed=true;this.drawPauseMark();});
  pauseHit.on('pointerup',()=>{if(!this.pausePressed)return;this.pausePressed=false;this.drawPauseMark();this.setPause(!this.paused);});
  pauseHit.on('pointerout',()=>{this.pausePressed=false;this.drawPauseMark();});
  this.joystick();
  ['build','shop'].forEach(id=>this.utilities.push(new UtilityButton(this,id,0,0,23.45,()=>id==='shop'?this.openShop():this.showUtility(id[0].toUpperCase()+id.slice(1)),23.45,(this.scene.get('Battle') as Battle).simulation.setup.shop)));
  const definitions=[['bash',0,0,33.5,3.2,'Shield Bash'],['taunt',0,0,33.5,4.2,'Lion’s Challenge'],['charge',0,0,33.5,2.8,'Vanguard Charge'],['zone',0,0,35.5,6,'Guardian Sanctuary'] ] as const;
  definitions.forEach(([id,x,y,r])=>this.abilities.push(new AbilityButton(this,id,x,y,r,guardianRanks[id].cooldown[0]/30,(gesture)=>{this.game.events.emit('cast',id,gesture);},(p,dragged,start)=>this.game.events.emit('skill-aim',id,p?{x:p.x,y:p.y}:undefined,dragged,start))));
  this.scale.on('resize',this.layoutControls,this);
  this.events.once('shutdown',()=>this.scale.off('resize',this.layoutControls,this));
  // Chapter 4 playtest diagnostic: FPS, frame time and living units, top right, only with ?debug=1; not interactive, so it never takes a touch from the HUD
  if(new URLSearchParams(location.search).get('debug')==='1')this.perf=this.text(956,1,'',9,WHITE,true).setOrigin(1,0).setBackgroundColor('#0b1a1fc0').setPadding(3,1).setDepth(1000);
  this.inspector=this.text(948,113,'',11,WHITE,true).setOrigin(1,0).setShadow(0,1,'#183c33',3);
  this.toast=this.text(300,235,'',12,WHITE).setOrigin(.5).setBackgroundColor('#173842d9').setPadding(12,7).setWordWrapWidth(wrapWidth(300)).setVisible(false);
  this.combatNotice=this.text(755,177,'',18,WHITE,true).setOrigin(.5).setBackgroundColor('#122d35ee').setPadding(8,6).setWordWrapWidth(wrapWidth(270)).setVisible(false);
  this.createUtilityPanel();this.createSkills();this.shop=new ShopPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,()=>this.closeShop());this.tavern=new TavernPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,c=>(this.scene.get('Battle') as Battle).simulation.send(c),()=>this.closeTavern());this.createMissionPanel();this.createPause();this.createResults();this.restarting=false;
  this.createHeroBar();
  this.layoutControls();
  this.listen('inspect',(e:VisualEntity)=>{this.selectedId=e.id;const name=battleName(e.name);this.inspector.setText(`${name}\n${t('battleHp',{hp:e.hp})}`);this.tell(`${name} · ${'columns'in e.footprint?t('battleCells',e.footprint):t('battleRadius',e.footprint)}`);});
  // Observe after every scene has updated so HUD values match the rendered authoritative tick.
  this.listen(Phaser.Core.Events.POST_STEP,()=>this.observeSimulation());
  this.listen('request-pause',()=>this.setPause(true));
  this.input.keyboard?.on('keydown-SPACE',()=>this.setPause(!this.paused));
  // Guardian V1.0 aiming on desktop: Esc or a right click drops a held skill without casting (the touch cancel target stays).
  const cancelAim=()=>{if(this.abilities.map(a=>a.cancel()).some(Boolean))this.game.events.emit('cast-feedback','Cast cancelled');};
  this.input.keyboard?.on('keydown-ESC',cancelAim);this.input.mouse?.disableContextMenu();this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.rightButtonDown())cancelAim();});
  // Chapter 3 C3-1: a Frost Gate falling opens the fortress to both sides, so say so.
  // Chapter 3 C3-2: a Barracks falling stops its own reinforcements (the Simulation drops its spawns); the other Barracks carry on.
  this.listen('simulation-event',(e:{type:string;id?:string})=>{if(e.type==='death'&&(this.scene.get('Battle') as Battle).simulation.setup.barracks?.some(b=>b.id===e.id))this.tell(t(e.id==='red-barracks-court'?'battleCourtBarracksDown':e.id==='red-barracks-north'?'battleNorthBarracksDown':'battleSouthBarracksDown'));});
  this.listen('simulation-event',(e:{type:string;id?:string})=>{if(e.type==='death'&&(this.scene.get('Battle') as Battle).simulation.setup.garrison&&[(this.scene.get('Battle') as Battle).simulation.setup.garrison!.after].flat().includes(e.id!)&&!(this.scene.get('Battle') as Battle).simulation.setup.gates?.some(g=>g.id===e.id))this.tell(t('battleWayOpen'));else if(e.type==='death'&&(this.scene.get('Battle') as Battle).simulation.setup.gates?.some(g=>g.id===e.id))this.tell(t('battleGateDown',{gate:isThroneGate((this.scene.get('Battle') as Battle).simulation.field.id,e.id)?t('battleThroneGate'):t('battleFrostGate')})+((this.scene.get('Battle') as Battle).simulation.setup.garrison?' · '+t('battleGarrison'):''));});
  // Chapter 3 M6: the Frost Warlord is released (and each time he returns), and the Azure Keep under attack, at most once every 8 s.
  this.listen('simulation-event',(e:{type:string;id?:string;sourceId?:string})=>{if(e.type==='spawn'&&e.id==='red-hero')this.tell((this.scene.get('Battle') as Battle).simulation.state.posts?t('battleDefenderReturns'):(this.scene.get('Battle') as Battle).simulation.state.post?t('battleCrimsonHeroReturns'):t('battleWarlordLoose'));if(e.type==='spawn'&&e.id===raiderId)this.tell(t('battleRaiderRides'),1);if(e.type==='damage'&&e.id==='blue-base'&&this.elapsed>=this.keepAlertAt){this.keepAlertAt=this.elapsed+8000;this.showCombatNotice(t('battleThreatAttack'),2500,1);}});
  // Chapter 4 M6: the Commanders' attacks use the wave notice: the road and target when an attack is announced, the return time when one falls.
  this.listen('simulation-event',(e:{type:string;id?:string;change?:string;lane?:'north'|'south';targetId?:string;releaseTick?:number})=>{if(e.type!=='commander'||!e.id)return;
   const sim=(this.scene.get('Battle') as Battle).simulation,c=sim.setup.commanders?.find(x=>x.id===e.id);if(!c)return;
   const road=t(e.lane==='north'?'battleSiegeRoad':'battleShadowTrail'),name=battleName(c.name),building=e.targetId?sim.state.structures[e.targetId]:undefined,v=sim.field.flankVia;
   const where=building&&v?.north&&v.south&&building.x>=Math.min(v.north.x,v.south.x)-48?(Math.abs(building.y-v.north.y)<Math.abs(building.y-v.south.y)?'battleNorthOutpostBarracks':'battleSouthOutpostBarracks'):'battleBarracks';
   if(e.change==='warning')this.tell(t(c.role==='marshal'?'battleMarshalWarning':e.targetId==='blue-base'?'battleShadowKeep':'battleShadowBarracks',{name,road,target:t(where)}),2);
   if(e.change==='down'&&e.releaseTick!==undefined)this.tell(t('battleCommanderDown',{name,seconds:Math.max(1,Math.ceil((e.releaseTick-sim.clock.tick)/30))}),1);});
  // Chapter 4 M1: the Forest Camp changing hands (a captured post, a lost one, a Banner that fell before it rose) and a repair starting.
  this.listen('simulation-event',(e:GameEvent)=>{if(e.type!=='post')return;const sim=(this.scene.get('Battle') as Battle).simulation;
   const multi=!!sim.state.posts,camp=sim.camps.find(c=>c.id===e.camp);
   const name=battleName(multi?sim.campName(sim.camps.findIndex(c=>c.id===e.camp)):sim.postName);
   const remaining=sim.postStates.flatMap((p,i)=>p.owner==='azure'?[]:[battleName(sim.campName(i))]);
   const rest=remaining.reduce((first,next)=>first?t('battleCampAnd',{first,next}):next,'');
   const footholds=multi&&sim.setup.campShield===false;
   switch(e.change){
    case 'shielded':
     if(this.elapsed>=this.shieldAlertAt){this.shieldAlertAt=this.elapsed+8000;this.tell(t('battleShieldedKeep',{name:multi?rest:name}),2);}
     break;
    case 'raising':
     this.tell(t(footholds?'battleBannerOutpost':'battleBannerCamp',{seconds:(camp?.raiseTicks??sim.camps[0]?.raiseTicks??120)/30}),1);
     break;
    case 'captured':{
     if(!multi&&e.first&&sim.postFirstNotice){this.tell(camp?.name==='Island Camp'||sim.postName==='Island Camp'?t('battleIslandNotice'):sim.postFirstNotice,2);break;}
     if(!multi&&e.first&&sim.ballistaRuin){this.tell(t('battleBallistaNotice'),2);break;}
     const details=footholds?[t(camp?.barracksRuin?'battleBuildRepairBarracks':'battleBuildHere')]:
      multi?[rest?t('battleBreakShield',{name:rest}):t('battleShieldDown'),camp?.ballista?t('battleRepairBallistaHint'):sim.setup.cart?.post===e.camp?t('battleRepairCartHint'):'']:
      [t(sim.ballistaRuin?'battleRepairRuinsHint':'battleRepairTowerHint')];
     this.tell([t('battlePostCaptured',{name}),...details,e.first?t('battleEliteCounter'):''].filter(Boolean).join(' · '),2);
     break;
    }
    case 'lost':
     this.tell([t('battlePostLost',{name}),footholds?'':t(multi?'battleShieldBack':'battleRetake')].filter(Boolean).join(' · '),2);
     break;
    case 'failed':this.tell(t('battleBannerFailed'),2);break;
    case 'repairing':this.tell(t(footholds?'battleRepairing':!multi&&sim.ballistaRuin?'battleRepairingRuin':'battleRepairingTower'),2);break;
   }
  });
  // Chapter 4 M4: the War Cart, the capturable Gatehouses and the Elite Barracks. Names and prices come from the level data.
  this.listen('simulation-event',(e:GameEvent)=>{if(e.type!=='site')return;const sim=(this.scene.get('Battle') as Battle).simulation,cap=sim.setup.captures?.find(c=>c.id===e.id),name=battleName(e.id==='cart'?'War Cart':cap?.name??''),gate=!!cap&&!cap.elite;
   const keys={wreck:'battleCartDown',repairing:'battleRepairingSite',repaired:'battleCartRepaired',
    captured:gate?'battleGateCaptured':'battleEliteCaptured',converted:gate?'battleGateConverted':'battleEliteConverted',
    lost:'battleSiteLost',short:'battleSiteShort',raid:'battleGateRaid'} as const;
   const suffix=e.change==='captured'&&cap?.id==='red-forward-gate'?' · '+t('battleHeroMarches'):'';
   if(e.change==='raid'&&sim.state.captures?.[e.id??'']?.stage!=='lost')return; // a captured gate's own notice already says it
   this.tell(t(keys[e.change],{name})+suffix,e.change==='raid'||e.change==='wreck'?2:1);});
  this.listen('simulation-event',(e:{type:string;index?:number;flank?:{lane:string;units:string};lanes?:{north:number;south:number}})=>{if(e.type==='wave')this.tell([t('battleWaveAnnounced',{wave:e.index!}),e.lanes?t('battleWaveBanks',e.lanes):e.flank?t(e.flank.units==='raiders'?'battleWaveRaiders':'battleWaveFlank',{lane:t(e.flank.lane==='north'?'battleNorth':'battleSouth')}):''].filter(Boolean).join(' · '));});
  this.listen('simulation-event',(e:{type:string})=>{if(e.type==='match-end')this.showResults();});
  this.listen('simulation-event',(e:{type:string;reason?:string;skill?:GuardianUpgrade;rank?:number;id?:string;requestId?:string})=>{if(e.requestId?.startsWith('shop-ui-')||e.requestId?.startsWith('hero-ui-'))return;if(e.type==='skill-upgraded'){this.skillStatus.setText(`${upgradeRules[e.skill!].name} rank ${e.rank} learned`);if(e.skill!=='fortitude'&&!this.guidanceShown)this.guidancePending=true;}if(e.type==='rejected'){if(this.skillPanel.visible)this.skillStatus.setText(e.reason??'Rejected');else if(!this.castNotice(e.reason??'Rejected'))this.tell(battleRejection(e.reason??'Rejected'));}if(e.type==='death'&&e.id==='guardian')this.closeSkills();});
  this.listen('cast-feedback',(message:string)=>{if(!this.castNotice(message))this.showCombatNotice(battleRejection(message),2500,2);});
  this.listen('tower-danger',()=>{if(!this.paused&&(this.scene.get('Battle') as Battle).hero.hp>0)this.showCombatNotice(t('battleTowerDanger'),2500,0,TOWER_DANGER_NOTICE);});
  this.listen('guardian-impact',()=>{if(!this.paused)this.impactUntil=this.elapsed+damageFeedbackTiming.impact;});
  this.listen('guardian-feedback-clear',()=>{
   this.impactUntil=0;this.hpBar.setFillStyle(0x68d8ad);this.hpText.setColor(WHITE);
   // Keep the slot's expiry and repeat suppression when hiding the warning early.
   if(this.combatSlot.isCurrent(TOWER_DANGER_NOTICE))this.combatNotice.setVisible(false);
  });
  this.listen('simulation-event',(e:{type:string;skill?:GuardianSkill})=>{if(e.type==='cast-accepted'){this.showCombatNotice(t('battleCast',{skill:t(skillLabels[e.skill!])}));this.abilities.find(a=>a.id===e.skill)?.flash();}});
  this.listen('simulation-event',(e:GameEvent)=>{
   this.shop.model.observe(e);
   if(e.type==='death'&&e.id==='guardian'&&this.shop.model.pending){this.shop.model.cancel();this.shop.model.message='Request canceled · you can trade while down.';}
   const sim=(this.scene.get('Battle') as Battle).simulation;
   this.contextualGuidance.observe(e,sim.state,this.elapsed);
   if(!this.paused&&!this.restarting&&this.defenseFeedback.observe(e,sim.state,sim.clock.tick,this.elapsed))this.tell(this.defenseNoticeText(),2,defenseFeedbackTiming.notice,'azure-defense');
  });
  this.listen('pause-visual',(paused:boolean)=>{if(paused)this.clearNotifications();});
  this.events.once('shutdown',()=>{this.audioSettings.destroy();this.clearNotifications();this.shop.hide();this.cleanup.splice(0).forEach(f=>f());});
  this.observeMission(true);
  if(innerHeight>innerWidth)this.setPause(true);
 }
 private listen(event:string,fn:(...args:any[])=>void){this.game.events.on(event,fn);this.cleanup.push(()=>this.game.events.off(event,fn));}
 private dom(event:string,fn:()=>void){window.addEventListener(event,fn);this.cleanup.push(()=>window.removeEventListener(event,fn));}
 private layoutControls(){
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.controls=controlLayout(scale);
  this.controls.abilities.forEach((p,i)=>this.abilities[i].setLayout(p.x,p.y,p.radius,p.hitRadius));
  this.controls.utilities.forEach((p,i)=>{this.utilities[i].setLayout(p.x,p.y,p.radius,p.hitRadius,scale,p.labelRight);});
  if(this.restartHit){this.restartHit.setDisplaySize(200,Math.max(70,Math.ceil(48/scale)));this.restartHit.setSize(200,Math.max(70,Math.ceil(48/scale)));}
  // The plate may now run up to the minimap: no pause button sits between them any more.
  this.guardianLayout=topHudLayout(scale,(this.mapFrame.x-16)*scale+16,280);const fguardian=this.guardianLayout,p=fguardian.guardian,portrait=fguardian.portrait,entry=fguardian.skills,body=fguardian.body;
  this.guardianPlate.clear().fillStyle(INK,.88).fillRoundedRect(p.x,p.y,p.width,p.height,8/scale).lineStyle(1/scale,GOLD,.65).strokeRoundedRect(p.x,p.y,p.width,p.height,8/scale);
  this.guardianRim.setPosition(portrait.x,portrait.y).setRadius(portrait.radius).setStrokeStyle(1/scale,GOLD);
  this.guardianPortrait.setPosition(portrait.x,portrait.y+portrait.radius).setDisplaySize(36/scale,32/scale);
  this.heroHit.setPosition(portrait.x,portrait.y).setRadius(portrait.hitRadius);(this.heroHit.input!.hitArea as Phaser.Geom.Circle).setTo(portrait.hitRadius,portrait.hitRadius,portrait.hitRadius);
  this.levelText.setPosition(body.x,body.levelY).setFontSize(14/scale);this.hpText.setPosition(body.x,body.hpY).setFontSize(14/scale);
  if(import.meta.env.DEV&&this.respawnNow){
   // The countdown row is too narrow for a touch target. Align it directly below the Guardian plate.
   const x=body.x+66/scale,y=p.y+p.height+26/scale;
   this.respawnNow.hit.setPosition(x,y).setScale(1/scale);
   this.respawnNow.label.setPosition(x,y).setFontSize(12/scale);
  }
  this.hpTrack.setPosition(body.x,body.hpBarY).setSize(body.width,8/scale).setDisplaySize(body.width,8/scale);this.hpBar.setPosition(body.x,body.hpBarY).setSize(body.width,8/scale).setDisplaySize(body.width,8/scale);
  this.xpText.setPosition(body.x,body.xpY).setFontSize(12/scale);this.xpTrack.setPosition(body.xpBarX,body.xpBarY).setSize(body.xpBarWidth,3/scale).setDisplaySize(body.xpBarWidth,3/scale);this.xpBar.setPosition(body.xpBarX,body.xpBarY).setSize(body.xpBarWidth,3/scale).setDisplaySize(body.xpBarWidth,3/scale);
  this.skillOpen.setPosition(entry.x,entry.y).setSize(entry.width,entry.height).setDisplaySize(entry.width,entry.height);this.skillOpenLabel.setPosition(entry.x,22/scale).setFontSize(18/scale);this.skillEntryCaption.setPosition(entry.x,44/scale).setFontSize(12/scale);
  for(const {hit} of this.skillButtons)hit.setDisplaySize(90,Math.max(68,Math.ceil(48/scale))).setSize(90,Math.max(68,Math.ceil(48/scale)));
  if(this.skillClose)this.skillClose.setDisplaySize(200,Math.max(70,Math.ceil(48/scale))).setSize(200,Math.max(70,Math.ceil(48/scale)));
  this.heroBar.layout(heroBarLayout(this.controls,scale,HERO_SLOTS));this.tavern.layout(scale);
  const j=this.controls.joystick;this.joystickArt.setPosition(j.x,j.y).setScale(j.radius/61);this.joystickHit.setPosition(j.x,j.y).setRadius(j.radius);
  (this.joystickHit.input!.hitArea as Phaser.Geom.Circle).setTo(j.radius,j.radius,j.radius);this.knob.setPosition(j.x,j.y);
  const f=this.controls.feedback;wrapLocalizedText(this.combatNotice.setPosition(f.x,f.y).setFontSize(Math.ceil(14/scale)).setPadding(6/scale,3/scale),wrapWidth(f.width));
  this.toast.setFontSize(Math.ceil(12/scale)).setPadding(8/scale,4/scale).setOrigin(.5,currentLocale()==='en'?.5:0);
  const m=fguardian.match;this.wrapObjective=currentLocale()!=='en'&&m.width*scale<220;
  const extra=this.wrapObjective?15:0;m.height+=extra/scale;
  this.topPanels=[new Phaser.Geom.Rectangle(m.x,m.y,m.width,m.height)];
  // The plate is a local obstruction (like the Shop), not part of the full-width HUD clearance, so world Keep bars elsewhere are unaffected.
  const standardKeep=azureKeepHudLayout(scale,this.mapFrame);
  const keepOverlapsMatch=currentLocale()!=='en'&&standardKeep.x<m.x+m.width&&standardKeep.y<m.y+m.height;
  const k=this.keepLayout=keepOverlapsMatch?azureKeepHudLayout(scale,this.mapFrame,true):standardKeep;
  this.keepLabel.setPosition(k.label.x,k.label.y).setFontSize(k.label.size);this.keepHpText.setPosition(k.hp.x,k.hp.y).setFontSize(k.hp.size);
  this.keepTrack.setPosition(k.bar.x,k.bar.y+k.bar.height/2).setSize(k.bar.width,k.bar.height).setDisplaySize(k.bar.width,k.bar.height);this.keepBar.setPosition(k.bar.x,k.bar.y+k.bar.height/2).setSize(k.bar.width,k.bar.height);this.drawKeepPlate();
  // Integration: the tap inspector used to start at (948,113) under the minimap, where the plate now sits. It moves beside the plate (right-aligned
  // to its left edge), which keeps it clear of the Shop-time toast below the plate and of every panel, which ends further left.
  this.inspector.setPosition(k.x-6/scale,k.y+2/scale);
  this.matchPlate.clear().fillStyle(INK,.88).fillRoundedRect(m.x,m.y,m.width,m.height,8/scale).lineStyle(1/scale,GOLD,.65).strokeRoundedRect(m.x,m.y,m.width,m.height,8/scale);
  this.objectiveText.setPosition(m.x+8/scale,14/scale).setFontSize(14/scale);
  this.waveText.setPosition(m.x+8/scale,(this.wrapObjective?33:34)/scale).setFontSize(12/scale);this.placePauseControl(scale);fitLocalizedLine(this.objectiveText,this.objectiveTitle,m.width-76/scale);this.objectiveShown='';
  [this.goldText,this.woodText,this.ironText].forEach((text,i)=>{const x=m.x+8/scale+i*Math.min(78/scale,(m.width-16/scale)/3),art=this.resourceArt[i];art.setPosition(x+8/scale,(61+extra)/scale).setScale(16/scale/Math.max(art.width,art.height));text.setPosition(x+20/scale,(54+extra)/scale).setFontSize(12/scale);});

  this.utilityPanel.setPosition(0,0);this.utilityPreview.setPosition(-90,Math.min(0,540-24/scale-514));
  // Minimap frame extends4 logical pixels; its existing shadow extends3 more.
  this.topHudBottom=Math.max(...this.topPanels.map(p=>p.bottom),p.y+p.height,this.skillOpen.getBounds().bottom,this.mapFrame.y+this.mapFrame.height+7)+8/scale;
  if(this.wrapObjective)wrapLocalizedText(this.combatNotice.setPosition(f.x-100/scale,this.topHudBottom).setOrigin(.5,0),145/scale);
  else this.combatNotice.setOrigin(.5);
  this.shopHudBottom=fguardian.shopHudBottom;
  this.layoutPause(scale);this.audioSettings?.layout(scale);
  if(this.missionView)this.renderMission(this.missionView);
  if(this.results?.visible&&(this.scene.get('Battle') as Battle).campaignLevel)this.layoutCampaignResults();
  this.game.events.emit('keep-hud-obstruction',{x:k.x,y:k.y,width:k.width,height:k.height});this.game.events.emit('hud-clearance',this.topHudBottom);this.game.events.emit('camera-safe-area',{left:this.controls.safe.left,right:this.controls.safe.right,bottom:this.controls.safe.bottom,top:Math.max(p.y+p.height,m.y+m.height)+8/scale});this.shop?.layout(scale,this.shopHudBottom,this.controls.panelAnchorX,this.topHudBottom);this.buildPanel?.layout(scale,this.topHudBottom,this.controls.panelAnchorX);this.skills?.layout(scale,this.topHudBottom,this.controls.panelAnchorX);this.game.events.emit('shop-obstruction',this.shop?.visible?this.shop.bounds:this.skillPanel?.visible?this.skills.bounds:this.utilityPanel?.visible&&this.utilityMode==='Build'?this.buildPanel.bounds:undefined);
 }
 // Reads the authoritative Keep each frame: no separate UI counter, no smoothing that could suggest healing.
 private drawKeepPlate(){
  const base=(this.scene.get('Battle') as Battle).simulation.state.bases['blue-base'],k=this.keepLayout,scale=this.game.canvas.getBoundingClientRect().height/540;
  const v=azureKeepHudState(base?.hp??0,base?.maxHp??0),c=azureKeepHudColors[v.level];
  // Below 30% the border breathes slowly (restrained warning); otherwise the plate matches the other top plates.
  const alpha=v.level==='low'?.55+.45*(.5+.5*Math.sin(this.elapsed/1000*Math.PI*1.6)):.65;
  this.keepPlate.clear().fillStyle(INK,.88).fillRoundedRect(k.x,k.y,k.width,k.height,k.radius).lineStyle((v.level==='low'?1.5:1)/scale,c.border,alpha).strokeRoundedRect(k.x,k.y,k.width,k.height,k.radius);
  this.keepLabel.setText(this.keepMinimum===null?t('battleAzureUpper'):t('battleMinimum',{percent:Math.round(this.keepMinimum*100)}));
  if(this.keepMinimum!==null){const tx=k.bar.x+k.bar.width*this.keepMinimum;this.keepPlate.lineStyle(2/scale,0xffd39b,.95).lineBetween(tx,k.bar.y-2/scale,tx,k.bar.y+k.bar.height+2/scale);}
  this.keepHpText.setText(v.text).setColor(c.text);this.keepBar.setFillStyle(c.bar).setDisplaySize(Math.max(0,k.bar.width*v.fraction),k.bar.height);this.keepLevel=v.level;
 }
 private minimap(){
  const f=this.mapFrame;this.panel(f.x-4,f.y-4,f.width+8,f.height+8);const g=this.add.graphics();
  const r=(x:number,y:number,w:number,h:number,color:number)=>g.fillStyle(color).fillRect(f.x+x/WORLD.width*f.width,f.y+y/WORLD.height*f.height,w/WORLD.width*f.width,h/WORLD.height*f.height);
  // The active match's battlefield: Meadow keeps its river and bridge; any other field draws its barriers at their exact rectangles.
  const field=(this.scene.get('Battle') as Battle).simulation.field,art=battlefieldArt(field.id),m=art.minimap;
  if(art.terrain==='meadow')this.meadowMinimap(r);
  else{r(0,0,WORLD.width,WORLD.height,m.ground);if(art.road)r(0,art.road.top,WORLD.width,art.road.bottom-art.road.top,m.road);for(const b of field.barriers){const v=visibleRect(b);r(v.x,v.y,v.width,v.height,m.barrier);}}
  field.scenery.forEach(p=>{const x=f.x+p.x/WORLD.width*f.width,y=f.y+p.y/WORLD.height*f.height;g.fillStyle(p.kind==='trees'?m.tree:m.prop).fillCircle(x,y,p.kind==='trees'?3:1.5);});
  field.entities.filter(e=>!e.kind.startsWith('minion')&&!e.kind.startsWith('base')).forEach(e=>{const x=f.x+e.x/WORLD.width*f.width,y=f.y+e.y/WORLD.height*f.height;const dot=this.add.circle(x,y,e.id==='guardian'?3:1.8,e.team==='blue'?0x83deff:0xff7878);if(e.id==='guardian')this.mapHero=dot.setStrokeStyle(1,0xffffff);});
  this.mapPosts=(this.scene.get('Battle') as Battle).simulation.camps.map(post=>this.add.circle(f.x+post.circle.x/WORLD.width*f.width,f.y+post.circle.y/WORLD.height*f.height,Math.max(3,post.circle.radius/WORLD.width*f.width),0xff7878,.35).setStrokeStyle(1.5,0xff7878,.95));
  this.mapViewport=this.add.graphics();
  this.add.rectangle(f.x+f.width/2,f.y+f.height/2,f.width,f.height,0,0).setInteractive().on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.game.events.emit('focus-map',(p.x-f.x)/f.width*WORLD.width,(p.y-f.y)/f.height*WORLD.height);});
 }
 private meadowMinimap(r:(x:number,y:number,w:number,h:number,color:number)=>unknown){
  r(0,0,WORLD.width,WORLD.height,0x50815a);r(0,terrain.laneTop,WORLD.width,terrain.laneBottom-terrain.laneTop,0xc8b97e);r(terrain.riverLeft,0,terrain.riverRight-terrain.riverLeft,WORLD.height,0x3ba0ab);r(terrain.riverLeft,terrain.bridgeTop,terrain.riverRight-terrain.riverLeft,terrain.bridgeBottom-terrain.bridgeTop,0xc8c7a7);
 }
 private joystick(){
  this.joystickArt=this.add.container(0,0);this.joystickArt.add([this.add.circle(0,0,61,0x102e36,.48).setStrokeStyle(2,0xc1d5c2,.65),this.add.circle(0,0,46,0x315a60,.2).setStrokeStyle(1,0xb0d3cf,.4)]);this.knob=this.add.circle(0,0,27,0x264b55,.85).setStrokeStyle(2,0xd4d8b2,.8);
  this.joystickHit=this.add.circle(0,0,61,0,0).setInteractive({hitArea:new Phaser.Geom.Circle(61,61,61),hitAreaCallback:Phaser.Geom.Circle.Contains}).on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(this.paused||this.shop.visible||this.utilityMode==='Build'&&this.utilityPanel.visible||this.stickPointer!==null)return;this.stickPointer=p.id;this.moveStick(p);});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(p.id===this.stickPointer)this.moveStick(p);});
  const release=(p?:Phaser.Input.Pointer)=>{if(!p||p.id===this.stickPointer){this.stickPointer=null;this.knob.setPosition(this.controls.joystick.x,this.controls.joystick.y);this.game.events.emit('stick',0,0);}};
  this.input.on('pointerup',release);this.input.on('pointerupoutside',release);this.listen('pause-visual',()=>release());this.listen('clear-controls',()=>release());this.dom('pointercancel',()=>release());this.dom('touchcancel',()=>release());this.dom('blur',()=>release());
 }
 private moveStick(p:Phaser.Input.Pointer){const j=this.controls.joystick,dx=p.x-j.x,dy=p.y-j.y,len=Math.hypot(dx,dy),scale=Math.min(1,j.travel/Math.max(len,1));this.knob.setPosition(j.x+dx*scale,j.y+dy*scale);this.game.events.emit('stick',dx*scale/j.travel,dy*scale/j.travel);}
 private createUtilityPanel(){
  this.utilityPanel=this.add.container(0,0).setDepth(100).setVisible(false);
  const bg=this.panel(286,290,328,224);this.utilityTitle=this.text(307,307,'',16,WHITE,true);this.utilityDetail=this.text(307,337,'',12,MUTED);
  const grid=this.footprintButton=this.text(309,386,'FOOTPRINTS',11,'#c7e7e5',true).setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.gridShown=!this.gridShown;this.game.events.emit('grid',this.gridShown);});
  const close=this.add.circle(550,309,17,0x244852).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.closeUtility());const mark=this.text(550,309,'×',22,WHITE).setOrigin(.5);
  this.buildPanel=new BuildPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,()=>(this.scene.get('Battle') as Battle).placement,kind=>{this.buildKind=kind;this.game.events.emit('select-building');const ruin=kind==='ballista'?(this.scene.get('Battle') as Battle).simulation.ballistaRuin:undefined;if(ruin){this.game.events.emit('focus-map',(ruin.col+.5)*48,(ruin.row+.5)*48-70);this.buildPanel.refit(ruin.col,ruin.row);}},()=>this.game.events.emit('select-building'),id=>this.game.events.emit('confirm-building',id),()=>this.closeUtility());
  this.buildControls=this.buildPanel.container;this.buildHits=this.buildPanel.hits;this.buildLabels=this.buildPanel.labels;this.buildReason=this.buildPanel.status;
  this.listen('simulation-event',(e:GameEvent)=>{this.buildPanel.observe(e);if(e.type==='built')this.tell(t('battleConstruction'));});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:Phaser.GameObjects.GameObject[])=>{if(!objects.length&&!this.paused&&this.utilityPanel.visible&&this.utilityMode==='Build'&&this.buildKind){if(this.buildPanel.model.pending)return;this.buildPanel.locationChanged();this.game.events.emit('placement',this.buildKind,p.x,p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.panPointer?.id===p.id&&p.isDown&&!this.paused){this.game.events.emit('build-pan',this.panPointer.x-p.x,this.panPointer.y-p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointerup',()=>{this.panPointer=undefined;});this.listen('clear-controls',()=>{this.panPointer=undefined;});this.dom('pointercancel',()=>{this.panPointer=undefined;});
  const blocker=this.add.rectangle(450,402,328,224,0,0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  this.utilityPreview=this.add.container(0,0,[bg,blocker,this.utilityTitle,this.utilityDetail,grid,close,mark]);this.utilityPanel.add([this.utilityPreview,this.buildControls]);
 }
 private openShop(){const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting||!sim.setup.shop)return;if(this.shop.visible){this.closeShop();return;}this.closeSkills();this.closeTavern();if(this.utilityPanel.visible)this.closeUtility();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',true);this.shop.open();this.game.events.emit('time-scale',.25);this.game.events.emit('shop-obstruction',this.shop.bounds);}
 private openTavern(){
  const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting||!sim.setup.tavern)return;if(this.tavern.visible){this.closeTavern();return;}
  this.closeShop();this.closeSkills();if(this.utilityPanel.visible)this.closeUtility();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',true);this.tavern.open();this.game.events.emit('time-scale',.25);
 }
 private closeTavern(){if(!this.tavern?.visible)return;this.tavern.hide();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',false);this.game.events.emit('time-scale',1);}
 private closeShop(){if(!this.shop?.visible)return;this.shop.hide();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',false);this.game.events.emit('shop-obstruction',undefined);this.game.events.emit('time-scale',this.utilityPanel.visible&&this.utilityMode==='Build'?.25:1);}
 private closeUtility(){this.panPointer=undefined;this.buildPanel.hide();this.utilityPanel.setVisible(false);this.buildKind=undefined;this.game.events.emit('building-mode',false);this.game.events.emit('shop-obstruction',this.shop?.visible?this.shop.bounds:undefined);this.game.events.emit('time-scale',1);}
 private showUtility(mode:string){if(mode==='Shop'){this.openShop();return;}if(this.paused)return;this.closeShop();this.closeTavern();this.closeSkills();this.utilityPanel.setVisible(!(this.utilityPanel.visible&&this.utilityMode===mode));this.utilityMode=mode;this.footprintButton.setVisible(mode!=='Build');this.buildKind=undefined;this.utilityPreview.setVisible(mode!=='Build');if(mode==='Build'&&this.utilityPanel.visible)this.buildPanel.open();else this.buildPanel.hide();this.utilityDetail.setVisible(mode!=='Build');this.game.events.emit('clear-controls');this.game.events.emit('building-mode',mode==='Build'&&this.utilityPanel.visible);this.game.events.emit('time-scale',this.utilityPanel.visible&&mode==='Build'?.25:1);this.game.events.emit('shop-obstruction',mode==='Build'&&this.utilityPanel.visible?this.buildPanel.bounds:undefined);this.utilityTitle.setText(`${mode.toUpperCase()}${mode==='Build'?'':' - PREVIEW'}`);this.utilityDetail.setText(mode==='Build'?'Select a building and tap a cell.':'Allied minions fight automatically.');}
 private openSkills(){
  const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting)return;
  this.closeShop();this.closeTavern();if(this.utilityPanel.visible)this.closeUtility();this.game.events.emit('clear-controls');this.game.events.emit('skill-menu',true);this.skills.open();
  this.skillStatus.setText(sim.state.heroProgression.level===1&&sim.state.heroProgression.skillPoints>0?'Spend your point to learn a skill.':'Each upgrade costs 1 skill point.');
 }
 private closeSkills(){this.skills?.hide();this.game.events.emit('shop-obstruction',undefined);this.game.events.emit('skill-menu',false);
  if(this.guidancePending&&!this.guidanceShown){this.guidancePending=false;this.guidanceShown=true;this.showCombatNotice(t('battleCastHint'),6500,0);}
 }
 // Chapter 5 Hero Command HUD (docs/CHAPTER5_HERO_HUD.md). The bar shows only while the match has living Allied Heroes, so Chapters 1-4 never see it.
 // Map taps are read only in target mode (and to close the popover), in the Build-mode way: a pointer that starts on no HUD object and is not the joystick's. A drag pans the camera, a tap picks.
 // Every other panel, a skill press and Pause cancel the mode (they all emit clear-controls); the joystick is never touched.
 private createHeroBar(){
  this.heroState=heroIdle;this.heroRequest=0;this.heroPointer=undefined;this.heroReason=undefined;
  this.heroBar=new HeroBar(this,{portrait:id=>this.heroAction({type:'portrait',id}),command:order=>this.heroAction({type:'command',order}),cancel:()=>this.heroAction({type:'cancel'})});
  const cancel=()=>{if(this.heroState.mode!=='idle')this.heroAction({type:'cancel'});};
  this.listen('clear-controls',cancel);this.listen('cast',cancel);this.listen('skill-aim',(_key:string,_p:unknown,_dragged:boolean,start?:unknown)=>{if(start)cancel();});
  this.listen('tavern-open',()=>this.openTavern());
  // Chapter 5 Phase 1B: a finished Tavern says so (a tap on it opens the panel); a fall and a return are announced.
  this.listen('simulation-event',(e:GameEvent)=>{const sim=(this.scene.get('Battle') as Battle).simulation;
   if(e.type==='construction-complete'&&sim.state.structures[e.id]?.tavern)this.tell(t('battleTavernReady'),2);
   if(e.type==='tavern'&&(e.action==='fallen'||e.action==='returned'))this.tell(e.action==='fallen'?t('battleHeroDown',{name:mercenary(e.merc)?.name??t('battleAHero')}):t('battleHeroReturn',{name:mercenary(e.merc)?.name??t('battleAHero')}),2);});
  this.listen('hero-select-unit',(id:string)=>{if(this.heroInteractive())this.heroAction({type:'portrait',id});});
  this.listen('simulation-event',(e:GameEvent)=>{if(e.type==='rejected'&&e.requestId?.startsWith('hero-ui-'))this.heroAction({type:'refused',reason:e.reason});});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:Phaser.GameObjects.GameObject[])=>{if(objects.length||p.id===this.stickPointer||this.heroState.mode==='idle'||!this.heroInteractive())return;this.heroPointer={id:p.id,x:p.x,y:p.y,sx:p.x,sy:p.y,moved:false};});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{const h=this.heroPointer;if(!h||h.id!==p.id||!p.isDown)return;const scale=this.game.canvas.getBoundingClientRect().height/540;
   if(!h.moved&&Math.hypot(p.x-h.sx,p.y-h.sy)*scale>=10)h.moved=true;if(h.moved&&targeting(this.heroState))(this.scene.get('Battle') as Battle).heroPan(h.x-p.x,h.y-p.y);h.x=p.x;h.y=p.y;});
  const release=(p:Phaser.Input.Pointer)=>{const h=this.heroPointer;if(!h||h.id!==p.id)return;this.heroPointer=undefined;if(!h.moved)this.heroMapTap(p.x,p.y);};
  this.input.on('pointerup',release);this.input.on('pointerupoutside',(p:Phaser.Input.Pointer)=>{if(this.heroPointer?.id===p.id)this.heroPointer=undefined;});
 }
 private heroInteractive(){const sim=(this.scene.get('Battle') as Battle).simulation;return !this.paused&&!this.restarting&&!sim.ended&&!this.shop.visible&&!this.tavern.visible&&!this.skillPanel.visible&&!(this.utilityPanel.visible&&this.utilityMode==='Build');}
 private heroAction(a:HeroCommandAction){
  if((a.type==='portrait'||a.type==='command')&&!this.heroInteractive())return;
  const r=heroCommand(this.heroState,a);this.heroState=r.state;
  this.heroReason=a.type==='refused'&&targeting(r.state)?{text:a.reason,until:this.elapsed+1800}:undefined;
  if(r.follow)this.sendHero(r.follow,{type:'follow'});
  if(!targeting(r.state))this.heroPointer=undefined;
  (this.scene.get('Battle') as Battle).setHeroCommand(this.heroState);
 }
 private sendHero(id:string,order:AllyOrder){(this.scene.get('Battle') as Battle).simulation.send({type:'ally',requestId:`hero-ui-${++this.heroRequest}`,id,order});}
 // A tap on the battlefield (logical px): closes the popover, or resolves a target. A refused pick keeps the mode and says why; an accepted one is sent and ends the mode.
 private heroMapTap(x:number,y:number){
  const s=this.heroState;if(s.mode==='menu'){this.heroAction({type:'map'});return;}if(!targeting(s)||!s.selected)return;
  const battle=this.scene.get('Battle') as Battle,pick=battle.heroPick(s.mode==='attack'?'attack':'defend',x,y);
  const order:AllyOrder|undefined=s.mode==='attack'?(pick.targetId?{type:'attack',targetId:pick.targetId}:undefined):pick.point&&{type:'defend',...pick.point};
  const reason=order?battle.simulation.allyOrderReason(s.selected,order):'Tap an enemy or a structure';
  if(reason||!order){this.heroAction({type:'refused',reason:reason??'Tap an enemy or a structure'});return;}
  this.sendHero(s.selected,order);this.heroAction({type:'picked'});
 }
 private renderHeroBar(){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  const heroes:HeroBarHero[]=Object.values(sim.state.units).filter(u=>u.ally&&u.hp>0).sort((a,b)=>a.ally!.slot-b.ally!.slot||a.id.localeCompare(b.id)).map(u=>({id:u.id,hp:u.hp,maxHp:u.maxHp,order:u.ally!.order.type,texture:mercenaryTexture(u.ally!.merc)}));
  if(this.heroState.selected&&!heroes.some(h=>h.id===this.heroState.selected))this.heroAction({type:'roster',ids:heroes.map(h=>h.id)});
  if(this.heroReason&&this.elapsed>=this.heroReason.until)this.heroReason=undefined;
  this.heroBar.render(sim.ended?[]:heroes,this.heroState,this.heroInteractive(),this.heroReason?.text);
 }
 private createSkills(){
  this.skills=new SkillsPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,()=>this.closeSkills());
  this.skillPanel=this.skills.container;this.skillHeading=this.skills.heading;this.skillStatus=this.skills.status;this.skillProgress=this.skills.progress;this.skillButtons=this.skills.rows;this.skillClose=this.skills.closeHit;
 }
 private createPause(){
  this.overlay=this.add.container(0,0).setDepth(1000).setVisible(false);
  const shade=this.add.rectangle(480,270,960,540,0x020810,.56).setInteractive();
  this.pauseArt=this.add.graphics();this.pauseCrest=createMenuCrest(this);
  this.pauseTitle=this.text(480,216,t('battlePauseTitle'),24,FANTASY_TEXT.gold,true).setFontFamily(localeFont(UI_FONT)).setOrigin(.5);
  this.pauseSub=this.text(480,250,t('battlePauseSub'),14,FANTASY_TEXT.muted).setFontFamily(localeFont(UI_FONT)).setOrigin(.5);
  this.overlay.add([shade,this.pauseArt,this.pauseCrest,this.pauseTitle,this.pauseSub]);
  const campaign=!!(this.scene.get('Battle') as Battle).campaignLevel;
  const entries:Array<[string,string,()=>void]>=[['resume',t('battleResume'),()=>this.setPause(false)],
   campaign?['levelSelect',this.campaignReturnLabel(),()=>this.leaveBattle('CampaignSelect')]:['restart',t('battleRestart'),()=>this.restartMatch(false)],
   ...(fullscreenControlOffered()?[['fullscreen',isFullscreen()?t('battleExitFullscreen'):t('battleFullscreen'),()=>{toggleFullscreen();}] as [string,string,()=>void]]:[]),
   ['audio',t('battleAudio'),()=>{this.overlay.setVisible(false);this.audioSettings.show();}],
   ['mainMenu',t('battleMainMenu'),()=>this.leaveBattle('MainMenu')]];
  this.pauseButtons=entries.map(([id,text,action])=>{
   const art=this.add.graphics(),icon=this.add.graphics(),hit=this.add.rectangle(480,316,224,48,0,0).setInteractive({useHandCursor:true}).on('pointerup',action);
   const label=this.text(480,316,text,14,id==='resume'?FANTASY_TEXT.ink:FANTASY_TEXT.primary,true).setFontFamily(localeFont(UI_FONT)).setOrigin(.5);
   this.overlay.add([art,icon,hit,label]);return {id,art,icon,hit,label};
  });
  const fsButton=this.pauseButtons.find(b=>b.id==='fullscreen');
  if(fsButton){const sync=()=>fsButton.label.setText(isFullscreen()?t('battleExitFullscreen'):t('battleFullscreen'));this.dom('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);this.cleanup.push(()=>document.removeEventListener('webkitfullscreenchange',sync));}
  this.pauseResume=this.pauseButtons[0].hit;this.pauseResumeArt=this.pauseButtons[0].art;this.pauseLabel=this.pauseButtons[0].label;
  this.pauseNotice=this.text(480,420,t('battleLeave'),11,FANTASY_TEXT.warning).setFontFamily(localeFont(UI_FONT)).setOrigin(.5).setAlign('center');
  this.overlay.add(this.pauseNotice);
  this.audioSettings=new AudioSettingsPanel(this,(this.scene.get('Battle') as Battle).audio,()=>this.overlay.setVisible(true));
 }
 private createMissionPanel(){
  const level=(this.scene.get('Battle') as Battle).campaignLevel;
  this.missionPanel=this.add.container(0,0).setDepth(450).setVisible(!!level);
  this.missionArt=this.add.graphics();
  this.missionHeading=this.text(26,124,'',14,WHITE,true);
  this.missionPhase=this.text(26,145,'',10,'#f0d797',true);
  for(let i=0;i<4;i++)this.missionRows.push(this.text(26,164+i*17,'',11,MUTED));
  this.missionProgressTrack=this.add.rectangle(26,235,292,7,0x071f26).setOrigin(0,.5);
  this.missionProgressBar=this.add.rectangle(26,235,1,7,0x68d8ad).setOrigin(0,.5);
  this.missionKeep=this.text(26,246,'',11,'#a5edff',true);
  this.missionPanel.add([this.missionArt,this.missionHeading,this.missionPhase,...this.missionRows,this.missionProgressTrack,this.missionProgressBar,this.missionKeep]);
 }
 private observeMission(force=false){
  const battle=this.scene.get('Battle') as Battle,level=battle.campaignLevel;if(!level)return;
  const sim=battle.simulation;if(!force&&!sim.ended&&sim.clock.tick<this.lastMissionTick+6)return;
  this.lastMissionTick=sim.clock.tick;
  const blue=sim.state.bases['blue-base'],red=sim.state.bases['red-base'];
  const view=missionPanelView(level,level.mission?sim.missionStatus():null,{blue:{hp:blue.hp,maxHp:blue.maxHp},red:{hp:red.hp,maxHp:red.maxHp}},o=>currentLocale()!=='en'&&o.display?.label?objectiveLabel(level.id,o.phaseId,o.definition):undefined),signature=JSON.stringify(view);
  if(!force&&signature===this.missionSignature)return;this.missionSignature=signature;this.missionView=view;this.renderMission(view);
 }
 /** Every mission shows one objective on the top plate: the first not yet complete, then the next as each completes (all of them still track in the background).
  * The Azure Keep minimum, where a mission has one, is a mark on the Keep bar; the Keep's HP is not repeated. The floating panel no longer exists. */
 private renderMission(view:MissionPanelView){
  this.compactObjective=true;this.missionPanel.setVisible(false);this.missionBounds={x:0,y:0,width:0,height:0};
  this.keepMinimum=view.azure.minimum!==null?view.azure.minimum/Math.max(1,view.azure.maxHp):null;
  const row=view.rows.find(r=>r.state==='active')??view.rows.at(-1);
  this.objectiveSuffix=row?t('battleObjective',{label:'',progress:row.progress,target:row.target}):'';
  this.objectiveLine=row?`${row.complete?'✓ ':''}${t('battleObjective',{label:row.label,progress:row.progress,target:row.target})}`:t('battleObjective',{label:t('battleCrimson'),progress:Math.ceil(view.crimson!.hp),target:view.crimson!.maxHp});
  this.objectiveColor=view.complete?'#8cebd1':WHITE;this.objectiveShown='';
 }
 private objectiveColor=WHITE;private objectiveTitle='';
 private placePauseControl(scale:number){
  const m=this.guardianLayout.match,w=64/scale,h=44/scale,hx=m.x+m.width-w,hy=m.y;
  this.pauseButton.hit.setPosition(hx+w/2,hy+h/2).setSize(w,h).setDisplaySize(w,h);this.pauseButton.x=hx+w/2;this.pauseButton.y=hy+h/2;this.pauseButton.hitRadius=h/2;
  this.pauseMark={x:m.x+m.width-16/scale,y:hy+13/scale,scale,hx,hy,hw:w,hh:h};
  this.timerText.setPosition(m.x+m.width-30/scale,14/scale).setOrigin(1,0).setFontSize(13/scale).setFontStyle('bold').setColor('#fff3d3');
  this.drawPauseMark();
 }
 private drawPauseMark(){
  const k=this.pauseMark,s=k.scale,g=this.pauseIcon;if(!g)return;g.clear();
  if(this.pausePressed)g.fillStyle(GOLD,.22).fillRoundedRect(k.hx+2/s,k.hy+2/s,k.hw-4/s,k.hh-4/s,6/s);
  for(const dx of [-5,1]){g.fillStyle(0x071a22,.7).fillRoundedRect(k.x+(dx+.7)/s,k.y-6.3/s,4/s,14/s,1.5/s);g.fillStyle(this.pausePressed?0xffe4a4:GOLD).fillRoundedRect(k.x+dx/s,k.y-7/s,4/s,14/s,1.5/s);}
 }
 /** Writes the plate's second line (a threat warning replaces it while it lasts), cut with an ellipsis only when it would run past the plate. */
 /** Chapter 4: the objective follows the camp (capture, then the Keep, or retake it if the Banner fell); empty outside a post level or once the match is decided. */
 private postObjective(){
  const sim=(this.scene.get('Battle') as Battle).simulation,p=sim.state.post;
  if(!p||!this.compactObjective||sim.ended)return '';
  if(sim.setup.campShield===false)return t('destroyKeep'); // Chapter 4 M6: the outposts are footholds, not the objective
  const open=sim.postStates.flatMap((q,i)=>q.owner==='azure'?[]:[{q,name:sim.campName(i)}]); // Chapter 4 M5: every camp still Crimson, in setup order; two or more are counted, not named (the plate holds about 32 characters)
  const outposts=open.every(o=>/Outpost$/.test(o.name)); // Chapter 5 M4: the plate says what the map calls the places; every earlier two-camp mission names Camps and reads as before
  if(!open.length)return t('destroyKeep');
  if(open.length>1)return t(open.length===2?(outposts?'battleCaptureBothOutposts':'battleCaptureBothCamps'):(outposts?'battleCaptureOutposts':'battleCaptureCamps'),{count:open.length});
  const {q,name}=open[0];
  return t(q.captured?'battleRecapture':'battleCapture',{name:battleName(name)});
 }
 private showObjective(threat:string){
  const value=threat||this.postObjective()||this.objectiveLine,color=threat?'#ff9a8f':this.objectiveColor,key=value+color;if(key===this.objectiveShown)return;this.objectiveShown=key;
  const width=this.guardianLayout.match.width-16/Math.max(.1,this.game.canvas.getBoundingClientRect().height/540);
  this.waveText.setColor(color).setText(value);
  if(this.waveText.width<=width)return;
  const lines=this.wrapObjective?localizedWrap(width).callback?.(value,this.waveText):undefined;
  if(Array.isArray(lines)&&lines.length===2){this.waveText.setText(lines.join('\n'));return;}
  fitLocalizedLine(this.waveText,value,width,value===this.objectiveLine&&value.endsWith(this.objectiveSuffix)?this.objectiveSuffix:'');
 }
 private missionPopup(){return this.shop?.visible?this.shop.bounds:this.skillPanel?.visible?this.skills.bounds:this.utilityPanel?.visible&&this.utilityMode==='Build'?this.buildPanel.bounds:undefined;}
 private observeMissionPopup(){
  if(!this.missionView)return;const signature=JSON.stringify(this.missionPopup())??'';
  if(signature!==this.missionPopupSignature){this.missionPopupSignature=signature;this.renderMission(this.missionView);}
 }
 private layoutPause(scale:number){
  const p=(n:number)=>n/Math.max(.1,scale),n=this.pauseButtons.length,grid=540*scale<300;
  const rows=grid?1+Math.ceil((n-1)/2):n,footer=540*scale>=420,width=Math.min(p(grid?400:320),960-p(24));
  const header=42,step=48,height=p(header+rows*48+(footer?32:4));
  const f=this.pauseFrame={x:480-width/2,y:270-height/2,width,height};drawOrnateMenuPanel(this.pauseArt,f,scale);placeMenuCrest(this.pauseCrest,f,scale);
  this.pauseTitle.setPosition(480,f.y+p(28)).setFontSize(p(20));finishMenuTitle(this.pauseTitle,scale,localeFont(MENU_TITLE_FONT));this.pauseSub.setVisible(false);
  drawMenuRule(this.pauseArt,480-p(55),f.y+p(41),p(110),scale);
  const full=width-p(32),gap=p(12),half=(full-gap)/2;
  this.pauseButtons.forEach((b,i)=>{
   const row=grid?(i===0?0:1+Math.floor((i-1)/2)):i,w=grid&&i>0?half:full;
   const x=grid&&i>0?480+((i-1)%2?1:-1)*(half+gap)/2:480,y=f.y+p(header+24+row*step),h=p(48);
   b.hit.setPosition(x,y).setSize(w,h).setDisplaySize(w,h);
   drawOrnateMenuButton(b.art,x-w/2,y-p(i?20:22),w,p(i?40:44),scale,i===0);
   wrapLocalizedText(b.label.setPosition(x+p(18),y).setFontFamily(localeFont(i?UI_FONT:MENU_TITLE_FONT)).setResolution(Math.min(3,devicePixelRatio||1)).setFontSize(p(14)).setAlign('center'),wrapWidth(w-p(60)));
   drawMenuIcon(b.icon,b.id as MenuIcon,x-w/2+p(24),y,p(18),i?0xffe4a0:0x102536);
  });
  wrapLocalizedText(this.pauseNotice.setVisible(footer).setPosition(480,f.y+height-p(16)).setFontSize(p(12)),wrapWidth(width-p(32)));
 }
 public setPause(v:boolean){if((this.scene.get('Battle') as Battle).simulation.ended||this.restarting)return;if(v){if((this.scene.get('Battle') as Battle).campaignLevel)this.game.events.emit('clear-controls');else{this.closeShop();this.closeTavern();this.closeSkills();this.closeUtility();}}this.audioSettings.hide();this.paused=v;this.overlay.setVisible(v);this.abilities.forEach(a=>a.setDisabled(v));this.utilities.forEach(a=>a.setDisabled(v));this.game.events.emit('pause-visual',v);const sim=(this.scene.get('Battle') as Battle).simulation;this.abilities.forEach(a=>a.observe(sim.remaining(a.id)));}
 /** A result action runs only for a press that began on the button (same pointer); a release anywhere else, a cancel, the overlay closing or a scene change disarms it. */
 private resultButton(hit:Phaser.GameObjects.Rectangle,action:()=>void){
  hit.on('pointerdown',(p:Phaser.Input.Pointer,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.resultPress.arm(p.id,hit);}).on('pointerup',(p:Phaser.Input.Pointer)=>{if(this.resultPress.release(p.id,hit))action();});
 }
 private createResults(){
  const disarm=()=>this.resultPress.clear(),canvas=this.game.canvas;
  // A button's own pointerup runs before the scene's, so a completed press has already acted by the time this clears a stray one; touchcancel runs before Phaser's queued up.
  this.input.on('pointerup',disarm).on('gameout',disarm);canvas.addEventListener('touchcancel',disarm);
  this.events.once('shutdown',()=>{this.input.off('pointerup',disarm).off('gameout',disarm);canvas.removeEventListener('touchcancel',disarm);disarm();});
  this.results=this.add.container(0,0).setDepth(2000).setVisible(false);
  const shade=this.add.rectangle(480,270,960,540,0x071d25,.65).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  const bg=this.panel(140,96,680,350);this.resultTitle=this.text(480,144,'',28,WHITE,true).setOrigin(.5);
  const caption=this.text(480,178,t('battleResults'),12,MUTED,true).setOrigin(.5);this.resultDetail=this.text(480,246,'',13,WHITE).setOrigin(.5).setAlign('center');
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.restartHit=this.add.rectangle(480,350,200,Math.max(70,Math.ceil(48/scale)),0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true});
  this.restartHit;this.resultButton(this.restartHit,()=>this.restartMatch(true));
  const label=this.text(480,350,t('battleRestartMatch'),15,WHITE,true).setOrigin(.5);this.restartHit.setData('label',label);
  this.levelSelectHit=this.add.rectangle(520,394,184,48,0x244852).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false);this.resultButton(this.levelSelectHit,()=>this.leaveBattle('CampaignSelect'));
  const selectLabel=this.text(520,394,this.campaignReturnLabel(),12,WHITE,true).setOrigin(.5).setVisible(false);this.levelSelectHit.setData('label',selectLabel);
  this.mainMenuHit=this.add.rectangle(720,394,160,48,0x244852).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false);this.resultButton(this.mainMenuHit,()=>this.leaveBattle('MainMenu'));
  const menuLabel=this.text(720,394,t('battleMainMenu'),12,WHITE,true).setOrigin(.5).setVisible(false);this.mainMenuHit.setData('label',menuLabel);
  this.nextHit=this.add.rectangle(480,350,230,48,0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false);this.resultButton(this.nextHit,()=>this.openNextBriefing());
  this.nextHit.setData('label',this.text(480,350,t('battleNextMission'),14,WHITE,true).setOrigin(.5).setVisible(false));
  this.chapterHit=this.add.rectangle(480,350,230,48,0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false);this.resultButton(this.chapterHit,()=>this.leaveBattle('ChapterSelect'));
  this.chapterHit.setData('label',this.text(480,350,t('battleBackChapters'),13,WHITE,true).setOrigin(.5).setVisible(false));
  this.resultRule=this.text(480,416,t('battleBothRule'),10,MUTED).setOrigin(.5);
  this.results.add([shade,bg,this.resultTitle,caption,this.resultDetail,this.restartHit,label,this.levelSelectHit,selectLabel,this.mainMenuHit,menuLabel,this.nextHit,this.nextHit.getData('label'),this.chapterHit,this.chapterHit.getData('label'),this.resultRule]);
  this.campaignResultArt=this.add.graphics();this.campaignResultLevel=this.text(0,0,'',18,FANTASY_TEXT.gold,true).setOrigin(.5,0);
  this.campaignResultStats=this.text(0,0,'',13,MUTED).setOrigin(.5,0);this.campaignResultProgress=this.text(0,0,'',13,WHITE,true).setOrigin(.5,0).setAlign('left').setLineSpacing(3);
  this.campaignResultButtons=[this.add.graphics(),this.add.graphics(),this.add.graphics(),this.add.graphics()];
  this.resultAccent=this.add.graphics();this.resultRules=this.add.graphics();this.resultCaptions=[t('battleStats'),t('battleGoals')].map(label=>this.text(0,0,label,10,FANTASY_TEXT.gold,true).setOrigin(.5,0).setAlpha(.8).setVisible(false));
  this.results.add([this.campaignResultArt,this.resultAccent,this.resultRules,...this.resultCaptions,this.campaignResultLevel,this.campaignResultStats,this.campaignResultProgress,...this.campaignResultButtons]);
  if((this.scene.get('Battle') as Battle).campaignLevel){
   bg.setVisible(false);caption.setVisible(false);this.resultRule.setVisible(false);
   for(const hit of [this.restartHit,this.levelSelectHit,this.mainMenuHit,this.nextHit,this.chapterHit])hit!.setFillStyle(0,0).setStrokeStyle(0);
   this.results.bringToTop(this.resultTitle);this.results.bringToTop(this.resultDetail);
   for(const hit of [this.restartHit,this.levelSelectHit,this.mainMenuHit,this.nextHit,this.chapterHit]){this.results.bringToTop(hit!);this.results.bringToTop(hit!.getData('label'));}
  }else{this.campaignResultLevel.setVisible(false);this.campaignResultStats.setVisible(false);this.campaignResultProgress.setVisible(false);}
 }
 private layoutCampaignResults(){
  const scale=this.game.canvas.getBoundingClientRect().height/540,p=(n:number)=>n/Math.max(.1,scale),mobile=scale<.9,victory=this.resultVictory;
  const short=540*scale<360,width=Math.min(p(mobile?560:680),960-p(32)),padding=p(short?19:26),x=480-width/2,inner=width-padding*2;
  // Measure wrapped objective lines before centering the content-derived frame.
  const titleY=short?6:20,levelY=short?37:56,detailY=short?59:94;
  const statGap=short?5:10,buttonGap=short?22:24,buttonStep=short?43:50,footer=short?24:32;
  const columnGap=short?p(14):0,statsWidth=short?inner*.28:inner,goalsWidth=short?inner-statsWidth-columnGap:inner;
  const statsX=x+padding+statsWidth/2,goalsX=short?x+padding+statsWidth+columnGap+goalsWidth/2:480;
  wrapLocalizedText(this.resultDetail.setFontSize(p(14)),wrapWidth(inner));
  wrapLocalizedText(this.campaignResultStats.setAlign('center').setFontSize(p(12)),wrapWidth(statsWidth));
  wrapLocalizedText(this.campaignResultProgress.setFontSize(p(13)).setLineSpacing(p(short?2:3)),wrapWidth(goalsWidth),true);
  const contentHeight=short?p(13)+Math.max(this.campaignResultStats.height,this.campaignResultProgress.height):p(50)+this.campaignResultProgress.height;
  const height=p(detailY+statGap+buttonGap+buttonStep+footer)+this.resultDetail.height+contentHeight,top=270-height/2;
  this.resultTitle.setPosition(480,top+p(titleY)).setOrigin(.5,0).setFontSize(p(28));
  fitLocalizedLine(this.campaignResultLevel.setPosition(480,top+p(levelY)).setFontSize(p(17)),this.resultLevelHeading,inner);
  this.resultDetail.setOrigin(.5,0).setPosition(480,top+p(detailY));
  const [capStats,capObjectives]=this.resultCaptions,capA=this.resultDetail.y+this.resultDetail.height+p(statGap),statsY=capA+p(13),capB=short?capA:statsY+p(24);
  capStats.setPosition(statsX,capA).setFontSize(p(10)).setVisible(true);this.campaignResultStats.setPosition(statsX,statsY);
  capObjectives.setPosition(goalsX,capB).setFontSize(p(10)).setVisible(true);this.campaignResultProgress.setPosition(goalsX,capB+p(13));
  const retryY=capA+contentHeight+p(buttonGap),secondaryY=retryY+p(buttonStep),bottom=secondaryY+p(footer);
  this.campaignResultBounds={x,y:top,width,height:bottom-top};drawFantasyPanel(this.campaignResultArt,this.campaignResultBounds,scale);
  drawResultAccent(this.resultAccent,this.campaignResultBounds,victory,{y:top+p(titleY+16),halfWidth:this.resultTitle.width/2},scale);
  this.resultRules.clear();drawResultRule(this.resultRules,x+padding,top+p(short?detailY-4:detailY-12),inner,victory,scale);if(!short)drawResultRule(this.resultRules,x+padding,statsY+p(18),inner,victory,scale);
  // Defeat keeps Retry as the primary action. A won sequential mission leads with Next Mission (or Next Chapter after a chapter's last one), or
  // Campaign Complete / Back to Chapter Select when there is nothing to continue to; Replay moves to the secondary row.
  const promote=victory&&this.resultNext?this.nextHit!:victory&&this.resultFinal?this.chapterHit!:this.restartHit!;
  const secondary=promote===this.restartHit?[this.levelSelectHit!,this.mainMenuHit!]:[this.restartHit!,this.levelSelectHit!,this.mainMenuHit!];
  for(const hit of [this.restartHit,this.levelSelectHit,this.mainMenuHit,this.nextHit,this.chapterHit].map(h=>h!)){hit.setVisible(false);(hit.getData('label') as Phaser.GameObjects.Text).setVisible(false);}
  const place=(hit:Phaser.GameObjects.Rectangle,g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,primary:boolean)=>{const h=p(48);hit.setPosition(x,y).setSize(w,h).setDisplaySize(w,h).setVisible(true);g.clear();drawFantasyButton(g,x-w/2,y-p(20),w,p(40),scale,primary?'primary':'secondary');(hit.getData('label') as Phaser.GameObjects.Text).setPosition(x,y).setFontSize(p(primary?14:12)).setColor(primary?FANTASY_TEXT.ink:WHITE).setVisible(true);};
  this.campaignResultButtons.forEach(g=>g.clear());
  place(promote,this.campaignResultButtons[0],480,retryY,p(promote===this.chapterHit?280:230),true);
  const three=secondary.length===3,widths=three?[p(130),p(160),p(130)]:[p(180),p(160)],centers=three?[480-p(148),480,480+p(148)]:[480-p(98),480+p(98)];
  secondary.forEach((hit,i)=>place(hit,this.campaignResultButtons[i+1],centers[i],secondaryY,widths[i],false));
 }
 private restartMatch(requireEnded:boolean){
  const b=this.scene.get('Battle') as Battle;if(this.restarting||this.interstitialOpen||requireEnded&&!b.simulation.ended)return;this.restarting=true;b.simulation.beginRestart();this.game.events.emit('clear-controls');b.tweens.timeScale=1;b.scene.restart(b.launch);
 }
 /** Next Mission / Next Chapter: the next mission's briefing (never straight into battle), its Back button returning to that chapter's missions.
  * Progress was recorded when the Victory landed; the briefing re-reads it and sends a locked level back to the list, so this cannot skip ahead. */
 private openNextBriefing(){
  const b=this.scene.get('Battle') as Battle,t=this.resultTarget;
  if(this.restarting||this.interstitialOpen||b.simulation.outcome?.outcome!=='victory'||b.launch.mode!=='campaign'||!t||t.kind==='campaign-complete')return;
  const briefing:MissionNavigation={levelId:t.levelId,returnTo:{scene:'CampaignSelect',data:{chapterId:t.chapterId,selectedLevelId:t.levelId}}};
  const proceed=()=>this.leaveBattle('MissionBriefing',briefing);
  if(import.meta.env.DEV&&b.interstitialOpportunity){
   b.interstitialOpportunity=false;
   if(interstitialFrequency.canShow()&&this.showInterstitialMock(b,proceed)){
    interstitialFrequency.markShown();
    return;
   }
  }
  proceed();
 }

 private showInterstitialMock(battle:Battle,proceed:()=>void):boolean{
  if(!import.meta.env.DEV)return false;
  const simulation=battle.simulation;
  const objects:Phaser.GameObjects.GameObject[]=[];
  let active=true;
  let timer:Phaser.Time.TimerEvent|undefined;
  let continuation:number|undefined;
  const clean=()=>{
   active=false;
   this.interstitialOpen=false;
   this.events.off('shutdown',clean);
   timer?.remove(false);
   window.clearTimeout(continuation);
   objects.forEach(object=>object.destroy());
  };
  const finish=()=>{
   if(!active||continuation!==undefined)return;
   // Phaser may still call HUD.update after a timer or input callback in the same frame.
   continuation=window.setTimeout(()=>{
    if(!active||!this.scene.isActive()||!battle.scene.isActive()||battle.simulation!==simulation)return;
    clean();
    proceed();
   },0);
  };
  try{
   objects.push(this.add.rectangle(480,270,960,540,0x071d25).setDepth(2100).setInteractive());
   objects.push(this.text(480,188,'INTERSTITIAL AD — DEV MOCK',24,WHITE,true).setOrigin(.5).setDepth(2101));
   const countdown=this.text(480,254,'Continuing in 3s',18,WHITE).setOrigin(.5).setDepth(2101);
   objects.push(countdown);
   const skip=this.add.rectangle(480,329,180,70,0x265460).setStrokeStyle(2,GOLD).setDepth(2101).setInteractive({useHandCursor:true});
   objects.push(skip,this.text(480,329,'SKIP',16,WHITE,true).setOrigin(.5).setDepth(2102));
   this.resultButton(skip,finish);
   let remaining=3;
   timer=this.time.addEvent({delay:1000,repeat:2,callback:()=>{
    remaining--;
    if(remaining===0)finish();
    else countdown.setText(`Continuing in ${remaining}s`);
   }});
   this.events.once('shutdown',clean);
   this.interstitialOpen=true;
   return true;
  }catch{
   clean();
   return false;
  }
 }
 private leaveBattle(destination:'CampaignSelect'|'MainMenu'|'ChapterSelect'|'MissionBriefing',briefing?:MissionNavigation){
  const battle=this.scene.get('Battle') as Battle;if(this.restarting||this.interstitialOpen)return;
  const route=destination==='CampaignSelect'&&battle.launch.mode==='campaign'?battle.launch.returnTo:undefined;
  const data=destination==='MissionBriefing'?briefing:route?.scene==='CampaignSelect'?route.data:undefined;
  this.restarting=true;battle.simulation.beginRestart();this.game.events.emit('clear-controls');battle.tweens.timeScale=1;this.game.scene.stop('Battle');this.game.scene.stop('HUD');this.game.scene.start(route?.scene??destination,data);window.visualReady=false;
 }
 private campaignReturnLabel(){const launch=(this.scene.get('Battle') as Battle).launch;return launch.mode==='campaign'&&launch.returnTo?.scene==='ChapterSelect'?t('battleChapterSelect'):t('battleMissions');}
 private resultLevelHeading='';
 private showResults(){
  const battle=this.scene.get('Battle') as Battle,sim=battle.simulation,r=sim.state.match.result;if(!r)return;this.observeMission(true);
  this.closeShop();this.closeTavern();this.closeSkills();this.closeUtility();this.overlay.setVisible(false);this.paused=true;this.game.events.emit('pause-visual',true);this.resultPress.clear();this.results.setVisible(true);
  this.resultTitle.setText(r.outcome==='victory'?t('battleVictory'):t('battleDefeat'));this.resultVictory=r.outcome==='victory';this.resultTitle.setColor(resultTone(this.resultVictory).text);
  const seconds=Math.floor(r.tick/30),level=battle.campaignLevel,time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  const progress=this.missionView?.rows.map(({label,progress,target,complete})=>t(complete?'battleObjectiveDone':'battleObjectivePending',{label,progress,target})).join('\n');
  if(!level)this.resultDetail.setText([t(r.outcome==='victory'?'battleQuickWin':'battleQuickLoss'),t('battleQuickStats',{time,kills:r.kills}),t('battleKeepHp',{name:t('battleAzure'),hp:Math.ceil(r.alliedHp),max:3000}),t('battleKeepHp',{name:t('battleCrimson'),hp:Math.ceil(r.enemyHp),max:3000})].join('\n'));
  if(!level){const sc=this.game.canvas.getBoundingClientRect().height/540;drawResultAccent(this.resultAccent,{x:140,y:96,width:680,height:350},this.resultVictory,{y:144,halfWidth:this.resultTitle.width/2},sc);}
  if(level){
   this.resultLevelHeading=isSequential(level)?battleMissionHeading(level):t('battleFullBattle');
   const pr=battle.progressResult,next=pr?.next,unlock=pr?.recorded?(!pr.firstClear?t('battleMissionComplete'):next?t('battleMissionUnlocked',{mission:t('battleMissionNumber',{chapter:chapterOf(next.number),mission:missionOf(next.number)})}):t('battleAllComplete')):'';
   this.resultDetail.setText([battleOutcome(sim.outcome?.reason),unlock].filter(Boolean).join('\n'));
   this.campaignResultStats.setText(t('battleTimeStats',{time,kills:r.kills}));
   const red=sim.state.bases['red-base'];this.campaignResultProgress.setText(progress||t('battleKeepDamage',{damage:Math.ceil(red.maxHp-red.hp),max:red.maxHp}));
   this.campaignResultProgress.setColor(r.outcome==='victory'?'#8cebd1':WHITE);
   const won=r.outcome==='victory'&&isSequential(level),target=won?victoryTarget(campaign.list(),campaignProgress.progress,level.id):null,onward=target&&target.kind!=='campaign-complete'?target:null;
   this.resultTarget=target;this.resultNext=onward?.levelId??null;this.resultFinal=won&&!onward;
   (this.nextHit!.getData('label') as Phaser.GameObjects.Text).setText(onward?.kind==='next-chapter'?t('battleNextChapter'):t('battleNextMission'));
   (this.chapterHit!.getData('label') as Phaser.GameObjects.Text).setText(target?.kind==='campaign-complete'?t('battleCampaignComplete'):t('battleBackChapters'));
   (this.restartHit!.getData('label') as Phaser.GameObjects.Text).setText(won?t('replay'):t('battleRetry'));this.layoutCampaignResults();
  }
  this.abilities.forEach(a=>a.setDisabled(true));this.utilities.forEach(a=>a.setDisabled(true));this.toast.setVisible(false);
 }
 private showCombatNotice(message:string,duration=2500,priority=1,identity=message){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  if(this.paused||this.restarting||sim.ended)return;
  this.clearTeaching();
  // Even deduplicated direct feedback must take precedence over optional teaching.
  this.teachingBlockedUntil=Math.max(this.teachingBlockedUntil,this.elapsed+duration);
  if(!this.combatSlot.offer(message,this.elapsed,priority,duration,identity))return;
  this.combatNoticePriority=priority;this.combatNotice.setText(message).setVisible(true);this.combatNoticeUntil=this.elapsed+duration;
 }
 private castNotice(reason:string){
  const message=castRejection(reason);if(!message)return false;this.showCombatNotice(message,2500,2);return true;
 }
 private tell(message:string,priority=1,duration:number=defenseFeedbackTiming.notice,identity=message){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  if(this.paused||this.restarting||sim.ended||!this.generalSlot.offer(message,this.elapsed,priority,duration,identity))return false;
  this.teaching=undefined;this.toast.setText(message).setVisible(true);this.toastUntil=this.elapsed+duration;return true;
 }
 private defenseNoticeText(){const base=(this.scene.get('Battle') as Battle).simulation.state.bases['blue-base'];return `${t('battleThreatAttack')}\n${t('battleHpRange',{hp:Math.ceil(base.hp),max:base.maxHp})}`;}
 private clearTeaching(){if(this.teaching){this.toast.setVisible(false);this.generalSlot.clear();}this.teaching=undefined;}
 private observeGuidance(){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  this.contextualGuidance.sync(sim.state,this.elapsed);
  const blocked=this.paused||this.restarting||sim.ended||this.shop.visible||this.tavern.visible||this.skillPanel.visible||this.utilityPanel.visible||this.combatSlot.active(this.elapsed)||this.elapsed<this.teachingBlockedUntil;
  if(this.teaching&&(blocked||this.elapsed>=this.toastUntil||!this.contextualGuidance.valid(sim.geo,this.teaching,sim.state,sim.clock.tick,this.elapsed)))this.clearTeaching();
  if(blocked||this.generalSlot.active(this.elapsed))return;
  const key=this.contextualGuidance.next(sim.geo,sim.state,sim.clock.tick,this.elapsed);
  // The persistent campaign panel supplies the level's actual goal; the legacy orientation only applies to Quick Play.
  if(key==='orientation'&&(this.scene.get('Battle') as Battle).campaignLevel){this.contextualGuidance.shown(key,this.elapsed);if(sim.setup.tavern&&!Object.values(sim.state.structures).some(b=>b.tavern))this.tell(t('battleTavernHint'),1,6000);return;} // Chapter 5 M1: the one Tavern hint
  if(key&&this.tell(t(guidanceLabels[key]),0,guidanceRules.duration,key)){this.teaching=key;this.contextualGuidance.shown(key,this.elapsed);}
 }
 private clearNotifications(){
  this.generalSlot.reset();this.combatSlot.reset();this.toast.setVisible(false);this.combatNotice.setVisible(false);
  this.defenseFeedback.clear();this.azureAccent.clear();this.unitDots.get('blue-base')?.setStrokeStyle();
  this.teaching=undefined;this.teachingBlockedUntil=0;this.contextualGuidance.clearTransient();
 }
 update(_time:number,delta:number){
  if(!this.paused)this.elapsed+=Math.min(delta,100);
  if(this.perf){this.perfMax=Math.max(this.perfMax,delta);this.perfSum+=delta;this.perfN++;if(_time>=this.perfAt){this.perfAt=_time+1000;const fps=Math.round(this.game.loop.actualFps),units=Object.values((this.scene.get('Battle') as Battle).simulation.state.units).filter(u=>u.hp>0).length;this.perf.setText(`${fps} FPS · ${(this.perfSum/Math.max(1,this.perfN)).toFixed(1)} ms (max ${Math.round(this.perfMax)}) · ${units} units`).setColor(fps>=55?'#7dffa0':fps>=40?'#ffe066':'#ff7a6b');this.perfMax=this.perfSum=this.perfN=0;}}
  const impact=!this.paused&&this.elapsed<this.impactUntil;
  this.hpBar.setFillStyle(impact?0xffaa91:0x68d8ad);this.hpText.setColor(impact?'#ffc1a7':WHITE);
 }
 private observeSimulation(){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  if(import.meta.env.DEV&&this.respawnNow){
   const visible=canRequestGuardianRespawn(sim)&&this.heroInteractive()&&!this.utilityPanel.visible;
   this.respawnNow.hit.setVisible(visible).input!.enabled=visible;
   this.respawnNow.label.setVisible(visible);
  }
  this.abilities.forEach(a=>{
   const rank=sim.state.heroProgression.ranks[a.id as GuardianSkill],casting=!!sim.state.skills.cast||sim.clock.tick<sim.state.skills.lockTick;
   const blocked=this.paused||this.shop.visible||this.tavern.visible||sim.hero.hp<=0||this.utilityMode==='Build'&&this.utilityPanel.visible||this.skillPanel.visible||!rank||casting||stunned(sim.hero,sim.clock.tick);
   const reason=this.paused?(sim.ended?'ENDED':'PAUSED'):sim.hero.hp<=0?'DEAD':casting?'CAST':stunned(sim.hero,sim.clock.tick)?'STUN':!rank?(a.id==='zone'&&sim.state.heroProgression.level<6?'LV6':'Learn'):'MENU';
   a.setDisabled(blocked,reason);a.duration=sim.cooldownInterval(a.id as GuardianSkill)/30;a.observe(sim.remaining(a.id));});this.hpBar.setDisplaySize(this.guardianLayout.body.width*sim.hero.hp/sim.hero.maxHp,8/(this.game.canvas.getBoundingClientRect().height/540));this.hpText.setText(sim.hero.hp>0?`${Math.ceil(sim.hero.hp)} / ${sim.hero.maxHp}`:t('battleRevive',{seconds:Math.max(0,Math.ceil(((sim.hero.respawnTick??sim.clock.tick)-sim.clock.tick)/30))}));this.goldText.setText(`${Math.floor(sim.state.gold)}`);this.woodText.setText(`${Math.floor(sim.state.wood)}`);this.ironText.setText(`${Math.floor(sim.state.iron)}`);
  this.buildPanel.render();
  this.defenseFeedback.sync(sim.state,sim.clock.tick);this.drawKeepPlate();
  {const e=sim.state.encounter,sec=Math.floor(sim.clock.tick/30),threat=azureThreatStatus(sim.state,sim.clock.tick);if(!this.compactObjective){this.objectiveLine=t(sim.state.spawnedWaves>e.waveCount?'battleWaveEndless':'battleWave',{wave:sim.state.spawnedWaves,total:e.waveCount});this.objectiveColor=MUTED;}this.showObjective(threat?t(threat==='Azure Keep under attack'?'battleThreatAttack':'battleThreatNear'):'');this.timerText.setText(`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`);}
  const progression=sim.state.heroProgression,next=nextLevelXp(progression.level);
  this.levelText.setText(t('battleLevel',{level:progression.level}));this.xpText.setText('XP');this.xpBar.setDisplaySize(this.guardianLayout.body.xpBarWidth*(next?progression.xp/next:1),3/(this.game.canvas.getBoundingClientRect().height/540));this.skillProgress.setText(`LV ${progression.level} · ${next?`XP ${progression.xp} / ${next}`:'XP MAX'} · Combat continues while this panel is open.`);
  this.skillOpenLabel.setText(progression.skillPoints?`+${progression.skillPoints}`:'0');this.skillOpen.setFillStyle(progression.skillPoints?0x265460:0x172f38);
  this.skills.render();this.skillFrame=this.skills.bounds;
  const defenseAccent=!this.paused&&!sim.ended&&this.defenseFeedback.accentUntil>this.elapsed;
  const accentAlpha=Math.max(0,(this.defenseFeedback.accentUntil-this.elapsed)/defenseFeedbackTiming.accent);
  this.azureAccent.clear();if(defenseAccent){const m=this.guardianLayout.match,scale=this.game.canvas.getBoundingClientRect().height/540;this.azureAccent.lineStyle(2/scale,0xffd39b,accentAlpha).strokeRoundedRect(m.x,m.y,m.width,m.height,8/scale);}
  if(this.selectedId){const u=sim.state.units[this.selectedId]??sim.state.structures[this.selectedId]??sim.state.bases[this.selectedId];if(u)this.inspector.setText(`${battleName(u.kind.startsWith('base')?(u.team==='blue'?'Azure Keep':'Crimson Keep'):u.kind==='guardian'?'Guardian':u.kind==='wall'?(u.team==='red'?(isBarracks(u)?'Crimson Barracks':isThroneGate(sim.field.id,u.id)?throneGateName:'Frost Gate'):'Wooden Wall'):u.kind==='tower'?'Archer Tower':u.team==='blue'?'Azure Vanguard':'Crimson Raider')}\n${t('battleHpRange',{hp:Math.ceil(u.hp),max:u.maxHp})}`);else if(this.selectedId.startsWith('red-')||this.selectedId.startsWith('blue-')||this.selectedId.startsWith('built-'))this.inspector.setText(t(this.selectedId.startsWith('built-')||this.selectedId.startsWith('red-barracks')?'battleStructureLost':'battleMinionLost'));}
  for(const u of Object.values({...sim.state.units,...sim.state.structures,...sim.state.bases})){if(u.kind==='guardian'||(u.id==='red-base'&&sim.setup.crimsonKeepScenery))continue; // a scenery Keep has no minimap marker
  let dot=this.unitDots.get(u.id);if(!dot){dot=this.add.circle(0,0,u.kind.startsWith('base')?4:1.8,u.team==='blue'?0x83deff:0xff7878);this.unitDots.set(u.id,dot);}dot.setVisible(u.hp>0).setPosition(this.mapFrame.x+u.x/WORLD.width*this.mapFrame.width,this.mapFrame.y+u.y/WORLD.height*this.mapFrame.height);}
  for(const [id,dot] of this.unitDots)if(!sim.state.units[id]&&!sim.state.structures[id]&&!sim.state.bases[id]){dot.destroy();this.unitDots.delete(id);}if(this.combatNotice.visible&&this.elapsed>this.combatNoticeUntil)this.combatNotice.setVisible(false);if(this.toast.visible&&this.elapsed>this.toastUntil)this.toast.setVisible(false);
  const azureDot=this.unitDots.get('blue-base'),scale=this.game.canvas.getBoundingClientRect().height/540;
  if(defenseAccent)azureDot?.setStrokeStyle(2/scale,0xffd39b,accentAlpha);else azureDot?.setStrokeStyle();
  if(this.generalSlot.isCurrent('azure-defense')){
   if(this.paused||this.restarting||sim.ended||this.elapsed>=this.toastUntil||azureThreatStatus(sim.state,sim.clock.tick)!=='Azure Keep under attack'){this.generalSlot.clearIdentity('azure-defense');this.toast.setVisible(false);}
   else {const message=this.defenseNoticeText();if(this.generalSlot.update('azure-defense',message,this.elapsed))this.toast.setText(message);}
  }
  const battle=this.scene.get('Battle') as Battle,f=this.mapFrame,h=battle.hero,c=battle.getCameraWorld();this.mapHero.setPosition(f.x+h.x/WORLD.width*f.width,f.y+h.y/WORLD.height*f.height);for(const [i,m] of this.mapPosts.entries()){const mine=battle.simulation.postStates[i]?.owner==='azure';m.setFillStyle(mine?0x70d7ff:0xff7878,.35).setStrokeStyle(1.5,mine?0x70d7ff:0xff7878,.95);}
  const vx=Math.max(0,c.x),vy=Math.max(0,c.y),vw=Math.min(WORLD.width,c.x+c.width)-vx,vh=Math.min(WORLD.height,c.y+c.height)-vy;this.mapViewport.clear().lineStyle(1,0xffe8b4,.9).strokeRect(f.x+vx/WORLD.width*f.width,f.y+vy/WORLD.height*f.height,Math.max(0,vw)/WORLD.width*f.width,Math.max(0,vh)/WORLD.height*f.height);
   this.shop.render();this.tavern.render();this.observeMission();this.observeMissionPopup();const fnotice=this.controls.feedback;
  if(this.shop.visible||this.utilityPanel.visible&&this.utilityMode==='Build')wrapLocalizedText(this.toast.setPosition(fnotice.x,this.shopHudBottom+16/scale),wrapWidth(180/scale));
  else if(battle.campaignLevel){
   const f=this.missionBounds.width?this.missionBounds:this.guardianLayout.match,width=Math.max(f.width-28/scale,(currentLocale()==='en'?0:135)/scale);
   wrapLocalizedText(this.toast.setPosition(f.x+f.width/2,f.y+f.height+(currentLocale()==='en'?18:5)/scale),wrapWidth(width));
  }else wrapLocalizedText(this.toast.setPosition(300,235),wrapWidth(300));
  this.observeGuidance();
  this.renderHeroBar();
 }
}

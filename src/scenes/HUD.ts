import {drawResultAccent,drawResultRule,resultTone} from '../ui/resultAccent';
import {waveLabel} from '../data/encounters';
import Phaser from 'phaser';
import { terrain, WORLD, type VisualEntity } from '../world/layout';
import {battlefieldArt,visibleRect} from '../world/battlefieldArt';
import { Battle } from './Battle';
import { AbilityButton } from '../ui/AbilityButton';
import { UtilityButton } from '../ui/UtilityButton';
import {ShopPanel} from '../ui/ShopPanel';
import {BuildPanel} from '../ui/BuildPanel';
import {SkillsPanel} from '../ui/SkillsPanel';
import {compactControlFrame,drawDivider,drawFantasyButton,drawFantasyPanel,FANTASY_TEXT,UI_FONT} from '../ui/fantasyTheme';
import {preloadShopItemIcons} from '../ui/ShopItemIcon';
import {guardianRanks} from '../data/guardian';
import {stunned} from '../simulation/Statuses';
import { guardianStats } from '../data/combat';
import type {GameEvent} from '../simulation/GameState';
import { controlLayout } from '../ui/controlLayout';
import {topHudLayout} from '../ui/topHudLayout';
import {damageFeedbackTiming} from '../ui/damageFeedback';
import {DefenseFeedback,azureThreatStatus,defenseFeedbackTiming} from '../ui/defenseFeedback';
import {NoticeSlot} from '../ui/noticeSlot';
import {azureKeepHudColors,azureKeepHudLayout,azureKeepHudState} from '../ui/azureKeepHud';
import {ContextGuidance,guidanceMessages,guidanceRules,type GuidanceKey} from '../ui/contextGuidance';
import {nextLevelXp,upgradeRules,type GuardianUpgrade,type GuardianSkill} from '../data/progression';
import {missionPanelView,outcomeReason,type MissionPanelView} from '../data/campaignUi';
import {isSequential,specialModeHeading} from '../data/campaignProgress';
import {missionLabel} from '../data/campaign';
import {campaign} from '../data/campaignLevels';
import {nextPlayableMission} from '../data/campaignNavigation';
import {campaignProgress} from '../data/campaignProgressStore';
import {isBarracks} from '../world/frostGateAppearance';
const INK=0x122d35,GOLD=0xdcbf7a,WHITE='#fff3d3',MUTED='#b5d0ce';
export class HUD extends Phaser.Scene {
 public paused=false;
 public shop!:ShopPanel;
 public buildPanel!:BuildPanel;
 private utilityPreview!:Phaser.GameObjects.Container;
 public abilities:AbilityButton[]=[];
 public utilities:UtilityButton[]=[];
 public pauseButton!:UtilityButton;
 public mapHero!:Phaser.GameObjects.Arc;
 public mapViewport!:Phaser.GameObjects.Graphics;
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
 private woodText!:Phaser.GameObjects.Text;
 private ironText!:Phaser.GameObjects.Text;
 private buildControls!:Phaser.GameObjects.Container;
 private buildReason!:Phaser.GameObjects.Text;
 private buildLabels:Phaser.GameObjects.Text[]=[];
 private buildKind?:'wall'|'tower';
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
 private impactUntil=0;
 private defenseFeedback=new DefenseFeedback();
 private generalSlot=new NoticeSlot();
 private combatSlot=new NoticeSlot();
 private azureAccent!:Phaser.GameObjects.Graphics;
 private contextualGuidance=new ContextGuidance();
 private teaching?:GuidanceKey;
 private teachingBlockedUntil=0;
 private attackWasEnabled=false;
 private guidancePending=false;
 private guidanceShown=false;
 private elapsed=0;
 private overlay!:Phaser.GameObjects.Container;
 private pauseArt!:Phaser.GameObjects.Graphics;private pauseResumeArt!:Phaser.GameObjects.Graphics;
 private pauseTitle!:Phaser.GameObjects.Text;private pauseSub!:Phaser.GameObjects.Text;private pauseLabel!:Phaser.GameObjects.Text;
 private pauseResume!:Phaser.GameObjects.Rectangle;
 public pauseButtons:Array<{id:string;art:Phaser.GameObjects.Graphics;hit:Phaser.GameObjects.Rectangle;label:Phaser.GameObjects.Text}>=[];
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
 private attackLabel!:Phaser.GameObjects.Text;
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
 public campaignResultBounds={x:0,y:0,width:0,height:0};
 private restartHit?:Phaser.GameObjects.Rectangle;
 public levelSelectHit?:Phaser.GameObjects.Rectangle;
 public nextHit?:Phaser.GameObjects.Rectangle;
 public chapterHit?:Phaser.GameObjects.Rectangle;
 private resultNext:string|null=null;private resultFinal=false;
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
 preload(){for(const key of ['bash','taunt','charge','zone','attack'])this.load.image(`ability-${key}`,`${import.meta.env.BASE_URL}assets/ability-${key}.png`);for(const key of ['gold','wood','iron','build','shop','army'])this.load.image(`hud-${key}`,`${import.meta.env.BASE_URL}assets/hud-${key}.png`);preloadShopItemIcons(this);}
 private text(x:number,y:number,value:string,size=12,color=WHITE,bold=false){return this.add.text(x,y,value,{fontFamily:'Arial, sans-serif',fontSize:`${size}px`,color,fontStyle:bold?'bold':'normal'});}
 private panel(x:number,y:number,w:number,h:number){const g=this.add.graphics();g.fillStyle(0x06191e,.24).fillRoundedRect(x+1,y+3,w,h,16);g.fillStyle(INK,.93).fillRoundedRect(x,y,w,h,16);g.lineStyle(1,GOLD,.6).strokeRoundedRect(x,y,w,h,16);return g;}
 create(){
  this.restartHit=undefined;this.levelSelectHit=undefined;this.mainMenuHit=undefined;this.nextHit=undefined;this.chapterHit=undefined;this.resultNext=null;this.resultFinal=false;this.restarting=false;this.missionRows=[];this.missionView=undefined;this.lastMissionTick=-Infinity;this.missionSignature='';this.missionPopupSignature='';this.missionCollapsed=false;
  this.topPanels=[];this.resourceArt=[];this.skillButtons=[];this.guidancePending=false;this.guidanceShown=false;this.combatNoticeUntil=0;this.combatNoticePriority=0;this.impactUntil=0;
  this.defenseFeedback.clear(true);this.generalSlot.reset();this.combatSlot.reset();
  this.contextualGuidance.reset();this.teaching=undefined;this.teachingBlockedUntil=0;this.attackWasEnabled=false;
  this.stickPointer=null;this.selectedId=undefined;this.paused=false;this.abilities=[];this.utilities=[];this.unitDots.clear();this.buildHits=[];this.buildLabels=[];this.buildKind=undefined;this.utilityMode="";this.elapsed=0;this.gridShown=false;
  this.minimap();
  this.keepPlate=this.add.graphics();this.keepLabel=this.text(0,0,'AZURE KEEP',11,'#a5edff',true);this.keepHpText=this.text(0,0,'',12,WHITE,true).setOrigin(1,0);
  this.keepTrack=this.add.rectangle(0,0,1,5,0x071f26).setOrigin(0,.5);this.keepBar=this.add.rectangle(0,0,1,5,0x70d7ff).setOrigin(0,.5);
  this.guardianPlate=this.add.graphics();this.guardianRim=this.add.circle(32,40,18,0x24516a).setStrokeStyle(1,GOLD);this.guardianPortrait=this.add.image(32,58,'guardian').setOrigin(.5,1);
  this.heroHit=this.add.circle(32,40,24,0,0).setInteractive({hitArea:new Phaser.Geom.Circle(24,24,24),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.game.events.emit('reset-view');});
  this.levelText=this.text(60,12,'LV 1',14,'#f4d58e',true);
  this.hpText=this.text(60,28,'',14,WHITE,true);this.hpTrack=this.add.rectangle(60,49,112,8,0x071f26).setOrigin(0,.5);this.hpBar=this.add.rectangle(60,49,112,8,0x68d8ad).setOrigin(0,.5);
  this.xpTrack=this.add.rectangle(84,61,88,3,0x395d6e).setOrigin(0,.5);this.xpBar=this.add.rectangle(84,61,0,3,0x9dd5ff).setOrigin(0,.5);this.xpText=this.text(60,54,'XP',12,MUTED);
  this.skillOpen=this.add.rectangle(208,40,48,48,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.openSkills();});
  this.skillOpenLabel=this.text(208,22,'+1',18,WHITE,true).setOrigin(.5,0);
  this.skillEntryCaption=this.text(208,44,'Skills',12,WHITE,true).setOrigin(.5,0);
  const battle=this.scene.get('Battle') as Battle;
  this.matchPlate=this.add.graphics();this.objectiveText=this.text(320,20,battle.campaignLevel?.display.title??'Destroy Crimson Keep',14,WHITE,true);
  this.waveText=this.text(320,34,'',12,MUTED);this.timerText=this.text(552,34,'',12,MUTED).setOrigin(1,0);
  this.azureAccent=this.add.graphics();
  [['gold','250'],['wood','180'],['iron','30']].forEach(([icon,value],i)=>{
   const art=this.add.image(332+i*110,61,`hud-${icon}`);this.resourceArt.push(art);
   const text=this.text(351+i*110,54,value,12,icon==='gold'?WHITE:MUTED);if(icon==='gold')this.goldText=text;if(icon==='wood')this.woodText=text;if(icon==='iron')this.ironText=text;
  });
  this.pauseButton=new UtilityButton(this,'pause',745,46,24,()=>this.setPause(!this.paused),34);
  this.joystick();
  ['build','shop','army'].forEach(id=>this.utilities.push(new UtilityButton(this,id,0,0,23.45,()=>id==='shop'?this.openShop():this.showUtility(id[0].toUpperCase()+id.slice(1)),23.45,(this.scene.get('Battle') as Battle).simulation.setup.shop)));
  const definitions=[['bash',0,0,33.5,3.2,'Shield Bash'],['taunt',0,0,33.5,4.2,'Lion’s Challenge'],['charge',0,0,33.5,2.8,'Vanguard Charge'],['zone',0,0,35.5,6,'Guardian Sanctuary'],['attack',0,0,53,.75,'Attack'] ] as const;
  definitions.forEach(([id,x,y,r])=>this.abilities.push(new AbilityButton(this,id,x,y,r,id==='attack'?guardianStats.cooldownTicks/30:guardianRanks[id].cooldown[0]/30,(gesture)=>{this.game.events.emit('cast',id,gesture);},id==='attack'?undefined:(p,dragged,start)=>this.game.events.emit('skill-aim',id,p?{x:p.x,y:p.y}:undefined,dragged,start))));
  this.attackLabel=this.text(0,0,'Attack',16,WHITE,true).setOrigin(.5,0).setBackgroundColor('#122d35ee').setPadding(3,1);
  this.scale.on('resize',this.layoutControls,this);
  this.events.once('shutdown',()=>this.scale.off('resize',this.layoutControls,this));
  this.inspector=this.text(948,113,'',11,WHITE,true).setOrigin(1,0).setShadow(0,1,'#183c33',3);
  this.toast=this.text(300,235,'',12,WHITE).setOrigin(.5).setBackgroundColor('#173842d9').setPadding(12,7).setWordWrapWidth(300).setVisible(false);
  this.combatNotice=this.text(755,177,'',18,WHITE,true).setOrigin(.5).setBackgroundColor('#122d35ee').setPadding(8,6).setWordWrapWidth(270).setVisible(false);
  this.createUtilityPanel();this.createSkills();this.shop=new ShopPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,()=>this.closeShop());this.createMissionPanel();this.createPause();this.createResults();this.restarting=false;
  this.layoutControls();
  this.listen('inspect',(e:VisualEntity)=>{this.selectedId=e.id;this.inspector.setText(`${e.name}\n${e.hp} HP`);this.tell(`${e.name} · ${'columns'in e.footprint?`${e.footprint.columns} × ${e.footprint.rows} cells`:`${e.footprint.radius}-unit radius`}`);});
  // Observe after every scene has updated so HUD values match the rendered authoritative tick.
  this.listen(Phaser.Core.Events.POST_STEP,()=>this.observeSimulation());
  this.listen('request-pause',()=>this.setPause(true));
  this.input.keyboard?.on('keydown-SPACE',()=>this.setPause(!this.paused));
  // Chapter 3 C3-1: a Frost Gate falling opens the fortress to both sides, so say so.
  // Chapter 3 C3-2: a Barracks falling stops its own reinforcements (the Simulation drops its spawns); the other Barracks carry on.
  this.listen('simulation-event',(e:{type:string;id?:string})=>{if(e.type==='death'&&(this.scene.get('Battle') as Battle).simulation.setup.barracks?.some(b=>b.id===e.id))this.tell(`${e.id==='red-barracks-court'?'The Courtyard':e.id==='red-barracks-north'?'The North':'The South'} Barracks has fallen · its reinforcements have stopped`);});
  this.listen('simulation-event',(e:{type:string;id?:string})=>{if(e.type==='death'&&(this.scene.get('Battle') as Battle).simulation.setup.gates?.some(g=>g.id===e.id))this.tell('The Frost Gate has fallen · the fortress is open'+((this.scene.get('Battle') as Battle).simulation.setup.garrison?' · the garrison rallies':''));});
  this.listen('simulation-event',(e:{type:string;index?:number;flank?:{lane:string;units:string};lanes?:{north:number;south:number}})=>{if(e.type==='wave')this.tell(`Enemy wave ${e.index}${e.lanes?` · Enemies attack both banks (${e.lanes.north} north · ${e.lanes.south} south)`:e.flank?` · ${e.flank.units==='raiders'?'Raiders flank':'Enemies flank'} the ${e.flank.lane} bank`:''}`);});
  this.listen('simulation-event',(e:{type:string})=>{if(e.type==='match-end')this.showResults();});
  this.listen('simulation-event',(e:{type:string;reason?:string;skill?:GuardianUpgrade;rank?:number;id?:string;requestId?:string})=>{if(e.requestId?.startsWith('shop-ui-'))return;if(e.type==='skill-upgraded'){this.skillStatus.setText(`${upgradeRules[e.skill!].name} rank ${e.rank} learned`);if(e.skill!=='fortitude'&&!this.guidanceShown)this.guidancePending=true;}if(e.type==='rejected'){if(this.skillPanel.visible)this.skillStatus.setText(e.reason??'Rejected');else if(!this.castNotice(e.reason??'Rejected'))this.tell(e.reason??'Rejected');}if(e.type==='death'&&e.id==='guardian')this.closeSkills();});
  this.listen('cast-feedback',(message:string)=>{if(!this.castNotice(message))this.showCombatNotice(message,2500,2);});
  this.listen('tower-danger',()=>{if(!this.paused&&(this.scene.get('Battle') as Battle).hero.hp>0)this.showCombatNotice('Tower attacking you',2500,0);});
  this.listen('guardian-impact',()=>{if(!this.paused)this.impactUntil=this.elapsed+damageFeedbackTiming.impact;});
  this.listen('guardian-feedback-clear',()=>{this.impactUntil=0;this.hpBar.setFillStyle(0x68d8ad);this.hpText.setColor(WHITE);if(this.combatNotice.text==='Tower attacking you')this.combatNotice.setVisible(false);});
  this.listen('simulation-event',(e:{type:string;skill?:GuardianSkill})=>{if(e.type==='cast-accepted')this.showCombatNotice(`${upgradeRules[e.skill!].name} cast`);});
  this.listen('simulation-event',(e:GameEvent)=>{
   this.shop.model.observe(e);
   if(e.type==='death'&&e.id==='guardian'&&this.shop.model.pending){this.shop.model.cancel();this.shop.model.message='Request canceled · you can trade while down.';}
   const sim=(this.scene.get('Battle') as Battle).simulation;
   this.contextualGuidance.observe(e,sim.state,this.elapsed);
   if(!this.paused&&!this.restarting&&this.defenseFeedback.observe(e,sim.state,sim.clock.tick,this.elapsed))this.tell(this.defenseNoticeText(),2,defenseFeedbackTiming.notice,'azure-defense');
  });
  this.listen('pause-visual',(paused:boolean)=>{if(paused)this.clearNotifications();});
  this.events.once('shutdown',()=>{this.clearNotifications();this.shop.hide();this.cleanup.splice(0).forEach(f=>f());});
  this.observeMission(true);
  if(innerHeight>innerWidth)this.setPause(true);
 }
 private listen(event:string,fn:(...args:any[])=>void){this.game.events.on(event,fn);this.cleanup.push(()=>this.game.events.off(event,fn));}
 private dom(event:string,fn:()=>void){window.addEventListener(event,fn);this.cleanup.push(()=>window.removeEventListener(event,fn));}
 private layoutControls(){
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.controls=controlLayout(scale);
  this.controls.abilities.forEach((p,i)=>this.abilities[i].setLayout(p.x,p.y,p.radius));
  this.controls.utilities.forEach((p,i)=>this.utilities[i].setLayout(p.x,p.y,p.radius,p.hitRadius,scale));
  if(this.restartHit){this.restartHit.setDisplaySize(200,Math.max(70,Math.ceil(48/scale)));this.restartHit.setSize(200,Math.max(70,Math.ceil(48/scale)));}
  this.pauseButton.setLayout(745,46,24/scale,24/scale,scale);
  this.guardianLayout=topHudLayout(scale,(this.pauseButton.x-this.pauseButton.hitRadius)*scale);const fguardian=this.guardianLayout,p=fguardian.guardian,portrait=fguardian.portrait,entry=fguardian.skills,body=fguardian.body;
  this.guardianPlate.clear().fillStyle(INK,.88).fillRoundedRect(p.x,p.y,p.width,p.height,8/scale).lineStyle(1/scale,GOLD,.65).strokeRoundedRect(p.x,p.y,p.width,p.height,8/scale);
  this.guardianRim.setPosition(portrait.x,portrait.y).setRadius(portrait.radius).setStrokeStyle(1/scale,GOLD);
  this.guardianPortrait.setPosition(portrait.x,portrait.y+portrait.radius).setDisplaySize(36/scale,32/scale);
  this.heroHit.setPosition(portrait.x,portrait.y).setRadius(portrait.hitRadius);(this.heroHit.input!.hitArea as Phaser.Geom.Circle).setTo(portrait.hitRadius,portrait.hitRadius,portrait.hitRadius);
  this.levelText.setPosition(body.x,body.levelY).setFontSize(14/scale);this.hpText.setPosition(body.x,body.hpY).setFontSize(14/scale);
  this.hpTrack.setPosition(body.x,body.hpBarY).setSize(body.width,8/scale).setDisplaySize(body.width,8/scale);this.hpBar.setPosition(body.x,body.hpBarY).setSize(body.width,8/scale).setDisplaySize(body.width,8/scale);
  this.xpText.setPosition(body.x,body.xpY).setFontSize(12/scale);this.xpTrack.setPosition(body.xpBarX,body.xpBarY).setSize(body.xpBarWidth,3/scale).setDisplaySize(body.xpBarWidth,3/scale);this.xpBar.setPosition(body.xpBarX,body.xpBarY).setSize(body.xpBarWidth,3/scale).setDisplaySize(body.xpBarWidth,3/scale);
  this.skillOpen.setPosition(entry.x,entry.y).setSize(entry.width,entry.height).setDisplaySize(entry.width,entry.height);this.skillOpenLabel.setPosition(entry.x,22/scale).setFontSize(18/scale);this.skillEntryCaption.setPosition(entry.x,44/scale).setFontSize(12/scale);
  for(const {hit} of this.skillButtons)hit.setDisplaySize(90,Math.max(68,Math.ceil(48/scale))).setSize(90,Math.max(68,Math.ceil(48/scale)));
  if(this.skillClose)this.skillClose.setDisplaySize(200,Math.max(70,Math.ceil(48/scale))).setSize(200,Math.max(70,Math.ceil(48/scale)));
  this.attackLabel.setPosition(this.controls.attackLabel.x,this.controls.attackLabel.y).setFontSize(Math.ceil(12/scale)).setPadding(3/scale,1/scale);
  const j=this.controls.joystick;this.joystickArt.setPosition(j.x,j.y).setScale(j.radius/61);this.joystickHit.setPosition(j.x,j.y).setRadius(j.radius);
  (this.joystickHit.input!.hitArea as Phaser.Geom.Circle).setTo(j.radius,j.radius,j.radius);this.knob.setPosition(j.x,j.y);
  const f=this.controls.feedback;this.combatNotice.setPosition(f.x,f.y).setFontSize(Math.ceil(14/scale)).setWordWrapWidth(f.width).setPadding(6/scale,3/scale);
  this.toast.setFontSize(Math.ceil(12/scale)).setPadding(8/scale,4/scale);
  const m=fguardian.match;this.topPanels=[new Phaser.Geom.Rectangle(m.x,m.y,m.width,m.height)];
  // The plate is a local obstruction (like the Shop), not part of the full-width HUD clearance, so world Keep bars elsewhere are unaffected.
  const k=this.keepLayout=azureKeepHudLayout(scale,this.mapFrame);
  this.keepLabel.setPosition(k.label.x,k.label.y).setFontSize(k.label.size);this.keepHpText.setPosition(k.hp.x,k.hp.y).setFontSize(k.hp.size);
  this.keepTrack.setPosition(k.bar.x,k.bar.y+k.bar.height/2).setSize(k.bar.width,k.bar.height).setDisplaySize(k.bar.width,k.bar.height);this.keepBar.setPosition(k.bar.x,k.bar.y+k.bar.height/2).setSize(k.bar.width,k.bar.height);this.drawKeepPlate();
  // Integration: the tap inspector used to start at (948,113) under the minimap, where the plate now sits. It moves beside the plate (right-aligned
  // to its left edge), which keeps it clear of the Shop-time toast below the plate and of every panel, which ends further left.
  this.inspector.setPosition(k.x-6/scale,k.y+2/scale);
  this.matchPlate.clear().fillStyle(INK,.88).fillRoundedRect(m.x,m.y,m.width,m.height,8/scale).lineStyle(1/scale,GOLD,.65).strokeRoundedRect(m.x,m.y,m.width,m.height,8/scale);
  this.objectiveText.setPosition(m.x+8/scale,14/scale).setFontSize(14/scale);
  this.waveText.setPosition(m.x+8/scale,34/scale).setFontSize(12/scale);this.timerText.setPosition(m.x+m.width-8/scale,34/scale).setFontSize(12/scale);
  [this.goldText,this.woodText,this.ironText].forEach((text,i)=>{const x=m.x+(8+i*78)/scale,art=this.resourceArt[i];art.setPosition(x+8/scale,61/scale).setScale(16/scale/Math.max(art.width,art.height));text.setPosition(x+20/scale,54/scale).setFontSize(12/scale);});

  this.utilityPanel.setPosition(0,0);this.utilityPreview.setPosition(-90,Math.min(0,540-24/scale-514));
  // Minimap frame extends4 logical pixels; its existing shadow extends3 more.
  this.topHudBottom=Math.max(...this.topPanels.map(p=>p.bottom),p.y+p.height,this.skillOpen.getBounds().bottom,this.mapFrame.y+this.mapFrame.height+7,this.pauseButton.y+this.pauseButton.hitRadius)+8/scale;
  this.shopHudBottom=fguardian.shopHudBottom;
  this.layoutPause(scale);
  if(this.missionView)this.renderMission(this.missionView);
  if(this.results?.visible&&(this.scene.get('Battle') as Battle).campaignLevel)this.layoutCampaignResults();
  this.game.events.emit('keep-hud-obstruction',{x:k.x,y:k.y,width:k.width,height:k.height});this.game.events.emit('hud-clearance',this.topHudBottom);this.shop?.layout(scale,this.shopHudBottom,this.controls.utilities[0].x,this.topHudBottom);this.buildPanel?.layout(scale,this.topHudBottom,this.controls.utilities[0].x);this.skills?.layout(scale,this.topHudBottom,this.controls.utilities[0].x);this.game.events.emit('shop-obstruction',this.shop?.visible?this.shop.bounds:this.skillPanel?.visible?this.skills.bounds:this.utilityPanel?.visible&&this.utilityMode==='Build'?this.buildPanel.bounds:undefined);
 }
 // Reads the authoritative Keep each frame: no separate UI counter, no smoothing that could suggest healing.
 private drawKeepPlate(){
  const base=(this.scene.get('Battle') as Battle).simulation.state.bases['blue-base'],k=this.keepLayout,scale=this.game.canvas.getBoundingClientRect().height/540;
  const v=azureKeepHudState(base?.hp??0,base?.maxHp??0),c=azureKeepHudColors[v.level];
  // Below 30% the border breathes slowly (restrained warning); otherwise the plate matches the other top plates.
  const alpha=v.level==='low'?.55+.45*(.5+.5*Math.sin(this.elapsed/1000*Math.PI*1.6)):.65;
  this.keepPlate.clear().fillStyle(INK,.88).fillRoundedRect(k.x,k.y,k.width,k.height,k.radius).lineStyle((v.level==='low'?1.5:1)/scale,c.border,alpha).strokeRoundedRect(k.x,k.y,k.width,k.height,k.radius);
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
  this.buildPanel=new BuildPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,()=>(this.scene.get('Battle') as Battle).placement,kind=>{this.buildKind=kind;this.game.events.emit('select-building');},()=>this.game.events.emit('select-building'),id=>this.game.events.emit('confirm-building',id),()=>this.closeUtility());
  this.buildControls=this.buildPanel.container;this.buildHits=this.buildPanel.hits;this.buildLabels=this.buildPanel.labels;this.buildReason=this.buildPanel.status;
  this.listen('simulation-event',(e:GameEvent)=>{this.buildPanel.observe(e);if(e.type==='built')this.tell('Construction started - resources charged once');});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:Phaser.GameObjects.GameObject[])=>{if(!objects.length&&!this.paused&&this.utilityPanel.visible&&this.utilityMode==='Build'&&this.buildKind){if(this.buildPanel.model.pending)return;this.buildPanel.locationChanged();this.game.events.emit('placement',this.buildKind,p.x,p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.panPointer?.id===p.id&&p.isDown&&!this.paused){this.game.events.emit('build-pan',this.panPointer.x-p.x,this.panPointer.y-p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointerup',()=>{this.panPointer=undefined;});this.listen('clear-controls',()=>{this.panPointer=undefined;});this.dom('pointercancel',()=>{this.panPointer=undefined;});
  const blocker=this.add.rectangle(450,402,328,224,0,0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  this.utilityPreview=this.add.container(0,0,[bg,blocker,this.utilityTitle,this.utilityDetail,grid,close,mark]);this.utilityPanel.add([this.utilityPreview,this.buildControls]);
 }
 private openShop(){const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting||!sim.setup.shop)return;if(this.shop.visible){this.closeShop();return;}this.closeSkills();if(this.utilityPanel.visible)this.closeUtility();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',true);this.shop.open();this.game.events.emit('time-scale',.25);this.game.events.emit('shop-obstruction',this.shop.bounds);}
 private closeShop(){if(!this.shop?.visible)return;this.shop.hide();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',false);this.game.events.emit('shop-obstruction',undefined);this.game.events.emit('time-scale',this.utilityPanel.visible&&this.utilityMode==='Build'?.25:1);}
 private closeUtility(){this.panPointer=undefined;this.buildPanel.hide();this.utilityPanel.setVisible(false);this.buildKind=undefined;this.game.events.emit('building-mode',false);this.game.events.emit('shop-obstruction',this.shop?.visible?this.shop.bounds:undefined);this.game.events.emit('time-scale',1);}
 private showUtility(mode:string){if(mode==='Shop'){this.openShop();return;}if(this.paused)return;this.closeShop();this.closeSkills();this.utilityPanel.setVisible(!(this.utilityPanel.visible&&this.utilityMode===mode));this.utilityMode=mode;this.footprintButton.setVisible(mode!=='Build');this.buildKind=undefined;this.utilityPreview.setVisible(mode!=='Build');if(mode==='Build'&&this.utilityPanel.visible)this.buildPanel.open();else this.buildPanel.hide();this.utilityDetail.setVisible(mode!=='Build');this.game.events.emit('clear-controls');this.game.events.emit('building-mode',mode==='Build'&&this.utilityPanel.visible);this.game.events.emit('time-scale',this.utilityPanel.visible&&mode==='Build'?.25:1);this.game.events.emit('shop-obstruction',mode==='Build'&&this.utilityPanel.visible?this.buildPanel.bounds:undefined);this.utilityTitle.setText(`${mode.toUpperCase()}${mode==='Build'?'':' - PREVIEW'}`);this.utilityDetail.setText(mode==='Build'?'Select a building and tap a cell.':'Allied minions fight automatically.\nArmy commands arrive in a later phase.');}
 private openSkills(){
  const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting)return;
  this.closeShop();if(this.utilityPanel.visible)this.closeUtility();this.game.events.emit('clear-controls');this.game.events.emit('skill-menu',true);this.skills.open();
  this.skillStatus.setText(sim.state.heroProgression.level===1&&sim.state.heroProgression.skillPoints>0?'Spend your point to learn a skill.':'Each upgrade costs 1 skill point.');
 }
 private closeSkills(){this.skills?.hide();this.game.events.emit('shop-obstruction',undefined);this.game.events.emit('skill-menu',false);
  if(this.guidancePending&&!this.guidanceShown){this.guidancePending=false;this.guidanceShown=true;this.showCombatNotice('Tap to cast \u00b7 Drag to aim',6500,0);}
 }
 private createSkills(){
  this.skills=new SkillsPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,()=>this.closeSkills());
  this.skillPanel=this.skills.container;this.skillHeading=this.skills.heading;this.skillStatus=this.skills.status;this.skillProgress=this.skills.progress;this.skillButtons=this.skills.rows;this.skillClose=this.skills.closeHit;
 }
 private createPause(){
  this.overlay=this.add.container(0,0).setDepth(1000).setVisible(false);
  const shade=this.add.rectangle(480,270,960,540,0x020810,.56).setInteractive();
  this.pauseArt=this.add.graphics();
  this.pauseTitle=this.text(480,216,'GAME PAUSED',24,FANTASY_TEXT.gold,true).setFontFamily(UI_FONT).setOrigin(.5);
  this.pauseSub=this.text(480,250,'Battle is on hold',14,FANTASY_TEXT.muted).setFontFamily(UI_FONT).setOrigin(.5);
  this.overlay.add([shade,this.pauseArt,this.pauseTitle,this.pauseSub]);
  const campaign=!!(this.scene.get('Battle') as Battle).campaignLevel;
  const entries:Array<[string,string,()=>void]>=[['resume','RESUME BATTLE',()=>this.setPause(false)],
   campaign?['levelSelect',this.campaignReturnLabel(),()=>this.leaveBattle('CampaignSelect')]:['restart','RESTART BATTLE',()=>this.restartMatch(false)],
   ['mainMenu','MAIN MENU',()=>this.leaveBattle('MainMenu')]];
  this.pauseButtons=entries.map(([id,text,action])=>{
   const art=this.add.graphics(),hit=this.add.rectangle(480,316,224,48,0,0).setInteractive({useHandCursor:true}).on('pointerup',action);
   const label=this.text(480,316,text,14,id==='resume'?FANTASY_TEXT.ink:FANTASY_TEXT.primary,true).setFontFamily(UI_FONT).setOrigin(.5);
   this.overlay.add([art,hit,label]);return {id,art,hit,label};
  });
  this.pauseResume=this.pauseButtons[0].hit;this.pauseResumeArt=this.pauseButtons[0].art;this.pauseLabel=this.pauseButtons[0].label;
  this.pauseNotice=this.text(480,420,'Leaving this battle will discard current progress.',11,FANTASY_TEXT.warning).setFontFamily(UI_FONT).setOrigin(.5).setAlign('center');
  this.overlay.add(this.pauseNotice);
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
  const view=missionPanelView(level,level.mission?sim.missionStatus():null,{blue:{hp:blue.hp,maxHp:blue.maxHp},red:{hp:red.hp,maxHp:red.maxHp}}),signature=JSON.stringify(view);
  if(!force&&signature===this.missionSignature)return;this.missionSignature=signature;this.missionView=view;this.renderMission(view);
 }
 private renderMission(view:MissionPanelView){
  const scale=this.game.canvas.getBoundingClientRect().height/540,p=(n:number)=>n/Math.max(.1,scale),staged=view.rows.length>1;
  let x=p(12),y=p(92),w=p(scale<.9?280:310);const rowCount=staged?Math.min(4,view.rows.length):view.crimson?1:0,h=p(80+rowCount*19+(staged?20:0));
  const popup=this.missionPopup(),overlaps=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(a.x,a.y,a.width,a.height),new Phaser.Geom.Rectangle(b.x,b.y,b.width,b.height));
  this.missionCollapsed=false;
  if(popup&&overlaps({x,y,width:w,height:h},popup)){
   // Keep existing popup geometry/hit areas. Prefer the full objective beside it if clear;
   // otherwise use the unused left gutter, not a depth-only fix or hidden objective.
   const beside={x:popup.x+popup.width+p(8),y:Math.max(y,this.topHudBottom+p(8)),width:w,height:h};
   const controls=[...this.controls.abilities.map(a=>({x:a.x-a.radius,y:a.y-a.radius,width:2*a.radius,height:2*a.radius})),...this.controls.utilities.map(a=>({x:a.x-a.hitRadius,y:a.y-a.hitRadius,width:2*a.hitRadius,height:2*a.hitRadius})),this.keepLayout];
   if(beside.x+w<=960-p(12)&&beside.y+h<=540-p(12)&&controls.every(c=>!overlaps(beside,c))){x=beside.x;y=beside.y;}
   else {this.missionCollapsed=true;w=popup.x-p(20);}
  }
  if(this.missionCollapsed){
   const active=view.rows.find(r=>r.state==='active')??view.rows.at(-1),inner=w-p(16);
   this.missionHeading.setPosition(x+p(8),y+p(8)).setFontSize(p(11)).setWordWrapWidth(inner,true).setText(active?.label??view.heading).setColor(WHITE);
   const next=this.missionHeading.y+this.missionHeading.height+p(5);
   this.missionPhase.setPosition(x+p(8),next).setFontSize(p(11)).setText(active?`${active.progress}/${active.target}`:view.crimson?`${Math.ceil(view.crimson.hp)}/${view.crimson.maxHp}`:'Complete').setVisible(true);
   this.missionRows.forEach(r=>r.setVisible(false));
   const completed=view.rows.length?`${view.rows.filter(r=>r.complete).length}/${view.rows.length} complete\n`:'',minimum=view.azure.minimum===null?'':`\nMin ${Math.round(view.azure.minimum/view.azure.maxHp*100)}%`;
   this.missionKeep.setPosition(x+p(8),next+p(21)).setFontSize(p(10)).setWordWrapWidth(inner,true).setText(`${completed}Keep ${Math.ceil(view.azure.hp)}/${view.azure.maxHp}${minimum}`).setColor(view.azure.safe&&view.azure.hp>0?'#a5edff':'#ff7976');
   this.missionBounds={x,y,width:w,height:this.missionKeep.y+this.missionKeep.height+p(8)-y};drawFantasyPanel(this.missionArt,this.missionBounds,scale);this.missionProgressTrack.setVisible(false);this.missionProgressBar.setVisible(false);return;
  }
  this.missionHeading.setWordWrapWidth(0);this.missionKeep.setWordWrapWidth(0);this.missionProgressTrack.setVisible(true);this.missionProgressBar.setVisible(true);
  this.missionBounds={x,y,width:w,height:h};drawFantasyPanel(this.missionArt,this.missionBounds,scale);
  const title=view.crimson?'Destroy Crimson Keep':view.rows[0]?.target===5&&view.rows[0]?.label.toLowerCase().includes('wave')?'Defeat Crimson Waves':view.rows[0]?.target===3&&view.rows[0]?.label.toLowerCase().includes('battery')?'Destroy North Battery':view.heading;
  this.missionHeading.setPosition(x+p(14),y+p(13)).setFontSize(p(13)).setText(title).setColor(view.complete?'#8cebd1':WHITE);
  this.missionPhase.setPosition(x+p(14),y+p(34)).setFontSize(p(11)).setText(view.complete?'All phases complete':`Phase: ${view.activePhase??'Complete'}`).setVisible(staged);
  view.rows.slice(0,4).forEach((row,i)=>{
   const text=staged?`${row.state==='complete'?'✓':row.state==='locked'?'Locked ·':'•'} ${row.label}  ${row.progress}/${row.target}`:`${row.complete?'✓ ':''}${row.progress}/${row.target}`;
   this.missionRows[i].setOrigin(staged?0:1,0).setPosition(staged?x+p(14):x+w-p(14),staged?y+p(54+i*19):y+p(13)).setFontSize(p(staged?11:13)).setText(text).setColor(row.state==='complete'?'#8cebd1':row.state==='locked'?'#789096':WHITE).setVisible(true);
  });
  for(let i=view.rows.length;i<this.missionRows.length;i++)this.missionRows[i].setVisible(false);
  const active=view.rows.find(r=>r.state==='active')??view.rows.at(-1),ratio=view.crimson?1-view.crimson.hp/Math.max(1,view.crimson.maxHp):active?active.progress/Math.max(1,active.target):view.complete?1:0;
  const barY=y+h-p(38),barWidth=w-p(28);this.missionProgressTrack.setPosition(x+p(14),barY).setDisplaySize(barWidth,p(4));
  this.missionProgressBar.setPosition(x+p(14),barY).setDisplaySize(barWidth*Phaser.Math.Clamp(ratio,0,1),p(4)).setFillStyle(view.complete?0x68d8ad:0xdcbf7a);
  if(view.crimson)this.missionRows[0].setOrigin(0,0).setPosition(x+p(14),y+p(35)).setFontSize(p(12)).setText(`Crimson Keep: ${Math.ceil(view.crimson.hp)} / ${view.crimson.maxHp} HP`).setColor(WHITE).setVisible(true);
  const a=view.azure,fraction=a.hp/Math.max(1,a.maxHp),warning=a.minimum!==null&&fraction<=a.minimum/a.maxHp+.15;
  this.missionKeep.setPosition(x+p(14),y+h-p(26)).setFontSize(p(11)).setText(`Azure Keep: ${Math.ceil(a.hp)}/${a.maxHp}${a.minimum===null?'':` · Min ${Math.round(a.minimum/a.maxHp*100)}% (≥ safe)`}`).setColor(!a.safe||a.hp<=0?'#ff7976':warning?'#ffd39b':'#a5edff');
 }
 private missionPopup(){return this.shop?.visible?this.shop.bounds:this.skillPanel?.visible?this.skills.bounds:this.utilityPanel?.visible&&this.utilityMode==='Build'?this.buildPanel.bounds:undefined;}
 private observeMissionPopup(){
  if(!this.missionView)return;const signature=JSON.stringify(this.missionPopup())??'';
  if(signature!==this.missionPopupSignature){this.missionPopupSignature=signature;this.renderMission(this.missionView);}
 }
 private layoutPause(scale:number){
  const p=(n:number)=>n/Math.max(.1,scale),width=Math.min(p(320),960-p(32)),height=Math.min(p(318),540-p(24));
  const f=this.pauseFrame={x:480-width/2,y:270-height/2,width,height},top=f.y;
  drawFantasyPanel(this.pauseArt,f,scale);drawDivider(this.pauseArt,f.x+p(22),top+p(76),width-p(44),scale);
  this.pauseTitle.setPosition(480,top+p(30)).setFontSize(p(24));this.pauseSub.setPosition(480,top+p(58)).setFontSize(p(14));
  const w=Math.min(p(236),width-p(40)),h=p(48),first=top+p(114),step=p(56);
  this.pauseButtons.forEach((b,i)=>{
   const y=first+i*step;b.hit.setPosition(480,y).setSize(w,h).setDisplaySize(w,h);
   const visual=compactControlFrame(480-w/2,y-h/2,w,h,scale,i?'secondaryCompact':'primaryCompact');
   drawFantasyButton(b.art,visual.x,visual.y,visual.width,visual.height,scale,i?'secondary':'primary');b.label.setPosition(480,y).setFontSize(p(14));
  });
  this.pauseNotice.setPosition(480,first+2*step+p(40)).setFontSize(p(12)).setWordWrapWidth(width-p(32));
 }
 public setPause(v:boolean){if((this.scene.get('Battle') as Battle).simulation.ended||this.restarting)return;if(v){if((this.scene.get('Battle') as Battle).campaignLevel)this.game.events.emit('clear-controls');else{this.closeShop();this.closeSkills();this.closeUtility();}}this.paused=v;this.overlay.setVisible(v);this.abilities.forEach(a=>a.setDisabled(v));this.utilities.forEach(a=>a.setDisabled(v));this.game.events.emit('pause-visual',v);const sim=(this.scene.get('Battle') as Battle).simulation;this.abilities.forEach(a=>a.observe(sim.remaining(a.id)));}
 private createResults(){
  this.results=this.add.container(0,0).setDepth(2000).setVisible(false);
  const shade=this.add.rectangle(480,270,960,540,0x071d25,.65).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  const bg=this.panel(140,96,680,350);this.resultTitle=this.text(480,144,'',28,WHITE,true).setOrigin(.5);
  const caption=this.text(480,178,'MATCH RESULTS',12,MUTED,true).setOrigin(.5);this.resultDetail=this.text(480,246,'',13,WHITE).setOrigin(.5).setAlign('center');
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.restartHit=this.add.rectangle(480,350,200,Math.max(70,Math.ceil(48/scale)),0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true});
  this.restartHit.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation()).on('pointerup',()=>this.restartMatch(true));
  const label=this.text(480,350,'RESTART MATCH',15,WHITE,true).setOrigin(.5);this.restartHit.setData('label',label);
  this.levelSelectHit=this.add.rectangle(520,394,184,48,0x244852).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false).on('pointerup',()=>this.leaveBattle('CampaignSelect'));
  const selectLabel=this.text(520,394,this.campaignReturnLabel(),12,WHITE,true).setOrigin(.5).setVisible(false);this.levelSelectHit.setData('label',selectLabel);
  this.mainMenuHit=this.add.rectangle(720,394,160,48,0x244852).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false).on('pointerup',()=>this.leaveBattle('MainMenu'));
  const menuLabel=this.text(720,394,'MAIN MENU',12,WHITE,true).setOrigin(.5).setVisible(false);this.mainMenuHit.setData('label',menuLabel);
  this.nextHit=this.add.rectangle(480,350,230,48,0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation()).on('pointerup',()=>this.startNextMission());
  this.nextHit.setData('label',this.text(480,350,'NEXT MISSION',14,WHITE,true).setOrigin(.5).setVisible(false));
  this.chapterHit=this.add.rectangle(480,350,230,48,0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true}).setVisible(false).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation()).on('pointerup',()=>this.leaveBattle('ChapterSelect'));
  this.chapterHit.setData('label',this.text(480,350,'BACK TO CHAPTER SELECT',13,WHITE,true).setOrigin(.5).setVisible(false));
  this.resultRule=this.text(480,416,'If both bases fall together, defeat takes precedence.',10,MUTED).setOrigin(.5);
  this.results.add([shade,bg,this.resultTitle,caption,this.resultDetail,this.restartHit,label,this.levelSelectHit,selectLabel,this.mainMenuHit,menuLabel,this.nextHit,this.nextHit.getData('label'),this.chapterHit,this.chapterHit.getData('label'),this.resultRule]);
  this.campaignResultArt=this.add.graphics();this.campaignResultLevel=this.text(0,0,'',18,FANTASY_TEXT.gold,true).setOrigin(.5,0);
  this.campaignResultStats=this.text(0,0,'',13,MUTED).setOrigin(.5,0);this.campaignResultProgress=this.text(0,0,'',13,WHITE,true).setOrigin(.5,0).setAlign('left').setLineSpacing(3);
  this.campaignResultButtons=[this.add.graphics(),this.add.graphics(),this.add.graphics(),this.add.graphics()];
  this.resultAccent=this.add.graphics();this.resultRules=this.add.graphics();this.resultCaptions=['MATCH STATISTICS','MISSION OBJECTIVES'].map(t=>this.text(0,0,t,10,FANTASY_TEXT.gold,true).setOrigin(.5,0).setAlpha(.8).setVisible(false));
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
  const width=Math.min(p(mobile?560:680),960-p(32)),padding=p(26),x=480-width/2,inner=width-padding*2;
  // Measure wrapped objective lines before centering the content-derived frame.
  this.resultDetail.setFontSize(p(14)).setWordWrapWidth(inner);
  this.campaignResultProgress.setFontSize(p(13)).setWordWrapWidth(inner,true).setLineSpacing(p(3));
  const height=p(94)+this.resultDetail.height+p(47)+p(13)+this.campaignResultProgress.height+p(24+50+32),top=270-height/2;
  this.resultTitle.setPosition(480,top+p(20)).setOrigin(.5,0).setFontSize(p(28));
  this.campaignResultLevel.setPosition(480,top+p(56)).setFontSize(p(17));
  this.resultDetail.setOrigin(.5,0).setPosition(480,top+p(94)).setFontSize(p(14)).setWordWrapWidth(inner);
  const [capStats,capObjectives]=this.resultCaptions,capA=this.resultDetail.y+this.resultDetail.height+p(10),statsY=capA+p(13),capB=statsY+p(24);
  capStats.setPosition(480,capA).setFontSize(p(10)).setVisible(true);this.campaignResultStats.setPosition(480,statsY).setFontSize(p(12));
  capObjectives.setPosition(480,capB).setFontSize(p(10)).setVisible(true);this.campaignResultProgress.setPosition(480,capB+p(13)).setFontSize(p(13)).setWordWrapWidth(inner,true);
  const retryY=this.campaignResultProgress.y+this.campaignResultProgress.height+p(24),secondaryY=retryY+p(50),bottom=secondaryY+p(32);
  this.campaignResultBounds={x,y:top,width,height:bottom-top};drawFantasyPanel(this.campaignResultArt,this.campaignResultBounds,scale);
  drawResultAccent(this.resultAccent,this.campaignResultBounds,victory,{y:top+p(36),halfWidth:this.resultTitle.width/2},scale);
  this.resultRules.clear();drawResultRule(this.resultRules,x+padding,top+p(82),inner,victory,scale);drawResultRule(this.resultRules,x+padding,statsY+p(18),inner,victory,scale);
  // Defeat keeps Retry as the primary action. A won sequential mission leads with Next Mission, or Back to Chapter Select after the chapter's last one; Replay moves to the secondary row.
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
  const b=this.scene.get('Battle') as Battle;if(this.restarting||requireEnded&&!b.simulation.ended)return;this.restarting=true;b.simulation.beginRestart();this.game.events.emit('clear-controls');b.tweens.timeScale=1;b.scene.restart(b.launch);
 }
 private startNextMission(){
  const b=this.scene.get('Battle') as Battle;if(this.restarting||!b.simulation.ended||!this.resultNext||b.launch.mode!=='campaign')return;
  // Progress was recorded when the Victory landed; Battle.init re-reads it and refuses a locked level, so this cannot skip ahead.
  this.restarting=true;b.simulation.beginRestart();this.game.events.emit('clear-controls');b.tweens.timeScale=1;b.scene.restart({mode:'campaign',levelId:this.resultNext,returnTo:b.launch.returnTo});
 }
 private leaveBattle(destination:'CampaignSelect'|'MainMenu'|'ChapterSelect'){
  const battle=this.scene.get('Battle') as Battle;if(this.restarting)return;
  const route=destination==='CampaignSelect'&&battle.launch.mode==='campaign'?battle.launch.returnTo:undefined;
  this.restarting=true;battle.simulation.beginRestart();this.game.events.emit('clear-controls');battle.tweens.timeScale=1;this.game.scene.stop('Battle');this.game.scene.stop('HUD');this.game.scene.start(route?.scene??destination,route?.scene==='CampaignSelect'?route.data:undefined);window.visualReady=false;
 }
 private campaignReturnLabel(){const launch=(this.scene.get('Battle') as Battle).launch;return launch.mode==='campaign'&&launch.returnTo?.scene==='ChapterSelect'?'CHAPTER SELECT':'MISSIONS';}
 private showResults(){
  const battle=this.scene.get('Battle') as Battle,sim=battle.simulation,r=sim.state.match.result;if(!r)return;this.observeMission(true);
  this.closeShop();this.closeSkills();this.closeUtility();this.overlay.setVisible(false);this.paused=true;this.game.events.emit('pause-visual',true);this.results.setVisible(true);
  this.resultTitle.setText(r.outcome==='victory'?'VICTORY':'DEFEAT');this.resultVictory=r.outcome==='victory';this.resultTitle.setColor(resultTone(this.resultVictory).text);
  const seconds=Math.floor(r.tick/30),level=battle.campaignLevel,progress=this.missionView?.rows.map(o=>`${o.complete?'✓':'•'} ${o.label} — ${o.progress}/${o.target}${o.complete?' complete':''}`).join('\n')||(level?'Crimson Keep: '+Math.ceil(r.enemyHp)+' / 3000 HP':'');
  if(!level)this.resultDetail.setText(`${r.outcome==='victory'?'Crimson Keep destroyed':'Azure Keep destroyed'}\nTime ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · Enemies defeated ${r.kills}\nAzure Keep ${Math.ceil(r.alliedHp)} / 3000\nCrimson Keep ${Math.ceil(r.enemyHp)} / 3000`);
  if(!level){const sc=this.game.canvas.getBoundingClientRect().height/540;drawResultAccent(this.resultAccent,{x:140,y:96,width:680,height:350},this.resultVictory,{y:144,halfWidth:this.resultTitle.width/2},sc);}
  if(level){
   this.campaignResultLevel.setText(isSequential(level)?`${missionLabel(level)} — ${level.display.title}`:specialModeHeading);const pr=battle.progressResult,unlock=pr?.recorded?`\n${!pr.firstClear?'Mission completed':pr.next?`${missionLabel(pr.next)} unlocked`:'Campaign up to date — all available missions complete'}`:'';this.resultDetail.setText(outcomeReason(sim.outcome?.reason)+unlock);
   this.campaignResultStats.setText(`Battle time  ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}     ·     Enemies defeated  ${r.kills}`);
   const red=sim.state.bases['red-base'];this.campaignResultProgress.setText(this.missionView?.rows.length?progress:`Crimson Keep damage: ${Math.ceil(red.maxHp-red.hp)} / ${red.maxHp}`);
   this.campaignResultProgress.setColor(r.outcome==='victory'?'#8cebd1':WHITE);
   const won=r.outcome==='victory'&&isSequential(level),next=won?nextPlayableMission(campaign.list(),campaignProgress.progress,level.id):null;this.resultNext=next?.id??null;this.resultFinal=won&&!next;
   (this.restartHit!.getData('label') as Phaser.GameObjects.Text).setText(won?'REPLAY':'RETRY');this.layoutCampaignResults();
  }
  this.abilities.forEach(a=>a.setDisabled(true));this.utilities.forEach(a=>a.setDisabled(true));this.toast.setVisible(false);
 }
 private showCombatNotice(message:string,duration=2500,priority=1){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  if(this.paused||this.restarting||sim.ended)return;
  this.clearTeaching();
  // Even deduplicated direct feedback must take precedence over optional teaching.
  this.teachingBlockedUntil=Math.max(this.teachingBlockedUntil,this.elapsed+duration);
  if(!this.combatSlot.offer(message,this.elapsed,priority,duration))return;
  this.combatNoticePriority=priority;this.combatNotice.setText(message).setVisible(true);this.combatNoticeUntil=this.elapsed+duration;
 }
 private castNotice(reason:string){
  const messages:Record<string,string>={'No legal target in range / line of sight':'No target in reach','No legal target at aim':'No target at aim','Charge path blocked':'Path blocked','Aim Charge first':'Aim Charge first','Invalid Charge distance':'Aim farther','Learn this skill first':'Learn this skill first','Skill on cooldown':'On cooldown','Stunned':'Stunned','Casting':'Casting','Cannot cast now':'Cannot cast now','Duplicate cast request':'Cast already requested'};
  if(!messages[reason])return false;this.showCombatNotice(messages[reason],2500,2);return true;
 }
 private tell(message:string,priority=1,duration:number=defenseFeedbackTiming.notice,identity=message){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  if(this.paused||this.restarting||sim.ended||!this.generalSlot.offer(message,this.elapsed,priority,duration,identity))return false;
  this.teaching=undefined;this.toast.setText(message).setVisible(true);this.toastUntil=this.elapsed+duration;return true;
 }
 private defenseNoticeText(){const base=(this.scene.get('Battle') as Battle).simulation.state.bases['blue-base'];return `Azure Keep under attack\n${Math.ceil(base.hp)} / ${base.maxHp} HP`;}
 private clearTeaching(){if(this.teaching&&this.toast.text===guidanceMessages[this.teaching]){this.toast.setVisible(false);this.generalSlot.clear();}this.teaching=undefined;}
 private observeGuidance(){
  const sim=(this.scene.get('Battle') as Battle).simulation;
  const enabled=sim.state.attacking;if(enabled&&!this.attackWasEnabled&&sim.hero.hp>0)this.tell('Attack enabled');this.attackWasEnabled=enabled;
  this.contextualGuidance.sync(sim.state,this.elapsed);
  const blocked=this.paused||this.restarting||sim.ended||this.shop.visible||this.skillPanel.visible||this.utilityPanel.visible||this.combatSlot.active(this.elapsed)||this.elapsed<this.teachingBlockedUntil;
  if(this.teaching&&(blocked||this.elapsed>=this.toastUntil||!this.contextualGuidance.valid(sim.geo,this.teaching,sim.state,sim.clock.tick,this.elapsed)))this.clearTeaching();
  if(blocked||this.generalSlot.active(this.elapsed))return;
  const key=this.contextualGuidance.next(sim.geo,sim.state,sim.clock.tick,this.elapsed);
  // The persistent campaign panel supplies the level's actual goal; the legacy orientation only applies to Quick Play.
  if(key==='orientation'&&(this.scene.get('Battle') as Battle).campaignLevel){this.contextualGuidance.shown(key,this.elapsed);return;}
  if(key&&this.tell(guidanceMessages[key],0,guidanceRules.duration)){this.teaching=key;this.contextualGuidance.shown(key,this.elapsed);}
 }
 private clearNotifications(){
  this.generalSlot.reset();this.combatSlot.reset();this.toast.setVisible(false);this.combatNotice.setVisible(false);
  this.defenseFeedback.clear();this.azureAccent.clear();this.unitDots.get('blue-base')?.setStrokeStyle();
  this.teaching=undefined;this.teachingBlockedUntil=0;this.contextualGuidance.clearTransient();
 }
 update(_time:number,delta:number){
  if(!this.paused)this.elapsed+=Math.min(delta,100);
  const impact=!this.paused&&this.elapsed<this.impactUntil;
  this.hpBar.setFillStyle(impact?0xffaa91:0x68d8ad);this.hpText.setColor(impact?'#ffc1a7':WHITE);
 }
 private observeSimulation(){
  const sim=(this.scene.get('Battle') as Battle).simulation;this.abilities.forEach(a=>{
   const rank=a.id==='attack'?1:sim.state.heroProgression.ranks[a.id as GuardianSkill],casting=!!sim.state.skills.cast||sim.clock.tick<sim.state.skills.lockTick;
   const blocked=this.paused||this.shop.visible||sim.hero.hp<=0||this.utilityMode==='Build'&&this.utilityPanel.visible||this.skillPanel.visible||!rank||casting||stunned(sim.hero,sim.clock.tick);
   const reason=this.paused?(sim.ended?'ENDED':'PAUSED'):sim.hero.hp<=0?'DEAD':casting?'CAST':stunned(sim.hero,sim.clock.tick)?'STUN':!rank?(a.id==='zone'&&sim.state.heroProgression.level<6?'LV6':'Learn'):'MENU';
   a.setDisabled(blocked,reason);a.duration=a.id==='attack'?guardianStats.cooldownTicks/30:sim.cooldownInterval(a.id as GuardianSkill)/30;a.observe(sim.remaining(a.id));});this.hpBar.setDisplaySize(this.guardianLayout.body.width*sim.hero.hp/sim.hero.maxHp,8/(this.game.canvas.getBoundingClientRect().height/540));this.hpText.setText(sim.hero.hp>0?`${Math.ceil(sim.hero.hp)} / ${sim.hero.maxHp}`:`Revive ${Math.ceil(((sim.hero.respawnTick??sim.clock.tick)-sim.clock.tick)/30)}s`);this.goldText.setText(`${Math.floor(sim.state.gold)}`);this.woodText.setText(`${Math.floor(sim.state.wood)}`);this.ironText.setText(`${Math.floor(sim.state.iron)}`);
  this.buildPanel.render();
  this.defenseFeedback.sync(sim.state,sim.clock.tick);this.drawKeepPlate();
  {const e=sim.state.encounter,sec=Math.floor(sim.clock.tick/30),threat=azureThreatStatus(sim.state,sim.clock.tick);this.waveText.setText(threat||waveLabel(sim.state.spawnedWaves,e.waveCount)).setColor(threat?'#ff9a8f':MUTED);this.timerText.setText(`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`);}
  const progression=sim.state.heroProgression,next=nextLevelXp(progression.level);
  this.levelText.setText(`LV ${progression.level}`);this.xpText.setText('XP');this.xpBar.setDisplaySize(this.guardianLayout.body.xpBarWidth*(next?progression.xp/next:1),3/(this.game.canvas.getBoundingClientRect().height/540));this.skillProgress.setText(`LV ${progression.level} · ${next?`XP ${progression.xp} / ${next}`:'XP MAX'} · Combat continues while this panel is open.`);
  this.skillOpenLabel.setText(progression.skillPoints?`+${progression.skillPoints}`:'0');this.skillOpen.setFillStyle(progression.skillPoints?0x265460:0x172f38);
  this.skills.render();this.skillFrame=this.skills.bounds;
  const defenseAccent=!this.paused&&!sim.ended&&this.defenseFeedback.accentUntil>this.elapsed;
  const accentAlpha=Math.max(0,(this.defenseFeedback.accentUntil-this.elapsed)/defenseFeedbackTiming.accent);
  this.azureAccent.clear();if(defenseAccent){const m=this.guardianLayout.match,scale=this.game.canvas.getBoundingClientRect().height/540;this.azureAccent.lineStyle(2/scale,0xffd39b,accentAlpha).strokeRoundedRect(m.x,m.y,m.width,m.height,8/scale);}
  if(this.selectedId){const u=sim.state.units[this.selectedId]??sim.state.structures[this.selectedId]??sim.state.bases[this.selectedId];if(u)this.inspector.setText(`${u.kind.startsWith('base')?(u.team==='blue'?'Azure Keep':'Crimson Keep'):u.kind==='guardian'?'Guardian':u.kind==='wall'?(u.team==='red'?(isBarracks(u)?'Crimson Barracks':'Frost Gate'):'Wooden Wall'):u.kind==='tower'?'Archer Tower':u.team==='blue'?'Azure Vanguard':'Crimson Raider'}\n${Math.ceil(u.hp)} / ${u.maxHp} HP`);else if(this.selectedId.startsWith('red-')||this.selectedId.startsWith('blue-')||this.selectedId.startsWith('built-'))this.inspector.setText(this.selectedId.startsWith('built-')||this.selectedId.startsWith('red-barracks')?'Structure destroyed':'Minion - defeated');}
  for(const u of Object.values({...sim.state.units,...sim.state.structures,...sim.state.bases})){if(u.kind==='guardian')continue;let dot=this.unitDots.get(u.id);if(!dot){dot=this.add.circle(0,0,u.kind.startsWith('base')?4:1.8,u.team==='blue'?0x83deff:0xff7878);this.unitDots.set(u.id,dot);}dot.setVisible(u.hp>0).setPosition(this.mapFrame.x+u.x/WORLD.width*this.mapFrame.width,this.mapFrame.y+u.y/WORLD.height*this.mapFrame.height);}
  for(const [id,dot] of this.unitDots)if(!sim.state.units[id]&&!sim.state.structures[id]&&!sim.state.bases[id]){dot.destroy();this.unitDots.delete(id);}if(this.combatNotice.visible&&this.elapsed>this.combatNoticeUntil)this.combatNotice.setVisible(false);if(this.toast.visible&&this.elapsed>this.toastUntil)this.toast.setVisible(false);
  const azureDot=this.unitDots.get('blue-base'),scale=this.game.canvas.getBoundingClientRect().height/540;
  if(defenseAccent)azureDot?.setStrokeStyle(2/scale,0xffd39b,accentAlpha);else azureDot?.setStrokeStyle();
  if(this.generalSlot.isCurrent('azure-defense')){
   if(this.paused||this.restarting||sim.ended||this.elapsed>=this.toastUntil||azureThreatStatus(sim.state,sim.clock.tick)!=='Azure Keep under attack'){this.generalSlot.clearIdentity('azure-defense');this.toast.setVisible(false);}
   else {const message=this.defenseNoticeText();if(this.generalSlot.update('azure-defense',message,this.elapsed))this.toast.setText(message);}
  }
  const battle=this.scene.get('Battle') as Battle,f=this.mapFrame,h=battle.hero,c=battle.getCameraWorld();this.mapHero.setPosition(f.x+h.x/WORLD.width*f.width,f.y+h.y/WORLD.height*f.height);
  this.mapViewport.clear().lineStyle(1,0xffe8b4,.9).strokeRect(f.x+c.x/WORLD.width*f.width,f.y+c.y/WORLD.height*f.height,c.width/WORLD.width*f.width,c.height/WORLD.height*f.height);
   this.shop.render();this.observeMission();this.observeMissionPopup();const fnotice=this.controls.feedback;if(this.shop.visible||this.utilityPanel.visible&&this.utilityMode==='Build')this.toast.setPosition(fnotice.x,this.shopHudBottom+16/scale).setWordWrapWidth(180/scale);else if(battle.campaignLevel){const f=this.missionBounds;this.toast.setPosition(f.x+f.width/2,f.y+f.height+18/scale).setWordWrapWidth(f.width-28/scale);}else this.toast.setPosition(300,235).setWordWrapWidth(300);
  this.observeGuidance();
 }
}

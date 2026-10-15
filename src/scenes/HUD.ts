import {waveLabel} from '../data/encounters';
import Phaser from 'phaser';
import { entities, scenery, terrain, WORLD, type VisualEntity } from '../world/layout';
import { Battle } from './Battle';
import { AbilityButton } from '../ui/AbilityButton';
import { UtilityButton } from '../ui/UtilityButton';
import {ShopPanel} from '../ui/ShopPanel';
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
import {ContextGuidance,guidanceMessages,guidanceRules,type GuidanceKey} from '../ui/contextGuidance';
import {nextLevelXp,skillLevel,upgradeRules,type GuardianUpgrade,type GuardianSkill} from '../data/progression';
const INK=0x122d35,GOLD=0xdcbf7a,WHITE='#fff3d3',MUTED='#b5d0ce';
const skillEffects:Record<GuardianUpgrade,string>={bash:'Stun one nearby enemy',taunt:'Draw nearby enemies to you',charge:'Charge; stops at blockers',zone:'Shield allies in a protective zone',fortitude:'More health and armor'};
export class HUD extends Phaser.Scene {
 public paused=false;
 public shop!:ShopPanel;
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
 private buildRequest=0;
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
 private results!:Phaser.GameObjects.Container;
 private resultTitle!:Phaser.GameObjects.Text;
 private resultDetail!:Phaser.GameObjects.Text;
 private restartHit?:Phaser.GameObjects.Rectangle;
 private restarting=false;
 private levelText!:Phaser.GameObjects.Text;
 private xpText!:Phaser.GameObjects.Text;
 private xpBar!:Phaser.GameObjects.Rectangle;
 private skillPanel!:Phaser.GameObjects.Container;
 private skillFrame={x:92,y:100,width:776,height:406};
 private skillHeading!:Phaser.GameObjects.Text;
 private skillStatus!:Phaser.GameObjects.Text;
 private skillProgress!:Phaser.GameObjects.Text;
 private skillButtons:Array<{skill:GuardianUpgrade;card:Phaser.GameObjects.Rectangle;hit:Phaser.GameObjects.Rectangle;title:Phaser.GameObjects.Text;effect:Phaser.GameObjects.Text;label:Phaser.GameObjects.Text;action:Phaser.GameObjects.Text;cost:Phaser.GameObjects.Text}>=[];
 private skillClose!:Phaser.GameObjects.Rectangle;
 private skillOpen!:Phaser.GameObjects.Rectangle;
 private skillOpenLabel!:Phaser.GameObjects.Text;
 private skillEntryCaption!:Phaser.GameObjects.Text;
 private skillRequest=0;
 public controls!:ReturnType<typeof controlLayout>;
 constructor(){super('HUD');}
 preload(){for(const key of ['bash','taunt','charge','zone','attack'])this.load.image(`ability-${key}`,`${import.meta.env.BASE_URL}assets/ability-${key}.png`);for(const key of ['gold','wood','iron','build','shop','army'])this.load.image(`hud-${key}`,`${import.meta.env.BASE_URL}assets/hud-${key}.png`);preloadShopItemIcons(this);}
 private text(x:number,y:number,value:string,size=12,color=WHITE,bold=false){return this.add.text(x,y,value,{fontFamily:'Arial, sans-serif',fontSize:`${size}px`,color,fontStyle:bold?'bold':'normal'});}
 private panel(x:number,y:number,w:number,h:number){const g=this.add.graphics();g.fillStyle(0x06191e,.24).fillRoundedRect(x+1,y+3,w,h,16);g.fillStyle(INK,.93).fillRoundedRect(x,y,w,h,16);g.lineStyle(1,GOLD,.6).strokeRoundedRect(x,y,w,h,16);return g;}
 create(){
  this.restartHit=undefined;this.restarting=false;
  this.topPanels=[];this.resourceArt=[];this.skillButtons=[];this.skillRequest=0;this.guidancePending=false;this.guidanceShown=false;this.combatNoticeUntil=0;this.combatNoticePriority=0;this.impactUntil=0;
  this.defenseFeedback.clear(true);this.generalSlot.reset();this.combatSlot.reset();
  this.contextualGuidance.reset();this.teaching=undefined;this.teachingBlockedUntil=0;this.attackWasEnabled=false;
  this.stickPointer=null;this.selectedId=undefined;this.paused=false;this.abilities=[];this.utilities=[];this.unitDots.clear();this.buildHits=[];this.buildLabels=[];this.buildKind=undefined;this.buildRequest=0;this.utilityMode="";this.elapsed=0;this.gridShown=false;
  this.minimap();
  this.guardianPlate=this.add.graphics();this.guardianRim=this.add.circle(32,40,18,0x24516a).setStrokeStyle(1,GOLD);this.guardianPortrait=this.add.image(32,58,'guardian').setOrigin(.5,1);
  this.heroHit=this.add.circle(32,40,24,0,0).setInteractive({hitArea:new Phaser.Geom.Circle(24,24,24),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.game.events.emit('reset-view');});
  this.levelText=this.text(60,12,'LV 1',14,'#f4d58e',true);
  this.hpText=this.text(60,28,'',14,WHITE,true);this.hpTrack=this.add.rectangle(60,49,112,8,0x071f26).setOrigin(0,.5);this.hpBar=this.add.rectangle(60,49,112,8,0x68d8ad).setOrigin(0,.5);
  this.xpTrack=this.add.rectangle(84,61,88,3,0x395d6e).setOrigin(0,.5);this.xpBar=this.add.rectangle(84,61,0,3,0x9dd5ff).setOrigin(0,.5);this.xpText=this.text(60,54,'XP',12,MUTED);
  this.skillOpen=this.add.rectangle(208,40,48,48,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.openSkills();});
  this.skillOpenLabel=this.text(208,22,'+1',18,WHITE,true).setOrigin(.5,0);
  this.skillEntryCaption=this.text(208,44,'Skills',12,WHITE,true).setOrigin(.5,0);
  this.matchPlate=this.add.graphics();this.objectiveText=this.text(320,20,'Destroy Crimson Keep',14,WHITE,true);
  this.waveText=this.text(320,34,'',12,MUTED);this.timerText=this.text(552,34,'',12,MUTED).setOrigin(1,0);
  this.azureAccent=this.add.graphics();
  [['gold','250'],['wood','180'],['iron','30']].forEach(([icon,value],i)=>{
   const art=this.add.image(332+i*110,61,`hud-${icon}`);this.resourceArt.push(art);
   const text=this.text(351+i*110,54,value,12,icon==='gold'?WHITE:MUTED);if(icon==='gold')this.goldText=text;if(icon==='wood')this.woodText=text;if(icon==='iron')this.ironText=text;
  });
  this.pauseButton=new UtilityButton(this,'pause',745,46,24,()=>this.setPause(!this.paused),34);
  this.joystick();
  ['build','shop','army'].forEach(id=>this.utilities.push(new UtilityButton(this,id,0,0,23.45,()=>id==='shop'?this.openShop():this.showUtility(id[0].toUpperCase()+id.slice(1)),23.45,(this.scene.get('Battle') as Battle).simulation.encounter.id==='extended')));
  const definitions=[['bash',0,0,33.5,3.2,'Shield Bash'],['taunt',0,0,33.5,4.2,'Lion’s Challenge'],['charge',0,0,33.5,2.8,'Vanguard Charge'],['zone',0,0,35.5,6,'Guardian Sanctuary'],['attack',0,0,53,.75,'Attack'] ] as const;
  definitions.forEach(([id,x,y,r])=>this.abilities.push(new AbilityButton(this,id,x,y,r,id==='attack'?guardianStats.cooldownTicks/30:guardianRanks[id].cooldown[0]/30,(gesture)=>{this.game.events.emit('cast',id,gesture);},id==='attack'?undefined:(p,dragged,start)=>this.game.events.emit('skill-aim',id,p?{x:p.x,y:p.y}:undefined,dragged,start))));
  this.attackLabel=this.text(0,0,'Attack',16,WHITE,true).setOrigin(.5,0).setBackgroundColor('#122d35ee').setPadding(3,1);
  this.scale.on('resize',this.layoutControls,this);
  this.events.once('shutdown',()=>this.scale.off('resize',this.layoutControls,this));
  this.inspector=this.text(948,113,'',11,WHITE,true).setOrigin(1,0).setShadow(0,1,'#183c33',3);
  this.toast=this.text(300,235,'',12,WHITE).setOrigin(.5).setBackgroundColor('#173842d9').setPadding(12,7).setWordWrapWidth(300).setVisible(false);
  this.combatNotice=this.text(755,177,'',18,WHITE,true).setOrigin(.5).setBackgroundColor('#122d35ee').setPadding(8,6).setWordWrapWidth(270).setVisible(false);
  this.createUtilityPanel();this.createSkills();this.shop=new ShopPanel(this,()=>(this.scene.get('Battle') as Battle).simulation,()=>this.closeShop());this.createPause();this.createResults();this.restarting=false;
  this.layoutControls();
  this.listen('inspect',(e:VisualEntity)=>{this.selectedId=e.id;this.inspector.setText(`${e.name}\n${e.hp} HP`);this.tell(`${e.name} · ${'columns'in e.footprint?`${e.footprint.columns} × ${e.footprint.rows} cells`:`${e.footprint.radius}-unit radius`}`);});
  // Observe after every scene has updated so HUD values match the rendered authoritative tick.
  this.listen(Phaser.Core.Events.POST_STEP,()=>this.observeSimulation());
  this.listen('request-pause',()=>this.setPause(true));
  this.input.keyboard?.on('keydown-SPACE',()=>this.setPause(!this.paused));
  this.listen('simulation-event',(e:{type:string;index?:number})=>{if(e.type==='wave')this.tell(`Enemy wave ${e.index}`);});
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
  if(innerHeight>innerWidth)this.setPause(true);
 }
 private listen(event:string,fn:(...args:any[])=>void){this.game.events.on(event,fn);this.cleanup.push(()=>this.game.events.off(event,fn));}
 private dom(event:string,fn:()=>void){window.addEventListener(event,fn);this.cleanup.push(()=>window.removeEventListener(event,fn));}
 private layoutControls(){
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.controls=controlLayout(scale);
  this.controls.abilities.forEach((p,i)=>this.abilities[i].setLayout(p.x,p.y,p.radius));
  this.controls.utilities.forEach((p,i)=>this.utilities[i].setLayout(p.x,p.y,p.radius,p.hitRadius,scale));
  for(const hit of this.buildHits){hit.setDisplaySize(110,Math.max(68,Math.ceil(48/scale)));hit.setSize(110,Math.max(68,Math.ceil(48/scale)));}
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
  this.matchPlate.clear().fillStyle(INK,.88).fillRoundedRect(m.x,m.y,m.width,m.height,8/scale).lineStyle(1/scale,GOLD,.65).strokeRoundedRect(m.x,m.y,m.width,m.height,8/scale);
  this.objectiveText.setPosition(m.x+8/scale,14/scale).setFontSize(14/scale);
  this.waveText.setPosition(m.x+8/scale,34/scale).setFontSize(12/scale);this.timerText.setPosition(m.x+m.width-8/scale,34/scale).setFontSize(12/scale);
  [this.goldText,this.woodText,this.ironText].forEach((text,i)=>{const x=m.x+(8+i*78)/scale,art=this.resourceArt[i];art.setPosition(x+8/scale,61/scale).setScale(16/scale/Math.max(art.width,art.height));text.setPosition(x+20/scale,54/scale).setFontSize(12/scale);});
  this.skillPanel.setY(Math.min(0,540-24/scale-(this.skillFrame.y+this.skillFrame.height)));
  this.utilityPanel.setPosition(-90,Math.min(0,540-24/scale-514));
  // Minimap frame extends4 logical pixels; its existing shadow extends3 more.
  this.topHudBottom=Math.max(...this.topPanels.map(p=>p.bottom),p.y+p.height,this.skillOpen.getBounds().bottom,this.mapFrame.y+this.mapFrame.height+7,this.pauseButton.y+this.pauseButton.hitRadius)+8/scale;
  this.shopHudBottom=fguardian.shopHudBottom;
  this.game.events.emit('hud-clearance',this.topHudBottom);this.shop?.layout(scale,this.shopHudBottom,this.controls.utilities[0].x,this.topHudBottom);this.game.events.emit('shop-obstruction',this.shop?.visible?this.shop.bounds:undefined);
 }
 private minimap(){
  const f=this.mapFrame;this.panel(f.x-4,f.y-4,f.width+8,f.height+8);const g=this.add.graphics();
  const r=(x:number,y:number,w:number,h:number,color:number)=>g.fillStyle(color).fillRect(f.x+x/WORLD.width*f.width,f.y+y/WORLD.height*f.height,w/WORLD.width*f.width,h/WORLD.height*f.height);
  r(0,0,WORLD.width,WORLD.height,0x50815a);r(0,terrain.laneTop,WORLD.width,terrain.laneBottom-terrain.laneTop,0xc8b97e);r(terrain.riverLeft,0,terrain.riverRight-terrain.riverLeft,WORLD.height,0x3ba0ab);r(terrain.riverLeft,terrain.bridgeTop,terrain.riverRight-terrain.riverLeft,terrain.bridgeBottom-terrain.bridgeTop,0xc8c7a7);
  scenery.forEach(p=>{const x=f.x+p.x/WORLD.width*f.width,y=f.y+p.y/WORLD.height*f.height;g.fillStyle(p.kind==='trees'?0x234c3b:0x9ba980).fillCircle(x,y,p.kind==='trees'?3:1.5);});
  entities.filter(e=>!e.kind.startsWith('minion')&&!e.kind.startsWith('base')).forEach(e=>{const x=f.x+e.x/WORLD.width*f.width,y=f.y+e.y/WORLD.height*f.height;const dot=this.add.circle(x,y,e.id==='guardian'?3:1.8,e.team==='blue'?0x83deff:0xff7878);if(e.id==='guardian')this.mapHero=dot.setStrokeStyle(1,0xffffff);});
  this.mapViewport=this.add.graphics();
  this.add.rectangle(f.x+f.width/2,f.y+f.height/2,f.width,f.height,0,0).setInteractive().on('pointerdown',(p:Phaser.Input.Pointer,_x:number,_y:number,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.game.events.emit('focus-map',(p.x-f.x)/f.width*WORLD.width,(p.y-f.y)/f.height*WORLD.height);});
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
  const close=this.add.circle(550,309,17,0x244852).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.closeUtility());const mark=this.text(550,309,'×',22,WHITE).setOrigin(.5);this.buildControls=this.add.container(0,0).setVisible(false);
  const button=(x:number,y:number,label:string,fn:()=>void)=>{y=y===345?371:470;const hit=this.add.rectangle(x,y,110,Math.max(68,Math.ceil(48/(this.game.canvas.getBoundingClientRect().height/540))),0x265460).setStrokeStyle(1,GOLD).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();if(!this.paused)fn();});const text=this.text(x,y,label,12,WHITE,true).setOrigin(.5);this.buildControls.add([hit,text]);this.buildHits.push(hit);this.buildLabels.push(text);};
  button(352,345,'Wall\n25 Wood',()=>{this.game.events.emit('select-building');this.buildKind='wall';this.buildReason.setText('Tap a cell in blue territory');});
  button(508,345,'Tower\n80 W · 10 I',()=>{this.game.events.emit('select-building');this.buildKind='tower';this.buildReason.setText('Tap a cell in blue territory');});
  button(432,424,'CONFIRM',()=>this.game.events.emit('confirm-building',`ui-${++this.buildRequest}`));
  button(552,424,'CANCEL',()=>this.closeUtility());
  this.buildReason=this.text(307,416,'Select a building',11,MUTED).setWordWrapWidth(260);this.buildControls.add(this.buildReason);
  this.utilityPanel.add(this.buildControls);
  this.listen('placement-status',(reason:string)=>this.buildReason.setText(reason));
  this.listen('simulation-event',(e:{type:string;reason?:string})=>{if(e.type==='built')this.tell('Construction started - resources charged once');});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:Phaser.GameObjects.GameObject[])=>{if(!objects.length&&!this.paused&&this.utilityPanel.visible&&this.utilityMode==='Build'&&this.buildKind){this.game.events.emit('placement',this.buildKind,p.x,p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.panPointer?.id===p.id&&p.isDown&&!this.paused){this.game.events.emit('build-pan',this.panPointer.x-p.x,this.panPointer.y-p.y);this.panPointer={id:p.id,x:p.x,y:p.y};}});
  this.input.on('pointerup',()=>{this.panPointer=undefined;});this.listen('clear-controls',()=>{this.panPointer=undefined;});this.dom('pointercancel',()=>{this.panPointer=undefined;});
  const blocker=this.add.rectangle(450,402,328,224,0,0).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  this.utilityPanel.add([bg,blocker,this.utilityTitle,this.utilityDetail,grid,close,mark]);this.utilityPanel.bringToTop(this.buildControls);
 }
 private openShop(){const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting||sim.encounter.id!=='extended')return;if(this.shop.visible){this.closeShop();return;}this.closeSkills();if(this.utilityPanel.visible)this.closeUtility();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',true);this.shop.open();this.game.events.emit('time-scale',.25);this.game.events.emit('shop-obstruction',this.shop.bounds);}
 private closeShop(){if(!this.shop?.visible)return;this.shop.hide();this.game.events.emit('clear-controls');this.game.events.emit('shop-menu',false);this.game.events.emit('shop-obstruction',undefined);this.game.events.emit('time-scale',this.utilityPanel.visible&&this.utilityMode==='Build'?.25:1);}
 private closeUtility(){this.panPointer=undefined;this.utilityPanel.setVisible(false);this.buildKind=undefined;this.game.events.emit('building-mode',false);this.game.events.emit('time-scale',1);}
 private showUtility(mode:string){if(mode==='Shop'){this.openShop();return;}if(this.paused)return;this.closeShop();this.closeSkills();this.utilityPanel.setVisible(!(this.utilityPanel.visible&&this.utilityMode===mode));this.utilityMode=mode;this.footprintButton.setVisible(mode!=='Build');this.buildKind=undefined;this.buildControls.setVisible(mode==='Build');this.utilityDetail.setVisible(mode!=='Build');this.buildReason.setText('Select Wall or Archer Tower');this.game.events.emit('clear-controls');this.game.events.emit('building-mode',mode==='Build'&&this.utilityPanel.visible);this.game.events.emit('time-scale',this.utilityPanel.visible&&mode==='Build'?.25:1);this.utilityTitle.setText(`${mode.toUpperCase()}${mode==='Build'?'':' - PREVIEW'}`);this.utilityDetail.setText(mode==='Build'?'Select a building and tap a cell.':'Allied minions fight automatically.\nArmy commands arrive in a later phase.');}
 private openSkills(){
  const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting)return;
  this.closeShop();if(this.utilityPanel.visible)this.closeUtility();this.game.events.emit('clear-controls');this.game.events.emit('skill-menu',true);this.skillPanel.setVisible(true);
  this.skillStatus.setText(sim.state.heroProgression.level===1&&sim.state.heroProgression.skillPoints>0?'Spend your point to learn a skill.':'Each upgrade costs 1 skill point.');
 }
 private closeSkills(){this.skillPanel?.setVisible(false);this.game.events.emit('skill-menu',false);
  if(this.guidancePending&&!this.guidanceShown){this.guidancePending=false;this.guidanceShown=true;this.showCombatNotice('Tap to cast \u00b7 Drag to aim',6500,0);}
 }
 private createSkills(){
  this.skillPanel=this.add.container(0,0).setDepth(500).setVisible(false);
  const shade=this.add.rectangle(480,270,960,540,0x071d25,.65).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  const f=this.skillFrame,bg=this.panel(f.x,f.y,f.width,f.height);this.skillHeading=this.text(480,122,'UPGRADE SKILLS',24,WHITE,true).setOrigin(.5);
  const note=this.skillProgress=this.text(480,149,'Combat continues while this panel is open.',17,MUTED).setOrigin(.5);
  this.skillStatus=this.text(480,171,'',16,MUTED).setOrigin(.5).setWordWrapWidth(740);
  this.skillPanel.add([shade,bg,this.skillHeading,note,this.skillStatus]);
  (Object.keys(upgradeRules) as GuardianUpgrade[]).forEach((skill,i)=>{
   const left=i%2?488:108,top=i<2?190:i<4?310:430,passive=skill==='fortitude',height=passive?76:112;
   const card=this.add.rectangle(left+182,top+height/2,364,height,passive?0x18343d:0x1d414a).setStrokeStyle(1,0x557b7f);
   const title=this.text(left+(passive?12:60),top+(passive?6:10),`${passive?'':upgradeRules[skill].key+' · '}${upgradeRules[skill].name}`,20,WHITE,true);
   if(!passive)this.skillPanel.add(this.add.image(left+30,top+24,`ability-${skill}`).setDisplaySize(32,32));
   const effect=this.text(left+12,top+(passive?32:44),skillEffects[skill],17,MUTED).setWordWrapWidth(244);
   const label=this.text(left+12,top+(passive?54:88),'',16,MUTED);
   const hit=this.add.rectangle(left+309,top+height/2,90,68,GOLD).setStrokeStyle(2,0xffe5a0).setInteractive({useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();const sim=(this.scene.get('Battle') as Battle).simulation;if(this.paused||sim.ended||this.restarting||!this.allocationState(skill).available)return;sim.send({type:'learn',requestId:`skill-ui-${++this.skillRequest}`,skill});});
   const action=this.text(hit.x,hit.y-8,'',17,'#122d35',true).setOrigin(.5),cost=this.text(hit.x,hit.y+14,'',16,'#122d35').setOrigin(.5);
   this.skillButtons.push({skill,card,hit,title,effect,label,action,cost});this.skillPanel.addAt(card,4);this.skillPanel.add([title,effect,label,hit,action,cost]);
  });
  this.skillClose=this.add.rectangle(650,468,200,70,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>{e.stopPropagation();this.closeSkills();});
  this.skillPanel.add([this.skillClose,this.text(650,468,'CLOSE SKILLS',18,WHITE,true).setOrigin(.5)]);
 }
 private allocationState(skill:GuardianUpgrade){
  const p=(this.scene.get('Battle') as Battle).simulation.state.heroProgression;
  const rank=skill==='fortitude'?p.fortitude:p.ranks[skill],gate=rank<upgradeRules[skill].maxRank?skillLevel(skill,rank+1):undefined;
  const state=gate===undefined?'Max rank':p.level<gate?'Locked':p.skillPoints<1?'No points':rank?'Upgrade · 1 point':'Learn · 1 point';
  return {rank,gate,state,available:gate!==undefined&&p.level>=gate&&p.skillPoints>0};
 }
 private createPause(){
  this.overlay=this.add.container(0,0).setDepth(1000).setVisible(false);const shade=this.add.rectangle(480,270,960,540,0x071d25,.38).setInteractive();const bg=this.panel(330,174,300,170);const title=this.text(480,211,'GAME PAUSED',22,WHITE,true).setOrigin(.5);const sub=this.text(480,248,'Ability buttons disabled · cooldowns frozen',11,MUTED).setOrigin(.5);const resume=this.add.rectangle(480,300,180,52,0x265460).setStrokeStyle(1,GOLD).setInteractive({useHandCursor:true}).on('pointerup',()=>this.setPause(false));const label=this.text(480,300,'RESUME',12,WHITE,true).setOrigin(.5);this.overlay.add([shade,bg,title,sub,resume,label]);
 }
 public setPause(v:boolean){if((this.scene.get('Battle') as Battle).simulation.ended||this.restarting)return;if(v){this.closeShop();this.closeSkills();this.closeUtility();}this.paused=v;this.overlay.setVisible(v);this.abilities.forEach(a=>a.setDisabled(v));this.utilities.forEach(a=>a.setDisabled(v));this.game.events.emit('pause-visual',v);const sim=(this.scene.get('Battle') as Battle).simulation;this.abilities.forEach(a=>a.observe(sim.remaining(a.id)));}
 private createResults(){
  this.results=this.add.container(0,0).setDepth(2000).setVisible(false);
  const shade=this.add.rectangle(480,270,960,540,0x071d25,.65).setInteractive().on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation());
  const bg=this.panel(280,144,400,268);this.resultTitle=this.text(480,180,'',28,WHITE,true).setOrigin(.5);
  const caption=this.text(480,212,'MATCH RESULTS',12,MUTED,true).setOrigin(.5);this.resultDetail=this.text(480,262,'',14,WHITE).setOrigin(.5).setAlign('center');
  const scale=this.game.canvas.getBoundingClientRect().height/540;
  this.restartHit=this.add.rectangle(480,350,200,Math.max(70,Math.ceil(48/scale)),0x265460).setStrokeStyle(2,GOLD).setInteractive({useHandCursor:true});
  this.restartHit.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,e:Phaser.Types.Input.EventData)=>e.stopPropagation()).on('pointerup',()=>{const b=this.scene.get('Battle') as Battle;if(this.restarting||!b.simulation.ended)return;this.restarting=true;b.simulation.beginRestart();this.game.events.emit('clear-controls');b.scene.restart();});
  const label=this.text(480,350,'RESTART MATCH',15,WHITE,true).setOrigin(.5);
  const rule=this.text(480,396,'If both bases fall together, defeat takes precedence.',10,MUTED).setOrigin(.5);
  this.results.add([shade,bg,this.resultTitle,caption,this.resultDetail,this.restartHit,label,rule]);
 }
 private showResults(){
  const sim=(this.scene.get('Battle') as Battle).simulation,r=sim.state.match.result;if(!r)return;
  this.closeShop();this.closeSkills();this.closeUtility();this.overlay.setVisible(false);this.paused=true;this.game.events.emit('pause-visual',true);this.results.setVisible(true);
  this.resultTitle.setText(r.outcome==='victory'?'VICTORY':'DEFEAT');this.resultTitle.setColor(r.outcome==='victory'?'#8cebd1':'#ffaea4');
  const seconds=Math.floor(r.tick/30);this.resultDetail.setText(`${r.outcome==='victory'?'Crimson Keep destroyed':'Azure Keep destroyed'}\nTime ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} · Enemies defeated ${r.kills}\nAzure Keep ${Math.ceil(r.alliedHp)} / 3000\nCrimson Keep ${Math.ceil(r.enemyHp)} / 3000`);
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
  if(this.teaching&&(blocked||this.elapsed>=this.toastUntil||!this.contextualGuidance.valid(this.teaching,sim.state,sim.clock.tick,this.elapsed)))this.clearTeaching();
  if(blocked||this.generalSlot.active(this.elapsed))return;
  const key=this.contextualGuidance.next(sim.state,sim.clock.tick,this.elapsed);
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
  for(const [i,kind] of (['wall','tower'] as const).entries()){const q=sim.constructionQuote(kind);this.buildLabels[i].setFontSize(Math.ceil(12/(this.game.canvas.getBoundingClientRect().height/540))).setText(kind==='wall'?`Wall\n${q.wood} Wood`:`Tower\n${q.wood} W · ${q.iron} I`);}
  this.defenseFeedback.sync(sim.state,sim.clock.tick);
  {const e=sim.state.encounter,sec=Math.floor(sim.clock.tick/30),threat=azureThreatStatus(sim.state,sim.clock.tick);this.waveText.setText(threat||waveLabel(sim.state.spawnedWaves,e.waveCount)).setColor(threat?'#ff9a8f':MUTED);this.timerText.setText(`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`);}
  const progression=sim.state.heroProgression,next=nextLevelXp(progression.level);
  this.levelText.setText(`LV ${progression.level}`);this.xpText.setText('XP');this.xpBar.setDisplaySize(this.guardianLayout.body.xpBarWidth*(next?progression.xp/next:1),3/(this.game.canvas.getBoundingClientRect().height/540));this.skillProgress.setText(`LV ${progression.level} · ${next?`XP ${progression.xp} / ${next}`:'XP MAX'} · Combat continues while this panel is open.`);
  this.skillOpenLabel.setText(progression.skillPoints?`+${progression.skillPoints}`:'0');this.skillOpen.setFillStyle(progression.skillPoints?0x265460:0x172f38);
  this.skillHeading.setText(`UPGRADE SKILLS · ${progression.skillPoints} skill ${progression.skillPoints===1?'point':'points'}`);
  for(const {skill,title,label,hit,action,cost} of this.skillButtons){const {rank,gate,state,available}=this.allocationState(skill),rules=upgradeRules[skill];
   hit.setFillStyle(available?GOLD:0x142c34).setStrokeStyle(available?2:1,available?0xffe5a0:0x48656b);hit.input!.enabled=available&&!this.paused&&!sim.ended&&!this.restarting;
   title.setText(`${skill==='fortitude'?'':rules.key+' · '}${rules.name}${skill==='fortitude'?' · Passive':''}`);
   label.setText(`Rank ${rank}/${rules.maxRank}${gate===undefined?'':skill==='fortitude'&&!rank?' · LV18 / LV20':` · ${rank?'Next':'Available'} LV${gate}`}`);
   action.setText(available?(rank?'UPGRADE':'LEARN'):state).setColor(available?'#122d35':MUTED).setY(hit.y+(available?-8:0));cost.setText(available?'1 point':'');
  }
  const defenseAccent=!this.paused&&!sim.ended&&this.defenseFeedback.accentUntil>this.elapsed;
  const accentAlpha=Math.max(0,(this.defenseFeedback.accentUntil-this.elapsed)/defenseFeedbackTiming.accent);
  this.azureAccent.clear();if(defenseAccent){const m=this.guardianLayout.match,scale=this.game.canvas.getBoundingClientRect().height/540;this.azureAccent.lineStyle(2/scale,0xffd39b,accentAlpha).strokeRoundedRect(m.x,m.y,m.width,m.height,8/scale);}
  if(this.selectedId){const u=sim.state.units[this.selectedId]??sim.state.structures[this.selectedId]??sim.state.bases[this.selectedId];if(u)this.inspector.setText(`${u.kind.startsWith('base')?(u.team==='blue'?'Azure Keep':'Crimson Keep'):u.kind==='guardian'?'Guardian':u.kind==='wall'?'Wooden Wall':u.kind==='tower'?'Archer Tower':u.team==='blue'?'Azure Vanguard':'Crimson Raider'}\n${Math.ceil(u.hp)} / ${u.maxHp} HP`);else if(this.selectedId.startsWith('red-')||this.selectedId.startsWith('blue-')||this.selectedId.startsWith('built-'))this.inspector.setText(this.selectedId.startsWith('built-')?'Structure destroyed':'Minion - defeated');}
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
  this.shop.render();const fnotice=this.controls.feedback;if(this.shop.visible)this.toast.setPosition(fnotice.x,this.shopHudBottom+16/scale).setWordWrapWidth(180/scale);else this.toast.setPosition(300,235).setWordWrapWidth(300);
  this.observeGuidance();
 }
}

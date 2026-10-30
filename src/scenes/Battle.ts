import type {BuildingKind} from '../data/buildings';
import { controlLayout } from '../ui/controlLayout';
import {cameraAction,deadPan} from '../ui/cameraPan';
import Phaser from 'phaser';
import { entities, towerVisual, GRID, projection, terrain, VIEW_WORLD, WORLD, viewToWorld, worldToView, type VisualEntity } from '../world/layout';
import {inTerritory,type Barrier,type Battlefield} from '../world/battlefield';
import {battlefieldArt,dryFoliagePixels,propArt,visibleRect,type BattlefieldArt} from '../world/battlefieldArt';
import {battlefieldFromSearch} from '../world/battlefieldLaunch';
import { Simulation } from '../simulation/Simulation';
import {applySoldierTest,soldierTestFromSearch} from '../data/soldierTest';
import {applyBarracksTest,barracksTestFromSearch,barracksTestSetup} from '../data/barracksTest';
import {guardianRanks} from '../data/guardian';
import {skillRules,type GuardianSkill} from '../data/progression';
import type { GameEvent, Unit } from '../simulation/GameState';
import {DamageFeedback,damageFeedbackTiming} from '../ui/damageFeedback';
import {isEncounterId,parseLaneSeed,type EncounterId} from '../data/encounters';
import {activeCombatVariant,combatVariantFromSearch} from '../data/gameplayV041';
import {crimsonTowerPixels,towerTexture} from '../world/towerAppearance';
import {desertRaiderPixels,desertRaiderScale,desertRaiderTexture} from '../world/desertRaiderAppearance';
import {azureBarracksVisual,barracksVisual,isSiegeTower,siegeTowerName,frostGatePixels,frostGateRowOffset,frostGateTexture,frostGateVisual,isBarracks,isFrostGate} from '../world/frostGateAppearance';
import {campaign} from '../data/campaignLevels';
import type {LevelDefinition} from '../data/campaign';
import type {BattleLaunch} from '../data/campaignUi';
import {campaignDestination} from '../data/campaignNavigation';
import {matchSetup} from '../data/matchSetup';
import {campaignProgress,type VictoryRecord} from '../data/campaignProgressStore';
import {isSequential} from '../data/campaignProgress';
// Development-only browser fixture for staged HUD handover. It is not a campaign level and never records progress.
const stagedFixture=()=>import.meta.env.DEV&&new URLSearchParams(location.search).get('campaignFixture')==='staged';
// Manual play defaults to the Phase 2C extended encounter; ?encounter=prototype selects the inherited six-enemy baseline.
// Chapter 2 S9C: one lane seed per new human match, drawn here at the scene edge (never inside a simulation tick). ?laneSeed=N replays a known seed; the seed is logged and kept on simulation.setup.laneSeed.
// It runs on every match start, so a restart keeps an explicit ?laneSeed=N and otherwise draws a new seed; an invalid value falls back to a fresh seed.
export function freshLaneSeed():number{const seed=parseLaneSeed(new URLSearchParams(location.search).get('laneSeed'))??crypto.getRandomValues(new Uint32Array(1))[0];console.info(`[Kingdom Clash] lane seed ${seed}`);return seed;}
export function encounterFromUrl():EncounterId{const v=new URLSearchParams(location.search).get('encounter');return isEncounterId(v)?v:'extended';}
// Gameplay v0.4.1: the active balance is Variant B. Dev server only: ?combat=a|c selects another variant and warns in the console. Production builds ignore it.
export function combatVariantFromUrl(){const v=combatVariantFromSearch(location.search,import.meta.env.DEV);if(v!==activeCombatVariant)console.warn(`[gameplay v0.4.1] dev override: combat variant ${v.label} instead of the active ${activeCombatVariant.label}`);return v;}
// Chapter 2 S2b (D5): dev server only, ?battlefield=canyon-pass opens a quick match on Canyon Pass and warns in the console. Production builds
// ignore it; campaign levels and the staged fixture never read it. Meadow keeps passing the encounter id exactly as before.
export function battlefieldFromUrl(){const v=battlefieldFromSearch(location.search,import.meta.env.DEV);if(v!=='meadow')console.warn(`[chapter 2] dev override: battlefield ${v} instead of meadow`);return v;}
const quickSetup=(encounter:EncounterId)=>{const field=battlefieldFromUrl();return field==='meadow'?encounter:matchSetup(encounter,{battlefield:field});};
const BLUE=0x70d7ff, RED=0xff7976;
export class Battle extends Phaser.Scene {
 private visuals=new Map<string,Phaser.GameObjects.Container>();
 private grid!:Phaser.GameObjects.Graphics;
 public simulation=new Simulation();
 public get hero(){return this.simulation.hero;}
 private hpBars=new Map<string,{bar:Phaser.GameObjects.Rectangle;width:number}>();
 private hudClearance=0;
 private aimCancel(){return controlLayout(this.game.canvas.getBoundingClientRect().height/540).cancel;}
 private keepHealth=new Map<string,{container:Phaser.GameObjects.Container;height:number;width:number}>();
 private cleanup:Array<()=>void>=[];
 private stick={x:0,y:0};
 private keys?:Record<string,Phaser.Input.Keyboard.Key>;
 public buildingMode=false;
 public shopMenu=false;private shopObstruction?:{x:number;y:number;width:number;height:number};private keepHudObstruction?:{x:number;y:number;width:number;height:number};
 private skillMenu=false;
 private castRequest=0;private matchSequence=0;private lastDirection?:{x:number;y:number};private skillAim!:Phaser.GameObjects.Graphics;private cancelAim!:Phaser.GameObjects.Graphics;private zoneArt!:Phaser.GameObjects.Graphics;private statusTexts=new Map<string,Phaser.GameObjects.Text>();
 public placement?:{kind:BuildingKind;col:number;row:number};
 private placementArt!:Phaser.GameObjects.Image;
 private placementGrid!:Phaser.GameObjects.Graphics;
 public frozen=false;
 private elapsed=0;
 public castCount=0;
 private lookUntil=0;
 private following=false;
 private wasDead=false;
 private damageFeedback=new DamageFeedback();
 private damageArt!:Phaser.GameObjects.Graphics;
 private selectedRange!:Phaser.GameObjects.Graphics;
 private inspectedTower?:{id:string;until:number};
 private guardianDamageTexts=new Set<Phaser.GameObjects.Text>();
 public launch:BattleLaunch={mode:'quick'};
 public campaignLevel:LevelDefinition|null=null;
 // Set when a campaign launch names an unknown or locked level: the scene then redirects to Campaign Select without building a match.
 private blocked=false;
 // Progress is recorded at most once per match, only for a sequential level that was unlocked at entry. The HUD reads the outcome.
 private recordsProgress=false;private progressRecorded=false;public progressResult:VictoryRecord|null=null;
 constructor(){super('Battle');}
 init(data?:BattleLaunch){
  this.launch=data?.mode?data:{mode:'quick',encounter:encounterFromUrl()};
  campaignProgress.refresh();
  if(this.launch.mode==='campaign')this.launch={...this.launch,returnTo:campaignDestination(campaign.list(),campaignProgress.progress,this.launch.levelId,this.launch.returnTo)};
  const named=this.launch.mode==='campaign'&&campaign.has(this.launch.levelId)?campaign.get(this.launch.levelId):null;
  const debug=import.meta.env.DEV&&this.launch.mode==='campaign'&&this.launch.debug===true; // dev-only debug launch: skips the unlock check and records nothing
  this.blocked=this.launch.mode==='campaign'&&(!named||(!debug&&!campaignProgress.isUnlocked(named)));
  this.campaignLevel=this.blocked?null:named;
  this.recordsProgress=!!this.campaignLevel&&isSequential(this.campaignLevel)&&!stagedFixture()&&!debug;this.progressRecorded=false;this.progressResult=null;
 }
 preload(){
  for(const key of ['grass','path','water','bridge','trees','rocks','bush','guardian','minion-blue','minion-red','base-blue','base-red','tower','wall','barracks-azure','barracks-crimson'])this.load.image(key,`${import.meta.env.BASE_URL}assets/${key}.png`);
  this.load.on('loaderror',(f:Phaser.Loader.File)=>{const e=document.getElementById('error')!;e.style.display='block';e.textContent=`Missing asset: ${f.key}`;});
 }
 create(){
  if(this.blocked){const route=this.launch.mode==='campaign'?this.launch.returnTo:undefined;this.scene.start(route?.scene??'ChapterSelect',route?.scene==='CampaignSelect'?route.data:undefined);return;}
  if(!this.textures.exists('tower-red')){
   const source=this.textures.get('tower').getSourceImage() as HTMLImageElement;
   const texture=this.textures.createCanvas('tower-red',source.width,source.height)!;
   const context=texture.context;context.drawImage(source,0,0);
   const image=context.getImageData(0,0,source.width,source.height);
   crimsonTowerPixels(image.data);context.putImageData(image,0,0);texture.refresh();
  }
  if(!this.textures.exists(desertRaiderTexture)){
   const source=this.textures.get('minion-red').getSourceImage() as HTMLImageElement;
   const texture=this.textures.createCanvas(desertRaiderTexture,source.width,source.height)!;
   const context=texture.context;context.drawImage(source,0,0);
   const image=context.getImageData(0,0,source.width,source.height);
   desertRaiderPixels(image.data);context.putImageData(image,0,0);texture.refresh();
  }
  if(!this.textures.exists(frostGateTexture)){
   const source=this.textures.get('wall').getSourceImage() as HTMLImageElement,height=source.height+frostGateRowOffset;
   const texture=this.textures.createCanvas(frostGateTexture,source.width,height)!;
   const context=texture.context;context.drawImage(source,0,0);context.drawImage(source,0,frostGateRowOffset);
   const image=context.getImageData(0,0,source.width,height);
   frostGatePixels(image.data);context.putImageData(image,0,0);texture.refresh();
  }
  const staged=stagedFixture();
  const setup=staged?matchSetup('extended',{defenders:['red-tower-front-north','red-tower-front-center'],waves:{firstWaveTick:9000},crimsonKeepArmed:false,mission:{waveMode:'scripted',phases:[
   {id:'breach',display:{label:'Breach'},objectives:[{id:'north',type:'destroy',targets:['red-tower-front-north'],display:{label:'Destroy North Guard'}}]},
   {id:'advance',display:{label:'Advance'},objectives:[{id:'center',type:'destroy',targets:['red-tower-front-center'],display:{label:'Destroy Center Guard'}}]},
  ]}}):this.campaignLevel?campaign.setup(this.campaignLevel.id,freshLaneSeed()):this.launch.mode==='quick'?quickSetup(this.launch.encounter??encounterFromUrl()):encounterFromUrl();
  this.stick={x:0,y:0};const barracksTest=!!this.campaignLevel&&barracksTestFromSearch(location.search,import.meta.env.DEV);this.simulation=new Simulation(`match-${++this.matchSequence}`,barracksTest&&typeof setup!=='string'?barracksTestSetup(setup):setup,undefined,combatVariantFromUrl());if(barracksTest){applyBarracksTest(this.simulation);document.title='BARRACKS TEST';}{const leash=this.campaignLevel?soldierTestFromSearch(location.search,import.meta.env.DEV):null;if(leash){applySoldierTest(this.simulation,leash);document.title=`SOLDIER TEST ${leash}`;}}this.castRequest=0;this.lastDirection=undefined;this.statusTexts.clear();this.visuals.clear();this.hpBars.clear();this.keepHealth.clear();this.frozen=false;this.elapsed=0;this.following=false;this.wasDead=false;this.castCount=0;
  this.skillAim=this.add.graphics().setDepth(2590);this.cancelAim=this.add.graphics().setDepth(2591).setScrollFactor(0);this.zoneArt=this.add.graphics().setDepth(2501);
  this.damageFeedback.clear();this.inspectedTower=undefined;this.guardianDamageTexts.clear();
  this.damageArt=this.add.graphics().setDepth(2550);this.selectedRange=this.add.graphics().setDepth(2499);
  this.listen('inspect',(e:VisualEntity)=>{if(this.frozen)return;const u=this.combatUnit(e.id);this.inspectedTower=u?.kind==='tower'&&u.hp>0?{id:u.id,until:this.elapsed+damageFeedbackTiming.inspection}:undefined;this.drawDamageFeedback();});
  this.buildingMode=false;this.skillMenu=false;this.shopMenu=false;this.shopObstruction=undefined;this.placement=undefined;this.createTerrain();
  this.placementArt=this.add.image(0,0,'wall').setOrigin(.5,1).setAlpha(.65).setDepth(2601).setVisible(false);
  this.placementGrid=this.add.graphics().setDepth(2600);
  // Scenery and static entities come from this match's battlefield; their look from its art registry entry.
  const field=this.simulation.field,art=battlefieldArt(field.id);
  field.scenery.forEach(e=>{const look=propArt(art,e.kind),p=worldToView(e.x,e.y);if(look.source)this.bakeProp(look.texture,look.source);const image=this.add.image(p.x,p.y,look.texture).setOrigin(.5,1).setDepth(p.y);if(look.tint!==undefined)image.setTint(look.tint);image.setScale(e.height/image.height);this.add.ellipse(p.x+12,p.y-2,image.displayWidth*.7,24,look.shadow.color,look.shadow.alpha).setDepth(p.y-1);});
  this.grid=this.add.graphics().setDepth(2500).setVisible(false);
  field.entities.filter(e=>!e.kind.startsWith('minion')).forEach(e=>this.makeEntity(e));this.drawGrid();
  this.cameraBounds={x:0,y:0,width:VIEW_WORLD.width,height:VIEW_WORLD.height};this.followOffset={x:0,y:35};this.cameras.main.setBounds(0,0,VIEW_WORLD.width,VIEW_WORLD.height);this.followHero();
  // Manual pans and interpolated camera follow both need the final scroll value.
  const healthCamera=this.cameras.main;
  this.events.on(Phaser.Scenes.Events.PRE_RENDER,this.syncKeepHealth,this);
  healthCamera.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE,this.syncKeepHealth,this);
  this.cleanup.push(()=>{this.events.off(Phaser.Scenes.Events.PRE_RENDER,this.syncKeepHealth,this);healthCamera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE,this.syncKeepHealth,this);});
  // The HUD reports the unobstructed gameplay rectangle (logical px, between the joystick column, the skill cluster, the top plates and the bottom inset):
  // the Guardian is framed at its centre, and the camera may scroll past the world's edges by the width of each fixed HUD margin so a target at an edge can reach it.
  this.listen('camera-safe-area',(a:{left:number;right:number;top:number;bottom:number})=>this.applySafeArea(a));
  this.listen('hud-clearance',(bottom:number)=>{this.hudClearance=bottom;this.syncKeepHealth();});
  this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
  this.listen('build-pan',(dx:number,dy:number)=>{if(!this.buildingMode)return;this.following=false;this.cameras.main.stopFollow().setScroll(this.cameras.main.scrollX+dx,this.cameras.main.scrollY+dy);});
  this.listen('select-building',()=>{this.placement=undefined;this.placementArt.setVisible(false);this.placementGrid.clear();});
  this.listen('building-mode',(v:boolean)=>{this.buildingMode=v;this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.simulation.clearInput();if(!v){this.placement=undefined;this.placementArt.setVisible(false);this.placementGrid.clear();}this.grid.setVisible(v);});
  this.listen('placement',(kind:BuildingKind,x:number,y:number)=>{if(!this.buildingMode)return;const p=viewToWorld(x+this.cameras.main.scrollX,y+this.cameras.main.scrollY);this.placement={kind,col:Math.floor(p.x/GRID),row:Math.floor(p.y/GRID)};});
  this.listen('confirm-building',(requestId:string)=>{if(this.buildingMode&&this.placement)this.simulation.send({type:'place',requestId,...this.placement});});
  this.listen('keep-hud-obstruction',(bounds:{x:number;y:number;width:number;height:number})=>{this.keepHudObstruction=bounds;this.syncKeepHealth();});
  this.listen('shop-obstruction',(bounds?:{x:number;y:number;width:number;height:number})=>{this.shopObstruction=bounds;this.syncKeepHealth();});
  this.listen('shop-menu',(v:boolean)=>{this.shopMenu=v;this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.simulation.clearHeroInput();});
  this.listen('skill-menu',(v:boolean)=>{this.skillMenu=v;this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.simulation.clearHeroInput();});
  this.listen('stick',(x:number,y:number)=>{this.stick={x,y};if(x||y)this.followHero();});
  this.listen('grid',(show:boolean)=>this.grid.setVisible(show));
  this.listen('pause-visual',(v:boolean)=>{this.frozen=v;this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.simulation.setPaused(v);this.tweens.timeScale=v?0:1;if(v)this.clearDamageFeedback();});
  this.listen('time-scale',(v:number)=>this.simulation.setTimeScale(v));
  this.listen('cast',(key:string,gesture?:{x:number;y:number;dragged:boolean;startX?:number;startY?:number})=>{if(this.buildingMode||this.skillMenu||this.shopMenu)return;if(key==='attack')this.simulation.send({type:'attack'});else this.castSkill(key as GuardianSkill,gesture);});
  this.listen('skill-aim',(key:GuardianSkill,p?:{x:number;y:number},dragged?:boolean,start?:{x:number;y:number})=>this.drawAim(key,p,dragged,start));
  this.listen('clear-controls',()=>{this.skillAim.clear();this.cancelAim.clear();});
  this.listen('reset-view',()=>this.followHero());
  this.listen('focus-map',(x:number,y:number)=>{const p=worldToView(x,y);this.following=false;this.cameras.main.stopFollow().centerOn(p.x,p.y);this.lookUntil=this.elapsed+2200;});
  this.dom(window,'blur',()=>this.game.events.emit('request-pause'));
  this.dom(document,'visibilitychange',()=>{if(document.hidden)this.game.events.emit('request-pause');});
  this.dom(window,'resize',()=>{if(innerHeight>innerWidth)this.game.events.emit('request-pause');});
  this.events.once('shutdown',()=>{this.simulation.setPaused(true);this.cleanup.splice(0).forEach(f=>f());this.scene.stop('HUD');window.visualReady=false;});
  this.scene.launch('HUD');window.visualReady=true;
 }
 // Authoritative Victory from the Simulation, before the HUD (which hears the event next) builds its result screen. Defeat, Retry, Pause and
 // Quit never reach this; a repeated match-end for the same match records nothing more.
 private recordMatchEnd(){
  if(!this.recordsProgress||this.progressRecorded||this.simulation.outcome?.outcome!=='victory'||!this.campaignLevel)return;
  this.progressRecorded=true;this.progressResult=campaignProgress.recordVictory(this.campaignLevel);
 }
 private listen(event:string,fn:(...args:any[])=>void){this.game.events.on(event,fn);this.cleanup.push(()=>this.game.events.off(event,fn));}
 private dom(target:Window|Document,event:string,fn:()=>void){target.addEventListener(event,fn);this.cleanup.push(()=>target.removeEventListener(event,fn));}
 // The battlefield whose art this scene drew; browser verification compares it with simulation.field.
 public renderedFieldId='';
 private createTerrain(){
  const field=this.simulation.field,art=battlefieldArt(field.id);this.renderedFieldId=field.id;
  if(art.terrain==='meadow')this.createMeadowTerrain();else if(art.terrain==='oasis')this.createOasisTerrain(field,art);else this.createCanyonTerrain(field,art); // canyon and frozen
 }
 // Canyon Pass: sand ground and road, then every barrier as rock drawn on its own rectangle (clipped to the world), so the rock's visible
 // edge is the collision edge; decoration stays inside the rectangle. A barrier open to the top is a cliff whose face rises from its
 // lower edge (the north lane's wall); one open to the bottom shows its rim along its upper edge; a free-standing barrier is a spire,
 // depth-sorted at its front edge like a unit, so units in the lane in front draw over it and units behind it pass behind it.
 private createCanyonTerrain(field:Battlefield,art:BattlefieldArt){
  const road=art.road!,v=(y:number)=>y*projection.y,T=art.tone??((c:number)=>c);
  if(art.ground===undefined)this.add.tileSprite(0,0,VIEW_WORLD.width,VIEW_WORLD.height,'path').setOrigin(0).setTileScale(.42,.42).setTint(T(0xd9a974));else this.add.rectangle(0,0,VIEW_WORLD.width,VIEW_WORLD.height,art.ground).setOrigin(0);
  let g=this.add.graphics();
  const rect=(x:number,y:number,w:number,h:number,color:number,alpha=1)=>{const p=worldToView(x,y);g.fillStyle(color,alpha).fillRect(p.x,p.y,w*projection.x,h*projection.y);};
  rect(0,road.top-22,WORLD.width,road.bottom-road.top+44,T(0xc99a62),.45);
  rect(0,road.top-8,WORLD.width,road.bottom-road.top+16,T(0xdcb57e),.8);
  if(art.ground===undefined)this.add.tileSprite(0,v(road.top),VIEW_WORLD.width,v(road.bottom-road.top),'path').setOrigin(0).setTileScale(.35,.35).setTint(T(0xf6dcab));else this.add.rectangle(0,v(road.top),VIEW_WORLD.width,v(road.bottom-road.top),T(0xf6dcab)).setOrigin(0);
  g=this.add.graphics();
  for(let i=0;i<220;i++){const x=(i*137.3)%WORLD.width,y=(i*71.9)%WORLD.height,p=worldToView(x,y);if(field.barriers.some(b=>x>b.x0-8&&x<b.x1+8&&y>b.y0-8&&y<b.y1+8))continue;g.fillStyle(i%3?T(0x9c6a3c):T(0xf0d2a0),.28).fillEllipse(p.x,p.y,4+i%6,2+i%3);}
  // Chapter 3 M5: Deep Snow drawn on its own rectangle (the slow-zone edge), under the barriers, with flecks so the boundary reads.
  for(const z of field.slowZones??[]){const r=visibleRect({x0:z.x0,y0:z.y0,x1:z.x1,y1:z.y1,reason:'Deep Snow'}),x=r.x*projection.x,y=v(r.y),w=r.width*projection.x,h=v(r.y+r.height)-y;g.fillStyle(0xeaf4fb,.4).fillRect(x,y,w,h);g.lineStyle(3,0xffffff,.55).strokeRect(x+1,y+1,w-2,h-2);for(let i=0;i<Math.floor(w*h/1500);i++){const px=x+10+(i*53.7)%Math.max(1,w-20),py=y+8+(i*29.3)%Math.max(1,h-16);g.fillStyle(0xffffff,.45).fillEllipse(px,py,10+i%4*4,4+i%3*2);}}
  for(const b of field.barriers){
   const r=visibleRect(b),x0=r.x*projection.x,w=r.width*projection.x,top=v(r.y),bottom=v(r.y+r.height);
   if(b.look==='wall'){this.fortressWall(b,T);continue;}
   if(b.y0===-Infinity||b.y1===Infinity){
    // Plateau: the whole rectangle, with strata and boulders inside it.
    g.fillStyle(T(0x9a5a33)).fillRect(x0,top,w,bottom-top);
    for(let y=top+14;y<bottom-6;y+=19)g.fillStyle(T(0x86492a),.55).fillRect(x0+6,y,w-12,3);
    for(let i=0;i<Math.floor(w*(bottom-top)/2600);i++){const bx=x0+18+(i*61.7)%(w-36),by=top+16+(i*37.3)%Math.max(1,bottom-top-32);g.fillStyle(i%2?T(0xb8703f):T(0x7c4326),.7).fillEllipse(bx,by,18+i%5*4,9+i%3*3);g.fillStyle(T(0xd99a63),.5).fillEllipse(bx-3,by-2,8+i%4*2,4);}
    g.fillStyle(T(0x6e3b20),.85).fillRect(x0,top,5,bottom-top);g.fillStyle(T(0x6e3b20),.85).fillRect(x0+w-5,top,5,bottom-top);
    if(b.y0===-Infinity){
     // Cliff face rising from the lower edge, inside the rectangle: the edge units stand against is exactly b.y1.
     const face=Math.min(46,bottom-top);g.fillStyle(T(0x7a4024)).fillRect(x0,bottom-face,w,face);
     for(let y=bottom-face+9;y<bottom-2;y+=9)g.fillStyle(T(0x5c2e18),.6).fillRect(x0+2,y,w-4,2);
     for(let x=x0+14;x<x0+w-8;x+=23)g.fillStyle(T(0x5c2e18),.5).fillRect(x,bottom-face+4+(x*7)%11,2,face-10);
     g.fillStyle(T(0xe2a86f)).fillRect(x0,bottom-face-3,w,4);g.fillStyle(T(0x4a2412)).fillRect(x0,bottom-3,w,3);
    }else{
     // Rim along the upper edge, inside the rectangle.
     g.fillStyle(T(0xe2a86f)).fillRect(x0,top,w,4);g.fillStyle(T(0x6e3b20),.8).fillRect(x0,top+4,w,6);
    }
   }else this.canyonSpire(r.x,r.y,r.width,r.height,T);
  }
 }
 // Sunwell Oasis: warm grass and a sand road, then the pond. Every barrier is drawn on its own rectangle: a bank of sand and rim stones outside it, and the
 // water texture masked to the union of the rectangles, so the visible water edge is the collision edge. Nothing here changes navigation.
 private createOasisTerrain(field:Battlefield,art:BattlefieldArt){
  const road=art.road!,v=(y:number)=>y*projection.y,pad=(b:Battlefield['barriers'][number],n:number)=>({x:b.x0-n,y:b.y0-n,w:b.x1-b.x0+2*n,h:b.y1-b.y0+2*n});
  this.add.tileSprite(0,0,VIEW_WORLD.width,VIEW_WORLD.height,'grass').setOrigin(0).setTileScale(.42,.42).setTint(0xd2dc92);
  let g=this.add.graphics();
  const rect=(x:number,y:number,w:number,h:number,color:number,alpha=1)=>{const p=worldToView(x,y);g.fillStyle(color,alpha).fillRect(p.x,p.y,w*projection.x,h*projection.y);};
  rect(0,road.top-22,WORLD.width,road.bottom-road.top+44,0xc1b86c,.55);
  rect(0,road.top-8,WORLD.width,road.bottom-road.top+16,0xcfc17b,.85);
  this.add.tileSprite(0,v(road.top),VIEW_WORLD.width,v(road.bottom-road.top),'path').setOrigin(0).setTileScale(.35,.35).setTint(0xf0dbab);
  g=this.add.graphics();
  for(let i=0;i<160;i++){const x=(i*137.3)%WORLD.width,y=(i*71.9)%WORLD.height,p=worldToView(x,y);if(field.barriers.some(b=>x>b.x0-30&&x<b.x1+30&&y>b.y0-30&&y<b.y1+30))continue;g.fillStyle(i%3?0x8fa14f:0xedd4a0,.26).fillEllipse(p.x,p.y,4+i%6,2+i%3);}
  // Sand bank and rim: solid colours, so overlapping rectangles join without a seam.
  for(const [n,color] of [[30,0xd4c382],[16,0xe6d8a8],[6,0x647f66]] as const)for(const b of field.barriers){const r=pad(b,n);rect(r.x,r.y,r.w,r.h,color);}
  // Water: the texture, masked to the exact barrier rectangles.
  const mask=this.make.graphics({x:0,y:0},false),x0=Math.min(...field.barriers.map(b=>b.x0)),y0=Math.min(...field.barriers.map(b=>b.y0)),x1=Math.max(...field.barriers.map(b=>b.x1)),y1=Math.max(...field.barriers.map(b=>b.y1));
  mask.fillStyle(0xffffff);for(const b of field.barriers){const p=worldToView(b.x0,b.y0);mask.fillRect(p.x,p.y,(b.x1-b.x0)*projection.x,(b.y1-b.y0)*projection.y);}
  const a=worldToView(x0,y0);
  const water=this.add.tileSprite(a.x,a.y,(x1-x0)*projection.x,(y1-y0)*projection.y,'water').setOrigin(0).setTileScale(.7,.7);
  water.setMask(mask.createGeometryMask());
  g=this.add.graphics();
  const inside=(x:number,y:number,m:number)=>field.barriers.some(b=>x>b.x0+m&&x<b.x1-m&&y>b.y0+m&&y<b.y1-m);
  // Shore stones along the outline of the union (not along the seams between rectangles) and a few ripples.
  for(const b of field.barriers){
   const edge:number[][]=[];
   for(let x=b.x0;x<=b.x1;x+=22){edge.push([x,b.y0],[x,b.y1]);}
   for(let y=b.y0;y<=b.y1;y+=22){edge.push([b.x0,y],[b.x1,y]);}
   edge.forEach(([x,y],i)=>{if(field.barriers.some(o=>o!==b&&x>o.x0+1&&x<o.x1-1&&y>o.y0+1&&y<o.y1-1))return;const p=worldToView(x+Math.sin(i*1.7)*4,y+Math.cos(i*1.3)*4);g.fillStyle(0x405f55,.6).fillEllipse(p.x+3,p.y+5,23,15);g.fillStyle(i%3?0x8fa294:0xb5bda1).fillEllipse(p.x,p.y,18+i%11,12+i%5);g.fillStyle(0xd0d1b2,.6).fillEllipse(p.x-3,p.y-2,11,5);});
  }
  for(let i=0;i<46;i++){const x=x0+16+(i*53.7)%(x1-x0-32),y=y0+16+(i*37.9)%(y1-y0-32);if(!inside(x,y,10))continue;const p=worldToView(x,y);g.lineStyle(2,0xb9f2e4,.35).lineBetween(p.x,p.y,p.x+26,p.y);}
 }
 // Like tower-red: a recoloured copy of a loaded texture, built once per game.
 private bakeProp(key:string,source:string){
  if(this.textures.exists(key))return;
  const image=this.textures.get(source).getSourceImage() as HTMLImageElement,texture=this.textures.createCanvas(key,image.width,image.height)!;
  const context=texture.context;context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,image.width,image.height);dryFoliagePixels(pixels.data);context.putImageData(pixels,0,0);texture.refresh();
 }
 // Frost Citadel wall (Chapter 3 C3-1): ice-stone blocks, one per grid cell along the wall's long side. Each block is a box on its footprint (lit top, banded front face, dark base line), drawn on its own
 // graphics and depth-sorted at its front edge like the spire, so a unit beside or in front of the wall draws over it and one behind it passes behind. The base line sits on the collision edge.
 private fortressWall(b:Barrier,T:(color:number)=>number){
  const along=b.x1-b.x0>=b.y1-b.y0,length=along?b.x1-b.x0:b.y1-b.y0,lift=30;
  for(let at=0;at<length;at+=GRID){
   const span=Math.min(GRID,length-at),x0=along?b.x0+at:b.x0,x1=along?x0+span:b.x1,y0=along?b.y0:b.y0+at,y1=along?b.y1:y0+span;
   const p=worldToView(x0,y0),w=(x1-x0)*projection.x,d=(y1-y0)*projection.y,front=y1*projection.y;
   const g=this.add.graphics().setDepth(front);
   g.fillStyle(T(0x9a5a33)).fillRect(p.x,front-lift-d,w,d);
   g.fillStyle(T(0x7a4024)).fillRect(p.x,front-lift,w,lift);
   for(let k=1;k<3;k++)g.fillStyle(T(0x4a2412),.6).fillRect(p.x,front-lift+k*10,w,2);
   g.fillStyle(T(0xe2a86f)).fillRect(p.x,front-lift-d,w,2).fillRect(p.x,front-lift,w,2);
   g.fillStyle(T(0x5c2e18)).fillRect(p.x,front-lift-d,3,lift+d).fillRect(p.x+w-3,front-lift-d,3,lift+d);
   g.fillStyle(T(0x4a2412)).fillRect(p.x,front-3,w,3);
  }
 }
 private canyonSpire(worldX:number,worldY:number,worldW:number,worldH:number,T:(color:number)=>number){
  const base=this.add.graphics(),p=worldToView(worldX,worldY),x=p.x,w=worldW*projection.x,front=(worldY+worldH)*projection.y;
  base.fillStyle(T(0x5c2e18),.9).fillRect(x,p.y,w,worldH*projection.y);
  // A tapering crag whose base spans the footprint's front edge; it never reaches beyond the footprint's sides. It rises 60 px, so a
  // Guardian in the middle of the north lane stays fully visible behind it; a unit pressed against the spire's north face loses its feet.
  const g=this.add.graphics().setDepth(front),pts=(list:number[][])=>list.map(([a,b])=>new Phaser.Geom.Point(x+a*w,front-b));
  g.fillStyle(T(0x8f5230)).fillPoints(pts([[0,0],[.04,17],[.12,32],[.22,47],[.36,60],[.46,51],[.56,58],[.68,40],[.82,26],[.95,12],[1,0]]),true);
  g.fillStyle(T(0xb9713f)).fillPoints(pts([[0,0],[.04,17],[.12,32],[.22,47],[.36,60],[.4,33],[.34,0]]),true);
  g.fillStyle(T(0x6e3b20)).fillPoints(pts([[.56,58],[.68,40],[.82,26],[.95,12],[1,0],[.7,0],[.62,31]]),true);
  for(let k=1;k<4;k++)g.fillStyle(T(0x5c2e18),.5).fillRect(x+w*(.08+k*.05),front-k*13,w*(.8-k*.12),2);
  g.fillStyle(T(0x4a2412)).fillRect(x,front-3,w,3);
 }
 private createMeadowTerrain(){
  this.add.tileSprite(0,0,VIEW_WORLD.width,VIEW_WORLD.height,'grass').setOrigin(0).setTileScale(.42,.42).setTint(0xc1d99c);
  let g=this.add.graphics();const t=terrain;
  const rect=(x:number,y:number,w:number,h:number,color:number,alpha=1)=>{const p=worldToView(x,y);g.fillStyle(color,alpha).fillRect(p.x,p.y,w*projection.x,h*projection.y);};
  rect(0,t.laneTop-24,WORLD.width,t.laneBottom-t.laneTop+48,0xc1b86c,.65);
  rect(0,t.laneTop-10,WORLD.width,t.laneBottom-t.laneTop+20,0xcfc17b,.9);
  rect(0,t.laneTop,WORLD.width,t.laneBottom-t.laneTop,0xd8c28b);
  this.add.tileSprite(0,t.laneTop*projection.y,VIEW_WORLD.width,(t.laneBottom-t.laneTop)*projection.y,'path').setOrigin(0).setTileScale(.35,.35).setTint(0xf0dbab);
  g=this.add.graphics();
  rect(t.riverLeft-14,0,t.riverRight-t.riverLeft+28,WORLD.height,0x647f66);
  rect(t.riverLeft,0,t.riverRight-t.riverLeft,WORLD.height,0x267f90);
  rect(t.riverLeft+14,0,t.riverRight-t.riverLeft-28,WORLD.height,0x36a7ad);
  this.add.tileSprite(t.riverLeft*projection.x,0,(t.riverRight-t.riverLeft)*projection.x,VIEW_WORLD.height,'water').setOrigin(0).setTileScale(.7,.7);
  g=this.add.graphics();
  // Shore stones and grass fringes soften procedural edges without changing navigation.
  for(let y=0;y<WORLD.height;y+=22){if(y>t.bridgeTop-30&&y<t.bridgeBottom+30)continue;[t.riverLeft,t.riverRight].forEach((x,i)=>{const p=worldToView(x+(Math.sin(y*.13+i)*7),y);g.fillStyle(0x405f55,.65).fillEllipse(p.x+3,p.y+5,23,15);g.fillStyle(y%3?0x8fa294:0xb5bda1).fillEllipse(p.x,p.y,18+y%11,12+y%5);g.fillStyle(0xd0d1b2,.6).fillEllipse(p.x-3,p.y-2,11,5);});}
  for(let x=0;x<WORLD.width;x+=19){[t.laneTop,t.laneBottom].forEach((y,i)=>{const p=worldToView(x,y+(Math.sin(x*.1+i)*5));g.fillStyle(0x70973f,.50).fillEllipse(p.x,p.y,24,9);g.lineStyle(1,0xb1c967,.55).lineBetween(p.x-2,p.y,p.x+2,p.y-5);});}
  for(let i=0;i<160;i++){const x=(i*137.3)%WORLD.width,y=t.laneTop+8+(i*43.7)%(t.laneBottom-t.laneTop-16);if(x>t.riverLeft&&x<t.riverRight)continue;const p=worldToView(x,y);g.fillStyle(i%2?0xedd4a0:0x998353,.24).fillEllipse(p.x,p.y,3+i%5,2+i%3);}
  for(let y=24;y<WORLD.height;y+=45){const p=worldToView(t.riverLeft+30+(y*7)%80,y);g.lineStyle(2,0xb9f2e4,.35).lineBetween(p.x,p.y,p.x+28,p.y);}
  const bp=worldToView((t.riverLeft+t.riverRight)/2,(t.bridgeTop+t.bridgeBottom)/2);
  const bridge=this.add.image(bp.x,bp.y+5,'bridge');bridge.setScale(216/bridge.width);
 }
 // Phaser's startFollow snaps the camera onto the target; ease=true keeps the current scroll so the lerp glides there instead (used when resuming after a dead-state pan).
 public followHero(ease=false){this.lookUntil=0;if(this.following)return;this.following=true;const c=this.cameras.main,x=c.scrollX,y=c.scrollY;c.startFollow(this.visuals.get('guardian')!,false,.14,.14,this.followOffset.x,this.followOffset.y);if(ease)c.setScroll(x,y);}
 private cameraBounds={x:0,y:0,width:VIEW_WORLD.width,height:VIEW_WORLD.height};private followOffset={x:0,y:35};
 private applySafeArea(a:{left:number;right:number;top:number;bottom:number}){
  const c=this.cameras.main,w=c.width,h=c.height,pad={l:Math.max(0,a.left),r:Math.max(0,w-a.right),t:Math.max(0,a.top),b:Math.max(0,h-a.bottom)};
  this.cameraBounds={x:-pad.l,y:-pad.t,width:VIEW_WORLD.width+pad.l+pad.r,height:VIEW_WORLD.height+pad.t+pad.b};
  this.followOffset={x:(a.left+a.right)/2-w/2,y:(a.top+a.bottom)/2-h/2};
  c.setBounds(this.cameraBounds.x,this.cameraBounds.y,this.cameraBounds.width,this.cameraBounds.height);
  if(this.following)c.setFollowOffset(this.followOffset.x,this.followOffset.y);
 }
 public getCameraWorld(){const c=this.cameras.main;const p=viewToWorld(c.scrollX,c.scrollY);return {x:p.x,y:p.y,width:c.width/projection.x,height:c.height/projection.y};}
 // Browser verification helper: validated logical position, never sprite coordinates.
 public setHeroPosition(x:number,y:number){if(!this.simulation.teleportHero(x,y))return false;this.syncUnits();this.followHero();return true;}
 private unitVisual(u:Unit):VisualEntity{
  const base=u.kind==='tower'?towerVisual:entities.find(e=>e.kind===u.kind)!,raider=u.archetype==='desert-raider'?{name:'Desert Raider',texture:desertRaiderTexture,width:base.width*desertRaiderScale,height:base.height*desertRaiderScale}:undefined;
  return {...base,...raider,...(u.azureBarracks&&azureBarracksVisual),...(isSiegeTower(u)&&{name:siegeTowerName}),...(isFrostGate(u)&&frostGateVisual),...(isBarracks(u)&&barracksVisual),id:u.id,team:u.team,x:u.x,y:u.y,hp:`${Math.ceil(u.hp)} / ${u.maxHp}`};
 }
 private makeEntity(e:VisualEntity){
  const p=worldToView(e.x,e.y),h=e.height*1.2;const c=this.add.container(p.x,p.y).setDepth(p.y);
  c.add(this.add.ellipse(7,4,e.width*.9,e.width*.24,0x143629,.28));
  if(e.kind==='guardian')c.add(this.add.ellipse(0,0,76,30,0x59ceff,.13).setStrokeStyle(2,BLUE,.9));
  if(e.kind.startsWith('minion'))c.add(this.add.ellipse(0,1,35,13,e.team==='blue'?BLUE:RED,.1).setStrokeStyle(1,e.team==='blue'?BLUE:RED,.7));
  const art=this.add.image(0,4,e.kind==='tower'?towerTexture(e.team):e.texture??e.kind).setOrigin(.5,1);art.setScale(h/art.height);art.setInteractive({useHandCursor:true});art.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,event:Phaser.Types.Input.EventData)=>{event.stopPropagation();if(this.buildingMode||this.shopMenu)return;const u=this.simulation.state.units[e.id]??this.simulation.state.structures[e.id]??this.simulation.state.bases[e.id];if(u?.team==='red')this.simulation.send({type:'target',id:e.id});this.game.events.emit('inspect',u?this.unitVisual(u):e);});c.add(art);
  const w=e.kind.startsWith('base')?94:e.kind==='guardian'?66:e.kind==='tower'||e.texture===frostGateTexture||e.name===barracksVisual.name||e.name===azureBarracksVisual.name?54:33;
  // Keep health renders above world sprites/effects, still below the separate HUD scene.
  const health=e.kind.startsWith('base')?this.add.container(p.x,p.y).setDepth(2700):c;
  if(health!==c)this.keepHealth.set(e.id,{container:health,height:h,width:e.width});
  health.add(this.add.rectangle(0,-h-8,w+4,7,0x10292d));const bar=this.add.rectangle(-w/2,-h-8,w,4,e.team==='blue'?BLUE:RED).setOrigin(0,.5);health.add(bar);this.hpBars.set(e.id,{bar,width:w});
  health.add(this.add.text(-w/2-14,-h-15,e.team==='blue'?'⬟':'◆',{fontSize:'12px',color:e.team==='blue'?'#a5edff':'#ffaea4'}));
  if(e.texture===frostGateTexture||e.name===barracksVisual.name||e.name===azureBarracksVisual.name||e.name===siegeTowerName)c.add(this.add.text(0,-h-24,e.name.toUpperCase(),{fontSize:'11px',fontStyle:'bold',color:'#d6f1ff',stroke:'#14352b',strokeThickness:4}).setOrigin(.5));
  if(e.kind.startsWith('base'))c.add(this.add.text(0,24,e.name.toUpperCase(),{fontSize:'11px',fontStyle:'bold',color:'#fff4cd',stroke:'#14352b',strokeThickness:4}).setOrigin(.5));
  this.visuals.set(e.id,c);
 }
 private syncKeepHealth(){
  const camera=this.cameras.main;
  for(const [id,health] of this.keepHealth){
   const keep=this.simulation.state.bases[id];if(!keep)continue;
   const p=worldToView(keep.x,keep.y);
   // Use the actual current top-panel bounds, including the allocation action.
   // When the roof is behind it, the bar rests on the visible Keep instead.
   let shift=Math.max(0,camera.scrollY+this.hudClearance-(p.y-health.height-15));
   const box=this.shopObstruction,screenY=p.y+shift-health.height-8-camera.scrollY,screenX=p.x-camera.scrollX;
   if(box&&screenX+health.width/2>box.x&&screenX-health.width/2<box.x+box.width&&screenY+8>box.y&&screenY-8<box.y+box.height){const scale=this.game.canvas.getBoundingClientRect().height/540;shift=camera.scrollY+box.y-5/scale+health.height+8-p.y;}
   // A world Keep bar that would sit under the Azure Keep HUD plate drops just below it.
   const k=this.keepHudObstruction,markerY=p.y+shift-health.height-15-camera.scrollY;
   if(k&&screenX+health.width/2>k.x&&screenX-health.width/2<k.x+k.width&&markerY<k.y+k.height&&markerY+12>k.y)shift=camera.scrollY+k.y+k.height+2-(p.y-health.height-15);
   health.container.setPosition(p.x,p.y+shift).setVisible(keep.hp>0&&
    p.x+health.width/2>camera.scrollX&&p.x-health.width/2<camera.scrollX+camera.width&&
    p.y+4>camera.scrollY+this.hudClearance&&p.y-health.height<camera.scrollY+camera.height);
  }
 }
 private drawGrid(){
  this.grid.clear().lineStyle(1,0xa2e4dd,.22);const field=this.simulation.field;
  if(this.buildingMode){for(let col=0;col<40;col++)for(let row=0;row<24;row++){const x=(col+.5)*GRID,y=(row+.5)*GRID;if(inTerritory(field,x,y)){const p=worldToView(x-24,y-24);this.grid.strokeRect(p.x,p.y,GRID,GRID*projection.y);}}
   // Azure Barracks pads that are still free: the only cells a Barracks accepts.
   for(const pad of this.simulation.azurePads)if(!Object.values(this.simulation.state.structures).some(b=>b.col===pad.col&&b.row===pad.row)){const p=worldToView(pad.col*GRID,pad.row*GRID);this.grid.lineStyle(3,0xffd166,.95).strokeRect(p.x+2,p.y+2*projection.y,GRID-4,(GRID-4)*projection.y);}}
  else {for(let x=0;x<=WORLD.width;x+=GRID){const a=worldToView(x,0);this.grid.lineBetween(a.x,0,a.x,VIEW_WORLD.height);}
  for(let y=0;y<=WORLD.height;y+=GRID){const a=worldToView(0,y);this.grid.lineBetween(0,a.y,VIEW_WORLD.width,a.y);}}
  [...field.entities.filter(e=>e.kind!=='guardian'&&!e.kind.startsWith('minion')&&!e.kind.startsWith('base')),...Object.values({...this.simulation.state.units,...this.simulation.state.structures,...this.simulation.state.bases}).map(u=>this.unitVisual(u))].forEach(e=>{const p=worldToView(e.x,e.y);this.grid.lineStyle(2,e.team==='blue'?BLUE:RED,.9);if('columns'in e.footprint){const w=e.footprint.columns*GRID*projection.x,h=e.footprint.rows*GRID*projection.y;this.grid.strokeRect(p.x-w/2,p.y-h/2,w,h);}else this.grid.strokeEllipse(p.x,p.y,e.footprint.radius*2*projection.x,e.footprint.radius*2*projection.y);});
 }
 private syncUnits(){
  const units={...this.simulation.state.units,...this.simulation.state.structures,...this.simulation.state.bases};
  for(const u of Object.values(units)){
   if(!this.visuals.has(u.id))this.makeEntity(this.unitVisual(u));
   const p=worldToView(u.x,u.y),v=this.visuals.get(u.id)!;
   v.setPosition(p.x,p.y).setDepth(p.y).setVisible(u.hp>0).setAlpha(this.simulation.state.structures[u.id]?.progress??1);
   const hp=this.hpBars.get(u.id)!;hp.bar.width=hp.width*u.hp/u.maxHp;
  }
  for(const [id,v] of this.visuals){if((id.startsWith('red-')||id.startsWith('blue-')||id.startsWith('built-'))&&!units[id]){v.destroy();this.visuals.delete(id);this.hpBars.delete(id);}}
  this.drawStatuses();
  if(this.grid.visible)this.drawGrid();
 }
 private castSkill(skill:GuardianSkill,g?:{x:number;y:number;dragged:boolean;startX?:number;startY?:number}){
  const cancel=this.aimCancel();
  if(g?.dragged&&Math.hypot(g.x-cancel.x,g.y-cancel.y)<=cancel.radius){this.game.events.emit('cast-feedback','Cast cancelled');return;}
  const sim=this.simulation,h=sim.hero,c:{type:'cast';requestId:string;skill:GuardianSkill;targetId?:string;direction?:{x:number;y:number};distance?:number}={type:'cast',requestId:'cast-ui-'+(++this.castRequest),skill};
  if(skill==='bash'&&g?.dragged){const world=viewToWorld(g.x+this.cameras.main.scrollX,g.y+this.cameras.main.scrollY);const target=Object.values(sim.state.units).filter(u=>sim.skills.legalTarget(u)&&Math.hypot(u.x-world.x,u.y-world.y)<=24).sort((a,b)=>Math.hypot(a.x-world.x,a.y-world.y)-Math.hypot(b.x-world.x,b.y-world.y)||a.id.localeCompare(b.id))[0];if(!target){this.game.events.emit('cast-feedback','No legal target at aim');return;}c.targetId=target.id;}
  if(skill==='charge'){
   if(g?.dragged){const a=(this.scene.get('HUD') as Phaser.Scene & {abilities:Array<{id:string;x:number;y:number}>}).abilities.find(a=>a.id==='charge')!;c.direction={x:g.x-(g.startX??a.x),y:(g.y-(g.startY??a.y))/projection.y};c.distance=Math.min(guardianRanks.charge.distance[Math.max(0,sim.state.heroProgression.ranks.charge-1)],Math.hypot(c.direction.x,c.direction.y));}
   else {const selected=sim.state.units[sim.state.selectedTarget??''];const target=sim.skills.legalTarget(selected,240)?selected:Object.values(sim.state.units).filter(u=>sim.skills.legalTarget(u,240)).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y)||a.id.localeCompare(b.id))[0];c.direction=target?{x:target.x-h.x,y:target.y-h.y}:this.lastDirection;}
  }
  sim.send(c);
 }
 private drawAim(skill:GuardianSkill,p?:{x:number;y:number},dragged?:boolean,start?:{x:number;y:number}){
  this.skillAim.clear();this.cancelAim.clear();if(!p||!dragged)return;
  const h=worldToView(this.hero.x,this.hero.y),cv=this.aimCancel();
  this.cancelAim.lineStyle(3,0xff9b83,.9).strokeCircle(cv.x,cv.y,cv.radius);
  if(skill==='charge'){const hud=this.scene.get('HUD') as Phaser.Scene & {abilities:Array<{id:string;x:number;y:number}>},a=hud.abilities.find(a=>a.id===skill)!;const dx=p.x-(start?.x??a.x),dy=(p.y-(start?.y??a.y))/projection.y,n=Math.hypot(dx,dy),d=Math.min(n,guardianRanks.charge.distance[Math.max(0,this.simulation.state.heroProgression.ranks.charge-1)]);if(n)this.skillAim.lineStyle(3,0x9deaff,.9).lineBetween(h.x,h.y,h.x+dx/n*d,h.y+dy/n*d*projection.y);}
  else if(skill==='bash'){this.skillAim.lineStyle(2,0x9deaff,.9).strokeEllipse(p.x+this.cameras.main.scrollX,p.y+this.cameras.main.scrollY,48,48*projection.y);}
 }
 private drawStatuses(){
  this.zoneArt.clear();for(const z of this.simulation.state.skills.zones){const p=worldToView(z.x,z.y);this.zoneArt.fillStyle(0x86edcc,.08).fillEllipse(p.x,p.y,384,384*projection.y);this.zoneArt.lineStyle(3,0x86edcc,.8).strokeEllipse(p.x,p.y,384,384*projection.y);}
  for(const u of Object.values(this.simulation.state.units)){const active=(u.statuses??[]).map(s=>s.type.toUpperCase());if(u.shield&&u.shield.remaining>0)active.push('SHIELD '+Math.ceil(u.shield.remaining));let label=this.statusTexts.get(u.id);if(!label){label=this.add.text(0,0,'',{fontSize:'14px',color:'#c8fff0',stroke:'#102431',strokeThickness:3}).setOrigin(.5).setDepth(2600);this.statusTexts.set(u.id,label);}const p=worldToView(u.x,u.y);label.setPosition(p.x,p.y-(u.kind==='guardian'?135:85)).setText(active.join(' · ')).setVisible(u.hp>0&&active.length>0);}
  for(const [id,text] of this.statusTexts)if(!this.simulation.state.units[id]){text.destroy();this.statusTexts.delete(id);}
 }
 private effect(key:string){if(this.frozen)return;this.castCount++;const p=worldToView(this.hero.x,this.hero.y);const colors:Record<string,number>={bash:0x7cdcff,taunt:0xffc56a,charge:0xb8f4ff,zone:0x86edcc,attack:0xffdd8e};const g=this.add.graphics().setPosition(p.x,p.y).setDepth(p.y+1);g.lineStyle(key==='zone'?4:3,colors[key],.9).strokeEllipse(0,0,key==='zone'?240:110,key==='zone'?140:60);this.tweens.add({targets:g,alpha:0,scaleX:1.7,scaleY:1.7,duration:600,onComplete:()=>g.destroy()});}
 private combatUnit(id:string){const s=this.simulation.state;return s.units[id]??s.structures[id]??s.bases[id];}
 private clearDamageFeedback(){this.damageFeedback.clear(false);this.damageArt.clear();this.selectedRange.clear();this.inspectedTower=undefined;for(const text of this.guardianDamageTexts){this.tweens.killTweensOf(text);text.destroy();}this.guardianDamageTexts.clear();this.game.events.emit('guardian-feedback-clear');}
 private drawDamageFeedback(){
  const g=this.damageArt.clear(),s=this.selectedRange.clear(),now=this.elapsed;
  this.damageFeedback.expire(now,id=>this.combatUnit(id));
  for(const trace of this.damageFeedback.traces){
   const source=this.combatUnit(trace.sourceId)!,target=this.combatUnit(trace.targetId)!;
   const a=worldToView(source.x,source.y),b=worldToView(target.x,target.y),alpha=(trace.until-now)/damageFeedbackTiming.trace;
   // A static connection fading after the resolved strike, not a traveling projectile.
   g.lineStyle(5,0x562a2c,alpha*.7).lineBetween(a.x,a.y-105,b.x,b.y-48);
   g.lineStyle(2,RED,alpha).lineBetween(a.x,a.y-105,b.x,b.y-48);
  }
  if(this.hero.hp>0&&this.damageFeedback.impactUntil>now){const p=worldToView(this.hero.x,this.hero.y),alpha=(this.damageFeedback.impactUntil-now)/damageFeedbackTiming.impact;g.lineStyle(3,RED,alpha*.8).strokeEllipse(p.x,p.y-3,84,34);}
  const tower=this.inspectedTower&&this.combatUnit(this.inspectedTower.id);
  if(tower?.kind==='tower'&&tower.hp>0&&this.inspectedTower!.until>now){const p=worldToView(tower.x,tower.y);s.lineStyle(2,tower.team==='blue'?BLUE:RED,.55).strokeEllipse(p.x,p.y,tower.range*2*projection.x,tower.range*2*projection.y);}
  else this.inspectedTower=undefined;
 }
 private presentCombatEvent(event:GameEvent){
  if(this.frozen)return;
  const feedback=this.damageFeedback.observe(event,this.elapsed,id=>this.combatUnit(id));
  if(feedback.notice)this.game.events.emit('tower-danger');
  if(feedback.impact)this.game.events.emit('guardian-impact');
  if(event.type==='attack'){
   const u=this.combatUnit(event.id);
   // The trace replaces only the redundant hostile tower→Guardian range flash.
   if(u&&!(u.kind==='tower'&&u.team!==this.hero.team&&event.targetId===this.hero.id)){
    const p=worldToView(u.x,u.y),g=this.add.graphics().setPosition(p.x,p.y).setDepth(p.y+1);
    g.lineStyle(3,u.team==='blue'?0xffdd8e:RED,.9).strokeEllipse(0,0,u.range*2,u.range*1.44);this.tweens.add({targets:g,alpha:0,duration:200,onComplete:()=>g.destroy()});
   }
  }
  if(event.type==='damage'&&event.amount>0){const u=this.combatUnit(event.id);if(u&&(u.id!==this.hero.id||u.hp>0)){const p=worldToView(u.x,u.y),text=this.add.text(p.x,p.y-80,`${event.critical?'CRIT ':''}-${Math.ceil(event.amount)}`,{fontSize:'18px',color:event.critical?'#f4d58e':'#fff3d3',stroke:'#10292d',strokeThickness:3}).setOrigin(.5).setDepth(2600);if(u.id===this.hero.id)this.guardianDamageTexts.add(text);this.tweens.add({targets:text,y:text.y-28,alpha:0,duration:450,onComplete:()=>{this.guardianDamageTexts.delete(text);text.destroy();}});}}
  if(event.type==='match-end'||(event.type==='death'||event.type==='respawn')&&event.id==='guardian')this.clearDamageFeedback();
 }
 update(_time:number,delta:number){
  if(this.blocked||this.frozen||innerHeight>innerWidth)return;
  this.elapsed+=Math.min(delta,100);const dead=this.hero.hp<=0;
  let dx=this.stick.x,dy=this.stick.y;const k=this.keys;
  if(k){dx+=(k.D.isDown||k.RIGHT.isDown?1:0)-(k.A.isDown||k.LEFT.isDown?1:0);dy+=(k.S.isDown||k.DOWN.isDown?1:0)-(k.W.isDown||k.UP.isDown?1:0);}
  if(this.buildingMode||this.skillMenu||this.shopMenu){dx=0;dy=0;}
  const moving=!!(dx||dy),camera=cameraAction({dead,wasDead:this.wasDead,moving,lookExpired:!this.buildingMode&&!!this.lookUntil&&this.elapsed>this.lookUntil}),resumed=this.wasDead;this.wasDead=dead;
  if(camera==='follow')this.followHero(resumed);
  else if(camera==='pan'){const c=this.cameras.main,p=deadPan({x:c.scrollX,y:c.scrollY},{x:dx,y:dy},delta,this.cameraBounds,c);this.following=false;this.lookUntil=0;c.stopFollow().setScroll(p.x,p.y);}
  if(moving&&!dead){const n=Math.hypot(dx,dy);this.lastDirection={x:dx/n,y:dy/n};}
  this.simulation.send({type:'move',x:dx,y:dy});this.simulation.advance(delta);this.syncUnits();
  if(this.placement){const {kind,col,row}=this.placement,p=worldToView((col+.5)*GRID,(row+.5)*GRID),reason=this.simulation.placementReason(kind,col,row);this.placementArt.setTexture(kind==='tower'?'tower':kind==='barracks'?azureBarracksVisual.texture:'wall');if(kind==='barracks')this.placementArt.setScale(azureBarracksVisual.height*1.2/this.placementArt.height);else this.placementArt.setDisplaySize(kind==='tower'?76:47,kind==='tower'?142:60);this.placementArt.setPosition(p.x,p.y+4).setVisible(true).setTint(reason?0xff7976:0x70ffb0);this.placementGrid.clear().lineStyle(3,reason?RED:0x70ffb0).strokeRect(p.x-24,p.y-24*projection.y,48,48*projection.y);if(kind==='tower')this.placementGrid.lineStyle(1,0x70d7ff,.5).strokeEllipse(p.x,p.y,480,480*projection.y);this.game.events.emit('placement-status',reason||'Valid placement - confirm to build');}
  for(const event of this.simulation.drainEvents()){
   if(event.type==='preview')this.effect(event.key);
   if(event.type==='cast-effect')this.effect(event.skill);
   this.presentCombatEvent(event);
   if(event.type==='match-end')this.recordMatchEnd();
   if(event.type==='match-end'){this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.buildingMode=false;this.placement=undefined;this.game.events.emit('clear-controls');}
   if(event.type==='death'&&event.id==='guardian'){this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.game.events.emit('clear-controls');}
   this.game.events.emit('simulation-event',event);
  }
  this.drawDamageFeedback();
 }
}

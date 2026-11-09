import {AudioManager} from '../audio/AudioManager';
import {BattleAudio} from '../audio/BattleAudio';
import {preloadAudio} from '../audio/audioAssets';
import {buildings,type BuildingKind} from '../data/buildings';
import { controlLayout } from '../ui/controlLayout';
import {cameraAction,deadPan} from '../ui/cameraPan';
import Phaser from 'phaser';
import { entities, towerVisual, GRID, projection, terrain, VIEW_WORLD, WORLD, viewToWorld, worldToView, type VisualEntity } from '../world/layout';
import type {Barrier,Battlefield} from '../world/battlefield';
import {battlefieldArt,dryFoliagePixels,propArt,visibleRect,type BattlefieldArt} from '../world/battlefieldArt';
import {battlefieldFromSearch} from '../world/battlefieldLaunch';
import { Simulation } from '../simulation/Simulation';
import {applySoldierTest,soldierTestFromSearch} from '../data/soldierTest';
import {withTavernTest} from '../data/tavernTest'; // PROTOTYPE Chapter 5 Phase 1B
import {allyTestFromSearch,applyAllyTest} from '../data/allyTest'; // PROTOTYPE Chapter 5 Phase 0
import {applyBarracksTest,barracksTestFromSearch,barracksTestSetup} from '../data/barracksTest';
import {guardianRanks} from '../data/guardian';
import {skillRules,type GuardianSkill} from '../data/progression';
import {HZ} from '../simulation/Clock';
import {stunned} from '../simulation/Statuses';
import {chargeContactOn} from '../simulation/GuardianSkills';
import {GF,GUARDIAN_SHEET,faceToward,guardianPose,nextFacing,type Facing,type GuardianPoseInput} from '../world/guardianSprite';
import {ELITE_SHEET,HERO_SHEET,ROLAND_SHEET,SF,soldierStride,SOLDIER_MOTION,SOLDIER_SHEET,corpsePose,soldierGeometry,nextSoldierFacing,soldierFaceToward,soldierPose,walkPhase} from '../world/soldierSprite';
import {CF,WARCART_SHEET,warCartCorpsePose,warCartPose,warCartWreckAlpha} from '../world/warCartSprite';
import {BARRACKS_SHEET,BF,barracksCollapsePose,barracksFrame,recruiterOf} from '../world/barracksSprite';
import {TAVERN_SHEET,TV,tavernCollapsePose,tavernFrame} from '../world/tavernSprite';
import {BALLISTA_MOTION,BALLISTA_SHEET,BAF,ballistaBaseFrame,ballistaCollapsePose,ballistaFaceToward,ballistaPose,type BallistaFacing} from '../world/ballistaSprite';
import {WALL_MOTION,WALL_SHEET,WF,atGateRow,gatePasser,gateRowFrame,wallCollapsePose,wallFrame,type GateRow} from '../world/wallSprite';
import {TF,TOWER_MOTION,TOWER_SHEET,collapsePose,towerArcherFrame,towerArcherPose,towerBodyFrame,towerFaceToward,type Facing as TowerFacing} from '../world/towerSprite';
import {aimDirection,bashAim,chargeAim,inCancel} from '../ui/skillAim';
import type { GameEvent, Unit } from '../simulation/GameState';
import {DamageFeedback,damageFeedbackTiming} from '../ui/damageFeedback';
import {isEncounterId,parseLaneSeed,type EncounterId} from '../data/encounters';
import {activeCombatVariant,combatVariantFromSearch} from '../data/gameplayV041';
import {crimsonTowerPixels,towerTexture} from '../world/towerAppearance';
import {desertRaiderPixels,desertRaiderScale,desertRaiderTexture} from '../world/desertRaiderAppearance';
import {marshalScale,shadowbladePixels,shadowbladeScale,shadowbladeTexture} from '../world/commanderAppearance';
import {eliteScale,warlordScale} from '../world/crimsonEliteAppearance';
import {azureBarracksVisual,barracksVisual,isSiegeTower,siegeTowerName,frostGatePixels,frostGateRowOffset,frostGateTexture,frostGateVisual,isBarracks,isFrostGate} from '../world/frostGateAppearance';
import {bannerVisual,bannerTexture,drawBannerTexture} from '../world/bannerAppearance';
import {ballistaTexture,ballistaVisual,cliffGatePixels,cliffGateRowOffset,cliffGateRows,cliffGateTexture,cliffGateVisual,drawBallistaRuin,drawBallistaTexture,isThroneGate,throneGateName} from '../world/cliffArt';
import {campaign} from '../data/campaignLevels';
import type {LevelDefinition} from '../data/campaign';
import type {BattleLaunch} from '../data/campaignUi';
import {campaignDestination} from '../data/campaignNavigation';
import {matchSetup} from '../data/matchSetup';
import {campaignProgress,type VictoryRecord} from '../data/campaignProgressStore';
import {achievements} from '../data/achievementStore';
import {isBallistaRepair} from '../data/achievements';
import {isSequential} from '../data/campaignProgress';
import {raiderId} from '../data/combat';
import {heroIdle,targeting,type HeroCommandState} from '../ui/heroCommand';
import {orderColor} from '../ui/HeroBar';
import {mercenaryTexture} from '../data/mercenaries';
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
// Chapter 4 M4: the two Gatehouses are named by id and by owner (a captured one stands open until it is repaired).
const gatehouseName=(u:Unit)=>{const base=u.id==='red-forward-gate'?'Forward Gatehouse':u.id==='red-main-gate'?'Main Gatehouse':undefined;return base&&(u.team==='blue'?`Azure ${base}`:u.open?`Captured ${base}`:base);};
export class Battle extends Phaser.Scene {
 private visuals=new Map<string,Phaser.GameObjects.Container>();private visualKeys=new Map<string,string>();
 private grid!:Phaser.GameObjects.Graphics;
 public simulation=new Simulation();
 public audio!:AudioManager;private battleAudio!:BattleAudio;
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
 // Chapter 5 Hero Command HUD: the HUD's command state (setHeroCommand), whether target mode panned the camera, and the world markers it draws.
 private heroCmd:HeroCommandState=heroIdle;private heroPanned=false;private heroMarks!:Phaser.GameObjects.Graphics;
 private castRequest=0;private matchSequence=0;private lastDirection?:{x:number;y:number};private skillAim!:Phaser.GameObjects.Graphics;private cancelAim!:Phaser.GameObjects.Graphics;private zoneArt!:Phaser.GameObjects.Graphics;private statusTexts=new Map<string,Phaser.GameObjects.Text>();
 // Guardian V1.0 sprite animation (src/world/guardianSprite.ts): what the pose needs from the events and the last frames; reset with the visuals in create().
 private guardianArt?:Phaser.GameObjects.Image;private gs=Battle.guardianState();
 // Soldier V1.0 sprite animation (src/world/soldierSprite.ts): each animated soldier's art and pose memory, the bodies of the fallen, and the soldiers that left
 // the state this frame (their death event follows in the same update); reset with the visuals in create().
 private soldiers=new Map<string,{cart?:boolean;art:Phaser.GameObjects.Image;frame:number;facing:Facing;drift:number;turnAt:number;x:number;y:number;travelled:number;movedAt:number;attackAt?:number;attackWindup:number;targetId?:string;hurtAt?:number}>();
 private corpses:{art:Phaser.GameObjects.Image;at:number;frame:number;fadeFrom?:number;cart?:boolean}[]=[];private soldiersGone=new Map<string,{x:number;y:number;depth:number;key:string;scale:number;facing:Facing;cart?:boolean}>();
 // War Cart V1.0 (src/world/warCartSprite.ts): the wreck's picture on its site (one at a time, as the simulation's cartWreck) and when the simulation made it
 private cartWreckArt?:Phaser.GameObjects.Image;private cartWreckAt=-1e9;
 // Tower V1.0 sprite animation (src/world/towerSprite.ts): each animated tower's building and archer and their pose memory, the collapsing towers, and the
 // towers that left the state this frame (their death event follows in the same update); seen: every id drawn from the state, so any of them that leaves it
 // loses its visual (not only the red-/blue-/built-/c4- ones); reset with the visuals in create().
 private towers=new Map<string,{body:Phaser.GameObjects.Image;archer:Phaser.GameObjects.Image;bodyFrame:number;archerFrame:number;facing:TowerFacing;turnAt:number;shotAt?:number;targetAt:number}>();
 private collapses:{art:Phaser.GameObjects.Image;at:number;frame:number;pose?:typeof collapsePose}[]=[];private barracks=new Map<string,{art:Phaser.GameObjects.Image;frame:number;recruitAt?:number}>();private barracksGone=new Map<string,{x:number;y:number;depth:number;key:string;scale:number}>();private taverns=new Map<string,{art:Phaser.GameObjects.Image;frame:number;hireAt?:number;returnAt?:number}>();private tavernsGone=new Map<string,{x:number;y:number;depth:number;key:string;scale:number}>();
 // Ballista V1.0 (src/world/ballistaSprite.ts): each animated Ballista's base and firing mechanism and their pose memory, and the Ballistas that left the state this frame.
 private ballistas=new Map<string,{base:Phaser.GameObjects.Image;mech:Phaser.GameObjects.Image;baseFrame:number;mechFrame:number;facing:BallistaFacing;turnAt:number;shotAt?:number}>();private ballistasGone=new Map<string,{x:number;y:number;depth:number;key:string;scale:number}>();
 private towersGone=new Map<string,{x:number;y:number;depth:number;key:string;scale:number}>();private seen=new Set<string>();
 // Wall V1.0 sprite animation (src/world/wallSprite.ts): each animated wall's segment images (one per row of the old stacked texture, north first, each at its
 // own depth outside the container) and their frames and gate-opening memory; the collapsing segments; the walls that left the state this frame (their
 // death event follows in the same update). The still stays in the container, hidden, so the visual's bounds (Hero pick area) are the still's.
 private walls=new Map<string,{rows:Phaser.GameObjects.Image[];frames:number[];gate:GateRow[];step:number;still:Phaser.GameObjects.Image}>();
 private wallCollapses:{art:Phaser.GameObjects.Image;at:number;index:number;last:number;frame:number}[]=[];private wallsGone=new Map<string,{rows:{x:number;y:number;depth:number;frame:number}[];key:string;scale:number}>();
 private static guardianState(){return {facing:-1 as Facing,drift:0,turnAt:-1e9,x:NaN,y:NaN,travelled:0,movedAt:-1e9,attackAt:undefined as number|undefined,attackWindup:200,targetId:undefined as string|undefined,cast:undefined as GuardianPoseInput['cast'],castTargetId:undefined as string|undefined,hurtAt:undefined as number|undefined,deadAt:undefined as number|undefined,respawnAt:undefined as number|undefined,aimX:undefined as number|undefined,dustAt:-1e9};}
 public placement?:{kind:BuildingKind;col:number;row:number};
 private placementArt!:Phaser.GameObjects.Image;
 private placementGrid!:Phaser.GameObjects.Graphics;
 private postArt!:Phaser.GameObjects.Graphics;private postTexts:Phaser.GameObjects.Text[]=[];private siteArt!:Phaser.GameObjects.Graphics;private siteTexts:Phaser.GameObjects.Text[]=[]; // Chapter 4 M1: the Forest Camp's ownership ring, capture point and ruin
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
 // Achievement V1: a Ballista repair finished during this match (set by the construction-complete event, so a Ballista that stood from the start or was never repaired does not count).
 private ballistaRepaired=false;private warCartRepaired=false;private eliteBarracksRepaired=false; // Chapter 4 M4: set by the simulation's site events (a finished repair only)
 constructor(){super('Battle');}
 init(data?:BattleLaunch){
  this.launch=data?.mode?data:{mode:'quick',encounter:encounterFromUrl()};
  campaignProgress.refresh();
  if(this.launch.mode==='campaign')this.launch={...this.launch,returnTo:campaignDestination(campaign.list(),campaignProgress.progress,this.launch.levelId,this.launch.returnTo)};
  const named=this.launch.mode==='campaign'&&campaign.has(this.launch.levelId)?campaign.get(this.launch.levelId):null;
  const debug=(import.meta.env.DEV||import.meta.env.VITE_PLAYTEST==='1')&&this.launch.mode==='campaign'&&this.launch.debug===true; // dev-only debug launch: skips the unlock check and records nothing
  this.blocked=this.launch.mode==='campaign'&&(!named||(!debug&&!campaignProgress.isUnlocked(named)));
  this.campaignLevel=this.blocked?null:named;
  // A mission opened only by ?unlock=all (not unlocked by the real progress) records neither progress nor achievements.
  this.recordsProgress=!!this.campaignLevel&&isSequential(this.campaignLevel)&&!stagedFixture()&&!debug&&campaignProgress.progress.isUnlocked(this.campaignLevel);this.progressRecorded=false;this.progressResult=null;this.ballistaRepaired=false;this.warCartRepaired=false;this.eliteBarracksRepaired=false;
 }
 preload(){
  preloadAudio(this);
  for(const key of ['grass','path','water','bridge','trees','rocks','bush','guardian','minion-blue','minion-red','crimson-warlord','crimson-elite','base-blue','base-red','tower','wall','barracks-azure','barracks-crimson','tavern','hero-roland','hero-borin','hero-kael'])this.load.image(key,`${import.meta.env.BASE_URL}assets/${key}.png`);
  this.load.atlas(GUARDIAN_SHEET.key,`${import.meta.env.BASE_URL}assets/${GUARDIAN_SHEET.file}.png`,`${import.meta.env.BASE_URL}assets/${GUARDIAN_SHEET.file}.json`); // Guardian V1.0 animation; the still 'guardian' stays for portraits and the test ally
  for(const key of [SOLDIER_SHEET.azure,SOLDIER_SHEET.crimson,ELITE_SHEET.key,HERO_SHEET.key,ROLAND_SHEET.key])this.load.atlas(key,`${import.meta.env.BASE_URL}assets/${key}.png`,`${import.meta.env.BASE_URL}assets/${key}.json`); // Soldier V1.0 animation: the Azure master and its Crimson recolour
  this.load.atlas(TOWER_SHEET.azure,`${import.meta.env.BASE_URL}assets/${TOWER_SHEET.azure}.png`,`${import.meta.env.BASE_URL}assets/${TOWER_SHEET.azure}.json`); // Tower V1.0 animation: the Azure master (the still 'tower' stays for the placement preview)
  this.load.atlas(BARRACKS_SHEET.azure,`${import.meta.env.BASE_URL}assets/${BARRACKS_SHEET.azure}.png`,`${import.meta.env.BASE_URL}assets/${BARRACKS_SHEET.azure}.json`);this.load.atlas(TAVERN_SHEET.key,`${import.meta.env.BASE_URL}assets/${TAVERN_SHEET.key}.png`,`${import.meta.env.BASE_URL}assets/${TAVERN_SHEET.key}.json`); // Tavern V1.0 animation (the still 'tavern' stays for the placement preview) // Barracks V1.0 animation: the Azure master (the still 'barracks-azure' stays for the placement preview; the Crimson Barracks keeps its still)
  for(const key of [WARCART_SHEET.crimson,WARCART_SHEET.azure])this.load.atlas(key,`${import.meta.env.BASE_URL}assets/${key}.png`,`${import.meta.env.BASE_URL}assets/${key}.json`); // War Cart V1.0: the Crimson cart and its Azure recolour
  this.load.atlas(BALLISTA_SHEET.key,`${import.meta.env.BASE_URL}assets/${BALLISTA_SHEET.key}.png`,`${import.meta.env.BASE_URL}assets/${BALLISTA_SHEET.key}.json`); // Ballista V1.0 animation: the Azure Ballista's base and mechanism (the canvas texture stays for the War Cart)
  this.load.atlas(WALL_SHEET.wood,`${import.meta.env.BASE_URL}assets/${WALL_SHEET.wood}.png`,`${import.meta.env.BASE_URL}assets/${WALL_SHEET.wood}.json`); // Wall V1.0 animation: the wooden segment master (the still 'wall' stays for the placement preview, the Build panel and the tap box)
  this.load.on('loaderror',(f:Phaser.Loader.File)=>{if(f.type==='audio')return;const e=document.getElementById('error')!;e.style.display='block';e.textContent=`Missing asset: ${f.key}`;});
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
  if(!this.textures.exists(shadowbladeTexture)){ // Chapter 4 M6: the Shadowblade's violet recolour of the Crimson minion art
   const source=this.textures.get('minion-red').getSourceImage() as HTMLImageElement;
   const texture=this.textures.createCanvas(shadowbladeTexture,source.width,source.height)!;
   const context=texture.context;context.drawImage(source,0,0);
   const image=context.getImageData(0,0,source.width,source.height);
   shadowbladePixels(image.data);context.putImageData(image,0,0);texture.refresh();
  }
  this.recolourAtlas(SOLDIER_SHEET.desert,desertRaiderPixels);this.recolourAtlas(SOLDIER_SHEET.shadowblade,shadowbladePixels); // the Desert Raider's and the Shadowblade's animated sheets: their own recolours of the Crimson sheet
  this.recolourAtlas(TOWER_SHEET.crimson,crimsonTowerPixels,TOWER_SHEET.azure); // the Crimson (and Siege) Tower's animated sheet: the still's recolour of the Azure sheet
  this.recolourAtlas(WALL_SHEET.ice,frostGatePixels,WALL_SHEET.wood);this.recolourAtlas(WALL_SHEET.ironwood,cliffGatePixels,WALL_SHEET.wood); // the Frost Gate's and the Cliff / Throne Gate's (and Gatehouses') segment sheets: the stacked stills' own recolours
  if(!this.textures.exists(frostGateTexture)){
   const source=this.textures.get('wall').getSourceImage() as HTMLImageElement,height=source.height+frostGateRowOffset;
   const texture=this.textures.createCanvas(frostGateTexture,source.width,height)!;
   const context=texture.context;context.drawImage(source,0,0);context.drawImage(source,0,frostGateRowOffset);
   const image=context.getImageData(0,0,source.width,height);
   frostGatePixels(image.data);context.putImageData(image,0,0);texture.refresh();
  }
  if(!this.textures.exists(bannerTexture))drawBannerTexture(this.textures.createCanvas(bannerTexture,64,120)!);
  if(!this.textures.exists(ballistaTexture))drawBallistaTexture(this.textures.createCanvas(ballistaTexture,96,96)!);
  if(!this.textures.exists(cliffGateTexture)){ // Chapter 4 M2: the faction gate, the wall sprite stacked three rows high and recoloured
   const source=this.textures.get('wall').getSourceImage() as HTMLImageElement,height=source.height+(cliffGateRows-1)*cliffGateRowOffset;
   const texture=this.textures.createCanvas(cliffGateTexture,source.width,height)!;
   const context=texture.context;for(let i=0;i<cliffGateRows;i++)context.drawImage(source,0,i*cliffGateRowOffset);
   const image=context.getImageData(0,0,source.width,height);cliffGatePixels(image.data);context.putImageData(image,0,0);texture.refresh();
  }
  const staged=stagedFixture();
  const setup=staged?matchSetup('extended',{defenders:['red-tower-front-north','red-tower-front-center'],waves:{firstWaveTick:9000},crimsonKeepArmed:false,mission:{waveMode:'scripted',phases:[
   {id:'breach',display:{label:'Breach'},objectives:[{id:'north',type:'destroy',targets:['red-tower-front-north'],display:{label:'Destroy North Guard'}}]},
   {id:'advance',display:{label:'Advance'},objectives:[{id:'center',type:'destroy',targets:['red-tower-front-center'],display:{label:'Destroy Center Guard'}}]},
  ]}}):this.campaignLevel?campaign.setup(this.campaignLevel.id,freshLaneSeed()):this.launch.mode==='quick'?quickSetup(this.launch.encounter??encounterFromUrl()):encounterFromUrl();
  this.stick={x:0,y:0};const barracksTest=!!this.campaignLevel&&barracksTestFromSearch(location.search,import.meta.env.DEV);this.simulation=new Simulation(`match-${++this.matchSequence}`,withTavernTest(barracksTest&&typeof setup!=='string'?barracksTestSetup(setup):setup,location.search,import.meta.env.DEV&&!!this.campaignLevel),undefined,combatVariantFromUrl());if(barracksTest){applyBarracksTest(this.simulation);document.title='BARRACKS TEST';}{const leash=this.campaignLevel?soldierTestFromSearch(location.search,import.meta.env.DEV):null;if(leash){applySoldierTest(this.simulation,leash);document.title=`SOLDIER TEST ${leash}`;}}{const ally=this.campaignLevel?allyTestFromSearch(location.search,import.meta.env.DEV):null;if(ally){applyAllyTest(this.simulation,ally);document.title=`ALLY TEST ${ally}`;}}this.castRequest=0;this.lastDirection=undefined;this.statusTexts.clear();this.visuals.clear();this.guardianArt=undefined;this.gs=Battle.guardianState();this.soldiers.clear();this.corpses=[];this.soldiersGone.clear();this.towers.clear();this.collapses=[];this.towersGone.clear();this.walls.clear();this.wallCollapses=[];this.wallsGone.clear();this.barracks.clear();this.barracksGone.clear();this.taverns.clear();this.tavernsGone.clear();this.ballistas.clear();this.ballistasGone.clear();this.cartWreckArt=undefined;this.cartWreckAt=-1e9;this.seen.clear();this.hpBars.clear();this.keepHealth.clear();this.frozen=false;this.elapsed=0;this.following=false;this.wasDead=false;this.castCount=0;
  this.audio=new AudioManager(this);this.battleAudio=new BattleAudio(this.audio);
  this.audio.setBackground(document.hidden);
  const audioVisibility=()=>this.audio.setBackground(document.hidden);document.addEventListener('visibilitychange',audioVisibility);this.cleanup.push(()=>document.removeEventListener('visibilitychange',audioVisibility));
  this.heroMarks=this.add.graphics().setDepth(2596);this.heroCmd=heroIdle;this.heroPanned=false;this.skillAim=this.add.graphics().setDepth(2590);this.cancelAim=this.add.graphics().setDepth(2591).setScrollFactor(0);this.zoneArt=this.add.graphics().setDepth(2501);
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
  this.postArt=this.add.graphics().setDepth(3);this.postTexts=[];this.siteArt=this.add.graphics().setDepth(3);this.siteTexts=[]; // Chapter 5 M5: a mission with camps and a War Cart draws the wreck ring on its own layer (the camp labels use postArt and postTexts)
  field.entities.filter(e=>!e.kind.startsWith('minion')).forEach(e=>{this.makeEntity(e);this.visualKeys.set(e.id,e.team);}); // the key syncUnits compares: without it the first sync destroys the Guardian's visual, and the camera (started on it just below) follows the dead sprite until Build mode restarts the follow
  this.drawGrid();
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
  this.listen('stick',(x:number,y:number)=>{this.stick={x,y};if(x||y)this.followHero(true);});
  this.listen('grid',(show:boolean)=>this.grid.setVisible(show));
  this.listen('pause-visual',(v:boolean)=>{this.audio.setPaused(v);this.frozen=v;this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.simulation.setPaused(v);this.tweens.timeScale=v?0:1;if(v)this.clearDamageFeedback();});
  this.listen('time-scale',(v:number)=>this.simulation.setTimeScale(v));
  this.listen('cast',(key:string,gesture?:{x:number;y:number;dragged:boolean;startX?:number;startY?:number})=>{if(this.buildingMode||this.skillMenu||this.shopMenu)return;if(key==='attack')this.simulation.send({type:'attack'});else this.castSkill(key as GuardianSkill,gesture);});
  this.listen('skill-aim',(key:GuardianSkill,p?:{x:number;y:number},dragged?:boolean,start?:{x:number;y:number})=>this.drawAim(key,p,dragged,start));
  this.listen('clear-controls',()=>{this.skillAim.clear();this.cancelAim.clear();});
  this.listen('reset-view',()=>this.followHero());
  this.listen('focus-map',(x:number,y:number)=>{const p=worldToView(x,y);this.following=false;this.cameras.main.stopFollow().centerOn(p.x,p.y);this.lookUntil=this.elapsed+2200;});
  this.dom(window,'blur',()=>this.game.events.emit('request-pause'));
  this.dom(document,'visibilitychange',()=>{if(document.hidden)this.game.events.emit('request-pause');});
  this.dom(window,'resize',()=>{if(innerHeight>innerWidth)this.game.events.emit('request-pause');});
  this.events.once('shutdown',()=>{this.audio.dispose();this.simulation.setPaused(true);this.cleanup.splice(0).forEach(f=>f());this.scene.stop('HUD');window.visualReady=false;});
  this.scene.launch('HUD');window.visualReady=true;
 }
 // Authoritative Victory from the Simulation, before the HUD (which hears the event next) builds its result screen. Defeat, Retry, Pause and
 // Quit never reach this; a repeated match-end for the same match records nothing more.
 private recordMatchEnd(){
  if(!this.recordsProgress||this.progressRecorded||this.simulation.outcome?.outcome!=='victory'||!this.campaignLevel)return;
  this.progressRecorded=true;this.progressResult=campaignProgress.recordVictory(this.campaignLevel);
  // Same gate as progress (never a debug or fixture run): the victory tick is the simulation's own.
  achievements.record({levelId:this.campaignLevel.id,victory:true,ticks:this.simulation.outcome.tick,ballistaRepaired:this.ballistaRepaired,warCartRepaired:this.warCartRepaired,eliteBarracksRepaired:this.eliteBarracksRepaired});
 }
 private listen(event:string,fn:(...args:any[])=>void){this.game.events.on(event,fn);this.cleanup.push(()=>this.game.events.off(event,fn));}
 private dom(target:Window|Document,event:string,fn:()=>void){target.addEventListener(event,fn);this.cleanup.push(()=>target.removeEventListener(event,fn));}
 // The battlefield whose art this scene drew; browser verification compares it with simulation.field.
 public renderedFieldId='';
 private createTerrain(){
  const field=this.simulation.field,art=battlefieldArt(field.id);this.renderedFieldId=field.id;
  if(art.terrain==='meadow')this.createMeadowTerrain();else if(art.terrain==='forest')this.createForestTerrain(field,art);else if(art.terrain==='oasis')this.createOasisTerrain(field,art);else this.createCanyonTerrain(field,art); // canyon and frozen
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
  for(const t of art.trails??[]){const w=(t.x1-t.x0)*projection.x,h=v(t.y1-t.y0);rect(t.x0-12,t.y0-12,t.x1-t.x0+24,t.y1-t.y0+24,T(0xc99a62),.45);rect(t.x0-5,t.y0-5,t.x1-t.x0+10,t.y1-t.y0+10,T(0xdcb57e),.8);if(art.ground===undefined)this.add.tileSprite(t.x0*projection.x,v(t.y0),w,h,'path').setOrigin(0).setTileScale(.35,.35).setTint(T(0xf6dcab));else this.add.rectangle(t.x0*projection.x,v(t.y0),w,h,T(0xf6dcab)).setOrigin(0);} // Chapter 4 M4/M5: painted trails under the barriers (the Fortress approach lane, the Canyon Basin roads)
  g=this.add.graphics();
  for(let i=0;i<220;i++){const x=(i*137.3)%WORLD.width,y=(i*71.9)%WORLD.height,p=worldToView(x,y);if(field.barriers.some(b=>x>b.x0-8&&x<b.x1+8&&y>b.y0-8&&y<b.y1+8))continue;g.fillStyle(i%3?T(0x9c6a3c):T(0xf0d2a0),.28).fillEllipse(p.x,p.y,4+i%6,2+i%3);}
  // Chapter 3 M5: Deep Snow drawn on its own rectangle (the slow-zone edge), under the barriers, with flecks so the boundary reads.
  for(const z of field.slowZones??[]){const r=visibleRect({x0:z.x0,y0:z.y0,x1:z.x1,y1:z.y1,reason:'Deep Snow'}),x=r.x*projection.x,y=v(r.y),w=r.width*projection.x,h=v(r.y+r.height)-y;g.fillStyle(0xeaf4fb,.4).fillRect(x,y,w,h);g.lineStyle(3,0xffffff,.55).strokeRect(x+1,y+1,w-2,h-2);for(let i=0;i<Math.floor(w*h/1500);i++){const px=x+10+(i*53.7)%Math.max(1,w-20),py=y+8+(i*29.3)%Math.max(1,h-16);g.fillStyle(0xffffff,.45).fillEllipse(px,py,10+i%4*4,4+i%3*2);}}
  for(const b of field.barriers){
   const r=visibleRect(b),x0=r.x*projection.x,w=r.width*projection.x,top=v(r.y),bottom=v(r.y+r.height);
   if(b.look==='wall'){this.fortressWall(b,T);continue;}
   if(b.y0===-Infinity||b.y1===Infinity||b.look==='mesa'){
    // Plateau: the whole rectangle, with strata and boulders inside it. Chapter 4 M5: a mesa is a free-standing plateau, with the rim along its upper edge and the cliff face along its lower one.
    g.fillStyle(T(0x9a5a33)).fillRect(x0,top,w,bottom-top);
    for(let y=top+14;y<bottom-6;y+=19)g.fillStyle(T(0x86492a),.55).fillRect(x0+6,y,w-12,3);
    for(let i=0;i<Math.floor(w*(bottom-top)/2600);i++){const bx=x0+18+(i*61.7)%(w-36),by=top+16+(i*37.3)%Math.max(1,bottom-top-32);g.fillStyle(i%2?T(0xb8703f):T(0x7c4326),.7).fillEllipse(bx,by,18+i%5*4,9+i%3*3);g.fillStyle(T(0xd99a63),.5).fillEllipse(bx-3,by-2,8+i%4*2,4);}
    g.fillStyle(T(0x6e3b20),.85).fillRect(x0,top,5,bottom-top);g.fillStyle(T(0x6e3b20),.85).fillRect(x0+w-5,top,5,bottom-top);
    if(b.y0===-Infinity||b.look==='mesa'){
     // Cliff face rising from the lower edge, inside the rectangle: the edge units stand against is exactly b.y1.
     const face=Math.min(46,bottom-top);g.fillStyle(T(0x7a4024)).fillRect(x0,bottom-face,w,face);
     for(let y=bottom-face+9;y<bottom-2;y+=9)g.fillStyle(T(0x5c2e18),.6).fillRect(x0+2,y,w-4,2);
     for(let x=x0+14;x<x0+w-8;x+=23)g.fillStyle(T(0x5c2e18),.5).fillRect(x,bottom-face+4+(x*7)%11,2,face-10);
     g.fillStyle(T(0xe2a86f)).fillRect(x0,bottom-face-3,w,4);g.fillStyle(T(0x4a2412)).fillRect(x0,bottom-3,w,3);
    }
    if(b.y0!==-Infinity){
     // Rim along the upper edge, inside the rectangle.
     g.fillStyle(T(0xe2a86f)).fillRect(x0,top,w,4);g.fillStyle(T(0x6e3b20),.8).fillRect(x0,top+4,w,6);
    }
   }else this.canyonSpire(r.x,r.y,r.width,r.height,T);
  }
 }
 // Forest Edge (Chapter 4 M1): grass, the camp road and the south trail, then every forest barrier drawn on its own rectangle: a dark forest floor exactly the size of the barrier, so the visible edge is the collision edge, with clumps of trees
 // standing inside it (each depth-sorted at its base like a unit). Presentation only: nothing here changes navigation.
 private createForestTerrain(field:Battlefield,art:BattlefieldArt){
  const road=art.road!,v=(y:number)=>y*projection.y,noise=(i:number)=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  this.add.tileSprite(0,0,VIEW_WORLD.width,VIEW_WORLD.height,'grass').setOrigin(0).setTileScale(.42,.42).setTint(0xb6d48e);
  let g=this.add.graphics();
  const rect=(x:number,y:number,w:number,h:number,color:number,alpha=1)=>{const p=worldToView(x,y);g.fillStyle(color,alpha).fillRect(p.x,p.y,w*projection.x,h*projection.y);};
  const lane=(x0:number,y0:number,x1:number,y1:number)=>{rect(x0,y0-22,x1-x0,y1-y0+44,0xc1b86c,.5);rect(x0,y0-9,x1-x0,y1-y0+18,0xcfc17b,.85);this.add.tileSprite(x0*projection.x,v(y0),(x1-x0)*projection.x,v(y1-y0),'path').setOrigin(0).setTileScale(.35,.35).setTint(0xf0dbab);};
  lane(0,road.top,WORLD.width,road.bottom);for(const t of art.trails??[])lane(t.x0,t.y0,t.x1,t.y1);
  g=this.add.graphics();
  for(let i=0;i<150;i++){const x=(i*137.3)%WORLD.width,y=(i*71.9)%WORLD.height,p=worldToView(x,y);if(field.barriers.some(b=>x>b.x0-8&&x<b.x1+8&&y>b.y0-8&&y<b.y1+8))continue;g.fillStyle(i%3?0x70973f:0xedd4a0,.26).fillEllipse(p.x,p.y,4+i%6,2+i%3);}
  let n=0;
  for(const b of field.barriers){
   if(b.look!=='forest')continue;
   const r=visibleRect(b),x0=r.x*projection.x,y0=v(r.y),w=r.width*projection.x,h=v(r.y+r.height)-y0;
   const floor=this.add.graphics();floor.fillStyle(0x2b5638).fillRect(x0,y0,w,h);
   for(let i=0;i<Math.floor(w*h/1800);i++){floor.fillStyle(i%2?0x356642:0x234a2f,.7).fillEllipse(x0+14+noise(n+i)*(w-28),y0+10+noise(n+i+500)*Math.max(1,h-20),16+noise(n+i+900)*22,6+noise(n+i+300)*8);}
   floor.fillStyle(0x1c3d27,.55).fillRect(x0,y0,w,3).fillRect(x0,y0+h-3,w,3).fillRect(x0,y0,3,h).fillRect(x0+w-3,y0,3,h);
   const look=propArt(art,'trees');
   // A tree is drawn no taller than the room between its base and the belt's far edge (plus a little canopy), so the belt rises like a slope of young trees towards the road or trail it borders instead of hiding it.
   for(let y=r.y+44;y<=r.y+r.height+6;y+=52)for(let x=r.x+30;x<=r.x+r.width-30;x+=72){
    const jx=(noise(++n)-.5)*28,jy=(noise(n+777)-.5)*16,bx=Math.max(r.x+24,Math.min(r.x+r.width-24,x+jx)),by=Math.max(r.y+10,Math.min(r.y+r.height-2,y+jy)),p=worldToView(bx,by);
    const tree=this.add.image(p.x,p.y,look.texture).setOrigin(.5,1).setDepth(p.y);if(look.tint!==undefined)tree.setTint(noise(n+11)>.5?look.tint:0xa9cc84);tree.setScale(Math.max(44,Math.min(140+noise(n+55)*70,(by-r.y)*projection.y+14))/tree.height);
   }
  }
 }
 // Sunwell Oasis: warm grass and a sand road, then the pond. Every barrier is drawn on its own rectangle: a bank of sand and rim stones outside it, and the
 // water texture masked to the union of the rectangles, so the visible water edge is the collision edge. Nothing here changes navigation.
 private createOasisTerrain(field:Battlefield,art:BattlefieldArt){
  const road=art.road!,v=(y:number)=>y*projection.y,bars=field.barriers.map(b=>{const r=visibleRect(b);return {x0:r.x,y0:r.y,x1:r.x+r.width,y1:r.y+r.height,reason:b.reason};}),pad=(b:Battlefield['barriers'][number],n:number)=>({x:b.x0-n,y:b.y0-n,w:b.x1-b.x0+2*n,h:b.y1-b.y0+2*n});
  this.add.tileSprite(0,0,VIEW_WORLD.width,VIEW_WORLD.height,'grass').setOrigin(0).setTileScale(.42,.42).setTint(0xd2dc92);
  let g=this.add.graphics();
  const rect=(x:number,y:number,w:number,h:number,color:number,alpha=1)=>{const p=worldToView(x,y);g.fillStyle(color,alpha).fillRect(p.x,p.y,w*projection.x,h*projection.y);};
  rect(0,road.top-22,WORLD.width,road.bottom-road.top+44,0xc1b86c,.55);
  rect(0,road.top-8,WORLD.width,road.bottom-road.top+16,0xcfc17b,.85);
  this.add.tileSprite(0,v(road.top),VIEW_WORLD.width,v(road.bottom-road.top),'path').setOrigin(0).setTileScale(.35,.35).setTint(0xf0dbab);
  for(const t of art.trails??[]){rect(t.x0,t.y0-22,t.x1-t.x0,t.y1-t.y0+44,0xc1b86c,.55);rect(t.x0,t.y0-9,t.x1-t.x0,t.y1-t.y0+18,0xcfc17b,.85);this.add.tileSprite(t.x0*projection.x,v(t.y0),(t.x1-t.x0)*projection.x,v(t.y1-t.y0),'path').setOrigin(0).setTileScale(.35,.35).setTint(0xf0dbab);} // Chapter 4 M3: the South Bridge causeway
  g=this.add.graphics();
  for(let i=0;i<160;i++){const x=(i*137.3)%WORLD.width,y=(i*71.9)%WORLD.height,p=worldToView(x,y);if(bars.some(b=>x>b.x0-30&&x<b.x1+30&&y>b.y0-30&&y<b.y1+30))continue;g.fillStyle(i%3?0x8fa14f:0xedd4a0,.26).fillEllipse(p.x,p.y,4+i%6,2+i%3);}
  // Sand bank and rim: solid colours, so overlapping rectangles join without a seam.
  for(const [n,color] of [[30,0xd4c382],[16,0xe6d8a8],[6,0x647f66]] as const)for(const b of bars){const r=pad(b,n);rect(r.x,r.y,r.w,r.h,color);}
  // Water: the texture, masked to the exact barrier rectangles.
  const mask=this.make.graphics({x:0,y:0},false),x0=Math.min(...bars.map(b=>b.x0)),y0=Math.min(...bars.map(b=>b.y0)),x1=Math.max(...bars.map(b=>b.x1)),y1=Math.max(...bars.map(b=>b.y1));
  mask.fillStyle(0xffffff);for(const b of bars){const p=worldToView(b.x0,b.y0);mask.fillRect(p.x,p.y,(b.x1-b.x0)*projection.x,(b.y1-b.y0)*projection.y);}
  const a=worldToView(x0,y0);
  const water=this.add.tileSprite(a.x,a.y,(x1-x0)*projection.x,(y1-y0)*projection.y,'water').setOrigin(0).setTileScale(.7,.7);
  water.setMask(mask.createGeometryMask());
  g=this.add.graphics();
  const inside=(x:number,y:number,m:number)=>bars.some(b=>x>b.x0+m&&x<b.x1-m&&y>b.y0+m&&y<b.y1-m);
  // Shore stones along the outline of the union (not along the seams between rectangles) and a few ripples.
  for(const b of bars){
   const edge:number[][]=[];
   for(let x=b.x0;x<=b.x1;x+=22){edge.push([x,b.y0],[x,b.y1]);}
   for(let y=b.y0;y<=b.y1;y+=22){edge.push([b.x0,y],[b.x1,y]);}
   edge.forEach(([x,y],i)=>{if(x<1||y<1||x>WORLD.width-1||y>WORLD.height-1||bars.some(o=>o!==b&&x>o.x0+1&&x<o.x1-1&&y>o.y0+1&&y<o.y1-1))return;const p=worldToView(x+Math.sin(i*1.7)*4,y+Math.cos(i*1.3)*4);g.fillStyle(0x405f55,.6).fillEllipse(p.x+3,p.y+5,23,15);g.fillStyle(i%3?0x8fa294:0xb5bda1).fillEllipse(p.x,p.y,18+i%11,12+i%5);g.fillStyle(0xd0d1b2,.6).fillEllipse(p.x-3,p.y-2,11,5);});
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
 // Chapter 5 Hero Command HUD (docs/CHAPTER5_HERO_HUD.md). The HUD owns the command state and tells the battlefield; leaving target mode after a drag returns the camera to the Guardian.
 public setHeroCommand(s:HeroCommandState){const was=targeting(this.heroCmd);this.heroCmd=s;if(was&&!targeting(s)&&this.heroPanned){this.heroPanned=false;this.followHero(true);}this.drawHeroMarks();}
 // A one-finger drag in target mode pans the camera (as Build mode does).
 public heroPan(dx:number,dy:number){if(!targeting(this.heroCmd))return;this.following=false;this.lookUntil=0;this.heroPanned=true;this.cameras.main.stopFollow().setScroll(this.cameras.main.scrollX+dx,this.cameras.main.scrollY+dy);}
 // What a target-mode tap at x,y (logical screen px) picks. Defend: that world point (the Simulation snaps it to a cell centre). Attack: the entity whose drawn bounds lie within 28 CSS px of the tap,
 // a valid enemy before anything else, then the closest; anything else picked (an ally, a shielded Keep) comes back too, so the HUD can say why it is refused.
 public heroPick(mode:'attack'|'defend',x:number,y:number):{targetId?:string;point?:{x:number;y:number}}{
  const c=this.cameras.main,vx=x+c.scrollX,vy=y+c.scrollY;
  if(mode==='defend')return {point:viewToWorld(vx,vy)};
  const s=this.simulation.state,snap=28/(this.game.canvas.getBoundingClientRect().height/540);let best:{id:string;valid:boolean;gap:number;d:number}|undefined;
  for(const u of [...Object.values(s.units),...Object.values(s.structures),...Object.values(s.bases)]){
   if(u.hp<=0||u.kind==='guardian'||u.ally)continue;const v=this.visuals.get(u.id);if(!v)continue;
   const b=this.pickBounds(u.id,v),gap=Math.hypot(Math.max(b.left-vx,0,vx-b.right),Math.max(b.top-vy,0,vy-b.bottom));if(gap>snap)continue;
   const q={id:u.id,valid:u.team==='red'&&!u.invulnerable&&!u.open,gap,d:Math.hypot(b.centerX-vx,b.centerY-vy)};
   if(!best||Number(q.valid)-Number(best.valid)>0||(q.valid===best.valid&&(q.gap-best.gap||q.d-best.d||q.id.localeCompare(best.id))<0))best=q;
  }
  return {targetId:best?.id};
 }
 // A visual's drawn bounds for target picking. An animated soldier counts its idle body (SOLDIER_SHEET.hit), and an animated tower the still's rectangle (TOWER_SHEET.hit), not the padded cell of the frame, so each is
 // picked from the same area as the old still.
 private pickBounds(id:string,v:Phaser.GameObjects.Container){
  const bl=this.ballistas.get(id);if(bl?.base.scene){ // a Ballista is picked from the old canvas's rectangle (the whole cell), whatever pose its mechanism is in
   const a=bl.base,k=a.scaleY,L=BALLISTA_SHEET,b=new Phaser.Geom.Rectangle(v.x+a.x+(L.hit.x-L.pivotX)*k,v.y+a.y-L.pivotY*k,L.hit.w*k,L.hit.h*k);
   for(const c of v.list)if(c!==a&&c!==bl.mech)Phaser.Geom.Rectangle.Union(b,(c as Phaser.GameObjects.Components.GetBounds&Phaser.GameObjects.GameObject).getBounds(),b);
   return b;
  }
  const s=this.soldiers.get(id),t=this.towers.get(id);if(!s&&!t)return v.getBounds();
  const a=s?s.art:t!.body,Q=s?(s.cart?WARCART_SHEET:soldierGeometry(s.art.texture.key)):TOWER_SHEET,k=a.scaleY,sx=Math.sign(a.scaleX)||1,x0=a.x+(Q.hit.x-Q.pivotX)*k*sx,x1=a.x+(Q.hit.x+Q.hit.w-Q.pivotX)*k*sx;
  const b=new Phaser.Geom.Rectangle(v.x+Math.min(x0,x1),v.y+a.y+(Q.hit.y-Q.pivotY)*k,Math.abs(x1-x0),Q.hit.h*k);
  for(const c of v.list)if(c!==a&&c!==t?.archer)Phaser.Geom.Rectangle.Union(b,(c as Phaser.GameObjects.Components.GetBounds&Phaser.GameObjects.GameObject).getBounds(),b);
  return b;
 }
 // The selected hero's gold ring and its standing order (a red line to its Attack target, a blue flag at its Defend post); in Attack mode a red reticle on every valid target in view.
 private drawHeroMarks(){
  const g=this.heroMarks?.clear(),s=this.simulation.state,id=this.heroCmd.selected,sel=id?s.units[id]:undefined;if(!g||!sel?.ally||sel.hp<=0||this.heroCmd.mode==='idle')return;
  const ring=(x:number,y:number,rx:number,color:number,alpha:number,w:number)=>{const p=worldToView(x,y);g.lineStyle(w,color,alpha).strokeEllipse(p.x,p.y,rx*2,rx*.9);};
  const flag=(x:number,y:number)=>{const p=worldToView(x,y),c=orderColor('defend');ring(x,y,32,c,.7,2);g.lineStyle(3,0xe8f6ff,1).lineBetween(p.x,p.y,p.x,p.y-34);g.fillStyle(c,.95).fillTriangle(p.x,p.y-34,p.x+18,p.y-27,p.x,p.y-20);};
  ring(sel.x,sel.y,26,0xdcbf7a,1,4);
  const o=sel.ally.order;
  if(o.type==='attack'){const t=s.units[o.targetId]??s.structures[o.targetId]??s.bases[o.targetId];if(t&&t.hp>0){const a=worldToView(sel.x,sel.y),b=worldToView(t.x,t.y);g.lineStyle(2,orderColor('attack'),.7).lineBetween(a.x,a.y,b.x,b.y);ring(t.x,t.y,30,orderColor('attack'),1,3);}}
  if(o.type==='defend')flag(o.x,o.y);
  if(this.heroCmd.mode==='attack'){const v=this.cameras.main.worldView;for(const t of [...Object.values(s.units),...Object.values(s.structures),...Object.values(s.bases)]){if(t.hp<=0||t.team!=='red'||t.invulnerable||t.open)continue;const p=worldToView(t.x,t.y);if(p.x<v.left-40||p.x>v.right+40||p.y<v.top-40||p.y>v.bottom+40)continue;ring(t.x,t.y,t.kind==='tower'?34:t.kind.startsWith('base')?70:t.kind==='wall'?44:22,orderColor('attack'),.85,2);}}
 }
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
  const base=u.kind==='tower'?towerVisual:entities.find(e=>e.kind===u.kind)!,raider=u.archetype==='desert-raider'?{name:'Desert Raider',texture:desertRaiderTexture,width:base.width*desertRaiderScale,height:base.height*desertRaiderScale}:u.commander?.role==='marshal'?{name:'Iron Marshal',texture:'crimson-warlord',width:base.width*marshalScale,height:base.height*marshalScale}:u.commander?.role==='shadowblade'?{name:'Shadowblade',texture:shadowbladeTexture,width:base.width*shadowbladeScale,height:base.height*shadowbladeScale}:u.archetype==='crimson-hero'?{name:u.id===raiderId?'Raider Hero':this.simulation.state.posts?'Defender Hero':this.simulation.state.post?'Crimson Hero':'Frost Warlord',texture:'crimson-warlord',width:base.width*warlordScale,height:base.height*warlordScale}:u.archetype==='crimson-elite'?{name:'Elite Soldier',texture:'crimson-elite',width:base.width*eliteScale,height:base.height*eliteScale}:undefined; // Chapter 3 M6: their own sprites (art/source/m6-warlord-concept-sheet.png); the size is the picture's, the collision radius stays the minion's
  const ally=u.ally&&{name:`Allied Knight (${u.ally.order.type})`,texture:mercenaryTexture(u.ally.merc),width:base.width*1.5,height:base.height*1.5}; // PROTOTYPE Chapter 5 Phase 0: the Guardian's sprite at soldier-and-a-half size
  return {...base,...raider,...ally,...(u.azureBarracks&&azureBarracksVisual),...(u.tavern&&{...azureBarracksVisual,name:'Tavern',texture:'tavern'}),...(u.banner&&bannerVisual),...(u.ballista&&ballistaVisual),...(isSiegeTower(u)&&{name:siegeTowerName}),...(isFrostGate(u)&&frostGateVisual),...((u.gate||(u.id==='red-gate'&&this.simulation.field.id==='river-island'))&&{...cliffGateVisual,...(!u.gate&&{name:'Gatehouse'}),...(isThroneGate(this.simulation.field.id,u.id)&&{name:throneGateName})}),...(isBarracks(u)&&barracksVisual),...(u.cart&&{...ballistaVisual,name:'War Cart'}),...(gatehouseName(u)&&{name:gatehouseName(u)}),id:u.id,team:u.team,x:u.x,y:u.y,hp:`${Math.ceil(u.hp)} / ${u.maxHp}`};
 }
 private makeEntity(e:VisualEntity){
  const p=worldToView(e.x,e.y),h=e.height*1.2;const c=this.add.container(p.x,p.y).setDepth(p.y);
  c.add(this.add.ellipse(7,4,e.width*.9,e.width*.24,0x143629,.28));
  if(e.kind==='guardian')c.add(this.add.ellipse(0,0,76,30,0x59ceff,.13).setStrokeStyle(2,BLUE,.9));
  if(e.kind.startsWith('minion'))c.add(this.add.ellipse(0,1,35,13,e.team==='blue'?BLUE:RED,.1).setStrokeStyle(1,e.team==='blue'?BLUE:RED,.7));
  const S=GUARDIAN_SHEET,sprite=e.id===this.simulation.hero.id&&this.textures.exists(S.key); // Guardian V1.0: the animated sheet, turned about its feet pivot; a fixed body hit box, so taps do not change with the frame
  const sheet=this.soldierSheet(e),Q=sheet?soldierGeometry(sheet):SOLDIER_SHEET; // Soldier V1.0: the faction's animated sheet, drawn at the still's height, turned about its feet pivot, with the idle body as a fixed tap box
  const TS=TAVERN_SHEET,tv=this.tavernSheet(e),C=WARCART_SHEET,cart=this.cartSheet(e),B=BARRACKS_SHEET,barracks=this.barracksSheet(e),L=BALLISTA_SHEET,ballista=this.ballistaSheet(e),T=TOWER_SHEET,tower=this.towerSheet(e); // Tower V1.0: the faction's building frame where the still stood, at its height, with the still's rectangle as the tap box; the archer is drawn above it
  const art=sprite?this.add.image(S.feetX,4,S.key,GF.idle).setOrigin(S.pivotX/S.frameWidth,S.pivotY/S.frameHeight):sheet?this.add.image(0,4,sheet,SF.idle).setOrigin(Q.pivotX/Q.frameWidth,Q.pivotY/Q.frameHeight):tower?this.add.image(0,4,tower,TF.intact).setOrigin(T.pivotX/T.frameWidth,T.pivotY/T.frameHeight):tv?this.add.image(0,4,tv,TV.intact).setOrigin(TS.pivotX/TS.frameWidth,TS.pivotY/TS.frameHeight):barracks?this.add.image(0,4,barracks,BF.intact).setOrigin(B.pivotX/B.frameWidth,B.pivotY/B.frameHeight):cart?this.add.image(0,4,cart,CF.idle).setOrigin(C.pivotX/C.frameWidth,C.pivotY/C.frameHeight):ballista?this.add.image(0,4,ballista,BAF.intact).setOrigin(L.pivotX/L.frameWidth,L.pivotY/L.frameHeight):this.add.image(0,4,e.texture??(e.kind==='tower'?towerTexture(e.team):e.kind)).setOrigin(.5,1);art.setScale(sprite?h/S.idleHeight:sheet?h/Q.idleHeight:tower?h/T.idleHeight:tv?h/TS.idleHeight:barracks?h/B.idleHeight:cart?h/C.idleHeight:ballista?h/L.idleHeight:Math.min(h/art.height,e.name.startsWith('Allied')?e.width*1.6/art.width:Infinity));art.setInteractive(sprite?{hitArea:new Phaser.Geom.Rectangle(S.hit.x,S.hit.y,S.hit.w,S.hit.h),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true}:sheet?{hitArea:new Phaser.Geom.Rectangle(Q.hit.x,Q.hit.y,Q.hit.w,Q.hit.h),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true}:tower?{hitArea:new Phaser.Geom.Rectangle(T.hit.x,T.hit.y,T.hit.w,T.hit.h),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true}:tv?{hitArea:new Phaser.Geom.Rectangle(0,0,TS.frameWidth,TS.frameHeight),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true}:barracks?{hitArea:new Phaser.Geom.Rectangle(0,0,B.frameWidth,B.frameHeight),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true}:cart?{hitArea:new Phaser.Geom.Rectangle(C.hit.x,C.hit.y,C.hit.w,C.hit.h),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true}:ballista?{hitArea:new Phaser.Geom.Rectangle(L.hit.x,L.hit.y,L.hit.w,L.hit.h),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true}:{useHandCursor:true});if(sprite)this.guardianArt=art;
  if(sheet){art.x=Q.feetX*art.scaleY;this.soldiers.set(e.id,{art,frame:SF.idle,facing:-1,drift:0,turnAt:-1e9,x:NaN,y:NaN,travelled:walkPhase(e.id),movedAt:-1e9,attackWindup:300});}art.on('pointerdown',(_p:unknown,_x:unknown,_y:unknown,event:Phaser.Types.Input.EventData)=>{event.stopPropagation();if(this.buildingMode||this.shopMenu||targeting(this.heroCmd))return;const u=this.simulation.state.units[e.id]??this.simulation.state.structures[e.id]??this.simulation.state.bases[e.id];if(u?.ally){this.game.events.emit('hero-select-unit',u.id);return;}if(u?.tavern&&u.team==='blue'){this.game.events.emit('tavern-open');return;} /* Chapter 5 Phase 1B: a tap on the Tavern opens its panel */ /* Chapter 5: in target mode the HUD reads the tap (heroPick), so the Guardian's target stays; a tap on an Allied Hero selects it */if(u?.team==='red')this.simulation.send({type:'target',id:e.id});this.game.events.emit('inspect',u?this.unitVisual(u):e);});c.add(art);
  if(cart)this.soldiers.set(e.id,{cart:true,art,frame:CF.idle,facing:-1,drift:0,turnAt:-1e9,x:NaN,y:NaN,travelled:0,movedAt:-1e9,attackWindup:400}); // the cart's pivot is the middle of its wheelbase, so the art sits on the entity's centre
  if(barracks)this.barracks.set(e.id,{art,frame:BF.intact});
  if(tv)this.taverns.set(e.id,{art,frame:TV.intact});
  if(ballista){const mech=this.add.image(0,4,ballista,BAF.loaded).setOrigin(art.originX,art.originY).setScale(art.scaleX);c.add(mech);this.ballistas.set(e.id,{base:art,mech,baseFrame:BAF.intact,mechFrame:BAF.loaded,facing:1,turnAt:-1e9});}
  const wall=this.wallSheet(e);if(wall)this.makeWall(e.id,c,art,wall.key,wall.rows);
  if(tower){const archer=this.add.image(0,4,tower,towerArcherFrame(0,1)).setOrigin(art.originX,art.originY).setScale(art.scaleX).setVisible(false);c.add(archer);this.towers.set(e.id,{body:art,archer,bodyFrame:TF.intact,archerFrame:towerArcherFrame(0,1),facing:1,turnAt:-1e9,targetAt:-1e9});}
  const w=e.kind.startsWith('base')?94:e.kind==='guardian'||e.texture==='crimson-warlord'?66:e.name==='Elite Soldier'||e.name==='Shadowblade'?40:e.kind==='tower'||e.texture===frostGateTexture||e.texture===cliffGateTexture||e.name===barracksVisual.name||e.name===azureBarracksVisual.name||e.name==='Tavern'||e.name===bannerVisual.name?54:33;
  // Keep health renders above world sprites/effects, still below the separate HUD scene. A faction gate's bar is tall (its sprite is three rows high) and is handled the same way, so the top HUD cannot hide it.
  const health=e.kind.startsWith('base')||e.texture===cliffGateTexture?this.add.container(p.x,p.y).setDepth(2700):c;
  if(health!==c)this.keepHealth.set(e.id,{container:health,height:h,width:e.width});
  health.add(this.add.rectangle(0,-h-8,w+4,7,0x10292d));const bar=this.add.rectangle(-w/2,-h-8,w,4,e.team==='blue'?BLUE:RED).setOrigin(0,.5);health.add(bar);this.hpBars.set(e.id,{bar,width:w});
  health.add(this.add.text(-w/2-14,-h-15,e.team==='blue'?'⬟':'◆',{fontSize:'12px',color:e.team==='blue'?'#a5edff':'#ffaea4'}));
  if(e.texture===frostGateTexture||e.texture===cliffGateTexture||e.name===ballistaVisual.name||e.name===barracksVisual.name||e.name===azureBarracksVisual.name||e.name==='Tavern'||e.name===siegeTowerName||e.name===bannerVisual.name||e.name==='War Cart'||e.name.endsWith('Gatehouse'))c.add(this.add.text(0,-h-24,e.name.toUpperCase(),{fontSize:'11px',fontStyle:'bold',color:'#d6f1ff',stroke:'#14352b',strokeThickness:4}).setOrigin(.5));
  if(e.name==='Iron Marshal'||e.name==='Shadowblade')c.add(this.add.text(0,-h-24,e.name.toUpperCase(),{fontSize:'11px',fontStyle:'bold',color:'#ffd2cc',stroke:'#3a0d0d',strokeThickness:4}).setOrigin(.5)); // Chapter 4 M6: the Commanders carry their names
  if(e.kind.startsWith('base'))c.add(this.add.text(0,24,e.name.toUpperCase(),{fontSize:'11px',fontStyle:'bold',color:'#fff4cd',stroke:'#14352b',strokeThickness:4}).setOrigin(.5));
  this.visuals.set(e.id,c);
 }
 private syncKeepHealth(){
  const camera=this.cameras.main;
  for(const [id,health] of this.keepHealth){
   const keep=this.simulation.state.bases[id]??this.simulation.state.structures[id];if(!keep)continue;
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
  if(this.buildingMode){for(let col=0;col<40;col++)for(let row=0;row<24;row++){const x=(col+.5)*GRID,y=(row+.5)*GRID;if(this.simulation.inTerritory(x,y)){const p=worldToView(x-24,y-24);this.grid.strokeRect(p.x,p.y,GRID,GRID*projection.y);}}
   // Chapter 4 M1: each camp's ruin (Chapter 4 M2: and its Ballista's ruin), once the camp is Azure: the cells a repair accepts.
   for(const [i,c] of this.simulation.camps.entries())for(const r of [c.ruin,c.ballista])if(r&&this.simulation.postStates[i]?.owner==='azure'&&!Object.values(this.simulation.state.structures).some(b=>Math.abs(b.x-(r.col+.5)*GRID)<GRID&&Math.abs(b.y-(r.row+.5)*GRID)<GRID)){const p=worldToView(r.col*GRID,r.row*GRID);this.grid.lineStyle(3,0xffd166,.95).strokeRect(p.x+2,p.y+2*projection.y,GRID-4,(GRID-4)*projection.y);}
   // Azure Barracks pads that are still free: the only cells a Barracks accepts.
   for(const pad of this.simulation.azurePads)if(!this.simulation.placementReason('barracks',pad.col,pad.row).startsWith('Capture')&&!Object.values(this.simulation.state.structures).some(b=>b.col===pad.col&&b.row===pad.row)){const p=worldToView(pad.col*GRID,pad.row*GRID);this.grid.lineStyle(3,0xffd166,.95).strokeRect(p.x+2,p.y+2*projection.y,GRID-4,(GRID-4)*projection.y);}}
  else {for(let x=0;x<=WORLD.width;x+=GRID){const a=worldToView(x,0);this.grid.lineBetween(a.x,0,a.x,VIEW_WORLD.height);}
  for(let y=0;y<=WORLD.height;y+=GRID){const a=worldToView(0,y);this.grid.lineBetween(0,a.y,VIEW_WORLD.width,a.y);}}
  [...field.entities.filter(e=>e.kind!=='guardian'&&!e.kind.startsWith('minion')&&!e.kind.startsWith('base')),...Object.values({...this.simulation.state.units,...this.simulation.state.structures,...this.simulation.state.bases}).map(u=>this.unitVisual(u))].forEach(e=>{const p=worldToView(e.x,e.y);this.grid.lineStyle(2,e.team==='blue'?BLUE:RED,.9);if('columns'in e.footprint){const w=e.footprint.columns*GRID*projection.x,h=e.footprint.rows*GRID*projection.y;this.grid.strokeRect(p.x-w/2,p.y-h/2,w,h);}else this.grid.strokeEllipse(p.x,p.y,e.footprint.radius*2*projection.x,e.footprint.radius*2*projection.y);});
 }
 private syncUnits(){
  const units={...this.simulation.state.units,...this.simulation.state.structures,...this.simulation.state.bases},now=this.simMs();
  for(const u of Object.values(units)){
   const key=`${u.team}${u.azureBarracks?'a':''}${u.open?'o':''}`; // Chapter 4 M4: a captured or converted structure is drawn anew
   if(this.visuals.has(u.id)&&this.visualKeys.get(u.id)!==key){this.dropWall(u.id);this.barracks.delete(u.id);this.ballistas.delete(u.id);this.visuals.get(u.id)!.destroy();this.visuals.delete(u.id);this.hpBars.delete(u.id);this.keepHealth.get(u.id)?.container.destroy();this.keepHealth.delete(u.id);}
   if(!this.visuals.has(u.id)){this.makeEntity(this.unitVisual(u));this.visualKeys.set(u.id,key);}
   const p=worldToView(u.x,u.y),v=this.visuals.get(u.id)!;
   v.setPosition(p.x,p.y).setDepth(p.y).setVisible(u.hp>0).setAlpha(u.open?.35:this.simulation.state.structures[u.id]?.progress??1);
   const hp=this.hpBars.get(u.id)!;hp.bar.width=hp.width*u.hp/u.maxHp;this.seen.add(u.id);
   if(u.id===this.hero.id&&this.guardianArt)this.animateGuardian(v);
   const sa=this.soldiers.get(u.id);if(sa&&sa.art.scene)this.animateSoldier(u as Unit,sa,now);
   const ta=this.towers.get(u.id);if(ta&&ta.body.scene)this.animateTower(u,ta,now);
   const wa=this.walls.get(u.id);if(wa&&wa.still.scene)this.animateWall(u,wa,v,now);
   const ba=this.barracks.get(u.id);if(ba&&ba.art.scene)this.animateBarracks(u,ba,now);const tva=this.taverns.get(u.id);if(tva&&tva.art.scene)this.animateTavern(u,tva,now);
   const la=this.ballistas.get(u.id);if(la&&la.base.scene)this.animateBallista(u,la,now);
  }
  for(const [id,v] of this.visuals){if((id.startsWith('red-')||id.startsWith('blue-')||id.startsWith('built-')||id.startsWith('c4-')||this.seen.has(id))&&!units[id]){const ta=this.towers.get(id);if(ta?.body.scene)this.towersGone.set(id,{x:v.x+ta.body.x,y:v.y+ta.body.y,depth:v.depth,key:ta.body.texture.key,scale:ta.body.scaleY});this.towers.delete(id);this.seen.delete(id);const ba=this.barracks.get(id);if(ba?.art.scene)this.barracksGone.set(id,{x:v.x+ba.art.x,y:v.y+ba.art.y,depth:v.depth,key:ba.art.texture.key,scale:ba.art.scaleY});this.barracks.delete(id);const tg=this.taverns.get(id);if(tg?.art.scene)this.tavernsGone.set(id,{x:v.x+tg.art.x,y:v.y+tg.art.y,depth:v.depth,key:tg.art.texture.key,scale:tg.art.scaleY});this.taverns.delete(id);const la=this.ballistas.get(id);if(la?.base.scene)this.ballistasGone.set(id,{x:v.x+la.base.x,y:v.y+la.base.y,depth:v.depth,key:la.base.texture.key,scale:la.base.scaleY});this.ballistas.delete(id);const wa=this.walls.get(id);if(wa?.still.scene)this.wallsGone.set(id,{rows:wa.rows.map((r,i)=>({x:r.x,y:r.y,depth:r.depth,frame:wa.frames[i]})),key:wa.rows[0].texture.key,scale:wa.rows[0].scaleY});this.dropWall(id);const sa=this.soldiers.get(id);if(sa?.art.scene)this.soldiersGone.set(id,{x:v.x+sa.art.x,y:v.y+sa.art.y,depth:v.depth,key:sa.art.texture.key,scale:sa.art.scaleY,facing:sa.facing,cart:sa.cart});this.soldiers.delete(id);v.destroy();this.visuals.delete(id);this.hpBars.delete(id);}}
  this.animateCartWreck(now);this.animateCorpses(now);this.animateCollapses(now);this.animateWallCollapses(now);
  this.drawStatuses();this.drawPost();this.drawSites();
  if(this.grid.visible)this.drawGrid();
 }
 // Chapter 4 M1: ownership of the Forest Camp, read from the simulation each frame. The camp's build circle is ringed red (dashed) while Crimson holds it and blue (solid) while Azure does; the capture point shows what the Guardian must do next
 // (destroy the holders, stand in the ring, wait for the Banner), and the ruin shows the repair and its price. Nothing here feeds back into the simulation.
 // Chapter 4 M4: the wreck and the capturable structures, read from the simulation each frame (the post art layer is free on a level without a post). A ring is dashed grey while a capture is blocked by its towers,
 // pulsing gold when the Guardian can act by standing in it, and solid blue once the structure is Azure. Nothing here feeds back into the simulation.
 private drawSites(){
  const sim=this.simulation,s=sim.state,cfg=sim.setup;if((s.post&&!cfg.cart?.post)||(!cfg.captures&&!cfg.cart))return;
  const own=!!s.post,texts=own?this.siteTexts:this.postTexts,g=(own?this.siteArt:this.postArt).clear(),pulse=.5+.5*Math.sin(this.elapsed/260),secs=(tick:number)=>Math.max(0,Math.ceil((tick-sim.clock.tick)/30));
  let slot=0;const hero=this.hero,near=(x:number,y:number)=>Math.hypot(hero.x-x,hero.y-y)<=480;
  const text=(value:string,x:number,y:number,color:string,size=12)=>{const i=slot++;let t=texts[i];if(!t){t=this.add.text(0,0,'',{fontSize:`${size}px`,fontStyle:'bold',color,stroke:'#0b2018',strokeThickness:3,backgroundColor:'#0b2018b3',padding:{x:5,y:2}}).setOrigin(.5).setDepth(2450);texts[i]=t;}t.setText(value).setColor(color).setPosition(x,y).setVisible(value!=='');};
  const ring=(wx:number,wy:number,radius:number,color:number,alpha:number,dashed:boolean,label:string,hint:string,hot:boolean)=>{
   const c=worldToView(wx,wy);g.fillStyle(color,hot?.14+.12*pulse:.07).fillEllipse(c.x,c.y,radius*2,radius*2*projection.y);g.lineStyle(hot?4:2,color,alpha);
   const steps=72;for(let i=0;i<steps;i++){if(dashed&&i%2)continue;const a0=i/steps*Math.PI*2,a1=(i+1)/steps*Math.PI*2;g.lineBetween(c.x+Math.cos(a0)*radius,c.y+Math.sin(a0)*radius*projection.y,c.x+Math.cos(a1)*radius,c.y+Math.sin(a1)*radius*projection.y);}
   const hex=`#${color.toString(16).padStart(6,'0')}`;text(hint?`${label} · ${hint}`:label,c.x,c.y+radius*projection.y+14,hot?'#ffe29a':hex,11);
  };
  const price=(j:{wood:number;iron:number})=>`${j.wood} Wood · ${j.iron} Iron`;
  for(const c of cfg.captures??[]){
   const cs=s.captures?.[c.id],b=s.structures[c.id];if(!cs||cs.stage==='lost'||!(b?.hp>0)||!near(b.x,b.y))continue;
   if(cs.stage==='crimson'){const open=c.holders.every(id=>!(s.structures[id]?.hp>0));ring(b.x,b.y,c.ring,open?0xffd166:0xd6dde0,open?.9:.5,!open,open?`HOLD THE RING${cs.progress>0?` ${secs(sim.clock.tick+c.captureTicks-cs.progress)}s`:''}`:'DESTROY THE TOWERS FIRST','',open);}
   else if(cs.stage==='captured'){const doing=cs.repairDone!==undefined;ring(b.x,b.y,c.ring,doing?0x70d7ff:0xffd166,.9,false,doing?`REPAIRING ${secs(cs.repairDone!)}s`:'CAPTURED · REPAIR',doing?'':price(c.repair),!doing);}
   else ring(b.x,b.y,c.ring,0x70d7ff,.4,false,'AZURE','',false);
  }
  const eb=cfg.captures?.find(c=>c.elite),ebs=eb&&s.structures[eb.id];
  if(eb&&ebs&&ebs.hp>0&&s.captures?.[eb.id]?.stage==='crimson'&&Math.hypot(hero.x-984,hero.y-900)<=720){ // the lower route: a marker from the opening, until the Elite Barracks is captured or destroyed
   for(const y of [780,830]){const p=worldToView(984,y);g.fillStyle(0xffd166,.75).fillTriangle(p.x-12,p.y-8,p.x+12,p.y-8,p.x,p.y+10);}
   const p=worldToView(984,880);text('ELITE BARRACKS ↓',p.x,p.y,'#ffd166',12);
  }
  const w=s.cartWreck,ct=cfg.cart;
  if(w&&ct&&near(w.x,w.y)){const locked=sim.cartLocked; // Chapter 5 M5: a start-as-wreck cart stays locked until its outpost is Azure
   ring(w.x,w.y,ct.ring,w.repair?0x70d7ff:locked?0xd6dde0:0xffd166,locked?.6:.9,locked,w.repair?`REPAIRING ${secs(w.repair.complete)}s`:locked?`CAPTURE THE ${(sim.camps.find(c=>c.id===ct.post)?.name??'OUTPOST').toUpperCase()} FIRST`:'WAR CART WRECK · REPAIR',w.repair||locked?'':price(ct.repair),!w.repair&&!locked);}
  for(;slot<texts.length;)texts[slot++]?.setVisible(false);
 }
 private drawPost(){
  const sim=this.simulation,g=this.postArt.clear(),pulse=.5+.5*Math.sin(this.elapsed/260),st=sim.state.structures;
  const text=(i:number,value:string,x:number,y:number,color:string,size=12)=>{let t=this.postTexts[i];if(!t){t=this.add.text(0,0,'',{fontSize:`${size}px`,fontStyle:'bold',color,stroke:'#0b2018',strokeThickness:3,backgroundColor:'#0b2018b3',padding:{x:5,y:2}}).setOrigin(.5).setDepth(2450);this.postTexts[i]=t;}t.setText(value).setColor(color).setPosition(x,y).setVisible(value!=='');};
  const ring=(cx:number,cy:number,radius:number,color:number,alpha:number,width:number,dashed:boolean)=>{const steps=72;g.lineStyle(width,color,alpha);for(let i=0;i<steps;i++){if(dashed&&i%2)continue;const a0=i/steps*Math.PI*2,a1=(i+1)/steps*Math.PI*2;g.lineBetween(cx+Math.cos(a0)*radius,cy+Math.sin(a0)*radius*projection.y,cx+Math.cos(a1)*radius,cy+Math.sin(a1)*radius*projection.y);}};
  // Chapter 4 M5: every camp is drawn the same way; each has its own five labels
  for(const [k,p] of sim.postStates.entries()){const c=sim.camps[k],azure=p.owner==='azure',col=azure?BLUE:RED,o=k*5;
  // the camp's territory
  const cam=worldToView(p.circle.x,p.circle.y);g.fillStyle(col,azure?.12:.07).fillEllipse(cam.x,cam.y,p.circle.radius*2,p.circle.radius*2*projection.y);ring(cam.x,cam.y,p.circle.radius,col,.85,3,!azure);
  text(o+0,`${sim.campName(k).toUpperCase()} · ${azure?'AZURE':'CRIMSON'}`,cam.x,cam.y+p.circle.radius*projection.y+14,azure?'#a5edff':'#ffaea4');
  // the capture point
  const flag=worldToView(p.flag.x,p.flag.y),holders=c.holders.some(id=>st[id]?.hp>0),banner=p.bannerId?st[p.bannerId]:undefined;
  if(!azure&&!banner){
   const ready=!holders,color=ready?0xffd166:0xd6dde0;g.fillStyle(color,ready?.14+.12*pulse:.05).fillEllipse(flag.x,flag.y,c.ring*2,c.ring*2*projection.y);ring(flag.x,flag.y,c.ring,color,ready?.75+.25*pulse:.5,ready?4:2,!ready);
   text(o+1,ready?'⚑ STAND IN THE RING':'⚑ CAPTURE POINT',flag.x,flag.y+c.ring*projection.y+14,ready?'#ffe29a':'#e9eff1');text(o+2,ready?'raise the Azure Banner':'destroy the camp towers first',flag.x,flag.y+c.ring*projection.y+29,ready?'#ffe29a':'#b8c5ca',11);
  }else if(banner&&!azure){const left=Math.max(0,Math.ceil((banner.completeTick-sim.clock.tick)/30));g.fillStyle(0x70d7ff,.14+.1*pulse).fillEllipse(flag.x,flag.y,c.ring*2,c.ring*2*projection.y);ring(flag.x,flag.y,c.ring,0x70d7ff,.85,3,false);text(o+1,`RAISING THE BANNER · ${left}s`,flag.x,flag.y+c.ring*projection.y+14,'#a5edff');text(o+2,'defend it',flag.x,flag.y+c.ring*projection.y+29,'#a5edff',11);}
  else{text(o+1,'',0,0,'#fff');text(o+2,'',0,0,'#fff');}
  // the ruin of the first holder: drawn only while nothing stands on its cell
  const rx=(c.ruin.col+.5)*GRID,ry=(c.ruin.row+.5)*GRID,r=worldToView(rx,ry),vacant=!(st[c.holders[0]]?.hp>0)&&!Object.values(st).some(b=>Math.abs(b.x-rx)<GRID&&Math.abs(b.y-ry)<GRID);
  if(vacant){
   const lit=azure;g.fillStyle(0x3a3f3c,.55).fillEllipse(r.x,r.y+6,54,20);
   for(const [dx,dy,w,h,shade] of [[-14,2,16,9,0x8c9496],[10,4,18,10,0x7a8284],[-2,-6,12,16,0x9aa3a5],[16,-2,10,7,0x6c7476],[-18,8,10,6,0x6c7476]] as const)g.fillStyle(shade).fillEllipse(r.x+dx,r.y+dy,w,h);
   g.fillStyle(0x6b5a46).fillRect(r.x-3,r.y-26,6,26).fillRect(r.x-9,r.y-30,18,5);
   if(lit){const q=sim.placementQuote('tower',c.ruin.col,c.ruin.row),can=q.available;g.lineStyle(3,0xffd166,.6+.4*pulse).strokeRect(r.x-24,r.y-24*projection.y,48,48*projection.y);text(o+3,`REPAIR TOWER · ${q.wood}W ${q.iron}I · ${Math.round(c.repair.ticks/30)}s`,r.x,r.y-46,can?'#ffe29a':'#ffb0a5');}
   else text(o+3,'RUINED TOWER',r.x,r.y-46,'#c7cfd1');
  }else text(o+3,'',0,0,'#fff');
  // Chapter 4 M2: the Ballista's ruin on the cliff shelf (drawn while nothing stands on its cell), with the repair price once the camp is Azure and the Ballista's reach.
  const bl=c.ballista;
  if(bl){
   const bx=(bl.col+.5)*GRID,by=(bl.row+.5)*GRID,b=worldToView(bx,by);
   if(!Object.values(st).some(s=>Math.abs(s.x-bx)<GRID&&Math.abs(s.y-by)<GRID)){
    drawBallistaRuin(g,b.x,b.y);
    if(azure){const q=sim.placementQuote('ballista',bl.col,bl.row),can=q.available;g.lineStyle(3,0xffd166,.6+.4*pulse).strokeRect(b.x-24,b.y-24*projection.y,48,48*projection.y);g.lineStyle(1,0x70d7ff,.4).strokeEllipse(b.x,b.y,buildings.ballista.range*2,buildings.ballista.range*2*projection.y);text(o+4,`REPAIR BALLISTA · ${q.wood}W ${q.iron}I · ${Math.round(c.repair.ticks/30)}s`,b.x,b.y-46,can?'#ffe29a':'#ffb0a5');}
    else text(o+4,'RUINED BALLISTA',b.x,b.y-46,'#c7cfd1');
   }else text(o+4,'',0,0,'#fff');
  }
  // Chapter 4 M6: the camp's ruined Barracks (drawn while nothing stands on its cell), with the repair price once the camp is Azure. A camp has a Ballista ruin or a Barracks ruin, so they share the label slot.
  const br=c.barracksRuin;
  if(br&&!bl){
   const bx=(br.col+.5)*GRID,by=(br.row+.5)*GRID,b=worldToView(bx,by);
   if(!Object.values(st).some(s=>Math.abs(s.x-bx)<GRID&&Math.abs(s.y-by)<GRID)){
    g.fillStyle(0x3a3f3c,.55).fillEllipse(b.x,b.y+6,58,22);g.fillStyle(0x5b6f86).fillRect(b.x-20,b.y-14,12,18).fillRect(b.x+8,b.y-20,12,24);g.fillStyle(0x7a8284).fillEllipse(b.x-4,b.y+4,20,9).fillEllipse(b.x+14,b.y+6,14,7);g.fillStyle(0x6b5a46).fillRect(b.x-12,b.y-30,4,22);
    if(azure){const q=sim.placementQuote('barracks',br.col,br.row),can=q.available;g.lineStyle(3,0xffd166,.6+.4*pulse).strokeRect(b.x-24,b.y-24*projection.y,48,48*projection.y);text(o+4,`REPAIR BARRACKS · ${q.wood}W ${q.iron}I · ${Math.round(buildings.barracks.buildTicks/30)}s`,b.x,b.y-46,can?'#ffe29a':'#ffb0a5');}
    else text(o+4,'RUINED BARRACKS',b.x,b.y-46,'#c7cfd1');
   }else text(o+4,'',0,0,'#fff');
  }
  }
 }
 // Guardian V1.0 sprite animation: the frame, facing and alpha of the Guardian's art each frame. Only the art child changes; the ring, shadow, HP bar and labels
 // stay as they were (hidden while he is down). Facing follows the aim, the Charge, the cast or attack target, else the walk.
 private animateGuardian(v:Phaser.GameObjects.Container){
  const art=this.guardianArt!,h=this.hero,g=this.gs,now=this.simMs(),sim=this.simulation,cast=sim.state.skills.cast;
  if(h.hp<=0&&g.deadAt===undefined){g.deadAt=now;g.cast=undefined;g.attackAt=undefined;g.aimX=undefined;} // from the state, so the first frame already agrees
  else if(h.hp>0&&g.deadAt!==undefined){g.deadAt=undefined;g.respawnAt=now;g.x=h.x;g.y=h.y;}
  const dx=Number.isNaN(g.x)?0:h.x-g.x,dy=Number.isNaN(g.y)?0:h.y-g.y,moved=Math.hypot(dx,dy),step=h.hp>0&&moved>1e-6&&moved<48;g.x=h.x;g.y=h.y; // a respawn jump is not a step
  if(step){g.travelled+=moved;g.movedAt=now;}
  const dashing=h.hp>0&&cast?.skill==='charge'&&sim.clock.tick>=cast.atTick,unit=(id?:string)=>id?this.combatUnit(id):undefined;
  const face=g.aimX!==undefined?g.aimX:cast?.skill==='charge'&&cast.direction?cast.direction.x*100:g.cast&&now-g.cast.at<g.cast.windup+400&&unit(g.castTargetId)?unit(g.castTargetId)!.x-h.x:g.attackAt!==undefined&&now-g.attackAt<g.attackWindup+200&&unit(g.targetId)?unit(g.targetId)!.x-h.x:undefined;
  if(face!==undefined){const f=faceToward(g.facing,face);if(f!==g.facing)g.turnAt=now;g.facing=f;g.drift=0;}
  else if(step){const n=nextFacing(g.facing,g.drift,dx,now-g.turnAt);if(n.facing!==g.facing)g.turnAt=now;g.facing=n.facing;g.drift=n.drift;}
  const pose=guardianPose({now,travelled:g.travelled,movedAt:g.movedAt,attackAt:g.attackAt,attackWindup:g.attackWindup,cast:g.cast,dashing,hurtAt:g.hurtAt,stunned:h.hp>0&&stunned(h,sim.clock.tick),deadAt:h.hp>0?undefined:g.deadAt??-1e9,respawnAt:g.respawnAt});
  if(dashing&&now-g.dustAt>60&&!this.frozen){g.dustAt=now;const p=worldToView(h.x,h.y),d=this.add.ellipse(p.x,p.y+2,22,9,0xd8c9a3,.55).setDepth(p.y-1);this.tweens.add({targets:d,alpha:0,scaleX:1.8,scaleY:1.6,duration:320,onComplete:()=>d.destroy()});} // Charge dust, about five puffs a dash
  art.setFrame(pose.frame).setAlpha(pose.alpha);art.scaleX=Math.abs(art.scaleX)*(g.facing===1?-1:1);
  v.setVisible(pose.alpha>0);for(const child of v.list)if(child!==art)(child as Phaser.GameObjects.Components.Visible&Phaser.GameObjects.GameObject).setVisible(h.hp>0);
 }
 // Simulation time in ms, with the part of a tick already accumulated: action clips count from the tick their windup started, so a contact frame shows on
 // the very tick the simulation applies the hit or the effect, whatever the frame rate or game speed; it stops with the clock on pause.
 private simMs(){const c=this.simulation.clock;return c.tick*1000/HZ+((c as unknown as {accumulator?:number}).accumulator??0);}
 private observeGuardian(e:GameEvent){
  const sim=this.simulation,id=sim.hero.id,g=this.gs,now=this.simMs(),ms=(ticks:number)=>ticks*1000/HZ;
  if(e.type==='attack'&&e.id===id){const w=this.hero.windupTicks;g.attackAt=this.hero.strike?ms(this.hero.strike.atTick-w):now;g.attackWindup=ms(w);g.targetId=e.targetId;}
  else if(e.type==='cast-accepted'){const w=guardianRanks[e.skill].windup,c=sim.state.skills.cast;g.cast={skill:e.skill,at:c?ms(c.atTick-w):now,windup:ms(w)};g.castTargetId=c?.targetId;g.attackAt=undefined;}
  else if(e.type==='cast-interrupted')g.cast=undefined;
  else if(e.type==='damage'&&e.id===id&&e.amount>0)g.hurtAt=now;
 }
 // Soldier V1.0: which animated sheet a visual uses. Azure and Crimson soldiers, the Desert Raider and the Shadowblade; every other kind keeps its still.
 private soldierSheet(e:VisualEntity){
  const Q=SOLDIER_SHEET;if(!e.kind.startsWith('minion'))return undefined;
  const key=e.texture===undefined?(e.kind==='minion-blue'?Q.azure:Q.crimson):e.texture==='crimson-elite'?ELITE_SHEET.key:e.texture==='crimson-warlord'?HERO_SHEET.key:e.texture==='hero-roland'?ROLAND_SHEET.key:e.texture===desertRaiderTexture?Q.desert:e.texture===shadowbladeTexture?Q.shadowblade:undefined;
  return key&&this.textures.exists(key)?key:undefined;
 }
 // War Cart V1.0: the faction's sheet for the cart (Crimson, or its Azure recolour once repaired); every other minion keeps its own.
 private cartSheet(e:VisualEntity){if(e.name!=='War Cart'||!e.kind.startsWith('minion'))return undefined;const key=e.team==='blue'?WARCART_SHEET.azure:WARCART_SHEET.crimson;return this.textures.exists(key)?key:undefined;}
 // A recoloured copy of a sheet (the Crimson soldier sheet unless named) with the same trimmed frames (its pixels through an existing per-pixel recolour).
 private recolourAtlas(key:string,pixels:(data:Uint8ClampedArray)=>void,from:string=SOLDIER_SHEET.crimson){
  if(this.textures.exists(key)||!this.textures.exists(from))return;
  const src=this.textures.get(from),image=src.getSourceImage() as HTMLImageElement,texture=this.textures.createCanvas(key,image.width,image.height)!;
  const context=texture.context;context.drawImage(image,0,0);const data=context.getImageData(0,0,image.width,image.height);pixels(data.data);context.putImageData(data,0,0);
  for(const name of src.getFrameNames()){const f=src.get(name),n=texture.add(name,0,f.cutX,f.cutY,f.cutWidth,f.cutHeight);if(f.trimmed)n?.setTrim(f.realWidth,f.realHeight,f.x,f.y,f.cutWidth,f.cutHeight);}
  texture.refresh();
 }
 // The soldier's frame and facing each frame. Only the art child changes; the ring, shadow and HP bar stay as they were. A soldier with a target faces it (at
 // once when it swings, else at most once per turnHold), so the crowd pushing it back while it closes in does not flip it; one without a target turns only
 // after a clear move the other way. A strike the simulation drops before contact ends the clip.
 private animateSoldier(u:Unit,s:NonNullable<ReturnType<Battle['soldiers']['get']>>,now:number){
  const dx=Number.isNaN(s.x)?0:u.x-s.x,dy=Number.isNaN(s.y)?0:u.y-s.y,moved=Math.hypot(dx,dy),step=moved>1e-6&&moved<48;s.x=u.x;s.y=u.y;
  if(step){s.travelled+=moved;s.movedAt=now;}
  if(s.attackAt!==undefined&&now<s.attackAt+s.attackWindup&&!u.strike)s.attackAt=undefined;
  const fighting=s.attackAt!==undefined&&now-s.attackAt<s.attackWindup+SOLDIER_MOTION.contactMs,target=fighting&&s.targetId?this.combatUnit(s.targetId):u.targetId?this.combatUnit(u.targetId):undefined;
  if(target){const f=soldierFaceToward(s.facing,target.x-u.x);if(f!==s.facing&&(fighting||now-s.turnAt>=SOLDIER_MOTION.turnHold)){s.turnAt=now;s.facing=f;}s.drift=0;}
  else if(step){const n=nextSoldierFacing(s.facing,s.drift,dx,now-s.turnAt);if(n.facing!==s.facing)s.turnAt=now;s.facing=n.facing;s.drift=n.drift;}
  const frame=s.cart?warCartPose({now,travelled:s.travelled,movedAt:s.movedAt,attackAt:s.attackAt,attackWindup:s.attackWindup}):soldierPose({now,travelled:s.travelled,movedAt:s.movedAt,attackAt:s.attackAt,attackWindup:s.attackWindup,hurtAt:s.hurtAt,stride:soldierStride(soldierGeometry(s.art.texture.key),s.art.scaleY)});
  if(frame!==s.frame){s.art.setFrame(frame);s.frame=frame;}
  const sx=Math.abs(s.art.scaleX)*(s.facing===1?-1:1);if(s.art.scaleX!==sx)s.art.scaleX=sx;
 }
 private observeSoldier(e:GameEvent){
  const now=this.simMs(),ms=(ticks:number)=>ticks*1000/HZ;
  if(e.type==='attack'){const s=this.soldiers.get(e.id),u=this.simulation.state.units[e.id];if(s&&u){const w=u.windupTicks;s.attackAt=u.strike?ms(u.strike.atTick-w):now;s.attackWindup=ms(w);s.targetId=e.targetId;s.hurtAt=undefined;}}
  else if(e.type==='damage'&&e.amount>0){const s=this.soldiers.get(e.id);if(s&&!(s.attackAt!==undefined&&now-s.attackAt<s.attackWindup+SOLDIER_MOTION.contactMs)&&(s.hurtAt===undefined||now-s.hurtAt>=soldierGeometry(s.art.texture.key).hurtGap))s.hurtAt=now;}
  else if(e.type==='death'){const g=this.soldiersGone.get(e.id);if(g)this.spawnCorpse(g,now);}
  else if(e.type==='site'&&e.change==='wreck'&&e.id==='cart'&&this.cartWreckAt<-1e8)this.cartWreckAt=now;
 }
 // A fallen soldier: one plain image where it stood, facing as it did, playing the death frames, then fading (corpsePose). At most corpseCap at once; past it
 // the oldest fades quickly. Not interactive; no ring or HP bar.
 private spawnCorpse(g:{x:number;y:number;depth:number;key:string;scale:number;facing:Facing;cart?:boolean},now:number){
  if(g.cart){const C=WARCART_SHEET,art=this.add.image(g.x,g.y,g.key,CF.destroyed[0]).setOrigin(C.pivotX/C.frameWidth,C.pivotY/C.frameHeight).setScale(g.scale).setDepth(g.depth-1);if(g.facing===1)art.scaleX=-g.scale;this.corpses.push({art,at:now,frame:CF.destroyed[0],cart:true});return;} // a destroyed cart breaks, then fades as its wreck fades in
  const Q=soldierGeometry(g.key),art=this.add.image(g.x,g.y,g.key,SF.death[0]).setOrigin(Q.pivotX/Q.frameWidth,Q.pivotY/Q.frameHeight).setScale(g.scale).setDepth(g.depth-1);
  if(g.facing===1)art.scaleX=-g.scale;
  this.corpses.push({art,at:now,frame:SF.death[0]});
  const live=this.corpses.filter(c=>!c.cart&&c.fadeFrom===undefined);if(live.length>SOLDIER_MOTION.corpseCap)live[0].fadeFrom=now-live[0].at;
 }
 // War Cart V1.0: the wreck on its site, from the simulation's cartWreck (there from tick 0 in Chapter 5, or from the cart's death), showing the repair while it is being repaired. A new wreck fades in as the destroyed body fades out.
 private animateCartWreck(now:number){
  const w=this.simulation.state.cartWreck,C=WARCART_SHEET;
  if(!w){this.cartWreckArt?.destroy();this.cartWreckArt=undefined;this.cartWreckAt=-1e9;return;}
  const p=worldToView(w.x,w.y);
  if(!this.cartWreckArt?.scene){if(!this.simulation.setup.cart?.wreckAtStart&&this.cartWreckAt<-1e8)this.cartWreckAt=now;} // a wreck the cart left is born this frame (its site event is read just after the sync); a start wreck is simply there
  if(!this.cartWreckArt?.scene)this.cartWreckArt=this.add.image(p.x,p.y+4,C.crimson,CF.wreck).setOrigin(C.pivotX/C.frameWidth,C.pivotY/C.frameHeight).setScale(100.8/C.idleHeight).setDepth(p.y-1);
  const a=this.cartWreckArt,frame=w.repair?CF.repairing:CF.wreck;if(a.frame.name!==String(frame))a.setFrame(frame);a.setAlpha(warCartWreckAlpha(now-this.cartWreckAt));
 }
 private animateCorpses(now:number){
  this.corpses=this.corpses.filter(c=>{const p=c.cart?warCartCorpsePose(now-c.at):corpsePose(now-c.at,c.fadeFrom);if(!p){c.art.destroy();return false;}if(p.frame!==c.frame){c.art.setFrame(p.frame);c.frame=p.frame;}c.art.setAlpha(p.alpha);return true;});
 }
 // Tower V1.0: which animated sheet a visual uses. The Archer Tower and, by team, the Crimson Tower and the Siege Tower; the Ballista (its own texture) keeps its still.
 private towerSheet(e:VisualEntity){
  if(e.kind!=='tower'||e.texture!==undefined)return undefined;const key=e.team==='red'?TOWER_SHEET.crimson:TOWER_SHEET.azure;
  return this.textures.exists(key)?key:undefined;
 }
 // The tower's building and archer each frame. The building shows the damage of the tower's hp, and the intact tower while it is built (its hp climbs from
 // near zero); the archer appears once the tower can fire. It faces its target (at once on a shot, else at most once per turnHold), and shoots on the
 // simulation's attack tick (towerArcherPose). Only these children change; the shadow, HP bar and container stay as they were.
 private animateTower(u:Unit,t:NonNullable<ReturnType<Battle['towers']['get']>>,now:number){
  const b=this.simulation.state.structures[u.id],building=!!b&&this.simulation.clock.tick<b.completeTick;
  const body=towerBodyFrame(u.hp,u.maxHp,building);if(body!==t.bodyFrame){t.body.setFrame(body);t.bodyFrame=body;}
  if(t.archer.visible===building)t.archer.setVisible(!building);if(building)return;
  const target=u.targetId?this.combatUnit(u.targetId):undefined;
  if(target){t.targetAt=now;const f=towerFaceToward(t.facing,target.x-u.x);if(f!==t.facing&&now-t.turnAt>=TOWER_MOTION.turnHold){t.facing=f;t.turnAt=now;}}
  const frame=towerArcherFrame(towerArcherPose(now,t.shotAt,t.targetAt),t.facing);if(frame!==t.archerFrame){t.archer.setFrame(frame);t.archerFrame=frame;}
 }
 // A tower's shot: the release from the attack's own tick (towers have no windup, so it is the tick the damage applied), facing the shot's target; the
 // archer is posed at once, so the release is on screen with the hit. A destroyed tower collapses where it stood.
 private observeTower(e:GameEvent){
  const now=this.simMs();
  if(e.type==='attack'){const t=this.towers.get(e.id),u=this.simulation.state.structures[e.id];if(t&&u&&t.body.scene){t.shotAt=(u.readyTick-u.cooldownTicks)*1000/HZ;const target=this.combatUnit(e.targetId);if(target){const f=towerFaceToward(t.facing,target.x-u.x);if(f!==t.facing){t.facing=f;t.turnAt=now;}}this.animateTower(u,t,now);}}
  else if(e.type==='death'){const g=this.towersGone.get(e.id);if(g)this.spawnCollapse(g,now);}
 }
 // A destroyed tower: one plain image where it stood, playing the collapse frames, then fading (collapsePose). Not interactive; no archer, ring or HP bar.
 private spawnCollapse(g:{x:number;y:number;depth:number;key:string;scale:number},now:number){
  const T=TOWER_SHEET,art=this.add.image(g.x,g.y,g.key,TF.collapse[0]).setOrigin(T.pivotX/T.frameWidth,T.pivotY/T.frameHeight).setScale(g.scale).setDepth(g.depth);
  this.collapses.push({art,at:now,frame:TF.collapse[0]});
 }
 private animateCollapses(now:number){
  this.collapses=this.collapses.filter(c=>{const p=(c.pose??collapsePose)(now-c.at);if(!p){c.art.destroy();return false;}if(p.frame!==c.frame){c.art.setFrame(p.frame);c.frame=p.frame;}c.art.setAlpha(p.alpha);return true;});
 }
 // Barracks V1.0: the Azure Barracks (and a repaired Elite Barracks, drawn with the Azure art) uses the animated sheet; the Crimson Barracks and everything else keep their stills (the Tavern has its own sheet).
 private barracksSheet(e:VisualEntity){return e.texture===azureBarracksVisual.texture&&e.name===azureBarracksVisual.name&&this.textures.exists(BARRACKS_SHEET.azure)?BARRACKS_SHEET.azure:undefined;}
 // The building's frame each frame: its damage state, else the open doorway for recruitMs from a recruit's spawn, else intact; intact while it is built (the existing fade shows the build).
 private animateBarracks(u:Unit,b:NonNullable<ReturnType<Battle['barracks']['get']>>,now:number){
  const s=this.simulation.state.structures[u.id],building=!!s&&this.simulation.clock.tick<s.completeTick,frame=barracksFrame(u.hp,u.maxHp,building,now,b.recruitAt);
  if(frame!==b.frame){b.art.setFrame(frame);b.frame=frame;}
 }
 // A soldier this Barracks trained spawns: the doorway opens on that tick. A destroyed Barracks collapses where it stood.
 private observeBarracks(e:GameEvent){
  const now=this.simMs();
  if(e.type==='spawn'){const id=recruiterOf(e.id),b=id===undefined?undefined:this.barracks.get(id),u=id===undefined?undefined:this.simulation.state.structures[id];if(b&&u&&b.art.scene){b.recruitAt=now;this.animateBarracks(u,b,now);}}
  else if(e.type==='death'){const g=this.barracksGone.get(e.id);if(g){const B=BARRACKS_SHEET,art=this.add.image(g.x,g.y,g.key,BF.collapse[0]).setOrigin(B.pivotX/B.frameWidth,B.pivotY/B.frameHeight).setScale(g.scale).setDepth(g.depth);this.collapses.push({art,at:now,frame:BF.collapse[0],pose:barracksCollapsePose});}}
 }
 // Tavern V1.0: the Azure Tavern (the 'tavern' still, named Tavern) uses the animated sheet; the placement preview keeps the still.
 private tavernSheet(e:VisualEntity){return e.texture==='tavern'&&e.name==='Tavern'&&this.textures.exists(TAVERN_SHEET.key)?TAVERN_SHEET.key:undefined;}
 // The building's frame each frame: its damage state, else the hire door or the revive glow while their cue runs, else intact; intact while it is built (the existing fade shows the build).
 private animateTavern(u:Unit,t:NonNullable<ReturnType<Battle['taverns']['get']>>,now:number){
  const s=this.simulation.state.structures[u.id],building=!!s&&this.simulation.clock.tick<s.completeTick,frame=tavernFrame(u.hp,u.maxHp,building,now,t.hireAt,t.returnAt);
  if(frame!==t.frame){t.art.setFrame(frame);t.frame=frame;}
 }
 // A hero is hired (the hire event) or a fallen one returns (the returned event, not the revive start): the door / the glow shows from that tick. A destroyed Tavern collapses where it stood.
 // The tavern events carry no building id and a match has at most one Tavern, so the standing one is found by its flag.
 private observeTavern(e:GameEvent){
  const now=this.simMs();
  if(e.type==='tavern'&&(e.action==='hire'||e.action==='returned')){const u=Object.values(this.simulation.state.structures).find(b=>b.tavern&&b.hp>0),t=u?this.taverns.get(u.id):undefined;if(u&&t&&t.art.scene){if(e.action==='hire')t.hireAt=now;else t.returnAt=now;this.animateTavern(u,t,now);}}
  else if(e.type==='death'){const g=this.tavernsGone.get(e.id);if(g){const V=TAVERN_SHEET,art=this.add.image(g.x,g.y,g.key,TV.collapse[0]).setOrigin(V.pivotX/V.frameWidth,V.pivotY/V.frameHeight).setScale(g.scale).setDepth(g.depth);this.collapses.push({art,at:now,frame:TV.collapse[0],pose:tavernCollapsePose});}}
 }
 // Ballista V1.0: the repaired Azure Ballista (its own canvas texture, named Ballista) uses the base and mechanism sheet; the War Cart, which shares that canvas, keeps it.
 private ballistaSheet(e:VisualEntity){return e.kind==='tower'&&e.texture===ballistaTexture&&e.name===ballistaVisual.name&&this.textures.exists(BALLISTA_SHEET.key)?BALLISTA_SHEET.key:undefined;}
 // The base's damage state and the mechanism's pose each frame. The base shows the intact state while it is built (the existing fade shows the build) and the mechanism is loaded;
 // it faces its target (at once on a shot, else at most once per turnHold), mirrored about the post, and the base is never flipped.
 private animateBallista(u:Unit,b:NonNullable<ReturnType<Battle['ballistas']['get']>>,now:number){
  const s=this.simulation.state.structures[u.id],building=!!s&&this.simulation.clock.tick<s.completeTick,base=ballistaBaseFrame(u.hp,u.maxHp,building);
  if(base!==b.baseFrame){b.base.setFrame(base);b.baseFrame=base;}
  const target=building||!u.targetId?undefined:this.combatUnit(u.targetId);
  if(target){const f=ballistaFaceToward(b.facing,target.x-u.x);if(f!==b.facing&&now-b.turnAt>=BALLISTA_MOTION.turnHold){b.facing=f;b.turnAt=now;}}
  const pose=building?BAF.loaded:ballistaPose(now,b.shotAt,u.cooldownTicks*1000/HZ);if(pose!==b.mechFrame){b.mech.setFrame(pose);b.mechFrame=pose;}
  const sx=b.facing*Math.abs(b.base.scaleX);if(b.mech.scaleX!==sx)b.mech.scaleX=sx;
 }
 // A Ballista's shot: the fired pose from the attack's own tick (no windup, so it is the tick the damage applied), facing the shot's target. A destroyed Ballista collapses where it stood.
 private observeBallista(e:GameEvent){
  const now=this.simMs();
  if(e.type==='attack'){const b=this.ballistas.get(e.id),u=this.simulation.state.structures[e.id];if(b&&u&&b.base.scene){b.shotAt=(u.readyTick-u.cooldownTicks)*1000/HZ;const target=this.combatUnit(e.targetId);if(target){const f=ballistaFaceToward(b.facing,target.x-u.x);if(f!==b.facing){b.facing=f;b.turnAt=now;}}this.animateBallista(u,b,now);}}
  else if(e.type==='death'){const g=this.ballistasGone.get(e.id);if(g){const L=BALLISTA_SHEET,art=this.add.image(g.x,g.y,g.key,BAF.collapse[0]).setOrigin(L.pivotX/L.frameWidth,L.pivotY/L.frameHeight).setScale(g.scale).setDepth(g.depth);this.collapses.push({art,at:now,frame:BAF.collapse[0],pose:ballistaCollapsePose});}}
 }
 // Wall V1.0: which segment sheet a visual uses and how many rows it has. The Wooden Wall (the still as is), the Frost Gate (two rows, ice) and the Cliff Gate,
 // the Gatehouses and the Fortress / Throne Gate (three rows, ironwood); the Barracks, Tavern and Banner (their own textures) keep their stills.
 private wallSheet(e:VisualEntity){
  if(e.kind!=='wall')return undefined;const W=WALL_SHEET,s=e.texture===undefined?{key:W.wood,rows:1}:e.texture===frostGateTexture?{key:W.ice,rows:2}:e.texture===cliffGateTexture?{key:W.ironwood,rows:cliffGateRows}:undefined;
  return s&&this.textures.exists(s.key)?s:undefined;
 }
 // A wall's segments where the still's rows were drawn: the still's scale, each row's base frostGateRowOffset texture px above the next, each depth-sorted at its
 // base (the front row at the container's depth), so a unit between two rows draws between them. The still stays in the container, hidden: the container's
 // bounds (the Hero pick area) stay the still's. The front row takes the still's taps, with the still's rectangle as its tap box.
 private makeWall(id:string,c:Phaser.GameObjects.Container,still:Phaser.GameObjects.Image,key:string,n:number){
  const W=WALL_SHEET,k=still.scaleY,step=frostGateRowOffset*k,rows=[...Array(n).keys()].map(i=>this.add.image(c.x,c.y+4-(n-1-i)*step,key,WF.intact).setOrigin(W.pivotX/W.frameWidth,W.pivotY/W.frameHeight).setScale(k).setDepth(this.wallRowDepth(c.depth,i,n,step)));
  const front=rows[n-1];front.setInteractive({hitArea:new Phaser.Geom.Rectangle(W.pivotX-still.width/2,W.pivotY-still.height,still.width,still.height),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true});
  front.on('pointerdown',(...a:unknown[])=>still.emit('pointerdown',...a));still.setVisible(false);
  this.walls.set(id,{rows,frames:rows.map(()=>WF.intact),gate:rows.map(()=>({})),step,still});
 }
 // A row's depth: at its base, but never below the footprint's north edge, so the whole gate still draws over the terrain wall it closes (its art stands a
 // cell north of its footprint, as every sprite stands on its centre).
 private wallRowDepth(depth:number,i:number,n:number,step:number){return Math.max(depth-(n-1-i)*step,depth-n*GRID/2*projection.y+.5);}
 private dropWall(id:string){const w=this.walls.get(id);if(!w)return;for(const r of w.rows)r.destroy();this.walls.delete(id);}
 // The wall's segments each frame: where the container is, as visible and as translucent as it is (construction, a captured gate standing open), each showing
 // the damage of the wall's hp (intact while it is built). A faction gate's row opens while a unit the simulation lets through it (gatePasser) stands where the
 // row covers it, and closes holdMs after the last one left (gateRowFrame).
 private animateWall(u:Unit,w:NonNullable<ReturnType<Battle['walls']['get']>>,v:Phaser.GameObjects.Container,now:number){
  const b=this.simulation.state.structures[u.id],n=w.rows.length,damage=wallFrame(u.hp,u.maxHp,!!b&&this.simulation.clock.tick<b.completeTick);
  const passers=b?.gate&&!b.open?Object.values(this.simulation.state.units).filter(p=>gatePasser(b,p)):[],top=WALL_SHEET.height*WALL_MOTION.cover*w.rows[0].scaleY/projection.y;
  for(let i=0;i<n;i++){
   const r=w.rows[i];r.setPosition(v.x,v.y+4-(n-1-i)*w.step).setDepth(this.wallRowDepth(v.depth,i,n,w.step)).setVisible(v.visible).setAlpha(v.alpha);
   let frame=damage;
   if(b?.gate){const base=u.y+(4-(n-1-i)*w.step)/projection.y,next=gateRowFrame(w.gate[i],passers.some(p=>atGateRow(p,b,base,top)),now,damage);w.gate[i]=next.row;frame=next.frame;}
   if(frame!==w.frames[i]){r.setFrame(frame);w.frames[i]=frame;}
  }
 }
 // A destroyed wall breaks where it stood, row by row from the north (wallCollapsePose).
 private observeWall(e:GameEvent){
  if(e.type!=='death')return;const g=this.wallsGone.get(e.id);if(!g)return;const now=this.simMs(),W=WALL_SHEET;
  for(const [index,r] of g.rows.entries())this.wallCollapses.push({art:this.add.image(r.x,r.y,g.key,r.frame).setOrigin(W.pivotX/W.frameWidth,W.pivotY/W.frameHeight).setScale(g.scale).setDepth(r.depth),at:now,index,last:r.frame,frame:r.frame});
  this.animateWallCollapses(now); // the north row breaks on the death's own update
 }
 private animateWallCollapses(now:number){
  this.wallCollapses=this.wallCollapses.filter(c=>{const p=wallCollapsePose(now-c.at,c.index,c.last);if(!p){c.art.destroy();return false;}if(p.frame!==c.frame){c.art.setFrame(p.frame);c.frame=p.frame;}c.art.setAlpha(p.alpha);return true;});
 }
 // MOBA aiming (src/ui/skillAim.ts): the legal Bash target lined up with a drag, and the Charge a drag asks for. Read-only queries of the simulation.
 private bashTarget(direction:{x:number;y:number}){const sim=this.simulation;return bashAim(this.hero,direction,Object.values(sim.state.units).filter(u=>sim.skills.legalTarget(u)));}
 private chargeFrom(start:{x:number;y:number},p:{x:number;y:number}){return chargeAim(start,p,projection.y,this.game.canvas.getBoundingClientRect().height/540,guardianRanks.charge.distance[Math.max(0,this.simulation.state.heroProgression.ranks.charge-1)]);}
 private castSkill(skill:GuardianSkill,g?:{x:number;y:number;dragged:boolean;startX?:number;startY?:number}){
  const cancel=this.aimCancel();this.gs.aimX=undefined;
  if(g?.dragged&&inCancel(g,cancel)){this.game.events.emit('cast-feedback','Cast cancelled');return;}
  const sim=this.simulation,h=sim.hero,c:{type:'cast';requestId:string;skill:GuardianSkill;targetId?:string;direction?:{x:number;y:number};distance?:number}={type:'cast',requestId:'cast-ui-'+(++this.castRequest),skill};
  if(skill==='bash'&&g?.dragged){const d=aimDirection({x:g.startX??g.x,y:g.startY??g.y},g,projection.y),target=d&&this.bashTarget(d);if(!target){this.game.events.emit('cast-feedback','No legal target at aim');return;}c.targetId=target.id;}
  if(skill==='charge'){
   if(g?.dragged){const a=this.chargeFrom({x:g.startX??g.x,y:g.startY??g.y},g);if(!a){this.game.events.emit('cast-feedback','Aim Charge first');return;}c.direction=a.direction;c.distance=a.distance;}
   else {const selected=sim.state.units[sim.state.selectedTarget??''];const target=sim.skills.legalTarget(selected,240)?selected:Object.values(sim.state.units).filter(u=>sim.skills.legalTarget(u,240)).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y)||a.id.localeCompare(b.id))[0];c.direction=target?{x:target.x-h.x,y:target.y-h.y}:this.lastDirection;}
  }
  sim.send(c);
 }
 private drawAim(skill:GuardianSkill,p?:{x:number;y:number},dragged?:boolean,start?:{x:number;y:number}){
  const g=this.skillAim.clear();this.cancelAim.clear();this.gs.aimX=undefined;if(!p||this.hero.hp<=0)return;
  const sim=this.simulation,hero=this.hero,h=worldToView(hero.x,hero.y),cv=this.aimCancel(),cancel=!!dragged&&inCancel(p,cv),color=cancel?0xff9b83:0x9deaff,py=projection.y;
  if(dragged){this.cancelAim.lineStyle(3,0xff9b83,.9).strokeCircle(cv.x,cv.y,cv.radius);if(cancel)this.cancelAim.fillStyle(0xff6b5b,.4).fillCircle(cv.x,cv.y,cv.radius);} // release here to cancel
  const ring=(r:number)=>g.lineStyle(2,color,.8).strokeEllipse(h.x,h.y,r*2,r*2*py),mark=(u:{x:number;y:number},c=color)=>{const q=worldToView(u.x,u.y);g.lineStyle(3,c,.95).strokeEllipse(q.x,q.y,44,44*py);};
  if(skill==='taunt'||skill==='zone'){ // self-centred: the area and whom it reaches, while the button is held
   const r=guardianRanks[skill].radius;g.fillStyle(color,.07).fillEllipse(h.x,h.y,r*2,r*2*py);ring(r);
   if(!cancel)for(const u of Object.values(sim.state.units))if(skill==='taunt'?sim.skills.legalTarget(u,r):u.hp>0&&u.team===hero.team&&(u.kind==='guardian'||u.kind.startsWith('minion'))&&Math.hypot(u.x-hero.x,u.y-hero.y)<=r)mark(u,skill==='taunt'?0xffc56a:0x86edcc);
   return;
  }
  if(!dragged||!start)return; // a tap casts at the selected or nearest target, as before
  if(skill==='bash'){const d=aimDirection(start,p,py),r=guardianRanks.bash.range;ring(r);if(!d)return;this.gs.aimX=d.x*100;const t=cancel?undefined:this.bashTarget(d);g.lineStyle(3,t||cancel?color:0xff7976,.9).lineBetween(h.x,h.y,h.x+d.x*r,h.y+d.y*r*py);if(t)mark(t);}
  else if(skill==='charge'){const a=this.chargeFrom(start,p);if(!a)return;this.gs.aimX=a.direction.x*100;const dx=a.direction.x*a.distance,dy=a.direction.y*a.distance,hit=chargeContactOn(sim.geo,hero,dx,dy,sim.state),end=worldToView(hero.x+dx*hit.fraction,hero.y+dy*hit.fraction),full=worldToView(hero.x+dx,hero.y+dy);
   if(hit.fraction<1)g.lineStyle(2,0xff7976,.5).lineBetween(end.x,end.y,full.x,full.y); // the part of the drag the Charge will not cover
   g.lineStyle(hero.radius*1.6,color,.25).lineBetween(h.x,h.y,end.x,end.y).lineStyle(3,color,.9).lineBetween(h.x,h.y,end.x,end.y).strokeEllipse(end.x,end.y,hero.radius*2,hero.radius*2*py);
   if(hit.hit&&!cancel)mark(hit.hit,hit.hit.team===hero.team?0xc7cfd1:0xff7976);}
 }
 private drawStatuses(){
  this.zoneArt.clear();for(const z of this.simulation.state.skills.zones){const p=worldToView(z.x,z.y);this.zoneArt.fillStyle(0x86edcc,.08).fillEllipse(p.x,p.y,384,384*projection.y);this.zoneArt.lineStyle(3,0x86edcc,.8).strokeEllipse(p.x,p.y,384,384*projection.y);}
  for(const u of Object.values(this.simulation.state.units)){const active=(u.statuses??[]).map(s=>s.type.toUpperCase());if(u.shield&&u.shield.remaining>0)active.push('SHIELD '+Math.ceil(u.shield.remaining));let label=this.statusTexts.get(u.id);if(!label){label=this.add.text(0,0,'',{fontSize:'14px',color:'#c8fff0',stroke:'#102431',strokeThickness:3}).setOrigin(.5).setDepth(2600);this.statusTexts.set(u.id,label);}const p=worldToView(u.x,u.y);label.setPosition(p.x,p.y-(u.kind==='guardian'?135:85)).setText(active.join(' · ')).setVisible(u.hp>0&&active.length>0);}
  for(const [id,text] of this.statusTexts)if(!this.simulation.state.units[id]){text.destroy();this.statusTexts.delete(id);}
 }
 // Guardian V1.0: a skill's ring grows to the skill's real reach (Taunt 144, Sanctuary 192 world px) when the simulation applies it; Bash bursts on its target.
 private effect(key:string,at?:{x:number;y:number}){if(this.frozen)return;this.castCount++;const p=worldToView((at??this.hero).x,(at??this.hero).y);const colors:Record<string,number>={bash:0x7cdcff,taunt:0xffc56a,charge:0xb8f4ff,zone:0x86edcc,attack:0xffdd8e};const reach:Record<string,number>={taunt:guardianRanks.taunt.radius,zone:guardianRanks.zone.radius};const w=reach[key]?reach[key]*2/1.7:at?60:110;const g=this.add.graphics().setPosition(p.x,p.y).setDepth(p.y+1);g.lineStyle(key==='zone'?4:3,colors[key],.9).strokeEllipse(0,0,w,w*projection.y);if(at)g.lineStyle(3,0xffffff,.85).strokeEllipse(0,-26,26,26);this.tweens.add({targets:g,alpha:0,scaleX:1.7,scaleY:1.7,duration:at?320:600,onComplete:()=>g.destroy()});}
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
  this.audio?.update(delta);
  if(this.blocked||this.frozen||innerHeight>innerWidth)return;
  this.elapsed+=Math.min(delta,100);const dead=this.hero.hp<=0;
  let dx=this.stick.x,dy=this.stick.y;const k=this.keys;
  if(k){dx+=(k.D.isDown||k.RIGHT.isDown?1:0)-(k.A.isDown||k.LEFT.isDown?1:0);dy+=(k.S.isDown||k.DOWN.isDown?1:0)-(k.W.isDown||k.UP.isDown?1:0);}
  if(this.buildingMode||this.skillMenu||this.shopMenu){dx=0;dy=0;}
  const moving=!!(dx||dy),camera=cameraAction({dead,wasDead:this.wasDead,moving,lookExpired:!this.buildingMode&&!!this.lookUntil&&this.elapsed>this.lookUntil}),resumed=this.wasDead;this.wasDead=dead;
  if(camera==='follow')this.followHero(true); // glide back from a look or a Build pan, as after a dead-state pan; a snap is a one-frame jump of the whole view
  else if(camera==='pan'){const c=this.cameras.main,p=deadPan({x:c.scrollX,y:c.scrollY},{x:dx,y:dy},delta,this.cameraBounds,c);this.following=false;this.lookUntil=0;c.stopFollow().setScroll(p.x,p.y);}
  if(moving&&!dead){const n=Math.hypot(dx,dy);this.lastDirection={x:dx/n,y:dy/n};}
  this.simulation.send({type:'move',x:dx,y:dy});this.simulation.advance(delta);this.syncUnits();this.drawHeroMarks();
  if(this.placement){const {kind,col,row}=this.placement,p=worldToView((col+.5)*GRID,(row+.5)*GRID),reason=this.simulation.placementReason(kind,col,row);this.placementArt.setTexture(kind==='tower'?'tower':kind==='tavern'?'tavern':kind==='barracks'?azureBarracksVisual.texture:kind==='ballista'?ballistaTexture:'wall');if(kind==='barracks'||kind==='tavern')this.placementArt.setScale(azureBarracksVisual.height*1.2/this.placementArt.height);else if(kind==='ballista')this.placementArt.setScale(ballistaVisual.height*1.2/this.placementArt.height);else this.placementArt.setDisplaySize(kind==='tower'?76:47,kind==='tower'?142:60);this.placementArt.setPosition(p.x,p.y+4).setVisible(true).setTint(reason?0xff7976:0x70ffb0);this.placementGrid.clear().lineStyle(3,reason?RED:0x70ffb0).strokeRect(p.x-24,p.y-24*projection.y,48,48*projection.y);if(kind==='tower')this.placementGrid.lineStyle(1,0x70d7ff,.5).strokeEllipse(p.x,p.y,480,480*projection.y);if(kind==='ballista')this.placementGrid.lineStyle(1,0x70d7ff,.5).strokeEllipse(p.x,p.y,buildings.ballista.range*2,buildings.ballista.range*2*projection.y);this.game.events.emit('placement-status',reason||(this.simulation.repairSite(kind,col,row)?`Repair the ruined ${kind==='ballista'?'Ballista':'tower'} - confirm to build`:'Valid placement - confirm to build'));}
  for(const event of this.simulation.drainEvents()){
   if(event.type==='preview')this.effect(event.key);
   if(event.type==='cast-effect'){const t=event.skill==='bash'?this.simulation.state.units[this.gs.castTargetId??'']:undefined;this.effect(event.skill,t);}
   this.battleAudio.observe(event,this.simulation.state);
   this.presentCombatEvent(event);
   this.observeGuardian(event);
   this.observeSoldier(event);
   this.observeTower(event);
   this.observeWall(event);
   this.observeBarracks(event);this.observeTavern(event);this.observeBallista(event);
   if(event.type==='construction-complete'&&isBallistaRepair(this.simulation.state.structures[event.id]))this.ballistaRepaired=true;
   if(event.type==='site'&&event.change==='repaired'&&event.id==='cart')this.warCartRepaired=true;
   if(event.type==='site'&&event.change==='converted'&&this.simulation.state.structures[event.id]?.eliteBarracks)this.eliteBarracksRepaired=true;
   if(event.type==='match-end')this.recordMatchEnd();
   if(event.type==='match-end'){this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.buildingMode=false;this.placement=undefined;this.game.events.emit('clear-controls');}
   if(event.type==='death'&&event.id==='guardian'){this.stick={x:0,y:0};this.input.keyboard?.resetKeys();this.game.events.emit('clear-controls');}
   this.game.events.emit('simulation-event',event);
  }
  this.soldiersGone.clear();this.towersGone.clear();this.wallsGone.clear();this.barracksGone.clear();this.tavernsGone.clear();this.ballistasGone.clear();
  this.battleAudio.update(delta,this.simulation.state);
  this.drawDamageFeedback();
 }
}

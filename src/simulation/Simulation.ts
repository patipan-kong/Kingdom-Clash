import {balanceV02} from '../data/balanceV02';
import {crimsonMinionGold} from '../data/gameplayV03';
import type {KeepDefense} from '../data/gameplayV04';
import {activeCombatVariant,crimsonMinionRawVsGuardian,crimsonTowerRawVsGuardian,type CombatVariant} from '../data/gameplayV041';
import {Economy} from './Economy';
import {BurnEffects} from './BurnEffects';
import {bannerMultiplier} from './BannerAura';
import {buildings,type BuildingKind} from '../data/buildings';
import {placementReason,BARRACKS_LIMIT,type AzurePad} from './Building';
import {AzureBarracks,ELITE_FOOTMAN,FOOTMAN,TRAIN_STAGGER,TRAIN_TICKS} from './AzureBarracks';
import {Clock,HZ} from './Clock';
import type {AllyOrder,CartWreck,Command,GameEvent,GameState,PostState,Structure,Unit} from './GameState';
import {guardianStats,heroId,raiderId,minionStats,minionStatsOf,previewSeconds,crimsonHero,type MinionArchetype} from '../data/combat';
import {extendedWaveSpawns,type Encounter,type EncounterId,type SpawnEntry} from '../data/encounters';
import {matchSetup,type MatchCapture,type MatchCart,type MatchCommander,type MatchGate,type MatchPost,type MatchRepair,type MatchSetup} from '../data/matchSetup';
import {GRID,WORLD} from '../world/layout';
import {MissionTracker,type MatchOutcome,type MissionStatus,type OutcomeReason} from './Mission';
import {Geometry} from './Collision';
import {updateMovement} from './Movement';
import type {SoldierProto} from './SoldierProto';
import {ALLY_ID,allyKnight,resolveTarget,standAt} from './AllyProbe';
import {mercenary,mercenaryStats,reviveCost,REVIVE_TICKS} from '../data/mercenaries';
import {canAttackOn,damageAfterArmor} from './Combat';
import {Navigation} from './Navigation';
import {inTerritory,validateBattlefield,type Battlefield} from '../world/battlefield';
import {initialBases,matchRules} from '../data/match';
import {combatStructures,structuresFor} from './GameState';
import {initialProgression,Progression} from './Progression';
import {respawnTicks,skillRules,upgradeRules} from '../data/progression';
import {GuardianSkills,initialSkills} from './GuardianSkills';
import {guardianRanks} from '../data/guardian';
import type {GuardianSkill} from '../data/progression';
import {XPRewards} from './XPRewards';
import {stunned} from './Statuses';
import {initialInventory,equipmentBuildingMultiplier} from './Inventory';
import {validateArtifactCatalog,artifact,artifactAvailability,immutable} from '../data/artifacts';
import {quoteArtifact} from './ArtifactQuotes';
import {RESOURCE_UNITS} from '../data/resources';
import {initialCriticalRandom,criticalRoll,equipmentCritBasisPoints,defaultCritSeed} from './CriticalHits';
import {ArtifactTransactions,validTradeCommand,artifactAccessReasonOn,prepareArtifactSale} from './ArtifactTransactions';
const COMMANDER_REACH=6; // Chapter 4 M6, see commanderPlan
// Chapter 5: the shape of an 'ally' command; whether it is allowed is allyOrderReason, at the tick it runs.
const validAllyCommand=(c:Extract<Command,{type:'ally'}>)=>typeof c.requestId==='string'&&!!c.requestId&&c.requestId.length<=100&&typeof c.id==='string'&&!!c.order&&(c.order.type==='follow'||(c.order.type==='attack'&&typeof c.order.targetId==='string')||(c.order.type==='defend'&&Number.isFinite(c.order.x)&&Number.isFinite(c.order.y)));
// Chapter 5 Phase 1B: the shape of a 'tavern' command; whether it is allowed is Simulation.tavernReason, at the tick it runs.
const validTavernCommand=(c:Extract<Command,{type:'tavern'}>)=>typeof c.requestId==='string'&&!!c.requestId&&c.requestId.length<=100&&(c.action==='hire'?typeof c.merc==='string':(c.action==='revive'||c.action==='dismiss')&&Number.isInteger(c.slot));
// Cells around the Tavern (in 48 px steps) where a hired or revived hero may appear, nearest first.
const TAVERN_RING=[[0,1],[1,1],[-1,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1],[0,2],[2,0],[-2,0],[0,-2]] as const;
export class Simulation {
 readonly clock=new Clock();
 // Chapter 2 S1: this match's map and the geometry bound to it, handed to every consumer. Never part of GameState.
 readonly field:Battlefield;
 readonly geo:Geometry;
 readonly navigation:Navigation;
 readonly state:GameState={burns:{},criticalRandom:initialCriticalRandom(),inventory:initialInventory('match'),heroProgression:initialProgression(),skills:initialSkills(),bases:{},match:{phase:'initializing'},units:{},structures:{},wood:180,iron:30,move:{x:0,y:0},attacking:false,encounter:{id:'prototype',waveCount:0,reserved:[]},gold:250,kills:0,spawnedWaves:0,guardianDeaths:0,previewReady:{}};
 readonly encounter:Encounter;
 // PROTOTYPE (Chapter 3 soldier AI): set by a test harness only; undefined in every scene, level and debug launch.
 soldierProto?:SoldierProto;
 // Chapter 3 Azure Barracks V1: the authored pads of this match (none outside Chapter 3 tests and the debug scenario) and the soldiers its Barracks train.
 azurePads:readonly AzurePad[]=[];azureLimit=BARRACKS_LIMIT;
 private azure!:AzureBarracks;
 get azureBarracks(){return this.azure;}
 readonly spawnQueue:SpawnEntry[]=[];
 private progression=new Progression(this.state.heroProgression);
 private rewards:XPRewards;
 readonly skills:GuardianSkills;
 private economy:Economy;
 readonly setup:MatchSetup;
 private placements=new Set<string>();
 private trades:ArtifactTransactions;
 private burn:BurnEffects;
 // Stage 2 S1: objectives of a mission setup; null = legacy Keep-destruction outcome. Read progress through missionStatus().
 private mission:MissionTracker|null=null;
 private finalOutcome:MatchOutcome|null=null;
 get outcome(){return this.finalOutcome;}
 missionStatus():MissionStatus|null{return this.mission?.status(this.finalOutcome)??null;}
 shopAccessReason(){return !this.setup.shop?'Shop unavailable in this encounter':this.clock.paused||this.clock.timeScale===0?'Paused':artifactAccessReasonOn(this.geo,this.state);}
 shopPurchaseQuote(itemId:string,components:readonly string[]=[]){const quote=quoteArtifact(this.state.inventory,itemId,this.economy.goldUnits,components);const reason=this.shopAccessReason()||(!quote.tradingEnabled?'Artifact unavailable':!quote.hasCapacity?'Inventory full':!quote.affordable?'Not enough Gold':undefined);return immutable({quote,available:!reason,reason});}
 shopSaleQuote(instanceId:string){try{const item=this.state.inventory.instances[instanceId];if(!item||!artifactAvailability(artifact(item.itemId)).tradingEnabled)return immutable({available:false,reason:'Item unavailable',refundGold:0});const plan=prepareArtifactSale(this.state.inventory,instanceId,this.economy.goldUnits),reason=this.shopAccessReason();return immutable({available:!reason,reason,refundGold:plan.goldDeltaUnits/RESOURCE_UNITS});}catch{return immutable({available:false,reason:'Invalid sale',refundGold:0});}}
 constructionQuote(kind:BuildingKind,factor?:number){return this.economy.constructionQuote(kind,factor);}
 // Chapter 4 M1: the price of a placement as it will be charged (a ruin's repair is a fraction of the tower's cost); the plain quote for every other cell.
 placementQuote(kind:BuildingKind,col:number,row:number){return this.economy.constructionQuote(kind,this.repairFactor(kind,col,row));}
 // Chapter 4 M5: the camps of this match in setup order (M1-M3: the one post), and their live state in the same order (filled by initPost).
 private campList?:readonly MatchPost[];
 get camps():readonly MatchPost[]{return this.campList??=this.setup.posts??(this.setup.post?[this.setup.post]:[]);}
 readonly postStates:PostState[]=[];
 campName(i:number){return this.camps[i]?.name??'Forest Camp';}
 // Chapter 4 M1: the cell of the (first) post's ruin, and whether a placement there is a repair (a tower on the ruin once the post is Azure).
 get ruin(){return this.camps[0]?.ruin;}
 // Chapter 4 M2: the camp's second ruin (a Ballista, fixed location), its display name, and the price a repair there is charged.
 get ballistaRuin(){return this.camps[0]?.ballista;}
 get postName(){return this.campName(0);}
 get postFirstNotice(){return this.camps[0]?.firstNotice;}
 repairPrice(kind:BuildingKind){return this.economy.constructionQuote(kind,(this.camps[0]?.repair.percent??100)*100);}
 // The camp whose ruin (a tower), Ballista ruin or (Chapter 4 M6) ruined Barracks this placement repairs, while that camp is Azure; -1 for any other placement.
 private repairCamp(kind:BuildingKind,col:number,row:number){return kind!=='tower'&&kind!=='ballista'&&kind!=='barracks'?-1:this.camps.findIndex((c,i)=>{const r=kind==='ballista'?c.ballista:kind==='barracks'?c.barracksRuin:c.ruin;return !!r&&col===r.col&&row===r.row&&this.postStates[i]?.owner==='azure';});}
 repairSite(kind:BuildingKind,col:number,row:number){return this.repairCamp(kind,col,row)>=0;}
 private repairFactor(kind:BuildingKind,col:number,row:number){const i=this.repairCamp(kind,col,row);return i<0?undefined:(kind==='barracks'?this.camps[i].barracksRuin!.percent:this.camps[i].repair.percent)*100;}
 // Chapter 4 M1: a camp's build circle is Azure ground only while the camp is Azure; the Keep's own territory is always open.
 inTerritory(x:number,y:number){return inTerritory(this.field,x,y)&&!(this.postStates.some(p=>p.owner!=='azure'&&Math.hypot(x-p.circle.x,y-p.circle.y)<=p.circle.radius)&&Math.hypot(x-this.field.territory.x,y-this.field.territory.y)>this.field.territory.radius);}

 placementReason(kind:BuildingKind,col:number,row:number){
  const at=(r?:{col:number;row:number})=>!!r&&col===r.col&&row===r.row,x=(col+.5)*GRID,y=(row+.5)*GRID;
  if(kind==='tavern'){if(!this.setup.tavern)return 'Tavern unavailable';if(Object.values(this.state.structures).some(b=>b.tavern&&b.hp>0))return 'Tavern already built';} // Chapter 5 Phase 1B: one at a time
  if(kind==='ballista'&&!this.camps.some(c=>at(c.ballista)))return 'Not a Ballista ruin';
  if(kind!=='ballista'&&this.camps.some(c=>at(c.ballista)))return 'Ruined Ballista: repair it with a Ballista';
  for(const [i,p] of this.postStates.entries()){
   if(kind==='barracks'&&p.owner!=='azure'&&Math.hypot(x-p.circle.x,y-p.circle.y)<=p.circle.radius)return `Capture the ${this.campName(i)} first`; // Chapter 4 M3: a pad inside the camp opens with the camp
   if(at(p.ruin)&&kind!=='tower')return 'Ruined tower: repair it with a tower';
   if(at(this.camps[i].barracksRuin)&&kind!=='barracks')return 'Ruined Barracks: repair it with a Barracks'; // Chapter 4 M6: the cell is kept for the Barracks
   if(Number.isInteger(col)&&Number.isInteger(row)&&kind!=='barracks'&&p.owner!=='azure'&&Math.hypot(x-p.circle.x,y-p.circle.y)<=p.circle.radius&&!this.inTerritory(x,y)&&inTerritory(this.field,x,y))return `Capture the ${this.campName(i)} first`;
  }
  return placementReason(this.field,this.state,kind,col,row,{wood:this.economy.woodUnits/RESOURCE_UNITS,iron:this.economy.ironUnits/RESOURCE_UNITS},this.azurePads,this.azureLimit,this.repairFactor(kind,col,row));
 }
 private commands:Command[]=[]; private events:GameEvent[]=[];
 // combat: Gameplay v0.4.1 durability variant; defaults to the active balance (Variant B). Variant A reproduces v0.4.
 readonly combat:CombatVariant;
 // encounter: a legacy EncounterId (resolved with matchSetup at construction) or a prepared MatchSetup.
 constructor(matchId='match',encounter:EncounterId|MatchSetup='prototype',critSeed=defaultCritSeed,combat:CombatVariant=activeCombatVariant){this.combat=combat;validateArtifactCatalog();const setup=this.setup=typeof encounter==='string'?matchSetup(encounter):encounter;this.field=validateBattlefield(setup.battlefield);this.geo=new Geometry(this.field);this.navigation=new Navigation(this.geo);this.azure=new AzureBarracks(this.state,this.geo,()=>this.encounter.caps.blue,(id,x,y,elite)=>this.spawnSoldier(id,x,y,elite));this.checkFlank(setup);this.state.bases=initialBases(this.field,this.setup.crimsonKeepHp);this.economy=new Economy(this.state,setup.start);this.state.gold=setup.start.gold;this.state.wood=setup.start.wood;this.state.iron=setup.start.iron;this.state.criticalRandom=initialCriticalRandom(critSeed);this.state.inventory=initialInventory(matchId);this.encounter=setup.encounter;this.state.encounter={id:setup.encounterId,waveCount:this.encounter.waves.length,reserved:this.encounter.reserved};this.rewards=new XPRewards(matchId,this.geo);this.skills=new GuardianSkills(this.geo,this.state,(source,target,amount,type,castId)=>this.hit(source,target,amount,type,castId),e=>this.events.push(e),u=>this.rewards.life(u),{base:combat.guardianBaseHp,growth:combat.guardianHpGrowth});this.state.units.guardian=this.unit('guardian','guardian',setup.start.guardian.x,setup.start.guardian.y);this.hero.hp=this.hero.maxHp=combat.guardianBaseHp;this.burn=new BurnEffects(this.geo,this.state,u=>this.rewards.life(u),(source,target,amount)=>this.hit(source,target,amount,'magic'));this.trades=new ArtifactTransactions(this.geo,this.state,this.economy,matchId,()=>this.skills.refreshStats(),e=>this.events.push(e));for(const e of this.field.entities.filter(e=>e.kind==='minion-blue'))this.state.units[e.id]=this.unit(e.id,'minion-blue',e.x,e.y);for(const d of this.encounter.defenders)this.state.structures[d.id]=this.defender(d.id,d.kind,d.x,d.y);for(const g of setup.gates??[])this.state.structures[g.id]=this.gate(g);for(const b of setup.barracks??[])this.state.structures[b.id]=this.gate(b);for(const c of setup.captures??[]){const site=c.elite&&setup.battlefield.barracks?.find(x=>x.id===c.id);if(site&&c.elite)this.state.structures[c.id]=this.gate({id:site.id,x:site.x,y:site.y,columns:site.columns,rows:site.rows,hp:c.elite.hp});}if(setup.azure){this.azurePads=setup.azure.pads;this.azureLimit=setup.azure.limit??BARRACKS_LIMIT;for(const [i,p] of setup.azure.initial.entries())this.state.structures[`azure-barracks-${i}`]=this.startingBarracks(`azure-barracks-${i}`,p);}this.initPost(setup);this.initFortress(setup);this.initCommanders(setup);this.checkGates(setup);this.armKeeps();this.state.match.phase='playing';for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures)])this.rewards.life(u);if(setup.mission)this.mission=new MissionTracker(setup.mission,this);}
 // Pre-completed enemy structure: same tower stats and combat as player-built towers, no special rules.
 // Chapter 2 S7: every flank waypoint a wave uses must be open for the minion radius (12, Raiders included) and the wider 20 px margin Navigation tests use.
 private checkFlank(setup:MatchSetup){for(const f of [...(setup.waveRules?.flanks??[]),...(setup.waveRules?.lanes??[]).flatMap(()=>(['north','south'] as const).map(lane=>({lane})))]){const p=this.field.flankVia?.[f.lane];if(!p||[12,20].some(r=>this.geo.blocked(p.x,p.y,r)))throw new Error(`Flank waypoint ${f.lane} is missing or blocked`);}}
 // Chapter 3 C3-1: a Frost Gate is a pre-completed red wall with the level's hit points and the site's footprint. It follows the wall rules: it never attacks, blocks movement and sight while it lives,
 // is a legal target for the Guardian (and for any tower in reach), is removed like any structure when destroyed, and rewards nothing (no XP: enemyXp.wall is 0; no Gold: only red minions pay). Crimson units cannot breach it, being its own team's.
 // Also builds the C3-2 Barracks: a pre-completed red wall with a footprint and the level's hit points; it never attacks, gives no XP or Gold and is removed when it dies.
 private gate(g:MatchGate):Structure{const d=buildings.wall;return {id:g.id,kind:'wall',team:'red',...(g.faction&&{gate:true as const}),x:g.x,y:g.y,col:Math.floor(g.x/GRID),row:Math.floor(g.y/GRID),startTick:0,completeTick:0,progress:1,constructionDamage:0,...d,columns:g.columns,rows:g.rows,maxHp:g.hp,hp:g.hp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};}
 // Chapter 3 M3: a Barracks the match starts with. Finished before tick 0 (its first training falls due at once), on a pad, free of charge; an authoring error in its cell is thrown here.
 private startingBarracks(id:string,p:AzurePad):Structure{
  const reason=placementReason(this.field,this.state,'barracks',p.col,p.row,{wood:Infinity,iron:Infinity},this.azurePads,this.azureLimit);
  if(reason)throw new Error(`Starting Azure Barracks at ${p.col},${p.row}: ${reason}`);
  const d=buildings.barracks;return {id,kind:'wall',azureBarracks:true,team:'blue',x:(p.col+.5)*GRID,y:(p.row+.5)*GRID,col:p.col,row:p.row,startTick:0,completeTick:-(TRAIN_TICKS+TRAIN_STAGGER),progress:1,constructionDamage:0,...d,hp:d.maxHp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};
 }
 // Guard against an authoring error (Chapter 4 M2: seen as Crimson sees it, so a faction gate does not count as a seal): with the gates standing, every Crimson spawn slot must still reach the Azure side (a flood fill over the grid at the minion radius), or a wave would stand still forever.
 private checkGates(setup:MatchSetup){
  if(!(setup.gates?.length||setup.barracks?.length)||!setup.waveRules)return;
  const cols=WORLD.width/GRID,rows=WORLD.height/GRID,st=structuresFor(this.state,'red'),cell=(x:number,y:number)=>Math.floor(y/GRID)*cols+Math.floor(x/GRID);
  // The cells a minion can walk to from the Azure Keep, with the given structures standing.
  const reach=(st:ReturnType<typeof combatStructures>)=>{const seen=new Set<number>([cell(this.field.objectives.red.x,this.field.objectives.red.y)]),stack=[...seen];
   while(stack.length){const i=stack.pop()!,c=i%cols,r=Math.floor(i/cols);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr,n=nr*cols+nc;if(nc<0||nr<0||nc>=cols||nr>=rows||seen.has(n)||this.geo.blocked((nc+.5)*GRID,(nr+.5)*GRID,minionStats.radius,st))continue;seen.add(n);stack.push(n);}}return seen;};
  const seen=reach(st);
  // Garrison slots (balance v3) belong inside the sealed area: closed to the Azure side while the gate stands, open for a minion and connected to the Azure Keep once the gates are gone.
  if(setup.garrison)for(const trigger of [setup.garrison.after].flat()){const gone=Object.fromEntries(Object.entries(st).filter(([id])=>id!==trigger&&!(setup.gates?.some(g=>g.id===trigger)&&setup.gates.some(g=>g.id===id)))),after=reach(gone); // every trigger must open the way by itself: a gate trigger takes every gate with it (as before), a Barracks trigger only itself
   for(const [x,y] of [...setup.garrison.slots,...(setup.hero?[setup.hero.spawn]:[])]){if(this.geo.blocked(x,y,minionStats.radius,gone))throw new Error('A garrison slot is blocked');if(seen.has(cell(x,y))&&!setup.gates?.some(gt=>gt.id===trigger&&gt.faction))throw new Error('A garrison slot is outside the sealed area'); /* Chapter 4 M6: Crimson walk through a faction gate, so it seals nothing for them */if(!after.has(cell(x,y)))throw new Error('A garrison slot cannot reach the Azure Keep');}}
  if(setup.waveRules.redSlots.some(([x,y])=>!seen.has(cell(x,y))))throw new Error('The Frost Gates seal a Crimson spawn slot from the Azure Keep');
  if(setup.waveRules.redSlots.some(([x,y])=>this.geo.blocked(x,y,minionStats.radius,st)))throw new Error('A Crimson spawn slot is blocked'); // a fortress map moves the slots, so each must be open ground for a minion
 }
 private defender(id:string,kind:'tower',x:number,y:number):Structure{const d=buildings[kind];return {id,kind,team:'red',x,y,col:Math.floor(x/48),row:Math.floor(y/48),startTick:0,completeTick:0,progress:1,constructionDamage:0,...d,hp:d.maxHp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};}
 // Gameplay v0.4 Keep defense (setup.keepDefense; only the extended setup arms the Crimson Keep by default): a configured Keep attacks with the same strike rules as a tower. HP is unchanged.
 private keepTargeting:Record<string,KeepDefense['targeting']>={};
 private armKeeps(){if(this.setup.crimsonKeepInvulnerable&&this.state.bases['red-base'])this.state.bases['red-base'].invulnerable=true;for(const [id,team] of [['red-base','red'],['blue-base','blue']] as const){const d=this.setup.keepDefense[team],b=this.state.bases[id];if(!d||!b)continue;b.damage=team==='red'?this.combat.crimsonKeepDamage??d.damage:d.damage;b.cooldownTicks=d.cooldownTicks;b.range=d.range;b.windupTicks=0;this.keepTargeting[id]=d.targeting;}}
 private spawnOpen(e:SpawnEntry){if(!this.encounter.deferBlocked)return true;const s=this.state;return !this.geo.blocked(e.x,e.y,minionStats.radius,combatStructures(s))&&Object.values(s.units).every(u=>u.hp<=0||Math.hypot(u.x-e.x,u.y-e.y)>=(this.setup.waveRules?.spawnClearance??0));}
 // Due entries spawn in schedule order. Extended defers a blocked/capped team's entries; prototype keeps its inherited drop-at-cap behavior.
 // Waves beyond the scripted list keep the 40 s cadence. A team already holding a full queue gets no extra entries, so a stalled spawn can never grow the queue without bound.
 private continueWaves(tick:number){
  const s=this.state,r=this.setup.waveRules;if(!r||!this.encounter.continuous||s.spawnedWaves<this.encounter.waves.length)return;
  const n=s.spawnedWaves+1;if(tick<r.firstWaveTick+(n-1)*r.waveInterval)return;
  const queued=(team:'red'|'blue')=>this.spawnQueue.filter(e=>e.team===team).length;
  this.spawnQueue.push(...extendedWaveSpawns(n,r).filter(e=>queued(e.team)<this.encounter.caps[e.team]));
  s.spawnedWaves++;this.events.push({type:'wave',index:n});
 }
 // Chapter 3 C3-1 balance v3: garrison waves start when the named gate dies and use the ordinary spawn queue and caps. Private to the Simulation, like the queue itself.
 private garrison:{next:number;n:number}|null=null;
 // Every Crimson Hero of the match by unit id: where he returns, how soon after a death, and the tick he is (re)released (null = not due). Chapter 3 M6's Hero is due when the garrison starts;
 // Chapter 4's Defender (a camp's hero) starts on the field; Chapter 4 M5's Raider (setup.hero beside camps) is due `delayTicks` after the start. Each is due again `respawnTicks` after each death while the Crimson Keep stands.
 private heroes=new Map<string,{readonly spawn:readonly [number,number];readonly respawnTicks:number;next:number|null}>();
 // Chapter 4 M1: each camp starts Crimson, its Hero (if any) standing at his anchor, and the Crimson Keep shielded until every camp is Azure.
 private initPost(setup:MatchSetup){
  if(setup.hero&&!this.camps.length)this.heroes.set(heroId,{spawn:setup.hero.spawn,respawnTicks:setup.hero.respawnTicks,next:null});
  if(!this.camps.length)return;
  for(const c of this.camps){
   if(this.geo.blocked(c.flag.x,c.flag.y,12,combatStructures(this.state)))throw new Error('The post flag is blocked');
   if(c.ballista){const reason=placementReason(this.field,this.state,'tower',c.ballista.col,c.ballista.row,{wood:Infinity,iron:Infinity});if(reason)throw new Error(`The Ballista ruin is not open ground: ${reason}`);}
   this.postStates.push({...(c.id&&{id:c.id}),owner:'crimson',captured:false,losses:0,counterDone:false,flag:{...c.flag},...(c.hero&&{anchor:{x:c.hero.anchor[0],y:c.hero.anchor[1]},guard:c.hero.guard}),circle:{...c.circle},ruin:{...c.ruin}});
  }
  this.state.post=this.postStates[0];if(setup.posts)this.state.posts=this.postStates;
  if(setup.campShield!==false)this.state.bases['red-base'].invulnerable=true; // Chapter 4 M6: campShield false leaves the Keep open from the start
  const d=this.camps.find(c=>c.hero)?.hero;if(d){this.heroes.set(heroId,{spawn:d.spawn,respawnTicks:d.respawnTicks,next:null});this.state.units[heroId]=this.unit(heroId,'minion-red',d.anchor[0],d.anchor[1],'crimson-hero');}
  if(setup.hero)this.heroes.set(raiderId,{spawn:setup.hero.spawn,respawnTicks:setup.hero.respawnTicks,next:setup.hero.delayTicks});
 }
 // Once per tick, after combat and construction, for each camp: a finished Banner makes the camp Azure (the first time, the Elites counterattack), a dead one makes it Crimson again, and a Guardian within the ring of a clear flag with every holder dead raises a new Banner.
 // The Keep is shielded while any camp is not Azure. A camp with an id (Chapter 4 M5) names its Banner, its Elites and its events after it.
 private updatePost(tick:number){
  const s=this.state;if(!this.postStates.length)return;
  for(const [i,p] of this.postStates.entries()){
   const c=this.camps[i],tag=c.id?{camp:c.id}:{},banner=p.bannerId?s.structures[p.bannerId]:undefined;
   if(p.bannerId&&!(banner&&banner.hp>0)){p.bannerId=undefined;if(p.owner==='azure'){p.owner='crimson';p.losses++;this.events.push({type:'post',change:'lost',...tag});}else this.events.push({type:'post',change:'failed',...tag});}
   else if(banner&&p.owner==='crimson'&&tick>=banner.completeTick){
    p.owner='azure';p.captured=true;const first=!p.counterDone;this.events.push({type:'post',change:'captured',...(first&&{first:true as const}),...tag});
    if(first){p.counterDone=true;const w=this.setup.waveRules,queued=this.spawnQueue.filter(e=>e.team==='red').length;if(w)for(let k=0;k<c.counter.count&&queued+k<this.encounter.caps.red;k++){const [x,y]=c.counter.slots[k%c.counter.slots.length];this.spawnQueue.push({tick:tick+k*w.spawnStagger,team:'red',id:c.id?`red-ca-${c.id}-${k}`:`red-ca-${k}`,x,y,wave:0,archetype:'crimson-elite'});}}
   }else if(!p.bannerId&&p.owner==='crimson'&&this.capturer(c.flag.x,c.flag.y,c.ring)&&c.holders.every(id=>!(s.structures[id]?.hp>0))
    &&!Object.values(s.structures).some(b=>Math.abs(b.x-c.flag.x)<GRID&&Math.abs(b.y-c.flag.y)<GRID)&&!Object.values(s.units).some(u=>u.hp>0&&Math.abs(u.x-c.flag.x)<24+u.radius&&Math.abs(u.y-c.flag.y)<24+u.radius)){
    const id=c.id?`c4-banner-${c.id}`:'c4-banner',d=buildings.wall;
    s.structures[id]={id,kind:'wall',banner:true,team:'blue',x:c.flag.x,y:c.flag.y,col:Math.floor(c.flag.x/GRID),row:Math.floor(c.flag.y/GRID),startTick:tick,completeTick:tick+c.raiseTicks,progress:1/c.raiseTicks,constructionDamage:0,...d,maxHp:c.bannerHp,hp:c.bannerHp/c.raiseTicks,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};
    p.bannerId=id;this.events.push({type:'post',change:'raising',...tag});
   }
  }
  const keep=s.bases['red-base'];if(this.setup.campShield===false)return;if(this.postStates.every(p=>p.owner==='azure'))delete keep.invulnerable;else keep.invulnerable=true;
 }
 // Chapter 4 M4 (docs/CHAPTER4_M4.md): the War Cart, the capturable gates and Elite Barracks, and the Crimson Hero's guard post. Every state here lives in GameState (cartWreck, captures, guard) so a saved or inspected match shows it.
 private eliteNext=new Map<string,number>();private eliteSerial=0;
 private initFortress(setup:MatchSetup){
  const st=combatStructures(this.state),open=(x:number,y:number,r:number)=>!this.geo.blocked(x,y,r,st),fail=(what:string)=>{throw new Error(`${what} is not open ground`);};
  if(setup.cart){if(!open(setup.cart.start[0],setup.cart.start[1],12))fail('The War Cart start');for(const s of setup.cart.sites)if(!open((s.col+.5)*GRID,(s.row+.5)*GRID,12))fail(`The wreck site ${s.col},${s.row}`);if(setup.cart.wreckAtStart){const s=setup.cart.sites[0];this.state.cartWreck={col:s.col,row:s.row,x:(s.col+.5)*GRID,y:(s.row+.5)*GRID};}} // Chapter 5 M5: the wreck is there from tick 0
  if(setup.tavern)this.state.tavern={slots:[]}; // Chapter 5 Phase 1B
  for(const c of setup.captures??[]){this.state.captures??={};this.state.captures[c.id]={stage:'crimson',progress:0};for(const [x,y] of c.elite?.slots??[])if(!open(x,y,minionStatsOf('crimson-elite').radius))fail(`An Elite Barracks slot ${x},${y}`);if(c.elite)this.eliteNext.set(c.id,c.elite.intervalTicks);}
  const gd=setup.guard;if(gd){if(!open(gd.anchor[0],gd.anchor[1],minionStatsOf('crimson-hero').radius)||!open(gd.spawn[0],gd.spawn[1],minionStatsOf('crimson-hero').radius))fail('The Hero guard post');
   this.state.guard={anchor:{x:gd.anchor[0],y:gd.anchor[1]},radius:gd.radius,raid:false};this.state.units[heroId]=this.unit(heroId,'minion-red',gd.anchor[0],gd.anchor[1],'crimson-hero');this.heroes.set(heroId,{spawn:gd.spawn,respawnTicks:gd.respawnTicks,next:null});} // Chapter 4 M4's guard post: its Hero is released again respawnTicks after each death
 }
 // The Crimson cart died: its wreck goes to the nearest authored site. There is one wreck at a time and only a Crimson cart leaves one, so a repaired Azure cart that dies leaves nothing.
 private leaveWreck(cart:Unit){
  const c=this.setup.cart;if(!c||this.state.cartWreck)return;
  const site=c.sites.map(s=>({col:s.col,row:s.row,x:(s.col+.5)*GRID,y:(s.row+.5)*GRID})).sort((a,b)=>Math.hypot(a.x-cart.x,a.y-cart.y)-Math.hypot(b.x-cart.x,b.y-cart.y)||a.col-b.col||a.row-b.row)[0];
  this.state.cartWreck={...site};this.events.push({type:'site',change:'wreck',id:'cart'});
 }
 // Chapter 5 M5: a start-as-wreck cart whose `post` is not yet Azure cannot be repaired.
 get cartLocked(){const ct=this.setup.cart;return !!ct?.post&&!this.postStates.some((p,i)=>this.camps[i]?.id===ct.post&&p.owner==='azure');}
 // A walk-in job: pays its fixed price the first tick the Guardian is in the ring and the price is affordable (once per id), then runs `ticks`. Tells the player, at most every 3 s, when he stands there short of resources.
 private payJob(id:string,job:MatchRepair,tick:number){
  if(this.economy.apply({type:'repair',id,wood:job.wood,iron:job.iron}))return true;
  if(tick%90===0)this.events.push({type:'site',change:'short',id});return false;
 }
 private updateFortress(tick:number){
  const s=this.state,h=this.hero,near=(x:number,y:number,r:number)=>h.hp>0&&Math.hypot(h.x-x,h.y-y)<=r;
  const ct=this.setup.cart;
  if(ct&&!ct.wreckAtStart&&tick===ct.startTick)this.spawnQueue.push({tick,team:'red',id:'red-cart',x:ct.start[0],y:ct.start[1],wave:0,archetype:'war-cart'});
  const w=s.cartWreck;
  if(w&&ct){
   if(!w.repair){if(near(w.x,w.y,ct.ring)&&!this.cartLocked&&this.payJob('cart',ct.repair,tick)){w.repair={complete:tick+ct.repair.ticks};this.events.push({type:'site',change:'repairing',id:'cart'});}}
   else if(tick>=w.repair.complete)this.finishCartRepair(w,ct);
  }
  for(const c of this.setup.captures??[]){
   const cs=s.captures![c.id],b=s.structures[c.id];if(cs.stage==='lost')continue;
   if(!(b?.hp>0)){cs.stage='lost';this.events.push({type:'site',change:'lost',id:c.id});continue;} // destroyed: a breach (a gate) or rubble; nothing reverts to Crimson
   if(cs.stage==='crimson'){
    cs.progress=this.capturer(b.x,b.y,c.ring)&&c.holders.every(id=>!(s.structures[id]?.hp>0))?cs.progress+1:0;
    if(cs.progress>=c.captureTicks){cs.stage='captured';cs.progress=0;if(c.elite)b.team='blue';else b.open=true;this.events.push({type:'site',change:'captured',id:c.id});}
   }else if(cs.stage==='captured'){
    if(cs.repairDone===undefined){if(near(b.x,b.y,c.ring)&&this.payJob(`repair:${c.id}`,c.repair,tick)){cs.repairDone=tick+c.repair.ticks;this.events.push({type:'site',change:'repairing',id:c.id});}}
    else if(tick>=cs.repairDone){cs.stage='azure';this.convert(b,c);this.events.push({type:'site',change:'converted',id:c.id});}
   }
  }
  const gd=this.setup.guard;if(gd&&s.guard&&!s.guard.raid){const g=s.structures[gd.raidAfter];if(!(g?.hp>0&&g.team==='red'&&!g.open)){s.guard.raid=true;this.events.push({type:'site',change:'raid',id:gd.raidAfter});}}
 }
 // Repair finished: one Azure cart on the nearest open cell around the wreck (a unit standing there only delays it); the wreck is gone for good.
 private finishCartRepair(w:CartWreck,ct:MatchCart){
  const st=combatStructures(this.state),units=Object.values(this.state.units).filter(u=>u.hp>0);
  const spot=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2]].map(([dx,dy])=>({x:w.x+dx*GRID,y:w.y+dy*GRID})).find(p=>!this.geo.blocked(p.x,p.y,12,st)&&units.every(u=>Math.hypot(u.x-p.x,u.y-p.y)>=u.radius+12));
  if(!spot)return;
  const id='blue-c-1',stats=minionStatsOf('war-cart');
  this.state.units[id]={...this.unit(id,'minion-blue',spot.x,spot.y,undefined,undefined,this.clock.tick),...stats,hp:stats.maxHp,cart:{follow:ct.follow,order:[...ct.order]}};
  this.state.cartWreck=undefined;this.events.push({type:'spawn',id},{type:'site',change:'repaired',id:'cart'});
 }
 // Conversion: a gate becomes Azure's (transparent to Azure, solid for Crimson, still destructible) at full hit points; a Crimson unit inside its footprint steps to the nearest open point first, or it would be inside a wall for good.
 // The Barracks becomes an Azure Barracks that trains Elites; it is not counted against the Azure Barracks limit (Building.ts).
 private convert(b:Structure,c:MatchCapture){
  b.hp=b.maxHp;b.team='blue';
  if(c.elite){b.azureBarracks=true;b.eliteBarracks=true;b.completeTick=this.clock.tick;return;}
  delete b.open;
  const view=structuresFor(this.state,'red');
  for(const u of Object.values(this.state.units))if(u.team==='red'&&u.hp>0&&this.geo.blocked(u.x,u.y,u.radius,{[b.id]:b})){
   const spot=[...Array(30).keys()].flatMap(k=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:u.x+dx*(k+1)*12,y:u.y+dy*(k+1)*12}))).find(p=>!this.geo.blocked(p.x,p.y,u.radius,view));
   if(spot){u.x=spot.x;u.y=spot.y;}
  }
 }
 // A Crimson Elite Barracks trains `count` Elites at its own slots every interval while it stands and is still Crimson's (the spawn queue's own caps apply).
 private eliteDue(tick:number){
  const w=this.setup.waveRules;if(!w)return;
  for(const c of this.setup.captures??[]){
   const e=c.elite,b=this.state.structures[c.id],next=this.eliteNext.get(c.id);if(!e||next===undefined||tick<next)continue;
   if(!(b?.hp>0)||b.team!=='red')continue;
   const queued=this.spawnQueue.filter(q=>q.team==='red').length;
   for(let i=0;i<e.count&&queued+i<this.encounter.caps.red;i++){const [x,y]=e.slots[i%e.slots.length];this.spawnQueue.push({tick:tick+i*w.spawnStagger,team:'red',id:`red-eb-${++this.eliteSerial}`,x,y,wave:0,archetype:'crimson-elite'});}
   this.eliteNext.set(c.id,tick+e.intervalTicks);
  }
 }
 private heroDue(tick:number){
  const s=this.state;
  for(const [id,r] of this.heroes){
   if(r.next===null||tick<r.next)continue;
   if(s.bases['red-base'].hp<=0){r.next=null;continue;}
   const st=combatStructures(s),radius=minionStatsOf('crimson-hero').radius;
   // the spawn point, or the nearest free spot beside it when a garrison soldier stands there; never a teleport past a wall
   const spot=[[0,0],[48,0],[-48,0],[0,48],[0,-48],[48,48],[-48,48],[48,-48],[-48,-48]].map(([dx,dy])=>({x:r.spawn[0]+dx,y:r.spawn[1]+dy})).find(p=>!this.geo.blocked(p.x,p.y,radius,st)&&Object.values(s.units).every(u=>u.hp<=0||Math.hypot(p.x-u.x,p.y-u.y)>=radius+u.radius));
   if(!spot)continue;
   s.units[id]=this.unit(id,'minion-red',spot.x,spot.y,'crimson-hero',undefined,tick);r.next=null;this.events.push({type:'spawn',id});
  }
 }
 // Chapter 4 M6 (docs/CHAPTER4_M6.md): each Commander's next warning and release tick (null = not due) and what it decided at its warning. Private to the Simulation, like the Hero schedule.
 // The Marshal keeps his road. The Shadowblade picks, once per attack, the standing Azure Barracks farthest from the Guardian (the Azure Keep when none stands) and a road:
 // the target's own road when the target stands on one, otherwise the road the Marshal is not on while he marches or is announced, otherwise the road whose waypoint is farther from the Guardian.
 // A Commander takes the field at its road's spawn as a committed flank unit (Flank.ts) with its own timeout.
 // Navigation picks attack cells exactly 48 px (one cell) from a target, and the Crimson Hero's melee reach is 48: a Commander nudged a pixel off its cell by its escort stood out of reach and froze. The margin keeps it striking.
 private commanderPlan=new Map<string,{readonly c:MatchCommander;warn:number|null;release:number|null;lane?:'north'|'south';targetId?:string}>();
 private initCommanders(setup:MatchSetup){
  const st=combatStructures(this.state),radius=minionStatsOf('crimson-hero').radius;
  for(const c of setup.commanders??[]){
   for(const lane of ['north','south'] as const){const [x,y]=c.spawns[lane];if(this.geo.blocked(x,y,radius,st))throw new Error(`The ${c.name}'s ${lane} spawn is not open ground`);}
   this.commanderPlan.set(c.id,{c,warn:c.firstTick-c.warningTicks,release:null});
  }
 }
 private decide(r:{readonly c:MatchCommander;lane?:'north'|'south';targetId?:string}){
  const s=this.state,v=this.field.flankVia!,from=this.hero.hp>0?this.hero:s.bases['blue-base'],d=(p:{x:number;y:number})=>Math.hypot(p.x-from.x,p.y-from.y);
  if(r.c.lane){r.lane=r.c.lane;r.targetId=undefined;return;}
  const t=Object.values(s.structures).filter(b=>b.azureBarracks&&!b.eliteBarracks&&b.team==='blue'&&b.hp>0).sort((a,b)=>d(b)-d(a)||a.id.localeCompare(b.id))[0]??s.bases['blue-base'];
  r.targetId=t.id;
  const onRoad=t.x>=Math.min(v.north!.x,v.south!.x)-GRID?(Math.abs(t.y-v.north!.y)<Math.abs(t.y-v.south!.y)?'north' as const:'south' as const):undefined;
  const marshal=[...this.commanderPlan.values()].find(q=>q.c.lane&&(s.units[q.c.id]?.hp>0||q.release!==null));
  r.lane=onRoad??(marshal?.lane?(marshal.lane==='north'?'south':'north'):d(v.north!)>d(v.south!)?'north':'south');
 }
 private commanderDue(tick:number){
  const s=this.state;if(!this.commanderPlan.size||s.bases['red-base'].hp<=0)return;
  for(const [id,r] of this.commanderPlan){
   if(r.warn!==null&&tick>=r.warn){r.warn=null;r.release=tick+r.c.warningTicks;this.decide(r);this.events.push({type:'commander',id,change:'warning',lane:r.lane!,...(r.targetId&&{targetId:r.targetId}),releaseTick:r.release});}
   if(r.release===null||tick<r.release)continue;
   const c=r.c,b=crimsonHero.stats,st=combatStructures(s),[sx,sy]=c.spawns[r.lane!],free=(x:number,y:number,radius:number)=>!this.geo.blocked(x,y,radius,st)&&Object.values(s.units).every(u=>u.hp<=0||Math.hypot(x-u.x,y-u.y)>=radius+u.radius);
   // the spawn point, or the nearest free spot beside it when someone stands there (as heroDue)
   const ring=[[0,0],[48,0],[-48,0],[0,48],[0,-48],[48,48],[-48,48],[48,-48],[-48,-48],[96,0],[-96,0],[0,96],[0,-96]],spot=ring.map(([dx,dy])=>({x:sx+dx,y:sy+dy})).find(p=>free(p.x,p.y,b.radius));
   if(!spot)continue;
   const u=this.unit(id,'minion-red',spot.x,spot.y,'crimson-hero',r.lane,tick,true),hp=Math.round(b.maxHp*c.hp);
   Object.assign(u,{maxHp:hp,hp,damage:b.damage*c.damage,range:b.range+COMMANDER_REACH,cooldownTicks:Math.max(1,Math.round(b.cooldownTicks/c.attackSpeed)),windupTicks:Math.max(1,Math.round(b.windupTicks/c.attackSpeed)),speed:b.speed*c.speed,
    flank:{...u.flank!,timeout:c.flankTimeoutTicks},commander:{role:c.role,lane:r.lane!,structureBonus:c.structureBonus,keepBonus:c.keepBonus??c.structureBonus,...(r.targetId&&{targetId:r.targetId})}});
   s.units[id]=u;r.release=null;this.events.push({type:'spawn',id},{type:'commander',id,change:'released',lane:r.lane!,...(r.targetId&&{targetId:r.targetId})});
   const e=c.escort;if(!e)continue;
   for(let k=0;k<e.count;k++){
    const eid=`${id}-escort-${tick}-${k}`;
    if(!e.matchSpeed){this.spawnQueue.push({tick:tick+e.delayTicks,team:'red',id:eid,x:sx,y:sy,wave:0,lane:r.lane!,commit:true});continue;}
    const p=ring.slice(1).map(([dx,dy])=>({x:spot.x+dx,y:spot.y+dy})).find(q=>free(q.x,q.y,minionStats.radius));if(!p)continue;
    s.units[eid]={...this.unit(eid,'minion-red',p.x,p.y,undefined,r.lane,tick,true),speed:u.speed,escortOf:id};this.events.push({type:'spawn',id:eid});
   }
  }
 }
 private garrisonDue(tick:number){
  const g=this.garrison,r=this.setup.garrison,w=this.setup.waveRules,s=this.state;if(!g||!r||!w||tick<g.next||s.bases['red-base'].hp<=0)return;
  const count=r.counts[g.n%r.counts.length],queued=this.spawnQueue.filter(e=>e.team==='red').length;
  for(let i=0;i<count&&queued+i<this.encounter.caps.red;i++){const [x,y]=r.slots[i%r.slots.length];this.spawnQueue.push({tick:tick+i*w.spawnStagger,team:'red',id:`red-g${g.n+1}-${i}`,x,y,wave:0,...(r.archetype&&{archetype:r.archetype})});}
  g.n++;g.next+=r.intervalTicks;
 }
 private spawnDue(tick:number){
  const s=this.state,stalled=new Set<string>();
  // Chapter 3 C3-2: a Crimson entry whose spawn slot belongs to a destroyed Barracks is dropped before the tick, stall and cap checks below, so a dead Barracks can neither supply nor stall anyone, and its quota goes to no other Barracks.
  for(const c of this.setup.captures??[])if(c.elite&&!(this.state.structures[c.id]?.hp>0&&this.state.structures[c.id].team==='red'))for(let i=this.spawnQueue.length-1;i>=0;i--){const e=this.spawnQueue[i];if(e.team==='red'&&c.elite.slots.some(([x,y])=>x===e.x&&y===e.y))this.spawnQueue.splice(i,1);} // Chapter 4 M4: a captured or destroyed Elite Barracks supplies no one
  for(const b of this.setup.barracks??[])if(!(this.state.structures[b.id]?.hp>0))for(let i=this.spawnQueue.length-1;i>=0;i--){const e=this.spawnQueue[i];if(e.team==='red'&&b.slots.some(([x,y])=>x===e.x&&y===e.y))this.spawnQueue.splice(i,1);}
  for(const e of [...this.spawnQueue]){
   if(e.tick>tick||stalled.has(e.team))continue;
   const kind=e.team==='red'?'minion-red':'minion-blue',active=Object.values(s.units).filter(u=>u.kind===kind&&!u.ally).length; // an Allied Hero (Chapter 5 probe) holds no soldier slot
   if(active>=this.encounter.caps[e.team]||!this.spawnOpen(e)){if(this.encounter.deferBlocked){stalled.add(e.team);continue;}this.spawnQueue.splice(this.spawnQueue.indexOf(e),1);continue;}
   this.spawnQueue.splice(this.spawnQueue.indexOf(e),1);s.units[e.id]=this.unit(e.id,kind,e.x,e.y,e.archetype,e.lane,tick,e.commit);this.mission?.spawned(e);this.events.push({type:'spawn',id:e.id});
  }
 }
 // An Azure Barracks soldier: a blue minion with footman stats whose id starts blue-s-, which is what SoldierProto.isSoldier recognises. The first one switches the hybrid AI on (400 px leash) unless a harness already chose a mode.
 private spawnSoldier(id:string,x:number,y:number,elite=false){
  this.soldierProto??={mode:'hybrid',leash:400,...(this.setup.gates?.some(g=>g.assist)&&{assist:true as const}),...((this.setup.captures?.some(c=>c.elite)||this.setup.commanders)&&{cellAnchor:true as const})}; // cellAnchor (Chapter 4 M4): see SoldierProto.soldierAnchor // assist (Chapter 4 M3): see MatchGate
  this.state.units[id]={...this.unit(id,'minion-blue',x,y,undefined,undefined,this.clock.tick),...FOOTMAN,...(elite&&ELITE_FOOTMAN)};this.events.push({type:'spawn',id});
 }
 private unit(id:string,kind:Unit['kind'],x:number,y:number,archetype?:MinionArchetype,lane?:'north'|'south',tick=0,commit?:boolean):Unit{
  const stats=kind==='guardian'?guardianStats:kind==='minion-red'?minionStatsOf(archetype):minionStats;
  return {id,kind,team:kind==='guardian'||kind==='minion-blue'?'blue':'red',x,y,...stats,hp:stats.maxHp,readyTick:0,protectionTick:0,...(kind==='minion-red'&&archetype&&{archetype}),...(kind==='minion-red'&&archetype==='war-cart'&&{cart:{}}),...(kind==='minion-red'&&lane&&{flank:{lane,startTick:tick,...(commit&&{commit:true as const})}})};
 }
 get hero(){return this.state.units.guardian;}
 get ended(){return !!this.state.match.result;}
 clearHeroInput(){this.commands=this.commands.filter(c=>c.type==='place'||c.type==='learn');this.state.move={x:0,y:0};this.state.attacking=false;this.state.selectedTarget=undefined;this.hero.strike=undefined;}
 beginRestart(){this.burn.clear();this.state.match.phase='restarting';this.clock.paused=true;this.clearInput();}
 send(c:Command){
  if(this.ended||this.state.match.phase==='restarting')return false;
  if(this.clock.paused||this.clock.timeScale===0){this.events.push({type:'rejected',reason:'Paused'});return false;}
  if(!c||!['move','attack','target','preview','place','learn','cast','buy-item','sell-item','fuse-item','ally','tavern'].includes(c.type)||(c.type==='ally'&&!validAllyCommand(c))||(c.type==='tavern'&&!validTavernCommand(c))||((c.type==='buy-item'||c.type==='sell-item'||c.type==='fuse-item')&&!validTradeCommand(c))||(c.type==='place'&&(!Object.hasOwn(buildings,c.kind)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100||!Number.isInteger(c.col)||!Number.isInteger(c.row)))||(c.type==='learn'&&(!Object.hasOwn(upgradeRules,c.skill)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100))||(c.type==='cast'&&(!Object.hasOwn(skillRules,c.skill)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100||(c.direction&&(!Number.isFinite(c.direction.x)||!Number.isFinite(c.direction.y)))||(c.distance!==undefined&&(!Number.isFinite(c.distance)||c.distance<=0))))||(c.type==='move'&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)))||(c.type==='target'&&(!(this.state.units[c.id]??this.state.structures[c.id]??this.state.bases[c.id])||(this.state.units[c.id]??this.state.structures[c.id]??this.state.bases[c.id]).team==='blue'))||(c.type==='preview'&&!Object.hasOwn(previewSeconds,c.key))){this.events.push({type:'rejected',reason:'Invalid command'});return false;}
  if(c.type==='move')this.commands=this.commands.filter(v=>v.type!=='move');
  if(this.commands.length>=128)return false;
  this.commands.push(c.type==='fuse-item'?{...c,componentIds:[...c.componentIds]}:{...c});return true;
 }
 clearInput(resetClock=true){this.commands=[];this.state.move={x:0,y:0};this.state.attacking=false;this.state.selectedTarget=undefined;for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures),...Object.values(this.state.bases)]){u.strike=undefined;u.targetId=undefined;}if(resetClock)this.clock.reset();}
 setPaused(v:boolean){if(this.ended||this.state.match.phase==='restarting')return;this.clock.paused=v;this.state.match.phase=v||this.clock.timeScale===0?'paused':'playing';this.clearInput();}
 setTimeScale(v:number){if(!Number.isFinite(v)||v<0||v>2)throw new Error('Invalid timeScale');if(this.ended)return;this.clock.timeScale=v;this.state.match.phase=this.clock.paused||v===0?'paused':'playing';this.clock.reset();if(v===0)this.clearInput();}
 advance(delta:number){this.clock.advance(delta,()=>this.step());}
 drainEvents(){const result=this.events;this.events=[];return result;}
 remaining(key:string){return Math.max(0,((key==='attack'?this.hero.readyTick:this.state.skills.ready[key as keyof typeof this.state.skills.ready]||this.state.previewReady[key]||0)-this.clock.tick)/HZ);}
 // Last accepted interval remains stable through equipment/rank/life changes.
 cooldownInterval(skill:GuardianSkill){return this.state.skills.cooldownIntervals[skill]||guardianRanks[skill].cooldown[Math.max(0,this.state.heroProgression.ranks[skill]-1)];}
 teleportHero(x:number,y:number){if(this.ended||!Number.isFinite(x)||!Number.isFinite(y)||this.geo.blocked(x,y,this.hero.radius,combatStructures(this.state)))return false;this.hero.x=x;this.hero.y=y;this.hero.strike=undefined;return true;}
 // PROTOTYPE Chapter 5 Phase 0 (src/simulation/AllyProbe.ts): a capture ring is held by the living Guardian or any living Allied Hero inside it. Walk-in repairs (the wreck, a captured site) stay the Guardian's alone.
 private capturer(x:number,y:number,r:number){const h=this.hero;return (h.hp>0&&Math.hypot(h.x-x,h.y-y)<=r)||Object.values(this.state.units).some(u=>u.ally&&u.hp>0&&Math.hypot(u.x-x,u.y-y)<=r);}
 private allySerial=0;
 // Puts an Allied Hero (the Knight, on Follow) on open ground at x,y; returns its id, or undefined when the spot is blocked. Harness and ?allyTest only.
 spawnAlly(x:number,y:number,stats:Partial<Unit>=allyKnight):string|undefined{
  const st=combatStructures(this.state),radius=stats.radius??allyKnight.radius;
  if(this.ended||this.geo.blocked(x,y,radius,st)||Object.values(this.state.units).some(u=>u.hp>0&&Math.hypot(u.x-x,u.y-y)<u.radius+radius))return undefined;
  const id=`${ALLY_ID}${++this.allySerial}`;
  this.state.units[id]={...this.unit(id,'minion-blue',x,y,undefined,undefined,this.clock.tick),...allyKnight,...stats,hp:stats.maxHp??allyKnight.maxHp,ally:{order:{type:'follow'},slot:this.allySerial-1}};
  this.rewards.life(this.state.units[id]);this.events.push({type:'spawn',id});return id;
 }
 // Why a Simple Command would be refused, or undefined when it is valid (the HUD asks before it sends; the 'ally' command asks again at the tick it runs).
 // Attack needs a living hostile target that can be struck (a shielded Keep or a captured gate that stands open is refused); Defend needs open ground for the Hero.
 allyOrderReason(id:string,order:AllyOrder):string|undefined{
  const u=this.state.units[id];if(this.ended)return 'Match over';if(!u?.ally||u.hp<=0)return 'That hero has fallen';
  if(order.type==='attack'){const t=resolveTarget(this.state,order.targetId);if(!t||t.hp<=0)return 'Tap an enemy or a structure';if(t.team!=='red')return 'Pick an enemy, not an ally';if(t.invulnerable)return 'Shielded · capture the camps first';if(t.open)return 'That gate stands open';}
  if(order.type==='defend'&&(!Number.isFinite(order.x)||!Number.isFinite(order.y)||this.geo.blocked(order.x,order.y,u.radius,combatStructures(this.state))))return "Can't hold there";
  return undefined;
 }
 // Applies a Simple Command at once (the probe harness; play goes through send({type:'ally'})). False when refused.
 orderAlly(id:string,order:AllyOrder){
  if(this.allyOrderReason(id,order))return false;
  const u=this.state.units[id];
  u.ally={order:order.type==='defend'?{type:'defend',...standAt(this.geo,order,combatStructures(this.state),u.radius)}:{...order},slot:u.ally!.slot,...(u.ally!.merc&&{merc:u.ally!.merc})};u.targetId=undefined;u.breachId=undefined;u.strike=undefined;return true;
 }

 // Chapter 5 Phase 1B (docs/CHAPTER5_PHASE1B.md). The Tavern hires and revives Allied Heroes for Gold only (it is built with Wood and Iron). It works only while a finished Tavern stands: hiring and reviving are refused, and a revive in progress waits, while there is none.
 tavernStanding(){return Object.values(this.state.structures).some(b=>b.tavern&&b.team==='blue'&&b.hp>0&&b.progress>=1);}
 private tavernSpot(radius:number){
  const t=Object.values(this.state.structures).find(b=>b.tavern&&b.team==='blue'&&b.hp>0&&b.progress>=1);if(!t)return undefined;const st=combatStructures(this.state);
  for(const [dx,dy] of TAVERN_RING){const x=t.x+dx*GRID,y=t.y+dy*GRID;if(!this.geo.blocked(x,y,radius,st)&&Object.values(this.state.units).every(u=>u.hp<=0||Math.hypot(u.x-x,u.y-y)>=u.radius+radius))return {x,y};}
  return undefined;
 }
 // Why a Tavern order would be refused, or undefined when it is valid (the panel asks before it sends; the command asks again at the tick it runs).
 tavernReason(c:{action:'hire'|'revive'|'dismiss';merc?:string;slot?:number}):string|undefined{
  const t=this.state.tavern,cfg=this.setup.tavern;if(this.ended)return 'Match over';if(!t||!cfg)return 'No Tavern in this mission';
  if(c.action==='dismiss')return t.slots[c.slot!]?undefined:'No such hero';
  if(!this.tavernStanding())return Object.values(this.state.structures).some(b=>b.tavern&&b.hp>0)?'The Tavern is still being built':'Build a Tavern first';
  const afford=(g:number)=>this.economy.goldUnits>=g*RESOURCE_UNITS;
  if(c.action==='hire'){
   const m=mercenary(c.merc!);if(!m||!cfg.roster.includes(m.id))return 'Not for hire';if(t.slots.some(x=>x.merc===m.id))return 'Already hired';if(t.slots.length>=cfg.cap)return 'Hero cap reached';
   return afford(m.gold)?this.tavernSpot(allyKnight.radius)?undefined:'No room beside the Tavern':'Not enough Gold';
  }
  const slot=t.slots[c.slot!];if(!slot)return 'No such hero';if(slot.status==='alive')return 'That hero is not fallen';if(slot.status==='reviving')return 'Already returning';
  const cost=reviveCost(mercenary(slot.merc)!);return afford(cost.gold)?undefined:'Not enough Gold';
 }
 private tavernDo(c:Extract<Command,{type:'tavern'}>){
  const s=this.state,t=s.tavern!;
  if(c.action==='dismiss'){
   const [gone]=t.slots.splice(c.slot!,1),u=gone.unitId?s.units[gone.unitId]:undefined;
   if(u){for(const o of [...Object.values(s.units),...Object.values(s.structures),...Object.values(s.bases)]){if(o.targetId===u.id)o.targetId=undefined;if(o.strike?.targetId===u.id)o.strike=undefined;}delete s.units[u.id];}
   t.slots.forEach((x,i)=>{if(x.unitId&&s.units[x.unitId])s.units[x.unitId].ally!.slot=i;});
   this.events.push({type:'tavern',action:'dismiss',slot:c.slot!,merc:gone.merc,requestId:c.requestId});return;
  }
  if(c.action==='hire'){
   const m=mercenary(c.merc!)!;if(!this.economy.apply({type:'hire',id:c.requestId,gold:m.gold})){this.events.push({type:'rejected',reason:'Duplicate request',requestId:c.requestId});return;}
   const spot=this.tavernSpot(allyKnight.radius)!,id=this.spawnAlly(spot.x,spot.y,mercenaryStats(m))!;
   s.units[id].ally!.slot=t.slots.length;s.units[id].ally!.merc=m.id;t.slots.push({merc:m.id,status:'alive',unitId:id});
   this.events.push({type:'tavern',action:'hire',slot:t.slots.length-1,merc:m.id,requestId:c.requestId});return;
  }
  const slot=t.slots[c.slot!],cost=reviveCost(mercenary(slot.merc)!);
  if(!this.economy.apply({type:'revive',id:c.requestId,...cost})){this.events.push({type:'rejected',reason:'Duplicate request',requestId:c.requestId});return;}
  slot.status='reviving';slot.remaining=REVIVE_TICKS;this.events.push({type:'tavern',action:'revive',slot:c.slot!,merc:slot.merc,requestId:c.requestId});
 }
 // Counts every revive down by one tick while a Tavern stands, and brings the hero back beside it when the time is up (waiting for room if the ring is full).
 private tavernTick(){
  const t=this.state.tavern;if(!t||this.ended||!t.slots.some(x=>x.status==='reviving')||!this.tavernStanding())return;
  for(const [i,x] of t.slots.entries()){
   if(x.status!=='reviving')continue;if(x.remaining!>0)x.remaining!--;if(x.remaining!>0)continue;
   const m=mercenary(x.merc)!,spot=this.tavernSpot(allyKnight.radius),id=spot&&this.spawnAlly(spot.x,spot.y,mercenaryStats(m));if(!id)continue;
   this.state.units[id].ally!.slot=i;this.state.units[id].ally!.merc=m.id;x.status='alive';x.unitId=id;delete x.remaining;this.events.push({type:'tavern',action:'returned',slot:i,merc:m.id});
  }
 }
 // A fallen Allied Hero keeps its place in the cap until it is revived or dismissed.
 private allyFell(id:string){const t=this.state.tavern,i=t?t.slots.findIndex(x=>x.unitId===id):-1;if(!t||i<0)return;t.slots[i].status='dead';delete t.slots[i].unitId;this.events.push({type:'tavern',action:'fallen',slot:i,merc:t.slots[i].merc});}
 private step(){
  const tick=this.clock.tick,s=this.state,h=this.hero,mark=this.events.length;
  this.skills.expire(tick);this.rewards.expire(tick);this.burn.process(tick);this.tavernTick();
  for(const c of this.commands){
   if(c.type==='buy-item'||c.type==='sell-item'||c.type==='fuse-item'){this.trades.execute(c);continue;}
   if(c.type==='learn'){this.events.push(this.progression.allocate(c.requestId,c.skill));this.skills.refreshStats();continue;}
   if(c.type==='cast'){continue;}
   if(c.type==='tavern'){const reason=this.tavernReason(c);if(reason)this.events.push({type:'rejected',reason,requestId:c.requestId});else this.tavernDo(c);continue;} // Chapter 5 Phase 1B: the Tavern works while the Guardian is down too
   if(c.type==='ally'){const reason=this.allyOrderReason(c.id,c.order);if(reason)this.events.push({type:'rejected',reason,requestId:c.requestId});else{this.orderAlly(c.id,c.order);this.events.push({type:'ally-order',id:c.id,order:{...s.units[c.id].ally!.order},requestId:c.requestId});}continue;} // Chapter 5: heroes take orders while the Guardian is down too
   if(h.hp<=0&&c.type!=='place')continue;
   if(c.type==='place'){
    if(this.placements.has(c.requestId)){this.events.push({type:'rejected',reason:'Duplicate construction request'});continue;}
    this.placements.add(c.requestId);const reason=this.placementReason(c.kind,c.col,c.row);
    if(reason){this.events.push({type:'rejected',reason});continue;}
    const d=buildings[c.kind],id=`built-${c.requestId}`,camp=this.repairCamp(c.kind,c.col,c.row),repair=camp>=0,factor=this.repairFactor(c.kind,c.col,c.row),ticks=repair?this.camps[camp].repair.ticks:d.buildTicks,paidResources=this.constructionQuote(c.kind,factor);
    if(!this.economy.apply({type:'construction',id:c.requestId,kind:c.kind,...(factor&&{factor})}))continue;
    s.structures[id]={id,kind:c.kind==='barracks'||c.kind==='tavern'?'wall':c.kind==='ballista'?'tower':c.kind,...(c.kind==='barracks'&&{azureBarracks:true as const}),...(c.kind==='tavern'&&{tavern:true as const}),...(c.kind==='ballista'&&{ballista:true as const}),team:'blue',x:(c.col+.5)*48,y:(c.row+.5)*48,col:c.col,row:c.row,startTick:tick,completeTick:tick+ticks,progress:1/ticks,constructionDamage:0,...d,paidResources:{wood:paidResources.wood,iron:paidResources.iron},hp:d.maxHp/ticks,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};
    this.events.push({type:'built',id,requestId:c.requestId});if(repair)this.events.push({type:'post',change:'repairing',...(this.camps[camp].id&&{camp:this.camps[camp].id})});
   }
   if(c.type==='move'){const n=Math.max(1,Math.hypot(c.x,c.y));s.move={x:c.x/n,y:c.y/n};}
   if(c.type==='attack')s.attacking=true;
   if(c.type==='target')s.selectedTarget=c.id;
   if(c.type==='preview'&&this.remaining(c.key)===0){s.previewReady[c.key]=tick+Math.ceil(previewSeconds[c.key]*HZ);this.events.push({type:'preview',key:c.key});}
  }
  for(const c of this.commands.filter((c):c is Extract<Command,{type:'cast'}>=>c.type==='cast').sort((a,b)=>a.requestId.localeCompare(b.requestId)))this.skills.accept(c,tick);
  this.commands=[];
  if(h.hp<=0&&h.respawnTick!==undefined&&tick>=h.respawnTick){
   const p=this.field.respawn.find(p=>!this.geo.blocked(p.x,p.y,h.radius,combatStructures(s))&&Object.values(s.units).every(u=>u===h||u.hp<=0||Math.hypot(p.x-u.x,p.y-u.y)>=h.radius+u.radius));
   if(p){h.x=p.x;h.y=p.y;this.rewards.revive(h);h.hp=h.maxHp;h.respawnTick=undefined;h.protectionTick=tick+60;h.readyTick=tick;this.events.push({type:'respawn',id:h.id});}
  }
  const heroLocked=this.skills.locksMovement(tick);
  this.skills.dash(tick);
  updateMovement(s,this.navigation,tick,heroLocked,this.soldierProto);
  this.skills.expire(tick);this.skills.resolve(tick);
  const structures=combatStructures(s),redView=structuresFor(s,'red'),blueView=structuresFor(s,'blue'); // built once a tick: a unit's attacks and sight ignore the faction gates its own team owns (or that stand open)
  const keeps=Object.values(s.bases).filter(b=>this.keepTargeting[b.id]);
  for(const u of [...Object.values(s.units),...Object.values(s.structures),...keeps].sort((a,b)=>Number(b.kind==='guardian')-Number(a.kind==='guardian')||a.id.localeCompare(b.id))){
   if(u.kind==='wall'||(s.structures[u.id]&&tick<s.structures[u.id].completeTick))continue;
   if(u.hp<=0||stunned(u,tick)||(u===h&&(s.skills.cast||tick<s.skills.lockTick)))continue;
   const keep=this.keepTargeting[u.id];
   if(u.kind==='guardian'||u.kind==='tower'||keep){
    const view=u.team==='red'?redView:blueView,candidates=[...Object.values(s.units),...Object.values(s.structures),...Object.values(s.bases)].filter(t=>canAttackOn(this.geo,u,t,view)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id));
    u.targetId=keep?(candidates.find(t=>keep==='guardian-first'&&t.kind==='guardian')??candidates[0])?.id:(u.kind==='tower'||s.attacking)?(candidates.find(t=>u.kind==='guardian'&&t.id===s.selectedTarget)??candidates[0])?.id:undefined;
   }
   if(u.strike){const target=(s.units[u.strike.targetId]??s.structures[u.strike.targetId]??s.bases[u.strike.targetId]);if(!target||!canAttackOn(this.geo,u,target,u.team==='red'?structures:blueView))u.strike=undefined;else if(tick>=u.strike.atTick){u.strike=undefined;if(target.protectionTick<=tick)this.basicHit(u,target);}}
   const target=u.targetId?(s.units[u.targetId]??s.structures[u.targetId]??s.bases[u.targetId]):undefined;
   if(!u.strike&&target&&canAttackOn(this.geo,u,target,u.team==='red'?structures:blueView)&&tick>=u.readyTick){u.readyTick=tick+u.cooldownTicks;u.strike={targetId:target.id,atTick:tick+u.windupTicks};u.protectionTick=0;this.events.push({type:'attack',id:u.id,targetId:target.id});if(u.windupTicks===0){u.strike=undefined;this.basicHit(u,target);}}
  }
  for(const b of Object.values(s.structures)){const progress=Math.min(1,(tick-b.startTick+1)/(b.completeTick-b.startTick));if(progress>b.progress){b.hp=Math.max(0,progress*b.maxHp-b.constructionDamage);b.progress=progress;}if(tick===b.completeTick)this.events.push({type:'construction-complete',id:b.id});}
  this.economy.apply({type:'income',tick});
  this.updatePost(tick);this.updateFortress(tick);
  // A mission resolves before wave scheduling, so the deciding tick adds no spawns. Defeat outranks victory on the same tick.
  if(this.mission){
   this.mission.evaluate(tick,this.events.slice(mark));
   const end=s.bases['blue-base'].hp<=0?['defeat','azure-keep-destroyed'] as const:this.mission.failed?['defeat','azure-keep-hp-threshold'] as const:this.mission.complete?['victory','objectives-complete'] as const:undefined;
   if(end){this.finish(end[0],end[1],tick);return;}
  }
  this.encounter.waves.forEach((w,index)=>{if(tick>=w.tick&&s.spawnedWaves===index){this.spawnQueue.push(...this.encounter.spawns.filter(e=>e.wave===index+1));s.spawnedWaves++;this.events.push({type:'wave',index:index+1,...(w.flank&&{flank:{...w.flank}}),...(w.lanes&&{lanes:{...w.lanes}})});}});
  this.continueWaves(tick);
  this.garrisonDue(tick);
  this.heroDue(tick);
  this.commanderDue(tick);
  this.azure.update(tick);
  this.eliteDue(tick);
  this.spawnDue(tick);
  if(this.mission)return;
  const allied=s.bases['blue-base'],enemy=s.bases['red-base'];
  if(allied.hp<=0||enemy.hp<=0)this.finish(allied.hp<=0?matchRules.simultaneousResult:'victory',allied.hp>0?'crimson-keep-destroyed':enemy.hp>0?'azure-keep-destroyed':'both-keeps-destroyed',tick);
 }
 // The only place a match ends; runs at most once.
 private finish(outcome:'victory'|'defeat',reason:OutcomeReason,tick:number){
  if(this.ended)return;
  const s=this.state,allied=s.bases['blue-base'],enemy=s.bases['red-base'];
  s.match={phase:outcome,result:{outcome,tick,kills:s.kills,gold:s.gold,alliedHp:allied.hp,enemyHp:enemy.hp}};this.finalOutcome={outcome,reason,tick};this.clock.paused=true;this.clearInput();this.skills.clear();this.burn.clear();this.events.push({type:'match-end',outcome,tick});
 }
 private basicHit(source:Unit,target:Unit){
  if(this.ended||target.protectionTick>this.clock.tick||!canAttackOn(this.geo,source,target,structuresFor(this.state,source.team)))return;
  const chance=source===this.hero?equipmentCritBasisPoints(this.state.inventory):0;
  const critical=chance>0&&criticalRoll(this.state.criticalRandom)<chance/10000;
  const before=target.hp;
  const structural=source===this.hero&&(this.state.structures[target.id]===target||this.state.bases[target.id]===target);
  const multiplier=structural?balanceV02.heroStructureDamage*equipmentBuildingMultiplier(this.state.inventory):source.commander&&this.state.bases[target.id]===target?source.commander.keepBonus:source.commander&&this.state.structures[target.id]===target?source.commander.structureBonus:1; // Chapter 4 M6: a Commander's bonus against structures, with its own against a Keep
  const troopMultiplier=(source.kind==='minion-blue'||source.kind==='minion-red')&&source.team===this.hero.team?bannerMultiplier(this.state,source):1;
  const vsGuardian=target.kind==='guardian'&&source.team==='red';
  // Crimson (encounter defender) towers only; other targets keep the shared 18. v0.4.1 variants scale Crimson tower and minion hits on the Guardian.
  const baseDamage=vsGuardian&&source.kind==='tower'?crimsonTowerRawVsGuardian(this.combat):vsGuardian&&source.kind==='minion-red'?crimsonMinionRawVsGuardian(this.combat,source.damage):source.damage;
  this.hit(source,target,baseDamage*(critical?2:1)*multiplier*troopMultiplier,'physical',undefined,critical);
  if(source===this.hero&&this.state.inventory.slots.some(id=>id!==null&&this.state.inventory.instances[id].itemId==='flame-blade'))this.burn.applyAfterBasicHit(source,target,this.clock.tick,before-target.hp);
 }
 private hit(source:Unit,target:Unit,raw=source.damage,type:'physical'|'magic'|'direct'='physical',castId?:string,critical=false){
  if(target.invulnerable&&this.postStates.length&&target.id==='red-base'&&source.team==='blue'&&target.hp>0)this.events.push({type:'post',change:'shielded'}); // Chapter 4: the shielded Keep was struck; the HUD explains why nothing happened
  if(target.hp<=0||target.invulnerable||target.team===source.team||target.protectionTick>this.clock.tick||this.ended)return;
  const mitigated=damageAfterArmor(raw,target.armor,type),absorbed=type==='direct'?0:Math.min(target.shield?.remaining??0,mitigated);
  if(target.shield)target.shield.remaining-=absorbed;
  if(source.kind==='guardian'&&target.kind==='minion-red')target.retaliateTick=this.clock.tick;
  const amount=Math.min(target.hp,mitigated-absorbed);target.hp=Math.max(0,target.hp-amount);this.events.push({type:'damage',id:target.id,sourceId:source.id,amount,raw,mitigated,absorbed,damageType:type,castId,...(critical?{critical:true as const}:{})});
  this.rewards.record(source,target,amount,this.clock.tick);if(target.id==='blue-base'&&amount>0)this.state.encounter.alliedBaseHitTick=this.clock.tick;
  const construction=this.state.structures[target.id];if(construction&&construction.progress<1)construction.constructionDamage+=amount;
  if(target.hp>0)return;
  this.burn.clearTarget(target);target.strike=undefined;target.targetId=undefined;this.events.push({type:'death',id:target.id,sourceId:source.id});
  if(!this.garrison&&this.setup.garrison&&[this.setup.garrison.after].flat().includes(target.id)){this.garrison={next:this.clock.tick+this.setup.garrison.delayTicks,n:0};const h=this.heroes.get(heroId);if(this.setup.hero&&h)h.next=this.clock.tick+this.setup.hero.delayTicks;}
  for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures),...Object.values(this.state.bases)]){if(u.targetId===target.id)u.targetId=undefined;if(u.strike?.targetId===target.id)u.strike=undefined;}
  this.events.push(...this.rewards.award(target,this.clock.tick,[{unit:this.hero,progression:this.progression}],combatStructures(this.state),this.ended));
  target.statuses=[];target.shield=undefined;this.skills.refreshStats();
  if(target.kind.startsWith('base'))return; // Keep objective tombstone/HP for final results; no reward.
  if(target.kind==='guardian'){this.clearInput(false);this.skills.clear();target.respawnTick=this.clock.tick+respawnTicks(this.state.heroProgression.level,this.state.guardianDeaths);this.state.guardianDeaths++;}
  else if(target.kind==='wall'||target.kind==='tower'){delete this.state.structures[target.id];}
  else {if(target.cart&&target.team==='red')this.leaveWreck(target);if(target.ally)this.allyFell(target.id);delete this.state.units[target.id];const h=this.heroes.get(target.id);if(h)h.next=this.clock.tick+h.respawnTicks;const cp=this.commanderPlan.get(target.id);if(cp){cp.warn=this.clock.tick+cp.c.restTicks;this.events.push({type:'commander',id:target.id,change:'down',lane:cp.lane!,releaseTick:cp.warn+cp.c.warningTicks});}if(target.team==='red'){this.state.kills++;if(this.economy.apply({type:'minion-reward',id:this.rewards.life(target)}))this.events.push({type:'reward',id:target.id,gold:crimsonMinionGold(target.id)});}}
 }
}

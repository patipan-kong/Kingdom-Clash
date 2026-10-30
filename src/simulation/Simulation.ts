import {balanceV02} from '../data/balanceV02';
import {crimsonMinionGold} from '../data/gameplayV03';
import type {KeepDefense} from '../data/gameplayV04';
import {activeCombatVariant,crimsonMinionRawVsGuardian,crimsonTowerRawVsGuardian,type CombatVariant} from '../data/gameplayV041';
import {Economy} from './Economy';
import {BurnEffects} from './BurnEffects';
import {bannerMultiplier} from './BannerAura';
import {buildings,type BuildingKind} from '../data/buildings';
import {placementReason,type AzurePad} from './Building';
import {AzureBarracks,FOOTMAN,TRAIN_STAGGER,TRAIN_TICKS} from './AzureBarracks';
import {Clock,HZ} from './Clock';
import type {Command,GameEvent,GameState,Structure,Unit} from './GameState';
import {guardianStats,minionStats,minionStatsOf,previewSeconds,type MinionArchetype} from '../data/combat';
import {extendedWaveSpawns,type Encounter,type EncounterId,type SpawnEntry} from '../data/encounters';
import {matchSetup,type MatchGate,type MatchSetup} from '../data/matchSetup';
import {GRID,WORLD} from '../world/layout';
import {MissionTracker,type MatchOutcome,type MissionStatus,type OutcomeReason} from './Mission';
import {Geometry} from './Collision';
import {updateMovement} from './Movement';
import type {SoldierProto} from './SoldierProto';
import {canAttackOn,damageAfterArmor} from './Combat';
import {Navigation} from './Navigation';
import {validateBattlefield,type Battlefield} from '../world/battlefield';
import {initialBases,matchRules} from '../data/match';
import {combatStructures} from './GameState';
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
 azurePads:readonly AzurePad[]=[];
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
 constructionQuote(kind:BuildingKind){return this.economy.constructionQuote(kind);}
 placementReason(kind:BuildingKind,col:number,row:number){return placementReason(this.field,this.state,kind,col,row,{wood:this.economy.woodUnits/RESOURCE_UNITS,iron:this.economy.ironUnits/RESOURCE_UNITS},this.azurePads);}
 private commands:Command[]=[]; private events:GameEvent[]=[];
 // combat: Gameplay v0.4.1 durability variant; defaults to the active balance (Variant B). Variant A reproduces v0.4.
 readonly combat:CombatVariant;
 // encounter: a legacy EncounterId (resolved with matchSetup at construction) or a prepared MatchSetup.
 constructor(matchId='match',encounter:EncounterId|MatchSetup='prototype',critSeed=defaultCritSeed,combat:CombatVariant=activeCombatVariant){this.combat=combat;validateArtifactCatalog();const setup=this.setup=typeof encounter==='string'?matchSetup(encounter):encounter;this.field=validateBattlefield(setup.battlefield);this.geo=new Geometry(this.field);this.navigation=new Navigation(this.geo);this.azure=new AzureBarracks(this.state,this.geo,()=>this.encounter.caps.blue,(id,x,y)=>this.spawnSoldier(id,x,y));this.checkFlank(setup);this.state.bases=initialBases(this.field,this.setup.crimsonKeepHp);this.economy=new Economy(this.state,setup.start);this.state.gold=setup.start.gold;this.state.wood=setup.start.wood;this.state.iron=setup.start.iron;this.state.criticalRandom=initialCriticalRandom(critSeed);this.state.inventory=initialInventory(matchId);this.encounter=setup.encounter;this.state.encounter={id:setup.encounterId,waveCount:this.encounter.waves.length,reserved:this.encounter.reserved};this.rewards=new XPRewards(matchId,this.geo);this.skills=new GuardianSkills(this.geo,this.state,(source,target,amount,type,castId)=>this.hit(source,target,amount,type,castId),e=>this.events.push(e),u=>this.rewards.life(u),{base:combat.guardianBaseHp,growth:combat.guardianHpGrowth});this.state.units.guardian=this.unit('guardian','guardian',setup.start.guardian.x,setup.start.guardian.y);this.hero.hp=this.hero.maxHp=combat.guardianBaseHp;this.burn=new BurnEffects(this.geo,this.state,u=>this.rewards.life(u),(source,target,amount)=>this.hit(source,target,amount,'magic'));this.trades=new ArtifactTransactions(this.geo,this.state,this.economy,matchId,()=>this.skills.refreshStats(),e=>this.events.push(e));for(const e of this.field.entities.filter(e=>e.kind==='minion-blue'))this.state.units[e.id]=this.unit(e.id,'minion-blue',e.x,e.y);for(const d of this.encounter.defenders)this.state.structures[d.id]=this.defender(d.id,d.kind,d.x,d.y);for(const g of setup.gates??[])this.state.structures[g.id]=this.gate(g);for(const b of setup.barracks??[])this.state.structures[b.id]=this.gate(b);if(setup.azure){this.azurePads=setup.azure.pads;for(const [i,p] of setup.azure.initial.entries())this.state.structures[`azure-barracks-${i}`]=this.startingBarracks(`azure-barracks-${i}`,p);}this.checkGates(setup);this.armKeeps();this.state.match.phase='playing';for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures)])this.rewards.life(u);if(setup.mission)this.mission=new MissionTracker(setup.mission,this);}
 // Pre-completed enemy structure: same tower stats and combat as player-built towers, no special rules.
 // Chapter 2 S7: every flank waypoint a wave uses must be open for the minion radius (12, Raiders included) and the wider 20 px margin Navigation tests use.
 private checkFlank(setup:MatchSetup){for(const f of [...(setup.waveRules?.flanks??[]),...(setup.waveRules?.lanes??[]).flatMap(()=>(['north','south'] as const).map(lane=>({lane})))]){const p=this.field.flankVia?.[f.lane];if(!p||[12,20].some(r=>this.geo.blocked(p.x,p.y,r)))throw new Error(`Flank waypoint ${f.lane} is missing or blocked`);}}
 // Chapter 3 C3-1: a Frost Gate is a pre-completed red wall with the level's hit points and the site's footprint. It follows the wall rules: it never attacks, blocks movement and sight while it lives,
 // is a legal target for the Guardian (and for any tower in reach), is removed like any structure when destroyed, and rewards nothing (no XP: enemyXp.wall is 0; no Gold: only red minions pay). Crimson units cannot breach it, being its own team's.
 // Also builds the C3-2 Barracks: a pre-completed red wall with a footprint and the level's hit points; it never attacks, gives no XP or Gold and is removed when it dies.
 private gate(g:MatchGate):Structure{const d=buildings.wall;return {id:g.id,kind:'wall',team:'red',x:g.x,y:g.y,col:Math.floor(g.x/GRID),row:Math.floor(g.y/GRID),startTick:0,completeTick:0,progress:1,constructionDamage:0,...d,columns:g.columns,rows:g.rows,maxHp:g.hp,hp:g.hp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};}
 // Chapter 3 M3: a Barracks the match starts with. Finished before tick 0 (its first training falls due at once), on a pad, free of charge; an authoring error in its cell is thrown here.
 private startingBarracks(id:string,p:AzurePad):Structure{
  const reason=placementReason(this.field,this.state,'barracks',p.col,p.row,{wood:Infinity,iron:Infinity},this.azurePads);
  if(reason)throw new Error(`Starting Azure Barracks at ${p.col},${p.row}: ${reason}`);
  const d=buildings.barracks;return {id,kind:'wall',azureBarracks:true,team:'blue',x:(p.col+.5)*GRID,y:(p.row+.5)*GRID,col:p.col,row:p.row,startTick:0,completeTick:-(TRAIN_TICKS+TRAIN_STAGGER),progress:1,constructionDamage:0,...d,hp:d.maxHp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};
 }
 // Guard against an authoring error: with the gates standing, every Crimson spawn slot must still reach the Azure side (a flood fill over the grid at the minion radius), or a wave would stand still forever.
 private checkGates(setup:MatchSetup){
  if(!(setup.gates?.length||setup.barracks?.length)||!setup.waveRules)return;
  const cols=WORLD.width/GRID,rows=WORLD.height/GRID,st=combatStructures(this.state),cell=(x:number,y:number)=>Math.floor(y/GRID)*cols+Math.floor(x/GRID);
  // The cells a minion can walk to from the Azure Keep, with the given structures standing.
  const reach=(st:ReturnType<typeof combatStructures>)=>{const seen=new Set<number>([cell(this.field.objectives.red.x,this.field.objectives.red.y)]),stack=[...seen];
   while(stack.length){const i=stack.pop()!,c=i%cols,r=Math.floor(i/cols);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr,n=nr*cols+nc;if(nc<0||nr<0||nc>=cols||nr>=rows||seen.has(n)||this.geo.blocked((nc+.5)*GRID,(nr+.5)*GRID,minionStats.radius,st))continue;seen.add(n);stack.push(n);}}return seen;};
  const seen=reach(st);
  // Garrison slots (balance v3) belong inside the sealed area: closed to the Azure side while the gate stands, open for a minion and connected to the Azure Keep once the gates are gone.
  if(setup.garrison){const gone=Object.fromEntries(Object.entries(st).filter(([id])=>!setup.gates?.some(g=>g.id===id))),after=reach(gone);
   for(const [x,y] of setup.garrison.slots){if(this.geo.blocked(x,y,minionStats.radius,gone))throw new Error('A garrison slot is blocked');if(seen.has(cell(x,y)))throw new Error('A garrison slot is outside the sealed area');if(!after.has(cell(x,y)))throw new Error('A garrison slot cannot reach the Azure Keep');}}
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
 private garrisonDue(tick:number){
  const g=this.garrison,r=this.setup.garrison,w=this.setup.waveRules,s=this.state;if(!g||!r||!w||tick<g.next||s.bases['red-base'].hp<=0)return;
  const count=r.counts[g.n%r.counts.length],queued=this.spawnQueue.filter(e=>e.team==='red').length;
  for(let i=0;i<count&&queued+i<this.encounter.caps.red;i++){const [x,y]=r.slots[i%r.slots.length];this.spawnQueue.push({tick:tick+i*w.spawnStagger,team:'red',id:`red-g${g.n+1}-${i}`,x,y,wave:0});}
  g.n++;g.next+=r.intervalTicks;
 }
 private spawnDue(tick:number){
  const s=this.state,stalled=new Set<string>();
  // Chapter 3 C3-2: a Crimson entry whose spawn slot belongs to a destroyed Barracks is dropped before the tick, stall and cap checks below, so a dead Barracks can neither supply nor stall anyone, and its quota goes to no other Barracks.
  for(const b of this.setup.barracks??[])if(!(this.state.structures[b.id]?.hp>0))for(let i=this.spawnQueue.length-1;i>=0;i--){const e=this.spawnQueue[i];if(e.team==='red'&&b.slots.some(([x,y])=>x===e.x&&y===e.y))this.spawnQueue.splice(i,1);}
  for(const e of [...this.spawnQueue]){
   if(e.tick>tick||stalled.has(e.team))continue;
   const kind=e.team==='red'?'minion-red':'minion-blue',active=Object.values(s.units).filter(u=>u.kind===kind).length;
   if(active>=this.encounter.caps[e.team]||!this.spawnOpen(e)){if(this.encounter.deferBlocked){stalled.add(e.team);continue;}this.spawnQueue.splice(this.spawnQueue.indexOf(e),1);continue;}
   this.spawnQueue.splice(this.spawnQueue.indexOf(e),1);s.units[e.id]=this.unit(e.id,kind,e.x,e.y,e.archetype,e.lane,tick,e.commit);this.mission?.spawned(e);this.events.push({type:'spawn',id:e.id});
  }
 }
 // An Azure Barracks soldier: a blue minion with footman stats whose id starts blue-s-, which is what SoldierProto.isSoldier recognises. The first one switches the hybrid AI on (400 px leash) unless a harness already chose a mode.
 private spawnSoldier(id:string,x:number,y:number){
  this.soldierProto??={mode:'hybrid',leash:400};
  this.state.units[id]={...this.unit(id,'minion-blue',x,y,undefined,undefined,this.clock.tick),...FOOTMAN};this.events.push({type:'spawn',id});
 }
 private unit(id:string,kind:Unit['kind'],x:number,y:number,archetype?:MinionArchetype,lane?:'north'|'south',tick=0,commit?:boolean):Unit{
  const stats=kind==='guardian'?guardianStats:kind==='minion-red'?minionStatsOf(archetype):minionStats;
  return {id,kind,team:kind==='guardian'||kind==='minion-blue'?'blue':'red',x,y,...stats,hp:stats.maxHp,readyTick:0,protectionTick:0,...(kind==='minion-red'&&archetype&&{archetype}),...(kind==='minion-red'&&lane&&{flank:{lane,startTick:tick,...(commit&&{commit:true as const})}})};
 }
 get hero(){return this.state.units.guardian;}
 get ended(){return !!this.state.match.result;}
 clearHeroInput(){this.commands=this.commands.filter(c=>c.type==='place'||c.type==='learn');this.state.move={x:0,y:0};this.state.attacking=false;this.state.selectedTarget=undefined;this.hero.strike=undefined;}
 beginRestart(){this.burn.clear();this.state.match.phase='restarting';this.clock.paused=true;this.clearInput();}
 send(c:Command){
  if(this.ended||this.state.match.phase==='restarting')return false;
  if(this.clock.paused||this.clock.timeScale===0){this.events.push({type:'rejected',reason:'Paused'});return false;}
  if(!c||!['move','attack','target','preview','place','learn','cast','buy-item','sell-item','fuse-item'].includes(c.type)||((c.type==='buy-item'||c.type==='sell-item'||c.type==='fuse-item')&&!validTradeCommand(c))||(c.type==='place'&&(!Object.hasOwn(buildings,c.kind)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100||!Number.isInteger(c.col)||!Number.isInteger(c.row)))||(c.type==='learn'&&(!Object.hasOwn(upgradeRules,c.skill)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100))||(c.type==='cast'&&(!Object.hasOwn(skillRules,c.skill)||typeof c.requestId!=='string'||!c.requestId||c.requestId.length>100||(c.direction&&(!Number.isFinite(c.direction.x)||!Number.isFinite(c.direction.y)))||(c.distance!==undefined&&(!Number.isFinite(c.distance)||c.distance<=0))))||(c.type==='move'&&(!Number.isFinite(c.x)||!Number.isFinite(c.y)))||(c.type==='target'&&(!(this.state.units[c.id]??this.state.structures[c.id]??this.state.bases[c.id])||(this.state.units[c.id]??this.state.structures[c.id]??this.state.bases[c.id]).team==='blue'))||(c.type==='preview'&&!Object.hasOwn(previewSeconds,c.key))){this.events.push({type:'rejected',reason:'Invalid command'});return false;}
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
 private step(){
  const tick=this.clock.tick,s=this.state,h=this.hero,mark=this.events.length;
  this.skills.expire(tick);this.rewards.expire(tick);this.burn.process(tick);
  for(const c of this.commands){
   if(c.type==='buy-item'||c.type==='sell-item'||c.type==='fuse-item'){this.trades.execute(c);continue;}
   if(c.type==='learn'){this.events.push(this.progression.allocate(c.requestId,c.skill));this.skills.refreshStats();continue;}
   if(c.type==='cast'){continue;}
   if(h.hp<=0&&c.type!=='place')continue;
   if(c.type==='place'){
    if(this.placements.has(c.requestId)){this.events.push({type:'rejected',reason:'Duplicate construction request'});continue;}
    this.placements.add(c.requestId);const reason=this.placementReason(c.kind,c.col,c.row);
    if(reason){this.events.push({type:'rejected',reason});continue;}
    const d=buildings[c.kind],id=`built-${c.requestId}`,paidResources=this.constructionQuote(c.kind);
    if(!this.economy.apply({type:'construction',id:c.requestId,kind:c.kind}))continue;
    s.structures[id]={id,kind:c.kind==='barracks'?'wall':c.kind,...(c.kind==='barracks'&&{azureBarracks:true as const}),team:'blue',x:(c.col+.5)*48,y:(c.row+.5)*48,col:c.col,row:c.row,startTick:tick,completeTick:tick+d.buildTicks,progress:1/d.buildTicks,constructionDamage:0,...d,paidResources:{wood:paidResources.wood,iron:paidResources.iron},hp:d.maxHp/d.buildTicks,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};
    this.events.push({type:'built',id,requestId:c.requestId});
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
  const structures=combatStructures(s);
  const keeps=Object.values(s.bases).filter(b=>this.keepTargeting[b.id]);
  for(const u of [...Object.values(s.units),...Object.values(s.structures),...keeps].sort((a,b)=>Number(b.kind==='guardian')-Number(a.kind==='guardian')||a.id.localeCompare(b.id))){
   if(u.kind==='wall'||(s.structures[u.id]&&tick<s.structures[u.id].completeTick))continue;
   if(u.hp<=0||stunned(u,tick)||(u===h&&(s.skills.cast||tick<s.skills.lockTick)))continue;
   const keep=this.keepTargeting[u.id];
   if(u.kind==='guardian'||u.kind==='tower'||keep){
    const candidates=[...Object.values(s.units),...Object.values(s.structures),...Object.values(s.bases)].filter(t=>canAttackOn(this.geo,u,t,structures)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)||a.id.localeCompare(b.id));
    u.targetId=keep?(candidates.find(t=>keep==='guardian-first'&&t.kind==='guardian')??candidates[0])?.id:(u.kind==='tower'||s.attacking)?(candidates.find(t=>u.kind==='guardian'&&t.id===s.selectedTarget)??candidates[0])?.id:undefined;
   }
   if(u.strike){const target=(s.units[u.strike.targetId]??s.structures[u.strike.targetId]??s.bases[u.strike.targetId]);if(!target||!canAttackOn(this.geo,u,target,structures))u.strike=undefined;else if(tick>=u.strike.atTick){u.strike=undefined;if(target.protectionTick<=tick)this.basicHit(u,target);}}
   const target=u.targetId?(s.units[u.targetId]??s.structures[u.targetId]??s.bases[u.targetId]):undefined;
   if(!u.strike&&target&&canAttackOn(this.geo,u,target,structures)&&tick>=u.readyTick){u.readyTick=tick+u.cooldownTicks;u.strike={targetId:target.id,atTick:tick+u.windupTicks};u.protectionTick=0;this.events.push({type:'attack',id:u.id,targetId:target.id});if(u.windupTicks===0){u.strike=undefined;this.basicHit(u,target);}}
  }
  for(const b of Object.values(s.structures)){const progress=Math.min(1,(tick-b.startTick+1)/(b.completeTick-b.startTick));if(progress>b.progress){b.hp=Math.max(0,progress*b.maxHp-b.constructionDamage);b.progress=progress;}if(tick===b.completeTick)this.events.push({type:'construction-complete',id:b.id});}
  this.economy.apply({type:'income',tick});
  // A mission resolves before wave scheduling, so the deciding tick adds no spawns. Defeat outranks victory on the same tick.
  if(this.mission){
   this.mission.evaluate(tick,this.events.slice(mark));
   const end=s.bases['blue-base'].hp<=0?['defeat','azure-keep-destroyed'] as const:this.mission.failed?['defeat','azure-keep-hp-threshold'] as const:this.mission.complete?['victory','objectives-complete'] as const:undefined;
   if(end){this.finish(end[0],end[1],tick);return;}
  }
  this.encounter.waves.forEach((w,index)=>{if(tick>=w.tick&&s.spawnedWaves===index){this.spawnQueue.push(...this.encounter.spawns.filter(e=>e.wave===index+1));s.spawnedWaves++;this.events.push({type:'wave',index:index+1,...(w.flank&&{flank:{...w.flank}}),...(w.lanes&&{lanes:{...w.lanes}})});}});
  this.continueWaves(tick);
  this.garrisonDue(tick);
  this.azure.update(tick);
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
  if(this.ended||target.protectionTick>this.clock.tick||!canAttackOn(this.geo,source,target,combatStructures(this.state)))return;
  const chance=source===this.hero?equipmentCritBasisPoints(this.state.inventory):0;
  const critical=chance>0&&criticalRoll(this.state.criticalRandom)<chance/10000;
  const before=target.hp;
  const structural=source===this.hero&&(this.state.structures[target.id]===target||this.state.bases[target.id]===target);
  const multiplier=structural?balanceV02.heroStructureDamage*equipmentBuildingMultiplier(this.state.inventory):1;
  const troopMultiplier=(source.kind==='minion-blue'||source.kind==='minion-red')&&source.team===this.hero.team?bannerMultiplier(this.state,source):1;
  const vsGuardian=target.kind==='guardian'&&source.team==='red';
  // Crimson (encounter defender) towers only; other targets keep the shared 18. v0.4.1 variants scale Crimson tower and minion hits on the Guardian.
  const baseDamage=vsGuardian&&source.kind==='tower'?crimsonTowerRawVsGuardian(this.combat):vsGuardian&&source.kind==='minion-red'?crimsonMinionRawVsGuardian(this.combat,source.damage):source.damage;
  this.hit(source,target,baseDamage*(critical?2:1)*multiplier*troopMultiplier,'physical',undefined,critical);
  if(source===this.hero&&this.state.inventory.slots.some(id=>id!==null&&this.state.inventory.instances[id].itemId==='flame-blade'))this.burn.applyAfterBasicHit(source,target,this.clock.tick,before-target.hp);
 }
 private hit(source:Unit,target:Unit,raw=source.damage,type:'physical'|'magic'|'direct'='physical',castId?:string,critical=false){
  if(target.hp<=0||target.invulnerable||target.team===source.team||target.protectionTick>this.clock.tick||this.ended)return;
  const mitigated=damageAfterArmor(raw,target.armor,type),absorbed=type==='direct'?0:Math.min(target.shield?.remaining??0,mitigated);
  if(target.shield)target.shield.remaining-=absorbed;
  if(source.kind==='guardian'&&target.kind==='minion-red')target.retaliateTick=this.clock.tick;
  const amount=Math.min(target.hp,mitigated-absorbed);target.hp=Math.max(0,target.hp-amount);this.events.push({type:'damage',id:target.id,sourceId:source.id,amount,raw,mitigated,absorbed,damageType:type,castId,...(critical?{critical:true as const}:{})});
  this.rewards.record(source,target,amount,this.clock.tick);if(target.id==='blue-base'&&amount>0)this.state.encounter.alliedBaseHitTick=this.clock.tick;
  const construction=this.state.structures[target.id];if(construction&&construction.progress<1)construction.constructionDamage+=amount;
  if(target.hp>0)return;
  this.burn.clearTarget(target);target.strike=undefined;target.targetId=undefined;this.events.push({type:'death',id:target.id,sourceId:source.id});
  if(this.setup.garrison?.after===target.id&&!this.garrison)this.garrison={next:this.clock.tick+this.setup.garrison.delayTicks,n:0};
  for(const u of [...Object.values(this.state.units),...Object.values(this.state.structures),...Object.values(this.state.bases)]){if(u.targetId===target.id)u.targetId=undefined;if(u.strike?.targetId===target.id)u.strike=undefined;}
  this.events.push(...this.rewards.award(target,this.clock.tick,[{unit:this.hero,progression:this.progression}],combatStructures(this.state),this.ended));
  target.statuses=[];target.shield=undefined;this.skills.refreshStats();
  if(target.kind.startsWith('base'))return; // Keep objective tombstone/HP for final results; no reward.
  if(target.kind==='guardian'){this.clearInput(false);this.skills.clear();target.respawnTick=this.clock.tick+respawnTicks(this.state.heroProgression.level,this.state.guardianDeaths);this.state.guardianDeaths++;}
  else if(target.kind==='wall'||target.kind==='tower'){delete this.state.structures[target.id];}
  else {delete this.state.units[target.id];if(target.team==='red'){this.state.kills++;if(this.economy.apply({type:'minion-reward',id:this.rewards.life(target)}))this.events.push({type:'reward',id:target.id,gold:crimsonMinionGold(target.id)});}}
 }
}

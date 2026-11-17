import {chapterOf,missionOf,type LevelDefinition} from '../data/campaign';
import type {OutcomeReason} from '../simulation/Mission';
import type {Status} from '../simulation/GameState';
import {currentLocale,t,type TranslationKey} from './index';
import {missionDisplay} from './campaign';

export function battleMissionHeading(level:LevelDefinition){
 return t('missionSummary',{chapter:chapterOf(level.number),mission:missionOf(level.number),title:missionDisplay(level.id,level.display).title});
}

const outcomes={
 'objectives-complete':'battleOutcomeGoals','azure-keep-destroyed':'battleOutcomeAzure',
 'azure-keep-hp-threshold':'battleOutcomeThreshold','crimson-keep-destroyed':'battleOutcomeCrimson',
 'both-keeps-destroyed':'battleOutcomeBoth',
} as const satisfies Record<OutcomeReason,TranslationKey>;
export const battleOutcome=(reason?:OutcomeReason)=>t(reason?outcomes[reason]:'battleOutcomeEnd');

export const guidanceLabels={
 orientation:'battleOrientation',skills:'battleLearnHint',support:'battleSupportHint',structures:'battleStructuresHint',
} as const;
export const abilityLabels={bash:'battleBash',taunt:'battleTaunt',charge:'battleCharge',zone:'battleProtect'} as const;
export const skillLabels={bash:'battleBashFull',taunt:'battleTaunt',charge:'battleChargeFull',zone:'battleZoneFull',fortitude:'battleFortitude'} as const;
export const statusLabels={
 stun:'battleStunEffect',slow:'battleSlow',taunt:'battleTaunted',
} as const satisfies Record<Status['type'],TranslationKey>;

const castErrors=new Map<string,TranslationKey>([
 ['No legal target in range / line of sight','battleNoReach'],['No legal target at aim','battleNoAim'],
 ['Charge path blocked','battlePath'],['Aim Charge first','battleAimFirst'],['Invalid Charge distance','battleAimFurther'],
 ['Learn this skill first','battleLearnFirst'],['Skill on cooldown','battleCooldown'],['Stunned','battleStunned'],
 ['Casting','battleCasting'],['Cannot cast now','battleCannotCast'],['Duplicate cast request','battleDuplicateCast'],
]);
export function castRejection(reason:string){
 const key=castErrors.get(reason);
 return key?t(key):undefined;
}

// Simulation and input still exchange their canonical reasons.
const battleErrors=new Map<string,TranslationKey>([
 ['Rejected','battleRejected'],['Paused','battleRejectPaused'],['Invalid command','battleInvalidCommand'],
 ['Match over','battleMatchOver'],['Duplicate request','battleDuplicateRequest'],['Cast cancelled','battleCastCancelled'],
 ["Duplicate construction request",'battleDuplicateBuild'],
 ["Outside map",'battleOutsideMap'],
 ["Outside controlled territory",'battleOutsideTerritory'],
 ["Occupied structure cell",'battleOccupiedBuild'],
 ["Occupied by unit",'battleOccupiedUnit'],
 ["Reserved spawn area",'battleReservedSpawn'],
 ["Scenery overlaps cell",'battleOccupiedScenery'],
 ["Occupied static structure",'battleOccupiedStatic'],
 ["Tower limit reached",'battleTowerLimit'],
 ["Barracks limit reached",'battleBarracksLimit'],
 ["Not an Azure Barracks pad",'battleBarracksPad'],
 ["Not enough resources",'battleResourcesShort'],
 ["Not enough Gold",'battleGoldShort'],
 ["Water overlaps cell",'battleWaterCell'],
 ["Forest overlaps cell",'battleForestCell'],
 ["Cliff overlaps cell",'battleCliffCell'],
 ["Wall overlaps cell",'battleWallCell'],
 ["Broken wall overlaps cell",'battleWallRuinCell'],
 ["Fortress wall overlaps cell",'battleFortressCell'],
 ["Tavern unavailable",'battleTavernUnavailable'],
 ["Tavern already built",'battleTavernBuilt'],
 ["Not a Ballista ruin",'battleNotBallistaRuin'],
 ["Ruined Ballista: repair it with a Ballista",'battleNeedBallista'],
 ["Ruined tower: repair it with a tower",'battleNeedTower'],
 ["Ruined Barracks: repair it with a Barracks",'battleNeedBarracks'],
]);
export function battleRejection(reason:string){
 const key=battleErrors.get(reason);
 return castRejection(reason)??(key?t(key):reason);
}

const names=new Map<string,TranslationKey>([
 ['Azure Keep','battleAzure'],['Crimson Keep','battleCrimson'],['Guardian','battleGuardian'],
 ['Forest Camp','battleCampForest'],['Cliff Camp','battleCampCliff'],['Island Camp','battleCampIsland'],
 ['Rim Camp','battleCampRim'],['Basin Camp','battleCampBasin'],['Old Outpost','battleCampOld'],
 ['Crossroads Camp','battleCampCrossroads'],['North Outpost','battleCampNorth'],['South Outpost','battleCampSouth'],
 ['Outpost','battleOutpost'],['Crimson Barracks','battleCrimsonBarracks'],['Azure Barracks','battleAzureBarracks'],
 ['Frost Gate','battleFrostGate'],['Cliff Gate','battleCliffGate'],['Throne Gate','battleThroneGate'],
 ['Outer Gate','battleOuterGate'],['Inner Gate','battleInnerGate'],['Fortress Gate','battleFortressGate'],
 ['Ironwood Gate','battleIronwoodGate'],['Wooden Wall','battleWoodenWall'],['Archer Tower','battleArcherTower'],
 ['Azure Vanguard','battleAzureVanguard'],['Crimson Raider','battleCrimsonRaider'],['Ballista','battleBallista'],
 ['Tavern','battleTavern'],['War Cart','battleWarCart'],['Azure Banner','battleBanner'],['Siege Tower','battleSiegeTower'],
 ['Gatehouse','battleGatehouse'],['Crimson War Camp','battleWarCamp'],['Forward Gatehouse','battleForwardGate'],['Main Gatehouse','battleMainGate'],['Elite Barracks','battleEliteBarracks'],
 ['Iron Marshal','battleIronMarshal'],['Shadowblade','battleShadowblade'],['Defender Hero','battleDefender'],
 ['Raider Hero','battleRaiderHero'],['Crimson Hero','battleCrimsonHero'],['Frost Warlord','battleFrostWarlord'],
 ['Elite Soldier','battleEliteSoldier'],['Desert Raider','battleDesertRaider'],
]);
export function battleName(english:string,uppercase=false){
 const key=names.get(english),name=key?t(key):english;
 return uppercase&&currentLocale()==='en'?name.toUpperCase():name;
}

import {artifact} from '../data/artifacts';
import type {BuildingKind} from '../data/buildings';
import type {GuardianUpgrade} from '../data/progression';
import type {ShopItemId} from '../ui/shopItems';
import {battleName,battleRejection,skillLabels} from './battle';
import {currentLocale,t,type TranslationKey} from './index';

export const skillEffects={bash:'skillBashEffect',taunt:'skillTauntEffect',charge:'skillChargeEffect',zone:'skillZoneEffect',fortitude:'skillFortitudeEffect'} as const;
export const skillName=(skill:GuardianUpgrade)=>t(skill==='charge'?'battleCharge':skillLabels[skill]);
export const learnedSkill=(skill:GuardianUpgrade,rank:number)=>t('skillLearned',{skill:skillName(skill),rank});

const items={
 'iron-sword':['itemIronSword','itemSword'], 'guardian-shield':['itemGuardianShield','itemShield'],
 'ruby-gem':['itemRubyGem','itemRuby'], 'flame-blade':['itemFlameBlade','itemFlame'],
 'builders-crown':['itemBuildersCrown','itemCrown'], 'siege-hammer':['itemSiegeHammer','itemHammer'],
 'commander-banner':['itemCommanderBanner','itemBanner'],
} as const satisfies Record<ShopItemId,readonly [TranslationKey,TranslationKey]>;
export const itemName=(id:string,short=false)=>Object.hasOwn(items,id)?t(items[id as ShopItemId][short?1:0]):artifact(id).name;

export const buildingLabels={wall:'buildWall',tower:'battleArcherTower',barracks:'battleAzureBarracks',ballista:'battleBallista',tavern:'battleTavern'} as const satisfies Record<BuildingKind,TranslationKey>;
const heroes=new Map<string,readonly [TranslationKey,TranslationKey]>([
 ['roland',['tavernRoland','tavernBalanced']],['borin',['tavernBorin','tavernTank']],['kael',['tavernKael','tavernBerserker']],
]);
export const heroName=(id:string,fallback:string)=>{const hero=heroes.get(id);return hero?t(hero[0]):fallback;};
export const heroRole=(id:string,fallback:string)=>{const hero=heroes.get(id);return hero?t(hero[1]):fallback;};

// Match the canonical simulation reasons at the presentation boundary.
const skillRejections=new Map<string,TranslationKey>([
 ['Duplicate or invalid skill request','skillInvalidRequest'],['Unknown skill','skillUnknown'],['Maximum skill rank','skillMaxRank'],['No Skill Points','skillNoPoints'],
]);
export function skillUpgradeRejection(reason:string){
 const level=/^Requires LV (\d+)$/.exec(reason)?.[1],key=skillRejections.get(reason);
 if(!level&&!key)return;
 if(currentLocale()==='en')return reason;
 return level?t('skillRequires',{level}):t(key!);
}

const rejections=new Map<string,TranslationKey>([
 ['Match not active','shopInactive'],['Allied Keep unavailable','shopKeepUnavailable'],['Shop path blocked','shopPathBlocked'],
 ['Return to Azure Keep','shopReturn'],['Inventory full','shopInventoryFull'],['Shop unavailable in this encounter','shopUnavailable'],
 ['Artifact unavailable','shopItemUnavailable'],['Item unavailable','shopItemUnavailable'],['Item not owned','shopItemUnavailable'],
 ['Recipe unavailable','shopRecipeUnavailable'],['Invalid sale','shopInvalidSale'],['Duplicate trade request','shopDuplicateTrade'],
 ['Selection stale · reselect','shopStale'],['Invalid consumed instance','shopStale'],['Instance is not a required component','shopStale'],['Invalid component paid basis','shopStale'],
 ['Invalid paid basis or refund','shopInvalidSale'],['Invalid Gold ledger snapshot','shopInvalidTrade'],['Quote overflow','shopInvalidTrade'],
 ['Stale match','shopInvalidTrade'],['Wrong item owner','shopInvalidTrade'],['Invalid trade command','shopInvalidTrade'],
 ['Invalid artifact transaction','shopInvalidTrade'],['Stale or invalid transaction','shopInvalidTrade'],
 ['The Tavern is still being built','tavernConstructing'],['Build a Tavern first','tavernBuildFirst'],['No Tavern in this mission','tavernNoMission'],
 ['No such hero','tavernNoHero'],['Not for hire','tavernNotHireable'],['Already hired','tavernAlreadyHired'],['Hero cap reached','tavernCap'],
 ['No room beside the Tavern','tavernNoRoom'],['That hero is not fallen','tavernStillAlive'],['Already returning','tavernReturning'],
 ['Tap an enemy or a structure','heroAttackTarget'],['Pick an enemy, not an ally','heroPickEnemy'],['Shielded · capture the camps first','heroShielded'],
 ['That gate stands open','heroGateOpen'],["Can't hold there",'heroBlocked'],['That hero has fallen','heroFallen'],
]);
export function interactionRejection(reason:string){
 if(currentLocale()==='en')return battleRejection(reason);
 const skill=skillUpgradeRejection(reason);
 if(skill)return skill;
 const camp=/^Capture the (.+) first$/.exec(reason)?.[1];
 if(camp)return t('battleCaptureFirst',{name:battleName(camp)});
 if(reason.startsWith('Unknown artifact: '))return t('shopItemUnavailable');
 const key=rejections.get(reason);
 return key?t(key):battleRejection(reason);
}

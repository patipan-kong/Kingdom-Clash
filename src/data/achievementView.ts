import {achievementCatalog,type AchievementDef} from './achievements';
import type {AchievementSave} from './achievementSave';
import {isSequential,type LevelRef,type Progress} from './campaignProgress';

// What the Achievement screen shows, as data. A card exists only for an achievement whose mission the player can open right now (existing campaign rules: progress.isUnlocked),
// so nothing about later missions is revealed, and Replay is offered under exactly the same rule the Mission Briefing enforces.
export interface AchievementCard{readonly def:AchievementDef;readonly unlocked:boolean;readonly unlockedAt?:number;readonly bestTicks?:number;readonly replay:boolean}
export interface AchievementList{readonly cards:readonly AchievementCard[];readonly unlockedCount:number;readonly total:number;readonly showCounter:boolean}

const listOf=(cards:AchievementCard[]):AchievementList=>({cards,unlockedCount:cards.filter(c=>c.unlocked).length,total:cards.length,showCounter:cards.length>0});

export function achievementList(save:AchievementSave,levels:readonly LevelRef[],progress:Progress<LevelRef>,catalog:readonly AchievementDef[]=achievementCatalog):AchievementList{
 const cards:AchievementCard[]=[];
 for(const def of catalog){
  const level=levels.find(l=>l.id===def.levelId);
  if(!level||!isSequential(level)||!progress.isUnlocked(level))continue;
  const at=save.unlocked[def.id],best=save.bestTimes[def.levelId];
  cards.push({def,unlocked:at!==undefined,...(at!==undefined&&{unlockedAt:at,...(best!==undefined&&{bestTicks:best})}),replay:true});
 }
 return listOf(cards);
}

// Development preview only (?achievementsPreview=<mode>, dev builds): fixed fixture cards that touch neither the real save nor the campaign rules. Replay is off on every card.
export type PreviewMode='mixed'|'locked'|'unlocked'|'empty';
export const previewModes:readonly PreviewMode[]=['mixed','locked','unlocked','empty'];
const FIXTURE_DATE=Date.UTC(2026,10,2,12,0,0);
const fixtureDef=(id:string,title:string,description:string,reward:string,kind:AchievementDef['kind']):AchievementDef=>({id,levelId:'campaign-32',kind,title,description,reward,earnedBy:()=>false});
export function previewList(mode:PreviewMode):AchievementList{
 const ballista=achievementCatalog[0],second=fixtureDef('preview-challenge','Lightning Conqueror (preview)','A made-up challenge card with a best time and no replay.','Badge','challenge'),third=fixtureDef('preview-locked','Locked Example (preview)','A made-up locked card.','Technology','technology');
 const cards:Record<PreviewMode,AchievementCard[]>={
  mixed:[{def:ballista,unlocked:true,unlockedAt:FIXTURE_DATE,bestTicks:7*60*30+15*30,replay:false},{def:second,unlocked:false,replay:false},{def:third,unlocked:false,replay:false}],
  locked:[{def:ballista,unlocked:false,replay:false},{def:third,unlocked:false,replay:false}],
  unlocked:[{def:ballista,unlocked:true,unlockedAt:FIXTURE_DATE,bestTicks:6*60*30+40*30,replay:false}],
  empty:[],
 };
 return listOf(cards[mode]);
}

import {achievementCatalog,earnedBy,type AchievementDef,type RunSummary} from './achievements';
// Achievement V1 save: pure data under its own key, so the campaign save (kingdom-clash.campaign.v2) is never touched and an older build that rewrites it cannot drop achievements.
// unlocked: achievement id -> epoch ms of the FIRST unlock. bestTimes: level id -> fewest simulation ticks of a won match.
export const ACHIEVEMENT_KEY='kingdom-clash.achievements.v1';
export const ACHIEVEMENT_SAVE_VERSION=1;
export interface AchievementSave{version:1;unlocked:Record<string,number>;bestTimes:Record<string,number>}
export type AchievementLoadStatus='fresh'|'ok'|'recovered'|'newer-version';
export interface AchievementLoad{save:AchievementSave;status:AchievementLoadStatus;writable:boolean}
export const emptyAchievementSave=():AchievementSave=>({version:1,unlocked:{},bestTimes:{}});
const ACHIEVEMENT_ID=/^[a-z][a-z0-9-]{0,63}$/,LEVEL_ID=/^campaign-\d{2,3}$/;
const isRecord=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=1;

// Strict, never throwing. Invalid entries are dropped one by one (status 'recovered'); unknown but well-formed ids are kept so a newer catalogue's unlocks survive.
export function parseAchievementSave(raw:string|null):AchievementLoad{
 if(raw===null)return {save:emptyAchievementSave(),status:'fresh',writable:true};
 let value:unknown;
 try{value=JSON.parse(raw);}catch{return {save:emptyAchievementSave(),status:'recovered',writable:true};}
 if(!isRecord(value)||!Number.isSafeInteger(value.version)||(value.version as number)<1)return {save:emptyAchievementSave(),status:'recovered',writable:true};
 if((value.version as number)>ACHIEVEMENT_SAVE_VERSION)return {save:emptyAchievementSave(),status:'newer-version',writable:false};
 const save=emptyAchievementSave();let clean=isRecord(value.unlocked)&&isRecord(value.bestTimes);
 if(isRecord(value.unlocked))for(const [id,at] of Object.entries(value.unlocked)){if(ACHIEVEMENT_ID.test(id)&&positive(at))save.unlocked[id]=at;else clean=false;}
 if(isRecord(value.bestTimes))for(const [id,ticks] of Object.entries(value.bestTimes)){if(LEVEL_ID.test(id)&&positive(ticks))save.bestTimes[id]=ticks;else clean=false;}
 return {save,status:clean?'ok':'recovered',writable:true};
}

// Monotonic: nothing earned in either save is lost. The earlier unlock time and the smaller tick count win, so merging is commutative and idempotent.
export function mergeAchievementSaves(a:AchievementSave,b:AchievementSave):AchievementSave{
 const out=emptyAchievementSave();
 for(const source of [a,b]){
  for(const [id,at] of Object.entries(source.unlocked))out.unlocked[id]=Math.min(out.unlocked[id]??at,at);
  for(const [id,ticks] of Object.entries(source.bestTimes))out.bestTimes[id]=Math.min(out.bestTimes[id]??ticks,ticks);
 }
 return out;
}

/** The build rights of the unlocked technology achievements; ids this catalogue does not know grant nothing. */
export const technologiesOf=(save:AchievementSave,catalog:readonly AchievementDef[]=achievementCatalog)=>catalog.filter(a=>a.technology&&save.unlocked[a.id]!==undefined).map(a=>a.technology!);

/** Applies one finished match. A victory may lower the level's best time; achievements already unlocked keep their first time. A match that was not won, or reports no ticks, changes nothing. */
export function applyRun(save:AchievementSave,run:RunSummary,now:number,catalog:readonly AchievementDef[]=achievementCatalog):{save:AchievementSave;newlyUnlocked:string[]}{
 if(!run.victory||!positive(run.ticks)||!positive(now))return {save,newlyUnlocked:[]};
 const next:AchievementSave={version:1,unlocked:{...save.unlocked},bestTimes:{...save.bestTimes}},newlyUnlocked:string[]=[];
 next.bestTimes[run.levelId]=Math.min(next.bestTimes[run.levelId]??run.ticks,run.ticks);
 for(const id of earnedBy(run,catalog))if(next.unlocked[id]===undefined){next.unlocked[id]=now;newlyUnlocked.push(id);}
 return {save:next,newlyUnlocked};
}

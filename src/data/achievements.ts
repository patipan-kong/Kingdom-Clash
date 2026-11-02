// Achievement V1: the catalogue and the pure rule that decides what one finished match earns. No DOM, no storage (see achievementSave.ts / achievementStore.ts).
// A technology achievement doubles as the unlock: technologies are derived from the unlocked achievement ids, never stored on their own.
export type AchievementKind='technology'|'challenge';
export const TICKS_PER_SECOND=30;
/** What the Battle scene knows when a match ends. ticks = simulation ticks of the finished match. */
export interface RunSummary{readonly levelId:string;readonly victory:boolean;readonly ticks:number;readonly ballistaRepaired:boolean}
export interface AchievementDef{
 readonly id:string;readonly levelId:string;readonly kind:AchievementKind;readonly title:string;readonly description:string;readonly reward:string;
 readonly technology?:string; // the build right this achievement grants (technology achievements only)
 readonly earnedBy:(run:RunSummary)=>boolean;
}
export const achievementCatalog:readonly AchievementDef[]=Object.freeze([
 Object.freeze({id:'ballista-recovered',levelId:'campaign-32',kind:'technology' as const,title:'Ballista Recovered',description:'Repair the ruined Ballista in Cliff Pass and win the mission.',reward:'Ballista technology',technology:'ballista',
  earnedBy:(run:RunSummary)=>run.victory&&run.ballistaRepaired}),
]);
/** The ids of the achievements this finished match earns (before comparing with what is already saved). A run that was not won earns nothing. */
export const earnedBy=(run:RunSummary,catalog:readonly AchievementDef[]=achievementCatalog)=>catalog.filter(a=>a.levelId===run.levelId&&a.earnedBy(run)).map(a=>a.id);
/** A Ballista (a tower-kind structure flagged ballista) that is Azure's: the structure a finished repair leaves behind. */
export const isBallistaRepair=(s:{readonly ballista?:true;readonly team:string}|undefined)=>!!s&&s.ballista===true&&s.team==='blue';
/** Simulation ticks as m:ss. */
export const formatTicks=(ticks:number)=>{const s=Math.floor(ticks/TICKS_PER_SECOND);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};

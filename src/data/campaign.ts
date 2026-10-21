import {matchSetup,type MatchSetup,type MatchSetupOverrides} from './matchSetup';
import type {EncounterId} from './encounters';
import type {MissionDefinition} from './mission';
import {isSpecialLevelId} from './campaignProgress';
// Stage 2 S2: campaign levels as data. A level names a legacy encounter, the MatchSetup overrides that make it this level and its mission;
// matchSetup() builds (and validates) the match from them, so levels add no Simulation code. Display text stays apart from gameplay.
// Unlocks, saves, stars and rewards belong to later slices: registration order says nothing about what a player may open.
export const campaignRules={maxLevels:100,chapterSize:10};
export type LevelDifficulty='introductory'|'standard'|'full-battle';
export interface LevelDisplay{readonly title:string;readonly description:string;readonly briefing:string;readonly difficulty:LevelDifficulty;readonly strategy?:string}
export interface LevelDefinition{
 readonly id:string; // stable: campaign-NN (levelId), or a special mode id (campaignProgress)
 readonly number:number; // 1-based campaign position; a special mode (Full Battle) has number 0 and chapter 0
 readonly chapter:number; // chapters of campaignRules.chapterSize levels
 readonly display:LevelDisplay;
 readonly match:{readonly encounter:EncounterId;readonly overrides?:Omit<MatchSetupOverrides,'mission'>}; // none = the legacy encounter exactly
 readonly mission:MissionDefinition|null; // null = the legacy Keep-destruction outcome
}
export const levelId=(n:number)=>`campaign-${String(n).padStart(2,'0')}`;
export const chapterOf=(n:number)=>Math.ceil(n/campaignRules.chapterSize);
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const k of Object.keys(v))freeze((v as Record<string,unknown>)[k]);Object.freeze(v);}return v;};
const setupOf=(l:LevelDefinition)=>matchSetup(l.match.encounter,{...structuredClone(l.match.overrides??{}),...(l.mission?{mission:l.mission}:{})});
export class CampaignRegistry{
 private ids=new Map<string,LevelDefinition>();
 private numbers=new Map<number,LevelDefinition>();
 readonly levels:readonly LevelDefinition[];
 // Validates every level (including its match and mission) up front and keeps a frozen copy, ordered by number.
 constructor(levels:readonly LevelDefinition[]){
  const fail=(why:string):never=>{throw new Error(`Invalid campaign: ${why}`);};
  for(const l of levels){
   const n=l?.number;
   // A special mode is outside the numbered campaign: number 0, chapter 0. Every other level keeps the normal id, number and chapter rules.
   const special=isSpecialLevelId(String(l?.id));
   if(special){if(n!==0||l.chapter!==0)fail(`special mode ${l.id} must have number 0 and chapter 0`);}
   else if(!(Number.isSafeInteger(n)&&n>=1&&n<=campaignRules.maxLevels))fail(`level number ${String(n)} outside 1-${campaignRules.maxLevels}`);
   if(this.ids.has(l.id))fail(`duplicate id ${l.id}`);
   if(this.numbers.has(n))fail(`duplicate number ${n}`);
   if(!special&&l.id!==levelId(n))fail(`level ${n} must have id ${levelId(n)}, not ${String(l.id)}`);
   if(!special&&l.chapter!==chapterOf(n))fail(`${l.id} belongs to chapter ${chapterOf(n)}, not ${String(l.chapter)}`);
   if(!l.display?.title||!l.display.description||!l.display.briefing)fail(`${l.id} is missing display text`);
   const copy=freeze(structuredClone(l));
   try{setupOf(copy);}catch(e){fail(`${l.id}: ${(e as Error).message}`);}
   this.ids.set(copy.id,copy);this.numbers.set(n,copy);
  }
  this.levels=Object.freeze([...this.numbers.values()].sort((a,b)=>Number(isSpecialLevelId(a.id))-Number(isSpecialLevelId(b.id))||a.number-b.number)); // special modes last
 }
 has(id:string){return this.ids.has(id);}
 get(id:string){const l=this.ids.get(id);if(!l)throw new Error(`Unknown campaign level ${String(id)}`);return l;}
 byNumber(n:number){const l=this.numbers.get(n);if(!l)throw new Error(`Unknown campaign level number ${String(n)}`);return l;}
 list(){return this.levels;}
 // A fresh MatchSetup on every call: nothing a match does reaches the level or the next match.
 setup(level:string|number):MatchSetup{return setupOf(typeof level==='number'?this.byNumber(level):this.get(level));}
}

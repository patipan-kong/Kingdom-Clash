import {nextLevelXp,progressionRules,skillLevel,skillRules,type GuardianSkill} from '../data/progression';
import type {GameEvent} from './GameState';
export interface HeroProgression {level:number;xp:number;skillPoints:number;ranks:Record<GuardianSkill,number>}
export const initialProgression=():HeroProgression=>({level:1,xp:0,skillPoints:progressionRules.initialPoints,ranks:{bash:0,taunt:0,charge:0,zone:0}});
export class Progression {
 private rewards=new Set<string>();
 private allocations=new Set<string>();
 constructor(private hero:HeroProgression){}
 // Called by authoritative rewards only; not exposed as a player command.
 award(sourceId:string,amount:number):GameEvent[]{
  if(!sourceId||!Number.isSafeInteger(amount)||amount<=0||this.rewards.has(sourceId))return [];
  this.rewards.add(sourceId);if(this.hero.level>=progressionRules.maxLevel)return [];
  const events:GameEvent[]=[{type:'xp',sourceId,amount}];this.hero.xp+=amount;
  while(this.hero.level<progressionRules.maxLevel&&this.hero.xp>=nextLevelXp(this.hero.level)){
   this.hero.xp-=nextLevelXp(this.hero.level);this.hero.level++;this.hero.skillPoints++;events.push({type:'level-up',level:this.hero.level});
  }
  if(this.hero.level===progressionRules.maxLevel)this.hero.xp=0;
  return events;
 }
 allocate(requestId:string,skill:GuardianSkill):GameEvent{
  if(!requestId||this.allocations.has(requestId))return {type:'rejected',reason:'Duplicate or invalid skill request'};
  this.allocations.add(requestId);
  if(!Object.hasOwn(skillRules,skill))return {type:'rejected',reason:'Unknown skill'};
  const rank=this.hero.ranks[skill]+1;
  if(rank>skillRules[skill].maxRank)return {type:'rejected',reason:'Maximum skill rank'};
  if(this.hero.level<skillLevel(skill,rank))return {type:'rejected',reason:`Requires LV ${skillLevel(skill,rank)}`};
  if(this.hero.skillPoints<1)return {type:'rejected',reason:'No Skill Points'};
  this.hero.skillPoints--;this.hero.ranks[skill]=rank;return {type:'skill-upgraded',skill,rank};
 }
}

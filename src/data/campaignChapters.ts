import {campaignRules,levelId} from './campaign';

export interface ChapterSlot {
 readonly localNumber:number;
 readonly levelNumber:number;
 /** Intended story identity. A slot is pending until this mission is registered. */
 readonly levelId:string;
}
export interface ChapterDefinition {
 readonly id:string;
 readonly number:number;
 readonly title:string;
 readonly subtitle:string;
 readonly narrative:string;
 readonly release:'available'|'coming-soon';
 /** Selection artwork only; this does not select a battlefield theme. */
 readonly artwork:'kingdom'|'frontier'|'frozen';
 readonly slots:readonly ChapterSlot[];
}

// Six missions per chapter, numbered from the start of the chapter's block: Chapter 2 is campaign-11 to campaign-16.
const slots=(chapter:number):ChapterSlot[]=>Array.from({length:campaignRules.chapterMissions},(_,i)=>{
 const levelNumber=(chapter-1)*campaignRules.chapterBlock+i+1;return {localNumber:i+1,levelNumber,levelId:levelId(levelNumber)};
});

export const campaignChapters:readonly ChapterDefinition[]=[
 {id:'first-war',number:1,title:'The First War',subtitle:'Hold the river. Reclaim the realm.',
  narrative:'Defend the green kingdom, hold its crossings, and advance toward the Crimson Keep.',release:'available',artwork:'kingdom',slots:slots(1)},
 {id:'burning-frontier',number:2,title:'The Burning Frontier',subtitle:'Beyond the river, the earth burns.',
  narrative:'Cross the river into desert canyons and sandstone strongholds. All six missions are released.',release:'available',artwork:'frontier',slots:slots(2)},
 {id:'frozen-crown',number:3,title:'The Frozen Crown',subtitle:'The last road climbs into winter.',
  narrative:'Climb through snowy valleys, breach the frozen fortress walls and face the Frost Warlord. All six missions are released.',release:'available',artwork:'frozen',slots:slots(3)},
];

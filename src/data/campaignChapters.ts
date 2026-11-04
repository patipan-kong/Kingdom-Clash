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
 // Chapter 4 is released: its six missions (campaign-31 to campaign-36) follow Chapter 3 in the sequence, so it unlocks after Mission 6 of Chapter 3 and Continue reaches it.
 {id:'conquered-lands',number:4,title:'The Conquered Lands',subtitle:'Take the land, one camp at a time.',
  narrative:'Capture Crimson camps, repair what the fighting broke and hold each foothold to open the road to the Crimson Keep.',release:'available',artwork:'kingdom',slots:slots(4)},
 // Chapter 5 is Coming Soon until the PO approves its release: campaign-41 is registered (dev ?debug=1&level=41, ?unlock=all) but the sequence stops at the first unreleased chapter. It reuses the Chapter 4 selection artwork until its own is supplied.
 {id:'rise-of-the-heroes',number:5,title:'Rise of the Heroes',subtitle:'No kingdom was won alone.',
  narrative:'Rebuild the Old Tavern, hire mercenary heroes and fight beside them to take back the road.',release:'coming-soon',artwork:'kingdom',slots:slots(5)},
];

import {levelId} from './campaign';

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

export const campaignChapters:readonly ChapterDefinition[]=[
 {id:'first-war',number:1,title:'The First War',subtitle:'Hold the river. Reclaim the realm.',
  narrative:'Defend the green kingdom, hold its crossings, and advance toward the Crimson Keep.',release:'available',artwork:'kingdom',slots:[
   {localNumber:1,levelNumber:1,levelId:levelId(1)},{localNumber:2,levelNumber:2,levelId:levelId(2)},
   {localNumber:3,levelNumber:3,levelId:levelId(3)},{localNumber:4,levelNumber:4,levelId:levelId(4)},
   {localNumber:5,levelNumber:5,levelId:levelId(5)},{localNumber:6,levelNumber:6,levelId:levelId(6)},
   {localNumber:7,levelNumber:7,levelId:levelId(7)},{localNumber:8,levelNumber:8,levelId:levelId(8)},
   {localNumber:9,levelNumber:9,levelId:levelId(9)},{localNumber:10,levelNumber:10,levelId:levelId(10)},
  ]},
 {id:'burning-frontier',number:2,title:'The Burning Frontier',subtitle:'Beyond the river, the earth burns.',
  narrative:'Cross the river into desert canyons and sandstone strongholds. The first three missions are released.',release:'available',artwork:'frontier',slots:[
   {localNumber:1,levelNumber:11,levelId:levelId(11)},{localNumber:2,levelNumber:12,levelId:levelId(12)},
   {localNumber:3,levelNumber:13,levelId:levelId(13)},{localNumber:4,levelNumber:14,levelId:levelId(14)},
   {localNumber:5,levelNumber:15,levelId:levelId(15)},{localNumber:6,levelNumber:16,levelId:levelId(16)},
   {localNumber:7,levelNumber:17,levelId:levelId(17)},{localNumber:8,levelNumber:18,levelId:levelId(18)},
   {localNumber:9,levelNumber:19,levelId:levelId(19)},{localNumber:10,levelNumber:20,levelId:levelId(20)},
  ]},
 {id:'frozen-crown',number:3,title:'The Frozen Crown',subtitle:'The last road climbs into winter.',
  narrative:'A future campaign through snowy pine valleys toward an icy fortress. Missions are not released.',release:'coming-soon',artwork:'frozen',slots:[
   {localNumber:1,levelNumber:21,levelId:levelId(21)},{localNumber:2,levelNumber:22,levelId:levelId(22)},
   {localNumber:3,levelNumber:23,levelId:levelId(23)},{localNumber:4,levelNumber:24,levelId:levelId(24)},
   {localNumber:5,levelNumber:25,levelId:levelId(25)},{localNumber:6,levelNumber:26,levelId:levelId(26)},
   {localNumber:7,levelNumber:27,levelId:levelId(27)},{localNumber:8,levelNumber:28,levelId:levelId(28)},
   {localNumber:9,levelNumber:29,levelId:levelId(29)},{localNumber:10,levelNumber:30,levelId:levelId(30)},
  ]},
];

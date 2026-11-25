import type {LevelDefinition} from './campaign';
import {buildings} from './buildings';
import type {MatchPost} from './matchSetup';
import {serpentVale,valeLowGate,valeRespawnChain,valeSiegeWall} from '../world/battlefield';

export const lowGateLevelId='campaign-53';
const intoTheValeId='campaign-51',wolfHollowId='campaign-52';
const northSlot=[1800,504] as const;
const southSlot=[1800,840] as const;
const keepSlot=[1416,504] as const;
const northRoadSlot=[1704,312] as const;
const hollowSlot=[840,168] as const;
const valeBannerHp={bannerHp:1200,crimsonBannerHp:1200};
const valeForwardRespawn={respawnChain:valeRespawnChain,contestForwardRespawn:true} as const;
const posts:readonly MatchPost[]=[
 {id:'forest',name:'Forest',flag:{x:984,y:984},circle:serpentVale.outposts![0],ring:96,
  holders:['vale-forest-tower'],ruin:{col:19,row:21},...valeBannerHp,raiseTicks:90,repair:{percent:60,ticks:150},counter:{count:0,slots:[]}},
 {id:'camp',name:'Camp',flag:{x:1032,y:264},circle:serpentVale.outposts![1],ring:96,
  holders:['vale-camp-west','vale-camp-east'],ruin:{col:22,row:8},...valeBannerHp,raiseTicks:90,repair:{percent:60,ticks:150},counter:{count:0,slots:[]}},
 {id:'outpost',name:'Outpost',flag:{x:1464,y:216},circle:serpentVale.outposts![2],ring:96,
  holders:['vale-outpost-north','vale-outpost-south'],ruin:{col:31,row:3},ballista:{col:31,row:6},
  ...valeBannerHp,raiseTicks:90,repair:{percent:60,ticks:150},counter:{count:0,slots:[]}},
];

const [forest,camp,outpost]=posts;
const campWardenAnchor=[1080,312] as const;
const forestObjective={id:'forest',type:'capture',post:'forest',display:{label:'Capture Forest'}} as const;
const campObjective={id:'camp',type:'capture',post:'camp',display:{label:'Capture Camp'}} as const;
const outpostObjective={id:'outpost',type:'capture',post:'outpost',display:{label:'Capture Outpost'}} as const;
const keepObjective={id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}} as const;
const valeStart={guardian:serpentVale.respawn[0]};
const valePads=[{col:8,row:16},{col:22,row:18}];
const intoTheVale:LevelDefinition={
 id:intoTheValeId,number:51,chapter:6,
 display:{title:'Into the Vale',difficulty:'introductory',
  description:'Establish forward respawns at Forest and Camp, then march on the Crimson Keep.',
  briefing:'Follow the valley south to Forest, then north to Camp. Defeat the towers at each post, then destroy its Crimson Banner to take the territory. Hold both Banners to bring down the Crimson Keep’s shield. Repel the counterattack from the north road and expect the Warden to make a last stand at the Keep. If the Guardian falls, the furthest connected Azure Banner determines where the Guardian returns.'},
 match:{encounter:'extended',overrides:{
  battlefield:'serpent-vale-intro',start:{...valeStart,gold:195,wood:112,iron:20},
  defenders:['vale-forest-tower','vale-camp-west','vale-camp-east','vale-outpost-south','vale-keep-north'],
  waves:{firstWaveTick:450,waveInterval:840,enemyPerWave:[4,4,5,5,6],elitesPerWave:[0,0,1,1,2],alliedPerWave:1,redSlots:[[...northRoadSlot]],caps:{red:18,blue:16}},
  posts:[{...forest,counter:{count:1,slots:[[1128,840]]}},
   {...camp,hero:{anchor:campWardenAnchor,guard:156,spawn:[1656,456],respawnTicks:120,returnAtKeep:true},
    counter:{count:3,slots:[[1272,264],[1176,312]]}}],...valeForwardRespawn,respawnChain:valeRespawnChain.slice(0,2),
  azure:{pads:valePads,initial:[],limit:1},
 }},
 mission:{waveMode:'until-objectives',phases:[
  {id:'foothold',objectives:[forestObjective]},
  {id:'advance',objectives:[campObjective]},
  {id:'assault',objectives:[keepObjective]},
 ]},
};
const wolfHollow:LevelDefinition={
 id:wolfHollowId,number:52,chapter:6,
 display:{title:'Wolf Hollow',difficulty:'standard',
  description:'Hold Camp against a raid from Wolf Hollow and push to the Outpost.',
  briefing:'Destroy the Crimson Banners to capture Forest, Camp and Outpost, then destroy the Crimson Keep. Each post’s Warden returns while Crimson controls that post. Taking Camp draws Elites out of Wolf Hollow, and a Crimson Raider hunts your Banners. Assign a recruited Hero to Defend Camp while you push onward. After taking Outpost, clear the tower covering the ruin and choose Repair Ballista in Build.'},
 match:{encounter:'extended',overrides:{
  battlefield:'serpent-vale-sealed',start:{...valeStart,gold:180,wood:240,iron:40},
  defenders:['vale-forest-tower','vale-camp-west','vale-camp-east','vale-outpost-north','vale-outpost-south','vale-keep-north'],
  waves:{firstWaveTick:360,waveInterval:780,enemyPerWave:[5,5,6,6,7],raidersPerWave:[0,1,1,2],alliedPerWave:1,skipAlliedEvery:4,
   redSlots:[[...northRoadSlot],[...northSlot]],caps:{red:20,blue:16}},
  posts:[{...forest,hero:{anchor:[1032,936],guard:156,spawn:[1032,936],respawnTicks:65*30,respawnWhileCrimson:true}},
   {...camp,hero:{anchor:campWardenAnchor,guard:156,spawn:campWardenAnchor,respawnTicks:65*30,respawnWhileCrimson:true},counter:{count:3,slots:[hollowSlot]}},
   {...outpost,hero:{anchor:[1464,264],guard:156,spawn:[1464,264],delayTicks:70*30,respawnTicks:85*30,respawnWhileCrimson:true}},
  ],...valeForwardRespawn,
  hero:{spawn:hollowSlot,delayTicks:135*30,respawnTicks:90*30},
  azure:{pads:valePads,initial:[],limit:2},
  tavern:{cap:2,roster:['roland','borin','kael']},
 }},
 mission:{waveMode:'until-objectives',phases:[
  {id:'foothold',objectives:[forestObjective]},
  {id:'advance',objectives:[campObjective]},
  {id:'siege-position',objectives:[outpostObjective]},
  {id:'assault',objectives:[keepObjective]},
 ]},
};

// Kept out of the release campaign registry. Only a local development debug launch uses these levels.
export const serpentValeLevels:readonly LevelDefinition[]=[intoTheVale,wolfHollow,{
 id:lowGateLevelId,number:53,chapter:6,
 display:{title:'The Low Gate',difficulty:'standard',
  description:'Push through Camp and Outpost, or take the Low Gate into the Crimson Barracks Yard.',
  briefing:'Destroy the Crimson Banner at Forest to capture it, then destroy the Crimson Keep. The north road unlocks forward respawns and a repairable Ballista. Once you hold Camp, the Yard Warden and his soldiers can march on Forest while the Low Gate is still Crimson. Leave a Hero to defend Forest, or take the southern route and destroy the Yard Barracks. Opening the gate redirects regular waves toward Forest. Repair it to send them around the long road again.'},
 match:{encounter:'extended',overrides:{
  battlefield:'serpent-vale',start:{guardian:serpentVale.respawn[0],gold:140,wood:220,iron:36},
  defenders:serpentVale.towers!.map(t=>t.id),crimsonKeepArmed:true,
  waves:{firstWaveTick:450,waveInterval:720,enemyPerWave:[5,5,6,7,7],elitesPerWave:[0,1,1,2,2],
   alliedPerWave:1,skipAlliedEvery:2,redSlots:[[...northSlot],[...southSlot],[...keepSlot]],caps:{red:20,blue:16}},
  posts:[{...forest,counter:{count:2,slots:[[1128,840]]}},camp,
   {...outpost,hero:{anchor:[1464,264],guard:156,spawn:[1464,264],delayTicks:50*30,respawnTicks:65*30,respawnWhileCrimson:true}},
  ],campShield:false,...valeForwardRespawn,
  guard:{anchor:[1464,792],radius:168,spawn:[1416,792],respawnTicks:50*30,
   counterattack:{afterPost:'camp',targetPost:'forest',barracks:'red-barracks-south',gate:valeLowGate,delayTicks:12*30,intervalTicks:80*30,durationTicks:48*30,escortCount:3}},
  gates:[{id:valeLowGate,hp:1000},{id:valeSiegeWall,hp:buildings.wall.maxHp}],
  captures:[{id:valeLowGate,name:'Low Gate',ring:96,holders:['vale-gate-north','vale-forest-tower'],
   captureTicks:90,repair:{wood:100,iron:18,ticks:150}}],
  barracks:[{id:'red-barracks-north',hp:1100,slots:[northSlot]},{id:'red-barracks-south',hp:1100,slots:[southSlot]},{id:'red-barracks-keep',hp:1100,slots:[keepSlot]}],
  azure:{pads:[{col:8,row:16},{col:22,row:18}],initial:[],limit:2},
  tavern:{cap:2,roster:['roland','borin','kael']},
 }},
 mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[
  {id:'forest',type:'capture',post:'forest',display:{label:'Capture Forest'}},
  {id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}},
 ]}]},
}];

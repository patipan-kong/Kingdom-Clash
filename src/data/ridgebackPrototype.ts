import type {LevelDefinition} from './campaign';
import {buildings} from './buildings';
import type {MatchPost} from './matchSetup';
import {ridgeback,ridgebackRespawnChain,valeSiegeWall} from '../world/battlefield';

export const ridgebackLevelId='campaign-54';
const northSlot=[1464,312] as const;
const southSlot=[1464,840] as const;
const ridgeWarden=[1224,312] as const;
const campWarden=[1128,888] as const;
const keepWarden=[1512,600] as const;
const banner={bannerHp:1200,crimsonBannerHp:1200,ring:96,raiseTicks:90,repair:{percent:60,ticks:150}};
const posts:readonly MatchPost[]=[
 {id:'forest',name:'Forest',flag:{x:696,y:600},circle:ridgeback.outposts![0],
  holders:['ridgeback-forest-tower','ridgeback-forest-north'],ruin:{col:15,row:11},...banner,counter:{count:0,slots:[]}},
 {id:'ridge',name:'Ridge',flag:{x:1176,y:312},circle:ridgeback.outposts![1],
  holders:['ridgeback-ridge-north','ridgeback-ridge-south','ridgeback-ridge-road'],ruin:{col:24,row:4},...banner,
  hero:{anchor:ridgeWarden,spawn:ridgeWarden,guard:156,respawnTicks:75*30,respawnWhileCrimson:true},
  counter:{count:3,slots:[[792,744],[840,744],[840,792]]}},
 {id:'camp',name:'Crimson Camp',flag:{x:1080,y:888},circle:ridgeback.outposts![2],
  holders:['ridgeback-camp-north','ridgeback-camp-south','ridgeback-camp-road'],ruin:{col:24,row:17},...banner,counter:{count:0,slots:[]},
  hero:{anchor:campWarden,spawn:campWarden,guard:156,respawnTicks:85*30,respawnWhileCrimson:true}},
];

export const ridgebackLevel:LevelDefinition={
 id:ridgebackLevelId,number:54,chapter:6,
 display:{title:'Ridgeback',difficulty:'standard',
  description:'Hold Forest at the fork while you fight for both roads around the mesa.',
  briefing:'Capture Forest, Ridge and Crimson Camp once each to break the Crimson Keep’s shield for good, then destroy the Keep. Taking Ridge brings an Elite counterattack from Lower Pass. Leave a recruited Hero on Defend near Forest while you push the other road. Losing Forest cuts off forward respawns until you take it back. Each Barracks supplies its own road. Break their reinforcements before taking on the Keep Warden.'},
 match:{encounter:'extended',overrides:{
  battlefield:'ridgeback',start:{guardian:ridgeback.respawn[0],gold:200,wood:300,iron:40},
  defenders:ridgeback.towers!.map(t=>t.id),crimsonKeepArmed:true,
  waves:{firstWaveTick:450,waveInterval:720,enemyPerWave:[6,7,7,8,8,9,9],elitesPerWave:[1,2,2,2,4,4,4],
   alliedPerWave:1,skipAlliedEvery:2,redSlots:[[...northSlot],[...southSlot]],caps:{red:19,blue:16}},
  posts,campShield:'first-capture',respawnChain:ridgebackRespawnChain,contestForwardRespawn:true,
  guard:{anchor:keepWarden,spawn:keepWarden,radius:240,respawnTicks:80*30},
  gates:[{id:valeSiegeWall,hp:buildings.wall.maxHp}],
  barracks:[{id:'red-barracks-ridgeback',hp:1100,slots:[northSlot]},
   {id:'red-barracks-ridgeback-south',hp:1100,slots:[southSlot]}],
  azure:{pads:[{col:10,row:16},{col:16,row:13},{col:20,row:18}],initial:[],limit:2},
  tavern:{cap:2,roster:['roland','borin','kael']},
 }},
 mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[
  {id:'forest',type:'capture',post:'forest',display:{label:'Capture Forest'}},
  {id:'ridge',type:'capture',post:'ridge',display:{label:'Capture Ridge'}},
  {id:'camp',type:'capture',post:'camp',display:{label:'Capture Crimson Camp'}},
  {id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}},
 ]}]},
};

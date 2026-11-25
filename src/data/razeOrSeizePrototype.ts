import type {LevelDefinition} from './campaign';
import {m5V3,m5V3CourtyardBarracks,m5V3InnerBarracks,razeOrSeize,razeOrSeizeCentral,razeOrSeizeRespawn,razeOrSeizeSites} from '../world/battlefield';

export const razeOrSeizeLevelId='campaign-55';

// The V2 setup is also retained as a comparison fixture for the M5 regression tests.
export const razeOrSeizeV2Level:LevelDefinition={
 id:razeOrSeizeLevelId,number:55,chapter:6,
 display:{title:'Raze or Seize',difficulty:'standard',
  description:'Two Elite Barracks feed the Crimson siege road. Destroy them or turn their recruits against the Keep.',
  briefing:'Take Central Post and hold its Banner to drop the Keep shield. In either side pocket, focus the Elite Barracks to raze it, or defeat its watchtowers and hold the ring to seize it. Bring the Guardian into a captured ring to pay for repairs. Stay near your Azure Elites as you lead them to the Keep.'},
 match:{encounter:'extended',overrides:{
  battlefield:'raze-or-seize',
  start:{guardian:{x:744,y:600},gold:200,wood:300,iron:40},
  defenders:razeOrSeize.towers!.map(t=>t.id),
  waves:{firstWaveTick:450,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],
   alliedPerWave:1,caps:{red:19,blue:16},redSlots:[[1512,600],[2760,744]]},
  post:{id:'central',name:'Central Post',circle:razeOrSeizeCentral,flag:{x:razeOrSeizeCentral.x,y:razeOrSeizeCentral.y},
   ring:96,holders:['m5-central-north','m5-central-south'],ruin:{col:18,row:10},
   bannerHp:1200,crimsonBannerHp:1200,raiseTicks:90,repair:{percent:60,ticks:150},counter:{count:0,slots:[]}},
  respawnChain:[{post:'central',candidates:razeOrSeizeRespawn}],contestForwardRespawn:true,
  guard:{anchor:[2424,648],spawn:[2424,648],radius:216,respawnTicks:80*30},
  crimsonKeepArmed:true,
  gates:razeOrSeize.gates!.map(gate=>({id:gate.id,hp:3000,faction:true,assist:true})),
  captures:razeOrSeizeSites.map((site,i)=>({
   id:site.id,name:i===0?'North Elite Barracks':'South Elite Barracks',
   ring:120,holders:site.holders,captureTicks:120,repair:{wood:96,iron:24,ticks:150},
   warden:{anchor:site.warden,radius:216,respawnTicks:80*30},
   elite:{hp:2000,slots:site.slots,intervalTicks:(i===0?45:55)*30,count:2},
  })),
  azure:{pads:[{col:10,row:10},{col:10,row:14}],initial:[{col:10,row:10}],limit:2},
  tavern:{cap:2,roster:['roland','borin','kael']},
 }},
 mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[
  {id:'central',type:'capture',display:{label:'Capture Central Post'}},
  {id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}},
 ]}]},
};

const v2Setup=razeOrSeizeV2Level.match.overrides!;
const {guard:legacyGuard,...v3Setup}=v2Setup;
export const m5V3Wardens=[
 {id:'red-warden-inner-a',name:'Inner Keep Warden A',anchor:[2232,312],radius:216,respawnTicks:90*30},
 {id:'red-warden-inner-b',name:'Inner Keep Warden B',anchor:[2232,888],radius:216,respawnTicks:105*30},
 {id:'red-warden-rear',name:'Rear Keep Warden',anchor:[2520,600],radius:216,respawnTicks:120*30},
 {id:'red-warden-court-north',name:'North Keep Warden',anchor:[2568,456],radius:168,respawnTicks:120*30,defendKeep:true},
 {id:'red-warden-court-south',name:'South Keep Warden',anchor:[2568,792],radius:168,respawnTicks:120*30,defendKeep:true},
] as const;
const [northInner,southInner]=m5V3InnerBarracks;
export const razeOrSeizeLevel:LevelDefinition={
 ...razeOrSeizeV2Level,
 display:{...razeOrSeizeV2Level.display,
  description:'Crimson attacks on two wings while Azure breaches the center.',
  briefing:'Defend both wings and hold Central Post to drop the Keep shield. Breach the Main Gate from Center. Raze or seize the outer Elite Barracks, and destroy inner Barracks to cut their wing reinforcements. At the Keep, push through the courtyard guard or destroy its two Barracks to stop new recruits.'},
 match:{encounter:'extended',overrides:{
  ...v3Setup,
  wardens:m5V3Wardens,
  battlefield:'raze-or-seize-v3',
  defenders:m5V3.towers!.map(t=>t.id),
  gates:m5V3.gates!.map(gate=>({id:gate.id,hp:3000,assist:true,...(gate.id!=='red-main-gate'&&{faction:true as const})})),
  barracks:m5V3InnerBarracks.map(b=>({id:b.id,hp:2000,slots:b.slots})),
  courtyard:{
   entry:{minX:2448,minY:480,maxY:816,radius:196},
   guardRadius:164,intervalTicks:10*30,staggerTicks:5*30,livePerSite:2,
   barracks:m5V3CourtyardBarracks.map(b=>({id:b.id,hp:1050,slots:b.slots,anchor:b.anchor})),
  },
  waves:{...v2Setup.waves,redSlots:[0,1].flatMap(i=>[[...northInner.slots[i]],[...southInner.slots[i]]])},
 }},
};

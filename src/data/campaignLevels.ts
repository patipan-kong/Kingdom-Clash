import {CampaignRegistry,type LevelDefinition} from './campaign';
// Stage 2 S2 vertical slice: three representative levels. Values not named in a level's overrides come from the Stage 1 extended
// encounter as built by matchSetup('extended'): starting resources (250 Gold, 180 Wood, 30 Iron), a level 1 Guardian at the usual
// spawn, Keep HP, two Azure minions per wave and the full trading catalogue. Ticks are 30 per second.
// A level may override the starting Gold, Wood and Iron (MatchSetup start), but not the Guardian's starting level.
// Not yet expressible in a MatchSetup, so not applied: per-level skill and building restrictions and a reduced Shop catalogue.
const northBattery=['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'];
const southBattery=['red-tower-front-south','red-tower-rear-south'];
const outpost=['red-tower-rear-south'];
const towerDamage=1200;
export const campaignLevels:readonly LevelDefinition[]=[
 {
  id:'campaign-01',number:1,chapter:1,
  display:{title:'Hold the Ford',difficulty:'introductory',
   description:'Crimson raiders cross the Ford toward the Azure Keep in five waves. Break all five to hold it.',
   briefing:'Defeat five Crimson waves before they bring down the Azure Keep. Archer Towers near the Ford can help hold the line.',
   strategy:'Archer Towers between the Ford and the Keep thin out raiders while the Guardian fights; the Guardian can also hold alone.'},
  // All eight Crimson towers stand across the river, far from the fight; the Crimson Keep is inert and the Shop closed.
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:240,waveInterval:750,enemyPerWave:[3,3,4,4,5]},crimsonKeepArmed:false,shop:false}},
  // scripted: exactly these five waves spawn. Every raider either dies or strikes the Keep, so the match always ends: victory once all
  // five waves are defeated, defeat if the Keep falls first.
  mission:{waveMode:'scripted',phases:[{id:'hold',objectives:[
   {id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]}]},
 },
 {
  id:'campaign-02',number:2,chapter:1,
  display:{title:'Fortify the Crossing',difficulty:'introductory',
   description:'Crimson raiders mass beyond the river. Raise Archer Towers and let them do the killing.',
   briefing:'Raise Archer Towers on the approach to the Azure Keep, then hold the line until six Crimson waves have broken against them. Wood arrives steadily, so build as you can afford.',
   strategy:'Place towers close together on the lane between the Ford and the Keep and fight inside their range. The Guardian alone cannot finish this mission.'},
  // No Crimson structures at all: the east bank is empty and the whole mission is fought on the Azure side. The Shop is closed.
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:450,waveInterval:720,enemyPerWave:[4,4,5,5,6,6]},defenders:[],crimsonKeepArmed:false,shop:false}},
  // until-objectives: waves keep coming at size six, so a slow tower-damage count can never be stranded without enemies.
  mission:{waveMode:'until-objectives',phases:[{id:'fortify',objectives:[
   {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Complete 3 Archer Towers'}},
   {id:'tower-damage',type:'tower-damage',count:towerDamage,display:{label:`Archer Towers deal ${towerDamage} damage`}},
   {id:'waves',type:'waves-defeated',count:6,display:{label:'Defeat 6 Crimson waves'}}]}]},
 },
 {
  id:'campaign-03',number:3,chapter:1,
  display:{title:'Strike the Outpost',difficulty:'standard',
   description:'A lone Crimson watchtower guards the southern bank. Grow in strength, then tear it down.',
   briefing:'Hold the Ford while your Guardian gains experience. Once it reaches level 3, cross the river and destroy the southern outpost tower.',
   strategy:'Fight the first waves at the Ford to reach level 3 and spend your skill points, then take your Guardian across the bridge and focus the tower.'},
  // One tower stands off the lane's southern edge; the Crimson Keep is inert. The Shop is open but not needed.
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4]},defenders:outpost,crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'muster',objectives:[{id:'level',type:'guardian-level',level:3,display:{label:'Reach Guardian level 3'}}]},
   {id:'strike',objectives:[{id:'outpost',type:'destroy',targets:outpost,display:{label:'Destroy the Southern Outpost'}}]}]},
 },
 {
  id:'campaign-04',number:4,chapter:1,
  display:{title:'The Broken Line',difficulty:'standard',
   description:'The southern battery has broken our line. Rebuild the defenses, hold the Ford, then break both towers.',
   briefing:'Raise two Archer Towers and defeat two Crimson waves, then destroy both towers of the southern battery. If the Azure Keep falls below 50% health, the counterattack has failed.',
   strategy:'Your towers must still stand when you strike, so build them first. Leave them guarding the Keep while the Guardian takes the battery one tower at a time.'},
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4,5]},defenders:southBattery,crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'rebuild',objectives:[
    {id:'towers',type:'structures-standing',kind:'tower',count:2,display:{label:'Keep 2 Archer Towers standing'}},
    {id:'waves',type:'waves-defeated',count:2,display:{label:'Defeat 2 Crimson waves'}}]},
   {id:'break',objectives:[{id:'south-battery',type:'destroy',targets:southBattery,display:{label:'Destroy the South Battery'}}]}]},
 },
 {
  id:'campaign-05',number:5,chapter:1,
  display:{title:'Iron Bulwark',difficulty:'standard',
   description:'Three Crimson towers of the North Battery cover each other. Break them without letting the Azure Keep fall below half.',
   briefing:'Destroy front-north, rear-north and keep-north. If the Azure Keep drops below 50% health, the attack has failed.',
   strategy:'Hold the first waves, then strike the battery one tower at a time. A Guardian Shield is worth considering but not required.'},
  match:{encounter:'extended',overrides:{waves:{waveInterval:900,enemyPerWave:[3,4,4,5,5,6]},defenders:northBattery,crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'assault',objectives:[
   {id:'north-battery',type:'destroy',targets:northBattery,display:{label:'Destroy the North Battery'}}]}]},
 },
 {
  id:'campaign-20',number:20,chapter:2,
  display:{title:'Full Battle',difficulty:'full-battle',
   description:'The Stage 1 Full Battle: eight Crimson towers, an armed Crimson Keep and endless waves.',
   briefing:'Destroy the Crimson Keep before the Azure Keep falls.'},
  // The Stage 1 extended encounter exactly: no overrides and no mission, so the legacy Keep-destruction outcome decides the match.
  match:{encounter:'extended'},
  mission:null,
 },
];
export const campaign=new CampaignRegistry(campaignLevels);

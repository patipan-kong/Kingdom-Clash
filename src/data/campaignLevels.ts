import {CampaignRegistry,type LevelDefinition} from './campaign';
// Stage 2 S2 vertical slice: three representative levels; S4 added Levels 2-4 and S6B Levels 6-8. Values not named in a level's overrides come from the Stage 1 extended
// encounter as built by matchSetup('extended'): starting resources (250 Gold, 180 Wood, 30 Iron), a level 1 Guardian at the usual
// spawn, Keep HP, two Azure minions per wave and the full trading catalogue. Ticks are 30 per second.
// A level may override the starting Gold, Wood and Iron (MatchSetup start), but not the Guardian's starting level.
// Not yet expressible in a MatchSetup, so not applied: per-level skill and building restrictions and a reduced Shop catalogue.
const northBattery=['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'];
const southBattery=['red-tower-front-south','red-tower-rear-south'];
const outpost=['red-tower-rear-south'];
const frontLine=['red-tower-front-north','red-tower-front-center','red-tower-front-south'];
const gateTowers=['red-tower-keep-north','red-tower-keep-south'];
const wedge=['red-tower-front-center','red-tower-rear-north','red-tower-rear-south'];
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
  id:'campaign-06',number:6,chapter:1,
  display:{title:'Breach the Front',difficulty:'standard',
   description:'Only the Crimson front line still bars the road east. Choose a flank and break through it.',
   briefing:'Hold the Ford, stunning raiders with Shield Bash, until two Crimson waves have fallen. Then destroy any two of the three front towers. If the Azure Keep falls below 50% health, the breach has failed.',
   strategy:'Learn Shield Bash first and use it on raiders at the Ford. Pick the north or south flank, take its tower and the center one; Archer Towers at home keep the Keep safe while you are away.'},
  // Level 5's waves against the three front towers; the Crimson Keep is inert. Shield Bash stuns are counted only during the hold phase.
  match:{encounter:'extended',overrides:{waves:{waveInterval:900,enemyPerWave:[3,4,4,5,5,6]},defenders:frontLine,crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'hold',objectives:[
    {id:'stuns',type:'skill-impact',effect:'stun',count:4,display:{label:'Stun 4 raiders with Shield Bash'}},
    {id:'waves',type:'waves-defeated',count:2,display:{label:'Defeat 2 Crimson waves'}}]},
   // Any two of the three: a tower destroyed during the hold phase is credited the moment the breach phase opens.
   {id:'breach',objectives:[{id:'front',type:'destroy',targets:frontLine,count:2,display:{label:'Destroy 2 of 3 front towers'}}]}]},
 },
 {
  id:'campaign-07',number:7,chapter:1,
  display:{title:'The Killing Ground',difficulty:'standard',
   description:'The garrison has marched east. The Guardian and whatever towers you can afford must hold the Keep alone.',
   briefing:'Raise three Archer Towers, Taunt six raiders and let the towers slay twelve. No reinforcements will come, and Wood and Iron are scarce. If the Azure Keep falls below 50% health, the Keep is lost.',
   strategy:'Build the first tower at once and the next ones as Wood and Iron arrive. Stand inside the towers\' range and Taunt raiders so the towers can cut them down.'},
  // No Crimson structures, no allied waves, a closed Shop and resources for one tower: the rest are paid for by income (2 Wood, 0.25 Iron a second).
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:450,waveInterval:720,enemyPerWave:[4,5,5,6,6,7],alliedPerWave:0},defenders:[],crimsonKeepArmed:false,shop:false,start:{wood:100,iron:10}}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'killzone',objectives:[
   {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Complete 3 Archer Towers'}},
   {id:'taunts',type:'skill-impact',effect:'taunt',count:6,display:{label:'Taunt 6 raiders'}},
   {id:'kills',type:'tower-kills',count:12,display:{label:'Archer Towers slay 12 raiders'}}]}]},
 },
 {
  id:'campaign-08',number:8,chapter:1,
  display:{title:'Against the Tide',difficulty:'standard',
   description:'Crimson waves keep coming and only one ally marches with each. Hold the Keep, then break the Crimson front line.',
   briefing:'Withstand the tide: defeat five Crimson waves and build two Archer Towers. Then break the front: destroy the three front Crimson towers. Front towers you destroy early still count. If the Azure Keep falls below 50% health, the Keep is lost.',
   strategy:'Build both towers early. Strike at the front towers between waves, but return to the Keep whenever raiders close in: two towers alone cannot hold it. The two towers by the Crimson Keep are not needed.'},
  // S6B human retune (Candidate G): waves of 3 to 6 (then 6 every 25 s), one allied minion per wave, the front line and both gate towers.
  // Only the three front towers are required. Returning when raiders close in wins in about 130 s; slower returning play in 140-280 s.
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,3,4,4,5,5,6,6],alliedPerWave:1},defenders:[...frontLine,...gateTowers],crimsonKeepArmed:false,start:{wood:80,iron:10}}},
  // Sequential: the waves count only while the tide phase is active. Front towers destroyed during the tide are credited the moment
  // the break phase opens, so it may complete on the same tick. The towers row is listed first: the HUD titles any mission whose first row
  // is a five-wave objective "Defeat Crimson Waves" (HUD.ts), which would stay up through the break phase.
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'tide',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]},
   {id:'break',objectives:[{id:'front',type:'destroy',targets:frontLine,display:{label:'Destroy the 3 front towers'}}]}]},
 },
 {
  id:'campaign-09',number:9,chapter:1,
  display:{title:'The Lone Vanguard',difficulty:'standard',
   description:'No ally marches with you. Break the Crimson wedge with the Guardian\'s Charge and whatever towers you can raise.',
   briefing:'Slow five Crimson raiders with Vanguard Charge, and destroy the three towers of the Crimson wedge: front-center, rear-north and rear-south. Both are required. If the Azure Keep falls below 50% health, the Keep is lost.',
   strategy:'Learn Vanguard Charge early and aim it at raiders as they close in. Raise Archer Towers before you march, and return to the Keep when raiders reach it. Guardian Zone, once unlocked, is an optional shield for the hardest fights.'},
  // S6D: three-tower wedge, no allied reinforcements, an inert Crimson Keep and the default start. Charge slows count while the phase is active (the single phase
  // runs from the start), one per Charge that connects, so the objectives run in parallel. The slow row is listed first and does not name waves (HUD title rules).
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,3,4,4,5,5,6,6],alliedPerWave:0},defenders:wedge,crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'vanguard',objectives:[
   {id:'slows',type:'skill-impact',effect:'slow',count:5,display:{label:'Slow 5 raiders with Vanguard Charge'}},
   {id:'wedge',type:'destroy',targets:wedge,display:{label:'Destroy the 3 wedge towers'}}]}]},
 },
 {
  id:'campaign-10',number:10,chapter:1,
  display:{title:'The Crimson Keep',difficulty:'standard',
   description:'The road to the Crimson Keep is open. Break its gate towers, then bring down the Keep itself.',
   briefing:'Raise two Archer Towers and destroy the two Crimson gate towers, keep-north and keep-south. Then destroy the Crimson Keep, which now fights back. If the Azure Keep falls below 50% health, the attack has failed.',
   strategy:'Build both towers at home first, then take the gate towers between waves. The Crimson Keep shoots anyone who comes close, so bring your strength and keep the Azure Keep safe while you work.'},
  // S6D: the verified L10a1 design. The front-center tower and both gate towers defend and the Crimson Keep is armed. Only the two gate towers are required in the
  // first phase; the Crimson Keep is the second.
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,4,4,5,5,6,6,7],alliedPerWave:1},defenders:['red-tower-front-center',...gateTowers],crimsonKeepArmed:true}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'gates',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'gate',type:'destroy',targets:gateTowers,display:{label:'Destroy the 2 gate towers'}}]},
   {id:'siege',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
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

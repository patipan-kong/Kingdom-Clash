import {CampaignRegistry,chapterOf,levelId,type LevelDefinition} from './campaign';
// Chapter 2 S4: Level 11 is the first Canyon mission; Full Battle is the special mode 'full-battle' (number 0, chapter 0), so campaign-20 stays free for the Chapter 2 finale.
// Stage 2 S2 vertical slice: three representative levels; S4 added Levels 2-4 and S6B Levels 6-8. Values not named in a level's overrides come from the Stage 1 extended
// encounter as built by matchSetup('extended'): starting resources (250 Gold, 180 Wood, 30 Iron), a level 1 Guardian at the usual
// spawn, Keep HP, two Azure minions per wave and the full trading catalogue. Ticks are 30 per second.
// A level may override the starting Gold, Wood and Iron (MatchSetup start), but not the Guardian's starting level.
// Not yet expressible in a MatchSetup, so not applied: per-level skill and building restrictions and a reduced Shop catalogue.
const northBattery=['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'];
const southBattery=['red-tower-front-south','red-tower-rear-south'];
const outpost=['red-tower-rear-south'];
const frontLine=['red-tower-front-north','red-tower-front-center','red-tower-front-south'];
const brokenWallTowers=['red-siege-north','red-siege-centre','red-siege-south','red-guard-north','red-guard-south']; // Chapter 3 M2 (The Broken Wall): the battlefield's Crimson towers, all optional
const azurePads=[{col:10,row:10},{col:10,row:14},{col:13,row:12}]; // Chapter 3 M3: Azure Barracks pads around the Azure Keep; the first holds the Barracks the mission starts with
const gateTowers=['red-tower-keep-north','red-tower-keep-south'];
const wedge=['red-tower-front-center','red-tower-rear-north','red-tower-rear-south'];
const towerDamage=1200;
const frostGateHp=3000; // Chapter 3 C3-1 balance v3, provisional (docs/CHAPTER3_C3-1.md): the Guardian breaks it in about 48 s at level 1 and 42 s at level 5 without a Siege Hammer, about 28 s with one
// The pre-redesign campaign, Levels 1-22 and Full Battle under their original ids and numbers. It is source material only and is never registered:
// the six-mission chapters below take their missions from it, and the remaining entries stay here for the redesign to merge or retire.
export const legacyCampaignLevels:readonly LevelDefinition[]=[
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
  id:'campaign-11',number:11,chapter:2,
  display:{title:'Canyon Pass',difficulty:'standard',
   description:'Crimson raiders pour through a sandstone canyon toward the Azure Keep. Hold the pass mouth, then break the front line beyond it.',
   briefing:'Raise an Archer Tower at the mouth of the pass and defeat three Crimson waves as they come through. Then cross the canyon and destroy any two of the three front towers. If the Azure Keep falls below 50% health, the pass is lost.',
   strategy:'Build your tower at the east edge of your territory, where it reaches both lanes at the mouth of the pass. The spire splits the canyon into a north and a south lane, each leading to a front tower; pick a lane, take that tower and the center one.'},
  // S4: the first Canyon mission. Level 6's front line and wave sizes on Canyon Pass, with a hold phase that asks for one tower and three waves. The Crimson Keep
  // is inert and the Shop stays open but is not needed. No Desert Raiders: every enemy is a Crimson minion.
  match:{encounter:'extended',overrides:{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4,5,5],alliedPerWave:1},defenders:frontLine,crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'hold',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:1,display:{label:'Build 1 Archer Tower'}},
    {id:'waves',type:'waves-defeated',count:3,display:{label:'Defeat 3 Crimson waves'}}]},
   {id:'breach',objectives:[{id:'front',type:'destroy',targets:frontLine,count:2,display:{label:'Destroy 2 of 3 front towers'}}]}]},
 },
 {
  id:'campaign-12',number:12,chapter:2,
  display:{title:'Hold the Sunwell',difficulty:'standard',
   description:'Crimson columns march round the Sunwell pond toward the Azure Keep. Two shore outposts give you room to build, but you have only one Guardian to stand with them.',
   briefing:'Raise three Archer Towers and defeat six Crimson waves as they come round the pond. If the Azure Keep falls below 50% health, the oasis is lost.',
   strategy:'The pond splits the field into a north and a south bank, and each has a shore outpost where you may build. Most Crimson will choose one bank, but not always the same one. Put towers where the fighting is, and keep your Guardian beside them.'},
  // S6: the first Oasis mission. Level 11's waves and Keep rules with no Crimson towers and no breach. The Crimson Keep is inert and the Shop stays open but is not needed.
  // No Desert Raiders: every enemy is a Crimson minion. Every balance value is provisional (docs/CHAPTER2_S6.md).
  match:{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4,5,5],alliedPerWave:1},defenders:[],crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'defend',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Build 3 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:6,display:{label:'Defeat 6 Crimson waves'}}]}]},
 },
 {
  id:'campaign-13',number:13,chapter:2,
  display:{title:'The Dust Riders',difficulty:'standard',
   description:'Desert Raiders ride in among the Crimson ranks. They are lighter than the infantry beside them, and much faster.',
   briefing:'Raise two Archer Towers and defeat six Crimson waves. From the third wave on, Desert Raiders ride with the infantry. If the Azure Keep falls below 50% health, the pass is lost.',
   strategy:'Raiders outrun the Crimson infantry and reach your lines first, but they have less health. Build at the mouth of the pass and let the towers and your Guardian cut them down before the infantry arrives.'},
  // S6: Desert Raiders appear from Wave 3 (2, 2, 3, 3 in waves 3 to 6) inside the Level 11 wave totals, on Canyon Pass. Pure defence: no breach and no skill objective.
  // The Crimson Keep is inert and the Shop stays open but is not needed. Every balance value is provisional (docs/CHAPTER2_S6.md).
  match:{encounter:'extended',overrides:{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4,5,5],raidersPerWave:[0,0,2,2,3,3],alliedPerWave:1},defenders:[],crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'defend',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:6,display:{label:'Defeat 6 Crimson waves'}}]}]},
 },
 {
  id:'campaign-14',number:14,chapter:2,
  display:{title:'The Southern Flank',difficulty:'standard',
   description:'Desert Raiders have found a way round the south bank of the Sunwell. Watch for the wave notices and hold the oasis through eight waves.',
   briefing:'Defense mission: raise three Archer Towers and defeat eight Crimson waves to win. The Crimson Keep is not a target. From the third wave on, the column splits between the north and south banks of the pond, and the wave notice gives the count for each. If the Azure Keep falls below 50% health, the oasis is lost.',
   strategy:'Read the wave notice: it says how many enemies take each bank. Your Guardian can answer a threat on either bank, and Archer Towers can cover either outpost. Where you build is your choice; the pond keeps the banks apart, so plan how you will reach each one.'},
  // S9C: the lane split replaces the S8 flank tags. Oasis with eight waves, no allied minions; Raiders from Wave 3 (2, 2, 2, 3, 3, 4 in waves 3 to 8). From Wave 3 every unit takes a bank
  // by a seeded per-unit split (docs/CHAPTER2_S9C.md); both banks always get at least one unit. No Crimson towers and an inert Crimson Keep; the Shop stays open but is not needed. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,5,5,6,7,8],raidersPerWave:[0,0,2,2,2,3,3,4],alliedPerWave:0,lanes:[{wave:3,south:[1,2],commit:true},{wave:4,south:[1,2],commit:true},{wave:5,south:[1,2],commit:true},{wave:6,south:[3,4],commit:true},{wave:7,south:[3,4],commit:true},{wave:8,south:[4,5],commit:true}]},defenders:[],crimsonKeepArmed:false,crimsonKeepInvulnerable:true}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'defend',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Build 3 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:8,display:{label:'Defeat 8 Crimson waves'}}]}]},
 },
 {
  id:'campaign-15',number:15,chapter:2,
  display:{title:'Hold the Mouth',difficulty:'standard',
   description:'Desert Raiders ride in ahead of the Crimson column, and the Crimson front line watches the far end of the pass. Stand with your towers at the mouth and hold.',
   briefing:'Defense mission: raise three Archer Towers, deal 1,200 damage with them and defeat seven Crimson waves to win. The Crimson front line is dangerous but does not need to be destroyed. No reinforcements march with you. If the Azure Keep falls below 50% health, the pass is lost.',
   strategy:'Fight beside your towers at the mouth of the pass; the Guardian cannot win this alone. Going out to the far end of the canyon brings the front towers down on you, and your towers cannot reach what you kill there.'},
  // S10B Level 15 B3 (human playtest candidate, docs/CHAPTER2_S10B.md): Canyon Pass with seven waves, Raiders from wave 2, no allied minions and the Crimson front line standing as a threat, not an objective.
  // There is no destroy objective, so the front towers cannot be a victory path. Tower damage counts only what player-built towers deal, so a Guardian that fights away from its towers does not complete it. The Crimson Keep is inert and protected;
  // the Shop stays open but is not needed. The stun objective of the first S10B draft was removed. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,4,4,5,5,6,6],raidersPerWave:[0,2,2,3,3,4,4],alliedPerWave:0},defenders:frontLine,crimsonKeepArmed:false,crimsonKeepInvulnerable:true}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'mouth',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:3,display:{label:'Complete 3 Archer Towers'}},
    {id:'damage',type:'tower-damage',count:1200,display:{label:'Archer Towers deal 1200 damage'}},
    {id:'waves',type:'waves-defeated',count:7,display:{label:'Defeat 7 Crimson waves'}}]}]},
 },
 {
  id:'campaign-16',number:16,chapter:2,
  display:{title:'Across the Sunwell',difficulty:'standard',
   description:'Hold the oasis until the Crimson column thins, then cross the pond and break the front line while their raiders circle the south bank.',
   briefing:'Raise two Archer Towers and defeat five Crimson waves. Then cross the oasis and destroy all three front Crimson towers. Raiders will circle the south bank; the wave notice names the bank. If the Azure Keep falls below 50% health, the oasis is lost.',
   strategy:'Build both towers on the shore outposts before you leave. Break the front towers between waves, and come home when a notice says the south bank is coming: two towers cannot hold the Keep alone.'},
  // S10B: Oasis with two phases. The hold phase asks for two towers and five waves; the breach phase asks for all three front Crimson towers while the south-bank flanks (wave 4 Raiders, waves 5 to 7 every unit) keep arriving.
  // No allied minions (bot tuning, docs/CHAPTER2_S10B.md); the Crimson Keep is inert and the Shop stays open but is not needed. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,4,5,6,8,9,10,10,10],raidersPerWave:[0,0,2,3,4,5,6,6,6],alliedPerWave:0,flanks:[{wave:4,lane:'south',units:'raiders'},{wave:5,lane:'south',units:'all'},{wave:6,lane:'south',units:'all'},{wave:7,lane:'south',units:'all'}]},defenders:frontLine,crimsonKeepArmed:false,crimsonKeepInvulnerable:true}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'hold',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]},
   {id:'breach',objectives:[{id:'front',type:'destroy',targets:frontLine,display:{label:'Destroy the 3 front towers'}}]}]},
 },
 {
  id:'campaign-17',number:17,chapter:2,
  display:{title:'The Long Dusk',difficulty:'standard',
   description:'Night falls over the pass and the Crimson columns come on without a pause. Your towers must carry the fight until dawn.',
   briefing:'Defense mission: defeat ten Crimson waves and deal 1,200 damage with your Archer Towers. Waves arrive faster than before and Desert Raiders ride in from the second wave. No allies march with you. If the Azure Keep falls below 60% health, the pass is lost.',
   strategy:'The Guardian cannot win this alone: towers must do real work. Build at the mouth of the pass, keep them alive and rebuild any that fall. The Keep has less room to take damage here than on earlier missions.'},
  // S10B: Canyon Pass survival. Ten waves 600 ticks apart (20 s), Raiders from wave 2, no allied minions, no Crimson towers. Archer Tower damage (a counter: it counts only what player towers deal) makes towers
  // necessary; a Guardian-only defence cannot complete it. Azure Keep failure line 60%. The Crimson Keep is inert and the Shop stays open but is not needed. Every balance value is provisional (docs/CHAPTER2_S10B.md).
  match:{encounter:'extended',overrides:{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:600,enemyPerWave:[4,4,5,5,6,6,7,7,8,8],raidersPerWave:[0,2,2,3,3,4,4,5,5,6],alliedPerWave:0},defenders:[],crimsonKeepArmed:false,crimsonKeepInvulnerable:true}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.6},phases:[
   {id:'dusk',objectives:[
    {id:'damage',type:'tower-damage',count:1200,display:{label:'Archer Towers deal 1200 damage'}},
    {id:'waves',type:'waves-defeated',count:10,display:{label:'Defeat 10 Crimson waves'}}]}]},
 },
 {
  id:'campaign-18',number:18,chapter:2,
  display:{title:'The Twin Banks',difficulty:'standard',
   description:'The Crimson column splits around the pond and the Keep behind it stands unguarded. Hold the banks with almost nothing, then cross the oasis and break it.',
   briefing:'Siege mission: you start with no Wood or Iron, so towers wait for income. Build two Archer Towers and defeat five Crimson waves, then destroy the Crimson Keep to win. The Keep does not fight back, but its front towers do. If the Azure Keep falls below 50% health, the oasis is lost.',
   strategy:'Do not march early: with no Wood or Iron your home is bare, and the Crimson Keep counts only after the hold. Build both towers, and a third if you can, because only a spare tower lets you come home mid-siege. The front towers shoot anyone who crosses the oasis, so go straight for the Keep.'},
  // S10C-A: Oasis hold then siege. Zero starting Wood and Iron closes the early-raid shortcut that a reduced start (100 Wood, 10 Iron) did not (S10C Final Experiment). The three front towers stand as defenders and are not objectives;
  // the Crimson Keep is inert and vulnerable (3,000 HP). Destroying it early would still be credited when the siege phase opens, so the empty start is what makes holding first necessary. Seeded committed lanes from wave 3 (the S10A split shape), no allies.
  // The Shop stays open. Every balance value is provisional (docs/CHAPTER2_S10C.md).
  match:{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:800,enemyPerWave:[3,3,4,5,6,6,7,8],raidersPerWave:[0,0,2,2,3,3,4,4],alliedPerWave:0,lanes:[{wave:3,south:[1,2],commit:true},{wave:4,south:[1,2],commit:true},{wave:5,south:[2,3],commit:true},{wave:6,south:[2,3],commit:true},{wave:7,south:[3,4],commit:true},{wave:8,south:[3,5],commit:true}]},defenders:frontLine,crimsonKeepArmed:false,start:{wood:0,iron:0}}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'hold',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]},
   {id:'siege',objectives:[{id:'crimson',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
 },
 {
  id:'campaign-19',number:19,chapter:2,
  display:{title:'The Sandstone Line',difficulty:'standard',
   description:'The pass is fortified in depth: a front line, then the gate towers before the Keep. Hold the mouth, then cut through each line in turn.',
   briefing:'Assault mission: you start with no Gold, Wood or Iron. Build two Archer Towers and defeat six Crimson waves, then destroy two of the three front towers and both gate towers. The Crimson Keep cannot be damaged. If the Azure Keep falls below 50% health, the pass is lost.',
   strategy:'Hold the mouth until your towers stand, then take the front line before the gates. Leave too early and the Keep falls; come home when Raiders break through.'},
  // S10C-A: Canyon assault in depth. Three phases in order: hold (two towers, six waves), front line (any two of the three front towers) and gates (both gate towers). All five Crimson towers stand as defenders; the Crimson Keep is inert and invulnerable.
  // Zero starting Gold, Wood and Iron (Gold 0 after the Level 19 playtest: the Shop opens at about 46 s instead of at once): with the default start a raid at 10 s won (S10C Final Experiment). Targets destroyed during an earlier phase are credited when their phase opens, so a leave-early line saves time but costs Guardian deaths. No allies.
  // The redundant Guardian level-5 objective of the S10C design is removed. The Shop stays open. Every balance value is provisional (docs/CHAPTER2_S10C.md).
  match:{encounter:'extended',overrides:{battlefield:'canyon-pass',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,4,4,5,5,6,6,7],raidersPerWave:[0,0,2,2,3,3,4,4],alliedPerWave:0},defenders:[...frontLine,...gateTowers],crimsonKeepArmed:false,crimsonKeepInvulnerable:true,start:{gold:0,wood:0,iron:0}}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'hold',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:6,display:{label:'Defeat 6 Crimson waves'}}]},
   {id:'line',objectives:[{id:'front',type:'destroy',targets:frontLine,count:2,display:{label:'Destroy 2 of 3 front towers'}}]},
   {id:'gates',objectives:[{id:'gatetowers',type:'destroy',targets:gateTowers,display:{label:'Destroy both gate towers'}}]}]},
 },
 {
  id:'campaign-20',number:20,chapter:2,
  display:{title:'The Crimson Last Stand',difficulty:'standard',
   description:'The Crimson war machine makes its last stand on the oasis. Hold your Keep, break the line, then storm a Keep that shoots back.',
   briefing:'Final assault: you start with no Gold, Wood or Iron. Defeat five Crimson waves with at least two Archer Towers, then destroy two of the three front towers and the Crimson Keep, which shoots anyone who comes near. If the Azure Keep falls below 50% health, the war is lost.',
   strategy:'Two towers hold the siege, but a third lets you leave and come home. Save your first Gold for the Siege Hammer. Damage on the Keep is never repaired, so each sortie counts even when the Guardian falls. Break the front line first: the gate towers cover the Keep.'},
  // S10C-B2: Chapter 2 finale. Oasis hold, then the front line, then an armed Crimson Keep. Level 18's wave table and committed seeded lanes verbatim, no allies. All five Crimson towers (front trio and gate pair) stand as defenders and shoot from the start.
  // The Keep is armed and vulnerable (3,000 HP, no regeneration): damage dealt to it persists across Guardian deaths. Zero starting Gold, Wood and Iron closes the early-raid shortcut (S10C design). Targets destroyed during an earlier phase are credited when their phase opens.
  // The Shop stays open. Every balance value is provisional (docs/CHAPTER2_S10C.md).
  match:{encounter:'extended',overrides:{battlefield:'oasis',waves:{firstWaveTick:300,waveInterval:800,enemyPerWave:[3,3,4,5,6,6,7,8],raidersPerWave:[0,0,2,2,3,3,4,4],alliedPerWave:0,lanes:[{wave:3,south:[1,2],commit:true},{wave:4,south:[1,2],commit:true},{wave:5,south:[2,3],commit:true},{wave:6,south:[2,3],commit:true},{wave:7,south:[3,4],commit:true},{wave:8,south:[3,5],commit:true}]},defenders:[...frontLine,...gateTowers],crimsonKeepArmed:true,start:{gold:0,wood:0,iron:0}}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'hold',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]},
   {id:'line',objectives:[{id:'front',type:'destroy',targets:frontLine,count:2,display:{label:'Destroy 2 of 3 front towers'}}]},
   {id:'keep',objectives:[{id:'crimson',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
 },
 {
  id:'campaign-21',number:21,chapter:3,
  display:{title:'The Frost Citadel',difficulty:'standard',
   description:'Winter has walled the Crimson Keep inside an ice fortress. A Frost Gate and six bastions stand between you and it.',
   briefing:'Raise two Archer Towers and defeat four Crimson waves, then storm the Crimson Keep. It sits inside an ice fortress: the Frost Gate is the only way in, four outer bastions cover it and two inner bastions guard the Keep. A garrison rallies once the gate falls. If the Azure Keep falls below 50% health, the pass is lost.',
   strategy:'Nothing can touch the Keep until the gate falls, and the bastions at the wall will kill anyone who chops it, so silence the outer bastions one at a time first. Once the gate is open a garrison rallies inside: Bash it, then take the inner bastions singly before the Keep.'},
  // C3-1: the Frost Citadel (docs/CHAPTER3_C3-1.md). Level 11's waves and hold phase, then a fortress siege: two bastions (the battlefield's own Crimson towers) cover a 1,500 HP Frost Gate, the only way into the walled courtyard
  // around the Crimson Keep. The Keep is armed (the existing Keep defense) and not protected, so destroying it ends the level; the gate is never an objective, it is simply in the way.
  // Balance v3: six bastions (forward pair outside the canyon mouth, wall pair at the gate, inner pair behind the wall), a 3,000 HP gate, and a garrison of 3-4 ordinary Crimson minions that spawns inside the courtyard every 30 s once the gate falls.
  // Crimson waves spawn outside the fortress, alternating between two slots in front of the gate (within the Guardian acquire range of the siege spots, clear of the y 600 approach) and two north and south of it.
  // The default start and the Shop are as in Level 11 and there are no Raiders. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'frost-citadel',waves:{firstWaveTick:300,waveInterval:900,enemyPerWave:[3,3,4,4,5,5,6],alliedPerWave:1,redSlots:[[1224,552],[1296,264],[1224,648],[1296,936]]},defenders:['red-forward-north','red-forward-south','red-bastion-north','red-bastion-south','red-inner-north','red-inner-south'],crimsonKeepArmed:true,gates:[{id:'red-gate',hp:frostGateHp}],garrison:{after:'red-gate',slots:[[1800,552],[1800,648]],counts:[3,4],delayTicks:90,intervalTicks:900}}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[
   {id:'hold',objectives:[
    {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Build 2 Archer Towers'}},
    {id:'waves',type:'waves-defeated',count:4,display:{label:'Defeat 4 Crimson waves'}}]},
   {id:'storm',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
 },
 {
  id:'campaign-22',number:22,chapter:3,
  display:{title:'The Barracks Line',difficulty:'standard',
   description:'Three Crimson Barracks feed the Frost Citadel. Storm the Keep through the gate, or cut the supply lines first.',
   briefing:'Destroy the Crimson Keep. Reinforcements come from two Barracks outside the walls and one inside. Barracks are optional: a destroyed one stops sending troops for good. Choose your own plan, but if the Azure Keep is destroyed, the pass is lost.',
   strategy:'Your own Azure Barracks stands ready with two soldiers, and two more pads wait for 120 Wood and 20 Iron each: soldiers follow the Guardian and are replaced free after 15 seconds. You may ignore every Barracks and storm the gate, which is faster but leaves the Azure Keep under constant pressure, or cut the supply lines: each outside Barracks is guarded by a bastion, and every one you destroy halves a wave and gives your towers room to breathe, at the cost of the Gold its minions would have dropped. The courtyard Barracks can only be reached once the gate has fallen.'},
  // C3-2: the Frost Citadel plus three destructible Crimson Barracks (docs/CHAPTER3_C3-2.md). Waves alternate between the two outside Barracks, North (1536,240) and South (1536,960); each owns the spawn slot 120 px beside it and a guard bastion.
  // A destroyed Barracks drops its own queued and future spawns and nobody takes them over. The courtyard Barracks owns the garrison slots, so it is sealed behind the gate and its death ends the garrison.
  // Barracks are never objectives: the Keep alone ends the level. Every balance value is provisional (probe layout v3b of the Opus review).
  match:{encounter:'extended',overrides:{battlefield:'frost-citadel',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1536,120],[1536,1080]]},defenders:['red-bastion-north','red-bastion-south','red-inner-north','red-inner-south','red-guard-north','red-guard-south'],crimsonKeepArmed:true,start:{gold:0,wood:0,iron:0},gates:[{id:'red-gate',hp:frostGateHp}],garrison:{after:'red-gate',slots:[[1800,552],[1704,432]],counts:[4,5],delayTicks:90,intervalTicks:750},
   azure:{pads:azurePads,initial:[azurePads[0]]},
   barracks:[{id:'red-barracks-north',hp:2500,slots:[[1536,120]]},{id:'red-barracks-south',hp:2000,slots:[[1536,1080]]},{id:'red-barracks-court',hp:1500,slots:[[1800,552],[1704,432]]}]}},
  // Open strategy: one objective, no failure threshold (the Azure Keep is lost only at 0 HP). Waves keep coming until the Keep falls.
  mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
 },
 {
  id:'full-battle',number:0,chapter:0,
  display:{title:'Full Battle',difficulty:'full-battle',
   description:'The Stage 1 Full Battle: eight Crimson towers, an armed Crimson Keep and endless waves.',
   briefing:'Destroy the Crimson Keep before the Azure Keep falls.'},
  // The Stage 1 extended encounter exactly: no overrides and no mission, so the legacy Keep-destruction outcome decides the match.
  match:{encounter:'extended'},
  mission:null,
 },
];
// Six-mission redesign: each chapter mission starts from one legacy level under its chapter-block id and number. Chapter 3 keeps campaign-21 and
// campaign-22; its Missions 3-6 are not implemented and stay pending slots. Chapter 2 is redesigned in B2B (see chapter2 below).
// B2A (Chapter 1): Missions 2-6 are outcome-objective missions by the patches below (Revision 2: Mission 3 is old Level 8, Mission 4 a two-battery assault, Mission 6 ends when the Keep falls); Mission 1 stays old Level 1 exactly.
// Save note: v2 progress is keyed by slot id, so a v2 save written under the B1 mapping (Preview only; production is still on v1) counts a cleared campaign-02..06 as
// the redesigned mission in that slot. This is known and accepted for now: no reset or migration. The v1 -> v2 thresholds (2, 3, 5, 8, 9, 10) stay conservative for the new sources.
const legacy=(n:number)=>legacyCampaignLevels.find(l=>l.number===n)!;
type Patch=Partial<Pick<LevelDefinition,'display'|'match'|'mission'>>;
const objective=(n:number,id:string)=>legacy(n).mission!.phases.flatMap(p=>p.objectives).find(o=>o.id===id)!;
const chapter1:Readonly<Record<string,Patch>>={
 // Fortify the Crossing (old Level 2): two towers is the one teaching row; the tower-damage counter is gone. Waves keep coming (until-objectives), so the mission cannot stall.
 'campaign-02':{
  display:{...legacy(2).display,
   briefing:'Raise two Archer Towers on the approach to the Azure Keep, then hold the line until six Crimson waves have broken against them. Wood arrives steadily, so build as you can afford.',
   strategy:'Place towers close together between the Ford and the Keep, and fight inside their range. The Guardian alone cannot finish this mission.'},
  mission:{...legacy(2).mission!,phases:[{id:'fortify',objectives:[
   {id:'towers',type:'structures-completed',kind:'tower',count:2,display:{label:'Complete 2 Archer Towers'}},
   objective(2,'waves')]}]}},
 // Against the Tide (old Level 8, Revision 2): the legacy match exactly (front line plus both gate towers, one ally a wave, 80 Wood and 10 Iron); the tide and tower rows are gone.
 // The front line is the one outcome objective; the gate towers shoot but are not targets.
 'campaign-03':{
  display:{title:'Against the Tide',difficulty:'standard',
   description:'Crimson waves keep coming and only one ally marches with each. Break the Crimson front line while the gate towers cover it.',
   briefing:'Destroy the three front towers. The two gate towers behind them will shoot but need not fall. Wood and Iron are scarce and only one ally marches with each wave. If the Azure Keep falls below 50% health, the Keep is lost.',
   strategy:'Raise a tower at home before you march, and strike the front line between waves. Return to the Keep whenever raiders close in: the gate towers cover the front line from behind.'},
  mission:{...legacy(8).mission!,phases:[{id:'break',objectives:[objective(8,'front')]}]}},
 // The Twin Batteries (Revision 2): both batteries on the east bank, five towers, one outcome objective. Raiding with no tower at home loses; towers, gear and order are the choice.
 'campaign-04':{
  display:{title:'The Twin Batteries',difficulty:'standard',
   description:'Two Crimson batteries cover the east bank, three towers in the north and two in the south. Raze them both.',
   briefing:'Destroy all five towers of the north and south batteries. Raiders keep coming while you are away, so leave something to hold the Keep. If the Azure Keep falls below 50% health, the attack has failed.',
   strategy:'Raise Archer Towers before you march, and shop for gear. Take one battery at a time and retreat to heal between waves; the north battery reaches toward the Crimson Keep.'},
  match:{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,4,4,5,5,6,6,7],alliedPerWave:2},defenders:[...northBattery,...southBattery],crimsonKeepArmed:false}},
  mission:{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'batteries',objectives:[
   {id:'razed',type:'destroy',targets:[...northBattery,...southBattery],display:{label:'Destroy the 5 battery towers'}}]}]}},
 // The Lone Vanguard (old Level 9): the Charge-slow checklist row is gone; the wedge is the objective.
 'campaign-05':{
  display:{...legacy(9).display,
   briefing:'No ally marches with you. Destroy the three towers of the Crimson wedge: front-center, rear-north and rear-south. If the Azure Keep falls below 50% health, the Keep is lost.',
   strategy:'The center tower is covered by both rear towers, so choose your order. Raise Archer Towers before you march, and return to the Keep when raiders reach it. Charge helps you get home fast.'},
  mission:{...legacy(9).mission!,phases:[{id:'vanguard',objectives:[objective(9,'wedge')]}]}},
 // The Crimson Keep (old Level 10, Revision 2): one victory objective, the Keep. The front-center and gate towers still defend it and are optional.
 'campaign-06':{
  display:{...legacy(10).display,
   description:'The road to the Crimson Keep is open. Bring down the Keep itself; its towers will fight you for it.',
   briefing:'Destroy the Crimson Keep, which now fights back. The front-center tower and the two gate towers guard it but need not fall. If the Azure Keep falls below 50% health, the attack has failed.',
   strategy:'Raise Archer Towers at home first. The Crimson Keep shoots anyone who comes close, so bring your strength, hit and withdraw, and keep the Azure Keep safe while you work. Guardian Zone unlocks at level 6.'},
  mission:{...legacy(10).mission!,phases:[legacy(10).mission!.phases[1]]}},
};
// Phase B2B (Chapter 2): six outcome missions. Every match is the legacy level's own, so its balance is the approved one; only objective rows go, the Dust Riders gain a protected Crimson Keep and the Twin Banks a 5,000 HP Keep.
const chapter2:Readonly<Record<string,Patch>>={
 // The Dust Riders (old Level 13): Raiders from wave 3 on Canyon Pass. The tower row is gone; the Crimson Keep is protected so allies cannot end the match by razing it.
 'campaign-11':{
  display:{...legacy(13).display,
   briefing:'Defeat six Crimson waves. From the third wave on, Desert Raiders ride ahead of the infantry, and one ally marches with each wave. The Crimson Keep cannot be damaged. If the Azure Keep falls below 50% health, the pass is lost.',
   strategy:'Raiders outrun the infantry and reach you first, but they break easily. Meet them at the mouth of the pass, where your Guardian and any towers can cut them down before the column arrives.'},
  match:{...legacy(13).match,overrides:{...legacy(13).match.overrides,crimsonKeepInvulnerable:true}},
  mission:{...legacy(13).mission!,phases:[{id:'defend',objectives:[objective(13,'waves')]}]}},
 // The Southern Flank (old Level 14): the match exactly (eight waves, split banks, no allies, protected Keep); the tower row is gone.
 'campaign-12':{
  display:{...legacy(14).display,
   briefing:'Defeat eight Crimson waves. From the third wave the column splits between the north and south banks of the pond, and the wave notice gives the count for each. The Crimson Keep cannot be damaged. If the Azure Keep falls below 50% health, the oasis is lost.',
   strategy:'Read the notice before the wave arrives: it says how many take each bank. The pond keeps the banks apart, so decide where your Guardian and any towers will meet each threat.'},
  mission:{...legacy(14).mission!,phases:[{id:'defend',objectives:[objective(14,'waves')]}]}},
 // The Sandstone Line (old Level 19): the match exactly (empty start, all five Crimson towers, protected Keep). The hold and front-line phases are gone; the gate towers are the one objective.
 'campaign-13':{
  display:{...legacy(19).display,
   description:'The pass is fortified in depth. Slip past the front line, or fight through it, and bring down the two gate towers behind it.',
   briefing:'Destroy both gate towers. You start with no Gold, Wood or Iron. Three front towers stand before the gates and all five towers fire on anyone in range. The Crimson Keep cannot be damaged. If the Azure Keep falls below 50% health, the pass is lost.',
   strategy:'The spire splits the canyon into a north road and a south road. Your home is bare until Wood and Iron arrive, so choose when to leave and which road to take, and come home when Raiders break through.'},
  mission:{...legacy(19).mission!,phases:[{id:'gates',objectives:[objective(19,'gatetowers')]}]}},
 // The Twin Banks (old Level 18): the Oasis match exactly plus a 5,000 HP Crimson Keep (the approved experimental value). The hold phase is gone; the Keep is the one objective.
 'campaign-14':{
  display:{...legacy(18).display,
   description:'The Crimson column splits around the pond while its Keep stands inert behind the front line. Break the Keep, but your home must survive the trips.',
   briefing:'Destroy the Crimson Keep, a 5,000 HP fortress that does not fight back. You start with Gold but no Wood or Iron. Waves split between the banks, no allies march with you, and damage to the Keep is never repaired. If the Azure Keep falls below 50% health, the oasis is lost.',
   strategy:'One trip will not break it, and an empty home falls. Strike between waves, retreat to heal, and bring a tower or two up first. The front towers shoot anyone who crosses the oasis.'},
  match:{...legacy(18).match,overrides:{...legacy(18).match.overrides,crimsonKeepHp:5000}},
  mission:{...legacy(18).mission!,phases:[{id:'siege',objectives:[objective(18,'crimson')]}]}},
 // The Long Dusk (old Level 17): the match and the 60% line exactly; the tower-damage row is gone. Waves alone decide it.
 'campaign-15':{
  display:{...legacy(17).display,
   briefing:'Defeat ten Crimson waves. A wave arrives every 20 seconds, with Desert Raiders from the second, and no allies march with you. The Crimson Keep cannot be damaged. If the Azure Keep falls below 60% health, the pass is lost.',
   strategy:'The Guardian cannot hold the line alone: lean on Archer Towers, keep them alive and rebuild any that fall. Wood and Iron arrive steadily, so spend them as they come.'},
  mission:{...legacy(17).mission!,phases:[{id:'dusk',objectives:[objective(17,'waves')]}]}},
 // The Crimson Last Stand (old Level 20): the match exactly (empty start, five towers, armed 3,000 HP Keep). The hold and front-line phases are gone; the Keep is the one objective.
 'campaign-16':{
  display:{...legacy(20).display,
   briefing:'Destroy the Crimson Keep, which shoots anyone who comes near. You start with no Gold, Wood or Iron, waves split between the banks and no allies march with you. The five Crimson towers are not targets. If the Azure Keep falls below 50% health, the war is lost.',
   strategy:'Damage to the Keep is never repaired, so every sortie counts even when the Guardian falls. Save your first Gold for the Siege Hammer, and take a tower down only when it stands in your way.'},
  mission:{...legacy(20).mission!,phases:[{id:'keep',objectives:[objective(20,'crimson')]}]}},
};
// Chapters 1 and 2 lose only when the Azure Keep reaches 0 HP: the HP-fraction failure line is dropped from their missions and from the briefing text.
const keepFallsOnly=(level:LevelDefinition):LevelDefinition=>{
 if(level.chapter>2||!level.mission?.failure)return level;
 const {failure:_failure,...mission}=level.mission;
 return {...level,display:{...level.display,briefing:level.display.briefing.replace(/falls below d+% health/g,'is destroyed')},mission};
};
// Chapter 1 missions 01-05 never use the Crimson Keep as an objective (waves, towers), so it is protected: razing it ended nothing and only wasted time.
// Missions 01-02 have no Crimson base to speak of, so their protected Keep is also drawn as scenery (a presentation flag only); 03-05 keep the visible Keep.
const protectedKeep=(n:number,level:LevelDefinition):LevelDefinition=>n>=1&&n<=5?{...level,match:{...level.match,overrides:{...level.match.overrides,crimsonKeepInvulnerable:true,...(n<=2&&{crimsonKeepScenery:true})}}}:level;
const as=(n:number,source:number):LevelDefinition=>protectedKeep(n,keepFallsOnly({...legacy(source),...chapter1[levelId(n)],...chapter2[levelId(n)],id:levelId(n),number:n,chapter:chapterOf(n)}));
// Chapter 3 Mission 2 is new, not a reuse of a legacy level, so it lives outside legacyCampaignLevels and sixMissionSources. The Barracks Line (legacy 22) is served as Mission 3.
export const brokenWallLevel:LevelDefinition={
  id:'campaign-22',number:22,chapter:3,
  display:{title:'The Broken Wall',difficulty:'standard',
   description:'The Crimson wall is cracked but not broken. Three Barracks and five towers guard the road to the Keep.',
   briefing:'Destroy the Crimson Keep. Reinforcements come from a Barracks in each wing of the wall and one behind the Keep, and Crimson waves keep coming until the Keep falls. The towers and Barracks are optional. You start with little Gold, Wood or Iron. If the Azure Keep is destroyed, the pass is lost.',
   strategy:'Every Barracks you destroy stops its own reinforcements for good. The wings are covered by a Siege Tower and a Guard Tower each; the two breaches in the wall are covered by the Siege Towers. Raise an Archer Tower or two at home first, then choose your road.'},
  // M2: The Broken Wall, a Keep assault on the Broken Wall battlefield. One objective, no phases: destroy the Crimson Keep (3,000 HP, inert). Waves keep coming until it falls (until-objectives repeats the last size).
  // Three Crimson Barracks own the four wave slots (north wing, south wing, one behind the Keep), so every Barracks destroyed stops its own supply. Five Crimson towers stand in front of and beside the wing Barracks: nothing but the Keep is an objective.
  // No Azure Barracks yet (they start in Mission 3). Provisional tuning, not final balance: start 100 Gold, 100 Wood, 10 Iron; no Azure allies; waves every 26 s from 15 s.
  match:{encounter:'extended',overrides:{battlefield:'broken-wall',start:{gold:100,wood:100,iron:10},waves:{firstWaveTick:450,waveInterval:780,enemyPerWave:[4,5,5,6,6,7],alliedPerWave:0,redSlots:[[1536,120],[1536,1080],[1776,480],[1776,720]]},defenders:brokenWallTowers,crimsonKeepArmed:false,
   barracks:[{id:'red-barracks-north',hp:2000,slots:[[1536,120]]},{id:'red-barracks-south',hp:2000,slots:[[1536,1080]]},{id:'red-barracks-keep',hp:1500,slots:[[1776,480],[1776,720]]}]}},
  mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 3 Mission 4 (M4A) is new as well: the Twin Walls battlefield (docs/CHAPTER3_M4A.md).
export const twinWallsLevel:LevelDefinition={
  id:'campaign-24',number:24,chapter:3,
  display:{title:'The Twin Walls',difficulty:'standard',
   description:'Two walls guard the Crimson Keep. Break the Outer Gate, or slip around the wall past a Barracks.',
   briefing:'Destroy the Crimson Keep. Two walls stand in the way: break the Outer Gate, or go around the outer wall by the north or south gap, where a Crimson Barracks waits. Every road ends at the Inner Gate. Gates and Barracks are optional. If the Azure Keep is destroyed, the pass is lost.',
   strategy:'Two bastions cover each gate. The gaps need no gate, but a Strip Tower and a Gap Tower watch each one, and its Barracks sends troops down that road. While the Outer Gate stands, every trip home goes the long way around; once it falls, the Crimson can use it too. A destroyed Barracks stops its own reinforcements for good.'},
  // M4A: a two-ring siege, layout probe v1 with its north gap mirrored south. Outer Gate 1,000 HP, Inner Gate 3,000 HP; eight Crimson towers (two bastions per gate, a Strip and a Gap Tower per gap).
  // The North and South Barracks stand inside the ring beside their gaps and own one wave slot each (inside the ring, so their waves leave through the gaps, or the Outer Gate once it falls). The Court Barracks owns the garrison,
  // which rallies once the Inner Gate falls. Mission 3's Azure Barracks (one standing, two pads). Waves and the garrison are the Barracks Line's. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'twin-walls',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1368,72],[1368,1128]]},
   defenders:['red-outer-north','red-outer-south','red-strip-north','red-strip-south','red-gap-north','red-gap-south','red-court-north','red-court-south'],crimsonKeepArmed:true,start:{gold:0,wood:0,iron:0},
   gates:[{id:'red-gate-outer',hp:1000},{id:'red-gate-inner',hp:frostGateHp}],garrison:{after:'red-gate-inner',slots:[[1800,552],[1704,432]],counts:[4,5],delayTicks:90,intervalTicks:750},
   azure:{pads:azurePads,initial:[azurePads[0]]},
   barracks:[{id:'red-barracks-north',hp:2000,slots:[[1368,72]]},{id:'red-barracks-south',hp:2000,slots:[[1368,1128]]},{id:'red-barracks-court',hp:1500,slots:[[1800,552],[1704,432]]}]}},
  mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
export const sixMissionSources:Readonly<Record<string,number>>={
 'campaign-01':1,'campaign-02':2,'campaign-03':8,'campaign-04':5,'campaign-05':9,'campaign-06':10,
 'campaign-11':13,'campaign-12':14,'campaign-13':19,'campaign-14':18,'campaign-15':17,'campaign-16':20,
 'campaign-21':21,'campaign-23':22,
};
export const fallenOutpostsLevel:LevelDefinition={
  id:'campaign-25',number:25,chapter:3,
  display:{title:'The Fallen Outposts',difficulty:'standard',
   description:'One fortress wall, one heavy gate. Break it, or push through the Deep Snow past the outposts and cut the plug Barracks.',
   briefing:'Destroy the Crimson Keep. The fortress wall has a heavy gate in front of you and a snowbound pass to the north, plugged by a Barracks. Break the gate, or cross the Deep Snow and destroy the plug Barracks. The outpost Barracks in the snow is optional. Either way the Keep Barracks rallies its garrison once the way is open. If the Azure Keep is destroyed, the pass is lost.',
   strategy:'The gate is 4,000 HP under two bastions. The snow pass is shorter work but slows every unit in it by half, yours and theirs, under two Choke Towers, with the outpost Barracks sending troops among you. A destroyed Barracks stops its own reinforcements for good; the garrison starts when the gate or the plug falls, whichever comes first.'},
  // M5: layout probe v2 with the Director's adjustments (docs/CHAPTER3_M5.md). Main Gate 4,000 HP; the plug Barracks 3,000 HP; the outpost Barracks 1,500 HP, optional and passable. Each snow-side Barracks owns one wave slot (the outpost's inside the pocket's
  // entrance, the plug's west of it); the Keep Barracks owns the garrison, which starts when the gate or the plug dies (once). Deep Snow is battlefield data: 50% slow for every unit inside it. Waves, garrison and the Azure Barracks are Mission 4's. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'fallen-outposts',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1128,240],[1320,168]]},
   defenders:['red-bastion-north','red-bastion-south','red-choke-east','red-choke-west','red-inner-north','red-inner-south'],crimsonKeepArmed:true,start:{gold:0,wood:0,iron:0},
   gates:[{id:'red-gate-main',hp:4000}],garrison:{after:['red-gate-main','red-barracks-plug'],slots:[[1776,552],[1728,360]],counts:[4,5],delayTicks:90,intervalTicks:750},
   azure:{pads:azurePads,initial:[azurePads[0]],limit:2},
   barracks:[{id:'red-barracks-outpost',hp:1500,slots:[[1128,240]]},{id:'red-barracks-plug',hp:3000,slots:[[1320,168]]},{id:'red-barracks-keep',hp:1500,slots:[[1776,552],[1728,360]]}]}},
  mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
export const frostWarlordLevel:LevelDefinition={
  id:'campaign-26',number:26,chapter:3,
  display:{title:'The Frost Warlord',difficulty:'standard',
   description:'The Frost Warlord is locked in the inner fortress. Break the Inner Gate and he marches on your Keep, with Elite Soldiers behind him.',
   briefing:'Destroy the Crimson Keep. The Frost Warlord is held inside the inner wall. The moment the Inner Gate falls he is released and marches on the Azure Keep, and when he falls he returns after thirty seconds for as long as the Crimson Keep stands. Elite Soldiers rally behind him. You may build up to three Azure Barracks. If the Azure Keep is destroyed, the pass is lost.',
   strategy:'The Warlord ignores your Guardian and every tower he passes; he walks to the Azure Keep and strikes it. Towers and Barracks at home can bring him down, but he comes back. Break the Inner Gate only when you are ready: either hold the home line, or race to the Crimson Keep and risk the Azure Keep. The Outer Gate and the Barracks are optional, as in the Twin Walls.'},
  // M6: the Twin Walls battlefield and its balance (Mission 4), plus the Frost Warlord. The Crimson Hero (combat.ts crimsonHero: 833 HP, 80 damage, armor 20, speed 95) waits in the courtyard and is released when the Inner Gate falls (the garrison trigger);
  // he marches on the Azure Keep (Movement) and returns 30 s after each death while the Crimson Keep stands. The garrison's soldiers are Elite (480 HP). Azure Barracks: Mission 3's pads, the default limit of three. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'twin-walls',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1368,72],[1368,1128]]},
   defenders:['red-outer-north','red-outer-south','red-strip-north','red-strip-south','red-gap-north','red-gap-south','red-court-north','red-court-south'],crimsonKeepArmed:true,start:{gold:0,wood:0,iron:0},
   gates:[{id:'red-gate-outer',hp:1000},{id:'red-gate-inner',hp:frostGateHp}],garrison:{after:'red-gate-inner',archetype:'crimson-elite',slots:[[1800,552],[1704,432]],counts:[4,5],delayTicks:90,intervalTicks:750},
   hero:{spawn:[1560,744],delayTicks:0,respawnTicks:900},
   azure:{pads:azurePads,initial:[azurePads[0]]},
   barracks:[{id:'red-barracks-north',hp:2000,slots:[[1368,72]]},{id:'red-barracks-south',hp:2000,slots:[[1368,1128]]},{id:'red-barracks-court',hp:1500,slots:[[1800,552],[1704,432]]}]}},
  mission:{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 4 Mission 1 (docs/CHAPTER4_M1.md): Capture, Repair, Defend, Advance. Registered so it plays through the dev launch (?debug=1&level=31); Chapter 4 itself is not in the chapter list, so nothing in the menus or Continue can reach it.
export const forestEdgeLevel:LevelDefinition={
  id:'campaign-31',number:31,chapter:4,
  display:{title:'Forest Edge',difficulty:'standard',
   description:'Two Crimson watchtowers hold the Forest Camp. Take it, raise the Azure Banner, repair what the fighting broke and hold the camp to open the road to the Crimson Keep.',
   briefing:'Capture the Forest Camp, then destroy the Crimson Keep. Destroy the camp\'s two watchtowers, then stand in the marked ring and the Azure Banner rises in four seconds. While Crimson holds the camp its Keep is shielded. Once the camp is Azure you may build there, and repair the ruined tower for a fraction of its price. A Crimson Hero guards the camp and, once it falls, hunts the Banner. If the Banner falls, the camp is Crimson again. If the Azure Keep is destroyed, the road is lost.',
   strategy:'The first capture sends four Elite Soldiers after the Banner; they come once. A Banner on the road also draws the waves, so it protects your Keep as well as marking your gain. One tower at the camp is worth the trip; more are not. Waves 3 and 6 slip round the south trail.'},
  // M1 (scratch probe values, approved by the Director): Banner 2,000 HP raised in 4 s; 4 Elites on the first capture only; the Hero (833 HP) is Warden within 260 px of the camp, Raider once it is Azure, 30 s respawn;
  // repair 60% of a tower's cost in 5 s; waves [6,6,6,6,7,7,8,8] every 25 s with the south flank on waves 3 and 6; start 100 Wood, 10 Iron. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'forest-edge',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1776,480],[1776,720]],flanks:[{wave:3,lane:'south',units:'all'},{wave:6,lane:'south',units:'all'}]},
   defenders:['red-tower-front-north','red-tower-front-south','c4-camp-north','c4-camp-south'],crimsonKeepArmed:true,start:{gold:0,wood:100,iron:10},
   post:{flag:{x:1080,y:504},ring:96,circle:{x:1104,y:600,radius:144},holders:['c4-camp-north','c4-camp-south'],ruin:{col:24,row:11},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:4,slots:[[1776,480],[1776,720]]},hero:{anchor:[1128,600],guard:260,spawn:[1752,600],respawnTicks:900}},
   azure:{pads:azurePads,initial:[],limit:1}}}, // playtest 1: one ordinary Azure Barracks (Mission 3's pads, 120 Wood and 20 Iron), none standing at the start
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Forest Camp'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
export const cliffPassLevel:LevelDefinition={
  id:'campaign-32',number:32,chapter:4,
  display:{title:'Cliff Pass',difficulty:'standard',
   description:'A camp in a cliff-walled hollow, and a Crimson gate across the only road. Take the camp, raise the Ballista from its ruin and break the gate.',
   briefing:'Capture the Cliff Camp, then destroy the Crimson Keep. Destroy the two camp watchtowers and stand in the marked ring: the Azure Banner rises in four seconds. Once the camp is Azure you may repair its ruined tower and its ruined Ballista for a fraction of their price. The Crimson gate in the narrow neck lets Crimson through but you must break it. If the Banner falls, the camp is Crimson again. If the Azure Keep is destroyed, the road is lost.',
   strategy:'The first capture sends two Elite Soldiers after the Banner; they come once. The Ballista on the cliff shelf outranges every tower and sees the whole hollow and the neck: waves leave the gate as a column, and it shoots them as they come out. In a lull it also chips the gate. Iron is short: you cannot repair everything at once.'},
  // M2 (docs/CHAPTER4_M2_DESIGN.md): M1's waves, start and Hero; no flank waves (one road); 2 Elites on the first capture (M1: 4); a 3,000 HP faction gate (Crimson passes, Azure breaks it) in the 144 px neck;
  // a repairable Ballista ruin on the cliff shelf (84 Wood, 18 Iron, 5 s; 70 damage every 3 s at 420 px, 520 HP; see buildings.ts). Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'cliff-pass',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['c4-camp-north','c4-camp-south','c4-gate-north','c4-gate-south'],crimsonKeepArmed:true,start:{gold:0,wood:100,iron:10},gates:[{id:'red-gate',hp:frostGateHp,faction:true}],
   post:{name:'Cliff Camp',flag:{x:1080,y:552},ring:96,circle:{x:1056,y:576,radius:144},holders:['c4-camp-north','c4-camp-south'],ruin:{col:23,row:13},ballista:{col:21,row:9},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480],[1776,720]]},hero:{anchor:[1176,600],guard:260,spawn:[1752,600],respawnTicks:900}},
   azure:{pads:azurePads,initial:[],limit:1}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Cliff Camp'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
export const riverIslandLevel:LevelDefinition={
  id:'campaign-33',number:33,chapter:4,
  display:{title:'River & Island',difficulty:'standard',
   description:'A river cuts the land in two and a Crimson camp holds the island in its middle. Take it, then break the Gatehouse or cross the South Bridge and silence the Barracks that feeds the waves.',
   briefing:'Capture the Island Camp, then destroy the Crimson Keep. Destroy the camp\'s two watchtowers and stand in the marked ring: the Azure Banner rises in four seconds, and the Keep\'s shield falls. Crimson reinforcements all cross the South Bridge from their Barracks while the Gatehouse stands. Break the Gatehouse for the short road to the Keep, or cross the bridge and destroy the Barracks to stop the waves. If the Banner falls, the camp is Crimson again. If the Azure Keep is destroyed, the road is lost.',
   strategy:'The first capture sends two Elite Soldiers after the Banner; they come once. The island is not safe once taken: every wave marches past it. The Gatehouse is 3,000 HP under two towers, and your soldiers will not attack it; only you can break it. The Barracks at the bridge owns both wave slots: destroy it and no more waves come, but while you are there the island stands on its own.'},
  // M3 (docs/CHAPTER4_M3_DESIGN.md): M1/M2's waves, start and Hero; no flank waves; 2 Elites on the first capture, spawned apart from the wave slots (so a Barracks destroyed first cannot cancel them); a normal (solid for both sides) 3,000 HP Gatehouse;
  // a 2,000 HP Crimson Barracks that owns both wave slots; a fourth Azure Barracks pad on the island that opens with the camp (the limit stays one). Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'river-island',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1440,936],[1440,1032]]},
   defenders:['c4-isle-north','c4-isle-south','c4-gate-north','c4-gate-south'],crimsonKeepArmed:true,start:{gold:0,wood:100,iron:10},gates:[{id:'red-gate',hp:frostGateHp,assist:true}],
   barracks:[{id:'red-barracks-south',hp:2000,slots:[[1440,936],[1440,1032]]}],
   post:{name:'Island Camp',firstNotice:'Island Camp captured! Break the Gatehouse or cross the South Bridge',flag:{x:984,y:600},ring:96,circle:{x:960,y:576,radius:120},holders:['c4-isle-north','c4-isle-south'],ruin:{col:21,row:13},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1536,936],[1536,1032]]},hero:{anchor:[1056,576],guard:220,spawn:[1488,984],respawnTicks:900}},
   azure:{pads:[...azurePads,{col:20,row:10}],initial:[],limit:1}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Island Camp'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
export const fortressApproachLevel:LevelDefinition={
  id:'campaign-34',number:34,chapter:4,
  display:{title:'Fortress Approach',difficulty:'standard',
   description:'A fortress closes the road: two gatehouses, a Crimson siege cart rolling out of the courtyard and, in a hidden pocket, a barracks that trains Elite Soldiers. Take what you can use, break what you cannot.',
   briefing:'Destroy the Crimson Keep. A Crimson War Cart attacks your buildings; destroy it and its wreck can be repaired into an Azure War Cart that follows you and breaks the gatehouses. Destroy a gatehouse\'s two towers and stand in its ring to capture it, then repair it to make it yours: Azure passes, Crimson must break it. The Elite Barracks in the south pocket can be captured and repaired the same way. If the Azure Keep is destroyed, the road is lost.',
   strategy:'The War Cart is slow and hits only structures: kill it before it reaches your Keep. The Azure cart walks only while you stand close to it. The Crimson Hero guards the inner gate and marches on your Keep as soon as the Forward Gatehouse is no longer Crimson\'s. A gatehouse you captured can still be broken: if it falls it stays a breach.'},
  // M4 (docs/CHAPTER4_M4.md): M1-M3's waves and start. A faction gate is transparent to its owner: Crimson passes both gatehouses, Azure breaks them or captures and repairs them. Every balance value is provisional until the human playtest.
  match:{encounter:'extended',overrides:{battlefield:'fortress-approach',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['c4-fwd-north','c4-fwd-south','c4-main-north','c4-main-south','c4-elite-west','c4-elite-east'],crimsonKeepArmed:true,start:{gold:0,wood:100,iron:10},
   gates:[{id:'red-forward-gate',hp:frostGateHp,faction:true,assist:true},{id:'red-main-gate',hp:frostGateHp,faction:true,assist:true}],
   captures:[
    {id:'red-forward-gate',name:'Forward Gatehouse',ring:120,holders:['c4-fwd-north','c4-fwd-south'],captureTicks:120,repair:{wood:90,iron:20,ticks:150}},
    {id:'red-main-gate',name:'Main Gatehouse',ring:120,holders:['c4-main-north','c4-main-south'],captureTicks:120,repair:{wood:90,iron:20,ticks:150}},
    {id:'red-barracks-elite',name:'Elite Barracks',ring:120,holders:['c4-elite-west','c4-elite-east'],captureTicks:120,repair:{wood:96,iron:24,ticks:150},elite:{hp:2000,slots:[[1296,984],[1296,1032]],intervalTicks:1350,count:2}}], // Human Playtest #1: the Elite Barracks trained 2 every 30 s; 2 every 45 s is a third fewer Elites (waves hold none)
   cart:{start:[1776,600],startTick:900,sites:[{col:14,row:11},{col:17,row:14},{col:19,row:11}],ring:96,repair:{wood:160,iron:40,ticks:150},order:['red-forward-gate','red-main-gate'],follow:300},
   guard:{anchor:[1272,600],radius:216,spawn:[1488,792],respawnTicks:900,raidAfter:'red-forward-gate'},
   azure:{pads:azurePads,initial:[{col:10,row:10}],limit:2}}}, // Human Playtest #1: one Barracks already stands (it counts toward the limit) and one more may be built; the repaired Elite Barracks is outside the limit
  mission:{waveMode:'until-objectives',phases:[
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 4 Mission 5 (docs/CHAPTER4_M5.md): two camps, one on each road round the mesa, both needed to break the Keep's shield; a Defender Hero holds the Rim Camp and a Raider Hero rides out against what Azure holds.
export const canyonBasinLevel:LevelDefinition={
  id:'campaign-35',number:35,chapter:4,
  display:{title:'Canyon Basin',difficulty:'standard',
   description:'A mesa splits the canyon basin into two roads, each with a Crimson camp. Take both camps to break the Keep\'s shield, while a Raider Hero rides out against everything you hold.',
   briefing:'Capture the Rim Camp and the Basin Camp, then destroy the Crimson Keep. The Crimson Keep is shielded while Crimson holds either camp. Destroy a camp\'s two watchtowers and stand in its ring: the Azure Banner rises in four seconds, and you may build there and repair its ruined tower. A Defender Hero guards the Rim Camp on the North Road. A Raider Hero rides out from the Crimson courtyard: he hunts your Banners and the towers in your camps, then the Azure Keep. You may build up to two Azure Barracks. If the Azure Keep is destroyed, the basin is lost.',
   strategy:'Each camp\'s first capture sends two Elite Soldiers after its Banner; they come once. The Rim Camp is the forward camp, close to the courtyard, but its Defender fights for it and hunts its Banner once it is yours. The Basin Camp lies deeper in the south bowl, with room to build and a Barracks pad of its own. If the Raider breaks a Banner, the Keep is shielded again until you retake that camp. Each road ends under a courtyard tower.'},
  // M5 (docs/CHAPTER4_M5.md): M1-M3's waves and start; no flank waves (the two wave slots feed one road each); two camps, each with M3's Banner, raise time, repair and two Elites on its first capture; six Crimson towers, all on cell centres.
  // The Defender is M1's Hero (Warden of the Rim Camp, Raider of it once it is Azure, 30 s respawn); the Raider (setup.hero) is released 75 s in and returns 45 s after each death. Two Azure Barracks, Mission 3's pads plus one in the Basin Camp. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'canyon-basin',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['c4-rim-north','c4-rim-south','c4-basin-north','c4-basin-south','c4-yard-north','c4-yard-south'],crimsonKeepArmed:true,start:{gold:0,wood:100,iron:10},
   posts:[
    {id:'rim',name:'Rim Camp',flag:{x:1176,y:312},ring:96,circle:{x:1200,y:312,radius:120},holders:['c4-rim-north','c4-rim-south'],ruin:{col:26,row:5},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480]]},hero:{anchor:[1224,360],guard:220,spawn:[1512,312],respawnTicks:900}},
    {id:'basin',name:'Basin Camp',flag:{x:1080,y:888},ring:96,circle:{x:1056,y:888,radius:144},holders:['c4-basin-north','c4-basin-south'],ruin:{col:24,row:17},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,720]]}}],
   hero:{spawn:[1512,888],delayTicks:75*30,respawnTicks:45*30},
   azure:{pads:[...azurePads,{col:21,row:20}],initial:[],limit:2}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'rim',type:'capture',post:'rim',display:{label:'Capture the Rim Camp'}},{id:'basin',type:'capture',post:'basin',display:{label:'Capture the Basin Camp'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 4 Mission 6 (docs/CHAPTER4_M6.md): the Crimson Fortress. Two Commanders strike down the two roads round the Crimson Ridge: the Iron Marshal marches with an escort on the Siege Road against towers, then Barracks;
// the Shadowblade takes the road away from him and strikes the Azure Barracks farthest from the Guardian. Two outposts are advantages, not keys: the South Outpost holds a ruined Barracks that repairs as the third.
// No camp shield; the Fortress Gate's fall releases a one-time Last Stand of Elite Soldiers. Every balance value is provisional until the human playtest.
const fortressCommanderSpawns={north:[1320,264] as [number,number],south:[1320,936] as [number,number]};
export const crimsonFortressLevel:LevelDefinition={
  id:'campaign-36',number:36,chapter:4,
  display:{title:'Crimson Fortress',difficulty:'standard',
   description:'The last Crimson stronghold of the Conquered Lands. Two Commanders ride out down the two roads round the Crimson Ridge: hold your lines, take the outposts and break the Fortress.',
   briefing:'Destroy the Crimson Keep. The Iron Marshal marches down the Siege Road with his escort and tears down your towers, then your Barracks. The Shadowblade takes the other road and strikes the Azure Barracks farthest from your Guardian; with no Barracks left it goes for your Keep. Each attack is announced before it starts, and a fallen Commander rests before the next. Capture the outposts to build there; the South Outpost holds a ruined Barracks that repairs cheaply as your third. When the Fortress Gate falls, the garrison makes a last stand.',
   strategy:'Meet the Shadowblade before it reaches its target: a Barracks falls in seconds. Defeat a Commander, then strike while it rests. Towers at home slow the Marshal; the third Barracks gives you the soldiers for the final assault.'},
  // M6 (docs/CHAPTER4_M6.md): M1-M5's waves and start; two camps without a shield; one faction Fortress Gate (Crimson walk through it) and a one-time Last Stand garrison when it falls; three Azure Barracks (one standing, one pad, the ruin).
  // Commanders: the Crimson Hero's stats times the multipliers below; the Marshal on the Siege Road with three escorts at his speed, the Shadowblade on the road it chooses at each warning. Every balance value is provisional.
  match:{encounter:'extended',overrides:{battlefield:'crimson-fortress',waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['c6-north-a','c6-north-b','c6-south-a','c6-south-b','c6-gate-north','c6-gate-south'],crimsonKeepArmed:true,start:{gold:0,wood:100,iron:10,guardian:{x:600,y:600}},
   gates:[{id:'red-fortress-gate',hp:2500,faction:true,assist:true}],
   garrison:{archetype:'crimson-elite',after:'red-fortress-gate',slots:[[1560,456],[1560,744]],counts:[4],delayTicks:30,intervalTicks:3600*30},
   posts:[
    {id:'north',name:'North Outpost',flag:{x:1080,y:264},ring:96,circle:{x:1080,y:288,radius:132},holders:['c6-north-a','c6-north-b'],ruin:{col:21,row:6},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480]]}},
    {id:'south',name:'South Outpost',flag:{x:1032,y:888},ring:96,circle:{x:1008,y:888,radius:132},holders:['c6-south-a','c6-south-b'],ruin:{col:20,row:17},barracksRuin:{col:19,row:19,percent:40},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,720]]}}],
   campShield:false,
   commanders:[
    {id:'red-marshal',role:'marshal',name:'Iron Marshal',lane:'north',spawns:fortressCommanderSpawns,firstTick:90*30,warningTicks:6*30,restTicks:60*30,flankTimeoutTicks:40*30,hp:1.6,damage:1.3,attackSpeed:.8,speed:.75,structureBonus:1.5,escort:{count:3,matchSpeed:true,delayTicks:0}},
    {id:'red-shadowblade',role:'shadowblade',name:'Shadowblade',spawns:fortressCommanderSpawns,firstTick:135*30,warningTicks:6*30,restTicks:40*30,flankTimeoutTicks:40*30,hp:.8,damage:.85,attackSpeed:1.4,speed:1.4,structureBonus:1,keepBonus:.5}], // pre-playtest: half damage against the Azure Keep only (PO, 2026-11-03)
   azure:{pads:[{col:10,row:10},{col:10,row:14},{col:19,row:19}],initial:[{col:10,row:10}],limit:3}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 5 Mission 1 (docs/CHAPTER5_M1_DESIGN.md): The Old Tavern. Forest Edge's loop (capture, repair, advance) on a new map with the Tavern: one Allied Hero, hired for Gold from Roland, Borin or Kael. No Crimson Hero; gentler waves than Chapter 4 (5-7 against 6-8, every 30 s from 25 s),
// two Elites on the first capture (as Chapter 4 M2), no flank. The Outpost's two watchtowers stand 288 px apart so the Guardian and the Hero can take one each; either may stand in the ring. No Barracks pad: the mission is the Guardian and one hero. Every balance value is provisional until the human playtest.
export const oldTavernLevel:LevelDefinition={
  id:'campaign-41',number:41,chapter:5,
  display:{title:'The Old Tavern',difficulty:'standard',
   description:'An abandoned inn stands on the edge of the road, and a Crimson outpost holds the basin beyond it. Hire a hero, take the outpost and open the road to the Crimson Keep.',
   briefing:'Capture the Old Outpost, then destroy the Crimson Keep. The Old Tavern can be rebuilt at home: once it stands, tap it to hire a hero for Gold. Destroy the outpost\'s two watchtowers, then stand in the marked ring and the Azure Banner rises in four seconds. While Crimson holds the outpost its Keep is shielded. Once the outpost is Azure you may repair its ruined tower. If the Banner falls, the outpost is Crimson again.',
   strategy:'Your hero fights beside you under Follow, Attack and Defend, and can stand in the ring on its own. The two watchtowers are far enough apart to split: you take one, your hero the other. The first capture sends two Elite Soldiers after the Banner; they come once. A hero is a help, not a gate: Gold also buys items.'},
  match:{encounter:'extended',overrides:{battlefield:'old-tavern',waves:{firstWaveTick:750,waveInterval:900,enemyPerWave:[5,5,5,6,6,6,7,7],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['red-tower-front-north','red-tower-front-south','c5-outpost-north','c5-outpost-south'],crimsonKeepArmed:true,start:{gold:50,wood:140,iron:15},
   post:{name:'Old Outpost',flag:{x:1224,y:600},ring:96,circle:{x:1248,y:600,radius:168},holders:['c5-outpost-north','c5-outpost-south'],ruin:{col:27,row:10},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480],[1776,720]]}},
   tavern:{cap:1,roster:['roland','borin','kael']}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Old Outpost'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 5 Mission 2 (docs/CHAPTER5_M2_DESIGN.md): Brothers in Arms. Two Allied Heroes against two Crimson Heroes, all from existing systems: the camp's Warden (Chapter 4 M1), a Raider released at 100 s that marches on the Azure Keep (Chapter 4 M5),
// three Elites on the first capture, the south flank on waves 4 and 7 (Forest Edge). The Warden stands off the road's centre line (1128,540): at (1128,600) he blocked the Raider's path for good (measured). No Barracks. Gold 100 pays the Tavern and, with two waves of kills, both hires. Every balance value is provisional until the bot sweep and the human playtest.
export const brothersInArmsLevel:LevelDefinition={
  id:'campaign-42',number:42,chapter:5,
  display:{title:'Brothers in Arms',difficulty:'standard',
   description:'Crimson heroes hold the crossroads and a raider rides on your Keep. Two hired heroes, one Guardian: decide who defends, who fights beside you and who repairs.',
   briefing:'Capture the Crossroads Camp, then destroy the Crimson Keep. Build a Tavern and hire up to two heroes. Destroy the camp\'s two watchtowers, then stand in the marked ring and the Azure Banner rises in four seconds. While Crimson holds the camp its Keep is shielded. A Crimson Warden guards the camp. After about a minute and a half a Crimson Raider rides out against your Keep and, once the camp is Azure, against its Banner. If the Azure Keep is destroyed, the road is lost.',
   strategy:'Give each hero a job with Follow, Attack and Defend: a hero ordered to Defend near your Keep stops the Raider, who ignores everything but his target. Two heroes in the assault win faster but leave the Keep open. The first capture sends three Elite Soldiers after the Banner; they come once. Waves 4 and 7 slip round the south trail.'},
  match:{encounter:'extended',overrides:{battlefield:'brothers-in-arms',waves:{firstWaveTick:750,waveInterval:900,enemyPerWave:[5,5,6,6,6,7,7,8],alliedPerWave:1,redSlots:[[1776,480],[1776,720]],flanks:[{wave:4,lane:'south',units:'all'},{wave:7,lane:'south',units:'all'}]},
   defenders:['red-tower-front-north','red-tower-front-south','c5-cross-north','c5-cross-south'],crimsonKeepArmed:true,start:{gold:100,wood:140,iron:15},
   post:{name:'Crossroads Camp',flag:{x:1080,y:504},ring:96,circle:{x:1104,y:600,radius:144},holders:['c5-cross-north','c5-cross-south'],ruin:{col:24,row:11},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:3,slots:[[1776,480],[1776,720]]},hero:{anchor:[1128,540],guard:220,spawn:[1752,600],respawnTicks:1350}},
   hero:{spawn:[1752,600],delayTicks:3000,respawnTicks:1800},
   tavern:{cap:2,roster:['roland','borin','kael']}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Crossroads Camp'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 5 Mission 3 (docs/CHAPTER5_M3_DESIGN.md): The Divided Road. Chapter 4 M5's two roads and two camps, played with two hired heroes and up to two Azure Barracks against larger waves. All existing systems:
// two camps behind one Keep shield (Warden at the Basin Camp, a Raider released from the north courtyard), the Tavern at Hero Cap 2, Barracks pads at home and in each camp (Barracks soldiers escort the Guardian; no garrison AI), waves of 8-10 every 30 s.
// Gold 100 / Wood 220 / Iron 30 pays the Tavern and the first Barracks at once; iron is the scarce resource afterwards. No Barracks stands at the start. Every balance value is provisional until the human playtest.
export const dividedRoadLevel:LevelDefinition={
  id:'campaign-43',number:43,chapter:5,
  display:{title:'The Divided Road',difficulty:'standard',
   description:'A mesa splits the road in two, and each road has a Crimson camp. Raise an army, hire two heroes and decide who defends, who advances and who holds which road.',
   briefing:'Capture the Rim Camp and the Basin Camp, then destroy the Crimson Keep. The Crimson Keep is shielded while Crimson holds either camp. Build a Tavern and hire up to two heroes, and build up to two Azure Barracks: their soldiers follow your Guardian. Destroy a camp\'s two watchtowers and stand in its ring: the Azure Banner rises in four seconds, and a Barracks pad opens in the camp. A Crimson Warden guards the Basin Camp. After about a minute and a half a Crimson Raider rides out from the north against your Banners and, in the end, your Keep. Both roads are attacked at once. If the Azure Keep is destroyed, the road is lost.',
   strategy:'You have one Guardian and two heroes for two roads. Soldiers from a Barracks fight beside the Guardian, so build the Barracks where you want your army to appear: at home, or in a camp you hold. Towers and a hero ordered to Defend hold a road while you are away; a hero in a camp ring can capture it alone. The first capture of each camp sends two Elite Soldiers after its Banner. Iron is short: towers, Barracks and repairs compete.'},
  match:{encounter:'extended',overrides:{battlefield:'divided-road',waves:{firstWaveTick:900,waveInterval:900,enemyPerWave:[8,8,9,9,9,10,10,10],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['c5-rim-north','c5-rim-south','c5-basin-north','c5-basin-south','c5-yard-north','c5-yard-south'],crimsonKeepArmed:true,start:{gold:100,wood:220,iron:30},
   posts:[
    {id:'rim',name:'Rim Camp',flag:{x:1176,y:312},ring:96,circle:{x:1200,y:312,radius:120},holders:['c5-rim-north','c5-rim-south'],ruin:{col:26,row:5},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480]]}},
    {id:'basin',name:'Basin Camp',flag:{x:1080,y:888},ring:96,circle:{x:1056,y:888,radius:144},holders:['c5-basin-north','c5-basin-south'],ruin:{col:24,row:17},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,720]]},hero:{anchor:[1104,984],guard:220,spawn:[1512,888],respawnTicks:1350}}],
   hero:{spawn:[1512,312],delayTicks:90*30,respawnTicks:50*30},
   azure:{pads:[...azurePads,{col:23,row:6},{col:20,row:17}],initial:[],limit:2},
   tavern:{cap:2,roster:['roland','borin','kael']}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'rim',type:'capture',post:'rim',display:{label:'Capture the Rim Camp'}},{id:'basin',type:'capture',post:'basin',display:{label:'Capture the Basin Camp'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 5 Mission 4 (docs/CHAPTER5_M4_DESIGN.md): The Broken Alliance. Crimson Fortress's roads and two outposts with M3's Tavern (Hero Cap 2) and Barracks (cap 2), the South Outpost Warden and Chapter 4 M6's two Commanders (the Iron Marshal at 180 s, the Shadowblade at 240 s, each announced 6 s ahead) and Last Stand garrison.
// No Raider (PO). The Keep is shielded until both outposts are Azure. Waves [7,7,8,8,9,9,10,10] every 30 s from 30 s. Every balance value is provisional until the human playtest.
export const brokenAllianceLevel:LevelDefinition={
  id:'campaign-44',number:44,chapter:5,
  display:{title:'The Broken Alliance',difficulty:'standard',
   description:'The old alliance is broken and the Fortress road is closed. Two outposts hold the roads, two Crimson Commanders ride out against everything you build, and you have a Guardian, two heroes and two Barracks to answer them.',
   briefing:'Capture the North Outpost and the South Outpost, then destroy the Crimson Keep. The Keep is shielded while Crimson holds either outpost. Destroy an outpost\'s two watchtowers and stand in its ring: the Azure Banner rises in four seconds, and a Barracks pad opens there. Build a Tavern and hire up to two heroes, and build up to two Barracks. A Crimson Warden guards the South Outpost. At about three minutes the Iron Marshal marches down the Siege Road, at four minutes the Shadowblade strikes; each is announced six seconds ahead. Break the Fortress Gate to reach the Keep: when it falls its garrison makes a last stand. If the Azure Keep is destroyed, the road is lost.',
   strategy:'The Marshal tears down towers and Barracks, slowly; the Shadowblade strikes the Barracks farthest from your Guardian, so a forward Barracks is bait. Your heroes under Follow, Attack and Defend can hold one road while you take the other. Taking the north outpost first means a lighter fight, the south first the Warden. The first capture of each outpost sends two Elite Soldiers after its Banner.'},
  match:{encounter:'extended',overrides:{battlefield:'broken-alliance',waves:{firstWaveTick:900,waveInterval:900,enemyPerWave:[7,7,8,8,9,9,10,10],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['c5-north-a','c5-north-b','c5-south-a','c5-south-b','c5-gate-north','c5-gate-south'],crimsonKeepArmed:true,start:{gold:100,wood:220,iron:30,guardian:{x:600,y:600}},
   gates:[{id:'red-fortress-gate',hp:2500,faction:true,assist:true}],
   garrison:{archetype:'crimson-elite',after:'red-fortress-gate',slots:[[1560,456],[1560,744]],counts:[4],delayTicks:30,intervalTicks:3600*30},
   posts:[
    {id:'north',name:'North Outpost',flag:{x:1080,y:264},ring:96,circle:{x:1080,y:288,radius:132},holders:['c5-north-a','c5-north-b'],ruin:{col:21,row:6},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480]]}},
    {id:'south',name:'South Outpost',flag:{x:1032,y:888},ring:96,circle:{x:1008,y:888,radius:132},holders:['c5-south-a','c5-south-b'],ruin:{col:20,row:17},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,720]]},hero:{anchor:[1056,936],guard:220,spawn:[1296,888],respawnTicks:1350}}],
   commanders:[
    {id:'red-marshal',role:'marshal',name:'Iron Marshal',lane:'north',spawns:fortressCommanderSpawns,firstTick:180*30,warningTicks:6*30,restTicks:60*30,flankTimeoutTicks:40*30,hp:1.6,damage:1.3,attackSpeed:.8,speed:.75,structureBonus:1.5,escort:{count:3,matchSpeed:true,delayTicks:0}},
    {id:'red-shadowblade',role:'shadowblade',name:'Shadowblade',spawns:fortressCommanderSpawns,firstTick:240*30,warningTicks:6*30,restTicks:40*30,flankTimeoutTicks:40*30,hp:.8,damage:.85,attackSpeed:1.4,speed:1.4,structureBonus:1,keepBonus:.5}],
   azure:{pads:[...azurePads,{col:20,row:7},{col:18,row:18}],initial:[],limit:2},
   tavern:{cap:2,roster:['roland','borin','kael']}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'north',type:'capture',post:'north',display:{label:'Capture the North Outpost'}},{id:'south',type:'capture',post:'south',display:{label:'Capture the South Outpost'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 5 Mission 5 (docs/CHAPTER5_M5_DESIGN.md): The Last Stronghold. Crimson Fortress's terrain as a three-front siege: the North Outpost's Ballista ruin, the South Outpost's War Cart wreck (there from the start, locked until the South Outpost is Azure; single use),
// the Fortress Gate with two extra forward towers, M4's Warden, Tavern (Hero Cap 2), Barracks (cap 2), waves and Last Stand; the Iron Marshal at 210 s and the Shadowblade at 300 s, each announced 6 s ahead. The Keep is shielded until both outposts are Azure. Every balance value is provisional until the human playtest.
export const lastStrongholdLevel:LevelDefinition={
  id:'campaign-45',number:45,chapter:5,
  display:{title:'The Last Stronghold',difficulty:'standard',
   description:'The last Crimson stronghold of the Conquered Lands. A ruined Ballista lies in the north, a wrecked War Cart in the south, and a fortified gate between them. Take the outposts, choose your siege, and break the Keep.',
   briefing:'Capture the North Outpost and the South Outpost, then destroy the Crimson Keep. The Keep is shielded while Crimson holds either outpost. Capturing the North Outpost lets you repair its Ballista; capturing the South Outpost lets you repair the wrecked War Cart, once. Break the Fortress Gate to reach the Keep: when it falls its garrison makes a last stand. The Iron Marshal marches at about three and a half minutes and the Shadowblade strikes at five, each announced six seconds ahead. Build a Tavern, hire up to two heroes, and build up to two Barracks.',
   strategy:'You cannot afford everything at once: iron decides what you repair first. The Ballista outranges the towers from the north and shields that outpost, but the Marshal comes for it. The War Cart breaks the gate in under a minute but moves only while the Guardian is close, and the towers and the wave hit it on the way. A direct rush on the gate meets four towers, the wave and the Last Stand.'},
  match:{encounter:'extended',overrides:{battlefield:'last-stronghold',waves:{firstWaveTick:900,waveInterval:900,enemyPerWave:[7,7,8,8,9,9,10,10],alliedPerWave:1,redSlots:[[1776,480],[1776,720]]},
   defenders:['c5-north-a','c5-north-b','c5-south-a','c5-south-b','c5-gate-north','c5-gate-south','c5-sally-north','c5-sally-south'],crimsonKeepArmed:true,start:{gold:100,wood:180,iron:25,guardian:{x:600,y:600}},
   gates:[{id:'red-fortress-gate',hp:2500,faction:true,assist:true}],
   garrison:{archetype:'crimson-elite',after:'red-fortress-gate',slots:[[1560,456],[1560,744]],counts:[4],delayTicks:30,intervalTicks:3600*30},
   posts:[
    {id:'north',name:'North Outpost',flag:{x:1080,y:264},ring:96,circle:{x:1080,y:288,radius:132},holders:['c5-north-a','c5-north-b'],ruin:{col:21,row:6},ballista:{col:24,row:5},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480]]}},
    {id:'south',name:'South Outpost',flag:{x:1032,y:888},ring:96,circle:{x:1008,y:888,radius:132},holders:['c5-south-a','c5-south-b'],ruin:{col:20,row:17},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,720]]},hero:{anchor:[1056,936],guard:220,spawn:[1296,888],respawnTicks:1350}}],
   cart:{start:[1776,600],startTick:1,sites:[{col:20,row:19}],ring:96,repair:{wood:160,iron:40,ticks:150},order:['red-fortress-gate'],follow:300,wreckAtStart:true,post:'south'},
   commanders:[
    {id:'red-marshal',role:'marshal',name:'Iron Marshal',lane:'north',spawns:fortressCommanderSpawns,firstTick:210*30,warningTicks:6*30,restTicks:60*30,flankTimeoutTicks:40*30,hp:1.6,damage:1.3,attackSpeed:.8,speed:.75,structureBonus:1.5,escort:{count:3,matchSpeed:true,delayTicks:0}},
    {id:'red-shadowblade',role:'shadowblade',name:'Shadowblade',spawns:fortressCommanderSpawns,firstTick:300*30,warningTicks:6*30,restTicks:40*30,flankTimeoutTicks:40*30,hp:.8,damage:.85,attackSpeed:1.4,speed:1.4,structureBonus:1,keepBonus:.5}],
   azure:{pads:[...azurePads,{col:20,row:7},{col:18,row:18}],initial:[],limit:2},
   tavern:{cap:2,roster:['roland','borin','kael']}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'north',type:'capture',post:'north',display:{label:'Capture the North Outpost'}},{id:'south',type:'capture',post:'south',display:{label:'Capture the South Outpost'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
// Chapter 5 Mission 6 (docs/CHAPTER5_M6_DESIGN.md): The Crimson Throne. The Last Stronghold's three-front siege with the finale's threat: the Throne Gate (3,000 HP) releases the Crimson Lord (Hero stats x1.2 hit points, x1.1 damage, back 45 s after each death while the Keep stands),
// who marches on the Azure Keep and fights nothing else. No South Warden. Staged counterattacks by road: wave 3 south, wave 5 north, wave 7 split. Iron Marshal 240 s (rest 90 s), Shadowblade 330 s; Last Stand of 3 Elites; Hero Cap 2, Barracks cap 2.
// Every balance value is provisional until the human playtest.
export const crimsonThroneLevel:LevelDefinition={
  id:'campaign-46',number:46,chapter:5,
  display:{title:'The Crimson Throne',difficulty:'standard',
   description:'The Crimson Throne stands behind its last gate. Counterattacks come down both roads, and when the gate falls the Crimson Lord marches on your Keep. Take the outposts, break the gate, and end it.',
   briefing:'Capture the North Outpost and the South Outpost, then destroy the Crimson Keep. The Keep is shielded while Crimson holds either outpost. Capturing the North Outpost lets you repair its Ballista; capturing the South Outpost lets you repair the wrecked War Cart, once. Crimson counterattacks come by the south road, then the north road, then both. Break the Throne Gate to reach the Keep: when it falls, three Elites make a last stand and the Crimson Lord marches on your Keep, returning forty-five seconds after each defeat for as long as the Crimson Keep stands. The Iron Marshal marches at four minutes and the Shadowblade strikes at five and a half, each announced six seconds ahead. Build a Tavern, hire up to two heroes, and build up to two Barracks.',
   strategy:'Break the gate early and the Lord arrives before the Marshal; break it late and the Commanders are already on the roads. Break it only when your Keep is ready for him. Heroes ordered to Defend hold the Keep against the Lord, who ignores everything but your Keep. Iron decides what you repair first.'},
  match:{encounter:'extended',overrides:{battlefield:'crimson-throne',waves:{firstWaveTick:900,waveInterval:900,enemyPerWave:[7,7,8,8,9,9,10,10],alliedPerWave:1,redSlots:[[1776,480],[1776,720]],flanks:[{wave:3,lane:'south',units:'all'},{wave:5,lane:'north',units:'all'}],lanes:[{wave:7,south:[4,6]}]},
   defenders:['c5-north-a','c5-north-b','c5-south-a','c5-south-b','c5-gate-north','c5-gate-south','c5-sally-north','c5-sally-south'],crimsonKeepArmed:true,start:{gold:100,wood:200,iron:30,guardian:{x:600,y:600}},
   gates:[{id:'red-fortress-gate',hp:3000,faction:true,assist:true}],
   garrison:{archetype:'crimson-elite',after:'red-fortress-gate',slots:[[1560,456],[1560,744]],counts:[3],delayTicks:30,intervalTicks:3600*30},
   hero:{spawn:[1488,600],delayTicks:30,respawnTicks:45*30,lord:{hp:1.2,damage:1.1}},
   posts:[
    {id:'north',name:'North Outpost',flag:{x:1080,y:264},ring:96,circle:{x:1080,y:288,radius:132},holders:['c5-north-a','c5-north-b'],ruin:{col:21,row:6},ballista:{col:24,row:5},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,480]]}},
    {id:'south',name:'South Outpost',flag:{x:1032,y:888},ring:96,circle:{x:1008,y:888,radius:132},holders:['c5-south-a','c5-south-b'],ruin:{col:20,row:17},bannerHp:2000,raiseTicks:120,repair:{percent:60,ticks:150},counter:{count:2,slots:[[1776,720]]}}],
   cart:{start:[1776,600],startTick:1,sites:[{col:20,row:19}],ring:96,repair:{wood:160,iron:40,ticks:150},order:['red-fortress-gate'],follow:300,wreckAtStart:true,post:'south'},
   commanders:[
    {id:'red-marshal',role:'marshal',name:'Iron Marshal',lane:'north',spawns:fortressCommanderSpawns,firstTick:240*30,warningTicks:6*30,restTicks:90*30,flankTimeoutTicks:40*30,hp:1.6,damage:1.3,attackSpeed:.8,speed:.75,structureBonus:1.5,escort:{count:3,matchSpeed:true,delayTicks:0}},
    {id:'red-shadowblade',role:'shadowblade',name:'Shadowblade',spawns:fortressCommanderSpawns,firstTick:330*30,warningTicks:6*30,restTicks:40*30,flankTimeoutTicks:40*30,hp:.8,damage:.85,attackSpeed:1.4,speed:1.4,structureBonus:1,keepBonus:.5}],
   azure:{pads:[...azurePads,{col:22,row:8},{col:22,row:16}],initial:[],limit:2},
   tavern:{cap:2,roster:['roland','borin','kael']}}},
  mission:{waveMode:'until-objectives',phases:[
   {id:'capture',objectives:[{id:'north',type:'capture',post:'north',display:{label:'Capture the North Outpost'}},{id:'south',type:'capture',post:'south',display:{label:'Capture the South Outpost'}}]},
   {id:'assault',objectives:[{id:'keep',type:'destroy',targets:['red-base'],display:{label:'Destroy the Crimson Keep'}}]}]},
};
export const campaignLevels:readonly LevelDefinition[]=[
 ...Object.entries(sixMissionSources).map(([id,source])=>as(Number(id.slice(9)),source)),
 brokenWallLevel,
 twinWallsLevel,
 fallenOutpostsLevel,
 frostWarlordLevel,
 forestEdgeLevel,
 cliffPassLevel,
 riverIslandLevel,
 fortressApproachLevel,
 canyonBasinLevel,
 crimsonFortressLevel,
 oldTavernLevel,
 brothersInArmsLevel,
 dividedRoadLevel,
 brokenAllianceLevel,
 lastStrongholdLevel,
 crimsonThroneLevel,
 legacyCampaignLevels.find(l=>l.id==='full-battle')!,
];
export const campaign=new CampaignRegistry(campaignLevels);

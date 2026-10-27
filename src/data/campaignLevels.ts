import {CampaignRegistry,type LevelDefinition} from './campaign';
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
  id:'full-battle',number:0,chapter:0,
  display:{title:'Full Battle',difficulty:'full-battle',
   description:'The Stage 1 Full Battle: eight Crimson towers, an armed Crimson Keep and endless waves.',
   briefing:'Destroy the Crimson Keep before the Azure Keep falls.'},
  // The Stage 1 extended encounter exactly: no overrides and no mission, so the legacy Keep-destruction outcome decides the match.
  match:{encounter:'extended'},
  mission:null,
 },
];
export const campaign=new CampaignRegistry(campaignLevels);

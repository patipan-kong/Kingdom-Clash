const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {siege}=require('./support/barracksBot.cjs');
const {strike,until}=require('./support/campaignBot.cjs');
// Chapter 3 C3-2: Level 23 "The Barracks Line", the Frost Citadel with three destructible Crimson Barracks (docs/CHAPTER3_C3-2.md). Open strategy: the single objective is the Crimson Keep and no Barracks is ever an objective, so the level is won by destroying the Keep either way:
// Direct Assault ignores every Barracks, Cut Supply Lines destroys the outside ones first. Every balance value is provisional and every bot result is preliminary evidence from a recall-and-rebuild bot, not a human playtest;
// nothing here was tuned to make a bot win faster, and the bot results are loose bounds so that a harmless change does not fail them.
const L=campaign.get('campaign-23'),BN='red-barracks-north',BS='red-barracks-south',BC='red-barracks-court',GN='red-guard-north',GS='red-guard-south',N='red-bastion-north',S='red-bastion-south',G='red-gate',IN='red-inner-north',IS='red-inner-south',K='red-base';
const DIRECT=[N,S,G,IN,IS,K];
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};

test('Level 23 is The Barracks Line: one objective, destroy the Crimson Keep; no tower, wave or Barracks requirement and no failure threshold',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[23,3,'campaign-23','The Barracks Line','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.ok(L.display.briefing.length<=320,`the briefing body must fit three lines of the mission briefing (${L.display.briefing.length} characters)`);
 assert.match(L.display.briefing,/^Destroy the Crimson Keep/);assert.match(L.display.briefing,/Barracks are optional/);assert.doesNotMatch(L.display.briefing+L.display.strategy,/Archer Tower|four Crimson waves|50%|first two minutes/);
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:[K],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(L.mission.failure,undefined,'defeat is the Azure Keep reaching 0 HP');
 const o=L.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.start,o.gates,o.shop],['frost-citadel',true,{gold:0,wood:0,iron:0},[{id:G,hp:3000}],undefined]);
 assert.deepEqual(o.waves,{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1536,120],[1536,1080]]});
 assert.deepEqual(o.defenders,[N,S,IN,IS,GN,GS]);assert.deepEqual(o.garrison,{after:G,slots:[[1800,552],[1704,432]],counts:[4,5],delayTicks:90,intervalTicks:750});
 assert.deepEqual(o.barracks,[{id:BN,hp:2500,slots:[[1536,120]]},{id:BS,hp:2000,slots:[[1536,1080]]},{id:BC,hp:1500,slots:[[1800,552],[1704,432]]}]);
 assert.equal(L.mission.phases.flatMap(p=>p.objectives).some(x=>x.type==='destroy'&&x.targets.some(t=>/barracks/.test(t))),false);
});
test('Level 23 has no Hold phase: the Keep alone wins, even with 0 towers and 0 waves defeated; Barracks never complete it',()=>{
 const sim=new Simulation('l23-open',campaign.setup(23)),st=sim.missionStatus();assert.deepEqual([st.activePhase,st.objectives.map(o=>o.id)],['assault',['keep']]);
 until(sim,300+750+10);assert.ok(sim.state.spawnedWaves>=2,'waves spawn with no Hold phase');assert.ok(Object.keys(sim.state.units).some(id=>id.startsWith('red-w')));
 for(const id of [BN,BS])strike(sim,'guardian',id);strike(sim,'guardian',BC);
 assert.equal(sim.ended,false,'destroying every Barracks does not complete the mission');assert.deepEqual(sim.missionStatus().completedPhases,[]);
 assert.equal(Object.values(sim.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length,0);
 strike(sim,'guardian',K);until(sim,sim.clock.tick+2);
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
});
test('Level 23 defeat is the Azure Keep reaching 0 HP: 1 HP is alive, even below 50%',()=>{
 const alive=new Simulation('l23-1hp',campaign.setup(23)),b=alive.state.bases['blue-base'];b.hp=1;until(alive,alive.clock.tick+30);assert.equal(alive.ended,false,'1 HP is alive');
 const half=new Simulation('l23-half',campaign.setup(23));half.state.bases['blue-base'].hp=half.state.bases['blue-base'].maxHp*.4;until(half,half.clock.tick+30);assert.equal(half.ended,false,'40% is no longer a defeat');
 const dead=new Simulation('l23-0hp',campaign.setup(23));dead.state.bases['blue-base'].hp=0;until(dead,dead.clock.tick+2);
 assert.equal(dead.outcome&&dead.outcome.outcome,'defeat');
});
test('Level 23 is Chapter 3 Mission 3 while the chapter stays "coming soon"; Continue never reaches it',()=>{
 assert.equal(campaignChapters[2].slots[2].levelId,'campaign-23');assert.equal(campaignChapters[2].release,'coming-soon');
 const v=chapterViews(campaignChapters,campaign.list(),store(23).progress)[2];assert.equal(v.state,'coming-soon');assert.equal(v.released,0);
 assert.equal(campaign.list().filter(l=>l.chapter===3).length,3);assert.equal(campaign.list().at(-1).id,'full-battle');
 // A save holding every id up to campaign-23 (Chapter 3 included) is still only up to date: unreleased missions are never unlocked or recorded.
 assert.equal(store(16).progress.next,null);assert.equal(store(23).progress.next,null);assert.equal(store(23).isUnlocked(L),false);assert.equal(store(23).isCompleted(L),false);
 assert.equal(store(23).recordVictory(L).recorded,false);
});
test('Level 23 builds: three Barracks, six Crimson towers and a Frost Gate stand, and the Crimson queue is empty until the first wave',()=>{
 const sim=new Simulation('l23',campaign.setup(23));assert.equal(sim.spawnQueue.length,0);
 assert.equal(Object.keys(sim.state.structures).filter(id=>id.startsWith('red-barracks')).length,3);
 assert.equal(Object.values(sim.state.structures).filter(b=>b.team==='red'&&b.kind==='tower').length,6);
});
// A Direct Assault bot ignores every Barracks: tower-rebuilding recall bot, home through the opening, then the wall pair, the gate, the inner pair and the Keep.
test('bot, Direct Assault with zero Barracks destroyed: the Keep falls, the Azure Keep survives, and both outside Barracks stood to the end',()=>{
 const sim=new Simulation('l23-direct',campaign.setup(23)),r=siege(sim,{targets:DIRECT});
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);assert.deepEqual(sim.missionStatus().completedPhases,['assault']);
 assert.equal(r.at(BN),undefined);assert.equal(r.at(BS),undefined);assert.equal(r.at(BC),undefined,'no Barracks died');
 assert.ok(r.seconds>240&&r.seconds<600,`${r.seconds} s`);assert.ok(r.azureMin>=1500,`Azure Keep at ${r.azureMin}`);assert.ok(r.deaths<=8,`${r.deaths} Guardian deaths`);
 assert.ok(r.maxLive<=24,'the Crimson cap holds');assert.equal(r.log.some(e=>e.type==='xp'&&/barracks/.test(String(e.sourceId))),false);
 assert.ok(r.log.some(e=>e.type==='spawn'&&/^red-w\d+-\d*[02468]$/.test(e.id))&&r.log.some(e=>e.type==='spawn'&&/^red-w\d+-\d*[13579]$/.test(e.id)),'both outside Barracks supplied the waves');
 assert.ok(r.log.some(e=>e.type==='spawn'&&/^red-g/.test(e.id)),'the garrison rallied after the gate fell');
});
// Cut Supply Lines: the bot destroys the North guard and Barracks, then the South ones, then storms the fortress as in Direct.
test('bot, Cut Supply Lines: both outside Barracks die first, their waves stop, and the Keep still falls',()=>{
 const sim=new Simulation('l23-cut',campaign.setup(23)),r=siege(sim,{targets:[GN,BN,GS,BS,...DIRECT]});
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);assert.deepEqual(sim.missionStatus().completedPhases,['assault']);
 assert.ok(r.at(BN)&&r.at(BS)&&r.at(BN)<r.at(G)&&r.at(BS)<r.at(G),'both outside Barracks fall before the gate');assert.equal(r.at(BC),undefined,'the courtyard Barracks was never needed');
 const after=(re,t)=>r.log.filter(e=>e.type==='spawn'&&re.test(e.id)&&e.at>t).length;
 assert.equal(after(/^red-w\d+-\d*[02468]$/,r.at(BN)+1),0,'no North unit spawned after the North Barracks fell');assert.equal(after(/^red-w\d+-\d*[13579]$/,r.at(BS)+1),0,'no South unit spawned after the South Barracks fell');
 assert.ok(r.azureMin>=2500,`the Azure Keep is hardly touched (${r.azureMin})`);assert.ok(r.deaths<=8,`${r.deaths} Guardian deaths`);assert.ok(r.bought.length>=1,'the Shop is still affordable');
});

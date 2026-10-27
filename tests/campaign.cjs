const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup,guardianSpawn}=require('../.test-build/data/matchSetup.js');
const {extendedRules}=require('../.test-build/data/encounters.js');
const {gameplayV04}=require('../.test-build/data/gameplayV04.js');
const {CampaignRegistry,levelId,chapterOf}=require('../.test-build/data/campaign.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
// Stage 2 S2: campaign registry and the three vertical-slice levels, run as real matches.
// Scripted hooks (marked "scripted") run inside Simulation.step after status expiry and call the Simulation's own damage path with
// direct damage: they skip movement, range, line of sight, cooldowns and armor, but every damage, death, reward and mission event they
// cause is the authoritative in-match event. Everything else is driven by player commands (move, attack, place).
const DT=1000/30+.01;
function scripted(sim){
 const plan=new Map(),every=[],r=sim.rewards,expire=r.expire.bind(r);
 r.expire=t=>{expire(t);for(const f of [...(plan.get(t)??[]),...every])f(t);};
 const at=(tick,f)=>plan.set(tick,[...(plan.get(tick)??[]),f]);at.every=f=>every.push(f);return at;
}
const entity=(sim,id)=>sim.state.units[id]??sim.state.structures[id]??sim.state.bases[id];
function strike(sim,sourceId,targetId,amount){const s=entity(sim,sourceId),t=entity(sim,targetId);assert.ok(s&&t,`${sourceId} -> ${targetId}`);t.protectionTick=0;sim.hit(s,t,amount??t.hp+1e6,'direct');}
function until(sim,tick,log=[],before){while(sim.clock.tick<tick&&!sim.ended){before?.(sim.clock.tick+1);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;}
const objective=(sim,id)=>sim.missionStatus().objectives.find(o=>o.id===id);
const ends=log=>log.filter(e=>e.type==='match-end');
const level=n=>campaignLevels.find(l=>l.number===n);
const fullBattle=campaignLevels.find(l=>l.id==='full-battle');
const battery=['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'];
// Player-command driver for Hold the Ford (move, attack and place only). towers: Archer Towers on the cells the balance bots use.
// The Guardian fights raiders that come within `leash` of the Azure Keep and otherwise waits at `hold`.
function holdTheFord(sim,maxTicks,{towers=true,leash=420,hold={x:540,y:600}}={},log=[]){
 const s=sim.state,h=sim.hero,cells=[[10,11],[10,13],[12,10],[12,14]];let n=0;
 while(!sim.ended&&sim.clock.tick<maxTicks){
  const t=sim.clock.tick;
  if(towers&&t%15===0&&s.wood>=80&&s.iron>=10){const c=cells.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)sim.send({type:'place',requestId:'p'+(++n),kind:'tower',col:c[0],row:c[1]});}
  if(h.hp>0){
   const foe=Object.values(s.units).filter(u=>u.team==='red'&&Math.hypot(u.x-330,u.y-600)<leash).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
   const goal=foe??hold,d=Math.hypot(goal.x-h.x,goal.y-h.y);
   sim.send({type:'move',...(d>(foe?70:30)?{x:(goal.x-h.x)/d,y:(goal.y-h.y)/d}:{x:0,y:0})});sim.send({type:'attack'});
  }
  sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});
 }
 return log;
}
// tests/match-setup.cjs golden driver (scripted inputs, every event and the final state hashed), as a generator so matches can interleave.
function* driver(sim,maxTicks,out){
 const s=sim.state,h=sim.hero,hash=createHash('sha256'),req={n:0};
 while(!sim.ended&&sim.clock.tick<maxTicks){
  const t=sim.clock.tick,p=s.heroProgression;
  if(t%30===0&&p.skillPoints>0)sim.send({type:'learn',requestId:'l'+(++req.n),skill:['bash','taunt','charge','zone'][req.n%4]});
  if(t%300===150&&s.wood>=80&&s.iron>=10)sim.send({type:'place',requestId:'p'+(++req.n),kind:'tower',col:9+req.n%4,row:10+req.n%5});
  if(t%600===0&&s.gold>=200)sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:'guardian',requestId:'b'+(++req.n),itemId:'iron-sword'});
  if(h.hp>0){
   const goal=t<2400?{x:900,y:600}:{x:1480,y:575},way=goal.x>1050&&h.x<1100?{x:1120,y:575}:goal,d=Math.hypot(way.x-h.x,way.y-h.y);
   sim.send({type:'move',...(d>20?{x:(way.x-h.x)/d,y:(way.y-h.y)/d}:{x:0,y:0})});
   if(t%15===0)sim.send({type:'attack'});
   if(t%90===45)sim.send({type:'cast',requestId:'c'+(++req.n),skill:'bash'});
  }
  sim.advance(DT);
  for(const e of sim.drainEvents())hash.update(t+JSON.stringify(e)+'\n');
  if(t%300===0&&sim.missionStatus())hash.update(JSON.stringify(sim.missionStatus()));
  yield;
 }
 hash.update(JSON.stringify(s));
 Object.assign(out,{tick:sim.clock.tick,ended:sim.ended,result:s.match.result??null,outcome:sim.outcome,waves:s.spawnedWaves,hash:hash.digest('hex')});
}
const drive=(sim,maxTicks)=>{const out={};for(const _ of driver(sim,maxTicks,out));return out;};
// Golden Stage 1 replay from tests/match-setup.cjs (pre-S0 main 69ab775, extended, 16000 ticks).
const GOLDEN_EXTENDED={tick:16000,ended:false,result:null,waves:14,hash:'41b77edde472bbd9fa348fcab92299be719f323bcdf90c5558f5bea590fbd63f'};
const initial=sim=>JSON.stringify({state:sim.state,encounter:sim.encounter,queue:sim.spawnQueue,setup:sim.setup,gold:sim.shopPurchaseQuote('iron-sword'),wall:sim.constructionQuote('wall'),shop:sim.shopAccessReason()});

// Registry
test('exactly levels 1-19 and the special Full Battle are registered, in number order with Full Battle last, with stable ids and chapters of ten',()=>{
 assert.deepEqual(campaign.list().map(l=>[l.id,l.number,l.chapter,l.display.title,l.display.difficulty]),[
  ['campaign-01',1,1,'Hold the Ford','introductory'],['campaign-02',2,1,'Fortify the Crossing','introductory'],['campaign-03',3,1,'Strike the Outpost','standard'],
  ['campaign-04',4,1,'The Broken Line','standard'],['campaign-05',5,1,'Iron Bulwark','standard'],['campaign-06',6,1,'Breach the Front','standard'],
  ['campaign-07',7,1,'The Killing Ground','standard'],['campaign-08',8,1,'Against the Tide','standard'],['campaign-09',9,1,'The Lone Vanguard','standard'],['campaign-10',10,1,'The Crimson Keep','standard'],['campaign-11',11,2,'Canyon Pass','standard'],['campaign-12',12,2,'Hold the Sunwell','standard'],['campaign-13',13,2,'The Dust Riders','standard'],['campaign-14',14,2,'The Southern Flank','standard'],['campaign-15',15,2,'Hold the Mouth','standard'],['campaign-16',16,2,'Across the Sunwell','standard'],['campaign-17',17,2,'The Long Dusk','standard'],['campaign-18',18,2,'The Twin Banks','standard'],['campaign-19',19,2,'The Sandstone Line','standard'],['full-battle',0,0,'Full Battle','full-battle']]);
 assert.deepEqual([levelId(1),levelId(20),levelId(100),chapterOf(10),chapterOf(11),chapterOf(100)],['campaign-01','campaign-20','campaign-100',1,2,10]);
 for(const l of campaign.list()){
  assert.equal(campaign.get(l.id),l);assert.equal(campaign.byNumber(l.number),l);assert.ok(campaign.has(l.id));
  assert.ok(l.display.description&&l.display.briefing);assert.deepEqual(Object.keys(l).sort(),['chapter','display','id','match','mission','number']);
 }
 assert.ok(Object.isFrozen(campaign.list())&&Object.isFrozen(campaign.get('campaign-01').match.overrides.waves.enemyPerWave),'registered levels are read-only');
 const shuffled=new CampaignRegistry([fullBattle,level(19),level(17),level(18),level(11),level(12),level(16),level(13),level(14),level(15),level(10),level(7),level(4),level(1),level(9),level(8),level(5),level(3),level(6),level(2)]);
 assert.deepEqual(shuffled.list().map(l=>l.id),['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05','campaign-06','campaign-07','campaign-08','campaign-09','campaign-10','campaign-11','campaign-12','campaign-13','campaign-14','campaign-15','campaign-16','campaign-17','campaign-18','campaign-19','full-battle'],'listing order is by number with the special mode last, not registration');
 assert.equal(JSON.stringify(shuffled.list()),JSON.stringify(campaign.list()));
});
test('duplicate, misnumbered, misfiled, incomplete and unplayable levels are rejected; missing levels fail clearly',()=>{
 const bad=(levels,re)=>assert.throws(()=>new CampaignRegistry(levels),re);
 bad([level(1),level(1)],/Invalid campaign: duplicate id campaign-01/);
 bad([level(1),{...level(5),id:'campaign-01x',number:1}],/duplicate number 1/);
 bad([{...level(5),id:'campaign-5'}],/level 5 must have id campaign-05/);
 bad([{...level(5),chapter:2}],/campaign-05 belongs to chapter 1, not 2/);
 bad([{...level(11),chapter:1}],/campaign-11 belongs to chapter 2, not 1/);
 // A special mode is exempt from the id, number and chapter rules, but only with number 0 and chapter 0; no other id may use them.
 bad([{...fullBattle,number:20}],/special mode full-battle must have number 0 and chapter 0/);bad([{...fullBattle,chapter:2}],/special mode full-battle must have number 0 and chapter 0/);
 bad([{...level(5),id:'full-battle'}],/special mode full-battle must have number 0/);bad([{...fullBattle,id:'campaign-00'}],/level number 0 outside 1-100/);
 assert.equal(new CampaignRegistry([fullBattle]).get('full-battle').number,0);
 for(const n of [0,101,1.5,NaN])bad([{...level(1),number:n}],/level number/);
 bad([{...level(1),display:{...level(1).display,briefing:''}}],/missing display text/);
 bad([{...level(5),match:{...level(5).match,overrides:{...level(5).match.overrides,defenders:['red-tower-front-north']}}}],/campaign-05: Invalid mission: north-battery: red-tower-rear-north is not in this match/);
 bad([{...level(1),match:{encounter:'arena'}}],/campaign-01: Unknown encounter/);
 assert.throws(()=>campaign.get('campaign-20'),/Unknown campaign level campaign-20/);assert.equal(campaign.has('campaign-20'),false);
 assert.throws(()=>campaign.byNumber(20),/Unknown campaign level number 20/);
 assert.throws(()=>campaign.setup(21),/Unknown campaign level number 21/);assert.throws(()=>campaign.setup('Full Battle'),/Unknown campaign level Full Battle/);
 assert.doesNotThrow(()=>new CampaignRegistry([]));
});
test('every MatchSetup is a fresh copy: changing or playing one leaks into nothing',()=>{
 const levels=JSON.stringify(campaign.list()),shared=JSON.stringify({extendedRules,keep:gameplayV04.keepDefense,waves:gameplayV04.waves});
 for(const n of [1,2,3,4,5,6,7,8,9,10,11,0]){
  const a=campaign.setup(n),fresh=JSON.stringify(a);
  assert.equal(JSON.stringify(campaign.setup(campaign.byNumber(n).id)),fresh,'lookup by id and by number build the same setup');
  a.start.gold=0;a.start.guardian.x=0;a.encounter.defenders.forEach(d=>d.x=0);a.encounter.spawns.length=0;if(a.waveRules)a.waveRules.enemyPerWave[0]=99;
  if(a.mission){a.mission.phases[0].objectives[0].count=99;a.mission.phases[0].objectives.push({id:'x',type:'guardian-level',level:20});}
  assert.equal(JSON.stringify(campaign.setup(n)),fresh,`level ${n}`);
  const b=campaign.setup(n),sim=new Simulation('leak',b);until(sim,1200);
  assert.equal(JSON.stringify(b),fresh,'running a match does not change its setup');assert.equal(JSON.stringify(campaign.setup(n)),fresh);
 }
 assert.equal(JSON.stringify(campaign.list()),levels);assert.equal(JSON.stringify({extendedRules,keep:gameplayV04.keepDefense,waves:gameplayV04.waves}),shared);
});

// Level 1 — Hold the Ford
test('Hold the Ford starts with the Stage 1 Guardian and resources, an inert Crimson Keep, a closed Shop and all eight distant towers',()=>{
 const sim=new Simulation('l1',campaign.setup(1)),s=sim.state,h=sim.hero;
 assert.deepEqual([s.gold,s.wood,s.iron],[250,180,30]);assert.deepEqual([h.x,h.y],[guardianSpawn.x,guardianSpawn.y]);
 assert.deepEqual([s.heroProgression.level,s.heroProgression.xp,s.heroProgression.skillPoints,h.hp,h.maxHp],[1,0,1,sim.combat.guardianBaseHp,sim.combat.guardianBaseHp]);
 assert.equal(s.bases['red-base'].damage,0);assert.equal(sim.setup.keepDefense.red,null);
 assert.equal(sim.shopAccessReason(),'Shop unavailable in this encounter');assert.equal(sim.constructionQuote('tower').available,true);
 assert.deepEqual(Object.keys(s.structures).sort(),extendedRules.towers.map(t=>t.id).sort());
 const st=sim.missionStatus();assert.deepEqual(st.objectives.map(o=>[o.id,o.type,o.target]),[['waves','waves-defeated',5]],'five waves is the only objective');
 assert.deepEqual(sim.setup.mission.phases.map(p=>p.objectives.length),[1]);assert.equal(sim.setup.mission.failure,undefined);
 assert.match(level(1).display.briefing,/Archer Towers .*can help/,'towers are recommended, not required');
});
test('Hold the Ford schedules exactly five waves of 3, 3, 4, 4, 5: the first at 8 s, then every 25 s',()=>{
 const setup=campaign.setup(1),e=setup.encounter;
 assert.deepEqual(e.waves.map(w=>w.tick),[240,990,1740,2490,3240]);
 assert.deepEqual([1,2,3,4,5].map(n=>e.spawns.filter(x=>x.team==='red'&&x.wave===n).length),[3,3,4,4,5]);
 assert.deepEqual([1,2,3,4,5].map(n=>e.spawns.filter(x=>x.team==='blue'&&x.wave===n).length),[2,2,2,2,2]);
 assert.equal(setup.mission.waveMode,'scripted');assert.equal(e.continuous,false,'no waves beyond the five');assert.equal(e.spawns.filter(x=>x.team==='red').length,19);
 // Idle player: the waves arrive on schedule and, unopposed, take the Azure Keep.
 const sim=new Simulation('l1-idle',setup);sim.teleportHero(250,1050);const log=until(sim,6000);
 assert.deepEqual(log.filter(x=>x.type==='wave').map(x=>[x.at,x.index]),[[240,1],[990,2],[1740,3],[2490,4]]);
 assert.deepEqual(sim.outcome?.reason,'azure-keep-destroyed');assert.equal(objective(sim,'waves').progress,0);
});
// A Hold the Ford victory: all 19 raiders of waves 1-5 died, the last on the deciding tick; one match end; nothing spawns afterwards.
function heldTheFord(sim,log){
 const won=sim.outcome;assert.deepEqual(won,{outcome:'victory',reason:'objectives-complete',tick:won?.tick});
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.progress,o.complete]),[['waves',5,true]]);
 assert.equal(sim.mission.wavesDefeated,5);assert.equal(sim.state.spawnedWaves,5);
 const raiders=sim.encounter.spawns.filter(e=>e.team==='red').map(e=>e.id),deaths=log.filter(e=>e.type==='death'&&raiders.includes(e.id));
 assert.equal(new Set(deaths.map(e=>e.id)).size,19,'every raider of the five waves actually died');
 assert.equal(Math.max(...deaths.map(e=>e.at)),won.tick,'victory on the tick the last raider fell');
 assert.ok(!sim.spawnQueue.some(e=>e.team==='red')&&!Object.values(sim.state.units).some(u=>u.kind==='minion-red'));
 assert.deepEqual(ends(log),[{at:won.tick,type:'match-end',outcome:'victory',tick:won.tick}]);
 const queue=sim.spawnQueue.length;
 for(let i=0;i<900;i++){sim.advance(DT);log.push(...sim.drainEvents().map(e=>({at:sim.clock.tick,...e})));}
 assert.equal(sim.clock.tick,won.tick);assert.equal(ends(log).length,1,'no duplicate match end');assert.equal(sim.state.spawnedWaves,5);assert.equal(sim.spawnQueue.length,queue);
 assert.equal(log.filter(e=>e.at>=won.tick&&(e.type==='wave'||e.type==='spawn')).length,0,'no wave or spawn on or after the deciding tick');
 assert.equal(sim.send({type:'attack'}),false);
 return won;
}
test('Hold the Ford is won by the Guardian alone: no towers, real movement and attacks',()=>{
 const sim=new Simulation('l1-guardian',campaign.setup(1)),log=holdTheFord(sim,9000,{towers:false,leash:650,hold:{x:620,y:600}});
 heldTheFord(sim,log);
 assert.equal(log.filter(e=>e.type==='built').length,0);assert.equal(Object.values(sim.state.structures).filter(b=>b.team==='blue').length,0);
});
test('Hold the Ford is won with Archer Towers: towers built by command, the Guardian fighting beside them',()=>{
 const sim=new Simulation('l1-towers',campaign.setup(1)),log=holdTheFord(sim,9000);
 heldTheFord(sim,log);
 const built=log.filter(e=>e.type==='construction-complete').length;assert.ok(built>=2,`${built} towers`);
 assert.ok(log.some(e=>e.type==='damage'&&e.sourceId.startsWith('built-')&&e.id.startsWith('red-')&&e.amount>0),'the towers took part');
});

// Level 5 — Iron Bulwark
test('Iron Bulwark fields exactly the North Battery at its Stage 1 positions, an inert Crimson Keep and the Stage 1 start',()=>{
 const setup=campaign.setup(5),sim=new Simulation('l5',setup),s=sim.state;
 assert.deepEqual(level(5).match,{encounter:'extended',overrides:{waves:{waveInterval:900,enemyPerWave:[3,4,4,5,5,6]},defenders:battery,crimsonKeepArmed:false}});
 assert.deepEqual(level(5).mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'assault',objectives:[{id:'north-battery',type:'destroy',targets:battery,display:{label:'Destroy the North Battery'}}]}]});
 assert.deepEqual(Object.values(s.structures).map(b=>[b.id,b.team,b.x,b.y,b.hp]),[['red-tower-front-north','red',1464,504,650],['red-tower-rear-north','red',1512,456,650],['red-tower-keep-north','red',1560,480,650]]);
 assert.deepEqual(setup.encounter.defenders,extendedRules.towers.filter(t=>battery.includes(t.id)));
 assert.deepEqual(setup.mission.phases[0].objectives[0].targets,battery);
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,180,30,1]);
 assert.deepEqual(setup.mission.failure,{azureKeepHpBelow:.5});assert.equal(s.bases['blue-base'].maxHp,3000);
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick),[300,1200,2100,3000,3900,4800]);
 assert.deepEqual([1,2,3,4,5,6].map(n=>setup.encounter.spawns.filter(x=>x.team==='red'&&x.wave===n).length),[3,4,4,5,5,6]);
 assert.equal(setup.mission.waveMode,'until-objectives');assert.deepEqual(setup.waveRules.late,{firstWave:7,startCount:6,stepEveryWaves:1,cap:6});
 // Inert Keep: the Guardian stands at the Keep and is never attacked by it.
 assert.equal(setup.keepDefense.red,null);assert.deepEqual([s.bases['red-base'].damage,s.bases['red-base'].range],[0,0]);
 assert.equal(sim.teleportHero(1800,700),true);const log=until(sim,200);
 assert.equal(log.filter(e=>(e.type==='attack'&&e.id==='red-base')||(e.type==='damage'&&e.sourceId==='red-base')).length,0);
});
test('Iron Bulwark: the Guardian Shield is on sale but optional',()=>{
 const sim=new Simulation('l5-shop',campaign.setup(5));
 assert.equal(sim.shopAccessReason(),'Return to Azure Keep','the usual Stage 1 rule: trade beside the Azure Keep');assert.equal(sim.teleportHero(450,600),true);
 assert.equal(sim.setup.shop,true);assert.equal(sim.shopPurchaseQuote('guardian-shield').reason,'Not enough Gold','only Gold stands in the way');
 assert.ok(!sim.missionStatus().objectives.some(o=>o.type!=='destroy'),'no item, skill or purchase objective');
 // Same level with enough Gold: the purchase goes through and the mission is unaffected.
 const rich=campaign.setup(5);rich.start.gold=600;const s=new Simulation('l5-rich',rich);s.teleportHero(450,600);assert.equal(s.shopPurchaseQuote('guardian-shield').available,true);
 assert.equal(s.send({type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'b1',itemId:'guardian-shield'}),true);
 const log=until(s,2);assert.ok(log.some(e=>e.type==='item-traded'&&e.action==='buy'),JSON.stringify(log.filter(e=>e.type!=='attack')));
 assert.deepEqual(s.missionStatus().objectives.map(o=>[o.progress,o.complete]),[[0,false]]);
 // Without buying anything: destroying the battery wins (scripted strikes, see below).
 const plain=new Simulation('l5-nobuy',campaign.setup(5)),at=scripted(plain);battery.forEach((id,i)=>at(10+i,()=>strike(plain,'guardian',id)));until(plain,20);
 assert.equal(plain.state.inventory.slots.filter(Boolean).length,0);assert.deepEqual(plain.outcome,{outcome:'victory',reason:'objectives-complete',tick:12});
});
test('Iron Bulwark: exactly 50% Azure Keep HP holds, anything below loses',()=>{
 const sim=new Simulation('l5-half',campaign.setup(5)),at=scripted(sim);
 // scripted: Crimson tower front-north hits the Azure Keep directly (no range check).
 at(10,()=>strike(sim,'red-tower-front-north','blue-base',1500));at(40,()=>strike(sim,'red-tower-front-north','blue-base',.5));
 until(sim,39);assert.equal(sim.state.bases['blue-base'].hp,1500);assert.equal(sim.ended,false);assert.equal(sim.missionStatus().status,'active');
 const log=until(sim,60);
 assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:40});assert.equal(ends(log).length,1);
 assert.equal(sim.state.match.result.alliedHp,1499.5);
});
test('Iron Bulwark: destroying the three battery towers wins, in any order; other Crimson losses add nothing',()=>{
 const sim=new Simulation('l5-win',campaign.setup(5)),at=scripted(sim);
 // scripted: Guardian strikes on the battery towers and the Crimson Keep (no movement or range).
 at(50,()=>strike(sim,'guardian','red-tower-keep-north'));at(60,()=>strike(sim,'guardian','red-base'));at(70,()=>strike(sim,'guardian','red-tower-front-north'));at(400,()=>strike(sim,'guardian','red-tower-rear-north'));
 until(sim,70);assert.deepEqual([objective(sim,'north-battery').progress,sim.ended],[2,false],'the Crimson Keep is not a target and its fall ends nothing');
 const log=until(sim,450);
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:400});assert.equal(ends(log).length,1);
 assert.ok(sim.state.heroProgression.xp>0,'tower kills still reward XP');
});
test('Iron Bulwark: when the last tower falls on the tick the Keep drops below half, defeat wins',()=>{
 const sim=new Simulation('l5-tie',campaign.setup(5)),at=scripted(sim);
 at(20,()=>{strike(sim,'guardian','red-tower-front-north');strike(sim,'guardian','red-tower-rear-north');});
 at(30,()=>{strike(sim,'red-tower-keep-north','blue-base',1501);strike(sim,'guardian','red-tower-keep-north');});
 const log=until(sim,60);
 assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:30});assert.deepEqual(ends(log).map(e=>e.outcome),['defeat']);
 assert.equal(objective(sim,'north-battery').progress,3,'the objective was met, but defeat outranks it');
});

// Full Battle (special mode 'full-battle')
test('Full Battle is the Stage 1 extended preset itself: no overrides, no mission',()=>{
 const l=campaign.get('full-battle');assert.deepEqual(l.match,{encounter:'extended'});assert.equal(l.mission,null);
 const setup=campaign.setup('full-battle');assert.deepEqual(setup,matchSetup('extended'));assert.equal(setup.mission,null);
 assert.equal(JSON.stringify(setup),JSON.stringify(matchSetup('extended')),'same values in the same order');
 const sim=new Simulation('l20',setup);assert.equal(sim.missionStatus(),null);assert.equal(sim.outcome,null);
 assert.equal(sim.state.bases['red-base'].damage,17);assert.equal(Object.keys(sim.state.structures).length,8);assert.equal(sim.setup.shop,true);
});
test('Full Battle replays the Stage 1 match exactly: initial state, every event, RNG and the final result',()=>{
 assert.equal(initial(new Simulation('same',campaign.setup('full-battle'))),initial(new Simulation('same','extended')));
 const level=drive(new Simulation('golden',campaign.setup('full-battle')),16000),stage1=drive(new Simulation('golden','extended'),16000);
 assert.deepEqual(level,stage1);
 const {outcome,...golden}=level;assert.equal(outcome,null);assert.deepEqual(golden,GOLDEN_EXTENDED,'the pre-S0 golden match');
 // A decided match: the legacy Keep-destruction outcome, same tick and same events (scripted Keep kill at tick 600).
 const decide=sim=>{const at=scripted(sim);at(600,()=>strike(sim,'guardian','red-base'));const log=until(sim,700);return {log,outcome:sim.outcome,result:sim.state.match.result,rng:sim.state.criticalRandom};};
 const a=decide(new Simulation('end',campaign.setup('full-battle'))),b=decide(new Simulation('end','extended'));
 assert.deepEqual(a,b);assert.deepEqual(a.outcome,{outcome:'victory',reason:'crimson-keep-destroyed',tick:600});
});

// Determinism
test('each level replays identically from the same seed and inputs, alone or interleaved with the others',()=>{
 const ids=[1,5,'full-battle',1],alone=ids.map(n=>drive(new Simulation('det',campaign.setup(n)),4000));
 for(const [i,n] of ids.entries())assert.deepEqual(drive(new Simulation('det',campaign.setup(n)),4000),alone[i],`level ${n} repeat`);
 assert.deepEqual(alone[3],alone[0]);assert.notEqual(alone[0].hash,alone[1].hash);assert.notEqual(alone[1].hash,alone[2].hash);
 // Four matches stepped in turn, one tick each: nothing one match does reaches another.
 const outs=ids.map(()=>({})),gens=ids.map((n,i)=>driver(new Simulation('det',campaign.setup(n)),4000,outs[i]));
 for(let live=gens.length;live;){live=0;for(const g of gens)if(!g.next().done)live++;}
 assert.deepEqual(outs,alone);
 assert.deepEqual(alone[2],drive(new Simulation('det','extended'),4000),'Full Battle still the Stage 1 match after other levels ran');
});

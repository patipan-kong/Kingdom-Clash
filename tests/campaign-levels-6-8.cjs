const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {extendedRules,extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {missionPanelView}=require('../.test-build/data/campaignUi.js');
const {HZ,scripted,strike,until,objective,play,standing,finalHash}=require('./support/campaignBot.cjs');
// Stage 2 S6B: Campaign Levels 6-8 (Breach the Front, The Killing Ground, Against the Tide), run as real matches with the shared drivers.
// Played runs use only player commands; scripted strikes (marked "scripted") cover edge cases: an exact Keep HP, an early tower kill.
const T=n=>'red-tower-'+n,front=[T('front-north'),T('front-center'),T('front-south')],gate=[T('keep-north'),T('keep-south')];
const level=n=>campaignLevels.find(l=>l.number===n);
const ticksOf=(sim,n)=>sim.setup.encounter.waves.map(w=>w.tick).slice(0,n);
const redPerWave=(setup,n)=>Array.from({length:n},(_,i)=>extendedWaveSpawns(i+1,setup.waveRules).filter(x=>x.team==='red').length);
const rows=sim=>sim.missionStatus().objectives.map(o=>[o.id,o.type,o.target,o.active,o.display.label]);
const keepHp=sim=>sim.state.bases['blue-base'].hp;
const won=sim=>assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:sim.outcome?.tick},JSON.stringify(sim.missionStatus().objectives.map(o=>[o.id,o.progress])));
const lostAtHalf=sim=>{assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['defeat','azure-keep-hp-threshold']);const hp=sim.state.match.result.alliedHp;assert.ok(hp<1500&&hp>0,`the Keep stood at ${hp} HP`);};
const between=(sim,lo,hi)=>assert.ok(sim.outcome.tick>=lo*HZ&&sim.outcome.tick<=hi*HZ,`${(sim.outcome.tick/HZ).toFixed(1)}s, expected ${lo}-${hi}s`);
const ends=log=>log.filter(e=>e.type==='match-end');
// An exact Azure Keep boundary: 1,500 HP holds; one more point of damage is defeat (scripted, any Crimson source).
function halfBoundary(n,source){
 const sim=new Simulation(`l${n}-half`,campaign.setup(n)),at=scripted(sim);
 at(10,()=>strike(sim,source,'blue-base',1500));at(40,()=>strike(sim,source,'blue-base',1));
 until(sim,39);assert.equal(keepHp(sim),1500);assert.equal(sim.ended,false);assert.equal(sim.missionStatus().status,'active','exactly 1,500 HP is safe');
 const log=until(sim,60);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:40});
 assert.equal(sim.state.match.result.alliedHp,1499,'1,499 HP is defeat');assert.equal(ends(log).length,1);
}

// Registry
test('Levels 6-8 are standard Chapter 1 levels with full display text, frozen, fresh on every setup, and leave Levels 1-5 and Full Battle alone',()=>{
 for(const n of [6,7,8]){
  const l=campaign.byNumber(n);assert.equal(l,campaign.get(`campaign-0${n}`));assert.deepEqual([l.chapter,l.display.difficulty],[1,'standard']);
  assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l)&&Object.isFrozen(l.mission.phases));
  assert.match(l.display.briefing,/below 50%/,'the briefing states the Keep minimum');
  const a=campaign.setup(n),fresh=JSON.stringify(a);a.start.wood=0;a.encounter.defenders.forEach(d=>d.x=0);a.waveRules.enemyPerWave[0]=99;a.mission.phases[0].objectives[0].count=99;
  assert.equal(JSON.stringify(campaign.setup(n)),fresh,`level ${n}`);const b=campaign.setup(n);until(new Simulation('leak',b),900);assert.equal(JSON.stringify(b),fresh);
 }
 assert.deepEqual(level(5).match,{encounter:'extended',overrides:{waves:{waveInterval:900,enemyPerWave:[3,4,4,5,5,6]},defenders:['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'],crimsonKeepArmed:false}});
 assert.deepEqual(campaign.get('full-battle').match,{encounter:'extended'});assert.equal(campaign.get('full-battle').mission,null);
});

// Level 6 — Breach the Front
test('Breach the Front: the three front towers, Level 5 waves, an inert Crimson Keep, the Stage 1 start and a two-phase mission',()=>{
 const setup=campaign.setup(6),sim=new Simulation('l6',setup),s=sim.state;
 assert.deepEqual(level(6).match,{encounter:'extended',overrides:{waves:{waveInterval:900,enemyPerWave:[3,4,4,5,5,6]},defenders:front,crimsonKeepArmed:false}});
 assert.deepEqual(Object.values(s.structures).map(b=>[b.id,b.team,b.x,b.y,b.hp]),[[T('front-north'),'red',1464,504,650],[T('front-center'),'red',1464,600,650],[T('front-south'),'red',1464,696,650]]);
 assert.deepEqual(setup.encounter.defenders,extendedRules.towers.filter(t=>front.includes(t.id)));
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,180,30,1]);assert.equal(setup.shop,true);assert.equal(setup.keepDefense.red,null);
 assert.deepEqual([s.bases['red-base'].damage,s.bases['red-base'].range],[0,0]);
 assert.deepEqual(setup.mission.failure,{azureKeepHpBelow:.5});assert.equal(setup.mission.waveMode,'until-objectives');
 assert.deepEqual(setup.mission.phases.map(p=>p.id),['hold','breach']);
 assert.deepEqual(rows(sim),[['stuns','skill-impact',4,true,'Stun 4 raiders with Shield Bash'],['waves','waves-defeated',2,true,'Defeat 2 Crimson waves'],['front','destroy',2,false,'Destroy 2 of 3 front towers']]);
 assert.equal(setup.mission.phases[0].objectives[0].effect,'stun');assert.deepEqual(setup.mission.phases[1].objectives[0].targets,front);
 assert.deepEqual(ticksOf(sim,6),[300,1200,2100,3000,3900,4800]);assert.deepEqual(redPerWave(setup,9),[3,4,4,5,5,6,6,6,6]);
 assert.deepEqual(setup.waveRules.late,{firstWave:7,startCount:6,stepEveryWaves:1,cap:6});
});
test('Breach the Front: the objective HUD names the 2-of-3 requirement and counts toward 2',()=>{
 const sim=new Simulation('l6-hud',campaign.setup(6)),at=scripted(sim),bases=()=>({blue:sim.state.bases['blue-base'],red:sim.state.bases['red-base']});
 let v=missionPanelView(level(6),sim.missionStatus(),bases());
 assert.deepEqual(v.rows.map(r=>[r.label,r.progress,r.target,r.state]),[['Stun 4 raiders with Shield Bash',0,4,'active'],['Defeat 2 Crimson waves',0,2,'active'],['Destroy 2 of 3 front towers',0,2,'locked']]);
 assert.equal(v.heading,'Stun 4 raiders with Shield Bash');assert.deepEqual([v.azure.minimum,v.azure.safe],[1500,true]);
 // Hold completed by play; the breach row then reads 0/2, 1/2.
 play(sim,9000,{cast:{bash:true},targets:[T('front-north')],gate:s=>s.missionStatus().activePhase==='hold',stop:s=>!s.state.structures[T('front-north')]});
 v=missionPanelView(level(6),sim.missionStatus(),bases());const row=v.rows.find(r=>r.id==='front');
 assert.deepEqual([row.label,row.progress,row.target,row.state],['Destroy 2 of 3 front towers',1,2,'active'],'one front tower down: 1/2');assert.equal(sim.ended,false);
});
test('Breach the Front: Shield Bash stuns on Crimson raiders are what the hold phase counts',()=>{
 const sim=new Simulation('l6-bash',campaign.setup(6)),log=[];
 play(sim,2400,{cast:{bash:true},gate:()=>true,log});
 const stuns=log.filter(e=>e.type==='status'&&e.status==='stun'&&e.id.startsWith('red-'));
 assert.ok(stuns.length>=1,'the Guardian landed Shield Bashes');assert.equal(objective(sim,'stuns').progress,Math.min(4,stuns.length));
 assert.ok(stuns.length<4||objective(sim,'stuns').complete,'four stuns complete the objective');
});
test('Breach the Front is won on either flank: north (front-north, front-center) or south (front-south, front-center)',()=>{
 for(const [flank,targets] of [['north',[T('front-north'),T('front-center')]],['south',[T('front-south'),T('front-center')]]]){
  const sim=new Simulation(`l6-${flank}`,campaign.setup(6)),log=[];
  play(sim,9000,{cast:{bash:true},targets,gate:s=>s.missionStatus().activePhase==='hold',log});
  won(sim);between(sim,150,240);assert.ok(keepHp(sim)>=1500,`${flank}: Keep ${keepHp(sim)}`);
  assert.deepEqual(sim.missionStatus().completedPhases,['hold','breach']);
  const fallen=log.filter(e=>e.type==='death'&&front.includes(e.id)).map(e=>e.id).sort();assert.deepEqual(fallen,[...targets].sort(),'exactly the chosen two fell');
  assert.ok(Object.values(sim.state.structures).some(b=>b.team==='red'),'the third front tower still stands: two of three is enough');
  assert.equal(ends(log).length,1);
 }
});
test('Breach the Front: two Archer Towers at home first is also a winning plan, and keeps the Keep whole',()=>{
 const sim=new Simulation('l6-towers',campaign.setup(6));
 play(sim,9000,{towers:2,cast:{bash:true},targets:[T('front-north'),T('front-center')],gate:s=>s.missionStatus().activePhase==='hold'||standing(s)<2});
 won(sim);between(sim,180,300);assert.equal(keepHp(sim),3000);
});
test('Breach the Front: without Shield Bash the hold phase never completes, however long the Guardian fights',()=>{
 const sim=new Simulation('l6-nobash',campaign.setup(6));
 play(sim,12000,{targets:[T('front-north'),T('front-center')],gate:s=>s.mission.wavesDefeated<2});
 assert.notEqual(sim.outcome?.outcome,'victory');assert.equal(sim.missionStatus().activePhase,'hold');
 assert.equal(objective(sim,'stuns').progress,0);assert.equal(objective(sim,'waves').complete,true,'waves alone are not enough');
});
test('Breach the Front: idle play loses to the 50% threshold; allied minions and a Guardian who never crosses cannot breach',()=>{
 const idle=new Simulation('l6-idle',campaign.setup(6));play(idle,6000,{park:true});lostAtHalf(idle);
 const home=new Simulation('l6-home',campaign.setup(6)),log=[];play(home,16000,{cast:{bash:true},leash:650,hold:{x:620,y:600},log});
 assert.equal(home.outcome,null,'still being played after 8.9 minutes');assert.equal(objective(home,'stuns').complete,true);
 assert.equal(home.missionStatus().activePhase,'breach');assert.ok(objective(home,'front').progress<2,'the allies alone never break two front towers');
 assert.ok(log.filter(e=>e.type==='damage'&&front.includes(e.id)).every(e=>e.sourceId.startsWith('blue-')),'only allied minions touched the front line');
 // Wave cadence beyond the scripted six: the size stays at six.
 const spawned=n=>log.filter(x=>x.type==='spawn'&&x.id.startsWith(`red-w${n}-`)).length;
 assert.deepEqual([1,2,3,4,5,6,7,8].map(spawned),[3,4,4,5,5,6,6,6]);
 assert.deepEqual(log.filter(x=>x.type==='wave').map(x=>x.at).slice(0,8),[0,1,2,3,4,5,6,7].map(i=>300+900*i));
});
test('Breach the Front: front towers destroyed before the breach opens are credited the moment it does (phase cascade)',()=>{
 const sim=new Simulation('l6-early',campaign.setup(6)),at=scripted(sim),log=[];
 at(10,()=>{strike(sim,'guardian',T('front-north'));strike(sim,'guardian',T('front-south'));});
 until(sim,200,log);assert.equal(sim.ended,false,'destroying two towers first does not win');
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.active,o.progress]),[['stuns',true,0],['waves',true,0],['front',false,0]]);
 play(sim,9000,{cast:{bash:true},gate:()=>true,log});
 won(sim);assert.deepEqual(sim.missionStatus().completedPhases,['hold','breach']);
 const fourth=log.filter(e=>e.type==='status'&&e.status==='stun'&&e.id.startsWith('red-'))[3];assert.ok(fourth&&sim.outcome.tick>=fourth.at);
 assert.equal(objective(sim,'front').progress,2);
});
test('Breach the Front: exactly 50% Azure Keep HP holds, anything below loses',()=>halfBoundary(6,T('front-north')));

// Level 7 — The Killing Ground
test('The Killing Ground: no Crimson structures, no allied waves, a closed Shop and materials for one tower',()=>{
 const setup=campaign.setup(7),sim=new Simulation('l7',setup),s=sim.state;
 assert.deepEqual(level(7).match,{encounter:'extended',overrides:{waves:{firstWaveTick:450,waveInterval:720,enemyPerWave:[4,5,5,6,6,7],alliedPerWave:0},defenders:[],crimsonKeepArmed:false,shop:false,start:{wood:100,iron:10}}});
 assert.deepEqual(setup.encounter.defenders,[]);assert.deepEqual(Object.keys(s.structures),[]);assert.equal(setup.keepDefense.red,null);
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,100,10,1]);assert.equal(sim.shopAccessReason(),'Shop unavailable in this encounter');
 assert.deepEqual(setup.mission.failure,{azureKeepHpBelow:.5});assert.equal(setup.mission.waveMode,'until-objectives');assert.deepEqual(setup.mission.phases.map(p=>p.id),['killzone']);
 assert.deepEqual(rows(sim),[['towers','structures-completed',3,true,'Complete 3 Archer Towers'],['taunts','skill-impact',6,true,'Taunt 6 raiders'],['kills','tower-kills',12,true,'Archer Towers slay 12 raiders']]);
 assert.equal(setup.mission.phases[0].objectives[1].effect,'taunt');
 assert.deepEqual(ticksOf(sim,6),[450,1170,1890,2610,3330,4050]);assert.deepEqual(redPerWave(setup,9),[4,5,5,6,6,7,7,7,7]);
 assert.deepEqual(setup.waveRules.late,{firstWave:7,startCount:7,stepEveryWaves:1,cap:7});
 assert.equal(setup.waveRules.alliedPerWave,0);assert.equal(setup.encounter.spawns.filter(e=>e.team==='blue').length,0,'no allied reinforcements are scheduled');
});
test('The Killing Ground: the first tower is affordable at once; the second waits about 40 s for Iron',()=>{
 const sim=new Simulation('l7-econ',campaign.setup(7)),log=[];
 assert.equal(sim.constructionQuote('tower').available,true);assert.equal(sim.placementReason('tower',12,10),'');
 assert.equal(sim.send({type:'place',requestId:'a',kind:'tower',col:12,row:10}),true);until(sim,2,log);
 assert.ok(log.some(e=>e.type==='built'&&e.id==='built-a'));assert.deepEqual([sim.state.wood,sim.state.iron].map(Math.floor),[20,0]);
 assert.equal(sim.constructionQuote('tower').available,false);assert.notEqual(sim.placementReason('tower',12,14),'');
 let ready=null;until(sim,1400,log,t=>{if(ready===null&&sim.constructionQuote('tower').available)ready=t;});
 assert.ok(ready>=1190&&ready<=1210,`second tower affordable at tick ${ready}`);
 assert.equal(sim.send({type:'place',requestId:'b',kind:'tower',col:12,row:14}),true);until(sim,1402,log);assert.ok(log.some(e=>e.type==='built'&&e.id==='built-b'));
 assert.equal(log.filter(e=>e.type==='spawn'&&e.id.startsWith('blue-w')).length,0,'no allied wave spawns');
});
test('The Killing Ground is won by building three towers and Taunting raiders into their fire',()=>{
 const sim=new Simulation('l7-win',campaign.setup(7)),log=[];
 play(sim,9000,{towers:3,cast:{taunt:2},leash:520,hold:{x:600,y:600},log});
 won(sim);between(sim,120,240);assert.equal(keepHp(sim),3000);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.progress,o.complete]),[['towers',3,true],['taunts',6,true],['kills',12,true]]);
 const taunts=log.filter(e=>e.type==='status'&&e.status==='taunt'&&e.id.startsWith('red-'));assert.ok(taunts.length>=6,`${taunts.length} raiders taunted`);
 const kills=log.filter(e=>e.type==='death'&&e.id.startsWith('red-')&&e.sourceId.startsWith('built-'));assert.ok(kills.length>=12,`${kills.length} tower kills`);
 assert.equal(log.filter(e=>e.type==='spawn'&&e.id.startsWith('blue-')).length,0,'no allied reinforcement ever spawned');
});
test('The Killing Ground: towers alone lose, and without Taunt the mission never completes',()=>{
 const towers=new Simulation('l7-towers',campaign.setup(7));play(towers,6000,{towers:3,park:true});lostAtHalf(towers);
 const sim=new Simulation('l7-notaunt',campaign.setup(7));play(sim,16000,{towers:3,leash:520,hold:{x:600,y:600}});
 assert.equal(sim.outcome,null,'still being played after 8.9 minutes');
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.complete]),[['towers',true],['taunts',false],['kills',true]]);assert.equal(objective(sim,'taunts').progress,0);
});
test('The Killing Ground: idle play loses to the 50% threshold',()=>{const sim=new Simulation('l7-idle',campaign.setup(7));play(sim,6000,{park:true});lostAtHalf(sim);});
test('The Killing Ground: tower kills count only player Archer Towers, and only Crimson raiders',()=>{
 const sim=new Simulation('l7-kills',campaign.setup(7)),at=scripted(sim);
 assert.equal(sim.send({type:'place',requestId:'t',kind:'tower',col:12,row:10}),true);
 at(700,()=>{strike(sim,'guardian','red-w1-0');strike(sim,'blue-base','red-w1-1');});at(710,()=>strike(sim,'built-t','red-w1-2'));
 until(sim,705);assert.equal(objective(sim,'kills').progress,0,'Guardian and Keep kills are not tower kills');
 until(sim,715);assert.equal(objective(sim,'kills').progress,1);
});
test('The Killing Ground: exactly 50% Azure Keep HP holds, anything below loses',()=>halfBoundary(7,'red-base'));

// Level 8 — Against the Tide (S6B human retune, Candidate G: softer waves, five waves, the three front towers)
const KEEP={x:330,y:600};
const threat=r=>s=>Object.values(s.state.units).some(u=>u.team==='red'&&u.hp>0&&Math.hypot(u.x-KEEP.x,u.y-KEEP.y)<r);
const tide=s=>s.missionStatus().activePhase==='tide';
// The approved probe policies. east: once its targets fall, the Guardian waits by the Crimson spawn instead of coming home.
// slow: a slower player who also spends `home` of every `cycle` ticks back at the Keep (human-paced stand-ins from the retune probe).
const east={leash:1,hold:{x:1500,y:600}},slow=(home,cycle)=>({towers:2,targets:front,gate:s=>threat(520)(s)||s.clock.tick%cycle<home,cast:{bash:true}});
const L8={
 rush:{targets:front,...east,cast:{bash:true}}, // no towers, never returns
 hybrid:{towers:2,targets:front,gate:threat(520),cast:{bash:true}}, // returns when raiders come within 520 px of the Keep
 lateHybrid:{towers:2,targets:front,gate:threat(400),cast:{bash:true}}, // returns later, at 400 px (imperfect play)
 slow:{'10 s of every 30 s':slow(300,900),'15 s of every 30 s':slow(450,900),'20 s of every 30 s':slow(600,900),'30 s of every 40 s':slow(900,1200)},
};
// Reaction delay: the player issues no command for the first `seconds`.
const delayed=(sim,seconds)=>{until(sim,seconds*HZ,[],()=>sim.send({type:'move',x:0,y:0}));return sim;};
// Runs a policy and counts defensive returns: the Guardian breaks off an attack while targets still stand. A return is meaningful when the
// Guardian then comes within 600 px of the Azure Keep and damages a Crimson raider before resuming.
function l8run(name,policy,delay=0,maxTicks=16200){
 const sim=delayed(new Simulation(name,campaign.setup(8)),delay),h=sim.hero,log=[],eps=[];let mode=null,ep=null;
 const watch=s=>{
  const next=policy.targets.some(id=>s.state.structures[id]),now=!next?'done':(policy.gate??(()=>false))(s)?'defend':'attack';
  if(now==='defend'&&mode==='attack')ep={start:s.clock.tick,near:false};
  if(ep&&now!=='defend'){ep.end=s.clock.tick;eps.push(ep);ep=null;}
  if(ep&&h.hp>0&&Math.hypot(h.x-KEEP.x,h.y-KEEP.y)<600)ep.near=true;
  mode=now;return false;
 };
 play(sim,maxTicks,{...policy,stop:watch,log});if(ep){ep.end=sim.clock.tick;eps.push(ep);}
 const meaningful=eps.filter(p=>p.near&&log.some(e=>e.type==='damage'&&e.sourceId==='guardian'&&e.id.startsWith('red-w')&&e.at>=p.start&&e.at<=p.end)).length;
 return {sim,log,returns:eps.length,meaningful,secs:(sim.outcome?.tick??sim.clock.tick)/HZ};
}
// A victory that needed only the front line: all three front towers fell and both gate towers still stand.
const frontOnly=(sim,log,tag)=>{
 assert.deepEqual(log.filter(e=>e.type==='death'&&front.includes(e.id)).map(e=>e.id).sort(),[...front].sort(),`${tag}: all three front towers fell`);
 for(const id of gate)assert.ok(sim.state.structures[id]?.hp>0,`${tag}: ${id} still stands`);
};
test('Against the Tide: five Crimson structures, softer waves, one ally per wave, materials for one tower and a two-phase mission on the front line',()=>{
 const setup=campaign.setup(8),sim=new Simulation('l8',setup),s=sim.state;
 assert.deepEqual(level(8).match,{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,3,4,4,5,5,6,6],alliedPerWave:1},defenders:[...front,...gate],crimsonKeepArmed:false,start:{wood:80,iron:10}}});
 assert.deepEqual(Object.values(s.structures).map(b=>[b.id,b.x,b.y,b.hp]),[[T('front-north'),1464,504,650],[T('front-center'),1464,600,650],[T('front-south'),1464,696,650],[T('keep-north'),1560,480,650],[T('keep-south'),1560,720,650]]);
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,80,10,1]);assert.equal(setup.shop,true);assert.equal(setup.keepDefense.red,null);
 assert.deepEqual(setup.mission.failure,{azureKeepHpBelow:.5});assert.equal(setup.mission.waveMode,'until-objectives');
 assert.deepEqual(setup.mission.phases.map(p=>p.id),['tide','break']);
 assert.deepEqual(rows(sim),[['towers','structures-completed',2,true,'Build 2 Archer Towers'],['waves','waves-defeated',5,true,'Defeat 5 Crimson waves'],['front','destroy',3,false,'Destroy the 3 front towers']]);
 assert.equal(setup.mission.phases[0].objectives[0].kind,'tower');
 assert.deepEqual(setup.mission.phases[1].objectives[0].targets,front,'only the three front towers are required; the gate towers are not targets');
 assert.deepEqual(ticksOf(sim,8),[300,1050,1800,2550,3300,4050,4800,5550]);assert.deepEqual(redPerWave(setup,11),[3,3,4,4,5,5,6,6,6,6,6]);
 assert.deepEqual(setup.waveRules.late,{firstWave:9,startCount:6,stepEveryWaves:1,cap:6});
 assert.equal(setup.waveRules.alliedPerWave,1);
 assert.deepEqual(Array.from({length:8},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='blue'&&e.wave===i+1).length),[1,1,1,1,1,1,1,1],'one allied minion per wave');
 assert.equal(sim.constructionQuote('tower').available,true);
});
test('Against the Tide: a pure rush without towers loses the Keep within 90 s, even with the whole front line down',()=>{
 let allDown=0;
 for(const d of [0,3,7]){
  const {sim}=l8run(`l8-rush-${d}`,L8.rush,d);lostAtHalf(sim);
  assert.ok(sim.outcome.tick<=90*HZ,`delay ${d}s: lost at ${(sim.outcome.tick/HZ).toFixed(1)}s`);
  assert.equal(sim.missionStatus().activePhase,'tide');assert.deepEqual([objective(sim,'waves').complete,objective(sim,'towers').progress],[false,0]);
  if(front.every(id=>!sim.state.structures[id]))allDown++;
 }
 assert.ok(allDown>=1,'in at least one run the rush broke all three front towers and still lost');
});
test('Against the Tide: striking and returning home when raiders close in wins in 120-200 s with meaningful returns, the Keep held and only the front line broken',()=>{
 for(const [kind,policy] of [['hybrid',L8.hybrid],['late hybrid',L8.lateHybrid]])for(const d of [0,3,7]){
  const {sim,log,meaningful}=l8run(`l8-${kind}-${d}`,policy,d),tag=`${kind}, delay ${d}s`;
  won(sim);between(sim,120,200);assert.ok(keepHp(sim)>=1500,`${tag}: Keep ${keepHp(sim)}`);
  assert.ok(meaningful>=1,`${tag}: ${meaningful} meaningful defensive returns`);
  assert.deepEqual(sim.missionStatus().completedPhases,['tide','break'],tag);assert.equal(ends(log).length,1);
  frontOnly(sim,log,tag);
 }
});
test('Against the Tide: slower players who keep returning home still win, within 300 s and with the Keep held',()=>{
 for(const [kind,policy] of Object.entries(L8.slow)){
  const {sim,log,meaningful}=l8run(`l8-slow-${kind}`,policy),tag=`home ${kind}`;
  won(sim);between(sim,120,300);assert.ok(keepHp(sim)>=1500,`${tag}: Keep ${keepHp(sim)}`);
  assert.ok(meaningful>=1,`${tag}: ${meaningful} meaningful defensive returns`);
  assert.deepEqual(sim.missionStatus().completedPhases,['tide','break'],tag);assert.equal(ends(log).length,1);
  frontOnly(sim,log,tag);
 }
});
test('Against the Tide: idle play and towers without the Guardian lose; a Guardian who stays home completes the tide but never breaks the front',()=>{
 const idle=new Simulation('l8-idle',campaign.setup(8));play(idle,6000,{park:true});lostAtHalf(idle);
 const parked=new Simulation('l8-parked',campaign.setup(8));play(parked,9000,{towers:2,park:true});lostAtHalf(parked);
 assert.equal(objective(parked,'towers').complete,true);assert.equal(objective(parked,'front').progress,0,'two towers alone break nothing and do not hold the Keep');
 const home=new Simulation('l8-home',campaign.setup(8)),log=[];play(home,16000,{towers:2,leash:650,hold:{x:620,y:600},cast:{bash:true},log});
 assert.equal(home.outcome,null,'still being played after 8.9 minutes');
 assert.deepEqual(home.missionStatus().completedPhases,['tide']);assert.equal(home.missionStatus().activePhase,'break');
 for(const id of gate)assert.equal(home.state.structures[id].hp,650,`${id} untouched`);
 assert.ok(objective(home,'front').progress<3,'the allies alone never break the front');
 // Escalation as played: 3 to 6, then 6 per wave.
 const spawned=n=>log.filter(x=>x.type==='spawn'&&x.id.startsWith(`red-w${n}-`)).length;
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10].map(spawned),[3,3,4,4,5,5,6,6,6,6]);
});
test('Against the Tide: phases run in order: the tide needs five waves and two towers; the break stays locked until then',()=>{
 const sim=new Simulation('l8-order',campaign.setup(8)),log=[];
 // Two towers at once, Guardian at home: the tower objective completes early, the tide only with the fifth defeated wave.
 play(sim,9000,{towers:2,leash:650,hold:{x:620,y:600},cast:{bash:true},log,stop:s=>!tide(s)});
 assert.equal(sim.ended,false);assert.equal(sim.missionStatus().activePhase,'break');
 const done=sim.clock.tick;assert.ok(log.filter(e=>e.type==='wave').length>=5);
 assert.ok(log.filter(e=>e.type==='construction-complete').length>=2&&log.filter(e=>e.type==='construction-complete')[1].at<done,'both towers were finished before the tide ended');
 assert.equal(sim.mission.wavesDefeated,5,'the tide ends on the fifth defeated wave');
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.active,o.complete]),[['towers',false,true],['waves',false,true],['front',true,false]]);
 assert.equal(objective(sim,'front').progress,0);
});
test('Against the Tide: front towers destroyed during the tide stay locked and are credited when the break opens; gate towers never count',()=>{
 const sim=new Simulation('l8-early',campaign.setup(8)),at=scripted(sim),log=[];
 at(10,()=>[...gate,T('front-north'),T('front-center')].forEach(id=>strike(sim,'guardian',id))); // scripted: both gate towers and two front towers
 until(sim,60,log);assert.equal(sim.ended,false,'four towers down early do not win');
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.active,o.progress]),[['towers',true,0],['waves',true,0],['front',false,0]],'the break row stays locked at 0');
 play(sim,9000,{towers:2,leash:650,hold:{x:620,y:600},cast:{bash:true},log,stop:s=>!tide(s)});
 assert.equal(sim.ended,false,'the tide completes, but one front tower still stands');
 assert.deepEqual([sim.missionStatus().activePhase,objective(sim,'front').progress],['break',2],'the two early front kills are credited; the gate towers are not');
 const last=sim.clock.tick+30;at(last,()=>strike(sim,'guardian',T('front-south'))); // scripted: the third front tower
 until(sim,last+30,log);assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:last});assert.equal(ends(log).length,1);
});
test('Against the Tide: breaking the front during the tide completes the break on the same tick the tide ends (no softlock, no early victory)',()=>{
 const sim=new Simulation('l8-all-early',campaign.setup(8)),at=scripted(sim),log=[];
 at(10,()=>front.forEach(id=>strike(sim,'guardian',id))); // scripted: the whole front line, gate towers left standing
 until(sim,60,log);assert.equal(sim.ended,false,'the front line down early does not win');assert.equal(objective(sim,'front').progress,0);
 play(sim,12000,{towers:2,leash:650,hold:{x:620,y:600},cast:{bash:true},log});
 won(sim);assert.ok(keepHp(sim)>=1500);assert.deepEqual(sim.missionStatus().completedPhases,['tide','break']);
 assert.equal(sim.mission.wavesDefeated,5,'won on the fifth defeated wave');assert.equal(ends(log).length,1);
 for(const id of gate)assert.ok(sim.state.structures[id]?.hp>0,`${id} still stands`);
 // A played early strike: two front towers during the tide, then hold until it ends, then the last. No softlock.
 const played=l8run('l8-played-early',{towers:2,targets:front,gate:s=>(tide(s)&&front.filter(id=>!s.state.structures[id]).length>=2)||threat(520)(s),cast:{bash:true}});
 won(played.sim);assert.ok(keepHp(played.sim)>=1500);assert.deepEqual(played.sim.missionStatus().completedPhases,['tide','break']);frontOnly(played.sim,played.log,'played early');
});
test('Against the Tide: exactly 50% Azure Keep HP holds, anything below loses',()=>halfBoundary(8,T('front-center')));

// Determinism
test('Levels 6, 7 and 8 replay identically from the same seed and inputs, alone or interleaved',()=>{
 const runs={6:{cast:{bash:true},targets:[T('front-north'),T('front-center')],gate:s=>s.missionStatus().activePhase==='hold'},7:{towers:3,cast:{taunt:2},leash:520,hold:{x:600,y:600}},8:L8.hybrid};
 const once=n=>{const sim=new Simulation('det',campaign.setup(n)),log=[];play(sim,9000,{...runs[n],log});return {tick:sim.clock.tick,outcome:sim.outcome,hash:finalHash(sim,log)};};
 const a=[6,7,8].map(once),b=[6,7,8].map(once);assert.deepEqual(b,a);
 assert.equal(new Set(a.map(x=>x.hash)).size,3);for(const r of a)assert.equal(r.outcome.outcome,'victory');
 const c=[8,6,7,6].map(once);assert.deepEqual([c[1],c[2],c[0]],a,'running other levels between does not change a level');assert.deepEqual(c[3],a[0]);
});

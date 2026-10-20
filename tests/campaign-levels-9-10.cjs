const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {missionPanelView}=require('../.test-build/data/campaignUi.js');
const {HZ,scripted,strike,until,objective,play,standing,finalHash}=require('./support/campaignBot.cjs');
// Stage 2 S6D: Campaign Levels 9-10 (The Lone Vanguard, The Crimson Keep), run as real matches with the shared drivers.
// Played runs use only player commands; scripted strikes (marked "scripted") cover edge cases: an early tower kill, an exact Keep HP.
const T=n=>'red-tower-'+n,wedge=[T('front-center'),T('rear-north'),T('rear-south')],gate=[T('keep-north'),T('keep-south')];
const KEEP={x:330,y:600};
const level=n=>campaignLevels.find(l=>l.number===n);
const ticksOf=(sim,n)=>sim.setup.encounter.waves.map(w=>w.tick).slice(0,n);
const redPerWave=(setup,n)=>Array.from({length:n},(_,i)=>extendedWaveSpawns(i+1,setup.waveRules).filter(x=>x.team==='red').length);
const rows=sim=>sim.missionStatus().objectives.map(o=>[o.id,o.type,o.target,o.active,o.display.label]);
const keepHp=sim=>sim.state.bases['blue-base'].hp;
const won=sim=>assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:sim.outcome?.tick},JSON.stringify(sim.missionStatus().objectives.map(o=>[o.id,o.progress])));
const lostAtHalf=sim=>{assert.deepEqual([sim.outcome?.outcome,sim.outcome?.reason],['defeat','azure-keep-hp-threshold']);const hp=sim.state.match.result.alliedHp;assert.ok(hp<1500&&hp>0,`the Keep stood at ${hp} HP`);};
const between=(sim,lo,hi)=>assert.ok(sim.outcome.tick>=lo*HZ&&sim.outcome.tick<=hi*HZ,`${(sim.outcome.tick/HZ).toFixed(1)}s, expected ${lo}-${hi}s`);
const ends=log=>log.filter(e=>e.type==='match-end');
const threat=r=>s=>Object.values(s.state.units).some(u=>u.team==='red'&&u.hp>0&&Math.hypot(u.x-KEEP.x,u.y-KEEP.y)<r);
const slowsOn=log=>log.filter(e=>e.type==='status'&&e.status==='slow'&&e.id.startsWith('red-'));
const east={leash:1,hold:{x:1500,y:600}};
function halfBoundary(n,source){
 const sim=new Simulation(`l${n}-half`,campaign.setup(n)),at=scripted(sim);
 at(10,()=>strike(sim,source,'blue-base',1500));at(40,()=>strike(sim,source,'blue-base',1));
 until(sim,39);assert.equal(keepHp(sim),1500);assert.equal(sim.ended,false);assert.equal(sim.missionStatus().status,'active','exactly 1,500 HP is safe');
 const log=until(sim,60);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:40});
 assert.equal(sim.state.match.result.alliedHp,1499,'1,499 HP is defeat');assert.equal(ends(log).length,1);
}
// Delay: the player issues no command for the first `seconds`.
const delayed=(sim,seconds)=>{until(sim,seconds*HZ,[],()=>sim.send({type:'move',x:0,y:0}));return sim;};

// Level 9 — The Lone Vanguard
const V={
 hybrid:{towers:2,targets:wedge,gate:threat(520),cast:{bash:true,charge:130}}, // returns when raiders come within 520 px of the Keep
 lateHybrid:{towers:2,targets:wedge,gate:threat(400),cast:{bash:true,charge:130}},
 noTowers:{targets:wedge,gate:threat(520),cast:{bash:true,charge:130}},
 slow50:{towers:2,targets:wedge,gate:s=>threat(520)(s)||s.clock.tick%900<450,cast:{bash:true,charge:130}}, // half of every 30 s back at the Keep
 slow33:{towers:2,targets:wedge,gate:s=>threat(520)(s)||s.clock.tick%900<300,cast:{bash:true,charge:130}},
};
test('Level 9: registered as The Lone Vanguard with display text, a read-only definition and a fresh setup every time',()=>{
 const l=campaign.byNumber(9);assert.equal(l,campaign.get('campaign-09'));assert.deepEqual([l.chapter,l.display.difficulty,l.display.title],[1,'standard','The Lone Vanguard']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l)&&Object.isFrozen(l.mission.phases));
 assert.match(l.display.briefing,/below 50%/,'the briefing states the Keep minimum');assert.match(l.display.briefing,/Vanguard Charge/);
 assert.match(l.display.strategy,/Guardian Zone/,'Guardian Zone is mentioned as optional');assert.match(l.display.strategy,/optional/);
 const a=campaign.setup(9),fresh=JSON.stringify(a);a.start.wood=0;a.encounter.defenders.forEach(d=>d.x=0);a.waveRules.enemyPerWave[0]=99;a.mission.phases[0].objectives[0].count=99;
 assert.equal(JSON.stringify(campaign.setup(9)),fresh);const b=campaign.setup(9);until(new Simulation('leak',b),900);assert.equal(JSON.stringify(b),fresh);
});
test('Level 9: the three-tower wedge, waves of 3 to 6, no allies, an inert Crimson Keep, the default start and one phase with two parallel objectives',()=>{
 const setup=campaign.setup(9),sim=new Simulation('l9',setup),s=sim.state;
 assert.deepEqual(level(9).match,{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,3,4,4,5,5,6,6],alliedPerWave:0},defenders:wedge,crimsonKeepArmed:false}});
 assert.deepEqual(Object.values(s.structures).map(b=>b.id).sort(),[...wedge].sort());assert.deepEqual(setup.encounter.defenders.map(d=>d.id).sort(),[...wedge].sort());
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,180,30,1],'the Stage 1 start');assert.equal(setup.shop,true);
 assert.equal(setup.keepDefense.red,null);assert.deepEqual([s.bases['red-base'].damage,s.bases['red-base'].range],[0,0],'the Crimson Keep is inert');
 assert.deepEqual(setup.mission.failure,{azureKeepHpBelow:.5});assert.equal(setup.mission.waveMode,'until-objectives');assert.deepEqual(setup.mission.phases.map(p=>p.id),['vanguard']);
 assert.deepEqual(rows(sim),[['slows','skill-impact',5,true,'Slow 5 raiders with Vanguard Charge'],['wedge','destroy',3,true,'Destroy the 3 wedge towers']],'both objectives are active from the start');
 assert.equal(setup.mission.phases[0].objectives[0].effect,'slow');assert.deepEqual(setup.mission.phases[0].objectives[1].targets,wedge);
 assert.deepEqual(ticksOf(sim,8),[300,1050,1800,2550,3300,4050,4800,5550]);assert.deepEqual(redPerWave(setup,11),[3,3,4,4,5,5,6,6,6,6,6]);
 assert.equal(setup.waveRules.alliedPerWave,0);assert.equal(setup.encounter.spawns.filter(e=>e.team==='blue').length,0,'no allied reinforcements are scheduled');
 assert.equal(sim.constructionQuote('tower').available,true);
});
test('Level 9: the objective HUD is headed by the Charge row (not the wave title) and counts the slows and the wedge',()=>{
 const sim=new Simulation('l9-hud',campaign.setup(9)),at=scripted(sim),bases=()=>({blue:sim.state.bases['blue-base'],red:sim.state.bases['red-base']});
 let v=missionPanelView(level(9),sim.missionStatus(),bases());
 assert.deepEqual(v.rows.map(r=>[r.label,r.progress,r.target,r.state]),[['Slow 5 raiders with Vanguard Charge',0,5,'active'],['Destroy the 3 wedge towers',0,3,'active']]);
 assert.equal(v.heading,'Slow 5 raiders with Vanguard Charge');assert.ok(v.rows.length<=4);
 at(10,()=>strike(sim,'guardian',wedge[1]));until(sim,20);
 v=missionPanelView(level(9),sim.missionStatus(),bases());assert.deepEqual(v.rows.map(r=>r.progress),[0,1]);
});
test('Level 9: a Charge counts only when it connects with a Crimson raider',()=>{
 // Into empty ground: the dash completes and nothing is slowed.
 const sim=new Simulation('l9-miss',campaign.setup(9)),log=[];
 sim.send({type:'learn',requestId:'l',skill:'charge'});until(sim,3,log);
 assert.equal(sim.send({type:'cast',skill:'charge',requestId:'c',direction:{x:1,y:0}}),true);until(sim,90,log);
 assert.ok(log.some(e=>e.type==='cast-effect'&&e.skill==='charge'),'the dash completed');assert.equal(slowsOn(log).length,0);assert.equal(objective(sim,'slows').progress,0);
 // Shield Bash stuns and Taunts are not slows.
 const other=new Simulation('l9-bash',campaign.setup(9)),olog=[];play(other,2400,{cast:{bash:true},gate:()=>true,log:olog});
 assert.ok(olog.some(e=>e.type==='status'&&e.status==='stun'&&e.id.startsWith('red-')),'Shield Bash stunned raiders');assert.equal(slowsOn(olog).length,0);assert.equal(objective(other,'slows').progress,0);
 // Played Charges: the counter equals the Crimson raiders actually slowed (one per connecting Charge), capped at five.
 const played=new Simulation('l9-played',campaign.setup(9)),plog=[];play(played,2400,{cast:{charge:130},gate:()=>true,log:plog});
 const slows=slowsOn(plog),casts=plog.filter(e=>e.type==='cast-accepted'&&e.skill==='charge');
 assert.ok(slows.length>=2,'Charges connected');assert.ok(slows.length<=casts.length,'never more than one slow per Charge');
 assert.equal(objective(played,'slows').progress,Math.min(5,slows.length));assert.equal(new Set(slows.map(e=>e.at)).size,slows.length,'each slow is its own cast');
 // A slow that happens outside the Crimson team or hits a tower is not counted: Charge cannot hit structures.
 assert.ok(slows.every(e=>/^red-w/.test(e.id)));
});
test('Level 9: both objectives are required: five slows alone and the wedge alone each leave the mission open',()=>{
 const slowsOnly=new Simulation('l9-slows',campaign.setup(9)),log=[];
 play(slowsOnly,9000,{towers:2,cast:{bash:true,charge:130},leash:650,hold:{x:620,y:600},log});
 assert.equal(objective(slowsOnly,'slows').complete,true);assert.equal(objective(slowsOnly,'wedge').progress,0);
 assert.equal(slowsOnly.outcome,null,'five slows without the wedge do not win');assert.equal(slowsOnly.missionStatus().activePhase,'vanguard');
 const wedgeOnly=new Simulation('l9-wedge',campaign.setup(9)),at=scripted(wedgeOnly),wlog=[];
 at(10,()=>wedge.forEach(id=>strike(wedgeOnly,'guardian',id)));
 play(wedgeOnly,12000,{towers:2,cast:{bash:true},leash:650,hold:{x:620,y:600},log:wlog});
 assert.equal(objective(wedgeOnly,'wedge').complete,true);assert.equal(objective(wedgeOnly,'slows').progress,0);
 assert.equal(wedgeOnly.outcome,null,'the wedge without any Charge does not win, however long the Guardian waits');
});
test('Level 9 cannot softlock: after either objective is done the other can still be completed, in any order',()=>{
 // Slows first, then the wedge.
 const a=new Simulation('l9-order-a',campaign.setup(9)),alog=[];
 play(a,9000,{towers:2,cast:{bash:true,charge:130},leash:650,hold:{x:620,y:600},log:alog,stop:s=>objective(s,'slows').complete});
 assert.equal(a.ended,false);assert.equal(objective(a,'wedge').progress,0);
 play(a,12000,{towers:2,cast:{bash:true},targets:wedge,gate:threat(520),log:alog});won(a);assert.ok(keepHp(a)>=1500);assert.equal(ends(alog).length,1);
 // The wedge first (played, striking at once), then the slows.
 const b=new Simulation('l9-order-b',campaign.setup(9)),blog=[];
 play(b,12000,{towers:2,cast:{bash:true},targets:wedge,gate:threat(520),log:blog,stop:s=>objective(s,'wedge').complete});
 assert.equal(b.ended,false);assert.equal(objective(b,'slows').complete,false);
 play(b,16000,{towers:2,cast:{bash:true,charge:130},leash:650,hold:{x:620,y:600},log:blog});won(b);assert.ok(keepHp(b)>=1500);assert.equal(ends(blog).length,1);
 // The wedge in a different order: south tower first.
 const c=new Simulation('l9-order-c',campaign.setup(9));
 play(c,12000,{...V.hybrid,targets:[wedge[2],wedge[1],wedge[0]]});won(c);between(c,100,200);
 // Scripted: the wedge is down before the first raider and the last slow completes the mission on its own tick.
 const d=new Simulation('l9-early',campaign.setup(9)),dat=scripted(d),dlog=[];
 dat(10,()=>wedge.forEach(id=>strike(d,'guardian',id)));until(d,60,dlog);
 assert.equal(d.ended,false,'the wedge down early does not win');assert.deepEqual(d.missionStatus().objectives.map(o=>[o.id,o.progress]),[['slows',0],['wedge',3]]);
 play(d,12000,{towers:2,cast:{bash:true,charge:130},leash:650,hold:{x:620,y:600},log:dlog});won(d);assert.equal(objective(d,'slows').progress,5);
 assert.equal(d.outcome.tick,slowsOn(dlog).at(4).at,'victory lands on the fifth slow');
});
test('Level 9 is won in 100-200 s by striking and returning home, with the Keep held and only the wedge broken, whatever the reaction delay',()=>{
 for(const [kind,policy] of [['hybrid',V.hybrid],['late hybrid',V.lateHybrid],['no towers',V.noTowers]])for(const d of [0,3,7]){
  const sim=delayed(new Simulation(`l9-${kind}-${d}`,campaign.setup(9)),d),log=[],tag=`${kind}, delay ${d}s`;
  play(sim,16200,{...policy,log});
  if(kind==='no towers'&&!sim.outcome?.outcome)continue; // see the next test: without towers the Keep may fall
  if(sim.outcome.outcome==='defeat'){assert.equal(kind,'no towers',tag);lostAtHalf(sim);continue;}
  won(sim);between(sim,100,200);assert.ok(keepHp(sim)>=1500,`${tag}: Keep ${keepHp(sim)}`);
  assert.deepEqual(sim.missionStatus().completedPhases,['vanguard'],tag);assert.equal(ends(log).length,1);
  assert.deepEqual(log.filter(e=>e.type==='death'&&e.id.startsWith('red-tower')).map(e=>e.id).sort(),[...wedge].sort(),`${tag}: exactly the wedge fell`);
  assert.ok(Object.values(sim.state.structures).every(b=>b.team==='blue'),`${tag}: no other Crimson tower stood`);
  assert.equal(log.filter(e=>e.type==='spawn'&&e.id.startsWith('blue-w')).length,0,`${tag}: no allied reinforcement`);
 }
});
test('Level 9: slower players who keep returning home still win, within 240 s and with the Keep held',()=>{
 for(const [kind,policy] of [['slow 33%',V.slow33],['slow 50%',V.slow50]]){
  const sim=new Simulation(`l9-${kind}`,campaign.setup(9)),log=[];play(sim,16200,{...policy,log});
  won(sim);between(sim,100,240);assert.ok(keepHp(sim)>=1500,`${kind}: Keep ${keepHp(sim)}`);assert.equal(ends(log).length,1);
 }
});
test('Level 9: rushing without a return, idle play and towers without the Guardian lose; a Guardian who never fights beyond the Ford never wins',()=>{
 for(const d of [0,3,7]){const rush=delayed(new Simulation(`l9-rush-${d}`,campaign.setup(9)),d);play(rush,16200,{targets:wedge,...east,cast:{bash:true,charge:130}});lostAtHalf(rush);assert.ok(rush.outcome.tick<=90*HZ);}
 const idle=new Simulation('l9-idle',campaign.setup(9));play(idle,6000,{park:true});lostAtHalf(idle);
 const parked=new Simulation('l9-parked',campaign.setup(9));play(parked,9000,{towers:2,park:true});lostAtHalf(parked);
 const home=new Simulation('l9-home',campaign.setup(9));play(home,16000,{towers:2,leash:650,hold:{x:620,y:600},cast:{bash:true,charge:130}});
 assert.equal(home.outcome,null,'still being played after 8.9 minutes');assert.equal(objective(home,'wedge').progress,0);
});
test('Level 9: without Vanguard Charge the mission never completes, however long the Guardian fights, and learning it later recovers',()=>{
 const sim=new Simulation('l9-nocharge',campaign.setup(9)),log=[];
 play(sim,12000,{...V.hybrid,cast:{bash:true},log});
 assert.equal(sim.outcome,null,'still being played after 6.7 minutes');assert.equal(objective(sim,'wedge').complete,true);assert.equal(objective(sim,'slows').progress,0);
 assert.ok(sim.state.heroProgression.ranks.charge>=1,'the bot learned Charge but never cast it');
 play(sim,16000,{...V.hybrid,log});won(sim);assert.equal(objective(sim,'slows').progress,5);
});
test('Level 9: exactly 50% Azure Keep HP holds, anything below loses',()=>halfBoundary(9,'red-base'));

// Level 10 — The Crimson Keep
const G={
 hybrid:{towers:2,targets:[...gate,'red-base'],gate:s=>threat(520)(s)||standing(s)<2},
 quick:{towers:2,targets:[...gate,'red-base'],gate:threat(520)},
};
const gatesPhase=s=>s.missionStatus().activePhase==='gates';
test('Level 10: registered as The Crimson Keep with display text, a read-only definition and a fresh setup every time',()=>{
 const l=campaign.byNumber(10);assert.equal(l,campaign.get('campaign-10'));assert.deepEqual([l.chapter,l.display.difficulty,l.display.title],[1,'standard','The Crimson Keep']);
 assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l)&&Object.isFrozen(l.mission.phases));
 assert.match(l.display.briefing,/below 50%/);
 const a=campaign.setup(10),fresh=JSON.stringify(a);a.start.wood=0;a.encounter.defenders.forEach(d=>d.x=0);a.waveRules.enemyPerWave[0]=99;a.mission.phases[1].objectives[0].targets.push('x');
 assert.equal(JSON.stringify(campaign.setup(10)),fresh);const b=campaign.setup(10);until(new Simulation('leak',b),900);assert.equal(JSON.stringify(b),fresh);
});
test('Level 10: the front-center and gate towers, an armed Crimson Keep, waves of 3 to 7, one ally per wave, the default start and two phases',()=>{
 const setup=campaign.setup(10),sim=new Simulation('l10',setup),s=sim.state;
 assert.deepEqual(level(10).match,{encounter:'extended',overrides:{waves:{firstWaveTick:300,waveInterval:750,enemyPerWave:[3,4,4,5,5,6,6,7],alliedPerWave:1},defenders:[T('front-center'),...gate],crimsonKeepArmed:true}});
 assert.deepEqual(Object.values(s.structures).map(b=>b.id).sort(),[T('front-center'),...gate].sort());
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,180,30,1],'the Stage 1 start');assert.equal(setup.shop,true);
 assert.ok(s.bases['red-base'].damage>0&&s.bases['red-base'].range>0,'the Crimson Keep is armed');assert.ok(setup.keepDefense.red);
 assert.deepEqual(setup.mission.failure,{azureKeepHpBelow:.5});assert.equal(setup.mission.waveMode,'until-objectives');assert.deepEqual(setup.mission.phases.map(p=>p.id),['gates','siege']);
 assert.deepEqual(rows(sim),[['towers','structures-completed',2,true,'Build 2 Archer Towers'],['gate','destroy',2,true,'Destroy the 2 gate towers'],['keep','destroy',1,false,'Destroy the Crimson Keep']]);
 assert.deepEqual(setup.mission.phases[0].objectives[1].targets,gate,'only the two gate towers are required');assert.deepEqual(setup.mission.phases[1].objectives[0].targets,['red-base']);
 assert.deepEqual(ticksOf(sim,8),[300,1050,1800,2550,3300,4050,4800,5550]);assert.deepEqual(redPerWave(setup,10),[3,4,4,5,5,6,6,7,7,7]);
 assert.deepEqual(Array.from({length:8},(_,i)=>setup.encounter.spawns.filter(e=>e.team==='blue'&&e.wave===i+1).length),[1,1,1,1,1,1,1,1],'one allied minion per wave');
 const v=missionPanelView(level(10),sim.missionStatus(),{blue:s.bases['blue-base'],red:s.bases['red-base']});
 assert.equal(v.heading,'Build 2 Archer Towers');assert.deepEqual(v.rows.map(r=>[r.label,r.progress,r.target,r.state]),[['Build 2 Archer Towers',0,2,'active'],['Destroy the 2 gate towers',0,2,'active'],['Destroy the Crimson Keep',0,1,'locked']]);
});
test('Level 10 is won in 120-260 s: two towers at home, the gate towers, then the Crimson Keep, with the Azure Keep held',()=>{
 for(const [kind,policy] of [['hybrid',G.hybrid],['quick',G.quick]])for(const d of [0,3,7]){
  const sim=delayed(new Simulation(`l10-${kind}-${d}`,campaign.setup(10)),d),log=[],tag=`${kind}, delay ${d}s`;
  play(sim,16200,{...policy,cast:{bash:true},log});
  won(sim);between(sim,120,260);assert.ok(keepHp(sim)>=1500,`${tag}: Keep ${keepHp(sim)}`);assert.deepEqual(sim.missionStatus().completedPhases,['gates','siege'],tag);
  assert.equal(sim.state.bases['red-base'].hp,0,`${tag}: the Crimson Keep fell`);assert.equal(ends(log).length,1);
  assert.equal(sim.outcome.reason,'objectives-complete','a mission win, not the legacy Keep outcome');
  assert.ok(log.filter(e=>e.type==='construction-complete').length>=2,`${tag}: two towers built`);
 }
});
test('Level 10 cannot skip the gate objectives: the Crimson Keep falling first, or one requirement alone, does not win',()=>{
 // The Crimson Keep destroyed at tick 10: the match goes on, the siege is credited only once the gates phase ends.
 const k=new Simulation('l10-keep-first',campaign.setup(10)),at=scripted(k),log=[];
 at(10,()=>strike(k,'guardian','red-base'));until(k,300,log);
 assert.equal(k.state.bases['red-base'].hp,0);assert.equal(k.ended,false,'the Crimson Keep falling does not end the match');assert.equal(k.outcome,null);
 assert.equal(k.missionStatus().activePhase,'gates');assert.deepEqual(rows(k).map(r=>r[3]),[true,true,false]);assert.equal(objective(k,'keep').progress,0,'the locked row stays at 0');
 assert.equal(ends(log).length,0);
 play(k,12000,{...G.quick,targets:gate,cast:{bash:true},log});
 won(k);assert.deepEqual(k.missionStatus().completedPhases,['gates','siege']);assert.ok(keepHp(k)>=1500);
 // Both gate towers down at tick 10, no towers built: still the gates phase.
 const g=new Simulation('l10-gates-only',campaign.setup(10)),gat=scripted(g);
 gat(10,()=>gate.forEach(id=>strike(g,'guardian',id)));until(g,900);
 assert.equal(g.ended,false);assert.equal(g.missionStatus().activePhase,'gates');assert.deepEqual([objective(g,'gate').complete,objective(g,'towers').progress,objective(g,'keep').progress],[true,0,0]);
 // One tower built is not two: the phase stays open until the second completes (then it hands over).
 const tg=new Simulation('l10-one-tower',campaign.setup(10)),tat=scripted(tg),tlog=[];
 tat(10,()=>gate.forEach(id=>strike(tg,'guardian',id)));
 tg.send({type:'place',requestId:'a',kind:'tower',col:12,row:10});until(tg,200,tlog);
 assert.deepEqual([objective(tg,'towers').progress,tg.missionStatus().activePhase],[1,'gates']);
 // Two towers, gate standing: also open.
 const t2=new Simulation('l10-towers-only',campaign.setup(10));play(t2,3000,{towers:2,park:true});
 assert.equal(t2.missionStatus().activePhase,'gates');assert.equal(objective(t2,'towers').complete,true);assert.equal(objective(t2,'gate').progress,0);assert.equal(t2.outcome?.outcome,undefined);
});
test('Level 10: the Crimson Keep is armed and shoots a Guardian who walks up to it; in Level 9 it is inert',()=>{
 for(const [n,armed,towers] of [[10,true,[T('front-center'),...gate]],[9,false,wedge]]){
  const sim=new Simulation(`keep-${n}`,campaign.setup(n)),at=scripted(sim),b=sim.state.bases['red-base'],log=[];
  at(10,()=>towers.forEach(id=>strike(sim,'guardian',id))); // scripted: clear the towers so only the Keep can fire
  play(sim,6000,{targets:['red-base'],gate:()=>false,log,stop:s=>Math.hypot(s.hero.x-b.x,s.hero.y-b.y)<b.range+b.radius-20});
  until(sim,sim.clock.tick+120,log);
  const hits=log.filter(e=>e.type==='damage'&&e.sourceId==='red-base'&&e.id==='guardian');
  assert.equal(hits.length>0,armed,`Level ${n}: the Crimson Keep ${armed?'shoots':'does not shoot'} the Guardian`);
  assert.equal(sim.state.bases['red-base'].damage>0,armed);
 }
});
test('Level 10: idle play, towers without the Guardian and a rush all lose; the Guardian who stays home never wins',()=>{
 const idle=new Simulation('l10-idle',campaign.setup(10));play(idle,6000,{park:true});lostAtHalf(idle);
 const parked=new Simulation('l10-parked',campaign.setup(10));play(parked,9000,{towers:2,park:true});lostAtHalf(parked);
 const rush=new Simulation('l10-rush',campaign.setup(10));play(rush,16200,{targets:[...gate,'red-base'],...east,cast:{bash:true}});lostAtHalf(rush);assert.ok(rush.outcome.tick<=120*HZ);
 const home=new Simulation('l10-home',campaign.setup(10));play(home,16000,{towers:2,leash:650,hold:{x:620,y:600},cast:{bash:true}});
 assert.equal(home.outcome,null);assert.equal(home.missionStatus().activePhase,'gates');assert.equal(objective(home,'towers').complete,true);
});
test('Level 10: attacking the Crimson Keep before the gates is possible but still needs the gates and both towers, with no softlock',()=>{
 const sim=new Simulation('l10-keepfirst',campaign.setup(10)),log=[];
 play(sim,16200,{towers:2,targets:['red-base',...gate],gate:threat(520),cast:{bash:true},log});
 won(sim);assert.ok(keepHp(sim)>=1500);assert.deepEqual(sim.missionStatus().completedPhases,['gates','siege']);assert.equal(ends(log).length,1);
});
test('Level 10: exactly 50% Azure Keep HP holds, anything below loses',()=>halfBoundary(10,T('front-center')));

// Determinism
test('Levels 9 and 10 replay identically from the same seed and inputs, alone or interleaved',()=>{
 const runs={9:V.hybrid,10:{...G.hybrid,cast:{bash:true}}};
 const once=n=>{const sim=new Simulation('det',campaign.setup(n)),log=[];play(sim,16200,{...runs[n],log});return {tick:sim.clock.tick,outcome:sim.outcome,hash:finalHash(sim,log)};};
 const a=[9,10].map(once),b=[10,9].map(once).reverse();assert.deepEqual(b,a);
 assert.equal(new Set(a.map(x=>x.hash)).size,2);for(const r of a)assert.equal(r.outcome.outcome,'victory');
});

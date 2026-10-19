const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup,guardianSpawn}=require('../.test-build/data/matchSetup.js');
const {extendedRules,extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {blocked}=require('../.test-build/simulation/Collision.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
// Stage 2 S4: Campaign Levels 2-4 (Fortify the Crossing, Strike the Outpost, The Broken Line), run as real matches.
// Players are command drivers (move, attack, target, place, learn) with real movement and combat. Scripted strikes (marked "scripted") run
// inside Simulation.step and call the Simulation's own damage path directly; they are used only for edge cases that are impractical to play
// (an early kill, an exact Keep HP), and every damage, death, XP and mission event they cause is the authoritative in-match event.
const DT=1000/30+.01,HZ=30;
function scripted(sim){
 const plan=new Map(),r=sim.rewards,expire=r.expire.bind(r);
 r.expire=t=>{expire(t);for(const f of plan.get(t)??[])f(t);};
 return (tick,f)=>plan.set(tick,[...(plan.get(tick)??[]),f]);
}
const entity=(sim,id)=>sim.state.units[id]??sim.state.structures[id]??sim.state.bases[id];
function strike(sim,sourceId,targetId,amount){const s=entity(sim,sourceId),t=entity(sim,targetId);assert.ok(s&&t,`${sourceId} -> ${targetId}`);t.protectionTick=0;sim.hit(s,t,amount??t.hp+1e6,'direct');}
function until(sim,tick,log=[],before){while(sim.clock.tick<tick&&!sim.ended){before?.(sim.clock.tick+1);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;}
const objective=(sim,id)=>sim.missionStatus().objectives.find(o=>o.id===id);
const level=n=>campaignLevels.find(l=>l.number===n);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CELLS=[[12,10],[12,14],[9,9],[9,15],[13,12],[11,8]];
const done=sim=>JSON.stringify(sim.outcome);

// Grid path (8 px, 8 neighbours) around the river, terrain and structures, as a list of waypoints.
function route(sim,to){
 const G=8,st=combatStructures(sim.state),h=sim.hero,k=(x,y)=>x+','+y,sx=Math.round(h.x/G)*G,sy=Math.round(h.y/G)*G,tx=Math.round(to.x/G)*G,ty=Math.round(to.y/G)*G;
 const prev=new Map([[k(sx,sy),null]]),q=[[sx,sy]];
 for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty)break;for(const [dx,dy] of [[G,0],[-G,0],[0,G],[0,-G],[G,G],[G,-G],[-G,G],[-G,-G]]){const nx=x+dx,ny=y+dy;if(prev.has(k(nx,ny))||blocked(nx,ny,21,st))continue;prev.set(k(nx,ny),[x,y]);q.push([nx,ny]);}}
 assert.ok(prev.has(k(tx,ty)),`a walkable route exists to ${tx},${ty}`);
 const path=[];for(let c=[tx,ty];c;c=prev.get(k(c[0],c[1])))path.unshift({x:c[0],y:c[1]});
 return path.filter((p,i)=>i%3===0||i===path.length-1);
}
// A player: builds up to `towers` Archer Towers, defends near the Azure Keep while gate(sim) holds, then walks to each target tower and
// attacks it from the west. Learns one rank of each skill as points arrive. Returns the event log.
function play(sim,maxTicks,{towers=0,leash=420,hold={x:540,y:600},gate=()=>false,targets=[],park=false,log=[]}={}){
 const s=sim.state,h=sim.hero;let n=0,path=null,wi=0,goalFor=null;
 if(park)sim.teleportHero(250,1050);
 while(!sim.ended&&sim.clock.tick<maxTicks){
  const t=sim.clock.tick,p=s.heroProgression;
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(towers&&t%15===0&&s.wood>=80&&s.iron>=10&&Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length<towers){const c=CELLS.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)sim.send({type:'place',requestId:'p'+(++n),kind:'tower',col:c[0],row:c[1]});}
  const next=targets.map(id=>s.structures[id]).find(x=>x&&x.hp>0);
  if(!park&&h.hp>0){
   if(!next||gate(sim)){
    const foe=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0&&dist(u,{x:330,y:600})<leash).sort((a,b)=>dist(a,h)-dist(b,h))[0],goal=foe??hold,d=dist(goal,h);
    sim.send({type:'move',...(d>(foe?70:30)?{x:(goal.x-h.x)/d,y:(goal.y-h.y)/d}:{x:0,y:0})});sim.send({type:'attack'});path=null;
   }else{
    if(goalFor!==next.id||!path){goalFor=next.id;path=route(sim,{x:next.x-75,y:next.y});wi=0;}
    const goal=wi<path.length?path[wi]:{x:next.x-75,y:next.y};if(wi<path.length&&dist(h,goal)<14)wi++;
    const d=dist(goal,h),k=Math.min(1,d/(280/HZ))/(d||1);
    sim.send({type:'target',id:next.id});sim.send({type:'attack'});sim.send({type:'move',...(d>1?{x:(goal.x-h.x)*k,y:(goal.y-h.y)*k}:{x:0,y:0})});
   }
  }
  if(h.hp<=0)path=null;
  sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});
 }
 return log;
}
const standing=sim=>Object.values(sim.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower'&&sim.clock.tick>=b.completeTick).length;
const finalHash=(sim,log)=>createHash('sha256').update(JSON.stringify(log)).update(JSON.stringify(sim.state)).digest('hex');

// Registry
test('the registry holds Levels 1, 2, 3, 4, 5 and 20 in number order; Level 20 is not Level 6',()=>{
 assert.deepEqual(campaign.list().map(l=>[l.id,l.number,l.chapter,l.display.title,l.display.difficulty]),[
  ['campaign-01',1,1,'Hold the Ford','introductory'],['campaign-02',2,1,'Fortify the Crossing','introductory'],['campaign-03',3,1,'Strike the Outpost','standard'],
  ['campaign-04',4,1,'The Broken Line','standard'],['campaign-05',5,1,'Iron Bulwark','standard'],['campaign-20',20,2,'Full Battle','full-battle']]);
 assert.equal(campaign.has('campaign-06'),false);assert.throws(()=>campaign.byNumber(6),/Unknown campaign level number 6/);
 for(const n of [2,3,4]){const l=campaign.byNumber(n);assert.equal(campaign.get(`campaign-0${n}`),l);assert.ok(l.display.description&&l.display.briefing&&l.display.strategy);assert.ok(Object.isFrozen(l));}
 assert.equal(campaign.list().filter(l=>l.chapter===1).length,5,'the first chapter now holds five levels');
});
test('Levels 1, 5 and 20 are unchanged by the new levels',()=>{
 assert.deepEqual(level(1).match,{encounter:'extended',overrides:{waves:{firstWaveTick:240,waveInterval:750,enemyPerWave:[3,3,4,4,5]},crimsonKeepArmed:false,shop:false}});
 assert.deepEqual(level(1).mission,{waveMode:'scripted',phases:[{id:'hold',objectives:[{id:'waves',type:'waves-defeated',count:5,display:{label:'Defeat 5 Crimson waves'}}]}]});
 const battery=['red-tower-front-north','red-tower-rear-north','red-tower-keep-north'];
 assert.deepEqual(level(5).match,{encounter:'extended',overrides:{waves:{waveInterval:900,enemyPerWave:[3,4,4,5,5,6]},defenders:battery,crimsonKeepArmed:false}});
 assert.deepEqual(level(5).mission,{waveMode:'until-objectives',failure:{azureKeepHpBelow:.5},phases:[{id:'assault',objectives:[{id:'north-battery',type:'destroy',targets:battery,display:{label:'Destroy the North Battery'}}]}]});
 assert.deepEqual(level(20).match,{encounter:'extended'});assert.equal(level(20).mission,null);assert.deepEqual(campaign.setup(20),matchSetup('extended'));
});
test('every new setup is a fresh copy; Levels 2-4 share nothing with each other or the Stage 1 tables',()=>{
 const shared=JSON.stringify(extendedRules);
 for(const n of [2,3,4]){const a=campaign.setup(n),fresh=JSON.stringify(a);a.start.wood=0;a.encounter.defenders.forEach(d=>d.x=0);a.waveRules.enemyPerWave[0]=99;a.mission.phases[0].objectives[0].count=99;
  assert.equal(JSON.stringify(campaign.setup(n)),fresh,`level ${n}`);const b=campaign.setup(n);until(new Simulation('leak',b),900);assert.equal(JSON.stringify(b),fresh);}
 assert.equal(JSON.stringify(extendedRules),shared);
});

// Level 2 — Fortify the Crossing
test('Fortify the Crossing: Level 1 Guardian, Stage 1 resources, closed Shop, no Crimson structures, inert Crimson Keep',()=>{
 const setup=campaign.setup(2),sim=new Simulation('l2',setup),s=sim.state,h=sim.hero;
 assert.deepEqual([s.gold,s.wood,s.iron],[250,180,30]);assert.deepEqual([h.x,h.y],[guardianSpawn.x,guardianSpawn.y]);assert.equal(s.heroProgression.level,1);
 assert.equal(sim.shopAccessReason(),'Shop unavailable in this encounter');assert.equal(sim.constructionQuote('tower').available,true);
 assert.deepEqual(setup.encounter.defenders,[]);assert.deepEqual(Object.keys(s.structures),[]);assert.equal(setup.keepDefense.red,null);assert.deepEqual([s.bases['red-base'].damage,s.bases['red-base'].range],[0,0]);
 assert.deepEqual(setup.mission.phases.map(p=>[p.id,p.objectives.map(o=>[o.id,o.type,o.kind??null,o.count])]),[['fortify',[['towers','structures-completed','tower',3],['tower-damage','tower-damage',null,1200],['waves','waves-defeated',null,6]]]]);
 assert.equal(setup.mission.waveMode,'until-objectives');assert.equal(setup.mission.failure,undefined,'only the Azure Keep falling ends the match in defeat');
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.progress,o.target,o.active,o.display.label]),[['towers',0,3,true,'Complete 3 Archer Towers'],['tower-damage',0,1200,true,'Archer Towers deal 1200 damage'],['waves',0,6,true,'Defeat 6 Crimson waves']]);
});
test('Fortify the Crossing schedules waves of 4, 4, 5, 5, 6, 6 from 15 s every 24 s, then keeps sending six',()=>{
 const setup=campaign.setup(2),e=setup.encounter;
 assert.deepEqual(e.waves.map(w=>w.tick),[450,1170,1890,2610,3330,4050]);
 assert.deepEqual([1,2,3,4,5,6].map(n=>e.spawns.filter(x=>x.team==='red'&&x.wave===n).length),[4,4,5,5,6,6]);assert.equal(e.spawns.filter(x=>x.team==='red').length,30);
 assert.deepEqual(setup.waveRules.late,{firstWave:7,startCount:6,stepEveryWaves:1,cap:6});assert.equal(e.continuous,true);
 for(const n of [7,8,12])assert.equal(extendedWaveSpawns(n,setup.waveRules).filter(x=>x.team==='red').length,6,`wave ${n}`);
 // Played: the Guardian alone, no towers, so the mission never ends and the waves keep coming at the same cadence.
 const sim=new Simulation('l2-waves',setup),log=[];play(sim,9000,{leash:650,hold:{x:620,y:600},log});
 assert.equal(sim.ended,false);
 assert.deepEqual(log.filter(x=>x.type==='wave').map(x=>x.at).slice(0,8),[0,1,2,3,4,5,6,7].map(i=>450+720*i));
 const spawned=n=>log.filter(x=>x.type==='spawn'&&x.id.startsWith(`red-w${n}-`)).length;
 assert.deepEqual([1,2,3,4,5,6,7,8].map(spawned),[4,4,5,5,6,6,6,6]);
 assert.equal(objective(sim,'tower-damage').progress,0,'without towers there is no tower damage');assert.equal(objective(sim,'towers').progress,0);
});
test('Fortify the Crossing: an idle player loses to the Azure Keep falling',()=>{
 const sim=new Simulation('l2-idle',campaign.setup(2));const log=play(sim,6000,{park:true});
 assert.equal(sim.outcome.outcome,'defeat');assert.equal(sim.outcome.reason,'azure-keep-destroyed');assert.equal(sim.state.bases['blue-base'].hp,0);
 assert.deepEqual(log.filter(e=>e.type==='match-end').map(e=>e.outcome),['defeat']);assert.equal(objective(sim,'waves').progress,0);
});
test('Fortify the Crossing: the Guardian alone cannot win, however long it holds',()=>{
 const sim=new Simulation('l2-guardian',campaign.setup(2));play(sim,16000,{leash:650,hold:{x:620,y:600}});
 assert.equal(sim.outcome,null,'still being played after 8.9 minutes');assert.equal(sim.state.bases['blue-base'].hp,3000);
 assert.deepEqual([objective(sim,'towers').progress,objective(sim,'tower-damage').progress],[0,0]);assert.equal(objective(sim,'waves').complete,true,'the waves objective alone is not enough');
 assert.equal(sim.state.heroProgression.level>=10,true,'the Guardian grew strong and still could not finish without towers');
});
test('Fortify the Crossing is won by building three Archer Towers and holding beside them, in about two and a half minutes',()=>{
 const sim=new Simulation('l2-win',campaign.setup(2)),log=play(sim,6000,{towers:3});
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:sim.outcome.tick});assert.ok(sim.outcome.tick>=135*HZ&&sim.outcome.tick<=210*HZ,`${sim.outcome.tick/HZ}s`);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.progress,o.complete]),[['towers',3,true],['tower-damage',1200,true],['waves',6,true]]);
 assert.equal(log.filter(e=>e.type==='construction-complete').length>=3,true);assert.equal(sim.state.bases['blue-base'].hp,3000);
 const dealt=log.filter(e=>e.type==='damage'&&e.sourceId.startsWith('built-')&&e.id.startsWith('red-')).reduce((a,e)=>a+e.amount,0);assert.ok(dealt>=1200,`towers dealt ${dealt}`);
 assert.equal(log.filter(e=>e.type==='match-end').length,1);
});
test('Fortify the Crossing: two Archer Towers, even rebuilt as they fall, cannot hold six waves alone; three can',()=>{
 const sim=new Simulation('l2-two',campaign.setup(2));play(sim,9000,{towers:2,park:true});
 assert.equal(sim.outcome.reason,'azure-keep-destroyed');assert.ok(sim.outcome.tick>150*HZ,'they held for a while, then the line broke');
 const three=new Simulation('l2-three',campaign.setup(2));play(three,9000,{towers:3,park:true});
 assert.deepEqual(three.outcome,{outcome:'victory',reason:'objectives-complete',tick:three.outcome.tick},'three towers alone, with the Guardian parked, hold the line');
});
test('Fortify the Crossing: tower damage counts only what player Archer Towers do to Crimson units',()=>{
 const sim=new Simulation('l2-attr',campaign.setup(2)),at=scripted(sim),log=[];
 assert.equal(sim.send({type:'place',requestId:'t',kind:'tower',col:12,row:10}),true);
 at(1,()=>{for(const u of Object.values(sim.state.units))if(u.kind==='minion-blue')strike(sim,'red-base',u.id);});
 at(500,()=>{strike(sim,'guardian','red-w1-1',50);strike(sim,'blue-base','red-w1-2',30);});
 at(510,()=>strike(sim,'built-t','red-w1-0',100));
 at(520,()=>strike(sim,'built-t','red-w1-1',1000));
 until(sim,505,log);assert.equal(objective(sim,'tower-damage').progress,0,'Guardian and Keep damage are not tower damage');
 until(sim,515,log);assert.equal(objective(sim,'tower-damage').progress,100);
 until(sim,525,log);assert.equal(objective(sim,'tower-damage').progress,100+190,'overkill excluded: red-w1-1 had 190 HP left');
 assert.equal(log.filter(e=>e.type==='construction-complete').length,1);
});

// Level 3 — Strike the Outpost
test('Strike the Outpost: one Crimson tower, Shop open, a level-gated first phase, light waves',()=>{
 const setup=campaign.setup(3),sim=new Simulation('l3',setup),s=sim.state;
 assert.deepEqual(setup.encounter.defenders,extendedRules.towers.filter(t=>t.id==='red-tower-rear-south'),'exactly one defender: rear-south, off the lane and out of the allied minions\' way');
 assert.deepEqual(Object.values(s.structures).map(b=>[b.id,b.team,b.x,b.y,b.hp]),[['red-tower-rear-south','red',1512,744,650]]);
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,180,30,1]);assert.equal(setup.shop,true);assert.equal(setup.keepDefense.red,null);
 assert.deepEqual(setup.mission.phases.map(p=>[p.id,p.objectives.map(o=>[o.id,o.type])]),[['muster',[['level','guardian-level']]],['strike',[['outpost','destroy']]]]);
 assert.deepEqual(setup.mission.phases[0].objectives[0].level,3);assert.deepEqual(setup.mission.phases[1].objectives[0].targets,['red-tower-rear-south']);
 assert.equal(setup.mission.waveMode,'until-objectives');assert.equal(setup.mission.failure,undefined);
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick),[300,1200,2100,3000]);assert.deepEqual([1,2,3,4].map(n=>setup.encounter.spawns.filter(x=>x.team==='red'&&x.wave===n).length),[3,3,4,4]);
 assert.deepEqual(setup.waveRules.late,{firstWave:5,startCount:4,stepEveryWaves:1,cap:4});
 const st=sim.missionStatus();assert.deepEqual(st.objectives.map(o=>[o.id,o.active,o.complete,o.progress]),[['level',true,false,1],['outpost',false,false,0]],'the strike phase is locked until the muster phase completes');
 assert.equal(sim.shopPurchaseQuote('iron-sword').reason,'Return to Azure Keep');
});
test('Strike the Outpost: reaching level 3 unlocks the strike, and destroying the tower wins',()=>{
 const sim=new Simulation('l3-win',campaign.setup(3)),log=[];let unlocked=null;
 play(sim,4000,{targets:['red-tower-rear-south'],gate:s=>s.state.heroProgression.level<3,log});
 for(const e of log.filter(e=>e.type==='level-up'))if(e.level===3)unlocked=e.at;
 assert.ok(unlocked,'the Guardian reached level 3 by fighting waves');
 const kill=log.find(e=>e.type==='death'&&e.id==='red-tower-rear-south');assert.ok(kill&&kill.at>unlocked,'the tower fell after the Guardian reached level 3');
 assert.equal(kill.sourceId,'guardian');
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:kill.at});assert.deepEqual(sim.missionStatus().completedPhases,['muster','strike']);
 assert.ok(sim.outcome.tick<=140*HZ,`${sim.outcome.tick/HZ}s`);assert.ok(sim.state.bases['blue-base'].hp>1500);
});
test('Strike the Outpost: a tower destroyed early is credited the moment level 3 is reached (phase cascade)',()=>{
 const sim=new Simulation('l3-early',campaign.setup(3)),at=scripted(sim),log=[];
 at(10,()=>strike(sim,'guardian','red-tower-rear-south'));
 until(sim,200,log);assert.equal(sim.state.structures['red-tower-rear-south'],undefined);
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.active,o.complete,o.progress]),[['level',true,false,1],['outpost',false,false,0]],'destroyed, but the phase has not opened yet');
 assert.equal(sim.ended,false,'destroying the tower first does not win');
 // Raiders die to the Guardian until level 3: the match is won on the very tick the level arrives.
 until(sim,5000,log,()=>{if(sim.state.heroProgression.level<3){const r=Object.values(sim.state.units).find(u=>u.team==='red'&&u.hp>0);if(r)strike(sim,'guardian',r.id);}});
 const lvl3=log.find(e=>e.type==='level-up'&&e.level===3);assert.ok(lvl3);
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:lvl3.at});assert.deepEqual(sim.missionStatus().completedPhases,['muster','strike']);
});
test('Strike the Outpost: idle play loses; allied minions and a Guardian who never crosses cannot take the tower',()=>{
 const idle=new Simulation('l3-idle',campaign.setup(3));play(idle,6000,{park:true});
 assert.deepEqual([idle.outcome.outcome,idle.outcome.reason],['defeat','azure-keep-destroyed']);assert.equal(idle.state.structures['red-tower-rear-south'].hp,650,'allied minions never touched the outpost');
 // The Guardian defends for eight minutes, reaching level 3 and beyond, but never crosses the river.
 const home=new Simulation('l3-home',campaign.setup(3)),log=[];play(home,14400,{leash:650,hold:{x:620,y:600},log});
 assert.equal(home.outcome,null);assert.equal(home.state.heroProgression.level>=3,true);assert.equal(objective(home,'level').complete,true);
 const chip=home.state.structures['red-tower-rear-south'];assert.ok(chip&&chip.hp>=500,'allied waves only chip it (650 to about 600 in eight minutes): it takes the Guardian to destroy it');
 assert.ok(log.filter(e=>e.type==='damage'&&e.id==='red-tower-rear-south').every(e=>e.sourceId.startsWith('blue-')),'only allied minions touched it');assert.equal(objective(home,'outpost').complete,false);
});

// Level 4 — The Broken Line
test('The Broken Line: two south-battery defenders, a rebuild phase, then the break, and an Azure Keep minimum of half',()=>{
 const setup=campaign.setup(4),sim=new Simulation('l4',setup),s=sim.state;
 const south=['red-tower-front-south','red-tower-rear-south'];
 assert.deepEqual(setup.encounter.defenders,extendedRules.towers.filter(t=>south.includes(t.id)));assert.deepEqual(Object.values(s.structures).map(b=>[b.id,b.x,b.y,b.hp]),[['red-tower-front-south',1464,696,650],['red-tower-rear-south',1512,744,650]]);
 assert.deepEqual([s.gold,s.wood,s.iron,s.heroProgression.level],[250,180,30,1]);assert.equal(setup.shop,true);assert.equal(setup.keepDefense.red,null);
 assert.deepEqual(setup.mission.phases.map(p=>[p.id,p.objectives.map(o=>[o.id,o.type,o.kind??null,o.count??o.targets])]),[
  ['rebuild',[['towers','structures-standing','tower',2],['waves','waves-defeated',null,2]]],['break',[['south-battery','destroy',null,south]]]]);
 assert.deepEqual(setup.mission.failure,{azureKeepHpBelow:.5});assert.equal(setup.mission.waveMode,'until-objectives');
 assert.deepEqual(setup.encounter.waves.map(w=>w.tick),[300,1200,2100,3000,3900]);assert.deepEqual([1,2,3,4,5].map(n=>setup.encounter.spawns.filter(x=>x.team==='red'&&x.wave===n).length),[3,3,4,4,5]);
 assert.deepEqual(setup.waveRules.late,{firstWave:6,startCount:5,stepEveryWaves:1,cap:5});
 assert.deepEqual(sim.missionStatus().objectives.map(o=>[o.id,o.phaseId,o.active]),[['towers','rebuild',true],['waves','rebuild',true],['south-battery','break',false]]);
 assert.match(level(4).display.briefing,/below 50%/);
});
test('The Broken Line: exactly 50% Azure Keep HP holds, anything below loses',()=>{
 const sim=new Simulation('l4-half',campaign.setup(4)),at=scripted(sim);
 at(10,()=>strike(sim,'red-tower-front-south','blue-base',1500));at(40,()=>strike(sim,'red-tower-front-south','blue-base',1));
 until(sim,39);assert.equal(sim.state.bases['blue-base'].hp,1500);assert.equal(sim.ended,false);assert.equal(sim.missionStatus().status,'active','exactly 1,500 HP is safe');
 const log=until(sim,60);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:40});assert.equal(sim.state.match.result.alliedHp,1499,'1,499 HP is defeat');
 assert.equal(log.filter(e=>e.type==='match-end').length,1);
});
test('The Broken Line: an idle player loses to the 50% threshold before the Keep falls',()=>{
 const sim=new Simulation('l4-idle',campaign.setup(4));play(sim,6000,{park:true});
 assert.deepEqual([sim.outcome.outcome,sim.outcome.reason],['defeat','azure-keep-hp-threshold']);
 const hp=sim.state.match.result.alliedHp;assert.ok(hp<1500&&hp>0,`the Keep stood at ${hp} HP`);
});
test('The Broken Line is won by building two towers, holding two waves, then breaking both battery towers',()=>{
 const sim=new Simulation('l4-win',campaign.setup(4)),log=[],south=['red-tower-front-south','red-tower-rear-south'],seen=[];
 play(sim,5000,{towers:2,targets:south,gate:s=>standing(s)<2||s.mission.wavesDefeated<2,log});
 for(const e of log.filter(e=>e.type==='death'&&e.id.startsWith('red-tower')))seen.push([e.id,e.at]);
 const rebuilt=Math.max(...log.filter(e=>e.type==='construction-complete'&&e.id.startsWith('built-')).slice(0,2).map(e=>e.at));
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:Math.max(...seen.map(x=>x[1]))});
 assert.deepEqual(sim.missionStatus().completedPhases,['rebuild','break']);assert.equal(standing(sim)>=2,true);
 assert.deepEqual(seen.map(x=>x[0]).sort(),south);assert.ok(seen.every(x=>x[1]>rebuilt),'both towers fell after the rebuild was finished');
 assert.ok(sim.outcome.tick<=180*HZ,`${sim.outcome.tick/HZ}s`);assert.ok(sim.state.match.result.alliedHp>1500);
});
test('The Broken Line: destroying both battery towers without the rebuild does not win',()=>{
 const sim=new Simulation('l4-rush',campaign.setup(4)),log=[],south=['red-tower-front-south','red-tower-rear-south'];
 play(sim,5400,{targets:south,log});
 assert.deepEqual(log.filter(e=>e.type==='death'&&e.id.startsWith('red-tower')).map(e=>e.id).sort(),south,'both towers fell to the Guardian');
 assert.equal(sim.outcome,null,'but with no towers raised and no waves held it is not a victory');
 const st=sim.missionStatus();assert.deepEqual([st.activePhase,objective(sim,'towers').progress,objective(sim,'south-battery').active],['rebuild',0,false]);
 // Built afterwards, the same two towers plus two held waves complete the mission on the tick the last condition is met.
 const late=new Simulation('l4-late',campaign.setup(4)),at=scripted(late),lg=[];at(20,()=>south.forEach(id=>strike(late,'guardian',id)));
 play(late,5000,{towers:2,log:lg});
 const built=lg.filter(e=>e.type==='construction-complete'&&e.id.startsWith('built-')).slice(0,2).map(e=>e.at),wavesDone=late.mission.wavesDefeated;
 assert.equal(late.outcome.outcome,'victory');assert.ok(late.outcome.tick>=Math.max(...built));assert.equal(wavesDone>=2,true);assert.deepEqual(late.missionStatus().completedPhases,['rebuild','break']);
});
test('The Broken Line: a tower still under construction is not yet standing, so it does not count toward the rebuild',()=>{
 const sim=new Simulation('l4-stand',campaign.setup(4)),log=[];
 assert.equal(sim.send({type:'place',requestId:'a',kind:'tower',col:12,row:10}),true);
 until(sim,100,log);assert.equal(objective(sim,'towers').progress,0,'still being built');
 until(sim,200,log);assert.equal(objective(sim,'towers').progress,1);
});

// Determinism
test('Levels 2, 3 and 4 replay identically from the same seed and inputs, alone or interleaved',()=>{
 const runs={2:{towers:3},3:{targets:['red-tower-rear-south'],gate:s=>s.state.heroProgression.level<3},4:{towers:2,targets:['red-tower-front-south','red-tower-rear-south'],gate:s=>standing(s)<2||s.mission.wavesDefeated<2}};
 const once=n=>{const sim=new Simulation('det',campaign.setup(n)),log=[];play(sim,6000,{...runs[n],log});return {tick:sim.clock.tick,outcome:sim.outcome,hash:finalHash(sim,log)};};
 const a=[2,3,4].map(once),b=[2,3,4].map(once);assert.deepEqual(b,a);
 assert.equal(new Set(a.map(x=>x.hash)).size,3);for(const r of a)assert.equal(r.outcome.outcome,'victory');
 const c=[4,2,3,2].map(once);assert.deepEqual([c[1],c[2],c[0]],a,'running other levels between does not change a level');assert.deepEqual(c[3],a[0]);
});

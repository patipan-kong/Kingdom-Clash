const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {lateWaveCount}=require('../.test-build/data/gameplayV04.js');
// Stage 2 S1: mission objectives evaluated inside real matches. Scripted effects run through a hook inside Simulation.step (after the
// tick's status expiry, before burns and commands) and use the Simulation's own damage path, so every death, shield and status below is
// an authoritative in-match event observed exactly as gameplay would produce it.
const DT=1000/30+.01;
function scripted(sim){
 const plan=new Map(),r=sim.rewards,expire=r.expire.bind(r);
 r.expire=t=>{expire(t);for(const f of plan.get(t)??[])f(t);};
 return (tick,f)=>plan.set(tick,[...(plan.get(tick)??[]),f]);
}
const entity=(sim,id)=>sim.state.units[id]??sim.state.structures[id]??sim.state.bases[id];
function strike(sim,sourceId,targetId,amount,type='direct'){
 const s=entity(sim,sourceId),t=entity(sim,targetId);assert.ok(s&&t,`${sourceId} -> ${targetId}`);t.protectionTick=0;sim.hit(s,t,amount??t.hp+1e6,type);
}
// Advances until the clock reaches `tick` (or the match ends); before(tick) runs before each advance with the tick about to be stepped.
function until(sim,tick,log=[],before){while(sim.clock.tick<tick&&!sim.ended){before?.(sim.clock.tick+1);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;}
const objective=(sim,id)=>sim.missionStatus().objectives.find(o=>o.id===id);
const progress=(sim,...ids)=>ids.map(id=>{const o=objective(sim,id);return [o.progress,o.complete];});
const ends=log=>log.filter(e=>e.type==='match-end');
const quiet=(o={})=>matchSetup('extended',{defenders:[],crimsonKeepArmed:false,start:{wood:3000,iron:400},...o});
const clearAllies=(sim,at)=>at(1,()=>{for(const u of Object.values(sim.state.units))if(u.kind==='minion-blue')strike(sim,'red-base',u.id);});
const towerCells=(sim,n,kind='tower')=>{const out=[];for(let col=4;col<15&&out.length<n;col+=2)for(let row=8;row<17&&out.length<n;row+=2)if(sim.placementReason(kind,col,row)==='')out.push([col,row]);assert.equal(out.length,n);return out;};
const place=(sim,id,[col,row],kind='tower')=>assert.equal(sim.send({type:'place',requestId:id,kind,col,row}),true);
const one=(id,objectives,extra={})=>({phases:[{id,objectives}],...extra});

test('objectives initialize with stable ids, targets, display metadata and the first phase active',()=>{
 const M={failure:{azureKeepHpBelow:.25},phases:[
  {id:'hold',display:{label:'Hold the line'},objectives:[{id:'lvl',type:'guardian-level',level:1,display:{label:'Reach LV 1',detail:'Already true'}},{id:'waves',type:'waves-defeated',count:2}]},
  {id:'push',objectives:[{id:'towers',type:'destroy',targets:['red-tower-front-north','red-tower-front-center']},{id:'keep',type:'destroy',targets:['red-base']}]}]};
 const setup=matchSetup('extended',{mission:M}),sim=new Simulation('m',setup),st=sim.missionStatus();
 assert.deepEqual({status:st.status,outcome:st.outcome,activePhase:st.activePhase,index:st.activePhaseIndex,completed:st.completedPhases},{status:'active',outcome:null,activePhase:'hold',index:0,completed:[]});
 assert.deepEqual(st.objectives.map(o=>[o.id,o.phaseId,o.type,o.progress,o.target,o.complete,o.active]),[
  ['lvl','hold','guardian-level',1,1,true,true],['waves','hold','waves-defeated',0,2,false,true],
  ['towers','push','destroy',0,2,false,false],['keep','push','destroy',0,1,false,false]]);
 assert.deepEqual(st.objectives[0].display,{label:'Reach LV 1',detail:'Already true'});assert.equal(st.objectives[1].display,undefined);
 assert.deepEqual(st.objectives[2].definition.targets,['red-tower-front-north','red-tower-front-center']);
 assert.ok(Object.isFrozen(st)&&Object.isFrozen(st.objectives[2].definition.targets),'status snapshots are read-only');
 M.phases[0].objectives[1].count=99;assert.equal(setup.mission.phases[0].objectives[1].count,2,'the setup holds its own copy');
 assert.equal(sim.outcome,null);
 const legacy=new Simulation('l','extended');assert.equal(legacy.missionStatus(),null);assert.equal(legacy.outcome,null);
 assert.equal(matchSetup('extended').mission,null);assert.equal(matchSetup('prototype').mission,null);
});

test('destroy counts each named Crimson structure once, ignores others and wins when the group is gone',()=>{
 const sim=new Simulation('d',matchSetup('extended',{defenders:['red-tower-front-north','red-tower-front-center','red-tower-rear-north'],crimsonKeepArmed:false,
  mission:one('p',[{id:'pair',type:'destroy',targets:['red-tower-front-north','red-tower-front-center']}])}));
 const at=scripted(sim),log=[];
 at(10,()=>strike(sim,'guardian','red-tower-front-north'));at(20,()=>strike(sim,'guardian','red-tower-rear-north'));at(30,()=>strike(sim,'guardian','red-tower-front-center'));
 until(sim,10,log);assert.deepEqual(progress(sim,'pair'),[[1,false]]);
 sim.mission.evaluate(sim.clock.tick,[{type:'death',id:'red-tower-front-north',sourceId:'guardian'}]);
 until(sim,20,log);assert.deepEqual(progress(sim,'pair'),[[1,false]],'a repeated death and a non-target tower add nothing');
 until(sim,40,log);
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:30});
 assert.deepEqual(ends(log),[{at:30,type:'match-end',outcome:'victory',tick:30}]);
 assert.equal(sim.missionStatus().status,'victory');assert.deepEqual(sim.missionStatus().completedPhases,['p']);
});

test('a wave is defeated only after it spawned and every Crimson member is gone, never by its timer',()=>{
 const sim=new Simulation('w',quiet({waves:{firstWaveTick:30,waveInterval:300,enemyPerWave:[2,3],alliedPerWave:0},mission:one('p',[{id:'w',type:'waves-defeated',count:2}],{waveMode:'scripted'})}));
 const at=scripted(sim),log=[];clearAllies(sim,at);
 at(40,()=>strike(sim,'guardian','red-w1-0'));at(60,()=>strike(sim,'guardian','red-w1-1'));
 at(360,()=>{strike(sim,'guardian','red-w2-0');strike(sim,'guardian','red-w2-1');});
 until(sim,45,log);assert.deepEqual(progress(sim,'w'),[[0,false]],'member red-w1-1 is still queued');
 until(sim,60,log);assert.deepEqual(progress(sim,'w'),[[1,false]]);assert.equal(sim.mission.wavesDefeated,1);
 until(sim,365,log);assert.ok(sim.spawnQueue.some(e=>e.id==='red-w2-2'));assert.deepEqual(progress(sim,'w'),[[1,false]],'queued member keeps wave 2 open');
 until(sim,1500,log);assert.ok(sim.state.units['red-w2-2']);assert.deepEqual(progress(sim,'w'),[[1,false]],'timer elapsed, survivor alive');
 assert.equal(objective(sim,'w').blocked,undefined);
 at(1501,()=>strike(sim,'guardian','red-w2-2'));until(sim,1510,log);
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:1501});
 assert.deepEqual(log.filter(e=>e.type==='wave').map(e=>[e.at,e.index]),[[30,1],[330,2]]);
});

test('construction counts finished player structures; standing counts only finished ones still alive',()=>{
 const sim=new Simulation('c',quiet({waves:{firstWaveTick:9000},mission:one('b',[{id:'done',type:'structures-completed',kind:'tower',count:3},{id:'up',type:'structures-standing',kind:'tower',count:3},{id:'walls',type:'structures-completed',kind:'wall',count:1}])}));
 const at=scripted(sim),cells=towerCells(sim,6),log=[];
 place(sim,'t1',cells[0]);place(sim,'t2',cells[1]);place(sim,'t3',cells[2]);place(sim,'w1',cells[3],'wall');
 at(100,()=>strike(sim,'red-base','built-t3'));at(200,()=>strike(sim,'red-base','built-t1'));
 until(sim,150,log);assert.deepEqual(progress(sim,'done','up','walls'),[[0,false],[0,false],[1,true]],'requests and unfinished towers do not count');
 until(sim,151,log);assert.deepEqual(progress(sim,'done','up'),[[2,false],[2,false]],'t3 died under construction');
 until(sim,201,log,t=>{if(t===201)place(sim,'t4',cells[4]);});assert.deepEqual(progress(sim,'done','up'),[[2,false],[1,false]],'destroyed towers are not standing');
 until(sim,360,log,t=>{if(t===360)place(sim,'t5',cells[5]);});assert.deepEqual(progress(sim,'done','up'),[[3,true],[2,false]]);
 until(sim,600,log);
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:sim.state.structures['built-t5'].completeTick},'won the tick t5 can first fire');
 assert.deepEqual(log.filter(e=>e.type==='construction-complete').map(e=>e.id),['built-w1','built-t1','built-t2','built-t4','built-t5']);
});

test('tower kills credit player-built Archer Towers only, once per Crimson minion',()=>{
 const sim=new Simulation('k',quiet({defenders:['red-tower-keep-rear'],waves:{firstWaveTick:180,waveInterval:900,enemyPerWave:[5],alliedPerWave:0},mission:one('p',[{id:'k',type:'tower-kills',count:2}],{waveMode:'scripted'})}));
 const at=scripted(sim),log=[],cells=towerCells(sim,2);place(sim,'t',cells[0]);place(sim,'w',cells[1],'wall');
 at(2,()=>{for(const id of ['blue-1','blue-2'])strike(sim,'red-base',id);});
 at(300,()=>{strike(sim,'guardian','red-w1-0');strike(sim,'blue-0','red-w1-1');strike(sim,'built-w','red-w1-2');strike(sim,'blue-base','red-w1-3');});
 at(301,()=>strike(sim,'built-t','red-w1-4'));
 until(sim,300,log);assert.deepEqual(progress(sim,'k'),[[0,false]],'Guardian, minion, wall and Keep kills are not tower kills');
 until(sim,301,log);assert.deepEqual(progress(sim,'k'),[[1,false]]);
 const kill=log.find(e=>e.type==='death'&&e.id==='red-w1-4');assert.equal(kill.sourceId,'built-t');
 sim.mission.evaluate(sim.clock.tick,[kill,kill]);assert.deepEqual(progress(sim,'k'),[[1,false]],'replayed events are not counted again');
 assert.equal(objective(sim,'k').blocked,'no-more-enemies','finite supply exhausted with one kill missing');
 assert.equal(sim.ended,false,'blocked objectives do not end or award anything');
 // Natural play: towers on the lane, production waves. Progress equals an independent count of tower kills in the event stream.
 const nat=new Simulation('n',matchSetup('extended',{start:{wood:3000,iron:400},mission:one('p',[{id:'k',type:'tower-kills',count:500}])})),cells2=[[13,11],[13,13],[12,9],[12,15]];
 cells2.forEach((c,i)=>place(nat,'n'+i,c));const natLog=until(nat,5000);
 const counted=natLog.filter(e=>e.type==='death'&&e.sourceId.startsWith('built-')&&e.id.startsWith('red-w')).length;
 assert.ok(counted>0,'towers killed something');assert.equal(objective(nat,'k').progress,counted);
});

test('tower damage credits HP that player Archer Towers remove from Crimson units, whoever lands the last hit',()=>{
 const sim=new Simulation('td',quiet({waves:{firstWaveTick:180,waveInterval:900,enemyPerWave:[3],alliedPerWave:0},mission:one('p',[{id:'d',type:'tower-damage',count:300}],{waveMode:'scripted'})}));
 const at=scripted(sim),log=[],cells=towerCells(sim,2);place(sim,'t',cells[0]);place(sim,'w',cells[1],'wall');clearAllies(sim,at);
 at(240,()=>{strike(sim,'guardian','red-w1-1',50);strike(sim,'built-w','red-w1-1',50);strike(sim,'blue-base','red-w1-2',30);strike(sim,'built-t','red-w1-0',100);});
 at(241,()=>strike(sim,'guardian','red-w1-0'));
 at(250,()=>strike(sim,'built-t','red-w1-1',1000));
 until(sim,240,log);assert.deepEqual(progress(sim,'d'),[[100,false]],'Guardian, wall and Keep damage is not tower damage');
 until(sim,241,log);assert.equal(log.find(e=>e.type==='death'&&e.id==='red-w1-0').sourceId,'guardian');assert.deepEqual(progress(sim,'d'),[[100,false]],'the tower keeps its damage when the Guardian finishes the raider');
 until(sim,250,log);assert.deepEqual(progress(sim,'d'),[[240,false]],'overkill excluded: red-w1-1 had 140 HP left');
 assert.equal(objective(sim,'d').blocked,undefined,'red-w1-2 is still alive');
 at(260,()=>strike(sim,'guardian','red-w1-2'));until(sim,270,log);
 assert.deepEqual([objective(sim,'d').blocked,sim.ended],['no-more-enemies',false],'finite supply spent 60 short');
 // Natural play on production waves: progress equals an independent sum of tower damage in the event stream.
 const nat=new Simulation('n',matchSetup('extended',{start:{wood:3000,iron:400},mission:one('p',[{id:'d',type:'tower-damage',count:1e6}])}));
 [[13,11],[13,13],[12,9],[12,15]].forEach((c,i)=>place(nat,'n'+i,c));const natLog=until(nat,5000);
 const dealt=natLog.filter(e=>e.type==='damage'&&e.sourceId.startsWith('built-')&&e.id.startsWith('red-')).reduce((a,e)=>a+e.amount,0);
 assert.ok(dealt>0,'towers dealt damage');assert.equal(objective(nat,'d').progress,Math.floor(dealt));
 // Validation: with a finite supply the target cannot exceed the Crimson minions' total HP (towers never reach Crimson structures).
 assert.throws(()=>matchSetup('extended',{waves:{enemyPerWave:[2,2]},mission:{...one('p',[{id:'d',type:'tower-damage',count:961}]),waveMode:'scripted'}}),/961 tower damage but Crimson minions have only 960 HP/);
 assert.doesNotThrow(()=>matchSetup('extended',{waves:{enemyPerWave:[2,2]},mission:{...one('p',[{id:'d',type:'tower-damage',count:960}]),waveMode:'scripted'}}));
 assert.throws(()=>matchSetup('extended',{mission:one('p',[{id:'d',type:'tower-damage',count:0}])}),/Invalid mission/);
});

test('skill impact counts real stuns, taunts, slows, ally shields and absorbed damage, not button presses',()=>{
 const sim=new Simulation('s',quiet({waves:{firstWaveTick:30,waveInterval:900,enemyPerWave:[3],alliedPerWave:0},mission:one('p',[
  {id:'stun',type:'skill-impact',effect:'stun',count:1},{id:'taunt',type:'skill-impact',effect:'taunt',count:2},{id:'slow',type:'skill-impact',effect:'slow',count:1},
  {id:'grant',type:'skill-impact',effect:'shield-granted',count:1},{id:'absorb',type:'skill-impact',effect:'shield-absorbed',count:10}],{waveMode:'scripted'})}));
 Object.assign(sim.state.heroProgression,{level:6,skillPoints:4});const at=scripted(sim),log=[],h=sim.hero;
 for(const skill of ['bash','taunt','charge','zone'])sim.send({type:'learn',requestId:'l-'+skill,skill});
 at(2,()=>{for(const id of ['blue-1','blue-2'])strike(sim,'red-base',id);});
 until(sim,10,log,t=>{if(t===10)sim.send({type:'cast',requestId:'c0',skill:'bash'});});
 assert.ok(log.some(e=>e.type==='rejected'&&/No legal target/.test(e.reason)));assert.deepEqual(progress(sim,'stun'),[[0,false]],'a rejected cast is not an impact');
 const gather=()=>{['red-w1-0','red-w1-1','red-w1-2'].forEach((id,i)=>Object.assign(sim.state.units[id],{x:h.x+40,y:h.y-40+40*i}));};
 until(sim,100,log,t=>{if(t===100){gather();sim.send({type:'cast',requestId:'c1',skill:'bash',targetId:'red-w1-1'});}});
 until(sim,130,log);assert.deepEqual(progress(sim,'stun'),[[1,true]]);
 until(sim,150,log,t=>{if(t===150){gather();sim.send({type:'cast',requestId:'c2',skill:'taunt'});}});
 until(sim,170,log);assert.deepEqual(progress(sim,'taunt'),[[2,true]],'three taunted, capped at the target');
 until(sim,200,log,t=>{if(t===200){gather();const v=sim.state.units['red-w1-0'];sim.send({type:'cast',requestId:'c3',skill:'charge',direction:{x:v.x-h.x,y:v.y-h.y}});}});
 until(sim,240,log);assert.deepEqual(progress(sim,'slow'),[[1,true]]);
 until(sim,260,log,t=>{if(t===260){Object.assign(sim.state.units['blue-0'],{x:h.x-30,y:h.y});sim.send({type:'cast',requestId:'c4',skill:'zone'});}});
 until(sim,275,log);
 assert.deepEqual(log.filter(e=>e.type==='shield').map(e=>e.id).sort(),['blue-0','guardian']);assert.deepEqual(progress(sim,'grant'),[[1,true]],"the Guardian's own shield is not an ally shield");
 at(280,()=>strike(sim,'red-w1-2','blue-0',4,'physical'));at(281,()=>strike(sim,'red-w1-2','guardian',30,'physical'));
 until(sim,280,log);const absorbed=log.filter(e=>e.type==='damage'&&e.at===280).map(e=>[e.id,e.absorbed,e.amount]);
 assert.equal(absorbed.length,1);assert.ok(absorbed[0][1]>0&&absorbed[0][2]===0,'armor-mitigated hit fully absorbed');
 assert.deepEqual(progress(sim,'absorb'),[[Math.floor(absorbed[0][1]),false]]);
 until(sim,281,log);assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:281});
});

test('Guardian level and skill rank objectives, including ones already met when the match starts',()=>{
 const met=new Simulation('m',quiet({mission:one('p',[{id:'lvl',type:'guardian-level',level:1}])}));
 assert.deepEqual(progress(met,'lvl'),[[1,true]]);assert.equal(met.missionStatus().status,'active');
 const log=until(met,5);assert.deepEqual(met.outcome,{outcome:'victory',reason:'objectives-complete',tick:1});assert.equal(ends(log).length,1);
 const sim=new Simulation('p',quiet({waves:{firstWaveTick:30,waveInterval:900,enemyPerWave:[3],alliedPerWave:0},mission:one('p',[{id:'lvl',type:'guardian-level',level:2},{id:'bash',type:'skill-rank',skill:'bash',rank:1}],{waveMode:'scripted'})}));
 const at=scripted(sim);assert.deepEqual(progress(sim,'lvl','bash'),[[1,false],[0,false]]);
 until(sim,5,[],t=>{if(t===5)sim.send({type:'learn',requestId:'b1',skill:'bash'});});assert.deepEqual(progress(sim,'lvl','bash'),[[1,false],[1,true]]);
 at(100,()=>strike(sim,'guardian','red-w1-0'));at(110,()=>strike(sim,'guardian','red-w1-1'));
 until(sim,100);assert.equal(sim.state.heroProgression.level,1);until(sim,120);
 assert.equal(sim.state.heroProgression.level,2);assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:110});
});

test('phases activate in order; an inactive phase accumulates no counters; same-tick events stay with the finishing phase',()=>{
 const sim=new Simulation('ph',quiet({defenders:['red-tower-front-north','red-tower-front-center'],waves:{firstWaveTick:180,waveInterval:900,enemyPerWave:[5],alliedPerWave:0},mission:{waveMode:'scripted',phases:[
  {id:'A',objectives:[{id:'north',type:'destroy',targets:['red-tower-front-north']}]},
  {id:'B',objectives:[{id:'center',type:'destroy',targets:['red-tower-front-center']},{id:'kills',type:'tower-kills',count:2}]}]}}));
 const at=scripted(sim),cells=towerCells(sim,1);place(sim,'t',cells[0]);clearAllies(sim,at);
 at(160,()=>strike(sim,'guardian','red-tower-front-center'));at(240,()=>strike(sim,'built-t','red-w1-0'));
 at(250,()=>{strike(sim,'guardian','red-tower-front-north');strike(sim,'built-t','red-w1-1');});
 at(260,()=>strike(sim,'built-t','red-w1-2'));at(270,()=>strike(sim,'built-t','red-w1-3'));
 until(sim,240);let st=sim.missionStatus();
 assert.equal(st.activePhase,'A');assert.deepEqual(progress(sim,'center','kills'),[[0,false],[0,false]],'B is locked: nothing shown, nothing counted');
 until(sim,250);st=sim.missionStatus();
 assert.deepEqual([st.activePhase,st.activePhaseIndex,st.completedPhases],['B',1,['A']]);
 assert.deepEqual(progress(sim,'north','center','kills'),[[1,true],[1,true],[0,false]],'conditions count on activation; the same-tick kill belongs to A');
 until(sim,260);assert.deepEqual(progress(sim,'kills'),[[1,false]]);
 until(sim,300);assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:270});
 st=sim.missionStatus();assert.deepEqual([st.activePhase,st.activePhaseIndex,st.completedPhases],[null,2,['A','B']]);
});

test('same-tick victory and failure resolve as defeat; Azure Keep loss always loses; the Crimson Keep alone wins nothing',()=>{
 const make=(failure)=>{const sim=new Simulation('o',quiet({defenders:['red-tower-front-north'],waves:{firstWaveTick:9000},mission:one('p',[{id:'n',type:'destroy',targets:['red-tower-front-north']}],failure?{failure}:{})}));return [sim,scripted(sim)];};
 let [sim,at]=make({azureKeepHpBelow:.5});at(20,()=>{strike(sim,'guardian','red-tower-front-north');strike(sim,'red-base','blue-base',1600);});
 let log=until(sim,40);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:20});assert.equal(ends(log).length,1);
 assert.deepEqual(sim.state.match.result,{outcome:'defeat',tick:20,kills:0,gold:250,alliedHp:1400,enemyHp:3000});
 [sim,at]=make({azureKeepHpBelow:.5});at(20,()=>{strike(sim,'guardian','red-tower-front-north');strike(sim,'red-base','blue-base');});
 log=until(sim,40);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-destroyed',tick:20});
 [sim,at]=make({azureKeepHpBelow:.5});at(10,()=>strike(sim,'red-base','blue-base',1500));at(11,()=>strike(sim,'red-base','blue-base',1));
 until(sim,10);assert.equal(sim.ended,false,'exactly half is not below half');until(sim,20);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-hp-threshold',tick:11});
 [sim,at]=make();at(10,()=>strike(sim,'red-base','blue-base'));until(sim,20);assert.deepEqual(sim.outcome,{outcome:'defeat',reason:'azure-keep-destroyed',tick:10});
 [sim,at]=make();at(10,()=>strike(sim,'guardian','red-base'));log=until(sim,30);
 assert.equal(sim.ended,false,'not an objective here');assert.equal(ends(log).length,0);assert.equal(sim.state.bases['red-base'].hp,0);
});

test('a match ends exactly once and stays ended',()=>{
 const sim=new Simulation('x',quiet({defenders:['red-tower-front-north'],waves:{firstWaveTick:9000},mission:one('p',[{id:'n',type:'destroy',targets:['red-tower-front-north']}])}));
 const at=scripted(sim);at(5,()=>strike(sim,'guardian','red-tower-front-north'));at(6,()=>strike(sim,'red-base','blue-base'));
 const log=until(sim,5);const result=structuredClone(sim.state.match);
 sim.finish('defeat','azure-keep-destroyed',6);sim.setPaused(false);sim.setTimeScale(1);
 for(let i=0;i<60;i++){sim.advance(DT);log.push(...sim.drainEvents());}
 assert.equal(sim.clock.tick,5);assert.deepEqual(ends(log).map(e=>[e.outcome,e.tick]),[['victory',5]]);assert.deepEqual(sim.state.match,result);
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:5});assert.equal(sim.send({type:'attack'}),false);
 // Legacy matches: same single end, now with a reason.
 for(const [ids,outcome,reason] of [[['red-base'],'victory','crimson-keep-destroyed'],[['blue-base'],'defeat','azure-keep-destroyed'],[['red-base','blue-base'],'defeat','both-keeps-destroyed']]){
  const l=new Simulation('l','extended'),a=scripted(l);a(7,()=>ids.forEach(id=>strike(l,id==='red-base'?'guardian':'red-base',id)));
  const out=until(l,30);assert.deepEqual(l.outcome,{outcome,reason,tick:7},reason);assert.deepEqual(ends(out),[{at:7,type:'match-end',outcome,tick:7}]);
  assert.deepEqual(Object.keys(l.state.match.result),['outcome','tick','kills','gold','alliedHp','enemyHp']);assert.equal(l.missionStatus(),null);
 }
});

test('until-objectives keeps the cadence, repeats the final wave size and stops on the deciding tick',()=>{
 const waves={firstWaveTick:30,waveInterval:90,enemyPerWave:[1,2],alliedPerWave:0};
 const sim=new Simulation('u',quiet({waves,mission:one('p',[{id:'w',type:'waves-defeated',count:5}],{waveMode:'until-objectives'})}));
 const at=scripted(sim);clearAllies(sim,at);
 for(let t=2;t<1000;t++)at(t,()=>{for(const u of Object.values(sim.state.units))if(u.kind==='minion-red')strike(sim,'guardian',u.id);});
 const log=until(sim,1000);
 assert.deepEqual(log.filter(e=>e.type==='wave').map(e=>[e.at,e.index]),[[30,1],[120,2],[210,3],[300,4],[390,5]]);
 const sizes=[1,2,3,4,5].map(n=>log.filter(e=>e.type==='spawn'&&e.id.startsWith(`red-w${n}-`)).length);assert.deepEqual(sizes,[1,2,2,2,2]);
 assert.deepEqual(sim.outcome,{outcome:'victory',reason:'objectives-complete',tick:415});
 assert.equal(log.filter(e=>e.at>=415&&(e.type==='spawn'||e.type==='wave')).length,0);
 const rules=matchSetup('extended',{waves,mission:one('p',[{id:'w',type:'waves-defeated',count:5}],{waveMode:'until-objectives'})}).waveRules;
 for(let n=3;n<=40;n++)assert.equal(extendedWaveSpawns(n,rules).filter(e=>e.team==='red').length,2,'wave '+n);
 for(let n=13;n<=20;n++)assert.equal(extendedWaveSpawns(n,matchSetup('extended').waveRules).filter(e=>e.team==='red').length,lateWaveCount(n),'legacy late wave '+n);
 // The deciding tick adds no wave: wave 2 is due on tick 120, exactly when wave 1 falls.
 const run=mission=>{const s=new Simulation('d',quiet({waves,...mission&&{mission:one('p',[{id:'w',type:'waves-defeated',count:1}],{waveMode:'until-objectives'})}})),a=scripted(s);clearAllies(s,a);a(120,()=>strike(s,'guardian','red-w1-0'));return [s,until(s,121)];};
 const [s,l]=run(true),[,legacy]=run(false);
 assert.deepEqual(s.outcome,{outcome:'victory',reason:'objectives-complete',tick:120});assert.equal(s.state.spawnedWaves,1);assert.equal(l.filter(e=>e.type==='wave').length,1);
 assert.deepEqual(legacy.filter(e=>e.type==='wave').map(e=>[e.at,e.index]),[[30,1],[120,2]],'without the mission wave 2 arrives that tick');
});

test('invalid and impossible missions are rejected at setup',()=>{
 const bad=(o,m,re=/Invalid mission/)=>assert.throws(()=>matchSetup(o.id??'extended',{...o.setup,mission:m}),re,JSON.stringify(m));
 const finite={setup:{waves:{enemyPerWave:[2,2]}}},o1=o=>one('p',[o]);
 bad({},{phases:[]});bad({},{phases:[{id:'p',objectives:[]}]});
 bad({},{phases:[{id:'p',objectives:[{id:'a',type:'guardian-level',level:2},{id:'a',type:'guardian-level',level:3}]}]});
 bad({},{phases:[{id:'p',objectives:[{id:'p',type:'guardian-level',level:2}]}]});
 bad({},o1({id:'x',type:'teleport',count:1}));bad({},o1({id:'x',type:'waves-defeated',count:0}));bad({},o1({id:'x',type:'tower-kills',count:1.5}));
 bad({setup:{defenders:['red-tower-front-north']}},o1({id:'x',type:'destroy',targets:['red-tower-front-center']}));
 bad({id:'prototype'},o1({id:'x',type:'destroy',targets:['red-tower-front-north']}));
 bad({},o1({id:'x',type:'destroy',targets:['red-base','red-base']}));bad({},o1({id:'x',type:'destroy',targets:['red-base'],count:2}));
 bad({},o1({id:'x',type:'skill-rank',skill:'zone',rank:4}));bad({},o1({id:'x',type:'skill-rank',skill:'fireball',rank:1}));
 bad({},o1({id:'x',type:'guardian-level',level:21}));bad({},o1({id:'x',type:'skill-impact',effect:'heal',count:1}));
 bad({},o1({id:'x',type:'structures-standing',kind:'gate',count:1}));
 bad({},{...o1({id:'x',type:'guardian-level',level:2}),failure:{azureKeepHpBelow:1}});bad({},{...o1({id:'x',type:'guardian-level',level:2}),waveMode:'forever'});
 bad({id:'prototype'},{...o1({id:'x',type:'guardian-level',level:2}),waveMode:'until-objectives'});
 // Finite enemy supply: scripted waves (or the prototype) cannot provide more waves, kills or XP than they contain.
 bad(finite,{waveMode:'scripted',phases:[{id:'a',objectives:[{id:'x',type:'waves-defeated',count:2}]},{id:'b',objectives:[{id:'y',type:'waves-defeated',count:1}]}]},/3 defeated waves but only 2/);
 bad(finite,{...o1({id:'x',type:'tower-kills',count:5}),waveMode:'scripted'},/5 tower kills but only 4/);
 bad({id:'prototype'},o1({id:'x',type:'guardian-level',level:6}),/level 6 but at most/);
 bad({id:'prototype'},{phases:[{id:'p',objectives:[{id:'a',type:'skill-rank',skill:'bash',rank:3},{id:'b',type:'skill-rank',skill:'taunt',rank:1}]}]},/level|skill points/);
 // The same counts are fine when waves continue.
 for(const m of [o1({id:'x',type:'waves-defeated',count:40}),{...o1({id:'x',type:'tower-kills',count:200}),waveMode:'until-objectives'},o1({id:'x',type:'guardian-level',level:20})])assert.doesNotThrow(()=>matchSetup('extended',{waves:{enemyPerWave:[2,2]},mission:m}));
 assert.doesNotThrow(()=>matchSetup('extended',{...finite.setup,mission:{...o1({id:'x',type:'waves-defeated',count:2}),waveMode:'scripted'}}));
});

test('blocked objectives report a deterministic reason without awarding progress or ending the match',()=>{
 // Waves defeated before their phase opened are gone: the phase is blocked once the finite supply is spent.
 let sim=new Simulation('b',quiet({defenders:['red-tower-front-north'],waves:{firstWaveTick:30,waveInterval:900,enemyPerWave:[2],alliedPerWave:0},mission:{waveMode:'scripted',phases:[{id:'A',objectives:[{id:'n',type:'destroy',targets:['red-tower-front-north']}]},{id:'B',objectives:[{id:'w',type:'waves-defeated',count:1}]}]}}));
 let at=scripted(sim);clearAllies(sim,at);at(100,()=>{strike(sim,'guardian','red-w1-0');strike(sim,'guardian','red-w1-1');});at(110,()=>strike(sim,'guardian','red-tower-front-north'));
 until(sim,200);assert.deepEqual([objective(sim,'w').blocked,objective(sim,'w').progress,sim.ended],['no-more-waves',0,false]);
 // Disabled mechanic: no allied minions will ever exist, so Guardian Zone can never shield an ally.
 sim=new Simulation('a',quiet({waves:{firstWaveTick:30,waveInterval:900,enemyPerWave:[1],alliedPerWave:0},mission:{...one('p',[{id:'g',type:'skill-impact',effect:'shield-granted',count:1}]),waveMode:'scripted'}}));
 at=scripted(sim);clearAllies(sim,at);until(sim,10);assert.equal(objective(sim,'g').blocked,undefined,'wave 1 has not spawned yet');until(sim,40);assert.equal(objective(sim,'g').blocked,'no-allied-minions');
 // No XP left: every Crimson minion died away from the Guardian.
 sim=new Simulation('x','prototype');
 sim=new Simulation('x',matchSetup('prototype',{mission:one('p',[{id:'lvl',type:'guardian-level',level:2},{id:'r',type:'skill-rank',skill:'taunt',rank:1},{id:'q',type:'skill-rank',skill:'bash',rank:2}])}));
 at=scripted(sim);sim.send({type:'learn',requestId:'b',skill:'bash'});
 for(let t=2;t<400;t++)at(t,()=>{for(const u of Object.values(sim.state.units))if(u.kind==='minion-red')strike(sim,'blue-base',u.id);});
 until(sim,200);assert.deepEqual(['lvl','r','q'].map(id=>objective(sim,id).blocked),[undefined,undefined,undefined],'wave 2 still to come');
 until(sim,300);assert.equal(sim.state.heroProgression.xp,0);
 assert.deepEqual(['lvl','r','q'].map(id=>objective(sim,id).blocked),['no-xp-sources','not-enough-skill-points','no-xp-sources']);
});

// Same scripted inputs as tests/match-setup.cjs. The mission below can never complete within the run.
function drive(sim,ticks,statuses){
 const s=sim.state,h=sim.hero,hash=createHash('sha256'),req={n:0};
 while(!sim.ended&&sim.clock.tick<ticks){
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
  if(statuses&&t%300===0)statuses.update(JSON.stringify(sim.missionStatus()));
 }
 hash.update(JSON.stringify(s));return hash.digest('hex');
}
const endless={phases:[
 {id:'A',objectives:[{id:'w',type:'waves-defeated',count:2},{id:'k',type:'tower-kills',count:1}]},
 {id:'B',objectives:[{id:'all',type:'destroy',targets:['red-base']},{id:'stand',type:'structures-standing',count:30}]}]};

test('mission tracking leaves gameplay untouched and replays deterministically',()=>{
 const plain=drive(new Simulation('r','extended'),4500),tracked=drive(new Simulation('r',matchSetup('extended',{mission:endless})),4500);
 assert.equal(tracked,plain,'same events, same state, same RNG with objectives being tracked');
 const runs=[0,1].map(()=>{const statuses=createHash('sha256'),sim=new Simulation('r',matchSetup('extended',{mission:endless}));const h=drive(sim,4500,statuses);return {h,statuses:statuses.digest('hex'),final:JSON.stringify(sim.missionStatus())};});
 assert.deepEqual(runs[0],runs[1]);
 const st=JSON.parse(runs[0].final);assert.deepEqual(st.completedPhases,['A'],'the scripted run clears phase A');assert.equal(st.activePhase,'B');
});

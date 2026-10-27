// Chapter 2 S0: golden simulation baselines. Lives outside tests/*.cjs, so scripts/test.mjs never runs it as a test file.
// Each scenario is a fixed setup, a fixed critical-hit seed and the shared deterministic campaign driver (support/campaignBot.cjs). Every 30
// ticks the run records two short hashes: a projection of the gameplay state (below) and the commands the driver sent since the last
// checkpoint. Fixtures live in tests/golden/<scenario>.json. Regenerate them only on purpose: GOLDEN_UPDATE=1 node scripts/test.mjs golden-simulation.cjs
//
// Included in the state hash (explicit allow-list, so purely structural additions such as a new GameState field do not churn the goldens):
//  units (id, kind, team, position, HP, combat stats, cooldowns, target, strike, respawn, breach, life, statuses, shield),
//  Crimson defenders, player structures and both Keeps (the same, plus construction progress and cell),
//  Gold/Wood/Iron (state values and exact economy units), kills, Guardian deaths, wave progression and the pending spawn queue,
//  Guardian progression (level, XP, skill points, ranks, fortitude), skill cooldowns, the active cast and Guardian Zones,
//  inventory, burns, the critical-hit RNG, match phase and result, and mission status (phase, objectives, outcome).
// Deliberately excluded:
//  - minion AI timers (decisionTick, targetSinceTick, pursuit, guardianIgnoreUntil, retaliateTick) and status lostLosTick/sourceLife:
//    internal bookkeeping whose effect shows up in positions, targets and HP a few ticks later;
//  - navigation routes and statistics: caches, observable only through movement;
//  - raw input echo (move, attacking, selectedTarget, previewReady): covered by the separate input hash;
//  - the event feed: presentation output, whose gameplay consequences are already in the state;
//  - static setup (encounter.reserved, encounter id): fixed by the scenario.
const {createHash}=require('node:crypto');
const {readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {matchSetup}=require('../../.test-build/data/matchSetup.js');
const {play,standing}=require('./campaignBot.cjs');

const INTERVAL=30,CRIT_SEED=0x4b434c48,DIR=path.join(__dirname,'..','golden');
const T=n=>'red-tower-'+n;
const threat=r=>s=>Object.values(s.state.units).some(u=>u.team==='red'&&u.hp>0&&Math.hypot(u.x-330,u.y-600)<r);
// Scenarios use policies already proven by the Chapter 1 level tests. Full Battle is the legacy extended setup itself (no campaign id),
// so the planned full-battle identity migration cannot change what this scenario runs.
const scenarios={
 'chapter1-level-01':{about:'Level 1 Hold the Ford: the Guardian defends the Ford until all five scripted waves fall.',
  setup:()=>campaign.setup(1),maxTicks:5400,policy:{}},
 'chapter1-level-06':{about:'Level 6 Breach the Front: Shield Bash during the hold phase, then the north flank (front-north, front-center).',
  setup:()=>campaign.setup(6),maxTicks:9000,policy:{cast:{bash:true},targets:[T('front-north'),T('front-center')],gate:s=>s.missionStatus().activePhase==='hold'}},
 'chapter1-level-10':{about:'Level 10 The Crimson Keep: two Archer Towers, the gate towers, then the armed Crimson Keep, returning home on threat.',
  setup:()=>campaign.setup(10),maxTicks:16200,policy:{towers:2,cast:{bash:true},targets:[T('keep-north'),T('keep-south'),'red-base'],gate:s=>threat(520)(s)||standing(s)<2}},
 'full-battle':{about:'Legacy Full Battle (matchSetup extended, no mission): towers, Bash, Charge and Taunt, striking the front then the Crimson Keep for five minutes.',
  setup:()=>matchSetup('extended'),maxTicks:9000,policy:{towers:2,cast:{bash:true,charge:130,taunt:2},targets:[T('front-center'),T('front-north'),T('rear-north'),T('keep-north'),'red-base'],gate:s=>threat(520)(s)||standing(s)<2}},
};

// Canonical JSON: object keys sorted, so key insertion order never matters.
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const hash=(v,n)=>createHash('sha256').update(JSON.stringify(canon(v))).digest('hex').slice(0,n);
const opt=v=>v===undefined?null:v;
const unit=u=>[u.id,u.kind,u.team,u.x,u.y,u.hp,u.maxHp,u.armor,opt(u.baseArmor),u.damage,u.speed,u.range,u.cooldownTicks,u.windupTicks,u.readyTick,u.protectionTick,
 opt(u.targetId),u.strike?[u.strike.targetId,u.strike.atTick]:null,opt(u.respawnTick),opt(u.breachId),opt(u.lifeId),
 (u.statuses??[]).map(s=>[s.type,s.sourceId,s.startTick,s.expiresTick,s.magnitude]),u.shield?[u.shield.remaining,u.shield.expiresTick,u.shield.zoneId]:null];
const structure=b=>[...unit(b),b.col,b.row,b.progress,b.startTick,b.completeTick,b.constructionDamage];
const byId=(record,f)=>Object.keys(record).sort().map(id=>f(record[id]));
// The gameplay projection: everything listed as included above, nothing else.
function project(sim){
 const s=sim.state,m=sim.missionStatus(),e=sim.economy,k=s.skills;
 return {
  tick:sim.clock.tick,
  units:byId(s.units,unit),structures:byId(s.structures,structure),bases:byId(s.bases,structure),
  resources:[s.gold,s.wood,s.iron,e.goldUnits,e.woodUnits,e.ironUnits],
  tallies:[s.kills,s.guardianDeaths,s.spawnedWaves,s.encounter.waveCount,opt(s.encounter.alliedBaseHitTick)],
  spawnQueue:sim.spawnQueue.map(q=>[q.id,q.tick,q.team,q.wave]),
  guardian:s.heroProgression,
  skills:[k.ready,k.cooldownIntervals,k.lockTick,k.cast?[k.cast.skill,k.cast.requestId,k.cast.rank,k.cast.atTick,opt(k.cast.targetId),opt(k.cast.remaining)]:null,
   k.zones.map(z=>[z.id,z.x,z.y,z.expiresTick,z.armor,z.shield,z.granted])],
  inventory:s.inventory,burns:s.burns,critical:[s.criticalRandom.seed,s.criticalRandom.state,s.criticalRandom.rolls],
  match:[s.match.phase,opt(s.match.result)],outcome:opt(sim.outcome),
  mission:m?[m.status,m.activePhase,m.completedPhases,m.objectives.map(o=>[o.id,o.progress,o.complete,o.active])]:null,
 };
}
const stateHash=sim=>hash(project(sim),16);

// Runs a scenario and returns its checkpoints ("tick stateHash inputHash") and a readable summary.
// perturb (tests only): {tick,apply(sim)} changes the state once, at the first driver step at or after tick, before that step's checkpoint.
// stopAfter (tests only): ends the run after the first checkpoint at or after this tick.
function run(name,{perturb,stopAfter}={}){
 const sc=scenarios[name];if(!sc)throw new Error(`Unknown golden scenario ${name}`);
 const sim=new Simulation(`golden-${name}`,sc.setup(),CRIT_SEED),checkpoints=[];
 let inputs=[],next=INTERVAL,perturbed=false,done=false;
 const send=sim.send.bind(sim);sim.send=c=>{const ok=send(c);inputs.push([sim.clock.tick,ok,c]);return ok;};
 const sample=()=>{checkpoints.push(`${sim.clock.tick} ${stateHash(sim)} ${hash(inputs,8)}`);inputs=[];};
 play(sim,sc.maxTicks,{...sc.policy,stop:()=>{
  if(perturb&&!perturbed&&sim.clock.tick>=perturb.tick){perturb.apply(sim);perturbed=true;}
  if(sim.clock.tick>=next){sample();next=(Math.floor(sim.clock.tick/INTERVAL)+1)*INTERVAL;if(stopAfter!==undefined&&sim.clock.tick>=stopAfter)done=true;}
  return done;
 }});
 if(!done)sample(); // the final state, whatever tick the run ended on
 const s=sim.state,m=sim.missionStatus();
 const summary={ticks:sim.clock.tick,outcome:sim.outcome?`${sim.outcome.outcome}/${sim.outcome.reason}@${sim.outcome.tick}`:null,
  azureKeepHp:s.bases['blue-base'].hp,crimsonKeepHp:s.bases['red-base'].hp,guardianLevel:s.heroProgression.level,ranks:canon(s.heroProgression.ranks),
  spawnedWaves:s.spawnedWaves,kills:s.kills,playerTowers:Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length,
  crimsonTowers:Object.values(s.structures).filter(b=>b.team==='red').map(b=>b.id).sort(),
  mission:m?{activePhase:m.activePhase,completedPhases:m.completedPhases,objectives:Object.fromEntries(m.objectives.map(o=>[o.id,`${o.progress}/${o.target}`]))}:null};
 return {checkpoints,summary,sim};
}
const fixturePath=name=>path.join(DIR,`${name}.json`);
const load=name=>JSON.parse(readFileSync(fixturePath(name),'utf8'));
function write(name,result){
 mkdirSync(DIR,{recursive:true});
 const sc=scenarios[name];
 writeFileSync(fixturePath(name),JSON.stringify({scenario:name,about:sc.about,critSeed:CRIT_SEED,interval:INTERVAL,maxTicks:sc.maxTicks,
  format:'each checkpoint is "tick stateHash inputHash"; see tests/support/golden.cjs for what the state hash covers',
  generatedWith:{node:process.version},summary:result.summary,checkpoints:result.checkpoints},null,1)+'\n');
}
// Where two checkpoint lists first disagree, as a readable message (input divergence means the driver, not the simulation, changed first).
function firstDivergence(expected,actual){
 for(let i=0;i<Math.max(expected.length,actual.length);i++){
  if(expected[i]===actual[i])continue;
  const [et,es,ei]=(expected[i]??'- - -').split(' '),[at,as,ai]=(actual[i]??'- - -').split(' ');
  const what=et!==at?'checkpoint ticks differ':ei!==ai&&es===as?'driver input differs (state still equal)':es!==as&&ei===ai?'simulation state differs (same input)':'state and input differ';
  return `checkpoint ${i}: expected ${expected[i]??'(none)'}, got ${actual[i]??'(none)'} - ${what}`;
 }
 return null;
}
module.exports={INTERVAL,CRIT_SEED,scenarios,project,stateHash,run,load,write,firstDivergence};

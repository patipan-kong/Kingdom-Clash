const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {battlefield,meadow,warCampId}=require('../.test-build/world/battlefield.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {canAttack}=require('../.test-build/simulation/Combat.js');
const {HZ,play,strike,until}=require('./support/campaignBot.cjs');
// C1M5 The Crimson Muster: destroy the Crimson War Camp, a 2,000 HP Crimson Barracks behind the Crimson Keep that owns both Crimson wave slots.
// Bot results are correctness and regression evidence for the approved probe configuration, not a verdict on fun; the final balance waits for the S24 playtest.
const T=n=>`red-tower-${n}`,TOWERS=[T('rear-north'),T('rear-south'),T('keep-north'),T('keep-south')],SLOTS=[[1824,528],[1824,672]],KEEP={x:330,y:600};
const setup=()=>campaign.setup('campaign-05');
const threat=r=>s=>Object.values(s.state.units).some(u=>u.team==='red'&&u.hp>0&&Math.hypot(u.x-KEEP.x,u.y-KEEP.y)<r);
// Spawn safety while a bot plays: the most Crimson spawns in one tick, ticks with a due spawn held back by the 10 s patience rule, and the closest the Guardian came to a slot.
function watch(sim){
 const w={perTick:new Map(),patience:0,slotGap:Infinity,fall:null,afterFall:0},adv=sim.advance.bind(sim);
 sim.advance=dt=>{adv(dt);const t=sim.clock.tick,h=sim.hero;
  const due=sim.spawnQueue.find(q=>q.team==='red'&&q.tick<=t);if(due&&t-due.tick>=300)w.patience++;
  if(h.hp>0)for(const [x,y] of SLOTS)w.slotGap=Math.min(w.slotGap,Math.hypot(h.x-x,h.y-y));
  if(w.fall===null&&!sim.state.structures[warCampId])w.fall=t;};
 return w;
}
function run(name,opts){
 const sim=new Simulation('c1m5-'+name,setup()),log=[],w=watch(sim);
 play(sim,420*HZ,{cast:{bash:true,charge:130},log,...opts});
 for(const e of log)if(e.type==='spawn'&&e.id.startsWith('red-')){w.perTick.set(e.at,(w.perTick.get(e.at)??0)+1);if(w.fall!==null&&e.at>w.fall)w.afterFall++;}
 return {sim,log,w,deaths:log.filter(e=>e.type==='death'&&e.id==='guardian').length,seconds:sim.outcome?sim.outcome.tick/HZ:Infinity,keep:sim.state.bases['blue-base'].hp};
}
const safe=(r,name)=>{
 assert.ok(Math.max(0,...r.w.perTick.values())<=1,`${name}: at most one Crimson spawn per tick`);
 assert.equal(r.w.patience,0,`${name}: no spawn ever waited out the 10 s patience`);
 assert.ok(r.w.slotGap>=26,`${name}: the Guardian never stood on a War Camp slot (closest ${Math.round(r.w.slotGap)} px)`);
 assert.equal(r.w.afterFall,0,`${name}: nothing spawned after the War Camp fell`);
};

test('the War Camp battlefield is Meadow plus one Barracks site; Meadow itself and Full Battle are unchanged',()=>{
 const f=battlefield('meadow-muster');
 assert.deepEqual(f.barracks,[{id:warCampId,x:1728,y:600,columns:2,rows:2}]);assert.equal(meadow.barracks,undefined,'the shared Chapter 1 map has no Barracks');
 for(const k of ['barriers','scenery','entities','territory','reserved','respawn','objectives'])assert.equal(f[k],meadow[k],`${k} is Meadow's own`);
 assert.equal(matchSetup('extended').battlefield,meadow,'Full Battle stays on Meadow');
 for(const id of ['campaign-01','campaign-02','campaign-03','campaign-04','campaign-06'])assert.equal(campaign.setup(id).battlefield.id,'meadow',id);
});

test('C1M5 is the approved Option A: a 2,000 HP War Camp owning both slots, four towers, waves 4-7 every 25 s from 10 s, no allies, a protected inert Keep',()=>{
 const l=campaign.get('campaign-05'),s=setup();
 assert.equal(l.display.title,'The Crimson Muster');assert.match(l.display.briefing,/War Camp/);assert.ok(l.display.briefing.length<=320);
 assert.deepEqual(s.barracks,[{id:warCampId,x:1728,y:600,columns:2,rows:2,hp:2000,slots:SLOTS}]);
 assert.deepEqual(s.waveRules.redSlots,SLOTS);assert.deepEqual(s.encounter.defenders.map(d=>d.id).sort(),[...TOWERS].sort());
 assert.deepEqual([s.waveRules.firstWaveTick,s.waveRules.waveInterval,s.waveRules.alliedPerWave],[300,750,0]);
 assert.deepEqual(Array.from({length:12},(_,i)=>extendedWaveSpawns(i+1,s.waveRules).filter(e=>e.team==='red').length),[4,4,5,5,6,6,7,7,7,7,7,7],'then 7');
 assert.equal(s.crimsonKeepInvulnerable,true);assert.equal(s.keepDefense.red,null);assert.equal(s.mission.failure,undefined);
 assert.deepEqual(s.mission.phases.map(p=>p.objectives.map(o=>[o.id,o.type,o.targets])),[[['camp','destroy',[warCampId]]]]);
 const sim=new Simulation('c1m5-def',s),camp=sim.state.structures[warCampId];
 assert.deepEqual([camp.hp,camp.maxHp,camp.team,camp.kind],[2000,2000,'red','wall']);
});

test('a Barracks is a valid destroy target only where the match places it',()=>{
 const {barracks:_b,...o}=campaign.get('campaign-05').match.overrides,{redSlots:_r,...waves}=o.waves,bad={...o,waves,mission:campaign.get('campaign-05').mission};
 assert.throws(()=>matchSetup('extended',bad),/red-barracks-camp is not in this match/);
});

test('the protected Crimson Keep is never a Guardian target, even with the Guardian beside it',()=>{
 const sim=new Simulation('c1m5-keep',setup());sim.teleportHero(1610,470);sim.state.autoAttack=true;
 assert.equal(canAttack(sim.hero,sim.state.bases['red-base'],sim.state.structures),false);
 const targets=new Set();for(let t=0;t<120;t++){until(sim,sim.clock.tick+1);if(sim.hero.targetId)targets.add(sim.hero.targetId);}
 assert.ok(!targets.has('red-base'),[...targets].join());assert.equal(sim.state.bases['red-base'].hp,sim.state.bases['red-base'].maxHp);
});

test('destroying the War Camp mid-wave wins at once and nothing it had queued ever spawns',()=>{
 const sim=new Simulation('c1m5-fall',setup()),log=until(sim,1050+30); // wave 2 announced at 1050, two of its four still queued
 assert.ok(sim.spawnQueue.some(e=>e.team==='red'),'entries are waiting');
 strike(sim,'guardian',warCampId);until(sim,sim.clock.tick+3,log);
 assert.deepEqual([sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);until(sim,sim.clock.tick+600,log);
 const fell=log.find(e=>e.type==='death'&&e.id===warCampId)?.at??sim.outcome.tick;assert.equal(log.filter(e=>e.type==='spawn'&&e.id.startsWith('red-')&&e.at>fell).length,0);
});

test('bot policies: raid, defensive, no-tower and clear-first all win; the raid is not trivial; spawns stay safe throughout',()=>{
 const raid=run('raid',{targets:[warCampId]}),defend=run('defend',{targets:[warCampId],towers:2,gate:threat(520)});
 const notower=run('notower',{targets:[warCampId],gate:threat(520)}),clear=run('clear',{targets:[...TOWERS,warCampId],towers:2,gate:threat(520)});
 for(const [name,r] of [['raid',raid],['defensive',defend],['no-tower',notower],['clear-first',clear]]){assert.equal(r.sim.outcome?.outcome,'victory',name);safe(r,name);}
 assert.ok(raid.seconds>=45&&raid.deaths>=1,`a level 1 raid costs time and a death (${raid.seconds.toFixed(0)} s, ${raid.deaths} deaths)`);
 assert.ok(raid.keep<3000,'ignoring home costs the Azure Keep');assert.equal(defend.keep,3000);
 assert.ok(TOWERS.every(id=>!clear.sim.state.structures[id]),'clear-first really cleared the towers');assert.ok(clear.seconds>raid.seconds);
});

test('an absent Guardian loses the Azure Keep: the waves are real pressure',()=>{
 const r=run('absent',{park:true});assert.deepEqual([r.sim.outcome.outcome,r.sim.outcome.reason],['defeat','azure-keep-destroyed']);assert.ok(r.seconds<120,`${r.seconds} s`);safe(r,'absent');
});

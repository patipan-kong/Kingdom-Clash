const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup,guardianSpawn}=require('../.test-build/data/matchSetup.js');
const {buildEncounter,extendedRules,extendedWaveRules,extendedWaveSpawns}=require('../.test-build/data/encounters.js');
const {gameplayV04,lateWaveCount}=require('../.test-build/data/gameplayV04.js');
const {startingResources}=require('../.test-build/data/resources.js');
// Stage 2 S0: MatchSetup must reproduce the legacy encounters exactly. The golden fingerprints below were produced by this driver on
// the pre-S0 build (main 69ab775): every drained event, tagged with its tick, plus the final GameState, through SHA-256.
const DT=1000/30+.01;
function drive(sim,maxTicks){
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
 }
 hash.update(JSON.stringify(s));
 return {tick:sim.clock.tick,ended:sim.ended,result:s.match.result??null,waves:s.spawnedWaves,hash:hash.digest('hex')};
}
const GOLDEN={
 extended:{tick:16000,ended:false,result:null,waves:14,hash:'41b77edde472bbd9fa348fcab92299be719f323bcdf90c5558f5bea590fbd63f'},
 prototype:{tick:3000,ended:false,result:null,waves:2,hash:'abfea24c526e63f3d330d31496caaa6683fda019a4e34dc0a2ff7d7473633fa2'},
 // extended after the balance harness "baseline" mutation: inert Keeps, v0.3 waves 1-12, late 8/3/10.
 mutated:{tick:16000,ended:false,result:null,waves:14,hash:'eff42e4e612b708628e2df74fc33e0affffa55e0edcf859418ae58fc24b23303'},
};
// Mirrors scripts/balance-v04.mjs apply(): mutates the shared data objects in place.
function apply(v){
 gameplayV04.keepDefense.red=v.red?{...v.red}:null;gameplayV04.keepDefense.blue=v.blue?{...v.blue}:null;
 gameplayV04.waves.enemyPerWave.splice(0,12,...v.waves.enemyPerWave);
 Object.assign(gameplayV04.waves,{lateStartCount:v.waves.lateStartCount,lateStepEveryWaves:v.waves.lateStepEveryWaves,lateCap:v.waves.lateCap});
}
const LIVE={red:{...gameplayV04.keepDefense.red},blue:gameplayV04.keepDefense.blue,waves:{...gameplayV04.waves,enemyPerWave:[...gameplayV04.waves.enemyPerWave]}};
const BASELINE={red:null,blue:null,waves:{enemyPerWave:[3,3,4,4,5,5,6,6,7,7,8,8],lateStartCount:8,lateStepEveryWaves:3,lateCap:10}};
function withConfig(v,fn){apply(v);try{return fn();}finally{apply(LIVE);}}
const initial=sim=>JSON.stringify({state:sim.state,encounter:sim.encounter,queue:sim.spawnQueue,gold:sim.shopPurchaseQuote('iron-sword'),wall:sim.constructionQuote('wall'),shop:sim.shopAccessReason()});

test('legacy encounter ids replay the pre-S0 golden matches exactly',()=>{
 assert.deepEqual(drive(new Simulation('golden','extended'),16000),GOLDEN.extended);
 assert.deepEqual(drive(new Simulation('golden','prototype'),3000),GOLDEN.prototype);
});
test('the legacy constructor forms keep working: default prototype, positional extended with explicit combat variant',()=>{
 const d=new Simulation();assert.equal(d.encounter.id,'prototype');assert.equal(d.state.encounter.id,'prototype');assert.equal(d.setup.shop,false);
 const b=new Simulation('v04-x','extended',undefined,undefined);assert.equal(b.encounter.id,'extended');assert.equal(b.setup.shop,true);
 assert.equal(new Simulation('v04-x','extended',undefined,b.combat).combat,b.combat);
 assert.throws(()=>new Simulation('x','arena'),/Unknown encounter/);
});
test('a MatchSetup builds the same initial match as its legacy encounter id and replays the same golden match',()=>{
 for(const id of ['prototype','extended']){
  assert.equal(initial(new Simulation('same',matchSetup(id))),initial(new Simulation('same',id)),id);
  assert.deepEqual(buildEncounter(id),matchSetup(id).encounter,id);
 }
 assert.deepEqual(drive(new Simulation('golden',matchSetup('extended')),16000),GOLDEN.extended);
 assert.deepEqual(drive(new Simulation('golden',matchSetup('prototype')),3000),GOLDEN.prototype);
});
test('default setups describe the existing encounters',()=>{
 const e=matchSetup('extended'),p=matchSetup('prototype');
 assert.deepEqual(e.start,{...startingResources,guardian:{x:820,y:590}});assert.deepEqual(p.start,e.start);assert.deepEqual(guardianSpawn,{x:820,y:590});
 assert.deepEqual(e.keepDefense,{red:gameplayV04.keepDefense.red,blue:null});assert.deepEqual(p.keepDefense,{red:null,blue:null});
 assert.equal(e.shop,true);assert.equal(p.shop,false);assert.equal(p.waveRules,null);
 assert.deepEqual(e.waveRules.enemyPerWave,extendedRules.enemyPerWave);assert.deepEqual(e.encounter.defenders,extendedRules.towers);
 for(let n=1;n<=20;n++)assert.deepEqual(extendedWaveSpawns(n,e.waveRules),extendedWaveSpawns(n),'wave '+n);
 for(let n=13;n<=30;n++)assert.equal(extendedWaveSpawns(n,e.waveRules).filter(x=>x.team==='red').length,lateWaveCount(n),'late wave '+n);
});
test('harness mutations of Keep defense and waves are read when each match is constructed',()=>{
 withConfig(BASELINE,()=>{
  const s=new Simulation('m','extended');assert.equal(s.setup.keepDefense.red,null);assert.equal(s.state.bases['red-base'].damage,0);
  assert.deepEqual(s.encounter.waves.length,12);assert.equal(s.encounter.spawns.filter(x=>x.wave===4&&x.team==='red').length,4);
  assert.deepEqual(s.setup.waveRules.late,{firstWave:13,startCount:8,stepEveryWaves:3,cap:10});
  assert.deepEqual(drive(new Simulation('golden','extended'),16000),GOLDEN.mutated);
 });
 const s=new Simulation('m','extended');assert.equal(s.state.bases['red-base'].damage,17);assert.equal(s.encounter.spawns.filter(x=>x.wave===4&&x.team==='red').length,5);
 assert.deepEqual(drive(new Simulation('golden','extended'),16000),GOLDEN.extended,'restored configuration replays the production match');
});
test('configuration does not leak between matches or back into shared data',()=>{
 const before=JSON.stringify({extendedRules,keep:gameplayV04.keepDefense,waves:gameplayV04.waves}),setup=matchSetup('extended'),copy=JSON.stringify(setup);
 const running=new Simulation('golden',setup);
 // A change after construction affects only matches built later; the running match keeps the schedule it started with,
 // including the late-wave counts (waves 13-14) that the pre-S0 code read live every tick.
 withConfig(BASELINE,()=>{
  assert.deepEqual(drive(running,16000),GOLDEN.extended,'a mid-match configuration change does not reach the running match');
  assert.equal(new Simulation('b','extended').state.bases['red-base'].damage,0);
 });
 assert.equal(JSON.stringify(setup),copy,'running a match does not mutate its setup');
 assert.equal(JSON.stringify({extendedRules,keep:gameplayV04.keepDefense,waves:gameplayV04.waves}),before,'shared data untouched');
 const x=matchSetup('extended');x.waveRules.enemyPerWave[0]=99;x.keepDefense.red.damage=1;x.encounter.defenders[0].x=0;x.start.guardian.x=0;
 assert.deepEqual(matchSetup('extended'),setup,'editing one setup leaves the next one unchanged');
 assert.equal(JSON.stringify({extendedRules,keep:gameplayV04.keepDefense,waves:gameplayV04.waves}),before);
 assert.equal(drive(new Simulation('golden',setup),16000).hash,GOLDEN.extended.hash,'a setup reused for a second match replays identically');
});
test('overrides change only what they name and leave the default setup alone',()=>{
 const def=JSON.stringify(matchSetup('extended'));
 const o=matchSetup('extended',{start:{gold:600,wood:50,iron:0,guardian:{x:700,y:600}},defenders:['red-tower-rear-north','red-tower-keep-north'],crimsonKeepArmed:false,shop:false,waves:{firstWaveTick:150,waveInterval:900,enemyPerWave:[2,3],alliedPerWave:4}});
 const s=new Simulation('o',o);
 assert.deepEqual([s.state.gold,s.state.wood,s.state.iron],[600,50,0]);assert.equal(s.shopPurchaseQuote('iron-sword').reason,'Shop unavailable in this encounter');
 assert.equal(s.constructionQuote('wall').available,true);assert.equal(s.constructionQuote('tower').available,false);
 assert.deepEqual([s.hero.x,s.hero.y],[700,600]);assert.deepEqual(Object.keys(s.state.structures).sort(),['red-tower-keep-north','red-tower-rear-north']);
 assert.equal(s.state.bases['red-base'].damage,0);assert.equal(s.encounter.id,'extended');
 assert.deepEqual(s.encounter.waves,[{tick:150},{tick:1050}]);assert.equal(s.encounter.spawns.filter(x=>x.team==='blue'&&x.wave===1).length,4);
 const waves=[];for(let i=0;i<1990;i++){s.advance(DT);for(const e of s.drainEvents())if(e.type==='wave')waves.push([s.clock.tick,e.index]);}
 assert.deepEqual(waves,[[150,1],[1050,2],[1950,3]],'continuation keeps the overridden cadence');
 assert.equal(JSON.stringify(matchSetup('extended')),def,'defaults unchanged after building an override');
 const proto=new Simulation('p',matchSetup('prototype',{crimsonKeepArmed:true,shop:true}));
 assert.equal(proto.state.bases['red-base'].damage,17);assert.equal(proto.state.bases['red-base'].range,140);assert.notEqual(proto.shopAccessReason(),'Shop unavailable in this encounter');
 assert.throws(()=>matchSetup('prototype',{waves:{waveInterval:600}}),/extended/);
 assert.throws(()=>matchSetup('extended',{defenders:['red-tower-nowhere']}),/defender/);
 assert.throws(()=>matchSetup('extended',{defenders:['red-tower-keep-rear','red-tower-keep-rear']}),/defender/);
 assert.throws(()=>matchSetup('extended',{waves:{enemyPerWave:[]}}),/wave/);assert.throws(()=>matchSetup('extended',{waves:{waveInterval:0}}),/wave/);
 assert.throws(()=>matchSetup('extended',{start:{gold:-1}}),/start/);assert.throws(()=>matchSetup('extended',{start:{wood:1.5}}),/start/);
 withConfig(BASELINE,()=>assert.throws(()=>matchSetup('extended',{crimsonKeepArmed:true}),/Crimson Keep/));
 assert.deepEqual(extendedWaveRules().enemyPerWave,LIVE.waves.enemyPerWave);
});

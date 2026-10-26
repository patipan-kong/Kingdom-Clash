const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {FLANK,flankSuspended}=require('../.test-build/simulation/Flank.js');
const {play}=require('./support/campaignBot.cjs');
// Chapter 2 S9D: opt-in lane commitment (WaveLaneSplit.commit) and the opt-in invulnerable Crimson Keep (MatchSetup.crimsonKeepInvulnerable). Both default off.
const DT=1000/30+.01,L14=campaign.get('campaign-14');
const setup14=(seed,{commit=true,keep=true}={})=>{const o=structuredClone(L14.match.overrides);if(!commit)o.waves.lanes.forEach(l=>delete l.commit);if(!keep)delete o.crimsonKeepInvulnerable;return matchSetup('extended',{...o,laneSeed:seed,mission:L14.mission});};
const CELLS=[[15,5],[15,18],[16,5]],HOLD={forward:{cast:{bash:true},leash:900,hold:{x:1330,y:600}},active:{cast:{bash:true},leash:650,hold:{x:620,y:600}}};
// A bot-driven full match that records, per tagged Crimson unit, the bank it crossed, when its flank ended and whether it targeted the Guardian afterwards.
function observe(setup,hold){
 const sim=new Simulation('commit',setup),log=[],seen={},adv=sim.advance.bind(sim);
 sim.advance=dt=>{for(const u of Object.values(sim.state.units)){if(u.team!=='red'||u.hp<=0)continue;
   const r=seen[u.id]??=(u.flank?{lane:u.flank.lane,commit:!!u.flank.commit,spawn:sim.clock.tick,bank:null,released:null,pursuedAfter:false}:{lane:null});
   if(!r.lane)continue;if(!r.bank&&u.x>=880&&u.x<=1120&&(u.y<420||u.y>780))r.bank=u.y<420?'N':'S';
   if(!u.flank&&r.released===null)r.released=sim.clock.tick-r.spawn;if(!u.flank&&u.targetId==='guardian')r.pursuedAfter=true;}
  return adv(dt);};
 play(sim,16000,{towers:3,cells:CELLS,log,...HOLD[hold]});
 return {sim,log,seen,tagged:Object.values(seen).filter(x=>x.lane)};
}

test('commit and crimsonKeepInvulnerable default off: no other level, Full Battle or flank setup carries either, and spawns/units are tagged only where asked',()=>{
 for(const l of campaign.list()){if(l.id==='campaign-14')continue;const s=campaign.setup(l.id);assert.equal(s.crimsonKeepInvulnerable,false,l.id);assert.ok(!s.encounter.spawns.some(e=>e.commit),l.id);}
 assert.equal(campaign.setup('full-battle').crimsonKeepInvulnerable,false);
 const s14=campaign.setup('campaign-14',4);assert.equal(s14.crimsonKeepInvulnerable,true);
 const tagged=s14.encounter.spawns.filter(e=>e.lane);assert.ok(tagged.length>0&&tagged.every(e=>e.commit===true),'every Level 14 lane spawn commits');
 assert.ok(!s14.encounter.spawns.some(e=>e.commit&&!e.lane));
 const plain=setup14(4,{commit:false,keep:false});assert.equal(plain.crimsonKeepInvulnerable,false);assert.ok(!plain.encounter.spawns.some(e=>e.commit));
 const sim=new Simulation('d',plain);assert.equal(sim.state.bases['red-base'].invulnerable,undefined);
 // S7 suspension semantics are untouched without the flag.
 const unit={x:0,y:0,flank:{lane:'north',startTick:0}};assert.equal(flankSuspended(unit,{x:100,y:0,kind:'guardian'}),true);
 assert.equal(flankSuspended({x:0,y:0,flank:{lane:'north',startTick:0,commit:true}},{x:100,y:0,kind:'guardian'}),false);
});

test('validation: commit must be a boolean on a lanes entry; crimsonKeepInvulnerable must be a boolean and cannot be combined with an armed Keep',()=>{
 const o=()=>structuredClone(L14.match.overrides);
 const bad=o();bad.waves.lanes[0].commit='yes';assert.throws(()=>matchSetup('extended',bad),/Invalid lanes/);
 const ok=o();ok.waves.lanes[0].commit=false;assert.doesNotThrow(()=>matchSetup('extended',ok));
 assert.throws(()=>matchSetup('extended',{crimsonKeepInvulnerable:'yes'}),/Invalid Keep protection/);
 assert.throws(()=>matchSetup('extended',{crimsonKeepArmed:true,crimsonKeepInvulnerable:true}),/cannot be invulnerable/);
 assert.equal(matchSetup('extended',{crimsonKeepInvulnerable:true}).crimsonKeepInvulnerable,true);
});

test('a forward Guardian cannot stop committed units reaching their assigned bank; without commitment it holds them back (north and south)',()=>{
 let on=0,off=0;const banks=new Set();
 for(const seed of [1,3]){
  const a=observe(setup14(seed),'forward'),b=observe(setup14(seed,{commit:false}),'forward');
  assert.ok(a.tagged.every(x=>x.commit)&&b.tagged.every(x=>!x.commit));
  for(const x of a.tagged)if(x.bank){on++;banks.add(x.bank);assert.equal(x.bank,x.lane==='north'?'N':'S','a committed unit crosses only its assigned bank');}
  off+=b.tagged.filter(x=>x.bank).length;
  assert.equal(a.sim.outcome?.outcome,'victory',`seed ${seed}: the match still ends legitimately`);
 }
 assert.ok(on>=off*2,`commitment gets far more units across a bank (${on} vs ${off})`);
 assert.deepEqual([...banks].sort(),['N','S'],'both lanes are crossed');
});

test('commitment is a bounded routing rule: every release is within the Flank timeout, and released units target the Guardian again',()=>{
 for(const hold of ['forward','active']){
  const r=observe(setup14(3),hold);
  for(const x of r.tagged.filter(x=>x.released!==null))assert.ok(x.released<=FLANK.timeout,`${hold}: released after ${x.released} ticks`);
  assert.ok(r.tagged.some(x=>x.released!==null),`${hold}: some units are released`);
  assert.equal(r.sim.state.bases['red-base'].hp,3000,`${hold}: the protected Keep is untouched`);
  assert.equal(r.sim.outcome?.outcome,'victory');
  if(hold==='active')assert.ok(r.tagged.some(x=>x.pursuedAfter),'after release, a unit takes the Guardian as a target again (no permanent immunity)');
 }
});

test('the protected Crimson Keep cannot be targeted, damaged or destroyed, and the Shop stays open; the same Guardian can destroy an unprotected one',()=>{
 const run=setup=>{
  const sim=new Simulation('keep',setup),red=sim.state.bases['red-base'];
  const before=sim.shopAccessReason();sim.teleportHero(1500,600);let t=0;
  for(;red.hp>0&&t<2400;t++){sim.send({type:'target',targetId:'red-base'});sim.send({type:'attack'});sim.advance(DT);sim.drainEvents();}
  return {sim,red,before,t};
 };
 const prot=run(setup14(1));
 assert.equal(prot.red.invulnerable,true);assert.equal(prot.red.hp,3000,'no damage in 2400 ticks of attacks');
 assert.equal(canAttackOn(prot.sim.geo,prot.sim.hero,prot.red,prot.sim.state.bases),false,'not a legal target even in reach');
 prot.sim.hit(prot.sim.hero,prot.red,1e6,'direct');assert.equal(prot.red.hp,3000,'central damage rejects it');
 for(const t of Object.values(prot.sim.state.structures))assert.notEqual(t.targetId,'red-base');
 assert.equal(prot.sim.shopAccessReason(),prot.before,'the Shop gate is unchanged');
 assert.notEqual(prot.sim.shopAccessReason(),'Match not active');
 const open=run(setup14(1,{keep:false}));assert.ok(open.red.hp<=0&&open.t<2400,'unprotected: the Keep falls to the Guardian');
 assert.equal(open.sim.shopAccessReason(),'Match not active','recorded technical debt on other levels: the Shop closes once an unprotected Keep falls');
 assert.equal(open.sim.ended,false);
});

test('Level 10 (armed Crimson Keep, destroy-Keep objective) and Full Battle keep a destructible Keep',()=>{
 for(const id of ['campaign-10','full-battle']){
  const sim=new Simulation('k-'+id,campaign.setup(id)),red=sim.state.bases['red-base'];
  assert.equal(red.invulnerable,undefined,id);const hp=red.hp;sim.hit(sim.hero,red,200,'direct');assert.ok(red.hp<hp,`${id}: damage lands`);
  assert.equal(canAttackOn(sim.geo,Object.assign({},sim.hero,{x:red.x-100,y:red.y}),red,sim.state.bases),true,`${id}: targetable`);
 }
});

test('lane plans stay deterministic with commitment: the same seed spawns identical tags, a different seed differs',()=>{
 const tag=s=>JSON.stringify(s.encounter.spawns.map(e=>[e.id,e.lane,e.commit]));
 assert.equal(tag(campaign.setup('campaign-14',5)),tag(campaign.setup('campaign-14',5)));
 assert.notEqual(tag(campaign.setup('campaign-14',5)),tag(campaign.setup('campaign-14',6)));
 const strip=s=>JSON.stringify(s.encounter.spawns.map(e=>[e.id,e.lane]));
 assert.equal(strip(setup14(5)),strip(setup14(5,{commit:false})),'commit never changes which unit takes which lane');
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CampaignRegistry}=require('../.test-build/data/campaign.js');
const {razeOrSeizeV2Level}=require('../.test-build/data/razeOrSeizePrototype.js');
const {crimsonReckoningCampaign}=require('../.test-build/data/crimsonReckoningLevels.js');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {structuresFor}=require('../.test-build/simulation/GameState.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {Navigation}=require('../.test-build/simulation/Navigation.js');
const {DT,HZ,dist,until,strike,entity,route}=require('./support/campaignBot.cjs');

const setup=crimsonReckoningCampaign.setup(55);
const fresh=()=>new Simulation('m5-three-lane',setup);
const [north,south]=setup.barracks;
const [northOuter,southOuter]=setup.captures;
const MAIN='red-main-gate',KEEP='red-base',HOME='blue-base';
const rows={north:264,south:936};
const wingOf=y=>y<384?'north':y>816?'south':null;
const waveOf=id=>Number(/^red-w(\d+)-/.exec(id)?.[1])||0;
const fortressTowers=setup.encounter.defenders.filter(t=>/^m5-(inner|keep)-/.test(t.id));
const wardens=[
 ...setup.captures.map(c=>({id:'red-hero-'+c.id,...c.warden})),
 ...setup.wardens,
];

function observe(sim){
 const contacts=new Map(),spawns=new Map(),events=[],center=new Set(),keepReach=new Set(),keepHit=new Set();
 const ownerAt=unit=>setup.barracks.findIndex(b=>b.slots.some(([x,y])=>x===unit.x&&y===unit.y));
 function tick(){
  sim.advance(DT);
  for(const event of sim.drainEvents()){
   const unit=sim.state.units[event.id];
   if(event.type==='spawn'&&waveOf(event.id)){
    const source=ownerAt(unit);
    assert.ok(source>=0,'regular soldiers spawn at an owned slot');
    spawns.set(event.id,source===0?'north':'south');
   }
   if(event.type==='damage'&&event.id===HOME&&spawns.has(event.sourceId))keepHit.add(event.sourceId);
   const target=event.type==='damage'?entity(sim,event.id):undefined;
   events.push({at:sim.clock.tick,...event,...(target&&{targetPosition:{x:target.x,y:target.y}})});
  }
  for(const [id,source] of spawns){
   const unit=sim.state.units[id];
   if(!unit)continue;
   const wing=wingOf(unit.y);
   if(wing&&unit.x>=504&&unit.x<=672&&!contacts.has(id))contacts.set(id,{at:sim.clock.tick,wing,source});
   if(unit.x>=2064&&unit.x<=2160&&unit.y>=528&&unit.y<=672)center.add(id);
   if(!keepReach.has(id)&&dist(unit,sim.state.bases[HOME])<160&&
      canAttackOn(sim.geo,unit,sim.state.bases[HOME],structuresFor(sim.state,'red')))keepReach.add(id);
  }
 }
 return {contacts,spawns,events,center,keepReach,keepHit,tick};
}

function move(sim,to){
 const d=dist(sim.hero,to),step=sim.hero.speed/HZ;
 const k=1/Math.max(d,step);
 sim.send({type:'move',x:(to.x-sim.hero.x)*k,y:(to.y-sim.hero.y)*k});
}

test('Canonical M5 uses the approved V3 gates, terrain and source ownership while retaining the shared V2 rules',()=>{
 const v2=new CampaignRegistry([razeOrSeizeV2Level]).setup(55),sim=fresh();
 assert.equal(battlefieldFromSearch('?battlefield=raze-or-seize-v3',true),'meadow');
 assert.equal(v2.battlefield.id,'raze-or-seize');
 assert.equal(sim.field.id,'raze-or-seize-v3');
 assert.deepEqual(sim.geo.size,{width:2880,height:1536});
 for(const key of ['captures','post','respawnChain','contestForwardRespawn','tavern','mission'])
  assert.deepEqual(setup[key],v2[key],key);
 const {redSlots,...rules}=setup.waveRules;
 const {redSlots:oldSlots,...v2Rules}=v2.waveRules;
 assert.deepEqual(rules,v2Rules);
 assert.notDeepEqual(redSlots,oldSlots);
 assert.equal(redSlots.length,4);
 assert.equal(setup.encounter.defenders.filter(t=>/^m5-(inner|keep)-/.test(t.id)).length,5);
 for(const gate of setup.gates){
  for(const team of ['red','blue'])assert.equal(
   sim.geo.blocked(gate.x,gate.y,12,structuresFor(sim.state,team)),
   team==='blue'||gate.id===MAIN,gate.id+' '+team);
 }
 assert.equal(Object.values(sim.state.units).filter(u=>u.archetype==='crimson-hero').length,7);
 assert.equal(v2.courtyard,undefined);
});

function stackDefense(wing){
 const sim=fresh(),trace=observe(sim),s=sim.state,y=rows[wing],opposite=wing==='north'?'south':'north';
 const row=Math.floor(y/48),inside=wing==='north'?1:-1;
 const cells=[[9,row],[10,row+inside],[8,row],[9,row+inside],[7,row],[8,row+inside],[6,row+inside]];
 const post={x:504,y:y+48*inside};
 const home={x:456,y:600};
 const waitOnDefendedSide={x:444,y:wing==='north'?380:820};
 let serial=0,defenderId,tavernPlaced=false,unattendedReached=false;
 while(!sim.ended&&sim.clock.tick<HZ*305){
  const tick=sim.clock.tick;
  if(tick%15===0){
   if(!tavernPlaced){
    sim.send({type:'place',requestId:'tavern',kind:'tavern',col:6,row:9});
    tavernPlaced=true;
   }else if(!s.tavern.slots.length&&!sim.tavernReason({action:'hire',merc:'borin'})){
    sim.send({type:'tavern',requestId:'hire',action:'hire',merc:'borin'});
   }else if(s.tavern.slots[0]?.status==='dead'&&!sim.tavernReason({action:'revive',slot:0})){
    sim.send({type:'tavern',requestId:`revive-${++serial}`,action:'revive',slot:0});
   }
   const borin=s.tavern.slots[0]?.unitId;
   if(borin&&borin!==defenderId){
    defenderId=borin;
    sim.send({type:'ally',requestId:`defend-${++serial}`,id:borin,order:{type:'defend',...post}});
   }
   const cell=cells.find(([col,r])=>!sim.placementReason('tower',col,r));
   if(cell)sim.send({type:'place',requestId:`stack-${++serial}`,kind:'tower',col:cell[0],row:cell[1]});
   if(s.heroProgression.skillPoints>0&&s.heroProgression.ranks.bash===0)
    sim.send({type:'learn',requestId:`learn-${++serial}`,skill:'bash'});
  }
  // The Guardian holds the rear apron after either wing has already passed its defense line.
  const leaked=Object.values(s.units).filter(u=>u.team==='red'&&u.x<510&&u.y>424&&u.y<776)
   .sort((a,b)=>dist(a,s.bases[HOME])-dist(b,s.bases[HOME]));
  unattendedReached||=[...trace.keepHit].some(id=>trace.spawns.get(id)===opposite);
  const foe=unattendedReached?leaked[0]:undefined;
  if(foe){
   sim.send({type:'target',id:foe.id});
   if(s.heroProgression.ranks.bash&&sim.remaining('bash')===0&&leaked.filter(u=>dist(u,sim.hero)<120).length>=2)
    sim.send({type:'cast',requestId:`bash-${++serial}`,skill:'bash'});
  }
  const hold=unattendedReached?home:sim.hero.x>480?{x:444,y:600}:waitOnDefendedSide;
  move(sim,foe&&dist(foe,sim.hero)>72?{x:Math.max(428,foe.x),y:Math.max(440,Math.min(760,foe.y))}:foe?sim.hero:hold);
  // Fill the detached courtyard allowance while the normal wing stress test is running.
  if(tick===120*HZ)sim.activateCourtyard(tick);
  trace.tick();
 }
 const damage=(test)=>Math.round(trace.events.filter(e=>e.type==='damage'&&test(e)).reduce((acc,e)=>acc+e.amount,0));
 const byWing=Object.fromEntries(Object.keys(rows).map(key=>[key,[...trace.contacts.values()].filter(c=>c.wing===key&&c.source===key)]));
 const repeat=key=>[...trace.contacts].filter(([id,c])=>c.wing===key&&c.source===key&&waveOf(id)>8);
 const repeatWaves=key=>[...new Set(repeat(key).map(([id])=>waveOf(id)))].sort((a,b)=>a-b);
 const metrics={
  defended:wing,waves:s.spawnedWaves,stoppedAt:sim.clock.tick/HZ,phase:s.match.phase,
  first:{north:byWing.north[0]?.at/HZ,south:byWing.south[0]?.at/HZ},
  repeats:{north:repeat('north').length,south:repeat('south').length},
  repeatWaves:{north:repeatWaves('north'),south:repeatWaves('south')},
  completedTowers:trace.events.filter(e=>e.type==='construction-complete'&&e.id.startsWith('built-stack-')).length,
  towerDamage:damage(e=>e.sourceId.startsWith('built-stack-')&&trace.spawns.get(e.id)===wing),
  borinDamage:damage(e=>e.sourceId.startsWith('blue-h-')&&trace.spawns.get(e.id)===wing),
  unattendedKeepDamage:damage(e=>e.id===HOME&&trace.spawns.get(e.sourceId)===opposite),
  unattendedWingDamage:damage(e=>e.id.startsWith('blue-')&&e.targetPosition?.x<=720&&
   (opposite==='south'?e.targetPosition.y>=696:e.targetPosition.y<=504)&&trace.spawns.get(e.sourceId)===opposite),
  unattendedAllDamage:damage(e=>e.id.startsWith('blue-')&&trace.spawns.get(e.sourceId)===opposite),
  unattendedInRange:[...trace.keepReach].filter(id=>trace.spawns.get(id)===opposite).length,
  centerCrossings:trace.center.size,
 };
 console.log(JSON.stringify(metrics));
 assert.ok(metrics.towerDamage>0&&metrics.borinDamage>0,JSON.stringify(metrics));
 assert.ok(byWing[opposite].length&&(metrics.unattendedKeepDamage>0||metrics.unattendedWingDamage>=100),JSON.stringify(metrics));
 for(const key of Object.keys(rows))assert.ok([9,10,11].every(wave=>repeatWaves(key).includes(wave)),JSON.stringify(metrics));
 assert.equal(trace.center.size,0);
 assert.equal(Object.values(s.units).filter(u=>u.courtyardBarracks).length,4);
}

for(const wing of Object.keys(rows))test(`stacked ${wing} defense leaves the other wing dangerous through repeating waves`,()=>stackDefense(wing));

function breachCenter(occupied){
 const sim=fresh(),trace=observe(sim),s=sim.state;
 // Leave one Tower on each wing while the Guardian and Knight hold Center.
 // Without backline defense, surviving attackers fill the red cap before the next wave can enter.
 if(occupied){
  s.bases[HOME].hp=s.bases[HOME].maxHp=6000;
  for(const row of [6,18])sim.send({type:'place',kind:'tower',col:9,row,requestId:`breach-defense-${row}`});
 }
 assert.ok(sim.teleportHero(2064,600));
 // Stage a Knight at the breach and send him through with the Guardian. The gate is
 // destroyed by real strikes. Both regular sources and all Crimson combat stay live.
 const knight=occupied?sim.spawnAlly(2016,600):undefined;
 if(occupied)assert.ok(knight);
 sim.send({type:'target',id:MAIN});
 while(!sim.ended&&entity(sim,MAIN)?.hp>0&&sim.clock.tick<HZ*100)trace.tick();
 assert.ok(trace.events.some(e=>e.type==='death'&&e.id===MAIN),JSON.stringify({
  tick:sim.clock.tick,gate:entity(sim,MAIN)?.hp,guardian:sim.hero.hp,home:s.bases[HOME].hp,
  strikes:trace.events.filter(e=>e.type==='damage'&&e.id===MAIN).length,
 }));
 assert.equal(trace.center.size,0,'no regular troops cross Center before the breach');
 const breachTick=sim.clock.tick;
 const target={x:2184,y:600};
 if(occupied)sim.send({type:'ally',requestId:'hold-breach',id:knight,order:{type:'defend',...target}});
 else{
  assert.ok(sim.teleportHero(456,600));
  // The empty-Center control excludes autonomous Azure infantry, which otherwise
  // move down Center by themselves. This leaves the Crimson rules and cap untouched.
  for(const unit of Object.values(s.units))if(unit.kind==='minion-blue')delete s.units[unit.id];
  delete s.structures['azure-barracks-0'];
 }
 while(!sim.ended&&sim.clock.tick<breachTick+HZ*(occupied?130:100)){
  if(occupied)move(sim,target);
  else for(const unit of Object.values(s.units))if(unit.kind==='minion-blue')delete s.units[unit.id];
  trace.tick();
 }
 const arrivals=wing=>[...trace.contacts].filter(([id,c])=>c.at>breachTick&&c.wing===wing&&c.source===wing&&waveOf(id)>1);
 const arrivalWaves=wing=>[...new Set(arrivals(wing).map(([id])=>waveOf(id)))].sort((a,b)=>a-b);
 const damage=trace.events.filter(e=>e.type==='damage'&&e.at>breachTick&&
  trace.spawns.has(e.sourceId)&&[knight,'guardian'].includes(e.id)&&
  e.targetPosition?.x>1992&&e.targetPosition.y>=480&&e.targetPosition.y<=720);
 const metrics={occupied,breachSeconds:breachTick/HZ,stoppedAt:sim.clock.tick/HZ,
  north:arrivals('north').length,south:arrivals('south').length,centerRegular:trace.center.size,
  wingWaves:{north:arrivalWaves('north'),south:arrivalWaves('south')},
  siegeDamage:Math.round(damage.reduce((n,e)=>n+e.amount,0)),siegeAttackers:new Set(damage.map(e=>e.sourceId)).size};
 console.log(JSON.stringify(metrics));
 assert.ok(metrics.wingWaves.north.length>=2&&metrics.wingWaves.south.length>=2,JSON.stringify(metrics));
 // A regular can fight the Center siege force from the courtyard without crossing the gate opening.
 if(occupied)assert.ok(metrics.siegeDamage>0&&metrics.siegeAttackers>=2,JSON.stringify(metrics));
 else assert.equal(metrics.centerRegular,0,JSON.stringify(metrics));
}

for(const occupied of [true,false])test(`Main Gate breach with Center ${occupied?'contested':'empty'} preserves both wings`,()=>breachCenter(occupied));

function seize(sim,site){
 for(const id of site.holders)if(entity(sim,id))strike(sim,'guardian',id);
 const b=entity(sim,site.id);
 assert.ok(sim.teleportHero(b.x-112,b.y));
 until(sim,sim.clock.tick+site.captureTicks);
 assert.equal(sim.state.captures[site.id].stage,'captured',site.id);
}

for(const [dead,surviving] of [[north,south],[south,north]])test(`${dead.id} independently stops production after both Elite yards are seized`,()=>{
 const sim=fresh(),trace=observe(sim);
 seize(sim,northOuter);
 seize(sim,southOuter);
 assert.ok(sim.teleportHero(456,600));
 while(!sim.ended&&sim.clock.tick<HZ*25)trace.tick();
 const count=(b,wave)=>[...trace.spawns].filter(([id,wing])=>waveOf(id)===wave&&b.id.endsWith(wing)).length;
 assert.equal(count(north,1),3);
 assert.equal(count(south,1),3);
 strike(sim,'guardian',dead.id);
 while(!sim.ended&&sim.clock.tick<HZ*50)trace.tick();
 assert.equal(count(dead,2),0);
 assert.equal(count(surviving,2),3);
 assert.equal(sim.state.structures[dead.id],undefined);
 assert.ok(!sim.state.captures[dead.id]&&!sim.state.captures[surviving.id]);
 for(const b of [dead,surviving])assert.ok(!sim.setup.captures.some(c=>c.id===b.id));
 console.log(JSON.stringify({destroyed:dead.id,wave1:[count(north,1),count(south,1)],wave2:[count(north,2),count(south,2)]}));
});

const quiet=()=>new Simulation('m5-access',{
 ...setup,
 encounter:{...setup.encounter,waves:[],spawns:[],continuous:false},
});

for(const warden of wardens)test(`${warden.id} engages, returns and respawns on schedule`,()=>{
 const sim=quiet(),guard=entity(sim,warden.id),[x,y]=warden.anchor;
 for(const u of Object.values(sim.state.units))if(u.team==='blue'&&u!==sim.hero)delete sim.state.units[u.id];
 delete sim.state.structures['azure-barracks-0'];
 sim.eliteNext.clear();
 assert.deepEqual([guard.x,guard.y],[x,y]);
 assert.equal(sim.geo.blocked(x,y,guard.radius,structuresFor(sim.state,'red')),false);
 const approach=[[72,0],[-72,0],[0,72],[0,-72]].find(([dx,dy])=>
  !sim.geo.blocked(x+dx,y+dy,sim.hero.radius,structuresFor(sim.state,'blue'))&&
  sim.geo.lineOfSight(guard,{x:x+dx,y:y+dy},structuresFor(sim.state,'blue')));
 assert.ok(approach);
 const [dx,dy]=approach;
 sim.state.autoAttack=false;
 assert.ok(sim.teleportHero(x+dx,y+dy));
 assert.ok(until(sim,sim.clock.tick+HZ*2).some(e=>e.type==='damage'&&e.sourceId===guard.id&&e.id==='guardian'));
 assert.ok(sim.teleportHero(744,600));
 const routeFor=sim.navigation.route.bind(sim.navigation);
 let plans=0;
 sim.navigation.route=(unit,...args)=>{
  const before=sim.navigation.stats.plans,result=routeFor(unit,...args);
  if(unit.id===guard.id)plans+=sim.navigation.stats.plans-before;
  return result;
 };
 until(sim,sim.clock.tick+HZ*4);
 assert.ok(Math.hypot(guard.x-x,guard.y-y)<=30,'returns within the stationary guard tolerance');
 if(warden.id.startsWith('red-warden-court-'))assert.ok(plans<=8,`${warden.id} planned ${plans} times on return`);
 strike(sim,'guardian',warden.id);
 const due=sim.clock.tick+warden.respawnTicks;
 until(sim,due-1);
 assert.equal(entity(sim,warden.id),undefined);
 assert.ok(until(sim,due).some(e=>e.type==='spawn'&&e.id===warden.id));
 assert.deepEqual([entity(sim,warden.id).x,entity(sim,warden.id).y],[x,y]);
});

for(const site of setup.captures)test(`surviving Warden ignores ${site.id} after seizure and repair`,()=>{
 const sim=quiet(),state=sim.state;
 const guardId='red-hero-'+site.id;
 for(const id of Object.keys(state.units))if(id!=='guardian'&&id!==guardId)delete state.units[id];
 delete state.structures['azure-barracks-0'];
 sim.eliteNext.clear();
 sim.state.autoAttack=false;
 for(const id of site.holders)strike(sim,'guardian',id);
 const barracks=entity(sim,site.id),guard=entity(sim,guardId),approach=westOf(barracks,112);
 guard.readyTick=Number.MAX_SAFE_INTEGER;
 assert.ok(sim.teleportHero(approach.x,approach.y));
 until(sim,site.captureTicks);
 assert.equal(state.captures[site.id].stage,'captured');
 assert.ok(sim.teleportHero(744,600));
 until(sim,sim.clock.tick+2);
 assert.equal(guard.targetId,undefined);
 assert.ok(sim.teleportHero(approach.x,approach.y));
 until(sim,sim.clock.tick+site.repair.ticks+2);
 assert.equal(state.captures[site.id].stage,'azure');
 assert.ok(sim.teleportHero(744,600));
 until(sim,sim.clock.tick+2);
 assert.notEqual(guard.targetId,site.id,'new Azure troops remain valid targets');
 assert.ok(guard.hp>0);
});

test('fortress Towers cover both approaches, offer melee access and leave a lower-fire Keep face',()=>{
 const sim=fresh(),nav=new Navigation(sim.geo);
 strike(sim,'guardian',MAIN);
 const view=structuresFor(sim.state,'blue'),redView=structuresFor(sim.state,'red'),hero=sim.hero;
 const towers=fortressTowers.map(t=>entity(sim,t.id));
 const targets=[...towers,...setup.barracks.map(b=>entity(sim,b.id)),{...entity(sim,KEEP),invulnerable:false}];
 const coverage=(p)=>towers.filter(t=>canAttackOn(sim.geo,t,{...hero,...p},redView)).map(t=>t.id);
 const faces=new Map(targets.map(t=>[t.id,[]]));
 for(let x=2184;x<=2796;x+=12)for(let y=144;y<=1056;y+=12){
  const p={x,y};
  if(sim.geo.blocked(x,y,hero.radius,view))continue;
  assert.ok(coverage(p).length<=2,`more than two fortress Towers fire on ${x},${y}`);
  for(const target of targets){
   if(Math.hypot(x-target.x,y-target.y)>170||!canAttackOn(sim.geo,{...hero,...p},target,view))continue;
   faces.get(target.id).push(p);
  }
 }
 for(const target of targets)assert.ok(faces.get(target.id).some(p=>nav.canReachWaypoint(hero,p,view)),target.id);
 for(const [points,local] of [
  [[{x:2208,y:288},{x:2376,y:264}],towers.slice(0,2)],
  [[{x:2208,y:912},{x:2376,y:936}],towers.slice(2,4)],
 ])for(const tower of local)assert.ok(points.some(p=>coverage(p).includes(tower.id)),tower.id);
 const keepFaces=faces.get(KEEP);
 assert.ok(keepFaces.some(p=>coverage(p).includes('m5-keep-court')));
 assert.ok(keepFaces.some(p=>coverage(p).length<=1&&nav.canReachWaypoint(hero,p,view)));
 assert.ok(keepFaces.every(p=>coverage(p).length||Math.hypot(p.x-2520,p.y-600)<=216||
  canAttackOn(sim.geo,entity(sim,KEEP),{...hero,...p},redView)),'Keep attack faces are exposed to fortress fire');
 assert.ok(!keepFaces.some(p=>targets.every(t=>canAttackOn(sim.geo,{...hero,...p},t,view))));
});
const westOf=(b,d=72)=>({x:b.x-d,y:b.y});
function walk(sim,to){
 const path=route(sim,to);
 for(const point of [...path,to]){
  const deadline=sim.clock.tick+90;
  while(dist(sim.hero,point)>10&&sim.clock.tick<deadline&&!sim.ended){
   move(sim,point);
   sim.advance(DT);
   sim.drainEvents();
  }
  assert.ok(dist(sim.hero,point)<=10,`walk stopped at ${sim.hero.x},${sim.hero.y} going to ${point.x},${point.y}`);
 }
 move(sim,sim.hero);
}

test('the Guardian can enter and raze either outer yard with an ordinary target command',()=>{
 for(const site of setup.captures){
  const sim=quiet();
  // Leave a watchtower standing. Clearing all holders while attacking from
  // inside the ring would intentionally trigger Seize before Raze can finish.
  for(const u of Object.values(sim.state.units))if(u.id!=='guardian')delete sim.state.units[u.id];
  delete sim.state.structures['azure-barracks-0'];
  for(const id of site.holders.slice(0,-1))strike(sim,'guardian',id);
  walk(sim,westOf(entity(sim,site.id),80));
  sim.send({type:'target',id:site.id});
  const fight=until(sim,sim.clock.tick+HZ*55);
  assert.ok(fight.some(e=>e.type==='death'&&e.id===site.id&&e.sourceId==='guardian'),
   JSON.stringify({site:site.id,barracksHp:entity(sim,site.id)?.hp,stage:sim.state.captures[site.id].stage,
    guardianHp:sim.hero.hp,guardian:[sim.hero.x,sim.hero.y],hits:fight.filter(e=>e.type==='damage'&&e.id===site.id).length}));
  assert.equal(sim.state.captures[site.id].stage,'lost');
 }
});

for(const site of setup.captures)test(`Azure Elites from ${site.id} exit, regroup, and hit the Keep`,()=>{
 const sim=quiet(),state=sim.state;
 // Test production and escort on their own. The approach remains obstructed
 // by the actual ridges, the other Barracks, and the Keep's collision footprint.
 for(const u of Object.values(state.units))if(u.id!=='guardian')delete state.units[u.id];
 for(const d of setup.encounter.defenders)if(entity(sim,d.id))strike(sim,'guardian',d.id);
 until(sim,1);
 strike(sim,'guardian',state.post.bannerId);
 until(sim,2);
 assert.equal(state.post.owner,'azure');
 assert.equal(state.bases[KEEP].invulnerable,undefined);
 const b=entity(sim,site.id);
 const approach=westOf(b,112);
 walk(sim,approach);
 const end=sim.clock.tick+site.captureTicks+site.repair.ticks+125;
 until(sim,end);
 assert.equal(state.captures[site.id].stage,'azure');
 const prefix=`blue-s-${site.id}-`;
 assert.ok(Object.values(state.units).some(u=>u.id.startsWith(prefix)));
 const postern=site===northOuter?'red-north-postern':'red-south-postern';
 assert.ok(entity(sim,postern)?.hp>0);
 strike(sim,'guardian',postern);
 // Stop at intervals so the Elites can stay inside the Guardian tether.
 const wing=site===northOuter?264:936;
 for(const point of [{x:b.x-112,y:wing},{x:1992,y:wing},{x:2304,y:wing},
  {x:2544,y:wing},{x:2664,y:site===northOuter?456:840},{x:2664,y:site===northOuter?504:792}]){
  walk(sim,point);
  until(sim,sim.clock.tick+HZ*3);
 }
 sim.state.autoAttack=false;
 const events=until(sim,sim.clock.tick+HZ*35);
 const hits=events.filter(e=>e.type==='damage'&&e.id===KEEP&&e.sourceId.startsWith(prefix));
 assert.ok(hits.length,`${site.id}: no Keep damage; ${JSON.stringify(Object.values(state.units).filter(u=>u.id.startsWith(prefix)).map(u=>[u.id,u.x,u.y,u.targetId]))}`);
 console.log(JSON.stringify({escort:site.id,keepDamage:hits.reduce((n,e)=>n+e.amount,0)}));
});

test('every source has an open exit and each inner Barracks has a reachable Azure attack cell',()=>{
 const sim=fresh(),nav=new Navigation(sim.geo);
 const allSlots=[...setup.waveRules.redSlots,...setup.captures.flatMap(c=>c.elite.slots)];
 assert.equal(new Set(allSlots.map(String)).size,allSlots.length);
 const red=structuresFor(sim.state,'red');
 for(const [i,[x,y]] of allSlots.entries()){
  assert.equal(sim.geo.blocked(x,y,12,red),false);
  const unit=sim.unit(`source-${i}`,'minion-red',x,y,i<4?undefined:'crimson-elite');
  nav.begin(sim.state);
  assert.ok(Number.isFinite(nav.route(unit,sim.state.bases[HOME],sim.state,0)?.cost),`exit at ${x},${y}`);
 }
 strike(sim,'guardian',MAIN);
 const view=structuresFor(sim.state,'blue');
 for(const b of setup.barracks){
  const target=entity(sim,b.id);
  const cells=[{x:b.x,y:b.y+(b===north?72:-72)},westOf(b)];
  assert.ok(cells.some(p=>canAttackOn(sim.geo,{...sim.hero,...p},target,view)&&
   !sim.geo.blocked(p.x,p.y,sim.hero.radius,view)&&nav.canReachWaypoint(sim.hero,p,view)),b.id);
 }
});

const courtGuardIds=(sim,site)=>Object.values(sim.state.units).filter(u=>u.courtyardBarracks===site.id).map(u=>u.id);
function quietCourtyard(keepWardens=[]){
 const sim=quiet();
 for(const id of Object.keys(sim.state.units))if(id!=='guardian'&&!keepWardens.includes(id))delete sim.state.units[id];
 delete sim.state.structures['azure-barracks-0'];
 sim.eliteNext.clear();
 return sim;
}

for(const [approach,start,face] of [
 ['North',[2328,264],{x:2616,y:536}],
 ['Center',[2328,600],{x:2472,y:648}],
 ['South',[2328,936],{x:2616,y:760}],
])test(`${approach} Keep siege draws both courtyard Wardens and they return after retreat`,()=>{
 const pair=setup.wardens.filter(w=>w.defendKeep);
 const ids=pair.map(w=>w.id);
 const sim=quietCourtyard(ids);
 assert.deepEqual(ids,['red-warden-court-north','red-warden-court-south']);
 for(const id of ids)assert.equal(entity(sim,id).localGuard.radius,168);
 sim.state.autoAttack=false;
 // Keep the courtyard structures and give the probe time to observe both Wardens.
 sim.hero.armor=1000;
 for(const id of setup.post.holders)strike(sim,'guardian',id);
 until(sim,1);
 assert.ok(sim.teleportHero(...start));
 walk(sim,face);
 assert.equal(canAttackOn(sim.geo,sim.hero,entity(sim,KEEP),structuresFor(sim.state,'blue')),false,'Central still shields the Keep');
 strike(sim,'guardian',KEEP,1);
 const remote=entity(sim,approach==='South'?ids[0]:ids[1]);
 assert.ok(dist(remote.localGuard.anchor,sim.hero)>remote.localGuard.radius);
 until(sim,sim.clock.tick+HZ);
 assert.equal(remote.targetId,undefined,'a shielded hit and Barracks activation do not rally the distant Warden');
 strike(sim,'guardian',sim.state.post.bannerId);
 until(sim,sim.clock.tick+1);
 assert.ok(canAttackOn(sim.geo,sim.hero,entity(sim,KEEP),structuresFor(sim.state,'blue')));
 sim.state.autoAttack=true;
 sim.send({type:'target',id:KEEP});
 const events=until(sim,sim.clock.tick+HZ*7);
 const first=events.find(e=>e.type==='damage'&&e.id===KEEP&&e.sourceId==='guardian'&&e.amount>0);
 assert.ok(first,'Guardian lands a real melee hit on the Keep');
 const hits=ids.map(id=>events.filter(e=>e.type==='damage'&&e.sourceId===id&&e.id==='guardian'&&e.at>first.at));
 for(const [i,log] of hits.entries())assert.ok(log.length,JSON.stringify({warden:ids[i],hero:sim.hero,
  guard:entity(sim,ids[i]),route:sim.navigation.routeFor(ids[i])}));
 console.log(JSON.stringify({approach,hitDelay:hits.map(log=>(log[0].at-first.at)/HZ),
  damage:hits.map(log=>log.reduce((total,e)=>total+e.amount,0))}));

 sim.send({type:'target',id:''});
 sim.state.autoAttack=false;
 assert.ok(sim.teleportHero(2616,440)); // Outside the courtyard but still inside North's original zone.
 const plans=sim.navigation.stats.plans;
 until(sim,sim.clock.tick+HZ*6);
 for(const w of pair){
  const unit=entity(sim,w.id);
  assert.equal(unit.targetId,undefined);
  assert.ok(dist(unit,{x:w.anchor[0],y:w.anchor[1]})<=30,`${w.id} returns to its anchor`);
 }
 assert.ok(sim.navigation.stats.plans-plans<=35,'return does not cause a pathfinding loop');
 if(approach==='North'){
  for(const id of ids)strike(sim,'guardian',id);
  const due=sim.clock.tick+pair[0].respawnTicks;
  until(sim,due-1);
  for(const id of ids)assert.equal(entity(sim,id),undefined);
  const respawns=until(sim,due);
  for(const w of pair){
   assert.ok(respawns.some(e=>e.type==='spawn'&&e.id===w.id));
   const unit=entity(sim,w.id);
   assert.deepEqual([unit.x,unit.y],w.anchor);
  }
  assert.ok(sim.teleportHero(face.x,face.y));
  const reengaged=until(sim,sim.clock.tick+HZ*12,[],()=>{sim.hero.hp=sim.hero.maxHp;});
  for(const id of ids)assert.ok(reengaged.some(e=>e.type==='damage'&&e.sourceId===id&&e.id==='guardian'),
   JSON.stringify({id,hero:[sim.hero.x,sim.hero.y,sim.hero.hp],guard:entity(sim,id),route:sim.navigation.routeFor(id),
    nearby:Object.values(sim.state.units).filter(u=>u!==sim.hero&&dist(u,sim.hero)<140).map(u=>[u.id,u.x,u.y,u.radius])}));
 }
});

test('courtyard entry staggers production and each Barracks independently stops training on destruction',()=>{
 const sim=quietCourtyard(),[a,b]=setup.courtyard.barracks;
 assert.equal(sim.state.captures[a.id],undefined);
 assert.equal(sim.state.captures[b.id],undefined);
 assert.equal(sim.state.structures[a.id].hp,1050);
 until(sim,10*HZ);
 assert.equal(courtGuardIds(sim,a).length,0);
 assert.equal(courtGuardIds(sim,b).length,0);
 // First exit is occupied by the Guardian, so production must use the second.
 assert.ok(sim.teleportHero(...a.slots[0]));
 sim.state.autoAttack=false;
 until(sim,sim.clock.tick+1);
 const first=sim.clock.tick,id=courtGuardIds(sim,a)[0];
 assert.ok(id);
 assert.deepEqual([entity(sim,id).x,entity(sim,id).y],a.slots[1]);
 assert.ok(sim.teleportHero(744,600));
 until(sim,first+5*HZ-1);
 assert.equal(courtGuardIds(sim,b).length,0);
 assert.ok(sim.teleportHero(...b.slots[0]));
 until(sim,first+5*HZ);
 const southGuard=entity(sim,courtGuardIds(sim,b)[0]);
 assert.ok(southGuard);
 assert.deepEqual([southGuard.x,southGuard.y],b.slots[1]);
 assert.ok(sim.teleportHero(744,600));
 until(sim,first+40*HZ);
 assert.equal(courtGuardIds(sim,a).length,2);
 assert.equal(courtGuardIds(sim,b).length,2);
 for(const site of [a,b])for(const id of courtGuardIds(sim,site)){
  const u=entity(sim,id);
  assert.ok(Math.hypot(u.x-site.anchor[0],u.y-site.anchor[1])<=32);
  assert.equal(u.targetId,undefined);
 }
 const survivors=courtGuardIds(sim,a);
 strike(sim,'guardian',a.id);
 assert.deepEqual(courtGuardIds(sim,a),survivors);
 const prior=courtGuardIds(sim,b);
 for(const id of [...survivors,...prior])strike(sim,'guardian',id);
 until(sim,sim.clock.tick+1);
 assert.equal(courtGuardIds(sim,b).length,1,'only one overdue recruit is due per site');
 until(sim,sim.clock.tick+12*HZ);
 assert.equal(courtGuardIds(sim,a).length,0);
 assert.equal(courtGuardIds(sim,b).length,2);
 assert.ok(courtGuardIds(sim,b).every(id=>!prior.includes(id)));
 strike(sim,'guardian',b.id);
 for(const id of courtGuardIds(sim,b))strike(sim,'guardian',id);
 until(sim,sim.clock.tick+11*HZ);
 assert.equal(courtGuardIds(sim,b).length,0);
});

test('a courtyard soldier engages the Guardian and returns to its own post after retreat',()=>{
 const sim=quietCourtyard(),[a]=setup.courtyard.barracks;
 sim.state.autoAttack=false;
 assert.ok(sim.teleportHero(2480,552));
 const events=until(sim,8*HZ),[id]=courtGuardIds(sim,a);
 assert.ok(id);
 assert.ok(events.some(e=>e.type==='damage'&&e.sourceId===id&&e.id==='guardian'&&e.amount>0));
 assert.ok(sim.teleportHero(744,600));
 until(sim,16*HZ);
 const u=entity(sim,id);
 assert.equal(u.targetId,undefined);
 assert.ok(Math.hypot(u.x-a.anchor[0],u.y-a.anchor[1])<=32);
});

test('a damaging Barracks or Keep hit activates the courtyard even outside the entry area',()=>{
 for(const target of [KEEP,setup.courtyard.barracks[0].id]){
  const sim=quietCourtyard(),[a]=setup.courtyard.barracks;
  if(target===KEEP){
   strike(sim,'guardian',KEEP,1);
   until(sim,sim.clock.tick+2);
   assert.equal(courtGuardIds(sim,a).length,0,'a shielded hit cannot activate production');
   for(const id of setup.post.holders)strike(sim,'guardian',id);
   until(sim,sim.clock.tick+1);
   strike(sim,'guardian',sim.state.post.bannerId);
   until(sim,sim.clock.tick+1);
  }
  strike(sim,'guardian',target,1);
  until(sim,sim.clock.tick+1);
  assert.equal(courtGuardIds(sim,a).length,1);
 }
});

test('ordinary wave spawns can use all 19 slots while four courtyard guards are alive',()=>{
 const sim=quietCourtyard();
 sim.activateCourtyard(1);
 until(sim,16*HZ);
 const s=sim.state,locals=()=>Object.values(s.units).filter(u=>u.courtyardBarracks);
 assert.equal(locals().length,4);
 for(let i=0;i<17;i++){
  const id='cap-red-'+i;
  s.units[id]=sim.unit(id,'minion-red',192+i*48,1344);
 }
 for(const [i,b] of [north,south,north].entries()){
  const [x,y]=b.slots[i===2?1:0];
  sim.spawnQueue.push({tick:sim.clock.tick,team:'red',id:'red-test-wave-'+i,x,y,wave:0});
 }
 sim.spawnDue(sim.clock.tick);
 assert.deepEqual(sim.spawnQueue.map(e=>e.id),['red-test-wave-2']);
 assert.equal(Object.values(s.units).filter(u=>u.team==='red').length,23);
 assert.equal(locals().length,4);
});

for(const approach of ['North','Center'])for(const b of setup.courtyard.barracks)
 test(`${approach} can reach and destroy ${b.id} with normal commands`,()=>{
  const sim=quietCourtyard();
  const gate=approach==='North'?'red-north-postern':MAIN;
  strike(sim,'guardian',gate);
  for(const d of setup.encounter.defenders)strike(sim,'guardian',d.id);
  assert.ok(sim.teleportHero(1992,approach==='North'?264:600));
  const target=entity(sim,b.id),cell={x:b.x-72,y:b.y};
  const blue=structuresFor(sim.state,'blue');
  assert.ok(canAttackOn(sim.geo,{...sim.hero,...cell},target,blue));
  walk(sim,cell);
  sim.send({type:'target',id:b.id});
  assert.ok(until(sim,sim.clock.tick+20*HZ).some(e=>e.type==='death'&&e.id===b.id&&e.sourceId==='guardian'));
 });

const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {battlefield,riverIsland}=require('../.test-build/world/battlefield.js');
const {combatStructures,structuresFor}=require('../.test-build/simulation/GameState.js');
const {buildings}=require('../.test-build/data/buildings.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
// Chapter 4 Mission 3 "River & Island" (docs/CHAPTER4_M3_DESIGN.md): the camp in the middle of a river, a normal Gatehouse on the short road and a Crimson Barracks at the South Bridge that owns both wave slots.
// Focused checks on what is new (two-route geometry, spawn reachability, Barracks ownership, the Keep shield, the island pad); M1 and M2 keep their own suites. Every balance value is provisional.
const L=campaign.get('campaign-33'),HERO='red-hero',ISLE_N='c4-isle-north',ISLE_S='c4-isle-south',GN='c4-gate-north',GS='c4-gate-south',GATE='red-gate',BARRACKS='red-barracks-south',KEEP='red-base',BANNER='c4-banner';
const WAVE_SLOTS=[[1440,936],[1440,1032]],ELITE_SLOTS=[[1536,936],[1536,1032]],HERO_SPAWN=[1488,984],FLAG=[984,600];
const fresh=(id='l33')=>new Simulation(id,campaign.setup(33));
const play=(sim,ticks,log=[],each)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){each?.(sim);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
// The opening Azure Vanguards stand near the camp at tick 0 only in the sense of Meadow's positions; move them away so nothing but the test touches the camp.
const clear=sim=>{for(const id of ['blue-0','blue-1','blue-2']){const u=sim.state.units[id];if(u){u.x=700;u.y=300;}}};
const capture=(sim,log=[])=>{clear(sim);for(const id of [HERO,ISLE_N,ISLE_S])if(sim.state.units[id]?.hp>0||sim.state.structures[id]?.hp>0)strike(sim,'guardian',id);sim.teleportHero(1040,648);play(sim,125,log);return log;};
const cells=(sim,radius,structs,from)=>{const C=40,R=24,geo=sim.geo,seen=new Set(),q=[[Math.floor(from[0]/48),Math.floor(from[1]/48)]];while(q.length){const [c,r]=q.pop(),k=r*C+c;if(c<0||r<0||c>=C||r>=R||seen.has(k)||geo.blocked((c+.5)*48,(r+.5)*48,radius,structs))continue;seen.add(k);q.push([c+1,r],[c-1,r],[c,r+1],[c,r-1]);}return seen;};
const reach=(sim,radius,structs,from)=>{const seen=cells(sim,radius,structs,from);return p=>seen.has(Math.floor(p[1]/48)*40+Math.floor(p[0]/48));};
const redUnits=sim=>Object.values(sim.state.units).filter(u=>u.team==='red'&&u.hp>0);
const inNeck=u=>u.x>1104&&u.x<1200&&u.y>528&&u.y<672,onBridge=u=>u.y>900&&u.x>800&&u.x<1210;

test('Mission 3 is River & Island: Chapter 4, campaign-33, capture the Island Camp then destroy the Keep',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[33,4,'campaign-33','River & Island','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission.phases.map(p=>p.id),['capture','assault']);assert.equal(L.mission.phases[0].objectives[0].display.label,'Capture the Island Camp');assert.deepEqual(L.mission.phases[1].objectives[0].targets,[KEEP]);
});
test('the approved values: M2 waves and start, a normal 3,000 HP gate, a 2,000 HP Barracks owning both wave slots, spawns apart from them, the island pad, one Azure Barracks',()=>{
 const o=L.match.overrides,p=o.post;
 assert.equal(o.battlefield,'river-island');assert.deepEqual(o.start,{gold:0,wood:100,iron:10});
 assert.deepEqual(o.waves.enemyPerWave,[6,6,6,6,7,7,8,8]);assert.equal(o.waves.waveInterval,25*HZ);assert.equal(o.waves.firstWaveTick,300);assert.equal(o.waves.alliedPerWave,1);assert.equal(o.waves.flanks,undefined);
 assert.deepEqual(o.waves.redSlots,WAVE_SLOTS);assert.deepEqual(o.gates,[{id:GATE,hp:3000,assist:true}],'a normal gate (no faction flag) that its Azure soldiers help to break');assert.deepEqual(o.barracks,[{id:BARRACKS,hp:2000,slots:WAVE_SLOTS}]);
 assert.deepEqual(o.defenders,[ISLE_N,ISLE_S,GN,GS],'exactly two gate towers, no other Crimson tower');
 assert.deepEqual([p.bannerHp,p.raiseTicks,p.repair,p.counter.count,p.hero.guard,p.hero.respawnTicks],[2000,4*HZ,{percent:60,ticks:5*HZ},2,220,30*HZ]);
 assert.deepEqual([p.circle,p.flag,p.ring,p.ruin,p.name,p.ballista],[{x:960,y:576,radius:120},{x:984,y:600},96,{col:21,row:13},'Island Camp',undefined],'no Ballista in M3');
 assert.deepEqual(p.counter.slots,ELITE_SLOTS);assert.deepEqual(p.hero.anchor,[1056,576]);assert.deepEqual(p.hero.spawn,HERO_SPAWN);
 assert.equal(p.firstNotice,'Island Camp captured! Break the Gatehouse or cross the South Bridge');
 assert.equal(o.azure.limit,1);assert.deepEqual(o.azure.initial,[]);assert.deepEqual(o.azure.pads.at(-1),{col:20,row:10});assert.equal(o.azure.pads.length,4);
 for(const s of [...ELITE_SLOTS,HERO_SPAWN])assert.equal(WAVE_SLOTS.some(w=>w[0]===s[0]&&w[1]===s[1]),false,'Elite and Hero spawns are not wave slots');
});
test('the layout: six water blocks, the island, a 144 px Gatehouse neck and a 144 px South Bridge, towers, gate and Barracks in the right places',()=>{
 const f=riverIsland;assert.equal(battlefield('river-island'),f);
 assert.deepEqual(f.barriers.map(b=>[b.x0,b.y0,b.x1,b.y1]),[[816,-Infinity,1104,456],[816,696,1104,912],[816,1056,1104,Infinity],[1104,-Infinity,1200,528],[1104,672,1200,912],[1104,1056,1200,Infinity]]);
 assert.equal(1056-912,144);assert.equal(672-528,144);
 assert.deepEqual(f.gates,[{id:GATE,x:1128,y:600,columns:1,rows:3}]);assert.deepEqual(f.barracks,[{id:BARRACKS,x:1344,y:1008,columns:2,rows:2}]);assert.deepEqual(f.outposts,[{x:960,y:576,radius:120}]);
 assert.deepEqual(f.towers.map(t=>[t.id,t.x,t.y]),[[ISLE_N,912,504],[ISLE_S,912,648],[GN,1248,504],[GS,1248,696]]);
 assert.deepEqual(f.entities.filter(e=>e.id.startsWith('blue-b')||e.id.startsWith('red-b')).map(e=>[e.id,e.x,e.y]),[['blue-base',330,600],['red-base',1610,600]]);
});
test('geometry: the Gatehouse is solid for both sides, the South Bridge and the island are open, and the flag is a cell centre with open attack cells',()=>{
 const sim=fresh(),geo=sim.geo,s=sim.state;
 assert.ok(s.structures[GATE]&&!s.structures[GATE].gate,'a normal gate');assert.equal(structuresFor(s,'red')[GATE]?.id,GATE,'Crimson sees it as solid');assert.equal(structuresFor(s,'blue')[GATE]?.id,GATE);
 const land=Object.fromEntries(Object.entries(combatStructures(s)).filter(([id])=>id===GATE||id===BARRACKS));
 for(const radius of [12,20]){ // the largest unit (Guardian, Hero) has radius 20
  const blue=reach(sim,radius,land,[450,600]),red=reach(sim,radius,structuresFor(s,'red'),[1776,480]);
  assert.equal(blue([1480,600]),true,`Azure (radius ${radius}) reaches the Crimson field by the South Bridge`);
  const seal={...s.structures[GATE],id:'seal',x:960,y:984,columns:1,rows:5},noBridge=reach(sim,radius,{...land,seal},[450,600]);
  assert.equal(noBridge([1480,600]),false,`with the bridge shut and the gate standing there is no other way (radius ${radius})`);
  assert.equal(reach(sim,radius,{},[450,600])([1230,600]),true,'and without the gate the neck is a road');
  for(const p of [[984,984],[1250,984],[1000,600],[1152,600],[1080,540]])assert.equal(geo.blocked(p[0],p[1],radius,{}),false,`${p} is open at radius ${radius}`);
  assert.equal(red([450,600]),true,`Crimson (radius ${radius}) reaches the west bank`);
 }
 assert.equal(geo.blocked(FLAG[0],FLAG[1],12,combatStructures(s)),false,'the flag is open');assert.deepEqual([(FLAG[0]-24)%48,(FLAG[1]-24)%48],[0,0],'a cell centre');
 assert.equal(geo.blocked(1032,648,24,{}),false,'the tower ruin cell');assert.ok(Math.hypot(1032-960,648-576)<=120,'inside the circle');
});
test('every Crimson spawn point (wave slots, Elite slots, Hero spawn) is open ground and reaches the Azure Keep and every cell beside the Banner',()=>{
 const sim=fresh(),s=sim.state,red=structuresFor(s,'red');
 for(const p of [...WAVE_SLOTS,...ELITE_SLOTS,HERO_SPAWN]){
  assert.equal(sim.geo.blocked(p[0],p[1],12,red),false,`${p} is open for a minion`);
  const r=reach(sim,12,red,p);assert.equal(r([450,600]),true,`${p} reaches the Azure Keep's front`);
  for(const q of [[936,600],[1032,600],[984,552],[984,648]])assert.equal(r(q),true,`${p} reaches ${q}, beside the Banner`);
  assert.equal(r([1056,576]),true,`${p} reaches the Hero's anchor`);
 }
});
test('Crimson waves cross the South Bridge from the Barracks slots; none enters the neck or attacks the standing Gatehouse',()=>{
 const sim=fresh();clear(sim);sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e8;
 const bridge=new Set(),neck=new Set();
 play(sim,300+HZ*60,[],()=>{sim.hero.hp=sim.hero.maxHp=1e6;for(const u of redUnits(sim)){if(u.id===HERO)continue;if(onBridge(u))bridge.add(u.id);if(inNeck(u))neck.add(u.id);}});
 assert.ok(bridge.size>=6,`a wave used the bridge (${bridge.size})`);assert.equal(neck.size,0,'nobody in the neck');
 assert.ok(sim.state.structures[GATE].hp===sim.state.structures[GATE].maxHp,'the Gatehouse is untouched');
 assert.ok(sim.state.spawnedWaves>=2);
});
test('the Barracks owns both wave slots: its death stops every later wave, and the Elite counterattack and the Hero are independent of it',()=>{
 const sim=fresh(),s=sim.state,log=[];clear(sim);s.bases['blue-base'].hp=s.bases['blue-base'].maxHp=1e8;
 play(sim,310,log);
 assert.ok(redUnits(sim).filter(u=>u.id!==HERO).length>=1,'wave 1 spawned at the Barracks slots');
 const slotsOf=redUnits(sim).filter(u=>u.id!==HERO).map(u=>[u.x,u.y]);assert.ok(slotsOf.every(p=>p[0]>=1400),'spawned east of the bridge');
 strike(sim,'guardian',BARRACKS);play(sim,2,log);assert.equal(s.structures[BARRACKS],undefined,'the Barracks is gone');
 const ids=new Set(Object.keys(s.units).filter(id=>s.units[id].team==='red'));
 play(sim,HZ*100,log,x=>{x.hero.hp=x.hero.maxHp=1e6;});
 const later=Object.keys(s.units).filter(id=>s.units[id].team==='red'&&!ids.has(id)&&id!==HERO);assert.deepEqual(later,[],'no wave unit after the Barracks died');assert.ok(s.spawnedWaves>=3,'the wave clock keeps running');
 for(const id of Object.keys(s.units))if(s.units[id].team==='red'&&id!==HERO)delete s.units[id];
 capture(sim,log);play(sim,HZ*2,log);
 const ca=Object.values(s.units).filter(u=>u.id.startsWith('red-ca-'));assert.equal(ca.length,2,'both Elites spawned despite the dead Barracks');
 assert.deepEqual(ca.map(u=>u.archetype),['crimson-elite','crimson-elite']);
 const started=ca.map(u=>[Math.round(u.x),Math.round(u.y)]);assert.ok(started.every(p=>p[0]>1300&&p[1]>900),`they came from the east side of the bridge: ${started}`);
 const banner=s.structures[BANNER];assert.ok(banner&&banner.hp>0);
 play(sim,HZ*40,log,x=>{x.hero.hp=x.hero.maxHp=1e6;});
 assert.ok(log.some(e=>e.type==='damage'&&e.id===BANNER&&e.sourceId?.startsWith('red-ca-')),'the Elites reached the Banner and attacked it');
});
test('the Hero: Warden at the camp, respawns at (1488,984) 30 s after a death, then hunts the Banner as a Raider',()=>{
 const sim=fresh(),s=sim.state,log=[];capture(sim,log);
 assert.equal(s.units[HERO]?.hp>0,false,'the capture kills the Hero first');
 let seen=null;play(sim,HZ*40,log,x=>{x.hero.hp=x.hero.maxHp=1e6;const h=x.state.units[HERO];if(!seen&&h&&h.hp>0)seen={tick:x.clock.tick,x:h.x,y:h.y};});
 assert.ok(seen,'he is back');assert.ok(Math.abs(seen.x-HERO_SPAWN[0])<2&&Math.abs(seen.y-HERO_SPAWN[1])<2,`at his spawn (${seen.x},${seen.y})`);
 assert.ok(seen.tick>=900&&seen.tick<=900+130,`30 s after his death (tick ${seen.tick})`);
 const h=s.units[HERO];assert.ok(Math.hypot(h.x-FLAG[0],h.y-FLAG[1])<Math.hypot(HERO_SPAWN[0]-FLAG[0],HERO_SPAWN[1]-FLAG[1])-150,'closing on the Banner as a Raider');
});
test('the Crimson Keep is shielded until the camp is Azure, shielded again when the Banner falls, and the HUD event fires on a blocked strike',()=>{
 const sim=fresh(),s=sim.state,log=[];assert.equal(s.bases[KEEP].invulnerable,true);
 const keep=s.bases[KEEP],hp0=keep.hp;sim.hit(s.units.guardian,keep,500,'direct');assert.equal(keep.hp,hp0);assert.ok(sim.drainEvents().some(e=>e.type==='post'&&e.change==='shielded'));
 capture(sim,log);assert.equal(s.post.owner,'azure');assert.equal(s.bases[KEEP].invulnerable,undefined);
 assert.ok(log.some(e=>e.type==='post'&&e.change==='captured'&&e.first),'first capture');
 strike(sim,KEEP,BANNER);play(sim,3,log);assert.equal(s.post.owner,'crimson');assert.equal(s.bases[KEEP].invulnerable,true,'the shield is back');
});
test('the island Azure Barracks pad opens with the camp; the limit stays one',()=>{
 const sim=fresh(),s=sim.state;sim.economy.balances.wood=1e5*120;sim.economy.balances.iron=1e5*120;clear(sim);
 assert.equal(sim.placementReason('barracks',20,10),'Capture the Island Camp first');assert.equal(sim.placementReason('barracks',10,10),'','home pads are open from the start');
 capture(sim);assert.equal(s.post.owner,'azure');assert.equal(sim.placementReason('barracks',20,10),'');
 sim.send({type:'place',requestId:'isle',kind:'barracks',col:20,row:10});play(sim,2);
 assert.ok(Object.values(s.structures).some(b=>b.azureBarracks&&b.col===20&&b.row===10),'the island Barracks is placed');
 assert.equal(sim.placementReason('barracks',10,10),'Barracks limit reached');assert.equal(sim.placementReason('barracks',10,14),'Barracks limit reached');
 strike(sim,KEEP,BANNER);play(sim,3);
 assert.equal(s.post.owner,'crimson');assert.ok(Object.values(s.structures).some(b=>b.azureBarracks&&b.col===20),'a lost camp does not take back what was built');
});
test('the Gatehouse is breakable and opens a short road for Azure; Crimson waves still arrive by the shorter South Bridge',()=>{
 const sim=fresh(),s=sim.state;clear(sim);s.bases['blue-base'].hp=s.bases['blue-base'].maxHp=1e8;
 strike(sim,'guardian',GATE);play(sim,2);assert.equal(s.structures[GATE],undefined);
 const seal={...s.structures[BARRACKS],id:'seal',x:960,y:984,columns:1,rows:5};
 for(const radius of [12,20])assert.equal(reach(sim,radius,{seal},[450,600])([1480,600]),true,`with the bridge shut the neck is a way through (radius ${radius})`);
 const west=new Set();play(sim,300+HZ*45,[],x=>{x.hero.hp=x.hero.maxHp=1e6;for(const u of redUnits(x))if(u.id!==HERO&&u.x<780)west.add(u.id);});
 assert.ok(west.size>=1,`waves still reach the west bank (${west.size})`);
});
test('the objective flow: capture then assault, the Keep falls to the win',()=>{
 const sim=fresh(),s=sim.state,log=[];assert.equal(sim.missionStatus().objectives.find(o=>o.id==='camp').complete,false);
 capture(sim,log);assert.equal(sim.missionStatus().objectives.find(o=>o.id==='camp').complete,true);
 s.bases['blue-base'].hp=s.bases['blue-base'].maxHp=1e8;strike(sim,'guardian',KEEP);play(sim,2,log);assert.equal(sim.state.match.phase==='ended'||sim.ended,true);
});
test('the opening Azure units stand on open ground Crimson can reach, and the first wave leaves its slots with them in place',()=>{
 const sim=fresh(),s=sim.state,red=structuresFor(s,'red');
 for(const id of ['blue-0','blue-1','blue-2']){const u=s.units[id];assert.equal(sim.geo.blocked(u.x,u.y,u.radius,red),false,`${id} is not inside a wall or the water`);assert.equal(reach(sim,12,red,HERO_SPAWN)([u.x,u.y]),true,`Crimson can reach ${id}`);}
 s.bases['blue-base'].hp=s.bases['blue-base'].maxHp=1e8;let left=0;play(sim,300+HZ*6,[],x=>{x.hero.hp=x.hero.maxHp=1e6;});
 for(const u of redUnits(sim))if(u.id.startsWith('red-w')&&u.x<1400)left++;
 assert.ok(left>=1,'a wave unit has left the slots');
});

// Chapter 4 M3 soldier support (MatchGate.assist): Azure Barracks soldiers help the Guardian break the Gatehouse and never pick a Gatehouse tower they cannot strike.
const {hasAttackCell}=require('../.test-build/simulation/SoldierProto.js');
const soldierSim=(setup,{towers=false}={})=>{const sim=new Simulation('l33s',setup),s=sim.state;clear(sim);
 for(const id of [HERO,ISLE_N,ISLE_S,...(towers?[]:[GN,GS])]){delete s.units[id];delete s.structures[id];}
 sim.spawnSoldier('blue-s-t1',1000,640);sim.spawnSoldier('blue-s-t2',1000,560);return sim;};
const keepWell=x=>{x.hero.hp=x.hero.maxHp=1e6;for(const u of Object.values(x.state.units))if(u.id.startsWith('blue-s-'))u.hp=u.maxHp;x.state.bases['blue-base'].hp=x.state.bases['blue-base'].maxHp=1e8;x.spawnQueue.length=0;for(const u of Object.values(x.state.units))if(u.team==='red')delete x.state.units[u.id];};
const gateOrders=sim=>{sim.send({type:'target',id:GATE});sim.send({type:'attack'});};
test('A. the Guardian breaks the intact Gatehouse and nearby soldiers target and strike it too',()=>{
 const sim=soldierSim(campaign.setup(33)),s=sim.state,log=[];assert.equal(sim.soldierProto.assist,true);sim.teleportHero(1040,600);
 const targeted=new Set();play(sim,HZ*12,log,x=>{keepWell(x);gateOrders(x);for(const u of Object.values(s.units))if(u.id.startsWith('blue-s-')&&u.targetId===GATE)targeted.add(u.id);});
 assert.deepEqual([...targeted].sort(),['blue-s-t1','blue-s-t2'],'both soldiers target the gate');
 const hits=id=>log.filter(e=>e.type==='damage'&&e.id===GATE&&e.sourceId===id).length;assert.ok(hits('blue-s-t1')>=3&&hits('blue-s-t2')>=3,'and strike it');
});
test('B. a soldier does not touch the Gatehouse unless the Guardian is attacking it',()=>{
 const sim=soldierSim(campaign.setup(33)),s=sim.state,log=[];sim.teleportHero(1040,600);
 const targeted=new Set();play(sim,HZ*12,log,x=>{keepWell(x);for(const u of Object.values(s.units))if(u.id.startsWith('blue-s-')&&u.targetId===GATE)targeted.add(u.id);});
 assert.equal(targeted.size,0);assert.equal(log.some(e=>e.type==='damage'&&e.id===GATE),false);
});
test('C. the assist is opt-in: without the flag, and in Cliff Pass, soldiers ignore the gate the Guardian is breaking',()=>{
 const off=campaign.setup(33);off.gates=off.gates.map(g=>({...g,assist:undefined}));
 for(const [name,setup] of [['M3 without the flag',off],['Cliff Pass (campaign-32)',campaign.setup(32)]]){
  const sim=new Simulation('l33c',setup),s=sim.state;clear(sim);for(const u of Object.values(s.units))if(u.team==='red')delete s.units[u.id];for(const id of Object.keys(s.structures))if(s.structures[id].kind==='tower')delete s.structures[id];
  const g=s.structures[GATE];sim.teleportHero(g.x-90,g.y);sim.spawnSoldier('blue-s-t1',g.x-130,g.y+40);assert.equal(sim.soldierProto.assist,undefined,name);
  const log=[];play(sim,HZ*10,log,x=>{keepWell(x);gateOrders(x);});
  assert.equal(log.some(e=>e.type==='damage'&&e.id===GATE&&String(e.sourceId).startsWith('blue-s-')),false,`${name}: no soldier hits the gate`);
  assert.ok(s.structures[GATE].hp<s.structures[GATE].maxHp,`${name}: the Guardian does`);
 }
});
test('D. soldiers have no attack cell for the Gatehouse and island towers (cell edges), but do for a tower on a cell centre',()=>{
 const sim=new Simulation('l33d',campaign.setup(33)),s=sim.state;
 for(const id of [ISLE_N,ISLE_S,GN,GS])assert.equal(hasAttackCell(sim.geo,s.structures[id],12,48),false,`${id} cannot be struck by a soldier`);
 assert.equal(hasAttackCell(sim.geo,{...s.structures[GN],x:1272},12,48),true,'a tower on a cell centre can');
});
test('E. after the Gatehouse falls the soldiers never select a Gatehouse tower and keep moving with the Guardian instead of standing idle',()=>{
 const sim=soldierSim(campaign.setup(33),{towers:true}),s=sim.state,log=[];sim.teleportHero(1040,600);
 while(s.structures[GATE]&&sim.clock.tick<HZ*90)play(sim,1,log,x=>{keepWell(x);gateOrders(x);});assert.equal(s.structures[GATE],undefined,'the gate fell');
 const picked=new Set(),moved=new Set(),at={};for(const id of ['blue-s-t1','blue-s-t2'])at[id]={x:s.units[id].x,y:s.units[id].y};
 play(sim,HZ*20,log,x=>{keepWell(x);x.state.move={x:.5,y:0};for(const id of Object.keys(at)){const u=s.units[id];if(!u)continue;if(u.targetId===GN||u.targetId===GS)picked.add(id);if(Math.hypot(u.x-at[id].x,u.y-at[id].y)>100)moved.add(id);}});
 assert.equal(picked.size,0,'no soldier targets a Gatehouse tower');assert.equal(moved.size,2,'both soldiers moved on with the Guardian');
});
test('F. South Assault: soldiers cross the South Bridge with the Guardian instead of idling at the island',()=>{
 const sim=soldierSim(campaign.setup(33),{towers:true}),s=sim.state,h=sim.hero;sim.teleportHero(790,600);
 const path=[[790,600],[790,984],[960,984],[1250,984],[1300,930]];let leg=0;const crossed=new Set();
 play(sim,HZ*50,[],x=>{keepWell(x);const [tx,ty]=path[Math.min(leg,path.length-1)],d=Math.hypot(tx-h.x,ty-h.y);if(d<24&&leg<path.length-1)leg++;x.state.move=d>6?{x:(tx-h.x)/d,y:(ty-h.y)/d}:{x:0,y:0};
  for(const u of Object.values(s.units))if(u.id.startsWith('blue-s-')&&u.x>1150&&u.y>880)crossed.add(u.id);});
 assert.ok(crossed.size>=1,`soldiers reached the east end of the bridge (${[...crossed]})`);
});

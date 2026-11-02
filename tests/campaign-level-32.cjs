const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {validateMission}=require('../.test-build/data/mission.js');
const {battlefield,cliffPass}=require('../.test-build/world/battlefield.js');
const {buildings}=require('../.test-build/data/buildings.js');
const {combatStructures,structuresFor}=require('../.test-build/simulation/GameState.js');
const {minionStatsOf}=require('../.test-build/data/combat.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
// Chapter 4 Mission 2 "Cliff Pass" (docs/CHAPTER4_M2_DESIGN.md): M1's loop in a cliff-walled hollow behind a faction gate, with a repairable Ballista on a cliff shelf.
// Every balance value is provisional; bot results guard against regressions, not for balance sign-off.
const L=campaign.get('campaign-32'),HERO='red-hero',NORTH='c4-camp-north',SOUTH='c4-camp-south',GN='c4-gate-north',GS='c4-gate-south',GATE='red-gate',KEEP='red-base',BANNER='c4-banner';
const BAL={col:21,row:9},BX=1032,BY=456,TOWER_RUIN={col:23,row:13};
const fresh=(id='l32',setup=campaign.setup(32))=>new Simulation(id,setup);
const play=(sim,ticks,log=[])=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){if(sim.purge)sim.purge();sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
// The opening Azure Vanguards stand 20 px from the flag at tick 0 (Meadow's positions); they move off in play, so the helper moves them off.
const capture=(sim,log=[])=>{for(const id of ['blue-0','blue-1','blue-2']){const u=sim.state.units[id];if(u){u.x=700;u.y=300;}}strike(sim,'guardian',HERO);for(const id of [NORTH,SOUTH])strike(sim,'guardian',id);sim.teleportHero(1080,624);play(sim,125,log);return log;};
const money=(sim,w=1e4,i=1e4)=>{sim.economy.balances.wood=w*120;sim.economy.balances.iron=i*120;};
// Remove every unit except the Guardian and the named ones, and keep waves and counter spawns out, every tick: a test that measures one thing alone.
const isolate=(sim,keep=()=>false)=>{sim.purge=()=>{sim.spawnQueue.length=0;for(const u of Object.values(sim.state.units))if(u.id!=='guardian'&&!keep(u))delete sim.state.units[u.id];};sim.purge();};
const mk=(sim,id,team,x,y,over={})=>{const m=minionStatsOf(),u={id,kind:team==='red'?'minion-red':'minion-blue',team,x,y,radius:m.radius,speed:m.speed,hp:1e6,maxHp:1e6,armor:m.armor,damage:m.damage,range:m.range,cooldownTicks:m.cooldownTicks,windupTicks:m.windupTicks,readyTick:0,protectionTick:0,...over};sim.state.units[id]=u;return u;};
const hitsOn=(log,id,source)=>log.filter(e=>e.type==='damage'&&e.id===id&&e.sourceId===source).length;

test('Mission 2 is Cliff Pass: Chapter 4, campaign-32, capture the Cliff Camp then destroy the Keep',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[32,4,'campaign-32','Cliff Pass','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission.phases.map(p=>p.id),['capture','assault']);assert.equal(L.mission.phases[0].objectives[0].display.label,'Capture the Cliff Camp');assert.deepEqual(L.mission.phases[1].objectives[0].targets,[KEEP]);
});
test('the approved values: M1 waves and start, 2 Elites, faction gate 3,000 HP, Ballista ruin, one Barracks',()=>{
 const o=L.match.overrides,p=o.post;
 assert.equal(o.battlefield,'cliff-pass');assert.deepEqual(o.start,{gold:0,wood:100,iron:10});
 assert.deepEqual(o.waves.enemyPerWave,[6,6,6,6,7,7,8,8]);assert.equal(o.waves.waveInterval,25*HZ);assert.equal(o.waves.firstWaveTick,300);assert.equal(o.waves.alliedPerWave,1);assert.equal(o.waves.flanks,undefined,'one road, no flank waves');
 assert.deepEqual(o.waves.redSlots,[[1776,480],[1776,720]]);assert.deepEqual(o.gates,[{id:GATE,hp:3000,faction:true}]);assert.deepEqual(o.defenders,[NORTH,SOUTH,GN,GS]);
 assert.deepEqual([p.bannerHp,p.raiseTicks,p.repair,p.counter.count,p.hero.guard,p.hero.respawnTicks],[2000,4*HZ,{percent:60,ticks:5*HZ},2,260,30*HZ]);
 assert.deepEqual([p.circle,p.flag,p.ring,p.ballista,p.ruin,p.name],[{x:1056,y:576,radius:144},{x:1080,y:552},96,BAL,TOWER_RUIN,'Cliff Camp']);
 assert.equal(o.azure.limit,1);assert.deepEqual(o.azure.initial,[]);assert.equal(o.azure.pads.length,3);
 assert.deepEqual([buildings.ballista.damage,buildings.ballista.cooldownTicks,buildings.ballista.range,buildings.ballista.maxHp,buildings.ballista.buildTicks],[70,90,420,520,150],'the approved Ballista: 70 damage every 3 s, 420 px, 520 HP, 5 s');
});
test('the layout: six cliff blocks, a 144 px neck, a gate site that fills its west half, towers and circle in the right places',()=>{
 const f=cliffPass;assert.equal(battlefield('cliff-pass'),f);
 assert.deepEqual(f.barriers.map(b=>[b.x0,b.y0,b.x1,b.y1]),[[768,-Infinity,1248,408],[1248,-Infinity,1344,528],[1344,-Infinity,1920,312],[768,792,1248,Infinity],[1248,672,1344,Infinity],[1344,888,1920,Infinity]]);
 assert.deepEqual(f.gates,[{id:GATE,x:1272,y:600,columns:1,rows:3}]);assert.deepEqual(f.outposts,[{x:1056,y:576,radius:144}]);
 assert.deepEqual(f.towers.map(t=>[t.id,t.x,t.y]),[[NORTH,1152,504],[SOUTH,1152,648],[GN,1392,504],[GS,1392,696]]);
 assert.equal(f.entities.some(e=>e.kind==='tower'||e.kind==='wall'),false,"Meadow's towers and walls are not here");
 assert.deepEqual(f.entities.filter(e=>e.id.startsWith('blue-b')||e.id.startsWith('red-b')).map(e=>[e.id,e.x,e.y]),[['blue-base',330,600],['red-base',1610,600]]);
});
test('geometry: the gate fully controls the route (Azure cannot pass it, Crimson can), the neck and the Keep lanes are wide enough, the cells and sight lines the design depends on are open',()=>{
 const sim=fresh(),geo=sim.geo,st=combatStructures(sim.state),blue={[GATE]:st[GATE]},red={}; // terrain and the gate: the camp holders and gate towers die or are routed around, and are not part of the layout's guarantee
 const reach=(from,radius,structs)=>{const C=40,R=24,ok=(c,r)=>!geo.blocked((c+.5)*48,(r+.5)*48,radius,structs),seen=new Set(),q=[[Math.floor(from[0]/48),Math.floor(from[1]/48)]];while(q.length){const [c,r]=q.pop(),k=r*C+c;if(c<0||r<0||c>=C||r>=R||seen.has(k)||!ok(c,r))continue;seen.add(k);q.push([c+1,r],[c-1,r],[c,r+1],[c,r-1]);}return k=>seen.has(Math.floor(k[1]/48)*C+Math.floor(k[0]/48));};
 for(const radius of [12,20,28]){
  assert.equal(reach([450,600],radius,blue)([1480,600]),false,`Azure (radius ${radius}) cannot reach the courtyard with the gate standing`);
  const open=reach([450,600],radius,{});assert.equal(open([1480,600]),true,'and can once it is gone');
  const crimson=reach([1776,480],radius,red);for(const p of [[450,600],[1776,480],[1776,720],[1752,600],[1010,598]])assert.equal(crimson(p),true,`Crimson (radius ${radius}) reaches ${p}`);
  for(const p of [[1296,600],[1296,560],[1296,640],[1610,420],[1610,780]])assert.equal(geo.blocked(p[0],p[1],radius,{}),false,`${p} is open at radius ${radius}`);
 }
 assert.equal(structuresFor(sim.state,'red')[GATE],undefined,'the Crimson view has no faction gate');assert.ok(structuresFor(sim.state,'blue')[GATE]&&st[GATE].gate===true);
 const ruin={x:BX,y:BY};assert.equal(geo.blocked(BX,BY,24,{}),false,'the ruin cell');assert.equal(geo.blocked(1080,552,12,{}),false,'the flag');
 assert.ok(Math.hypot(BX-1056,BY-576)<=144);
 for(const p of [[1248,600],[1056,576],[1080,552],[1200,480],[1200,720],[900,600],[800,600],[1230,540],[1230,660]])assert.equal(geo.lineOfSight(ruin,{x:p[0],y:p[1]},{[GATE]:st[GATE]}),true,`the Ballista sees ${p}`);
 assert.equal(geo.lineOfSight(ruin,{x:1272,y:600},{}),true,'the gate itself is a target (canAttackOn leaves the target out of the sight test)');assert.equal(geo.lineOfSight(ruin,{x:1296,y:600},{[GATE]:st[GATE]}),false,'but not behind the standing gate');assert.equal(geo.lineOfSight(ruin,{x:1296,y:600},{}),true,'until it falls');
 assert.equal(geo.lineOfSight({x:1392,y:504},{x:1200,y:576},{}),false,'the gate towers cannot see into the hollow: the teeth cover it');
});
test('the faction flag is per gate: Chapter 3 gates stay solid for Crimson, and a spawn slot a solid gate would seal is rejected',()=>{
 const s21=campaign.setup(21),sim=new Simulation('c3',s21);assert.equal(Object.values(sim.state.structures).some(b=>b.gate),false);
 assert.deepEqual(Object.keys(structuresFor(sim.state,'red')).sort(),Object.keys(combatStructures(sim.state)).sort(),'Crimson sees the Frost Gate');
 const o=structuredClone(L.match.overrides);o.gates=[{id:GATE,hp:3000}];
 assert.throws(()=>new Simulation('x',matchSetup('extended',{...o,mission:structuredClone(L.mission)})),/seal a Crimson spawn slot/,'without the flag the same level is sealed');
 assert.doesNotThrow(()=>new Simulation('y',campaign.setup(32)));
});
test('level data is validated: the Ballista ruin must be inside the circle, off the tower ruin and the flag; a camp name is non-empty',()=>{
 const build=mut=>{const o=structuredClone(L.match.overrides);mut(o.post);return matchSetup('extended',{...o,mission:structuredClone(L.mission)});};
 for(const [label,mut] of [['outside the circle',p=>{p.ballista={col:30,row:3};}],['on the tower ruin',p=>{p.ballista={...p.ruin};}],['on the flag',p=>{p.ballista={col:22,row:11};}],['fractional',p=>{p.ballista={col:21.5,row:9};}],['empty name',p=>{p.name='';}]])assert.throws(()=>build(mut),/Invalid post/,label);
 assert.equal(Object.hasOwn(campaign.setup(31).post,'ballista'),false);assert.equal(Object.hasOwn(campaign.setup(31).post,'name'),false,'M1 carries neither');
});

test('A. before capture the Ballista ruin cannot be repaired; only its own cell accepts a Ballista; a tower cannot take its place',()=>{
 const sim=fresh();money(sim);
 assert.equal(sim.placementReason('ballista',BAL.col,BAL.row),'Capture the Cliff Camp first');
 assert.equal(sim.placementReason('ballista',30,13),'Not a Ballista ruin');assert.equal(sim.placementReason('tower',BAL.col,BAL.row),'Ruined Ballista: repair it with a Ballista');
 assert.equal(sim.placementReason('tower',TOWER_RUIN.col,TOWER_RUIN.row),'Capture the Cliff Camp first');
 sim.send({type:'place',requestId:'b1',kind:'ballista',col:BAL.col,row:BAL.row});play(sim,3);assert.equal(sim.state.structures['built-b1'],undefined);
});
test('B. after capture a repair costs 60% of the Ballista (84 Wood, 18 Iron), is charged once, takes 5 s and leaves one Ballista per ruin',()=>{
 const sim=fresh(),s=sim.state;capture(sim);assert.equal(s.post.owner,'azure');
 sim.economy.balances.wood=0;sim.economy.balances.iron=0;assert.equal(sim.placementReason('ballista',BAL.col,BAL.row),'Not enough resources');
 money(sim,200,40);const w0=sim.economy.woodUnits,i0=sim.economy.ironUnits;assert.equal(sim.placementReason('ballista',BAL.col,BAL.row),'');
 const q=sim.placementQuote('ballista',BAL.col,BAL.row);assert.deepEqual([q.wood,q.iron],[84,18]);assert.deepEqual([sim.repairPrice('ballista').wood,sim.repairPrice('ballista').iron],[84,18],'the price the Build panel shows');
 sim.send({type:'place',requestId:'b1',kind:'ballista',col:BAL.col,row:BAL.row});play(sim,1);const b=s.structures['built-b1'];
 assert.ok(b&&b.ballista&&b.kind==='tower'&&b.team==='blue');assert.deepEqual(b.paidResources,{wood:84,iron:18});assert.ok(Math.abs((w0-sim.economy.woodUnits)/120-84)<1&&Math.abs((i0-sim.economy.ironUnits)/120-18)<1,'charged once (income of one tick aside)');
 assert.equal(b.completeTick-b.startTick,5*HZ);assert.ok(b.hp<b.maxHp/50);assert.deepEqual([b.maxHp,b.range],[520,420]);
 play(sim,5*HZ+2);assert.equal(b.hp,b.maxHp);assert.equal(sim.placementReason('ballista',BAL.col,BAL.row),'Occupied structure cell');
});
test('C. during repair: destroyed means the payment is lost and the ruin can be repaired again; the camp falling does not stop a started repair',()=>{
 const sim=fresh(),s=sim.state;capture(sim);money(sim,200,40);sim.send({type:'place',requestId:'b1',kind:'ballista',col:BAL.col,row:BAL.row});play(sim,HZ);
 const before=sim.economy.woodUnits;strike(sim,KEEP,'built-b1');play(sim,2);assert.equal(s.structures['built-b1']?.hp>0,false);assert.ok(sim.economy.woodUnits-before<120,'no refund beyond income');
 sim.teleportHero(700,600);isolate(sim);play(sim,2);assert.equal(sim.placementReason('ballista',BAL.col,BAL.row),'');
 sim.send({type:'place',requestId:'b2',kind:'ballista',col:BAL.col,row:BAL.row});play(sim,HZ);const b2=s.structures['built-b2'];strike(sim,KEEP,BANNER);play(sim,3);
 assert.equal(s.post.owner,'crimson');assert.ok(b2.hp>0&&b2.hp<b2.maxHp,'still rising');play(sim,5*HZ);assert.equal(b2.hp,b2.maxHp,'the repair finished after the camp fell');
});
test('D. a Ballista reaches 380 px (a tower stops at 240), does not reach 470 px, and respects line of sight',()=>{
 const sim=fresh();capture(sim);money(sim,200,40);sim.send({type:'place',requestId:'b1',kind:'ballista',col:BAL.col,row:BAL.row});play(sim,5*HZ+2);isolate(sim,u=>u.id.startsWith('probe'));sim.teleportHero(300,300);
 strike(sim,'guardian',GATE);play(sim,2); // gate down: the neck is the Ballista's line to the courtyard side
 const only=(id,x,y=BY)=>{for(const k of Object.keys(sim.state.units))if(k.startsWith('probe'))delete sim.state.units[k];mk(sim,id,'red',x,y,{speed:0,damage:0});return hitsOn(play(sim,4*HZ),id,'built-b1');};
 const near=only('probe-near',BX+100,BY+44),mid=only('probe-mid',1380,612),far=only('probe-far',1440,640);assert.ok(near>=1&&mid>=1&&far===0,JSON.stringify({near,mid,far})); // 381 px (through the neck, past a tower's 240) and 447 px (past the Ballista's 420)
 assert.ok(Math.hypot(1380-BX,612-BY)<420&&Math.hypot(1440-BX,640-BY)>420);
 for(const k of Object.keys(sim.state.units))if(k.startsWith('probe'))delete sim.state.units[k];mk(sim,'probe-near','red',BX+110,BY,{speed:0,damage:0});
 sim.state.structures.dummy={id:'dummy',kind:'wall',team:'blue',x:BX+48,y:BY,columns:1,rows:1,hp:1e6,maxHp:1e6,armor:0,radius:24,speed:0,damage:0,range:0,cooldownTicks:24,windupTicks:0,readyTick:0,protectionTick:0,col:22,row:9,startTick:0,completeTick:0,progress:1,constructionDamage:0};
 assert.equal(hitsOn(play(sim,4*HZ),'probe-near','built-b1'),0,'a wall between');delete sim.state.structures.dummy;assert.ok(hitsOn(play(sim,4*HZ),'probe-near','built-b1')>=1,'and open again');
});
test('E. after the camp is lost the completed Ballista stays and keeps firing; no new repair until the camp is retaken',()=>{
 const sim=fresh(),s=sim.state;capture(sim);money(sim,200,40);sim.send({type:'place',requestId:'b1',kind:'ballista',col:BAL.col,row:BAL.row});play(sim,5*HZ+2);sim.teleportHero(300,300);strike(sim,KEEP,BANNER);play(sim,3);isolate(sim,u=>u.id.startsWith('probe')); // the Guardian leaves the ring first, or the Banner is raised again at once (M1 rule)
 assert.equal(s.post.owner,'crimson');const b=s.structures['built-b1'];assert.ok(b.hp>0);mk(sim,'probe-x','red',BX+150,552,{speed:0,damage:0});assert.ok(hitsOn(play(sim,4*HZ),'probe-x','built-b1')>=1);
 assert.equal(sim.placementReason('tower',TOWER_RUIN.col,TOWER_RUIN.row),'Capture the Cliff Camp first');
});
test('the Ballista shoots the gate when it is the nearest eligible target, and an enemy unit in range comes first',()=>{
 const sim=fresh(),s=sim.state;capture(sim);money(sim,200,40);sim.send({type:'place',requestId:'b1',kind:'ballista',col:BAL.col,row:BAL.row});play(sim,5*HZ+2);isolate(sim,u=>u.id.startsWith('probe'));sim.teleportHero(300,300);
 const g=s.structures[GATE],h0=g.hp;play(sim,10*HZ);assert.ok(g.hp<h0&&h0-g.hp<=4*buildings.ballista.damage,`a lull: the gate lost ${h0-g.hp}`);
 const h1=g.hp;mk(sim,'probe-a','red',BX+200,BY,{speed:0,damage:0});const log=play(sim,9*HZ);assert.ok(hitsOn(log,'probe-a','built-b1')>=2);assert.equal(g.hp,h1,'while an enemy unit stands nearer the gate is left alone');
});
test('F. against the same group a Ballista engages earlier and hits harder than a tower (the roles differ)',()=>{
 const rows={};
 for(const kind of ['tower','ballista']){
  const sim=fresh();capture(sim);isolate(sim,u=>u.id.startsWith('probe'));sim.teleportHero(300,300);const d=buildings[kind];
  sim.state.structures.s={id:'s',kind:'tower',...(kind==='ballista'&&{ballista:true}),team:'blue',x:BX,y:BY,col:21,row:9,startTick:0,completeTick:0,progress:1,constructionDamage:0,...d,hp:d.maxHp,armor:0,radius:24,speed:0,windupTicks:0,readyTick:0,protectionTick:0};
  const m=minionStatsOf();for(let i=0;i<6;i++)mk(sim,'probe-'+i,'red',1330+(i%3)*24,520+Math.floor(i/3)*36,{hp:m.maxHp,maxHp:m.maxHp});
  const mine=play(sim,30*HZ).filter(e=>e.type==='damage'&&e.sourceId==='s');rows[kind]={first:mine[0]?.at,shots:mine.length,per:mine.length?mine.reduce((a,e)=>a+e.amount,0)/mine.length:0};
 }
 assert.ok(rows.ballista.first<rows.tower.first,JSON.stringify(rows));assert.ok(rows.ballista.per>2*rows.tower.per);
});

test('the first capture sends two Elites, once',()=>{
 const sim=fresh(),s=sim.state,log=[];capture(sim,log);play(sim,3*HZ,log);
 assert.equal(log.filter(e=>e.type==='post'&&e.change==='captured'&&e.first).length,1);
 const elites=()=>Object.values(s.units).filter(u=>u.archetype==='crimson-elite'&&u.id.startsWith('red-ca-'));assert.equal(elites().length,2);
 strike(sim,KEEP,BANNER);play(sim,5);teleportAndRecapture(sim);play(sim,6*HZ);assert.equal(Object.keys(s.units).filter(id=>id.startsWith('red-ca-')).length,2,'no second counterattack');
});
function teleportAndRecapture(sim){if(sim.state.units[HERO]?.hp>0)strike(sim,'guardian',HERO);for(const id of [NORTH,SOUTH])if(sim.state.structures[id]?.hp>0)strike(sim,'guardian',id);sim.teleportHero(1080,624);play(sim,125);assert.equal(sim.state.post.owner,'azure');}

test('Crimson units pass the standing gate in both directions and never attack it; Azure units and the Guardian must break it',()=>{
 const sim=fresh();isolate(sim,u=>u.id.startsWith('probe'));sim.teleportHero(300,300);sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e8;
 const out=mk(sim,'probe-out','red',1740,570),g=sim.state.structures[GATE];const xs=[];play(sim,30*HZ);xs.push(out.x);
 assert.ok(out.x<1000,`a Crimson unit from the courtyard crossed the standing gate and kept going (x ${Math.round(out.x)})`);assert.equal(g.hp,3000,'and never touched it');
 const sim2=fresh();capture(sim2);isolate(sim2,u=>u.id.startsWith('probe'));sim2.teleportHero(300,300);for(const id of [GN,GS])sim2.state.structures[id].hp=0;
 const west=mk(sim2,'probe-west','blue',1180,600),g2=sim2.state.structures[GATE];play(sim2,12*HZ);assert.ok(g2.hp<3000,'an Azure unit attacks it');assert.ok(west.x<1250,'and is held west of it');
 const sim3=fresh();sim3.teleportHero(1190,600);sim3.send({type:'move',x:1,y:0});play(sim3,3*HZ);assert.ok(sim3.hero.x<1250,`the Guardian is stopped by it (x ${Math.round(sim3.hero.x)})`);
});
test('Azure Barracks soldiers follow the Guardian to the intact gate without jamming, and cross after it falls',()=>{
 const sim=fresh(),s=sim.state;money(sim,1e3,1e3);sim.send({type:'place',requestId:'bk',kind:'barracks',col:10,row:10});play(sim,150+300);
 const soldiers=()=>Object.values(s.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0);assert.equal(soldiers().length,2);
 isolate(sim,u=>u.id.startsWith('blue-s-'));for(const id of [NORTH,SOUTH,GN,GS])s.structures[id].hp=0;for(const u of soldiers())u.hp=u.maxHp=1e6;
 sim.teleportHero(1190,600);play(sim,20*HZ);for(const u of soldiers()){assert.ok(u.x<1250,`soldier x ${Math.round(u.x)} is west of the gate`);assert.ok(Math.hypot(u.x-sim.hero.x,u.y-sim.hero.y)<500);}
 strike(sim,'guardian',GATE);play(sim,2);assert.equal(s.structures[GATE]?.hp>0,false);sim.teleportHero(1450,600);play(sim,25*HZ);
 for(const u of soldiers())assert.ok(u.x>1344,`after the gate fell soldier x ${Math.round(u.x)} crossed the neck`);
});
test('the gate falls while Crimson units stand in its footprint: nothing is stuck, thrown or lost',()=>{
 const sim=fresh();isolate(sim,u=>u.id.startsWith('probe'));sim.teleportHero(300,300);const ids=[];
 for(let i=0;i<4;i++){ids.push(mk(sim,'probe-'+i,'red',1260+(i%2)*20,560+i*14).id);}
 play(sim,HZ);const g=sim.state.structures[GATE];strike(sim,'guardian',GATE);play(sim,2);assert.ok(!(g.hp>0));
 play(sim,20*HZ);for(const id of ids){const u=sim.state.units[id];assert.ok(Number.isFinite(u.x)&&Number.isFinite(u.y));assert.ok(u.x<1200,`unit ${id} walked on (x ${Math.round(u.x)})`);}
});
test('a mixed-faction crowd at the open neck fights itself out and nothing stands still for ten seconds without a foe near, at a bounded cost per tick',()=>{
 const sim=fresh();capture(sim);isolate(sim,u=>u.id.startsWith('probe'));sim.teleportHero(300,300);sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e8;sim.state.bases['red-base'].hp=sim.state.bases['red-base'].maxHp=1e8;
 for(const id of [GN,GS])sim.state.structures[id].hp=0;strike(sim,'guardian',GATE);play(sim,2);const m=minionStatsOf();
 const crowd=[];for(let i=0;i<20;i++)crowd.push(mk(sim,'probe-r'+i,'red',1400+(i%5)*26,470+Math.floor(i/5)*60,{hp:m.maxHp,maxHp:m.maxHp}));for(let i=0;i<16;i++)crowd.push(mk(sim,'probe-b'+i,'blue',900+(i%4)*26,500+Math.floor(i/4)*50,{hp:m.maxHp,maxHp:m.maxHp}));
 const last=new Map(crowd.map(u=>[u.id,{x:u.x,y:u.y,since:0}]));let worst=0,ticks=0;const offenders=new Set(),t0=process.hrtime.bigint();
 for(let n=0;n<90*HZ;n++){sim.purge();sim.advance(DT);sim.drainEvents();ticks++;
  if(n%HZ===HZ-1)for(const u of crowd){if(u.hp<=0)continue;const p=last.get(u.id),moved=Math.hypot(u.x-p.x,u.y-p.y);if(moved>6){p.x=u.x;p.y=u.y;p.since=n;}else{
   const foe=[...Object.values(sim.state.units),...Object.values(sim.state.structures)].some(v=>v.team!==u.team&&v.hp>0&&Math.hypot(v.x-u.x,v.y-u.y)<=150);const atBase=Math.hypot(u.x-(u.team==='red'?330:1610),u.y-600)<200;
   if(!foe&&!atBase){worst=Math.max(worst,(n-p.since)/HZ);if((n-p.since)/HZ>=10)offenders.add(`${u.id}@${Math.round(u.x)},${Math.round(u.y)} t>${u.targetId}`);}}}}
 const ms=Number(process.hrtime.bigint()-t0)/1e6/ticks,alive=crowd.filter(u=>u.hp>0);
 assert.ok(worst<10,`no unit stood still for 10 s (longest ${worst.toFixed(1)} s: ${[...offenders].join(' ')})`);assert.ok(ms<8,`${ms.toFixed(2)} ms per tick with 36 units at the neck`);
 assert.ok(alive.length<36,'the fight resolved');assert.ok(alive.every(u=>Number.isFinite(u.x)&&Number.isFinite(u.y)));
});

// Bot regression (tests/support/cliffBot.cjs): the production level played through commands only. Results are bot behaviour, not balance sign-off.
const {run}=require('./support/cliffBot.cjs');
test('bot: the conquer plan wins Cliff Pass in M1\'s time range, repairs the Ballista and never loses the Azure Keep',()=>{
 const r=run({plan:'conquer'});assert.equal(r.outcome,'victory',JSON.stringify({...r,sim:undefined,log:undefined}));assert.ok(r.sec>=150&&r.sec<=420,`won at ${r.sec} s`);assert.equal(r.ballistas,1);assert.equal(r.ballistaAlive,true);assert.equal(r.gateHp,0,'the gate was broken');assert.equal(r.keepMin,3000);assert.ok(r.gDeaths<=8,`Guardian deaths ${r.gDeaths}`);
});
test('bot: the turtle plan and a plan with no towers and no repair both win with the Ballista; the Ballista changes the result, not the rules',()=>{
 const turtle=run({plan:'turtle'}),bare=run({plan:'conquer',homeTowers:0,forward:0,repair:false});
 assert.equal(turtle.outcome,'victory');assert.equal(bare.outcome,'victory',JSON.stringify({...bare,sim:undefined,log:undefined}));assert.ok(bare.ballistas>=1);
 const no=run({plan:'conquer',ballista:false});assert.equal(no.outcome,'victory');assert.equal(no.ballistas,0);
});

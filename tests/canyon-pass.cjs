const {test}=require('node:test'),assert=require('node:assert/strict');
const layout=require('../.test-build/world/layout.js');
const {meadow,canyonPass,battlefield,validateBattlefield}=require('../.test-build/world/battlefield.js');
const {Geometry}=require('../.test-build/simulation/Collision.js');
const {placementReason}=require('../.test-build/simulation/Building.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup,guardianSpawn}=require('../.test-build/data/matchSetup.js');
const {extendedRules,extendedWaveRules}=require('../.test-build/data/encounters.js');
const {waves:prototypeWaves}=require('../.test-build/data/combat.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {ContextGuidance}=require('../.test-build/ui/contextGuidance.js');
const {route,play,DT}=require('./support/campaignBot.cjs');
const {scenarios,stateHash,load,INTERVAL,CRIT_SEED}=require('./support/golden.cjs');
// Chapter 2 S2a: Canyon Pass, the first registered battlefield besides Meadow. Two cliffs and a central spire replace the river; the pass
// has a north and a south lane. The encounters are unchanged (Meadow coordinates), so the map is checked against every one of them.

const {GRID,WORLD}=layout,COLS=WORLD.width/GRID,ROWS=WORLD.height/GRID;
const canyonSetup=(id='extended',o={})=>matchSetup(id,{...o,battlefield:'canyon-pass'});
// --- Independent Canyon Pass oracle, written from the approved design values (not from battlefield.ts). ---
const CLIFFS=[[800,-Infinity,1120,480],[800,720,1120,Infinity],[920,576,1000,624]];
const REMOVED_SCENERY=[['trees',810,160],['trees',850,1020],['trees',1140,204],['rocks',790,340],['rocks',1120,355],['rocks',1090,850]];
const SCENERY=layout.scenery.filter(p=>!REMOVED_SCENERY.some(([k,x,y])=>p.kind===k&&p.x===x&&p.y===y));
const KEEPS=[[330,600],[1610,600]];
const inCliff=(x,y,r)=>CLIFFS.some(([x0,y0,x1,y1])=>x>x0-r&&x<x1+r&&y>y0-r&&y<y1+r);
function oracleBlocked(x,y,r,structures={}){
 if(x<r||x>WORLD.width-r||y<r||y>WORLD.height-r)return true;
 if(inCliff(x,y,r))return true;
 if(SCENERY.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+r))return true;
 if(Object.values(structures).some(b=>b.hp>0&&Math.abs(x-b.x)<(b.columns??1)*GRID/2+r&&Math.abs(y-b.y)<(b.rows??1)*GRID/2+r))return true;
 return KEEPS.some(([kx,ky])=>Math.abs(x-kx)<3*GRID/2+r&&Math.abs(y-ky)<3*GRID/2+r);
}
const geo=new Geometry(canyonPass),meadowGeo=new Geometry(meadow);
const lane=y=>y<576?'north':y>624?'south':'spire';

test('Canyon Pass is registered and pinned value for value; Meadow and the layout are untouched',()=>{
 assert.equal(battlefield('canyon-pass'),canyonPass);assert.equal(canyonSetup().battlefield,canyonPass);assert.equal(canyonSetup('prototype').battlefield,canyonPass);
 assert.equal(validateBattlefield(canyonPass),canyonPass);assert.equal(canyonPass.id,'canyon-pass');
 assert.deepEqual(canyonPass.barriers.map(b=>[b.x0,b.y0,b.x1,b.y1,b.reason]),CLIFFS.map(c=>[...c,'Cliff overlaps cell']));
 assert.ok(Object.isFrozen(canyonPass)&&Object.isFrozen(canyonPass.barriers)&&canyonPass.barriers.every(Object.isFrozen)&&canyonPass.entities.every(Object.isFrozen));
 // Like Meadow's layout arrays, the scenery and entities arrays Geometry.blocked scans on every check are not frozen (V8's Array.some is
 // much slower over a frozen array); they are fresh arrays, so nothing else shares or mutates them.
 assert.ok(!Object.isFrozen(canyonPass.scenery)&&!Object.isFrozen(canyonPass.entities)&&!Object.isFrozen(meadow.scenery)&&!Object.isFrozen(meadow.entities));
 assert.notEqual(canyonPass.scenery,layout.scenery);assert.notEqual(canyonPass.entities,layout.entities);
 // D3: the Meadow build territory (radius 384), reserved cell, respawn order and route objectives.
 assert.equal(canyonPass.territory,meadow.territory);assert.deepEqual(canyonPass.territory,{x:330,y:600,radius:384});
 assert.equal(canyonPass.reserved,meadow.reserved);assert.equal(canyonPass.respawn,meadow.respawn);assert.equal(canyonPass.objectives,meadow.objectives);
 // Scenery: Meadow's 30 props minus the 6 a cliff overlaps, same objects (kind and height kept for rendering).
 assert.equal(meadow.scenery.length,30);assert.equal(canyonPass.scenery.length,24);assert.deepEqual(canyonPass.scenery,SCENERY);
 for(const p of canyonPass.scenery){assert.ok(meadow.scenery.includes(p));assert.equal(typeof p.kind,'string');assert.ok(p.height>0);assert.ok(!inCliff(p.x,p.y,p.radius),`${p.kind}@${p.x},${p.y} clear of the cliffs`);}
 // D4: no pre-placed walls; the Azure Vanguard the spire would cover opens at (1040,600); everything else as Meadow.
 assert.deepEqual(canyonPass.entities.map(e=>e.id),meadow.entities.map(e=>e.id).filter(id=>id!=='wall-a'&&id!=='wall-b'));
 for(const e of canyonPass.entities){const m=meadow.entities.find(v=>v.id===e.id);assert.notEqual(e,m);assert.deepEqual(e,e.id==='blue-1'?{...m,x:1040,y:600}:m);}
 assert.equal(meadow.entities,layout.entities);assert.equal(meadow.scenery,layout.scenery);assert.ok(!Object.isFrozen(layout.entities[0]),'Canyon copies layout entities instead of freezing them');
 assert.deepEqual(meadow.entities.filter(e=>e.kind==='wall').map(e=>e.id),['wall-a','wall-b']);
 // Every Chapter 1 level and Full Battle still resolve to Meadow; Level 11 (Chapter 2 S4) is the one campaign level on Canyon Pass.
 assert.ok([matchSetup('prototype'),matchSetup('extended'),...campaign.list().filter(l=>!['campaign-11','campaign-12','campaign-13','campaign-14','campaign-15','campaign-16','campaign-17'].includes(l.id)).map(l=>campaign.setup(l.id))].every(s=>s.battlefield===meadow));
 assert.equal(campaign.setup('campaign-11').battlefield,canyonPass);assert.equal(campaign.setup('campaign-13').battlefield,canyonPass);assert.equal(campaign.setup('campaign-15').battlefield,canyonPass);assert.equal(campaign.setup('campaign-17').battlefield,canyonPass);
});

test('every encounter coordinate is open on Canyon: Guardian spawn, wave slots, Crimson towers, prototype waves, respawn points, opening units',()=>{
 const r=extendedWaveRules(),points=[['guardian spawn',guardianSpawn,20],...r.redSlots.map(([x,y])=>['red slot',{x,y},12]),...r.blueSlots.map(([x,y])=>['blue slot',{x,y},12]),
  ...prototypeWaves.flatMap(w=>[...w.positions,...w.alliedPositions]).map(([x,y])=>['prototype wave',{x,y},12]),...canyonPass.respawn.map(p=>['respawn',p,20]),
  ...canyonPass.entities.filter(e=>'radius' in e.footprint).map(e=>[e.id,e,e.footprint.radius])];
 assert.ok(points.length>=40);
 for(const [name,p,radius] of points){assert.equal(geo.blocked(p.x,p.y,radius),false,`${name} ${p.x},${p.y}`);assert.equal(oracleBlocked(p.x,p.y,radius),false);}
 // Footprints (Crimson tower slots, Keeps, the reserved cell) never touch a cliff, even at their edges.
 const square=(x,y,half)=>CLIFFS.some(([x0,y0,x1,y1])=>x+half>x0&&x-half<x1&&y+half>y0&&y-half<y1);
 for(const t of extendedRules.towers)assert.equal(square(t.x,t.y,GRID/2),false,t.id);
 for(const [x,y] of KEEPS)assert.equal(square(x,y,3*GRID/2),false);
 for(const p of canyonPass.reserved)assert.equal(square(p.x,p.y,GRID),false);
 // Every unit and structure of a fresh Canyon match, in both encounters and with every Crimson tower, starts outside the cliffs.
 for(const setup of [canyonSetup('prototype'),canyonSetup('extended',{defenders:extendedRules.towers.map(t=>t.id)})]){
  const s=new Simulation('open',setup);s.advance(DT);
  for(const u of [...Object.values(s.state.units),...Object.values(s.state.structures),...Object.values(s.state.bases)])assert.equal(inCliff(u.x,u.y,u.radius??GRID/2),false,`${u.id} ${u.x},${u.y}`);
 }
});

test('Canyon collision equals the independent oracle on an 8 px sweep of the whole map and beyond, every radius, with and without structures',()=>{
 const st=combatStructures(new Simulation('st',{...campaign.setup(10),battlefield:canyonPass}).state);st.w={id:'w',kind:'wall',team:'blue',x:600,y:552,hp:400,columns:1,rows:1};
 let n=0;
 for(const structures of [undefined,st])for(const r of [0,12,20,21,24])for(let x=-48;x<=WORLD.width+48;x+=8)for(let y=-48;y<=WORLD.height+48;y+=8){
  const got=geo.blocked(x,y,r,structures),want=oracleBlocked(x,y,r,structures);n++;
  if(got!==want)assert.fail(`blocked(${x},${y},${r}) ${structures?'with':'without'} structures: ${got} vs oracle ${want}`);
 }
 assert.ok(n>300000);
});

test('Canyon collision is exact at every cliff and spire edge, 1e-9 either side, and open-ended beyond the world edge',()=>{
 const twin=new Geometry(validateBattlefield({...canyonPass,id:'no-cliffs',barriers:[]}));
 const probes=[];
 for(const r of [0,12,20,21]){
  for(const y of [300,400,800,900])probes.push([800-r,y,r,false],[800-r+1e-9,y,r,true],[1120+r,y,r,false],[1120+r-1e-9,y,r,true]); // cliff faces east/west
  for(const x of [840,1060])probes.push([x,480+r,r,false],[x,480+r-1e-9,r,true],[x,720-r,r,false],[x,720-r+1e-9,r,true]); // lane walls
  for(const y of [590,600,610])probes.push([920-r,y,r,false],[920-r+1e-9,y,r,true],[1000+r,y,r,false],[1000+r-1e-9,y,r,true]); // spire sides
  for(const x of [940,960,980])probes.push([x,576-r,r,false],[x,576-r+1e-9,r,true],[x,624+r,r,false],[x,624+r-1e-9,r,true]); // spire ends
 }
 for(const [x,y,r,cliff] of probes){
  assert.equal(geo.blocked(x,y,r),cliff||twin.blocked(x,y,r),`blocked(${x},${y},${r})`);
  assert.equal(geo.blocked(x,y,r),oracleBlocked(x,y,r),`oracle ${x},${y},${r}`);
 }
 // The cliffs are open-ended like Meadow's river: blocked right up to (and past) the world edge, at every radius.
 for(const r of [0,12])for(const y of [0,-1e6,WORLD.height,WORLD.height+1e6,-Infinity,Infinity])assert.equal(geo.blocked(960,y,r),true);
 assert.equal(geo.blocked(NaN,600,12),meadowGeo.blocked(NaN,600,12));
});

test('line of sight on Canyon: clear down both lanes, blocked by the spire and across the cliffs',()=>{
 const on=(g,a,b)=>g.lineOfSight({x:a[0],y:a[1]},{x:b[0],y:b[1]});
 assert.equal(on(geo,[700,528],[1300,528]),true,'north lane');assert.equal(on(geo,[700,672],[1300,672]),true,'south lane');
 assert.equal(on(geo,[700,600],[1300,600]),false,'spire');assert.equal(on(meadowGeo,[700,600],[1300,600]),true,'Meadow bridge');
 assert.equal(on(geo,[960,300],[960,900]),false,'across both cliffs');assert.equal(on(geo,[700,400],[1300,400]),false,'through the north cliff');
 assert.equal(on(geo,[1080,700],[1180,780]),false,'over the south cliff corner');assert.equal(on(meadowGeo,[1080,700],[1180,780]),true);
});

// Static navigation grid of a Canyon match, as Navigation builds it (cell centres, radius-inflated).
const gridOf=(sim,r)=>sim.navigation.grid(r);
const cell=(x,y)=>Math.floor(y/GRID)*COLS+Math.floor(x/GRID);
// 4-neighbour flood fill over the static grid with the same radius-safe segment check Navigation's search uses; mask removes cells.
function reach(sim,r,from,mask=()=>false){
 const g=gridOf(sim,r),seen=new Set([from]),q=[from],c=i=>({x:(i%COLS+.5)*GRID,y:(Math.floor(i/COLS)+.5)*GRID});
 for(let k=0;k<q.length;k++){const i=q[k],col=i%COLS,row=Math.floor(i/COLS);
  for(const j of [col>0?i-1:-1,col<COLS-1?i+1:-1,row>0?i-COLS:-1,row<ROWS-1?i+COLS:-1])if(j>=0&&!seen.has(j)&&g[j]&&!mask(j)&&sim.geo.clearSegment(c(i),c(j),r)){seen.add(j);q.push(j);}}
 return seen;
}
test('both Canyon lanes are navigable for minions and the Guardian, and every spawn slot reaches both Keeps through either lane',()=>{
 const sim=new Simulation('nav',canyonSetup()),open=(r,col)=>Array.from({length:ROWS},(_,row)=>row).filter(row=>gridOf(sim,r)[row*COLS+col]).map(row=>(row+.5)*GRID);
 for(const r of [12,20,21]){
  assert.deepEqual(open(r,20),[504,552,648,696],`x=984 (spire column), radius ${r}: two rows per lane`);
  assert.deepEqual(open(r,17),[504,552,600,648,696],`x=840 (pass mouth), radius ${r}`);
  assert.deepEqual(open(r,22),[504,552,600,648,696],`x=1080 (pass mouth), radius ${r}`);
 }
 const westKeep=cell(450,600),eastKeep=cell(1490,600),r=extendedWaveRules();
 const northLane=j=>{const x=(j%COLS+.5)*GRID,y=(Math.floor(j/COLS)+.5)*GRID;return x>800&&x<1120&&y<576;},southLane=j=>{const x=(j%COLS+.5)*GRID,y=(Math.floor(j/COLS)+.5)*GRID;return x>800&&x<1120&&y>624;};
 for(const radius of [12,21])for(const [mask,name] of [[()=>false,'both lanes'],[northLane,'south lane only'],[southLane,'north lane only']]){
  for(const [x,y] of r.redSlots)assert.ok(reach(sim,radius,cell(x,y),mask).has(westKeep),`red slot ${x},${y} reaches the Azure side by the ${name}, radius ${radius}`);
  for(const [x,y] of r.blueSlots)assert.ok(reach(sim,radius,cell(x,y),mask).has(eastKeep),`blue slot ${x},${y} reaches the Crimson side by the ${name}, radius ${radius}`);
  assert.ok(reach(sim,radius,cell(guardianSpawn.x,guardianSpawn.y),mask).has(eastKeep));
 }
 // With both lanes masked the map is cut in two: the lanes are the only crossings.
 assert.equal(reach(sim,12,cell(1380,600),j=>northLane(j)||southLane(j)).has(westKeep),false);
 // Navigation's own planner routes a Crimson raider from its slot to the Azure Keep through a lane, on radius-safe segments.
 const raider=sim.unit('raider','minion-red',1380,600);sim.state.units[raider.id]=raider;
 const plan=sim.navigation.route(raider,sim.state.bases['blue-base'],sim.state,0);
 assert.ok(plan.points.length>10);const at=plan.points.filter(p=>p.x>920&&p.x<1000);assert.ok(at.length&&at.every(p=>lane(p.y)!=='spire'));
 plan.points.forEach((p,i)=>assert.ok(sim.geo.clearSegment(i?plan.points[i-1]:raider,p,raider.radius),`segment ${i}`));
});

test('Canyon placement equals Meadow placement on every cell except the two cells Meadow\'s pre-placed walls covered, fresh and busy, both kinds',()=>{
 const fresh=new Simulation('fresh',canyonSetup()),busy=new Simulation('busy',campaign.setup(10));for(let i=0;i<600;i++)busy.advance(1000/30);
 busy.state.structures.w={id:'w',kind:'wall',team:'blue',x:600,y:552,hp:400,columns:1,rows:1};
 // The cliffs and the removed scenery lie beyond the territory, so only D4 (no pre-placed walls) can change an answer.
 const meadowWithoutWalls=validateBattlefield({...meadow,id:'meadow-without-walls',entities:meadow.entities.filter(e=>e.kind!=='wall')});
 const seen=new Set(),freed=new Set();let n=0;
 for(const s of [fresh.state,busy.state])for(const kind of ['wall','tower'])for(const res of [{wood:999,iron:999},{wood:0,iron:0},s])for(let col=-1;col<=COLS;col++)for(let row=-1;row<=ROWS;row++){
  const got=placementReason(canyonPass,s,kind,col,row,res),was=placementReason(meadow,s,kind,col,row,res);n++;seen.add(got);
  assert.equal(got,placementReason(meadowWithoutWalls,s,kind,col,row,res),`${kind} ${col},${row}`);
  if(got!==was){assert.equal(was,'Occupied static structure');freed.add(`${col},${row}`);}
 }
 assert.deepEqual([...freed].sort(),['14,13','14,14'],'the territory cells next to wall-a');
 assert.ok(n>11000);assert.ok(!seen.has('Cliff overlaps cell')&&!seen.has('Water overlaps cell'));
 // The territory (radius 384 around 330,600) ends at x 714; the nearest cliff starts at x 800.
 assert.ok(canyonPass.territory.x+canyonPass.territory.radius<Math.min(...canyonPass.barriers.map(b=>b.x0))-GRID);
 assert.equal(fresh.placementReason('tower',12,12),'');assert.equal(fresh.placementReason('wall',17,12),'Outside controlled territory');
});

// One extended Canyon match. hold: the Guardian is kept at a point with full HP every tick (a body-block); ignore: minions never acquire the
// Guardian, so it is a pure obstacle. Records per Crimson minion the lane it used at the spire, crossings and the longest targetless stand.
function lanes(hold,{ignore=false,ticks=7200,field='canyon-pass'}={}){
 const s=new Simulation('lanes',matchSetup('extended',{battlefield:field})),last=new Map(),used=new Map(),crossed=new Set();let stand=0;
 for(let t=0;t<ticks&&!s.ended;t++){
  if(hold)Object.assign(s.hero,{x:hold.x,y:hold.y,hp:s.hero.maxHp});
  if(ignore)for(const u of Object.values(s.state.units))if(u.kind.startsWith('minion'))u.guardianIgnoreUntil=1e9;
  s.send({type:'move',x:0,y:0});s.advance(1000/30);s.drainEvents();
  for(const u of Object.values(s.state.units)){if(!u.kind.startsWith('minion')||u.hp<=0)continue;
   const k=last.get(u.id)??{x:NaN,y:NaN,still:0},moved=Math.hypot(u.x-k.x,u.y-k.y)>.5,home=Math.hypot(u.x-330,u.y-600)<260||Math.hypot(u.x-1610,u.y-600)<260;
   k.still=moved||u.targetId||home?0:k.still+1;stand=Math.max(stand,k.still);k.x=u.x;k.y=u.y;last.set(u.id,k);
   assert.equal(s.geo.blocked(u.x,u.y,u.radius),false,`${u.id} never inside terrain`);
   if(u.team==='red'){if(u.x>920&&u.x<1000)used.set(u.id,lane(u.y));if(u.x<780)crossed.add(u.id);}}
 }
 const via=l=>[...crossed].filter(id=>used.get(id)===l).length;
 return {s,stand,crossed:crossed.size,north:via('north'),south:via('south'),spire:via('spire')};
}
test('Crimson waves cross Canyon Pass by both lanes and no minion ever stalls without a target',()=>{
 const free=lanes(null);
 assert.ok(free.crossed>=6,`crossed ${free.crossed}`);assert.ok(free.north>0&&free.south>0,`north ${free.north} south ${free.south}`);assert.equal(free.spire,0);
 assert.ok(free.stand<=30,`longest targetless stand ${free.stand} ticks`);
 assert.equal(free.s.ended,true);assert.equal(free.s.state.bases['blue-base'].hp,0,'an undefended Azure Keep falls, as on Meadow');
});
test('Guardian body-blocks: holding either lane or either pass mouth never stalls a minion; as a pure obstacle the other lane stays open',()=>{
 for(const hold of [{x:960,y:528},{x:960,y:672},{x:840,y:600},{x:1060,y:600}]){
  const fight=lanes(hold);assert.ok(fight.stand<=30,`hold ${hold.x},${hold.y}: longest targetless stand ${fight.stand}`);
 }
 // Minions that ignore the Guardian still get round it: the held lane's twin carries the wave. Meadow's single bridge has no twin.
 const north=lanes({x:960,y:528},{ignore:true}),south=lanes({x:960,y:672},{ignore:true});
 assert.ok(north.crossed>0&&north.south>0,`north held: ${JSON.stringify({crossed:north.crossed,south:north.south})}`);
 assert.ok(south.crossed>0&&south.north>0,`south held: ${JSON.stringify({crossed:south.crossed,north:south.north})}`);
 assert.ok(north.stand<=30&&south.stand<=30);
 assert.equal(lanes({x:960,y:575},{ignore:true,field:'meadow'}).crossed,0,'Meadow bridge held: no crossing');
});

test('the campaign bot paths with its own match geometry: round the Canyon spire, over the Meadow bridge',()=>{
 const walk=(field)=>{const sim=new Simulation('bot',matchSetup('extended',{battlefield:field}));Object.assign(sim.hero,{x:700,y:600});return {sim,path:route(sim,{x:1300,y:600})};};
 const canyon=walk('canyon-pass'),meadowWalk=walk('meadow');
 for(const {sim,path} of [canyon,meadowWalk])for(const p of path)assert.equal(sim.geo.blocked(p.x,p.y,21),false);
 const mid=path=>path.filter(p=>p.x>=920&&p.x<=1000);
 assert.ok(mid(canyon.path).length&&mid(canyon.path).every(p=>lane(p.y)!=='spire'),'Canyon: through a lane');
 assert.ok(mid(meadowWalk.path).length&&mid(meadowWalk.path).every(p=>p.y>535&&p.y<615),'Meadow: over the bridge');
 assert.ok(meadowWalk.path.some(p=>canyon.sim.geo.blocked(p.x,p.y,21)),'the Meadow route would run into the spire');
});
test('the policy bot plays Canyon on Canyon geometry: the rush Guardian crosses the pass and destroys Crimson towers',async()=>{
 const {runPolicy}=await import('../scripts/simulate-encounter.mjs');
 const rush=runPolicy('rush',{battlefield:'canyon-pass',maxMinutes:4});
 assert.equal(rush.battlefield,'canyon-pass');assert.ok(rush.towersKilled>=1,`rush destroyed ${rush.towersKilled} Crimson towers`);
 assert.equal(runPolicy('idle',{maxMinutes:.1}).battlefield,'meadow');
 assert.ok(rush.navigation.maxPlansPerTick<=4&&rush.navigation.maxExpandedPerPlan<=COLS*ROWS,JSON.stringify(rush.navigation));
});

test('context guidance reads the active battlefield: a tower behind a Canyon cliff is no danger there, but is on Meadow',()=>{
 const fixture=field=>{const s=new Simulation('g',matchSetup('extended',{battlefield:field})),g=new ContextGuidance();
  s.state.units={guardian:s.hero};Object.assign(s.hero,{x:1080,y:700});
  s.state.structures.watch={...s.state.structures['red-tower-front-center'],id:'watch',x:1180,y:780};g.sync(s.state,0);return {s,g};};
 const c=fixture('canyon-pass'),m=fixture('meadow');
 assert.equal(m.g.danger(m.s.geo,m.s.state,0,0),true,'Meadow: the tower has reach and sight');
 assert.equal(c.g.danger(c.s.geo,c.s.state,0,0),false,'Canyon: the south cliff blocks its sight');
 assert.equal(m.g.next(m.s.geo,m.s.state,0,0),undefined,'danger suppresses teaching on Meadow');
 assert.equal(c.g.next(c.s.geo,c.s.state,0,0),'orientation','teaching proceeds on Canyon');
 // The answer follows the Geometry passed in, never a global: Canyon state judged with Meadow geometry is Meadow's answer.
 assert.equal(new ContextGuidance().danger(m.s.geo,c.s.state,0,0),true);
 assert.throws(()=>new ContextGuidance().danger(undefined,c.s.state,0,0),TypeError,'no silent default geometry');
});

test('a Level 1 golden run interleaved tick by tick with a Canyon match still matches its S0 fixture',()=>{
 const name='chapter1-level-01',sc=scenarios[name],golden=load(name).checkpoints.map(c=>c.split(' ').slice(0,2).join(' '));
 const sim=new Simulation(`golden-${name}`,sc.setup(),CRIT_SEED),got=[];
 let other=new Simulation('canyon',canyonSetup()),next=INTERVAL,steps=0;
 play(sim,sc.maxTicks,{...sc.policy,stop:()=>{
  if(++steps%1500===0)other=new Simulation('canyon',canyonSetup());
  other.send({type:'move',x:steps%400<200?1:-1,y:0});other.send({type:'attack'});if(!other.ended)other.advance(DT);other.drainEvents();
  if(sim.clock.tick>=next){got.push(`${sim.clock.tick} ${stateHash(sim)}`);next=(Math.floor(sim.clock.tick/INTERVAL)+1)*INTERVAL;}
  return false;
 }});
 got.push(`${sim.clock.tick} ${stateHash(sim)}`);
 assert.deepEqual(got,golden);assert.equal(other.field,canyonPass);assert.equal(sim.field,meadow);assert.notEqual(other.geo,sim.geo);
});

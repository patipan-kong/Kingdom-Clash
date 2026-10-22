const {test}=require('node:test'),assert=require('node:assert/strict');
const layout=require('../.test-build/world/layout.js');
const {meadow,canyonPass,oasis,battlefield,validateBattlefield,inTerritory}=require('../.test-build/world/battlefield.js');
const {Geometry}=require('../.test-build/simulation/Collision.js');
const {placementReason}=require('../.test-build/simulation/Building.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup,guardianSpawn}=require('../.test-build/data/matchSetup.js');
const {extendedRules,extendedWaveRules}=require('../.test-build/data/encounters.js');
const {waves:prototypeWaves}=require('../.test-build/data/combat.js');
const {battlefieldFromSearch}=require('../.test-build/world/battlefieldLaunch.js');
const {scenarios,stateHash,load,INTERVAL,CRIT_SEED}=require('./support/golden.cjs');
const {play,DT}=require('./support/campaignBot.cjs');
// Chapter 2 S5: Sunwell Oasis, the third registered battlefield. A plus-shaped pond replaces the river and the canyon; the north and south banks are
// wide, and two shore outposts extend the build territory. Encounters, AI, combat and balance are unchanged (Meadow coordinates).

const {GRID,WORLD}=layout,COLS=WORLD.width/GRID,ROWS=WORLD.height/GRID;
const oasisSetup=(id='extended',o={})=>matchSetup(id,{...o,battlefield:'oasis'});
// --- Independent Oasis oracle, written from the approved design values (not from battlefield.ts). ---
const POND=[[920,420,1080,780],[880,520,1120,680]];
const OUTPOSTS=[[760,330,96],[760,870,96]];
const MOVED=[['blue-0',870,470],['blue-1',870,730],['blue-2',860,600]];
const KEEPS=[[330,600],[1610,600]];
const inPond=(x,y,r)=>POND.some(([x0,y0,x1,y1])=>x>x0-r&&x<x1+r&&y>y0-r&&y<y1+r);
function oracleBlocked(x,y,r,structures={}){
 if(x<r||x>WORLD.width-r||y<r||y>WORLD.height-r)return true;
 if(inPond(x,y,r))return true;
 if(layout.scenery.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+r))return true;
 if(Object.values(structures).some(b=>b.hp>0&&Math.abs(x-b.x)<(b.columns??1)*GRID/2+r&&Math.abs(y-b.y)<(b.rows??1)*GRID/2+r))return true;
 return KEEPS.some(([kx,ky])=>Math.abs(x-kx)<3*GRID/2+r&&Math.abs(y-ky)<3*GRID/2+r);
}
const geo=new Geometry(oasis),meadowGeo=new Geometry(meadow);

test('Oasis is registered and pinned value for value; Meadow, Canyon and the layout are untouched',()=>{
 assert.equal(battlefield('oasis'),oasis);assert.equal(oasisSetup().battlefield,oasis);assert.equal(oasisSetup('prototype').battlefield,oasis);
 assert.equal(validateBattlefield(oasis),oasis);assert.equal(oasis.id,'oasis');
 assert.deepEqual(oasis.barriers.map(b=>[b.x0,b.y0,b.x1,b.y1,b.reason]),POND.map(p=>[...p,'Water overlaps cell']));
 assert.deepEqual(oasis.outposts.map(o=>[o.x,o.y,o.radius]),OUTPOSTS);
 assert.ok(Object.isFrozen(oasis)&&Object.isFrozen(oasis.barriers)&&oasis.barriers.every(Object.isFrozen)&&Object.isFrozen(oasis.outposts)&&oasis.outposts.every(Object.isFrozen)&&oasis.entities.every(Object.isFrozen));
 assert.ok(!Object.isFrozen(oasis.scenery)&&!Object.isFrozen(oasis.entities),'scanned arrays stay unfrozen like Meadow and Canyon');
 // The Keep-centred territory is Meadow's; Meadow and Canyon have no outposts.
 assert.equal(oasis.territory,meadow.territory);assert.deepEqual(oasis.territory,{x:330,y:600,radius:384});
 assert.equal(meadow.outposts,undefined);assert.equal(canyonPass.outposts,undefined);
 assert.equal(oasis.reserved,meadow.reserved);assert.equal(oasis.respawn,meadow.respawn);assert.equal(oasis.objectives,meadow.objectives);
 // Scenery is Meadow's, in full: the pond covers none of it. Pre-placed walls are gone, the three opening Azure Vanguards move to the west shore.
 assert.deepEqual(oasis.scenery,layout.scenery);assert.notEqual(oasis.scenery,layout.scenery);
 assert.deepEqual(oasis.entities.filter(e=>e.kind==='wall'),[]);
 for(const [id,x,y] of MOVED){const e=oasis.entities.find(v=>v.id===id),m=layout.entities.find(v=>v.id===id);assert.deepEqual([e.x,e.y],[x,y],id);assert.deepEqual({...e,x:m.x,y:m.y},m,`${id} changes position only`);}
 assert.deepEqual(oasis.entities.filter(e=>!MOVED.some(([id])=>id===e.id)),layout.entities.filter(e=>e.kind!=='wall'&&!MOVED.some(([id])=>id===e.id)));
 assert.equal(battlefield('meadow'),meadow);assert.equal(battlefield('canyon-pass'),canyonPass);
 assert.deepEqual(meadow.barriers.map(b=>[b.x0,b.y0,b.x1,b.y1]),[[880,-Infinity,1040,535],[880,615,1040,Infinity]]);
 assert.throws(()=>validateBattlefield({...oasis,outposts:[{x:1,y:1,radius:0}]}),/outpost/);
 assert.throws(()=>validateBattlefield({...oasis,outposts:[{x:NaN,y:1,radius:5}]}),/outpost/);
});

test('every encounter coordinate is open on Oasis: Guardian spawn, wave slots, Crimson towers, prototype waves, respawn points, opening units',()=>{
 const r=extendedWaveRules(),points=[['guardian spawn',guardianSpawn,20],...r.redSlots.map(([x,y])=>['red slot',{x,y},12]),...r.blueSlots.map(([x,y])=>['blue slot',{x,y},12]),
  ...prototypeWaves.flatMap(w=>[...w.positions,...w.alliedPositions]).map(([x,y])=>['prototype wave',{x,y},12]),...oasis.respawn.map(p=>['respawn',p,20]),
  ...oasis.entities.filter(e=>'radius' in e.footprint).map(e=>[e.id,e,e.footprint.radius]),...extendedRules.towers.map(t=>['tower',t,0])];
 assert.ok(points.length>=45);
 for(const [name,p,radius] of points){assert.equal(geo.blocked(p.x,p.y,radius),false,`${name} ${p.x},${p.y}`);assert.equal(oracleBlocked(p.x,p.y,radius),false);}
 const square=(x,y,half)=>POND.some(([x0,y0,x1,y1])=>x+half>x0&&x-half<x1&&y+half>y0&&y-half<y1);
 for(const t of extendedRules.towers)assert.equal(square(t.x,t.y,GRID/2),false,t.id);
 for(const [x,y] of KEEPS)assert.equal(square(x,y,3*GRID/2),false);
 for(const p of oasis.reserved)assert.equal(square(p.x,p.y,GRID),false);
 for(const setup of [oasisSetup('prototype'),oasisSetup('extended',{defenders:extendedRules.towers.map(t=>t.id)})]){
  const s=new Simulation('open',setup);s.advance(DT);
  for(const u of [...Object.values(s.state.units),...Object.values(s.state.structures),...Object.values(s.state.bases)])assert.equal(inPond(u.x,u.y,u.radius??GRID/2),false,`${u.id} ${u.x},${u.y}`);
 }
});

test('Oasis collision equals the independent oracle on an 8 px sweep of the whole map and beyond, every radius, with and without structures',()=>{
 const structures={a:{id:'a',hp:10,x:744,y:312,columns:1,rows:1},b:{id:'b',hp:0,x:1200,y:300,columns:1,rows:1},c:{id:'c',hp:5,x:1560,y:480,columns:2,rows:2}};
 for(let x=-16;x<=WORLD.width+16;x+=8)for(let y=-16;y<=WORLD.height+16;y+=8)for(const r of [0,12,20])for(const st of [{},structures])
  assert.equal(geo.blocked(x,y,r,st),oracleBlocked(x,y,r,st),`oracle ${x},${y},${r}`);
 // Exact at every pond edge, 1e-9 either side, for the vertical bar, the horizontal bar and their corners.
 for(const r of [0,12,20])for(const [x0,y0,x1,y1] of POND){
  for(const e of [1e-9,-1e-9]){
   assert.equal(geo.blocked(x0-r+e,(y0+y1)/2,r),oracleBlocked(x0-r+e,(y0+y1)/2,r));assert.equal(geo.blocked(x1+r-e,(y0+y1)/2,r),oracleBlocked(x1+r-e,(y0+y1)/2,r));
   assert.equal(geo.blocked((x0+x1)/2,y0-r+e,r),oracleBlocked((x0+x1)/2,y0-r+e,r));assert.equal(geo.blocked((x0+x1)/2,y1+r-e,r),oracleBlocked((x0+x1)/2,y1+r-e,r));
  }
 }
 // Standing against a free edge is open and one micron in is water: the west edge of the horizontal bar and the top edge of the vertical bar.
 for(const r of [0,12,20]){assert.equal(geo.blocked(880-r,600,r),false);assert.equal(geo.blocked(880-r+1e-6,600,r),true);assert.equal(geo.blocked(1000,420-r,r),false);assert.equal(geo.blocked(1000,420-r+1e-6,r),true);}
 assert.equal(meadowGeo.blocked(1000,600,12),false,'Meadow has no pond at the centre');
});

test('line of sight on Oasis: blocked across the pond, clear along both banks and around the pond',()=>{
 const on=(g,a,b)=>g.lineOfSight({x:a[0],y:a[1]},{x:b[0],y:b[1]});
 assert.equal(on(geo,[700,600],[1300,600]),false,'across the pond centre');assert.equal(on(geo,[1000,300],[1000,900]),false,'north to south bank across the pond');
 assert.equal(on(geo,[840,500],[1160,700]),false,'diagonal through the horizontal bar');assert.equal(on(geo,[900,450],[1100,450]),false,'through the vertical bar');
 assert.equal(on(geo,[700,380],[1300,380]),true,'north bank');assert.equal(on(geo,[700,820],[1300,820]),true,'south bank');
 assert.equal(on(geo,[880,500],[880,700]),true,'along the west shore of the horizontal bar');
 assert.equal(on(geo,[1130,600],[1130,760]),true,'along the east shore');
 assert.equal(on(geo,[900,420],[1100,420]),true,'along the top edge of the vertical bar');
 assert.equal(on(meadowGeo,[700,600],[1300,600]),true,'Meadow bridge row');
 // Around the pond: a bank point sees the far side of the pond only along the bank, never through the water.
 assert.equal(on(geo,[700,300],[1300,300]),true);assert.equal(on(geo,[760,330],[1200,820]),false);
});

// Static navigation grid, as Navigation builds it; flood fill over it with the same radius-safe segment check Navigation's search uses.
const COLS_=COLS,cell=(x,y)=>Math.floor(y/GRID)*COLS_+Math.floor(x/GRID);
function reach(sim,r,from,mask=()=>false){
 const g=sim.navigation.grid(r),seen=new Set([from]),q=[from],c=i=>({x:(i%COLS_+.5)*GRID,y:(Math.floor(i/COLS_)+.5)*GRID});
 for(let k=0;k<q.length;k++){const i=q[k],col=i%COLS_,row=Math.floor(i/COLS_);
  for(const j of [col>0?i-1:-1,col<COLS_-1?i+1:-1,row>0?i-COLS_:-1,row<ROWS-1?i+COLS_:-1])if(j>=0&&!seen.has(j)&&g[j]&&!mask(j)&&sim.geo.clearSegment(c(i),c(j),r)){seen.add(j);q.push(j);}}
 return seen;
}
test('both banks are navigable for minions and the Guardian, and every spawn slot reaches both Keeps by either bank',()=>{
 const sim=new Simulation('nav',oasisSetup()),westKeep=cell(450,600),eastKeep=cell(1490,600),r=extendedWaveRules();
 const xy=j=>({x:(j%COLS_+.5)*GRID,y:(Math.floor(j/COLS_)+.5)*GRID});
 const northBank=j=>{const p=xy(j);return p.x>880&&p.x<1120&&p.y<600;},southBank=j=>{const p=xy(j);return p.x>880&&p.x<1120&&p.y>600;};
 for(const radius of [12,21])for(const [mask,name] of [[()=>false,'both banks'],[northBank,'south bank only'],[southBank,'north bank only']]){
  for(const [x,y] of r.redSlots)assert.ok(reach(sim,radius,cell(x,y),mask).has(westKeep),`red slot ${x},${y} reaches the Azure side by the ${name}, radius ${radius}`);
  for(const [x,y] of r.blueSlots)assert.ok(reach(sim,radius,cell(x,y),mask).has(eastKeep),`blue slot ${x},${y} reaches the Crimson side by the ${name}, radius ${radius}`);
  assert.ok(reach(sim,radius,cell(guardianSpawn.x,guardianSpawn.y),mask).has(eastKeep),`Guardian spawn reaches the Crimson side by the ${name}, radius ${radius}`);
 }
 // With both banks masked the map is cut in two: the banks are the only crossings.
 assert.equal(reach(sim,12,cell(1380,600),j=>northBank(j)||southBank(j)).has(westKeep),false);
 // Navigation's own planner: from every Crimson slot to the Azure Keep, and from the west back to the Crimson Keep, on radius-safe segments.
 for(const [sx,sy] of r.redSlots)for(const [team,radius,from,target] of [['red',12,[sx,sy],'blue-base'],['red',20,[sx,sy],'blue-base'],['blue',12,[450,600],'red-base']]){
  const unit=sim.unit(`walker-${team}-${radius}-${sx}-${sy}`,'minion-'+team,from[0],from[1]);unit.radius=radius;sim.state.units[unit.id]=unit;
  sim.navigation.begin(sim.state); // resets the per-tick planning budget
  const plan=sim.navigation.route(unit,sim.state.bases[target],sim.state,0);
  assert.ok(plan&&plan.points.length>10,`${team} ${radius} from ${from}`);
  plan.points.forEach((p,i)=>assert.ok(sim.geo.clearSegment(i?plan.points[i-1]:unit,p,unit.radius),`segment ${i}`));
  const at=plan.points.filter(p=>p.x>940&&p.x<1060);assert.ok(at.length&&at.every(p=>p.y<420||p.y>780),'the route passes the pond on a bank');
  assert.ok(plan.points.every(p=>!inPond(p.x,p.y,unit.radius)),'no waypoint is in the water');
  delete sim.state.units[unit.id];
 }
});

test('Oasis build territory: Meadow circle plus two shore outposts, under the existing placement rules',()=>{
 const fresh=()=>new Simulation('place',oasisSetup()).state,s=fresh();
 const free=(f,state,kind='tower')=>{const out=new Set();for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)if(placementReason(f,state,kind,c,r,{wood:999,iron:999})==='')out.add(c+','+r);return out;};
 const ring={...oasis,outposts:undefined},wide={...oasis,outposts:undefined,territory:{x:330,y:600,radius:5000}};
 const withPosts=free(oasis,s),without=free(ring,s),everywhere=free(wide,s);
 // The Keep circle alone allows exactly what Meadow's circle allows on this map; the outposts only add cells.
 for(const k of without)assert.ok(withPosts.has(k));
 const added=[...withPosts].filter(k=>!without.has(k));
 // Independent derivation: the added cells are the cells of the outpost circles, outside the Keep circle, that every other rule allows.
 const expected=[...everywhere].filter(k=>{const [c,r]=k.split(',').map(Number),x=(c+.5)*GRID,y=(r+.5)*GRID;
  return Math.hypot(x-330,y-600)>384&&OUTPOSTS.some(([ox,oy,or])=>Math.hypot(x-ox,y-oy)<=or);});
 assert.deepEqual(added.sort(),expected.sort());
 const north=added.filter(k=>Number(k.split(',')[1])<12),south=added.filter(k=>Number(k.split(',')[1])>=12);
 assert.deepEqual([added.length,north.length,south.length],[20,8,12],'twenty added cells: eight on the north outpost, twelve on the south one (the rock at 790,340 takes cells from the north)');
 assert.equal(withPosts.size,155+20,'155 Keep-circle cells plus 20 outpost cells');
 // Scenery, water and the reserved cell still apply inside an outpost: the rock at (790,340) takes cells from the north outpost.
 assert.equal(placementReason(oasis,s,'tower',16,6,{wood:999,iron:999}),'Scenery overlaps cell');
 // Boundary: a cell centre exactly on an outpost's radius is inside, a hair outside is not.
 assert.equal(inTerritory({...oasis,outposts:[{x:760,y:330,radius:50}]},760+50,330),true);assert.equal(inTerritory({...oasis,outposts:[{x:760,y:330,radius:50}]},760+50.001,330),false);
 // Meadow and Canyon have no outposts: the north outpost cells are outside their territory.
 for(const k of added){const [c,r]=k.split(',').map(Number);
  assert.equal(placementReason(meadow,s,'tower',c,r,{wood:999,iron:999}),'Outside controlled territory',`meadow ${k}`);
  assert.equal(placementReason(canyonPass,s,'tower',c,r,{wood:999,iron:999}),'Outside controlled territory',`canyon ${k}`);}
 // Walls follow the same territory; the tower limit and costs are unchanged.
 const [c,r]=added[0].split(',').map(Number);assert.equal(placementReason(oasis,s,'wall',c,r,{wood:999,iron:999}),'');
 assert.equal(placementReason(oasis,s,'tower',c,r,{wood:0,iron:0}),'Not enough resources');
});

test('a tower built on an outpost is constructed and shoots the bank it covers, but not the far bank across the pond',()=>{
 const s=new Simulation('outpost',oasisSetup('extended',{defenders:[]}));
 const col=17,row=7;assert.equal(s.placementReason('tower',col,row),'');
 s.send({type:'place',requestId:'op-1',kind:'tower',col,row});
 for(let t=0;t<260;t++){s.advance(1000/30);s.drainEvents();}
 const tower=Object.values(s.state.structures).find(b=>b.kind==='tower'&&b.team==='blue');
 assert.ok(tower&&tower.hp>0,'the tower is built');assert.deepEqual([tower.x,tower.y],[(col+.5)*GRID,(row+.5)*GRID]);
 const near={x:tower.x+120,y:tower.y+40},far={x:1000,y:830};
 assert.equal(s.geo.lineOfSight(tower,near),true);assert.ok(Math.hypot(near.x-tower.x,near.y-tower.y)<=tower.range);
 assert.equal(s.geo.lineOfSight(tower,far),false,'the pond (and range) keep the south bank out of reach');
});

// Share of a bank approach (sixteen-pixel steps from x 760 to 1240) the best single tower cell covers: range 240 with line of sight.
function bestCover(field,y){
 const s=new Simulation('cover',{...oasisSetup(),battlefield:field}),g=new Geometry(field),pts=[];for(let x=760;x<=1240;x+=16)pts.push({x,y});
 let best=0;for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){if(placementReason(field,s.state,'tower',c,r,{wood:999,iron:999}))continue;
  const t={x:(c+.5)*GRID,y:(r+.5)*GRID};best=Math.max(best,pts.filter(p=>Math.hypot(p.x-t.x,p.y-t.y)<=240&&g.lineOfSight(t,p)).length);}
 return {best,of:pts.length};
}
test('tower coverage: the shore outposts roughly double what one tower covers of each bank',()=>{
 const without={...oasis,outposts:undefined};
 for(const y of [380,820]){
  assert.deepEqual(bestCover(without,y),{best:9,of:31},`Keep circle only, bank y ${y}`);
  assert.deepEqual(bestCover(oasis,y),{best:20,of:31},`with the outposts, bank y ${y}`);
 }
});

// One extended Oasis match. hold: the Guardian is kept at a point with full HP every tick; ignore: minions never acquire the Guardian.
// Records per Crimson minion the bank it used beside the pond, crossings and the longest targetless stand.
function banks(hold,{ignore=false,ticks=7200}={}){
 const s=new Simulation('banks',oasisSetup()),last=new Map(),used=new Map(),crossed=new Set();let stand=0;
 for(let t=0;t<ticks&&!s.ended;t++){
  if(hold)Object.assign(s.hero,{x:hold.x,y:hold.y,hp:s.hero.maxHp});
  if(ignore)for(const u of Object.values(s.state.units))if(u.kind.startsWith('minion'))u.guardianIgnoreUntil=1e9;
  s.send({type:'move',x:0,y:0});s.advance(1000/30);s.drainEvents();
  for(const u of Object.values(s.state.units)){if(!u.kind.startsWith('minion')||u.hp<=0)continue;
   const k=last.get(u.id)??{x:NaN,y:NaN,still:0},moved=Math.hypot(u.x-k.x,u.y-k.y)>.5,home=Math.hypot(u.x-330,u.y-600)<260||Math.hypot(u.x-1610,u.y-600)<260;
   k.still=moved||u.targetId||home?0:k.still+1;stand=Math.max(stand,k.still);k.x=u.x;k.y=u.y;last.set(u.id,k);
   assert.equal(s.geo.blocked(u.x,u.y,u.radius),false,`${u.id} never inside terrain`);
   if(u.team==='red'){if(u.x>940&&u.x<1060)used.set(u.id,u.y<600?'north':'south');if(u.x<780)crossed.add(u.id);}}
 }
 const via=l=>[...crossed].filter(id=>used.get(id)===l).length;
 return {s,stand,crossed:crossed.size,north:via('north'),south:via('south')};
}
test('Crimson waves cross Oasis by the banks around the pond and no minion ever stalls without a target',()=>{
 const free=banks(null);
 assert.ok(free.crossed>=6,`crossed ${free.crossed}`);assert.equal(free.north+free.south,free.crossed,'every crossing used a bank');
 assert.ok(free.stand<=30,`longest targetless stand ${free.stand} ticks`);
 assert.equal(free.s.ended,true);assert.equal(free.s.state.bases['blue-base'].hp,0,'an undefended Azure Keep falls, as on Meadow');
});
test('Guardian body-blocks: holding either bank or either shore never stalls a minion',()=>{
 for(const hold of [{x:960,y:380},{x:960,y:820},{x:840,y:600},{x:1160,y:600}]){
  const fight=banks(hold);assert.ok(fight.stand<=30,`hold ${hold.x},${hold.y}: longest targetless stand ${fight.stand}`);
 }
 // Minions that never acquire the Guardian still fight it when it stands within their reach on the shore line they hug, so a held bank is a plug
 // (docs/CHAPTER2_S5.md, known limitations); the check here is only that nothing stalls.
 for(const hold of [{x:960,y:380},{x:960,y:820}]){const fight=banks(hold,{ignore:true});assert.ok(fight.stand<=30,`ignore ${hold.x},${hold.y}: longest targetless stand ${fight.stand}`);}
});

test('?battlefield=oasis opens Oasis on the dev server only, and exactly that id',()=>{
 for(const s of ['?battlefield=oasis','?encounter=extended&battlefield=oasis','battlefield=oasis'])assert.equal(battlefieldFromSearch(s,true),'oasis',s);
 for(const s of ['?battlefield=oasis','?battlefield=Oasis','?battlefield=oasis&battlefield=oasis','?battlefield=oasis&battlefield=meadow','?battlefield=oasi','?battlefield=%20oasis'])
  assert.equal(battlefieldFromSearch(s,false),'meadow',s);
 for(const s of ['?battlefield=Oasis','?battlefield=oasis&battlefield=oasis','?battlefield=oasis&battlefield=meadow','?battlefield=oasi','?battlefield=%20oasis'])assert.equal(battlefieldFromSearch(s,true),'meadow',s);
});

test('a Level 1 golden run interleaved tick by tick with an Oasis match still matches its S0 fixture',()=>{
 const name='chapter1-level-01',sc=scenarios[name],golden=load(name).checkpoints.map(c=>c.split(' ').slice(0,2).join(' '));
 const sim=new Simulation(`golden-${name}`,sc.setup(),CRIT_SEED),got=[];
 let other=new Simulation('oasis',oasisSetup()),next=INTERVAL,steps=0;
 play(sim,sc.maxTicks,{...sc.policy,stop:()=>{
  if(++steps%1500===0)other=new Simulation('oasis',oasisSetup());
  other.send({type:'move',x:steps%400<200?1:-1,y:0});other.send({type:'attack'});if(!other.ended)other.advance(DT);other.drainEvents();
  if(sim.clock.tick>=next){got.push(`${sim.clock.tick} ${stateHash(sim)}`);next=(Math.floor(sim.clock.tick/INTERVAL)+1)*INTERVAL;}
  return false;
 }});
 got.push(`${sim.clock.tick} ${stateHash(sim)}`);
 assert.deepEqual(got,golden);assert.equal(other.field,oasis);assert.equal(sim.field,meadow);assert.notEqual(other.geo,sim.geo);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs');
const path=require('node:path');
const {meadow,validateBattlefield}=require('../.test-build/world/battlefield.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {scenarios,stateHash,load,INTERVAL,CRIT_SEED}=require('./support/golden.cjs');
const {play,DT}=require('./support/campaignBot.cjs');
// Chapter 2 S1: the Battlefield is threaded explicitly. No simulation code reaches Meadow except through its own match's setup, there is
// no global active battlefield, and two matches on different battlefields never share geometry state.

const SRC=path.join(__dirname,'..','src');
const sources=dir=>readdirSync(path.join(SRC,dir)).filter(f=>f.endsWith('.ts')).map(f=>({file:`${dir}/${f}`,lines:readFileSync(path.join(SRC,dir,f),'utf8').split(/\r?\n/)}));
// The pre-S1 module functions, kept bound to Meadow for existing tests, scripts and the UI (MEADOW-COMPAT).
const COMPAT=['blocked','lineOfSight','move','moveUnit','clearSegment','canAttack','guardianPursuable','chargeContact','artifactAccessReason'];
const GEOMETRY_METHODS=['blocked','lineOfSight','move','moveUnit','clearSegment'];

test('simulation code never calls a Meadow-compatibility function or reaches Meadow directly',()=>{
 const problems=[];
 for(const {file,lines} of sources('simulation'))lines.forEach((line,i)=>{
  if(/^\s*\/\//.test(line))return; // comments
  const at=`${file}:${i+1}`,code=line.replace(/\/\/.*$/,''),marked=line.includes('MEADOW-COMPAT');
  // 1. Imports: no compatibility function from a sibling module, nothing but GRID/WORLD from world/layout, no meadow from world/battlefield.
  const imp=/^import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/.exec(line);
  if(imp){
   const names=imp[1].split(',').map(n=>n.trim().replace(/^type\s+/,'')).filter(Boolean),from=imp[2];
   if(from.startsWith('./'))for(const n of names)if(COMPAT.includes(n))problems.push(`${at} imports compatibility function ${n}`);
   if(from.endsWith('world/layout'))for(const n of names)if(!['GRID','WORLD'].includes(n))problems.push(`${at} imports ${n} from world/layout`);
   if(from.endsWith('world/battlefield')&&names.includes('meadow')&&file!=='simulation/Collision.ts')problems.push(`${at} imports meadow`);
   if(from.endsWith('world/battlefield')&&names.includes('canyonPass'))problems.push(`${at} imports canyonPass`);
   return;
  }
  // 2. Every other mention of Meadow is a marked compatibility line: a wrapper definition or an untyped-caller constructor fallback.
  if(/\bmeadow(Geometry)?\b/.test(code)&&!marked)problems.push(`${at} reaches Meadow outside a MEADOW-COMPAT line`);
  // A constructor fallback must keep geo a required (default-free) parameter, so TypeScript callers can never omit it.
  if(marked&&!/^export const \w+=/.test(line)&&!/^ constructor\([^)]*\bgeo:Geometry\)\{this\.geo=geo\?\?meadowGeometry;\}/.test(line))problems.push(`${at} unexpected MEADOW-COMPAT line`);
  if(marked){const m=/^export const (\w+)=/.exec(line);if(m&&m[1]!=='meadowGeometry'&&!COMPAT.includes(m[1]))problems.push(`${at} unlisted compatibility export ${m[1]}`);}
  // 3. Calls: a compatibility name is only ever called as a method of an explicit Geometry (geo.x / this.x), never bare.
  if(!marked)for(const n of COMPAT){
   const bare=new RegExp(`(?<![\\w.])${n}\\(`,'g');
   for(const _ of code.matchAll(bare)){
    const methodDefinition=file==='simulation/Collision.ts'&&GEOMETRY_METHODS.includes(n)&&new RegExp(`^ ${n}\\(`).test(line);
    if(!methodDefinition)problems.push(`${at} calls ${n}() without a Geometry`);
   }
  }
 });
 // match.ts derives Keeps from the Battlefield it is given; it no longer reads the layout.
 for(const {file,lines} of sources('data'))lines.forEach((line,i)=>{if(/from '\.\.\/world\/layout'/.test(line)&&/\bentities\b/.test(line))problems.push(`${file}:${i+1} reads layout entities`);});
 assert.deepEqual(problems,[]);
});
// Chapter 2 S2a: UI policy code (attack hints, targeting guidance) takes the match's Geometry too, never a Meadow-bound function.
test('UI code never imports a Meadow-compatibility function, the Meadow battlefield or map data from the layout',()=>{
 const problems=[];
 for(const {file,lines} of sources('ui'))lines.forEach((line,i)=>{
  if(/^\s*\/\//.test(line))return;
  const at=`${file}:${i+1}`,code=line.replace(/\/\/.*$/,'');
  if(/^import\s+\*/.test(line)&&/from\s+'\.\.\/(simulation|world)\//.test(line))problems.push(`${at} namespace import from ${/'([^']+)'/.exec(line)[1]}`);
  const imp=/^import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/.exec(line);
  if(imp){
   const names=imp[1].split(',').map(n=>n.trim().replace(/^type\s+/,'')).filter(Boolean),from=imp[2];
   if(from.startsWith('../simulation/'))for(const n of names)if(COMPAT.includes(n)||n==='meadowGeometry')problems.push(`${at} imports compatibility function ${n}`);
   if(from.endsWith('world/layout'))for(const n of names)if(['terrain','scenery','entities','blocked'].includes(n))problems.push(`${at} imports map data ${n} from world/layout`);
   if(from.endsWith('world/battlefield')&&names.some(n=>n==='meadow'||n==='canyonPass'))problems.push(`${at} imports a battlefield directly`);
   return;
  }
  if(/\bmeadow(Geometry)?\b/.test(code))problems.push(`${at} reaches Meadow`);
 });
 assert.deepEqual(problems,[]);
});
test('the scan sees every compatibility wrapper it guards, so a renamed wrapper cannot slip past it',()=>{
 const defined=sources('simulation').flatMap(({lines})=>lines.map(l=>/^export const (\w+)=.*MEADOW-COMPAT/.exec(l)?.[1]).filter(Boolean));
 assert.deepEqual(defined.filter(n=>n!=='meadowGeometry').sort(),[...COMPAT].sort());
});

const cliff=validateBattlefield({...meadow,id:'test-cliff',barriers:[...meadow.barriers,{x0:780,y0:500,x1:800,y1:650,reason:'Cliff overlaps cell'}]});
test('every geometry consumer of a match holds that match\'s own Geometry; the battlefield never enters GameState',()=>{
 for(const f of [cliff,meadow]){
  const s=new Simulation('owned',{...matchSetup('extended'),battlefield:f});
  assert.equal(s.field,f);assert.equal(s.geo.field,f);
  for(const [name,owner] of [['navigation',s.navigation],['rewards',s.rewards],['skills',s.skills],['burn',s.burn],['trades',s.trades]])assert.equal(owner.geo,s.geo,`${name} uses this match's geometry`);
  assert.doesNotMatch(JSON.stringify(s.state),/test-cliff|meadow|Cliff/);
 }
 const a=new Simulation('a',{...matchSetup('prototype'),battlefield:cliff}),b=new Simulation('b',{...matchSetup('prototype'),battlefield:cliff});
 assert.notEqual(a.geo,b.geo,'each match builds its own Geometry');assert.notEqual(a.navigation,b.navigation);
});

// Sealed bridge, a far territory and different objectives: a battlefield that disagrees with Meadow almost everywhere it is consulted.
const sealed=validateBattlefield({...meadow,id:'test-sealed',barriers:[{x0:880,y0:-Infinity,x1:1040,y1:Infinity,reason:'Water overlaps cell'},{x0:600,y0:300,x1:640,y1:520,reason:'Cliff overlaps cell'}],
 territory:{x:330,y:600,radius:200},reserved:[{x:600,y:600}],respawn:[{x:250,y:1000}],objectives:{blue:{x:1300,y:300},red:{x:300,y:900}}});
test('a Level 1 golden run interleaved tick by tick with matches on another battlefield still matches its S0 fixture',()=>{
 const name='chapter1-level-01',sc=scenarios[name],golden=load(name).checkpoints.map(c=>c.split(' ').slice(0,2).join(' '));
 const sim=new Simulation(`golden-${name}`,sc.setup(),CRIT_SEED),got=[];
 const fresh=()=>new Simulation('other',{...matchSetup('extended'),battlefield:sealed});
 let other=fresh(),next=INTERVAL,steps=0,builtOther=0;
 const sample=()=>got.push(`${sim.clock.tick} ${stateHash(sim)}`);
 play(sim,sc.maxTicks,{...sc.policy,stop:()=>{
  // The other match plays on its own battlefield between every golden step: moves, attacks, builds and is periodically rebuilt.
  if(++steps%1200===0){other=fresh();builtOther++;}
  other.send({type:'move',x:steps%400<200?1:-1,y:0});other.send({type:'attack'});if(steps%90===0)other.send({type:'place',requestId:'o'+steps,kind:'wall',col:8+steps%5,row:10+steps%4});
  if(!other.ended)other.advance(DT);other.drainEvents();
  if(sim.clock.tick>=next){sample();next=(Math.floor(sim.clock.tick/INTERVAL)+1)*INTERVAL;}
  return false;
 }});
 sample();
 assert.ok(builtOther>=2&&steps>4000);
 assert.deepEqual(got,golden,'the golden Level 1 run is unaffected by the interleaved match');
 // The matches really used different geometry: the static navigation grids differ (sealed bridge) and so do placement answers.
 const g=sim.navigation.grid(12),o=other.navigation.grid(12);assert.notDeepEqual(g,o);
 assert.equal(sim.geo.blocked(960,575,12),false);assert.equal(other.geo.blocked(960,575,12),true);
 assert.notEqual(sim.placementReason('wall',12,12),other.placementReason('wall',12,12));
});

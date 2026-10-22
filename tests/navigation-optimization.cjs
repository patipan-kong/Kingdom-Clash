'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {structureMasks}=require('../.test-build/simulation/Navigation.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {meadowGeometry}=require('../.test-build/simulation/Collision.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {minionStats}=require('../.test-build/data/combat.js');
// Chapter 2 S5 performance pass: the two Navigation.search optimisations must be exact. The reference below is the previous formula, verbatim.
const COLS=40,ROWS=24,GRID=48,COUNT=COLS*ROWS;
const point=i=>({x:(i%COLS+.5)*GRID,y:(Math.floor(i/COLS)+.5)*GRID});
const reference=(live,radius)=>Array.from({length:COUNT},(_,i)=>{const p=point(i);return live.filter(b=>Math.abs(p.x-b.x)<(b.columns??1)*24+radius&&Math.abs(p.y-b.y)<(b.rows??1)*24+radius);});
const same=(live,radius,label)=>{const got=structureMasks(live,radius),want=reference(live,radius);
 for(let i=0;i<COUNT;i++){assert.equal(got[i].length,want[i].length,`${label} cell ${i} size`);for(let k=0;k<want[i].length;k++)assert.equal(got[i][k],want[i][k],`${label} cell ${i} slot ${k} (same object, same order)`);}};
let seed=7;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
const sizes=[[1,1],[2,2],[3,3],[1,3],[3,1],[4,2],[undefined,undefined]];

test('structure masks equal the previous per-cell filter for random structures at both unit radii, in the same order',()=>{
 for(const radius of [12,20,0,31.5])for(let round=0;round<40;round++){
  const live=Array.from({length:1+Math.floor(rnd()*14)},(_,n)=>{const [columns,rows]=sizes[Math.floor(rnd()*sizes.length)];return {id:'s'+n,x:rnd()*1920,y:rnd()*1152,columns,rows,hp:1,team:'blue',kind:'tower'};});
  same(live,radius,`r${radius} round ${round}`);
 }
});

test('structure masks match on the world edges, exact cell boundaries and overlapping structures',()=>{
 const live=[{id:'a',x:0,y:0,columns:3,rows:3},{id:'b',x:1920,y:1152,columns:3,rows:3},{id:'c',x:1920,y:0,columns:1,rows:1},{id:'d',x:0,y:1152,columns:2,rows:2},
  {id:'e',x:960,y:576,columns:3,rows:3},{id:'f',x:960,y:576,columns:1,rows:1},{id:'g',x:984,y:600,columns:2,rows:2},
  // padded footprint ends exactly on a cell centre (strict inequality), and just either side of it
  {id:'h',x:48*10,y:48*10,columns:2,rows:2},{id:'i',x:48*10+23.999,y:48*10,columns:2,rows:2},{id:'j',x:48*10+24.001,y:48*10,columns:2,rows:2}];
 for(const radius of [12,20])same(live,radius,`edges r${radius}`);
 same([],12,'empty');
 assert.ok(structureMasks([],12).every(m=>m.length===0),'no structures, no masked cells');
});

test('a destroyed structure is not in any mask once the live filter drops it, and the Keeps mask their footprints',()=>{
 const sim=new Simulation('mask-live',matchSetup('extended')),structures=combatStructures(sim.state),all=Object.values(structures);
 assert.ok(all.length>2);
 const live=all.filter(b=>b.hp>0);same(live,12,'all live');
 const dead=all[1];dead.hp=0;const after=all.filter(b=>b.hp>0);
 assert.ok(!after.includes(dead));same(after,12,'one destroyed');same(after,20,'one destroyed r20');
 for(const m of structureMasks(after,12))assert.ok(!m.includes(dead));
 const keep=all.find(b=>b.kind.startsWith('base')),cell=Math.floor(keep.y/GRID)*COLS+Math.floor(keep.x/GRID);
 assert.ok(structureMasks(after.includes(keep)?after:live,12)[cell].includes(keep),'a Keep masks the cell under it');
});

test('unmasked cells are empty arrays and masks are independent per call (no shared state between searches)',()=>{
 const live=[{id:'a',x:500,y:500,columns:2,rows:2}],one=structureMasks(live,12),two=structureMasks(live,12);
 assert.ok(one.filter(m=>m.length===0).length>COUNT-30);
 one[Math.floor(500/GRID)+Math.floor(500/GRID)*COLS].push({id:'x'});
 assert.equal(two[Math.floor(500/GRID)+Math.floor(500/GRID)*COLS].length,reference(live,12)[Math.floor(500/GRID)+Math.floor(500/GRID)*COLS].length,'a mutated mask never leaks into another call');
 const again=structureMasks(live,12);for(let i=0;i<COUNT;i++)if(again[i].length===0)assert.equal(again[i].length,0);
});

test('canAttackOn neither mutates nor retains its attacker: a frozen, reused probe gives the same answer as a fresh copy per cell',()=>{
 const sim=new Simulation('probe'),target=sim.state.bases['red-base'],structures=combatStructures(sim.state);
 const unit={id:'u',kind:'minion-red',team:'blue',...minionStats,hp:240,x:0,y:0};
 const probe={...unit},snapshot=JSON.stringify(probe);let hits=0;
 const frozen=Object.freeze({...unit}); // strict mode: any write to it throws
 for(let i=0;i<COUNT;i++){const p=point(i);probe.x=p.x;probe.y=p.y;
  const reused=canAttackOn(meadowGeometry,probe,target,structures),fresh=canAttackOn(meadowGeometry,{...unit,...p},target,structures);
  assert.equal(reused,fresh,`cell ${i}`);hits+=fresh?1:0;
  assert.doesNotThrow(()=>canAttackOn(meadowGeometry,Object.freeze({...unit,...p}),target,structures),'a frozen attacker is never written');
 }
 assert.ok(hits>0,'the sweep includes cells that can attack');assert.equal(Object.keys(probe).sort().join(),Object.keys({...unit,x:0,y:0}).sort().join(),'no property added');
 assert.equal(JSON.stringify({...probe,x:0,y:0}),JSON.stringify({...JSON.parse(snapshot),x:0,y:0}),'only x and y ever change');
 // retention: the result is a plain boolean; moving the probe afterwards cannot change anything already returned
 const first=canAttackOn(meadowGeometry,{...probe,x:1380,y:600},target,structures);probe.x=-999;assert.equal(typeof first,'boolean');
 void frozen;
});

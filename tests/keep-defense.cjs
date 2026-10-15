const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {extendedRules}=require('../.test-build/data/encounters.js');
const {balanceV02}=require('../.test-build/data/balanceV02.js');
const {canAttack}=require('../.test-build/simulation/Combat.js');
const {blocked}=require('../.test-build/simulation/Collision.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const ticks=(s,n)=>{for(let i=0;i<n;i++)s.advance(1000/30+.01);};
const ext=()=>new Simulation('keep-defense','extended');
// Slice A: the eighth Crimson tower (keep-rear) covers the Keep's east face, which the Keep itself hides from every other tower.

// Guardian positions (4 px lattice) reachable from the north lane east of the river, flood-filled through terrain and structures.
function reachable(s){
 const st=combatStructures(s.state),G=4,seen=new Set(),key=(x,y)=>x*10000+y,start=[1200,316],q=[start];
 assert.equal(blocked(...start,s.hero.radius,st),false,'flood fill starts on open ground');seen.add(key(...start));
 for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[G,0],[-G,0],[0,G],[0,-G]]){const nx=x+dx,ny=y+dy;if(nx<1100||seen.has(key(nx,ny))||blocked(nx,ny,s.hero.radius,st))continue;seen.add(key(nx,ny));q.push([nx,ny]);}}
 return q;
}
// Every reachable position from which the Guardian can hit the Crimson Keep, with the number of Crimson towers able to hit it there.
function keepAttackPositions(s){
 const st=combatStructures(s.state),keep=s.state.bases['red-base'],towers=Object.values(s.state.structures).filter(t=>t.team==='red'&&t.kind==='tower'&&t.hp>0);
 return reachable(s).filter(([x,y])=>canAttack({...s.hero,x,y},keep,st)).map(([x,y])=>({x,y,defenders:towers.filter(t=>canAttack(t,{...s.hero,x,y},st)).length}));
}

test('keep-rear is the eighth Crimson tower at (1760,600) with unchanged tower stats',()=>{
 assert.deepEqual(extendedRules.towers.at(-1),{id:'red-tower-keep-rear',kind:'tower',x:1760,y:600});
 const s=ext(),t=s.state.structures['red-tower-keep-rear'],ref=s.state.structures['red-tower-front-center'];
 assert.equal(Object.values(s.state.structures).filter(b=>b.team==='red'&&b.kind==='tower').length,8);
 for(const k of ['hp','maxHp','damage','range','cooldownTicks','windupTicks','armor','radius','progress','completeTick'])assert.equal(t[k],ref[k],k);
 assert.equal(s.state.bases['red-base'].hp,3000);
});

test('intact 8-tower layout: no reachable Keep-attack position is free of defending towers',()=>{
 const positions=keepAttackPositions(ext());
 assert.ok(positions.length>1500,'the Keep stays attackable from many reachable positions ('+positions.length+')');
 assert.ok(positions.some(p=>p.x>1682),'the east face is still reachable and attackable');
 const free=positions.filter(p=>p.defenders===0);
 assert.deepEqual(free,[],'undefended Keep-attack positions');
});

test('control: without keep-rear the east-face pocket reappears, so the coverage check is meaningful',()=>{
 const s=ext();delete s.state.structures['red-tower-keep-rear'];
 const free=keepAttackPositions(s).filter(p=>p.defenders===0);
 assert.ok(free.length>100,'pocket positions without keep-rear: '+free.length);
 assert.ok(free.every(p=>p.x>1682),'the pocket is the east face');
});

test('Guardian can walk through the 14 px gap between the Keep and keep-rear, and around the tower',()=>{
 const keepEast=1610+72,towerWest=1760-24,r=ext().hero.radius;
 assert.equal(towerWest-keepEast-2*r,14,'gap is 14 px wider than the Guardian');
 for(const x of [1709,1840]){
  const s=ext();s.state.units={guardian:s.hero};s.state.spawnedWaves=12;s.spawnQueue.length=0;
  assert.equal(s.teleportHero(x,420),true,'start north at x='+x);
  s.send({type:'move',x:0,y:1});let t=0;while(s.hero.y<720&&t<200&&s.hero.hp>0){s.hero.hp=s.hero.maxHp;s.send({type:'move',x:0,y:1});ticks(s,1);t++;}
  assert.ok(s.hero.y>=720,'reached the south side at x='+x+' (y '+s.hero.y.toFixed(1)+' after '+t+' ticks)');
  assert.ok(t<=Math.ceil(300/(s.hero.speed/30))+1,'no slowdown or snagging in the lane: '+t+' ticks for 300 px');
  assert.ok(Math.abs(s.hero.x-x)<1,'walked straight without being pushed out of the lane ('+s.hero.x.toFixed(1)+')');
 }
});

test('Keep can fall with every Crimson tower still standing; victory ends the match',()=>{
 const s=ext();s.state.units={guardian:s.hero};s.state.spawnedWaves=12;s.spawnQueue.length=0;
 assert.equal(s.teleportHero(1709,600),true);s.state.bases['red-base'].hp=40;
 s.send({type:'target',id:'red-base'});s.send({type:'attack'});
 for(let i=0;i<60&&!s.state.match.result;i++)ticks(s,1);
 assert.equal(s.state.match.phase,'victory');assert.equal(s.state.match.result.outcome,'victory');
 assert.equal(Object.values(s.state.structures).filter(t=>t.team==='red'&&t.hp>0).length,8,'all eight towers still standing');
});

test('destroying keep-rear awards the normal Crimson tower XP and reopens the pocket only after it falls',()=>{
 const s=ext();s.state.units={guardian:s.hero};s.state.spawnedWaves=12;s.spawnQueue.length=0;
 const t=s.state.structures['red-tower-keep-rear'];t.hp=1;
 assert.equal(s.teleportHero(1840,600),true);s.send({type:'target',id:t.id});s.send({type:'attack'});
 let xp=0;for(let i=0;i<60&&s.state.structures[t.id];i++){ticks(s,1);for(const e of s.drainEvents())if(e.type==='xp'&&e.sourceId.includes(t.id))xp+=e.amount;}
 assert.equal(s.state.structures[t.id],undefined,'keep-rear destroyed');
 assert.equal(xp,balanceV02.crimsonTowerXp);
 assert.equal(Object.values(s.state.structures).filter(b=>b.team==='red').length,7);
 assert.ok(keepAttackPositions(s).some(p=>p.defenders===0),'with keep-rear gone the east face is undefended again');
});

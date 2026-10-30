const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
// Chapter 3 Mission 3 gives the player an Azure Barracks; these tests are about the Crimson side, so they run the Frost Citadel match without it.
const noAzure=({azure:_azure,...setup})=>setup;
const {battlefield,frostCitadel,meadow,validateBattlefield}=require('../.test-build/world/battlefield.js');
const {barracksVisual,isBarracks,isFrostGate}=require('../.test-build/world/frostGateAppearance.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {DT,HZ,strike,until,objective}=require('./support/campaignBot.cjs');
// Chapter 3 C3-2: the Crimson Barracks. A Barracks is a pre-completed red wall with a 2 x 2 footprint (Simulation.gate), so it blocks movement and sight and the Guardian can destroy it, exactly like the Frost Gate. What is new is
// spawn ownership: every Crimson spawn slot belongs to one Barracks, and once that Barracks is dead its queued and future spawns are dropped, with no other Barracks taking them over. Level 22 is the only level that has them (docs/CHAPTER3_C3-2.md).
const BN='red-barracks-north',BS='red-barracks-south',BC='red-barracks-court',GN='red-guard-north',GS='red-guard-south',G='red-gate',K='red-base';
const NS=[1536,120],SS=[1536,1080],CS=[[1800,552],[1704,432]];
const L22=campaign.get('campaign-23');
const sim22=()=>new Simulation('b22',noAzure(campaign.setup(23)));
const kill=(sim,id)=>strike(sim,'guardian',id);
const at=(sim,t,log=[])=>until(sim,t,log);
const reds=(sim,prefix)=>Object.values(sim.state.units).filter(u=>u.team==='red'&&u.id.startsWith(prefix));
const fromSlot=(units,[x,y])=>units.filter(u=>u.id&&Math.abs(u.x-x)<400&&Math.abs(u.y-y)<400); // a unit has not walked far in the tick it spawns
const queued=(sim,pred)=>sim.spawnQueue.filter(e=>e.team==='red'&&pred(e));
const ids=(sim,n)=>[...Object.keys(sim.state.units).filter(id=>id.startsWith(`red-w${n}-`)),...sim.spawnQueue.filter(e=>e.id.startsWith(`red-w${n}-`)).map(e=>e.id)].sort(),idx=id=>Number(id.split('-').pop());
const isNorth=e=>e.x===NS[0]&&e.y===NS[1],isSouth=e=>e.x===SS[0]&&e.y===SS[1];

test('Barracks are sites of the Frost Citadel only: footprinted, validated and absent everywhere else',()=>{
 assert.deepEqual(frostCitadel.barracks,[{id:BN,x:1536,y:240,columns:2,rows:2},{id:BS,x:1536,y:960,columns:2,rows:2},{id:BC,x:1824,y:432,columns:2,rows:2}]);
 assert.ok(Object.isFrozen(frostCitadel.barracks)&&Object.isFrozen(frostCitadel.barracks[0]));
 for(const id of ['meadow','canyon-pass','oasis'])assert.equal(battlefield(id).barracks,undefined,`${id} has no Barracks site`);
 for(const bad of [{id:'',x:1,y:1,columns:2,rows:2},{id:'a',x:NaN,y:1,columns:2,rows:2},{id:'a',x:1,y:1,columns:0,rows:2},{id:'a',x:1,y:1,columns:2,rows:1.5},{id:'a',x:-1,y:1,columns:2,rows:2},{id:'red-gate',x:1,y:1,columns:2,rows:2}])
  assert.throws(()=>validateBattlefield({...frostCitadel,barracks:[bad]}),/Invalid battlefield frost-citadel: barracks/,JSON.stringify(bad));
 assert.throws(()=>validateBattlefield({...frostCitadel,barracks:[frostCitadel.barracks[0],frostCitadel.barracks[0]]}),/barracks/,'a repeated id');
});
test('Level 22 stands three Crimson Barracks of 2,500, 2,000 and 1,500 HP, two guard towers and the Frost Gate',()=>{
 const sim=sim22(),s=sim.state.structures;
 for(const [id,x,y,hp] of [[BN,1536,240,2500],[BS,1536,960,2000],[BC,1824,432,1500]]){const b=s[id];assert.ok(b,id);
  assert.deepEqual([b.kind,b.team,b.x,b.y,b.columns,b.rows,b.hp,b.maxHp,b.armor,b.progress],['wall','red',x,y,2,2,hp,hp,0,1],id);assert.equal(isBarracks(b),true);assert.equal(isFrostGate(b),false,'a Barracks is not a Frost Gate');}
 assert.deepEqual([s[GN].x,s[GN].y,s[GS].x,s[GS].y],[1608,312,1608,888]);assert.equal(s[GN].kind,'tower');assert.equal(s[G].hp,3000);assert.equal(isFrostGate(s[G]),true);assert.equal(isBarracks(s[G]),false);
 assert.equal(sim.state.bases[K].hp,3000);assert.deepEqual([sim.state.gold,sim.state.wood,sim.state.iron],[0,0,0]);
 assert.deepEqual(Object.keys(s).filter(id=>s[id].team==='red').sort(),[G,BC,BN,BS,'red-bastion-north','red-bastion-south','red-guard-north','red-guard-south','red-inner-north','red-inner-south'].sort());
 assert.equal(barracksVisual.name,'Crimson Barracks');
 assert.deepEqual(sim.setup.barracks.map(b=>[b.id,b.hp,b.slots]),[[BN,2500,[NS]],[BS,2000,[SS]],[BC,1500,CS]]);
});
test('a Barracks blocks movement and sight, takes Guardian damage, dies like any structure and gives no XP, Gold or objective',()=>{
 const sim=sim22(),b=sim.state.structures[BN];
 assert.equal(sim.geo.blocked(b.x,b.y,0,combatStructures(sim.state)),true,'its footprint blocks movement');
 assert.equal(sim.geo.blocked(b.x+60,b.y,0,combatStructures(sim.state)),false,'only its 2 x 2 footprint');
 const shooter={...sim.hero,x:b.x-70,y:b.y,hp:1000},behind={...sim.state.structures[GN],x:b.x+70,y:b.y+20};
 assert.equal(canAttackOn(sim.geo,shooter,b,combatStructures(sim.state)),true,'the Guardian can strike it from 70 px');
 assert.equal(canAttackOn(sim.geo,{...shooter,x:b.x-70},behind,combatStructures(sim.state)),false,'and it blocks sight to a unit behind it');
 // Real combat damage: the Guardian, standing beside it, chops it down (the 0.6 structure multiplier applies, as for the gate).
 sim.hero.x=b.x-70;sim.hero.y=b.y;sim.send({type:'target',id:BN});sim.send({type:'attack'});
 const log=[];const hp0=b.hp;at(sim,30*3,log);assert.ok(b.hp<hp0,'the Guardian hurts it');assert.ok(log.some(e=>e.type==='damage'&&e.id===BN&&e.sourceId==='guardian'));
 const gold=sim.state.gold,xp=sim.state.heroProgression.xp;kill(sim,BN);
 assert.equal(sim.state.structures[BN],undefined,'removed on death');assert.equal(sim.state.gold,gold);assert.equal(sim.state.heroProgression.xp,xp);
assert.equal(L22.mission.phases.flatMap(p=>p.objectives).some(o=>o.type==='destroy'&&o.targets.some(t=>/barracks/.test(t))),false,'Barracks are never objectives');
 assert.equal(sim.ended,false,'destroying a Barracks does not end the match');assert.ok(sim.state.bases[K].hp>0);
});
test('waves alternate between the two outside Barracks: half of every wave spawns at each, six in the first wave',()=>{
 const sim=sim22();at(sim,301);
 const wave=ids(sim,1);assert.equal(wave.length,6);assert.deepEqual(wave.map(id=>idx(id)%2?'S':'N').join(''),'NSNSNS','round robin over the two slots, three each');
 const q=queued(sim,e=>e.wave===1);assert.ok(q.length>=4&&q.every(e=>isNorth(e)===(idx(e.id)%2===0)&&isNorth(e)!==isSouth(e)),'queued entries carry their Barracks slot');
 assert.deepEqual(L22.match.overrides.waves.enemyPerWave,[6,6,6,6,7,7,8,8]);
 at(sim,301+750);assert.equal(ids(sim,2).length,6);
 const seven=noAzure(campaign.setup(23)).waveRules;assert.deepEqual([seven.firstWaveTick,seven.waveInterval,seven.alliedPerWave],[300,750,1]);
});
test('a destroyed Barracks drops its queued entries at once and its future ones as they come due; the other Barracks sends exactly its own share',()=>{
 const sim=sim22();at(sim,301);assert.equal(queued(sim,isNorth).length,2,'entry 0 has spawned; two North entries wait');
 kill(sim,BN);at(sim,302);assert.equal(queued(sim,isNorth).length,0,'its queued units never appear');assert.equal(queued(sim,isSouth).length,3);
 at(sim,301+750+200);
 const all=Object.keys(sim.state.units).filter(id=>id.startsWith('red-w'));
 assert.deepEqual(all.filter(id=>idx(id)%2===0&&id!=='red-w1-0'),[],'no North entry spawned after the Barracks fell (red-w1-0 left before it did)');
 assert.deepEqual(all.filter(id=>id.startsWith('red-w1-')&&idx(id)%2).length,3,'the South entries of wave 1 did');
 // Wave 2 is six entries: three South, three dropped. Nothing was redistributed.
 assert.equal(all.filter(id=>id.startsWith('red-w2-')).length,3);assert.equal(queued(sim,e=>e.wave===2).length,0);
 assert.equal(sim.state.structures[BS].hp,2000,'the South Barracks is untouched');
});
test('units a Barracks already sent stay alive when it falls',()=>{
 const sim=sim22();at(sim,301+60);const out=reds(sim,'red-w1-').filter(u=>u.hp>0);assert.ok(out.length>=2,'some of wave 1 is on the field');
 const north=out.filter(u=>idx(u.id)%2===0);assert.ok(north.length>0);kill(sim,BN);at(sim,301+62);
 for(const u of north)assert.ok(sim.state.units[u.id]?.hp>0,`${u.id} still stands`);
});
test('with both outside Barracks dead every wave is dropped whole, no wave is ever stuck, and a waves-defeated objective can still complete',()=>{
 // Level 22 itself has no waves objective; the guarantee still holds for any level that does, so this uses the level's setup with a test-only mission.
 const sim=new Simulation('b22w',matchSetup('extended',{...structuredClone(L22.match.overrides),mission:{waveMode:'until-objectives',phases:[{id:'hold',objectives:[{id:'waves',type:'waves-defeated',count:4,display:{label:'Defeat 4 Crimson waves'}}]}]}}));kill(sim,BN);kill(sim,BS);
 const log=at(sim,300+750*5+10);
 assert.equal(Object.keys(sim.state.units).filter(id=>id.startsWith('red-w')).length,0,'nothing spawns');assert.equal(sim.spawnQueue.filter(e=>e.team==='red').length,0);
 assert.ok(sim.state.spawnedWaves>=4,'the waves are still announced');
 assert.equal(objective(sim,'waves').complete,true,'all four waves count as defeated although no minion ever spawned');assert.ok(objective(sim,'waves').progress>=4);
 assert.equal(log.some(e=>e.type==='spawn'&&/^red-w/.test(e.id)),false);
});
test('a dead Barracks at the head of the queue cannot stall the other Barracks while a unit stands on its slot',()=>{
 const sim=sim22();at(sim,299);
 // A Crimson unit parked on the North slot blocks that slot (spawn clearance); the queue is deferred behind it.
 sim.state.units['plug']={...sim.state.units.guardian,id:'plug',kind:'minion-red',team:'red',x:NS[0],y:NS[1],hp:999,maxHp:999};
 at(sim,301);const stuck=reds(sim,'red-w1-').length;
 kill(sim,BN);at(sim,330);
 assert.ok(reds(sim,'red-w1-').length>stuck,'South units spawn once the blocked North entries are dropped');
});
test('the courtyard Barracks owns the garrison slots: sealed behind the gate, the garrison stops when it falls, and it cannot be struck from outside',()=>{
 // Not attackable from outside: no cell the Guardian can reach with the gate standing lets it strike the courtyard Barracks.
 const sim=sim22(),structures=combatStructures(sim.state),court=sim.state.structures[BC];
 const cols=40,rows=24,idx=(x,y)=>Math.floor(y/48)*cols+Math.floor(x/48),seen=new Set([idx(450,600)]),stack=[...seen];
 while(stack.length){const i=stack.pop(),c=i%cols,r=Math.floor(i/cols);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr,n=nr*cols+nc;if(nc<0||nr<0||nc>=cols||nr>=rows||seen.has(n)||sim.geo.blocked((nc+.5)*48,(nr+.5)*48,20,structures))continue;seen.add(n);stack.push(n);}}
 let strikes=0;for(const i of seen){const g={...sim.hero,x:(i%cols+.5)*48,y:(Math.floor(i/cols)+.5)*48,hp:1000};if(Math.hypot(g.x-court.x,g.y-court.y)<200&&canAttackOn(sim.geo,g,court,structures))strikes++;}
 assert.equal(strikes,0,'sealed while the gate stands');
 for(const [x,y] of CS)assert.equal(seen.has(idx(x,y)),false,'its slots are inside the courtyard');
 // Garrison: the gate falls, the first garrison wave spawns 90 ticks later from the courtyard Barracks' slots.
 kill(sim,G);at(sim,sim.clock.tick+90+24*3+4);let g=Object.keys(sim.state.units).filter(id=>id.startsWith('red-g'));assert.equal(g.length,4,'the first garrison wave is four');
 assert.ok(g.every(id=>sim.state.units[id].x>1440),'inside the courtyard');
 // The courtyard Barracks falls: the next garrison wave (five, 750 ticks later) is dropped, and so are all after it.
 kill(sim,BC);at(sim,sim.clock.tick+750*3);g=Object.keys(sim.state.units).filter(id=>id.startsWith('red-g'));assert.equal(g.length,4,'no garrison unit after the first wave');
});
test('a courtyard Barracks that is already dead means the gate falling releases no garrison at all',()=>{
 const sim=sim22();kill(sim,BC);kill(sim,G);at(sim,sim.clock.tick+90*4);
 assert.equal(Object.keys(sim.state.units).filter(id=>id.startsWith('red-g')).length,0);
 at(sim,sim.clock.tick+750*2);assert.equal(Object.keys(sim.state.units).filter(id=>id.startsWith('red-g')).length,0,'and none later');
});
test('level data is validated: sites, hit points, owned slots, one owner per slot, and every wave slot owned',()=>{
 const base=()=>structuredClone(L22.match.overrides),make=o=>matchSetup('extended',{...o,mission:structuredClone(L22.mission)});
 assert.doesNotThrow(()=>make(base()));
 const withB=b=>{const o=base();o.barracks=b;return o;};
 const good=[{id:BN,hp:2500,slots:[NS]},{id:BS,hp:2000,slots:[SS]},{id:BC,hp:1500,slots:CS}];
 for(const bad of [[{id:'nope',hp:5,slots:[NS]},good[1],good[2]],[{...good[0],hp:0},good[1],good[2]],[{...good[0],hp:1.5},good[1],good[2]],[{...good[0],slots:[]},good[1],good[2]],[{...good[0],slots:[[1,1]]},good[1],good[2]],
  [good[0],good[0],good[1],good[2]],[good[0],{...good[1],slots:[NS]},good[2]],[good[0],good[2]],[{...good[0],slots:[NS,SS]},{...good[1],slots:[[1536,1081]]},good[2]]])
  assert.throws(()=>make(withB(bad)),/Invalid barracks|invalid spawn slot|has no Barracks/,JSON.stringify(bad.map(b=>b.id)));
 assert.throws(()=>matchSetup('extended',{battlefield:'canyon-pass',barracks:[{id:BN,hp:5,slots:[[1380,556]]}]}),/Invalid barracks/,'Canyon has no Barracks site');
 assert.throws(()=>Object.assign(new Simulation('x',make(withB([{...good[0],slots:[[1536,230]]},good[1],good[2]])))),/blocked|invalid/i,'a slot inside the Barracks footprint is rejected');
 assert.equal(Object.hasOwn(matchSetup('extended',{battlefield:'frost-citadel'}),'barracks'),false,'a setup without Barracks has no barracks key');
 const copy=make(base()).barracks;assert.notEqual(copy[0].slots,base().barracks[0].slots);assert.ok(copy.every(b=>b.columns===2&&b.rows===2));
});
test('Barracks touch nothing outside Levels 22-24: Level 21, Chapters 1-2 and Full Battle carry no Barracks and keep their guard sites unnamed',()=>{
 for(const l of campaign.list().filter(l=>!['campaign-22','campaign-23','campaign-24','campaign-25'].includes(l.id))){const setup=campaign.setup(l.id);assert.equal(Object.hasOwn(setup,'barracks'),false,l.id);
  const sim=new Simulation('iso',setup);assert.equal(Object.keys(sim.state.structures).some(id=>/^red-barracks|red-guard/.test(id)),false,`${l.id} stands no Barracks or guard tower`);}
 const l21=campaign.setup(21);assert.deepEqual(l21.encounter.defenders.map(d=>d.id).sort(),['red-forward-north','red-forward-south','red-bastion-north','red-bastion-south','red-inner-north','red-inner-south'].sort());
 assert.deepEqual(l21.waveRules.redSlots,[[1224,552],[1296,264],[1224,648],[1296,936]]);assert.deepEqual(l21.waveRules.enemyPerWave,[3,3,4,4,5,5,6]);assert.equal(l21.gates[0].hp,3000);
 assert.deepEqual(l21.garrison,{after:G,slots:[[1800,552],[1800,648]],counts:[3,4],delayTicks:90,intervalTicks:900});
 assert.equal(matchSetup('extended').battlefield,meadow);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {siege}=require('./support/barracksBot.cjs');
const {strike,until}=require('./support/campaignBot.cjs');
// Chapter 3 M4A: Mission 4 "The Twin Walls" (docs/CHAPTER3_M4A.md), a two-ring siege. The direct road breaks the Outer Gate; the alternate roads go round the outer wall through its north or south gap,
// past that gap's Barracks. Every road ends at the Inner Gate, and the Keep is the only objective. Every balance value is provisional and every bot result is preliminary evidence from the recall-and-rebuild bot,
// not a human playtest; nothing was tuned to equalize bot times, and the bounds are loose so that a harmless change does not fail them.
const L=campaign.get('campaign-24'),GO='red-gate-outer',GI='red-gate-inner',BN='red-barracks-north',BS='red-barracks-south',BC='red-barracks-court',K='red-base';
const ON='red-outer-north',OS='red-outer-south',CN='red-court-north',CS='red-court-south';
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
// A 48 px grid route for a unit of radius r between cell centres, with the given structures standing.
const G=48,COLS=40,ROWS=24;
function route(sim,from,to,r,st){const c=(x,y)=>Math.floor(y/G)*COLS+Math.floor(x/G),pt=i=>({x:(i%COLS+.5)*G,y:(Math.floor(i/COLS)+.5)*G});
 const s=c(from.x,from.y),e=c(to.x,to.y),prev=new Map([[s,-1]]),q=[s];
 for(let k=0;k<q.length;k++){const i=q[k];if(i===e)break;const col=i%COLS,row=Math.floor(i/COLS);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=col+dc,nr=row+dr,n=nr*COLS+nc;if(nc<0||nr<0||nc>=COLS||nr>=ROWS||prev.has(n))continue;const p=pt(n);if(sim.geo.blocked(p.x,p.y,r,st))continue;prev.set(n,i);q.push(n);}}
 if(!prev.has(e))return null;const path=[];for(let i=e;i>=0;i=prev.get(i))path.unshift(pt(i));return path;}
const without=(sim,...ids)=>Object.fromEntries(Object.entries(combatStructures(sim.state)).filter(([id])=>!ids.includes(id)));
const crossing=path=>path.find(p=>p.x===1272); // the cell where a route crosses the outer-wall column (x 1248-1296)
const towersSeeing=(sim,p,st)=>Object.values(sim.state.structures).filter(t=>t.team==='red'&&t.kind==='tower'&&Math.hypot(t.x-p.x,t.y-p.y)<=t.range&&sim.geo.lineOfSight(t,p,Object.fromEntries(Object.entries(st).filter(([id])=>id!==t.id)))).map(t=>t.id).sort();
// Records which opening of the outer-wall line the Guardian walks through (respawns are jumps, not crossings).
function watchCrossings(sim){const h=sim.hero,adv=sim.advance.bind(sim),seen={north:0,gate:0,south:0};let px=h.x;
 sim.advance=dt=>{if(h.hp>0&&(px<1272)!==(h.x<1272)&&Math.abs(px-h.x)<60)seen[h.y<192?'north':h.y>1008?'south':'gate']++;px=h.x;return adv(dt);};return seen;}

test('Mission 4 is The Twin Walls: one objective, destroy the Crimson Keep; gates and Barracks are optional and there is no failure threshold',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[24,3,'campaign-24','The Twin Walls','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.ok(L.display.briefing.length<=320,`the briefing body must fit three lines of the mission briefing (${L.display.briefing.length} characters)`);
 assert.match(L.display.briefing,/^Destroy the Crimson Keep/);assert.match(L.display.briefing,/Gates and Barracks are optional/);
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:[K],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(L.mission.failure,undefined,'defeat is the Azure Keep reaching 0 HP');
 const o=L.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.start,o.gates,o.shop],['twin-walls',true,{gold:0,wood:0,iron:0},[{id:GO,hp:1000},{id:GI,hp:3000}],undefined]);
 assert.deepEqual(o.waves,{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1368,72],[1368,1128]]});
 assert.deepEqual(o.defenders,[ON,OS,'red-strip-north','red-strip-south','red-gap-north','red-gap-south',CN,CS]);
 assert.deepEqual(o.garrison,{after:GI,slots:[[1800,552],[1704,432]],counts:[4,5],delayTicks:90,intervalTicks:750});
 assert.deepEqual(o.barracks,[{id:BN,hp:2000,slots:[[1368,72]]},{id:BS,hp:2000,slots:[[1368,1128]]},{id:BC,hp:1500,slots:[[1800,552],[1704,432]]}]);
 assert.deepEqual(o.azure,{pads:[{col:10,row:10},{col:10,row:14},{col:13,row:12}],initial:[{col:10,row:10}]},"Mission 3's Azure Barracks pads, one Barracks standing");
});
test('Twin Walls is its own battlefield: the Frost Citadel keeps its own walls, gate and tower sites',()=>{
 const f=battlefield('twin-walls'),c=battlefield('frost-citadel');
 assert.deepEqual(f.gates.map(g=>[g.id,g.x,g.y,g.columns,g.rows]),[[GO,1272,600,1,2],[GI,1464,600,1,2]]);
 assert.deepEqual(c.gates.map(g=>[g.id,g.x,g.y]),[['red-gate',1416,600]]);assert.equal(c.towers.length,8);assert.ok(c.towers.every(t=>!t.id.startsWith('red-outer')&&!t.id.startsWith('red-gap')));
 assert.equal(campaign.get('campaign-21').match.overrides.battlefield,'frost-citadel');assert.equal(campaign.get('campaign-23').match.overrides.battlefield,'frost-citadel');
 // The canyon is shortened to x 800-1040 on this battlefield only; no scenery is left east of the cliffs.
 assert.ok(f.barriers.some(b=>b.x0===800&&b.x1===1040&&b.y1===480));assert.ok(f.scenery.every(p=>p.x<1040));
});
test('Mission 4 builds: eight Crimson towers, two gates, three Barracks and one Azure Barracks stand; the Crimson queue is empty until the first wave',()=>{
 const sim=new Simulation('l24',campaign.setup(24)),st=sim.state.structures;assert.equal(sim.spawnQueue.length,0);
 assert.deepEqual([st[GO].hp,st[GI].hp,st[BN].hp,st[BS].hp,st[BC].hp],[1000,3000,2000,2000,1500]);
 assert.equal(Object.values(st).filter(b=>b.team==='red'&&b.kind==='tower').length,8);
 assert.equal(Object.values(st).filter(b=>b.azureBarracks).length,1);
 until(sim,200);assert.ok(Object.keys(sim.state.units).some(id=>id.startsWith('blue-s-')),'the standing Azure Barracks trains its soldiers');
});
test('roads: the Outer Gate closes the direct road, both gaps stay open, and every road ends at the Inner Gate',()=>{
 const sim=new Simulation('l24-roads',campaign.setup(24)),all=combatStructures(sim.state),mouth={x:1080,y:600},spot={x:1416,y:600};
 for(const r of [12,20]){
  const closed=route(sim,mouth,spot,r,all);assert.ok(closed,`a ${r} px unit reaches the Inner Gate with the Outer Gate standing`);assert.ok([72,120,168,1032,1080,1128].includes(crossing(closed).y),'through a gap');
  assert.equal(crossing(route(sim,mouth,spot,r,without(sim,GO))).y,600,'with the Outer Gate down the direct road is the shortest');
  for(const gap of [{x:1272,y:120},{x:1272,y:1080}])assert.ok(route(sim,mouth,gap,r,all)&&route(sim,gap,spot,r,all),`gap ${gap.y} is open for a ${r} px unit`);
  assert.equal(route(sim,mouth,{x:1560,y:600},r,without(sim,GO)),null,'nothing reaches the courtyard while the Inner Gate stands');
 }
});
test('line of sight: two bastions cover each gate\'s siege spots, with no tower firing over a wall',()=>{
 const sim=new Simulation('l24-los',campaign.setup(24)),all=combatStructures(sim.state);
 for(const y of [552,600,648]){
  assert.deepEqual(towersSeeing(sim,{x:1224,y},all),[ON,OS],`outer siege spot (1224,${y})`);
  assert.deepEqual(towersSeeing(sim,{x:1416,y},without(sim,GO)),[CN,CS],`inner siege spot (1416,${y})`);
 }
 // The courtyard bastions stand inside the ring: the outer wall hides the outer siege spot from them, and the Inner Gate hides the courtyard.
 assert.ok(!towersSeeing(sim,{x:1224,y:600},all).some(id=>id===CN||id===CS));assert.deepEqual(towersSeeing(sim,{x:1560,y:600},all).filter(id=>id.startsWith('red-court')),[]);
 // Each gap is watched from both sides of the outer wall.
 assert.ok(towersSeeing(sim,{x:1176,y:120},all).includes('red-strip-north')&&towersSeeing(sim,{x:1320,y:120},all).includes('red-gap-north'));
 assert.ok(towersSeeing(sim,{x:1176,y:1080},all).includes('red-strip-south')&&towersSeeing(sim,{x:1320,y:1080},all).includes('red-gap-south'));
});
test('each gap Barracks owns the wave slot beside its gap, so its waves use that road',()=>{
 const sim=new Simulation('l24-slots',campaign.setup(24)),all=combatStructures(sim.state),azure={x:504,y:600}; // in front of the Azure Keep (its own cell is footprint)
 for(const [slot,gap] of [[[1368,72],{x:1272,y:120}],[[1368,1128],{x:1272,y:1080}]]){
  assert.ok(Math.hypot(slot[0]-gap.x,slot[1]-gap.y)<=120,'the slot is beside its gap');
  const p=route(sim,{x:slot[0],y:slot[1]},azure,12,all);assert.ok(p,'the wave reaches the Azure Keep');assert.equal(Math.sign(crossing(p).y-600),Math.sign(slot[1]-600),'through its own gap while the Outer Gate stands');
 }
});
test('Mission 4 has no Hold phase: the Keep alone wins; gates and Barracks never complete it',()=>{
 const sim=new Simulation('l24-open',campaign.setup(24)),st=sim.missionStatus();assert.deepEqual([st.activePhase,st.objectives.map(o=>o.id)],['assault',['keep']]);
 until(sim,300+750+10);assert.ok(sim.state.spawnedWaves>=2,'waves spawn with no Hold phase');
 for(const id of [GO,BN,BS,GI,BC])strike(sim,'guardian',id);
 assert.equal(sim.ended,false,'destroying both gates and every Barracks does not complete the mission');assert.deepEqual(sim.missionStatus().completedPhases,[]);
 strike(sim,'guardian',K);until(sim,sim.clock.tick+2);
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
});
test('Mission 4 defeat is the Azure Keep reaching 0 HP',()=>{
 const half=new Simulation('l24-half',campaign.setup(24));half.state.bases['blue-base'].hp=half.state.bases['blue-base'].maxHp*.4;until(half,half.clock.tick+30);assert.equal(half.ended,false,'40% is alive');
 const dead=new Simulation('l24-0hp',campaign.setup(24));dead.state.bases['blue-base'].hp=0;until(dead,dead.clock.tick+2);assert.equal(dead.outcome&&dead.outcome.outcome,'defeat');
});
test('Mission 4 is Chapter 3 Mission 4 in the released chapter: it unlocks in order after Chapter 2 and the earlier Chapter 3 missions, never earlier',()=>{
 const {through}=require('./support/chapter3Save.cjs');
 assert.equal(campaignChapters[2].slots[3].levelId,'campaign-24');assert.equal(campaignChapters[2].release,'available');
 const v=chapterViews(campaignChapters,campaign.list(),through(3).progress)[2];assert.equal(v.state,'available');assert.equal(v.released,6);
 assert.equal(campaign.list().filter(l=>l.chapter===3).length,6);assert.equal(campaign.list().at(-1).id,'full-battle');
 assert.equal(through(3).isUnlocked(L),true,'unlocked once the mission before it is cleared');assert.equal(through(3).progress.next.id,'campaign-24');
 assert.equal(through(2).isUnlocked(L),false,'locked while the mission before it is not cleared');
 assert.equal(through(3).recordVictory(L).recorded,true);
});
// Bots: the shared recall-and-rebuild Barracks bot. Direct breaks both bastions and the Outer Gate; the alternate plans leave the Outer Gate standing, so every trip goes round through a gap.
const IN=[CN,CS,GI,K];
const runs={direct:[ON,OS,GO,...IN],north:[BN,...IN],south:[BS,CS,CN,GI,K]};
for(const [name,targets] of Object.entries(runs))test(`bot, ${name} road: the Keep falls and the Azure Keep survives`,()=>{
 const sim=new Simulation('l24-'+name,campaign.setup(24)),seen=watchCrossings(sim),r=siege(sim,{targets});
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
 assert.ok(r.seconds>180&&r.seconds<600,`${r.seconds} s`);assert.ok(r.azureMin>=1500,`Azure Keep at ${r.azureMin}`);assert.ok(r.deaths<=8,`${r.deaths} Guardian deaths`);assert.ok(r.maxLive<=24,'the Crimson cap holds');
 assert.ok(r.log.some(e=>e.type==='damage'&&/^blue-s-/.test(String(e.sourceId))&&/^red-/.test(e.id)),'Azure soldiers fought');
 if(name==='direct'){assert.ok(r.at(GO)<r.at(GI),'the Outer Gate falls first');assert.ok(seen.gate>0,'the Guardian walks through the Outer Gate');}
 else{
  assert.equal(r.at(GO),undefined,'the Outer Gate never falls');assert.equal(seen.gate,0);assert.ok(seen[name]>0,`the Guardian goes round by the ${name} gap`);
  const b=name==='north'?BN:BS;assert.ok(r.at(b)<r.at(GI),'its Barracks falls on the way');
  const slot=name==='north'?/^red-w\d+-\d*[02468]$/:/^red-w\d+-\d*[13579]$/; // waves alternate North, South
  assert.equal(r.log.filter(e=>e.type==='spawn'&&e.at>r.at(b)+1&&slot.test(e.id)).length,0,'no unit spawned at its slot afterwards');
 }
});

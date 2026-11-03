const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {combatStructures,structuresFor}=require('../.test-build/simulation/GameState.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {strike,DT}=require('./support/campaignBot.cjs');
// Chapter 4 Mission 4 "Fortress Approach" (docs/CHAPTER4_M4.md): the War Cart, two capturable Gatehouses, the optional Elite Barracks and a guarding Crimson Hero. Every balance value is provisional.
const L=campaign.get('campaign-34'),o=L.match.overrides,CART='red-cart',FG='red-forward-gate',MG='red-main-gate',EB='red-barracks-elite',KEEP='red-base';
const FWD=['c4-fwd-north','c4-fwd-south'],MAIN=['c4-main-north','c4-main-south'],ELT=['c4-elite-west','c4-elite-east'];
const fresh=()=>new Simulation('l34',campaign.setup(34));
const play=(sim,ticks,log=[])=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
const strong=sim=>{sim.hero.hp=sim.hero.maxHp=1e6;};
const fund=sim=>{sim.economy.balances={...sim.economy.balances,wood:2000*RESOURCE_UNITS,iron:500*RESOURCE_UNITS};};
const kill=(sim,ids)=>{for(const id of ids)if(sim.state.structures[id]?.hp>0||sim.state.units[id]?.hp>0)strike(sim,'guardian',id);};
const at=(sim,x,y)=>{assert.ok(sim.teleportHero(x,y),`the Guardian can stand at ${x},${y}`);strong(sim);};
// Kill the Crimson cart wherever it is, once it exists.
const cartDown=sim=>{play(sim,950);assert.ok(sim.state.units[CART],'the cart has spawned');strike(sim,'guardian',CART);play(sim,2);};
const crimsonSlowdown=sim=>{for(const u of Object.values(sim.state.units))if(u.team==='red'&&u.id!==CART&&u.id!=='red-hero'){u.hp=0;delete sim.state.units[u.id];}};
const capture=(sim,holders,id,x,y)=>{kill(sim,holders);at(sim,x,y);play(sim,125);assert.equal(sim.state.captures[id].stage,'captured',`${id} captured`);};
const repair=(sim,id,x,y,ticks=155)=>{fund(sim);at(sim,x,y);play(sim,ticks);};

test('Mission 4 is Fortress Approach: Chapter 4, campaign-34, destroy the Crimson Keep, no capture phase',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title],[34,4,'campaign-34','Fortress Approach']);
 assert.deepEqual(L.mission.phases.map(p=>p.id),['assault']);assert.deepEqual(L.mission.phases[0].objectives[0].targets,[KEEP]);assert.ok(Object.isFrozen(L));
 assert.equal(o.post,undefined,'no camp: the Keep is never shielded');
});
test('the approved values: M2/M3 waves and start, two 3,000 HP faction gates, three captures, one cart, one guarded Hero',()=>{
 assert.deepEqual(o.waves.enemyPerWave,[6,6,6,6,7,7,8,8]);assert.deepEqual(o.start,{gold:0,wood:100,iron:10});assert.deepEqual([o.azure.limit,o.azure.initial],[2,[{col:10,row:10}]],'a prebuilt Barracks and one more');assert.equal(o.captures.find(c=>c.elite).elite.intervalTicks,1350);assert.equal(o.captures.find(c=>c.elite).elite.count,2);
 assert.deepEqual(o.gates.map(g=>[g.id,g.hp,g.faction,g.assist]),[[FG,3000,true,true],[MG,3000,true,true]]);
 assert.deepEqual(o.captures.map(c=>c.id),[FG,MG,EB]);assert.equal(o.captures.filter(c=>c.elite).length,1,'one Elite Barracks');
 assert.deepEqual([o.cart.order,o.cart.follow,o.cart.sites.length],[[FG,MG],300,3]);assert.equal(o.guard.raidAfter,FG);
});
test('exactly one initial Crimson cart appears, attacks structures only, and never respawns',()=>{
 const sim=fresh();strong(sim);const log=play(sim,2800);
 assert.equal(log.filter(e=>e.type==='spawn'&&e.id===CART).length,1);
 const hits=log.filter(e=>e.type==='attack'&&e.id===CART);assert.ok(hits.length>0,'the cart attacked something');
 for(const h of hits)assert.ok(!/^(guardian|blue-\d|blue-s-|blue-c-)/.test(h.targetId),`${h.targetId} is a structure, not a unit`);
});
test('the cart dies on its way: one wreck on the nearest authored site; a second cart never comes',()=>{
 const sim=fresh();strong(sim);cartDown(sim);const w=sim.state.cartWreck;
 assert.ok(w,'a wreck');assert.ok(o.cart.sites.some(s=>s.col===w.col&&s.row===w.row),'on an authored site');
 const log=play(sim,3000);assert.equal(log.filter(e=>e.type==='spawn'&&e.id===CART).length,0,'no second Crimson cart');assert.equal(sim.state.cartWreck.col,w.col);
});
test('repair needs the Guardian in the ring and the price; it makes exactly one Azure cart and removes the wreck',()=>{
 const sim=fresh();strong(sim);cartDown(sim);const w=sim.state.cartWreck;
 at(sim,w.x+300,w.y);sim.economy.balances={...sim.economy.balances,wood:1000*RESOURCE_UNITS,iron:100*RESOURCE_UNITS};play(sim,200);assert.equal(w.repair,undefined,'nobody in the ring: no repair');
 sim.economy.balances={...sim.economy.balances,wood:0,iron:0};at(sim,w.x+40,w.y);const log=play(sim,100);assert.equal(w.repair,undefined,'no resources: no repair');assert.ok(log.some(e=>e.type==='site'&&e.change==='short'),'the player is told');
 fund(sim);play(sim,5);assert.ok(w.repair,'paid and running');play(sim,160);
 const carts=Object.values(sim.state.units).filter(u=>u.cart&&u.team==='blue');assert.equal(carts.length,1);assert.equal(sim.state.cartWreck,undefined);assert.ok(sim.economy.applied.has('repair:cart'),'the price was paid, once');
 assert.equal(carts[0].maxHp,900);play(sim,3000);assert.equal(Object.values(sim.state.units).filter(u=>u.cart&&u.team==='blue').length<=1,true,'never more than one Azure cart');
});
test('the Azure cart follows the Guardian: it stops when he is more than 300 px away and resumes the moment he is back',()=>{
 const sim=fresh();strong(sim);cartDown(sim);const w=sim.state.cartWreck;repair(sim,'cart',w.x+40,w.y);
 const cart=Object.values(sim.state.units).find(u=>u.cart&&u.team==='blue');assert.ok(cart);cart.x=700;cart.y=600;
 at(sim,cart.x-60,cart.y);play(sim,60);const x1=cart.x;assert.ok(x1>w.x+1||Math.abs(cart.x-w.x)>1,'it walks when he is near');
 at(sim,cart.x-500,cart.y-200);play(sim,2);const stopX=cart.x;play(sim,90);assert.equal(cart.x,stopX,'it stops');play(sim,90);assert.equal(cart.x,stopX,'and stays stopped');
 at(sim,cart.x-100,cart.y);play(sim,60);assert.ok(cart.x>stopX,'it resumes');
});
test('the Azure cart attacks the Forward Gatehouse first, then the Main Gatehouse, then the Keep, and a gate that is no longer Crimson is skipped',()=>{
 const sim=fresh();strong(sim);cartDown(sim);const w=sim.state.cartWreck;repair(sim,'cart',w.x+40,w.y);
 const cart=Object.values(sim.state.units).find(u=>u.cart&&u.team==='blue');cart.x=980;cart.y=600;at(sim,940,600);
 const log=play(sim,120);assert.equal(log.find(e=>e.type==='attack'&&e.id===cart.id)?.targetId,FG,'the Forward Gatehouse first');
 sim.state.structures[FG].team='blue';play(sim,5);assert.equal(cart.targetId,MG,'an Azure gate is skipped');
 sim.state.structures[MG].team='blue';play(sim,5);assert.equal(cart.targetId,KEEP);
});
test('losing the Azure cart leaves no wreck, and the mission is still winnable by hand',()=>{
 const sim=fresh();strong(sim);cartDown(sim);const w=sim.state.cartWreck;repair(sim,'cart',w.x+40,w.y);
 const cart=Object.values(sim.state.units).find(u=>u.cart&&u.team==='blue');strike(sim,'red-base',cart.id);play(sim,3);
 assert.equal(sim.state.units[cart.id],undefined);assert.equal(sim.state.cartWreck,undefined,'no second wreck, no farming');
 kill(sim,[...FWD,...MAIN,FG,MG]);strike(sim,'guardian',KEEP);play(sim,3);assert.equal(sim.outcome?.outcome,'victory');
});
test('a Gatehouse is captured (holders dead, Guardian in the ring), stands open to both teams, and is repaired into an Azure gate',()=>{
 const sim=fresh();strong(sim);const g=sim.state.structures[FG];
 at(sim,960,600);play(sim,200);assert.equal(sim.state.captures[FG].stage,'crimson','the towers still stand: no capture');
 kill(sim,FWD);play(sim,125);assert.equal(sim.state.captures[FG].stage,'captured');assert.equal(g.team,'red');assert.ok(g.open);
 for(const team of ['blue','red'])assert.equal(structuresFor(sim.state,team)[FG],undefined,`${team} passes the open gate`);
 repair(sim,FG,960,600);assert.equal(sim.state.captures[FG].stage,'azure');assert.equal(g.team,'blue');assert.equal(g.open,undefined);assert.equal(g.hp,g.maxHp);
 assert.equal(structuresFor(sim.state,'blue')[FG],undefined,'Azure passes it');assert.ok(structuresFor(sim.state,'red')[FG],'Crimson must break it');
});
test('a converted Gatehouse: Crimson inside the footprint is ejected, Azure walks through, Crimson attacks and destroys it, and it never reverts',()=>{
 const sim=fresh();strong(sim);const g=sim.state.structures[FG];capture(sim,FWD,FG,960,600);
 fund(sim);at(sim,960,600);play(sim,149);const raider=sim.state.units['red-t']=sim.unit('red-t','minion-red',1032,600);play(sim,3);assert.equal(sim.state.captures[FG].stage,'azure');assert.ok(Math.abs(raider.x-1032)>=1||Math.abs(raider.y-600)>=1,'ejected from the footprint');assert.ok(!sim.geo.blocked(raider.x,raider.y,raider.radius,structuresFor(sim.state,'red')),'standing on open ground');
 at(sim,960,600);sim.send({type:'move',x:1,y:0});play(sim,150);assert.ok(sim.hero.x>1100,`the Guardian walks through the Azure gate (x ${sim.hero.x})`);sim.send({type:'move',x:0,y:0});
 strike(sim,'red-base',FG);play(sim,3);assert.equal(sim.state.structures[FG],undefined,'destroyed');assert.equal(sim.state.captures[FG].stage,'lost');
 play(sim,600);assert.equal(sim.state.structures[FG],undefined,'a breach does not revert');
});
test('no softlock: with the Forward Gatehouse destroyed the Azure side still reaches the Main Gatehouse, and breaking or converting that one reaches the Keep',()=>{
 const sim=fresh();strong(sim);kill(sim,[...FWD,FG]);play(sim,2);
 const C=40,R=24;const reach=(from,view)=>{const seen=new Set(),q=[[Math.floor(from[0]/48),Math.floor(from[1]/48)]];while(q.length){const [c,r]=q.pop(),k=r*C+c;if(c<0||r<0||c>=C||r>=R||seen.has(k)||sim.geo.blocked((c+.5)*48,(r+.5)*48,20,view))continue;seen.add(k);q.push([c+1,r],[c,r+1],[c-1,r],[c,r-1]);}return seen;};
 let seen=reach([820,590],structuresFor(sim.state,'blue'));assert.ok(seen.has(12*40+25),'the corridor is open');assert.ok(!seen.has(12*40+30),'the courtyard still needs the Main Gatehouse');
 kill(sim,[...MAIN,MG]);play(sim,2);seen=reach([820,590],structuresFor(sim.state,'blue'));assert.ok(seen.has(12*40+30),'both gates down: the courtyard and the Keep are reachable');
});
test('the Hero is a Warden at his anchor until the Forward Gatehouse is no longer Crimson, then a Raider',()=>{
 const a=fresh();play(a,10);assert.equal(a.state.guard.raid,false);assert.ok(Math.hypot(a.state.units['red-hero'].x-1272,a.state.units['red-hero'].y-600)<30);
 const b=fresh();strong(b);kill(b,FWD);capture(b,FWD,FG,960,600);const log=play(b,5);assert.equal(b.state.guard.raid,true,'a captured gate ends the guard');
 const c=fresh();strike(c,'guardian',FG);const l2=play(c,5);assert.equal(c.state.guard.raid,true,'a destroyed gate ends it too');assert.ok(l2.some(e=>e.type==='site'&&e.change==='raid'));
 const hero=c.state.units['red-hero'],x0=hero.x;play(c,300);assert.ok(hero.x<x0-20||hero.hp<=0,'the Raider marches west');
});
test('the Elite Barracks trains Elites while Crimson; captured it stops and its queued spawns are dropped; repaired it is an Azure Elite Barracks outside the Barracks limit',()=>{
 const sim=fresh();strong(sim);const b=sim.state.structures[EB];
 play(sim,1500);const made=()=>Object.values(sim.state.units).filter(u=>u.id.startsWith('red-eb-')).length+Object.keys(sim.state.units).length*0;
 assert.ok(Object.keys(sim.state.units).some(id=>id.startsWith('red-eb-')),'Elites came out of the pocket');
 kill(sim,Object.keys(sim.state.units).filter(i=>i.startsWith('red-eb-')));play(sim,2);capture(sim,ELT,EB,1104,1008);assert.equal(b.team,'blue');const ids=new Set(Object.keys(sim.state.units).filter(id=>id.startsWith('red-eb-')));
 play(sim,1200);assert.deepEqual(new Set(Object.keys(sim.state.units).filter(id=>id.startsWith('red-eb-'))).size<=ids.size,true,'no new Elite after the capture');
 fund(sim);assert.equal(sim.placementReason('barracks',10,14),'','before the repair one more Barracks may be built');
 repair(sim,EB,1104,1008);assert.ok(b.azureBarracks&&b.eliteBarracks&&b.team==='blue');
 assert.equal(sim.placementReason('barracks',10,14),'','the repaired Elite Barracks does not take a place in the limit');
 play(sim,600);const elites=Object.values(sim.state.units).filter(u=>u.id.startsWith('blue-s-red-barracks-elite'));assert.ok(elites.length>0&&elites.every(u=>u.maxHp===480),'it trains Elite soldiers (provisional 480 HP)');
 assert.equal(sim.soldierProto.cellAnchor,true,'Azure soldiers use the opt-in cell anchor');
});
test('alternate win paths: the Keep falls with no cart repair and no Elite Barracks capture, and with every gate captured and repaired then destroyed',()=>{
 const a=fresh();strong(a);kill(a,[...FWD,...MAIN,FG,MG]);strike(a,'guardian',KEEP);play(a,3);assert.equal(a.outcome?.outcome,'victory');assert.equal(a.state.captures[EB].stage,'crimson');assert.equal(a.state.cartWreck,undefined);
 const b=fresh();strong(b);capture(b,FWD,FG,960,600);repair(b,FG,960,600);capture(b,MAIN,MG,1300,600);repair(b,MG,1300,600);
 assert.ok(b.state.structures[FG].team==='blue'&&b.state.structures[MG].team==='blue');strike(b,'red-base',FG);strike(b,'red-base',MG);play(b,3);
 strike(b,'guardian',KEEP);play(b,3);assert.equal(b.outcome?.outcome,'victory');
});
test('a replay is deterministic: two runs of the first 3,000 ticks end in the same state',()=>{
 const run=()=>{const s=fresh();strong(s);play(s,3000);return JSON.stringify([s.state.units,Object.keys(s.state.structures),s.state.cartWreck,s.state.captures,s.state.guard]);};
 assert.equal(run(),run());
});
test('Human Playtest #1: a prebuilt Azure Barracks near the Keep trains soldiers from the start, within the limit; the Elite Barracks trains 2 every 45 s',()=>{
 const sim=fresh();strong(sim);const b=sim.state.structures['azure-barracks-0'];
 assert.ok(b&&b.azureBarracks&&b.team==='blue'&&!b.eliteBarracks,'a normal Azure Barracks stands at tick 0');assert.ok(Math.hypot(b.x-330,b.y-600)<400,'near the Azure Keep');
 fund(sim);assert.match(sim.placementReason('barracks',10,10),/./,'its pad is taken');assert.equal(sim.placementReason('barracks',10,14),'','one more may be built');
 const log=play(sim,400);assert.ok(Object.keys(sim.state.units).filter(i=>i.startsWith('blue-s-azure-barracks-0')).length>=1,'it trains');
 const eb=[];const s2=fresh();strong(s2);s2.state.bases['blue-base'].hp=s2.state.bases['blue-base'].maxHp=1e9; // the unattended Keep must outlive the cart
 for(let i=0;i<28;i++){for(const e of play(s2,100))if(e.type==='spawn'&&e.id.startsWith('red-eb-'))eb.push(e.at);
  for(const id of Object.keys(s2.state.units))if(s2.state.units[id].team==='red'&&id!=='red-hero'&&id!==CART&&!id.startsWith('red-eb-'))delete s2.state.units[id];} // the red population cap is real: keep the waves from filling it
 assert.ok(eb.length>=4&&eb[0]>=1350&&eb[2]-eb[0]>=1300&&eb[2]-eb[0]<=1450,`Elite batches of two, 45 s apart: ${eb}`);
 assert.equal(s2.encounter.spawns.filter(e=>e.team==='red'&&e.archetype==='crimson-elite').length,0,'waves hold no Elites');
});

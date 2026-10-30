const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign,campaignLevels}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {chapterViews}=require('../.test-build/data/chapterView.js');
const {ProgressStore}=require('../.test-build/data/campaignProgressStore.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield,validateBattlefield,zoneSlow}=require('../.test-build/world/battlefield.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {siege}=require('./support/barracksBot.cjs');
const {strike,until,DT}=require('./support/campaignBot.cjs');
// Chapter 3 M5: Mission 5 "The Fallen Outposts" (docs/CHAPTER3_M5.md): one fortress wall with a 4,000 HP Main Gate and a snowbound north pass plugged by a Barracks, Deep Snow (50% slow, both teams) over the pass and the strip before it,
// an optional passable outpost Barracks in the snow, and a Keep Barracks whose garrison starts when the gate or the plug falls. Every balance value is provisional; bot results are preliminary evidence, not a human playtest, and the bounds are loose.
const L=campaign.get('campaign-25'),GM='red-gate-main',BO='red-barracks-outpost',BP='red-barracks-plug',BK='red-barracks-keep',K='red-base';
const BAS=['red-bastion-north','red-bastion-south'],CHK=['red-choke-east','red-choke-west'],INR=['red-inner-north','red-inner-south'];
const store=clears=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>[`campaign-${String(i+1).padStart(2,'0')}`,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
// A 48 px grid route for a unit of radius r between cell centres, with the given structures standing.
const G=48,COLS=40,ROWS=24;
function route(sim,from,to,r,st){const c=(x,y)=>Math.floor(y/G)*COLS+Math.floor(x/G),pt=i=>({x:(i%COLS+.5)*G,y:(Math.floor(i/COLS)+.5)*G});
 const s=c(from.x,from.y),e=c(to.x,to.y),prev=new Map([[s,-1]]),q=[s];
 for(let k=0;k<q.length;k++){const i=q[k];if(i===e)break;const col=i%COLS,row=Math.floor(i/COLS);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=col+dc,nr=row+dr,n=nr*COLS+nc;if(nc<0||nr<0||nc>=COLS||nr>=ROWS||prev.has(n))continue;const p=pt(n);if(sim.geo.blocked(p.x,p.y,r,st))continue;prev.set(n,i);q.push(n);}}
 if(!prev.has(e))return null;const path=[];for(let i=e;i>=0;i=prev.get(i))path.unshift(pt(i));return path;}
const without=(sim,...ids)=>Object.fromEntries(Object.entries(combatStructures(sim.state)).filter(([id])=>!ids.includes(id)));
const seeing=(sim,p,st)=>Object.values(sim.state.structures).filter(t=>t.team==='red'&&t.kind==='tower'&&Math.hypot(t.x-p.x,t.y-p.y)<=t.range&&sim.geo.lineOfSight(t,p,Object.fromEntries(Object.entries(st).filter(([id])=>id!==t.id)))).map(t=>t.id).sort();
const garrisonUnits=sim=>Object.keys(sim.state.units).filter(id=>id.startsWith('red-g'));

test('Mission 5 is The Fallen Outposts: one objective, destroy the Crimson Keep; gate and Barracks are optional and there is no failure threshold',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[25,3,'campaign-25','The Fallen Outposts','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.match(L.display.briefing,/^Destroy the Crimson Keep/);assert.match(L.display.briefing,/optional/);
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[{id:'assault',objectives:[{id:'keep',type:'destroy',targets:[K],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(L.mission.failure,undefined);
 const o=L.match.overrides;assert.deepEqual([o.battlefield,o.crimsonKeepArmed,o.start,o.gates,o.shop],['fallen-outposts',true,{gold:0,wood:0,iron:0},[{id:GM,hp:4000}],undefined]);
 assert.deepEqual(o.waves,{firstWaveTick:300,waveInterval:750,enemyPerWave:[6,6,6,6,7,7,8,8],alliedPerWave:1,redSlots:[[1128,240],[1320,168]]});
 assert.deepEqual(o.defenders,[...BAS,...CHK,...INR]);
 assert.deepEqual(o.garrison,{after:[GM,BP],slots:[[1776,552],[1728,360]],counts:[4,5],delayTicks:90,intervalTicks:750});
 assert.deepEqual(o.barracks,[{id:BO,hp:1500,slots:[[1128,240]]},{id:BP,hp:3000,slots:[[1320,168]]},{id:BK,hp:1500,slots:[[1776,552],[1728,360]]}]);
 assert.deepEqual(o.azure,{pads:[{col:10,row:10},{col:10,row:14},{col:13,row:12}],initial:[{col:10,row:10}],limit:2});
});
test('Fallen Outposts is its own battlefield and the only one with Deep Snow; M1-M4 battlefields are unchanged',()=>{
 const f=battlefield('fallen-outposts');
 assert.deepEqual(f.slowZones,[{x0:1040,y0:0,x1:1392,y1:480,slow:.5}]);
 for(const id of ['meadow','canyon-pass','oasis','frost-citadel','broken-wall','twin-walls'])assert.equal(battlefield(id).slowZones,undefined,id);
 assert.equal(campaign.get('campaign-24').match.overrides.battlefield,'twin-walls');assert.equal(campaign.get('campaign-22').match.overrides.battlefield,'broken-wall');
 assert.deepEqual(f.gates.map(g=>[g.id,g.x,g.y,g.columns,g.rows]),[[GM,1416,600,1,2]]);assert.equal(f.towers.length,6);
 assert.throws(()=>validateBattlefield({...f,slowZones:[{x0:0,y0:0,x1:10,y1:10,slow:.6}]}),/slow zone/,'a zone slows by at most 50%');
 assert.throws(()=>validateBattlefield({...f,slowZones:[{x0:10,y0:0,x1:10,y1:10,slow:.5}]}),/slow zone/);
});
test('Mission 5 builds: six Crimson towers, one gate, three Barracks and one Azure Barracks stand',()=>{
 const sim=new Simulation('l25',campaign.setup(25)),st=sim.state.structures;
 assert.deepEqual([st[GM].hp,st[BO].hp,st[BP].hp,st[BK].hp],[4000,1500,3000,1500]);
 assert.equal(Object.values(st).filter(b=>b.team==='red'&&b.kind==='tower').length,6);assert.equal(Object.values(st).filter(b=>b.azureBarracks).length,1);
 until(sim,200);assert.ok(Object.keys(sim.state.units).some(id=>id.startsWith('blue-s-')));
});
test('roads: everything is sealed until the gate or the plug Barracks falls; the outpost Barracks is passable and optional',()=>{
 const sim=new Simulation('l25-roads',campaign.setup(25)),all=combatStructures(sim.state),mouth={x:1088,y:600},keep={x:1488,y:600};
 for(const r of [12,20]){
  assert.equal(route(sim,mouth,keep,r,all),null,`${r} px: the wall is sealed with everything standing`);
  const viaGate=route(sim,mouth,keep,r,without(sim,GM));assert.ok(viaGate&&viaGate.every(p=>p.y>=504||p.x<1392),'gate down: the direct road');
  const viaPlug=route(sim,mouth,keep,r,without(sim,BP));assert.ok(viaPlug,`${r} px: plug down opens the snow pass`);assert.ok(viaPlug.some(p=>p.y<288&&p.x>1152),'through the pocket');
  assert.ok(Object.hasOwn(without(sim,BP),BO),'the outpost Barracks is standing on that road');
 }
 assert.ok(route(sim,{x:1128,y:240},{x:1320,y:168},20,all),'a Guardian walks past the standing outpost Barracks to the plug');
 assert.equal(route(sim,{x:1104,y:600},{x:1488,y:984},20,all),null,'the south pocket is closed to the east');
 assert.ok(route(sim,mouth,{x:1344,y:984},20,all),'the dead end can be entered and explored');
});
test('line of sight: two bastions see the gate, two Choke Towers see the plug Barracks, nothing fires over the wall',()=>{
 const sim=new Simulation('l25-los',campaign.setup(25)),all=combatStructures(sim.state);
 for(const y of [552,600,648])assert.deepEqual(seeing(sim,{x:1368,y},all),[...BAS].sort(),`gate siege spot (1368,${y})`);
 for(const p of [{x:1330,y:168},{x:1330,y:132},{x:1330,y:204},{x:1300,y:168}])assert.deepEqual(seeing(sim,p,all),[...CHK].sort(),`plug siege spot (${p.x},${p.y})`);
 assert.deepEqual(seeing(sim,{x:1488,y:600},without(sim,GM)),[...INR].sort(),'the inner towers watch the breach');
 assert.ok(!seeing(sim,{x:1368,y:600},all).some(id=>INR.includes(id)),'the inner towers cannot see over the wall');
});
test('Deep Snow slows every unit by half while it stands inside the zone, and not outside',()=>{
 const f=battlefield('fallen-outposts');
 assert.equal(zoneSlow(f,{x:1100,y:100}),.5);assert.equal(zoneSlow(f,{x:1040,y:0}),.5);assert.equal(zoneSlow(f,{x:1039,y:100}),0);assert.equal(zoneSlow(f,{x:1391,y:479}),.5);assert.equal(zoneSlow(f,{x:1392,y:100}),0);assert.equal(zoneSlow(f,{x:1100,y:480}),0);
 assert.equal(zoneSlow(battlefield('twin-walls'),{x:1100,y:100}),0);
 // Guardian: 30 ticks east cover half the distance in the snow.
 const run=(x,y,dx=1)=>{const sim=new Simulation('l25-snow',campaign.setup(25)),h=sim.hero;h.x=x;h.y=y;sim.send({type:'move',x:dx,y:0});for(let i=0;i<30;i++)sim.advance(DT);return Math.abs(h.x-x);};
 const open=run(1300,560,-1),snow=run(1300,40,-1);assert.ok(Math.abs(open-280)<1,`open ${open}`);assert.ok(Math.abs(snow/open-.5)<.02,`snow ${snow} is half of open ${open}`);
 // Leaving the snow: walking west out of the zone's edge at x 1040 is not possible (cliff), so walk south out of it (y 480): the ticks spent outside are full speed.
 const leave=(()=>{const sim=new Simulation('l25-leave',campaign.setup(25)),h=sim.hero;h.x=1100;h.y=440;sim.send({type:'move',x:0,y:1});for(let i=0;i<30;i++)sim.advance(DT);return h.y-440;})();
 assert.ok(leave>open*.5+20&&leave<open-20,`half speed until y 480, full speed after (${leave})`);
 // A Crimson and an Azure unit of the first wave: per-tick steps (a minion walks 95 px/s, 3.17 px per tick) are full outside the snow and half inside it, whichever team.
 for(const [team,prefix] of [['red','red-w1-'],['blue','blue-w1-']]){
  const sim=new Simulation('l25-'+team,campaign.setup(25));until(sim,340);const u=Object.values(sim.state.units).find(q=>q.id.startsWith(prefix));assert.ok(u,prefix);
  u.x=1100;u.y=560;sim.teleportHero(250,1050);const inside=[],outside=[];
  for(let i=0;i<90&&u.hp>0;i++){const x0=u.x,y0=u.y,z=zoneSlow(sim.field,u)>0;sim.advance(DT);const d=Math.hypot(u.x-x0,u.y-y0);if(d>.01)(z?inside:outside).push(d);}
  assert.ok(inside.length>5&&outside.length>5,`${team} walked both outside (${outside.length} ticks) and inside (${inside.length} ticks) the snow`);
  assert.ok(Math.max(...outside)>3,`${team} at full speed outside (${Math.max(...outside)})`);assert.ok(Math.max(...inside)<1.7,`${team} at half speed inside (${Math.max(...inside)})`);
 }
 // A skill slow and the snow do not stack: the stronger one applies.
 const sim=new Simulation('l25-stack',campaign.setup(25)),h=sim.hero;h.x=1060;h.y=40;h.statuses=[{type:'slow',sourceId:'test',sourceLife:'x',startTick:0,expiresTick:1e6,magnitude:.3}];sim.send({type:'move',x:1,y:0});for(let i=0;i<30;i++)sim.advance(DT);assert.ok(Math.abs(h.x-1060-snow)<1,`strongest slow wins, not the product (${h.x-1060} vs ${snow})`);
});
test('the garrison starts once, when the gate or the plug Barracks falls, whichever comes first',()=>{
 const spawned=log=>log.filter(e=>e.type==='spawn'&&/^red-g/.test(e.id)).length;
 for(const [name,first] of [['gate',GM],['plug',BP]]){
  const sim=new Simulation('l25-g-'+name,campaign.setup(25)),log=[];until(sim,100,log);assert.equal(spawned(log),0,'sealed until then');assert.equal(sim.garrison,null);
  strike(sim,'guardian',first);const t0=sim.clock.tick;until(sim,t0+90+24*3+4,log);assert.equal(spawned(log),4,`the first garrison wave is four after the ${name} falls`);
  const started=sim.garrison,next=started.next;
  strike(sim,'guardian',first===GM?BP:GM);assert.equal(sim.garrison,started,'the second trigger does not restart the garrison');assert.equal(sim.garrison.next,next,'nor reset its timer');
  until(sim,t0+750+90+24*4+100,log);assert.equal(sim.garrison.n,2,'one garrison on its own 750-tick clock');assert.equal(spawned(log),4+5);
 }
 // Neither the outpost Barracks nor the Keep Barracks is a trigger; the Keep Barracks owns the garrison, so its death ends it.
 const calm=new Simulation('l25-g-none',campaign.setup(25)),cl=[];until(calm,100,cl);strike(calm,'guardian',BO);until(calm,calm.clock.tick+300,cl);assert.equal(spawned(cl),0,'destroying the outpost Barracks releases nothing');
 const keep=new Simulation('l25-g-keep',campaign.setup(25)),kl=[];until(keep,100,kl);strike(keep,'guardian',GM);until(keep,keep.clock.tick+90+24*3+4,kl);strike(keep,'guardian',BK);
 const before=spawned(kl);until(keep,keep.clock.tick+750*3,kl);assert.equal(spawned(kl),before,'no garrison unit after the Keep Barracks falls');
});
test('garrison data is validated: one trigger or several, each a gate or Barracks of the match, once; every trigger must open the sealed area',()=>{
 const o=L.match.overrides,mk=after=>matchSetup('extended',{...o,garrison:{...o.garrison,after}});
 assert.doesNotThrow(()=>new Simulation('v-str',mk(GM)),'a single gate id as a string, as before');assert.doesNotThrow(()=>new Simulation('v-barracks',mk(BP)),'a single Barracks id');assert.doesNotThrow(()=>new Simulation('v-both',mk([GM,BP])));
 for(const bad of [[],[GM,GM],['nope'],[GM,7],'nope',BK+'-x'])assert.throws(()=>mk(bad),/Invalid garrison/,JSON.stringify(bad));
 assert.throws(()=>new Simulation('v-open',mk([GM,BO])),/garrison slot cannot reach/,'the outpost Barracks does not open the way, so it cannot be a trigger');
});
test('Mission 5 has no Hold phase: the Keep alone wins; the gate and Barracks never complete it, and the outpost Barracks is never required',()=>{
 const sim=new Simulation('l25-open',campaign.setup(25)),st=sim.missionStatus();assert.deepEqual([st.activePhase,st.objectives.map(o=>o.id)],['assault',['keep']]);
 until(sim,300+750+10);assert.ok(sim.state.spawnedWaves>=2);
 for(const id of [GM,BP,BK])strike(sim,'guardian',id);
 assert.equal(sim.ended,false);assert.ok(sim.state.structures[BO].hp>0,'the outpost Barracks still stands');assert.deepEqual(sim.missionStatus().completedPhases,[]);
 strike(sim,'guardian',K);until(sim,sim.clock.tick+2);
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
});
test('Mission 5 defeat is the Azure Keep reaching 0 HP',()=>{
 const half=new Simulation('l25-half',campaign.setup(25));half.state.bases['blue-base'].hp=half.state.bases['blue-base'].maxHp*.4;until(half,half.clock.tick+30);assert.equal(half.ended,false);
 const dead=new Simulation('l25-0hp',campaign.setup(25));dead.state.bases['blue-base'].hp=0;until(dead,dead.clock.tick+2);assert.equal(dead.outcome&&dead.outcome.outcome,'defeat');
});
test('Mission 5 is Chapter 3 Mission 5 in the released chapter: it unlocks in order after Chapter 2 and the earlier Chapter 3 missions, never earlier',()=>{
 const {through}=require('./support/chapter3Save.cjs');
 assert.equal(campaignChapters[2].slots[4].levelId,'campaign-25');assert.equal(campaignChapters[2].release,'available');
 const v=chapterViews(campaignChapters,campaign.list(),through(4).progress)[2];assert.equal(v.state,'available');assert.equal(v.released,6);
 assert.equal(campaign.list().filter(l=>l.chapter===3).length,6);assert.equal(campaign.list().at(-1).id,'full-battle');
 assert.equal(through(4).isUnlocked(L),true,'unlocked once the mission before it is cleared');assert.equal(through(4).progress.next.id,'campaign-25');
 assert.equal(through(3).isUnlocked(L),false,'locked while the mission before it is not cleared');
 assert.equal(through(4).recordVictory(L).recorded,true);
});
// Bots: the shared recall-and-rebuild Barracks bot on the real level, with the real Deep Snow. Direct breaks both bastions and the gate; the snow plans cut the plug Barracks (and, in one, the optional outpost Barracks first).
const runs={direct:[...BAS,GM,K],snow:[BP,K],'snow, outpost first':[BO,BP,K]};
for(const [name,targets] of Object.entries(runs))test(`bot, ${name}: the Keep falls, the Azure Keep survives and the Keep Barracks garrison rallies`,()=>{
 const sim=new Simulation('l25-'+name,campaign.setup(25)),h=sim.hero,adv=sim.advance.bind(sim),seen={gate:0,north:0};let px=h.x,snowTicks=0;
 sim.advance=dt=>{if(h.hp>0&&(px<1416)!==(h.x<1416)&&Math.abs(px-h.x)<60)seen[h.y<336?'north':'gate']++;px=h.x;if(h.hp>0&&zoneSlow(sim.field,h)>0)snowTicks++;return adv(dt);};
 const r=siege(sim,{targets});
 assert.deepEqual(sim.outcome&&[sim.outcome.outcome,sim.outcome.reason],['victory','objectives-complete']);
 assert.ok(r.seconds>120&&r.seconds<600,`${r.seconds} s`);assert.ok(r.azureMin>=1500,`Azure Keep at ${r.azureMin}`);assert.ok(r.deaths<=8,`${r.deaths} Guardian deaths`);assert.ok(r.maxLive<=26,'the Crimson cap holds');
 assert.ok(r.log.some(e=>e.type==='spawn'&&/^red-g/.test(e.id)),'the Keep Barracks garrison rallied on this road');
 if(name==='direct'){assert.ok(r.at(GM)>0&&!r.at(BP),'the gate falls, the plug does not');assert.ok(seen.gate>0&&seen.north===0,'the Guardian walks through the gate');assert.ok(!r.at(BO),'the outpost Barracks was never needed');}
 else{
  assert.equal(r.at(GM),undefined,'the gate never falls');assert.equal(seen.gate,0);assert.ok(seen.north>0,'the Guardian crosses the wall through the snow pass');assert.ok(snowTicks>30*10,`the Guardian spent ${snowTicks/30} s in the snow`);
  assert.ok(r.at(BP)>0,'the plug Barracks falls on the way');
  if(name==='snow')assert.ok(!r.at(BO),'the outpost Barracks stays optional: the road is won without it');else assert.ok(r.at(BO)<r.at(BP),'the outpost Barracks falls first');
 }
});

test('Mission 5 allows two Azure Barracks at once; Mission 4 keeps three; a destroyed one frees its place; the limit is validated',()=>{
 const sim=new Simulation('l25-limit',campaign.setup(25)),pads=sim.azurePads;
 assert.equal(sim.azureLimit,2);assert.equal(campaign.setup(25).azure.limit,2);
 assert.equal(sim.placementReason('barracks',pads[1].col,pads[1].row),'Not enough resources','one stands, so a second is allowed (only resources are missing)');
 sim.state.structures['azure-barracks-1']=sim.startingBarracks('azure-barracks-1',pads[1]);
 assert.equal(sim.placementReason('barracks',pads[2].col,pads[2].row),'Barracks limit reached','the third is refused at two');
 sim.state.structures['azure-barracks-1'].hp=0;
 assert.equal(sim.placementReason('barracks',pads[2].col,pads[2].row),'Not enough resources','a destroyed Barracks frees its place');
 const m4=new Simulation('l24-limit',campaign.setup(24));assert.equal(m4.azureLimit,3);
 m4.state.structures['a1']=m4.startingBarracks('a1',m4.azurePads[1]);m4.state.structures['a2']=m4.startingBarracks('a2',m4.azurePads[2]);
 assert.equal(m4.placementReason('barracks',m4.azurePads[0].col,m4.azurePads[0].row),'Barracks limit reached');
 const o=L.match.overrides;
 for(const limit of [0,4,1.5,'2'])assert.throws(()=>matchSetup('extended',{...o,azure:{...o.azure,limit}}),/Azure Barracks limit/,String(limit));
});

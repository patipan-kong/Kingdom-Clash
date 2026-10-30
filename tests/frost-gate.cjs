const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {battlefield,canyonPass,frostCitadel,meadow,oasis,validateBattlefield}=require('../.test-build/world/battlefield.js');
const {battlefieldArt,battlefieldArtRegistry,frostTone}=require('../.test-build/world/battlefieldArt.js');
const {frostGatePixels,frostGateRowOffset,frostGateVisual,isFrostGate}=require('../.test-build/world/frostGateAppearance.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {extendedRules}=require('../.test-build/data/encounters.js');
const {minionStats}=require('../.test-build/data/combat.js');
const {DT,HZ}=require('./support/campaignBot.cjs');
// Chapter 3 C3-1: the Frost Citadel (a walled Crimson fortress), its Frost Gate and its two bastions. The gate is a pre-completed red wall, so these tests pin what that gives: it blocks movement and sight for both teams while it lives,
// the Guardian can destroy it, it rewards nothing, and the walls, the gate and the bastions together make the siege: the gate is the only way in, the bastions cover the gate and nothing else, the Keep cannot be touched from outside,
// and everything outside Level 21 is unchanged. Every balance value is provisional (docs/CHAPTER3_C3-1.md).
const G='red-gate',N='red-bastion-north',S='red-bastion-south',FN='red-forward-north',FS='red-forward-south',IN='red-inner-north',IS='red-inner-south',K='red-base',SLOTS=[[1296,264],[1296,936]];
const citadel=(o={})=>matchSetup('extended',{battlefield:'frost-citadel',waves:{redSlots:SLOTS},defenders:[N,S],gates:[{id:G,hp:1500}],crimsonKeepArmed:false,...o});
const st=sim=>combatStructures(sim.state);
// Every grid cell a unit of this radius can reach from the Azure side (the same flood fill the Simulation uses to check its gates).
const reach=(sim,r)=>{const cols=40,rows=24,structures=st(sim),idx=(x,y)=>Math.floor(y/48)*cols+Math.floor(x/48),seen=new Set([idx(450,600)]),stack=[...seen];
 while(stack.length){const i=stack.pop(),c=i%cols,rw=Math.floor(i/cols);for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=rw+dr,n=nr*cols+nc;if(nc<0||nr<0||nc>=cols||nr>=rows||seen.has(n)||sim.geo.blocked((nc+.5)*48,(nr+.5)*48,r,structures))continue;seen.add(n);stack.push(n);}}
 return [...seen].map(i=>({x:(i%cols+.5)*48,y:(Math.floor(i/cols)+.5)*48}));};
const inCourtyard=p=>p.x>1440&&p.y>384&&p.y<816;

test('the Frost Citadel is Canyon Pass on the Azure side plus four fortress walls, one gate site, eight tower positions and three Barracks sites',()=>{
 assert.equal(battlefield('frost-citadel'),frostCitadel);assert.equal(validateBattlefield(frostCitadel),frostCitadel);assert.equal(frostCitadel.id,'frost-citadel');
 for(let i=0;i<3;i++)assert.equal(frostCitadel.barriers[i],canyonPass.barriers[i],'Canyon\'s cliffs and spire, the same objects');
 assert.deepEqual(frostCitadel.barriers.slice(3).map(b=>[b.x0,b.y0,b.x1,b.y1,b.look]),[[1392,336,1440,552,'wall'],[1392,648,1440,864,'wall'],[1440,336,1920,384,'wall'],[1440,816,1920,864,'wall']]);
 assert.ok(frostCitadel.barriers.slice(3).every(b=>Object.isFrozen(b)));assert.ok(Object.isFrozen(frostCitadel.barriers));
 assert.ok([...canyonPass.barriers,...meadow.barriers,...oasis.barriers].every(b=>b.look===undefined),'only the citadel\'s walls are drawn as walls');
 assert.equal(frostCitadel.territory,meadow.territory);assert.equal(frostCitadel.reserved,meadow.reserved);assert.equal(frostCitadel.respawn,meadow.respawn);assert.equal(frostCitadel.objectives,meadow.objectives);
 // Canyon's opening units, by value, in fresh arrays (Geometry scans them on every collision check).
 assert.deepEqual(frostCitadel.entities,canyonPass.entities);assert.notEqual(frostCitadel.entities,canyonPass.entities);assert.notEqual(frostCitadel.scenery,canyonPass.scenery);
 // Scenery: Canyon's minus exactly the four props that touch the walls or stand in the courtyard.
 const dropped=canyonPass.scenery.filter(p=>!frostCitadel.scenery.includes(p));assert.deepEqual(dropped.map(p=>`${p.kind}@${p.x},${p.y}`).sort(),['bush@1580,410','bush@1700,810','rocks@1440,365','rocks@1490,835']);
 for(const p of frostCitadel.scenery)assert.equal(frostCitadel.barriers.some(b=>p.x>b.x0-p.radius&&p.x<b.x1+p.radius&&p.y>b.y0-p.radius&&p.y<b.y1+p.radius)||(p.x>1392-p.radius&&p.y>336-p.radius&&p.y<864+p.radius),false,`scenery at ${p.x},${p.y} is clear of the fortress`);
 assert.deepEqual(frostCitadel.gates,[{id:G,x:1416,y:600,columns:1,rows:2}]);assert.ok(Object.isFrozen(frostCitadel.gates)&&Object.isFrozen(frostCitadel.gates[0]));
 assert.deepEqual(frostCitadel.towers,[{id:N,x:1368,y:456},{id:S,x:1368,y:744},{id:FN,x:1176,y:312},{id:FS,x:1176,y:888},{id:IN,x:1464,y:456},{id:IS,x:1464,y:744},{id:'red-guard-north',x:1608,y:312},{id:'red-guard-south',x:1608,y:888}],'C3-2 adds two guard sites; Level 21 names its six by id');assert.ok(Object.isFrozen(frostCitadel.towers)&&Object.isFrozen(frostCitadel.towers[0]));
 for(const f of [meadow,canyonPass,oasis]){assert.equal(f.gates,undefined,`${f.id} has no gate site`);assert.equal(f.towers,undefined,`${f.id} has no bastions`);assert.equal(f.barracks,undefined,`${f.id} has no Barracks site`);}
 for(const bad of [{id:'',x:1,y:1,columns:1,rows:1},{id:'a',x:NaN,y:1,columns:1,rows:1},{id:'a',x:1,y:1,columns:0,rows:1},{id:'a',x:1,y:1,columns:1,rows:1.5},{id:'a',x:-1,y:1,columns:1,rows:1}])
  assert.throws(()=>validateBattlefield({...frostCitadel,gates:[bad]}),/Invalid battlefield frost-citadel: gate/);
 assert.throws(()=>validateBattlefield({...frostCitadel,gates:[frostCitadel.gates[0],frostCitadel.gates[0]]}),/gate/);
});
test('a bastion position may touch a wall but never overlap a barrier: a tower inside one could not see out',()=>{
 for(const bad of [{id:'a',x:1416,y:456},{id:'b',x:1380,y:456},{id:'c',x:1400,y:744},{id:'d',x:960,y:600},{id:'e',x:NaN,y:5},{id:'',x:5,y:5},{id:'f',x:5,y:-1}])
  assert.throws(()=>validateBattlefield({...frostCitadel,towers:[bad]}),/Invalid battlefield frost-citadel: tower/,JSON.stringify(bad));
 assert.throws(()=>validateBattlefield({...frostCitadel,towers:[frostCitadel.towers[0],{...frostCitadel.towers[0]}]}),/tower/,'a repeated id');
 assert.doesNotThrow(()=>validateBattlefield({...frostCitadel,towers:[{id:'flush',x:1368,y:456}]}),'flush against the wall face is legal');
 // Every bastion is clear of every barrier and of the Azure build territory; the wall pair stands flush against the west wall's outer face, the inner pair flush against its inner face.
 for(const t of frostCitadel.towers){assert.equal(frostCitadel.barriers.some(b=>t.x+24>b.x0&&t.x-24<b.x1&&t.y+24>b.y0&&t.y-24<b.y1),false);assert.ok(Math.hypot(t.x-frostCitadel.territory.x,t.y-frostCitadel.territory.y)>frostCitadel.territory.radius+24,`${t.id} is outside the Azure build territory`);}
 assert.deepEqual([N,S].map(id=>frostCitadel.towers.find(t=>t.id===id).x+24),[1392,1392]);assert.deepEqual([IN,IS].map(id=>frostCitadel.towers.find(t=>t.id===id).x-24),[1440,1440]);
});
test('the Frost Citadel has art: the canyon painter through frostTone over snow; Canyon\'s own art is unchanged',()=>{
 const art=battlefieldArt('frost-citadel');assert.equal(art.terrain,'frozen');assert.equal(art.tone,frostTone);assert.equal(typeof art.ground,'number');assert.deepEqual(art.road,{top:500,bottom:700});
 assert.deepEqual(Object.keys(art.props).sort(),['bush','rocks','trees']);for(const p of Object.values(art.props))assert.equal(p.source,undefined,'tinted only, nothing baked');
 for(const kind of new Set(frostCitadel.scenery.map(p=>p.kind)))assert.ok(art.props[kind],`art for ${kind}`);
 assert.equal(battlefieldArtRegistry['canyon-pass'].terrain,'canyon');assert.equal(battlefieldArtRegistry['canyon-pass'].tone,undefined);assert.equal(battlefieldArtRegistry['canyon-pass'].ground,undefined);
 let last=-1;for(let v=0;v<=255;v+=15){const c=frostTone(v<<16|v<<8|v),r=c>>16&255,g=c>>8&255,b=c&255;assert.ok(r<=255&&g<=255&&b<=255&&b>=r,`grey ${v} maps to a cool tone`);assert.ok(g>=last,'lighter in, lighter out');last=g;}
 assert.ok(frostTone(0xffffff)>>16>200,'white stays ice-light');
});
test('the Frost Gate appearance recolours wood to ice, keeps alpha, and a red wall is the only gate',()=>{
 const px=new Uint8ClampedArray([120,80,40,255, 120,80,40,0]);frostGatePixels(px);
 assert.ok(px[2]>px[0]+30&&px[3]===255,'opaque wood becomes blue');assert.deepEqual([...px.slice(4)],[120,80,40,0],'transparent pixels are untouched');
 assert.equal(frostGateRowOffset,111);assert.equal(frostGateVisual.name,'Frost Gate');
 assert.equal(isFrostGate({id:'red-gate',kind:'wall',team:'red'}),true);assert.equal(isFrostGate({id:'x',kind:'wall',team:'blue'}),false);assert.equal(isFrostGate({id:'x',kind:'tower',team:'red'}),false);assert.equal(isFrostGate({id:'red-barracks-north',kind:'wall',team:'red'}),false,'a Barracks is not a Frost Gate');
});
test('level data is validated: bastions by name, spawn slots by value, a gate that is a site of the map, once, clear of every spawn slot; absent they leave a setup untouched',()=>{
 const s=citadel({gates:[{id:G,hp:1234}]});assert.deepEqual(s.gates,[{id:G,x:1416,y:600,columns:1,rows:2,hp:1234}]);
 assert.deepEqual(s.encounter.defenders,[{id:N,kind:'tower',x:1368,y:456},{id:S,kind:'tower',x:1368,y:744}]);
 assert.deepEqual(matchSetup('extended',{battlefield:'frost-citadel',defenders:['red-tower-front-center',N]}).encounter.defenders.map(d=>d.id),['red-tower-front-center',N],'a level may mix both kinds, in extendedRules order first');
 for(const bad of [[N,N],['red-bastion-west'],[N,'nope']])assert.throws(()=>matchSetup('extended',{battlefield:'frost-citadel',defenders:bad}),/Unknown or repeated Crimson defender/);
 for(const f of ['meadow','canyon-pass','oasis'])assert.throws(()=>matchSetup('extended',{battlefield:f,defenders:[N]}),/Unknown or repeated Crimson defender/,`${f} has no bastions`);
 // Spawn slots: copied, validated, and the shared defaults never change.
 const input=[[1296,264],[1296,936]],made=matchSetup('extended',{battlefield:'frost-citadel',waves:{redSlots:input}});assert.deepEqual(made.waveRules.redSlots,input);assert.notEqual(made.waveRules.redSlots,input);assert.notEqual(made.waveRules.redSlots[0],input[0]);
 assert.deepEqual(extendedRules.redSlots,[[1380,556],[1380,600],[1380,644]],'the default Crimson spawn slots are untouched');
 assert.deepEqual(extendedRules.towers.map(t=>t.id),['red-tower-front-north','red-tower-front-center','red-tower-front-south','red-tower-rear-north','red-tower-rear-south','red-tower-keep-north','red-tower-keep-south','red-tower-keep-rear'],'so are the default towers');
 for(const bad of [[],[[1]],[[1,2,3]],[[NaN,1]],[[-1,5]],[[2000,5]],[[5,1200]],[['a','b']]])assert.throws(()=>matchSetup('extended',{battlefield:'frost-citadel',waves:{redSlots:bad}}),/Invalid wave rules/,JSON.stringify(bad));
 assert.ok(SLOTS.every(([x,y])=>Math.hypot(x-1416,y-600)>=4*48),'the level\'s slots stand at least four cells from the gate');
 assert.throws(()=>matchSetup('extended',{battlefield:'frost-citadel',gates:[{id:G,hp:1500}]}),/too close to a Crimson spawn slot/,'the default slots (1380,600) would sit beside the gate, so a Frost Citadel level must name its own');
 for(const bad of [{id:'nope',hp:10},{id:G,hp:0},{id:G,hp:12.5},{id:G,hp:-3},{hp:5}])assert.throws(()=>citadel({gates:[bad]}),/Invalid gate/);
 assert.throws(()=>citadel({gates:[{id:G,hp:5},{id:G,hp:5}]}),/Invalid gate/);
 assert.throws(()=>matchSetup('extended',{battlefield:'canyon-pass',gates:[{id:G,hp:5}]}),/Invalid gate/,'Canyon has no gate site');
 assert.equal(Object.hasOwn(matchSetup('extended',{battlefield:'frost-citadel'}),'gates'),false,'a setup without gates has no gates key');
 for(const l of campaign.list())if(!['campaign-21','campaign-23','campaign-24','campaign-25'].includes(l.id))assert.equal(Object.hasOwn(campaign.setup(l.id),'gates'),false,`${l.id} has no gates`);
 for(const id of ['prototype','extended'])assert.equal(Object.hasOwn(matchSetup(id),'gates'),false);
});
test('a setup whose spawn slots stand inside the fortress or on scenery is rejected when the match is built',()=>{
 assert.doesNotThrow(()=>new Simulation('open',citadel()));
 assert.throws(()=>new Simulation('inside',citadel({waves:{redSlots:[[1700,420],[1296,936]]}})),/seal a Crimson spawn slot/,'a slot in the courtyard is cut off from the Azure Keep');
 assert.throws(()=>new Simulation('tree',citadel({waves:{redSlots:[[1380,290],[1296,936]]}})),/spawn slot is blocked/,'a slot on a tree edge is open to the grid but not to a minion');
});
test('a gate is a pre-completed red wall; it blocks movement and sight while it lives and neither once destroyed',()=>{
 const sim=new Simulation('g',citadel({gates:[{id:G,hp:300}]})),gate=sim.state.structures[G];
 assert.deepEqual([gate.kind,gate.team,gate.hp,gate.maxHp,gate.columns,gate.rows,gate.armor,gate.damage,gate.range,gate.progress,gate.completeTick],['wall','red',300,300,1,2,0,0,0,1,0]);
 assert.equal(isFrostGate(gate),true);assert.deepEqual(Object.values(sim.state.structures).filter(b=>b.team==='red'&&b.kind==='wall').map(b=>b.id),[G],'the gate is the only Crimson wall');
 for(const r of [0,12,20])assert.equal(sim.geo.blocked(1416,600,r,st(sim)),true,`blocked at radius ${r}`);
 assert.equal(sim.geo.lineOfSight({x:1372,y:600},{x:1460,y:600},st(sim)),false,'the gate blocks sight');
 sim.hero.hp=1e9;sim.hit(sim.hero,gate,1e9,'direct');assert.equal(sim.state.structures[G],undefined,'destroyed like any structure');
 assert.equal(sim.geo.blocked(1416,600,12,st(sim)),false);assert.equal(sim.geo.lineOfSight({x:1372,y:600},{x:1460,y:600},st(sim)),true);
});
test('the gate is the only way in: the walls and the gate stop movement and sight, the opening is one grid row for a minion, and the fortress is open to both sizes once the gate falls',()=>{
 const sim=new Simulation('seal',citadel());
 // Walls: movement and sight, on every side; the world edge closes the east.
 for(const [x,y] of [[1416,400],[1416,800],[1600,360],[1600,840],[1916,360],[1916,840]])assert.equal(sim.geo.blocked(x,y,0,st(sim)),true,`wall at ${x},${y}`);
 for(const [a,b] of [[{x:1500,y:300},{x:1500,y:420}],[{x:1500,y:900},{x:1500,y:780}],[{x:1360,y:450},{x:1470,y:450}],[{x:1360,y:750},{x:1470,y:750}]])assert.equal(sim.geo.lineOfSight(a,b,st(sim)),false,`no sight across ${JSON.stringify(a)}`);
 assert.equal(sim.geo.blocked(1915,600,12,st(sim)),true,'the eastern world boundary completes the enclosure');
 for(const r of [12,20]){assert.equal(reach(sim,r).some(inCourtyard),false,`no radius-${r} unit reaches the courtyard while the gate stands`);assert.ok(reach(sim,r).some(p=>p.x>1300&&p.x<1392&&p.y>=552&&p.y<=648),'but the approach to the gate is reachable');}
 // The opening once the gate is gone: a minion needs one grid row (y 600), the Guardian's 40 px fits the 96 px gap.
 delete sim.state.structures[G];
 const open=r=>{const ys=[];for(let y=540;y<=660;y++)if(!sim.geo.blocked(1416,y,r,st(sim)))ys.push(y);return ys.length?[ys[0],ys.at(-1)]:[];};
 assert.deepEqual(open(12),[564,636]);assert.deepEqual(open(20),[572,628]);
 for(const r of [12,20])assert.equal(reach(sim,r).some(inCourtyard),true,`a radius-${r} unit reaches the courtyard once the gate is gone`);
});
test('both bastions fire on the Guardian anywhere it can siege the gate, and the wall hides the courtyard from them',()=>{
 const sim=new Simulation('bastions',citadel()),s=st(sim),probe={...sim.hero},gate=sim.state.structures[G];
 for(const [x,y] of [[1372,600],[1341,600],[1326,600],[1340,570],[1340,630],[1372,560],[1372,640]]){probe.x=x;probe.y=y;
  assert.equal(canAttackOn(sim.geo,probe,gate,s),true,`the Guardian reaches the gate from ${x},${y}`);
  for(const id of [N,S])assert.equal(canAttackOn(sim.geo,sim.state.structures[id],probe,s),true,`${id} sees the Guardian at ${x},${y}`);}
 // Inside, with the gate gone, the walls hide the Guardian from both bastions, opening cell included.
 delete sim.state.structures[G];
 for(const [x,y] of [[1416,600],[1470,600],[1500,500],[1500,700],[1700,420],[1700,780]]){probe.x=x;probe.y=y;
  for(const id of [N,S])assert.equal(canAttackOn(sim.geo,sim.state.structures[id],probe,st(sim)),false,`${id} cannot see ${x},${y}`);}
});
test('the Guardian can destroy each bastion on its own: the other one cannot reach it and neither touches the gate',()=>{
 for(const [id,other,at] of [[N,S,[1293,456]],[S,N,[1293,744]]]){
  const sim=new Simulation('solo-'+id,citadel({waves:{redSlots:SLOTS,firstWaveTick:9000}}));assert.equal(sim.teleportHero(...at),true);sim.send({type:'target',id});sim.send({type:'attack'});
  const log=[];while(!sim.ended&&sim.state.structures[id]&&sim.clock.tick<900){sim.advance(DT);log.push(...sim.drainEvents());}
  assert.equal(sim.state.structures[id],undefined,`${id} falls`);assert.ok(sim.clock.tick/HZ<20,`in ${(sim.clock.tick/HZ).toFixed(1)} s`);
  assert.equal(log.some(e=>e.type==='damage'&&e.id===other&&e.sourceId==='guardian'),false,`the Guardian never touches ${other}`);assert.equal(sim.state.structures[G].hp,1500,'or the gate');
  const hurt=log.filter(e=>e.type==='damage'&&e.id==='guardian');assert.ok(hurt.length>0&&hurt.every(e=>e.sourceId===id),'only the bastion being sieged shoots the Guardian');
  assert.equal(log.some(e=>e.type==='xp'&&String(e.sourceId).includes(':'+G+':')),false);
 }
});
test('the Guardian breaks the gate in about 24 s at level 1; it rewards no XP, Gold, kill or level',()=>{
 const sim=new Simulation('siege',citadel({waves:{redSlots:SLOTS,firstWaveTick:9000}}));sim.hero.hp=1e9;assert.equal(sim.teleportHero(1341,600),true,'the western siege spot is open');
 sim.send({type:'target',id:G});sim.send({type:'attack'});const log=[];let first=null;
 while(!sim.ended&&sim.state.structures[G]&&sim.clock.tick<3000){sim.advance(DT);for(const e of sim.drainEvents()){log.push(e);if(e.type==='damage'&&e.id===G&&first===null)first=sim.clock.tick;}}
 assert.equal(sim.state.structures[G],undefined);const seconds=(sim.clock.tick-first)/HZ;
 assert.ok(seconds>=22&&seconds<=26,`level-1 siege of 1,500 HP took ${seconds.toFixed(1)} s (measured 23.8)`);
 // 48 damage per hit (80 x 0.6 structure factor, no armour) every 23 ticks.
 const hits=log.filter(e=>e.type==='damage'&&e.id===G);assert.ok(hits.every(e=>e.sourceId==='guardian'&&e.amount<=48+1e-9));assert.equal(hits.length,Math.ceil(1500/48));
 assert.equal(log.some(e=>e.type==='xp'||e.type==='level-up'||e.type==='reward'),false,'no XP, level or Gold event');
 assert.deepEqual([sim.state.gold,sim.state.kills,sim.state.heroProgression.xp,sim.state.heroProgression.level],[250,0,0,1]);
 assert.ok(log.some(e=>e.type==='death'&&e.id===G));
 // Bash and Charge cannot target it.
 const fresh=new Simulation('legal',citadel());fresh.teleportHero(1341,600);assert.equal(fresh.skills.legalTarget(fresh.state.structures[G]),false);
});
test('the Keep cannot be attacked from outside, even at tower range; the Guardian reaches it only after the gate falls',()=>{
 const sim=new Simulation('keep',citadel()),keep=sim.state.bases[K];assert.notEqual(keep.invulnerable,true,'the Keep is damageable');assert.equal(keep.damage,0,'and inert');
 // Probes sit 1 px off the grid-centre lines: two touching blockers (the wall's end and the gate's footprint at y 552 and 648, like any two barriers sharing an edge) leave a zero-width seam that only a ray exactly on the shared line slips through,
 // which no unit position or real attack range produces.
 const outside=reach(sim,20);assert.ok(outside.length>300);
 for(const range of [90,240,400]){const probe={...sim.hero,range};for(const p of outside){probe.x=p.x+1;probe.y=p.y+1;assert.equal(canAttackOn(sim.geo,probe,keep,st(sim)),false,`no attacker of range ${range} at ${p.x},${p.y} hits the Keep`);}}
 // A Guardian ordered to attack the Keep from the gate approach hits the gate instead (the nearest legal target) and the Keep stays whole.
 sim.hero.hp=1e9;sim.teleportHero(1372,600);sim.send({type:'target',id:K});sim.send({type:'attack'});const log=[];for(let i=0;i<150;i++){sim.advance(DT);log.push(...sim.drainEvents());}
 assert.equal(keep.hp,3000);assert.equal(log.some(e=>e.type==='damage'&&e.id===K),false);assert.ok(sim.state.structures[G].hp<1500,'the strikes landed on the gate');
 // Control: with the gate gone the first courtyard cell is a legal attack position.
 delete sim.state.structures[G];const probe={...sim.hero,x:1464,y:600};assert.equal(canAttackOn(sim.geo,probe,keep,st(sim)),true);
});
test('allied minions attack the gate through the existing breach route, and the Guardian and allies enter once it falls',()=>{
 // Bastions removed so nothing shoots the allies; the Guardian is parked far away. The opening Vanguards see the Keep, find no way in, and plan a breach.
 const sim=new Simulation('ally',citadel());sim.teleportHero(250,1050);for(const id of [N,S])delete sim.state.structures[id];
 const log=[];let breach=null;
 while(sim.clock.tick<40*HZ&&sim.state.structures[G]){sim.advance(DT);log.push(...sim.drainEvents());for(const u of Object.values(sim.state.units))if(u.team==='blue'&&u.id!=='guardian'&&sim.navigation.routeFor(u.id)?.breachId===G)breach=u.id;}
 const hits=log.filter(e=>e.type==='damage'&&e.id===G&&/^blue-/.test(e.sourceId));
 assert.ok(breach,'an allied minion planned a breach of the gate');assert.ok(hits.length>=3,`${hits.length} allied strikes on the gate`);assert.ok(sim.state.structures[G].hp<1500);
 // The gate falls: the Guardian walks in through the opening and strikes the Keep, and allied minions follow it.
 const s2=new Simulation('enter',citadel());for(const id of [N,S])delete s2.state.structures[id];s2.hit(s2.hero,s2.state.structures[G],1e9,'direct');assert.equal(s2.state.structures[G],undefined);
 s2.teleportHero(1341,600);s2.hero.hp=1e9;const log2=[];let ally=false;
 for(let i=0;i<60*HZ;i++){s2.send({type:'move',x:i<75?1:0,y:0});s2.send({type:'target',id:K});s2.send({type:'attack'});s2.advance(DT);log2.push(...s2.drainEvents());if(Object.values(s2.state.units).some(u=>u.team==='blue'&&u.id!=='guardian'&&u.hp>0&&u.x>1450&&u.y>400&&u.y<800))ally=true;}
 assert.ok(s2.hero.x>1450&&s2.hero.y>400&&s2.hero.y<800,`the Guardian is in the courtyard (x ${Math.round(s2.hero.x)})`);
 assert.ok(log2.some(e=>e.type==='damage'&&e.id===K&&e.sourceId==='guardian'),'the Guardian strikes the Keep');assert.ok(ally,'allied minions entered the courtyard');
 assert.ok(log2.some(e=>e.type==='damage'&&e.id===K&&/^blue-/.test(e.sourceId)),'allied minions strike the Keep too');
});
test('Crimson waves spawn on the level\'s slots, outside the fortress, and march on without a stall or a unit in the courtyard, gate standing or fallen',()=>{
 const setup=campaign.setup(21),slots=setup.waveRules.redSlots;assert.equal(slots.length,4);assert.ok(setup.encounter.spawns.filter(e=>e.team==='red').every(e=>slots.some(([x,y])=>e.x===x&&e.y===y)),'every Crimson unit spawns on a level slot');
 for(const open of [false,true]){
  const sim=new Simulation('waves',setup);sim.teleportHero(250,1050);const k=sim.state.bases['blue-base'];k.hp=k.maxHp=1e9;if(open)delete sim.state.structures[G];
  let deferral=0,courtyard=0,maxLive=0;
  while(sim.clock.tick<165*HZ){sim.advance(DT);sim.drainEvents();const live=Object.values(sim.state.units).filter(u=>u.team==='red'&&u.hp>0);maxLive=Math.max(maxLive,live.length);
   const due=sim.spawnQueue.find(q=>q.team==='red'&&q.tick<=sim.clock.tick);if(due&&live.length<24&&Object.values(sim.state.units).some(u=>u.hp>0&&Math.hypot(u.x-due.x,u.y-due.y)<26))deferral++;
   courtyard+=live.filter(u=>inCourtyard(u)).length;}
  assert.equal(deferral,0,`no spawn stall (gate ${open?'open':'standing'})`);assert.equal(courtyard,0,'no Crimson unit ever enters the courtyard');assert.ok(maxLive>=15,`${maxLive} Crimson units were live`);assert.ok(sim.state.spawnedWaves>=5);
  assert.ok(Object.values(sim.state.units).some(u=>u.team==='red'&&u.hp>0&&u.x<700),'the columns reached the Azure side');
 }
});
test('Level 21 leaves every other battlefield and level exactly as it was: only Levels 21 and 22 use the Frost Citadel, and Chapter 1-2 setups carry no gate or bastion',()=>{
 for(const l of campaign.list())assert.equal(l.match.overrides?.battlefield==='frost-citadel',l.id==='campaign-21'||l.id==='campaign-23',l.id);
 for(const l of campaign.list().filter(l=>!['campaign-21','campaign-22','campaign-23','campaign-24','campaign-25'].includes(l.id))){const setup=campaign.setup(l.id),sim=new Simulation('chk',setup);assert.equal(Object.values(sim.state.structures).some(b=>b.team==='red'&&b.kind==='wall'),false,`${l.id} has no Crimson wall`);
  assert.equal(setup.encounter.defenders.some(d=>d.id.startsWith('red-bastion')),false,`${l.id} has no bastion`);assert.deepEqual(setup.waveRules?.redSlots??extendedRules.redSlots,extendedRules.redSlots,`${l.id} keeps the default spawn slots`);
  assert.equal(setup.garrison,undefined,`${l.id} has no garrison`);assert.equal(setup.encounter.defenders.some(d=>/^red-(forward|inner)/.test(d.id)),false,`${l.id} has no forward or inner bastion`);
  assert.equal(Object.values(sim.state.structures).some(b=>b.team==='red'&&/^red-g/.test(b.id)),false);}
});
// ---- Balance v3: six bastions, a 3,000 HP gate and gate-triggered garrison waves (docs/CHAPTER3_C3-1.md).
const L21=campaign.get('campaign-21'),SIX=[FN,FS,N,S,IN,IS];
const v3=(over={})=>{const o=structuredClone(L21.match.overrides);o.waves.firstWaveTick=9000;return matchSetup('extended',{...o,...over,mission:structuredClone(L21.mission)});};
const topUp=sim=>{sim.hero.hp=sim.hero.maxHp;};
const GARRISON={after:G,slots:[[1800,552],[1800,648]],counts:[3,4],delayTicks:90,intervalTicks:900};
test('Level 21 stands six ordinary bastions and a 3,000 HP gate on the battlefield\'s own sites',()=>{
 const sim=new Simulation('v3',campaign.setup(21)),t=sim.state.structures;
 assert.deepEqual(Object.keys(t).sort(),[G,...SIX].sort(),'the gate and six bastions are the only Crimson structures');
 for(const id of SIX)assert.deepEqual([t[id].kind,t[id].team,t[id].hp,t[id].maxHp,t[id].range,t[id].damage],[t[N].kind,'red',650,650,t[N].range,t[N].damage],`${id} is an ordinary Crimson tower`);
 assert.deepEqual([t[G].hp,t[G].maxHp,t[G].kind],[3000,3000,'wall']);
 for(const id of SIX){const others={...combatStructures(sim.state)};delete others[id];assert.equal(sim.geo.blocked(t[id].x,t[id].y,23.9,others),false,`${id} stands on open ground`);}
});
test('v3 coverage: the wall pair covers the gate, the forward pair the canyon exits, the inner pair the doorway and the Keep, and the inner pair never fires outside the walls',()=>{
 const sim=new Simulation('cover',v3()),t=sim.state.structures,probe={...sim.hero};
 const who=(x,y,gone=[])=>{const saved={};for(const id of gone){saved[id]=t[id];delete t[id];}const s=st(sim);probe.x=x;probe.y=y;
  const r=[...SIX.filter(id=>t[id]&&canAttackOn(sim.geo,t[id],probe,s)),...(canAttackOn(sim.geo,sim.state.bases[K],probe,s)?[K]:[])].sort();for(const id of gone)t[id]=saved[id];return r;};
 assert.deepEqual(who(1341,600),[N,S].sort(),'the gate siege spot is under both wall bastions only');
 assert.deepEqual(who(1150,600),[],'the canyon centre line is a safe way out');assert.deepEqual(who(1150,520),[FN,N].sort());assert.deepEqual(who(1150,680),[FS,S].sort());
 assert.deepEqual(who(1341,600,[N,S]),[],'with the wall pair gone the gate is safe to chop');
 assert.deepEqual(who(1464,600,[G]),[IN,IS,K].sort(),'the doorway is covered by both inner bastions and the Keep');assert.deepEqual(who(1722,600,[G]),[K],'the east face of the Keep has no inner bastion');
 assert.deepEqual(who(1610,484,[G]),[IN,K].sort());assert.deepEqual(who(1610,716,[G]),[IS,K].sort());
 // With the gate gone, an inner bastion never sees a position outside the walls.
 delete t[G];const s=st(sim);let leaks=0;for(let x=1100;x<1392;x+=8)for(let y=180;y<=1050;y+=8){if(sim.geo.blocked(x,y,20,s))continue;probe.x=x;probe.y=y;for(const id of [IN,IS])if(canAttackOn(sim.geo,t[id],probe,s))leaks++;}
 assert.equal(leaks,0,'no shot from the inner bastions reaches outside the fortress');
 // The bastions leave every Keep face reachable for both unit sizes.
 for(const r of [12,20]){const seen=new Set(reach(sim,r).map(p=>p.x+','+p.y)),near=(x,y)=>seen.has((Math.floor(x/48)+.5)*48+','+(Math.floor(y/48)+.5)*48);
  for(const [x,y] of [[1464,600],[1512,600],[1608,504],[1608,696],[1704,600],[1848,420],[1848,780]])assert.equal(near(x,y),true,`radius ${r} reaches ${x},${y}`);}
});
test('each of the six bastions can be destroyed on its own, from a spot where no other bastion and not the Keep can shoot the Guardian',()=>{
 const spots={[FN]:[1140,236],[FS]:[1140,812],[N]:[1316,508],[S]:[1284,716],[IN]:[1460,404],[IS]:[1460,788]};
 for(const id of SIX){const sim=new Simulation('solo-'+id,v3());if(id===IN||id===IS)delete sim.state.structures[G];
  assert.equal(sim.teleportHero(...spots[id]),true,`the spot for ${id} is open`);sim.send({type:'target',id});sim.send({type:'attack'});
  const log=[];while(!sim.ended&&sim.state.structures[id]&&sim.clock.tick<30*HZ){topUp(sim);sim.advance(DT);log.push(...sim.drainEvents());}
  assert.equal(sim.state.structures[id],undefined,`${id} falls`);
  // Up to the kill: on the tick a bastion dies its body no longer blocks the Keep's line of sight into its pocket.
  const cut=log.findIndex(e=>e.type==='death'&&e.id===id),hurt=log.slice(0,cut).filter(e=>e.type==='damage'&&e.id==='guardian');assert.ok(hurt.length>0&&hurt.every(e=>e.sourceId===id),`only ${id} shoots the Guardian`);
  assert.equal(SIX.filter(o=>o!==id&&sim.state.structures[o]&&log.some(e=>e.type==='damage'&&e.id===o&&e.sourceId==='guardian')).length,0,'no other bastion is touched');}
});
test('the Frost Gate holds 3,000 hit points: 63 Guardian strikes, about 48 s at level 1, no reward',()=>{
 const sim=new Simulation('gate3000',v3());for(const id of SIX)delete sim.state.structures[id];for(const u of Object.values(sim.state.units))if(u.team==='blue'&&u.id!=='guardian')delete sim.state.units[u.id];
 assert.equal(sim.teleportHero(1341,600),true);sim.send({type:'target',id:G});sim.send({type:'attack'});const log=[];
 while(!sim.ended&&sim.state.structures[G]&&sim.clock.tick<80*HZ){topUp(sim);sim.advance(DT);log.push(...sim.drainEvents());}
 const hits=log.filter(e=>e.type==='damage'&&e.id===G&&e.sourceId==='guardian');assert.equal(hits.length,Math.ceil(3000/48));assert.equal(log.filter(e=>e.type==='damage'&&e.id===G).length,hits.length,'nothing else hit it');assert.equal(sim.state.structures[G],undefined);
 assert.ok(sim.clock.tick/HZ>47&&sim.clock.tick/HZ<50,`${(sim.clock.tick/HZ).toFixed(1)} s`);assert.equal(log.some(e=>e.type==='xp'||e.type==='reward'||e.type==='level-up'),false,'no XP or Gold for the gate');
});
test('garrison waves start when the Frost Gate dies: 90 ticks later, then every 900, alternating 3 and 4 ordinary minions on the courtyard slots, until the Keep falls',()=>{
 const sim=new Simulation('garrison',v3()),log=[];sim.hero.hp=sim.hero.maxHp=1e9;sim.teleportHero(250,1050);for(const id of SIX)delete sim.state.structures[id];sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e9;
 const run=n=>{for(let i=0;i<n;i++){sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}};
 run(600);assert.equal(log.some(e=>e.type==='spawn'&&/^red-g/.test(e.id)),false,'no garrison while the gate stands');
 const t0=sim.clock.tick;sim.hit(sim.hero,sim.state.structures[G],1e9,'direct');assert.equal(sim.state.structures[G],undefined);
 run(3*900+200);
 const gar=log.filter(e=>e.type==='spawn'&&/^red-g/.test(e.id)),byWave=n=>gar.filter(e=>e.id.startsWith('red-g'+n+'-'));
 assert.deepEqual([1,2,3,4].map(n=>byWave(n).length),[3,4,3,4],'alternating 3 and 4');
 const first=Math.min(...byWave(1).map(e=>e.at));assert.ok(first>=t0+90&&first<=t0+93,`first garrison at +${first-t0} ticks`);
 const second=Math.min(...byWave(2).map(e=>e.at));assert.ok(Math.abs(second-first-900)<=3,`interval ${second-first}`);
 for(const e of byWave(1)){assert.ok(sim.state.units[e.id]||log.some(d=>d.type==='death'&&d.id===e.id),'a real unit');}
 const setup=sim.setup.garrison;assert.deepEqual(setup,GARRISON);
 // Spawn positions: alternate the two slots.
 const at=new Simulation('garrison-slots',v3());at.teleportHero(250,1050);for(const id of SIX)delete at.state.structures[id];at.hit(at.hero,at.state.structures[G],1e9,'direct');at.state.bases['blue-base'].hp=at.state.bases['blue-base'].maxHp=1e9;
 const seen=[];for(let i=0;i<200&&seen.length<3;i++){at.advance(DT);for(const e of at.drainEvents())if(e.type==='spawn'&&/^red-g/.test(e.id)){const u=at.state.units[e.id];seen.push([e.id,u.x,u.y,u.kind,u.maxHp]);}}
 assert.deepEqual(seen.map(x=>x.slice(0,4)),[['red-g1-0',1800,552,'minion-red'],['red-g1-1',1800,648,'minion-red'],['red-g1-2',1800,552,'minion-red']],'slots alternate');
 assert.ok(seen.every(x=>x[4]===minionStats.maxHp),'ordinary Crimson minions, existing stats');
 // They stop when the Keep falls.
 const before=gar.length;sim.state.bases[K].hp=0;run(2000);assert.equal(log.filter(e=>e.type==='spawn'&&/^red-g/.test(e.id)).length,before,'no garrison after the Keep falls');
});
test('garrison units are wave 0: they never count toward, or block, the defeat-4-waves objective, whenever the gate falls',()=>{
 // Outside waves delayed: the garrison spawns, fights and dies, and the waves objective still reads zero.
 const sim=new Simulation('wave0',v3());sim.teleportHero(250,1050);for(const id of SIX)delete sim.state.structures[id];sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e9;
 sim.hit(sim.hero,sim.state.structures[G],1e9,'direct');const waves=()=>sim.missionStatus().objectives.find(o=>o.id==='waves');
 let spawned=0;for(let i=0;i<400;i++){sim.advance(DT);for(const e of sim.drainEvents())if(e.type==='spawn'&&/^red-g/.test(e.id))spawned++;}
 assert.ok(spawned>=3);assert.equal(waves().progress,0,'garrison spawns announce no wave');

 assert.ok((sim.mission.members.get(0)?.size??0)>=3,'the garrison is tracked as wave 0');
 for(const u of Object.values(sim.state.units))if(/^red-g/.test(u.id))sim.hit(sim.hero,u,1e9,'direct');for(let i=0;i<60;i++){sim.advance(DT);sim.drainEvents();}
 assert.equal(sim.state.spawnedWaves,0);assert.equal(waves().progress,0,'killing the whole garrison defeats no wave');assert.equal(sim.mission.wavesDefeated,0);
});
test('spawns stay stable with the garrison running: no deferral stall, the red cap holds, and the garrison leaves through the opened gate',()=>{
 const sim=new Simulation('stable',campaign.setup(21));sim.teleportHero(250,1050);const k=sim.state.bases['blue-base'];k.hp=k.maxHp=1e9;sim.hero.hp=sim.hero.maxHp=1e9;
 for(const id of SIX)delete sim.state.structures[id];sim.hit(sim.hero,sim.state.structures[G],1e9,'direct');
 let deferral=0,maxLive=0,left=0;const gone=new Set();
 while(sim.clock.tick<165*HZ){sim.advance(DT);sim.drainEvents();const live=Object.values(sim.state.units).filter(u=>u.team==='red'&&u.hp>0);maxLive=Math.max(maxLive,live.length);
  for(const u of live)if(/^red-g/.test(u.id)&&u.x<1392)gone.add(u.id);
  const due=sim.spawnQueue.find(q=>q.team==='red'&&q.tick<=sim.clock.tick);if(due&&live.length<24&&Object.values(sim.state.units).some(u=>u.hp>0&&Math.hypot(u.x-due.x,u.y-due.y)<26))deferral++;}
 assert.equal(deferral,0);assert.ok(maxLive<=24,`${maxLive} Crimson live`);assert.ok(gone.size>=3,`${gone.size} garrison units marched out through the opening`);
});
test('garrison units engage a Guardian fighting in the courtyard: every unit of the first wave strikes it, and none leaves for the Azure Keep',()=>{
 for(const [label,at] of [['doorway',[1464,600]],['keep west',[1498,600]],['keep east',[1722,600]]]){
  const sim=new Simulation('engage-'+label,v3());sim.state.bases[K].damage=0;for(const id of [...SIX,G])delete sim.state.structures[id];for(const u of Object.values(sim.state.units))if(u.team==='blue'&&u.id!=='guardian')delete sim.state.units[u.id];
  assert.equal(sim.teleportHero(...at),true,label);sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e9;
  // The gate is gone, so the garrison is released at once; it is the only thing on the field.
  sim.garrison={next:sim.clock.tick+1,n:0};const hit=new Set();let out=0;
  for(let i=0;i<20*HZ;i++){topUp(sim);sim.advance(DT);for(const e of sim.drainEvents())if(e.type==='damage'&&e.id==='guardian'&&/^red-g1-/.test(e.sourceId))hit.add(e.sourceId);}
  for(const u of Object.values(sim.state.units))if(/^red-g1-/.test(u.id)&&u.x<1392)out++;
  assert.equal(hit.size,3,label+': all three first-wave units strike the Guardian ('+hit.size+')');assert.equal(out,0,label+': none marched out');
 }
});
test('garrison data is validated: it needs the named gate, finite slots in the world and whole counts; slots must lie in the sealed courtyard and be open',()=>{
 const o=()=>structuredClone(L21.match.overrides);
 assert.doesNotThrow(()=>matchSetup('extended',o()));
 const bad=(patch,re)=>assert.throws(()=>matchSetup('extended',{...o(),garrison:{...GARRISON,...patch}}),re,JSON.stringify(patch));
 bad({after:'nope'},/Invalid garrison/);bad({slots:[]},/Invalid garrison/);bad({slots:[[1,2,3]]},/Invalid garrison/);bad({slots:[[NaN,5]]},/Invalid garrison/);bad({slots:[[5000,5]]},/Invalid garrison/);
 bad({counts:[]},/Invalid garrison/);bad({counts:[0]},/Invalid garrison/);bad({counts:[3.5]},/Invalid garrison/);bad({delayTicks:-1},/Invalid garrison/);bad({delayTicks:1.5},/Invalid garrison/);bad({intervalTicks:0},/Invalid garrison/);
 assert.throws(()=>matchSetup('extended',{battlefield:'frost-citadel',garrison:GARRISON}),/Invalid garrison/,'no gate, no garrison');
 const sim=slots=>()=>new Simulation('slots',matchSetup('extended',{...o(),garrison:{...GARRISON,slots}}));
 assert.throws(sim([[1296,300]]),/outside the sealed area/,'a slot on the Azure side');assert.throws(sim([[1500,360]]),/blocked/,'a slot inside the north wall');
 assert.doesNotThrow(sim([[1800,552]]));
 const input={...GARRISON,slots:[[1800,552],[1800,648]],counts:[3,4]},made=matchSetup('extended',{...o(),garrison:input});assert.deepEqual(made.garrison,GARRISON);assert.notEqual(made.garrison.slots,input.slots);assert.notEqual(made.garrison.counts,input.counts);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield,canyonBasin}=require('../.test-build/world/battlefield.js');
const {combatStructures,structuresFor}=require('../.test-build/simulation/GameState.js');
const {buildings}=require('../.test-build/data/buildings.js');
const {heroId,raiderId}=require('../.test-build/data/combat.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
const {run}=require('./support/basinBot.cjs');
// Chapter 4 Mission 5 "Canyon Basin" (docs/CHAPTER4_M5.md): two camps on the two roads round a mesa, both needed to break the Keep's shield; a Defender Hero at the Rim Camp and a Raider Hero that hunts what Azure holds.
// Focused checks on what is new (two camps, two Heroes, two roads); M1-M3 keep their own suites. Every balance value is provisional.
const L=campaign.get('campaign-35'),KEEP='red-base',RIM=['c4-rim-north','c4-rim-south'],BASIN=['c4-basin-north','c4-basin-south'],YARD=['c4-yard-north','c4-yard-south'];
const RIM_FLAG=[1176,312],BASIN_FLAG=[1080,888],SLOTS=[[1776,480],[1776,720]];
const fresh=(id='l35')=>{const s=new Simulation(id,campaign.setup(35));s.state.autoAttack=false;return s;}; // an idle Guardian: this mission models what the Crimson side does on its own
const play=(sim,ticks,log=[],each)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){each?.(sim);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
// Nothing but the test touches the camps: the opening Vanguards are moved home and the Heroes out of the way.
const clear=sim=>{for(const id of ['blue-0','blue-1','blue-2']){const u=sim.state.units[id];if(u){u.x=500;u.y=300;}}};
const kill=(sim,ids)=>{for(const id of ids)if(sim.state.units[id]?.hp>0||sim.state.structures[id]?.hp>0)strike(sim,'guardian',id);};
const capture=(sim,holders,flag,log=[])=>{clear(sim);kill(sim,[heroId,raiderId,...holders]);sim.teleportHero(flag[0],flag[1]+(flag[1]<600?60:-60));play(sim,125,log);return log;};
const cells=(sim,radius,structs,from)=>{const C=40,R=24,geo=sim.geo,seen=new Set(),q=[[Math.floor(from[0]/48),Math.floor(from[1]/48)]];while(q.length){const [c,r]=q.pop(),k=r*C+c;if(c<0||r<0||c>=C||r>=R||seen.has(k)||geo.blocked((c+.5)*48,(r+.5)*48,radius,structs))continue;seen.add(k);q.push([c+1,r],[c-1,r],[c,r+1],[c,r-1]);}return seen;};
const reach=(sim,radius,structs,from)=>{const seen=cells(sim,radius,structs,from);return p=>seen.has(Math.floor(p[1]/48)*40+Math.floor(p[0]/48));};
const seal=(sim,x,y,rows)=>({...sim.state.structures[RIM[0]],id:'seal-'+x+y,kind:'wall',x,y,columns:1,rows});
const camp=(sim,id)=>sim.state.posts.find(p=>p.id===id);
// A large Azure Keep (never invulnerable: that leaves Crimson no route) so an unattended match does not end; a Banner made as sturdy, so the waves cannot break it first.
const sturdy=sim=>{const k=sim.state.bases['blue-base'];k.hp=k.maxHp=1e7;return sim;},hold=(sim,id)=>{const b=sim.state.structures[id];b.hp=b.maxHp=1e7;};

test('Mission 5 is Canyon Basin: Chapter 4, campaign-35, capture both camps then destroy the Keep',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[35,4,'campaign-35','Canyon Basin','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission.phases.map(p=>p.id),['capture','assault']);
 assert.deepEqual(L.mission.phases[0].objectives.map(o=>[o.id,o.type,o.post,o.display.label]),[['rim','capture','rim','Capture the Rim Camp'],['basin','capture','basin','Capture the Basin Camp']]);
 assert.deepEqual(L.mission.phases[1].objectives[0].targets,[KEEP]);
});
test('the approved values: M1-M3 waves and start, two camps with M3 Banner, repair and Elites, a Defender at the Rim Camp, a Raider released at 75 s, two Azure Barracks',()=>{
 const o=L.match.overrides,[rim,basin]=o.posts;
 assert.equal(o.battlefield,'canyon-basin');assert.deepEqual(o.start,{gold:0,wood:100,iron:10});assert.equal(o.post,undefined,'two camps, not one post');
 assert.deepEqual(o.waves.enemyPerWave,[6,6,6,6,7,7,8,8]);assert.equal(o.waves.waveInterval,25*HZ);assert.equal(o.waves.firstWaveTick,300);assert.equal(o.waves.alliedPerWave,1);assert.equal(o.waves.flanks,undefined);assert.deepEqual(o.waves.redSlots,SLOTS);
 assert.deepEqual(o.defenders,[...RIM,...BASIN,...YARD]);assert.equal(o.gates,undefined,'no gate');assert.equal(o.barracks,undefined,'no Crimson Barracks');assert.equal(o.crimsonKeepArmed,true);
 assert.deepEqual([rim.id,rim.name,rim.flag,rim.circle,rim.holders,rim.ruin,rim.ballista],['rim','Rim Camp',{x:1176,y:312},{x:1200,y:312,radius:120},RIM,{col:26,row:5},undefined]);
 assert.deepEqual([basin.id,basin.name,basin.flag,basin.circle,basin.holders,basin.ruin,basin.hero],['basin','Basin Camp',{x:1080,y:888},{x:1056,y:888,radius:144},BASIN,{col:24,row:17},undefined],'the Basin Camp has no Hero of its own');
 for(const c of [rim,basin])assert.deepEqual([c.ring,c.bannerHp,c.raiseTicks,c.repair,c.counter.count],[96,2000,4*HZ,{percent:60,ticks:5*HZ},2]);
 assert.deepEqual([rim.counter.slots,basin.counter.slots],[[SLOTS[0]],[SLOTS[1]]]);
 assert.deepEqual(rim.hero,{anchor:[1224,360],guard:220,spawn:[1512,312],respawnTicks:30*HZ});
 assert.deepEqual(o.hero,{spawn:[1512,888],delayTicks:75*HZ,respawnTicks:45*HZ});
 assert.equal(o.azure.limit,2);assert.deepEqual(o.azure.initial,[]);assert.equal(o.azure.pads.length,4);assert.deepEqual(o.azure.pads.at(-1),{col:21,row:20});
});
test('the layout: canyon walls, a mesa between two roads, two camps, six towers on cell centres',()=>{
 const f=canyonBasin;assert.equal(battlefield('canyon-basin'),f);
 assert.deepEqual(f.barriers.map(b=>[b.x0,b.y0,b.x1,b.y1,b.look]),[[768,-Infinity,1920,192,undefined],[768,960,1008,Infinity,undefined],[1008,1056,1248,Infinity,undefined],[1248,960,1920,Infinity,undefined],[912,432,1344,768,'mesa']]);
 assert.equal(432-192,240,'North Road');assert.equal(960-768,192,'South Road');
 assert.deepEqual(f.outposts,[{x:1200,y:312,radius:120},{x:1056,y:888,radius:144}]);
 assert.deepEqual(f.towers.map(t=>t.id),[...RIM,...BASIN,...YARD]);
 for(const t of f.towers)assert.deepEqual([t.x%48,t.y%48],[24,24],`${t.id} stands on a cell centre`);
 for(const p of [RIM_FLAG,BASIN_FLAG])assert.deepEqual([p[0]%48,p[1]%48],[24,24],'the flag is a cell centre');
 assert.deepEqual(f.entities.filter(e=>e.id.endsWith('-base')).map(e=>[e.id,e.x,e.y]),[['blue-base',330,600],['red-base',1610,600]]);
 const sim=fresh();for(const id of ['blue-0','blue-1','blue-2'])assert.equal(sim.geo.blocked(sim.state.units[id].x,sim.state.units[id].y,12,{}),false,`${id} opens on open ground`);
 assert.equal(f.entities.some(e=>e.kind==='minion-red'),false);
});
test('two roads: each wave slot reaches the Azure Keep by either road alone, and the mesa is solid',()=>{
 const sim=fresh(),st=structuresFor(sim.state,'red'),north=seal(sim,1056,312,5),south=seal(sim,1056,864,4);
 for(const radius of [12,20]){
  for(const slot of SLOTS){
   assert.equal(reach(sim,radius,st,slot)([450,600]),true,`slot ${slot} reaches the Azure side (radius ${radius})`);
   assert.equal(reach(sim,radius,{...st,north},slot)([450,600]),true,`by the South Road alone (radius ${radius})`);
   assert.equal(reach(sim,radius,{...st,south},slot)([450,600]),true,`by the North Road alone (radius ${radius})`);
   assert.equal(reach(sim,radius,{...st,north,south},slot)([450,600]),false,'and there is no third way');
  }
  for(const p of [[1128,600],[960,480],[1300,720]])assert.equal(sim.geo.blocked(p[0],p[1],radius,{}),true,`${p} is mesa`);
 }
 for(const [x,y] of SLOTS)assert.equal(sim.geo.blocked(x,y,12,combatStructures(sim.state)),false);
});
test('the Crimson Keep is shielded until both camps are Azure, and again when either Banner falls',()=>{
 const sim=fresh(),keep=sim.state.bases[KEEP],log=[];
 assert.deepEqual(sim.state.posts.map(p=>[p.id,p.owner]),[['rim','crimson'],['basin','crimson']]);assert.equal(sim.state.post,sim.state.posts[0]);assert.equal(keep.invulnerable,true);
 capture(sim,BASIN,BASIN_FLAG,log);
 assert.equal(camp(sim,'basin').owner,'azure');assert.equal(camp(sim,'rim').owner,'crimson');assert.equal(keep.invulnerable,true,'one camp is not enough');
 assert.deepEqual(log.filter(e=>e.type==='post').map(e=>[e.change,e.camp]),[['raising','basin'],['captured','basin']]);
 assert.equal(sim.missionStatus().objectives.find(o=>o.id==='basin').complete,true);assert.equal(sim.missionStatus().objectives.find(o=>o.id==='rim').complete,false);
 assert.ok(sim.state.structures['c4-banner-basin'],'the Banner is named after its camp');
 capture(sim,RIM,RIM_FLAG,log);
 assert.equal(camp(sim,'rim').owner,'azure');assert.equal(keep.invulnerable,undefined,'both camps break the shield');
 assert.ok(sim.missionStatus().objectives.find(o=>o.id==='keep').active,'the assault phase is open');
 strike(sim,KEEP,'c4-banner-basin');play(sim,2,log);
 assert.equal(camp(sim,'basin').owner,'crimson');assert.equal(keep.invulnerable,true,'a lost Banner restores the shield');
 assert.deepEqual(log.filter(e=>e.type==='post'&&e.change==='lost').map(e=>e.camp),['basin']);
 play(sim,4*HZ,log);const elites=log.filter(e=>e.type==='spawn'&&/^red-ca/.test(e.id)).map(e=>e.id).sort();
 assert.deepEqual(elites,['red-ca-basin-0','red-ca-basin-1','red-ca-rim-0','red-ca-rim-1'],'each camp sends its own two Elites, named after it');
});
test('forward construction: each circle opens with its own camp; the ruin is repaired at 60%; the Basin pad opens with the Basin Camp; two Azure Barracks at most',()=>{
 const sim=fresh();sim.economy.balances.wood=1e5*120;sim.economy.balances.iron=1e5*120;
 assert.equal(sim.placementReason('tower',23,7),'Capture the Rim Camp first');assert.equal(sim.placementReason('tower',20,19),'Capture the Basin Camp first');assert.equal(sim.placementReason('barracks',21,20),'Capture the Basin Camp first');
 capture(sim,BASIN,BASIN_FLAG);
 assert.equal(sim.placementReason('tower',20,19),'');assert.equal(sim.placementReason('tower',23,7),'Capture the Rim Camp first','the other camp stays closed');
 assert.equal(sim.repairSite('tower',24,17),true);assert.equal(sim.repairSite('tower',26,5),false,'the Rim ruin needs the Rim Camp');
 const full=sim.constructionQuote('tower'),repair=sim.placementQuote('tower',24,17);assert.deepEqual([repair.wood,repair.iron],[Math.round(full.wood*.6),Math.round(full.iron*.6)]);
 assert.equal(sim.placementReason('barracks',21,20),'');
 sim.send({type:'place',requestId:'b1',kind:'barracks',col:21,row:20});sim.send({type:'place',requestId:'b2',kind:'barracks',col:10,row:10});play(sim,5);
 assert.equal(Object.values(sim.state.structures).filter(b=>b.azureBarracks).length,2);assert.notEqual(sim.placementReason('barracks',10,14),'','the third Barracks is refused');
});
test('the Defender guards the Rim Camp, returns 30 s after a death and hunts the Rim Banner once it is Azure; the Raider rides out at 75 s and returns 45 s after a death',()=>{
 const sim=sturdy(fresh()),log=[];clear(sim);
 const d=sim.state.units[heroId];assert.deepEqual([d.x,d.y,d.archetype,d.maxHp],[1224,360,'crimson-hero',833]);assert.equal(sim.state.units[raiderId],undefined,'the Raider is not out yet');
 play(sim,75*HZ-2,log);assert.equal(sim.state.units[raiderId],undefined);
 play(sim,4,log);const r=sim.state.units[raiderId];assert.ok(r,'released at 75 s');assert.ok(Math.hypot(r.x-1512,r.y-888)<70);assert.equal(r.archetype,'crimson-hero');
 assert.ok(log.some(e=>e.type==='spawn'&&e.id===raiderId));
 assert.equal(sim.state.units[heroId].x,1224,'the Defender has nobody to fight and stays at his anchor');
 strike(sim,'guardian',raiderId);play(sim,45*HZ-2,log);assert.equal(sim.state.units[raiderId],undefined);play(sim,4,log);assert.ok(sim.state.units[raiderId],'back 45 s later');
 strike(sim,'guardian',heroId);play(sim,30*HZ-2,log);assert.equal(sim.state.units[heroId],undefined);play(sim,4,log);assert.ok(sim.state.units[heroId],'the Defender is back 30 s later');
});
test('the Raider hunts an Azure Banner first, then the Azure Keep when Azure holds no camp; the Defender hunts his own camp only',()=>{
 const sim=sturdy(fresh());
 capture(sim,BASIN,BASIN_FLAG);hold(sim,'c4-banner-basin');sim.teleportHero(400,600);
 play(sim,75*HZ-sim.clock.tick+30);const r=sim.state.units[raiderId];assert.ok(r);
 play(sim,30);assert.equal(r.targetId,'c4-banner-basin','the Basin Banner');
 const b=sim.state.structures['c4-banner-basin'];b.hp=1;strike(sim,KEEP,'c4-banner-basin');play(sim,30);assert.equal(sim.state.units[raiderId].targetId,'blue-base','nothing Azure in the basin: the Azure Keep');
 const s2=sturdy(fresh());capture(s2,RIM,RIM_FLAG);hold(s2,'c4-banner-rim');capture(s2,BASIN,BASIN_FLAG);hold(s2,'c4-banner-basin');s2.teleportHero(400,600);
 play(s2,31*HZ);const def=s2.state.units[heroId];assert.ok(def,'the Defender is back');assert.equal(def.targetId,'c4-banner-rim','the Defender hunts his own camp\'s Banner, not the nearer Basin one');
});
test('validation: several camps need distinct ids, names and circles, at most one Defender, and a camp named by every capture objective',()=>{
 const o=L.match.overrides,setup=extra=>()=>matchSetup('extended',{...o,...extra});
 assert.doesNotThrow(setup({}));
 assert.throws(setup({posts:[o.posts[0]]}),/Invalid posts/,'two or more');
 assert.throws(setup({posts:[o.posts[0],{...o.posts[1],id:'rim'}]}),/Invalid posts/);
 assert.throws(setup({posts:[o.posts[0],{...o.posts[1],name:'Rim Camp'}]}),/Invalid posts/);
 assert.throws(setup({posts:[o.posts[0],{...o.posts[1],hero:o.posts[0].hero}]}),/Invalid posts/,'one Defender');
 assert.throws(setup({post:o.posts[0]}),/Invalid post/,'not both post and posts');
 assert.throws(setup({mission:{phases:[{id:'p',objectives:[{id:'c',type:'capture'}]}]}}),/unknown camp/);
 assert.throws(setup({mission:{phases:[{id:'p',objectives:[{id:'c',type:'capture',post:'ford'}]}]}}),/unknown camp/);
 assert.throws(()=>matchSetup('extended',{...campaign.get('campaign-33').match.overrides,mission:{phases:[{id:'p',objectives:[{id:'c',type:'capture',post:'rim'}]}]}}),/unknown camp/,'a single post takes no camp name');
});
test('bot playthrough (information only): Basin first then the North Road wins with the Azure Keep untouched; the run replays identically',()=>{
 const a=run({}),b=run({});
 assert.equal(a.outcome,'victory');assert.ok(a.sec>=240&&a.sec<=600,`won in ${a.sec} s`);assert.ok(a.shieldDown>0&&a.shieldDown<a.sec);assert.ok(a.raiderDeaths>=1,'the Raider rode out and fell');
 assert.deepEqual([b.sec,b.capture,b.lost,b.gDeaths],[a.sec,a.capture,a.lost,a.gDeaths]);
});

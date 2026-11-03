const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {FLANK}=require('../.test-build/simulation/Flank.js');
const {crimsonHero,marshalId,shadowbladeId}=require('../.test-build/data/combat.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {DT,HZ}=require('./support/campaignBot.cjs');
const {run}=require('./support/fortressBot.cjs');
// Chapter 4 Mission 6 "Crimson Fortress" (docs/CHAPTER4_M6.md): two roads round the Crimson Ridge, two Commanders with their own roles, two outposts without a Keep shield, a ruined Barracks that repairs as the third, and a one-time Last Stand.
// Focused checks on what is new; M1-M5 keep their own suites. Every balance value is provisional.
const L=campaign.get('campaign-36'),KEEP='red-base',GATE='red-fortress-gate',RUIN=[19,19];
const fresh=()=>new Simulation('l36',campaign.setup(36));
const play=(sim,ticks,log=[],each)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){each?.(sim);sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
const grant=sim=>{sim.economy.balances.wood+=400*RESOURCE_UNITS;sim.economy.balances.iron+=80*RESOURCE_UNITS;};
let serial=0;
const build=(sim,kind,col,row)=>{grant(sim);const why=sim.placementReason(kind,col,row);if(why)return why;sim.send({type:'place',requestId:'t'+(++serial),kind,col,row});play(sim,1);const b=Object.values(sim.state.structures).find(x=>x.team==='blue'&&x.col===col&&x.row===row);b.startTick=sim.clock.tick-1;b.completeTick=sim.clock.tick;b.progress=1;b.hp=b.maxHp;return b;};
const kill=(sim,id)=>{const t=sim.state.units[id]??sim.state.structures[id]??sim.state.bases[id];t.protectionTick=0;sim.hit(t.team==='blue'?sim.state.bases[KEEP]:sim.hero,t,t.hp+1e6,'direct');};
const capture=(sim,id)=>{const c=sim.camps.find(p=>p.id===id);for(const h of c.holders)kill(sim,h);sim.teleportHero(c.flag.x,c.flag.y+(c.flag.y<600?60:-60));play(sim,130);return sim.postStates.find(p=>p.id===id).owner;};
// A test field: an unkillable Azure Keep and Guardian (never an invulnerable Keep: that leaves Crimson no route), nothing but the Commanders and their escorts moving, nothing due until the test says so.
const quiet=sim=>{sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e7;sim.hero.hp=sim.hero.maxHp=1e7;play(sim,1);for(const q of sim.commanderPlan.values())q.warn=1e9;return sim;};
const clean=sim=>{for(const [id,u] of Object.entries(sim.state.units))if(u.kind!=='guardian'&&!u.commander&&!u.escortOf)delete sim.state.units[id];};
const due=(sim,id,ticks=0)=>{sim.commanderPlan.get(id).warn=sim.clock.tick+ticks;};
const hold=(x,y)=>s=>{clean(s);s.hero.x=x;s.hero.y=y;};
const road=p=>p.x>=816&&p.x<=1232?(p.y<432?'N':p.y>768?'S':'?'):undefined;

test('Mission 6 is Crimson Fortress: Chapter 4, campaign-36, destroy the Crimson Keep (one objective)',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[36,4,'campaign-36','Crimson Fortress','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission.phases.map(p=>p.objectives.map(o=>[o.id,o.type,o.targets])),[[['keep','destroy',[KEEP]]]]);
});
test('the approved values: M5 waves and start, two outposts without a shield, a faction Fortress Gate with a one-time Last Stand, three Azure Barracks and two Commanders',()=>{
 const o=L.match.overrides,[north,south]=o.posts,[m,s]=o.commanders;
 assert.equal(o.battlefield,'crimson-fortress');assert.equal(o.campShield,false);assert.deepEqual(o.waves.enemyPerWave,[6,6,6,6,7,7,8,8]);assert.equal(o.waves.waveInterval,25*HZ);
 assert.deepEqual(o.gates,[{id:GATE,hp:2500,faction:true,assist:true}]);assert.deepEqual([o.garrison.after,o.garrison.counts,o.garrison.archetype],[GATE,[4],'crimson-elite']);
 assert.deepEqual([north.id,south.id,south.barracksRuin],['north','south',{col:19,row:19,percent:40}]);
 assert.deepEqual(o.azure,{pads:[{col:10,row:10},{col:10,row:14},{col:19,row:19}],initial:[{col:10,row:10}],limit:3});
 assert.deepEqual([m.id,m.role,m.lane,m.hp,m.damage,m.attackSpeed,m.speed,m.structureBonus,m.firstTick,m.restTicks,m.warningTicks,m.flankTimeoutTicks,m.escort],[marshalId,'marshal','north',1.6,1.3,.8,.75,1.5,90*HZ,60*HZ,6*HZ,40*HZ,{count:3,matchSpeed:true,delayTicks:0}]);
 assert.deepEqual([s.id,s.role,s.lane,s.hp,s.damage,s.attackSpeed,s.speed,s.structureBonus,s.keepBonus,s.firstTick,s.restTicks,s.warningTicks,s.escort],[shadowbladeId,'shadowblade',undefined,.8,.85,1.4,1.4,1,.5,135*HZ,40*HZ,6*HZ,undefined]);assert.equal(m.keepBonus,undefined,'the Marshal keeps his x1.5 against the Keep');
 assert.deepEqual([m.spawns.north,m.spawns.south],[[1320,264],[1320,936]]);
});
test('no camp shield: the Crimson Keep can be struck from the start while both outposts are Crimson; M5 keeps its shield',()=>{
 const sim=fresh();assert.notEqual(sim.state.bases[KEEP].invulnerable,true);assert.ok(sim.postStates.every(p=>p.owner==='crimson'));
 const m5=new Simulation('l35',campaign.setup(35));assert.equal(m5.state.bases[KEEP].invulnerable,true);
});
test('the ruined Barracks opens with the South Outpost, costs 48 Wood and 8 Iron, keeps its cell from towers and counts toward the cap of three',()=>{
 const sim=quiet(fresh());
 assert.equal(sim.placementReason('barracks',...RUIN),'Capture the South Outpost first');
 assert.equal(capture(sim,'south'),'azure');grant(sim);
 assert.deepEqual(sim.placementQuote('barracks',...RUIN),{wood:48,iron:8,available:true});assert.deepEqual(sim.placementQuote('barracks',10,14),{wood:120,iron:20,available:true});
 assert.equal(sim.placementReason('tower',...RUIN),'Ruined Barracks: repair it with a Barracks');assert.equal(sim.placementReason('wall',...RUIN),'Ruined Barracks: repair it with a Barracks');
 build(sim,'barracks',10,14);const ruin=build(sim,'barracks',...RUIN);assert.equal(ruin.azureBarracks,true);
 assert.equal(Object.values(sim.state.structures).filter(b=>b.azureBarracks&&b.hp>0).length,3);
 sim.azurePads=[...sim.azurePads,{col:13,row:12}];assert.equal(sim.placementReason('barracks',13,12),'Barracks limit reached');
 kill(sim,ruin.id);play(sim,1);assert.equal(sim.placementReason('barracks',13,12),'');
 kill(sim,'c4-banner-south');play(sim,1);assert.equal(sim.placementReason('barracks',...RUIN),'Capture the South Outpost first','losing the outpost closes the ruin again');
});
test('soldiers of the ruined Barracks keep moving round the Ridge (cellAnchor is on for Mission 6, off for Mission 5)',()=>{
 const sim=quiet(fresh());capture(sim,'south');build(sim,'barracks',...RUIN);
 const still={},last={};
 for(const [x,y,s] of [[1000,840,30],[450,600,30]]){sim.teleportHero(x,y);play(sim,s*HZ,[],q=>{for(const [id,u] of Object.entries(q.state.units)){if(!id.startsWith('blue-s-'))continue;const p=last[id];if(p&&Math.hypot(u.x-p.x,u.y-p.y)<.05&&!u.targetId&&Math.hypot(u.x-q.hero.x,u.y-q.hero.y)<380)still[id]=(still[id]??0)+1;else still[id]=0;last[id]={x:u.x,y:u.y};assert.ok((still[id]??0)<5*HZ,`${id} stands still at ${Math.round(u.x)},${Math.round(u.y)}`);}});}
 assert.equal(sim.soldierProto.cellAnchor,true);
 const m5=new Simulation('l35',campaign.setup(35));m5.spawnSoldier('blue-s-x',500,500);assert.equal(m5.soldierProto.cellAnchor,undefined);
});
test('the Iron Marshal: announced 6 s ahead, takes the field at the Siege Road spawn with three escorts at his speed and the Hero\'s stats times his multipliers',()=>{
 const sim=fresh(),log=play(sim,90*HZ+1);
 const warn=log.find(e=>e.type==='commander'&&e.id===marshalId&&e.change==='warning'),rel=log.find(e=>e.type==='commander'&&e.id===marshalId&&e.change==='released');
 assert.deepEqual([warn.at,warn.lane,warn.releaseTick,rel.at],[84*HZ,'north',90*HZ,90*HZ]);
 const u=sim.state.units[marshalId],b=crimsonHero.stats;
 assert.ok(Math.hypot(u.x-1320,u.y-264)<=3,`at the Siege Road spawn ${u.x},${u.y}`);assert.deepEqual([u.maxHp,u.damage,u.cooldownTicks,u.windupTicks,u.speed],[Math.round(b.maxHp*1.6),b.damage*1.3,29,8,b.speed*.75]);
 assert.deepEqual(u.flank,{lane:'north',startTick:90*HZ,commit:true,timeout:40*HZ});assert.equal(FLANK.timeout,600,'the shared Chapter 2 timeout is untouched');
 const esc=Object.values(sim.state.units).filter(e=>e.escortOf===marshalId);assert.equal(esc.length,3);assert.ok(esc.every(e=>e.speed===u.speed&&e.flank?.lane==='north'));
});
test('the Marshal marches down the Siege Road with his escort, breaks the nearest tower (x1.5 against structures), then a Barracks; his escort stays with him',()=>{
 const sim=quiet(fresh());const t1=build(sim,'tower',12,9);clean(sim);sim.teleportHero(300,200);due(sim,marshalId);
 const log=[],gap=[];let first;
 play(sim,45*HZ,log,s=>{hold(300,200)(s);const m=s.state.units[marshalId];if(!m)return;assert.notEqual(road(m),'S','the Marshal never takes the Shadow Trail');
  if(!first){first=log.find(e=>e.type==='attack'&&e.id===marshalId);for(const e of Object.values(s.state.units).filter(x=>x.escortOf===marshalId))gap.push(Math.hypot(e.x-m.x,e.y-m.y));}});
 assert.equal(first.targetId,t1.id);assert.ok(Math.max(...gap)<=200,`escort gap ${Math.max(...gap)}`);
 const hit=log.find(e=>e.type==='damage'&&e.sourceId===marshalId&&!!(sim.state.structures[e.id]||e.id===t1.id||e.id.startsWith('azure-barracks'))); // his escort may finish the tower before his swing landsassert.equal(hit.amount,crimsonHero.stats.damage*1.3*1.5);
 assert.ok(log.some(e=>e.type==='death'&&e.id===t1.id),'the tower falls');
 assert.equal(log.filter(e=>e.type==='attack'&&e.id===marshalId).map(e=>e.targetId).find(id=>id!==t1.id),'azure-barracks-0','then the Barracks');
});
test('the Shadowblade picks the Azure Barracks farthest from the Guardian and the road away from the marching Marshal; it never meets him on a road',()=>{
 for(const [gx,gy,expect] of [[450,600,'ruin'],[1000,840,'azure-barracks-0']]){
  const sim=quiet(fresh());capture(sim,'south');const second=build(sim,'barracks',10,14),ruin=build(sim,'barracks',...RUIN);clean(sim);sim.teleportHero(gx,gy);
  due(sim,marshalId);due(sim,shadowbladeId,2*HZ);let close=Infinity;
  const log=play(sim,30*HZ,[],s=>{hold(gx,gy)(s);const a=s.state.units[marshalId],b=s.state.units[shadowbladeId];if(a&&b&&(road(a)||road(b)))close=Math.min(close,Math.hypot(a.x-b.x,a.y-b.y));if(b)assert.notEqual(road(b),'N',`the Shadowblade stays off the Siege Road (${gx},${gy})`);});
  const warn=log.find(e=>e.type==='commander'&&e.id===shadowbladeId&&e.change==='warning');
  assert.equal(warn.targetId,expect==='ruin'?ruin.id:expect);assert.equal(warn.lane,'south');assert.ok(close>=200,`closest ${close}`);
  const u=sim.state.units[shadowbladeId]??{};const rel=log.find(e=>e.type==='commander'&&e.id===shadowbladeId&&e.change==='released');assert.ok(rel);
  assert.ok(log.some(e=>e.type==='attack'&&e.id===shadowbladeId&&e.targetId===warn.targetId),'it reaches its target');void second;void u;
 }
});
test('with the Marshal resting the Shadowblade takes the road farther from the Guardian; it spawns on that road',()=>{
 const sim=quiet(fresh());clean(sim);sim.teleportHero(1000,840);due(sim,shadowbladeId);
 let born;const log=play(sim,8*HZ,[],s=>{hold(1000,840)(s);const u=s.state.units[shadowbladeId];if(u&&!born)born={x:u.x,y:u.y};});const warn=log.find(e=>e.type==='commander'&&e.change==='warning');
 assert.deepEqual([warn.targetId,warn.lane],['azure-barracks-0','north']);assert.ok(born&&Math.hypot(born.x-1320,born.y-264)<=3,'north spawn');
});
test('the Shadowblade keeps its target while the Guardian moves, and falls back on the Azure Keep when its target is gone or no Barracks stands',()=>{
 const sim=quiet(fresh());clean(sim);sim.teleportHero(1000,840);due(sim,shadowbladeId);play(sim,7*HZ,[],hold(1000,840));
 const u=sim.state.units[shadowbladeId];assert.equal(u.commander.targetId,'azure-barracks-0');
 play(sim,3*HZ,[],hold(450,450));assert.equal(u.targetId,'azure-barracks-0','no retarget when the Guardian moves');
 kill(sim,'azure-barracks-0');play(sim,2,[],hold(450,450));assert.equal(u.targetId,'blue-base');
 const s2=quiet(fresh());kill(s2,'azure-barracks-0');clean(s2);due(s2,shadowbladeId);const log=play(s2,8*HZ,[],hold(1000,840));
 assert.equal(log.find(e=>e.type==='commander'&&e.change==='warning').targetId,'blue-base');
});
test('a fallen Commander rests: the next warning comes restTicks after his death, and the HUD can say when he returns',()=>{
 const sim=quiet(fresh());clean(sim);due(sim,shadowbladeId);play(sim,7*HZ,[],hold(450,600));
 kill(sim,shadowbladeId);const log=play(sim,47*HZ,[],hold(450,600));
 const down=log.find(e=>e.type==='commander'&&e.change==='down'),warn=log.find(e=>e.type==='commander'&&e.change==='warning'),t=sim.commanderPlan.get(shadowbladeId).release-46*HZ;
 assert.equal(down.releaseTick,warn.releaseTick);assert.equal(warn.releaseTick-warn.at,6*HZ);assert.ok(Math.abs(warn.at-(down.at+40*HZ))<=1,`warning ${warn.at} vs death ${down.at}`);void t;
});
test('the Last Stand: the Fortress Gate\'s fall releases four Elite Soldiers once',()=>{
 const sim=quiet(fresh());kill(sim,GATE);const log=play(sim,120*HZ,[],s=>{for(const [id,u] of Object.entries(s.state.units))if(/^red-w/.test(id))delete s.state.units[id];});
 const elites=log.filter(e=>e.type==='spawn'&&/^red-g\d/.test(e.id));assert.equal(elites.length,4);assert.ok(elites.every(e=>e.id.startsWith('red-g1-')));
});
test('level data is validated: Commanders need camps, distinct ids and sane numbers; campShield needs camps; a ruined Barracks must be a pad of its camp',()=>{
 const o=()=>structuredClone(L.match.overrides),build=over=>matchSetup('extended',{...over,mission:structuredClone(L.mission)});
 assert.ok(build(o()).commanders.length===2);
 assert.throws(()=>build({...o(),posts:undefined,garrison:undefined,campShield:undefined}),/Invalid Commanders/);
 assert.throws(()=>build({...o(),commanders:[o().commanders[0],o().commanders[0]]}),/Invalid Commanders/);
 assert.throws(()=>build({...o(),commanders:[{...o().commanders[1],lane:'north'}]}),/Invalid Commanders/);
 assert.throws(()=>build({...o(),commanders:[{...o().commanders[0],speed:0}]}),/Invalid Commanders/);
 assert.throws(()=>build({...o(),commanders:undefined}),/Invalid post/,'camps and a garrison need Commanders');
 assert.throws(()=>build({...o(),azure:{...o().azure,pads:o().azure.pads.slice(0,2)}}),/Invalid post/);
 const m5=structuredClone(campaign.get('campaign-35').match.overrides);assert.throws(()=>matchSetup('extended',{...m5,campShield:false,posts:undefined,hero:undefined}),/Invalid camp shield/);
});
test('the bot defends and wins with and without the third Barracks; no Commander, escort or soldier stands stuck',()=>{
 for(const o of [{plan:'defend'},{plan:'defend',ruin:false}]){const r=run(o);assert.equal(r.end.outcome,'victory',JSON.stringify(o));assert.ok(r.end.at<=600,`${JSON.stringify(o)} ${r.end.at}`);assert.deepEqual(r.nav,{});assert.equal(r.lastStand,4);}
});
test('pre-playtest: the Shadowblade strikes the Azure Keep at half damage and Barracks at full; alone it needs about a minute from its warning to break a full Keep',()=>{
 const sim=quiet(fresh());const k=sim.state.bases['blue-base'];k.hp=k.maxHp=3000;clean(sim);sim.teleportHero(1000,840);due(sim,shadowbladeId);
 const log=play(sim,25*HZ,[],hold(1000,840)),hits=log.filter(e=>e.type==='damage'&&e.sourceId===shadowbladeId);
 const onBarracks=hits.find(e=>e.id==='azure-barracks-0');assert.equal(onBarracks.amount,crimsonHero.stats.damage*.85);
 if(sim.state.structures['azure-barracks-0'])kill(sim,'azure-barracks-0'); // by now the Shadowblade has usually broken it itself
 const more=play(sim,90*HZ,[],hold(1000,840)),onKeep=[...log,...more].find(e=>e.type==='damage'&&e.sourceId===shadowbladeId&&e.id==='blue-base');
 assert.equal(onKeep.amount,crimsonHero.stats.damage*.85*.5);
 const s2=quiet(fresh()),k2=s2.state.bases['blue-base'];k2.hp=k2.maxHp=3000;kill(s2,'azure-barracks-0');clean(s2);s2.teleportHero(1340,600);due(s2,shadowbladeId);
 const l2=play(s2,120*HZ,[],hold(1340,600)),warn=l2.find(e=>e.type==='commander'&&e.change==='warning'),fell=l2.find(e=>e.type==='death'&&e.id==='blue-base');
 assert.ok(fell,'unanswered, it does break the Keep');const s=(fell.at-warn.at)/HZ;assert.ok(s>=55&&s<=90,`warning to Keep destroyed ${s} s`);
});
